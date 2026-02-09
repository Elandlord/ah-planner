<script setup lang="ts">
import type ReceiptInterface from '~/types/ReceiptInterface';
import type ReceiptItemInterface from '~/types/ReceiptItemInterface';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';

const receipt = defineModel<ReceiptInterface>({ required: true });

const emit = defineEmits<{
    save: [];
    cancel: [];
}>();

const computedTotal = computed(() =>
    receipt.value.items.reduce(
        (sum, item) => sum + item.price * item.quantity, 0,
    ),
);

function addItem(): void {
    receipt.value.items.push({
        name: '',
        price: 0,
        quantity: 1,
        category: ProductCategoryEnum.overig,
    });
}

function removeItem(index: number): void {
    receipt.value.items.splice(index, 1);
}
</script>

<template>
    <div class="receipt-review">
        <div class="review-header">
            <h2 class="review-title">
                Bon controleren
            </h2>
            <div class="review-meta">
                <label class="meta-label">
                    Datum:
                    <input
                        v-model="receipt.date"
                        type="date"
                        class="meta-input"
                    >
                </label>
            </div>
        </div>

        <div class="items-header">
            <span class="col-name">Product</span>
            <span class="col-qty">Aantal</span>
            <span class="col-price">Prijs</span>
            <span class="col-cat">Categorie</span>
            <span class="col-action" />
        </div>

        <ReceiptItemRow
            v-for="(item, index) in receipt.items"
            :key="index"
            v-model="receipt.items[index]"
            @remove="removeItem(index)"
        />

        <button
            class="add-item-btn"
            @click="addItem"
        >
            + Product toevoegen
        </button>

        <div class="review-footer">
            <div class="total-display">
                Totaal: &euro;{{ computedTotal.toFixed(2) }}
            </div>
            <div class="action-buttons">
                <button
                    class="btn-cancel"
                    @click="emit('cancel')"
                >
                    Annuleren
                </button>
                <button
                    class="btn-save"
                    @click="emit('save')"
                >
                    Opslaan
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.receipt-review {
    @apply bg-white rounded-lg shadow p-4;
}

.review-header {
    @apply flex justify-between items-center mb-4;
}

.review-title {
    @apply text-lg font-semibold;
}

.meta-label {
    @apply text-sm text-gray-600;
}

.meta-input {
    @apply border rounded px-2 py-1 text-sm ml-2;
}

.items-header {
    @apply flex gap-2 text-xs text-gray-500 uppercase font-semibold pb-1 border-b mb-2;
}

.col-name {
    @apply flex-1;
}

.col-qty {
    @apply w-16 text-center;
}

.col-price {
    @apply w-24 text-right;
}

.col-cat {
    @apply w-28;
}

.col-action {
    @apply w-8;
}

.add-item-btn {
    @apply text-blue-600 hover:text-blue-800 text-sm mt-2;
}

.review-footer {
    @apply flex justify-between items-center mt-4 pt-4 border-t;
}

.total-display {
    @apply text-lg font-bold;
}

.action-buttons {
    @apply flex gap-2;
}

.btn-cancel {
    @apply px-4 py-2 text-gray-600 hover:text-gray-800 border rounded;
}

.btn-save {
    @apply px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700;
}
</style>
