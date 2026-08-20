/**
 * Radar discovery — Integration API /radar/* client.
 */
import { getIntegrationBaseUrl, integrationHeadersJson } from './integrationApi.js';
import { bulkUpsertRadarLeads, listRadarSources, upsertRadarSource } from './radarApi.js';
import { emptyLead } from './radarModel.js';

/**
 * @param {string} path
 * @param {RequestInit} [init]
 */
async function radarFetch(path, init = {}) {
    const base = getIntegrationBaseUrl();
    if (!base) throw new Error('Integration API URL not configured');
    const res = await fetch(`${base.replace(/\/$/, '')}${path}`, {
        ...init,
        headers: {
            ...integrationHeadersJson(),
            ...(init.headers || {}),
        },
    });
    const text = await res.text();
    let body = null;
    try {
        body = text ? JSON.parse(text) : null;
    } catch {
        body = { raw: text };
    }
    if (!res.ok) {
        throw new Error(body?.error || body?.message || `Radar discovery failed (${res.status})`);
    }
    return body;
}

export async function radarDiscoverHealth() {
    try {
        return await radarFetch('/radar/health');
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err.message : String(err),
            googlePlaces: false,
        };
    }
}

/**
 * @param {{ textQuery: string, maxResultCount?: number }} opts
 */
export async function radarDiscoverPlaces(opts) {
    return radarFetch('/radar/discover/places', {
        method: 'POST',
        body: JSON.stringify(opts),
    });
}

/**
 * @param {{ url: string }} opts
 */
export async function radarDiscoverCrawl(opts) {
    return radarFetch('/radar/discover/crawl', {
        method: 'POST',
        body: JSON.stringify(opts),
    });
}

/**
 * @param {{ url: string }} opts
 */
export async function radarDiscoverRss(opts) {
    return radarFetch('/radar/discover/rss', {
        method: 'POST',
        body: JSON.stringify(opts),
    });
}

/**
 * Preflight checks before Run discovery.
 * @returns {Promise<{ ok: boolean, message?: string, warnings?: string[], sources?: any[], health?: any }>}
 */
export async function preflightRadarDiscovery() {
    const base = getIntegrationBaseUrl();
    if (!base) {
        return {
            ok: false,
            message:
                'Integration API URL not configured. Set the Integration base URL in Studio → Services (or VITE_INTEGRATION_API_URL), then retry.',
        };
    }
    const sources = (await listRadarSources()).filter((s) => s.enabled);
    if (!sources.length) {
        return {
            ok: false,
            message:
                'No enabled discovery sources. Open the Sources tab, add an RSS feed, Places query, or list URL, enable it, then run discovery again.',
            sources: [],
        };
    }
    const health = await radarDiscoverHealth();
    /** @type {string[]} */
    const warnings = [];
    if (health?.ok === false || health?.error) {
        warnings.push(
            `Integration health: ${health.error || 'unreachable'}. Discovery calls may fail.`,
        );
    }
    const usesPlaces = sources.some((s) => s.sourceType === 'googlePlaces');
    if (usesPlaces && health?.googlePlaces === false) {
        warnings.push(
            'A Google Places source is enabled, but GOOGLE_PLACES_API_KEY is missing on the Integration API.',
        );
    }
    return { ok: true, sources, health, warnings };
}

/**
 * Run enabled sources (best-effort). Places/RSS/crawl → lead upserts.
 * @returns {Promise<{ created: number, errors: { sourceId?: string, error: string }[], skipped?: string, warnings?: string[] }>}
 */
export async function runRadarDiscoveryBatch() {
    const pre = await preflightRadarDiscovery();
    if (!pre.ok) {
        return {
            created: 0,
            errors: [{ error: pre.message || 'Discovery preflight failed' }],
            skipped: pre.message,
            warnings: pre.warnings || [],
        };
    }

    const sources = pre.sources || [];
    /** @type {ReturnType<typeof emptyLead>[]} */
    const created = [];
    /** @type {{ sourceId?: string, error: string }[]} */
    const errors = [];

    for (const src of sources) {
        try {
            if (src.sourceType === 'googlePlaces' && src.query) {
                const res = await radarDiscoverPlaces({
                    textQuery: src.query,
                    maxResultCount: 20,
                });
                const places = Array.isArray(res?.places) ? res.places : [];
                for (const p of places) {
                    created.push(
                        emptyLead({
                            name: p.name || p.displayName || 'Unknown gallery',
                            leadType: 'gallery',
                            location: p.address || p.formattedAddress || '',
                            website: p.website || p.websiteUri || '',
                            discoveryReason: `Google Places: ${src.query}`,
                            sourceId: src.id,
                            regionKey: src.regionKey,
                            status: 'discovered',
                            sourceUrls: [p.mapsUri || p.googleMapsUri || ''].filter(Boolean),
                        }),
                    );
                }
            } else if (src.sourceType === 'rssFeed' && src.url) {
                const res = await radarDiscoverRss({ url: src.url });
                const items = Array.isArray(res?.items) ? res.items : [];
                for (const item of items.slice(0, 25)) {
                    created.push(
                        emptyLead({
                            name: item.title || 'RSS item',
                            leadType: 'organization',
                            recentActivity: item.title || '',
                            discoveryReason: `RSS: ${src.label || src.url}`,
                            sourceId: src.id,
                            regionKey: src.regionKey,
                            status: 'discovered',
                            website: item.link || '',
                            sourceUrls: [item.link, src.url].filter(Boolean),
                        }),
                    );
                }
            } else if (
                (src.sourceType === 'residencyList' ||
                    src.sourceType === 'grantList' ||
                    src.sourceType === 'galleryRoster' ||
                    src.sourceType === 'exhibitionPage') &&
                src.url
            ) {
                const res = await radarDiscoverCrawl({ url: src.url });
                created.push(
                    emptyLead({
                        name: res?.title || src.label || 'Crawled page',
                        leadType: src.sourceType === 'galleryRoster' ? 'gallery' : 'artist',
                        recentActivity: String(res?.excerpt || '').slice(0, 280),
                        discoveryReason: `${src.sourceType}: ${src.url}`,
                        sourceId: src.id,
                        regionKey: src.regionKey,
                        status: 'discovered',
                        website: src.url,
                        sourceUrls: [src.url],
                        notes: String(res?.text || '').slice(0, 4000),
                    }),
                );
            } else {
                errors.push({
                    sourceId: src.id,
                    error: `Source "${src.label || src.id}" has no query/URL for type ${src.sourceType}`,
                });
            }
            await upsertRadarSource({
                ...src,
                lastRunAt: new Date().toISOString(),
            });
        } catch (err) {
            errors.push({
                sourceId: src.id,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }

    if (created.length) {
        try {
            await bulkUpsertRadarLeads(created);
        } catch (err) {
            errors.push({
                error: `Lead upsert failed: ${err instanceof Error ? err.message : String(err)}`,
            });
            return {
                created: 0,
                errors,
                warnings: pre.warnings || [],
            };
        }
    }

    try {
        await radarFetch('/radar/discover/batch', {
            method: 'POST',
            body: JSON.stringify({
                ingested: created.length,
                errors,
                at: new Date().toISOString(),
            }),
        });
    } catch {
        /* optional logging endpoint */
    }

    return { created: created.length, errors, warnings: pre.warnings || [] };
}
