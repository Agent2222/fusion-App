/**
 * Studio Content editor for slug `program-draw` — display panel + About / Eligibility / Terms.
 */

import '../../../styles/studioJoinNetworkPage.css';
import {
    defaultProgramDrawBundle,
    normalizeProgramDrawBundleForStudio,
} from '../../../utils/programDrawContent.js';

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** @type {WeakMap<HTMLElement, { data: ReturnType<typeof normalizeProgramDrawBundleForStudio>, locale: 'en'|'ja', hooks: { markDirty: () => void } }>} */
const editorStore = new WeakMap();

/**
 * @param {string[]} lines
 * @param {string} attr
 * @param {string} [placeholder]
 */
function listRowsHtml(lines, attr, placeholder = 'Bullet') {
    const rows = Array.isArray(lines) && lines.length ? lines : [''];
    return rows
        .map(
            (line, i) => `
      <div class="studio-jnp__include-row">
        <input class="studio-input" data-${attr}="${i}" value="${esc(line)}" placeholder="${esc(placeholder)} ${i + 1}" />
        <button type="button" class="studio-btn-ghost" data-${attr}-remove="${i}" title="Remove">×</button>
      </div>`,
        )
        .join('');
}

/**
 * @param {Record<string, any>} section
 * @param {'eligibility'|'terms'} key
 * @param {string} heading
 */
function policySectionHtml(section, key, heading) {
    const s = section || {};
    const bullets = Array.isArray(s.bullets) && s.bullets.length ? s.bullets : [''];
    return `
      <section class="studio-jnp__card">
        <h3>${esc(heading)}</h3>
        <div class="studio-jnp__grid-2">
          <label class="studio-jnp__field studio-jnp__field--full"><span>Title</span>
            <input class="studio-input" data-pd-policy="${esc(key)}" data-pd-policy-field="title" value="${esc(s.title)}" /></label>
          <label class="studio-jnp__field studio-jnp__field--full"><span>Lead</span>
            <textarea class="studio-textarea" rows="2" data-pd-policy="${esc(key)}" data-pd-policy-field="lead">${esc(s.lead)}</textarea></label>
        </div>
        <p class="studio-muted" style="margin-top:0.85rem">Bullets</p>
        <div data-pd-policy-bullets="${esc(key)}">${listRowsHtml(bullets, `pd-${key}-bullet`)}</div>
        <button type="button" class="studio-btn-ghost" data-pd-policy-add-bullet="${esc(key)}" style="margin-top:0.45rem">+ Add bullet</button>
      </section>`;
}

/**
 * @param {Record<string, any>} loc
 * @param {'en'|'ja'} locale
 */
function fieldsHtml(loc, locale) {
    const d = loc.display || {};
    const a = loc.about || {};
    const paragraphs = Array.isArray(a.paragraphs) && a.paragraphs.length ? a.paragraphs : [''];
    const bullets = Array.isArray(a.bullets) && a.bullets.length ? a.bullets : [''];

    const displayFields = [
        ['badge', 'Badge'],
        ['headline', 'Headline'],
        ['sub', 'Subtext'],
        ['submitLabel', 'Submit button'],
        ['enteredLabel', 'Entered state button (already entered)'],
        ['currentCycleLabel', 'Current round label'],
        ['membersSuffix', 'Entries suffix (under count)'],
        ['remainingTemplate', 'Remaining template (use {{count}})'],
        ['roundLabelTemplate', 'Round label (use {{n}} for round number)'],
        ['howTitle', 'How it works title'],
        ['howBody', 'How it works body'],
        ['selectionTitle', 'Selection title'],
        ['selectionBody', 'Selection body (use {{total}} for entry goal)'],
        ['awardTitle', 'Award title'],
        ['awardDate', 'Award body (use {{program}} for program name)'],
        ['awardNote', 'Award note (optional)'],
        ['pastRecipientsLabel', 'Past recipients link'],
        ['pastRecipientsHideLabel', 'Hide past recipients link'],
        ['moreDetailsLabel', 'More details link'],
        ['moreDetailsHideLabel', 'Hide details link'],
        ['pastTitle', 'Past recipients section title'],
        ['viewAllLabel', 'View all label'],
        ['supportLead', 'Support lead'],
        ['supportCta', 'Support CTA'],
        ['emptyRecipientsLead', 'Empty past recipients — line 1'],
        ['emptyRecipientsBody', 'Empty past recipients — line 2 (use {{n}})'],
        ['emptyRecipientsSoft', 'Empty past recipients — line 3'],
        ['badgeInactive', 'Inactive badge'],
        ['subInactive', 'Inactive subtext'],
        ['getNotifiedLabel', 'Get Notified button'],
        ['applyToProgramLabel', 'Apply to program instead button'],
        ['learnHowLabel', 'Learn how link'],
        ['currentStatusLabel', 'Current status label'],
        ['statusNotActive', 'Status: not active'],
        ['statusNotScheduledBody', 'Status: not scheduled body'],
    ];

    const displayInputs = displayFields
        .map(([key, label]) => {
            const isLong =
                key === 'headline' ||
                key === 'sub' ||
                key === 'subInactive' ||
                key === 'howBody' ||
                key === 'selectionBody' ||
                key === 'awardDate' ||
                key === 'statusNotScheduledBody' ||
                key === 'supportLead' ||
                key === 'emptyRecipientsLead' ||
                key === 'emptyRecipientsBody' ||
                key === 'emptyRecipientsSoft';
            if (isLong) {
                return `<label class="studio-jnp__field studio-jnp__field--full"><span>${esc(label)}</span>
          <textarea class="studio-textarea" rows="2" data-pd="${esc(key)}">${esc(d[key])}</textarea></label>`;
            }
            return `<label class="studio-jnp__field"><span>${esc(label)}</span>
        <input class="studio-input" data-pd="${esc(key)}" value="${esc(d[key])}" /></label>`;
        })
        .join('');

    const paraRows = paragraphs
        .map(
            (line, i) => `
      <div class="studio-jnp__include-row">
        <textarea class="studio-textarea" rows="2" data-pd-paragraph="${i}">${esc(line)}</textarea>
        <button type="button" class="studio-btn-ghost" data-pd-remove-paragraph="${i}" title="Remove">×</button>
      </div>`,
        )
        .join('');

    const bulletRows = bullets
        .map(
            (line, i) => `
      <div class="studio-jnp__include-row">
        <input class="studio-input" data-pd-bullet="${i}" value="${esc(line)}" placeholder="Bullet ${i + 1}" />
        <button type="button" class="studio-btn-ghost" data-pd-remove-bullet="${i}" title="Remove">×</button>
      </div>`,
        )
        .join('');

    return `
    <div class="studio-pd" data-pd-root data-pd-locale="${esc(locale)}">
      <p class="studio-muted">Global Program Draw copy (EN/JA). Display panel powers the public draw subcomponent; About / Eligibility / Additional terms appear when visitors expand details. Templates: <code>{{n}}</code> round number, <code>{{total}}</code> entry goal, <code>{{count}}</code> remaining, <code>{{program}}</code> program name.</p>
      <div class="studio-jnp__locale-tabs" role="tablist" style="margin:0.75rem 0 1rem">
        <button type="button" class="studio-jnp__locale-tab${locale === 'en' ? ' is-active' : ''}" data-pd-locale-tab="en">EN</button>
        <button type="button" class="studio-jnp__locale-tab${locale === 'ja' ? ' is-active' : ''}" data-pd-locale-tab="ja">JA</button>
      </div>
      <section class="studio-jnp__card">
        <h3>Display panel</h3>
        <div class="studio-jnp__grid-2">${displayInputs}</div>
      </section>
      <section class="studio-jnp__card">
        <h3>About Program Draw</h3>
        <div class="studio-jnp__grid-2">
          <label class="studio-jnp__field studio-jnp__field--full"><span>Title</span>
            <input class="studio-input" data-pd-about="title" value="${esc(a.title)}" /></label>
          <label class="studio-jnp__field studio-jnp__field--full"><span>Lead</span>
            <textarea class="studio-textarea" rows="2" data-pd-about="lead">${esc(a.lead)}</textarea></label>
        </div>
        <p class="studio-muted" style="margin-top:0.85rem">Paragraphs</p>
        <div data-pd-paragraphs>${paraRows}</div>
        <button type="button" class="studio-btn-ghost" data-pd-add-paragraph style="margin-top:0.45rem">+ Add paragraph</button>
        <p class="studio-muted" style="margin-top:1rem">Bullets</p>
        <div data-pd-bullets>${bulletRows}</div>
        <button type="button" class="studio-btn-ghost" data-pd-add-bullet style="margin-top:0.45rem">+ Add bullet</button>
      </section>
      ${policySectionHtml(loc.eligibility, 'eligibility', 'Eligibility')}
      ${policySectionHtml(loc.terms, 'terms', 'Additional terms')}
    </div>`;
}

/**
 * @param {HTMLElement} container
 * @param {unknown} bundle
 * @param {{ markDirty: () => void }} hooks
 */
export async function fillProgramDrawContentEditor(container, bundle, hooks) {
    const data = normalizeProgramDrawBundleForStudio(
        bundle && typeof bundle === 'object' ? bundle : defaultProgramDrawBundle(),
    );
    /** @type {'en'|'ja'} */
    let locale = 'en';
    editorStore.set(container, { data, locale, hooks });

    const render = () => {
        const rec = editorStore.get(container);
        if (!rec) return;
        container.innerHTML = fieldsHtml(rec.data[rec.locale], rec.locale);
        wire(container);
    };

    /**
     * @param {HTMLElement} root
     * @param {'eligibility'|'terms'} sectionKey
     * @param {string} bulletAttr
     */
    const wirePolicySection = (root, sectionKey, bulletAttr) => {
        const rec = editorStore.get(container);
        if (!rec) return;

        root.querySelectorAll(`[data-pd-policy="${sectionKey}"]`).forEach((el) => {
            const field = el.getAttribute('data-pd-policy-field');
            if (!field) return;
            const handler = () => {
                const value =
                    el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
                        ? el.value
                        : '';
                if (!rec.data[rec.locale][sectionKey]) {
                    /** @type {any} */ (rec.data[rec.locale])[sectionKey] = {
                        title: '',
                        lead: '',
                        bullets: [''],
                    };
                }
                /** @type {any} */ (rec.data[rec.locale][sectionKey])[field] = value;
                rec.hooks.markDirty();
            };
            el.addEventListener('input', handler);
            el.addEventListener('change', handler);
        });

        root.querySelectorAll(`[data-${bulletAttr}]`).forEach((el) => {
            const i = Number(el.getAttribute(`data-${bulletAttr}`));
            if (!Number.isFinite(i)) return;
            el.addEventListener('input', () => {
                const value = el instanceof HTMLInputElement ? el.value : '';
                const section = /** @type {any} */ (rec.data[rec.locale][sectionKey]);
                if (!Array.isArray(section.bullets)) section.bullets = [''];
                section.bullets[i] = value;
                rec.hooks.markDirty();
            });
        });

        root.querySelector(`[data-pd-policy-add-bullet="${sectionKey}"]`)?.addEventListener(
            'click',
            () => {
                const section = /** @type {any} */ (rec.data[rec.locale][sectionKey]);
                if (!Array.isArray(section.bullets)) section.bullets = [''];
                section.bullets.push('');
                rec.hooks.markDirty();
                render();
            },
        );

        root.querySelectorAll(`[data-${bulletAttr}-remove]`).forEach((btn) => {
            btn.addEventListener('click', () => {
                const i = Number(btn.getAttribute(`data-${bulletAttr}-remove`));
                if (!Number.isFinite(i)) return;
                const section = /** @type {any} */ (rec.data[rec.locale][sectionKey]);
                const arr = section.bullets;
                if (!Array.isArray(arr)) return;
                arr.splice(i, 1);
                if (!arr.length) arr.push('');
                rec.hooks.markDirty();
                render();
            });
        });
    };

    /**
     * @param {HTMLElement} root
     */
    const wire = (root) => {
        const rec = editorStore.get(container);
        if (!rec) return;

        root.querySelectorAll('[data-pd-locale-tab]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const loc = btn.getAttribute('data-pd-locale-tab');
                if (loc !== 'en' && loc !== 'ja') return;
                rec.locale = loc;
                render();
            });
        });

        root.querySelectorAll('[data-pd]').forEach((el) => {
            const key = el.getAttribute('data-pd');
            if (!key) return;
            const handler = () => {
                const value =
                    el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
                        ? el.value
                        : '';
                if (!rec.data[rec.locale].display) {
                    rec.data[rec.locale].display = /** @type {any} */ ({});
                }
                /** @type {any} */ (rec.data[rec.locale].display)[key] = value;
                rec.hooks.markDirty();
            };
            el.addEventListener('input', handler);
            el.addEventListener('change', handler);
        });

        root.querySelectorAll('[data-pd-about]').forEach((el) => {
            const key = el.getAttribute('data-pd-about');
            if (!key) return;
            const handler = () => {
                const value =
                    el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
                        ? el.value
                        : '';
                /** @type {any} */ (rec.data[rec.locale].about)[key] = value;
                rec.hooks.markDirty();
            };
            el.addEventListener('input', handler);
            el.addEventListener('change', handler);
        });

        root.querySelectorAll('[data-pd-paragraph]').forEach((el) => {
            const i = Number(el.getAttribute('data-pd-paragraph'));
            if (!Number.isFinite(i)) return;
            el.addEventListener('input', () => {
                const value = el instanceof HTMLTextAreaElement ? el.value : '';
                if (!Array.isArray(rec.data[rec.locale].about.paragraphs)) {
                    rec.data[rec.locale].about.paragraphs = [''];
                }
                rec.data[rec.locale].about.paragraphs[i] = value;
                rec.hooks.markDirty();
            });
        });

        root.querySelectorAll('[data-pd-bullet]').forEach((el) => {
            const i = Number(el.getAttribute('data-pd-bullet'));
            if (!Number.isFinite(i)) return;
            el.addEventListener('input', () => {
                const value = el instanceof HTMLInputElement ? el.value : '';
                if (!Array.isArray(rec.data[rec.locale].about.bullets)) {
                    rec.data[rec.locale].about.bullets = [''];
                }
                rec.data[rec.locale].about.bullets[i] = value;
                rec.hooks.markDirty();
            });
        });

        root.querySelector('[data-pd-add-paragraph]')?.addEventListener('click', () => {
            if (!Array.isArray(rec.data[rec.locale].about.paragraphs)) {
                rec.data[rec.locale].about.paragraphs = [''];
            }
            rec.data[rec.locale].about.paragraphs.push('');
            rec.hooks.markDirty();
            render();
        });

        root.querySelector('[data-pd-add-bullet]')?.addEventListener('click', () => {
            if (!Array.isArray(rec.data[rec.locale].about.bullets)) {
                rec.data[rec.locale].about.bullets = [''];
            }
            rec.data[rec.locale].about.bullets.push('');
            rec.hooks.markDirty();
            render();
        });

        root.querySelectorAll('[data-pd-remove-paragraph]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const i = Number(btn.getAttribute('data-pd-remove-paragraph'));
                if (!Number.isFinite(i)) return;
                const arr = rec.data[rec.locale].about.paragraphs;
                if (!Array.isArray(arr)) return;
                arr.splice(i, 1);
                if (!arr.length) arr.push('');
                rec.hooks.markDirty();
                render();
            });
        });

        root.querySelectorAll('[data-pd-remove-bullet]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const i = Number(btn.getAttribute('data-pd-remove-bullet'));
                if (!Number.isFinite(i)) return;
                const arr = rec.data[rec.locale].about.bullets;
                if (!Array.isArray(arr)) return;
                arr.splice(i, 1);
                if (!arr.length) arr.push('');
                rec.hooks.markDirty();
                render();
            });
        });

        wirePolicySection(root, 'eligibility', 'pd-eligibility-bullet');
        wirePolicySection(root, 'terms', 'pd-terms-bullet');
    };

    render();
}

/**
 * @param {HTMLElement} container
 * @param {unknown} [_prev]
 * @returns {ReturnType<typeof normalizeProgramDrawBundleForStudio>}
 */
export function mergeProgramDrawContentFromContainer(container, _prev) {
    const rec = editorStore.get(container);
    if (rec?.data) {
        return normalizeProgramDrawBundleForStudio(rec.data);
    }
    return normalizeProgramDrawBundleForStudio(defaultProgramDrawBundle());
}
