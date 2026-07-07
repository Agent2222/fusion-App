/**
 * PayPal REST client (OAuth + fetch wrapper).
 */

const SANDBOX_BASE = 'https://api-m.sandbox.paypal.com';
const LIVE_BASE = 'https://api-m.paypal.com';

/** @type {{ token: string; expiresAt: number } | null} */
let _tokenCache = null;

export function getPayPalMode() {
    const mode = String(process.env.PAYPAL_MODE || 'sandbox').toLowerCase();
    return mode === 'live' ? 'live' : 'sandbox';
}

export function getPayPalBaseUrl() {
    return getPayPalMode() === 'live' ? LIVE_BASE : SANDBOX_BASE;
}

export function isPayPalConfigured() {
    return Boolean(process.env.PAYPAL_CLIENT_ID?.trim() && process.env.PAYPAL_CLIENT_SECRET?.trim());
}

export function getPayPalClientId() {
    return (process.env.PAYPAL_CLIENT_ID || '').trim();
}

async function fetchAccessToken() {
    const now = Date.now();
    if (_tokenCache && _tokenCache.expiresAt > now + 60_000) {
        return _tokenCache.token;
    }
    const clientId = process.env.PAYPAL_CLIENT_ID || '';
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
    if (!clientId || !clientSecret) {
        throw new Error('PayPal credentials not configured');
    }
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`PayPal OAuth failed: ${res.status} ${text}`);
    }
    const data = await res.json();
    const token = String(data.access_token || '');
    const expiresIn = Number(data.expires_in || 3600);
    _tokenCache = { token, expiresAt: now + expiresIn * 1000 };
    return token;
}

/**
 * @param {string} path
 * @param {{ method?: string; body?: unknown; headers?: Record<string, string> }} [opts]
 */
export async function paypalRequest(path, opts = {}) {
    const token = await fetchAccessToken();
    const url = path.startsWith('http') ? path : `${getPayPalBaseUrl()}${path}`;
    const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(opts.headers || {}),
    };
    const res = await fetch(url, {
        method: opts.method || 'GET',
        headers,
        body: opts.body != null ? JSON.stringify(opts.body) : undefined,
    });
    const text = await res.text();
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = { raw: text };
    }
    if (!res.ok) {
        const detail = data?.message || data?.error_description || text;
        throw new Error(`PayPal API ${res.status}: ${detail}`);
    }
    return data;
}
