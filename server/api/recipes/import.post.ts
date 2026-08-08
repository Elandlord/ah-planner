import { extractRecipe } from '~~/server/utils/recipeJsonLd';

const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
        + '(KHTML, like Gecko) Chrome/140.0 Safari/537.36',
    'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
};

export default defineEventHandler(async (event) => {
    const body = await readBody<{ url?: string }>(event);
    const url = body.url?.trim() ?? '';
    if (!/^https?:\/\//.test(url)) {
        throw createError({ statusCode: 400, statusMessage: 'Geef een geldige recept-URL.' });
    }

    let html: string;
    try {
        html = await $fetch<string>(url, { headers: BROWSER_HEADERS, responseType: 'text' });
    } catch {
        throw createError({ statusCode: 502, statusMessage: 'Pagina kon niet worden opgehaald.' });
    }

    const recipe = extractRecipe(html);
    if (!recipe) {
        throw createError({
            statusCode: 422,
            statusMessage: 'Geen receptgegevens gevonden op deze pagina.',
        });
    }

    return { recipe, source: url };
});
