<script setup lang="ts">
import { useSuggestions } from '~/composables/useSuggestions';
import { useAhApi } from '~/composables/useAhApi';
import type ProposalItemInterface from '~/types/ProposalItemInterface';
import { useToast } from '~/composables/useToast';

const PAGE_SIZE = 30;

const { buildProposal, historyNames, resolveNames } = useSuggestions();
const toast = useToast();
const { fetchStatus } = useAhApi();

const mode = ref<'voorstel' | 'bonus' | 'alles'>('voorstel');
const items = ref<ProposalItemInterface[]>([]);
const catalog = ref<ProposalItemInterface[]>([]);
const resolvedCount = ref(0);
const search = ref('');
const loading = ref(true);
const loadingMore = ref(false);
const submitting = ref(false);
const connected = ref(false);

const history = computed(() => historyNames());

const filteredCatalog = computed(() => {
    const term = search.value.trim().toLowerCase();
    const withProduct = catalog.value.filter((item) => item.product !== null);
    const matching = term.length === 0
        ? withProduct
        : withProduct.filter((item) =>
            item.name.toLowerCase().includes(term)
            || (item.product?.title ?? '').toLowerCase().includes(term));
    if (mode.value === 'bonus') {
        return matching.filter((item) => item.product?.isBonus);
    }
    return matching;
});

const visibleItems = computed(() => (mode.value === 'voorstel' ? items.value : filteredCatalog.value));

const hasMore = computed(() => mode.value !== 'voorstel' && resolvedCount.value < history.value.length);

const selectedItems = computed(() => {
    const chosen = [...items.value, ...catalog.value]
        .filter((item) => item.selected && item.product !== null);
    return [...new Map(chosen.map((item) => [item.name, item])).values()];
});

const selectedTotal = computed(() =>
    selectedItems.value.reduce((sum, item) => {
        const price = item.product?.bonusPrice ?? item.product?.price ?? 0;
        return sum + price * item.quantity;
    }, 0),
);

const bonusCount = computed(() =>
    visibleItems.value.filter((item) => item.product?.isBonus).length,
);

const submitDisabled = computed(() =>
    submitting.value || !connected.value || selectedItems.value.length === 0,
);

async function load(): Promise<void> {
    loading.value = true;
    try {
        const [proposal, status] = await Promise.all([buildProposal(), fetchStatus()]);
        items.value = proposal;
        connected.value = status;
    } catch {
        toast.error('Voorstel laden mislukt.');
    } finally {
        loading.value = false;
    }
}

async function loadMore(): Promise<void> {
    if (loadingMore.value || !hasMore.value) {
        return;
    }
    loadingMore.value = true;
    try {
        const next = history.value.slice(resolvedCount.value, resolvedCount.value + PAGE_SIZE);
        const resolved = await resolveNames(next);
        const known = new Set(catalog.value.map((item) => item.name));
        catalog.value = [...catalog.value, ...resolved.filter((item) => !known.has(item.name))];
        resolvedCount.value += next.length;
    } catch {
        toast.error('Meer producten laden mislukt.');
    } finally {
        loadingMore.value = false;
    }
}

async function switchMode(next: 'voorstel' | 'bonus' | 'alles'): Promise<void> {
    mode.value = next;
    if (next !== 'voorstel' && catalog.value.length === 0) {
        await loadMore();
    }
}

function increase(item: ProposalItemInterface): void {
    item.quantity += 1;
}

function decrease(item: ProposalItemInterface): void {
    if (item.quantity > 1) {
        item.quantity -= 1;
    }
}

async function addToAhList(): Promise<void> {
    submitting.value = true;
    try {
        const payload = selectedItems.value.map((item) => ({
            productId: item.product?.id ?? 0,
            quantity: item.quantity,
            name: item.product?.title ?? item.name,
        }));
        const response = await $fetch<{ added: number }>('/api/ah/list-add', {
            method: 'POST',
            body: { items: payload },
        });
        toast.success(`${response.added} producten op je AH lijst gezet. Check de Appie app.`);
    } catch {
        toast.error('Toevoegen aan AH lijst mislukt. Controleer de koppeling op de Bonnen-pagina.');
    } finally {
        submitting.value = false;
    }
}

function itemPrice(item: ProposalItemInterface): number {
    return item.product?.bonusPrice ?? item.product?.price ?? 0;
}

onMounted(load);
</script>

<template>
    <div>
        <p class="page-subtitle">
            Op basis van je aankoopgeschiedenis, met bonusaanbiedingen voorgeselecteerd.
        </p>

        <div class="mode-bar">
            <div class="modes">
                <button
                    :class="['mode', { active: mode === 'voorstel' }]"
                    @click="switchMode('voorstel')"
                >
                    Voorstel
                </button>
                <button
                    :class="['mode', { active: mode === 'bonus' }]"
                    @click="switchMode('bonus')"
                >
                    In de bonus
                </button>
                <button
                    :class="['mode', { active: mode === 'alles' }]"
                    @click="switchMode('alles')"
                >
                    Alles wat je koopt
                </button>
            </div>
            <input
                v-if="mode !== 'voorstel'"
                v-model="search"
                type="search"
                class="search-input"
                placeholder="Zoek in je geschiedenis..."
            >
        </div>

        <p
            v-if="loading || (loadingMore && visibleItems.length === 0)"
            class="empty-state"
        >
            {{ loading ? 'Voorstel samenstellen...' : 'Producten ophalen...' }}
        </p>

        <p
            v-else-if="visibleItems.length === 0"
            class="empty-state"
        >
            {{ mode === 'bonus'
                ? 'Niets uit je geschiedenis is deze week in de bonus.'
                : 'Nog niet genoeg aankoopgeschiedenis. Synchroniseer eerst je bonnen.' }}
        </p>

        <template v-else>
            <div class="summary-bar">
                <span>{{ selectedItems.length }} geselecteerd</span>
                <span
                    v-if="bonusCount > 0"
                    class="summary-bonus"
                >{{ bonusCount }} in de bonus</span>
                <span class="summary-total">&euro;{{ selectedTotal.toFixed(2) }}</span>
            </div>

            <div class="proposal-list">
                <div
                    v-for="item in visibleItems"
                    :key="item.name"
                    class="proposal-card"
                    :class="{ 'proposal-card--off': !item.selected }"
                >
                    <input
                        v-model="item.selected"
                        type="checkbox"
                        class="proposal-check"
                        :disabled="item.product === null"
                    >
                    <img
                        v-if="item.product?.imageUrl"
                        :src="item.product.imageUrl"
                        class="proposal-image"
                        alt=""
                    >
                    <div class="proposal-info">
                        <p class="proposal-name">
                            {{ item.product?.title ?? item.name }}
                        </p>
                        <p class="proposal-meta">
                            {{ item.timesBought }}x gekocht &middot;
                            {{ item.daysSinceLast }} dagen geleden &middot;
                            gemiddeld elke {{ item.medianIntervalDays }} dagen
                        </p>
                        <p
                            v-if="item.bonusMechanism"
                            class="proposal-bonus"
                        >
                            {{ item.bonusMechanism }}
                        </p>
                        <p
                            v-if="item.product === null"
                            class="proposal-unmatched"
                        >
                            Geen AH product gevonden
                        </p>
                    </div>
                    <div
                        v-if="item.product"
                        class="proposal-right"
                    >
                        <div class="qty-stepper">
                            <button
                                class="qty-btn"
                                :disabled="item.quantity <= 1"
                                @click="decrease(item)"
                            >
                                &minus;
                            </button>
                            <span class="qty-value">{{ item.quantity }}</span>
                            <button
                                class="qty-btn"
                                @click="increase(item)"
                            >
                                +
                            </button>
                        </div>
                        <span class="proposal-price">
                            &euro;{{ (itemPrice(item) * item.quantity).toFixed(2) }}
                        </span>
                    </div>
                </div>
            </div>

            <div
                v-if="hasMore"
                class="load-more-wrapper"
            >
                <button
                    class="load-more"
                    :disabled="loadingMore"
                    @click="loadMore"
                >
                    {{ loadingMore
                        ? 'Bezig...'
                        : `Meer laden (${resolvedCount} van ${history.length})` }}
                </button>
            </div>

            <div class="submit-bar">
                <p
                    v-if="!connected"
                    class="submit-hint"
                >
                    Verbind eerst met AH op de Bonnen-pagina om items op je lijst te zetten.
                </p>
                <button
                    class="submit-btn"
                    :disabled="submitDisabled"
                    @click="addToAhList"
                >
                    {{ submitting ? 'Bezig...' : `Zet ${selectedItems.length} items op Mijn AH Lijst` }}
                </button>
            </div>
        </template>

    </div>
</template>

<style scoped>
.page-title {
    @apply text-2xl font-bold mb-1;
}

.page-subtitle {
    @apply text-sm text-gray-500 mb-4;
}

.empty-state {
    @apply text-gray-500 text-center py-8;
}

.summary-bar {
    @apply flex items-center gap-3 text-sm text-gray-600 mb-3;
}

.summary-bonus {
    @apply text-orange-600 font-medium;
}

.summary-total {
    @apply ml-auto font-bold text-base text-gray-900;
}

.mode-bar {
    @apply flex flex-wrap items-center justify-between gap-2 mb-3;
}

.modes {
    @apply flex gap-1 bg-gray-100 rounded-lg p-1;
}

.mode {
    @apply px-3 py-1.5 text-sm rounded-md text-gray-600;
}

.mode.active {
    @apply bg-white text-gray-900 shadow-sm;
}

.search-input {
    @apply px-3 py-1.5 text-sm border rounded-md w-56;
}

.load-more-wrapper {
    @apply text-center mb-4;
}

.load-more {
    @apply px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50;
}

.proposal-list {
    @apply space-y-2 mb-4;
}

.proposal-card {
    @apply flex items-center gap-3 bg-white rounded-lg shadow-sm p-3;
}

.proposal-card--off {
    @apply opacity-50;
}

.proposal-check {
    @apply w-5 h-5 rounded;
}

.proposal-image {
    @apply w-12 h-12 object-contain;
}

.proposal-info {
    @apply flex-1 min-w-0;
}

.proposal-name {
    @apply font-medium truncate;
}

.proposal-meta {
    @apply text-xs text-gray-400;
}

.proposal-bonus {
    @apply text-xs text-orange-600 font-semibold;
}

.proposal-unmatched {
    @apply text-xs text-red-500;
}

.proposal-right {
    @apply flex flex-col items-end gap-1;
}

.qty-stepper {
    @apply flex items-center gap-2 border rounded-md px-1;
}

.qty-btn {
    @apply px-2 py-0.5 text-gray-600 hover:text-gray-900 disabled:opacity-30;
}

.qty-value {
    @apply text-sm font-medium w-5 text-center;
}

.proposal-price {
    @apply text-sm font-semibold;
}

.submit-bar {
    @apply space-y-2;
}

.submit-hint {
    @apply text-sm text-amber-600;
}

.submit-btn {
    @apply w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed;
}

.page-message {
    @apply mt-3 text-sm text-gray-700 bg-gray-100 rounded-md p-3;
}
</style>
