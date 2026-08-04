/**
 * Studio artist modal — Programs tab: application IDs from canister + reserved / confirmed artists in program localesJson.
 */

import { artistDisplayName, artistEnglishBlock } from './artistSlug.js';
import {
    adminFindPrincipalForArtistStudio,
    getDataSource,
    getPrograms,
    getProgramRecordForStudio,
    listProgramAwardEntriesStudio,
    unwrapOpt,
    upsertProgramStudio,
} from './database.js';
import { getStudioAuthenticatedActor } from './studioAuth.js';

/**
 * English name string used for `programPage.confirmedArtists` (matches public program page matching).
 * @param {object | null | undefined} artist
 * @returns {string}
 */
export function studioArtistCanonicalEnglishName(artist) {
    if (!artist || typeof artist !== 'object') return '';
    const en = artistEnglishBlock(artist);
    const n = en?.name != null ? String(en.name).trim() : '';
    if (n) return n;
    return String(artistDisplayName(artist, 'en') || '').trim();
}

/**
 * Normalize `programPage.confirmedArtists` to trimmed strings (supports string[] or legacy mixed entries).
 * @param {unknown} raw
 * @returns {string[]}
 */
export function normalizeConfirmedArtistsList(raw) {
    if (!Array.isArray(raw)) return [];
    /** @type {string[]} */
    const out = [];
    for (const item of raw) {
        if (typeof item === 'string') {
            const s = item.trim();
            if (s) out.push(s);
        } else if (item && typeof item === 'object' && 'name' in item) {
            const s = String(/** @type {{ name?: unknown }} */ (item).name ?? '').trim();
            if (s) out.push(s);
        }
    }
    return out;
}

/**
 * @param {string} name
 * @param {string[]} list
 */
export function isNameInConfirmedListCaseInsensitive(name, list) {
    const want = String(name || '').trim().toLowerCase();
    if (!want) return false;
    return list.some((x) => String(x).trim().toLowerCase() === want);
}

/**
 * @param {string} name
 * @param {string[]} list
 * @returns {string[]}
 */
function removeNameCaseInsensitive(name, list) {
    const want = String(name || '').trim().toLowerCase();
    if (!want) return list;
    return list.filter((x) => String(x).trim().toLowerCase() !== want);
}

/**
 * @param {Record<string, unknown>} card
 * @param {string[]} confirmed
 */
function setAvailableSlotsFromConfirmed(card, confirmed) {
    const c = Array.isArray(confirmed) ? confirmed : [];
    const totalRaw = card.totalSlots ?? card.programPage?.totalSlots;
    const total = Number(totalRaw);
    const totalSlots = Number.isFinite(total) && total >= 0 ? Math.floor(total) : 0;
    card.availableSlots = Math.max(0, totalSlots - c.length);
}

/**
 * Staff-only: program IDs the artist has submitted an application for.
 * @param {string} artistId
 * @returns {Promise<Set<string>>}
 */
export async function getStaffArtistApplicationsProgramIds(artistId) {
    const id = String(artistId || '').trim();
    if (!id || getDataSource() === 'test') {
        return new Set();
    }
    try {
        const actor = await getStudioAuthenticatedActor();
        if (typeof actor.staffGetArtistApplicationsJson !== 'function') {
            return new Set();
        }
        const opt = await actor.staffGetArtistApplicationsJson(id);
        const text = unwrapOpt(opt);
        if (text == null || typeof text !== 'string' || !text.trim()) {
            return new Set();
        }
        const obj = JSON.parse(text);
        if (!obj || typeof obj !== 'object') {
            return new Set();
        }
        return new Set(Object.keys(/** @type {Record<string, unknown>} */ (obj)));
    } catch {
        return new Set();
    }
}

/**
 * Add or remove the artist from `programPage.confirmedArtists` and recompute `availableSlots`.
 *
 * @param {{ programId: string, artist: object, reserved: boolean }} args
 * @returns {Promise<void>}
 */
export async function updateProgramReservedArtist(args) {
    const programId = String(args.programId || '').trim();
    const artist = args.artist && typeof args.artist === 'object' ? args.artist : {};
    const reserved = Boolean(args.reserved);
    if (!programId) {
        throw new Error('program id required');
    }
    const canonical = studioArtistCanonicalEnglishName(artist);
    if (!canonical) {
        throw new Error('Artist needs an English name in Identity tab to use Programs.');
    }

    const row = await getProgramRecordForStudio(programId);
    if (!row || typeof row !== 'object') {
        throw new Error('Program not found');
    }

    /** @type {Record<string, unknown>} */
    let parsed;
    try {
        parsed = JSON.parse(String(row.localesJson || '{}'));
        if (!parsed || typeof parsed !== 'object') parsed = {};
    } catch {
        parsed = {};
    }

    const en = {
        ...(parsed.en && typeof parsed.en === 'object' ? /** @type {object} */ (parsed.en) : {}),
    };
    en.programPage =
        en.programPage && typeof en.programPage === 'object'
            ? { .../** @type {object} */ (en.programPage) }
            : {};

    let list = normalizeConfirmedArtistsList(
        /** @type {{ confirmedArtists?: unknown }} */ (en.programPage).confirmedArtists
    );
    if (reserved) {
        if (!isNameInConfirmedListCaseInsensitive(canonical, list)) {
            list = [...list, canonical];
        }
    } else {
        list = removeNameCaseInsensitive(canonical, list);
    }

    /** @type {{ confirmedArtists: string[] }} */ (en.programPage).confirmedArtists = list;
    setAvailableSlotsFromConfirmed(/** @type {Record<string, unknown>} */ (en), list);

    parsed.en = en;

    if (parsed.ja && typeof parsed.ja === 'object') {
        const ja = { .../** @type {object} */ (parsed.ja) };
        ja.programPage =
            ja.programPage && typeof ja.programPage === 'object'
                ? { .../** @type {object} */ (ja.programPage) }
                : {};
        /** @type {{ confirmedArtists: string[] }} */ (ja.programPage).confirmedArtists = [...list];
        setAvailableSlotsFromConfirmed(
            /** @type {Record<string, unknown>} */ (ja),
            list
        );
        parsed.ja = ja;
    }

    const localesJson = JSON.stringify(parsed);

    const id = String(row.id ?? programId);
    const routeLink = String(row.routeLink ?? '');
    const featuredOrder = Math.max(0, Math.floor(Number(row.featuredOrder ?? 0)));
    const visibility = String(row.visibility ?? '');
    const studioStatus = String(row.studioStatus ?? '');
    const updatedAt = new Date().toISOString();

    await upsertProgramStudio({
        id,
        routeLink,
        featuredOrder,
        visibility,
        studioStatus,
        updatedAt,
        depositAmountDisplay: String(
            row.depositAmountDisplay != null ? row.depositAmountDisplay : '',
        ),
        localesJson,
    });
}

/**
 * @param {object | null | undefined} programRow — row from {@link import('./database.js').getPrograms}
 * @returns {{ en: Record<string, unknown>, pp: Record<string, unknown>, list: string[] }}
 */
function programRowEnConfirmedContext(programRow) {
    if (!programRow || typeof programRow !== 'object') {
        return { en: {}, pp: {}, list: [] };
    }
    const row = /** @type {Record<string, unknown>} */ (programRow);
    /** @type {Record<string, unknown>} */
    let en =
        row.enCard && typeof row.enCard === 'object'
            ? /** @type {Record<string, unknown>} */ (row.enCard)
            : null;
    if (!en) {
        try {
            const parsed = JSON.parse(String(row.localesJson || '{}'));
            en =
                parsed.en && typeof parsed.en === 'object'
                    ? /** @type {Record<string, unknown>} */ (parsed.en)
                    : {};
        } catch {
            en = {};
        }
    }
    const pp =
        en.programPage && typeof en.programPage === 'object'
            ? /** @type {Record<string, unknown>} */ (en.programPage)
            : {};
    const list = normalizeConfirmedArtistsList(pp.confirmedArtists);
    return { en, pp, list };
}

/**
 * Confirmed slot counts for a program row (no artist name required).
 * @param {object | null | undefined} programRow — row from {@link import('./database.js').getPrograms}
 * @returns {{ confirmedCount: number, totalSlots: number | null, remaining: number | null }}
 */
export function programRowConfirmedSlotState(programRow) {
    const { en, pp, list } = programRowEnConfirmedContext(programRow);
    const totalRaw = en.totalSlots ?? pp.totalSlots;
    const total = Number(totalRaw);
    const totalSlots = Number.isFinite(total) && total >= 0 ? Math.floor(total) : null;
    const confirmedCount = list.length;
    const remaining = totalSlots != null ? Math.max(0, totalSlots - confirmedCount) : null;
    return { confirmedCount, totalSlots, remaining };
}

/**
 * @param {object | null | undefined} programRow
 * @returns {string[]}
 */
export function programRowConfirmedArtistNames(programRow) {
    return programRowEnConfirmedContext(programRow).list;
}

/**
 * @param {object} programRow — row from {@link import('./database.js').getPrograms}
 * @param {string} englishName
 */
export function programRowReservedState(programRow, englishName) {
    const name = String(englishName || '').trim();
    if (!programRow || typeof programRow !== 'object') {
        return { reserved: false, confirmedCount: 0, totalSlots: null, remaining: null };
    }
    const { confirmedCount, totalSlots, remaining } = programRowConfirmedSlotState(programRow);
    if (!name) {
        return { reserved: false, confirmedCount, totalSlots, remaining };
    }
    const { list } = programRowEnConfirmedContext(programRow);
    const reserved = isNameInConfirmedListCaseInsensitive(name, list);
    return { reserved, confirmedCount, totalSlots, remaining };
}

/**
 * @param {object | null | undefined} programRow
 * @returns {string}
 */
function programRowDisplayTitle(programRow) {
    if (!programRow || typeof programRow !== 'object') return '';
    const pid = String(/** @type {Record<string, unknown>} */ (programRow).id ?? '');
    try {
        const parsed = JSON.parse(
            String(/** @type {Record<string, unknown>} */ (programRow).localesJson || '{}'),
        );
        const en = parsed.en && typeof parsed.en === 'object' ? parsed.en : {};
        const pp = en.programPage && typeof en.programPage === 'object' ? en.programPage : {};
        return (
            String(pp.headline || en.headline || en.location || en.focus || pid).trim() || pid
        );
    } catch {
        return pid;
    }
}

/**
 * Resolve linked account principal for Manage Artist (Identity / credits link).
 * @param {HTMLElement} root
 * @param {string} artistId
 * @returns {Promise<string>}
 */
async function resolveArtistLinkedPrincipal(root, artistId) {
    const fromInput = root.querySelector(
        '#studio-art-linked-principal, [data-art-field="linkedPrincipal"], [name="linkedPrincipal"]',
    );
    if (fromInput instanceof HTMLInputElement || fromInput instanceof HTMLTextAreaElement) {
        const v = String(fromInput.value || '').trim();
        if (v) return v;
    }
    try {
        return String((await adminFindPrincipalForArtistStudio(artistId)) || '').trim();
    } catch {
        return '';
    }
}

/**
 * Fill Program Draw read-only table for the linked principal.
 * @param {HTMLElement} root
 * @param {object[]} programs
 * @param {string} principalText
 * @param {(s: unknown) => string} esc
 */
async function fillArtistProgramDrawTable(root, programs, principalText, esc) {
    const drawTbody = root.querySelector('#studio-art-draw-tbody');
    const drawStatus = root.querySelector('#studio-art-draw-status');
    if (!drawTbody) return;

    const setDrawStatus = (msg) => {
        if (drawStatus) drawStatus.textContent = msg || '';
    };

    drawTbody.replaceChildren();
    if (!principalText) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="3" class="studio-muted">No linked account principal — Program Draw rows unavailable.</td>`;
        drawTbody.appendChild(tr);
        setDrawStatus('Link an account principal on the Identity tab to see draw entries.');
        return;
    }
    setDrawStatus('');

    /** @type {{ title: string, entered: boolean, won: boolean }[]} */
    const rows = [];
    for (const p of programs) {
        if (!p || typeof p !== 'object') continue;
        const pid = String(/** @type {Record<string, unknown>} */ (p).id ?? '');
        if (!pid) continue;
        let entries = [];
        try {
            entries = await listProgramAwardEntriesStudio(pid);
        } catch {
            entries = [];
        }
        const match = (Array.isArray(entries) ? entries : []).find((e) => {
            if (!e || typeof e !== 'object') return false;
            const o = /** @type {Record<string, unknown>} */ (e);
            return String(o.principalText || o.principal_text || '').trim() === principalText;
        });
        if (!match) continue;
        const status = String(
            /** @type {Record<string, unknown>} */ (match).status || '',
        ).trim();
        rows.push({
            title: programRowDisplayTitle(p) || pid,
            entered: status === 'entered' || status === 'selected',
            won: status === 'selected',
        });
    }

    if (!rows.length) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="3" class="studio-muted">No Program Draw records for this principal.</td>`;
        drawTbody.appendChild(tr);
        return;
    }

    for (const row of rows) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
        <td class="studio-td-title">${esc(row.title)}</td>
        <td class="studio-td-cb"><input type="checkbox" disabled ${row.entered ? 'checked' : ''} title="Entered (or selected)" /></td>
        <td class="studio-td-cb"><input type="checkbox" disabled ${row.won ? 'checked' : ''} title="Won (status selected)" /></td>
      `;
        drawTbody.appendChild(tr);
    }
}

/**
 * Fill Programs tab table and wire Reserved toggles.
 * @param {HTMLElement} root — modal root
 * @param {object} full — loaded artist row
 */
export async function initArtistProgramsTab(root, full) {
    const tbody = root.querySelector('#studio-art-programs-tbody');
    const statusEl = root.querySelector('#studio-art-programs-status');
    if (!tbody || !full || typeof full !== 'object') return;

    const artistId = String(/** @type {Record<string, unknown>} */ (full).id ?? '');
    const englishName = studioArtistCanonicalEnglishName(full);

    const setStatus = (msg, isErr) => {
        if (!statusEl) return;
        statusEl.textContent = msg;
        statusEl.className = `studio-muted studio-art-programs-status${isErr ? ' studio-banner studio-banner--error' : ''}`;
    };

    const esc = (s) =>
        String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;');

    try {
        const [programs, appliedIds, principalText] = await Promise.all([
            getPrograms(),
            getStaffArtistApplicationsProgramIds(artistId),
            resolveArtistLinkedPrincipal(root, artistId),
        ]);
        if (!englishName) {
            setStatus('Add an English name under Identity to manage program reservation.', false);
        } else {
            setStatus('', false);
        }

        tbody.replaceChildren();
        if (!programs.length) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="5" class="studio-muted">No programs in the roster.</td>`;
            tbody.appendChild(tr);
            await fillArtistProgramDrawTable(root, [], principalText, esc);
            return;
        }
        for (const p of programs) {
            if (!p || typeof p !== 'object') continue;
            const pid = String(/** @type {Record<string, unknown>} */ (p).id ?? '');
            if (!pid) continue;

            const { reserved, totalSlots, remaining } = programRowReservedState(p, englishName);
            const applied = appliedIds.has(pid);
            const title = programRowDisplayTitle(p) || pid;

            const tr = document.createElement('tr');
            tr.dataset.programId = pid;
            tr.innerHTML = `
        <td class="studio-td-title">${esc(title)}</td>
        <td class="studio-td-num">${totalSlots != null ? esc(String(totalSlots)) : '—'}</td>
        <td class="studio-td-num studio-art-prog-remaining">${remaining != null ? esc(String(remaining)) : '—'}</td>
        <td class="studio-td-cb"><input type="checkbox" class="studio-art-prog-applied" disabled ${applied ? 'checked' : ''} title="Application on file" /></td>
        <td class="studio-td-cb"><input type="checkbox" class="studio-art-prog-reserved" ${reserved ? 'checked' : ''} ${!englishName ? 'disabled' : ''} title="Add/remove from program confirmed artists" /></td>
      `;
            tbody.appendChild(tr);

            const resCb = tr.querySelector('.studio-art-prog-reserved');
            if (resCb instanceof HTMLInputElement && englishName) {
                resCb.addEventListener('change', async () => {
                    const on = resCb.checked;
                    resCb.disabled = true;
                    try {
                        await updateProgramReservedArtist({
                            programId: pid,
                            artist: full,
                            reserved: on,
                        });
                        const fresh = await getPrograms();
                        const row = fresh.find((x) => x && String(x.id) === pid) || p;
                        const st = programRowReservedState(row, englishName);
                        const remTd = tr.querySelector('.studio-art-prog-remaining');
                        if (remTd) {
                            remTd.textContent =
                                st.remaining != null ? String(st.remaining) : '—';
                        }
                        if (st.reserved !== on) {
                            resCb.checked = st.reserved;
                        }
                        setStatus('Saved.', false);
                    } catch (e) {
                        resCb.checked = !on;
                        setStatus(e instanceof Error ? e.message : String(e), true);
                    } finally {
                        resCb.disabled = false;
                    }
                });
            }
        }

        await fillArtistProgramDrawTable(root, programs, principalText, esc);
    } catch (e) {
        setStatus(e instanceof Error ? e.message : String(e), true);
        const drawTbody = root.querySelector('#studio-art-draw-tbody');
        if (drawTbody) {
            drawTbody.innerHTML = `<tr><td colspan="3" class="studio-muted">Could not load Program Draw entries.</td></tr>`;
        }
    }
}
