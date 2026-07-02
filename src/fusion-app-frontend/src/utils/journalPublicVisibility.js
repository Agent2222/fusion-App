/** @typedef {'draft' | 'published' | 'archived'} JournalEntryStatus */
/** @typedef {'live' | 'hidden' | 'broken'} JournalLayoutRowVisibility */
/** @typedef {'yes' | 'no' | 'hidden' | 'broken'} JournalEntryOnPageState */

const VALID_STATUSES = /** @type {const} */ (['draft', 'published', 'archived']);

/**
 * @param {unknown} entry
 * @returns {JournalEntryStatus}
 */
export function journalEntryStatus(entry) {
    if (!entry || typeof entry !== 'object') return 'draft';
    const raw = String(/** @type {Record<string, unknown>} */ (entry).entryStatus ?? '')
        .trim()
        .toLowerCase();
    return /** @type {JournalEntryStatus} */ (
        VALID_STATUSES.includes(/** @type {JournalEntryStatus} */ (raw)) ? raw : 'draft'
    );
}

/**
 * @param {unknown} entry
 */
export function isJournalEntryPublished(entry) {
    return journalEntryStatus(entry) === 'published';
}

/**
 * @param {unknown} entries
 */
export function filterPublishedJournalEntries(entries) {
    if (!Array.isArray(entries)) return [];
    return entries.filter((e) => isJournalEntryPublished(e));
}

/**
 * Milliseconds for sorting journal entries newest-first.
 * @param {unknown} entry
 * @returns {number}
 */
export function journalEntryRecencyMs(entry) {
    if (!entry || typeof entry !== 'object') return 0;
    const r = /** @type {Record<string, unknown>} */ (entry);
    let best = 0;
    for (const key of ['updatedAt', 'publishedAt', 'datePublished', 'date', 'createdAt']) {
        const v = String(r[key] ?? '').trim();
        if (!v) continue;
        const ms = Date.parse(v);
        if (Number.isFinite(ms)) best = Math.max(best, ms);
    }
    const id = String(r.id ?? '').trim();
    const tsMatch = /^j_(\d+)$/.exec(id);
    if (tsMatch) {
        const ms = Number(tsMatch[1]);
        if (Number.isFinite(ms)) best = Math.max(best, ms);
    }
    if (/^\d+$/.test(id)) best = Math.max(best, Number(id));
    return best;
}

/**
 * @param {unknown} entries
 */
export function sortJournalEntriesNewestFirst(entries) {
    if (!Array.isArray(entries)) return [];
    return [...entries]
        .map((entry, index) => ({ entry, index }))
        .sort((a, b) => {
            const diff = journalEntryRecencyMs(b.entry) - journalEntryRecencyMs(a.entry);
            if (diff !== 0) return diff;
            return b.index - a.index;
        })
        .map(({ entry }) => entry);
}

export const MAX_HOME_JOURNAL_CAROUSEL_ENTRIES = 3;

/**
 * Resolve manual home carousel ids to published journal rows (preserves staff order; skips missing/unpublished).
 * @param {unknown} entryIds
 * @param {Array<Record<string, unknown>>} publishedEntries
 */
export function resolveHomeJournalCarouselEntries(entryIds, publishedEntries) {
    if (!Array.isArray(entryIds) || !Array.isArray(publishedEntries)) return [];
    const byId = new Map(
        publishedEntries.map((e) => [String(/** @type {Record<string, unknown>} */ (e).id ?? ''), e])
    );
    const out = [];
    const seen = new Set();
    for (const raw of entryIds) {
        const id = String(raw ?? '').trim();
        if (!id || seen.has(id)) continue;
        const row = byId.get(id);
        if (!row || !isJournalEntryPublished(row)) continue;
        seen.add(id);
        out.push(row);
        if (out.length >= MAX_HOME_JOURNAL_CAROUSEL_ENTRIES) break;
    }
    return out;
}

/**
 * @param {unknown} refId
 * @param {Array<Record<string, unknown>>} entries
 * @returns {Record<string, unknown> | null}
 */
export function resolveJournalEntryByRef(refId, entries) {
    const asStr = String(refId ?? '').trim();
    if (!asStr || !Array.isArray(entries)) return null;
    const byId = entries.find((j) => String(j?.id ?? '') === asStr);
    if (byId) return byId;
    if (/^\d+$/.test(asStr)) {
        const idx = Number(asStr);
        if (Number.isFinite(idx) && idx >= 0 && idx < entries.length) return entries[idx];
    }
    return null;
}

/**
 * @param {unknown} entryId
 * @param {Array<Record<string, unknown>>} layoutRows
 */
export function journalEntryOnLayout(entryId, layoutRows) {
    const id = String(entryId ?? '').trim();
    if (!id) return { onLayout: false, rowCount: 0 };
    const rows = Array.isArray(layoutRows) ? layoutRows : [];
    const matching = rows.filter(
        (r) =>
            String(r?.rowType || '')
                .trim()
                .toLowerCase() === 'journal-entry' && String(r?.refId ?? '') === id
    );
    return { onLayout: matching.length > 0, rowCount: matching.length };
}

/**
 * @param {unknown} row
 * @param {Array<Record<string, unknown>>} entries
 * @returns {JournalLayoutRowVisibility}
 */
export function journalLayoutRowVisibility(row, entries) {
    const type = String(
        row && typeof row === 'object' ? /** @type {Record<string, unknown>} */ (row).rowType : ''
    )
        .trim()
        .toLowerCase();
    if (type !== 'journal-entry') return 'live';
    const entry = resolveJournalEntryByRef(
        row && typeof row === 'object' ? /** @type {Record<string, unknown>} */ (row).refId : '',
        entries
    );
    if (!entry) return 'broken';
    if (!isJournalEntryPublished(entry)) return 'hidden';
    return 'live';
}

/**
 * @param {unknown} entryId
 * @param {Array<Record<string, unknown>>} layoutRows
 * @param {Array<Record<string, unknown>>} entries
 * @returns {JournalEntryOnPageState}
 */
export function journalEntryOnPageState(entryId, layoutRows, entries) {
    const id = String(entryId ?? '').trim();
    if (!id) return 'no';
    const { onLayout } = journalEntryOnLayout(id, layoutRows);
    if (!onLayout) return 'no';
    const entry = entries.find((e) => String(e?.id ?? '') === id);
    if (!entry) return 'broken';
    if (!isJournalEntryPublished(entry)) return 'hidden';
    return 'yes';
}
