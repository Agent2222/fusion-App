/**
 * Studio Travel — flight bookings, per-program prep links, confirmed-applicant table.
 */
import '../../styles/studioTravel.css';
import { studioFeatureAccess } from '../../utils/studioShellState.js';
import { studioPageHeaderHtml, studioFilterBarHtml } from '../../utils/studioCategoryLayout.js';
import { escapeHtml } from '../../utils/textPreview.js';
import {
    getApplicants,
    getPrograms,
    staffListFlightBookingsForProgram,
    staffUpsertApplicantFlightBooking,
    staffUpsertTravelPrepLinks,
    staffDeleteTravelPrepLink,
    staffListTravelPrepImages,
    listTravelPrepLinks,
} from '../../utils/database.js';
import { getApplicantSlotSecuredStudio } from '../../utils/database.js';
import { getApplicantManualDepositSubmitted } from '../../utils/studioPlainForms.js';
import { uploadBlobToS3 } from '../../utils/studioS3Upload.js';
import { prepareImageFileForUpload } from '../../utils/imageUploadPrep.js';
import { collectTravelPrepImageOptions } from '../../utils/travelPrepImages.js';
import { openTravelPrepImagePicker } from './travelPrepImagePicker.js';
import {
    buildTravelProgramCardModel,
    travelProgramCardsRailHtml,
    TRAVEL_PROGRAM_SELECT_STORAGE_KEY,
} from './travelProgramCards.js';
import { sortApplicantProgramRows } from './applicantsProgramCards.js';

export function renderTravel() {
    return `
    <div class="studio-section-stack studio-category-page studio-travel-page">
        ${studioPageHeaderHtml({ title: 'Travel', subtitle: 'Flight bookings, arrival details, and travel prep for confirmed applicants.', countId: 'studio-travel-header-count', countLabel: 'Flights booked' })}
        <div class="studio-travel-program-cards-rail" id="studio-travel-program-cards" role="list" aria-label="Program travel cards"></div>
        <div id="studio-travel-prep-links-host"></div>
        ${studioFilterBarHtml({ searchId: 'studio-travel-search', searchPlaceholder: 'Search by name or email…' })}
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Airline</th>
                    <th>Confirmation #</th>
                    <th>View Flight</th>
                    <th>Est. Arrival</th>
                    <th>Edit</th>
                </tr>
            </thead>
            <tbody id="studio-travel-tbody"></tbody>
        </table>
        <p class="studio-muted" id="studio-travel-empty-msg" hidden>Select a program above to view confirmed applicants.</p>
    </div>`;
}

export async function initTravel(mainEl) {
    const perm = studioFeatureAccess('travel');
    if (!perm || !perm.visible) {
        const el = mainEl.querySelector('.studio-travel-page');
        if (el) el.innerHTML = '<p class="studio-muted" style="padding:1.5rem">Travel section is not available for your role.</p>';
        return;
    }
    const canEdit = Boolean(perm.canEdit);

    let allPrograms = [];
    let allApplicants = [];
    /** @type {Map<string, object[]>} */
    let bookingsByProgram = new Map();
    let selectedProgramId = restoreSelectedProgramId();
    /** @type {object[]} */
    let prepLinks = [];
    let searchTerm = '';

    const cardsRail = mainEl.querySelector('#studio-travel-program-cards');
    const prepLinksHost = mainEl.querySelector('#studio-travel-prep-links-host');
    const tbody = mainEl.querySelector('#studio-travel-tbody');
    const countEl = mainEl.querySelector('#studio-travel-header-count');
    const emptyMsg = mainEl.querySelector('#studio-travel-empty-msg');
    const searchInput = mainEl.querySelector('#studio-travel-search');

    async function reload() {
        const [applicants, programs] = await Promise.all([
            getApplicants().catch(() => []),
            getPrograms().catch(() => []),
        ]);
        allPrograms = Array.isArray(programs) ? programs : [];
        const rawApplicants = Array.isArray(applicants) ? applicants : [];

        allApplicants = await Promise.all(
            rawApplicants.map(async (row) => ({
                ...row,
                slotSecured:
                    (await getApplicantSlotSecuredStudio(row.id, row.programId, row.payloadJson).catch(() => false)) ||
                    getApplicantManualDepositSubmitted(row.payloadJson),
            })),
        );

        bookingsByProgram = new Map();
        const programIds = [...new Set(allPrograms.map((p) => String(p.id || '')))];
        await Promise.all(
            programIds.map(async (pid) => {
                const bookings = await staffListFlightBookingsForProgram(pid).catch(() => []);
                bookingsByProgram.set(pid, bookings);
            }),
        );

        paintProgramCards();
        await loadPrepLinks();
        renderPage();
    }

    function confirmedForProgram(programId) {
        return allApplicants.filter((r) => {
            if (String(r.programId || '') !== programId) return false;
            const status = String(r.status || '');
            return r.slotSecured && status !== 'withdrawn' && status !== 'pulledOut';
        });
    }

    function paintProgramCards() {
        if (!cardsRail) return;
        const cardModels = allPrograms
            .sort(sortApplicantProgramRows)
            .map((pr) => {
                const pid = String(pr.id || '');
                return buildTravelProgramCardModel(pr, {
                    confirmedApplicants: confirmedForProgram(pid),
                    bookings: bookingsByProgram.get(pid) || [],
                });
            });
        cardsRail.innerHTML = travelProgramCardsRailHtml(cardModels, selectedProgramId);

        let totalBooked = 0;
        for (const m of cardModels) totalBooked += m.flightsBooked;
        if (countEl) countEl.textContent = String(totalBooked);
    }

    async function loadPrepLinks() {
        if (!selectedProgramId) {
            prepLinks = [];
            renderPrepLinksEditor();
            return;
        }
        prepLinks = await listTravelPrepLinks(selectedProgramId).catch(() => []);
        renderPrepLinksEditor();
    }

    function renderPrepLinksEditor() {
        if (!prepLinksHost) return;
        if (!selectedProgramId) {
            prepLinksHost.innerHTML = '';
            return;
        }
        if (!canEdit) {
            if (!prepLinks.length) { prepLinksHost.innerHTML = ''; return; }
            const cards = prepLinks.map((l) =>
                `<div class="studio-travel-prep-link-row studio-travel-prep-link-row--readonly">
                    ${prepLinkThumbHtml(l.imageUrl, l.title)}
                    <span>${escapeHtml(l.title)}</span>
                    <a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.url)}</a>
                    <span>${escapeHtml(l.description)}</span>
                </div>`).join('');
            prepLinksHost.innerHTML = `<div class="studio-travel-prep-links"><h4 class="studio-travel-prep-links__heading">Travel Prep Links</h4>${cards}</div>`;
            return;
        }
        const rows = prepLinks.map((l, i) =>
            `<div class="studio-travel-prep-link-row" data-prep-idx="${i}">
                <div class="studio-travel-prep-link-media">
                    ${prepLinkThumbHtml(l.imageUrl, l.title)}
                    <input type="hidden" data-prep-field="imageUrl" value="${escapeHtml(l.imageUrl || '')}" />
                    <input type="file" class="studio-sr-only" accept="image/*" data-prep-file="${i}" />
                    <div class="studio-travel-prep-link-media__actions">
                        <button type="button" class="studio-btn-ghost" data-prep-upload="${i}">Upload</button>
                        <button type="button" class="studio-btn-ghost" data-prep-pick="${i}">Choose image</button>
                        ${l.imageUrl ? `<button type="button" class="studio-btn-ghost" data-prep-clear-image="${i}">Remove</button>` : ''}
                    </div>
                </div>
                <input type="text" class="studio-input" placeholder="Title" value="${escapeHtml(l.title)}" data-prep-field="title" />
                <input type="url" class="studio-input" placeholder="URL" value="${escapeHtml(l.url)}" data-prep-field="url" />
                <input type="text" class="studio-input" placeholder="Description" value="${escapeHtml(l.description)}" data-prep-field="description" />
                <button type="button" class="studio-travel-edit-btn" data-prep-delete="${i}" title="Delete link">&times;</button>
            </div>`).join('');
        prepLinksHost.innerHTML = `
        <div class="studio-travel-prep-links">
            <h4 class="studio-travel-prep-links__heading">Travel Prep Links</h4>
            <p class="studio-muted studio-travel-prep-links__hint">Each link can have a photo. Upload a new image or choose one already used on travel prep links.</p>
            ${rows}
            <div class="studio-travel-prep-links__actions">
                <button type="button" class="studio-btn-secondary" id="studio-travel-add-prep-link">+ Add link</button>
                <button type="button" class="studio-btn-primary" id="studio-travel-save-prep-links">Save links</button>
            </div>
        </div>`;
    }

    function prepLinkThumbHtml(url, title) {
        const src = String(url || '').trim();
        if (!src) {
            return `<div class="studio-travel-prep-link-thumb studio-travel-prep-link-thumb--empty" aria-hidden="true"></div>`;
        }
        return `<img class="studio-travel-prep-link-thumb" src="${escapeHtml(src)}" alt="${escapeHtml(title || 'Travel prep')}" />`;
    }

    function readPrepLinksFromDom() {
        if (!prepLinksHost) return [];
        const rowEls = prepLinksHost.querySelectorAll('.studio-travel-prep-link-row');
        return Array.from(rowEls).map((el, i) => {
            const existing = prepLinks[i] || {};
            return {
                id: existing.id || `tpl-${Date.now()}-${i}`,
                programId: selectedProgramId || '',
                title: el.querySelector('[data-prep-field="title"]')?.value || '',
                url: el.querySelector('[data-prep-field="url"]')?.value || '',
                description: el.querySelector('[data-prep-field="description"]')?.value || '',
                imageUrl: el.querySelector('[data-prep-field="imageUrl"]')?.value || existing.imageUrl || '',
                sortOrder: i,
                updatedAt: new Date().toISOString(),
            };
        });
    }

    async function applyPrepLinkImage(idx, url) {
        prepLinks = readPrepLinksFromDom();
        if (!prepLinks[idx]) return;
        prepLinks[idx] = { ...prepLinks[idx], imageUrl: String(url || '').trim() };
        renderPrepLinksEditor();
    }

    async function uploadPrepLinkImage(idx, file) {
        if (!file || !selectedProgramId) return;
        const link = readPrepLinksFromDom()[idx] || prepLinks[idx] || {};
        const prepared = await prepareImageFileForUpload(file);
        const url = await uploadBlobToS3(prepared.file || file, null, {
            area: 'studio/programs',
            entityType: 'travel-prep',
            entityId: selectedProgramId,
            fieldKey: String(link.id || `link-${idx}`),
        });
        await applyPrepLinkImage(idx, url);
    }

    function renderPage() {
        if (!tbody) return;
        if (!selectedProgramId) {
            tbody.innerHTML = '';
            if (emptyMsg) { emptyMsg.hidden = false; emptyMsg.textContent = 'Select a program above to view confirmed applicants.'; }
            return;
        }
        if (emptyMsg) emptyMsg.hidden = true;

        const confirmed = confirmedForProgram(selectedProgramId);
        const bookings = bookingsByProgram.get(selectedProgramId) || [];
        const bookingMap = new Map(bookings.map((b) => [b.applicantId, b]));
        const term = searchTerm.toLowerCase();

        const filtered = confirmed.filter((r) => {
            if (!term) return true;
            const name = String(r.fullName || '').toLowerCase();
            const email = String(r.email || '').toLowerCase();
            return name.includes(term) || email.includes(term);
        });

        if (!filtered.length) {
            tbody.innerHTML = `<tr><td colspan="7" class="studio-travel-no-data">No confirmed applicants with flights for this program.</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map((r) => {
            const b = bookingMap.get(r.id);
            const airline = b?.airline || '';
            const confirmation = b?.confirmationNumber || '';
            const website = b?.airlineWebsite || '';
            const arrDate = b?.estArrivalDate || '';
            const arrTime = b?.estArrivalTime || '';
            const arrivalDisplay = arrDate ? `${arrDate}${arrTime ? ' ' + arrTime : ''}` : '—';
            const viewBtn = (airline || confirmation)
                ? `<button type="button" class="studio-travel-view-btn" data-travel-view-flight="${escapeHtml(r.id)}" data-airline-url="${escapeHtml(website)}" data-confirmation="${escapeHtml(confirmation)}">View Flight</button>`
                : '<span class="studio-travel-no-data">—</span>';
            const editBtn = canEdit
                ? `<button type="button" class="studio-travel-edit-btn" data-travel-edit="${escapeHtml(r.id)}">Edit</button>`
                : (airline ? '' : '<span class="studio-travel-no-data">—</span>');
            return `<tr class="studio-travel-row" data-applicant-id="${escapeHtml(r.id)}">
                <td>${escapeHtml(r.fullName || '')}</td>
                <td>${escapeHtml(r.email || '')}</td>
                <td>${airline ? escapeHtml(airline) : '<span class="studio-travel-no-data">—</span>'}</td>
                <td>${confirmation ? escapeHtml(confirmation) : '<span class="studio-travel-no-data">—</span>'}</td>
                <td>${viewBtn}</td>
                <td>${escapeHtml(arrivalDisplay)}</td>
                <td>${editBtn}</td>
            </tr>`;
        }).join('');
    }

    function openFlightModal(applicantId) {
        const r = allApplicants.find((a) => a.id === applicantId);
        if (!r) return;
        const bookings = bookingsByProgram.get(selectedProgramId) || [];
        const existing = bookings.find((b) => b.applicantId === applicantId) || {};

        const overlay = document.createElement('div');
        overlay.className = 'studio-travel-flight-modal';
        overlay.innerHTML = `
        <div class="studio-travel-flight-modal__panel">
            <h3>Flight Booking — ${escapeHtml(r.fullName || r.email)}</h3>
            <form id="studio-travel-flight-form">
                <label class="studio-field"><span>Airline name</span>
                    <input type="text" class="studio-input" id="studio-travel-modal-airline" value="${escapeHtml(existing.airline || '')}" />
                </label>
                <label class="studio-field"><span>Airline website</span>
                    <input type="url" class="studio-input" id="studio-travel-modal-airline-url" value="${escapeHtml(existing.airlineWebsite || '')}" placeholder="https://…" />
                </label>
                <label class="studio-field"><span>Confirmation number</span>
                    <input type="text" class="studio-input" id="studio-travel-modal-confirmation" value="${escapeHtml(existing.confirmationNumber || '')}" />
                </label>
                <label class="studio-field"><span>Flight cost (USD)</span>
                    <input type="text" class="studio-input" id="studio-travel-modal-cost" value="${existing.flightCostCents ? (existing.flightCostCents / 100).toFixed(2) : ''}" />
                </label>
                <label class="studio-field studio-field--inline-check">
                    <input type="checkbox" class="studio-checkbox" id="studio-travel-modal-own-flight" ${existing.ownFlight ? 'checked' : ''} />
                    <span>Own flight ($800 credit)</span>
                </label>
                <label class="studio-field"><span>Est. arrival date</span>
                    <input type="date" class="studio-input" id="studio-travel-modal-arrival-date" value="${escapeHtml(existing.estArrivalDate || '')}" />
                </label>
                <label class="studio-field"><span>Est. arrival time</span>
                    <input type="time" class="studio-input" id="studio-travel-modal-arrival-time" value="${escapeHtml(existing.estArrivalTime || '')}" />
                </label>
                <div class="studio-travel-flight-modal__actions">
                    <button type="button" class="studio-btn-secondary" id="studio-travel-modal-cancel">Cancel</button>
                    <button type="submit" class="studio-btn-primary">Save</button>
                </div>
            </form>
        </div>`;

        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        overlay.querySelector('#studio-travel-modal-cancel')?.addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

        overlay.querySelector('#studio-travel-flight-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const costVal = overlay.querySelector('#studio-travel-modal-cost')?.value || '0';
            const costCents = Math.round(parseFloat(costVal.replace(/[^0-9.]/g, '')) * 100) || 0;
            const booking = {
                applicantId,
                programId: selectedProgramId,
                airline: overlay.querySelector('#studio-travel-modal-airline')?.value || '',
                airlineWebsite: overlay.querySelector('#studio-travel-modal-airline-url')?.value || '',
                confirmationNumber: overlay.querySelector('#studio-travel-modal-confirmation')?.value || '',
                flightCostCents: costCents,
                ownFlight: overlay.querySelector('#studio-travel-modal-own-flight')?.checked || false,
                estArrivalDate: overlay.querySelector('#studio-travel-modal-arrival-date')?.value || '',
                estArrivalTime: overlay.querySelector('#studio-travel-modal-arrival-time')?.value || '',
            };
            try {
                await staffUpsertApplicantFlightBooking(booking);
                close();
                const updatedBookings = await staffListFlightBookingsForProgram(selectedProgramId).catch(() => []);
                bookingsByProgram.set(selectedProgramId, updatedBookings);
                paintProgramCards();
                renderPage();
            } catch (err) {
                alert('Failed to save flight booking: ' + (err?.message || err));
            }
        });
    }

    // --- Event listeners ---

    cardsRail?.addEventListener('click', (e) => {
        const btn = e.target instanceof Element ? e.target.closest('[data-travel-program-select]') : null;
        if (!btn || !cardsRail.contains(btn)) return;
        const id = btn.getAttribute('data-travel-program-select');
        if (selectedProgramId === id) {
            selectedProgramId = null;
            saveSelectedProgramId(null);
        } else {
            selectedProgramId = id;
            saveSelectedProgramId(id);
        }
        paintProgramCards();
        void loadPrepLinks();
        renderPage();
    });

    tbody?.addEventListener('click', async (e) => {
        const t = e.target instanceof Element ? e.target : null;
        if (!t) return;

        const viewBtn = t.closest('[data-travel-view-flight]');
        if (viewBtn) {
            const confirmation = viewBtn.getAttribute('data-confirmation') || '';
            const url = viewBtn.getAttribute('data-airline-url') || '';
            if (confirmation) {
                try {
                    await navigator.clipboard.writeText(confirmation);
                    const toast = document.createElement('span');
                    toast.className = 'studio-travel-copied-toast';
                    toast.textContent = 'Copied!';
                    viewBtn.appendChild(toast);
                    setTimeout(() => toast.remove(), 1500);
                } catch { /* clipboard may fail in some contexts */ }
            }
            if (url) {
                window.open(url, '_blank', 'noopener,noreferrer');
            }
            return;
        }

        const editBtn = t.closest('[data-travel-edit]');
        if (editBtn && canEdit) {
            openFlightModal(editBtn.getAttribute('data-travel-edit'));
        }
    });

    searchInput?.addEventListener('input', () => {
        searchTerm = searchInput.value || '';
        renderPage();
    });

    prepLinksHost?.addEventListener('click', async (e) => {
        const t = e.target instanceof Element ? e.target : null;
        if (!t) return;

        if (t.id === 'studio-travel-add-prep-link') {
            prepLinks = readPrepLinksFromDom();
            prepLinks.push({
                id: `tpl-${Date.now()}`,
                programId: selectedProgramId || '',
                title: '',
                url: '',
                description: '',
                imageUrl: '',
                sortOrder: prepLinks.length,
                updatedAt: new Date().toISOString(),
            });
            renderPrepLinksEditor();
            return;
        }

        const uploadBtn = t.closest('[data-prep-upload]');
        if (uploadBtn) {
            const idx = parseInt(uploadBtn.getAttribute('data-prep-upload'), 10);
            const fileInput = prepLinksHost.querySelector(`[data-prep-file="${idx}"]`);
            if (fileInput instanceof HTMLInputElement) fileInput.click();
            return;
        }

        const pickBtn = t.closest('[data-prep-pick]');
        if (pickBtn) {
            const idx = parseInt(pickBtn.getAttribute('data-prep-pick'), 10);
            prepLinks = readPrepLinksFromDom();
            const library = await staffListTravelPrepImages().catch(() => []);
            const images = collectTravelPrepImageOptions(prepLinks, library);
            const picked = await openTravelPrepImagePicker({
                images,
                selectedUrl: prepLinks[idx]?.imageUrl,
            });
            if (picked) await applyPrepLinkImage(idx, picked);
            return;
        }

        const clearBtn = t.closest('[data-prep-clear-image]');
        if (clearBtn) {
            const idx = parseInt(clearBtn.getAttribute('data-prep-clear-image'), 10);
            await applyPrepLinkImage(idx, '');
            return;
        }

        if (t.id === 'studio-travel-save-prep-links') {
            const links = readPrepLinksFromDom();
            try {
                await staffUpsertTravelPrepLinks(selectedProgramId, links);
                prepLinks = links;
                renderPrepLinksEditor();
            } catch (err) {
                alert('Failed to save prep links: ' + (err?.message || err));
            }
            return;
        }

        const delBtn = t.closest('[data-prep-delete]');
        if (delBtn) {
            prepLinks = readPrepLinksFromDom();
            const idx = parseInt(delBtn.getAttribute('data-prep-delete'), 10);
            const link = prepLinks[idx];
            if (link) {
                prepLinks.splice(idx, 1);
                if (link.id && selectedProgramId) {
                    staffDeleteTravelPrepLink(selectedProgramId, link.id).catch(() => {});
                }
                renderPrepLinksEditor();
            }
        }
    });

    prepLinksHost?.addEventListener('change', async (e) => {
        const t = e.target instanceof Element ? e.target : null;
        if (!t) return;
        const fileInput = t.closest('[data-prep-file]');
        if (!(fileInput instanceof HTMLInputElement)) return;
        const idx = parseInt(fileInput.getAttribute('data-prep-file'), 10);
        const file = fileInput.files?.[0];
        fileInput.value = '';
        if (!file) return;
        try {
            await uploadPrepLinkImage(idx, file);
        } catch (err) {
            alert('Failed to upload image: ' + (err instanceof Error ? err.message : String(err)));
        }
    });

    function restoreSelectedProgramId() {
        try {
            return sessionStorage.getItem(TRAVEL_PROGRAM_SELECT_STORAGE_KEY) || null;
        } catch { return null; }
    }

    function saveSelectedProgramId(id) {
        try {
            if (id) sessionStorage.setItem(TRAVEL_PROGRAM_SELECT_STORAGE_KEY, id);
            else sessionStorage.removeItem(TRAVEL_PROGRAM_SELECT_STORAGE_KEY);
        } catch { /* noop */ }
    }

    await reload();
}
