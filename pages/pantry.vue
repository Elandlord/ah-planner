<script setup lang="ts">
import { buildStockItems, groupPantryItemsByCategory } from '~/composables/usePantry';
import { usePantryStore } from '~/stores/pantryStore';
import { useReceiptStore } from '~/stores/receiptStore';
import { useToast } from '~/composables/useToast';

const pantryStore = usePantryStore();
const receiptStore = useReceiptStore();
const toast = useToast();

const search = ref('');

/** The stock is what you say it is; the shelf life only adds a hint of how fresh it still is. */
const stockWithFreshness = computed(() => buildStockItems(
    pantryStore.items.map((item) => ({
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        price: 0,
        purchaseDate: item.purchaseDate,
    })),
));

const visibleItems = computed(() => {
    const term = search.value.trim().toLowerCase();
    if (term.length === 0) {
        return stockWithFreshness.value;
    }
    return stockWithFreshness.value.filter((item) => item.name.toLowerCase().includes(term));
});

const itemsByCategory = computed(() => groupPantryItemsByCategory(visibleItems.value));
const expiringSoon = computed(() => stockWithFreshness.value.filter((item) => item.expiringSoon));

const unprocessedReceipts = computed(() =>
    receiptStore.receipts.filter((receipt) => !pantryStore.isProcessed(receipt.id)));

function fillFromReceipts(): void {
    const added = pantryStore.addFromNewReceipts(unprocessedReceipts.value);
    if (added === 0) {
        toast.info('Geen nieuwe bonnen om toe te voegen.');
        return;
    }
    toast.success(`${added} bonnen aan je voorraad toegevoegd.`);
}

function emptyStock(): void {
    pantryStore.clear();
    toast.info('Voorraad geleegd.');
}
</script>

<template>
    <div>
        <h1 class="page-title">
            Voorraad
        </h1>

        <div class="controls">
            <label class="auto-add">
                <input
                    type="checkbox"
                    :checked="pantryStore.autoAdd"
                    @change="pantryStore.setAutoAdd(($event.target as HTMLInputElement).checked)"
                >
                Nieuwe bonnen automatisch toevoegen
            </label>
            <div class="control-actions">
                <button
                    class="action-btn"
                    :disabled="unprocessedReceipts.length === 0"
                    @click="fillFromReceipts"
                >
                    {{ unprocessedReceipts.length === 0
                        ? 'Alles al toegevoegd'
                        : `Voeg ${unprocessedReceipts.length} bonnen toe` }}
                </button>
                <button
                    v-if="pantryStore.items.length > 0"
                    class="action-btn-danger"
                    @click="emptyStock"
                >
                    Voorraad legen
                </button>
            </div>
        </div>

        <p
            v-if="pantryStore.items.length === 0"
            class="empty-state"
        >
            Je voorraad is leeg. Voeg je bonnen toe om te vullen wat je in huis hebt.
        </p>

        <template v-else>
            <div class="summary">
                <span>{{ pantryStore.totalItems }} producten in huis</span>
                <span
                    v-if="expiringSoon.length > 0"
                    class="expiring-summary"
                >{{ expiringSoon.length }} bijna over datum</span>
            </div>

            <input
                v-model="search"
                type="search"
                class="search-input"
                placeholder="Zoek in je voorraad..."
            >

            <div
                v-for="(items, category) in itemsByCategory"
                :key="category"
                class="category-group"
            >
                <h3 class="category-title">
                    {{ category }}
                </h3>
                <div
                    v-for="item in items"
                    :key="item.name"
                    class="stock-item"
                    :class="{ 'stock-item--expiring': item.expiringSoon }"
                >
                    <span class="item-name">{{ item.name }}</span>
                    <span
                        v-if="item.daysRemaining <= 0"
                        class="expired-badge"
                    >Over datum</span>
                    <span
                        v-else-if="item.expiringSoon"
                        class="expiring-badge"
                    >Bijna over datum</span>
                    <span class="item-days">
                        {{ item.daysRemaining > 0
                            ? `${Math.round(item.daysRemaining)} dagen`
                            : `${Math.abs(Math.round(item.daysRemaining))} dagen over` }}
                    </span>
                    <div class="stepper">
                        <button
                            class="step"
                            @click="pantryStore.decrease(item.name)"
                        >
                            &minus;
                        </button>
                        <span class="step-value">{{ item.quantity }}</span>
                        <button
                            class="step"
                            @click="pantryStore.increase(item.name)"
                        >
                            +
                        </button>
                    </div>
                    <button
                        class="remove-btn"
                        title="Verwijderen"
                        @click="pantryStore.remove(item.name)"
                    >
                        &times;
                    </button>
                </div>
            </div>
        </template>
    </div>
</template>

<style scoped>
.page-title {
    @apply text-2xl font-bold mb-4;
}

.controls {
    @apply flex flex-wrap items-center justify-between gap-3 bg-white rounded-lg shadow p-4 mb-4;
}

.auto-add {
    @apply flex items-center gap-2 text-sm text-gray-600;
}

.control-actions {
    @apply flex gap-2;
}

.action-btn {
    @apply px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed;
}

.action-btn-danger {
    @apply px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-md hover:bg-red-50;
}

.empty-state {
    @apply text-gray-500 text-center py-8;
}

.summary {
    @apply flex items-center gap-3 text-sm text-gray-600 mb-3;
}

.expiring-summary {
    @apply px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium;
}

.search-input {
    @apply w-full px-3 py-2 text-sm border rounded-md mb-4;
}

.category-group {
    @apply mb-4;
}

.category-title {
    @apply text-sm font-semibold text-gray-500 uppercase mb-2 capitalize;
}

.stock-item {
    @apply flex items-center gap-3 bg-white rounded-lg shadow-sm px-3 py-2 mb-1.5;
}

.stock-item--expiring {
    @apply border-l-4 border-amber-400;
}

.item-name {
    @apply flex-1 text-sm;
}

.expiring-badge {
    @apply text-xs text-amber-700;
}

.expired-badge {
    @apply text-xs text-rose-600;
}

.item-days {
    @apply text-xs text-gray-400 w-20 text-right;
}

.stepper {
    @apply flex items-center gap-1.5;
}

.step {
    @apply w-7 h-7 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50;
}

.step-value {
    @apply w-6 text-center text-sm font-semibold;
}

.remove-btn {
    @apply text-gray-400 hover:text-red-500 px-1;
}
</style>
