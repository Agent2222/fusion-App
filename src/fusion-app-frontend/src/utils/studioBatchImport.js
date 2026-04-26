/**
 * Studio batch JSON import: artists (imported + access codes) and programs.
 */

/**
 * @returns {string} Eight-digit numeric string (10000000–99999999).
 */
export function randomEightDigitCode() {
    return String(Math.floor(10000000 + Math.random() * 90000000));
}

/**
 * @param {Set<string>} used
 */
export function nextUniqueAccessCode(used) {
    let c;
    do {
        c = randomEightDigitCode();
    } while (used.has(c));
    used.add(c);
    return c;
}

/**
 * @param {object[]} artists
 * @returns {Set<string>}
 */
export function collectAccessCodesFromArtists(artists) {
    const s = new Set();
    for (const a of artists || []) {
        const c = String(a?.accessCode ?? a?.access_code ?? '').trim();
        if (/^\d{8}$/.test(c)) s.add(c);
    }
    return s;
}

/**
 * @param {unknown} f
 */
function mapFilter(f) {
    if (!f || typeof f !== 'object') return null;
    const o = /** @type {Record<string, unknown>} */ (f);
    const raw = o.cohort_years ?? o.cohortYears;
    /** @type {number[]} */
    let cohortYears = [];
    if (Array.isArray(raw)) {
        cohortYears = raw
            .map((x) => Math.max(0, Math.floor(Number(x))))
            .filter((n) => n > 0);
    }
    const legacy = Math.max(0, Math.floor(Number(o.cohort_year ?? o.cohortYear ?? 0)));
    if (cohortYears.length === 0 && legacy > 0) cohortYears = [legacy];
    const cohortYear = cohortYears.length > 0 ? cohortYears[0] : legacy;
    return {
        connection: String(o.connection ?? ''),
        cohortYear,
        cohortYears,
        disciplineKey: String(o.discipline_key ?? o.disciplineKey ?? ''),
        locationKey: String(o.location_key ?? o.locationKey ?? ''),
    };
}

/**
 * @param {unknown} g
 */
function mapGallery(g) {
    if (!g || typeof g !== 'object') return null;
    return {
        accessType: String(g.access_type ?? g.accessType ?? ''),
        season: Math.max(0, Math.floor(Number(g.season ?? 0))),
        view: String(g.view ?? ''),
    };
}

/**
 * Build one artist record for canister / test overlay. Batch import always sets imported and assigns codes.
 * @param {unknown} raw — `ArtistRecord`-shaped or flat profile + `locales`
 * @param {Set<string>} codePool
 * @param {{ forceImported?: boolean }} [opts]
 */
export function normalizeArtistImportRow(raw, codePool, opts = {}) {
    const forceImported = opts.forceImported !== false;
    const row = raw && typeof raw === 'object' ? raw : {};
    const prof = row.profile && typeof row.profile === 'object' ? row.profile : row;
    const id = String(prof.id || '').trim();
    const slug = String(prof.slug || '').trim();
    if (!id || !slug) {
        throw new Error('Each artist requires id and slug');
    }
    let accessCode = String(
        row.accessCode ?? row.access_code ?? prof.accessCode ?? prof.access_code ?? ''
    ).trim();
    if (!/^\d{8}$/.test(accessCode)) {
        accessCode = nextUniqueAccessCode(codePool);
    } else {
        codePool.add(accessCode);
    }
    const now = new Date().toISOString();
    const profile = {
        id,
        slug,
        image: String(prof.image ?? ''),
        heroProfileImage: String(
            prof.heroProfileImage ?? prof.hero_profile_image ?? row.heroProfileImage ?? row.hero_profile_image ?? ''
        ),
        featuredOrder: Math.max(0, Math.floor(Number(prof.featuredOrder ?? prof.featured_order ?? 0))),
        visibility: String(prof.visibility ?? 'public'),
        updatedAt: String(prof.updatedAt ?? prof.updated_at ?? now),
        contactEmail: String(
            prof.contactEmail ?? prof.contact_email ?? row.contactEmail ?? row.contact_email ?? '',
        ).trim(),
        filter: mapFilter(prof.filter),
        galleryFilter: mapGallery(prof.galleryFilter ?? prof.gallery_filter),
    };
    let localesJson = null;
    if (typeof row.localesJson === 'string') localesJson = row.localesJson;
    else if (row.locales && typeof row.locales === 'object') localesJson = JSON.stringify(row.locales);
    const imported = forceImported ? true : Boolean(row.imported ?? prof.imported);
    return {
        profile,
        localesJson,
        notesEncrypted: null,
        imported,
        accessCode,
    };
}

/**
 * @param {unknown} raw
 */
export function normalizeProgramImportRow(raw) {
    const p = raw && typeof raw === 'object' ? raw : {};
    const id = String(p.id || '').trim();
    if (!id) throw new Error('Each program requires an id');
    let localesJson = '';
    if (typeof p.localesJson === 'string') localesJson = p.localesJson;
    else if (p.locales && typeof p.locales === 'object') localesJson = JSON.stringify(p.locales);
    else localesJson = JSON.stringify({ en: {}, ja: {} });
    return {
        id,
        routeLink: String(p.routeLink ?? p.route_link ?? ''),
        featuredOrder: Math.max(0, Math.floor(Number(p.featuredOrder ?? p.featured_order ?? 0))),
        visibility: String(p.visibility ?? 'public'),
        studioStatus: String(p.studioStatus ?? p.studio_status ?? 'open'),
        updatedAt: String(p.updatedAt ?? p.updated_at ?? new Date().toISOString()),
        depositAmountDisplay: String(p.depositAmountDisplay ?? p.deposit_amount_display ?? ''),
        localesJson,
    };
}

/**
 * @param {unknown} data — JSON root
 * @param {'artists' | 'programs'} kind
 * @returns {unknown[]}
 */
export function extractArrayFromBatchJson(data, kind) {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
        if (kind === 'artists' && Array.isArray(data.artists)) return data.artists;
        if (kind === 'programs' && Array.isArray(data.programs)) return data.programs;
    }
    throw new Error('JSON must be an array or an object with an "artists" or "programs" array.');
}

/**
 * Candid-friendly `ArtistRecord` for `@dfinity` actor calls.
 * @param {{ profile: object, localesJson: string | null, notesEncrypted: null, imported?: boolean, accessCode?: string }} rec
 */
/**
 * @param {unknown} filter
 * @returns {bigint[]}
 */
function cohortYearsBigIntsForMotoko(filter) {
    if (!filter || typeof filter !== 'object') return [];
    const o = /** @type {Record<string, unknown>} */ (filter);
    const raw = o.cohortYears ?? o.cohort_years;
    if (Array.isArray(raw)) {
        return raw
            .map((n) => BigInt(Math.max(0, Math.floor(Number(n)))))
            .filter((b) => b > BigInt(0));
    }
    const leg = Math.max(0, Math.floor(Number(o.cohortYear ?? o.cohort_year ?? 0)));
    return leg > 0 ? [BigInt(leg)] : [];
}

/**
 * Cohort years for `bulkPutArtistFilterCohortYears` (parallel to `ArtistFilterStored` on-chain).
 * @param {Array<{ profile?: { id?: unknown, filter?: unknown } }>} records
 * @returns {Array<[string, bigint[]]>}
 */
export function cohortNatPairsForCanisterBulk(records) {
    const out = [];
    if (!Array.isArray(records)) return out;
    for (const rec of records) {
        const p = rec?.profile;
        if (!p || typeof p !== 'object') continue;
        const id = String(/** @type {Record<string, unknown>} */ (p).id ?? '').trim();
        if (!id) continue;
        const ys = cohortYearsBigIntsForMotoko(/** @type {Record<string, unknown>} */ (p).filter);
        out.push([id, ys]);
    }
    return out;
}

export function toMotokoArtistRecord(rec) {
    const p = rec.profile;
    const filterMotoko = p.filter
        ? (() => {
              const ys = cohortYearsBigIntsForMotoko(p.filter);
              const legacy = Math.max(
                  0,
                  Math.floor(
                      Number(
                          /** @type {Record<string, unknown>} */ (p.filter).cohortYear ??
                              /** @type {Record<string, unknown>} */ (p.filter).cohort_year ??
                              0
                      )
                  )
              );
              const cohortYear = ys.length > 0 ? ys[0] : BigInt(legacy);
              return [
                  {
                      connection: p.filter.connection,
                      cohortYear,
                      disciplineKey: p.filter.disciplineKey,
                      locationKey: p.filter.locationKey,
                  },
              ];
          })()
        : [];
    return {
        profile: {
            id: p.id,
            slug: p.slug,
            image: p.image,
            featuredOrder: p.featuredOrder,
            visibility: p.visibility,
            updatedAt: p.updatedAt,
            contactEmail: String(p.contactEmail ?? ''),
            filter: filterMotoko,
            galleryFilter: p.galleryFilter ? [p.galleryFilter] : [],
        },
        localesJson: rec.localesJson ? [rec.localesJson] : [],
        notesEncrypted: [],
        imported: Boolean(rec.imported),
        accessCode: String(rec.accessCode ?? ''),
    };
}

/**
 * Shape stored in test-mode `artistsOverlay` (matches testData artist + optional `locales`).
 * @param {{ profile: object, localesJson: string | null, imported?: boolean, accessCode?: string }} rec
 */
export function artistRecordToTestOverlayShape(rec) {
    const p = rec.profile;
    const out = {
        id: p.id,
        slug: p.slug,
        image: p.image,
        heroProfileImage: String(
            /** @type {Record<string, unknown>} */ (p).heroProfileImage ?? p.hero_profile_image ?? ''
        ),
        quote: String(p.quote ?? ''),
        audioUrl: String(p.audioUrl ?? ''),
        audioTitle: String(p.audioTitle ?? ''),
        featuredOrder: p.featuredOrder,
        visibility: p.visibility,
        updatedAt: p.updatedAt,
        contactEmail: String(p.contactEmail ?? ''),
        filter: p.filter,
        galleryFilter: p.galleryFilter,
        imported: Boolean(rec.imported),
        accessCode: String(rec.accessCode ?? ''),
    };
    if (rec.localesJson) {
        try {
            out.locales = JSON.parse(rec.localesJson);
        } catch {
            /* ignore */
        }
    }
    return out;
}
