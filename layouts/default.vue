<script setup lang="ts">
const navItems = [
    { to: '/', label: 'Upload' },
    { to: '/receipts', label: 'Bonnen' },
    { to: '/spending', label: 'Uitgaven' },
    { to: '/recipes', label: 'Recepten' },
    { to: '/shopping-list', label: 'Boodschappen' },
];
</script>

<template>
    <div class="app-wrapper">
        <header class="app-header">
            <div class="header-content">
                <NuxtLink
                    to="/"
                    class="logo"
                >
                    AH Planner
                </NuxtLink>
                <nav class="nav-links">
                    <NuxtLink
                        v-for="item in navItems"
                        :key="item.to"
                        :to="item.to"
                        class="nav-link"
                    >
                        {{ item.label }}
                    </NuxtLink>
                </nav>
            </div>
        </header>
        <main class="main-content">
            <slot />
        </main>
    </div>
</template>

<style scoped>
.app-wrapper {
    @apply min-h-screen bg-gray-50;
}

.app-header {
    @apply bg-blue-600 text-white shadow-md;
}

.header-content {
    @apply max-w-5xl mx-auto px-4 py-3 flex items-center justify-between;
}

.logo {
    @apply text-xl font-bold no-underline text-white;
}

.nav-links {
    @apply flex gap-4;
}

.nav-link {
    @apply text-blue-100 no-underline hover:text-white transition-colors text-sm;
}

.nav-link.router-link-active {
    @apply text-white font-semibold;
}

.main-content {
    @apply max-w-5xl mx-auto px-4 py-6;
}
</style>
