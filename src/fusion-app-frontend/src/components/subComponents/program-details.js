import { programApplicationCtaLabelForAuth, programApplicationReviewLabel } from '../../utils/programApplicationCta.js';
import {
    PH_LOADER_BASE_STYLES,
    PROGRAM_DETAILS_PENDING_WRAPPER_STYLES,
    programHeroLoaderHtml,
} from '../../utils/programHeroLoader.js';
import { revealProgramApplicationOrOpenJoin } from '../../utils/scrollAnchorToViewportGap.js';
import { formatMonthlyFromRemainingAndMonths, splitTextLinesForBullets } from '../../utils/programDeadlineParse.js';

/**
 * Program residency details: timeline (key dates) + sidebar (location, facilities, cost).
 */
class ProgramDetailsComponent extends HTMLElement {
    constructor() {
        super();
        this._costPlanDisclosureUid = 0;
        this.shadow = this.attachShadow({ mode: 'open' });
        /** @type {null | { programId?: string, applicationsOpen?: boolean, headline: string, keyDates: Array<{ date?: string, description?: string, sectionTitle?: string }>, locations?: string[], facilities?: string[], costText: string, totalProgramFeeLine?: string, applicationFeeLine?: string, useStructuredCost?: boolean, depositLine?: string, remainingBalanceLine?: string, maxPlanMonths?: number, japanResidencyNotice?: string, availableSlots?: number | null, totalSlots?: number | null, residences?: Array<{ name?: string, href?: string }>, included?: string[], notIncluded?: string[], platform?: string, additionalInfo?: object | null, sidebarRunDates?: { start?: string, end?: string } | null }} */
        this._data = null;
    }

    /**
     * @param {{ programId?: string, applicationsOpen?: boolean, headline: string, keyDates: Array<{ date?: string, description?: string, sectionTitle?: string }>, locations?: string[], facilities?: string[], costText: string, totalProgramFeeLine?: string, applicationFeeLine?: string, useStructuredCost?: boolean, depositLine?: string, remainingBalanceLine?: string, maxPlanMonths?: number, japanResidencyNotice?: string, availableSlots?: number | null, totalSlots?: number | null, residences?: Array<{ name?: string, href?: string }>, included?: string[], notIncluded?: string[], platform?: string, additionalInfo?: { applicationFee?: string, aboutProgram?: string, faq?: object[], programNotes?: object[], refundPolicy?: object[] } | null, sidebarRunDates?: { start?: string, end?: string } | null }} payload
     */
    setProgramDetails(payload) {
        this._data = payload;
        this.render();
        this._populate();
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
        return ['active'];
    }

    attributeChangedCallback(prop, oldVal, newVal) {
        if (prop === 'active' && oldVal !== newVal) {
            this.render();
            this._populate();
        }
    }

    _labels() {
        const locale = typeof window.getLocale === 'function' ? window.getLocale() : 'en';
        if (locale === 'ja') {
            return {
                dates: '日程',
                runDateStart: '開始',
                runDateEnd: '終了',
                locations: '開催地',
                facilities: '施設',
                cost: '費用',
                costTotalProgramFee: 'プログラム料金（合計）',
                costApplicationFee: '応募料（申込時必須）',
                costIfAccepted: '採択された場合',
                costDepositBullet: 'デポジット（参加枠の確定）',
                costRemainingBullet: '残金（プログラム開始前まで）',
                costPaymentPlan: '柔軟な支払い・分割払い',
                costDeposit: 'デポジット',
                costRemaining: '残金',
                costMonthlyPayment: '月額支払い',
                costPaymentPlanHelper: '支払いプランは、一部の候補者向けに利用できます。',
                costJapanNotice: '日本居住者向け',
                residence: 'レジデンス',
                included: '含まれるもの',
                notIncluded: '含まれないもの',
                platform: 'プラットフォーム',
                additionalInformation: '追加情報',
                faq: 'よくある質問',
                programNotes: 'プログラム備考',
                refundPolicy: '返金ポリシー',
                applicationFee: '応募料',
                aboutProgram: 'プログラムについて',
                cohortCapacity: '定員・空き枠',
                slotsRemainingValue: '残り <strong>{{a}}</strong> / 全 <strong>{{b}}</strong> 枠',
            };
        }
        return {
            dates: 'DATES',
            runDateStart: 'Start',
            runDateEnd: 'End',
            locations: 'LOCATIONS',
            facilities: 'FACILITIES',
            cost: 'COST',
            costTotalProgramFee: 'Total Program Fee',
            costApplicationFee: 'Application fee (required to apply)',
            costIfAccepted: 'If accepted:',
            costDepositBullet: 'Deposit (to secure your spot)',
            costRemainingBullet: 'Remaining balance (due before program start)',
            costDeposit: 'Deposit',
            costRemaining: 'Remaining balance',
            costPaymentPlan: 'Pay over time with a flexible plan',
            costMonthlyPayment: 'Monthly payment',
            costPaymentPlanHelper: 'Payment plans are available to select applicants.',
            costJapanNotice: 'Notice (Japan)',
            cohortCapacity: 'COHORT',
            slotsRemainingValue: '<strong>{{a}}</strong> of <strong>{{b}}</strong> Slots Remaining',
            residence: 'RESIDENCE',
            included: 'INCLUDED',
            notIncluded: 'NOT INCLUDED',
            platform: 'PLATFORM',
            additionalInformation: 'Additional Information',
            faq: 'FAQ',
            programNotes: 'Program Notes',
            refundPolicy: 'Refund Policy',
            applicationFee: 'Application Fee',
            aboutProgram: 'About Program',
        };
    }

    _hasMainDetails() {
        if (!this._data) return false;
        const {
            keyDates,
            locations,
            facilities,
            costText,
            totalProgramFeeLine,
            applicationFeeLine,
            useStructuredCost,
            depositLine,
            remainingBalanceLine,
            maxPlanMonths,
            japanResidencyNotice,
            availableSlots: asideAvail,
            totalSlots: asideTotal,
            residences,
            included,
            notIncluded,
            platform,
            sidebarRunDates,
        } = this._data;
        const locale = typeof window.getLocale === 'function' ? window.getLocale() : 'en';
        const jn = (japanResidencyNotice && String(japanResidencyNotice).trim()) || '';
        const hasJapanLine = Boolean(locale === 'ja' && jn);
        const tpf = (totalProgramFeeLine && String(totalProgramFeeLine).trim()) || '';
        const hasStructured =
            useStructuredCost &&
            (Boolean(tpf) ||
                Boolean((applicationFeeLine && String(applicationFeeLine).trim())) ||
                Boolean((depositLine && String(depositLine).trim())) ||
                Boolean((remainingBalanceLine && String(remainingBalanceLine).trim())) ||
                (typeof maxPlanMonths === 'number' && maxPlanMonths > 1) ||
                hasJapanLine);
        const hasDates =
            Array.isArray(keyDates) &&
            keyDates.some((d) => {
                if (!d || typeof d !== 'object') return false;
                return Boolean(
                    String(d.sectionTitle || '').trim() ||
                        String(d.date || '').trim() ||
                        String(d.description || '').trim(),
                );
            });
        const resList = Array.isArray(residences) ? residences : [];
        const hasResidence = resList.some((r) => {
            if (!r || typeof r !== 'object') return false;
            const n = String(r.name || '').trim();
            const h = String(r.href || '').trim();
            return Boolean(n || h);
        });
        const inc = Array.isArray(included) ? included : [];
        const ninc = Array.isArray(notIncluded) ? notIncluded : [];
        const hasCohortSlots =
            typeof asideAvail === 'number' &&
            Number.isFinite(asideAvail) &&
            typeof asideTotal === 'number' &&
            Number.isFinite(asideTotal);
        const rDates = sidebarRunDates;
        const hasRunDateSidebar = Boolean(
            rDates && typeof rDates === 'object' && (String(rDates.start || '').trim() || String(rDates.end || '').trim()),
        );
        const hasLegacyCostPair =
            !useStructuredCost &&
            Boolean(
                (costText && String(costText).trim()) || (applicationFeeLine && String(applicationFeeLine).trim()),
            );
        const hasSidebar = Boolean(
            (Array.isArray(locations) && locations.some((x) => String(x || '').trim())) ||
                (Array.isArray(facilities) && facilities.some((x) => String(x || '').trim())) ||
                hasStructured ||
                hasLegacyCostPair ||
                hasResidence ||
                inc.some((x) => String(x || '').trim()) ||
                ninc.some((x) => String(x || '').trim()) ||
                (platform && String(platform).trim()) ||
                hasCohortSlots ||
                hasRunDateSidebar,
        );
        return hasDates || hasSidebar;
    }

    _hasAdditionalInfo() {
        const a = this._data?.additionalInfo;
        if (!a || typeof a !== 'object') return false;
        const appFee =
            typeof a.applicationFee === 'string' && String(a.applicationFee).trim().length > 0;
        const about =
            typeof a.aboutProgram === 'string' && String(a.aboutProgram).trim().length > 0;
        const faq = Array.isArray(a.faq) && a.faq.length > 0;
        const notes = Array.isArray(a.programNotes) && a.programNotes.length > 0;
        const refund = Array.isArray(a.refundPolicy) && a.refundPolicy.length > 0;
        return appFee || about || faq || notes || refund;
    }

    _hasContent() {
        if (!this._data) return false;
        return this._hasMainDetails() || this._hasAdditionalInfo();
    }

    _appendTimelineDescription(parent, desc) {
        const lines = String(desc || '').split('\n');
        /** @type {string[]} */
        let bulletRun = [];
        const flushBullets = () => {
            if (!bulletRun.length) return;
            const ul = document.createElement('ul');
            ul.className = 'timeline-desc-list';
            bulletRun.forEach((text) => {
                const li = document.createElement('li');
                li.textContent = text;
                ul.appendChild(li);
            });
            parent.appendChild(ul);
            bulletRun = [];
        };
        for (const raw of lines) {
            const line = raw.trim();
            if (!line) continue;
            const bulletMatch = line.match(/^[-•*]\s+(.*)$/);
            if (bulletMatch) {
                bulletRun.push(bulletMatch[1]);
            } else {
                flushBullets();
                const p = document.createElement('p');
                p.className = 'timeline-desc';
                p.textContent = line;
                parent.appendChild(p);
            }
        }
        flushBullets();
    }

    _createTimelineDateItem(dateStr, desc) {
        const li = document.createElement('li');
        li.className = 'timeline-item';
        const dot = document.createElement('span');
        dot.className = 'timeline-dot';
        dot.setAttribute('aria-hidden', 'true');
        const textWrap = document.createElement('div');
        textWrap.className = 'timeline-text';
        if (dateStr) {
            const dateRow = document.createElement('div');
            dateRow.className = 'timeline-date-row';
            const ds = document.createElement('span');
            ds.className = 'timeline-date';
            ds.textContent = dateStr;
            dateRow.appendChild(ds);
            textWrap.appendChild(dateRow);
        }
        if (desc) {
            this._appendTimelineDescription(textWrap, desc);
        }
        li.appendChild(dot);
        li.appendChild(textWrap);
        return li;
    }

    _populateTimeline(timelineBlocksEl, keyDates) {
        if (!timelineBlocksEl) return;
        timelineBlocksEl.innerHTML = '';
        const dates = Array.isArray(keyDates) ? keyDates : [];
        const hasSections = dates.some((d) => String(d?.sectionTitle || '').trim());

        if (!hasSections) {
            const ul = document.createElement('ul');
            ul.className = 'timeline';
            ul.setAttribute('role', 'list');
            dates.forEach((d) => {
                const dateStr = (d?.date || '').trim();
                const desc = (d?.description || '').trim();
                if (!dateStr && !desc) return;
                ul.appendChild(this._createTimelineDateItem(dateStr, desc));
            });
            if (ul.children.length) timelineBlocksEl.appendChild(ul);
            timelineBlocksEl.hidden = timelineBlocksEl.children.length === 0;
            return;
        }

        /** @type {{ title: string, items: Array<{ dateStr: string, desc: string }> }} */
        let current = { title: '', items: [] };
        /** @type {Array<{ title: string, items: Array<{ dateStr: string, desc: string }> }>} */
        const blocks = [];
        const pushCurrent = () => {
            if (!current.title && !current.items.length) return;
            blocks.push(current);
        };

        dates.forEach((d) => {
            const sectionTitle = String(d?.sectionTitle || '').trim();
            if (sectionTitle) {
                pushCurrent();
                current = { title: sectionTitle, items: [] };
                return;
            }
            const dateStr = (d?.date || '').trim();
            const desc = (d?.description || '').trim();
            if (!dateStr && !desc) return;
            current.items.push({ dateStr, desc });
        });
        pushCurrent();

        blocks.forEach((block) => {
            const section = document.createElement('section');
            section.className = 'timeline-block';

            if (block.title) {
                const heading = document.createElement('h3');
                heading.className = 'timeline-block-title';
                heading.textContent = block.title;
                section.appendChild(heading);
            }

            if (block.items.length) {
                const ul = document.createElement('ul');
                ul.className = 'timeline';
                ul.setAttribute('role', 'list');
                block.items.forEach(({ dateStr, desc }) => {
                    ul.appendChild(this._createTimelineDateItem(dateStr, desc));
                });
                section.appendChild(ul);
            }

            timelineBlocksEl.appendChild(section);
        });

        timelineBlocksEl.hidden = timelineBlocksEl.children.length === 0;
    }

    _appendTextBlocks(parent, text) {
        if (!text || typeof text !== 'string') return;
        const chunks = text.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
        const parts = chunks.length ? chunks : [text.trim()];
        parts.forEach((para) => {
            const p = document.createElement('p');
            p.className = 'ai-body-text';
            p.textContent = para;
            parent.appendChild(p);
        });
    }

    _appendBulletList(parent, items) {
        if (!Array.isArray(items) || !items.length) return;
        const ul = document.createElement('ul');
        ul.className = 'ai-bullet-list';
        items.forEach((t) => {
            const s = typeof t === 'string' ? t.trim() : String(t || '').trim();
            if (!s) return;
            const li = document.createElement('li');
            li.textContent = s;
            ul.appendChild(li);
        });
        if (ul.children.length) parent.appendChild(ul);
    }

    /**
     * @param {HTMLElement} parent
     * @param {string} text
     */
    _appendTextLinesAsBulletList(parent, text) {
        this._appendBulletList(parent, splitTextLinesForBullets(text));
    }

    _closeAllAiPanels() {
        const root = this.shadowRoot;
        if (!root) return;
        ['appfee', 'about', 'faq', 'notes', 'refund'].forEach((key) => {
            const panel = root.querySelector(`#ai-panel-${key}`);
            const trig = root.querySelector(`#ai-trigger-${key}`);
            if (panel) {
                panel.hidden = true;
            }
            if (trig) {
                trig.setAttribute('aria-selected', 'false');
                trig.classList.remove('is-active');
            }
        });
    }

    _openAiPanel(key) {
        const root = this.shadowRoot;
        if (!root) return;
        ['appfee', 'about', 'faq', 'notes', 'refund'].forEach((k) => {
            const panel = root.querySelector(`#ai-panel-${k}`);
            const trig = root.querySelector(`#ai-trigger-${k}`);
            const on = k === key;
            if (panel) panel.hidden = !on;
            if (trig) {
                trig.setAttribute('aria-selected', on ? 'true' : 'false');
                trig.classList.toggle('is-active', on);
            }
        });
    }

    /**
     * @param {number} [sectionIndex] — 0-based index in `refundPolicy`; drives labels like "1. Title" and "3.1 Subtitle".
     */
    _appendRefundSection(container, section, sectionIndex = 0) {
        if (!section || typeof section !== 'object') return;
        const title = (section.title || '').trim();
        const info = (section.information || '').trim();
        const hasBullets = Array.isArray(section.bulletPoints) && section.bulletPoints.length > 0;
        const hasSubs = Array.isArray(section.subSections) && section.subSections.length > 0;
        if (!title && !info && !hasBullets && !hasSubs) return;

        const n = sectionIndex + 1;

        const article = document.createElement('article');
        article.className = 'refund-policy-section';
        if (title) {
            const h = document.createElement('h4');
            h.className = 'refund-section-title';
            h.textContent = `${n}. ${title}`;
            article.appendChild(h);
        }
        if (info) {
            this._appendTextBlocks(article, section.information);
        }
        this._appendBulletList(article, section.bulletPoints);
        const subs = section.subSections;
        if (Array.isArray(subs)) {
            subs.forEach((sub, subIdx) => {
                if (!sub || typeof sub !== 'object') return;
                const st = (sub.title || '').trim();
                if (st) {
                    const sh = document.createElement('h5');
                    sh.className = 'refund-subsection-title';
                    sh.textContent = `${n}.${subIdx + 1} ${st}`;
                    article.appendChild(sh);
                }
                if (sub.information) {
                    this._appendTextBlocks(article, sub.information);
                }
                this._appendBulletList(article, sub.bulletPoints);
            });
        }
        container.appendChild(article);
    }

    _populate() {
        const root = this.shadowRoot;
        if (!root || !this._data) return;

        const titleEl = root.querySelector('.details-title');
        const headerRow = root.querySelector('.header-row');
        const columnsEl = root.querySelector('.columns');
        const timelineBlocksEl = root.querySelector('.timeline-blocks');
        const sidebarEl = root.querySelector('.sidebar');
        const beginBtn = root.querySelector('.begin-application');
        const additionalSection = root.querySelector('.additional-info');
        const additionalHeading = root.querySelector('.additional-info-heading');
        const triggerAppfee = root.querySelector('#ai-trigger-appfee');
        const triggerAbout = root.querySelector('#ai-trigger-about');
        const triggerFaq = root.querySelector('#ai-trigger-faq');
        const triggerNotes = root.querySelector('#ai-trigger-notes');
        const triggerRefund = root.querySelector('#ai-trigger-refund');
        const panelAppfee = root.querySelector('#ai-panel-appfee');
        const panelAbout = root.querySelector('#ai-panel-about');
        const panelFaq = root.querySelector('#ai-panel-faq');
        const panelNotes = root.querySelector('#ai-panel-notes');
        const panelRefund = root.querySelector('#ai-panel-refund');

        if (!this._hasContent()) {
            this.style.display = 'none';
            return;
        }
        this.style.display = '';

        const {
            headline,
            keyDates,
            locations,
            facilities,
            costText,
            totalProgramFeeLine,
            applicationFeeLine,
            useStructuredCost,
            depositLine,
            remainingBalanceLine,
            maxPlanMonths,
            japanResidencyNotice,
            availableSlots,
            totalSlots,
            residences,
            included,
            notIncluded,
            platform,
            additionalInfo,
            sidebarRunDates: sidebarRunDatesPayload,
        } = this._data;
        const L = this._labels();
        const head = (headline || '').trim();
        const hasMain = this._hasMainDetails();

        if (titleEl) titleEl.textContent = head;
        if (headerRow) headerRow.hidden = !(hasMain && head);
        if (columnsEl) columnsEl.hidden = !hasMain;

        this._populateTimeline(timelineBlocksEl, keyDates);

        if (sidebarEl) {
            const loc = Array.isArray(locations)
                ? locations.map((x) => String(x || '').trim()).filter(Boolean)
                : [];
            const fac = Array.isArray(facilities)
                ? facilities.map((x) => String(x || '').trim()).filter(Boolean)
                : [];
            const cost = (costText || '').trim();
            const totalProgramLine = (totalProgramFeeLine || '').trim();
            const appFeeSidebar = (applicationFeeLine || '').trim();
            const depLine = (depositLine || '').trim();
            const remLine = (remainingBalanceLine || '').trim();
            const locale = typeof window.getLocale === 'function' ? window.getLocale() : 'en';
            const jnLine = (japanResidencyNotice || '').trim();
            const planM = typeof maxPlanMonths === 'number' && Number.isFinite(maxPlanMonths) ? Math.max(0, Math.floor(maxPlanMonths)) : 0;
            const useStruct = useStructuredCost === true;
            const resRaw = Array.isArray(residences) ? residences : [];
            const residenceRows = resRaw
                .map((r) => {
                    if (!r || typeof r !== 'object') return null;
                    const name = String(r.name || '').trim();
                    const href = String(r.href || '').trim();
                    if (!name && !href) return null;
                    return { name, href };
                })
                .filter(Boolean)
                .slice(0, 5);
            const incList = Array.isArray(included)
                ? included.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 10)
                : [];
            const excList = Array.isArray(notIncluded)
                ? notIncluded.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 5)
                : [];
            const plat = String(platform || '').trim();
            const slotA = availableSlots;
            const slotB = totalSlots;
            const showCohortSlots =
                typeof slotA === 'number' &&
                Number.isFinite(slotA) &&
                typeof slotB === 'number' &&
                Number.isFinite(slotB);
            const runDt = sidebarRunDatesPayload && typeof sidebarRunDatesPayload === 'object' ? sidebarRunDatesPayload : null;
            const runDateStart = String(runDt?.start || '').trim();
            const runDateEnd = String(runDt?.end || '').trim();

            sidebarEl.innerHTML = '';
            /** @type {Array<[string, 'list' | 'text' | 'residences' | 'cost_pair' | 'cost_details' | 'slots' | 'date_range', unknown]>} */
            const costPayload = useStruct
                ? {
                      totalProgram: totalProgramLine,
                      appFee: appFeeSidebar,
                      deposit: depLine,
                      remaining: remLine,
                      maxPlanMonths: planM,
                      japanNotice: locale === 'ja' ? jnLine : '',
                  }
                : { main: cost, extra: appFeeSidebar };
            const blocks = [
                [L.dates, 'date_range', { start: runDateStart, end: runDateEnd }],
                [L.locations, 'list', loc],
                [L.facilities, 'list', fac],
                [L.cost, useStruct ? 'cost_details' : 'cost_pair', costPayload],
                [L.cohortCapacity, 'slots', { available: slotA, total: slotB, show: showCohortSlots }],
                [L.residence, 'residences', residenceRows],
                [L.included, 'list', incList],
                [L.notIncluded, 'list', excList],
                [L.platform, 'text', plat],
            ];
            blocks.forEach(([label, kind, val]) => {
                if (kind === 'date_range') {
                    const o = /** @type {{ start?: string, end?: string }} */ (val);
                    const st = String(o?.start || '').trim();
                    const en = String(o?.end || '').trim();
                    if (!st && !en) return;
                    const block = document.createElement('div');
                    block.className = 'sidebar-block';
                    const mainLab = document.createElement('div');
                    mainLab.className = 'sidebar-label';
                    mainLab.textContent = label;
                    block.appendChild(mainLab);
                    const row = document.createElement('div');
                    row.className =
                        st && en
                            ? 'sidebar-dates-row sidebar-dates-row--pair'
                            : 'sidebar-dates-row sidebar-dates-row--single';
                    /**
                     * @param {string} sublab
                     * @param {string} value
                     */
                    const addCol = (sublab, value) => {
                        const col = document.createElement('div');
                        col.className = 'sidebar-dates-col';
                        const sl = document.createElement('div');
                        sl.className = 'sidebar-sublabel';
                        sl.textContent = sublab;
                        const p = document.createElement('p');
                        p.className = 'sidebar-value';
                        p.textContent = value;
                        col.appendChild(sl);
                        col.appendChild(p);
                        row.appendChild(col);
                    };
                    if (st) addCol(L.runDateStart, st);
                    if (en) addCol(L.runDateEnd, en);
                    block.appendChild(row);
                    sidebarEl.appendChild(block);
                    return;
                }
                if (kind === 'slots') {
                    const o = /** @type {{ available?: unknown, total?: unknown, show?: boolean }} */ (val);
                    if (!o || !o.show) return;
                    const av = o.available;
                    const tot = o.total;
                    if (typeof av !== 'number' || typeof tot !== 'number' || !Number.isFinite(av) || !Number.isFinite(tot)) {
                        return;
                    }
                    const a = Math.max(0, Math.floor(av));
                    const t = Math.max(0, Math.floor(tot));
                    const block = document.createElement('div');
                    block.className = 'sidebar-block';
                    const lab = document.createElement('div');
                    lab.className = 'sidebar-label';
                    lab.textContent = label;
                    const p = document.createElement('p');
                    p.className = 'sidebar-value sidebar-slots-value';
                    p.innerHTML = String(L.slotsRemainingValue || '')
                        .replace('{{a}}', String(a))
                        .replace('{{b}}', String(t));
                    block.appendChild(lab);
                    block.appendChild(p);
                    sidebarEl.appendChild(block);
                    return;
                }
                if (kind === 'list') {
                    const arr = /** @type {string[]} */ (val);
                    if (!Array.isArray(arr) || !arr.length) return;
                    const block = document.createElement('div');
                    block.className = 'sidebar-block';
                    const lab = document.createElement('div');
                    lab.className = 'sidebar-label';
                    lab.textContent = label;
                    const ul = document.createElement('ul');
                    ul.className = 'sidebar-value-list';
                    for (const row of arr) {
                        const li = document.createElement('li');
                        li.textContent = `- ${row}`;
                        ul.appendChild(li);
                    }
                    block.appendChild(lab);
                    block.appendChild(ul);
                    sidebarEl.appendChild(block);
                    return;
                }
                if (kind === 'residences') {
                    const rows = /** @type {{ name: string, href: string }[]} */ (val);
                    if (!Array.isArray(rows) || !rows.length) return;
                    const block = document.createElement('div');
                    block.className = 'sidebar-block';
                    const lab = document.createElement('div');
                    lab.className = 'sidebar-label';
                    lab.textContent = label;
                    const ul = document.createElement('ul');
                    ul.className = 'sidebar-value-list sidebar-value-list--residences';
                    for (const row of rows) {
                        const li = document.createElement('li');
                        li.appendChild(document.createTextNode('- '));
                        if (row.href) {
                            const a = document.createElement('a');
                            a.className = 'sidebar-residence-link';
                            a.href = row.href;
                            a.target = '_blank';
                            a.rel = 'noopener noreferrer';
                            a.textContent = row.name || row.href;
                            li.appendChild(a);
                        } else {
                            li.appendChild(document.createTextNode(row.name));
                        }
                        ul.appendChild(li);
                    }
                    block.appendChild(lab);
                    block.appendChild(ul);
                    sidebarEl.appendChild(block);
                    return;
                }
                if (kind === 'cost_details') {
                    const o = /** @type {{ totalProgram?: string, appFee: string, deposit: string, remaining: string, maxPlanMonths: number, japanNotice: string }} */ (val);
                    const totalP = String(o?.totalProgram || '').trim();
                    const appFee = String(o?.appFee || '').trim();
                    const dep = String(o?.deposit || '').trim();
                    const rem = String(o?.remaining || '').trim();
                    const maxM = typeof o?.maxPlanMonths === 'number' && o.maxPlanMonths > 0 ? Math.floor(o.maxPlanMonths) : 0;
                    const jn = String(o?.japanNotice || '').trim();
                    if (!totalP && !appFee && !dep && !rem && !jn && maxM < 2) return;
                    const block = document.createElement('div');
                    block.className = 'sidebar-block sidebar-cost-structured';
                    const mainLab = document.createElement('div');
                    mainLab.className = 'sidebar-label';
                    mainLab.textContent = label;
                    block.appendChild(mainLab);
                    /**
                     * @param {string} sublab
                     * @param {string} value
                     */
                    const addTightStack = (sublab, value) => {
                        if (!value) return;
                        const stack = document.createElement('div');
                        stack.className = 'sidebar-cost-stack';
                        const sl = document.createElement('div');
                        sl.className = 'sidebar-sublabel sidebar-cost-stack-label';
                        sl.textContent = sublab;
                        const p = document.createElement('p');
                        p.className = 'sidebar-value sidebar-cost-stack-value';
                        p.textContent = value;
                        stack.appendChild(sl);
                        stack.appendChild(p);
                        block.appendChild(stack);
                    };
                    addTightStack(L.costTotalProgramFee, totalP);
                    addTightStack(L.costApplicationFee, appFee);
                    if (dep || rem) {
                        const ifWrap = document.createElement('div');
                        ifWrap.className = 'sidebar-cost-if-accepted';
                        const h = document.createElement('div');
                        h.className = 'sidebar-cost-if-accepted-heading';
                        h.textContent = L.costIfAccepted;
                        ifWrap.appendChild(h);
                        /**
                         * @param {string} bulletText
                         * @param {string} amount
                         */
                        const addBullet = (bulletText, amount) => {
                            if (!amount) return;
                            const item = document.createElement('div');
                            item.className = 'sidebar-cost-bullet';
                            const line = document.createElement('div');
                            line.className = 'sidebar-cost-bullet-line';
                            line.textContent = `- ${bulletText}`;
                            const am = document.createElement('p');
                            am.className = 'sidebar-value sidebar-cost-bullet-amount';
                            am.textContent = amount;
                            item.appendChild(line);
                            item.appendChild(am);
                            ifWrap.appendChild(item);
                        };
                        addBullet(L.costDepositBullet, dep);
                        addBullet(L.costRemainingBullet, rem);
                        block.appendChild(ifWrap);
                    }
                    if (maxM >= 2) {
                        this._costPlanDisclosureUid += 1;
                        const panelId = `sidebar-cost-plan-${this._costPlanDisclosureUid}`;
                        const planSection = document.createElement('div');
                        planSection.className = 'sidebar-cost-plan-extras';
                        const trig = document.createElement('button');
                        trig.type = 'button';
                        trig.className = 'sidebar-cost-plan-trigger';
                        trig.setAttribute('aria-expanded', 'false');
                        trig.setAttribute('aria-controls', panelId);
                        const arr = document.createElement('span');
                        arr.className = 'sidebar-cost-plan-arrow';
                        arr.setAttribute('aria-hidden', 'true');
                        arr.textContent = '→';
                        const tlab = document.createElement('span');
                        tlab.className = 'sidebar-cost-plan-trigger-label';
                        tlab.textContent = L.costPaymentPlan;
                        trig.appendChild(arr);
                        trig.appendChild(tlab);
                        const panel = document.createElement('div');
                        panel.id = panelId;
                        panel.className = 'sidebar-cost-plan-panel';
                        panel.setAttribute('role', 'group');
                        panel.setAttribute('aria-label', L.costPaymentPlan);
                        panel.hidden = true;
                        const sel = document.createElement('select');
                        sel.className = 'sidebar-cost-select';
                        sel.setAttribute('aria-label', L.costPaymentPlan);
                        for (let m = 2; m <= maxM; m++) {
                            const opt = document.createElement('option');
                            opt.value = String(m);
                            opt.textContent = String(m);
                            if (m === maxM) opt.selected = true;
                            sel.appendChild(opt);
                        }
                        const help = document.createElement('p');
                        help.className = 'cost-plan-helper';
                        help.textContent = L.costPaymentPlanHelper;
                        const mRow = document.createElement('div');
                        mRow.className = 'sidebar-cost-subrow';
                        const mLab = document.createElement('div');
                        mLab.className = 'sidebar-sublabel';
                        mLab.textContent = L.costMonthlyPayment;
                        const mVal = document.createElement('p');
                        mVal.className = 'sidebar-value sidebar-cost-monthly';
                        mRow.appendChild(mLab);
                        mRow.appendChild(mVal);
                        panel.appendChild(sel);
                        panel.appendChild(help);
                        panel.appendChild(mRow);
                        planSection.appendChild(trig);
                        planSection.appendChild(panel);
                        block.appendChild(planSection);
                        const updateM = () => {
                            const raw = parseInt(String(sel.value), 10);
                            const v = Number.isFinite(raw) && raw >= 2 ? raw : 2;
                            mVal.textContent = formatMonthlyFromRemainingAndMonths(rem, v);
                        };
                        sel.addEventListener('change', updateM);
                        updateM();
                        trig.addEventListener('click', () => {
                            const willOpen = panel.hidden;
                            panel.hidden = !willOpen;
                            trig.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
                            trig.classList.toggle('is-open', willOpen);
                        });
                    }
                    if (jn) {
                        const row = document.createElement('div');
                        row.className = 'sidebar-cost-stack sidebar-cost-japan';
                        const sl = document.createElement('div');
                        sl.className = 'sidebar-sublabel sidebar-cost-stack-label';
                        sl.textContent = L.costJapanNotice;
                        const p = document.createElement('p');
                        p.className = 'sidebar-value sidebar-cost-stack-value';
                        p.textContent = jn;
                        row.appendChild(sl);
                        row.appendChild(p);
                        block.appendChild(row);
                    }
                    sidebarEl.appendChild(block);
                    return;
                }
                if (kind === 'cost_pair') {
                    const pair = /** @type {{ main: string, extra: string }} */ (val);
                    const main = String(pair?.main || '').trim();
                    const extra = String(pair?.extra || '').trim();
                    if (!main && !extra) return;
                    const block = document.createElement('div');
                    block.className = 'sidebar-block';
                    const lab = document.createElement('div');
                    lab.className = 'sidebar-label';
                    lab.textContent = label;
                    block.appendChild(lab);
                    if (main) {
                        const p = document.createElement('p');
                        p.className = 'sidebar-value';
                        p.textContent = main;
                        block.appendChild(p);
                    }
                    if (extra) {
                        const p2 = document.createElement('p');
                        p2.className = 'sidebar-value sidebar-value--addon';
                        p2.textContent = extra;
                        block.appendChild(p2);
                    }
                    sidebarEl.appendChild(block);
                    return;
                }
                const text = String(val || '').trim();
                if (!text) return;
                const block = document.createElement('div');
                block.className = 'sidebar-block';
                const lab = document.createElement('div');
                lab.className = 'sidebar-label';
                lab.textContent = label;
                const p = document.createElement('p');
                p.className = 'sidebar-value';
                p.textContent = text;
                block.appendChild(lab);
                block.appendChild(p);
                sidebarEl.appendChild(block);
            });
            sidebarEl.hidden = sidebarEl.children.length === 0;
        }

        const applicationsOpen = this._data.applicationsOpen !== false;
        if (beginBtn) {
            beginBtn.hidden = !hasMain || !applicationsOpen;
            if (applicationsOpen) {
                beginBtn.onclick = () => void revealProgramApplicationOrOpenJoin();
                void this._syncBeginApplicationButtonLabel(beginBtn);
            } else {
                beginBtn.onclick = null;
                beginBtn.textContent = '';
                beginBtn.classList.remove('program-application-cta--review');
            }
        }

        const hasAdd = this._hasAdditionalInfo();
        if (additionalSection) additionalSection.hidden = !hasAdd;
        if (hasAdd && additionalHeading) additionalHeading.textContent = L.additionalInformation;

        const a = additionalInfo && typeof additionalInfo === 'object' ? additionalInfo : null;

        if (panelAppfee) {
            panelAppfee.innerHTML = '';
            const rawFee = a?.applicationFee;
            const feeText = typeof rawFee === 'string' ? rawFee.trim() : '';
            if (feeText) {
                this._appendTextLinesAsBulletList(panelAppfee, feeText);
            }
        }
        if (triggerAppfee) {
            const vis = Boolean(panelAppfee?.children?.length);
            triggerAppfee.hidden = !vis;
            const lab = triggerAppfee.querySelector('.ai-trigger-label');
            if (lab) lab.textContent = L.applicationFee;
            triggerAppfee.setAttribute('aria-controls', 'ai-panel-appfee');
        }

        if (panelAbout) {
            panelAbout.innerHTML = '';
            const rawAbout = a?.aboutProgram;
            const aboutText = typeof rawAbout === 'string' ? rawAbout.trim() : '';
            if (aboutText) {
                this._appendTextBlocks(panelAbout, aboutText);
            }
        }
        if (triggerAbout) {
            const vis = Boolean(panelAbout?.children?.length);
            triggerAbout.hidden = !vis;
            const lab = triggerAbout.querySelector('.ai-trigger-label');
            if (lab) lab.textContent = L.aboutProgram;
            triggerAbout.setAttribute('aria-controls', 'ai-panel-about');
        }

        if (panelFaq) {
            panelFaq.innerHTML = '';
            const faqItems = Array.isArray(a?.faq) ? a.faq : [];
            faqItems.forEach((item) => {
                if (!item || typeof item !== 'object') return;
                const qText = (item.question || '').trim();
                const aText = (item.answer || '').trim();
                if (!qText && !aText) return;
                if (qText) {
                    const qp = document.createElement('p');
                    qp.className = 'ai-qa-line ai-question';
                    qp.textContent = `Q. ${qText}`;
                    panelFaq.appendChild(qp);
                }
                if (aText) {
                    const ap = document.createElement('p');
                    ap.className = 'ai-qa-line ai-answer';
                    ap.textContent = `A. ${aText}`;
                    panelFaq.appendChild(ap);
                }
            });
        }
        if (triggerFaq) {
            const vis = Boolean(panelFaq?.children?.length);
            triggerFaq.hidden = !vis;
            const lab = triggerFaq.querySelector('.ai-trigger-label');
            if (lab) lab.textContent = L.faq;
            triggerFaq.setAttribute('aria-controls', 'ai-panel-faq');
        }

        if (panelNotes) {
            panelNotes.innerHTML = '';
            const notes = Array.isArray(a?.programNotes) ? a.programNotes : [];
            notes.forEach((note) => {
                if (!note || typeof note !== 'object') return;
                const nt = (note.title || '').trim();
                const ni = (note.information || '').trim();
                if (!nt && !ni) return;
                if (nt) {
                    const nh = document.createElement('h4');
                    nh.className = 'ai-notes-title';
                    nh.textContent = nt;
                    panelNotes.appendChild(nh);
                }
                if (ni) {
                    this._appendTextLinesAsBulletList(panelNotes, ni);
                }
            });
        }
        if (triggerNotes) {
            const vis = Boolean(panelNotes?.children?.length);
            triggerNotes.hidden = !vis;
            const lab = triggerNotes.querySelector('.ai-trigger-label');
            if (lab) lab.textContent = L.programNotes;
            triggerNotes.setAttribute('aria-controls', 'ai-panel-notes');
        }

        if (panelRefund) {
            panelRefund.innerHTML = '';
            const policies = Array.isArray(a?.refundPolicy) ? a.refundPolicy : [];
            policies.forEach((sec, idx) => this._appendRefundSection(panelRefund, sec, idx));
        }
        if (triggerRefund) {
            const vis = Boolean(panelRefund?.children?.length);
            triggerRefund.hidden = !vis;
            const lab = triggerRefund.querySelector('.ai-trigger-label');
            if (lab) lab.textContent = L.refundPolicy;
            triggerRefund.setAttribute('aria-controls', 'ai-panel-refund');
        }

        this._closeAllAiPanels();
    }

    /**
     * Match intro CTAs: same primary label as program view (no guest vs signed-in split).
     * @param {HTMLButtonElement} beginBtn
     */
    async _syncBeginApplicationButtonLabel(beginBtn) {
        try {
            const { getAuthSnapshot } = await import('../../utils/icAuth.js');
            const { getMyArtistRecord } = await import('../../utils/database.js');
            const snap = await getAuthSnapshot();
            let alreadyApplied = false;
            const pid = String(this._data?.programId || '').trim();
            if (pid && snap.authenticated) {
                try {
                    const rec = await getMyArtistRecord();
                    const raw = rec ? rec.applied_json ?? rec.appliedJson : null;
                    if (raw) {
                        const j = typeof raw === 'string' ? JSON.parse(raw) : raw;
                        alreadyApplied = Boolean(j && typeof j === 'object' && j[pid]);
                    }
                } catch {
                    alreadyApplied = false;
                }
            }
            beginBtn.textContent = alreadyApplied
                ? programApplicationReviewLabel()
                : programApplicationCtaLabelForAuth(true);
            beginBtn.classList.toggle('program-application-cta--review', alreadyApplied);
        } catch {
            beginBtn.textContent = programApplicationCtaLabelForAuth(true);
            beginBtn.classList.remove('program-application-cta--review');
        }
    }

    _refreshBeginApplicationCtaLabel() {
        const root = this.shadowRoot;
        if (!root || !this._data) return;
        if (this._data.applicationsOpen === false) return;
        const beginBtn = root.querySelector('.begin-application');
        if (!beginBtn || beginBtn.hidden) return;
        void this._syncBeginApplicationButtonLabel(beginBtn);
    }

    connectedCallback() {
        if (!this._programCtaRefreshBound) {
            this._programCtaRefreshBound = true;
            this._onProgramCtaRefresh = () => this._refreshBeginApplicationCtaLabel();
            window.addEventListener('fusion-auth-change', this._onProgramCtaRefresh);
            window.addEventListener('fusion-localechange', this._onProgramCtaRefresh);
            window.addEventListener('fusion-program-application-submitted', this._onProgramCtaRefresh);
        }
        if (!this._navBound) {
            this._navBound = true;
        }
        if (!this._aiTriggerBound) {
            this._aiTriggerBound = true;
            this.shadowRoot.addEventListener('click', (e) => {
                const t = e.target.closest('.ai-trigger');
                if (!t || t.hasAttribute('hidden')) return;
                const key = t.getAttribute('data-panel');
                if (!key || !['appfee', 'about', 'faq', 'notes', 'refund'].includes(key)) return;
                const isOpen = t.getAttribute('aria-selected') === 'true';
                if (isOpen) {
                    this._closeAllAiPanels();
                } else {
                    this._openAiPanel(key);
                }
            });
        }
    }

    disconnectedCallback() {
        if (this._programCtaRefreshBound && this._onProgramCtaRefresh) {
            window.removeEventListener('fusion-auth-change', this._onProgramCtaRefresh);
            window.removeEventListener('fusion-localechange', this._onProgramCtaRefresh);
            window.removeEventListener('fusion-program-application-submitted', this._onProgramCtaRefresh);
            this._programCtaRefreshBound = false;
            this._onProgramCtaRefresh = null;
        }
    }

    render() {
        if (!this._data) {
            this.shadow.innerHTML = `
            <style>
                ${PH_LOADER_BASE_STYLES}
                ${PROGRAM_DETAILS_PENDING_WRAPPER_STYLES}
            </style>
            ${programHeroLoaderHtml({ wrapperClass: 'program-details-pending-loader', ariaLabel: 'Loading program details' })}
        `;
            return;
        }

        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    box-sizing: border-box;
                    padding: 2.5rem 0 3rem;
                }

                .program-details-inner {
                    width: 100%;
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 clamp(1rem, 4vw, 2rem);
                    box-sizing: border-box;
                    margin-top: 5%;
                    margin-bottom: 5%;
                }

                .header-row {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: clamp(0.75rem, 2vw, 1.5rem);
                    margin-bottom: clamp(1.75rem, 4vw, 2.5rem);
                }

                .details-title {
                    margin: 0;
                    flex: 0 1 auto;
                    text-align: center;
                    font-size: clamp(1rem, 1.3vw, 1.5rem);
                    font-variation-settings: var(--fv-body-wide);
                    color: var(--c2);
                    letter-spacing: 0.06em;
                }

                .columns {
                    display: grid;
                    grid-template-columns: 60% 40%;
                    gap: clamp(1.5rem, 4vw, 3rem);
                    align-items: start;
                }

                @media (max-width: 768px) {
                    .columns {
                        grid-template-columns: 1fr;
                    }
                }

                .timeline-col {
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    gap: 1.75rem;
                }

                .timeline-blocks {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                }

                .timeline-block {
                    display: flex;
                    flex-direction: column;
                    gap: 1.1rem;
                }

                .timeline-block-title {
                    margin: 0;
                    font-size: clamp(1.05rem, 1.6vw, 1.35rem);
                    font-variation-settings: var(--fv-emphasis);
                    color: var(--c2);
                    letter-spacing: 0.02em;
                    line-height: 1.3;
                }

                .timeline {
                    list-style: none;
                    margin: 0;
                    padding: 0 0 0 1.1rem;
                    border-left: 1px solid var(--c2);
                }

                .timeline-item {
                    position: relative;
                    padding-bottom: 1.35rem;
                }

                .timeline-item:last-child {
                    padding-bottom: 0;
                }

                .timeline-dot {
                    position: absolute;
                    left: -1.1rem;
                    top: 0.35rem;
                    width: 10px;
                    height: 10px;
                    margin-left: -5px;
                    border-radius: 50%;
                    background: var(--c2);
                }

                .timeline-text {
                    display: flex;
                    flex-direction: column;
                    gap: 0.35rem;
                    font-size: clamp(0.9rem, 1.2vw, 1.05rem);
                    color: var(--c2);
                    line-height: 1.45;
                    letter-spacing: 0.02em;
                }

                .timeline-date-row {
                    font-variation-settings: var(--fv-body-wide);
                }

                .timeline-date {
                    font-variation-settings: var(--fv-emphasis);
                }

                p.timeline-desc {
                    margin: 0;
                    font-variation-settings: var(--fv-body-wide);
                }

                .timeline-desc-list {
                    margin: 0.15rem 0 0;
                    padding-left: 1.15rem;
                    font-size: clamp(0.9rem, 1.2vw, 1.05rem);
                    color: var(--c2);
                    line-height: 1.45;
                    letter-spacing: 0.02em;
                    font-variation-settings: var(--fv-body-wide);
                }

                .timeline-desc-list li {
                    margin: 0.2rem 0;
                }

                .begin-application {
                    width: 100%;
                    max-width: 300px;
                    min-height: 48px;
                    padding: 0.65rem 1.25rem;
                    border: 1px solid rgba(0, 0, 0, 0.12);
                    cursor: pointer;
                    background: var(--c2);
                    color: var(--c3);
                    font-size: clamp(0.95rem, 1.1vw, 1.1rem);
                    font-variation-settings: var(--fv-cta);
                    letter-spacing: 0.04em;
                    transition: opacity 0.25s ease, transform 0.2s ease;
                    justify-self: center;
                    align-self: center;
                }

                .begin-application:hover {
                    background: var(--c3);
                    color: var(--c2);
                    transition: all 0.3s ease;
                    transform: translateY(-1px);
                }

                @keyframes program-application-cta-review-blink {
                    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.08); }
                    50% { opacity: 0.88; box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.06); }
                }

                .begin-application.program-application-cta--review {
                    background: var(--c5);
                    color: var(--c2);
                    border-color: rgba(0, 0, 0, 0.14);
                    animation: program-application-cta-review-blink 1.2s ease-in-out infinite;
                }

                .begin-application.program-application-cta--review:hover {
                    background: var(--c5);
                    color: var(--c2);
                    opacity: 0.95;
                    transform: translateY(-1px);
                }

                @media (prefers-reduced-motion: reduce) {
                    .begin-application.program-application-cta--review {
                        animation: none;
                    }
                }

                .sidebar {
                    background: var(--bg);
                    padding: clamp(1.25rem, 3vw, 1.75rem);
                    box-sizing: border-box;
                    border: 1px solid var(--c2);
                }

                .sidebar-block + .sidebar-block {
                    margin-top: 1.35rem;
                    padding-top: 1.35rem;
                    border-top: 1px solid rgba(0, 0, 0, 0.1);
                }

                .sidebar-label {
                    font-size: clamp(0.7rem, 0.95vw, 0.8rem);
                    font-variation-settings: var(--fv-label-strong);
                    letter-spacing: 0.14em;
                    text-transform: uppercase;
                    color: var(--c2);
                    opacity: 0.85;
                    margin-bottom: 0.45rem;
                }

                .sidebar-cost-structured .sidebar-label {
                    margin-bottom: 0.35rem;
                }
                .sidebar-cost-structured .sidebar-label + .sidebar-cost-stack,
                .sidebar-cost-structured .sidebar-label + .sidebar-cost-if-accepted,
                .sidebar-cost-structured .sidebar-label + .sidebar-cost-japan {
                    margin-top: 0.15rem;
                }
                .sidebar-cost-structured .sidebar-cost-stack + .sidebar-cost-stack {
                    margin-top: 0.7rem;
                }
                .sidebar-cost-stack {
                    min-width: 0;
                }
                .sidebar-cost-structured .sidebar-cost-stack-label {
                    margin-bottom: 0.1rem;
                    text-transform: none;
                    letter-spacing: 0.04em;
                    line-height: 1.3;
                }
                .sidebar-cost-structured .sidebar-cost-stack-value {
                    margin: 0;
                }
                .sidebar-cost-if-accepted {
                    margin-top: 0.7rem;
                }
                .sidebar-cost-stack + .sidebar-cost-if-accepted {
                    margin-top: 0.75rem;
                }
                .sidebar-cost-if-accepted-heading {
                    font-size: clamp(0.72rem, 0.92vw, 0.84rem);
                    font-variation-settings: var(--fv-label-strong);
                    color: var(--c2);
                    line-height: 1.3;
                    margin: 0 0 0.3rem 0;
                    text-transform: none;
                    letter-spacing: 0.04em;
                }
                .sidebar-cost-bullet {
                    min-width: 0;
                }
                .sidebar-cost-bullet + .sidebar-cost-bullet {
                    margin-top: 0.4rem;
                }
                .sidebar-cost-bullet-line {
                    font-size: clamp(0.9rem, 1.1vw, 1.02rem);
                    font-variation-settings: var(--fv-body-wide);
                    line-height: 1.4;
                    color: var(--c2);
                }
                .sidebar-cost-bullet-amount {
                    padding-left: 1.15em;
                    margin: 0.1rem 0 0 0;
                }
                .sidebar-cost-plan-extras {
                    margin-top: 0.8rem;
                }
                .sidebar-cost-if-accepted + .sidebar-cost-plan-extras {
                    margin-top: 0.75rem;
                }
                .sidebar-cost-structured
                    .sidebar-cost-stack
                    + .sidebar-cost-japan,
                .sidebar-cost-structured
                    .sidebar-cost-if-accepted
                    + .sidebar-cost-japan,
                .sidebar-cost-structured
                    .sidebar-cost-plan-extras
                    + .sidebar-cost-japan {
                    margin-top: 0.65rem;
                }
                .sidebar-cost-stack + .sidebar-cost-plan-extras {
                    margin-top: 0.75rem;
                }

                .sidebar-dates-row {
                    display: grid;
                    align-items: start;
                    gap: 0.5rem 0.9rem;
                    margin-top: 0.2rem;
                }
                .sidebar-dates-row--pair {
                    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
                }
                .sidebar-dates-row--single {
                    grid-template-columns: minmax(0, 1fr);
                }
                .sidebar-dates-col {
                    min-width: 0;
                }
                .sidebar-dates-col .sidebar-value {
                    overflow-wrap: anywhere;
                }

                .sidebar-value {
                    margin: 0;
                    font-size: clamp(0.9rem, 1.15vw, 1.05rem);
                    font-variation-settings: var(--fv-body-wide);
                    color: var(--c2);
                    line-height: 1.5;
                    letter-spacing: 0.02em;
                }

                .sidebar-value--addon {
                    margin-top: 0.4rem;
                }

                .sidebar-cost-subrow {
                    margin-top: 0.65rem;
                }

                .sidebar-cost-subrow:first-of-type {
                    margin-top: 0.35rem;
                }

                .sidebar-sublabel {
                    font-size: clamp(0.68rem, 0.85vw, 0.78rem);
                    font-variation-settings: var(--fv-label-strong);
                    letter-spacing: 0.06em;
                    text-transform: none;
                    color: var(--c2);
                    opacity: 0.9;
                    margin-bottom: 0.25rem;
                }

                .sidebar-cost-select {
                    width: 100%;
                    max-width: 100%;
                    box-sizing: border-box;
                    margin-top: 0.2rem;
                    padding: 0.35rem 0.5rem;
                    font: inherit;
                    font-size: clamp(0.88rem, 1.05vw, 0.98rem);
                    color: var(--c2);
                    background: var(--c3);
                    border: 1px solid var(--c2);
                }

                .cost-plan-helper {
                    margin: 0.35rem 0 0;
                    font-size: clamp(0.75rem, 0.9vw, 0.86rem);
                    line-height: 1.45;
                    font-variation-settings: var(--fv-body);
                    color: var(--c2);
                    opacity: 0.82;
                }

                .sidebar-cost-plan {
                    margin-top: 0.65rem;
                }

                .sidebar-cost-plan-trigger {
                    display: flex;
                    align-items: center;
                    gap: 0.3rem;
                    width: 100%;
                    margin: 0;
                    padding: 0.15rem 0;
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    font-family: inherit;
                    text-align: left;
                    font-size: clamp(0.68rem, 0.85vw, 0.78rem);
                    font-variation-settings: var(--fv-label-strong);
                    letter-spacing: 0.06em;
                    text-transform: none;
                    color: var(--c2);
                    opacity: 0.85;
                    transition: opacity 0.2s ease;
                }

                .sidebar-cost-plan-trigger:hover {
                    opacity: 0.98;
                }

                .sidebar-cost-plan-trigger .sidebar-cost-plan-arrow {
                    display: inline-block;
                    font-size: 0.85em;
                    opacity: 0.55;
                    font-variation-settings: var(--fv-body);
                    transform: translateY(0.05em);
                    transition: transform 0.2s ease, opacity 0.2s ease;
                }

                .sidebar-cost-plan-trigger.is-open .sidebar-cost-plan-arrow {
                    opacity: 0.75;
                    transform: translateY(0.05em) rotate(90deg);
                }

                .sidebar-cost-plan-panel {
                    margin-top: 0.4rem;
                    padding-left: 0.1rem;
                }

                .sidebar-cost-plan-panel[hidden] {
                    display: none !important;
                }

                .sidebar-slots-value strong {
                    font-weight: 600;
                }

                .sidebar-value-list {
                    margin: 0;
                    padding: 0;
                    list-style: none;
                    font-size: clamp(0.9rem, 1.15vw, 1.05rem);
                    font-variation-settings: var(--fv-body-wide);
                    color: var(--c2);
                    line-height: 1.5;
                    letter-spacing: 0.02em;
                }

                a.sidebar-residence-link {
                    color: inherit;
                    text-decoration: underline;
                    text-underline-offset: 0.15em;
                }

                a.sidebar-residence-link:hover {
                    opacity: 0.85;
                }

                .additional-info {
                    margin-top: clamp(2rem, 5vw, 3rem);
                    padding-top: clamp(1.25rem, 3vw, 1.75rem);
                    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
                }

                .additional-info-heading {
                    margin: 0 0 0.85rem;
                    font-size: clamp(0.8rem, .9vw, 1.05rem);
                    font-variation-settings: var(--fv-body-wide);
                    color: var(--c2);
                    letter-spacing: 0.02em;
                    line-height: 1.4;
                }

                .ai-triggers {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 0.35rem 1.5rem;
                    margin: 0 0 0.35rem;
                }

                .ai-trigger {
                    display: inline-flex;
                    align-items: baseline;
                    gap: 0.3rem;
                    margin: 0;
                    padding: 0.15rem 0;
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: clamp(0.9rem, 1.15vw, 1.05rem);
                    font-variation-settings: var(--fv-body-wide);
                    color: var(--c2);
                    letter-spacing: 0.02em;
                    line-height: 1.5;
                    opacity: 0.72;
                    transition: opacity 0.2s ease;
                }

                .ai-trigger:hover {
                    opacity: 0.95;
                }

                .ai-trigger.is-active {
                    opacity: 1;
                }

                .ai-trigger-arrow {
                    font-size: 0.85em;
                    opacity: 0.55;
                    font-variation-settings: var(--fv-body);
                    transform: translateY(0.05em);
                }

                .ai-trigger.is-active .ai-trigger-arrow {
                    opacity: 0.75;
                }

                .ai-panels-wrap {
                    padding-top: 0.35rem;
                }

                .ai-panel[hidden] {
                    display: none !important;
                }

                .ai-panel {
                    padding: 0.65rem 0 0;
                    margin: 0;
                    border: none;
                }

                .ai-qa-line {
                    margin: 0 0 0.65rem;
                    font-size: clamp(0.9rem, 1.15vw, 1.05rem);
                    font-variation-settings: var(--fv-body-wide);
                    color: var(--c2);
                    line-height: 1.5;
                    letter-spacing: 0.02em;
                }

                .ai-question {
                    font-variation-settings: var(--fv-emphasis);
                }

                .ai-notes-title {
                    margin: 0 0 0.5rem;
                    font-size: clamp(0.9rem, 1.15vw, 1.05rem);
                    font-variation-settings: var(--fv-emphasis);
                    color: var(--c2);
                    letter-spacing: 0.02em;
                }

                .ai-notes-title:not(:first-child) {
                    margin-top: 1.25rem;
                }

                .ai-body-text {
                    margin: 0 0 0.75rem;
                    font-size: clamp(0.9rem, 1.15vw, 1.05rem);
                    font-variation-settings: var(--fv-body-wide);
                    color: var(--c2);
                    line-height: 1.55;
                    letter-spacing: 0.02em;
                }

                .ai-body-text:last-child {
                    margin-bottom: 0;
                }

                .refund-policy-section + .refund-policy-section {
                    margin-top: 1.25rem;
                    padding-top: 1.25rem;
                    border-top: 1px solid rgba(0, 0, 0, 0.08);
                }

                .refund-section-title {
                    margin: 0 0 0.5rem;
                    font-size: clamp(0.9rem, 1.15vw, 1.05rem);
                    font-variation-settings: var(--fv-emphasis);
                    color: var(--c2);
                    letter-spacing: 0.02em;
                }

                .refund-subsection-title {
                    margin: 0.85rem 0 0.4rem;
                    font-size: clamp(0.88rem, 1.05vw, 0.98rem);
                    font-variation-settings: var(--fv-subtitle);
                    color: var(--c2);
                }

                .ai-bullet-list {
                    margin: 0 0 0.75rem 1.1rem;
                    padding: 0;
                    font-size: clamp(0.9rem, 1.15vw, 1.05rem);
                    font-variation-settings: var(--fv-body-wide);
                    color: var(--c2);
                    line-height: 1.55;
                    letter-spacing: 0.02em;
                }

                .ai-bullet-list li {
                    margin-bottom: 0.35rem;
                }
            </style>
            <div class="program-details-inner">
                <div class="header-row">
                    <h2 class="details-title"></h2>
                </div>
                <div class="columns">
                    <div class="timeline-col">
                        <div class="timeline-blocks"></div>
                        <button type="button" class="begin-application"></button>
                    </div>
                    <aside class="sidebar" aria-label="Program information"></aside>
                </div>
                <section class="additional-info" hidden aria-labelledby="additional-info-heading">
                    <h3 class="additional-info-heading" id="additional-info-heading"></h3>
                    <div class="ai-triggers" role="tablist">
                        <button type="button" class="ai-trigger" id="ai-trigger-appfee" data-panel="appfee" hidden role="tab" aria-selected="false">
                            <span class="ai-trigger-arrow" aria-hidden="true">→</span><span class="ai-trigger-label"></span>
                        </button>
                        <button type="button" class="ai-trigger" id="ai-trigger-about" data-panel="about" hidden role="tab" aria-selected="false">
                            <span class="ai-trigger-arrow" aria-hidden="true">→</span><span class="ai-trigger-label"></span>
                        </button>
                        <button type="button" class="ai-trigger" id="ai-trigger-faq" data-panel="faq" hidden role="tab" aria-selected="false">
                            <span class="ai-trigger-arrow" aria-hidden="true">→</span><span class="ai-trigger-label"></span>
                        </button>
                        <button type="button" class="ai-trigger" id="ai-trigger-notes" data-panel="notes" hidden role="tab" aria-selected="false">
                            <span class="ai-trigger-arrow" aria-hidden="true">→</span><span class="ai-trigger-label"></span>
                        </button>
                        <button type="button" class="ai-trigger" id="ai-trigger-refund" data-panel="refund" hidden role="tab" aria-selected="false">
                            <span class="ai-trigger-arrow" aria-hidden="true">→</span><span class="ai-trigger-label"></span>
                        </button>
                    </div>
                    <div class="ai-panels-wrap">
                        <div class="ai-panel" id="ai-panel-appfee" role="tabpanel" hidden></div>
                        <div class="ai-panel" id="ai-panel-about" role="tabpanel" hidden></div>
                        <div class="ai-panel" id="ai-panel-faq" role="tabpanel" hidden></div>
                        <div class="ai-panel" id="ai-panel-notes" role="tabpanel" hidden></div>
                        <div class="ai-panel" id="ai-panel-refund" role="tabpanel" hidden></div>
                    </div>
                </section>
            </div>
        `;
    }
}

customElements.define('app-program-details', ProgramDetailsComponent);

export { ProgramDetailsComponent };
