export default defineNuxtConfig({
    compatibilityDate: '2025-07-15',
    devtools: { enabled: true },
    modules: [
        '@pinia/nuxt',
        '@nuxtjs/tailwindcss',
    ],
    ssr: false,
    app: {
        head: {
            title: 'AH Planner',
            meta: [
                { name: 'description', content: 'Albert Heijn receipt scanner & meal planner' },
            ],
        },
    },
});
