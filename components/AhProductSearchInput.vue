<script setup lang="ts">
import type AhProductInterface from '~/types/AhProductInterface';
import { useAhApi } from '~/composables/useAhApi';

const emit = defineEmits<{
    select: [product: AhProductInterface];
}>();

const model = defineModel<string>({ default: '' });

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 8;

const { searchProducts } = useAhApi();

const results = ref<AhProductInterface[]>([]);
const open = ref(false);
const loading = ref(false);

const visibleResults = computed(() => results.value.slice(0, MAX_RESULTS));

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(model, (value) => {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    if (value.trim().length < MIN_QUERY_LENGTH) {
        results.value = [];
        open.value = false;
        return;
    }
    debounceTimer = setTimeout(async () => {
        loading.value = true;
        try {
            results.value = await searchProducts(value.trim());
            open.value = results.value.length > 0;
        } catch {
            results.value = [];
            open.value = false;
        } finally {
            loading.value = false;
        }
    }, DEBOUNCE_MS);
});

function pick(product: AhProductInterface): void {
    open.value = false;
    results.value = [];
    emit('select', product);
}

function close(): void {
    open.value = false;
}
</script>

<template>
    <div
        class="search-wrapper"
        @focusout="close"
    >
        <input
            v-model="model"
            type="text"
            class="search-input"
            placeholder="Zoek AH product..."
        >
        <div
            v-show="open"
            class="results"
        >
            <button
                v-for="product in visibleResults"
                :key="product.id"
                type="button"
                class="result"
                @mousedown.prevent="pick(product)"
            >
                <img
                    v-if="product.imageUrl"
                    :src="product.imageUrl"
                    class="result-image"
                    alt=""
                >
                <span class="result-title">{{ product.title }}</span>
                <span class="result-size">{{ product.salesUnitSize }}</span>
                <span
                    v-if="product.isBonus"
                    class="result-bonus"
                >Bonus</span>
                <span class="result-price">
                    &euro;{{ (product.bonusPrice ?? product.price).toFixed(2) }}
                </span>
            </button>
        </div>
    </div>
</template>

<style scoped>
.search-wrapper {
    @apply relative flex-1;
}

.search-input {
    @apply w-full border rounded px-3 py-2 text-sm;
}

.results {
    @apply absolute left-0 right-0 top-full mt-1 bg-white border rounded-md shadow-lg z-20 max-h-80 overflow-y-auto;
}

.result {
    @apply flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50;
}

.result-image {
    @apply w-8 h-8 object-contain;
}

.result-title {
    @apply flex-1 truncate;
}

.result-size {
    @apply text-xs text-gray-400;
}

.result-bonus {
    @apply text-xs bg-orange-100 text-orange-700 rounded px-1.5 py-0.5 font-semibold;
}

.result-price {
    @apply font-medium;
}
</style>
