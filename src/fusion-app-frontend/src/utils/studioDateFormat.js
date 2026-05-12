/**
 * Format Studio-facing dates as compact US dates while keeping ISO/raw values
 * available for title attributes and persistence.
 */

/** @param {unknown} value */
function parseStudioDate(value) {
    if (value instanceof Date) return value;
    const raw = String(value ?? '').trim();
    if (!raw || raw === '—') return null;
    if (/^1970-01-01T00:00:00(?:\.000)?Z$/i.test(raw)) return null;
    if (/^-?\d+$/.test(raw)) {
        try {
            const n = BigInt(raw);
            const abs = n < 0n ? -n : n;
            let ms;
            if (abs > 100_000_000_000_000_000n) ms = Number(n / 1_000_000n);
            else if (abs > 100_000_000_000_000n) ms = Number(n / 1_000n);
            else if (abs > 100_000_000_000n) ms = Number(n);
            else ms = Number(n * 1_000n);
            return new Date(ms);
        } catch {
            return null;
        }
    }
    return new Date(raw);
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function formatStudioDate(value) {
    const d = parseStudioDate(value);
    if (!d || Number.isNaN(d.getTime()) || d.getUTCFullYear() <= 1971) return '—';
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const yy = String(d.getUTCFullYear()).slice(-2);
    return `${mm}/${dd}/${yy}`;
}

/**
 * @param {unknown} value
 * @returns {{ label: string, title: string }}
 */
export function formatStudioDateWithTitle(value) {
    const raw = String(value ?? '').trim();
    const d = parseStudioDate(value);
    if (!d || Number.isNaN(d.getTime()) || d.getUTCFullYear() <= 1971) {
        return { label: '—', title: raw };
    }
    return { label: formatStudioDate(d), title: d.toISOString() };
}
