/**
 * Frontend joins: Radar leads ↔ main-backend artists / applicants / subscribers.
 * No inter-canister coupling — Studio loads both sides and matches locally.
 */
import { getApplicants, getArtists, getSubscribers } from './database.js';
import { listRadarLeads, upsertRadarRelationship, listRadarRelationships } from './radarApi.js';
import { emptyLead } from './radarModel.js';

/**
 * @param {string} email
 */
function normEmail(email) {
    return String(email || '')
        .trim()
        .toLowerCase();
}

/**
 * @returns {Promise<{
 *   matches: Array<{
 *     leadId: string,
 *     leadName: string,
 *     kind: string,
 *     foreignId: string,
 *     foreignLabel: string,
 *     matchKey: string,
 *   }>,
 * }>}
 */
export async function computeRadarEntityBridges() {
    const [leads, artists, applicants, subscribers] = await Promise.all([
        listRadarLeads(),
        getArtists().catch(() => []),
        getApplicants().catch(() => []),
        getSubscribers().catch(() => []),
    ]);

    /** @type {Map<string, { id: string, name: string, slug: string }>} */
    const artistsByEmail = new Map();
    /** @type {Map<string, { id: string, name: string, slug: string }>} */
    const artistsBySlug = new Map();
    for (const a of Array.isArray(artists) ? artists : []) {
        const id = String(a.id || a.artistId || '');
        const name = String(a.name || a.locales?.en?.name || a.slug || id);
        const slug = String(a.slug || '').toLowerCase();
        const email = normEmail(a.contactEmail || a.email);
        const row = { id, name, slug };
        if (email) artistsByEmail.set(email, row);
        if (slug) artistsBySlug.set(slug, row);
    }

    /** @type {Map<string, { id: string, name: string, programId: string }>} */
    const appsByEmail = new Map();
    for (const ap of Array.isArray(applicants) ? applicants : []) {
        const email = normEmail(ap.email);
        if (!email) continue;
        appsByEmail.set(email, {
            id: String(ap.id || ''),
            name: String(ap.fullName || ap.email || ''),
            programId: String(ap.programId || ''),
        });
    }

    /** @type {Set<string>} */
    const subEmails = new Set();
    for (const s of Array.isArray(subscribers) ? subscribers : []) {
        const email = normEmail(s.email);
        if (email) subEmails.add(email);
    }

    /** @type {Array<{ leadId: string, leadName: string, kind: string, foreignId: string, foreignLabel: string, matchKey: string }>} */
    const matches = [];

    for (const lead of leads.map((l) => emptyLead(l))) {
        const email = normEmail(lead.publicEmail);
        if (email && artistsByEmail.has(email)) {
            const a = artistsByEmail.get(email);
            matches.push({
                leadId: lead.id,
                leadName: lead.name,
                kind: 'fusionMember',
                foreignId: a.id,
                foreignLabel: `Artist: ${a.name}`,
                matchKey: email,
            });
        }
        if (email && appsByEmail.has(email)) {
            const ap = appsByEmail.get(email);
            matches.push({
                leadId: lead.id,
                leadName: lead.name,
                kind: 'appliedTo',
                foreignId: ap.id,
                foreignLabel: `Applicant: ${ap.name} (${ap.programId})`,
                matchKey: email,
            });
        }
        if (email && subEmails.has(email)) {
            matches.push({
                leadId: lead.id,
                leadName: lead.name,
                kind: 'fusionMember',
                foreignId: email,
                foreignLabel: `Subscriber: ${email}`,
                matchKey: email,
            });
        }
    }

    return { matches };
}

/**
 * Persist computed bridges as RadarRelationship edges (foreign id in label/evidence).
 */
export async function syncRadarBridgeRelationships() {
    const { matches } = await computeRadarEntityBridges();
    const existing = await listRadarRelationships('');
    const existingKeys = new Set(
        existing.map((r) => `${r.fromLeadId}|${r.kind}|${r.label}|${r.evidence}`),
    );
    let created = 0;
    for (const m of matches) {
        const label = m.foreignLabel;
        const evidence = `foreign:${m.foreignId}`;
        const key = `${m.leadId}|${m.kind}|${label}|${evidence}`;
        if (existingKeys.has(key)) continue;
        await upsertRadarRelationship({
            id: '',
            fromLeadId: m.leadId,
            toLeadId: m.leadId,
            kind: m.kind,
            label,
            evidence,
            createdAt: '',
        });
        created += 1;
    }
    return { matchCount: matches.length, created };
}
