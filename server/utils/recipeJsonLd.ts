import ProductCategoryEnum from '~/types/ProductCategoryEnum';
import type RecipeIngredientInterface from '~/types/RecipeIngredientInterface';
import type RecipeInterface from '~/types/RecipeInterface';

const LD_PATTERN = /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi;
const AMOUNT_PATTERN = /^\s*([\d.,]+(?:\s*[-/]\s*[\d.,]+)?)\s*([a-zA-Z]+)?\s+(.*)$/;
const DURATION_PATTERN = /PT(?:(\d+)H)?(?:(\d+)M)?/;
const DEFAULT_SERVINGS = 4;

interface JsonLdNode {
    '@type'?: string | string[];
    '@graph'?: JsonLdNode[];
    name?: string;
    description?: string;
    image?: unknown;
    recipeYield?: unknown;
    totalTime?: string;
    cookTime?: string;
    prepTime?: string;
    recipeIngredient?: string[];
    recipeInstructions?: unknown;
    keywords?: unknown;
}

function isRecipe(node: JsonLdNode): boolean {
    const type = node['@type'];
    return Array.isArray(type) ? type.includes('Recipe') : type === 'Recipe';
}

function flatten(parsed: unknown): JsonLdNode[] {
    const nodes = Array.isArray(parsed) ? parsed : [parsed];
    const result: JsonLdNode[] = [];
    for (const node of nodes) {
        if (!node || typeof node !== 'object') {
            continue;
        }
        const typed = node as JsonLdNode;
        result.push(typed);
        if (Array.isArray(typed['@graph'])) {
            result.push(...typed['@graph']);
        }
    }
    return result;
}

export function firstImage(image: unknown): string | undefined {
    if (typeof image === 'string') {
        return image;
    }
    if (Array.isArray(image)) {
        return firstImage(image[0]);
    }
    if (image && typeof image === 'object' && 'url' in image) {
        return firstImage((image as { url: unknown }).url);
    }
    return undefined;
}

export function parseServings(recipeYield: unknown): number {
    const candidates = Array.isArray(recipeYield) ? recipeYield : [recipeYield];
    for (const candidate of candidates) {
        const match = /\d+/.exec(String(candidate ?? ''));
        if (match) {
            return parseInt(match[0], 10);
        }
    }
    return DEFAULT_SERVINGS;
}

export function parseMinutes(duration: string | undefined): number {
    const match = DURATION_PATTERN.exec(duration ?? '');
    if (!match) {
        return 0;
    }
    return parseInt(match[1] ?? '0', 10) * 60 + parseInt(match[2] ?? '0', 10);
}

export function parseInstructions(instructions: unknown): string[] {
    if (typeof instructions === 'string') {
        return instructions.split(/\n+/).map((step) => step.trim()).filter(Boolean);
    }
    if (!Array.isArray(instructions)) {
        return [];
    }
    return instructions.flatMap((step) => {
        if (typeof step === 'string') {
            return [step.trim()];
        }
        if (step && typeof step === 'object') {
            const node = step as { text?: string; itemListElement?: unknown };
            if (node.itemListElement) {
                return parseInstructions(node.itemListElement);
            }
            return node.text ? [node.text.trim()] : [];
        }
        return [];
    }).filter(Boolean);
}

/** "400 g aardappelgnocchi" becomes an amount plus a name we can search for. */
export function parseIngredientLine(line: string): RecipeIngredientInterface {
    const clean = line.replace(/\s+/g, ' ').trim();
    const match = AMOUNT_PATTERN.exec(clean);
    if (!match) {
        return { name: clean, amount: '', category: ProductCategoryEnum.overig };
    }
    const [, rawAmount, unit, name] = match;
    return {
        name: name.trim(),
        amount: `${rawAmount}${unit ? ` ${unit}` : ''}`.trim(),
        category: ProductCategoryEnum.overig,
        quantity: parseFloat(rawAmount.replace(',', '.')),
        unit: unit ?? 'stuks',
    };
}

export function recipeIdFor(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);
}

export function extractRecipe(html: string): RecipeInterface | null {
    for (const [, block] of html.matchAll(LD_PATTERN)) {
        let parsed: unknown;
        try {
            parsed = JSON.parse(block.trim());
        } catch {
            continue;
        }
        const recipe = flatten(parsed).find(isRecipe);
        if (!recipe?.name) {
            continue;
        }
        const minutes = parseMinutes(recipe.totalTime)
            || parseMinutes(recipe.cookTime) + parseMinutes(recipe.prepTime);
        return {
            id: recipeIdFor(recipe.name),
            name: recipe.name,
            description: (recipe.description ?? '').replace(/\s+/g, ' ').trim(),
            servings: parseServings(recipe.recipeYield),
            prepTimeMinutes: minutes,
            ingredients: (recipe.recipeIngredient ?? []).map(parseIngredientLine),
            instructions: parseInstructions(recipe.recipeInstructions),
            tags: Array.isArray(recipe.keywords)
                ? recipe.keywords.map(String)
                : String(recipe.keywords ?? '').split(',').map((tag) => tag.trim()).filter(Boolean),
            imageUrl: firstImage(recipe.image),
        };
    }
    return null;
}
