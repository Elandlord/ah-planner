<script setup lang="ts">
import type MonthlySpendInterface from '~/types/MonthlySpendInterface';
import { linearTrend, trendValueAt } from '~/composables/useSpendingTrend';

const { months } = defineProps<{ months: MonthlySpendInterface[] }>();

const WIDTH = 720;
const HEIGHT = 260;
const PADDING_LEFT = 48;
const PADDING_RIGHT = 12;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 34;
const BAR_GAP = 8;

const plotWidth = WIDTH - PADDING_LEFT - PADDING_RIGHT;
const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;

const maxTotal = computed(() => Math.max(...months.map((month) => month.total), 1));

const scaleY = computed(() => (value: number) => PADDING_TOP + plotHeight - (value / maxTotal.value) * plotHeight);

const barWidth = computed(() => Math.max(plotWidth / Math.max(months.length, 1) - BAR_GAP, 4));

const bars = computed(() =>
    months.map((month, index) => {
        const x = PADDING_LEFT + index * (plotWidth / Math.max(months.length, 1)) + BAR_GAP / 2;
        const ownY = scaleY.value(month.paidWithOwnMoney);
        const totalY = scaleY.value(month.total);
        return {
            key: month.key,
            label: month.label.replace(/ \d{4}$/, ''),
            x,
            ownY,
            ownHeight: PADDING_TOP + plotHeight - ownY,
            savingsY: totalY,
            savingsHeight: ownY - totalY,
            total: month.total,
            savings: month.paidWithSavings,
        };
    }),
);

const average = computed(() =>
    months.length === 0 ? 0 : months.reduce((sum, month) => sum + month.total, 0) / months.length,
);

const averageY = computed(() => scaleY.value(average.value));

const trendPath = computed(() => {
    if (months.length < 2) {
        return '';
    }
    const trend = linearTrend(months.map((month) => month.total));
    const step = plotWidth / months.length;
    const points = months.map((month, index) => {
        const x = PADDING_LEFT + index * step + step / 2;
        const value = Math.min(Math.max(trendValueAt(trend, index), 0), maxTotal.value);
        return `${x.toFixed(1)},${scaleY.value(value).toFixed(1)}`;
    });
    return `M${points.join(' L')}`;
});

const gridLines = computed(() => {
    const steps = 4;
    return Array.from({ length: steps + 1 }, (unused, index) => {
        const value = (maxTotal.value / steps) * index;
        return { value, y: scaleY.value(value) };
    });
});
</script>

<template>
    <div class="chart-card">
        <div class="chart-header">
            <h2 class="chart-title">
                Uitgaven per maand
            </h2>
            <div class="legend">
                <span class="legend-item"><i class="swatch swatch-own" />Zelf betaald</span>
                <span class="legend-item"><i class="swatch swatch-savings" />Zegels &amp; emballage</span>
                <span class="legend-item"><i class="swatch swatch-average" />Gemiddeld</span>
                <span class="legend-item"><i class="swatch swatch-trend" />Trend</span>
            </div>
        </div>

        <svg
            :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
            class="chart"
            role="img"
            aria-label="Uitgaven per maand met gemiddelde en trendlijn"
        >
            <g
                v-for="line in gridLines"
                :key="line.value"
            >
                <line
                    :x1="PADDING_LEFT"
                    :x2="WIDTH - PADDING_RIGHT"
                    :y1="line.y"
                    :y2="line.y"
                    class="grid-line"
                />
                <text
                    :x="PADDING_LEFT - 6"
                    :y="line.y + 3"
                    class="axis-label"
                >
                    {{ Math.round(line.value) }}
                </text>
            </g>

            <g
                v-for="bar in bars"
                :key="bar.key"
            >
                <rect
                    :x="bar.x"
                    :y="bar.savingsY"
                    :width="barWidth"
                    :height="bar.savingsHeight"
                    class="bar-savings"
                />
                <rect
                    :x="bar.x"
                    :y="bar.ownY"
                    :width="barWidth"
                    :height="bar.ownHeight"
                    class="bar-own"
                />
                <text
                    :x="bar.x + barWidth / 2"
                    :y="HEIGHT - PADDING_BOTTOM + 14"
                    class="axis-label month-label"
                >
                    {{ bar.label }}
                </text>
                <text
                    :x="bar.x + barWidth / 2"
                    :y="bar.savingsY - 4"
                    class="bar-value"
                >
                    {{ Math.round(bar.total) }}
                </text>
            </g>

            <line
                :x1="PADDING_LEFT"
                :x2="WIDTH - PADDING_RIGHT"
                :y1="averageY"
                :y2="averageY"
                class="average-line"
            />
            <path
                v-if="trendPath"
                :d="trendPath"
                class="trend-line"
            />
        </svg>

        <p class="chart-footer">
            Gemiddeld &euro;{{ average.toFixed(2) }} per maand over {{ months.length }} maanden.
        </p>
    </div>
</template>

<style scoped>
.chart-card {
    @apply bg-white rounded-lg shadow p-4 mb-4;
}

.chart-header {
    @apply flex flex-wrap items-center justify-between gap-2 mb-2;
}

.chart-title {
    @apply font-semibold;
}

.legend {
    @apply flex flex-wrap gap-3 text-xs text-gray-600;
}

.legend-item {
    @apply flex items-center gap-1.5;
}

.swatch {
    @apply inline-block w-3 h-3 rounded-sm;
}

.swatch-own {
    @apply bg-blue-600;
}

.swatch-savings {
    @apply bg-amber-400;
}

.swatch-average {
    @apply bg-gray-400;
}

.swatch-trend {
    @apply bg-rose-500;
}

.chart {
    @apply w-full h-auto;
}

.grid-line {
    @apply stroke-gray-200;
    stroke-width: 1;
}

.axis-label {
    @apply fill-gray-400 text-[10px];
    text-anchor: end;
}

.month-label {
    text-anchor: middle;
}

.bar-own {
    @apply fill-blue-600;
}

.bar-savings {
    @apply fill-amber-400;
}

.bar-value {
    @apply fill-gray-500 text-[10px];
    text-anchor: middle;
}

.average-line {
    @apply stroke-gray-400;
    stroke-width: 1.5;
    stroke-dasharray: 6 4;
}

.trend-line {
    @apply stroke-rose-500;
    stroke-width: 2;
    fill: none;
}

.chart-footer {
    @apply text-sm text-gray-500 mt-2;
}
</style>
