<script setup lang="ts">
import { adviseOnSpending } from '~/composables/useSpendingAdvice';
import { premiumAdvice, storeScenarios } from '~/composables/useSavingsAdvice';
import { koopzegelReturn } from '~/composables/useKoopzegels';
import { useReceiptStore } from '~/stores/receiptStore';

const SCENARIO_PERCENTAGES = [0.05, 0.1, 0.15];

const receiptStore = useReceiptStore();

const advice = computed(() => adviseOnSpending(receiptStore.receipts));
const premium = computed(() => premiumAdvice(receiptStore.receipts));
const zegels = computed(() => koopzegelReturn(receiptStore.receipts));
const scenarios = computed(() => storeScenarios(receiptStore.receipts, SCENARIO_PERCENTAGES));

const headlines = computed(() => {
    const gaps = advice.value.priceGaps;
    const biggest = gaps[0];
    const lines = [];

    if (biggest) {
        lines.push({
            tone: 'warn',
            text: `Je grootste kans is timing, niet merkkeuze: ${biggest.name} kostte je gemiddeld `
                + `€${biggest.averagePrice.toFixed(2)} terwijl je er ook €${biggest.bestPrice.toFixed(2)} `
                + `voor betaalde. Alleen dat product scheelt €${biggest.potentialSaving.toFixed(2)}.`,
        });
    }
    lines.push({
        tone: 'good',
        text: `Je pakt al ${(advice.value.discountShare * 100).toFixed(1)}% bonuskorting `
            + `(€${advice.value.discountTotal.toFixed(2)}). Dat is hoog, dus grote winst zit niet in `
            + 'meer bonus pakken maar in wannéér je koopt.',
    });
    if (zegels.value.redeemed > 0) {
        lines.push({
            tone: 'good',
            text: `Koopzegels zijn de moeite waard: €${zegels.value.invested.toFixed(2)} inleg werd `
                + `€${zegels.value.redeemed.toFixed(2)} aan de kassa, `
                + `${zegels.value.returnPercentage.toFixed(1)}% rendement.`,
        });
    }
    lines.push({
        tone: premium.value.net > 0 ? 'good' : 'warn',
        text: premium.value.net > 0
            ? `Het abonnement van €${premium.value.cost.toFixed(2)} verdient zichzelf terug: `
                + `€${premium.value.bioBenefit.toFixed(2)} aan bio-korting plus `
                + `€${premium.value.zegelGain.toFixed(2)} zegelwinst, netto `
                + `€${premium.value.net.toFixed(2)} per jaar.`
            : `Het abonnement van €${premium.value.cost.toFixed(2)} loopt met deze cijfers niet vol: `
                + `€${premium.value.bioBenefit.toFixed(2)} bio-korting en `
                + `€${premium.value.zegelGain.toFixed(2)} zegelwinst.`,
    });
    return lines;
});

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
                    Wat dit betekent
                </h2>
                <ul class="headlines">
                    <li
                        v-for="line in headlines"
                        :key="line.text"
                        :class="['headline', `headline--${line.tone}`]"
                    >
                        {{ line.text }}
                    </li>
                </ul>
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
                    Naar een andere supermarkt?
                </h2>
                <p class="panel-intro">
                    Prijzen van andere ketens staan niet in je bonnen, dus dit is een rekensom,
                    geen meting. Een goedkopere winkel scheelt op je eigen uitgaven, maar je
                    raakt de zegelwinst en de bio-korting kwijt.
                </p>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Scenario</th>
                            <th class="numeric">
                                Bespaard
                            </th>
                            <th class="numeric">
                                Verlies AH-voordeel
                            </th>
                            <th class="numeric">
                                Netto
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="scenario in scenarios"
                            :key="scenario.percentage"
                        >
                            <td>{{ (scenario.percentage * 100).toFixed(0) }}% goedkoper</td>
                            <td class="numeric">
                                &euro;{{ scenario.grossSaving.toFixed(2) }}
                            </td>
                            <td class="numeric">
                                &minus;&euro;{{ scenario.lostBenefits.toFixed(2) }}
                            </td>
                            <td
                                class="numeric"
                                :class="scenario.net > 0 ? 'saving' : 'saving-none'"
                            >
                                &euro;{{ scenario.net.toFixed(2) }}
                            </td>
                        </tr>
                    </tbody>
                </table>
                <p class="panel-note">
                    Ter vergelijking: je pakt nu al
                    {{ (advice.discountShare * 100).toFixed(1) }}% bonuskorting, en het verschil
                    tussen ketens op een vergelijkbaar mandje ligt meestal in dezelfde orde.
                    Zonder echte prijzen van die keten blijft dit een schatting.
                </p>
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
    @apply w-full text-sm table-fixed;
}

.table th {
    @apply text-left text-xs uppercase tracking-wide text-gray-400 pb-2;
}

.table th.numeric,
.table td.numeric {
    @apply text-right;
}

.table td {
    @apply py-1.5 border-t;
}

.table th:first-child,
.table td:first-child {
    @apply w-2/5;
}

.saving {
    @apply font-semibold text-amber-600;
}

.saving-none {
    @apply font-semibold text-gray-400;
}

.headlines {
    @apply space-y-2;
}

.headline {
    @apply text-sm pl-3 border-l-4;
}

.headline--good {
    @apply border-emerald-500 text-gray-700;
}

.headline--warn {
    @apply border-amber-500 text-gray-700;
}

.panel-note {
    @apply text-xs text-gray-400 mt-3;
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
