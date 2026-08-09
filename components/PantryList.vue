<script setup lang="ts">
import type { PantryItemInterface } from '~/composables/usePantry';

defineProps<{
    itemsByCategory: Record<string, PantryItemInterface[]>;
}>();

const emit = defineEmits<{
    used: [item: PantryItemInterface];
}>();
</script>

<template>
    <div
        v-for="(items, category) in itemsByCategory"
        :key="category"
        class="category-group"
    >
        <h3 class="category-title">
            {{ category }}
        </h3>
        <div
            v-for="item in items"
            :key="`${item.receiptId}-${item.itemIndex}`"
            class="pantry-item"
            :class="{ 'pantry-item--expiring': item.expiringSoon }"
        >
            <span class="item-text">{{ item.name }}</span>
            <span
                v-if="item.expiringSoon"
                class="expiring-badge"
            >
                Bijna over datum
            </span>
            <span class="item-days">{{ Math.max(0, Math.round(item.daysRemaining)) }} dagen houdbaar</span>
            <button
                type="button"
                class="used-button"
                @click="emit('used', item)"
            >
                Op
            </button>
        </div>
    </div>
</template>

<style scoped>
.category-group {
    @apply mb-4;
}

.category-title {
    @apply text-sm font-semibold text-gray-500 uppercase mb-2 capitalize;
}

.pantry-item {
    @apply flex items-center gap-2 py-2 px-3 bg-white rounded mb-1 shadow-sm;
}

.pantry-item--expiring {
    @apply bg-orange-50;
}

.item-text {
    @apply flex-1 text-sm;
}

.expiring-badge {
    @apply text-xs font-semibold text-orange-600 bg-orange-100 rounded px-2 py-0.5;
}

.item-days {
    @apply text-xs text-gray-400 whitespace-nowrap;
}

.used-button {
    @apply text-xs font-semibold text-gray-500 bg-gray-100 rounded px-2 py-0.5 hover:bg-gray-200;
}
</style>
