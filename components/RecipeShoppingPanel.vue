<script setup lang="ts">
import type RecipeInterface from '~/types/RecipeInterface';
import type RecipeShoppingItemInterface from '~/types/RecipeShoppingItemInterface';
import { buildShoppingItems, useRecipeShopping } from '~/composables/useRecipeShopping';
import { useToast } from '~/composables/useToast';

const { recipe } = defineProps<{ recipe: RecipeInterface }>();

const MIN_SERVINGS = 1;
const MAX_SERVINGS = 12;

const { resolveIngredients } = useRecipeShopping();
const toast = useToast();

const servings = ref(recipe.servings);
const items = ref<RecipeShoppingItemInterface[]>([]);
const loading = ref(false);
const submitting = ref(false);
const resolved = ref(new Map());

const selectedItems = computed(() => items.value.filter((item) => item.selected && item.product));

const total = computed(() =>
    selectedItems.value.reduce((sum, item) => {
        const price = item.product?.bonusPrice ?? item.product?.price ?? 0;
        return sum + price * item.packs;
    }, 0));

const bonusCount = computed(() => items.value.filter((item) => item.product?.isBonus).length);

function rebuild(): void {
    items.value = buildShoppingItems(recipe, servings.value, resolved.value);
}

async function load(): Promise<void> {
    loading.value = true;
    try {
        resolved.value = await resolveIngredients(recipe);
        rebuild();
    } catch {
        toast.error(`Producten voor ${recipe.name} laden mislukt.`);
    } finally {
        loading.value = false;
    }
}

function changeServings(delta: number): void {
    const next = servings.value + delta;
    if (next < MIN_SERVINGS || next > MAX_SERVINGS) {
        return;
    }
    servings.value = next;
    rebuild();
}

async function addToList(): Promise<void> {
    submitting.value = true;
    try {
        const payload = selectedItems.value.map((item) => ({
            productId: item.product?.id ?? 0,
            quantity: item.packs,
            name: item.product?.title ?? item.name,
        }));
        const response = await $fetch<{ added: number }>('/api/ah/list-add', {
            method: 'POST',
            body: { items: payload },
        });
        toast.success(`${response.added} producten voor ${recipe.name} op je AH lijst gezet.`);
    } catch {
        toast.error('Toevoegen aan AH lijst mislukt. Controleer de koppeling op de Bonnen-pagina.');
    } finally {
        submitting.value = false;
    }
}

onMounted(load);
</script>

<template>
    <div class="shopping-panel">
        <div class="servings-bar">
            <span class="servings-label">Aantal personen</span>
            <div class="stepper">
                <button
                    class="step"
                    :disabled="servings <= MIN_SERVINGS"
                    @click="changeServings(-1)"
                >
                    &minus;
                </button>
                <span class="step-value">{{ servings }}</span>
                <button
                    class="step"
                    :disabled="servings >= MAX_SERVINGS"
                    @click="changeServings(1)"
                >
                    +
                </button>
            </div>
            <span
                v-if="bonusCount > 0"
                class="bonus-count"
            >{{ bonusCount }} in de bonus</span>
        </div>

        <p
            v-if="loading"
            class="loading"
        >
            Producten zoeken bij Albert Heijn...
        </p>

        <div
            v-for="item in items"
            :key="item.name"
            class="line"
        >
            <input
                v-model="item.selected"
                type="checkbox"
                :disabled="item.product === null"
            >
            <img
                v-if="item.product?.imageUrl"
                :src="item.product.imageUrl"
                class="line-image"
                alt=""
            >
            <div class="line-info">
                <p class="line-name">
                    {{ item.product?.title ?? item.name }}
                </p>
                <p class="line-meta">
                    {{ item.scaledAmount }} &middot; {{ item.packs }}x kopen
                    <span
                        v-if="item.bonusMechanism"
                        class="line-bonus"
                    >{{ item.bonusMechanism }}</span>
                </p>
            </div>
            <span class="line-price">
                <template v-if="item.product">&euro;{{ ((item.product.bonusPrice ?? item.product.price) * item.packs).toFixed(2) }}</template>
                <template v-else>niet gevonden</template>
            </span>
        </div>

        <div class="footer">
            <span class="footer-total">&euro;{{ total.toFixed(2) }}</span>
            <button
                class="add-btn"
                :disabled="submitting || selectedItems.length === 0"
                @click="addToList"
            >
                {{ submitting ? 'Bezig...' : `Zet ${selectedItems.length} producten op je AH lijst` }}
            </button>
        </div>
    </div>
</template>

<style scoped>
.shopping-panel {
    @apply border-t pt-3 mt-3;
}

.servings-bar {
    @apply flex items-center gap-3 mb-3;
}

.servings-label {
    @apply text-sm text-gray-600;
}

.stepper {
    @apply flex items-center gap-2;
}

.step {
    @apply w-7 h-7 rounded-md border border-gray-300 text-gray-600 disabled:opacity-40;
}

.step-value {
    @apply w-6 text-center text-sm font-semibold;
}

.bonus-count {
    @apply text-xs text-orange-600 font-medium;
}

.loading {
    @apply text-sm text-gray-500 py-2;
}

.line {
    @apply flex items-center gap-3 py-1.5 border-t;
}

.line-image {
    @apply w-8 h-8 object-contain;
}

.line-info {
    @apply flex-1 min-w-0;
}

.line-name {
    @apply text-sm truncate;
}

.line-meta {
    @apply text-xs text-gray-500;
}

.line-bonus {
    @apply text-orange-600 ml-1;
}

.line-price {
    @apply text-sm w-24 text-right;
}

.footer {
    @apply flex items-center justify-between gap-3 pt-3 mt-2 border-t;
}

.footer-total {
    @apply font-bold;
}

.add-btn {
    @apply px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed;
}
</style>
