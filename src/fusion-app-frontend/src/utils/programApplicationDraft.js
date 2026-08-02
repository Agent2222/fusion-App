/**
 * Browser draft for the program application form (localStorage).
 * Keyed by program id so concurrent applications do not overwrite each other.
 */

const STORAGE_PREFIX = 'fusion-program-application-draft:';

/** @typedef {'one_time' | 'monthly' | 'quarterly' | 'annual' | 'member_fee' | 'bimonthly'} ApplicationPaymentPlan */

/**
 * @typedef {object} ProgramApplicationDraft
 * @property {string} [firstName]
 * @property {string} [lastName]
 * @property {string} [email]
 * @property {string} [country]
 * @property {string} [stateProvince]
 * @property {string} [city]
 * @property {string} [website]
 * @property {string} [discipline]
 * @property {string} [bioStatement]
 * @property {string} [exploration]
 * @property {string} [residencyGoals]
 * @property {ApplicationPaymentPlan | null} [paymentPlan]
 * @property {number} [updatedAt]
 */

/**
 * @param {string} programId
 * @returns {string}
 */
export function programApplicationDraftKey(programId) {
    return `${STORAGE_PREFIX}${String(programId || '').trim()}`;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function asText(value) {
    return String(value ?? '').trim();
}

/**
 * @param {unknown} plan
 * @returns {ApplicationPaymentPlan | null}
 */
function asPaymentPlan(plan) {
    if (
        plan === 'one_time' ||
        plan === 'monthly' ||
        plan === 'quarterly' ||
        plan === 'annual' ||
        plan === 'member_fee'
    ) {
        return plan;
    }
    if (plan === 'bimonthly') return 'monthly';
    return null;
}

/**
 * @param {ProgramApplicationDraft | null | undefined} draft
 * @returns {boolean}
 */
function draftHasContent(draft) {
    if (!draft || typeof draft !== 'object') return false;
    if (asPaymentPlan(draft.paymentPlan)) return true;
    return [
        draft.firstName,
        draft.lastName,
        draft.email,
        draft.country,
        draft.stateProvince,
        draft.city,
        draft.website,
        draft.discipline,
        draft.bioStatement,
        draft.exploration,
        draft.residencyGoals,
    ].some((v) => asText(v).length > 0);
}

/**
 * @param {string} programId
 * @param {ProgramApplicationDraft} draft
 */
export function saveProgramApplicationDraft(programId, draft) {
    const id = String(programId || '').trim();
    if (!id || typeof localStorage === 'undefined') return;
    const next = {
        firstName: asText(draft?.firstName),
        lastName: asText(draft?.lastName),
        email: asText(draft?.email),
        country: asText(draft?.country),
        stateProvince: asText(draft?.stateProvince),
        city: asText(draft?.city),
        website: asText(draft?.website),
        discipline: asText(draft?.discipline),
        bioStatement: asText(draft?.bioStatement),
        exploration: asText(draft?.exploration),
        residencyGoals: asText(draft?.residencyGoals),
        paymentPlan: asPaymentPlan(draft?.paymentPlan),
        updatedAt: Date.now(),
    };
    try {
        if (!draftHasContent(next)) {
            localStorage.removeItem(programApplicationDraftKey(id));
            return;
        }
        localStorage.setItem(programApplicationDraftKey(id), JSON.stringify(next));
    } catch {
        /* ignore quota / private mode */
    }
}

/**
 * @param {string} programId
 * @returns {ProgramApplicationDraft | null}
 */
export function getProgramApplicationDraft(programId) {
    const id = String(programId || '').trim();
    if (!id || typeof localStorage === 'undefined') return null;
    try {
        const raw = localStorage.getItem(programApplicationDraftKey(id));
        if (!raw) return null;
        const j = JSON.parse(raw);
        if (!j || typeof j !== 'object') return null;
        /** @type {ProgramApplicationDraft} */
        const draft = {
            firstName: asText(j.firstName),
            lastName: asText(j.lastName),
            email: asText(j.email),
            country: asText(j.country),
            stateProvince: asText(j.stateProvince),
            city: asText(j.city),
            website: asText(j.website),
            discipline: asText(j.discipline),
            bioStatement: asText(j.bioStatement),
            exploration: asText(j.exploration),
            residencyGoals: asText(j.residencyGoals),
            paymentPlan: asPaymentPlan(j.paymentPlan),
            updatedAt: typeof j.updatedAt === 'number' ? j.updatedAt : 0,
        };
        return draftHasContent(draft) ? draft : null;
    } catch {
        return null;
    }
}

/**
 * @param {string} programId
 */
export function clearProgramApplicationDraft(programId) {
    const id = String(programId || '').trim();
    if (!id || typeof localStorage === 'undefined') return;
    try {
        localStorage.removeItem(programApplicationDraftKey(id));
    } catch {
        /* ignore */
    }
}
