/**
 * Schedule event people: By Fusion / By Artist attribution + avatar enrichment.
 */
import { initialsFromName } from './scheduleModel.js';
import { FUSION_SCHEDULE_STAFF, listFusionScheduleStaff } from './fusionStaffDirectory.js';
import {
    getArtists,
    getArtistsForStudio,
    listAdminsForStudio,
    adminListSuperStaffStudio,
    getAccountsForStudio,
} from './database.js';

/**
 * @typedef {{ id: string, name: string, initials: string, avatarUrl?: string, email?: string }} SchedulePersonView
 */

/** @type {Set<string> | null} */
let fusionPrincipalCache = null;

/**
 * @param {unknown} p
 */
function principalKey(p) {
    if (p && typeof p === 'object' && 'toText' in p && typeof /** @type {any} */ (p).toText === 'function') {
        return /** @type {{ toText: () => string }} */ (p).toText();
    }
    return String(p ?? '').trim();
}

/**
 * Collect Fusion staff / admin principal texts for attribution.
 * @returns {Promise<Set<string>>}
 */
export async function loadFusionStaffPrincipalSet() {
    if (fusionPrincipalCache) return fusionPrincipalCache;
    /** @type {Set<string>} */
    const set = new Set();
    for (const s of FUSION_SCHEDULE_STAFF) {
        if (s.id) set.add(s.id);
    }
    try {
        const [admins, supers, accounts, staff] = await Promise.all([
            listAdminsForStudio().catch(() => []),
            adminListSuperStaffStudio().catch(() => []),
            getAccountsForStudio().catch(() => []),
            listFusionScheduleStaff().catch(() => []),
        ]);
        for (const p of admins || []) set.add(principalKey(p));
        for (const p of supers || []) set.add(principalKey(p));
        for (const row of accounts || []) {
            const role = String(row?.role || '').toLowerCase();
            if (role === 'staff' || role === 'admin' || role === 'collaborator') {
                set.add(String(row.principal || '').trim());
            }
        }
        for (const s of staff || []) {
            if (s?.id) set.add(String(s.id).trim());
        }
    } catch {
        /* keep triad ids */
    }
    fusionPrincipalCache = set;
    return set;
}

/**
 * @param {{ createdBy?: string, eventKind?: string } | null | undefined} event
 * @param {Set<string>} [staffPrincipals]
 * @returns {'fusion' | 'artist'}
 */
export function resolveEventAttribution(event, staffPrincipals) {
    const createdBy = String(event?.createdBy || '').trim();
    if (createdBy && staffPrincipals?.has(createdBy)) return 'fusion';
    // Known staff ids embedded as createdBy in older seeds
    if (createdBy && FUSION_SCHEDULE_STAFF.some((s) => s.id === createdBy)) return 'fusion';
    if (createdBy === 'seed' || createdBy === 'test') return 'fusion';
    const kind = String(event?.eventKind || '').trim();
    if (kind === 'workshop' || kind === 'adventure') return 'artist';
    if (!createdBy) return 'fusion';
    return 'artist';
}

/**
 * @param {'fusion' | 'artist'} attribution
 */
export function eventAttributionLabel(attribution) {
    return attribution === 'artist' ? 'By Artist' : 'By Fusion';
}

/**
 * @param {any} artist
 * @returns {string}
 */
export function artistThumbnailUrl(artist) {
    if (!artist || typeof artist !== 'object') return '';
    const hero = String(artist.heroProfileImage || artist.hero_profile_image || '').trim();
    if (hero) return hero;
    const locales = artist.locales && typeof artist.locales === 'object' ? artist.locales : null;
    const en = locales?.en && typeof locales.en === 'object' ? locales.en : null;
    const fromEn = String(en?.imageSrc || en?.image || en?.portrait || '').trim();
    if (fromEn) return fromEn;
    return String(artist.imageSrc || artist.image || artist.portrait || '').trim();
}

/**
 * @param {any[]} staff
 * @param {string[]} participantIds
 * @param {{ preferStudioArtists?: boolean }} [opts]
 * @returns {Promise<{ staff: SchedulePersonView[], participants: SchedulePersonView[] }>}
 */
export async function enrichSchedulePeople(staff, participantIds, opts = {}) {
    const fusionStaff = await listFusionScheduleStaff().catch(() => FUSION_SCHEDULE_STAFF.map((s) => ({ ...s })));
    /** @type {Map<string, SchedulePersonView>} */
    const staffById = new Map(
        fusionStaff.map((s) => [
            s.id,
            {
                id: s.id,
                name: s.name,
                initials: s.initials || initialsFromName(s.name),
                avatarUrl: String(/** @type {any} */ (s).avatarUrl || '').trim() || undefined,
                email: s.email,
            },
        ]),
    );

    const staffOut = (Array.isArray(staff) ? staff : []).map((s) => {
        const id = String(s?.id || '').trim();
        const hit = staffById.get(id);
        const name = String(s?.name || hit?.name || id || 'Staff').trim();
        return {
            id,
            name,
            initials: String(s?.initials || hit?.initials || initialsFromName(name)).trim() || '?',
            avatarUrl: String(s?.avatarUrl || hit?.avatarUrl || '').trim() || undefined,
            email: hit?.email,
        };
    });

    const ids = (Array.isArray(participantIds) ? participantIds : []).map((id) => String(id || '').trim()).filter(Boolean);
    /** @type {SchedulePersonView[]} */
    let participants = ids.map((id) => ({
        id,
        name: id,
        initials: initialsFromName(id) || '?',
    }));

    if (!ids.length) return { staff: staffOut, participants };

    try {
        const rows = opts.preferStudioArtists
            ? await getArtistsForStudio().catch(() => getArtists())
            : await getArtists().catch(() => []);
        /** @type {Map<string, any>} */
        const byId = new Map();
        for (const a of Array.isArray(rows) ? rows : []) {
            const id = String(a?.id || a?.slug || '').trim();
            if (id) byId.set(id, a);
            const slug = String(a?.slug || '').trim();
            if (slug) byId.set(slug, a);
        }
        participants = ids.map((id) => {
            const a = byId.get(id);
            const name =
                String(a?.locales?.en?.name || a?.name || a?.slug || id).trim() || id;
            const avatarUrl = artistThumbnailUrl(a) || undefined;
            return {
                id,
                name,
                initials: initialsFromName(name) || '?',
                avatarUrl,
            };
        });
    } catch {
        /* keep id fallbacks */
    }

    return { staff: staffOut, participants };
}

/**
 * Compact avatar HTML (img or initials).
 * @param {SchedulePersonView} person
 * @param {string} [className]
 */
export function schedulePersonAvatarHtml(person, className = 'event-person__avatar') {
    const name = String(person?.name || '?');
    const initials = String(person?.initials || initialsFromName(name) || '?').slice(0, 2);
    const url = String(person?.avatarUrl || '').trim();
    if (url) {
        return `<span class="${className}" title="${escapeAttr(name)}"><img src="${escapeAttr(url)}" alt="" /></span>`;
    }
    return `<span class="${className}" title="${escapeAttr(name)}">${escapeHtml(initials)}</span>`;
}

/**
 * @param {string} s
 */
function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * @param {string} s
 */
function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, '&#39;');
}
