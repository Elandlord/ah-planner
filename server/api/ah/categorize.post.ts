import { resolveCategories } from '~~/server/utils/ahCategories';

const MAX_NAMES = 500;

export default defineEventHandler(async (event) => {
    const body = await readBody<{ names?: string[] }>(event);
    const names = (body.names ?? []).filter((name) => name.trim().length > 0).slice(0, MAX_NAMES);
    if (names.length === 0) {
        return { categories: {} };
    }

    return { categories: await resolveCategories(names) };
});
