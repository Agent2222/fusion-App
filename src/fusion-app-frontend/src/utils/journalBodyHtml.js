/**
 * Journal entry body HTML — editor load/save and safe public render.
 */

/**
 * @param {string} s
 */
function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

const ALLOWED_TAGS = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'A', 'IMG', 'DIV', 'SPAN']);

/**
 * @param {string} text
 */
function plainTextToJournalParagraphHtml(text) {
    const chunks = String(text)
        .split(/\n\n+/)
        .map((c) => c.trim())
        .filter(Boolean);
    /** @type {string[]} */
    const paragraphs = [];
    for (const chunk of chunks) {
        const lines = chunk
            .split(/\n/)
            .map((l) => l.trim())
            .filter(Boolean);
        if (lines.length <= 1) {
            paragraphs.push(lines[0] || chunk);
            continue;
        }
        paragraphs.push(...lines);
    }
    return paragraphs
        .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
        .join('');
}

/**
 * @param {Document} doc
 */
function structureJournalBodyDocument(doc) {
    const body = doc.body;

    body.querySelectorAll('div').forEach((div) => {
        const p = doc.createElement('p');
        while (div.firstChild) p.appendChild(div.firstChild);
        div.replaceWith(p);
    });

    body.querySelectorAll('p').forEach((p) => {
        const html = p.innerHTML;
        if (!/<br\s*\/?>\s*<br\s*\/?>/i.test(html)) return;
        const parts = html.split(/<br\s*\/?>\s*<br\s*\/?>/i).filter((part) => {
            const probe = doc.createElement('div');
            probe.innerHTML = part;
            return Boolean(probe.textContent?.trim() || probe.querySelector('img,a'));
        });
        if (parts.length <= 1) return;
        const frag = doc.createDocumentFragment();
        for (const part of parts) {
            const np = doc.createElement('p');
            np.innerHTML = part.trim();
            frag.appendChild(np);
        }
        p.replaceWith(frag);
    });

    [...body.childNodes].forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
            const p = doc.createElement('p');
            p.textContent = node.textContent.trim();
            body.replaceChild(p, node);
        }
    });

    body.querySelectorAll('p').forEach((p) => {
        if (!p.textContent?.trim() && !p.querySelector('img,a')) p.remove();
    });
}

/**
 * @param {string} s
 */
function tryDecodeURIComponentSafe(s) {
    try {
        return decodeURIComponent(String(s).replace(/\+/g, ' '));
    } catch {
        return null;
    }
}

/**
 * Repair bodies corrupted when distributeUploadedAssetUrls treated HTML as a bare URL.
 * @param {string} raw
 */
export function repairCorruptedJournalBodyHtml(raw) {
    let s = String(raw ?? '').trim();
    if (!s) return '';

    if (/%[0-9A-Fa-f]{2}/.test(s)) {
        const decoded = tryDecodeURIComponentSafe(s);
        if (decoded) s = decoded;
    }

    if (/&lt;[a-z]/i.test(s) && typeof document !== 'undefined') {
        const t = document.createElement('textarea');
        t.innerHTML = s;
        s = t.value;
    }

    if (!/<img\b/i.test(s) && /^https?:\/\//i.test(s) && /"(\s|$)/.test(s)) {
        const m = s.match(/^(https?:\/\/[^\s"<>]+)"(\s*[\s\S]*)$/);
        if (m) {
            const tail = m[2].trimStart();
            s = `<p><img src="${m[1]}"${tail.startsWith('alt') || tail.startsWith('loading') || tail.startsWith('style') ? ' ' : ''}${tail}`;
        }
    }

    return s;
}

/**
 * @param {string} html
 */
export function sanitizeJournalBodyHtml(html) {
    const raw = repairCorruptedJournalBodyHtml(String(html ?? '').trim());
    if (!raw) return '';
    if (typeof DOMParser === 'undefined') return escapeHtml(raw);

    const doc = new DOMParser().parseFromString(raw, 'text/html');

    const cleanNode = (node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
            const el = /** @type {Element} */ (node);
            const tag = el.tagName.toUpperCase();
            if (!ALLOWED_TAGS.has(tag)) {
                const parent = el.parentNode;
                if (parent) {
                    while (el.firstChild) parent.insertBefore(el.firstChild, el);
                    parent.removeChild(el);
                }
                return;
            }
            if (tag === 'A') {
                const href = el.getAttribute('href') || '';
                const safe =
                    /^https?:\/\//i.test(href) || (href.startsWith('/') && !href.startsWith('//'));
                [...el.attributes].forEach((a) => el.removeAttribute(a.name));
                if (safe) {
                    el.setAttribute('href', href);
                    el.setAttribute('rel', 'noopener noreferrer');
                }
            } else if (tag === 'IMG') {
                const src = el.getAttribute('src') || '';
                const alt = el.getAttribute('alt') || '';
                [...el.attributes].forEach((a) => el.removeAttribute(a.name));
                if (src) {
                    el.setAttribute('src', src);
                    el.setAttribute('alt', alt);
                    el.setAttribute('loading', 'lazy');
                    el.setAttribute('style', 'max-width:100%;height:auto;display:block;margin:0.75rem 0;');
                } else {
                    el.remove();
                    return;
                }
            } else {
                [...el.attributes].forEach((a) => {
                    if (a.name !== 'class') el.removeAttribute(a.name);
                });
            }
        }
        const children = [...node.childNodes];
        for (const child of children) cleanNode(child);
    };

    [...doc.body.childNodes].forEach(cleanNode);
    structureJournalBodyDocument(doc);
    return doc.body.innerHTML.trim();
}

/**
 * Load/save/render pipeline entry point.
 * @param {unknown} raw
 */
export function normalizeJournalBodyHtml(raw) {
    return sanitizeJournalBodyHtml(String(raw ?? ''));
}

/**
 * @param {unknown} raw
 */
export function journalDescriptionToEditorHtml(raw) {
    const s = repairCorruptedJournalBodyHtml(String(raw ?? '').trim());
    if (!s) return '';
    if (/<[a-z][\s\S]*>/i.test(s)) return sanitizeJournalBodyHtml(s);
    return plainTextToJournalParagraphHtml(s);
}

/**
 * @param {unknown} html
 */
export function journalBodyPlainText(html) {
    const s = String(html ?? '').trim();
    if (!s) return '';
    const normalized = repairCorruptedJournalBodyHtml(s);
    if (typeof document === 'undefined') {
        return normalized
            .replace(/<img\b[^>]*>/gi, ' ')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
    const el = document.createElement('div');
    el.innerHTML = sanitizeJournalBodyHtml(normalized);
    return (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
}

/**
 * Plain LLM output → paragraph HTML for the editor.
 * @param {string} text
 */
export function journalPlainTextToEditorHtml(text) {
    const s = String(text ?? '').trim();
    if (!s) return '';
    if (/<[a-z][\s\S]*>/i.test(s)) return sanitizeJournalBodyHtml(s);
    return journalDescriptionToEditorHtml(s);
}
