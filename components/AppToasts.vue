<script setup lang="ts">
import { useToast } from '~/composables/useToast';

const { toasts, dismiss } = useToast();
</script>

<template>
    <div
        class="toast-stack"
        role="status"
        aria-live="polite"
    >
        <TransitionGroup name="toast">
            <button
                v-for="toast in toasts"
                :key="toast.id"
                :class="['toast', `toast--${toast.tone}`]"
                @click="dismiss(toast.id)"
            >
                {{ toast.message }}
            </button>
        </TransitionGroup>
    </div>
</template>

<style scoped>
.toast-stack {
    @apply fixed top-20 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)];
}

.toast {
    @apply text-left text-sm px-4 py-3 rounded-lg shadow-lg text-white;
}

.toast--success {
    @apply bg-emerald-600;
}

.toast--error {
    @apply bg-rose-600;
}

.toast--info {
    @apply bg-gray-800;
}

.toast-enter-active,
.toast-leave-active {
    @apply transition-all duration-200;
}

.toast-enter-from,
.toast-leave-to {
    @apply opacity-0 translate-x-4;
}
</style>
