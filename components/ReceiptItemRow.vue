<script setup lang="ts">
import type ReceiptItemInterface from '~/types/ReceiptItemInterface';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';

const item = defineModel<ReceiptItemInterface>({ required: true });

const emit = defineEmits<{
    remove: [];
}>();

const categoryOptions = Object.values(ProductCategoryEnum);
</script>

<template>
    <div class="item-row">
        <input
            v-model="item.name"
            type="text"
            class="item-name"
            placeholder="Product naam"
        >
        <input
            v-model.number="item.quantity"
            type="number"
            min="1"
            class="item-quantity"
        >
        <input
            v-model.number="item.price"
            type="number"
            step="0.01"
            min="0"
            class="item-price"
        >
        <select
            v-model="item.category"
            class="item-category"
        >
            <option
                v-for="cat in categoryOptions"
                :key="cat"
                :value="cat"
            >
                {{ cat }}
            </option>
        </select>
        <button
            class="item-remove"
            @click="emit('remove')"
        >
            &times;
        </button>
    </div>
</template>

<style scoped>
.item-row {
    @apply flex gap-2 items-center py-1;
}

.item-name {
    @apply flex-1 border rounded px-2 py-1 text-sm;
}

.item-quantity {
    @apply w-16 border rounded px-2 py-1 text-sm text-center;
}

.item-price {
    @apply w-24 border rounded px-2 py-1 text-sm text-right;
}

.item-category {
    @apply w-28 border rounded px-2 py-1 text-sm;
}

.item-remove {
    @apply text-red-500 hover:text-red-700 text-xl font-bold px-2;
}
</style>
