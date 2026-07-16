/**
 * Newsletter signup helper — writes to the same on-chain subscriber store as early access.
 */
import { submitEarlyAccessToCanister } from './earlyAccessSubscribe.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {string} email
 * @returns {string}
 */
export function normalizeNewsletterEmail(email) {
    return String(email ?? '').trim();
}

/**
 * @param {string} email
 * @returns {boolean}
 */
export function isValidNewsletterEmail(email) {
    const normalized = normalizeNewsletterEmail(email);
    return normalized.length > 0 && EMAIL_RE.test(normalized) && normalized.includes('@');
}

/**
 * Persist a newsletter subscription on the canister.
 * @param {string} email
 * @returns {Promise<boolean>} upsertSubscriber result (false = inserted, true = updated)
 */
export async function submitNewsletterSubscription(email) {
    const normalized = normalizeNewsletterEmail(email);
    if (!isValidNewsletterEmail(normalized)) {
        throw new Error('Enter a valid email.');
    }
    return submitEarlyAccessToCanister(normalized, 'Newsletter', '', 'newsletter');
}
