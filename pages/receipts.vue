<script setup lang="ts">
import { useReceiptStore } from '~/stores/receiptStore';
import { useReceiptExport } from '~/composables/useReceiptExport';

const receiptStore = useReceiptStore();
const { filterByWeek, filterByMonth, toCsv, toJson, downloadFile } = useReceiptExport();

const expandedId = ref<string | null>(null);
const activeFilter = ref<'all' | 'week' | 'month'>('all');
const selectedIds = ref<Set<string>>(new Set());
const showExportMenu = ref(false);

const filteredReceipts = computed(() => {
    const receipts = receiptStore.recentReceipts;
    if (activeFilter.value === 'week') {
        return filterByWeek(receipts, 0);
    }
    if (activeFilter.value === 'month') {
        return filterByMonth(receipts, 0);
    }
    return receipts;
});

const exportReceipts = computed(() => {
    if (selectedIds.value.size === 0) {
        return filteredReceipts.value;
    }
    return filteredReceipts.value.filter((r) => selectedIds.value.has(r.id));
});

const allSelected = computed(() => {
    return (
        filteredReceipts.value.length > 0 &&
        filteredReceipts.value.every((r) => selectedIds.value.has(r.id))
    );
});

function toggleExpand(id: string): void {
    expandedId.value = expandedId.value === id ? null : id;
}

function toggleSelect(id: string): void {
    const next = new Set(selectedIds.value);
    if (next.has(id)) {
        next.delete(id);
    } else {
        next.add(id);
    }
    selectedIds.value = next;
}

function toggleSelectAll(): void {
    if (allSelected.value) {
        selectedIds.value = new Set();
    } else {
        selectedIds.value = new Set(filteredReceipts.value.map((r) => r.id));
    }
}

function exportCsv(): void {
    const csv = toCsv(exportReceipts.value);
    downloadFile(csv, 'bonnen.csv', 'text/csv');
    showExportMenu.value = false;
}

function exportJson(): void {
    const json = toJson(exportReceipts.value);
    downloadFile(json, 'bonnen.json', 'application/json');
    showExportMenu.value = false;
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('nl-NL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

watch(activeFilter, () => {
    selectedIds.value = new Set();
});
</script>

<template>
    <div>
        <h1 class="page-title">
            Bonnen Overzicht
        </h1>

        <div
            v-if="receiptStore.receipts.length > 0"
            class="toolbar"
        >
            <div class="filter-tabs">
                <button
                    :class="['filter-tab', { active: activeFilter === 'all' }]"
                    @click="activeFilter = 'all'"
                >
                    Alles
                </button>
                <button
                    :class="['filter-tab', { active: activeFilter === 'week' }]"
                    @click="activeFilter = 'week'"
                >
                    Deze week
                </button>
                <button
                    :class="['filter-tab', { active: activeFilter === 'month' }]"
                    @click="activeFilter = 'month'"
                >
                    Deze maand
                </button>
            </div>

            <div class="toolbar-actions">
                <label class="select-all-label">
                    <input
                        type="checkbox"
                        :checked="allSelected"
                        @change="toggleSelectAll"
                    >
                    Alles
                </label>

                <div class="export-wrapper">
                    <button
                        class="export-btn"
                        :disabled="filteredReceipts.length === 0"
                        @click="showExportMenu = !showExportMenu"
                    >
                        Exporteer{{ selectedIds.size > 0 ? ` (${selectedIds.size})` : '' }}
                    </button>
                    <div
                        v-show="showExportMenu"
                        class="export-menu"
                    >
                        <button
                            class="export-option"
                            @click="exportCsv"
                        >
                            CSV
                        </button>
                        <button
                            class="export-option"
                            @click="exportJson"
                        >
                            JSON
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <p
            v-if="receiptStore.receipts.length === 0"
            class="empty-state"
        >
            Nog geen bonnen opgeslagen. Upload je eerste bon.
        </p>

        <p
            v-else-if="filteredReceipts.length === 0"
            class="empty-state"
        >
            Geen bonnen gevonden voor deze periode.
        </p>

        <div class="receipt-list">
            <div
                v-for="receipt in filteredReceipts"
                :key="receipt.id"
                class="receipt-card"
            >
                <div
                    class="receipt-summary"
                    @click="toggleExpand(receipt.id)"
                >
                    <div class="receipt-left">
                        <input
                            type="checkbox"
                            :checked="selectedIds.has(receipt.id)"
                            @click.stop="toggleSelect(receipt.id)"
                        >
                        <div>
                            <p class="receipt-store">
                                {{ receipt.storeName }}
                            </p>
                            <p class="receipt-date">
                                {{ formatDate(receipt.date) }}
                            </p>
                        </div>
                    </div>
                    <div class="receipt-info">
                        <span class="receipt-total">&euro;{{ receipt.total.toFixed(2) }}</span>
                        <span class="receipt-item-count">{{ receipt.items.length }} items</span>
                    </div>
                </div>

                <div
                    v-show="expandedId === receipt.id"
                    class="receipt-items"
                >
                    <div
                        v-for="item in receipt.items"
                        :key="item.name"
                        class="receipt-item"
                    >
                        <span class="item-name">{{ item.name }}</span>
                        <span class="item-qty">{{ item.quantity }}x</span>
                        <span class="item-price">&euro;{{ item.price.toFixed(2) }}</span>
                    </div>
                    <button
                        class="delete-btn"
                        @click="receiptStore.removeReceipt(receipt.id)"
                    >
                        Bon verwijderen
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.page-title {
    @apply text-2xl font-bold mb-4;
}

.empty-state {
    @apply text-gray-500 text-center py-8;
}

.toolbar {
    @apply flex flex-wrap items-center justify-between gap-3 mb-4;
}

.filter-tabs {
    @apply flex gap-1 bg-gray-100 rounded-lg p-1;
}

.filter-tab {
    @apply px-3 py-1.5 text-sm rounded-md text-gray-600;
}

.filter-tab.active {
    @apply bg-white text-gray-900 shadow-sm;
}

.toolbar-actions {
    @apply flex items-center gap-3;
}

.select-all-label {
    @apply flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer;
}

.export-wrapper {
    @apply relative;
}

.export-btn {
    @apply px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed;
}

.export-menu {
    @apply absolute right-0 top-full mt-1 bg-white rounded-md shadow-lg border z-10;
}

.export-option {
    @apply block w-full px-4 py-2 text-sm text-left hover:bg-gray-50;
}

.receipt-list {
    @apply space-y-3;
}

.receipt-card {
    @apply bg-white rounded-lg shadow;
}

.receipt-summary {
    @apply flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50;
}

.receipt-left {
    @apply flex items-center gap-3;
}

.receipt-store {
    @apply font-semibold;
}

.receipt-date {
    @apply text-sm text-gray-500;
}

.receipt-info {
    @apply text-right;
}

.receipt-total {
    @apply block font-bold text-lg;
}

.receipt-item-count {
    @apply text-sm text-gray-500;
}

.receipt-items {
    @apply px-4 pb-4 border-t;
}

.receipt-item {
    @apply flex justify-between py-1 text-sm;
}

.item-name {
    @apply flex-1;
}

.item-qty {
    @apply w-12 text-center text-gray-500;
}

.item-price {
    @apply w-20 text-right;
}

.delete-btn {
    @apply text-sm text-red-500 hover:text-red-700 mt-3;
}
</style>
