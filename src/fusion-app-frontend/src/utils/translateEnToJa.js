/**
 * Optional server proxy for EN→JA (set `VITE_TRANSLATION_PROXY_URL` in `.env`).
 * Body: JSON `{ "text": "..." }` → `{ "text": "..." }` translated.
 */
export async function translateEnToJa(text) {
    const url = typeof import.meta !== 'undefined' && import.meta.env?.VITE_TRANSLATION_PROXY_URL;
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
        throw new Error(
            'Translation proxy not configured. Set VITE_TRANSLATION_PROXY_URL to your backend that calls DeepL/Google safely.'
        );
    }
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: String(text), target: 'ja' }),
    });
    if (!res.ok) {
        throw new Error(`Translation HTTP ${res.status}`);
    }
    const data = await res.json();
    if (data && typeof data.text === 'string') return data.text;
    if (data && typeof data.translated === 'string') return data.translated;
    throw new Error('Unexpected translation response shape');
}
