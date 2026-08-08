<script setup lang="ts">
const { size = 32 } = defineProps<{ size?: number }>();
</script>

<template>
    <svg
        :width="size"
        :height="size"
        viewBox="0 0 64 64"
        role="img"
        aria-label="AH Planner"
    >
        <circle
            cx="32"
            cy="32"
            r="30"
            fill="#ffffff"
        />
        <circle
            cx="32"
            cy="32"
            r="24"
            fill="none"
            stroke="#00a0e2"
            stroke-width="5"
        />
        <text
            x="32"
            y="41"
            text-anchor="middle"
            font-family="Helvetica, Arial, sans-serif"
            font-size="24"
            font-weight="700"
            fill="#00a0e2"
        >ah</text>
    </svg>
</template>
