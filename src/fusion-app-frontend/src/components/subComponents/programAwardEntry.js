/**
 * Public Program Award entry panel on program pages.
 */

import {
    enterProgramAward,
    exitProgramAward,
    getAwardCreditsForCaller,
    getMembershipAccessForCaller,
    getMyProgramAwardEntry,
    getMyProgramPath,
    getProgramDrawConfigPublic,
} from '../../utils/database.js';
import { getAuthSnapshot } from '../../utils/icAuth.js';
import {
    confirmPayPalOneTimePayment,
    createPayPalOneTimePayment,
    fetchPaymentConfig,
    getIntegrationBaseUrl,
} from '../../utils/integrationApi.js';
import { mountPayPalAdvancedOneTimeCheckout } from '../../utils/paymentCheckout.js';
import { DRAW_ENTRY_FEE_CENTS } from '../../utils/applicantsDrawModel.js';

/**
 * @param {string} programId
 * @param {HTMLElement} host
 */
export async function mountProgramAwardEntryPanel(programId, host) {
    if (!(host instanceof HTMLElement)) return;
    const id = String(programId || '').trim();
    if (!id) {
        host.hidden = true;
        host.innerHTML = '';
        return;
    }

    let cfg = null;
    try {
        cfg = await getProgramDrawConfigPublic(id);
    } catch {
        cfg = null;
    }
    if (!cfg?.active) {
        host.hidden = true;
        host.innerHTML = '';
        return;
    }

    host.hidden = false;
    const totalSlots = Math.max(1, Number(cfg.totalSlots) || 100);

    const render = async () => {
        const snap = await getAuthSnapshot();
        const authenticated = Boolean(snap?.authenticated);
        let path = '';
        let entry = null;
        let awardBal = 0;
        let membershipGate = 'noAccount';
        if (authenticated) {
            try {
                membershipGate = await getMembershipAccessForCaller();
            } catch {
                membershipGate = 'unknown';
            }
            try {
                path = await getMyProgramPath(id);
                entry = await getMyProgramAwardEntry(id);
                const credits = await getAwardCreditsForCaller();
                awardBal = Number(credits?.balance) || 0;
            } catch {
                /* ignore */
            }
        }

        const entered = entry && String(entry.status) === 'entered';
        const onApplicationPath = path === 'application';
        let statusHtml = '';
        let actionsHtml = '';

        if (!authenticated) {
            statusHtml = `<p class="program-award-entry__status">Sign in with an active membership to enter the Program Award.</p>`;
        } else if (membershipGate !== 'ok' && membershipGate !== 'exempt') {
            statusHtml = `<p class="program-award-entry__status">An active Fusion membership is required for Program Award entry.</p>`;
        } else if (onApplicationPath) {
            statusHtml = `<p class="program-award-entry__status">You already have a formal application for this program. Leave that path before entering the Program Award.</p>`;
        } else if (entered) {
            statusHtml = `<p class="program-award-entry__status">You are entered in this Program Award cycle.</p>`;
            actionsHtml = `<button type="button" class="program-award-entry__btn program-award-entry__btn--secondary" data-award-exit>Exit Program Award</button>
        <p class="program-award-entry__hint">Exiting does not refund a consumed award entry. You can then submit a formal application.</p>`;
        } else if (awardBal >= 1) {
            statusHtml = `<p class="program-award-entry__status">You have ${awardBal} Program Award entr${awardBal === 1 ? 'y' : 'ies'} available.</p>`;
            actionsHtml = `<button type="button" class="program-award-entry__btn" data-award-enter-credit>Use 1 Program Award entry</button>`;
        } else {
            statusHtml = `<p class="program-award-entry__status">No Program Award entries left. Purchase a $${Math.round(DRAW_ENTRY_FEE_CENTS / 100)} entry for this cycle.</p>`;
            actionsHtml = `<div id="program-award-pay-host" class="program-award-entry__pay"></div>`;
        }

        host.innerHTML = `
      <section class="program-award-entry" aria-labelledby="program-award-entry-heading">
        <p class="program-award-entry__eyebrow">FUSION Program Award</p>
        <h2 id="program-award-entry-heading" class="program-award-entry__heading">Enter this cycle</h2>
        <p class="program-award-entry__lede">
          Up to ${totalSlots} entries this cycle. Selection combines eligibility, application quality, and readiness —
          a juried Program Award, not a raffle. Award entry is separate from a formal program application.
        </p>
        ${statusHtml}
        <div class="program-award-entry__actions">${actionsHtml}</div>
        <p class="program-award-entry__msg" data-award-msg role="status"></p>
      </section>
    `;

        const msgEl = host.querySelector('[data-award-msg]');
        const setMsg = (t) => {
            if (msgEl) msgEl.textContent = t || '';
        };

        host.querySelector('[data-award-enter-credit]')?.addEventListener('click', async () => {
            setMsg('Entering…');
            try {
                await enterProgramAward(id, { paidEntryReceipt: false });
                setMsg('Entered.');
                await render();
            } catch (e) {
                setMsg(e instanceof Error ? e.message : String(e));
            }
        });

        host.querySelector('[data-award-exit]')?.addEventListener('click', async () => {
            setMsg('Exiting…');
            try {
                await exitProgramAward(id);
                setMsg('Exited Program Award for this program.');
                await render();
            } catch (e) {
                setMsg(e instanceof Error ? e.message : String(e));
            }
        });

        const payHost = host.querySelector('#program-award-pay-host');
        if (payHost instanceof HTMLElement && getIntegrationBaseUrl()) {
            try {
                const payConfig = await fetchPaymentConfig();
                const clientId = String(payConfig?.paypalClientId || payConfig?.clientId || '').trim();
                if (!clientId) {
                    setMsg('PayPal is not configured for award entry checkout.');
                    return;
                }
                await mountPayPalAdvancedOneTimeCheckout(payHost, {
                    clientId,
                    mode: payConfig.mode === 'live' ? 'live' : 'sandbox',
                    amountCents: DRAW_ENTRY_FEE_CENTS,
                    metadata: {
                        programId: id,
                        purpose: 'program_award_entry',
                    },
                    showPayNowButton: true,
                    createOrder: async (body) =>
                        createPayPalOneTimePayment({
                            amountCents: body.amountCents,
                            metadata: body.metadata,
                        }),
                    onApproved: async (orderId) => {
                        await confirmPayPalOneTimePayment(orderId);
                        await enterProgramAward(id, { paidEntryReceipt: true });
                        setMsg('Payment complete — you are entered.');
                        await render();
                    },
                    onError: (err) => {
                        setMsg(err instanceof Error ? err.message : 'PayPal checkout failed.');
                    },
                });
            } catch (e) {
                setMsg(
                    e instanceof Error
                        ? e.message
                        : 'Checkout unavailable. Use an included award entry or try again later.',
                );
            }
        }
    };

    await render();
}
