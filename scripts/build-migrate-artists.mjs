/**
 * Reads legacyDatat.json and writes migrateArtist.json for Studio batch import
 * (ArtistRecord-shaped rows: { artists: [...] }).
 *
 * Usage: node scripts/build-migrate-artists.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const legacyPath = path.join(root, 'src/fusion-app-frontend/src/legacyDatat.json');
const outPath = path.join(root, 'src/fusion-app-frontend/migrateArtist.json');

const SCOGE = 'storage.scoge.co';

function isDeadStorageUrl(url) {
    if (!url || typeof url !== 'string') return true;
    return url.includes(SCOGE);
}

function slugify(s) {
    const t = String(s || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 96);
    return t || 'artist';
}

function cohortYear(cohorts) {
    if (!Array.isArray(cohorts) || cohorts.length === 0) return 0;
    const c = String(cohorts[0]);
    const m = c.match(/(20\d{2})/);
    if (m) return parseInt(m[1], 10);
    if (c.includes('Tokyo2026')) return 2026;
    return 0;
}

function pickHeroImage(obj) {
    const candidates = [obj.profileImage, obj.images?.thumbnail];
    for (const u of candidates) {
        if (u && typeof u === 'string' && !isDeadStorageUrl(u)) return u.trim();
    }
    return '';
}

/** Up to 3 intro slots from Firebase gallery only (exclude scoge). */
function pickIntroGallery(obj) {
    const out = [];
    const arr = Array.isArray(obj.galleryImages) ? obj.galleryImages : [];
    for (const item of arr) {
        const u = item && item.url;
        if (u && typeof u === 'string' && !isDeadStorageUrl(u) && out.length < 3) {
            out.push({ src: u.trim(), alt: '' });
        }
    }
    return out;
}

function uniqueSlug(base, used) {
    let s = base;
    let i = 2;
    while (used.has(s)) {
        s = `${base}-${i}`;
        i += 1;
    }
    used.add(s);
    return s;
}

function buildLocales(row) {
    const first = String(row.first ?? '').trim();
    const last = String(row.last ?? '').trim();
    const name = `${first} ${last}`.trim() || 'Artist';
    const bio = String(row.bio ?? '');
    const discipline = String(row.discipline ?? '');
    const city = String(row.city ?? '');
    const country = String(row.country ?? '');
    const display = [city, country].filter(Boolean).join(', ') || country || '';
    const link = String(row.link ?? '').trim();

    /** @type {Record<string, unknown>} */
    const en = {
        name,
        discipline,
        bio,
        status: 'active',
        location: {
            city,
            state: '',
            country,
            display,
        },
        seo: {
            title: `${name} · Fusion`,
            description: bio.slice(0, 200),
        },
        links: [],
    };

    if (link && !isDeadStorageUrl(link)) {
        /** @type {{ type: string; url: string; label: string }[]} */
        const links = /** @type {any} */ (en.links);
        links.push({ type: 'website', url: link, label: 'Website' });
    }

    const intro = pickIntroGallery(row);
    if (intro.length > 0) {
        en.world = { introGallery: intro };
    }

    return { en, ja: {} };
}

function buildFilter(row) {
    const cy = cohortYear(row.cohorts);
    const dk = slugify(row.discipline || '');
    const lk = slugify(row.country || '');
    return {
        connection: 'artist',
        cohortYear: cy,
        disciplineKey: dk,
        locationKey: lk,
    };
}

function buildGalleryFilter(row) {
    const season = cohortYear(row.cohorts);
    return {
        accessType: '',
        season,
        view: '',
    };
}

/**
 * @param {object} opts
 * @param {string} opts.id
 * @param {string} opts.slug
 * @param {object} row — legacy artist or user row
 * @param {number} featuredOrder
 */
function toRecord(opts, row, featuredOrder) {
    const now = new Date().toISOString();
    const updatedAt = String(row.updatedAt || row.createdAt || now);
    const image = pickHeroImage(row);
    return {
        id: opts.id,
        slug: opts.slug,
        image,
        featuredOrder,
        visibility: 'public',
        updatedAt,
        filter: buildFilter(row),
        galleryFilter: buildGalleryFilter(row),
        locales: buildLocales(row),
        imported: true,
        accessCode: '',
    };
}

const data = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
const slugUsed = new Set();
const artistsOut = [];

let order = 0;

// 1) Legacy Artists array (catalog)
const legacyArtists = Array.isArray(data.Artists) ? data.Artists : [];
let catalogIndex = 0;
legacyArtists.forEach((row, idx) => {
    if (!row || typeof row !== 'object') return;
    const first = String(row.first ?? '').trim();
    const last = String(row.last ?? '').trim();
    const baseSlug = uniqueSlug(slugify(`${first}-${last}`) || `artist-${catalogIndex}`, slugUsed);
    const id = `legacy-a-${String(catalogIndex).padStart(3, '0')}`;
    catalogIndex += 1;
    artistsOut.push(
        toRecord(
            { id, slug: baseSlug },
            row,
            order++
        )
    );
});

// 2) Firebase users (artists only — skip admin/super)
const users = data.users && typeof data.users === 'object' ? data.users : {};
for (const [uid, row] of Object.entries(users)) {
    if (!row || typeof row !== 'object') continue;
    const role = row.role;
    if (role === 'admin' || role === 'super') continue;

    const first = String(row.first ?? '').trim();
    const last = String(row.last ?? '').trim();
    const base = slugify(`${first}-${last}-${uid.slice(0, 8)}`) || `user-${uid.slice(0, 8)}`;
    const slug = uniqueSlug(base, slugUsed);
    const id = `legacy-u-${uid}`;
    artistsOut.push(toRecord({ id, slug }, row, order++));
}

const payload = { artists: artistsOut };
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
console.log(`Wrote ${artistsOut.length} artist rows to ${outPath}`);
