import posthog from 'posthog-js';

export function videosLocale() {
    return typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
}

/**
 * @param {string} eventName
 * @param {Record<string, unknown>} [props]
 */
export function captureVideosEvent(eventName, props = {}) {
    try {
        posthog.capture(eventName, {
            page: 'videos',
            locale: videosLocale(),
            ...props,
        });
    } catch {
        /* analytics must never interrupt the UI */
    }
}

/**
 * @param {string} eventName
 * @param {Record<string, unknown>} [props]
 */
export function captureStudioVideoEvent(eventName, props = {}) {
    try {
        posthog.capture(eventName, {
            page: 'studio_videos',
            locale: videosLocale(),
            ...props,
        });
    } catch {
        /* ignore */
    }
}
