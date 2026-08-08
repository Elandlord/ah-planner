<script setup lang="ts">
import { koopzegelBookCost, koopzegelReturn } from '~/composables/useKoopzegels';
import { useReceiptStore } from '~/stores/receiptStore';

const receiptStore = useReceiptStore();

const result = computed(() => koopzegelReturn(receiptStore.receipts));
</script>

<template>
    <div
        v-if="result.redeemed > 0"
        class="panel"
    >
        <h2 class="panel-title">
            Rendement op koopzegels
        </h2>

        <div class="figures">
            <div class="figure">
                <p class="figure-value">
                    {{ result.books.toFixed(0) }}
                </p>
                <p class="figure-label">
                    volle boekjes ingeleverd
                </p>
            </div>
            <div class="figure">
                <p class="figure-value">
                    &euro;{{ result.invested.toFixed(2) }}
                </p>
                <p class="figure-label">
                    ingelegd in zegels
                </p>
            </div>
            <div class="figure">
                <p class="figure-value">
                    &euro;{{ result.redeemed.toFixed(2) }}
                </p>
                <p class="figure-label">
                    uitbetaald aan de kassa
                </p>
            </div>
            <div class="figure">
                <p class="figure-value figure-value-gain">
                    +&euro;{{ result.gain.toFixed(2) }}
                </p>
                <p class="figure-label">
                    winst ({{ result.returnPercentage.toFixed(1) }}%)
                </p>
            </div>
        </div>

        <p class="panel-note">
            Een boekje kost &euro;{{ koopzegelBookCost.toFixed(2) }} aan zegels en levert
            &euro;52,00 op. Het kopen van zegels staat niet als losse regel op de kassabon,
            dus de inleg is berekend uit het aantal ingeleverde boekjes.
        </p>
    </div>
</template>

<style scoped>
.panel {
    @apply bg-white rounded-lg shadow p-4 mb-4;
}

.panel-title {
    @apply font-semibold mb-3;
}

.figures {
    @apply grid grid-cols-2 md:grid-cols-4 gap-4;
}

.figure-value {
    @apply text-2xl font-bold;
}

.figure-value-gain {
    @apply text-emerald-600;
}

.figure-label {
    @apply text-sm text-gray-500;
}

.panel-note {
    @apply text-xs text-gray-400 mt-3;
}
</style>
