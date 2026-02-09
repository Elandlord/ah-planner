<script setup lang="ts">
import { useShoppingListStore } from '~/stores/shoppingListStore';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';

const shoppingListStore = useShoppingListStore();

const newItemName = ref('');
const newItemCategory = ref<ProductCategoryEnum>(ProductCategoryEnum.overig);

const categoryOptions = Object.values(ProductCategoryEnum);

function addItem(): void {
    if (!newItemName.value.trim()) {
        return;
    }
    shoppingListStore.addItem({
        name: newItemName.value.trim(),
        category: newItemCategory.value,
        checked: false,
        frequency: 1,
    });
    newItemName.value = '';
}
</script>

<template>
    <div>
        <h1 class="page-title">
            Boodschappenlijst
        </h1>

        <div class="add-form">
            <input
                v-model="newItemName"
                type="text"
                class="add-input"
                placeholder="Product toevoegen..."
                @keyup.enter="addItem"
            >
            <select
                v-model="newItemCategory"
                class="add-category"
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
                class="add-btn"
                :disabled="!newItemName.trim()"
                @click="addItem"
            >
                Toevoegen
            </button>
        </div>

        <div class="actions">
            <button
                class="action-btn"
                @click="shoppingListStore.generateFromHistory()"
            >
                Genereer uit aankoopgeschiedenis
            </button>
            <button
                v-if="shoppingListStore.checkedItems.length > 0"
                class="action-btn-danger"
                @click="shoppingListStore.clearChecked()"
            >
                Afgevinkte verwijderen
            </button>
        </div>

        <div
            v-if="shoppingListStore.items.length === 0"
            class="empty-state"
        >
            Je boodschappenlijst is leeg. Voeg items toe of genereer uit je aankoopgeschiedenis.
        </div>

        <div
            v-for="(items, category) in shoppingListStore.itemsByCategory"
            :key="category"
            class="category-group"
        >
            <h3 class="category-title">
                {{ category }}
            </h3>
            <div
                v-for="item in items"
                :key="item.name"
                class="list-item"
                :class="{ 'list-item--checked': item.checked }"
            >
                <label class="item-label">
                    <input
                        type="checkbox"
                        :checked="item.checked"
                        class="item-checkbox"
                        @change="shoppingListStore.toggleItem(item.name)"
                    >
                    <span class="item-text">{{ item.name }}</span>
                </label>
                <span class="item-freq">{{ item.frequency }}x gekocht</span>
                <button
                    class="item-remove"
                    @click="shoppingListStore.removeItem(item.name)"
                >
                    &times;
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.page-title {
    @apply text-2xl font-bold mb-4;
}

.add-form {
    @apply flex gap-2 mb-4;
}

.add-input {
    @apply flex-1 border rounded px-3 py-2 text-sm;
}

.add-category {
    @apply border rounded px-3 py-2 text-sm;
}

.add-btn {
    @apply px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm
           disabled:opacity-50 disabled:cursor-not-allowed;
}

.actions {
    @apply flex gap-2 mb-4;
}

.action-btn {
    @apply text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-3 py-1;
}

.action-btn-danger {
    @apply text-sm text-red-600 hover:text-red-800 border border-red-200 rounded px-3 py-1;
}

.empty-state {
    @apply text-gray-500 text-center py-8;
}

.category-group {
    @apply mb-4;
}

.category-title {
    @apply text-sm font-semibold text-gray-500 uppercase mb-2 capitalize;
}

.list-item {
    @apply flex items-center gap-2 py-2 px-3 bg-white rounded mb-1 shadow-sm;
}

.list-item--checked {
    @apply opacity-50;
}

.item-label {
    @apply flex-1 flex items-center gap-2 cursor-pointer;
}

.item-checkbox {
    @apply rounded;
}

.list-item--checked .item-text {
    @apply line-through;
}

.item-freq {
    @apply text-xs text-gray-400;
}

.item-remove {
    @apply text-red-400 hover:text-red-600 text-lg;
}
</style>
