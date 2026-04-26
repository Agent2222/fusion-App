/**
 * Public page: register as staff or collaborator with a single-use join code (after Internet Identity).
 */
import { ERROR_USER_INTERRUPT } from '@dfinity/auth-client';
import posthog from 'posthog-js';
import { getAuthSnapshot, loginInternetIdentity, dispatchFusionAuthChange } from '../utils/icAuth.js';
import { clearAuthenticatedFusionBackendActorCache } from '../utils/earlyAccessSubscribe.js';
import { registerWithJoinAccessCodeForCaller } from '../utils/database.js';
import { applyDocumentSeo } from '../utils/documentSeo.js';
import { metaTrack } from '../utils/metaPixel.js';
import { navigate } from '../router.js';

/** @type {((e: Event) => void) | null} */
let _joinFusionAuthHandler = null;

/**
 * @returns {string} HTML for `#mainContent`
 */
export function generateJoinFusionContent() {
    return `
        <div class="join-fusion-page" id="joinFusionRoot">
            <h1 class="join-fusion-page__title">Join the Fusion Team Studio</h1>
            <p class="join-fusion-page__intro">Sign in with Internet Identity, then complete the form below.</p>
            <p id="joinFusionAuth" class="join-fusion-page__status" role="status">Checking session…</p>
            <form id="joinFusionForm" class="join-fusion-form" hidden>
                <div class="form-group">
                    <label for="joinFusionFirst">First name</label>
                    <input type="text" id="joinFusionFirst" name="firstName" autocomplete="given-name" required maxlength="256" />
                </div>
                <div class="form-group">
                    <label for="joinFusionLast">Last name</label>
                    <input type="text" id="joinFusionLast" name="lastName" autocomplete="family-name" required maxlength="256" />
                </div>
                <div class="form-group">
                    <label for="joinFusionEmail">Email</label>
                    <input type="email" id="joinFusionEmail" name="email" autocomplete="email" required maxlength="256" />
                </div>
                <div class="form-group">
                    <label for="joinFusionRole">Role (must match the invite)</label>
                    <select id="joinFusionRole" name="role" required>
                        <option value="staff" selected>Staff</option>
                        <option value="collaborator">Collaborator</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="joinFusionCode">8-digit access code</label>
                    <input type="text" id="joinFusionCode" name="code" inputmode="numeric" pattern="[0-9]{8}" minlength="8" maxlength="8" required />
                </div>
                <p id="joinFusionErr" class="join-fusion-page__err" role="alert" hidden></p>
                <div class="join-fusion-form__actions">
                    <button type="submit" class="join-fusion-btn--primary join-fusion-form__submit" id="joinFusionSubmit">Register</button>
                </div>
            </form>
            <p class="join-fusion-page__hint" id="joinFusionHint" aria-live="polite"></p>
        </div>
    `;
}

function userRoleFromSelect(val) {
    return val === 'collaborator' ? { collaborator: null } : { staff: null };
}

/**
 * @param {HTMLElement} root
 */
async function syncAuthState(root) {
    const el = root.querySelector('#joinFusionAuth');
    const form = root.querySelector('#joinFusionForm');
    const hint = root.querySelector('#joinFusionHint');
    const snap = await getAuthSnapshot();
    if (snap.authenticated) {
        if (el) {
            el.textContent = `Signed in. Principal: ${snap.principal.toText()}`;
        }
        if (form) {
            form.hidden = false;
        }
        if (hint) {
            hint.textContent =
                'Submitting registers your on-chain team account. You can then open Studio from the site header (permissions apply).';
        }
    } else {
        if (el) {
            el.innerHTML = `Not signed in. <button type="button" class="join-fusion-btn--primary" id="joinFusionIIBtn">Sign in with Internet Identity</button>`;
        }
        if (form) {
            form.hidden = true;
        }
        if (hint) {
            hint.textContent = '';
        }
    }
}

/**
 * @param {string} path
 */
function applyJoinFusionSeo(path) {
    applyDocumentSeo({
        title: 'Join Fusion team',
        description: 'Onboard to Fusion as staff or collaborator with an invite code.',
        path,
        robots: 'noindex, nofollow',
        homeOrganizationJsonLd: false,
    });
}

export default function initJoinFusion() {
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    if (path === '/join-fusion' || path.endsWith('/join-fusion')) {
        applyJoinFusionSeo(path);
    }
    const root = document.getElementById('joinFusionRoot') || document.getElementById('mainContent');
    if (!root) {
        return;
    }
    if (_joinFusionAuthHandler) {
        window.removeEventListener('fusion-auth-change', _joinFusionAuthHandler);
    }
    _joinFusionAuthHandler = () => {
        void syncAuthState(root);
    };
    window.addEventListener('fusion-auth-change', _joinFusionAuthHandler);
    void syncAuthState(root);

    root.addEventListener(
        'click',
        (e) => {
            const t = e.target;
            if (t && /** @type {Element} */ (t).id === 'joinFusionIIBtn') {
                e.preventDefault();
                void (async () => {
                    try {
                        await loginInternetIdentity();
                    } catch (err) {
                        if (err === ERROR_USER_INTERRUPT) {
                            return;
                        }
                    }
                })();
            }
        },
        { capture: true }
    );

    const form = root.querySelector('#joinFusionForm');
    if (form instanceof HTMLFormElement) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const first = String(root.querySelector('#joinFusionFirst')?.value || '').trim();
            const last = String(root.querySelector('#joinFusionLast')?.value || '').trim();
            const email = String(root.querySelector('#joinFusionEmail')?.value || '').trim();
            const codeRaw = String(root.querySelector('#joinFusionCode')?.value || '');
            const roleVal =
                root.querySelector('#joinFusionRole') instanceof HTMLSelectElement
                    ? /** @type {HTMLSelectElement} */ (root.querySelector('#joinFusionRole')).value
                    : 'staff';
            const err = root.querySelector('#joinFusionErr');
            if (err) {
                err.textContent = '';
                err.hidden = true;
            }
            void (async () => {
                const snap = await getAuthSnapshot();
                if (!snap.authenticated) {
                    if (err) {
                        err.textContent = 'Sign in with Internet Identity first.';
                        err.hidden = false;
                    }
                    return;
                }
                const sub = root.querySelector('#joinFusionSubmit');
                if (sub instanceof HTMLButtonElement) {
                    sub.disabled = true;
                }
                try {
                    const outcome = await registerWithJoinAccessCodeForCaller(
                        userRoleFromSelect(roleVal),
                        codeRaw,
                        first,
                        last,
                        email
                    );
                    if (outcome !== 'ok') {
                        const map = {
                            invalidCode: 'The code is not valid. Use the 8 digits you received.',
                            wrongRole: 'The code is for a different role. Check Staff vs Collaborator.',
                            artistAlreadyLinked: 'This code was for a different flow.',
                            accountExists: 'This Internet Identity already has a Fusion account.',
                            inviteInactive: 'This code was already used or is inactive.',
                            unknown: 'Registration could not be completed. Try again.',
                        };
                        if (err) {
                            err.textContent = map[outcome] || map.unknown;
                            err.hidden = false;
                        }
                    } else {
                        clearAuthenticatedFusionBackendActorCache();
                        await dispatchFusionAuthChange();
                        posthog.capture('join_fusion_registration_succeeded', {
                            role: roleVal,
                            ads_conversion: 'CompleteRegistration',
                        });
                        metaTrack('CompleteRegistration', { content_name: 'join_fusion' });
                        if (form) {
                            form.reset();
                        }
                        navigate('/studio');
                    }
                } catch (ex) {
                    if (err) {
                        err.textContent = ex instanceof Error ? ex.message : String(ex);
                        err.hidden = false;
                    }
                } finally {
                    if (sub instanceof HTMLButtonElement) {
                        sub.disabled = false;
                    }
                }
            })();
        });
    }

}
