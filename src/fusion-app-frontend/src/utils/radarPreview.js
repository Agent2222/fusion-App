/**
 * DEV-only Radar fixture preview — paints production Radar markup without II or fusion-radar.
 * Active only when `?radarPreview=1` and the env allows it (config.devMode, Vite DEV, or VITE_RADAR_PREVIEW).
 */
import { DEV_MODE } from '../config.js';

export const RADAR_PREVIEW_TABS = [
    'discover',
    'leads',
    'relationships',
    'outreach',
    'invites',
    'sources',
    'analytics',
];

/**
 * Preview must never unlock production Studio. Vite production builds have `import.meta.env.DEV === false`.
 */
export function isRadarPreviewEnvAllowed() {
    if (DEV_MODE) return true;
    try {
        if (import.meta.env && import.meta.env.DEV) return true;
        if (import.meta.env && String(import.meta.env.VITE_RADAR_PREVIEW || '') === 'true') {
            return true;
        }
    } catch {
        /* ignore */
    }
    return false;
}

/**
 * @param {string} [search] location.search (with or without `?`)
 */
export function parseRadarPreviewQuery(search) {
    const p = new URLSearchParams(String(search || '').replace(/^\?/, ''));
    const tabRaw = String(p.get('tab') || '')
        .trim()
        .toLowerCase();
    return {
        flagged: p.get('radarPreview') === '1',
        tab: RADAR_PREVIEW_TABS.includes(tabRaw) ? tabRaw : '',
        empty: p.get('radarEmpty') === '1',
        leadId: String(p.get('radarLead') || '').trim(),
    };
}

/**
 * @param {{ search?: string } | null} [loc]
 */
export function getRadarPreviewState(loc) {
    const location =
        loc || (typeof window !== 'undefined' ? window.location : null);
    const parsed = parseRadarPreviewQuery(location?.search || '');
    const active = Boolean(isRadarPreviewEnvAllowed() && parsed.flagged);
    return {
        active,
        tab: active ? parsed.tab : '',
        empty: active ? parsed.empty : false,
        leadId: active ? parsed.leadId : '',
    };
}

export function isRadarPreviewActive() {
    return getRadarPreviewState().active;
}
