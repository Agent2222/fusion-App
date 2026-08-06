/**
 * Applicant Studio (restricted settings profile) helpers.
 */

import { DEV_MODE } from '../config.js';
import { getApplicantIsTester } from './studioPlainForms.js';

export const APPLICATION_ONLY_DISPLAY_KEY = 'fusion-mpd-application-only-display';

/** @returns {boolean} */
export function readApplicationOnlyDisplayPref() {
    try {
        return sessionStorage.getItem(APPLICATION_ONLY_DISPLAY_KEY) === '1';
    } catch {
        return false;
    }
}

/** @param {boolean} on */
export function writeApplicationOnlyDisplayPref(on) {
    try {
        if (on) sessionStorage.setItem(APPLICATION_ONLY_DISPLAY_KEY, '1');
        else sessionStorage.removeItem(APPLICATION_ONLY_DISPLAY_KEY);
    } catch {
        /* ignore */
    }
}

/**
 * @param {unknown} appliedRaw
 * @returns {Record<string, unknown>}
 */
export function parseAppliedJson(appliedRaw) {
    try {
        const applied =
            typeof appliedRaw === 'string'
                ? JSON.parse(appliedRaw)
                : appliedRaw && typeof appliedRaw === 'object'
                  ? appliedRaw
                  : {};
        if (!applied || typeof applied !== 'object' || Array.isArray(applied)) return {};
        return /** @type {Record<string, unknown>} */ (applied);
    } catch {
        return {};
    }
}

/**
 * @param {unknown} appliedRaw
 * @returns {number}
 */
export function countApplicationsFromRecord(appliedRaw) {
    return Object.keys(parseAppliedJson(appliedRaw)).filter(Boolean).length;
}

/**
 * @param {unknown} appliedRaw
 * @returns {boolean}
 */
export function applicationsIncludeTester(appliedRaw) {
    const applied = parseAppliedJson(appliedRaw);
    for (const entry of Object.values(applied)) {
        if (!entry || typeof entry !== 'object') continue;
        const e = /** @type {Record<string, unknown>} */ (entry);
        const candidates = [e.payload, e.payloadJson, e];
        for (const payload of candidates) {
            const payloadJson =
                typeof payload === 'string'
                    ? payload
                    : payload && typeof payload === 'object'
                      ? JSON.stringify(payload)
                      : '';
            if (payloadJson && getApplicantIsTester(payloadJson)) return true;
        }
    }
    return false;
}

/**
 * @param {{
 *   membershipGate: string,
 *   applicationCount: number,
 *   awardEntryCount?: number,
 *   applicationOnlyDisplay: boolean,
 *   applicationOnlyToggleVisible?: boolean,
 * }} args
 * @returns {boolean}
 */
export function shouldUseApplicantStudioMode(args) {
    // When the Application only display toggle is shown (tester / admin / DEV),
    // it is authoritative: unchecked must leave restricted applicant studio.
    if (args.applicationOnlyToggleVisible) {
        return Boolean(args.applicationOnlyDisplay);
    }
    if (args.applicationOnlyDisplay) return true;
    const gate = String(args.membershipGate || '');
    if (gate !== 'needsSubscription') return false;
    const apps = Number(args.applicationCount) || 0;
    const draws = Number(args.awardEntryCount) || 0;
    return apps >= 1 || draws >= 1;
}

/**
 * Light gate: needs subscription, no applications and no Program Draw entries
 * (still show Become a member / unlock).
 * @param {{
 *   membershipGate: string,
 *   applicationCount: number,
 *   awardEntryCount?: number,
 *   applicationOnlyDisplay: boolean,
 *   applicationOnlyToggleVisible?: boolean,
 * }} args
 */
export function shouldUseApplicantLightGate(args) {
    if (args.applicationOnlyToggleVisible) {
        return false;
    }
    if (args.applicationOnlyDisplay) return false;
    const apps = Number(args.applicationCount) || 0;
    const draws = Number(args.awardEntryCount) || 0;
    return (
        String(args.membershipGate || '') === 'needsSubscription' &&
        apps < 1 &&
        draws < 1
    );
}

/**
 * @param {{ isRealAdmin?: boolean, hasTesterApplication?: boolean }} args
 */
export function canShowApplicationOnlyDisplayToggle(args) {
    if (DEV_MODE) return true;
    if (args.isRealAdmin) return true;
    if (args.hasTesterApplication) return true;
    return false;
}
