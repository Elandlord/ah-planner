import { startLoginFlow } from '~~/server/utils/ahLoginProxy';

export default defineEventHandler(async () => {
    const loginUrl = await startLoginFlow();
    return { loginUrl };
});
