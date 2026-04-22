/**
 * JSON file helpers for `adminExportFullDatabase` / `adminImportFullDatabase`.
 * Principals, bigints, and binary blobs from Candid are tagged for round-trip.
 */
import { Principal } from '@dfinity/principal';

/**
 * @param {unknown} value
 * @returns {unknown}
 */
function serializeValue(value) {
    if (value === null || value === undefined) return value;
    if (typeof value === 'bigint') {
        return { __fusionBigInt: value.toString() };
    }
    if (value instanceof Principal) {
        return { __fusionPrincipal: value.toText() };
    }
    if (value instanceof Uint8Array) {
        return { __fusionUint8: Array.from(value) };
    }
    if (Array.isArray(value)) {
        return value.map((x) => serializeValue(x));
    }
    if (typeof value === 'object') {
        /** @type {Record<string, unknown>} */
        const o = {};
        for (const k of Object.keys(value)) {
            o[k] = serializeValue(/** @type {Record<string, unknown>} */ (value)[k]);
        }
        return o;
    }
    return value;
}

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function serializeDatabaseSnapshotToJson(raw) {
    const serialized = serializeValue(raw);
    return JSON.stringify(serialized, null, 2);
}

/**
 * @param {unknown} value
 * @returns {unknown}
 */
function deserializeValue(value) {
    if (value === null || value === undefined) return value;
    if (Array.isArray(value)) {
        return value.map((x) => deserializeValue(x));
    }
    if (typeof value === 'object' && value !== null) {
        const o = /** @type {Record<string, unknown>} */ (value);
        if (typeof o.__fusionBigInt === 'string' && Object.keys(o).length === 1) {
            return BigInt(o.__fusionBigInt);
        }
        if (typeof o.__fusionPrincipal === 'string' && Object.keys(o).length === 1) {
            return Principal.fromText(o.__fusionPrincipal);
        }
        if (Array.isArray(o.__fusionUint8) && Object.keys(o).length === 1) {
            return new Uint8Array(o.__fusionUint8.map((n) => Number(n)));
        }
        /** @type {Record<string, unknown>} */
        const out = {};
        for (const k of Object.keys(o)) {
            out[k] = deserializeValue(o[k]);
        }
        return out;
    }
    return value;
}

/**
 * @param {string} text
 * @returns {unknown}
 */
export function parseDatabaseSnapshotJson(text) {
    const parsed = JSON.parse(text);
    return deserializeValue(parsed);
}

/**
 * Ensures newer `DatabaseSnapshotV1` fields exist so older JSON backups still import.
 * @param {unknown} snapshot
 * @returns {unknown}
 */
export function normalizeDatabaseSnapshotV1(snapshot) {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return snapshot;
    const s = /** @type {Record<string, unknown>} */ (snapshot);
    if (!Array.isArray(s.artistFilterCohortYearsStable)) {
        s.artistFilterCohortYearsStable = [];
    }
    if (!Array.isArray(s.membershipStripePeriodEndStable)) {
        s.membershipStripePeriodEndStable = [];
    }
    return snapshot;
}
