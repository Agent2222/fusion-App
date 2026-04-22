const PROFILE_SETUP_DRAFT_KEY = 'fusion-profile-setup-draft';

/**
 * @param {{ firstName?: string, lastName?: string, fullName?: string, email?: string }} draft
 */
export function saveProfileSetupDraft(draft) {
    const firstName = String(draft?.firstName ?? '').trim();
    const lastName = String(draft?.lastName ?? '').trim();
    let fullName = String(draft?.fullName ?? '').trim();
    if (!fullName && (firstName || lastName)) {
        fullName = `${firstName} ${lastName}`.trim();
    }
    const email = String(draft?.email ?? '').trim();
    if (!fullName && !email) return;
    try {
        sessionStorage.setItem(
            PROFILE_SETUP_DRAFT_KEY,
            JSON.stringify({
                firstName,
                lastName,
                fullName,
                email,
            })
        );
    } catch {
        /* ignore */
    }
}

/**
 * @returns {{ firstName: string, lastName: string, fullName: string, email: string }}
 */
export function getProfileSetupDraft() {
    try {
        const raw = sessionStorage.getItem(PROFILE_SETUP_DRAFT_KEY);
        if (!raw) return { firstName: '', lastName: '', fullName: '', email: '' };
        const j = JSON.parse(raw);
        const firstName = String(j?.firstName ?? '').trim();
        const lastName = String(j?.lastName ?? '').trim();
        let fullName = String(j?.fullName ?? '').trim();
        if (!fullName && (firstName || lastName)) {
            fullName = `${firstName} ${lastName}`.trim();
        }
        return {
            firstName,
            lastName,
            fullName,
            email: String(j?.email ?? '').trim(),
        };
    } catch {
        return { firstName: '', lastName: '', fullName: '', email: '' };
    }
}

export function clearProfileSetupDraft() {
    try {
        sessionStorage.removeItem(PROFILE_SETUP_DRAFT_KEY);
    } catch {
        /* ignore */
    }
}
