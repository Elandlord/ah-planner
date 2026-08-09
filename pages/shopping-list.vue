<script setup lang="ts">
import { useShoppingListStore } from '~/stores/shoppingListStore';
import { useReceiptParser } from '~/composables/useReceiptParser';
import { useAhApi } from '~/composables/useAhApi';
import ProductCategoryEnum from '~/types/ProductCategoryEnum';
import type AhProductInterface from '~/types/AhProductInterface';

const shoppingListStore = useShoppingListStore();
const { categorizeProduct } = useReceiptParser();
const { resolveProducts, addToList } = useAhApi();

const activeTab = ref<'voorstel' | 'lijst'>('voorstel');
const newItemName = ref('');
const newItemCategory = ref<ProductCategoryEnum>(ProductCategoryEnum.overig);
const pushingToAh = ref(false);
const pushResult = ref<{ pushed: number; unresolved: string[] } | null>(null);

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

function addProduct(product: AhProductInterface): void {
    shoppingListStore.addItem({
        name: product.title,
        category: categorizeProduct(product.title),
        checked: false,
        frequency: 1,
    });
    newItemName.value = '';
}

async function pushToAh(): Promise<void> {
    const items = shoppingListStore.uncheckedItems;
    if (items.length === 0) {
        return;
    }

    pushingToAh.value = true;
    try {
        const products = await resolveProducts(items.map((item) => item.name));
        const resolved: { productId: number; quantity: number; name: string }[] = [];
        const unresolved: string[] = [];
        for (const item of items) {
            const product = products.get(item.name);
            if (product) {
                resolved.push({ productId: product.id, quantity: 1, name: item.name });
            } else {
                unresolved.push(item.name);
            }
        }

        const pushed = await addToList(resolved);
        pushResult.value = { pushed, unresolved };
    } finally {
        pushingToAh.value = false;
    }
}
</script>

<template>
    <div>
        <h1 class="page-title">
            Boodschappen
        </h1>

        <div class="tabs">
            <button
                :class="['tab', { active: activeTab === 'voorstel' }]"
                @click="activeTab = 'voorstel'"
            >
                Voorstel
            </button>
            <button
                :class="['tab', { active: activeTab === 'lijst' }]"
                @click="activeTab = 'lijst'"
            >
                Mijn lijst
            </button>
        </div>

        <ProposalPanel v-if="activeTab === 'voorstel'" />

        <template v-else>
        <div class="add-form">
            <AhProductSearchInput
                v-model="newItemName"
                @select="addProduct"
                @keyup.enter="addItem"
            />
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
                @click="shoppingListStore.generateFromWeekPlan()"
            >
                Genereer uit weekplan
            </button>
            <button
                v-if="shoppingListStore.uncheckedItems.length > 0"
                class="action-btn"
                :disabled="pushingToAh"
                @click="pushToAh"
            >
                {{ pushingToAh ? 'Bezig met versturen…' : 'Naar AH boodschappenlijst' }}
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
            v-if="pushResult"
            class="push-result"
        >
            <span>{{ pushResult.pushed }} item(en) toegevoegd aan je AH boodschappenlijst.</span>
            <span v-if="pushResult.unresolved.length > 0">
                Niet gevonden: {{ pushResult.unresolved.join(', ') }}
            </span>
        </div>

        <div
            v-if="shoppingListStore.items.length === 0"
            class="empty-state"
        >
            Je boodschappenlijst is leeg. Voeg items toe of genereer uit je aankoopgeschiedenis.
        </div>

        <div
            v-else
            class="estimated-total"
        >
            <span class="estimated-total-label">Geschat totaal</span>
            <span class="estimated-total-value">&euro;{{ shoppingListStore.estimatedTotal.toFixed(2) }}</span>
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
                    <span class="item-text-group">
                        <span class="item-text">
                            {{ item.name }}
                            <span
                                v-if="item.amounts && item.amounts.length > 0"
                                class="item-amounts"
                            >
                                ({{ item.amounts.join(' + ') }})
                            </span>
                        </span>
                        <span
                            v-if="item.sources && item.sources.length > 0"
                            class="item-sources"
                        >
                            Uit weekplan: {{ item.sources.map((source) => `${source.day} (${source.recipeName})`).join(', ') }}
                        </span>
                    </span>
                </label>
                <span class="item-price">
                    <template v-if="shoppingListStore.estimatedPrices[item.name.toLowerCase()] !== undefined">
                        &euro;{{ shoppingListStore.estimatedPrices[item.name.toLowerCase()].toFixed(2) }}
                    </template>
                    <template v-else>
                        geen prijsdata
                    </template>
                </span>
                <span class="item-freq">{{ item.frequency }}x gekocht</span>
                <button
                    class="item-remove"
                    @click="shoppingListStore.removeItem(item.name)"
                >
                    &times;
                </button>
            </div>
        </div>
        </template>
    </div>
</template>

<style scoped>
.tabs {
    @apply flex gap-1 bg-gray-100 rounded-lg p-1 mb-4 w-fit;
}

.tab {
    @apply px-4 py-1.5 text-sm rounded-md text-gray-600;
}

.tab.active {
    @apply bg-white text-gray-900 shadow-sm;
}

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

.push-result {
    @apply flex flex-col gap-1 text-sm text-gray-600 bg-white rounded-lg shadow-sm p-3 mb-4;
}

.empty-state {
    @apply text-gray-500 text-center py-8;
}

.estimated-total {
    @apply flex justify-between items-center bg-white rounded-lg shadow p-3 mb-4;
}

.estimated-total-label {
    @apply text-sm text-gray-500;
}

.estimated-total-value {
    @apply text-xl font-bold text-blue-600;
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

.item-text-group {
    @apply flex flex-col;
}

.item-sources {
    @apply text-xs text-gray-400;
}

.item-amounts {
    @apply text-xs text-gray-400 font-normal;
}

.item-price {
    @apply text-xs text-gray-400 whitespace-nowrap;
}

.item-freq {
    @apply text-xs text-gray-400;
}

.item-remove {
    @apply text-red-400 hover:text-red-600 text-lg;
}
</style>
