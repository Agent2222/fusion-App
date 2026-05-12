import posthog from 'posthog-js';

export function communityLocale() {
    return typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
}

/**
 * Keep link analytics useful without sending full URLs or user-entered query strings.
 * @param {unknown} href
 * @returns {{ destination_type: string, destination_path?: string, destination_host?: string }}
 */
export function communityDestinationProps(href) {
    const raw = String(href ?? '').trim();
    if (!raw) return { destination_type: 'none' };
    if (raw.startsWith('/') && !raw.startsWith('//')) {
        return { destination_type: 'internal', destination_path: raw.split(/[?#]/)[0] || '/' };
    }
    try {
        const url = new URL(raw, window.location.origin);
        const sameOrigin = url.origin === window.location.origin;
        return sameOrigin
            ? { destination_type: 'internal', destination_path: url.pathname || '/' }
            : { destination_type: 'external', destination_host: url.hostname };
    } catch {
        return { destination_type: 'unknown' };
    }
}

/**
 * @param {string} eventName
 * @param {Record<string, unknown>} [props]
 */
export function captureCommunityEvent(eventName, props = {}) {
    try {
        posthog.capture(eventName, {
            page: 'community',
            locale: communityLocale(),
            ...props,
        });
    } catch {
        /* analytics must never interrupt the UI */
    }
}
