const PROFILE_SETUP_DRAFT_KEY = 'fusion-profile-setup-draft';

/**
 * @param {{ fullName?: string, email?: string }} draft
 */
export function saveProfileSetupDraft(draft) {
    const fullName = String(draft?.fullName ?? '').trim();
    const email = String(draft?.email ?? '').trim();
    if (!fullName && !email) return;
    try {
        sessionStorage.setItem(
            PROFILE_SETUP_DRAFT_KEY,
            JSON.stringify({
                fullName,
                email,
            })
        );
    } catch {
        /* ignore */
    }
}

/**
 * @returns {{ fullName: string, email: string }}
 */
export function getProfileSetupDraft() {
    try {
        const raw = sessionStorage.getItem(PROFILE_SETUP_DRAFT_KEY);
        if (!raw) return { fullName: '', email: '' };
        const j = JSON.parse(raw);
        return {
            fullName: String(j?.fullName ?? '').trim(),
            email: String(j?.email ?? '').trim(),
        };
    } catch {
        return { fullName: '', email: '' };
    }
}

export function clearProfileSetupDraft() {
    try {
        sessionStorage.removeItem(PROFILE_SETUP_DRAFT_KEY);
    } catch {
        /* ignore */
    }
}
