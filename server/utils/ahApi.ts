import { ofetch } from 'ofetch';
import type AhTokenSetInterface from '~/types/AhTokenSetInterface';

const API_BASE = 'https://api.ah.nl';
const CLIENT_VERSION = '9.28';
const USER_AGENT = `Appie/${CLIENT_VERSION} (iPhone17,3; iPhone; CPU OS 26_1 like Mac OS X)`;
const TOKEN_STORAGE_KEY = 'tokens.json';
const EXPIRY_MARGIN_MS = 60_000;

export const AH_CLIENT_ID = 'appie-ios';

interface TokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
}

const baseHeaders = {
    'User-Agent': USER_AGENT,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Application': 'AHWEBSHOP',
    'x-client-name': AH_CLIENT_ID,
    'x-client-version': CLIENT_VERSION,
};

function toTokenSet(response: TokenResponse): AhTokenSetInterface {
    return {
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        expiresAt: Date.now() + response.expires_in * 1000 - EXPIRY_MARGIN_MS,
    };
}

export async function exchangeCode(code: string): Promise<AhTokenSetInterface> {
    const response = await ofetch<TokenResponse>(`${API_BASE}/mobile-auth/v1/auth/token`, {
        method: 'POST',
        headers: baseHeaders,
        body: { clientId: AH_CLIENT_ID, code },
    });
    const tokens = toTokenSet(response);
    await useStorage('ah').setItem(TOKEN_STORAGE_KEY, tokens);
    return tokens;
}

export async function getStoredTokens(): Promise<AhTokenSetInterface | null> {
    return useStorage('ah').getItem<AhTokenSetInterface>(TOKEN_STORAGE_KEY);
}

async function refreshTokens(refreshToken: string): Promise<AhTokenSetInterface> {
    const response = await ofetch<TokenResponse>(
        `${API_BASE}/mobile-auth/v1/auth/token/refresh`,
        {
            method: 'POST',
            headers: baseHeaders,
            body: { clientId: AH_CLIENT_ID, refreshToken },
        },
    );
    const tokens = toTokenSet(response);
    await useStorage('ah').setItem(TOKEN_STORAGE_KEY, tokens);
    return tokens;
}

export async function getValidAccessToken(): Promise<string> {
    const stored = await getStoredTokens();
    if (!stored) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Not connected to AH. Complete the login flow first.',
        });
    }
    if (stored.expiresAt > Date.now()) {
        return stored.accessToken;
    }
    const refreshed = await refreshTokens(stored.refreshToken);
    return refreshed.accessToken;
}

export async function getAnonymousAccessToken(): Promise<string> {
    const response = await ofetch<TokenResponse>(
        `${API_BASE}/mobile-auth/v1/auth/token/anonymous`,
        {
            method: 'POST',
            headers: baseHeaders,
            body: { clientId: AH_CLIENT_ID },
        },
    );
    return response.access_token;
}

interface AhFetchOptions {
    method?: 'GET' | 'POST' | 'PATCH';
    body?: Record<string, unknown>;
}

interface GraphQlResponse<T> {
    data?: T;
    errors?: { message: string }[];
}

export async function ahGraphQl<T>(
    query: string,
    variables: Record<string, unknown>,
    accessToken: string,
): Promise<T> {
    const response = await ofetch<GraphQlResponse<T>>(`${API_BASE}/graphql`, {
        method: 'POST',
        headers: {
            ...baseHeaders,
            Authorization: `Bearer ${accessToken}`,
        },
        body: { query, variables },
    });

    if (response.errors?.length) {
        throw createError({
            statusCode: 502,
            statusMessage: `AH GraphQL error: ${response.errors[0].message}`,
        });
    }
    if (!response.data) {
        throw createError({ statusCode: 502, statusMessage: 'AH GraphQL returned no data' });
    }
    return response.data;
}

export async function ahFetch<T>(
    path: string,
    accessToken: string,
    options: AhFetchOptions = {},
): Promise<T> {
    return ofetch<T>(`${API_BASE}${path}`, {
        method: options.method ?? 'GET',
        body: options.body,
        headers: {
            ...baseHeaders,
            Authorization: `Bearer ${accessToken}`,
        },
    });
}
