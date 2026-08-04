/**
 * Soft contact validation shared by formal application + program draw forms.
 */

/**
 * @param {string} email
 * @returns {boolean}
 */
export function isLooseEmail(email) {
    const t = String(email ?? '').trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

/**
 * @typedef {{ id: string, label: string }} ProgramFormContactField
 */

/**
 * @param {{ getValue: (id: string) => string, fields: ProgramFormContactField[] }} opts
 * @returns {{ missing: ProgramFormContactField[], invalidEmail: boolean }}
 */
export function getMissingContactFields(opts) {
    const getValue = typeof opts.getValue === 'function' ? opts.getValue : () => '';
    const fields = Array.isArray(opts.fields) ? opts.fields : [];
    const missing = fields.filter((f) => !String(getValue(f.id) || '').trim());
    const emailField = fields.find((f) => f.id.includes('email'));
    const emailId = emailField?.id || '';
    const emailVal = emailId ? String(getValue(emailId) || '').trim() : '';
    const invalidEmail =
        Boolean(emailId) &&
        !missing.some((f) => f.id === emailId) &&
        !isLooseEmail(emailVal);
    return { missing, invalidEmail };
}
