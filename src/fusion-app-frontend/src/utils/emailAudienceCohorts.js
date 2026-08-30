/**
 * Studio Email cohort audiences — resolve countable emails for batch send.
 * Persisted as reserved `cohort:*` category strings on EmailAudienceKindV.#category.
 */

import {
    adminListAccountContactsForStudio,
    getAccountsForStudio,
    getApplicants,
    getArtistsForStudio,
    getCurrentProgramSeason,
    getProgramDisplayNameFromRow,
    getPrograms,
    getSubscribersForEmailStudio,
    listProgramAwardEntriesStudio,
} from './database.js';
import { normalizeProgramId } from './programAlumniEligibility.js';
import {
    normalizeConfirmedArtistsList,
    studioArtistCanonicalEnglishName,
} from './studioArtistPrograms.js';
import {
    studioEffectiveMembershipStatus,
    studioMembershipStatusIsPaid,
    studioTrialState,
} from './studioMembershipPresentation.js';
import {
    getApplicantIsTester,
    getApplicantManualDepositSubmitted,
    getApplicantSponsorshipMode,
} from './studioPlainForms.js';

export const COHORT_ACTIVE_MEMBERS = 'cohort:active-members';
export const COHORT_VETERANS = 'cohort:veterans';
export const COHORT_CURRENT_PROGRAM = 'cohort:current-program';
export const COHORT_NON_MEMBERS = 'cohort:non-members';
export const COHORT_DRAW_PREFIX = 'cohort:draw:';
/** Placeholder option until a program is chosen. */
export const COHORT_DRAW = 'cohort:draw';

/** Fixed Audience select entries (draw uses COHORT_DRAW until program id is appended). */
export const EMAIL_COHORT_OPTIONS = [
    { value: COHORT_ACTIVE_MEMBERS, label: 'Active memberships (batch)' },
    { value: COHORT_VETERANS, label: 'Veterans (batch)' },
    { value: COHORT_CURRENT_PROGRAM, label: 'Current program — accepted/confirmed (batch)' },
    { value: COHORT_DRAW, label: 'Current draw applicants (batch)' },
    { value: COHORT_NON_MEMBERS, label: 'Non-members (batch)' },
];

/**
 * @param {string} v
 * @returns {boolean}
 */
export function isEmailCohortAudience(v) {
    const s = String(v || '').trim();
    return s.startsWith('cohort:');
}

/**
 * @param {string} v
 * @returns {string}
 */
export function parseDrawProgramId(v) {
    const s = String(v || '').trim();
    if (!s.startsWith(COHORT_DRAW_PREFIX)) return '';
    return s.slice(COHORT_DRAW_PREFIX.length).trim();
}

/**
 * @param {string} programId
 * @returns {string}
 */
export function drawCohortValue(programId) {
    const id = String(programId || '').trim();
    return id ? `${COHORT_DRAW_PREFIX}${id}` : COHORT_DRAW;
}

/**
 * @param {string} v
 * @returns {string}
 */
export function cohortAudienceLabel(v) {
    const s = String(v || '').trim();
    const fixed = EMAIL_COHORT_OPTIONS.find((o) => o.value === s);
    if (fixed) return fixed.label;
    if (s.startsWith(COHORT_DRAW_PREFIX)) {
        const pid = parseDrawProgramId(s);
        return pid ? `Current draw applicants — ${pid} (batch)` : 'Current draw applicants (batch)';
    }
    if (s === COHORT_DRAW) return 'Current draw applicants (batch)';
    return s;
}

/**
 * @param {unknown} row
 * @returns {boolean}
 */
export function isExemptAccount(row) {
    const r = row && typeof row === 'object' ? /** @type {Record<string, unknown>} */ (row) : {};
    return Boolean(r.membershipExemptManual ?? r.membership_exempt_manual);
}

/**
 * Paid, trialing, or complimentary / manual-exempt membership.
 * @param {unknown} row
 * @returns {boolean}
 */
export function isActiveMemberAccount(row) {
    if (!row || typeof row !== 'object') return false;
    if (isExemptAccount(row)) return true;
    if (studioTrialState(/** @type {any} */ (row)) === 'active') return true;
    return studioMembershipStatusIsPaid(studioEffectiveMembershipStatus(row));
}

/**
 * @param {string} em
 * @returns {string}
 */
function normEmail(em) {
    return String(em || '')
        .trim()
        .toLowerCase();
}

/**
 * @param {string} em
 * @returns {boolean}
 */
function isValidEmail(em) {
    const e = normEmail(em);
    return Boolean(e && e.includes('@'));
}

/**
 * @param {Iterable<string>} emails
 * @returns {string[]}
 */
function dedupeEmails(emails) {
    const seen = new Set();
    /** @type {string[]} */
    const out = [];
    for (const raw of emails) {
        const e = normEmail(raw);
        if (!isValidEmail(e) || seen.has(e)) continue;
        seen.add(e);
        out.push(e);
    }
    return out;
}

/**
 * @param {unknown} contactsRaw
 * @returns {Map<string, string>}
 */
function mapContactsByPrincipal(contactsRaw) {
    /** @type {Map<string, string>} */
    const map = new Map();
    if (!Array.isArray(contactsRaw)) return map;
    for (const row of contactsRaw) {
        const p = Array.isArray(row) ? row[0] : null;
        const c = Array.isArray(row) ? row[1] : null;
        const pStr =
            p && typeof p === 'object' && 'toText' in p && typeof /** @type {any} */ (p).toText === 'function'
                ? /** @type {any} */ (p).toText()
                : String(p ?? '').trim();
        const email = String(c?.email ?? '').trim();
        if (pStr && isValidEmail(email)) map.set(pStr, normEmail(email));
    }
    return map;
}

/**
 * @param {Record<string, unknown>} account
 * @param {Map<string, string>} contactsByPrincipal
 * @param {Map<string, string>} artistEmailById
 * @returns {string}
 */
function accountEmail(account, contactsByPrincipal, artistEmailById) {
    const principal = String(account.principal || '').trim();
    const fromContact = principal ? contactsByPrincipal.get(principal) || '' : '';
    if (fromContact) return fromContact;
    const aid = String(account.linkedArtistId || '').trim();
    if (aid) return artistEmailById.get(aid) || '';
    return '';
}

/**
 * @param {object[]} artists
 * @returns {Map<string, string>}
 */
function buildArtistEmailById(artists) {
    /** @type {Map<string, string>} */
    const map = new Map();
    for (const a of artists) {
        if (!a || typeof a !== 'object') continue;
        const id = String(/** @type {any} */ (a).id || '').trim();
        const em = normEmail(/** @type {any} */ (a).contactEmail || '');
        if (id && isValidEmail(em)) map.set(id, em);
    }
    return map;
}

/**
 * @param {object[]} artists
 * @returns {Map<string, string>} name lower → artist id
 */
function buildArtistIdByEnglishName(artists) {
    /** @type {Map<string, string>} */
    const map = new Map();
    for (const a of artists) {
        if (!a || typeof a !== 'object') continue;
        const id = String(/** @type {any} */ (a).id || '').trim();
        const name = studioArtistCanonicalEnglishName(a).toLowerCase();
        if (id && name) map.set(name, id);
    }
    return map;
}

/**
 * @param {unknown} applicant
 * @returns {string}
 */
function artistIdFromApplicant(applicant) {
    const o = applicant && typeof applicant === 'object' ? /** @type {Record<string, unknown>} */ (applicant) : {};
    const id = String(o.id || '').trim();
    if (id.includes('|')) {
        const left = id.split('|')[0]?.trim() || '';
        if (left) return left;
    }
    try {
        const payload = JSON.parse(String(o.payloadJson || '{}'));
        const aid = String(payload?.artistId || payload?.artist_id || '').trim();
        if (aid) return aid;
    } catch {
        /* ignore */
    }
    return '';
}

/**
 * Studio treats open / full / active as the live (current) program lifecycle.
 * @param {unknown} studioStatus
 */
export function isLiveStudioProgramStatus(studioStatus) {
    const s = String(studioStatus || '')
        .trim()
        .toLowerCase();
    return s === 'active' || s === 'open' || s === 'full';
}

/**
 * Site current-season program, else every live (open/full/active) program.
 * @param {object[]} programs
 * @param {string} [seasonKey]
 * @returns {Set<string>} raw program ids
 */
export function resolveCurrentProgramIds(programs, seasonKey = '') {
    /** @type {Set<string>} */
    const ids = new Set();
    const seasonRaw = String(seasonKey || '').trim();
    const seasonNorm = normalizeProgramId(seasonRaw);
    if (seasonNorm) {
        for (const p of Array.isArray(programs) ? programs : []) {
            if (!p || typeof p !== 'object') continue;
            const id = String(/** @type {any} */ (p).id || '').trim();
            if (!id) continue;
            if (id === seasonRaw || normalizeProgramId(id) === seasonNorm) ids.add(id);
        }
    }
    if (ids.size) return ids;
    for (const p of Array.isArray(programs) ? programs : []) {
        if (!p || typeof p !== 'object') continue;
        if (!isLiveStudioProgramStatus(/** @type {any} */ (p).studioStatus)) continue;
        const id = String(/** @type {any} */ (p).id || '').trim();
        if (id) ids.add(id);
    }
    return ids;
}

/**
 * @param {string} programId
 * @param {Set<string>} currentIds
 */
function programIdIsCurrent(programId, currentIds) {
    const raw = String(programId || '').trim();
    if (!raw) return false;
    if (currentIds.has(raw)) return true;
    const norm = normalizeProgramId(raw);
    if (currentIds.has(norm)) return true;
    for (const id of currentIds) {
        if (normalizeProgramId(id) === norm) return true;
    }
    return false;
}

/**
 * Accepted decision, or Confirmed (slot-secured) via deposit / full sponsorship.
 * @param {unknown} applicant
 */
export function isCurrentProgramCohortApplicant(applicant) {
    if (!applicant || typeof applicant !== 'object') return false;
    const o = /** @type {Record<string, unknown>} */ (applicant);
    const st = String(o.status || '')
        .trim()
        .toLowerCase();
    if (st === 'withdrawn' || st === 'pulledout' || st === 'rejected') return false;
    if (getApplicantIsTester(String(o.payloadJson || ''))) return false;
    if (st === 'accepted') return true;
    const payload = String(o.payloadJson || '');
    if (getApplicantSponsorshipMode(payload) === 'full') return true;
    if (getApplicantManualDepositSubmitted(payload)) return true;
    return false;
}

/**
 * Programs with studioStatus active or completed.
 * @param {object[]} programs
 * @returns {Set<string>}
 */
function veteranProgramIds(programs) {
    /** @type {Set<string>} */
    const ids = new Set();
    for (const p of programs) {
        if (!p || typeof p !== 'object') continue;
        const st = String(/** @type {any} */ (p).studioStatus || '')
            .trim()
            .toLowerCase();
        if (st === 'active' || st === 'completed') {
            const id = String(/** @type {any} */ (p).id || '').trim();
            if (id) ids.add(id);
        }
    }
    return ids;
}

/**
 * @param {object[]} programs
 * @param {object[]} applicants
 * @returns {Set<string>}
 */
export function buildVeteranArtistIdSet(programs, applicants) {
    const progIds = veteranProgramIds(programs);
    /** @type {Set<string>} */
    const artists = new Set();
    for (const app of applicants) {
        if (!app || typeof app !== 'object') continue;
        const pid = String(/** @type {any} */ (app).programId || '').trim();
        if (!progIds.has(pid)) continue;
        const aid = artistIdFromApplicant(app);
        if (aid) artists.add(aid);
    }
    return artists;
}

/**
 * @param {object} program
 * @returns {string[]}
 */
function confirmedNamesForProgram(program) {
    if (!program || typeof program !== 'object') return [];
    const enCard = /** @type {any} */ (program).enCard;
    if (enCard && typeof enCard === 'object') {
        const pp = enCard.programPage;
        if (pp && typeof pp === 'object') {
            return normalizeConfirmedArtistsList(pp.confirmedArtists);
        }
    }
    try {
        const lj = String(/** @type {any} */ (program).localesJson || '');
        if (lj) {
            const parsed = JSON.parse(lj);
            const en = parsed.en && typeof parsed.en === 'object' ? parsed.en : {};
            const pp = en.programPage && typeof en.programPage === 'object' ? en.programPage : {};
            return normalizeConfirmedArtistsList(pp.confirmedArtists);
        }
    } catch {
        /* ignore */
    }
    return [];
}

/**
 * @param {unknown} status
 * @returns {boolean}
 */
function isDrawEntryIncluded(status) {
    const s = String(status || '')
        .trim()
        .toLowerCase();
    if (!s) return true;
    if (['withdrawn', 'cancelled', 'canceled', 'exited', 'exit', 'removed'].includes(s)) {
        return false;
    }
    return true;
}

/**
 * @typedef {{
 *   accounts: object[],
 *   contactsByPrincipal: Map<string, string>,
 *   artists: object[],
 *   artistEmailById: Map<string, string>,
 *   artistIdByName: Map<string, string>,
 *   programs: object[],
 *   applicants: object[],
 *   subscribers: object[],
 *   veteranArtistIds: Set<string>,
 *   currentProgramSeason: string,
 * }} EmailCohortContext
 */

/** @type {Promise<EmailCohortContext> | null} */
let cohortCtxInflight = null;
/** @type {EmailCohortContext | null} */
let cohortCtxCache = null;

export function invalidateEmailCohortContextCache() {
    cohortCtxCache = null;
    cohortCtxInflight = null;
}

/**
 * @param {{ subscribers?: object[] }} [opts]
 * @returns {Promise<EmailCohortContext>}
 */
export async function loadEmailCohortContext(opts = {}) {
    if (cohortCtxCache) {
        if (Array.isArray(opts.subscribers)) {
            cohortCtxCache = { ...cohortCtxCache, subscribers: opts.subscribers };
        }
        return cohortCtxCache;
    }
    if (cohortCtxInflight) {
        const ctx = await cohortCtxInflight;
        if (Array.isArray(opts.subscribers)) {
            cohortCtxCache = { ...ctx, subscribers: opts.subscribers };
            return cohortCtxCache;
        }
        return ctx;
    }
    cohortCtxInflight = (async () => {
        const [accounts, contactsRaw, artists, programs, applicants, subscribers, season] = await Promise.all([
            getAccountsForStudio().catch(() => []),
            adminListAccountContactsForStudio().catch(() => []),
            getArtistsForStudio().catch(() => []),
            getPrograms().catch(() => []),
            getApplicants().catch(() => []),
            Array.isArray(opts.subscribers)
                ? Promise.resolve(opts.subscribers)
                : getSubscribersForEmailStudio().catch(() => []),
            getCurrentProgramSeason().catch(() => ''),
        ]);
        const contactsByPrincipal = mapContactsByPrincipal(contactsRaw);
        const artistEmailById = buildArtistEmailById(artists);
        const artistIdByName = buildArtistIdByEnglishName(artists);
        const veteranArtistIds = buildVeteranArtistIdSet(programs, applicants);
        /** @type {EmailCohortContext} */
        const ctx = {
            accounts: Array.isArray(accounts) ? accounts : [],
            contactsByPrincipal,
            artists: Array.isArray(artists) ? artists : [],
            artistEmailById,
            artistIdByName,
            programs: Array.isArray(programs) ? programs : [],
            applicants: Array.isArray(applicants) ? applicants : [],
            subscribers: Array.isArray(subscribers) ? subscribers : [],
            veteranArtistIds,
            currentProgramSeason: String(season || '').trim(),
        };
        cohortCtxCache = ctx;
        return ctx;
    })();
    try {
        return await cohortCtxInflight;
    } finally {
        cohortCtxInflight = null;
    }
}

/**
 * @param {EmailCohortContext} ctx
 * @returns {Map<string, object>}
 */
function accountsByEmail(ctx) {
    /** @type {Map<string, object>} */
    const map = new Map();
    for (const acc of ctx.accounts) {
        const em = accountEmail(
            /** @type {any} */ (acc),
            ctx.contactsByPrincipal,
            ctx.artistEmailById,
        );
        if (em) map.set(em, acc);
    }
    return map;
}

/**
 * @param {EmailCohortContext} ctx
 * @param {string} email
 * @returns {boolean}
 */
function emailIsVeteran(ctx, email) {
    const em = normEmail(email);
    const acc = accountsByEmail(ctx).get(em);
    if (acc) {
        const aid = String(/** @type {any} */ (acc).linkedArtistId || '').trim();
        if (aid && ctx.veteranArtistIds.has(aid)) return true;
    }
    for (const [aid, aem] of ctx.artistEmailById) {
        if (aem === em && ctx.veteranArtistIds.has(aid)) return true;
    }
    return false;
}

/**
 * @param {unknown} applicant
 * @param {EmailCohortContext} ctx
 * @returns {string}
 */
function applicantEmail(applicant, ctx) {
    const o = applicant && typeof applicant === 'object' ? /** @type {Record<string, unknown>} */ (applicant) : {};
    const direct = normEmail(o.email);
    if (isValidEmail(direct)) return direct;
    const aid = artistIdFromApplicant(applicant);
    if (aid) {
        const fromArtist = ctx.artistEmailById.get(aid) || '';
        if (fromArtist) return fromArtist;
        const acc = ctx.accounts.find(
            (a) => String(/** @type {any} */ (a).linkedArtistId || '').trim() === aid,
        );
        if (acc) {
            return accountEmail(
                /** @type {any} */ (acc),
                ctx.contactsByPrincipal,
                ctx.artistEmailById,
            );
        }
    }
    return '';
}

/**
 * @param {string} audienceValue
 * @param {EmailCohortContext} ctx
 * @returns {{ emails: string[], label: string }}
 */
function resolveFromContext(audienceValue, ctx) {
    const v = String(audienceValue || '').trim();
    const label = cohortAudienceLabel(v);

    if (v === COHORT_ACTIVE_MEMBERS) {
        /** @type {string[]} */
        const emails = [];
        for (const acc of ctx.accounts) {
            if (!isActiveMemberAccount(acc)) continue;
            const em = accountEmail(
                /** @type {any} */ (acc),
                ctx.contactsByPrincipal,
                ctx.artistEmailById,
            );
            if (em) emails.push(em);
        }
        return { emails: dedupeEmails(emails), label };
    }

    if (v === COHORT_VETERANS) {
        /** @type {string[]} */
        const emails = [];
        for (const acc of ctx.accounts) {
            const aid = String(/** @type {any} */ (acc).linkedArtistId || '').trim();
            if (!aid || !ctx.veteranArtistIds.has(aid)) continue;
            const em = accountEmail(
                /** @type {any} */ (acc),
                ctx.contactsByPrincipal,
                ctx.artistEmailById,
            );
            if (em) emails.push(em);
        }
        for (const aid of ctx.veteranArtistIds) {
            const em = ctx.artistEmailById.get(aid);
            if (em) emails.push(em);
        }
        return { emails: dedupeEmails(emails), label };
    }

    if (v === COHORT_CURRENT_PROGRAM) {
        /** @type {string[]} */
        const emails = [];
        const currentIds = resolveCurrentProgramIds(ctx.programs, ctx.currentProgramSeason);
        for (const app of ctx.applicants) {
            if (!app || typeof app !== 'object') continue;
            const pid = String(/** @type {any} */ (app).programId || '').trim();
            if (!programIdIsCurrent(pid, currentIds)) continue;
            if (!isCurrentProgramCohortApplicant(app)) continue;
            const em = applicantEmail(app, ctx);
            if (em) emails.push(em);
        }
        const currentPrograms = ctx.programs.filter((p) =>
            programIdIsCurrent(String(/** @type {any} */ (p)?.id || ''), currentIds),
        );
        for (const prog of currentPrograms) {
            for (const name of confirmedNamesForProgram(prog)) {
                const aid = ctx.artistIdByName.get(String(name).trim().toLowerCase());
                if (!aid) continue;
                const em = ctx.artistEmailById.get(aid);
                if (em) emails.push(em);
            }
        }
        return { emails: dedupeEmails(emails), label };
    }

    if (v === COHORT_NON_MEMBERS) {
        const byEmail = accountsByEmail(ctx);
        /** @type {string[]} */
        const emails = [];
        for (const s of ctx.subscribers) {
            const em = normEmail(/** @type {any} */ (s)?.email || '');
            if (!isValidEmail(em)) continue;
            const acc = byEmail.get(em);
            if (acc) {
                if (isActiveMemberAccount(acc)) continue;
                if (isExemptAccount(acc)) continue;
            }
            if (emailIsVeteran(ctx, em)) continue;
            emails.push(em);
        }
        return { emails: dedupeEmails(emails), label };
    }

    if (v === COHORT_DRAW || v.startsWith(COHORT_DRAW_PREFIX)) {
        const programId = parseDrawProgramId(v);
        if (!programId) {
            return { emails: [], label };
        }
        // Draw entries resolved async in resolveCohortEmails
        return { emails: [], label: cohortAudienceLabel(drawCohortValue(programId)) };
    }

    return { emails: [], label };
}

/**
 * @param {string} audienceValue
 * @param {{ subscribers?: object[], ctx?: EmailCohortContext }} [opts]
 * @returns {Promise<{ emails: string[], label: string }>}
 */
export async function resolveCohortEmails(audienceValue, opts = {}) {
    const v = String(audienceValue || '').trim();
    if (!isEmailCohortAudience(v)) {
        return { emails: [], label: '' };
    }
    const ctx = opts.ctx || (await loadEmailCohortContext({ subscribers: opts.subscribers }));
    const base = resolveFromContext(v, ctx);

    if (v.startsWith(COHORT_DRAW_PREFIX)) {
        const programId = parseDrawProgramId(v);
        if (!programId) {
            return { emails: [], label: base.label };
        }
        const entries = await listProgramAwardEntriesStudio(programId);
        /** @type {string[]} */
        const emails = [];
        for (const entry of entries) {
            if (!entry || typeof entry !== 'object') continue;
            const e = /** @type {Record<string, unknown>} */ (entry);
            if (!isDrawEntryIncluded(e.status)) continue;
            const principal = String(e.principalText ?? e.principal_text ?? '').trim();
            let em = principal ? ctx.contactsByPrincipal.get(principal) || '' : '';
            if (!em && principal) {
                const acc = ctx.accounts.find(
                    (a) => String(/** @type {any} */ (a).principal || '') === principal,
                );
                if (acc) {
                    em = accountEmail(
                        /** @type {any} */ (acc),
                        ctx.contactsByPrincipal,
                        ctx.artistEmailById,
                    );
                }
            }
            if (em) emails.push(em);
        }
        const prog = ctx.programs.find(
            (p) => String(/** @type {any} */ (p).id || '') === programId,
        );
        const progName = prog ? getProgramDisplayNameFromRow(prog) : programId;
        return {
            emails: dedupeEmails(emails),
            label: `Current draw applicants — ${progName} (batch)`,
        };
    }

    if (v === COHORT_DRAW) {
        return { emails: [], label: base.label };
    }

    return base;
}

/**
 * Program options for the draw cohort picker.
 * @param {EmailCohortContext | null} [ctx]
 * @returns {Promise<{ id: string, label: string }[]>}
 */
export async function listProgramsForDrawCohortPicker(ctx) {
    const c = ctx || (await loadEmailCohortContext());
    return c.programs
        .map((p) => {
            const id = String(/** @type {any} */ (p)?.id || '').trim();
            if (!id) return null;
            return { id, label: getProgramDisplayNameFromRow(p) || id };
        })
        .filter(Boolean)
        .sort((a, b) => a.label.localeCompare(b.label));
}
