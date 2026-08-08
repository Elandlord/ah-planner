import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { AH_CLIENT_ID, exchangeCode } from '~~/server/utils/ahApi';

const LOGIN_ORIGIN = 'https://login.ah.nl';
const PROXY_PORT = 9876;
const PROXY_ORIGIN = `http://localhost:${PROXY_PORT}`;
const CALLBACK_PATH = '/callback';
const REDIRECT_URI = 'appie://login-exit';
const FLOW_TIMEOUT_MS = 5 * 60 * 1000;
const REWRITABLE_CONTENT = ['text/html', 'javascript', 'json', 'text/css'];
const STRIPPED_HEADERS = [
    'content-security-policy',
    'content-security-policy-report-only',
    'strict-transport-security',
    'x-frame-options',
    'content-encoding',
    'content-length',
    'transfer-encoding',
];

const SUCCESS_HTML = `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><title>Verbonden</title></head>
<body style="font-family:system-ui;max-width:32rem;margin:5rem auto;text-align:center">
<h1>Gelukt</h1>
<p>AH Planner is verbonden met Albert Heijn. Je kunt dit tabblad sluiten.</p>
<script>setTimeout(function () { window.close(); }, 1500);</script>
</body></html>`;

interface LoginFlow {
    server: Server;
    loginUrl: string;
    timer: NodeJS.Timeout;
}

let activeFlow: LoginFlow | null = null;

export function buildLoginUrl(): string {
    const params = new URLSearchParams({
        client_id: AH_CLIENT_ID,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
    });
    return `${PROXY_ORIGIN}/login?${params.toString()}`;
}

export function rewriteLocation(location: string): string {
    if (location.startsWith('appie://')) {
        const query = location.includes('?') ? location.slice(location.indexOf('?')) : '';
        return `${PROXY_ORIGIN}${CALLBACK_PATH}${query}`;
    }
    return location.replace(LOGIN_ORIGIN, PROXY_ORIGIN);
}

export function sanitizeCookie(cookie: string): string {
    const [pair, ...attributes] = cookie.split(';');
    const kept = attributes.filter((attribute) => {
        const name = attribute.trim().toLowerCase();
        return name !== 'secure' && !name.startsWith('samesite') && !name.startsWith('domain');
    });
    return [pair, ...kept].join(';');
}

export function rewriteBody(body: string): string {
    return body
        .replaceAll(REDIRECT_URI, `${PROXY_ORIGIN}${CALLBACK_PATH}`)
        .replaceAll(encodeURIComponent(REDIRECT_URI), encodeURIComponent(`${PROXY_ORIGIN}${CALLBACK_PATH}`))
        .replaceAll(LOGIN_ORIGIN, PROXY_ORIGIN);
}

export function isRewritable(contentType: string): boolean {
    return REWRITABLE_CONTENT.some((type) => contentType.includes(type));
}

function readRequestBody(request: IncomingMessage): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        request.on('data', (chunk: Buffer) => chunks.push(chunk));
        request.on('end', () => resolve(new Blob([new Uint8Array(Buffer.concat(chunks))])));
        request.on('error', reject);
    });
}

function forwardHeaders(request: IncomingMessage): Headers {
    const headers = new Headers();
    for (const [name, value] of Object.entries(request.headers)) {
        if (value === undefined || name.startsWith(':') || name === 'host' || name === 'accept-encoding') {
            continue;
        }
        headers.set(name, Array.isArray(value) ? value.join('; ') : value);
    }
    headers.set('host', 'login.ah.nl');
    const referer = headers.get('referer');
    if (referer) {
        headers.set('referer', referer.replace(PROXY_ORIGIN, LOGIN_ORIGIN));
    }
    if (headers.get('origin')) {
        headers.set('origin', LOGIN_ORIGIN);
    }
    return headers;
}

async function proxyRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const path = request.url ?? '/';
    const body = request.method === 'GET' || request.method === 'HEAD'
        ? undefined
        : await readRequestBody(request);

    const upstream = await fetch(`${LOGIN_ORIGIN}${path}`, {
        method: request.method,
        headers: forwardHeaders(request),
        body: body && body.size > 0 ? body : undefined,
        redirect: 'manual',
    });

    const headers = new Headers(upstream.headers);
    for (const name of STRIPPED_HEADERS) {
        headers.delete(name);
    }

    const outgoing: Record<string, string | string[]> = {};
    headers.forEach((value, name) => {
        if (name !== 'set-cookie') {
            outgoing[name] = value;
        }
    });

    const cookies = upstream.headers.getSetCookie();
    if (cookies.length > 0) {
        outgoing['set-cookie'] = cookies.map(sanitizeCookie);
    }

    const location = upstream.headers.get('location');
    if (location) {
        outgoing.location = rewriteLocation(location);
    }

    const contentType = upstream.headers.get('content-type') ?? '';
    if (isRewritable(contentType)) {
        const text = rewriteBody(await upstream.text());
        response.writeHead(upstream.status, outgoing);
        response.end(text);
        return;
    }

    const buffer = new Uint8Array(await upstream.arrayBuffer());
    response.writeHead(upstream.status, outgoing);
    response.end(buffer);
}

function stopFlow(): void {
    if (!activeFlow) {
        return;
    }
    clearTimeout(activeFlow.timer);
    activeFlow.server.close();
    activeFlow = null;
}

async function handleCallback(url: URL, response: ServerResponse): Promise<void> {
    const code = url.searchParams.get('code');
    if (!code) {
        response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
        response.end('Geen code ontvangen.');
        return;
    }
    try {
        await exchangeCode(code);
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        response.end(SUCCESS_HTML);
    } catch (error) {
        response.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
        response.end(`Token uitwisselen mislukt: ${(error as Error).message}`);
    } finally {
        setTimeout(stopFlow, 500);
    }
}

export async function startLoginFlow(): Promise<string> {
    if (activeFlow) {
        return activeFlow.loginUrl;
    }

    const server = createServer((request, response) => {
        const url = new URL(request.url ?? '/', PROXY_ORIGIN);
        const task = url.pathname === CALLBACK_PATH
            ? handleCallback(url, response)
            : proxyRequest(request, response);

        task.catch((error: Error) => {
            if (!response.headersSent) {
                response.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
            }
            response.end(`Proxy fout: ${error.message}`);
        });
    });

    await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(PROXY_PORT, '127.0.0.1', resolve);
    });

    activeFlow = {
        server,
        loginUrl: buildLoginUrl(),
        timer: setTimeout(stopFlow, FLOW_TIMEOUT_MS),
    };
    return activeFlow.loginUrl;
}
