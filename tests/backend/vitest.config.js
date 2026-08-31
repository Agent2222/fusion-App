import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    root: __dirname,
    test: {
        environment: 'node',
        include: ['**/*.test.js'],
        testTimeout: 30_000,
        hookTimeout: 60_000,
        fileParallelism: false,
    },
    resolve: {
        alias: {
            declarations: path.resolve(__dirname, '../../src/declarations'),
        },
    },
});
