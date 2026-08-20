/**
 * Fusion Radar discovery routes — Places / crawl / RSS / batch / health.
 * Secrets stay server-side (GOOGLE_PLACES_API_KEY). No extra npm deps.
 */

/**
 * @param {string} html
 */
function stripTags(html) {
    return String(html || '')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * @param {string} html
 */
function extractTitle(html) {
    const m = String(html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (m) return stripTags(m[1]).slice(0, 200);
    const h1 = String(html || '').match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    return h1 ? stripTags(h1[1]).slice(0, 200) : '';
}

/**
 * @param {string} xml
 */
function parseRssItems(xml) {
    /** @type {{ title: string, link: string, summary: string }[]} */
    const items = [];
    const itemBlocks = String(xml || '').match(/<item[\s\S]*?<\/item>/gi) || [];
    for (const block of itemBlocks) {
        const title = (block.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
        const link = (block.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [])[1] || '';
        const summary = (block.match(/<description[^>]*>([\s\S]*?)<\/description>/i) || [])[1] || '';
        items.push({
            title: stripTags(title),
            link: stripTags(link),
            summary: stripTags(summary).slice(0, 500),
        });
    }
    if (items.length) return items;
    const entryBlocks = String(xml || '').match(/<entry[\s\S]*?<\/entry>/gi) || [];
    for (const block of entryBlocks) {
        const title = (block.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
        const linkHref = (block.match(/<link[^>]*href=["']([^"']+)["']/i) || [])[1] || '';
        const linkText = (block.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [])[1] || '';
        const summary = (block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i) || [])[1] || '';
        items.push({
            title: stripTags(title),
            link: linkHref || stripTags(linkText),
            summary: stripTags(summary).slice(0, 500),
        });
    }
    return items;
}

/**
 * @param {import('express').Express} app
 * @param {{ requireApiKey: import('express').RequestHandler }} deps
 */
export function registerRadarRoutes(app, deps) {
    const { requireApiKey } = deps;
    const placesKey = (process.env.GOOGLE_PLACES_API_KEY || '').trim();

    app.get('/radar/health', requireApiKey, (_req, res) => {
        res.json({
            ok: true,
            googlePlaces: Boolean(placesKey),
            radarCanisterId: (process.env.FUSION_RADAR_CANISTER_ID || '').trim() || null,
            at: new Date().toISOString(),
        });
    });

    app.post('/radar/discover/places', requireApiKey, async (req, res) => {
        try {
            if (!placesKey) {
                return res.status(503).json({ error: 'GOOGLE_PLACES_API_KEY not configured' });
            }
            const textQuery = String(req.body?.textQuery || '').trim();
            if (!textQuery) {
                return res.status(400).json({ error: 'textQuery required' });
            }
            const maxResultCount = Math.min(Number(req.body?.maxResultCount) || 20, 40);
            const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': placesKey,
                    'X-Goog-FieldMask':
                        'places.displayName,places.formattedAddress,places.websiteUri,places.googleMapsUri,places.types',
                },
                body: JSON.stringify({ textQuery, maxResultCount }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                return res.status(response.status).json({
                    error: data?.error?.message || `Places HTTP ${response.status}`,
                });
            }
            const places = (Array.isArray(data.places) ? data.places : []).map((p) => ({
                name: p.displayName?.text || p.displayName || '',
                displayName: p.displayName?.text || '',
                address: p.formattedAddress || '',
                formattedAddress: p.formattedAddress || '',
                website: p.websiteUri || '',
                websiteUri: p.websiteUri || '',
                mapsUri: p.googleMapsUri || '',
                googleMapsUri: p.googleMapsUri || '',
                types: p.types || [],
            }));
            return res.json({ places, count: places.length });
        } catch (e) {
            return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
        }
    });

    app.post('/radar/discover/crawl', requireApiKey, async (req, res) => {
        try {
            const url = String(req.body?.url || '').trim();
            if (!/^https?:\/\//i.test(url)) {
                return res.status(400).json({ error: 'Valid http(s) url required' });
            }
            const response = await fetch(url, {
                headers: { 'User-Agent': 'FusionRadarBot/1.0 (+https://fusionart.world)' },
                redirect: 'follow',
            });
            const html = await response.text();
            const title = extractTitle(html);
            const text = stripTags(html).slice(0, 12000);
            return res.json({
                url,
                title,
                excerpt: text.slice(0, 400),
                text,
                status: response.status,
            });
        } catch (e) {
            return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
        }
    });

    app.post('/radar/discover/rss', requireApiKey, async (req, res) => {
        try {
            const url = String(req.body?.url || '').trim();
            if (!/^https?:\/\//i.test(url)) {
                return res.status(400).json({ error: 'Valid http(s) url required' });
            }
            const response = await fetch(url, {
                headers: { 'User-Agent': 'FusionRadarBot/1.0 (+https://fusionart.world)' },
            });
            const xml = await response.text();
            const items = parseRssItems(xml).slice(0, 50);
            return res.json({ items, count: items.length });
        } catch (e) {
            return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
        }
    });

    app.post('/radar/discover/batch', requireApiKey, async (req, res) => {
        return res.json({
            ok: true,
            ingested: Number(req.body?.ingested) || 0,
            errors: Array.isArray(req.body?.errors) ? req.body.errors : [],
            note: 'Studio ingests leads client-side; PEM ingest can use FUSION_RADAR_CANISTER_ID',
            at: new Date().toISOString(),
        });
    });
}
