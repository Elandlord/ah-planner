<script setup lang="ts">
import { useReceiptStore } from '~/stores/receiptStore';

const receiptStore = useReceiptStore();

const expandedId = ref<string | null>(null);

function toggleExpand(id: string): void {
    expandedId.value = expandedId.value === id ? null : id;
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('nl-NL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}
</script>

<template>
    <div>
        <h1 class="page-title">
            Bonnen Overzicht
        </h1>

        <p
            v-if="receiptStore.receipts.length === 0"
            class="empty-state"
        >
            Nog geen bonnen opgeslagen. Upload je eerste bon.
        </p>

        <div class="receipt-list">
            <div
                v-for="receipt in receiptStore.recentReceipts"
                :key="receipt.id"
                class="receipt-card"
            >
                <div
                    class="receipt-summary"
                    @click="toggleExpand(receipt.id)"
                >
                    <div>
                        <p class="receipt-store">
                            {{ receipt.storeName }}
                        </p>
                        <p class="receipt-date">
                            {{ formatDate(receipt.date) }}
                        </p>
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

.receipt-list {
    @apply space-y-3;
}

.receipt-card {
    @apply bg-white rounded-lg shadow;
}

.receipt-summary {
    @apply flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50;
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
