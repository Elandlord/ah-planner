import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

// Vue resolves to its production build when NODE_ENV=production (as it is on CI), and that
// build strips the devtools hook @vue/test-utils uses to record component emits.
process.env.NODE_ENV = 'test';

export default defineConfig({
    plugins: [vue()],
    test: {
        environment: 'node',
        environmentMatchGlobs: [
            ['tests/unit/components/**', 'happy-dom'],
            ['tests/unit/pages/**', 'happy-dom'],
        ],
        globals: true,
        setupFiles: ['./tests/unit/setup/vue-auto-imports.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
        },
    },
    resolve: {
        alias: {
            '~': new URL('./', import.meta.url).pathname,
            '@': new URL('./', import.meta.url).pathname,
        },
    },
});
