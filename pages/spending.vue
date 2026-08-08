<script setup lang="ts">
import { useReceiptStore } from '~/stores/receiptStore';
import { breakdownPayments } from '~/composables/useReceiptPayments';
import { monthlySpend } from '~/composables/useSpendingTrend';

const receiptStore = useReceiptStore();

const payments = computed(() => breakdownPayments(receiptStore.receipts));
const months = computed(() => monthlySpend(receiptStore.receipts));
const savingsEntries = computed(() => Object.entries(payments.value.savingsByMethod));

const topItems = computed(() =>
    Object.entries(receiptStore.itemFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10),
);
</script>

<template>
    <div>
        <h1 class="page-title">
            Uitgaven Overzicht
        </h1>

        <div
            v-if="receiptStore.receiptCount === 0"
            class="empty-state"
        >
            Nog geen bonnen om te analyseren.
        </div>

        <template v-else>
            <div class="stats-grid">
                <div class="stat-card">
                    <p class="stat-label">
                        Totaal uitgegeven
                    </p>
                    <p class="stat-value">
                        &euro;{{ receiptStore.totalSpent.toFixed(2) }}
                    </p>
                </div>
                <div class="stat-card">
                    <p class="stat-label">
                        Aantal bonnen
                    </p>
                    <p class="stat-value">
                        {{ receiptStore.receiptCount }}
                    </p>
                </div>
                <div class="stat-card">
                    <p class="stat-label">
                        Gemiddeld per bon
                    </p>
                    <p class="stat-value">
                        &euro;{{ receiptStore.averagePerReceipt.toFixed(2) }}
                    </p>
                </div>
                <div class="stat-card">
                    <p class="stat-label">
                        Zelf betaald
                    </p>
                    <p class="stat-value stat-value-own">
                        &euro;{{ payments.paidWithOwnMoney.toFixed(2) }}
                    </p>
                    <p class="stat-note">
                        &euro;{{ payments.paidWithSavings.toFixed(2) }} met zegels &amp; emballage
                    </p>
                </div>
                <div class="stat-card">
                    <p class="stat-label">
                        Bonusvoordeel
                    </p>
                    <p class="stat-value stat-value-bonus">
                        &euro;{{ payments.discountTotal.toFixed(2) }}
                    </p>
                    <p class="stat-note">
                        korting op de kassabon
                    </p>
                </div>
            </div>

            <MonthlySpendChart :months="months" />

            <KoopzegelReturn />

            <div
                v-if="savingsEntries.length > 0"
                class="section"
            >
                <h2 class="section-title">
                    Niet met eigen geld betaald
                </h2>
                <div class="top-items">
                    <div
                        v-for="[method, amount] in savingsEntries"
                        :key="method"
                        class="top-item"
                    >
                        <span class="top-item-name">{{ method }}</span>
                        <span class="top-item-count">&euro;{{ amount.toFixed(2) }}</span>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2 class="section-title">
                    Uitgaven per categorie
                </h2>
                <SpendingChart
                    :spending-by-category="receiptStore.spendingByCategory"
                    :total-spent="receiptStore.totalSpent"
                />
            </div>

            <div class="section">
                <h2 class="section-title">
                    Meest gekochte producten
                </h2>
                <div class="top-items">
                    <div
                        v-for="[name, count] in topItems"
                        :key="name"
                        class="top-item"
                    >
                        <span class="top-item-name">{{ name }}</span>
                        <span class="top-item-count">{{ count }}x</span>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<style scoped>
.page-title {
    @apply text-2xl font-bold mb-4;
}

.empty-state {
    @apply text-gray-500 text-center py-8;
}

.stats-grid {
    @apply grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6;
}

.stat-card {
    @apply bg-white rounded-lg shadow p-4 text-center;
}

.stat-label {
    @apply text-sm text-gray-500;
}

.stat-value-own {
    @apply text-emerald-600;
}

.stat-value-bonus {
    @apply text-amber-600;
}

.stat-note {
    @apply text-xs text-gray-400 mt-1;
}

.stat-value {
    @apply text-2xl font-bold text-blue-600 mt-1;
}

.section {
    @apply bg-white rounded-lg shadow p-4 mb-6;
}

.section-title {
    @apply text-lg font-semibold mb-3;
}

.top-items {
    @apply space-y-1;
}

.top-item {
    @apply flex justify-between py-1 text-sm;
}

.top-item-name {
    @apply capitalize;
}

.top-item-count {
    @apply text-gray-500;
}
</style>
