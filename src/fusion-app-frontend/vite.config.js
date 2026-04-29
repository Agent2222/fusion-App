import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath, URL } from 'url';
import environment from 'vite-plugin-environment';
import { VitePWA } from 'vite-plugin-pwa';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const feRoot = path.resolve(__dirname, '.');

dotenv.config({ path: path.join(repoRoot, '.env') });
dotenv.config({ path: path.join(repoRoot, '.env.local') });

/**
 * dfx 0.30+ uses a split II: backend `internet_identity` + **`internet_identity_frontend`**.
 * AuthClient `identityProvider` must be the **frontend** canister id (not the backend).
 * @param {string} root
 * @returns {string}
 */
function readInternetIdentityFrontendCanisterFromDfxLocal(root) {
    const p = path.join(root, '.dfx/local/canister_ids.json');
    if (!existsSync(p)) return '';
    try {
        const j = JSON.parse(readFileSync(p, 'utf8'));
        const pick =
            j.internet_identity_frontend?.local ??
            j.internet_identity?.local ??
            j['internet-identity']?.local ??
            j.internetIdentity?.local;
        return typeof pick === 'string' && pick.trim() ? pick.trim() : '';
    } catch {
        return '';
    }
}

export default defineConfig(({ mode }) => {
    const env = {
        ...loadEnv(mode, repoRoot, ''),
        ...loadEnv(mode, feRoot, ''),
    };
    const iiFromFile = readInternetIdentityFrontendCanisterFromDfxLocal(repoRoot);
    const iiMerged =
        env.VITE_II_CANISTER_ID ||
        env.CANISTER_ID_INTERNET_IDENTITY_FRONTEND ||
        env.CANISTER_ID_internet_identity_frontend ||
        env.CANISTER_ID_INTERNET_IDENTITY ||
        env.CANISTER_ID_internet_identity ||
        iiFromFile ||
        '';
    /** Only when set in `.env` — do not default to 127.0.0.1 here (would break `config.js` hostname matching on `*.localhost:4943`). */
    const replicaMerged = (env.VITE_IC_REPLICA_ORIGIN || '').replace(/\/$/, '');
    const replicaProxyTarget = replicaMerged || 'http://127.0.0.1:4943';

    return {
        build: {
            emptyOutDir: true,
        },
        optimizeDeps: {
            include: ['@stripe/stripe-js'],
            esbuildOptions: {
                define: {
                    global: 'globalThis',
                },
            },
        },
        server: {
            proxy: {
                '/api': {
                    target: replicaProxyTarget,
                    changeOrigin: true,
                },
                '/integration': {
                    target: 'http://127.0.0.1:8787',
                    changeOrigin: true,
                    rewrite: (p) => p.replace(/^\/integration/, ''),
                },
            },
        },
        publicDir: 'public',
        plugins: [
            environment('all', { prefix: 'CANISTER_' }),
            environment('all', { prefix: 'DFX_' }),
            VitePWA({
                registerType: 'autoUpdate',
                includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
                manifest: {
                    id: 'https://fusionart.world/',
                    name: 'Fusion - Japan artist residencies and art platform',
                    short_name: 'Fusion',
                    description:
                        'Fusion connects artists with curated Japan residencies, editions, and editorial context.',
                    start_url: '/',
                    scope: '/',
                    display: 'standalone',
                    theme_color: '#ffffff',
                    background_color: '#f7f4ee',
                    icons: [
                        {
                            src: '/pwa-192.png',
                            sizes: '192x192',
                            type: 'image/png',
                            purpose: 'any',
                        },
                        {
                            src: '/pwa-512.png',
                            sizes: '512x512',
                            type: 'image/png',
                            purpose: 'any',
                        },
                        {
                            src: '/pwa-512-maskable.png',
                            sizes: '512x512',
                            type: 'image/png',
                            purpose: 'maskable',
                        },
                    ],
                },
                workbox: {
                    globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2,webmanifest}'],
                    globIgnores: ['**/*.map', '**/*.mp4'],
                    mode: 'development',
                    cleanupOutdatedCaches: true,
                    clientsClaim: true,
                    skipWaiting: true,
                },
                devOptions: {
                    enabled: false,
                },
            }),
        ],
        resolve: {
            alias: [
                {
                    find: 'declarations',
                    replacement: fileURLToPath(new URL('../declarations', import.meta.url)),
                },
            ],
            dedupe: ['@dfinity/agent'],
        },
        define: {
            'import.meta.env.VITE_II_CANISTER_ID': JSON.stringify(iiMerged),
            ...(replicaMerged
                ? { 'import.meta.env.VITE_IC_REPLICA_ORIGIN': JSON.stringify(replicaMerged) }
                : {}),
        },
    };
});
