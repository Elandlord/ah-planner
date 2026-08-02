import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [vue()],
    test: {
        environment: 'node',
        environmentMatchGlobs: [['tests/unit/components/**', 'happy-dom']],
        globals: true,
        setupFiles: ['./tests/unit/setup/vue-auto-imports.ts'],
    },
    resolve: {
        alias: {
            '~': new URL('./', import.meta.url).pathname,
            '@': new URL('./', import.meta.url).pathname,
        },
    },
});
