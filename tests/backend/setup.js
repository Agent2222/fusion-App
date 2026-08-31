import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PocketIc, PocketIcServer } from '@dfinity/pic';
import { Principal } from '@dfinity/principal';
import { idlFactory } from '../../src/declarations/fusion-app-backend/fusion-app-backend.did.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export const WASM_PATH = resolve(
    REPO_ROOT,
    '.dfx/local/canisters/fusion-app-backend/fusion-app-backend.wasm',
);

export { idlFactory };

// Must match the hardcoded adminPrincipals in main.mo for admin-gated calls.
export const ADMIN_PRINCIPAL = Principal.fromText(
    '6pq72-g2xdl-lae4k-3kadu-aksdn-qvebw-s23b6-4yhtg-wngft-3hvqb-xae',
);
export const USER1_PRINCIPAL = Principal.fromText(
    'renrk-eyaaa-aaaaa-aaada-cai',
);
export const USER2_PRINCIPAL = Principal.fromText(
    'rno2w-sqaaa-aaaaa-aaacq-cai',
);

/**
 * Start a dedicated PocketIC server + instance. Call once in `beforeAll`.
 * Returns `{ pic, server }` so files do not share a singleton process.
 */
export async function setupPic() {
    const server = await PocketIcServer.start();
    const pic = await PocketIc.create(server.getUrl());
    return { pic, server };
}

/**
 * Tear down the PocketIC instance and stop its server. Call in `afterAll`.
 */
export async function teardownPic(ctx) {
    if (!ctx) {
        return;
    }
    if (ctx.pic) {
        await ctx.pic.tearDown();
    }
    if (ctx.server) {
        await ctx.server.stop();
    }
}

/**
 * Deploy a fresh backend canister. Returns `{ actor, canisterId }`.
 * The actor's sender defaults to ADMIN_PRINCIPAL (the deployer).
 */
export async function deployBackend(pic) {
    const fixture = await pic.setupCanister({
        idlFactory,
        wasm: WASM_PATH,
        sender: ADMIN_PRINCIPAL,
    });
    fixture.actor.setPrincipal(ADMIN_PRINCIPAL);
    return fixture;
}
