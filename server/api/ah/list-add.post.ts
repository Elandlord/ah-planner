import { ahFetch, getValidAccessToken } from '~~/server/utils/ahApi';
import { buildListPatchItems } from '~~/server/utils/ahShoppingList';
import type { ListAddRequestItem } from '~~/server/utils/ahShoppingList';

export default defineEventHandler(async (event) => {
    const body = await readBody<{ items?: ListAddRequestItem[] }>(event);
    const items = buildListPatchItems(body.items ?? []);
    if (items.length === 0) {
        throw createError({ statusCode: 400, statusMessage: 'No items provided' });
    }

    const accessToken = await getValidAccessToken();
    await ahFetch('/mobile-services/shoppinglist/v2/items', accessToken, {
        method: 'PATCH',
        body: { items },
    });

    return { added: items.length };
});
