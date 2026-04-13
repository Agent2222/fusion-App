/**
 * Program application: 2-step form (Artist → Portfolio & submit) with horizontal scroll + dot pagination.
 */

import { PROGRAM_APPLICATION_VIEWPORT_TOP_GAP_PX } from '../../utils/scrollAnchorToViewportGap.js';
import {
    getMyArtistRecord,
    PROGRAM_APPLICATION_ERROR_CODE,
    submitProgramApplication,
} from '../../utils/database.js';

const STEP_COUNT = 2;

class ApplicationFormComponent extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        this._slideCount = STEP_COUNT;
        this._activeIndex = 0;
        this._scrollRaf = null;
        /** @type {null | (() => void)} */
        this._teardownPagination = null;
    }

    get active() {
        return this.getAttribute('active') || false;
    }

    set active(val) {
        const next = val === true || val === 'true' ? 'true' : 'false';
        if (this.getAttribute('active') === next) return;
        this.setAttribute('active', next);
    }

    static get observedAttributes() {
        return ['active', 'data-program-id'];
    }

    attributeChangedCallback(prop, oldVal, newVal) {
        if ((prop === 'active' || prop === 'data-program-id') && oldVal !== newVal) {
            this.render();
            this._afterRender();
        }
    }

    _labels() {
        const locale = typeof window.getLocale === 'function' ? window.getLocale() : 'en';
        if (locale === 'ja') {
            return {
                title: '応募フォーム',
                stepArtist: 'アーティスト',
                stepPortfolio: 'ポートフォリオ',
                step1Title: 'ステップ 1：アーティスト',
                step2Title: 'ステップ 2：ポートフォリオ',
                lead1: '連絡先と所在地を入力してください。',
                lead2: 'ウェブサイト、分野、自己紹介、レジデンシーで達成したいことを共有し、送信してください。',
                firstName: '名（ファーストネーム）',
                lastName: '姓（ラストネーム）',
                email: 'メールアドレス',
                country: '国',
                stateProvince: '州 / 省 / 都道府県',
                city: '市区町村',
                website: 'あなたの世界をどこで体験できますか？',
                websiteByline: '（ウェブサイト、ポートフォリオ、作品を置いている場所 — リンク可）',
                discipline: 'いま、実践をどう定義していますか？',
                disciplineByline: '（分野や、やり方の呼び方 — カテゴリに当てはまらなくても構いません）',
                bioStatement: 'アーティストとして、ひとりの人として、あなたについて教えてください。',
                bioStatementByline: '（短い経歴でも、もっと個人的なことでも — 正直に書ける方）',
                exploration: 'いま探求・問いかけ・変化の途中にあることは何ですか？',
                explorationByline: '（制作や生活で、いま前に引っ張られているもの）',
                residencyGoals: 'このレジデンシーに参加したら、内面でも外面でも、何を持ち帰りたいですか？',
                residencyGoalsByline: '（作品、視点の変化、つながり、言葉にしにくいものでも）',
                submitError: '送信に失敗しました。もう一度お試しください。',
                submitNoAccount:
                    'この Internet Identity には Fusion のメンバーアカウントがありません。参加（Join）の登録を完了するか、アーティストとして紐づいたアカウントでサインインしてください。管理者だけの II では応募できません。',
                submitNoLinkedArtist:
                    'アカウントに紐づくアーティストプロフィールがありません。Studio でロスターと紐づけてもらうか、アーティストとリンクされた II でサインインしてください。',
                submitSuccess: '応募を受け付けました。',
                alreadyApplied: 'このプログラムには既に応募済みです。内容を更新して再送信できます。',
                next: '次へ',
                back: '戻る',
                submit: '応募を送信',
                required: '必須',
            };
        }
        return {
            title: 'Application Form',
            stepArtist: 'Artist',
            stepPortfolio: 'Portfolio',
            step1Title: 'The Artist',
            step2Title: 'Tell us who you are; beyond the surface',
            lead1: 'Enter your name, email, and location.',
            lead2:
                'We’re less interested in perfect answers, more in perspective. Share what feels true to you, then submit your application.',
            firstName: 'First name',
            lastName: 'Last name',
            email: 'Email',
            country: 'Country',
            stateProvince: 'State / province / region',
            city: 'City',
            website: 'Where can we experience your world?',
            websiteByline: '(Website, portfolio, or any place your work lives — links welcome)',
            discipline: 'How do you define your practice right now?',
            disciplineByline: '(Your discipline, or however you choose to describe what you do — it doesn’t have to fit a category)',
            bioStatement: 'Tell us about yourself, as an artist and as a person.',
            bioStatementByline: '(A short bio, or something more personal — whichever feels more honest to you)',
            exploration: 'What are you currently exploring, questioning, or becoming?',
            explorationByline: '(What’s pulling you forward in your work or life right now)',
            residencyGoals:
                'If you joined this residency, what would you want to leave with — internally or externally?',
            residencyGoalsByline: '(This could be a body of work, a shift in perspective, a connection, or something intangible)',
            submitError: 'Could not submit. Please try again.',
            submitNoAccount:
                'This Internet Identity has no Fusion member account. Finish the Join / registration flow, or sign in with an identity linked to an artist. Admin-only identities (no member profile) cannot submit applications.',
            submitNoLinkedArtist:
                'Your account has no linked artist profile. Ask Fusion to link your roster row in Studio, or sign in with an identity that is linked to an artist.',
            submitSuccess: 'Your application was received.',
            alreadyApplied: 'You already applied to this program. You can update and resubmit.',
            next: 'Next',
            back: 'Back',
            submit: 'Submit application',
            required: 'required',
        };
    }

    /**
     * Walk ancestors of the host to find the element that scrolls the page content (e.g. #programViewMainContent).
     * @param {HTMLElement} el
     * @returns {HTMLElement}
     */
    _getScrollParent(el) {
        let p = el.parentElement;
        while (p) {
            const st = getComputedStyle(p);
            const oy = st.overflowY;
            if (oy === 'auto' || oy === 'scroll' || oy === 'overlay') {
                if (p.scrollHeight > p.clientHeight + 2) return p;
            }
            p = p.parentElement;
        }
        return document.documentElement;
    }

    /**
     * Scroll the page (or main program scroll container) so the form sits ~{@link PROGRAM_APPLICATION_VIEWPORT_TOP_GAP_PX}px below the viewport top.
     */
    _alignFormToViewport() {
        const anchor = this.shadowRoot?.querySelector('.application-form-root') || this;
        const rect = anchor.getBoundingClientRect();
        const delta = rect.top - PROGRAM_APPLICATION_VIEWPORT_TOP_GAP_PX;
        if (Math.abs(delta) <= 2) return;

        const scroller = this._getScrollParent(this);
        if (scroller === document.documentElement || scroller === document.body) {
            window.scrollBy({ top: delta, behavior: 'smooth' });
            return;
        }
        scroller.scrollBy({ top: delta, behavior: 'smooth' });
    }

    _setActiveDot(index) {
        const dots = this.shadowRoot?.querySelectorAll('.app-form-pagination-dot');
        if (!dots?.length) return;
        this._activeIndex = Math.max(0, Math.min(index, dots.length - 1));
        dots.forEach((d, i) => {
            const on = i === this._activeIndex;
            d.classList.toggle('active', on);
            d.setAttribute('aria-current', on ? 'true' : 'false');
        });
        const nodes = this.shadowRoot?.querySelectorAll('.app-step-node');
        nodes?.forEach((n, i) => {
            n.classList.toggle('is-active', i === this._activeIndex);
        });
    }

    _syncFromScroll(scrollEl) {
        if (!scrollEl || !this._slideCount) return;
        const w = scrollEl.clientWidth;
        if (!w) return;
        let index = Math.round(scrollEl.scrollLeft / w);
        index = Math.max(0, Math.min(this._slideCount - 1, index));
        this._setActiveDot(index);
    }

    _goToSlide(index) {
        const scrollEl = this.shadowRoot?.querySelector('.app-form-scroll');
        if (!scrollEl || index < 0 || index >= this._slideCount) return;
        const w = scrollEl.clientWidth;
        scrollEl.scrollTo({ left: index * w, behavior: 'smooth' });
        this._setActiveDot(index);
    }

    _bindPagination(scrollEl) {
        const onScroll = () => {
            if (this._scrollRaf) cancelAnimationFrame(this._scrollRaf);
            this._scrollRaf = requestAnimationFrame(() => {
                this._scrollRaf = null;
                this._syncFromScroll(scrollEl);
            });
        };
        const onScrollEnd = () => {
            this._syncFromScroll(scrollEl);
            this._alignFormToViewport();
        };
        const onResize = () => {
            if (!this._slideCount) return;
            const w = scrollEl.clientWidth;
            if (!w) return;
            const i = Math.max(0, Math.min(this._slideCount - 1, this._activeIndex));
            scrollEl.scrollLeft = i * w;
        };
        scrollEl.addEventListener('scroll', onScroll, { passive: true });
        scrollEl.addEventListener('scrollend', onScrollEnd);
        window.addEventListener('resize', onResize);
        this._teardownPagination = () => {
            scrollEl.removeEventListener('scroll', onScroll);
            scrollEl.removeEventListener('scrollend', onScrollEnd);
            window.removeEventListener('resize', onResize);
            if (this._scrollRaf) {
                cancelAnimationFrame(this._scrollRaf);
                this._scrollRaf = null;
            }
        };
    }

    _wireControls() {
        const root = this.shadowRoot;
        if (!root) return;

        root.querySelectorAll('[data-app-step]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const i = parseInt(btn.getAttribute('data-app-step'), 10);
                if (!Number.isNaN(i)) this._goToSlide(i);
            });
        });

        root.querySelector('.app-next-1')?.addEventListener('click', () => this._goToSlide(1));
        root.querySelector('.app-back-1')?.addEventListener('click', () => this._goToSlide(0));

        const form = root.querySelector('#app-application-form-fields');
        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            void this._submitApplication();
        });
    }

    /**
     * @returns {Record<string, string>}
     */
    _collectPayload() {
        const root = this.shadowRoot;
        const get = (id) => root?.querySelector(`#${id}`)?.value ?? '';
        return {
            firstName: String(get('app-first-name')).trim(),
            lastName: String(get('app-last-name')).trim(),
            email: String(get('app-email')).trim(),
            country: String(get('app-country')).trim(),
            stateProvince: String(get('app-state')).trim(),
            city: String(get('app-city')).trim(),
            website: String(get('app-website')).trim(),
            discipline: String(get('app-discipline')).trim(),
            bioStatement: String(get('app-bio')).trim(),
            exploration: String(get('app-exploration')).trim(),
            residencyGoals: String(get('app-goals')).trim(),
        };
    }

    async _submitApplication() {
        const root = this.shadowRoot;
        const statusEl = root?.querySelector('#app-form-status');
        const programId = this.getAttribute('data-program-id') || '';
        const L = this._labels();
        if (!programId) {
            if (statusEl) {
                statusEl.textContent = 'Missing program id.';
                statusEl.classList.add('is-error');
            }
            return;
        }
        const form = root?.querySelector('#app-application-form-fields');
        if (form && !form.checkValidity()) {
            form.reportValidity();
            return;
        }
        if (statusEl) {
            statusEl.textContent = '';
            statusEl.classList.remove('is-error', 'is-success');
        }
        const payload = this._collectPayload();
        try {
            await submitProgramApplication(programId, payload);
            if (statusEl) {
                statusEl.textContent = L.submitSuccess;
                statusEl.classList.add('is-success');
            }
        } catch (err) {
            const code = err && typeof err === 'object' && 'code' in err ? String(/** @type {{ code?: unknown }} */ (err).code) : '';
            const raw = err instanceof Error ? err.message : String(err);
            const blob = `${raw} ${err && typeof err === 'object' && 'message' in err ? String(/** @type {{ message?: unknown }} */ (err).message) : ''}`;
            let line = L.submitError;
            if (code === PROGRAM_APPLICATION_ERROR_CODE.NO_ACCOUNT || /No account for caller/i.test(blob)) {
                line = L.submitNoAccount;
            } else if (code === PROGRAM_APPLICATION_ERROR_CODE.NO_LINKED_ARTIST || /No linked artist on account/i.test(blob)) {
                line = L.submitNoLinkedArtist;
            } else if (
                raw &&
                raw.length < 280 &&
                !/Request ID:|Reject code:|ic0\.trap|Canister called/i.test(raw)
            ) {
                line = raw;
            }
            if (statusEl) {
                statusEl.textContent = line;
                statusEl.classList.add('is-error');
            }
            if (typeof console !== 'undefined' && console.error) {
                console.error('[ApplicationForm]', err);
            }
        }
    }

    async _prefillFromArtist() {
        const root = this.shadowRoot;
        if (!root) return;
        const programId = this.getAttribute('data-program-id') || '';
        let rec;
        try {
            rec = await getMyArtistRecord();
        } catch {
            return;
        }
        if (!rec) return;

        const locale = typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
        let locales = {};
        try {
            const lj = rec.locales_json ?? rec.localesJson;
            const raw = typeof lj === 'string' ? lj : '';
            locales = raw ? JSON.parse(raw) : {};
        } catch {
            locales = {};
        }
        const block = locales[locale] || locales.en || {};
        const name = String(block.name || '').trim();
        const parts = name.split(/\s+/).filter(Boolean);
        const firstName = parts[0] || '';
        const lastName = parts.slice(1).join(' ') || '';
        const loc = block.location && typeof block.location === 'object' ? block.location : {};
        const country = String(loc.country || '').trim();
        const stateProvince = String(loc.state || loc.region || '').trim();
        const city = String(loc.city || '').trim();

        const setVal = (id, v) => {
            const el = root.querySelector(`#${id}`);
            if (el && 'value' in el) el.value = v;
        };

        if (firstName) setVal('app-first-name', firstName);
        if (lastName) setVal('app-last-name', lastName);
        if (country) setVal('app-country', country);
        if (stateProvince) setVal('app-state', stateProvince);
        if (city) setVal('app-city', city);
        if (block.discipline) setVal('app-discipline', String(block.discipline));

        const appliedRaw = rec.applied_json ?? rec.appliedJson;
        if (programId && appliedRaw) {
            try {
                const applied = typeof appliedRaw === 'string' ? JSON.parse(appliedRaw) : appliedRaw;
                const entry = applied[programId];
                const p = entry && typeof entry === 'object' ? entry.payload : null;
                if (p && typeof p === 'object') {
                    if (p.firstName != null) setVal('app-first-name', String(p.firstName));
                    if (p.lastName != null) setVal('app-last-name', String(p.lastName));
                    if (p.email != null) setVal('app-email', String(p.email));
                    if (p.country != null) setVal('app-country', String(p.country));
                    if (p.stateProvince != null) setVal('app-state', String(p.stateProvince));
                    if (p.city != null) setVal('app-city', String(p.city));
                    if (p.website != null) setVal('app-website', String(p.website));
                    if (p.discipline != null) setVal('app-discipline', String(p.discipline));
                    if (p.bioStatement != null) setVal('app-bio', String(p.bioStatement));
                    if (p.exploration != null) setVal('app-exploration', String(p.exploration));
                    if (p.residencyGoals != null) setVal('app-goals', String(p.residencyGoals));
                }
                const L = this._labels();
                const statusEl = root.querySelector('#app-form-status');
                if (entry && statusEl) {
                    statusEl.textContent = L.alreadyApplied;
                    statusEl.classList.add('is-success');
                }
            } catch {
                /* ignore */
            }
        }
    }

    _afterRender() {
        const scrollEl = this.shadowRoot?.querySelector('.app-form-scroll');
        if (!scrollEl) return;
        if (typeof this._teardownPagination === 'function') {
            this._teardownPagination();
            this._teardownPagination = null;
        }
        this._bindPagination(scrollEl);
        this._setActiveDot(0);
        this._wireControls();
        void this._prefillFromArtist();
    }

    disconnectedCallback() {
        if (typeof this._teardownPagination === 'function') {
            this._teardownPagination();
            this._teardownPagination = null;
        }
    }

    connectedCallback() {
        this.render();
        this._afterRender();
    }

    render() {
        const L = this._labels();
        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    box-sizing: border-box;
                    padding: clamp(2rem, 5vw, 3.5rem) 0 clamp(3rem, 8vw, 5rem);
                }

                .application-form-root {
                    width: 100%;
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 clamp(1rem, 4vw, 2rem);
                    box-sizing: border-box;
                }

                .app-form-title {
                    margin: 0 0 clamp(1.25rem, 3vw, 2rem);
                    text-align: center;
                    font-size: clamp(1.25rem, 2.5vw, 1.75rem);
                    font-variation-settings: var(--fv-headline-wide);
                    color: var(--c2);
                    letter-spacing: 0.04em;
                }

                .app-form-stepper {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-wrap: wrap;
                    gap: 0.35rem 0.5rem;
                    margin-bottom: clamp(1.25rem, 3vw, 2rem);
                }

                .app-step-node {
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.4rem;
                    font-family: inherit;
                    font-size: clamp(0.85rem, 1.1vw, 0.95rem);
                    font-variation-settings: var(--fv-body-wide);
                    color: var(--c2);
                    opacity: 0.45;
                    padding: 0.25rem 0.35rem;
                    transition: opacity 0.2s ease;
                }

                .app-step-node:hover {
                    opacity: 0.75;
                }

                .app-step-node.is-active {
                    opacity: 1;
                    font-variation-settings: var(--fv-emphasis);
                }

                .app-step-node::before {
                    content: '';
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    border: 1px solid var(--c2);
                    background: transparent;
                    flex-shrink: 0;
                }

                .app-step-node.is-active::before {
                    background: var(--c1);
                    border-color: var(--c1);
                }

                .app-step-join {
                    width: clamp(1rem, 4vw, 2.5rem);
                    height: 1px;
                    background: var(--c2);
                    opacity: 0.2;
                }

                .app-form-scroll {
                    width: 100%;
                    display: flex;
                    flex-direction: row;
                    flex-wrap: nowrap;
                    overflow-x: auto;
                    overflow-y: hidden;
                    scroll-snap-type: x mandatory;
                    scroll-behavior: smooth;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: thin;
                    scrollbar-color: var(--c2) transparent;
                    min-height: min(70vh, 520px);
                }

                .app-form-scroll::-webkit-scrollbar {
                    height: 4px;
                }

                .app-form-scroll::-webkit-scrollbar-thumb {
                    background: var(--c2);
                    border-radius: 4px;
                }

                .app-form-slide {
                    flex: 0 0 100%;
                    min-width: 100%;
                    width: 100%;
                    box-sizing: border-box;
                    scroll-snap-align: start;
                    scroll-snap-stop: always;
                    padding: 0.25rem 0 1rem;
                }

                .app-form-card {
                    max-width: 820px;
                    margin: 0 auto;
                    padding: clamp(1.25rem, 3vw, 2rem);
                    box-sizing: border-box;
                    background: var(--c3);
                    border: 1px solid var(--c2);
                }

                .app-step-heading {
                    margin: 0 0 0.5rem;
                    font-size: clamp(1rem, 1.35vw, 1.2rem);
                    font-variation-settings: var(--fv-title);
                    color: var(--c2);
                    letter-spacing: 0.02em;
                }

                .app-step-lead {
                    margin: 0 0 1.25rem;
                    font-size: clamp(0.88rem, 1.1vw, 0.98rem);
                    font-variation-settings: var(--fv-body-wide);
                    color: var(--c2);
                    line-height: 1.5;
                    opacity: 0.92;
                }

                .app-field {
                    margin-bottom: 1rem;
                }

                .app-field label {
                    display: block;
                    margin-bottom: 0.25rem;
                    font-size: clamp(0.8rem, 1vw, 0.9rem);
                    font-variation-settings: var(--fv-label);
                    color: var(--c2);
                    letter-spacing: 0.02em;
                }

                .app-field-byline {
                    margin: 0 0 0.5rem;
                    font-size: clamp(0.62rem, 0.72vw, 0.74rem);
                    font-variation-settings: var(--fv-caption);
                    color: var(--c2);
                    line-height: 1.4;
                    letter-spacing: 0.01em;
                    opacity: 0.78;
                }

                .app-field input,
                .app-field select,
                .app-field textarea {
                    width: 100%;
                    box-sizing: border-box;
                    padding: 0.55rem 0.65rem;
                    border: 1px solid rgba(0, 0, 0, 0.2);
                    background: var(--c3);
                    color: var(--c2);
                    font-family: inherit;
                    font-size: clamp(0.88rem, 1.1vw, 1rem);
                    font-variation-settings: var(--fv-body);
                }

                .app-field textarea {
                    min-height: 120px;
                    resize: vertical;
                }

                .app-field--card-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 0.75rem;
                }

                @media (max-width: 480px) {
                    .app-field--card-row {
                        grid-template-columns: 1fr;
                    }
                }

                .app-form-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.75rem;
                    margin-top: 1.5rem;
                    flex-wrap: wrap;
                }

                .app-form-actions--split {
                    justify-content: space-between;
                }

                .app-btn {
                    min-width: 120px;
                    padding: 0.55rem 1.25rem;
                    border: 1px solid var(--c2);
                    cursor: pointer;
                    font-family: inherit;
                    font-size: clamp(0.9rem, 1.05vw, 1rem);
                    font-variation-settings: var(--fv-cta);
                    letter-spacing: 0.03em;
                    transition: background 0.2s ease, color 0.2s ease;
                }

                .app-btn--primary {
                    background: var(--c5);
                    color: var(--c2);
                }

                .app-btn--primary:hover {
                    background: var(--c2);
                    color: var(--c3);
                }

                .app-btn--ghost {
                    background: transparent;
                    color: var(--c2);
                }

                .app-btn--ghost:hover {
                    background: rgba(0, 0, 0, 0.05);
                }

                .app-form-pagination-wrap {
                    display: flex;
                    justify-content: center;
                    padding: 1rem 0 0.5rem;
                }

                .app-form-pagination-dot-container {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                }

                .app-form-pagination-dot {
                    width: 14px;
                    height: 14px;
                    padding: 0;
                    border: none;
                    border-radius: 50%;
                    background: var(--c2);
                    opacity: 0.28;
                    cursor: pointer;
                    transition: opacity 0.25s ease;
                }

                .app-form-pagination-dot:hover {
                    opacity: 0.5;
                }

                .app-form-pagination-dot.active {
                    opacity: 0.85;
                }

                .app-form-status {
                    margin-top: 1rem;
                    font-size: clamp(0.85rem, 1vw, 0.95rem);
                    font-variation-settings: var(--fv-body-wide);
                    color: var(--c2);
                    min-height: 1.25em;
                }

                .app-form-status.is-error {
                    color: #8b2942;
                }

                .app-form-status.is-success {
                    opacity: 0.9;
                }
            </style>
            <div class="application-form-root">
                <h2 class="app-form-title">${L.title}</h2>
                <div class="app-form-stepper" role="navigation" aria-label="Application steps">
                    <button type="button" class="app-step-node is-active" data-app-step="0" aria-current="step">${L.stepArtist}</button>
                    <span class="app-step-join" aria-hidden="true"></span>
                    <button type="button" class="app-step-node" data-app-step="1">${L.stepPortfolio}</button>
                </div>

                <form id="app-application-form-fields" novalidate>
                <div class="app-form-scroll">
                    <div class="app-form-slide" data-slide="0">
                        <div class="app-form-card">
                            <h3 class="app-step-heading">${L.step1Title}</h3>
                            <p class="app-step-lead">${L.lead1}</p>
                            <div class="app-field app-field--card-row">
                                <div>
                                    <label for="app-first-name">${L.firstName} <span aria-hidden="true">*</span></label>
                                    <input id="app-first-name" name="firstName" type="text" autocomplete="given-name" required />
                                </div>
                                <div>
                                    <label for="app-last-name">${L.lastName} <span aria-hidden="true">*</span></label>
                                    <input id="app-last-name" name="lastName" type="text" autocomplete="family-name" required />
                                </div>
                            </div>
                            <div class="app-field">
                                <label for="app-email">${L.email} <span aria-hidden="true">*</span></label>
                                <input id="app-email" name="email" type="email" autocomplete="email" required />
                            </div>
                            <div class="app-field">
                                <label for="app-country">${L.country} <span aria-hidden="true">*</span></label>
                                <input id="app-country" name="country" type="text" autocomplete="country-name" required />
                            </div>
                            <div class="app-field">
                                <label for="app-state">${L.stateProvince}</label>
                                <input id="app-state" name="stateProvince" type="text" autocomplete="address-level1" />
                            </div>
                            <div class="app-field">
                                <label for="app-city">${L.city} <span aria-hidden="true">*</span></label>
                                <input id="app-city" name="city" type="text" autocomplete="address-level2" required />
                            </div>
                            <div class="app-form-actions">
                                <button type="button" class="app-btn app-btn--primary app-next-1">${L.next}</button>
                            </div>
                        </div>
                    </div>
                    <div class="app-form-slide" data-slide="1">
                        <div class="app-form-card">
                            <h3 class="app-step-heading">${L.step2Title}</h3>
                            <p class="app-step-lead">${L.lead2}</p>
                            <div class="app-field">
                                <label for="app-website">${L.website}</label>
                                <p class="app-field-byline" id="app-website-byline">${L.websiteByline}</p>
                                <input id="app-website" name="website" type="url" inputmode="url" autocomplete="url" placeholder="https://" aria-describedby="app-website-byline" />
                            </div>
                            <div class="app-field">
                                <label for="app-discipline">${L.discipline}</label>
                                <p class="app-field-byline" id="app-discipline-byline">${L.disciplineByline}</p>
                                <input id="app-discipline" name="discipline" type="text" autocomplete="off" aria-describedby="app-discipline-byline" />
                            </div>
                            <div class="app-field">
                                <label for="app-bio">${L.bioStatement}</label>
                                <p class="app-field-byline" id="app-bio-byline">${L.bioStatementByline}</p>
                                <textarea id="app-bio" name="bioStatement" rows="5" aria-describedby="app-bio-byline"></textarea>
                            </div>
                            <div class="app-field">
                                <label for="app-exploration">${L.exploration}</label>
                                <p class="app-field-byline" id="app-exploration-byline">${L.explorationByline}</p>
                                <textarea id="app-exploration" name="exploration" rows="4" aria-describedby="app-exploration-byline"></textarea>
                            </div>
                            <div class="app-field">
                                <label for="app-goals">${L.residencyGoals}</label>
                                <p class="app-field-byline" id="app-goals-byline">${L.residencyGoalsByline}</p>
                                <textarea id="app-goals" name="residencyGoals" rows="4" aria-describedby="app-goals-byline"></textarea>
                            </div>
                            <div class="app-form-actions app-form-actions--split">
                                <button type="button" class="app-btn app-btn--ghost app-back-1">${L.back}</button>
                                <button type="submit" class="app-btn app-btn--primary">${L.submit}</button>
                            </div>
                        </div>
                    </div>
                </div>
                </form>

                <p id="app-form-status" class="app-form-status" role="status" aria-live="polite"></p>

                <div class="app-form-pagination-wrap">
                    <div class="app-form-pagination-dot-container" role="tablist" aria-label="Form steps">
                        <button type="button" class="app-form-pagination-dot active" data-app-step="0" aria-label="Step 1" aria-current="true"></button>
                        <button type="button" class="app-form-pagination-dot" data-app-step="1" aria-label="Step 2"></button>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('app-application-form', ApplicationFormComponent);

export { ApplicationFormComponent };
