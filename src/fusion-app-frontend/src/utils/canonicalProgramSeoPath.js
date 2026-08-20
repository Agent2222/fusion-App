/**
 * Public SEO canonical for a program detail URL (`/program/{slug}`).
 * Maps `/programs/{slug}` → `/program/{slug}`. Private URLs keep `/program/private/{slug}`.
 * @param {string} pathname
 * @returns {string} empty when not a program detail path
 */
export function canonicalProgramSeoPath(pathname) {
    const raw = String(pathname || '')
        .split('?')[0]
        .split('#')[0];
    if (raw.startsWith('/program/private/')) {
        const slug = raw.slice('/program/private/'.length).split('/').filter(Boolean)[0];
        return slug ? `/program/private/${decodeURIComponent(slug)}` : '';
    }
    if (raw.startsWith('/programs/private/')) {
        const slug = raw.slice('/programs/private/'.length).split('/').filter(Boolean)[0];
        return slug ? `/program/private/${decodeURIComponent(slug)}` : '';
    }
    let canonical = raw;
    if (canonical.startsWith('/programs/')) {
        canonical = `/program/${canonical.slice('/programs/'.length)}`;
    }
    if (!canonical.startsWith('/program/')) return '';
    const slug = canonical.slice('/program/'.length).split('/').filter(Boolean)[0];
    return slug ? `/program/${decodeURIComponent(slug)}` : '';
}
