/**
 * Detect LLM refusal / commentary leaks that must not be stored or shown as profile copy.
 */

/** @type {RegExp[]} */
const LLM_FAILURE_PATTERNS = [
    /I don't see any source text provided/i,
    /no source text provided/i,
    /please provide (?:the )?source text/i,
    /output only the translation/i,
    /I cannot translate/i,
    /unable to translate/i,
];

/**
 * @param {unknown} text
 * @returns {boolean}
 */
export function isLlmFailureText(text) {
    const s = String(text ?? '').trim();
    if (!s) return false;
    return LLM_FAILURE_PATTERNS.some((re) => re.test(s));
}

/**
 * Return empty string when text looks like an LLM failure; otherwise trimmed text.
 * @param {unknown} text
 * @returns {string}
 */
export function sanitizeLlmTextOutput(text) {
    const s = String(text ?? '').trim();
    if (!s || isLlmFailureText(s)) return '';
    return s;
}
