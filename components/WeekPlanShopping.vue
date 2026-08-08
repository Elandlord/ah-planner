<script setup lang="ts">
import type RecipeShoppingItemInterface from '~/types/RecipeShoppingItemInterface';
import { buildShoppingItems, useRecipeShopping } from '~/composables/useRecipeShopping';
import { daysPerRecipe, servingsFor } from '~/composables/useWeekPlan';
import { useRecipeStore } from '~/stores/recipeStore';
import { useToast } from '~/composables/useToast';

const recipeStore = useRecipeStore();
const toast = useToast();
const { resolveIngredients } = useRecipeShopping();

const items = ref<RecipeShoppingItemInterface[]>([]);
const loading = ref(false);
const submitting = ref(false);

const planned = computed(() => [...daysPerRecipe(recipeStore.weekPlan).entries()]
    .map(([recipeId, days]) => ({
        recipe: recipeStore.allRecipes.find((candidate) => candidate.id === recipeId),
        days,
    }))
    .filter((entry) => entry.recipe !== undefined));

const total = computed(() => items.value.reduce((sum, item) => {
    const price = item.product?.bonusPrice ?? item.product?.price ?? 0;
    return sum + price * item.packs;
}, 0));

/** One product can turn up in several recipes, so the week buys it once. */
function merge(all: RecipeShoppingItemInterface[]): RecipeShoppingItemInterface[] {
    const byProduct = new Map<string, RecipeShoppingItemInterface>();
    for (const item of all) {
        const key = item.product ? String(item.product.id) : item.name;
        const existing = byProduct.get(key);
        if (existing) {
            existing.packs += item.packs;
            continue;
        }
        byProduct.set(key, { ...item });
    }
    return [...byProduct.values()];
}

async function load(): Promise<void> {
    if (planned.value.length === 0) {
        items.value = [];
        return;
    }
    loading.value = true;
    try {
        const perRecipe = await Promise.all(planned.value.map(async (entry) => {
            const recipe = entry.recipe;
            if (!recipe) {
                return [];
            }
            const resolved = await resolveIngredients(recipe);
            const servings = servingsFor(entry.days.length, recipeStore.household);
            return buildShoppingItems(recipe, servings, resolved);
        }));
        items.value = merge(perRecipe.flat()).filter((item) => item.product !== null);
    } catch {
        toast.error('Boodschappen voor het weekplan laden mislukt.');
    } finally {
        loading.value = false;
    }
}

async function addToList(): Promise<void> {
    submitting.value = true;
    try {
        const payload = items.value
            .filter((item) => item.selected && item.product)
            .map((item) => ({
                productId: item.product?.id ?? 0,
                quantity: item.packs,
                name: item.product?.title ?? item.name,
            }));
        const response = await $fetch<{ added: number }>('/api/ah/list-add', {
            method: 'POST',
            body: { items: payload },
        });
        toast.success(`${response.added} producten voor je weekplan op de AH lijst gezet.`);
    } catch {
        toast.error('Toevoegen aan AH lijst mislukt.');
    } finally {
        submitting.value = false;
    }
}

watch(() => [recipeStore.weekPlan, recipeStore.household], load, { deep: true, immediate: true });
</script>

<template>
    <div
        v-if="planned.length > 0"
        class="week-shopping"
    >
        <div class="head">
            <h3 class="title">
                Boodschappen voor deze week
            </h3>
            <span class="subtitle">
                {{ planned.length }} recepten &middot;
                {{ recipeStore.household.adults + recipeStore.household.children }} personen per dag
            </span>
        </div>

        <p
            v-if="loading"
            class="loading"
        >
            Producten zoeken bij Albert Heijn...
        </p>

        <ul
            v-else
            class="summary"
        >
            <li
                v-for="entry in planned"
                :key="entry.recipe?.id"
                class="summary-row"
            >
                <span>{{ entry.recipe?.name }}</span>
                <span class="summary-days">
                    {{ entry.days.length }} dagen &middot;
                    {{ servingsFor(entry.days.length, recipeStore.household) }} porties
                </span>
            </li>
        </ul>

        <div class="footer">
            <span class="total">{{ items.length }} producten &middot; &euro;{{ total.toFixed(2) }}</span>
            <button
                class="add-btn"
                :disabled="submitting || loading || items.length === 0"
                @click="addToList"
            >
                {{ submitting ? 'Bezig...' : 'Zet weekplan op je AH lijst' }}
            </button>
        </div>
    </div>
</template>

<style scoped>
.week-shopping {
    @apply mt-4 pt-4 border-t;
}

.head {
    @apply flex flex-wrap items-baseline justify-between gap-2 mb-2;
}

.title {
    @apply font-semibold;
}

.subtitle {
    @apply text-xs text-gray-500;
}

.loading {
    @apply text-sm text-gray-500 py-2;
}

.summary {
    @apply space-y-1 mb-3;
}

.summary-row {
    @apply flex justify-between text-sm text-gray-600;
}

.summary-days {
    @apply text-xs text-gray-400;
}

.footer {
    @apply flex items-center justify-between gap-3;
}

.total {
    @apply text-sm font-semibold;
}

.add-btn {
    @apply px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed;
}
</style>
