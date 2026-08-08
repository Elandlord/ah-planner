import { describe, expect, it, vi } from 'vitest';

vi.mock('~~/server/utils/ahApi', () => ({
    AH_CLIENT_ID: 'appie-ios',
    exchangeCode: vi.fn(),
}));

const {
    buildLoginUrl,
    isRewritable,
    rewriteBody,
    rewriteLocation,
    sanitizeCookie,
} = await import('~~/server/utils/ahLoginProxy');

const PROXY_ORIGIN = 'http://localhost:9876';

describe('buildLoginUrl', () => {
    it('points at the proxy with the iOS client and the appie redirect', () => {
        expect(buildLoginUrl()).toBe(
            `${PROXY_ORIGIN}/login?client_id=appie-ios&response_type=code&redirect_uri=appie%3A%2F%2Flogin-exit`,
        );
    });
});

describe('rewriteLocation', () => {
    it('turns the appie redirect into the local callback and keeps the code', () => {
        expect(rewriteLocation('appie://login-exit?code=abc123&state=x')).toBe(
            `${PROXY_ORIGIN}/callback?code=abc123&state=x`,
        );
    });

    it('handles an appie redirect without a query', () => {
        expect(rewriteLocation('appie://login-exit')).toBe(`${PROXY_ORIGIN}/callback`);
    });

    it('keeps redirects inside the proxy origin', () => {
        expect(rewriteLocation('https://login.ah.nl/secure/step-2')).toBe(
            `${PROXY_ORIGIN}/secure/step-2`,
        );
    });
});

describe('sanitizeCookie', () => {
    it('drops attributes that break plain HTTP on localhost', () => {
        const cookie = 'session=abc; Path=/; Domain=login.ah.nl; Secure; SameSite=None; HttpOnly';
        expect(sanitizeCookie(cookie)).toBe('session=abc; Path=/; HttpOnly');
    });

    it('leaves a bare cookie untouched', () => {
        expect(sanitizeCookie('session=abc')).toBe('session=abc');
    });
});

describe('rewriteBody', () => {
    it('replaces the redirect in plain and encoded form', () => {
        const body = 'a=appie://login-exit&b=appie%3A%2F%2Flogin-exit';
        expect(rewriteBody(body)).toBe(
            `a=${PROXY_ORIGIN}/callback&b=${encodeURIComponent(`${PROXY_ORIGIN}/callback`)}`,
        );
    });

    it('rewrites absolute login urls so assets load through the proxy', () => {
        expect(rewriteBody('<script src="https://login.ah.nl/app.js">')).toBe(
            `<script src="${PROXY_ORIGIN}/app.js">`,
        );
    });
});

describe('isRewritable', () => {
    it.each([
        ['text/html; charset=utf-8', true],
        ['application/javascript', true],
        ['application/json', true],
        ['image/png', false],
        ['font/woff2', false],
    ])('treats %s as rewritable=%s', (contentType, expected) => {
        expect(isRewritable(contentType)).toBe(expected);
    });
});
