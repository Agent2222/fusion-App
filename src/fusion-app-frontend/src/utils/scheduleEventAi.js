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
        'Description should be 1–3 member-facing sentences (no staff-only notes).',
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
