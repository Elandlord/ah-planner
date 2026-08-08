<script setup lang="ts">
import { useReceiptStore } from '~/stores/receiptStore';
import { useShoppingListStore } from '~/stores/shoppingListStore';
import { summarise } from '~/composables/useDashboard';
import { monthlySpend } from '~/composables/useSpendingTrend';

const receiptStore = useReceiptStore();
const shoppingListStore = useShoppingListStore();

const now = ref(Date.now());
const summary = computed(() => summarise(receiptStore.receipts, now.value));
const months = computed(() => monthlySpend(receiptStore.receipts));

const monthLabel = computed(() =>
    new Date(now.value).toLocaleDateString('nl-NL', { month: 'long' }));

const versusAverage = computed(() => summary.value.monthTotal - summary.value.averageMonth);

const paceLabel = computed(() => {
    if (summary.value.averageMonth === 0) {
        return 'Nog geen maand om mee te vergelijken.';
    }
    if (versusAverage.value < 0) {
        return `€${Math.abs(versusAverage.value).toFixed(2)} onder je maandgemiddelde.`;
    }
    return `€${versusAverage.value.toFixed(2)} boven je maandgemiddelde.`;
});

const paceClass = computed(() => (versusAverage.value < 0 ? 'pace-good' : 'pace-warn'));

const lastVisitLabel = computed(() => {
    const days = summary.value.lastReceiptDaysAgo;
    if (days === null) {
        return 'Nog geen bonnen';
    }
    if (days === 0) {
        return 'Vandaag geweest';
    }
    if (days === 1) {
        return 'Gisteren geweest';
    }
    return `${days} dagen geleden`;
});

const openListItems = computed(() =>
    shoppingListStore.items.filter((item) => !item.checked).length);

const topCategories = computed(() =>
    Object.entries(receiptStore.spendingByCategory)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5));

const maxCategory = computed(() => topCategories.value[0]?.[1] ?? 1);
</script>

<template>
    <div>
        <div class="hero">
            <div>
                <p class="hero-kicker">
                    {{ monthLabel }}
                </p>
                <p class="hero-total">
                    &euro;{{ summary.monthTotal.toFixed(2) }}
                </p>
                <p :class="['hero-pace', paceClass]">
                    {{ paceLabel }}
                </p>
            </div>
            <div class="hero-side">
                <p class="hero-side-value">
                    {{ summary.monthReceipts }}
                </p>
                <p class="hero-side-label">
                    bonnen deze maand
                </p>
                <p class="hero-side-note">
                    {{ lastVisitLabel }}
                </p>
            </div>
        </div>

        <div class="tiles">
            <NuxtLink
                to="/shopping-list"
                class="tile tile-action"
            >
                <p class="tile-value">
                    {{ openListItems }}
                </p>
                <p class="tile-label">
                    op je boodschappenlijst
                </p>
            </NuxtLink>
            <div class="tile">
                <p class="tile-value tile-value-savings">
                    &euro;{{ summary.totalSavings.toFixed(2) }}
                </p>
                <p class="tile-label">
                    ooit met zegels &amp; emballage betaald
                </p>
            </div>
            <div class="tile">
                <p class="tile-value tile-value-bonus">
                    &euro;{{ summary.monthDiscount.toFixed(2) }}
                </p>
                <p class="tile-label">
                    bonusvoordeel deze maand
                </p>
            </div>
            <div class="tile">
                <p class="tile-value">
                    {{ summary.totalReceipts }}
                </p>
                <p class="tile-label">
                    bonnen bewaard
                </p>
            </div>
        </div>

        <MonthlySpendChart
            v-if="months.length > 0"
            :months="months"
        />

        <div
            v-if="topCategories.length > 0"
            class="panel"
        >
            <h2 class="panel-title">
                Waar je geld heen gaat
            </h2>
            <div
                v-for="[category, amount] in topCategories"
                :key="category"
                class="category-row"
            >
                <span class="category-name">{{ category }}</span>
                <span class="category-bar">
                    <span
                        class="category-fill"
                        :style="{ width: `${(amount / maxCategory) * 100}%` }"
                    />
                </span>
                <span class="category-amount">&euro;{{ amount.toFixed(2) }}</span>
            </div>
        </div>

        <p
            v-if="summary.totalReceipts === 0"
            class="empty-state"
        >
            Nog niks te zien. Koppel Albert Heijn op de Bonnen-pagina en haal je bonnen op.
        </p>
    </div>
</template>

<style scoped>
.hero {
    @apply flex items-start justify-between gap-4 bg-blue-600 text-white rounded-lg p-6 mb-4;
}

.hero-kicker {
    @apply text-sm uppercase tracking-wide text-blue-100;
}

.hero-total {
    @apply text-4xl font-bold;
}

.hero-pace {
    @apply text-sm mt-1;
}

.pace-good {
    @apply text-emerald-200;
}

.pace-warn {
    @apply text-amber-200;
}

.hero-side {
    @apply text-right;
}

.hero-side-value {
    @apply text-3xl font-bold;
}

.hero-side-label {
    @apply text-sm text-blue-100;
}

.hero-side-note {
    @apply text-xs text-blue-200 mt-1;
}

.tiles {
    @apply grid grid-cols-2 md:grid-cols-4 gap-4 mb-4;
}

.tile {
    @apply bg-white rounded-lg shadow p-4;
}

.tile-action {
    @apply block hover:shadow-md transition-shadow;
}

.tile-value {
    @apply text-2xl font-bold;
}

.tile-value-savings {
    @apply text-amber-600;
}

.tile-value-bonus {
    @apply text-emerald-600;
}

.tile-label {
    @apply text-sm text-gray-500;
}

.panel {
    @apply bg-white rounded-lg shadow p-4;
}

.panel-title {
    @apply font-semibold mb-3;
}

.category-row {
    @apply flex items-center gap-3 py-1;
}

.category-name {
    @apply w-28 text-sm text-gray-600 capitalize;
}

.category-bar {
    @apply flex-1 h-2 bg-gray-100 rounded-full overflow-hidden;
}

.category-fill {
    @apply block h-full bg-blue-600 rounded-full;
}

.category-amount {
    @apply w-24 text-right text-sm;
}

.empty-state {
    @apply text-gray-500 text-center py-8;
}
</style>
