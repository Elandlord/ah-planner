import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

// Vue only ships its devtools hooks outside production builds; @vue/test-utils
// needs them for wrapper.emitted(), so never run the suite as production.
process.env.NODE_ENV = 'test';

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
