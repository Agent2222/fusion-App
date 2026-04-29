/**
 * Minimal RFC-style CSV parse (quoted fields, comma).
 * @param {string} text
 * @returns {string[][]}
 */
export function parseCsvRows(text) {
    const rows = [];
    let row = [];
    let cur = '';
    let i = 0;
    let inQuotes = false;
    while (i < text.length) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') {
                    cur += '"';
                    i += 2;
                    continue;
                }
                inQuotes = false;
                i += 1;
                continue;
            }
            cur += c;
            i += 1;
            continue;
        }
        if (c === '"') {
            inQuotes = true;
            i += 1;
            continue;
        }
        if (c === ',') {
            row.push(cur);
            cur = '';
            i += 1;
            continue;
        }
        if (c === '\r') {
            i += 1;
            continue;
        }
        if (c === '\n') {
            row.push(cur);
            rows.push(row);
            row = [];
            cur = '';
            i += 1;
            continue;
        }
        cur += c;
        i += 1;
    }
    row.push(cur);
    if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
        rows.push(row);
    }
    return rows;
}

/**
 * @param {string} text
 * @returns {Record<string, string>[]}
 */
export function parseSubscriberCsv(text) {
    const rows = parseCsvRows(text.trim());
    if (rows.length < 2) return [];
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const emailIdx = header.findIndex((h) => h === 'email');
    const catIdx = header.findIndex((h) => h === 'category');
    const nameIdx = header.findIndex((h) => h === 'fullname' || h === 'name');
    const intentIdx = header.findIndex((h) => h === 'intent');
    const tsIdx = header.findIndex((h) => h === 'timestamp');
    const audIdx = header.findIndex(
        (h) => h === 'resendsegmentids' || h === 'audiences' || h === 'resend_segment_ids',
    );
    if (emailIdx < 0) return [];
    const out = [];
    for (let r = 1; r < rows.length; r++) {
        const line = rows[r];
        const email = (line[emailIdx] || '').trim();
        if (!email) continue;
        const audStr = audIdx >= 0 ? (line[audIdx] || '').trim() : '';
        const audiences = audStr
            ? audStr
                  .split(/[;,]/)
                  .map((s) => s.trim())
                  .filter(Boolean)
            : [];
        out.push({
            email,
            category: catIdx >= 0 ? (line[catIdx] || '').trim() : '',
            fullName: nameIdx >= 0 ? (line[nameIdx] || '').trim() : '',
            intent: intentIdx >= 0 ? (line[intentIdx] || '').trim() : '',
            timestamp: tsIdx >= 0 ? (line[tsIdx] || '').trim() : new Date().toISOString(),
            audiences,
        });
    }
    return out;
}
