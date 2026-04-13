import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Standalone config: root `vite.config.js` is a function (`defineConfig(({ mode }) => …)`),
 * which cannot be merged via `mergeConfig` in Vitest 2.
 */
export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.test.js'],
    },
    resolve: {
        alias: {
            declarations: path.resolve(__dirname, '../declarations'),
        },
    },
});
