import { gsap } from "gsap";
import fusionNature2 from '../../assets/fusion-nature2.mp4';
import { DEV_MODE, getHost, config } from '../../config.js';
import { activateDeactivate, navigate } from '../../router.js';
import { submitEarlyAccessToCanister } from '../../utils/earlyAccessSubscribe.js';
import { withSeoVideoLabel } from '../../utils/mediaAltSeo.js';

// Load Screen Custom Element Component
class LoadScreenComponent extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        this.selectedComingSoonCategory = null;
        this.c1 ={
            colorName: 'red',
            top: '50%',
            left: '50%',
            width: '200px',
            height: '200px',
            zIndex: 1,
            interval: null,
        }
        this.c2 ={
            colorName: 'black',
            top: '80%',
            left: '40%',
            width: '200px',
            height: '200px',
            zIndex: 2,
            interval: null,
        }
        this.c3 ={
            colorName: 'white',
            top: '20%',
            left: '60%',
            width: '200px',
            height: '200px',
            zIndex: 3,
            interval: null,
        }
        this.c4 ={
            colorName: 'green',
            top: '80%',
            left: '60%',
            width: '200px',
            height: '200px',
            zIndex: 4,
            interval: null,
        }
        this.c5 ={
            colorName: 'tan',
            top: '20%',
            left: '40%',
            width: '200px',
            height: '200px',
            zIndex: 5,
            interval: null,
        }
        this.currentDynamicCIntervals = {
            speed: 1,
            direction: 1,
            scale: 1,
            x: 0,
            y: 0,
            rotation: 0,
            delay: 0,
            randomInterval: null,
        };
        this.positionConfigs = {
            comingSoon: {
                vid: {
                    id: 'vid1',
                    top: '0%',
                    bottom: 'auto',
                    left: '0%',
                    right: 'auto',
                    rotation: 0,
                    scale: 1,
                    zIndex: 2,
                },
                c1: {
                    colorName: 'red',
                    active: true,
                    visible: true,
                    top: '99%',
                    bottom: 'auto',
                    left: '100%',
                    right: 'auto',
                    width: '415px',
                    height: '415px',
                    zIndex: 2,
                },
                c2: {
                    colorName: 'black',
                    active: true,
                    visible: true,
                    top: '80%',
                    bottom: 'auto',
                    left: '52%',
                    right: 'auto',
                    width: '2400px',
                    height: '2400px',
                    zIndex: 0,
                },
                c3: {
                    colorName: 'white',
                    active: false,
                    visible: true,
                    top: '-23%',
                    bottom: 'auto',
                    left: '34%',
                    right: 'auto',
                    width: '2400px',
                    height: '2400px',
                    zIndex: 0,
                },
                c4: {
                    colorName: 'green',
                    active: true,
                    visible: true,
                    top: '-19%',
                    bottom: 'auto',
                    left: '83%',
                    right: 'auto',
                    width: '808px',
                    height: '808px',
                    zIndex: 4,
                },
                c5: {
                    colorName: 'tan',
                    active: true,
                    visible: false,
                    top: '20%',
                    bottom: 'auto',
                    left: '40%',
                    right: 'auto',
                    width: '200px',
                    height: '200px',
                    zIndex: 5,
                },
            },
            "comingSoon2": {
                "vid": {
                    "id": "vid1",
                    "top": "0%",
                    "bottom": "auto",
                    "left": "0%",
                    "right": "auto",
                    "rotation": 0,
                    "scale": 1,
                    "zIndex": 2
                },
                "c1": {
                    "colorName": "red",
                    "active": true,
                    "visible": true,
                    "top": "-2%",
                    "bottom": "auto",
                    "left": "70%",
                    "right": "auto",
                    "width": "479px",
                    "height": "479px",
                    "zIndex": 2
                },
                "c2": {
                    "colorName": "black",
                    "active": false,
                    "visible": true,
                    "top": "118%",
                    "bottom": "auto",
                    "left": "56%",
                    "right": "auto",
                    "width": "566px",
                    "height": "566px",
                    "zIndex": 0
                },
                "c3": {
                    "colorName": "white",
                    "active": false,
                    "visible": true,
                    "top": "88%",
                    "bottom": "auto",
                    "left": "116%",
                    "right": "auto",
                    "width": "1215px",
                    "height": "1215px",
                    "zIndex": 0
                },
                "c4": {
                    "colorName": "green",
                    "active": true,
                    "visible": true,
                    "top": "-19%",
                    "bottom": "auto",
                    "left": "83%",
                    "right": "auto",
                    "width": "808px",
                    "height": "808px",
                    "zIndex": 4
                },
                "c5": {
                    "colorName": "tan",
                    "active": true,
                    "visible": true,
                    "top": "-3%",
                    "bottom": "auto",
                    "left": "-6%",
                    "right": "auto",
                    "width": "320px",
                    "height": "320px",
                    "zIndex": 5
                }
            },
            home: {
                vid: {
                    id: 'vid1',
                    top: '0%',
                    bottom: 'auto',
                    left: '0%',
                    right: 'auto',
                    rotation: 0,
                    scale: 1,
                    zIndex: 2,
                },
                c1: {
                    colorName: 'red',
                    active: false,
                    visible: true,
                    top: '50%',
                    bottom: 'auto',
                    left: '50%',
                    right: 'auto',
                    width: '200px',
                    height: '200px',
                    zIndex: 1,
                },
                c2: {
                    colorName: 'black',
                    active: false,
                    visible: true,
                    top: '80%',
                    bottom: 'auto',
                    left: '40%',
                    right: 'auto',
                    width: '200px',
                    height: '200px',
                    zIndex: 2,
                },
                c3: {
                    colorName: 'white',
                    active: false,
                    visible: true,
                    top: '20%',
                    bottom: 'auto',
                    left: '60%',
                    right: 'auto',
                    width: '200px',
                    height: '200px',
                    zIndex: 3,
                },
                c4: {
                    colorName: 'green',
                    active: false,
                    visible: true,
                    top: '80%',
                    bottom: 'auto',
                    left: '60%',
                    right: 'auto',
                    width: '200px',
                    height: '200px',
                    zIndex: 4,
                },
                c5: {
                    colorName: 'tan',
                    active: false,
                    visible: true,
                    top: '20%',
                    bottom: 'auto',
                    left: '40%',
                    right: 'auto',
                    width: '200px',
                    height: '200px',
                    zIndex: 5,
                },
            },
        };
        // Default selection for the debug UI: matches the circle CSS default in `render()`.
        this.selectedConfig = "comingSoon2";
        this._loadscreenIsAdmin = false;
        /** After a successful “click to enter”, do not let `_applyLoadscreenWelcomeMode` reveal #enterAction again (e.g. on `fusion-auth-change`). */
        this._userHasEnteredSite = false;
        this._onFusionAuthChange = null;
    }

    get visible() {
        return this.getAttribute('visible') === 'true';
    }

    set visible(val) {
        this.setAttribute('visible', val ? 'true' : 'false');
    }

    get fontsReady() {
        return this.getAttribute('fonts-ready') === 'true';
    }

    get message() {
        return this.getAttribute('message') || 'Loading...';
    }

    set message(val) {
        this.setAttribute('message', val);
    }

    static get observedAttributes() {
        return ['visible', 'message'];
    }

    attributeChangedCallback(prop, oldVal, newVal) {
        if (prop === 'visible' || prop === 'message') {
            this.render();
            if (this._userHasEnteredSite) {
                this._applyLoadscreenWelcomeMode();
            }
        }
    }

    dynamicCircles(configName) {
        // ensure we never have more than one interval running
        if (this.currentDynamicCIntervals.interval) {
            clearInterval(this.currentDynamicCIntervals.interval);
            this.currentDynamicCIntervals.interval = null;
        }

        this.currentDynamicCIntervals.interval = setInterval(() => {
            if (!this.shadowRoot) return;

            const c1Element = this.shadow.querySelector('.circle1');
            const c2Element = this.shadow.querySelector('.circle2');
            const c3Element = this.shadow.querySelector('.circle3');
            const c4Element = this.shadow.querySelector('.circle4');
            const c5Element = this.shadow.querySelector('.circle5');

            const effectiveConfigName = configName || this.selectedConfig;
            const configSource = typeof effectiveConfigName === 'string'
                ? this.positionConfigs?.[effectiveConfigName]
                : effectiveConfigName;

            const config = configSource || {};

            const circles = [
                { el: c1Element, key: 'c1' },
                { el: c2Element, key: 'c2' },
                { el: c3Element, key: 'c3' },
                { el: c4Element, key: 'c4' },
                { el: c5Element, key: 'c5' },
            ];

            const dynamicCandidates = [];

            circles.forEach(({ el, key }) => {
                if (!el) return;

                const cfg = config[key] || {};

                // visibility
                if (cfg.visible === false) {
                    el.style.display = 'none';
                    return;
                } else {
                    el.style.display = '';
                }

                // base placement and z-index from config
                if (typeof cfg.top === 'string') {
                    el.style.top = cfg.top;
                    el.style.bottom = 'auto';
                } else if (typeof cfg.bottom === 'string') {
                    el.style.bottom = cfg.bottom;
                    el.style.top = 'auto';
                }
                if (typeof cfg.left === 'string') {
                    el.style.left = cfg.left;
                    el.style.right = 'auto';
                } else if (typeof cfg.right === 'string') {
                    el.style.right = cfg.right;
                    el.style.left = 'auto';
                }
                if (typeof cfg.width === 'string') el.style.width = cfg.width;
                if (typeof cfg.height === 'string') el.style.height = cfg.height;
                if (cfg.zIndex !== undefined) el.style.zIndex = String(cfg.zIndex);

                // static vs dynamic
                if (cfg.active) {
                    dynamicCandidates.push({ el });
                } else {
                    // static circle: reset any transform so it stays at configured position
                    gsap.set(el, { x: 0, y: 0, scale: 1 });
                }
            });

            if (!dynamicCandidates.length) {
                // no active circles: stop animation loop
                if (this.currentDynamicCIntervals.interval) {
                    clearInterval(this.currentDynamicCIntervals.interval);
                    this.currentDynamicCIntervals.interval = null;
                }
                return;
            }

            const selected = dynamicCandidates[Math.floor(Math.random() * dynamicCandidates.length)];
            const selectedEl = selected.el;

            // duration range
            const durationMin = 500;
            const durationMax = 2000;
            const randomDuration = Math.floor(Math.random() * (durationMax - durationMin)) + durationMin;

            // movement and scale ranges (offsets from CSS position)
            this.currentDynamicCIntervals.x = Math.floor(Math.random() * 800) - 400;
            this.currentDynamicCIntervals.y = Math.floor(Math.random() * 800) - 400;
            const scaleMin = 0.7;
            const scaleMax = 1.3;
            this.currentDynamicCIntervals.scale = Math.random() * (scaleMax - scaleMin) + scaleMin;

            gsap.to(selectedEl, {
                duration: randomDuration / 1000,
                x: this.currentDynamicCIntervals.x,
                y: this.currentDynamicCIntervals.y,
                scale: this.currentDynamicCIntervals.scale,
                ease: "power2.inOut",
            });

            this.currentDynamicCIntervals.randomInterval = Math.floor(Math.random() * 1000) + 1000;
        }, 2000);
    }

    transitionPositionConfig(configName) {
        if (!this.shadowRoot) return;

        const effectiveConfigName = configName || this.selectedConfig;

        // keep selectedConfig in sync if a name was passed
        if (typeof effectiveConfigName === 'string') {
            this.selectedConfig = effectiveConfigName;
        }

        const configSource = typeof effectiveConfigName === 'string'
            ? this.positionConfigs?.[effectiveConfigName]
            : effectiveConfigName;

        const config = configSource || {};

        const c1Element = this.shadow.querySelector('.circle1');
        const c2Element = this.shadow.querySelector('.circle2');
        const c3Element = this.shadow.querySelector('.circle3');
        const c4Element = this.shadow.querySelector('.circle4');
        const c5Element = this.shadow.querySelector('.circle5');

        const circles = [
            { el: c1Element, key: 'c1' },
            { el: c2Element, key: 'c2' },
            { el: c3Element, key: 'c3' },
            { el: c4Element, key: 'c4' },
            { el: c5Element, key: 'c5' },
        ];

        let hasActive = false;

        circles.forEach(({ el, key }) => {
            if (!el) return;

            const cfg = config[key] || {};

            // visibility transition
            if (cfg.visible === false) {
                gsap.to(el, {
                    duration: 0.4,
                    opacity: 0,
                    onComplete: () => {
                        el.style.display = 'none';
                    },
                });
                return;
            } else {
                el.style.display = '';
                gsap.to(el, { duration: 0.2, opacity: 1 });
            }

            // track if any circle is active in the new config
            if (cfg.active) {
                hasActive = true;
            }

            // target positions / size from config
            const top = typeof cfg.top === 'string' ? cfg.top : el.style.top || '50%';
            const bottom = typeof cfg.bottom === 'string' ? cfg.bottom : el.style.bottom || 'auto';
            const left = typeof cfg.left === 'string' ? cfg.left : el.style.left || '50%';
            const right = typeof cfg.right === 'string' ? cfg.right : el.style.right || 'auto';
            const width = typeof cfg.width === 'string' ? cfg.width : el.style.width || '200px';
            const height = typeof cfg.height === 'string' ? cfg.height : el.style.height || '200px';

            if (cfg.zIndex !== undefined) {
                el.style.zIndex = String(cfg.zIndex);
            }

            const tweenProps = {
                duration: 0.8,
                width,
                height,
                ease: 'power2.inOut',
            };

            if (typeof cfg.top === 'string' || !cfg.bottom) {
                tweenProps.top = top;
                tweenProps.bottom = 'auto';
            } else {
                tweenProps.bottom = bottom;
                tweenProps.top = 'auto';
            }

            if (typeof cfg.left === 'string' || !cfg.right) {
                tweenProps.left = left;
                tweenProps.right = 'auto';
            } else {
                tweenProps.right = right;
                tweenProps.left = 'auto';
            }

            gsap.to(el, tweenProps);
        });

        // manage dynamic animation based on active flags
        if (!hasActive && this.currentDynamicCIntervals.interval) {
            clearInterval(this.currentDynamicCIntervals.interval);
            this.currentDynamicCIntervals.interval = null;
        } else if (hasActive && !this.currentDynamicCIntervals.interval) {
            this.dynamicCircles(effectiveConfigName);
        }
    }

    animateHomeElements() {
        const homeElements = this.shadow.querySelectorAll('.ml');
        let elCount = homeElements.length;

        for (let i = 0; i < elCount; i++) {
            gsap.to(homeElements[i - 1], {
                duration: .5,
                opacity: 1,
                transform: 'translateY(0) translateX(0)',
                ease: "power2.inOut",
                delay: i * 0.1,
            });
        }
    }

    debugCirclesPositionModal() {
        if (this.debugPanelInitialized || !this.shadowRoot) return;
        this.debugPanelInitialized = true;

        const panel = this.shadowRoot.querySelector('.debug-panel');
        const toggleButton = this.shadowRoot.querySelector('.debug-toggle');
        const startBtn = this.shadowRoot.querySelector('#debug-start-dynamics');
        const stopBtn = this.shadowRoot.querySelector('#debug-stop-dynamics');
        const configSelect = this.shadowRoot.querySelector('#debug-config-select');
        const nameInput = this.shadowRoot.querySelector('#debug-config-name');
        const copyBtn = this.shadowRoot.querySelector('#debug-copy-config');
        const openStudioBtn = this.shadowRoot.querySelector('#debug-open-studio');
        const openProfileSettingsBtn = this.shadowRoot.querySelector('#debug-open-profile-settings');

        if (!panel || !toggleButton) return;

        openStudioBtn?.addEventListener('click', () => {
            navigate('/studio');
        });

        openProfileSettingsBtn?.addEventListener('click', () => {
            navigate('/settings/profile');
        });

        const circlesConfig =
            typeof this.selectedConfig === 'string'
                ? this.positionConfigs?.[this.selectedConfig] || {}
                : this.selectedConfig || {};

        const circles = ['c1', 'c2', 'c3', 'c4', 'c5'];

        const getCircleEl = (key) => {
            switch (key) {
                case 'c1': return this.shadowRoot.querySelector('.circle1');
                case 'c2': return this.shadowRoot.querySelector('.circle2');
                case 'c3': return this.shadowRoot.querySelector('.circle3');
                case 'c4': return this.shadowRoot.querySelector('.circle4');
                case 'c5': return this.shadowRoot.querySelector('.circle5');
                default: return null;
            }
        };

        const applyConfigToUI = () => {
            circles.forEach((key) => {
                const cfg = circlesConfig[key] || {};
                const prefix = `#${key}-`;

                const topInput = panel.querySelector(`${prefix}top`);
                const leftInput = panel.querySelector(`${prefix}left`);
                const sizeInput = panel.querySelector(`${prefix}size`);
                const zIndexInput = panel.querySelector(`${prefix}zindex`);
                const activeInput = panel.querySelector(`${prefix}active`);
                const visibleInput = panel.querySelector(`${prefix}visible`);

                if (topInput) topInput.value = parseFloat(cfg.top || '50');
                if (leftInput) leftInput.value = parseFloat(cfg.left || '50');
                if (sizeInput) {
                    const baseSize = parseFloat(cfg.width || cfg.height || '200');
                    sizeInput.value = baseSize;
                }
                if (zIndexInput) zIndexInput.value = cfg.zIndex !== undefined ? cfg.zIndex : 1;
                if (activeInput) activeInput.checked = cfg.active !== false;
                if (visibleInput) visibleInput.checked = cfg.visible !== false;
            });
        };

        const getSelectedPresetName = () => (configSelect ? configSelect.value : '');

        const updateStartLabel = () => {
            if (!startBtn) return;
            const preset = getSelectedPresetName();
            if (!preset || preset === this.selectedConfig) {
                startBtn.textContent = 'Start';
            } else {
                startBtn.textContent = 'Transition';
            }
        };

        const attachHandlersForCircle = (key) => {
            const cfg = (circlesConfig[key] = circlesConfig[key] || {});
            const el = getCircleEl(key);
            if (!el) return;

            const prefix = `#${key}-`;

            const topInput = panel.querySelector(`${prefix}top`);
            const leftInput = panel.querySelector(`${prefix}left`);
            const sizeInput = panel.querySelector(`${prefix}size`);
            const zIndexInput = panel.querySelector(`${prefix}zindex`);
            const activeInput = panel.querySelector(`${prefix}active`);
            const visibleInput = panel.querySelector(`${prefix}visible`);

            if (topInput) {
                topInput.addEventListener('input', (e) => {
                    const v = Number(e.target.value);
                    cfg.top = `${v}%`;
                    cfg.bottom = 'auto';
                    el.style.top = cfg.top;
                    el.style.bottom = 'auto';
                });
            }

            if (leftInput) {
                leftInput.addEventListener('input', (e) => {
                    const v = Number(e.target.value);
                    cfg.left = `${v}%`;
                    cfg.right = 'auto';
                    el.style.left = cfg.left;
                    el.style.right = 'auto';
                });
            }

            if (sizeInput) {
                sizeInput.addEventListener('input', (e) => {
                    const v = Number(e.target.value);
                    cfg.width = `${v}px`;
                    cfg.height = `${v}px`;
                    el.style.width = cfg.width;
                    el.style.height = cfg.height;
                });
            }

            if (zIndexInput) {
                zIndexInput.addEventListener('input', (e) => {
                    const v = Number(e.target.value);
                    cfg.zIndex = v;
                    el.style.zIndex = String(v);
                });
            }

            if (activeInput) {
                activeInput.addEventListener('change', (e) => {
                    cfg.active = !!e.target.checked;
                });
            }

            if (visibleInput) {
                visibleInput.addEventListener('change', (e) => {
                    cfg.visible = !!e.target.checked;
                    el.style.display = cfg.visible ? '' : 'none';
                });
            }
        };

        circles.forEach(attachHandlersForCircle);
        applyConfigToUI();
        updateStartLabel();

        if (configSelect) {
            configSelect.addEventListener('change', () => {
                updateStartLabel();
            });
        }

        toggleButton.addEventListener('click', () => {
            panel.classList.toggle('collapsed');

            // Ensure header/footer don't capture clicks when debug panel is open
            const header = document.getElementById('header');
            const footer = document.getElementById('footer');
            if (header) {
                if (panel.classList.contains('collapsed')) {
                    header.style.pointerEvents = '';
                } else {
                    header.style.pointerEvents = 'none';
                }
            }
            if (footer) {
                if (panel.classList.contains('collapsed')) {
                    footer.style.pointerEvents = '';
                } else {
                    footer.style.pointerEvents = 'none';
                }
            }
        });

        if (startBtn) {
            startBtn.addEventListener('click', () => {
                const preset = getSelectedPresetName();

                // Default or same as current: just start dynamics for current config
                if (!preset || preset === this.selectedConfig) {
                    this.dynamicCircles(this.selectedConfig);
                    return;
                }

                // Different preset selected: transition to that config
                this.transitionPositionConfig(preset);
            });
        }

        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                if (this.currentDynamicCIntervals.interval) {
                    clearInterval(this.currentDynamicCIntervals.interval);
                    this.currentDynamicCIntervals.interval = null;
                }
            });
        }

        if (copyBtn) {
            copyBtn.addEventListener('click', async () => {
                const presetName = configSelect ? configSelect.value : '';
                const name =
                    (nameInput && nameInput.value.trim()) ||
                    presetName ||
                    (typeof this.selectedConfig === 'string' ? this.selectedConfig : 'newPosition');

                // Export with the object key (so it matches the shape of `comingSoon` configs).
                const exportObj = {
                    [name]: circlesConfig,
                };

                const text = JSON.stringify(exportObj, null, 4);

                try {
                    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(text);
                    } else {
                        // Fallback: create a temporary textarea
                        const ta = document.createElement('textarea');
                        ta.value = text;
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand('copy');
                        document.body.removeChild(ta);
                    }
                } catch (err) {
                    console.error('Failed to copy config to clipboard', err);
                }
            });
        }
    }

    connectedCallback() {
        this.render();
        if (DEV_MODE) {
            console.log("devModeEnabled", DEV_MODE);
            this.debugCirclesPositionModal();
        }
        this.setupComingSoonSelectors();
        this.setupEarlyAccessSubscription();
        this.eventListeners();
        this.setupLoadscreenFooterAuth();
        this._applyLoadscreenWelcomeMode();
        void this.refreshLoadscreenAdminState();
        this.dynamicCircles("comingSoon2");
    }

    disconnectedCallback() {
        if (this._onFusionAuthChange) {
            window.removeEventListener('fusion-auth-change', this._onFusionAuthChange);
            this._onFusionAuthChange = null;
        }
    }

    performEnterSite() {
        // Do not gate on `fonts-ready`: Typekit / document.fonts.ready can take a long time on slow
        // networks and would make “CLICK TO ENTER” feel unresponsive until loading finishes.
        if (!config.siteActive && !this._loadscreenIsAdmin) return;

        this.shadowRoot.host.style.zIndex = '0';

        const header = document.getElementById('header');
        const footer = document.getElementById('footer');

        if (header) {
            header.setAttribute('active', 'true');
        }

        if (footer) {
            footer.setAttribute('active', 'true');
        }

        document.querySelectorAll('.main-cont').forEach(el => {
            el.style.zIndex = '1';
            el.style.pointerEvents = 'none';
        });

        this.shadowRoot.querySelector('.loadscreen-container').style.zIndex = '-1';
        let path = window.location.pathname;
        if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
        activateDeactivate(path);

        const enterText = this.shadowRoot.querySelector('#enterAction');
        if (enterText) {
            enterText.classList.add('hidden');
        }
        this._userHasEnteredSite = true;
    }

    async refreshLoadscreenAdminState() {
        let isAdmin = false;
        try {
            const { getAuthSnapshot } = await import('../../utils/icAuth.js');
            const snap = await getAuthSnapshot();
            if (!snap.authenticated) {
                this._loadscreenIsAdmin = false;
                this._applyLoadscreenWelcomeMode();
                return;
            }
            const { getAuthenticatedFusionBackendActor } = await import('../../utils/earlyAccessSubscribe.js');
            const actor = await getAuthenticatedFusionBackendActor();
            if (!actor) {
                this._loadscreenIsAdmin = false;
                this._applyLoadscreenWelcomeMode();
                return;
            }
            try {
                if (typeof actor.isCallerAdmin === 'function') {
                    isAdmin = await actor.isCallerAdmin();
                }
            } catch (_) {
                /* ignore */
            }
            if (!isAdmin) {
                let acc = null;
                try {
                    if (typeof actor.getAccountForCaller === 'function') {
                        const raw = await actor.getAccountForCaller();
                        acc = Array.isArray(raw) ? (raw.length ? raw[0] : null) : raw;
                    }
                } catch (_) {
                    /* ignore */
                }
                if (acc != null) {
                    const role = acc.role;
                    if (role && typeof role === 'object' && 'admin' in role) {
                        isAdmin = true;
                    }
                }
            }
            this._loadscreenIsAdmin = isAdmin;
        } catch (_) {
            this._loadscreenIsAdmin = false;
        }
        this._applyLoadscreenWelcomeMode();
    }

    /**
     * When the site is in coming-soon mode but the caller is an admin, mirror `siteActive` UI:
     * hide the welcome column and show the normal #enterAction overlay (CLICK TO ENTER).
     */
    _applyLoadscreenWelcomeMode() {
        if (this._userHasEnteredSite) {
            const comingSoon = this.shadowRoot?.querySelector('#comingSoon');
            const enterAction = this.shadowRoot?.querySelector('#enterAction');
            if (comingSoon) comingSoon.style.display = 'none';
            if (enterAction) {
                enterAction.style.display = 'none';
                enterAction.classList.add('hidden');
            }
            const adminEnterFooter = this.shadowRoot?.querySelector('#loadscreenCsAdminEnter');
            if (adminEnterFooter) adminEnterFooter.setAttribute('hidden', '');
            return;
        }
        const siteActive = !!config.siteActive;
        const treatAsActive = siteActive || this._loadscreenIsAdmin;
        const comingSoon = this.shadowRoot?.querySelector('#comingSoon');
        const enterAction = this.shadowRoot?.querySelector('#enterAction');
        if (comingSoon) {
            comingSoon.style.display = treatAsActive ? 'none' : 'grid';
        }
        if (enterAction) {
            enterAction.style.display = treatAsActive ? 'flex' : 'none';
            if (treatAsActive) {
                enterAction.classList.remove('hidden');
            }
        }
        const adminEnterFooter = this.shadowRoot?.querySelector('#loadscreenCsAdminEnter');
        if (adminEnterFooter) {
            adminEnterFooter.setAttribute('hidden', '');
        }
    }

    setupLoadscreenFooterAuth() {
        const signIn = this.shadowRoot.querySelector('#loadscreenCsSignIn');
        if (signIn) {
            signIn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('fusion-open-sign-in'));
            });
        }
        const adminEnter = this.shadowRoot.querySelector('#loadscreenCsAdminEnter');
        if (adminEnter) {
            adminEnter.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.performEnterSite();
            });
        }
        this._onFusionAuthChange = () => {
            void this.refreshLoadscreenAdminState();
        };
        window.addEventListener('fusion-auth-change', this._onFusionAuthChange);
    }

    eventListeners() {
        console.log("eventListeners");
        this.shadowRoot.querySelector(".loadscreen-container").addEventListener('click', () => {
            this.performEnterSite();
        });
    }

    setupComingSoonSelectors() {
        const buttons = this.shadowRoot.querySelectorAll('.csSelectorButton');
        if (!buttons || buttons.length === 0) return;

        buttons.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // avoid triggering the loadscreen-container "enter" click

                const selected = (btn.textContent || '').trim();
                this.selectedComingSoonCategory = selected;

                buttons.forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                this.updateEarlyAccessSubscribeEnabled();
            });
        });
        this.updateEarlyAccessSubscribeEnabled();
    }

    /** Subscribe stays disabled until the user picks a role (Artist / Collector / …). */
    updateEarlyAccessSubscribeEnabled() {
        const btn = this.shadowRoot && this.shadowRoot.querySelector('#csCTASubscribe');
        if (!btn) return;
        if (this._earlyAccessSubmitting) return;
        const hasCategory = !!(this.selectedComingSoonCategory || '').trim();
        btn.disabled = !hasCategory;
        btn.title = hasCategory ? '' : 'Select a role (Artist, Collector, Curator, or Gallery) first.';
    }

    setCTAStatus(text) {
        const statusEl =
            this.shadowRoot && this.shadowRoot.querySelector
                ? this.shadowRoot.querySelector('#csSubscriptionStatus')
                : null;
        const postText2El =
            this.shadowRoot && this.shadowRoot.querySelector
                ? this.shadowRoot.querySelector('#csCTAPostText2')
                : null;
        if (!statusEl) return;
        if (postText2El) postText2El.style.display = 'none';
        statusEl.textContent = text;
        statusEl.style.display = 'flex';
    }

    setSubscriptionConfirmationState(isConfirmed) {
        const root = this.shadowRoot;
        if (!root || !root.querySelector) return;

        const ctatext = root.querySelector('#csCTAText');
        const selectors = root.querySelector('#csCTASelectors');
        const iamSelect = root.querySelector('#csIAmSelect');
        const selectorButtons = root.querySelector('#csSelectorButtons');
        const input = root.querySelector('#csCTAInput');
        const postText2 = root.querySelector('#csCTAPostText2');
        const status = root.querySelector('#csSubscriptionStatus');
        const confirmation = root.querySelector('#csSubscriptionConfirmation');

        if (isConfirmed) {
            if (selectors) selectors.style.display = 'none';
            if (iamSelect) iamSelect.style.display = 'none';
            if (selectorButtons) selectorButtons.style.display = 'none';
            if (input) input.style.display = 'none';
            if (postText2) postText2.style.display = 'none';
            if (status) status.style.display = 'none';
            if (confirmation) confirmation.style.display = 'flex';
            if (ctatext) ctatext.style.display = '';
        } else {
            if (selectors) selectors.style.display = '';
            if (iamSelect) iamSelect.style.display = '';
            if (selectorButtons) selectorButtons.style.display = '';
            if (input) input.style.display = '';
            if (postText2) postText2.style.display = '';
            if (confirmation) confirmation.style.display = 'none';
            if (status) status.style.display = 'none';
            if (ctatext) ctatext.style.display = '';
        }
    }

    hideCTAStatus() {
        const statusEl =
            this.shadowRoot && this.shadowRoot.querySelector
                ? this.shadowRoot.querySelector('#csSubscriptionStatus')
                : null;
        const postText2El =
            this.shadowRoot && this.shadowRoot.querySelector
                ? this.shadowRoot.querySelector('#csCTAPostText2')
                : null;
        if (statusEl) statusEl.style.display = 'none';
        if (postText2El) postText2El.style.display = '';
    }

    showSubscriptionConfirmation(email, category) {
        const confirmEl =
            this.shadowRoot && this.shadowRoot.querySelector
                ? this.shadowRoot.querySelector('#csSubscriptionConfirmation')
                : null;
        const postText2El =
            this.shadowRoot && this.shadowRoot.querySelector
                ? this.shadowRoot.querySelector('#csCTAPostText2')
                : null;
        if (!confirmEl) return;

        // Switch CTA area into confirmation mode.
        this.setSubscriptionConfirmationState(true);

        const headerEl = this.shadowRoot && this.shadowRoot.querySelector
            ? this.shadowRoot.querySelector('#csCTAText')
            : null;
        if (headerEl) headerEl.textContent = "You're in. Welcome to FUSION.";

        const safeCategory = category ? ` (${category})` : '';
        confirmEl.textContent =
            `Confirmed: early access updates will be sent to ${email}${safeCategory}. ` +
            `Watch for applications, artist announcements, and gallery previews.`;
    }

    hideSubscriptionConfirmation() {
        const confirmEl =
            this.shadowRoot && this.shadowRoot.querySelector
                ? this.shadowRoot.querySelector('#csSubscriptionConfirmation')
                : null;
        const postText2El =
            this.shadowRoot && this.shadowRoot.querySelector
                ? this.shadowRoot.querySelector('#csCTAPostText2')
                : null;
        if (confirmEl) confirmEl.style.display = 'none';
        if (postText2El) postText2El.style.display = '';
        this.setSubscriptionConfirmationState(false);
    }

    setupEarlyAccessSubscription() {
        // Avoid attaching multiple listeners on re-connect / re-render flows.
        if (this._earlyAccessSubscriptionAttached) return;
        this._earlyAccessSubscriptionAttached = true;

        // `submit` covers button click + Enter in the email field; delegation survives re-renders.
        this.shadowRoot.addEventListener('submit', async (e) => {
            const form = e.target;
            if (!form || form.id !== 'csCTAForm') return;

            e.preventDefault();
            e.stopPropagation(); // prevent loadscreen-container click behavior

            const btn = this.shadowRoot.querySelector('#csCTASubscribe');
            if (!btn) return;

            const emailInput = this.shadowRoot.querySelector('#csCTAEmail');
            const email = ((emailInput && emailInput.value) ? emailInput.value : '').trim();
            const rawCategory = this.selectedComingSoonCategory;
            const category =
                (rawCategory || '').trim() === 'Gallery' ? 'Gallery Access' : (rawCategory || '').trim();

            this.hideSubscriptionConfirmation();
            this.setSubscriptionConfirmationState(false);

            // Require category first so users don't think email alone is enough.
            if (!category) {
                this.setCTAStatus('Please select a role (Artist / Collector / Curator / Gallery) first.');
                return;
            }
            if (!email || !email.includes('@')) {
                this.setCTAStatus('Please enter a valid email.');
                return;
            }

            const originalText = btn.textContent;
            this._earlyAccessSubmitting = true;
            btn.disabled = true;
            btn.textContent = 'Submitting...';
            this.setCTAStatus('Submitting your email...');

            try {
                await submitEarlyAccessToCanister(email, category, '', '');

                // Hide the transient status and show the stored-email confirmation.
                this.hideCTAStatus();
                this.showSubscriptionConfirmation(email, category);
                if (emailInput) emailInput.value = '';
            } catch (err) {
                if (DEV_MODE) {
                    console.error('Early access subscribe failed', err);
                    console.error('[EarlyAccess] IC host:', getHost());
                }
                this.hideSubscriptionConfirmation();
                this.setCTAStatus('Subscription failed. Please try again.');
            } finally {
                this._earlyAccessSubmitting = false;
                btn.textContent = originalText;
                this.updateEarlyAccessSubscribeEnabled();
            }
        });
    }

    render() {
        const isVisible = this.visible;
        const configOptions = Object.keys(this.positionConfigs || {});
        const defaultCssConfig = this.positionConfigs?.comingSoon2 || {};
        const defaultCircleKeys = ['c1', 'c2', 'c3', 'c4', 'c5'];
        const defaultCircleCfg = defaultCircleKeys.reduce((acc, key) => {
            acc[key] = defaultCssConfig[key] || {};
            return acc;
        }, {});
        const circleKeys = ['c1', 'c2', 'c3', 'c4', 'c5'];
        const labelConfig = this.positionConfigs?.[this.selectedConfig] || {};
        const circleLabels = circleKeys.map((key) => {
            return (labelConfig && labelConfig[key] && labelConfig[key].colorName) || key.toUpperCase();
        });
        const siteActive = !!config.siteActive;
        this.shadow.innerHTML = `
            <style>
                :host {
                    display: ${isVisible ? 'block' : 'none'};
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: var(--bg);
                    backdrop-filter: blur(4px);
                    font-family: 'momochidori-variable', sans-serif;
                    z-index: 1000;
                }

                .loadscreen-container {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    height: 100%;
                    color: var(--c2);
                    z-index: 1;
                }

                .circle1 {
                    position: absolute;
                    top: ${defaultCircleCfg.c1.top ?? '50%'};
                    bottom: ${defaultCircleCfg.c1.bottom ?? 'auto'};
                    left: ${defaultCircleCfg.c1.left ?? '50%'};
                    right: ${defaultCircleCfg.c1.right ?? 'auto'};
                    transform: translate(-50%, -50%);
                    width: ${defaultCircleCfg.c1.width ?? '200px'};
                    height: ${defaultCircleCfg.c1.height ?? '200px'};
                    background-color: var(--c1);
                    border-radius: 50%;
                    z-index: ${defaultCircleCfg.c1.zIndex ?? 'auto'};
                    display: ${defaultCircleCfg.c1.visible === false ? 'none' : 'block'};
                }

                .circle2 {
                    position: absolute;
                    top: ${defaultCircleCfg.c2.top ?? '50%'};
                    bottom: ${defaultCircleCfg.c2.bottom ?? 'auto'};
                    left: ${defaultCircleCfg.c2.left ?? '50%'};
                    right: ${defaultCircleCfg.c2.right ?? 'auto'};
                    transform: translate(-50%, -50%);
                    width: ${defaultCircleCfg.c2.width ?? '200px'};
                    height: ${defaultCircleCfg.c2.height ?? '200px'};
                    background-color: var(--c2);
                    border-radius: 50%;
                    z-index: ${defaultCircleCfg.c2.zIndex ?? 'auto'};
                    display: ${defaultCircleCfg.c2.visible === false ? 'none' : 'block'};
                }

                .circle3 {
                    position: absolute;
                    top: ${defaultCircleCfg.c3.top ?? '50%'};
                    bottom: ${defaultCircleCfg.c3.bottom ?? 'auto'};
                    left: ${defaultCircleCfg.c3.left ?? '50%'};
                    right: ${defaultCircleCfg.c3.right ?? 'auto'};
                    transform: translate(-50%, -50%);
                    width: ${defaultCircleCfg.c3.width ?? '200px'};
                    height: ${defaultCircleCfg.c3.height ?? '200px'};
                    background-color: var(--c3);
                    border-radius: 50%;
                    z-index: ${defaultCircleCfg.c3.zIndex ?? 'auto'};
                    display: ${defaultCircleCfg.c3.visible === false ? 'none' : 'block'};
                }

                .circle4 {
                    position: absolute;
                    top: ${defaultCircleCfg.c4.top ?? '50%'};
                    bottom: ${defaultCircleCfg.c4.bottom ?? 'auto'};
                    left: ${defaultCircleCfg.c4.left ?? '50%'};
                    right: ${defaultCircleCfg.c4.right ?? 'auto'};
                    transform: translate(-50%, -50%);
                    width: ${defaultCircleCfg.c4.width ?? '200px'};
                    height: ${defaultCircleCfg.c4.height ?? '200px'};
                    background-color: var(--c4);
                    border-radius: 50%;
                    z-index: ${defaultCircleCfg.c4.zIndex ?? 'auto'};
                    display: ${defaultCircleCfg.c4.visible === false ? 'none' : 'block'};
                }

                .circle5 {
                    position: absolute;
                    top: ${defaultCircleCfg.c5.top ?? '50%'};
                    bottom: ${defaultCircleCfg.c5.bottom ?? 'auto'};
                    left: ${defaultCircleCfg.c5.left ?? '50%'};
                    right: ${defaultCircleCfg.c5.right ?? 'auto'};
                    transform: translate(-50%, -50%);
                    width: ${defaultCircleCfg.c5.width ?? '200px'};
                    height: ${defaultCircleCfg.c5.height ?? '200px'};
                    background-color: var(--c5);
                    border-radius: 50%;
                    z-index: ${defaultCircleCfg.c5.zIndex ?? 'auto'};
                    display: ${defaultCircleCfg.c5.visible === false ? 'none' : 'block'};
                }

                .spinner {
                    display: none;
                    width: 50px;
                    height: 50px;
                    border: 4px solid rgba(255, 255, 255, 0.3);
                    border-top: 4px solid #ffffff;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 1.5rem;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .message {
                    display: none;
                    font-family: 'momochidori-variable', sans-serif;
                    font-size: 1.25rem;
                    font-weight: 400;
                    text-align: center;
                    color: #ffffff;
                    margin: 0;
                    opacity: 0.9;
                }

                .dots {
                    display: none;
                    animation: dots 1.5s steps(4, end) infinite;
                }

                @keyframes dots {
                    0%, 20% { content: '.'; }
                    40% { content: '..'; }
                    60% { content: '...'; }
                    80%, 100% { content: ''; }
                }

                .dots::after {
                    content: '...';
                    animation: dots 1.5s steps(4, end) infinite;
                }

                .motifVid {
                    position: absolute;
                    width: 40%;
                    height: auto;
                    z-index: 150;
                    mix-blend-mode: multiply;
                }

                .motifVid video {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }

                .vid3 {
                    top: 8%;
                    right: -1%;
                }

                @keyframes  flyLeftRight {
                    0% {
                        left: -30%;
                    }
                    100% {
                        left: 100%;
                        top: -25%;
                    }
                }

                #enterAction {
                    width: 98%;
                    height: 100%;
                    position: absolute;
                    display: ${siteActive ? 'flex' : 'none'};
                    flex-direction: column;
                    align-items: end;
                    justify-content: center;
                    position: absolute;
                    top: 0;
                    left: 0;
                    z-index: 151;
                    color: var(--c2);
                    font-size: 1.2rem;
                    font-variation-settings: var(--fv-title);
                    padding-right: 2%;
                    transition: all 0.5s ease-in-out;
                }

                @media (max-width: 768px) {
                    #enterAction {
                        width: 100%;
                        align-items: center;
                        justify-content: center;
                        padding-right: 0;
                        padding-left: 0;
                        box-sizing: border-box;
                    }

                    #cteE,
                    #cteJ {
                        width: 100%;
                        text-align: center;
                    }
                }

                #enterAction.hidden {
                   transform: translateY(-50%);
                   opacity: 0;
                }

                .debug-toggle {
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    z-index: 10000;
                    padding: 4px 8px;
                    font-size: 0.8rem;
                    cursor: pointer;
                    background: rgba(0, 0, 0, 0.7);
                    color: #fff;
                    border: none;
                    pointer-events: auto;
                    user-select: auto;
                }

                .debug-panel {
                    position: fixed;
                    top: 0;
                    right: 0;
                    width: 280px;
                    height: 100%;
                    background: rgba(255, 255, 255, 0.9);
                    color: #000;
                    font-size: 0.75rem;
                    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    z-index: 9999;
                    overflow-y: auto;
                    padding: 8px;
                    box-shadow: -2px 0 6px rgba(0, 0, 0, 0.2);
                    transition: transform 0.3s ease-in-out;
                    pointer-events: auto;
                    user-select: auto;
                }

                .debug-panel.collapsed {
                    transform: translateX(100%);
                }

                .debug-panel h4 {
                    margin: 8px 0 4px;
                    font-size: 0.8rem;
                    border-bottom: 1px solid #ccc;
                    padding-bottom: 2px;
                }

                .debug-panel .control-row {
                    display: flex;
                    align-items: center;
                    margin: 2px 0;
                }

                .debug-panel .control-row label {
                    width: 60px;
                }

                .debug-panel .control-row input[type="range"],
                .debug-panel .control-row input[type="number"] {
                    flex: 1;
                }

                .debug-panel .control-row input[type="checkbox"] {
                    margin-left: 4px;
                }

                .debug-panel .debug-actions {
                    display: flex;
                    gap: 4px;
                    margin-top: 8px;
                }

                .debug-panel .debug-actions button {
                    flex: 1;
                    padding: 4px;
                    font-size: 0.75rem;
                    cursor: pointer;
                }

                .debug-panel .config-row {
                    margin-top: 8px;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .debug-panel .config-row select {
                    width: 100%;
                    padding: 2px 4px;
                    font-size: 0.75rem;
                }

                .debug-panel .debug-export {
                    margin-top: 8px;
                    display: flex;
                    gap: 4px;
                }

                .debug-panel .debug-export input[type="text"] {
                    flex: 1;
                    padding: 2px 4px;
                    font-size: 0.75rem;
                }

                .debug-panel .debug-export button {
                    padding: 4px 6px;
                    font-size: 0.75rem;
                    cursor: pointer;
                }

                #comingSoon {
                    width: 40%;
                    height: 100%;
                    padding: 0;
                    padding-left: 15%;
                    padding-right: 2%;
                    grid-template-columns: 1fr;
                    grid-template-rows: 1fr;
                    align-items: center;
                    justify-items: center;
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 1000;
                    overflow-y: auto;
                    mix-blend-mode: multiply;
                    display: ${siteActive ? 'none' : 'grid'};
                }

                #comingSoonParent {
                    width: 100%;
                    height: auto;
                    padding-left: 5%;
                    padding-right: 5%;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    transform: translateY(-10px);
                }

                #csHead {
                    height: 10%;
                    font-size: 1.8rem;
                    text-align: left;
                    font-variation-settings: var(--fv-headline-wide);
                    display: flex;
                    align-items: center;
                    justify-content: left;
                    gap: 10px;
                }

                #logoText {
                    font-size: 3.7rem;
                    font-variation-settings: var(--fv-hero-wide);
                    letter-spacing: 0.05em;
                }
                
                #csSubHead {
                    font-size: 1.20rem;
                    text-align: left;
                    letter-spacing: 0.05em;
                    font-variation-settings: var(--fv-label-strong);
                }
                
                #csMainText {
                    font-size: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    align-items: left;
                    justify-content: left;
                    font-variation-settings: var(--fv-hero);
                    letter-spacing: 0.02em;
                    margin-bottom: 5%;
                }

                #csMainText p {
                    margin-bottom: 0px;
                }
                
                #csCTAText {
                    font-size: 1.5rem;
                    text-align: left;
                    display: flex;
                    flex-direction: column;
                    align-items: left;
                    justify-content: left;
                    margin-bottom: 10px;
                    font-variation-settings: var(--fv-display);
                }

                #csCTASelectors {
                    display: flex;
                    flex-direction: column;
                    align-items: left;
                    justify-content: left;
                    margin-bottom: 10px;
                }

                #csIAmSelect {
                    font-size: 1.2rem;
                    font-variation-settings: var(--fv-display); 
                }

                #csSelectorButtons {
                    display: flex;
                    flex-direction: row;
                    align-items: left;
                    justify-content: left;
                    margin-bottom: 10px;
                    gap: 20px;
                }

                .csSelectorButton {
                    width: 24%;
                    height: 15px;
                    font-size: 1rem;
                    font-variation-settings: var(--fv-display);
                    cursor: pointer;
                    padding: 10px;
                    border-radius: 5px; 
                    border: 1.5px solid #000000;
                    cursor: pointer;
                    text-align: center;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .csSelectorButton:hover {
                    background-color: var(--c2);
                    color: white;
                }

                .csSelectorButton.active {
                    background-color: var(--c2);
                    color: white;
                }

                #csCTAInput {
                    display: flex;
                    flex-direction: row;
                    align-items: left;
                    justify-content: left;
                    margin-bottom: 10px;
                }

                #csCTAForm {
                    display: contents;
                }

                #csCTAEmail {
                    width: 100%;
                    height: 100%;
                    padding-bottom: 10px;
                    padding-top: 10px;
                    border-top: none;
                    border-left: none;
                    border-right: none;
                    border-bottom: 1.5px solid #000000;
                    font-size: 1.1rem;
                    background-color: transparent;
                    font-family: 'momochidori-variable', sans-serif;
                    font-variation-settings: var(--fv-display);
                }

                #csCTASubscribe {
                    font-size: 1.3rem;
                    width: 80%;
                    height: 100%;
                    border-top: none;
                    border-left: none;
                    border-right: none;
                    border-bottom: 1.5px solid #000000;
                    cursor: pointer;
                    background-color: transparent;
                    color: #000000;
                    -webkit-appearance: none;
                    appearance: none;
                    outline: none;
                    box-shadow: none;
                    font-family: 'momochidori-variable', sans-serif;
                    font-variation-settings: var(--fv-display);
                    text-align: end;
                    justify-content: end;
                    align-items: center;
                    padding-bottom: 5px;
                    padding-top: 9px;
                }

                #csCTASubscribe:hover {
                    background-color: var(--c2);
                    color: white;
                }

                #csCTASubscribe:focus,
                #csCTASubscribe:focus-visible,
                #csCTASubscribe:active {
                    background-color: transparent;
                    color: #000000;
                    outline: none;
                    box-shadow: none;
                }

                #csCTASubscribe:disabled {
                    cursor: not-allowed;
                    opacity: 0.45;
                    color: #000000;
                }

                #csCTASubscribe:disabled:hover {
                    background-color: transparent;
                    color: #000000;
                }
                    
                #csCTAPostText {
                    font-size: 1rem;
                    font-variation-settings: var(--fv-label-strong);
                    font-family: 'momochidori-variable', sans-serif;
                    text-align: left;
                    display: flex;
                    flex-direction: column;
                    align-items: left;
                }

                #csCTAPostText p {
                    margin-bottom: 0px;
                }

                #csCTAPostText2 {
                    font-size: .9rem;
                    font-variation-settings: var(--fv-label-strong);
                    font-family: 'momochidori-variable', sans-serif;
                    text-align: left;
                    display: flex;
                    flex-direction: column;
                    align-items: left;
                    margin-top: 5px;
                }

                #csSubscriptionStatus {
                    font-size: .9rem;
                    font-variation-settings: var(--fv-label-strong);
                    font-family: 'momochidori-variable', sans-serif;
                    text-align: left;
                    display: none;
                    flex-direction: column;
                    align-items: left;
                    margin-top: 5px;
                }

                #csSubscriptionConfirmation {
                    font-size: .9rem;
                    font-variation-settings: var(--fv-label-strong);
                    font-family: 'momochidori-variable', sans-serif;
                    text-align: left;
                    display: none;
                    flex-direction: column;
                    align-items: left;
                    margin-top: 5px;
                }

                #csInstagram {
                    margin-top: auto;
                    padding-top: 12px;
                    font-size: clamp(0.95rem, 2.2vw, 1.1rem);
                    font-variation-settings: var(--fv-label-strong);
                    font-family: 'momochidori-variable', sans-serif;
                }

                #csInstagram a {
                    color: #000000;
                    text-decoration: underline;
                }

                .cs-footer-bar {
                    margin-top: 1.25rem;
                    padding-top: 1.25rem;
                    border-top: 1px solid rgba(0, 0, 0, 0.12);
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 1rem;
                    width: 100%;
                    box-sizing: border-box;
                }

                .loadscreen-cs-sign-in {
                    box-sizing: border-box;
                    font-family: inherit;
                    font-variation-settings: var(--fv-nav-active);
                    font-size: clamp(0.65rem, 0.95vw, 0.8rem);
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    border: 1.5px solid var(--c2, #000);
                    background: transparent;
                    color: var(--c2, #000);
                    padding: 0.45rem 0.85rem;
                    min-height: 2.25rem;
                    cursor: pointer;
                    -webkit-appearance: none;
                    appearance: none;
                }

                .loadscreen-cs-sign-in:hover {
                    opacity: 0.88;
                }

                #loadscreenCsAdminEnter {
                    cursor: pointer;
                    user-select: none;
                }

                #loadscreenCsAdminEnter[hidden] {
                    display: none !important;
                }

                .loadscreen-cs-enter-en {
                    font-size: 1.1rem;
                    font-variation-settings: var(--fv-title);
                    color: var(--c2);
                }

                .loadscreen-cs-enter-ja {
                    font-size: 0.95rem;
                    opacity: 0.85;
                    margin-top: 0.25rem;
                }

                @media (max-width: 1650px) {
                    #comingSoon {
                        width: 50%;
                        padding-left: 5%;
                        padding-right: 5%;
                    }
                }

                @media (max-width: 1350px) {
                    #comingSoon {
                        width: 60%;
                        padding-left: 5%;
                        padding-right: 5%;
                    }
                }

                @media (max-width: 1100px) {
                    #comingSoon {
                        width: 70%;
                        padding-left: 15%;
                        padding-right: 15%;
                    }
                }

                @media (max-width: 800px) {
                    #comingSoon {
                        width: 80%;
                        padding-left: 10%;
                        padding-right: 10%;
                    }

                    #csSelectorButtons {
                        display: grid;
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                        gap: 10px;
                        width: 100%;
                        height: 100% !important;
                        align-items: center;
                        justify-items: center;
                    }

                    .csSelectorButton {
                        font-size: .8rem;
                        width: auto !important;
                        height: 10px !important;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding-bottom: 10px;
                    }
                }

                @media (max-width: 800px) {
                    #comingSoon {
                        width: 90%;
                        height: 90%;
                        padding-left: 5%;
                        padding-right: 5%;
                        padding-top: 10%;
                    }

                    #csHead {
                        display: grid;
                        grid-template-columns: 1fr;
                        grid-template-rows: 1fr;
                        align-items: center;
                        justify-items: center;
                        gap: 0px;
                    }

                    #csHeadText {
                        font-size: 1.2rem !important;
                        font-variation-settings: var(--fv-title);
                    }

                    #logoText {
                        font-size: 2.6em !important;
                    }

                    .vid3 {
                        display: none;
                    }

                    #csMainText {
                        font-size: 1.2rem;
                    }

                    #csCTASelectors {
                        margin-bottom: 10%;
                    }

                    #csSelectorButtons {
                        display: grid;
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                        gap: 20px;
                        width: 100%;
                        height: 100% !important;
                        align-items: center;
                        justify-items: center;
                    }

                    .csSelectorButton {
                        font-size: .8rem;
                        width: 90% !important;
                        height: 25px !important;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding-bottom: 10px;
                    }

                    #csCTASubscribe {
                        font-size: 1rem;
                        width: 100%;
                        height: 100%;
                        border-top: none;
                        border-left: none;
                        border-right: none;
                        border-bottom: 1.5px solid #000000;
                        padding-bottom: 11px;
                        background-color: transparent;
                        color: #000000;
                        -webkit-appearance: none;
                        appearance: none;
                        outline: none;
                        box-shadow: none;
                    }

                    #csCTASubscribe:focus,
                    #csCTASubscribe:focus-visible,
                    #csCTASubscribe:active {
                        background-color: transparent;
                        color: #000000;
                        outline: none;
                        box-shadow: none;
                    }

                    #csCTASubscribe:disabled {
                        cursor: not-allowed;
                        opacity: 0.45;
                        color: #000000;
                    }

                    #csCTASubscribe:disabled:hover {
                        background-color: transparent;
                        color: #000000;
                    }

                    #csCTAEmail {
                        font-size: 1rem;
                        width: 100%;
                        height: 100%;
                        padding-bottom: 10px;
                        padding-top: 10px;
                    }

                    #csCTAPostText {
                        font-size: .8rem;
                        width: 100%;
                        height: 100%;
                        padding-bottom: 10px;
                        padding-top: 10px;
                    }
                }
            </style>
            <div id="comingSoon">
                <div id="comingSoonParent">
                    <div id="csHead"><span id="csHeadText">The Next Chapter of</span> <span id="logoText">FUSION</span></div>
                    <div id="csSubHead">Programs rooted in Japan. Networked internationally.</div>
                    <div id="csMainText">
                        <p>A global platform for discovering artists and shaping contemporary object culture through programs rooted in Japan.</p>
                        <p>Based in Japan and working internationally, FUSION is expanding with residency programs, curated artist discovery, gallery access, and the upcoming FUSION 100 Fair.</p>
                    </div>
                    <div id="csCTAText">Join the Network</div>
                    <div id="csCTASelectors">
                        <div id="csIAmSelect">I am a:</div>
                        <div id="csSelectorButtons">
                            <div id="csSelectorButton1" class="csSelectorButton">Artist</div>
                            <div id="csSelectorButton2" class="csSelectorButton">Collector</div>
                            <div id="csSelectorButton3" class="csSelectorButton">Curator</div>
                            <div id="csSelectorButton4" class="csSelectorButton">Gallery</div>
                        </div>
                    </div>
                    <div id="csCTAInput">
                        <form id="csCTAForm" novalidate>
                            <input id="csCTAEmail" type="email" placeholder="Enter your email" autocomplete="email" />
                            <button type="submit" id="csCTASubscribe">Get Early Access</button>
                        </form>
                    </div>
                    <div id="csCTAPostText">
                        <p>Early access to applications, artist announcements, and gallery previews.</p>
                        <p id="csCTAPostText2">Programs based in Japan with an international network of artists, curators, and galleries.</p>
                        <p id="csSubscriptionStatus"></p>
                        <p id="csSubscriptionConfirmation"></p>
                    </div>
                    <div id="csInstagram">
                        <a
                            href="https://www.instagram.com/fusion_intl/"
                            target="_blank"
                            rel="noopener noreferrer"
                        >Follow us on Instagram @fusion_intl</a>
                    </div>
                    <div id="csFooterBar" class="cs-footer-bar">
                        <button type="button" id="loadscreenCsSignIn" class="loadscreen-cs-sign-in">SIGN-IN</button>
                        <div id="loadscreenCsAdminEnter" class="loadscreen-cs-admin-enter" hidden>
                            <div class="loadscreen-cs-enter-en">CLICK TO ENTER</div>
                            <div class="loadscreen-cs-enter-ja">クリックして入場</div>
                        </div>
                    </div>
                </div>
            </div>
            <button class="debug-toggle" type="button" style="display:${DEV_MODE ? 'block' : 'none'}">Debug</button>
            <div class="debug-panel collapsed" style="display:${DEV_MODE ? 'block' : 'none'}">
                    <div><strong>Circle Debug</strong></div>
                    <div class="config-row">
                        <label for="debug-config-select">Position preset</label>
                        <select id="debug-config-select">
                            <option value="">Default (current)</option>
                            ${configOptions.map(name => '<option value="' + name + '">' + name + '</option>').join('')}
                        </select>
                    </div>
                    <div class="debug-actions">
                        <button id="debug-start-dynamics" type="button">Start</button>
                        <button id="debug-stop-dynamics" type="button">Stop</button>
                    </div>
                    <div class="debug-actions">
                        <button id="debug-open-studio" type="button">Open Studio</button>
                        <button id="debug-open-profile-settings" type="button">Profile settings</button>
                    </div>

                    ${circleKeys.map((key, index) => {
                        const label = circleLabels[index];
                        return (
                            '<div class="circle-section">' +
                            '<h4>' + label + '</h4>' +
                            '<div class="control-row">' +
                            '<label for="' + key + '-top">Top</label>' +
                            '<input id="' + key + '-top" type="range" min="-100" max="200" />' +
                            '</div>' +
                            '<div class="control-row">' +
                            '<label for="' + key + '-left">Left</label>' +
                            '<input id="' + key + '-left" type="range" min="-100" max="200" />' +
                            '</div>' +
                            '<div class="control-row">' +
                            '<label for="' + key + '-size">Size</label>' +
                            '<input id="' + key + '-size" type="range" min="0" max="2400" />' +
                            '</div>' +
                            '<div class="control-row">' +
                            '<label for="' + key + '-zindex">z-index</label>' +
                            '<input id="' + key + '-zindex" type="number" min="0" max="999" />' +
                            '</div>' +
                            '<div class="control-row">' +
                            '<label for="' + key + '-active">Active</label>' +
                            '<input id="' + key + '-active" type="checkbox" />' +
                            '</div>' +
                            '<div class="control-row">' +
                            '<label for="' + key + '-visible">Visible</label>' +
                            '<input id="' + key + '-visible" type="checkbox" />' +
                            '</div>' +
                            '</div>'
                        );
                    }).join('')}
                    <div class="debug-export">
                        <input id="debug-config-name" type="text" placeholder="Position name (optional)" />
                        <button id="debug-copy-config" type="button">Copy config</button>
                    </div>
                </div>
            <div class="loadscreen-container">
                <div id="enterAction">
                    <div id="cteE">CLICK TO ENTER</div>
                    <div id="cteJ">クリックして入場</div>
                </div>
                <!-- vid1/vid2 removed: empty <video> still paints in some in-app browsers (e.g. Instagram) -->
                <div class="motifVid vid3">
                    <video
                        src="${fusionNature2}"
                        autoplay
                        muted
                        loop
                        playsinline
                        preload="metadata"
                        aria-label="${withSeoVideoLabel('Fusion loadscreen background')}"
                        title="${withSeoVideoLabel('Fusion loadscreen background')}"
                    ></video>
                </div>
                <div class="circle1"></div>
                <div class="circle2"></div>
                <div class="circle3"></div>
                <div class="circle4"></div>
                <div class="circle5"></div>
                <div class="spinner"></div>
                <p class="message">${this.message}<span class="dots"></span></p>
            </div>
        `;
    }
}

customElements.define('app-loadscreen', LoadScreenComponent);

export { LoadScreenComponent };