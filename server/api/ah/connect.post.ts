import { exchangeCode } from '~~/server/utils/ahApi';

const CODE_PATTERN = /code=([^&\s]+)/;

export default defineEventHandler(async (event) => {
    const body = await readBody<{ code?: string }>(event);
    const raw = body.code?.trim() ?? '';
    if (!raw) {
        throw createError({ statusCode: 400, statusMessage: 'Missing code' });
    }
    const match = CODE_PATTERN.exec(raw);
    const code = match ? match[1] : raw;
    await exchangeCode(code);
    return { connected: true };
});
