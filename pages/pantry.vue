<script setup lang="ts">
import { usePantry } from '~/composables/usePantry';

const { pantryItems, itemsByCategory, expiringSoonItems, markItemUsed } = usePantry();
</script>

<template>
    <div>
        <h1 class="page-title">
            Voorraad
        </h1>

        <div
            v-if="pantryItems.length === 0"
            class="empty-state"
        >
            Nog geen voorraad. Voeg bonnen toe om te zien wat je waarschijnlijk nog in huis hebt.
        </div>

        <template v-else>
            <div
                v-if="expiringSoonItems.length > 0"
                class="expiring-summary"
            >
                {{ expiringSoonItems.length }} item(s) bijna over datum
            </div>

            <PantryList
                :items-by-category="itemsByCategory"
                @used="markItemUsed"
            />
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

.expiring-summary {
    @apply text-sm font-semibold text-orange-600 bg-orange-50 rounded-lg p-3 mb-4;
}
</style>
