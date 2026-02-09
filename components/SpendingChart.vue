<script setup lang="ts">
const { spendingByCategory, totalSpent } = defineProps<{
    spendingByCategory: Record<string, number>;
    totalSpent: number;
}>();

const sortedCategories = computed(() =>
    Object.entries(spendingByCategory)
        .sort(([, a], [, b]) => b - a),
);

function percentage(amount: number): number {
    if (totalSpent === 0) {
        return 0;
    }
    return (amount / totalSpent) * 100;
}
</script>

<template>
    <div class="spending-chart">
        <div
            v-for="[category, amount] in sortedCategories"
            :key="category"
            class="chart-row"
        >
            <span class="chart-label">{{ category }}</span>
            <div class="chart-bar-wrapper">
                <div
                    class="chart-bar"
                    :style="{ width: `${percentage(amount)}%` }"
                />
            </div>
            <span class="chart-amount">&euro;{{ amount.toFixed(2) }}</span>
        </div>
    </div>
</template>

<style scoped>
.spending-chart {
    @apply space-y-2;
}

.chart-row {
    @apply flex items-center gap-3;
}

.chart-label {
    @apply w-24 text-sm text-gray-600 capitalize;
}

.chart-bar-wrapper {
    @apply flex-1 bg-gray-100 rounded-full h-4;
}

.chart-bar {
    @apply bg-blue-500 h-4 rounded-full transition-all duration-300;
}

.chart-amount {
    @apply w-20 text-sm text-right text-gray-700;
}
</style>
