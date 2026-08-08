<script setup lang="ts">
import type MonthlySpendInterface from '~/types/MonthlySpendInterface';
import { rollingAverage, savingsMethods } from '~/composables/useSpendingTrend';

const { months } = defineProps<{ months: MonthlySpendInterface[] }>();

const WIDTH = 720;
const HEIGHT = 260;
const PADDING_LEFT = 48;
const PADDING_RIGHT = 12;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 34;
const BAR_GAP = 8;
const GRID_STEPS = 4;
const OWN_MONEY_COLOR = '#2563eb';
const METHOD_COLORS = ['#fbbf24', '#a78bfa', '#34d399', '#f472b6', '#94a3b8'];

const plotWidth = WIDTH - PADDING_LEFT - PADDING_RIGHT;
const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;

const hoveredKey = ref<string | null>(null);

const methods = computed(() => savingsMethods(months));

const legend = computed(() => [
    { label: 'Zelf betaald', color: OWN_MONEY_COLOR },
    ...methods.value.map((method, index) => ({
        label: method,
        color: METHOD_COLORS[index % METHOD_COLORS.length],
    })),
]);

const maxTotal = computed(() => Math.max(...months.map((month) => month.total), 1));

const slotWidth = computed(() => plotWidth / Math.max(months.length, 1));

const barWidth = computed(() => Math.max(slotWidth.value - BAR_GAP, 4));

function scaleY(value: number): number {
    return PADDING_TOP + plotHeight - (value / maxTotal.value) * plotHeight;
}

const bars = computed(() =>
    months.map((month, index) => {
        const x = PADDING_LEFT + index * slotWidth.value + BAR_GAP / 2;
        const segments = [];
        let stacked = month.paidWithOwnMoney;

        segments.push({
            label: 'Zelf betaald',
            color: OWN_MONEY_COLOR,
            y: scaleY(stacked),
            height: PADDING_TOP + plotHeight - scaleY(stacked),
        });

        methods.value.forEach((method, methodIndex) => {
            const amount = month.savingsByMethod[method] ?? 0;
            if (amount <= 0) {
                return;
            }
            const bottom = scaleY(stacked);
            stacked += amount;
            const top = scaleY(stacked);
            segments.push({
                label: method,
                color: METHOD_COLORS[methodIndex % METHOD_COLORS.length],
                y: top,
                height: bottom - top,
            });
        });

        return {
            key: month.key,
            label: month.label.replace(/ \d{4}$/, ''),
            x,
            slotX: PADDING_LEFT + index * slotWidth.value,
            topY: scaleY(month.total),
            segments,
            month,
        };
    }),
);

const average = computed(() =>
    months.length === 0 ? 0 : months.reduce((sum, month) => sum + month.total, 0) / months.length,
);

const averageOwnMoney = computed(() =>
    months.length === 0
        ? 0
        : months.reduce((sum, month) => sum + month.paidWithOwnMoney, 0) / months.length,
);

const ROLLING_WINDOW = 3;

const trendPath = computed(() => {
    if (months.length < 2) {
        return '';
    }
    const rolling = rollingAverage(months.map((month) => month.paidWithOwnMoney), ROLLING_WINDOW);
    const points = rolling.map((value, index) => {
        const x = PADDING_LEFT + index * slotWidth.value + slotWidth.value / 2;
        return `${x.toFixed(1)},${scaleY(Math.min(value, maxTotal.value)).toFixed(1)}`;
    });
    return `M${points.join(' L')}`;
});

const gridLines = computed(() =>
    Array.from({ length: GRID_STEPS + 1 }, (unused, index) => {
        const value = (maxTotal.value / GRID_STEPS) * index;
        return { value, y: scaleY(value) };
    }));

const hoveredBar = computed(() => bars.value.find((bar) => bar.key === hoveredKey.value) ?? null);

const TOOLTIP_EDGE_PERCENT = 14;
const TOOLTIP_FLIP_Y = 110;

/** A tall bar leaves no room above it, so the card would clip the tooltip. */
const tooltipBelow = computed(() => (hoveredBar.value?.topY ?? 0) < TOOLTIP_FLIP_Y);

const tooltipStyle = computed(() => {
    if (!hoveredBar.value) {
        return {};
    }
    const centre = ((hoveredBar.value.slotX + slotWidth.value / 2) / WIDTH) * 100;
    return {
        left: `${Math.min(Math.max(centre, TOOLTIP_EDGE_PERCENT), 100 - TOOLTIP_EDGE_PERCENT)}%`,
        top: `${(hoveredBar.value.topY / HEIGHT) * 100}%`,
    };
});

const tooltipRows = computed(() => {
    const month = hoveredBar.value?.month;
    if (!month) {
        return [];
    }
    return [
        { label: 'Zelf betaald', value: month.paidWithOwnMoney },
        ...methods.value
            .map((method) => ({ label: method, value: month.savingsByMethod[method] ?? 0 }))
            .filter((row) => row.value > 0),
        { label: 'Bonusvoordeel', value: month.discountTotal },
    ];
});
</script>

<template>
    <div class="chart-card">
        <div class="chart-header">
            <h2 class="chart-title">
                Uitgaven per maand
            </h2>
            <div class="legend">
                <span
                    v-for="entry in legend"
                    :key="entry.label"
                    class="legend-item"
                >
                    <i
                        class="swatch"
                        :style="{ backgroundColor: entry.color }"
                    />{{ entry.label }}
                </span>
                <span class="legend-item"><i class="swatch swatch-average" />Gemiddeld</span>
                <span class="legend-item"><i class="swatch swatch-trend" />Eigen geld, 3-maands</span>
            </div>
        </div>

        <div class="chart-wrapper">
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
                    :class="{ 'bar-group--dimmed': hoveredKey !== null && hoveredKey !== bar.key }"
                >
                    <rect
                        v-for="segment in bar.segments"
                        :key="segment.label"
                        :x="bar.x"
                        :y="segment.y"
                        :width="barWidth"
                        :height="segment.height"
                        :fill="segment.color"
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
                        :y="bar.topY - 4"
                        class="bar-value"
                    >
                        {{ Math.round(bar.month.total) }}
                    </text>
                </g>

                <line
                    :x1="PADDING_LEFT"
                    :x2="WIDTH - PADDING_RIGHT"
                    :y1="scaleY(average)"
                    :y2="scaleY(average)"
                    class="average-line"
                />
                <path
                    v-if="trendPath"
                    :d="trendPath"
                    class="trend-line"
                />

                <rect
                    v-for="bar in bars"
                    :key="`hit-${bar.key}`"
                    :x="bar.slotX"
                    :y="PADDING_TOP"
                    :width="slotWidth"
                    :height="plotHeight"
                    class="hit-area"
                    @mouseenter="hoveredKey = bar.key"
                    @mouseleave="hoveredKey = null"
                />
            </svg>

            <div
                v-if="hoveredBar"
                :class="['tooltip', tooltipBelow ? 'tooltip--below' : 'tooltip--above']"
                :style="tooltipStyle"
            >
                <p class="tooltip-title">
                    {{ hoveredBar.month.label }}
                </p>
                <p class="tooltip-total">
                    &euro;{{ hoveredBar.month.total.toFixed(2) }}
                </p>
                <p
                    v-for="row in tooltipRows"
                    :key="row.label"
                    class="tooltip-row"
                >
                    <span>{{ row.label }}</span>
                    <span>&euro;{{ row.value.toFixed(2) }}</span>
                </p>
                <p class="tooltip-note">
                    {{ hoveredBar.month.receiptCount }} bonnen
                </p>
            </div>
        </div>

        <p class="chart-footer">
            Gemiddeld &euro;{{ average.toFixed(2) }} per maand over {{ months.length }} maanden,
            waarvan &euro;{{ averageOwnMoney.toFixed(2) }} met eigen geld.
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

.swatch-average {
    @apply bg-gray-400;
}

.swatch-trend {
    @apply bg-rose-500;
}

.chart-wrapper {
    @apply relative;
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

.bar-group--dimmed {
    @apply opacity-40 transition-opacity;
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

.hit-area {
    fill: transparent;
}

.tooltip {
    @apply absolute -translate-x-1/2 pointer-events-none z-10
        bg-gray-900 text-white rounded-lg shadow-lg px-3 py-2 w-48;
}

.tooltip--above {
    @apply -translate-y-full -mt-2;
}

.tooltip--below {
    @apply mt-2;
}

.tooltip-title {
    @apply text-xs uppercase tracking-wide text-gray-400;
}

.tooltip-total {
    @apply text-lg font-bold mb-1;
}

.tooltip-row {
    @apply flex justify-between text-xs text-gray-200;
}

.tooltip-note {
    @apply text-[10px] text-gray-400 mt-1;
}

.chart-footer {
    @apply text-sm text-gray-500 mt-2;
}
</style>
