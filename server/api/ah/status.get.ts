import { getStoredTokens } from '~~/server/utils/ahApi';

export default defineEventHandler(async () => {
    const tokens = await getStoredTokens();
    return { connected: tokens !== null };
});
