/**
 * Studio Schedule event — AI refine prompt/parse + assignment select-all helpers.
 */

import { initialsFromName } from './scheduleModel.js';

/**
 * @param {object} [draft]
 */
export function scheduleEventRefineHasContext(draft) {
    return Boolean(
        String(draft?.title || '').trim() ||
            String(draft?.notes || '').trim() ||
            String(draft?.programName || '').trim() ||
            String(draft?.date || '').trim() ||
            String(draft?.locationName || '').trim(),
    );
}

/**
 * @param {object} [draft]
 */
export function buildScheduleEventRefineSource(draft) {
    const title = String(draft?.title || '').trim();
    const description = String(draft?.notes || '').trim();
    if (title || description) {
        return [`Title: ${title || '(empty)'}`, `Description: ${description || '(empty)'}`].join('\n');
    }
    return 'Compose a Fusion program event title and description from the context in the prompt.';
}

/**
 * @param {object} [draft]
 */
export function buildScheduleEventRefinePrompt(draft) {
    const program = String(draft?.programName || '').trim() || '(not set)';
    const date = String(draft?.date || '').trim() || '(not set)';
    const location = String(draft?.locationName || '').trim() || '(not set)';
    return [
        'Refine or compose Fusion Studio schedule event copy for staff and confirmed artists.',
        `Program: ${program}.`,
        `Date: ${date}.`,
        `Location: ${location}.`,
        'Keep factual meaning. Title should be short and specific.',
        'The program name is context only — never put it in the title. Title the activity itself (for example “Studio visit”, not “Fusion Kaga — Studio visit”).',
        'Do not repeat season, year, or residency branding in the title.',
        'Description should be 1–3 member-facing sentences (no staff-only notes).',
        'Do not start the description with “Join us”, “Come join us”, “You’re invited”, or similar invitation openers. Start with what happens.',
        'Write as if artists already belong here — no marketing slogans.',
        'If a field is empty, write a fitting one from the other field and program context.',
        'Reply with JSON only, no markdown fences, exactly this shape:',
        '{"title":"...","description":"..."}',
    ].join(' ');
}

/**
 * @param {string} raw
 * @returns {{ title: string, description: string } | null}
 */
export function parseScheduleEventRefineJson(raw) {
    const text = String(raw || '').trim();
    if (!text) return null;
    const candidates = [text];
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) candidates.unshift(fenced[1].trim());
    const braced = text.match(/\{[\s\S]*\}/);
    if (braced?.[0]) candidates.unshift(braced[0]);
    for (const chunk of candidates) {
        try {
            const parsed = JSON.parse(chunk);
            if (!parsed || typeof parsed !== 'object') continue;
            const title = String(parsed.title ?? '').trim();
            const description = String(parsed.description ?? parsed.notes ?? '').trim();
            if (!title && !description) continue;
            return { title, description };
        } catch {
            /* try next */
        }
    }
    return null;
}

/**
 * @param {string} s
 */
function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Longer program-name chunks to strip from a title (avoid short place names like “Kaga”).
 * @param {string} programName
 */
export function programNameTitleVariants(programName) {
    const program = String(programName || '').trim();
    if (program.length < 4) return [];
    const variants = [program];
    for (const part of program.split(/\s*[-–—|:]\s*/)) {
        const p = String(part || '').trim();
        if (p.length >= 8) variants.push(p);
    }
    const fusionBrand = program.match(/^Fusion\s+[A-Za-z]{3,}/i);
    if (fusionBrand?.[0] && fusionBrand[0].length >= 8) variants.push(fusionBrand[0].trim());
    return [...new Set(variants)].sort((a, b) => b.length - a.length);
}

/**
 * Event titles should name the activity, not the program.
 * @param {string} title
 * @param {string} [programName]
 */
export function stripProgramNameFromEventTitle(title, programName) {
    let out = String(title || '').trim();
    const variants = programNameTitleVariants(programName);
    if (!out || !variants.length) return out;
    for (const v of variants) {
        out = out.replace(new RegExp(escapeRegExp(v), 'gi'), ' ');
    }
    out = out
        .replace(/^[(\[{'"\s]*[-–—|:]+/g, '')
        .replace(/[-–—|:]+[)\]}'"\s]*$/g, '')
        .replace(/\(\s*\)/g, '')
        .replace(/\s*[-–—|:]\s*/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
    return out;
}

/**
 * Drop formulaic invitation openers the model leans on.
 * @param {string} description
 */
export function stripJoinUsOpener(description) {
    let out = String(description || '').trim();
    if (!out) return out;
    const prior = out;
    out = out.replace(
        /^(please\s+)?(come\s+)?join us(?:\s+(?:for|as we|to|in|at|on))?\s+/i,
        '',
    );
    out = out.replace(/^(you(?:['’])re invited(?:\s+to)?|we invite you to)\s+/i, '');
    out = out.replace(/^[,;:\-–—]\s*/, '').trim();
    if (!out) return prior;
    return out.charAt(0).toUpperCase() + out.slice(1);
}

/**
 * @param {{ title?: string, description?: string } | null} parsed
 * @param {{ programName?: string }} [draft]
 */
export function applyScheduleEventRefineSuggestion(parsed, draft) {
    if (!parsed || typeof parsed !== 'object') return null;
    const programName = String(draft?.programName || '').trim();
    return {
        title: stripProgramNameFromEventTitle(parsed.title, programName),
        description: stripJoinUsOpener(parsed.description),
    };
}

/**
 * Full staff roster as assignment records (not search-filtered).
 * @param {Array<{ id?: string, name?: string, initials?: string }>} roster
 */
export function assignAllScheduleStaff(roster) {
    return (Array.isArray(roster) ? roster : [])
        .map((person) => {
            const id = String(person?.id || '').trim();
            const name = String(person?.name || '').trim();
            if (!id) return null;
            return {
                id,
                name: name || id,
                initials: String(person?.initials || '').trim() || initialsFromName(name || id),
            };
        })
        .filter(Boolean);
}

/**
 * Full artist roster ids (not search-filtered).
 * @param {Array<{ id?: string }>} roster
 */
export function assignAllScheduleParticipantIds(roster) {
    const seen = new Set();
    const out = [];
    for (const row of Array.isArray(roster) ? roster : []) {
        const id = String(row?.id || '').trim();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push(id);
    }
    return out;
}
