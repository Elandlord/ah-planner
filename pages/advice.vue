<script setup lang="ts">
import { adviseOnSpending } from '~/composables/useSpendingAdvice';
import { useReceiptStore } from '~/stores/receiptStore';

const receiptStore = useReceiptStore();

const advice = computed(() => adviseOnSpending(receiptStore.receipts));

const savingShare = computed(() =>
    (advice.value.tillTotal === 0
        ? 0
        : (advice.value.totalPotentialSaving / advice.value.tillTotal) * 100));
</script>

<template>
    <div>
        <h1 class="page-title">
            Advies
        </h1>

        <p
            v-if="advice.tillTotal === 0"
            class="empty-state"
        >
            Nog geen bonnen om advies op te baseren.
        </p>

        <template v-else>
            <div class="stats-grid">
                <div class="stat-card">
                    <p class="stat-label">
                        Bonusvoordeel dat je al pakt
                    </p>
                    <p class="stat-value stat-value-good">
                        {{ (advice.discountShare * 100).toFixed(1) }}%
                    </p>
                    <p class="stat-note">
                        &euro;{{ advice.discountTotal.toFixed(2) }} korting op
                        &euro;{{ advice.tillTotal.toFixed(2) }}
                    </p>
                </div>
                <div class="stat-card">
                    <p class="stat-label">
                        Te winnen op timing
                    </p>
                    <p class="stat-value stat-value-warn">
                        &euro;{{ advice.totalPotentialSaving.toFixed(2) }}
                    </p>
                    <p class="stat-note">
                        {{ savingShare.toFixed(1) }}% als je alles voor je eigen laagste prijs koopt
                    </p>
                </div>
                <div class="stat-card">
                    <p class="stat-label">
                        Verschillende producten
                    </p>
                    <p class="stat-value">
                        {{ advice.distinctItems }}
                    </p>
                    <p class="stat-note">
                        de top {{ advice.topSpenders.length }} hieronder is je zwaartepunt
                    </p>
                </div>
            </div>

            <div class="panel">
                <h2 class="panel-title">
                    Hier valt het meeste te halen
                </h2>
                <p class="panel-intro">
                    Je betaalde deze producten soms goedkoper dan gemiddeld. Het verschil is wat
                    het scheelt als je ze koopt wanneer ze in de bonus zijn.
                </p>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th class="numeric">
                                Gekocht
                            </th>
                            <th class="numeric">
                                Gemiddeld
                            </th>
                            <th class="numeric">
                                Laagst
                            </th>
                            <th class="numeric">
                                Scheelt
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="item in advice.priceGaps"
                            :key="item.name"
                        >
                            <td>{{ item.name }}</td>
                            <td class="numeric">
                                {{ item.quantity.toFixed(0) }}x
                            </td>
                            <td class="numeric">
                                &euro;{{ item.averagePrice.toFixed(2) }}
                            </td>
                            <td class="numeric">
                                &euro;{{ item.bestPrice.toFixed(2) }}
                            </td>
                            <td class="numeric saving">
                                &euro;{{ item.potentialSaving.toFixed(2) }}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="panel">
                <h2 class="panel-title">
                    Grootste posten
                </h2>
                <div
                    v-for="item in advice.topSpenders"
                    :key="item.name"
                    class="spender-row"
                >
                    <span class="spender-name">{{ item.name }}</span>
                    <span class="spender-bar">
                        <span
                            class="spender-fill"
                            :style="{ width: `${(item.spend / advice.topSpenders[0].spend) * 100}%` }"
                        />
                    </span>
                    <span class="spender-amount">
                        &euro;{{ item.spend.toFixed(2) }}
                        <em class="spender-share">{{ (item.share * 100).toFixed(1) }}%</em>
                    </span>
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
    @apply grid grid-cols-1 md:grid-cols-3 gap-4 mb-4;
}

.stat-card {
    @apply bg-white rounded-lg shadow p-4;
}

.stat-label {
    @apply text-sm text-gray-500;
}

.stat-value {
    @apply text-3xl font-bold;
}

.stat-value-good {
    @apply text-emerald-600;
}

.stat-value-warn {
    @apply text-amber-600;
}

.stat-note {
    @apply text-xs text-gray-400 mt-1;
}

.panel {
    @apply bg-white rounded-lg shadow p-4 mb-4;
}

.panel-title {
    @apply font-semibold;
}

.panel-intro {
    @apply text-sm text-gray-500 mb-3;
}

.table {
    @apply w-full text-sm;
}

.table th {
    @apply text-left text-xs uppercase tracking-wide text-gray-400 pb-2;
}

.table td {
    @apply py-1.5 border-t;
}

.numeric {
    @apply text-right;
}

.saving {
    @apply font-semibold text-amber-600;
}

.spender-row {
    @apply flex items-center gap-3 py-1;
}

.spender-name {
    @apply w-40 text-sm text-gray-600;
}

.spender-bar {
    @apply flex-1 h-2 bg-gray-100 rounded-full overflow-hidden;
}

.spender-fill {
    @apply block h-full bg-blue-600 rounded-full;
}

.spender-amount {
    @apply w-32 text-right text-sm;
}

.spender-share {
    @apply block text-xs text-gray-400 not-italic;
}
</style>
