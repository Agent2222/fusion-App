/**
 * Resolve artist name + email for a Studio broadcast redemption.
 */

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function principalFromBroadcast(raw) {
    const value = raw?.principal ?? raw?.owner ?? raw;
    if (value == null || value === '') return '';
    if (typeof value.toText === 'function') return String(value.toText());
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'object') {
        if (typeof value.toString === 'function') {
            const t = value.toString();
            if (t && t !== '[object Object]') return t;
        }
    }
    return String(value || '').trim();
}

/**
 * @param {unknown} value
 */
export function unwrapCandidOpt(value) {
    if (value == null || value === '') return '';
    if (Array.isArray(value)) return value.length ? value[0] : '';
    return value;
}

/**
 * @param {unknown} row
 */
export function isBroadcastFulfilled(row) {
    return Boolean(String(unwrapCandidOpt(row?.fulfilledAt) || '').trim());
}

/**
 * @param {unknown} channel
 */
export function broadcastChannelKey(channel) {
    if (channel && typeof channel === 'object' && !Array.isArray(channel)) {
        return Object.keys(channel).find((k) => k !== 'undefined') || '';
    }
    return String(channel ?? '');
}

/**
 * @param {unknown} raw
 */
export function formatBroadcastDate(raw) {
    const value = unwrapCandidOpt(raw);
    if (value == null || value === '') return '—';
    const str = String(value);
    const iso = Date.parse(str);
    if (!Number.isNaN(iso) && /[-T]/.test(str)) {
        return new Date(iso).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    }
    const n = typeof value === 'bigint' ? Number(value / 1000000n) : Number(value);
    const ms = n > 1e15 ? n / 1e6 : n;
    if (!Number.isFinite(ms) || ms <= 0) return '—';
    return new Date(ms).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

/**
 * @param {unknown} row
 * @param {{
 *   accounts?: Map<string, object>,
 *   contacts?: Map<string, { firstName?: string, lastName?: string, fullName?: string, email?: string }>,
 *   artists?: Map<string, object>,
 * }} dirs
 */
export function resolveBroadcastArtist(row, dirs = {}) {
    const principal = principalFromBroadcast(row);
    const acc = dirs.accounts?.get(principal) || null;
    const contact = dirs.contacts?.get(principal) || null;
    const linkedId = String(unwrapCandidOpt(acc?.linkedArtistId) || '').trim();
    const artist = (linkedId && dirs.artists?.get(linkedId)) || null;
    const artistName = String(artist?.name || artist?.locales?.en?.name || '').trim();
    const contactName = String(
        contact?.fullName || [contact?.firstName, contact?.lastName].filter(Boolean).join(' '),
    ).trim();
    const name = artistName || contactName || String(acc?.slug || '').trim();
    const email = String(contact?.email || artist?.contactEmail || artist?.email || '').trim();
    return {
        principal,
        artistId: linkedId,
        artistName: name,
        email,
    };
}
