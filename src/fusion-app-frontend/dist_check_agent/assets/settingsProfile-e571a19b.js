import{ab as Ia,aA as si,a2 as _e,M as Ne,ag as Ue,aB as Ua,aC as li,aD as pt,aE as ot,K as ct,aF as He,aG as Wa,aH as Xe,E as Ze,aI as di,af as qa,y as pi,l as ci,aJ as $a,aK as mi,aL as ui,aM as fi,aN as gi,aO as yi,N as Ke,aP as da,aQ as hi,q as bi,aR as vi,al as _i,aS as Pt,aT as wi,ao as Oa,aU as Si,aV as Ha,aW as pa,aX as Pi,o as V,aY as Va,ah as Ei,aZ as Ai,a_ as Ci,a$ as Mi,b0 as Ii,b1 as $i,b2 as xi,b3 as xa,b4 as Ja,b5 as Li,b6 as Bi,b7 as ki,b8 as Ti,b9 as mt,ba as Ni}from"./index-20317f29.js";import{u as ut,p as Di,s as Ya,f as Fi,a as ca,c as Qt,P as Ri,i as Ga,r as ji,b as Ui}from"./studioDateFormat-30c8922b.js";const Wi="/assets/explore-programs-3becc4f9.svg",qi="/assets/my-programs-83f66ba0.svg",Xt="/assets/payments-08af1cce.svg",Oi="/assets/manual-payment-417bd749.svg",La="/assets/payment-plan-d3fd375b.svg",Hi="/assets/receipt-download-ee91e1a5.svg",Vi="/assets/warning-d449b082.svg",Ba="/assets/flight-icon-a8cccfa4.png";function Ji(){return`<select id="mpd_discipline" class="studio-input" aria-label="Discipline">${['<option value="">Select discipline…</option>',...hi.map(t=>`<option value="${we(t.key)}">${we(t.label)}</option>`)].join("")}</select>`}function we(e){return String(e??"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function Qe(e){const t=Ya(e);return`<span class="studio-nav-item__icon" aria-hidden="true">${t?`<img src="${we(t)}" alt="" />`:'<span class="studio-nav-item__icon-fallback">•</span>'}</span>`}function Ae(e,t){return`<span class="${we(t)}" style="--mpd-icon-url: url(&quot;${we(e)}&quot;)" aria-hidden="true"></span>`}function Oe(e){bi({title:`${e} · Fusion`,description:"Edit your Fusion member profile and account settings. Sign in with Internet Identity.",path:typeof window<"u"?window.location.pathname:"/settings/profile",robots:"noindex, nofollow"})}const Et="/program/kaga-ishikawa",Yi=1*1024*1024,Gi="en",zi=["practice","perspective","vision","constructing","context","quote"];let Zt="world",ve=null,vt=!1,ea="",ta="",za=()=>{};const aa=new Map;let rt="inactive",At=[],Ve="",Ct=[];const ka={overview:{shoutHtml:"Your work exists in context.<br />This is where it begins.",hint:"Shape how you appear on the public site. Save each section as you go."},location:{shoutHtml:"Where you are in your practice.",hint:"Set your studio status and location so visitors and partners see the right context."},story:{shoutHtml:"Clarify the core of your work.",hint:"Your practice, perspective, vision, and how you are constructing the world  you want to create."},links:{shoutHtml:"Your presence beyond Fusion.",hint:"Link to your site, socials, and portfolios so people can follow your work everywhere."},programs:{shoutHtml:"Programs and opportunities.",hint:"Track applications and explore public programs that match your practice."},membership:{shoutHtml:"Your membership keeps your practice visible.",hint:"View billing, update payment, or manage your subscription. We are here if you need help."},dev:{shoutHtml:"Developer tools.",hint:"Raw locales JSON for debugging. Use with care."}};function Dt(e,...t){if(!e||typeof e!="object")return"";const a=e;for(const n of t){const i=a[n];if(i!=null){if(Array.isArray(i)){const s=da(i);if(s!=null)return String(s).trim()}else if(typeof i=="string")return i.trim()}}return""}function Ta(e){if(!e||typeof e!="object")return"";const t=e.locales_json??e.localesJson;if(typeof t=="string")return t;const a=Array.isArray(t)?da(t):t;return typeof a=="string"?a:""}function Ki(e){const t=String(e||"").toLowerCase();return t?{active:"Active",trialing:"Trialing",past_due:"Past due",canceled:"Canceled",unpaid:"Unpaid",incomplete:"Incomplete",incomplete_expired:"Incomplete (expired)",paused:"Paused"}[t]||String(e):"No subscription"}function Ft(e){if(!e)return"—";const t=new Date(e);if(Number.isNaN(t.getTime()))return"—";try{return new Intl.DateTimeFormat(void 0,{dateStyle:"long"}).format(t)}catch{return e.slice(0,10)}}function Na(e){if(!e)return"";const t=new Date(e);if(Number.isNaN(t.getTime()))return"";const a=new Date,n=Math.ceil((t.getTime()-a.getTime())/864e5);return n===0?"Today":n===1?"Tomorrow":n>1?`In ${n} days`:n===-1?"Yesterday":`${Math.abs(n)} days ago`}async function Rt(e){const{file:t,heicWarning:a}=await Di(e,Yi);return a&&je("HEIC photo accepted — if preview fails, export as JPEG or WebP and upload again."),t}function jt(e){document.querySelectorAll(".mpd-file-input-hidden").forEach(t=>{var a;t instanceof HTMLInputElement&&((a=t.accept)!=null&&a.includes("image"))&&(t.disabled=!e)}),document.querySelectorAll(".mpd-media-upload-label").forEach(t=>{t instanceof HTMLElement&&(t.classList.toggle("is-disabled",!e),t.style.pointerEvents=e?"":"none",t.style.opacity=e?"":"0.45",e?(t.removeAttribute("aria-disabled"),t.removeAttribute("title")):(t.setAttribute("aria-disabled","true"),t.title="Loading profile…"))})}function je(e){if(za(e||""),!e)return;const t=document.getElementById("settingsProfileStatus");t&&t.scrollIntoView({block:"nearest",behavior:"smooth"})}function Ut(e){return ea||ta||He()==="test"?!0:(je("Profile still loading — wait a moment, then try your upload again."),e.value="",!1)}function Ka(e){return document.getElementById(e)}function Qi(e){if(!e||typeof e!="object")return"User Profile";const t=e.role;if(t&&typeof t=="object"){if("user"in t)return"User Profile";if("artist"in t)return"Artist Dashboard";if("gallery"in t)return"Gallery Dashboard";if("curator"in t)return"Curator Dashboard";if("collector"in t)return"Collector Dashboard";if("staff"in t)return"Staff Dashboard";if("admin"in t)return"Admin Dashboard"}return"User Profile"}function Da(e){if(!e||typeof e!="object")return"Member";const t=e.role;if(t&&typeof t=="object"){if("user"in t)return"User";if("artist"in t)return"Artist";if("gallery"in t)return"Gallery";if("curator"in t)return"Curator";if("collector"in t)return"Collector";if("staff"in t)return"Staff";if("admin"in t)return"Admin"}return"Member"}function D(e){const t=Ka(e);return!t||!("value"in t)?"":String(t.value??"")}function I(e,t){const a=Ka(e);a&&"value"in a&&(a.value=t)}function Wt(){return D("mpd_w_quote").trim()}function De(e){const t=document.getElementById("mpd_hero_spinner");t&&(t.hidden=!e,t.setAttribute("aria-hidden",e?"false":"true"))}function Fe(e){const t=document.getElementById("mpd_hero_profile_spinner");t&&(t.hidden=!e,t.setAttribute("aria-hidden",e?"false":"true"))}function me(e,t){const a=document.getElementById(`mpd_intro_${e}_spinner`);a&&(a.hidden=!t,a.setAttribute("aria-hidden",t?"false":"true"))}function ue(e,t){const a=document.querySelector(`[data-mpd-media-surface="${e}"]`);if(!a)return;const n=!!(t.hasPreview??t.hasMedia);a.classList.toggle("has-media",!!t.hasMedia),a.classList.toggle("has-preview",n)}function Je(e){const t=aa.get(e);t&&(URL.revokeObjectURL(t),aa.delete(e))}function qt(e,t){Je(e);const a=URL.createObjectURL(t);aa.set(e,a);const n=/^intro-(\d+)$/.exec(e);if(n){const i=Number(n[1]);ue(e,{hasMedia:!1,hasPreview:!0}),me(i,!1);const s=document.getElementById(`mpd_intro_${i}_thumb`);s&&(s.src=a,s.style.display="block");return}if(e==="hero"){ue("hero",{hasMedia:!1,hasPreview:!0}),De(!1);const i=document.getElementById("mpd_hero_preview");i&&(i.src=a,i.style.display="block");return}if(e==="heroProfile"){ue("heroProfile",{hasMedia:!1,hasPreview:!0}),Fe(!1);const i=document.getElementById("mpd_hero_profile_preview");i&&(i.src=a,i.style.display="block")}}function Xi(e,t){Je(e);const a=/^intro-(\d+)$/.exec(e);if(!a)return;const n=Number(a[1]);ue(e,{hasMedia:!0,hasPreview:!0});const i=document.getElementById(`mpd_intro_${n}_thumb`);i&&(i.style.display="none",i.onload=()=>{me(n,!1),i.style.display="block",i.onload=null,i.onerror=null},i.onerror=()=>{me(n,!1),ue(e,{hasMedia:!0,hasPreview:!1}),je("Preview could not load. Save and refresh, or try another image."),i.onload=null,i.onerror=null},i.src=ia(t),i.complete&&i.naturalHeight>0&&(me(n,!1),i.style.display="block",i.onload=null,i.onerror=null))}function ft(e){if(Je(e),ue(e,{hasMedia:!1,hasPreview:!1}),e==="hero"){const a=document.getElementById("mpd_hero_preview");a&&(a.removeAttribute("src"),a.style.display="none"),De(!1);return}if(e==="heroProfile"){const a=document.getElementById("mpd_hero_profile_preview");a&&(a.removeAttribute("src"),a.style.display="none"),Fe(!1);return}const t=/^intro-(\d+)$/.exec(e);if(t){const a=Number(t[1]);me(a,!1);const n=document.getElementById(`mpd_intro_${a}_thumb`);n&&(n.removeAttribute("src"),n.style.display="none")}}function _t(){const e=document.getElementById("mpd_hero_profile_card_name"),t=document.getElementById("mpd_hero_profile_card_discipline"),a=[D("mpd_first_name"),D("mpd_last_name")].map(s=>s.trim()).filter(Boolean).join(" "),n=document.getElementById("mpd_discipline");let i="";n instanceof HTMLSelectElement?i=n.selectedIndex>0?n.options[n.selectedIndex].text:"":i=D("mpd_discipline").trim(),e&&(e.textContent=a||"Artist Name"),t&&(t.textContent=i||"Discipline")}let wt=0;function Ot(e){wt+=1;const t=document.getElementById("mpd_upload_overlay"),a=document.getElementById("mpd_upload_overlay_label");a&&(a.textContent=e||"Uploading image..."),t&&(t.hidden=!1,t.setAttribute("aria-hidden","false"))}function Ht(){if(wt=Math.max(0,wt-1),wt>0)return;const e=document.getElementById("mpd_upload_overlay");e&&(e.hidden=!0,e.setAttribute("aria-hidden","true"))}function ia(e){const t=String(e||"").trim();if(!t||typeof window>"u")return t;try{const a=new URL(t,window.location.origin);return a.searchParams.set("mpdPreview",String(Date.now())),a.href}catch{const a=t.includes("?")?"&":"?";return`${t}${a}mpdPreview=${Date.now()}`}}function gt(e,t="",a={}){typeof window>"u"||window.dispatchEvent(new CustomEvent("fusion-profile-save-status",{detail:{state:e,message:t,operation:a.operation||"",detail:a.detail||""}}))}function na(e){const t=e instanceof Error?e.message:String(e??""),a=`${t} ${e&&typeof e=="object"&&"message"in e?String(e.message):""}`;return/No linked artist on account/i.test(a)?"Your account is not linked to a profile yet. Refresh this page, or contact Fusion if the problem continues.":/Linked artist not found/i.test(a)?"Your linked profile record could not be found. Refresh this page, or contact Fusion for help.":/No account for caller/i.test(a)?"No member account was found for this login. Sign in with Internet Identity and complete profile setup.":/Active membership required/i.test(a)?"Translation requires an active membership. Choose Just save to update your profile without translation, or renew membership first.":/Text too long for Studio LLM/i.test(a)?"Some text is too long to translate automatically. Choose Just save, or shorten your bio and story sections.":/Image URL too long|Profile image URL too long/i.test(a)?"An image URL is too long to save. Try re-uploading the image, or use a shorter hosted URL.":/Audio URL too long/i.test(a)?"The audio URL is too long to save. Try re-uploading the file.":/Anonymous caller/i.test(a)?"Your session expired. Sign in again, then retry saving.":t&&t.length<280&&!/Request ID:|Reject code:|ic0\.trap|Canister called/i.test(t)?t:"Profile could not be saved. Try Just save without translation, refresh the page, or contact Fusion if this keeps happening."}function Ce(e){try{return JSON.parse(JSON.stringify(e??null))}catch{return e}}function Zi(e,t,a){const i=Ue(e&&typeof e=="object"?e:{},t)[a];return i&&typeof i=="object"&&!Array.isArray(i)?i:{}}function ma(e){const t={};for(const a of zi)t[a]=e[a];return t}function Mt(){const e=Wa(D),t=e.world&&typeof e.world=="object"&&!Array.isArray(e.world)?e.world:{};return ma(t)}function Vt(){return ve=Mt(),Wa(D)}function en(e){I("mpd_w_practice",String(e.practice??"")),I("mpd_w_perspective",mt(e.perspective)),I("mpd_w_vision",mt(e.vision)),I("mpd_w_constructing",mt(e.constructing)),I("mpd_w_context",mt(e.context)),I("mpd_w_quote",String(e.quote??""))}function tn(e){const t=document.getElementById("mpd-story");t&&t.classList.toggle("mpd-story--readonly",e),document.querySelectorAll(".mpd-story-input").forEach(a=>{(a instanceof HTMLInputElement||a instanceof HTMLTextAreaElement)&&(a.readOnly=e,a.setAttribute("aria-readonly",e?"true":"false"))}),document.querySelectorAll(".mpd-story-edit-btn").forEach(a=>{a instanceof HTMLButtonElement&&(a.disabled=e,a.setAttribute("aria-hidden",e?"true":"false"))})}function an(e,t){const a=e==="newWorld"&&t?"newWorld":"world",n=document.getElementById("mpd_public_world_source");n&&(n.value=a);const i=document.getElementById("mpd_public_world_source_note");i&&(i.textContent=`${a==="newWorld"?"New World":"World"} will display on your profile.`),document.querySelectorAll("[data-mpd-world-source]").forEach(s=>{if(!(s instanceof HTMLButtonElement))return;const p=s.getAttribute("data-mpd-world-source"),l=p==="newWorld",m=p===a;s.classList.toggle("is-active",m),s.classList.toggle("is-disabled",l&&!t),s.setAttribute("aria-pressed",m?"true":"false"),s.disabled=!!(l&&!t),l&&!t?(s.setAttribute("aria-disabled","true"),s.title="New World will unlock after generated copy is available."):(s.removeAttribute("aria-disabled"),s.removeAttribute("title"))})}function oa(e,t){vt=Ja(e);let a=t==="world"||t==="newWorld"?t:Oa(e);a==="newWorld"&&!vt&&(a="world"),an(a,vt)}function Qa(e,t,a=!1){a&&(ve=Mt());const n=Zi(e,t,"world");vt=Ja(e),en(ve||ma(n)),tn(!1),Zt="world"}function It(e){if(e==null)return[];if(Array.isArray(e))return e.flatMap(a=>It(a));if(typeof e=="object")return Object.values(e).flatMap(a=>It(a));const t=String(e).trim();return t?[t]:[]}function nn(e){const t=e.world&&typeof e.world=="object"?e.world:{},a=[e.discipline,e.bio,...It(t)].join(`
`);return a.trim()?/[\u3040-\u30ff\u3400-\u9fff]/.test(a)?"ja":/[A-Za-z]/.test(a)&&!/[^\x00-\x7F]/.test(a)?"en":"other":"en"}function Fa(e){return It({firstName:e.firstName,lastName:e.lastName,name:e.name,discipline:e.discipline,bio:e.bio,world:e.world}).some(Boolean)}function on(e){const t=Ue(e,"en");if(Fa(t))return e;const a=Ue(e,"ja");return Fa(a)?{...e,en:Ce(a)}:e}async function be(e,t,a){if(e==null)return"";if(Array.isArray(e)){const i=[];for(const s of e)i.push(await be(s,t,a));return i}const n=String(e??"").trim();return n?(await Ni(n,t,a)).trim():""}async function yt(e,t,a){const n=Ce(e)||{};n.discipline=await be(e.discipline,t,a),n.bio=await be(e.bio,t,a),n.bioLong="";const i=e.world&&typeof e.world=="object"&&!Array.isArray(e.world)?e.world:{},s=Ce(i)||{};s.practice=await be(i.practice,t,a),s.perspective=await be(i.perspective,t,a),s.vision=await be(i.vision,t,a),s.constructing=await be(i.constructing,t,a),s.context=await be(i.context,t,a),s.quote=await be(i.quote,t,a);const p=Array.isArray(i.introGallery)?Ce(i.introGallery):[];s.introGallery=[];for(const l of p)!l||typeof l!="object"||s.introGallery.push({...l,alt:await be(l.alt,t,a),caption:await be(l.caption,t,a)});return n.world=s,n}async function rn(e,t,a,n={}){const i=Ce(e&&typeof e=="object"?e:{en:{},ja:{}})||{},s=l=>{const m=Ue(e,l),h=Ue(i,l),g=m.worldNew;h&&typeof h=="object"&&g&&typeof g=="object"&&!Array.isArray(g)&&(h.worldNew=Ce(g),i[l]=h)};if(n.translate===!1)i.en=Ce(t),i.ja=Ce(t);else try{const l=nn(t);l==="ja"?(i.ja=Ce(t),i.en=await yt(t,"en","ja")):l==="en"?(i.en=Ce(t),i.ja=await yt(t,"ja","en")):(i.en=await yt(t,"en","auto"),i.ja=await yt(t,"ja","auto"))}catch(l){const m=na(l);throw new Error(m.includes("Just save")?m:`${m} Try Just save without translation.`)}return s("en"),s("ja"),a("mpd_public_world_source")==="world"?i.publicWorldSource="world":delete i.publicWorldSource,Va(i)}function Jt(e,t){const a=Ue(e,t),n=a.world&&typeof a.world=="object"&&!Array.isArray(a.world)?a.world:{},i=String(a.firstName??"").trim(),s=String(a.lastName??"").trim();if(i||s)I("mpd_first_name",i),I("mpd_last_name",s);else{const g=String(a.name??"").trim().split(/\s+/).filter(Boolean);I("mpd_first_name",g[0]??""),I("mpd_last_name",g.length>1?g.slice(1).join(" "):"")}I("mpd_discipline",vi(String(a.discipline??""))),_t(),I("mpd_bio",String(a.bio??a.bioLong??"")),Xa(a.status);const p=a.location&&typeof a.location=="object"&&!Array.isArray(a.location)?a.location:{};I("mpd_loc_city",String(p.city??"")),I("mpd_loc_state",String(p.state??"")),I("mpd_loc_country",String(p.country??"")),I("mpd_loc_display",String(p.display??"")),ve=ma(n);const l=_i(n);for(let h=0;h<3;h++){const g=l[h]||{src:"",alt:"",caption:""};I(`mpd_intro_${h}_src`,g.src),I(`mpd_intro_${h}_alt`,g.alt),I(`mpd_intro_${h}_caption`,g.caption);const f=document.getElementById(`mpd_intro_${h}_thumb`);f&&(ue(`intro-${h}`,{hasMedia:!!g.src,hasPreview:!!g.src}),g.src?(me(h,!0),f.style.display="none",f.onload=()=>{me(h,!1),f.style.display="block",f.onload=null,f.onerror=null},f.onerror=()=>{me(h,!1),f.onload=null,f.onerror=null},f.src=g.src,f.complete&&f.naturalHeight>0&&(me(h,!1),f.style.display="block",f.onload=null,f.onerror=null)):(me(h,!1),f.removeAttribute("src"),f.style.display="none"))}const m=document.getElementById("mpd_dev_json");m&&Pt&&(m.value=wi(e)),Za(Array.isArray(a.links)?a.links:[]),Qa(e,t,!1),oa(e,Oa(e)),sn(e)}function sn(e){const t=document.getElementById("mpd_audio_section");if(!t)return;const n=(e&&typeof e=="object"?e:{}).audioDisplayForArtist!==!1;t.hidden=!n,t.setAttribute("aria-hidden",n?"false":"true"),t.classList.toggle("mpd-audio-section--hidden",!n),t.querySelectorAll("input, textarea").forEach(s=>{(s instanceof HTMLInputElement||s instanceof HTMLTextAreaElement)&&(s.disabled=!n)});const i=document.querySelector('label[for="mpd_audio_file"]');i instanceof HTMLLabelElement&&(n?(i.removeAttribute("aria-disabled"),i.style.pointerEvents="",i.style.opacity=""):(i.setAttribute("aria-disabled","true"),i.style.pointerEvents="none",i.style.opacity="0.45"))}function Xa(e){const t=String(e??"").trim(),a=["studio","prep","showing","available"].includes(t)?t:"studio",n=document.getElementById("mpd_status");n&&(n.value=a),document.querySelectorAll("[data-mpd-status]").forEach(i=>{const s=i.getAttribute("data-mpd-status")===a;i.classList.toggle("is-active",s),i.setAttribute("aria-pressed",s?"true":"false")})}function ht(e){const t=Xe(e),a=t==="pending"?"public":t,n=document.getElementById("mpd_profile_visibility");n&&(n.value=a),document.querySelectorAll("[data-mpd-visibility]").forEach(s=>{const p=s.getAttribute("data-mpd-visibility")===a;s.classList.toggle("is-active",p),s.setAttribute("aria-pressed",p?"true":"false")});const i=document.getElementById("mpd_profile_visibility_review_notice");if(i){const s=t==="pending";i.hidden=!s,i.setAttribute("aria-hidden",s?"false":"true")}}function ln(e,t){if(!e||typeof e!="object")return;let a={};try{t&&(a=typeof t=="string"?JSON.parse(t):t),(!a||typeof a!="object")&&(a={})}catch{return}let n=null,i=-1/0;for(const[,p]of Object.entries(a)){if(!p||typeof p!="object")continue;const l=p,m=l.payload;if(!m||typeof m!="object")continue;const h=l.submittedAt??l.submitted_at;let g=-1/0;if(typeof h=="number"&&Number.isFinite(h))g=h;else if(typeof h=="string"){const f=Date.parse(h);Number.isNaN(f)||(g=f)}g>=i&&(i=g,n=l)}if(!n||!n.payload||typeof n.payload!="object"){for(const[,p]of Object.entries(a))if(p&&typeof p=="object"&&p.payload&&typeof p.payload=="object"){n=p;break}}if(!n||!n.payload||typeof n.payload!="object")return;const s=n.payload;for(const p of["en","ja"]){(!e[p]||typeof e[p]!="object"||Array.isArray(e[p]))&&(e[p]={});const l=e[p],m=String(l.firstName??"").trim(),h=String(l.lastName??"").trim();if(!m&&s.firstName!=null&&(l.firstName=String(s.firstName).trim()),!h&&s.lastName!=null&&(l.lastName=String(s.lastName).trim()),!String(l.name??"").trim()){const R=String(l.firstName??"").trim(),A=String(l.lastName??"").trim();(R||A)&&(l.name=`${R} ${A}`.trim())}let f=l.location&&typeof l.location=="object"&&!Array.isArray(l.location)?{...l.location}:{};const E=(R,A)=>{if(A==null)return;const S=String(A).trim();S&&(String(f[R]??"").trim()||(f[R]=S))};E("country",s.country),E("state",s.stateProvince),E("city",s.city),Object.keys(f).length&&(l.location=f),!String(l.discipline??"").trim()&&s.discipline!=null&&(l.discipline=String(s.discipline).trim()),!String(l.bio??"").trim()&&s.bioStatement!=null&&(l.bio=String(s.bioStatement).trim());const _=s.website!=null?String(s.website).trim():"";if(_){const R=Array.isArray(l.links)?[...l.links]:[];R.some(S=>S&&typeof S=="object"&&String(S.url??"").trim())||(R.push({type:"website",url:_,label:_}),l.links=R)}}}function Za(e){const t=document.getElementById("mpd-links");if(!t)return;const a=Array.isArray(e)&&e.length?e:[{type:"website",url:"",label:""}];t.replaceChildren();for(let n=0;n<a.length;n++){const i=a[n]&&typeof a[n]=="object"?a[n]:{},s=document.createElement("div");s.className="mpd-link-row studio-form-grid mpd-editorial-grid mpd-editorial-grid--links",s.innerHTML=`
            <label class="studio-field"><span>Type</span>
                <select class="studio-input mpd-link-type">
                    <option value="website">website</option>
                    <option value="instagram">instagram</option>
                    <option value="other">other</option>
                </select>
            </label>
            <label class="studio-field"><span>URL</span>
                <input type="url" class="studio-input mpd-link-url" placeholder="https://" value="" />
            </label>
            <label class="studio-field studio-field--full"><span>Label</span>
                <input type="text" class="studio-input mpd-link-label" placeholder="Portfolio, Instagram, gallery..." value="" />
            </label>
        `;const p=s.querySelector(".mpd-link-type"),l=s.querySelector(".mpd-link-url"),m=s.querySelector(".mpd-link-label");p&&"value"in p&&(p.value=String(i.type??"website")),l&&"value"in l&&(l.value=String(i.url??"")),m&&"value"in m&&(m.value=String(i.label??"")),t.appendChild(s)}}function b(e){return String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function ae(e){return String(e??"").trim()}function St(e){const t=document.getElementById("mpd-programs");if(!t)return;const a=["explore","my-programs","payments"].includes(e)?e:"explore",n=t.querySelector(`[data-mpd-program-tab="${a}"]`),i=a==="payments"&&n&&(n.hasAttribute("hidden")||n.getAttribute("aria-hidden")==="true")?"my-programs":a;t.querySelectorAll("[data-mpd-program-tab]").forEach(s=>{const p=s.getAttribute("data-mpd-program-tab")===i;s.classList.toggle("is-active",p),s.setAttribute("aria-selected",p?"true":"false"),s.setAttribute("tabindex",p?"0":"-1")}),t.querySelectorAll("[data-mpd-program-panel]").forEach(s=>{s.getAttribute("data-mpd-program-panel")===i?s.removeAttribute("hidden"):s.setAttribute("hidden","")})}function ra(){const e=document.getElementById("mpd_public_programs_discovery");if(!e)return;const t=e.querySelector("#mpd_public_programs_search"),a=e.querySelector("#mpd_public_programs_filter"),n=String((t==null?void 0:t.value)??"").trim().toLowerCase(),i=String((a==null?void 0:a.value)??"all").trim(),s=Array.from(e.querySelectorAll(".mpd-public-program-card"));let p=0;for(const m of s){const h=String(m.getAttribute("data-search")??"").toLowerCase(),g=String(m.getAttribute("data-status")??""),f=String(m.getAttribute("data-category")??""),E=!n||h.includes(n),_=i==="all"||i==="open"&&g==="open"||i==="not-open"&&g!=="open"||i.startsWith("category:")&&f===i.slice(9),R=E&&_;m.toggleAttribute("hidden",!R),R&&(p+=1)}const l=document.getElementById("mpd_public_programs_no_results");l&&(l.hidden=s.length===0||p>0)}function ei(){var s;const e=document.getElementById("mpd-program-panel-my-programs");if(!e)return;const t=((s=e.querySelector(".mpd-my-program-filter.is-active"))==null?void 0:s.getAttribute("data-mpd-my-program-filter"))||"all",a=Array.from(e.querySelectorAll(".mpd-my-program-card"));let n=0;for(const p of a){const l=String(p.getAttribute("data-status-key")||"submitted"),m=t==="all"||l===t;p.toggleAttribute("hidden",!m),m&&(n+=1)}const i=document.getElementById("mpd_my_programs_no_results");i&&(i.hidden=a.length===0||n>0)}function dn(e){const t=document.getElementById("mpd-program-panel-my-programs");!t||!t.contains(e)||(t.querySelectorAll("[data-mpd-my-program-filter]").forEach(a=>{const n=a===e;a.classList.toggle("is-active",n),a.setAttribute("aria-pressed",n?"true":"false")}),ei())}function pn(e){var h,g,f;const t=Array.from(document.querySelectorAll(".mpd-my-program-card")).find(E=>E.getAttribute("data-program-id")===e);if(!t)return;const a=((h=t.querySelector("h4"))==null?void 0:h.textContent)||"Application",n=Array.from(t.querySelectorAll("template[data-mpd-application-payload]")).find(E=>E.getAttribute("data-mpd-application-payload")===e)||null,i=(n==null?void 0:n.innerHTML)||'<p class="studio-muted">No application payload details are available.</p>',s=document.createElement("div");s.className="settings-profile-page profile-gallery-access-modal mpd-application-details-modal",s.setAttribute("aria-hidden","false"),s.innerHTML=`
    <div class="profile-gallery-access-modal__scrim" aria-hidden="true"></div>
    <div class="profile-gallery-access-modal__panel mpd-application-details-modal__panel" role="dialog" aria-modal="true" aria-labelledby="mpdApplicationDetailsTitle">
      <h2 id="mpdApplicationDetailsTitle" class="profile-gallery-access-modal__title">${b(a)}</h2>
      <div class="mpd-application-details-modal__body">
        ${i}
      </div>
      <button type="button" class="profile-gallery-access-modal__close">Close</button>
    </div>
  `;const p=()=>{s.remove(),window.removeEventListener("keydown",l)};function l(E){E.key==="Escape"&&p()}(g=s.querySelector(".profile-gallery-access-modal__scrim"))==null||g.addEventListener("click",p),(f=s.querySelector(".profile-gallery-access-modal__close"))==null||f.addEventListener("click",p),window.addEventListener("keydown",l),document.body.appendChild(s);const m=s.querySelector(".profile-gallery-access-modal__close");m instanceof HTMLElement&&m.focus()}function et(e){return e&&typeof e=="object"&&!Array.isArray(e)?e:{}}function cn(e){return Array.isArray(e)?e:[]}function mn(e){const t=ae(e).toLowerCase().replace(/[\s_-]+/g,"-");return["reviewing","review","in-review","initial-review"].includes(t)?{key:"initial-review",label:"Initial review"}:["postinterviewreview","post-interview-review","under-review","final-review"].includes(t)?{key:"post-interview-review",label:"Post interview review"}:["invited","invite","accepted","approved","payment-required","deposit-due"].includes(t)?{key:"invited",label:"Invited"}:["not-selected","rejected","declined","not-accepted"].includes(t)?{key:"not-selected",label:"Not selected"}:["pulledout","pulled-out","pulled_out","rescinded"].includes(t)?{key:"rescinded",label:"Rescinded"}:["withdrawn","withdrew","cancelled","canceled"].includes(t)?{key:"withdrawn",label:"Withdrawn"}:{key:"submitted",label:"Submitted"}}function un(e,t,a){const n=et(e.enCard),i=et(e.jaCard),s=et(a.payload),p=mn(a.status??a.applicationStatus??a.decision),l=V(n.focus,n.headline),m=V(n.location,n.place),h=m||V(n.title,l,t)||"Program",g=V(n.openTo,n.audience,n.eligibility,n.discipline,n.medium),f=V(n.startDate,n.start),E=V(n.endDate,n.deadline),_=V(n.deadline,n.applicationDeadline,n.deadlineDate,n.applyBy,f&&E?`${f} - ${E}`:f||E,n.year),R=V(i.imageSrc,n.imageSrc,e.image),A=V(n.imageAlt,h),S=V(n.category,n.type,l,"Program");let F="/programs";if(e.routeLink){const z=String(e.routeLink);F=z.startsWith("/")?z:`/${z}`}const Z=V(a.submittedAt,a.submitted_at,a.createdAt),We=!!(a.paymentRequired||a.payment_required||["accepted","approved","payment-required","deposit-due"].includes(ae(a.status??a.decision).toLowerCase().replace(/[\s_-]+/g,"-"))),Me=V(a.teamNote,a.teamNotes,a.programNote,a.note);return{programId:t,title:h,location:m,focus:l,openTo:g,deadline:_,imageSrc:R,imageAlt:A,category:S,route:F,submittedAt:Z,payload:s,status:p,paymentRequired:We,slotSecured:!!a.slotSecured,teamNote:Me,rawEntry:a}}function fn(e){const t=e.status.key,a=t==="rescinded"?{completeThrough:1,activeStep:0}:t==="initial-review"?{completeThrough:2,activeStep:3}:t==="post-interview-review"?{completeThrough:3,activeStep:4}:t==="invited"||t==="not-selected"||t==="withdrawn"?{completeThrough:4,activeStep:5}:{completeThrough:e.submittedAt?1:0,activeStep:0},n=!!e.slotSecured;return["Submitted","Initial review","Post interview review","Decision","Slot secured"].map((i,s)=>{const p=s+1,l=p===5&&n||p<=a.completeThrough?"complete":p===a.activeStep?"active":"pending",m=p===1?ca(e.submittedAt):"";return{label:i,state:l,date:m==="—"?"":m}})}function gn(e){const t=(...n)=>n.some(i=>ae(e[i])),a=t("portfolio","portfolioUrl","portfolioLink","website","websiteUrl")||cn(e.files).length>0;return[{label:"Personal statement",submitted:t("statement","personalStatement","artistStatement","bio")},{label:"Artist profile",submitted:!0},{label:"Portfolio",submitted:a},{label:"Travel documents",submitted:t("travelDocuments","travelDocument","passport","passportUrl")}]}function yn(e){if(e.teamNote)return e.teamNote;if(e.paymentRequired)return"You have been invited to continue. Payment details will appear here when the next step opens.";switch(e.status.key){case"initial-review":return"Thank you for your application. Our team is completing the initial review.";case"post-interview-review":return"Thank you for your application. Our team is currently reviewing submissions. You will be notified when a decision is ready.";case"invited":return"Your application has moved forward. Watch this space for next steps from the program team.";case"not-selected":return"Thank you for applying. This application was not selected for the current cycle.";case"withdrawn":return"This application has been withdrawn. No further action is needed.";case"rescinded":return"This application has been rescinded. Contact the program team if you have questions.";default:return"Your application has been received and is queued for review."}}function hn(e){const t=Object.entries(e).filter(([,a])=>a==null?!1:typeof a=="string"?!!a.trim():Array.isArray(a)?a.length>0:typeof a=="number"||typeof a=="boolean").slice(0,16);return t.length?`<dl class="mpd-application-payload-list">${t.map(([a,n])=>{const i=a.replace(/([a-z])([A-Z])/g,"$1 $2").replace(/[_-]+/g," ").replace(/\b\w/g,p=>p.toUpperCase()),s=Array.isArray(n)?n.join(", "):String(n);return`<dt>${b(i)}</dt><dd>${b(s)}</dd>`}).join("")}</dl>`:'<p class="studio-muted">No application payload details are available.</p>'}function bn(e){const t=fn(e),a=gn(e.payload),n=e.submittedAt?`Submitted: ${ca(e.submittedAt)}`:"";return`
    <article class="mpd-my-program-card mpd-my-program-card--${b(e.status.key)}" data-status-key="${b(e.status.key)}" data-program-id="${b(e.programId)}">
      <div class="mpd-my-program-card__summary">
        <div class="mpd-my-program-card__media">
          ${e.imageSrc?`<img src="${b(e.imageSrc)}" alt="${b(Ze(e.imageAlt||e.title))}" loading="lazy" />`:'<div class="mpd-my-program-card__placeholder">Fusion</div>'}
        </div>
        <div class="mpd-my-program-card__meta">
          <div class="mpd-my-program-card__title-row">
            <div>
              <h4>${b(e.title)}</h4>
              ${e.category?`<p class="mpd-my-program-card__category">${b(e.category)}</p>`:""}
            </div>
            <div class="mpd-my-program-card__status-wrap">
              <span class="mpd-my-program-status mpd-my-program-status--${b(e.status.key)}">${b(e.status.label)}</span>
              ${n?`<span class="mpd-my-program-card__date">${b(n)}</span>`:""}
            </div>
          </div>
          <div class="mpd-my-program-card__facts">
            ${e.focus?`<p><strong>Program:</strong> ${b(e.focus)}</p>`:""}
            ${e.openTo?`<p><strong>Open to:</strong> ${b(e.openTo)}</p>`:""}
            ${e.deadline?`<p><strong>Dates:</strong> ${b(e.deadline)}</p>`:""}
          </div>
        </div>
      </div>
      ${e.paymentRequired?'<div class="mpd-my-program-payment-callout"><strong>Payment required</strong><span>Visit the Payments tab to submit your deposit or full payment and secure your slot.</span><button type="button" class="mpd-my-program-action" data-mpd-program-tab="payments">View payments</button></div>':""}
      <ol class="mpd-my-program-timeline" aria-label="Application progress for ${b(e.title)}">
        ${t.map(i=>`
              <li class="mpd-my-program-timeline__step is-${b(i.state)}">
                <span class="mpd-my-program-timeline__dot" aria-hidden="true"></span>
                <span class="mpd-my-program-timeline__label">${b(i.label)}</span>
                ${i.date?`<span class="mpd-my-program-timeline__date">${b(i.date)}</span>`:""}
              </li>
            `).join("")}
      </ol>
      <div class="mpd-my-program-card__details">
        <section>
          <h5>Application materials</h5>
          <ul class="mpd-my-program-materials">
            ${a.map(i=>`
                  <li class="${i.submitted?"is-submitted":"is-pending"}">
                    <span aria-hidden="true">${i.submitted?"✓":"○"}</span>
                    <span>${b(i.label)}</span>
                    <em>${i.submitted?"Submitted":"Pending"}</em>
                  </li>
                `).join("")}
          </ul>
        </section>
        <section>
          <h5>Notes from the program</h5>
          <p>${b(yn(e))}</p>
        </section>
        <section>
          <h5>Actions</h5>
          <div class="mpd-my-program-actions">
            <button type="button" class="mpd-my-program-action" data-mpd-application-action="view" data-program-id="${b(e.programId)}">View application</button>
            <button type="button" class="mpd-my-program-action" data-mpd-application-action="update" data-program-id="${b(e.programId)}">Update materials</button>
            <button type="button" class="mpd-my-program-action mpd-my-program-action--danger" data-mpd-application-action="withdraw" data-program-id="${b(e.programId)}">Withdraw application</button>
          </div>
        </section>
      </div>
      <template data-mpd-application-payload="${b(e.programId)}">${hn(e.payload)}</template>
    </article>
  `}function st(e){const t=Number(e??0);return Number.isFinite(t)?Math.max(0,Math.round(t)):0}const ce=Fi,ti=Ri;function vn(e,t){return(t.summaries||[]).find(a=>String(a.programId||"")===String(e))||null}function _n(e,t){return e&&(t.plans||[]).find(a=>String(a.id||"")===String(e))||null}function wn(e){const t=new Set,a=Array.isArray(e==null?void 0:e.approvedPrograms)?e.approvedPrograms:[];for(const n of a)if((n==null?void 0:n.manualDepositSubmitted)===!0){const i=String((n==null?void 0:n.programId)||"");i&&t.add(i)}for(const n of(e==null?void 0:e.summaries)||[]){const i=String((n==null?void 0:n.programId)||""),s=a.find(m=>String(m.programId||"")===i),p=((e==null?void 0:e.ledger)||[]).filter(m=>String(m.programId||"")===i),l=st(n==null?void 0:n.depositAmountCents);Ga(s,n,p,l)&&i&&t.add(i)}return t}function Sn(e,t){return(Array.isArray(t.approvedPrograms)?t.approvedPrograms:[]).map(n=>{var xe,he;const i=String(n.programId||"").trim();if(!i)return null;const s=e.find(se=>String(se.id||"")===i)||{id:i,enCard:{focus:i}},p=et(s.enCard||s),l=et(s.jaCard||{}),m=V(p.location,p.place),h=V(p.focus,p.headline,p.title),g=V(m,h,i),f=V(l.imageSrc,p.imageSrc,s.image),E=V(p.imageAlt,h,g),_=V(p.startDate,p.start,p.programStart,(xe=p.programPage)==null?void 0:xe.startDate),R=V(p.year,p.programYear,(he=p.programPage)==null?void 0:he.year),A=ji(s),S=vn(i,t),F=Li(n.applicantCategory??(S==null?void 0:S.applicantCategory)),Z=(S==null?void 0:S.ownFlight)===!0||String((S==null?void 0:S.ownFlight)||"").toLowerCase()==="true",We=Ui(F),Me=Qt({category:F,ownFlight:!1}),z=Z?ti:0,L=Qt({category:F,ownFlight:Z}),Se=st(S==null?void 0:S.totalPaidCents),fe=S?st(S.outstandingCents):Math.max(0,L-Se),re=_n(S==null?void 0:S.activePlanId,t),ge=(t.ledger||[]).filter(se=>String(se.programId||"")===i).sort((se,Le)=>String(Le.createdAt||"").localeCompare(String(se.createdAt||""))),Ie=Ga(n,S,ge,A),ye=Se>0||ge.length>0||!!re||Ie;return{programId:i,applicationId:String(n.applicationId||""),title:g,location:m,focus:h,imageSrc:f,imageAlt:E,startText:_,programYear:R,email:String(n.email||""),fullName:String(n.fullName||""),depositCents:A,applicantCategory:F,categoryDiscountCents:We,baseTotalDueCents:Me,ownFlight:Z,flightCreditCents:z,totalDueCents:L,totalPaidCents:Se,outstandingCents:fe,refundedCents:st(S==null?void 0:S.refundedCents),depositPaid:Ie,paidInFull:fe<=0&&L>0,activePlan:re,paymentStarted:ye,ledger:ge,summary:S}}).filter(Boolean)}function Pn(e){return`
    <div class="mpd-payments-pill-rail" role="tablist" aria-label="Approved program payments">
      ${e.map(t=>{const a=t.programId===Ve,n=t.paidInFull?"Paid":t.activePlan?"Plan active":t.depositPaid?"Balance due":"Deposit due";return`<button type="button" class="mpd-payments-pill ${a?"is-active":""}" data-mpd-payment-program="${b(t.programId)}" aria-selected="${a?"true":"false"}">
            <strong>${b(t.title)}</strong>
            <span>${b(n)}</span>
          </button>`}).join("")}
    </div>
  `}function En(e){return e.ledger.length?`
    <div class="mpd-payments-history-list">
      ${e.ledger.map(t=>{const a=String(t.stripeReceiptUrl||"");return`<div class="mpd-payments-history-row">
            <span>${b(ca(t.createdAt)||"—")}</span>
            <strong>${b(String(t.paymentType||"payment").replace(/_/g," "))}</strong>
            <span>${ce(t.amountCents)}</span>
            <span class="mpd-payment-status">${b(t.status||"recorded")}</span>
            ${a?`<a href="${we(a)}" target="_blank" rel="noopener">Receipt</a>`:'<span class="studio-muted">Receipt pending</span>'}
          </div>`}).join("")}
    </div>
  `:'<div class="mpd-payments-empty"><h4>No payment history yet.</h4><p class="studio-muted">Receipts will appear here after your first program payment.</p></div>'}function An(e){if(!e)return"";const t=!!e.paymentStarted,a=n=>{const i=e.ownFlight===n,s=n?"Yes, I’ll get my own flight":"No, I need flight support",p=n?"$800 credit":"No credit applied",l=n?"Applied to your total residency price.":"We’ll follow up with flight options and support.";return`<button type="button" class="mpd-flight-option ${i?"is-selected":""}" data-mpd-flight-choice="${n?"own":"support"}" aria-pressed="${i?"true":"false"}" ${t?"disabled":""}>
      <span class="mpd-flight-option__icon" aria-hidden="true"><img src="${we(Ba)}" alt="" /></span>
      <span class="mpd-flight-option__copy">
        <strong>${b(s)}</strong>
        <small>${b(l)}</small>
      </span>
      <span class="mpd-flight-option__badge">${b(p)}</span>
    </button>`};return`<section class="mpd-flight-choice-card ${t?"is-locked":""}" aria-label="Flight pricing choice">
    <div class="mpd-flight-choice-card__head">
      <div class="mpd-flight-choice-card__icon" aria-hidden="true"><img src="${we(Ba)}" alt="" /></div>
      <div>
        <p class="mpd-payments-eyebrow">Travel support</p>
        <h3>Will you be getting your own flight?</h3>
        <p class="studio-muted">This helps us tailor the information and support we provide.</p>
      </div>
    </div>
    <div class="mpd-flight-options">
      ${a(!0)}
      ${a(!1)}
    </div>
    <div class="mpd-flight-choice-card__note">
      <strong>${e.ownFlight?"Flight credit applied":"No flight credit applied"}</strong>
      <span>${e.ownFlight?"The $800 credit will be applied to your balance once you confirm your program slot.":`Total residency price is ${ce(e.baseTotalDueCents)} when Fusion provides flight support.`}</span>
      ${t?"<em>Flight choice is locked after payment activity starts.</em>":""}
    </div>
  </section>`}function $t(){var f;const e=document.getElementById("mpd_program_payments_workspace"),t=document.getElementById("mpd-program-tab-payments");if(!e||!t)return;const a=At,n=a.length>0;if(t.toggleAttribute("hidden",!n),t.setAttribute("aria-hidden",n?"false":"true"),!n){e.innerHTML='<div class="mpd-program-placeholder"><h3>Payments</h3><p class="studio-muted">Program payments appear after you are approved for a program.</p></div>',t.classList.contains("is-active")&&St("my-programs");return}(!Ve||!a.some(E=>E.programId===Ve))&&(Ve=((f=a.find(E=>!E.depositPaid||E.outstandingCents>0))==null?void 0:f.programId)||a[0].programId);const i=a.find(E=>E.programId===Ve)||a[0],s=i.depositCents>0&&i.totalDueCents>0,p=Si(),l=!!i.activePlan||p,m=i.activePlan?'<button type="button" class="studio-btn-primary" data-mpd-payment-action="cancel-plan">Cancel plan</button>':"",h=i.depositPaid?"":`<div class="mpd-payment-choice-grid">
        <article class="mpd-payment-choice-program">
          <div class="mpd-payment-choice-program__media">
            ${i.imageSrc?`<img src="${we(i.imageSrc)}" alt="${we(Ze(i.imageAlt||i.title))}" loading="lazy" />`:'<div class="mpd-payment-choice-program__placeholder">Fusion</div>'}
          </div>
          <div class="mpd-payment-choice-program__copy">
            <p class="mpd-payments-eyebrow">Confirm your program slot</p>
            <h3>${b(i.title)}</h3>
            <p class="studio-muted">${b(i.focus||"Choose how you would like to pay.")}</p>
          </div>
        </article>
        <div class="mpd-payment-choice-stack">
          <article class="mpd-payment-choice mpd-payment-choice--deposit">
            <h4>Deposit</h4>
            <span class="mpd-payment-choice__amount">${ce(i.depositCents)}</span>
            <p class="studio-muted">Secure your accepted program slot today. Remaining balance can be paid later.</p>
            <button type="button" class="studio-btn-primary" data-mpd-payment-action="deposit" ${s?"":"disabled"}>Pay deposit</button>
          </article>
          <article class="mpd-payment-choice mpd-payment-choice--full mpd-payment-choice--recommended">
            <span class="mpd-payment-recommended">Recommended</span>
            <h4>${i.ownFlight?"Total residency price (after flight credit)":"Full payment"}</h4>
            <span class="mpd-payment-choice__amount">${ce(i.totalDueCents)}</span>
            <p class="studio-muted">Complete your program payment now. No payment plan needed.</p>
            <button type="button" class="studio-btn-primary" data-mpd-payment-action="full" ${s?"":"disabled"}>Pay in full</button>
          </article>
        </div>
      </div>`,g=i.depositPaid?`<div class="mpd-payments-action-grid${l?"":" mpd-payments-action-grid--single"}">
        <article class="mpd-payments-action-card mpd-payments-action-card--manual">
          ${Ae(Oi,"mpd-payments-action-card__icon mpd-payments-action-card__icon--manual")}
          <div class="mpd-payments-action-card__copy">
            <h4>Make a manual payment</h4>
            <p class="studio-muted">Pay any amount toward your outstanding balance.</p>
          </div>
          <button type="button" class="studio-btn-primary" data-mpd-payment-action="manual" ${i.outstandingCents<=0?"disabled":""}>Make a payment</button>
        </article>
        ${l?`<article class="mpd-payments-action-card mpd-payments-action-card--plan">
          ${Ae(La,"mpd-payments-action-card__icon mpd-payments-action-card__icon--plan")}
          <div class="mpd-payments-action-card__copy">
            <h4>${i.activePlan?"Payment plan active":"Start a payment plan"}</h4>
            <p class="studio-muted">${i.activePlan?"Cancel future installments if your plans change.":"Split the remaining balance into equal monthly payments."}</p>
          </div>
          ${m}
        </article>`:""}
      </div>
      <div class="mpd-payments-overview-grid">
        <div class="mpd-payments-overview-card mpd-payments-overview-card--paid">
          ${Ae(Xt,"mpd-payments-overview-card__icon")}
          <span>Total residency price</span>
          <strong>${ce(i.totalDueCents)}</strong>
          <small>${i.ownFlight?"After flight credit":"Flight support included"}</small>
        </div>
        ${i.categoryDiscountCents?`<div class="mpd-payments-overview-card mpd-payments-overview-card--outstanding">
          ${Ae(Xt,"mpd-payments-overview-card__icon")}
          <span>Veteran discount</span>
          <strong>-${ce(i.categoryDiscountCents)}</strong>
          <small>Returning artist pricing</small>
        </div>`:""}
        <div class="mpd-payments-overview-card mpd-payments-overview-card--outstanding">
          ${Ae(Vi,"mpd-payments-overview-card__icon")}
          <span>Flight credit</span>
          <strong>${i.flightCreditCents?`-${ce(i.flightCreditCents)}`:"$0.00"}</strong>
          <small>${i.ownFlight?"Own-flight discount":"No credit selected"}</small>
        </div>
        <div class="mpd-payments-overview-card mpd-payments-overview-card--upcoming">
          ${Ae(La,"mpd-payments-overview-card__icon")}
          <span>Total paid</span>
          <strong>${ce(i.totalPaidCents)}</strong>
          <small>Across ${i.ledger.length} payments</small>
        </div>
        <div class="mpd-payments-overview-card mpd-payments-overview-card--refunded">
          ${Ae(Hi,"mpd-payments-overview-card__icon")}
          <span>Remaining balance</span>
          <strong>${ce(i.outstandingCents)}</strong>
          <small>${i.outstandingCents>0?"Balance remaining":"Paid in full"}</small>
        </div>
      </div>
      <div class="mpd-payments-detail-grid">
        <section class="mpd-payments-panel">
          <div class="mpd-payments-section-head"><h4>Payment history</h4><span class="studio-muted">Receipts and status</span></div>
          ${En(i)}
        </section>
        <section class="mpd-payments-panel">
          <div class="mpd-payments-section-head"><h4>Upcoming payments</h4><span class="studio-muted">${i.activePlan?"Plan scheduled":"No active plan"}</span></div>
          ${i.activePlan?`<div class="mpd-upcoming-payment-card"><strong>${b(i.title)}</strong><span>${ce(i.activePlan.installmentAmountCents)} monthly</span><small>${b(i.activePlan.installmentCount||"")} installments · ${b(i.activePlan.status||"active")}</small></div>`:'<div class="mpd-payments-empty"><h4>No upcoming payments.</h4><p class="studio-muted">Use manual payments to pay toward your balance.</p></div>'}
        </section>
      </div>`:"";e.innerHTML=`
    <div class="mpd-payments-shell">
      ${Pn(a)}
      ${An(i)}
      ${h}
      ${g}
    </div>
  `}async function xt(e){Ct=Array.isArray(e)?e:[];let t;try{t=await Ha()}catch{t={approvedPrograms:[],summaries:[],ledger:[],plans:[]}}At=Sn(Ct,t),$t()}function ai(){return At.find(e=>e.programId===Ve)||At[0]||null}function Cn(e,t){e&&(e.ownFlight=!!t,e.flightCreditCents=e.ownFlight?ti:0,e.totalDueCents=Qt({category:e.applicantCategory||"general",ownFlight:e.ownFlight}),e.outstandingCents=Math.max(0,e.totalDueCents-st(e.totalPaidCents)),e.paidInFull=e.outstandingCents<=0&&e.totalDueCents>0)}async function Mn(e){const t=ai();if(!t||t.paymentStarted)return;const a=e==="own";if(t.ownFlight===a)return;const n={ownFlight:t.ownFlight,flightCreditCents:t.flightCreditCents,totalDueCents:t.totalDueCents,outstandingCents:t.outstandingCents,paidInFull:t.paidInFull};Cn(t,a),$t();try{await di({programId:t.programId,applicationId:t.applicationId,ownFlight:a})}catch(i){Object.assign(t,n),$t(),window.alert(i instanceof Error?i.message:String(i))}}function Lt(){var e;(e=document.getElementById("mpdProgramPaymentModal"))==null||e.remove();try{document.body.style.overflow=""}catch{}}function ii(e,t){Lt();const a=document.createElement("div");return a.id="mpdProgramPaymentModal",a.className="settings-profile-page profile-gallery-access-modal mpd-program-payment-modal",a.innerHTML=`
    <div class="profile-gallery-access-modal__scrim" data-mpd-payment-close aria-hidden="true"></div>
    <div class="profile-gallery-access-modal__panel mpd-program-payment-modal__panel" role="dialog" aria-modal="true" aria-labelledby="mpdProgramPaymentModalTitle">
      <button type="button" class="profile-gallery-access-modal__close" data-mpd-payment-close aria-label="Close payment modal">×</button>
      <h2 id="mpdProgramPaymentModalTitle" class="profile-gallery-access-modal__title">${b(e)}</h2>
      ${t}
    </div>
  `,document.body.appendChild(a),document.body.style.overflow="hidden",a.addEventListener("click",n=>{var s,p;n.target&&((p=(s=n.target).closest)==null?void 0:p.call(s,"[data-mpd-payment-close]"))&&Lt()}),a}function In(e="Loading payment"){return`<div class="mpd-payment-loading" role="status" aria-live="polite">
    <span class="mpd-payment-loading__spinner" aria-hidden="true"></span>
    <span class="mpd-payment-loading__text">${b(e)}</span>
  </div>`}async function sa(e,t,a){if(!e||a<=0)return;const n=await Ne();if(!n.authenticated){window.alert("Sign in to make a program payment.");return}const s=ii(t==="deposit"?"Pay program deposit":t==="full_payment"?"Pay in full":"Make a manual payment",`<div class="mpd-program-payment-modal__body">
      <p class="studio-muted">${b(e.title)} · ${ce(a)}</p>
      <div id="mpdProgramStripeMount" class="mpd-program-stripe-mount">${In()}</div>
      <p id="mpdProgramPaymentError" class="mpd-membership-inline-error" hidden></p>
    </div>`),p=s.querySelector("#mpdProgramPaymentError"),l=s.querySelector("#mpdProgramStripeMount");try{const[m,h,g]=await Promise.all([_e(()=>import("./index-20317f29.js").then(_=>_.f0),["assets/index-20317f29.js","assets/index-06c7870c.css"]),_e(()=>import("./index-20317f29.js").then(_=>_.e$),["assets/index-20317f29.js","assets/index-06c7870c.css"]),_e(()=>import("./index-20317f29.js").then(_=>_.f3),["assets/index-20317f29.js","assets/index-06c7870c.css"])]),f=h.getPayPalClientIdResolved();if(!f)throw new Error("Configure PayPal client ID in Studio → Services.");const E=await m.createPayPalOneTimePayment({principal:n.principal.toText(),programId:e.programId,applicationId:e.applicationId,email:e.email,applicantName:e.fullName,paymentType:t,amountCents:a,totalDueCents:e.totalDueCents,depositAmountCents:e.depositCents,ownFlight:e.ownFlight,flightCreditCents:e.flightCreditCents});l&&(l.textContent="",await g.mountPayPalOrderButtons(l,{clientId:f,orderId:E.orderId,onApproved:async _=>{await m.confirmPayPalOneTimePayment(_),Lt(),await xt(Ct)},onError:_=>{p instanceof HTMLElement&&(p.hidden=!1,p.textContent=_ instanceof Error?_.message:String(_))}}))}catch(m){p instanceof HTMLElement&&(p.hidden=!1,p.textContent=m instanceof Error?m.message:String(m))}}function $n(e){var n;if(!e)return;const t=ii("Make a manual payment",`<div class="mpd-program-payment-modal__body">
      <p class="studio-muted">${b(e.title)} · outstanding ${ce(e.outstandingCents)}</p>
      <div class="mpd-manual-payment-options" role="radiogroup" aria-label="Manual payment amount">
        <label class="mpd-payment-radio-option"><input type="radio" name="mpdManualPaymentMode" value="custom" checked /> <span>Custom amount</span></label>
        <label class="mpd-payment-radio-option"><input type="radio" name="mpdManualPaymentMode" value="remaining" /> <span>Pay remaining balance</span></label>
      </div>
      <label class="studio-field">
        <span>Amount (USD)</span>
        <input type="number" min="1" step="0.01" id="mpdManualPaymentAmount" class="studio-input" value="${Math.max(1,Math.min(e.outstandingCents,e.depositCents||e.outstandingCents)/100).toFixed(2)}" />
      </label>
      <div class="mpd-program-payment-modal__actions">
        <button type="button" class="studio-btn-primary" id="mpdManualPaymentContinue">Continue to payment</button>
      </div>
    </div>`),a=t.querySelector("#mpdManualPaymentAmount");t.querySelectorAll('input[name="mpdManualPaymentMode"]').forEach(i=>{i.addEventListener("change",()=>{const s=String((t.querySelector('input[name="mpdManualPaymentMode"]:checked')||{}).value||"custom");a&&(a.value=s==="remaining"?(e.outstandingCents/100).toFixed(2):a.value,a.readOnly=s==="remaining")})}),(n=t.querySelector("#mpdManualPaymentContinue"))==null||n.addEventListener("click",()=>{const i=Math.min(e.outstandingCents,Math.round(Number((a==null?void 0:a.value)||0)*100));if(i<50){window.alert("Enter at least $0.50.");return}Lt(),sa(e,"manual",i)})}function xn(e){if(e){window.alert("Payment plans are temporarily unavailable. Use Make a manual payment toward your balance.");return}}async function Ln(e){if(e!=null&&e.activePlan&&window.confirm("Cancel this payment plan? Future scheduled installments will stop."))try{const t=await _e(()=>import("./index-20317f29.js").then(i=>i.f0),["assets/index-20317f29.js","assets/index-06c7870c.css"]),a=String(e.activePlan.paymentProvider||"stripe").toLowerCase(),n=String(e.activePlan.paypalSubscriptionId||"").trim();a==="paypal"||n?await t.cancelPayPalProgramPaymentPlan({planId:String(e.activePlan.id||""),subscriptionId:n}):await t.cancelProgramPaymentPlan({planId:String(e.activePlan.id||""),subscriptionId:String(e.activePlan.stripeSubscriptionId||"")}),await xt(Ct)}catch(t){window.alert(t instanceof Error?t.message:String(t))}}function Bn(e){return!!(e&&typeof e=="object"&&!Array.isArray(e))}function kn(){const e=document.getElementById("mpdResidencyComingSoonModal");e&&(document.body.appendChild(e),e.hidden=!1,e.setAttribute("aria-hidden","false"))}function Yt(){const e=document.getElementById("mpdResidencyComingSoonModal");e&&(e.hidden=!0,e.setAttribute("aria-hidden","true"))}function Tn(){const e=document.getElementById("mpdMembershipCancelModal");e&&(document.body.appendChild(e),e.hidden=!1,e.setAttribute("aria-hidden","false"))}function Bt(){const e=document.getElementById("mpdMembershipCancelModal");e&&(e.hidden=!0,e.setAttribute("aria-hidden","true"))}let la="",Re="";function $e(e){const t=String(e||"").trim();return t.includes("@")&&t.length>=5}async function Ra(){if(Re&&$e(Re))return Re.trim();try{const a=await Ua(),n=String((a==null?void 0:a.email)||"").trim();if($e(n))return Re=n,n}catch{}try{const a=await Ne();if(a.authenticated){const{getStoredBillingEmailForPrincipal:n}=await _e(()=>import("./index-20317f29.js").then(s=>s.f0),["assets/index-20317f29.js","assets/index-06c7870c.css"]),i=String(n(a.principal.toText())||"").trim();if($e(i))return Re=i,i}}catch{}const e=qa(),t=String(e.email||"").trim();return $e(t)?(Re=t,t):""}function Gt(e=Re){const t=document.getElementById("settingsProfileNavContactEmailWrap"),a=document.getElementById("settingsProfileNavContactEmail");if(!t||!(a instanceof HTMLInputElement))return;const n=$e(e);t.hidden=n,n?(a.value=e.trim(),a.removeAttribute("required")):(a.value.trim()||(a.value=""),a.setAttribute("required","required"))}function Nn(){const e=document.getElementById("mpdSaveChoiceModal");if(!e)return;document.body.appendChild(e),e.hidden=!1,e.setAttribute("aria-hidden","false");const t=e.querySelector("#mpdSaveChoiceTranslate"),a=e.querySelector("#mpdSaveChoiceTranslateNote"),n=la==="needsSubscription";t&&(t.disabled=n,t.setAttribute("aria-disabled",n?"true":"false")),a&&(a.textContent=n?"Translation needs an active membership. Use Just save to update your profile without translation.":"",a.toggleAttribute("hidden",!n))}function zt(){const e=document.getElementById("mpdSaveChoiceModal");e&&(e.hidden=!0,e.setAttribute("aria-hidden","true"))}function Dn(){const e=document.getElementById("mpdSaveChoiceModal");if(!e||e.dataset.mpdSaveChoiceModalWired==="1")return;e.dataset.mpdSaveChoiceModalWired="1";const t=e.querySelector(".profile-gallery-access-modal__scrim"),a=e.querySelector("#mpdSaveChoiceCancel"),n=e.querySelector("#mpdSaveChoiceJustSave"),i=e.querySelector("#mpdSaveChoiceTranslate"),s=()=>{zt(),window.dispatchEvent(new CustomEvent("fusion-settings-profile-save-choice",{detail:{action:"cancel"}}))};t==null||t.addEventListener("click",s),a==null||a.addEventListener("click",s),n==null||n.addEventListener("click",()=>{zt(),window.dispatchEvent(new CustomEvent("fusion-settings-profile-save-choice",{detail:{action:"save",translate:!1}}))}),i==null||i.addEventListener("click",()=>{zt(),window.dispatchEvent(new CustomEvent("fusion-settings-profile-save-choice",{detail:{action:"save",translate:!0}}))}),window.addEventListener("keydown",p=>{p.key==="Escape"&&e&&!e.hidden&&s()})}function Fn(){const e=document.getElementById("mpdMembershipCancelModal");if(!e||e.dataset.mpdMembershipModalWired==="1")return;e.dataset.mpdMembershipModalWired="1";const t=e.querySelector(".profile-gallery-access-modal__scrim");t==null||t.addEventListener("click",Bt),window.addEventListener("keydown",a=>{a.key==="Escape"&&e&&!e.hidden&&Bt()})}function Rn(){const e=document.getElementById("mpdResidencyComingSoonModal");if(!e||e.dataset.mpdResidencyModalWired==="1")return;e.dataset.mpdResidencyModalWired="1";const t=e.querySelector(".profile-gallery-access-modal__scrim"),a=e.querySelector(".profile-gallery-access-modal__close");t==null||t.addEventListener("click",Yt),a==null||a.addEventListener("click",Yt),window.addEventListener("keydown",n=>{n.key==="Escape"&&e&&!e.hidden&&Yt()})}async function jn(e,t,a){const n=document.getElementById("mpd_programs_list");if(!n)return;let i={};try{const f=e.applied_json??e.appliedJson;f&&(i=typeof f=="string"?JSON.parse(f):f),(!i||typeof i!="object")&&(i={})}catch{i={}}let s=[];try{s=await pa()}catch{s=[]}n.replaceChildren();const p=Object.keys(i).filter(Boolean),l=document.getElementById("mpd_my_programs_count");if(l&&(l.textContent=String(p.length),l.toggleAttribute("hidden",p.length===0),l.setAttribute("aria-label",`${p.length} applications`)),p.length===0){n.innerHTML=`
      <div class="mpd-programs-empty-state mpd-my-program-empty">
        <h4>No applications yet.</h4>
        <p class="studio-muted">When you apply to a Fusion program, your status and next steps will appear here.</p>
      </div>
    `,await xt(s);return}let m={approvedPrograms:[],summaries:[],ledger:[],plans:[]};try{m=await Ha()}catch{}const h=wn(m),g=p.map(f=>{const E=s.find(_=>String(_.id)===String(f))||{id:f,enCard:{focus:f}};return un(E,f,{...et(i[f]),slotSecured:h.has(String(f))})}).sort((f,E)=>String(E.submittedAt||"").localeCompare(String(f.submittedAt||"")));n.innerHTML=`
    <div class="mpd-my-program-cards">
      ${g.map(bn).join("")}
    </div>
    <div id="mpd_my_programs_no_results" class="mpd-programs-empty-state mpd-my-program-empty" hidden>
      <h4>No applications match this filter.</h4>
      <p class="studio-muted">Choose another status to see more applications.</p>
    </div>
  `;for(const f of document.querySelectorAll("[data-mpd-my-program-filter]")){const E=f.getAttribute("data-mpd-my-program-filter")||"all",_=E==="all"?g.length:g.filter(A=>A.status.key===E).length,R=f.querySelector(".mpd-my-program-filter__count");R&&(R.textContent=String(_))}ei(),await xt(s)}async function Un(){const e=document.getElementById("mpd_public_programs_all");if(!e)return;let t=[];try{t=await pa()}catch{t=[]}const a=t.filter(l=>Pi(l.visibility)==="public");if(e.replaceChildren(),a.length===0){e.innerHTML=`
      <div class="mpd-programs-empty-state">
        <h4>No public programs are listed yet.</h4>
        <p class="studio-muted">When Fusion publishes new public opportunities, they will appear here.</p>
      </div>
    `;return}const n=document.createElement("div");n.className="mpd-public-programs-grid";const i=new Set;for(const l of a){const m=l!=null&&l.enCard&&typeof l.enCard=="object"?l.enCard:{},h=l!=null&&l.jaCard&&typeof l.jaCard=="object"?l.jaCard:{},g=ae(m.focus??m.headline),f=ae(m.location)||ae(m.headline),E=f||g||ae(m.headline)||ae(l.id),_=ae(m.startDate),R=ae(m.endDate),A=ae(m.year),S=V(m.openTo,m.audience,m.eligibility,m.discipline,m.medium),F=V(m.deadline,m.applicationDeadline,m.deadlineDate,m.applyBy,_&&R?`${_} - ${R}`:_||R,A),Z=V(m.category,m.type,g),We=Z.toLowerCase().replace(/\s+/g,"-");Z&&i.add(Z);const Me=ae(l==null?void 0:l.studioStatus).toLowerCase(),z=V(h.imageSrc,m.imageSrc),L=ae(m.imageAlt??m.focus??E)||E;let Se="/programs";if(l!=null&&l.routeLink){const K=String(l.routeLink);Se=K.startsWith("/")?K:`/${K}`}const fe=document.createElement("article");fe.className="mpd-public-program-card mpd-public-program-card--rich",fe.dataset.status=Me||"unknown",fe.dataset.category=We,fe.dataset.search=[E,g,f,S,F,Z,l==null?void 0:l.id,Se,Me].filter(Boolean).join(" ");const re=document.createElement("a");re.className="mpd-public-program-card__link-rich",re.href=Se,re.target="_blank",re.rel="noopener noreferrer";const ge=document.createElement("div");ge.className="mpd-public-program-card__image-wrap";const Ie=document.createElement("div");if(Ie.className="mpd-public-program-card__focus",Ie.textContent=Z||g||"Program",ge.appendChild(Ie),z){const K=document.createElement("img");K.className="mpd-public-program-card__img",K.src=String(z),K.alt=Ze(L),K.loading="lazy",ge.appendChild(K)}else{const K=document.createElement("div");K.className="mpd-public-program-card__placeholder",K.textContent="Fusion",ge.appendChild(K)}re.appendChild(ge);const ye=document.createElement("div");ye.className="mpd-public-program-card__body";const xe=document.createElement("div");xe.className="mpd-public-program-card__title",xe.textContent=E||f,ye.appendChild(xe);const he=document.createElement("div");he.className="mpd-public-program-card__meta";const se=(K,Ye)=>{const Ge=ae(Ye);if(!Ge)return;const tt=document.createElement("p");tt.className="mpd-public-program-card__meta-row",tt.innerHTML=`<strong>${b(K)}:</strong> ${b(Ge)}`,he.appendChild(tt)};se("Program",g),se("Open to",S),se("Deadline",F),he.childElementCount&&ye.appendChild(he);const Le=document.createElement("span");Le.className="mpd-public-program-card__cta",Le.textContent="View details ->",ye.appendChild(Le),re.appendChild(ye),fe.appendChild(re),n.appendChild(fe)}const s=document.getElementById("mpd_public_programs_filter");if(s){const l=s.value||"all",m=Array.from(i).sort((h,g)=>h.localeCompare(g)).map(h=>{const g=`category:${h.toLowerCase().replace(/\s+/g,"-")}`;return`<option value="${b(g)}">${b(h)}</option>`}).join("");s.innerHTML=`
      <option value="all">All programs</option>
      <option value="open">Open now</option>
      <option value="not-open">Not open yet</option>
      ${m}
    `,s.value=Array.from(s.options).some(h=>h.value===l)?l:"all"}e.appendChild(n);const p=document.createElement("div");p.id="mpd_public_programs_no_results",p.className="mpd-programs-empty-state",p.hidden=!0,p.innerHTML=`
    <h4>No programs match your search.</h4>
    <p class="studio-muted">Try a different keyword or clear the filter to see all public programs.</p>
  `,e.appendChild(p),ra()}async function Wn(){const e=document.getElementById("mpd_apply_residency");if(!e)return;let t=[];try{t=await pa()}catch{t=[]}const a=Et.split("/").filter(Boolean).pop()||"",n=t.find(p=>String(p.routeLink||"").toLowerCase().includes("kaga"))||t.find(p=>String(p.routeLink||"").split("/").filter(Boolean).pop()===a)||null;let i=Et;if(n!=null&&n.routeLink){const p=String(n.routeLink);i=p.startsWith("/")?p:`/${p}`}e.dataset.programPath=i;let s=!0;n&&(s=String(n.studioStatus??"").toLowerCase()==="open"),e.dataset.applyOpen=s?"true":"false",e.textContent=s?"Apply to Residency":"Coming soon",e.classList.toggle("mpd-residency-cta--closed",!s)}function Hn(){const e='<div class="member-profile-dashboard__card-footer"><button type="button" class="mpd-section-save mpd-section-save--primary">Save</button></div>',t='<div class="member-profile-dashboard__card-footer"><button type="button" class="mpd-section-save mpd-section-save--primary" id="mpd_story_save">Save</button></div>',a=[0,1,2].map(l=>{const m=["5:4","1:1","16:9"][l]||"5:4";return`
                        <div class="member-profile-dashboard__intro-slot member-profile-dashboard__intro-slot--${String(l+1)}">
                            <div class="member-profile-dashboard__intro-preview-col">
                                <input type="hidden" id="mpd_intro_${l}_src" />
                                <input type="hidden" id="mpd_intro_${l}_alt" />
                                <input type="hidden" id="mpd_intro_${l}_caption" />
                                <input type="file" id="mpd_intro_${l}_file" class="mpd-file-input-hidden" accept="image/*" data-intro-slot="${String(l)}" />
                                <div class="member-profile-dashboard__intro-preview-wrap mpd-media-upload-surface" data-mpd-media-surface="intro-${l}">
                                    <label for="mpd_intro_${l}_file" class="mpd-media-upload-label" aria-label="Upload introductory work image ${String(l+1)}">
                                        <div class="mpd-media-spinner" id="mpd_intro_${l}_spinner" hidden aria-hidden="true"></div>
                                        <img id="mpd_intro_${l}_thumb" class="member-profile-dashboard__intro-thumb" alt="${Ze("Profile intro artwork preview")}" style="display:none" />
                                        <span class="mpd-media-placeholder" aria-hidden="true">Image ${String(l+1)}</span>
                                        <span class="mpd-media-overlay" aria-hidden="true">
                                            <span class="mpd-media-overlay__empty">Upload</span>
                                            <span class="mpd-media-overlay__filled">Replace</span>
                                            <small class="mpd-media-overlay__ratio">Suggested ${m}</small>
                                        </span>
                                    </label>
                                    <button type="button" class="mpd-media-delete" data-mpd-media-delete="intro-${l}">Delete</button>
                                </div>
                            </div>
                        </div>`}).join(""),n=Pt?`<button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="dev">${Qe("artist-system-info")}<span class="studio-nav-item__label">Developer</span></button>`:"",i=Pt?`<div class="mpd-panel" id="mpd-panel-dev" data-mpd-panel="dev" hidden>
                    <section class="member-profile-dashboard__card">
                        <details id="mpd-dev">
                            <summary style="cursor:pointer;font-variation-settings:var(--fv-subtitle)">Developer — raw locales JSON</summary>
                            <textarea id="mpd_dev_json" class="studio-textarea studio-textarea-mono" rows="14" readonly spellcheck="false" style="margin-top:0.75rem;width:100%"></textarea>
                        </details>
                        ${e}
                    </section>
                </div>`:"",s=Ya("assist-refine"),p=s?`<img src="${we(s)}" alt="" />`:'<span aria-hidden="true">✎</span>';return`
        <div class="page settings-profile-page">
            <app-profile-save-status id="settingsProfileFloatingSaveStatus" hidden aria-hidden="true"></app-profile-save-status>
            <div id="mpd_upload_overlay" class="mpd-upload-overlay" hidden aria-hidden="true">
                <div class="mpd-upload-overlay__panel" role="status" aria-live="polite">
                    <div class="mpd-upload-overlay__spinner" aria-hidden="true"></div>
                    <p id="mpd_upload_overlay_label">Uploading image...</p>
                </div>
            </div>
            <main id="settingsMain" class="main-cont">
                <div id="settingsMainContent" class="feed-container">
        <div class="studio-app settings-profile-studio" id="mpd_root">
            <div class="studio-nav-backdrop" id="settingsProfileNavBackdrop" hidden aria-hidden="true"></div>
            <aside class="studio-sidebar" id="settingsProfileSidebar" aria-label="Profile navigation">
                <button type="button" class="studio-wordmark studio-wordmark-btn" id="settingsProfileWordmark" aria-label="Fusion home">Fusion</button>
                <p class="settings-profile-slug-line" id="mpd_sidebar_slug">—</p>
                <nav class="studio-nav" id="settingsProfileNav" aria-label="Profile sections">
                    <button type="button" class="studio-nav-item mpd-nav-btn is-active" data-mpd-panel="overview">${Qe("artist-overview")}<span class="studio-nav-item__label">Overview</span></button>
                    <button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="location">${Qe("nav-status")}<span class="studio-nav-item__label">Status</span></button>
                    <button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="story">${Qe("assist-context")}<span class="studio-nav-item__label">Story &amp; world</span></button>
                    <button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="programs">${Qe("nav-programs")}<span class="studio-nav-item__label">Programs</span></button>
                    <button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="membership">${Qe("nav-subscribers")}<span class="studio-nav-item__label">Membership</span></button>
                    ${n}
                    <div class="studio-nav-contact mpd-sidebar-contact" id="settingsProfileNavContact">
                        <p class="studio-nav-contact__headline">
                            Questions or issues? Message the Fusion team—we usually reply within a few business days.
                        </p>
                        <label id="settingsProfileNavContactEmailWrap" class="studio-nav-contact__email-wrap" hidden>
                            <span class="studio-nav-contact__email-label">Your email (so we can reply)</span>
                            <input
                                type="email"
                                id="settingsProfileNavContactEmail"
                                class="studio-nav-contact__input studio-nav-contact__input--email"
                                placeholder="you@example.com"
                                autocomplete="email"
                            />
                        </label>
                        <textarea
                            id="settingsProfileNavContactMessage"
                            class="studio-nav-contact__input"
                            rows="4"
                            placeholder="Your message"
                            aria-label="Message to Fusion"
                        ></textarea>
                        <button type="button" class="studio-btn-primary studio-nav-contact__send" id="settingsProfileNavContactSend" style="justify-content: end;">
                            Send
                        </button>
                        <p id="settingsProfileNavContactStatus" class="studio-nav-contact__status" role="status"></p>
                    </div>
                    <div class="mpd-sidebar-cta-row" aria-label="Profile quick actions">
                        <a class="program-intro-cta mpd-program-intro-cta mpd-sidebar-cta" id="mpd_view_profile" href="#" target="_blank" rel="noopener noreferrer">View public profile</a>
                        <button type="button" class="program-intro-cta mpd-program-intro-cta mpd-sidebar-cta" id="mpd_apply_residency" data-program-path="${Et}" data-apply-open="true">Apply to Residency</button>
                    </div>
                </nav>
                <div class="studio-sidebar-footer">
                    <div class="studio-avatar" id="settingsProfileAvatar" aria-hidden="true">U</div>
                    <div class="studio-user-meta">
                        <span id="settingsProfileSidebarRole">Member</span>
                        <span id="settingsProfileSidebarSub">Profile</span>
                    </div>
                </div>
            </aside>
            <div class="studio-workspace">
                <header class="studio-topbar">
                    <button type="button" class="studio-menu-btn" id="settingsProfileMenuBtn" aria-label="Open navigation menu" aria-expanded="false" aria-controls="settingsProfileNav">
                        <span class="studio-menu-btn__bars" aria-hidden="true"></span>
                    </button>
                    <h1 id="settingsProfileHeading">User Profile</h1>
                </header>
                <div class="studio-main settings-profile-main" id="settingsProfileScrollMain">
                <p id="settingsProfileStatus" class="member-profile-dashboard__status-line" role="status"></p>
                <div id="settingsProfileInitialLoading" class="mpd-initial-loading" role="status" aria-live="polite">
                    <div class="mpd-initial-loading__spinner" aria-hidden="true"></div>
                    <p>Loading profile settings...</p>
                </div>
                <div class="mpd-settings-shout shoutHeadline" id="settingsProfileShout">
                    Your work exists in context.<br />This is where it begins.
                </div>
                <p id="settingsProfileHint" class="studio-muted mpd-settings-hint"></p>
                <div id="settingsProfileMembershipActions" class="mpd-membership-actions" style="display:none" hidden>
                    <button type="button" class="studio-btn-primary" id="settingsProfileFinishMembership">Finish membership setup</button>
                    <button type="button" class="studio-btn-ghost" id="settingsProfileSyncSubscription">Refresh subscription status</button>
                    <button type="button" class="studio-btn-ghost" id="settingsProfileAdminBypass" style="display:none" hidden>Admin preview bypass</button>
                </div>
                <div id="settingsTestPicker" class="studio-field studio-field--full" style="display:none">
                    <span>Test mode</span>
                    <select id="settingsTestArtistSelect" class="studio-input"></select>
                </div>
                <div id="settingsProfileFormWrap" hidden>
                    <div class="mpd-panels">
                        <div class="mpd-panel" id="mpd-panel-overview" data-mpd-panel="overview">
                            <section class="member-profile-dashboard__card" id="mpd-overview">
                                <h2>Overview</h2>
                                <div class="studio-field studio-field--full mpd-visibility-field mpd-visibility-source">
                                    <span>Artist profile visibility</span>
                                    <input type="hidden" id="mpd_profile_visibility" value="inactive" />
                                    <div class="mpd-visibility-toggle" role="group" aria-label="Artist profile visibility" aria-describedby="mpd_profile_visibility_hint">
                                        <button type="button" class="mpd-visibility-toggle__btn is-active" data-mpd-visibility="inactive" aria-pressed="true">Inactive</button>
                                        <button type="button" class="mpd-visibility-toggle__btn" data-mpd-visibility="private" aria-pressed="false">Private</button>
                                        <button type="button" class="mpd-visibility-toggle__btn" data-mpd-visibility="public" aria-pressed="false">Public</button>
                                    </div>
                                    <span id="mpd_profile_visibility_review_notice" class="mpd-visibility-review-notice" hidden>Submitted for review</span>
                                    <span id="mpd_profile_visibility_hint" class="mpd-field-hint">Choose <strong>Public</strong> to submit your profile for staff review. Approved public profiles stay public until changed to <strong>Private</strong> or <strong>Inactive</strong>.</span>
                                </div>
                                <p id="mpd_datasource_pill" class="member-profile-dashboard__pill" style="display:none;margin-top:0.75rem"></p>

                                <h2 class="mpd-identity-h2">Identity &amp; presence</h2>
                                <p class="studio-muted">Name, discipline, bios, and media — save when you are ready.</p>
                                <h3 class="mpd-identity-subhead">Name &amp; discipline</h3>
                                <div class="studio-form-grid mpd-editorial-grid">
                                    <label class="studio-field"><span>First name</span>
                                        <input type="text" id="mpd_first_name" class="studio-input" autocomplete="given-name" placeholder="First name" />
                                    </label>
                                    <label class="studio-field"><span>Last name</span>
                                        <input type="text" id="mpd_last_name" class="studio-input" autocomplete="family-name" placeholder="Last name" />
                                    </label>
                                    <label class="studio-field studio-field--full"><span>Discipline</span>
                                        ${Ji()}
                                    </label>
                                </div>

                                <div class="studio-form-grid mpd-editorial-grid">
                                    <label class="studio-field studio-field--full"><span>Bio</span>
                                        <textarea id="mpd_bio" class="studio-textarea" rows="5" placeholder="Tell the story behind your work..."></textarea>
                                    </label>
                                </div>

                                <h3 class="mpd-identity-subhead">Digital Footprint</h3>
                                <p class="studio-muted">Website, social, and other links that shape how people find you beyond this site.</p>
                                <div id="mpd-links"></div>
                                <button type="button" class="studio-btn-ghost" id="mpd_links_add">Add link</button>

                                <div class="mpd-hero-media-row">
                                    <div class="mpd-hero-media-row__main">
                                        <h3 class="studio-subheading mpd-media-subhead">Main Artwork</h3>
                                        <p class="studio-muted mpd-media-helper">
                                          Use a high-quality image of your work. A <strong>5:4</strong> aspect ratio
                                          is preferred. Max <strong>1 MB</strong> per file.
                                        </p>
                                        <input type="hidden" id="mpd_hero_url" value="" />
                                        <input type="file" id="mpd_hero_file" class="mpd-file-input-hidden" accept="image/*" />
                                        <div class="member-profile-dashboard__hero-preview-wrap mpd-media-upload-surface mpd-media-upload-surface--hero" data-mpd-media-surface="hero">
                                            <label for="mpd_hero_file" class="mpd-media-upload-label" aria-label="Upload main artwork">
                                                <div class="mpd-media-spinner" id="mpd_hero_spinner" hidden aria-hidden="true"></div>
                                                <img id="mpd_hero_preview" class="member-profile-dashboard__hero-preview" alt="${Ze("Profile hero image preview")}" />
                                                <span class="mpd-media-placeholder" aria-hidden="true">Main Artwork</span>
                                                <span class="mpd-media-overlay" aria-hidden="true">
                                                    <span class="mpd-media-overlay__empty">Upload</span>
                                                    <span class="mpd-media-overlay__filled">Replace</span>
                                                </span>
                                            </label>
                                            <button type="button" class="mpd-media-delete" data-mpd-media-delete="hero">Delete</button>
                                        </div>
                                    </div>

                                    <div class="mpd-hero-media-row__profile">
                                        <h3 class="studio-subheading mpd-media-subhead">Profile Card</h3>
                                        <p class="studio-muted mpd-media-helper">
                                          Optional portrait for your profile cards. Falls back to the main artwork when empty.
                                          Max <strong>1 MB</strong> per file.
                                        </p>
                                        <input type="hidden" id="mpd_hero_profile_url" value="" />
                                        <input type="file" id="mpd_hero_profile_file" class="mpd-file-input-hidden" accept="image/*" />
                                        <div class="mpd-profile-card-upload mpd-media-upload-surface" data-mpd-media-surface="heroProfile">
                                            <label for="mpd_hero_profile_file" class="mpd-profile-card-upload__label mpd-media-upload-label" aria-label="Upload profile card image">
                                                <div class="mpd-profile-card-upload__image">
                                                    <div class="mpd-media-spinner" id="mpd_hero_profile_spinner" hidden aria-hidden="true"></div>
                                                    <img id="mpd_hero_profile_preview" class="member-profile-dashboard__hero-preview" alt="${Ze("Profile headshot preview")}" />
                                                    <span class="mpd-media-placeholder" aria-hidden="true">Profile Card</span>
                                                    <span class="mpd-media-overlay" aria-hidden="true">
                                                        <span class="mpd-media-overlay__empty">Upload</span>
                                                        <span class="mpd-media-overlay__filled">Replace</span>
                                                    </span>
                                                </div>
                                                <div class="mpd-profile-card-upload__body" aria-hidden="true">
                                                    <span id="mpd_hero_profile_card_name" class="mpd-profile-card-upload__name">Artist Name</span>
                                                    <span id="mpd_hero_profile_card_discipline" class="mpd-profile-card-upload__discipline">Discipline</span>
                                                </div>
                                            </label>
                                            <button type="button" class="mpd-media-delete" data-mpd-media-delete="heroProfile">Delete</button>
                                        </div>
                                    </div>
                                </div>

                                <h3 class="studio-subheading mpd-media-subhead">Introductory Work</h3>
                                <div class="member-profile-dashboard__intro-grid">
                                    ${a}
                                </div>
                                <div id="mpd_audio_section" class="mpd-audio-section">
                                <h3 class="studio-subheading mpd-media-subhead">Audio bite</h3>
                                <p class="studio-muted mpd-media-helper">Upload a short audio bite for journal audio rows.</p>
                                <input type="hidden" id="mpd_audio_url" value="" />
                                <input type="file" id="mpd_audio_file" class="mpd-file-input-hidden" accept="audio/*" />
                                <label for="mpd_audio_file" class="mpd-upload-btn">Upload audio bite</label>
                                <label class="studio-field studio-field--full"><span>Audio title</span>
                                    <input type="text" id="mpd_audio_title" class="studio-input" />
                                </label>
                                </div>
                                ${e}
                            </section>
                        </div>

                        <div class="mpd-panel" id="mpd-panel-location" data-mpd-panel="location" hidden>
                            <section class="member-profile-dashboard__card" id="mpd-location">
                                <h2>Status</h2>
                                <p class="studio-muted">Status and location for the selected language.</p>
                                <div class="studio-form-grid mpd-editorial-grid mpd-editorial-grid--status">
                                    <div class="studio-field studio-field--full mpd-status-source">
                                        <span>Status</span>
                                        <input type="hidden" id="mpd_status" value="studio" />
                                        <div class="mpd-status-toggle" role="group" aria-label="Artist status">
                                            <button type="button" class="mpd-status-toggle__btn is-active" data-mpd-status="studio" aria-pressed="true">In studio</button>
                                            <button type="button" class="mpd-status-toggle__btn" data-mpd-status="prep" aria-pressed="false">Preparing for exhibition</button>
                                            <button type="button" class="mpd-status-toggle__btn" data-mpd-status="showing" aria-pressed="false">Show in progress</button>
                                            <button type="button" class="mpd-status-toggle__btn" data-mpd-status="available" aria-pressed="false">Available for commissions</button>
                                        </div>
                                    </div>
                                    <label class="studio-field"><span>City</span>
                                        <input type="text" id="mpd_loc_city" class="studio-input" placeholder="City" />
                                    </label>
                                    <label class="studio-field"><span>State / region</span>
                                        <input type="text" id="mpd_loc_state" class="studio-input" placeholder="State or region" />
                                    </label>
                                    <label class="studio-field"><span>Country</span>
                                        <input type="text" id="mpd_loc_country" class="studio-input" placeholder="Country" />
                                    </label>
                                    <label class="studio-field studio-field--full"><span>Display location (override)</span>
                                        <input type="text" id="mpd_loc_display" class="studio-input" placeholder="Optional single line for feeds" />
                                    </label>
                                </div>
                                ${e}
                            </section>
                        </div>

                        <div class="mpd-panel" id="mpd-panel-story" data-mpd-panel="story" hidden>
                            <section class="member-profile-dashboard__card" id="mpd-story">
                                <div class="mpd-story-public-source">
                                    <input type="hidden" id="mpd_public_world_source" value="newWorld" />
                                    <div class="mpd-world-source-toggle" role="group" aria-label="Show on my public profile">
                                        <button type="button" class="mpd-world-source-toggle__btn" data-mpd-world-source="world" aria-pressed="false">World</button>
                                        <button type="button" class="mpd-world-source-toggle__btn is-active" data-mpd-world-source="newWorld" aria-pressed="true" disabled aria-disabled="true">New World</button>
                                    </div>
                                    <p class="mpd-world-source-note" id="mpd_public_world_source_note">New World will display on your profile.</p>
                                </div>
                                <h2>Story &amp; World</h2>
                                <div class="mpd-story-dual-grid">
                                    <div class="mpd-story-field-dual">
                                        <div class="mpd-story-field-meta">
                                            <span class="mpd-story-field-label">Practice</span>
                                            <span class="mpd-field-hint">Tell us more about the work you are currently pursuing.</span>
                                        </div>
                                        <textarea id="mpd_w_practice" class="studio-textarea mpd-story-input" rows="2" placeholder="Describe what you are working on..."></textarea>
                                        <button type="button" class="mpd-story-edit-btn" data-mpd-edit-target="mpd_w_practice" aria-label="Edit practice">${p}</button>
                                    </div>
                                    <div class="mpd-story-field-dual">
                                        <div class="mpd-story-field-meta">
                                            <span class="mpd-story-field-label">Perspective</span>
                                            <span class="mpd-field-hint">How you see your practice in relation to the field — use a blank line between paragraphs.</span>
                                        </div>
                                        <textarea id="mpd_w_perspective" class="studio-textarea mpd-story-input" rows="3" placeholder="Share your point of view...&#10;&#10;Add another thought here..."></textarea>
                                        <button type="button" class="mpd-story-edit-btn" data-mpd-edit-target="mpd_w_perspective" aria-label="Edit perspective">${p}</button>
                                    </div>
                                    <div class="mpd-story-field-dual">
                                        <div class="mpd-story-field-meta">
                                            <span class="mpd-story-field-label">Vision</span>
                                            <span class="mpd-field-hint">Where you want the work to go — aims, horizons, and what you are building toward.</span>
                                        </div>
                                        <textarea id="mpd_w_vision" class="studio-textarea mpd-story-input" rows="3" placeholder="Where do you want the work to go?"></textarea>
                                        <button type="button" class="mpd-story-edit-btn" data-mpd-edit-target="mpd_w_vision" aria-label="Edit vision">${p}</button>
                                    </div>
                                    <div class="mpd-story-field-dual">
                                        <div class="mpd-story-field-meta">
                                            <span class="mpd-story-field-label">Constructing</span>
                                            <span class="mpd-field-hint">Materials, process, and what you are actively making right now.</span>
                                        </div>
                                        <textarea id="mpd_w_constructing" class="studio-textarea mpd-story-input" rows="2" placeholder="Materials, process, current experiments..."></textarea>
                                        <button type="button" class="mpd-story-edit-btn" data-mpd-edit-target="mpd_w_constructing" aria-label="Edit constructing">${p}</button>
                                    </div>
                                    <div class="mpd-story-field-dual">
                                        <div class="mpd-story-field-meta">
                                            <span class="mpd-story-field-label">Context</span>
                                            <span class="mpd-field-hint">Place, community, or history that situates the work.</span>
                                        </div>
                                        <textarea id="mpd_w_context" class="studio-textarea mpd-story-input" rows="2" placeholder="Place, community, history, or influences..."></textarea>
                                        <button type="button" class="mpd-story-edit-btn" data-mpd-edit-target="mpd_w_context" aria-label="Edit context">${p}</button>
                                    </div>
                                    <div class="mpd-story-field-dual">
                                        <div class="mpd-story-field-meta">
                                            <span class="mpd-story-field-label">Quote</span>
                                            <span class="mpd-field-hint">A single line visitors can read at a glance — optional, but memorable when it lands.</span>
                                        </div>
                                        <input type="text" id="mpd_w_quote" class="studio-input mpd-story-input" placeholder="A short line visitors can remember..." />
                                        <button type="button" class="mpd-story-edit-btn" data-mpd-edit-target="mpd_w_quote" aria-label="Edit quote">${p}</button>
                                    </div>
                                </div>
                                ${t}
                            </section>
                        </div>

                        <div class="mpd-panel" id="mpd-panel-programs" data-mpd-panel="programs" hidden>
                            <section class="member-profile-dashboard__card mpd-programs-shell" id="mpd-programs">
                                <div class="mpd-program-tabs" role="tablist" aria-label="Programs sections">
                                    <button type="button" class="mpd-program-tab mpd-program-tab--explore is-active" id="mpd-program-tab-explore" role="tab" aria-selected="true" tabindex="0" aria-controls="mpd-program-panel-explore" data-mpd-program-tab="explore">
                                        ${Ae(Wi,"mpd-program-tab__icon")}
                                        <span>Explore programs</span>
                                    </button>
                                    <button type="button" class="mpd-program-tab mpd-program-tab--my-programs" id="mpd-program-tab-my-programs" role="tab" aria-selected="false" tabindex="-1" aria-controls="mpd-program-panel-my-programs" data-mpd-program-tab="my-programs">
                                        ${Ae(qi,"mpd-program-tab__icon")}
                                        <span>My programs</span>
                                        <span class="mpd-program-tab__count" id="mpd_my_programs_count" hidden>0</span>
                                    </button>
                                    <button type="button" class="mpd-program-tab mpd-program-tab--payments" id="mpd-program-tab-payments" role="tab" aria-selected="false" tabindex="-1" aria-controls="mpd-program-panel-payments" data-mpd-program-tab="payments">
                                        ${Ae(Xt,"mpd-program-tab__icon")}
                                        <span>Payments</span>
                                    </button>
                                </div>

                                <div class="mpd-program-tab-panel" id="mpd-program-panel-explore" role="tabpanel" aria-labelledby="mpd-program-tab-explore" data-mpd-program-panel="explore">
                                    <div class="mpd-public-programs-discovery" id="mpd_public_programs_discovery">
                                        <div class="mpd-public-programs-toolbar">
                                            <div>
                                                <h3 class="mpd-public-programs-discovery__h">Explore programs</h3>
                                                <p class="studio-muted">
                                                    Browse all public Fusion programs — each link opens in a new tab.
                                                </p>
                                            </div>
                                            <div class="mpd-public-programs-controls" aria-label="Explore programs filters">
                                                <label class="mpd-public-programs-search">
                                                    <span class="sr-only">Search programs</span>
                                                    <input type="search" id="mpd_public_programs_search" class="studio-input" placeholder="Search programs..." autocomplete="off" />
                                                </label>
                                                <label class="mpd-public-programs-filter">
                                                    <span class="sr-only">Filter programs</span>
                                                    <select id="mpd_public_programs_filter" class="studio-input" aria-label="Filter programs">
                                                        <option value="all">All programs</option>
                                                        <option value="open">Open now</option>
                                                        <option value="not-open">Not open yet</option>
                                                    </select>
                                                </label>
                                            </div>
                                        </div>
                                        <div id="mpd_public_programs_all" class="mpd-public-programs-list" aria-live="polite"></div>
                                    </div>
                                </div>

                                <div class="mpd-program-tab-panel" id="mpd-program-panel-my-programs" role="tabpanel" aria-labelledby="mpd-program-tab-my-programs" data-mpd-program-panel="my-programs" hidden>
                                    <div class="mpd-my-programs-head">
                                        <div>
                                            <h3>My programs</h3>
                                            <p class="studio-muted">View and manage your applications.</p>
                                        </div>
                                    </div>
                                    <div class="mpd-my-program-filters" role="group" aria-label="Filter my programs by application status">
                                        <button type="button" class="mpd-my-program-filter is-active" data-mpd-my-program-filter="all" aria-pressed="true">All <span class="mpd-my-program-filter__count">0</span></button>
                                        <button type="button" class="mpd-my-program-filter" data-mpd-my-program-filter="submitted" aria-pressed="false">Submitted <span class="mpd-my-program-filter__count">0</span></button>
                                        <button type="button" class="mpd-my-program-filter" data-mpd-my-program-filter="initial-review" aria-pressed="false">Initial review <span class="mpd-my-program-filter__count">0</span></button>
                                        <button type="button" class="mpd-my-program-filter" data-mpd-my-program-filter="post-interview-review" aria-pressed="false">Post interview review <span class="mpd-my-program-filter__count">0</span></button>
                                        <button type="button" class="mpd-my-program-filter" data-mpd-my-program-filter="invited" aria-pressed="false">Invited <span class="mpd-my-program-filter__count">0</span></button>
                                        <button type="button" class="mpd-my-program-filter" data-mpd-my-program-filter="not-selected" aria-pressed="false">Not selected <span class="mpd-my-program-filter__count">0</span></button>
                                        <button type="button" class="mpd-my-program-filter" data-mpd-my-program-filter="withdrawn" aria-pressed="false">Withdrawn <span class="mpd-my-program-filter__count">0</span></button>
                                    </div>
                                    <div id="mpd_programs_list" class="mpd-programs-list" aria-live="polite"></div>
                                </div>

                                <div class="mpd-program-tab-panel" id="mpd-program-panel-payments" role="tabpanel" aria-labelledby="mpd-program-tab-payments" data-mpd-program-panel="payments" hidden>
                                    <div id="mpd_program_payments_workspace" aria-live="polite">
                                        <div class="mpd-program-placeholder">
                                            <h3>Payments</h3>
                                            <p class="studio-muted">Program payments appear after you are approved for a program.</p>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div class="mpd-panel" id="mpd-panel-membership" data-mpd-panel="membership" hidden>
                            <section class="member-profile-dashboard__card mpd-membership-card" id="mpd-membership-section">
                                <h2>Membership</h2>
                                <p class="studio-muted">
                                    Manage your subscription, view billing details, and update your membership.
                                </p>
                                <p id="mpd_membership_error" class="mpd-membership-inline-error" role="alert" hidden></p>
                                <p id="mpd_membership_scheduled_cancel" class="mpd-membership-scheduled-cancel" role="status" hidden></p>

                                <div class="mpd-membership-status-card" id="mpd_membership_status_grid">
                                    <div class="mpd-membership-status-col mpd-membership-status-col--badge">
                                        <div class="mpd-membership-badge" id="mpd_membership_badge">
                                            <span class="mpd-membership-badge__icon" aria-hidden="true"></span>
                                            <span class="mpd-membership-badge__text">
                                                <strong id="mpd_membership_badge_label">—</strong>
                                                <span class="studio-muted" id="mpd_membership_badge_line">—</span>
                                            </span>
                                        </div>
                                    </div>
                                    <div class="mpd-membership-status-col">
                                        <span class="mpd-membership-k">Plan</span>
                                        <strong id="mpd_membership_plan_name">—</strong>
                                        <span class="studio-muted" id="mpd_membership_plan_price">—</span>
                                    </div>
                                    <div class="mpd-membership-status-col">
                                        <span class="mpd-membership-k">Next renewal</span>
                                        <strong id="mpd_membership_renewal_date">—</strong>
                                        <span class="studio-muted" id="mpd_membership_renewal_relative"></span>
                                    </div>
                                    <div class="mpd-membership-status-col">
                                        <span class="mpd-membership-k">Payment method</span>
                                        <span class="mpd-membership-pm-line">
                                            <span id="mpd_membership_pm_brand" class="mpd-membership-pm-brand"></span>
                                            <span id="mpd_membership_pm_last4">—</span>
                                        </span>
                                        <button type="button" class="mpd-membership-text-link" id="mpd_membership_pm_update">
                                            Update
                                        </button>
                                    </div>
                                </div>

                                <div class="mpd-membership-included" id="mpd_membership_included_wrap">
                                    <h3 class="mpd-membership-subh">What&apos;s included</h3>
                                    <ul class="mpd-membership-checklist" id="mpd_membership_included_list"></ul>
                                </div>

                                <div class="mpd-membership-manage-grid">
                                    <div class="mpd-membership-actions-card">
                                        <button type="button" class="mpd-membership-action-row" id="mpd_membership_row_billing">
                                            <span class="mpd-membership-action-row__icon" aria-hidden="true"></span>
                                            <span class="mpd-membership-action-row__main">
                                                <strong>Billing history</strong>
                                                <span class="studio-muted">View your past payments and invoices.</span>
                                            </span>
                                            <span class="mpd-membership-action-row__chev" aria-hidden="true"></span>
                                        </button>
                                        <button type="button" class="mpd-membership-action-row" id="mpd_membership_row_payment">
                                            <span class="mpd-membership-action-row__icon mpd-membership-action-row__icon--card" aria-hidden="true"></span>
                                            <span class="mpd-membership-action-row__main">
                                                <strong>Update payment method</strong>
                                                <span class="studio-muted">Change the card used for your subscription.</span>
                                            </span>
                                            <span class="mpd-membership-action-row__chev" aria-hidden="true"></span>
                                        </button>
                                    </div>
                                    <div class="mpd-membership-cancel-card" id="mpd_membership_cancel_wrap">
                                        <h3 class="mpd-membership-subh">Cancel membership</h3>
                                        <p class="studio-muted">
                                            Cancel your membership. You&apos;ll continue to have access until the end of your
                                            current billing period.
                                        </p>
                                        <button type="button" class="mpd-membership-cancel-outline" id="mpd_membership_cancel_btn">
                                            Cancel membership
                                        </button>
                                    </div>
                                </div>

                                <p id="mpd_membership_exempt_note" class="mpd-membership-exempt-note" role="status" hidden></p>
                                <p class="mpd-membership-footer-hint studio-muted">
                                    Need help? Contact the Fusion team and we&apos;ll get back to you within a few business
                                    days.
                                </p>
                            </section>
                        </div>

                        ${i}
                    </div>
                </div>
                </div>
            </div>
        </div>
                </div>
                <div
                    id="mpdResidencyComingSoonModal"
                    class="profile-gallery-access-modal mpd-residency-coming-soon-modal"
                    hidden
                    aria-hidden="true"
                >
                    <div class="profile-gallery-access-modal__scrim" aria-hidden="true"></div>
                    <div
                        class="profile-gallery-access-modal__panel"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="mpdResidencyComingSoonTitle"
                    >
                        <h2 id="mpdResidencyComingSoonTitle" class="profile-gallery-access-modal__title">Coming soon</h2>
                        <p class="profile-gallery-access-modal__body">
                            Applications are not open for this program yet. As part of the Fusion network, you will be
                            notified as soon as applications open — watch your email and this space.
                        </p>
                        <button type="button" class="profile-gallery-access-modal__close">Close</button>
                    </div>
                </div>
                <div
                    id="mpdSaveChoiceModal"
                    class="profile-gallery-access-modal mpd-save-choice-modal"
                    hidden
                    aria-hidden="true"
                >
                    <div class="profile-gallery-access-modal__scrim" aria-hidden="true"></div>
                    <div
                        class="profile-gallery-access-modal__panel mpd-save-choice-modal__panel"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="mpdSaveChoiceTitle"
                    >
                        <h2 id="mpdSaveChoiceTitle" class="profile-gallery-access-modal__title">Save profile</h2>
                        <div class="mpd-save-choice-modal__body">
                            <p>
                                Choose how you want to save this update. Translation creates English and Japanese profile copy
                                during save, so it may take a little longer.
                            </p>
                            <p>
                                Just save is faster and copies the visible text into both profile languages without translation.
                            </p>
                        </div>
                        <p id="mpdSaveChoiceTranslateNote" class="mpd-save-choice-modal__note" hidden></p>
                        <div class="mpd-save-choice-modal__actions">
                            <button type="button" class="studio-btn-primary" id="mpdSaveChoiceTranslate">
                                Translate and save
                            </button>
                            <button type="button" class="mpd-membership-cancel-outline" id="mpdSaveChoiceJustSave">
                                Just save
                            </button>
                            <button type="button" class="profile-gallery-access-modal__close" id="mpdSaveChoiceCancel">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
                <div
                    id="mpdMembershipCancelModal"
                    class="profile-gallery-access-modal mpd-membership-cancel-modal"
                    hidden
                    aria-hidden="true"
                >
                    <div class="profile-gallery-access-modal__scrim" aria-hidden="true"></div>
                    <div
                        class="profile-gallery-access-modal__panel mpd-membership-cancel-modal__panel"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="mpdMembershipCancelTitle"
                    >
                        <h2 id="mpdMembershipCancelTitle" class="profile-gallery-access-modal__title">
                            Before you cancel
                        </h2>
                        <div class="mpd-membership-cancel-modal__body">
                            <p>
                                Great things happen through consistency and commitment — we hope you&apos;ll stay and keep
                                shaping your presence here.
                            </p>
                            <p>
                                We designed this platform for artists to shape for impact: your profile, programs, and
                                story deserve a steady home.
                            </p>
                            <p>
                                If you cancel, your profile will be kept for another <strong>15 days</strong> so you can
                                return without starting from zero — we&apos;d love to welcome you back.
                            </p>
                        </div>
                        <div class="mpd-membership-cancel-modal__actions">
                            <button type="button" class="studio-btn-primary" id="mpdMembershipCancelStay">
                                Stay subscribed
                            </button>
                            <button type="button" class="mpd-membership-cancel-outline" id="mpdMembershipCancelContinue">
                                Continue to cancel
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    `}function ja(e,t,a,n,i={}){return JSON.stringify({locales:e,active:t,hero:a,heroProfile:String(i.heroProfileUrl??""),visibility:n,profileQuote:String(i.profileQuote??""),audioUrl:String(i.audioUrl??""),audioTitle:String(i.audioTitle??"")})}let Kt=null,bt=null;function Vn(){var fa,ga,ya,ha,ba,va,_a,wa,Sa,Pa,Ea,Aa,Ca;document.querySelectorAll("#mpdResidencyComingSoonModal").forEach(r=>{const o=document.getElementById("settingsMain");o&&!o.contains(r)&&r.remove()}),document.querySelectorAll("#mpdMembershipCancelModal").forEach(r=>{const o=document.getElementById("settingsMain");o&&!o.contains(r)&&r.remove()}),document.querySelectorAll("#mpdSaveChoiceModal").forEach(r=>{const o=document.getElementById("settingsMain");o&&!o.contains(r)&&r.remove()}),Rn(),Dn(),Fn();const e=Gi;let t=null,a="",n="",i="",s=!1,p="",l="",m="",h=!1,g=0,f=0;const E=document.getElementById("settingsProfileStatus"),_=document.getElementById("settingsProfileFormWrap"),R=document.getElementById("settingsProfileInitialLoading"),A=r=>{E&&(E.textContent=r||"")};za=A;const S=r=>{R&&(R.hidden=!r,R.setAttribute("aria-hidden",r?"false":"true"))},F=new Map,Z=()=>{const r=F.size>0;document.querySelectorAll(".mpd-section-save").forEach(o=>{o instanceof HTMLButtonElement&&(r?(o.setAttribute("aria-busy","true"),o.disabled=!0):(o.removeAttribute("aria-busy"),o.disabled=!1))})},We=()=>F.values().next().value||null,Me=()=>{const r=We();if(!r)return!1;const o=r.pendingMessage||`Still ${String(r.detail||"working").toLowerCase()}...`;return A(o),gt("saving",o,{operation:r.operation,detail:r.detail}),!0},z=(r,o,d={})=>{if(F.get(r))return!1;const c=r==="new-world-generation"&&F.size===1&&F.has("profile-save");if(!(d.allowConcurrent===!0||c)&&Me())return!1;const y={operation:o.operation,detail:o.detail,pendingMessage:o.pendingMessage||`Still ${String(o.detail||"working").toLowerCase()}...`};F.set(r,y),Z();const M=o.message||o.detail||o.operation||"Working";return A(M),gt("saving",M,{operation:y.operation,detail:y.detail}),!0},L=(r,o="idle",d="")=>{const c=F.get(r);if(F.delete(r),Z(),o==="idle"){!F.size&&d&&A(d);return}const u=d||(o==="saved"?`${(c==null?void 0:c.operation)||"Profile"} saved`:`${(c==null?void 0:c.operation)||"Operation"} failed`);A(u),gt(o,u,{operation:(c==null?void 0:c.operation)||"",detail:(c==null?void 0:c.detail)||""})},Se=r=>{const o=document.getElementById("settingsProfileAdminBypass");o&&(r?(o.style.display="",o.removeAttribute("hidden")):(o.style.display="none",o.setAttribute("hidden","")))},fe=()=>{t={en:{},ja:{}},a="",n="",i="",l="",m="",ea="",ta="admin-preview",rt="inactive",Jt(t,e),ht("inactive"),I("mpd_hero_url",""),I("mpd_hero_profile_url",""),I("mpd_audio_url",""),I("mpd_audio_title",""),at(),Be(),Ye(),S(!1),jt(!0),_&&_.removeAttribute("hidden")},re=async r=>{if(He()==="test"||!xa(r))return A("Saved."),!0;try{const o=await Ke(),d=Bi(o);if(!d)throw new Error("Could not load profile for world generation.");if(!ki(d))return A("Saved."),!0;if(!z("new-world-generation",{operation:"New World",detail:"Generating New World",message:"Generating New World…",pendingMessage:"Still generating New World..."}))return!1;await Ti(d,"fillEmpty");const c=await Ke();if(!c)throw new Error("Could not reload profile after world generation.");const u=Ta(c);try{t=u?JSON.parse(u):{en:{},ja:{}}}catch{t={en:{},ja:{}}}return(!t||typeof t!="object")&&(t={en:{},ja:{}}),Jt(t,e),Ye(),L("new-world-generation","idle","New World generated."),A("Saved."),!0}catch(o){console.error("New World generation failed after profile save.",o);const d="Couldn’t generate New World. Your profile was saved with World. Please try saving again.";return t&&typeof t=="object"&&(t.publicWorldSource="world"),Qa(t||r,e,!1),oa(t||r,"world"),L("new-world-generation","error",d),!1}},ge=()=>{const r=document.getElementById("mpd_root");if(!r||typeof window>"u"||!window.matchMedia("(max-width: 768px)").matches)return;r.dataset.navOpen="false";const o=document.getElementById("settingsProfileNavBackdrop");o&&(o.hidden=!0,o.setAttribute("aria-hidden","true"));const d=document.getElementById("settingsProfileMenuBtn");d&&d.setAttribute("aria-expanded","false");try{document.body.style.overflow=""}catch{}},Ie=async()=>{var nt;const r=document.getElementById("mpd_membership_error"),o=document.getElementById("mpd_membership_scheduled_cancel"),d=document.getElementById("mpd_membership_exempt_note"),c=document.getElementById("mpd_membership_included_list"),u=document.getElementById("mpd_membership_cancel_wrap"),y=document.getElementById("mpd_membership_row_billing"),M=document.getElementById("mpd_membership_row_payment"),P=document.getElementById("mpd_membership_pm_update"),w=document.getElementById("mpd_membership_badge"),v=document.getElementById("mpd_membership_badge_label"),T=document.getElementById("mpd_membership_badge_line"),$=document.getElementById("mpd_membership_plan_name"),B=document.getElementById("mpd_membership_plan_price"),k=document.getElementById("mpd_membership_renewal_date"),Y=document.getElementById("mpd_membership_renewal_relative"),j=document.getElementById("mpd_membership_pm_brand"),ee=document.getElementById("mpd_membership_pm_last4"),U=document.getElementById("mpd_membership_cancel_btn"),W=q=>{w&&(w.className="mpd-membership-badge",q==="ok"?w.classList.add("mpd-membership-badge--ok"):q==="warn"?w.classList.add("mpd-membership-badge--warn"):w.classList.add("mpd-membership-badge--muted"))},G=["Application submission","Profile on the public site","Member benefits and updates"];try{const q=await pi(),x=(nt=q==null?void 0:q.en)==null?void 0:nt.whatsIncludedBullets;Array.isArray(x)&&x[0]&&String(x[0]).trim()&&(G[0]=String(x[0]).trim())}catch{}if(c){c.replaceChildren();for(const q of G){const x=document.createElement("li");x.className="mpd-membership-checklist__item",x.textContent=q,c.appendChild(x)}}if(r&&(r.hidden=!0,r.textContent=""),o&&(o.hidden=!0,o.textContent=""),He()==="test"){d&&(d.hidden=!0),u&&(u.style.display=""),y&&(y.style.display=""),M&&(M.style.display=""),P&&(P.style.display=""),W("ok"),v&&(v.textContent="Active"),T&&(T.textContent="Your membership is active and in good standing. (Test mode — sample data.)"),$&&($.textContent="Application + Subscription"),B&&(B.textContent="$50 every 2 months"),k&&(k.textContent="July 12, 2025"),Y&&(Y.textContent="In 28 days"),j&&(j.textContent="VISA"),ee&&(ee.textContent="•••• 4242"),U&&(U.disabled=!1);return}const le=await Ne();if(!le.authenticated)return;const de=await pt(),J=de&&typeof de=="object"?de:null,H=!!((J==null?void 0:J.membershipExemptManual)??(J==null?void 0:J.membership_exempt_manual));if(y&&(y.style.display=""),M&&(M.style.display=""),P&&(P.style.display=""),u&&(u.style.display=""),d&&(d.hidden=!0),H){d&&(d.hidden=!1,d.textContent="Your membership is complimentary. Stripe billing and self-service cancellation are not required."),u&&(u.style.display="none"),y&&(y.style.display="none"),M&&(M.style.display="none"),P&&(P.style.display="none"),W("ok"),v&&(v.textContent="Active"),T&&(T.textContent="Your membership is active (complimentary)."),$&&($.textContent="Fusion member"),B&&(B.textContent="—");const q=Dt(J,"stripeCurrentPeriodEnd","stripe_current_period_end");k&&(k.textContent=q?Ft(q):"—"),Y&&(Y.textContent=q?Na(q):""),j&&(j.textContent=""),ee&&(ee.textContent="—");return}const te=le.principal.toText(),N=Dt(J,"stripeSubscriptionStatus","stripe_subscription_status"),ie=Dt(J,"stripeCurrentPeriodEnd","stripe_current_period_end"),X=await(await _e(()=>import("./index-20317f29.js").then(q=>q.f0),["assets/index-20317f29.js","assets/index-06c7870c.css"])).fetchMemberBillingSummary(te),C=X&&typeof X=="object"?X:{},ne=!!C.ok,qe=ne&&C.status!=null?String(C.status):N,Ee=ne&&typeof C.currentPeriodEnd=="string"&&C.currentPeriodEnd.trim()?String(C.currentPeriodEnd).trim():ie,it=ne&&!!C.cancelAtPeriodEnd,lt=ne&&typeof C.planLabel=="string"&&C.planLabel.trim()?String(C.planLabel).trim():"Application + Subscription",dt=ne&&typeof C.planPriceLine=="string"&&C.planPriceLine.trim()?String(C.planPriceLine).trim():"—";let pe=null;ne&&C.paymentMethod&&typeof C.paymentMethod=="object"&&(pe=C.paymentMethod),!ne&&C.reason&&String(C.reason)!=="no_integration_url"&&r&&(r.hidden=!1,r.textContent="Billing details could not be loaded from the payment service. Showing your Fusion account status; use Refresh subscription status or check Studio → Services.");const oe=String(qe||"").toLowerCase();v&&(v.textContent=Ki(qe));let Te="Your membership status could not be determined.";if(oe==="active"||oe==="trialing"?(Te="Your membership is active and in good standing.",W("ok")):oe==="past_due"||oe==="unpaid"?(Te="Payment needs attention — update your card or billing in the portal to stay active.",W("warn")):oe==="canceled"||oe==="cancelled"?(Te="This subscription is no longer active.",W("muted")):(oe||(Te="No Stripe subscription is linked yet. If you recently paid, use Refresh subscription status or complete Join."),W("muted")),T&&(T.textContent=Te),$&&($.textContent=lt),B&&(B.textContent=dt),k&&(k.textContent=Ee?Ft(Ee):"—"),Y&&(Y.textContent=Ee?Na(Ee):""),j){const q=pe!=null&&pe.brand?String(pe.brand).toUpperCase():"";j.textContent=q}if(ee){const q=pe!=null&&pe.last4?String(pe.last4):"";ee.textContent=q?`•••• ${q}`:"—"}if(o&&it&&Ee&&(o.hidden=!1,o.textContent=`Cancellation scheduled — access continues until ${Ft(Ee)}.`),U){const q=!!oe||ne&&typeof C.subscriptionId=="string"&&C.subscriptionId.trim(),x=it||oe==="canceled"||oe==="cancelled"||!q;U.disabled=!!x}},ye=()=>{const r=["overview","location","story","programs","membership"];return Pt&&r.push("dev"),r},xe=r=>{const o=document.getElementById("settingsProfileShout"),d=document.getElementById("settingsProfileHint"),u=new Set(ye()).has(r)?r:"overview",y=ka[u]??ka.overview;o&&(o.innerHTML=y.shoutHtml),d&&(d.textContent=y.hint)},he=r=>{const d=new Set(ye()).has(r)?r:"overview";document.querySelectorAll("#mpd_root .mpd-panel").forEach(c=>{const u=c.getAttribute("data-mpd-panel");u&&(c.hidden=u!==d)}),document.querySelectorAll("#mpd_root .mpd-nav-btn").forEach(c=>{const u=c.getAttribute("data-mpd-panel");u&&c.classList.toggle("is-active",u===d)}),xe(d),ge(),d==="membership"&&Ie();try{if(typeof history<"u"&&history.replaceState&&typeof window<"u"){const c=window.location.pathname+window.location.search;history.replaceState(null,"",`${c}#${d}`)}}catch{}},se=()=>{let r=(typeof window<"u"&&window.location.hash?window.location.hash:"#overview").replace(/^#/,"").toLowerCase();return r={"mpd-overview":"overview","mpd-media":"overview","mpd-basics":"location","mpd-story":"story","mpd-links":"overview","mpd-seo":"overview","mpd-programs":"programs","mpd-membership":"membership","mpd-dev":"dev"}[r]||r,new Set(ye()).has(r)?r:"overview"},Le=()=>{if(!t)return!1;const r=Vt();return ja({draft:r},e,D("mpd_hero_url").trim(),Xe(D("mpd_profile_visibility").trim()||"public"),{profileQuote:Wt(),audioUrl:D("mpd_audio_url").trim(),audioTitle:D("mpd_audio_title").trim(),heroProfileUrl:D("mpd_hero_profile_url").trim()})!==p||g!==f},K=()=>t?h?!0:!!(_&&!_.hasAttribute("hidden")&&Le()):!1,Ye=()=>{if(!t)return;const r=Vt();a=D("mpd_hero_url").trim(),n=D("mpd_hero_profile_url").trim();const o=Xe(D("mpd_profile_visibility").trim()||"public");p=ja({draft:r},e,a,o,{profileQuote:Wt(),audioUrl:D("mpd_audio_url").trim(),audioTitle:D("mpd_audio_title").trim(),heroProfileUrl:n}),f=g},Ge=r=>{document.querySelectorAll(".mpd-section-save").forEach(o=>{if(o instanceof HTMLButtonElement)if(r)o.setAttribute("aria-busy","true"),o.disabled=!0;else{if(F.size>0)return;o.removeAttribute("aria-busy"),o.disabled=!1}})},tt=()=>{const r=document.getElementById("mpd_story_save");r&&(r.classList.add("mp--async-ok"),window.setTimeout(()=>{r.classList.remove("mp--async-ok")},1400))};let kt;const ni=r=>{if(s){A("Admin preview bypass is active. This mode is view/edit preview only and cannot save to a linked profile.");return}t&&(Me()||(kt=r,Nn()))},oi=async(r,o={})=>{if(s){A("Admin preview bypass is active. This mode is view/edit preview only and cannot save to a linked profile.");return}if(!t)return;const d=r instanceof HTMLElement&&r.id==="mpd_story_save",c=o.translate!==!1;if(!z("profile-save",{operation:"Profile",detail:c?"Translating profile copy":"Saving without translation",message:c?"Saving profile with translation…":"Saving profile without translation…",pendingMessage:"Still saving profile..."}))return;let u=!1;h=!0,d&&Ge(!0);let y=!1;try{He()!=="test"&&await ot();const M=await Ke();if(!M)throw new Error("Your profile could not be loaded for saving. Refresh this page and try again.");const P=M==null?void 0:M.profile,w=P&&typeof P=="object"?Xe(P.visibility):rt,v=Vt();t=await rn(t,v,D,{translate:c});const T=Va(t);t=T;const $=new Date().toISOString(),B=D("mpd_hero_url").trim(),k=D("mpd_hero_profile_url").trim(),Y=Wt(),j=D("mpd_audio_url").trim(),ee=D("mpd_audio_title").trim(),U=[];await Ei(JSON.stringify(T),$),await Ai(B,$);try{await Ci(k,$)}catch(H){U.push(`Profile image metadata was not saved: ${H instanceof Error?H.message:String(H)}`)}try{await Mi({quote:Y,audioUrl:j,audioTitle:ee},$)}catch(H){U.push(`Quote/audio metadata was not saved: ${H instanceof Error?H.message:String(H)}`)}const W=Xe(D("mpd_profile_visibility").trim()||"public"),G=W==="public"&&w!=="public"?"pending":W;await Ii(G,$),rt=G,ht(G);try{window.dispatchEvent(new CustomEvent("fusion-roster-visibility-updated",{detail:{visibility:G}}))}catch{}a=B,n=k,i=j;const le=T.en&&typeof T.en=="object"?T.en:{},de=$i(String(le.firstName??""),String(le.lastName??""));let J=!1;if(de)try{const H=await xi(de);l=H;const te=document.getElementById("mpd_view_profile");te&&te instanceof HTMLAnchorElement&&(te.href=`/profile/${encodeURIComponent(H)}`);const N=document.getElementById("mpd_sidebar_slug");N&&(N.textContent=H?`/${H}`:"—")}catch(H){J=!0;const te=`${na(H)} (Other changes were saved.)`;L("profile-save","error",te),y=!0}if(u=He()!=="test"&&!J&&xa(T),u&&!d&&Ge(!0),Ye(),!J){ct.capture("profile_settings_saved");const H=await re(T);if(U.length){const N=`Profile saved, but some media did not persist: ${U.join(" ")}`;A(N),L("profile-save","saved",N)}else L("profile-save","saved","Profile saved.");y=!0,H&&(gt("saved","Profile saved",{operation:"Profile",detail:"All changes saved"}),d&&tt())}}catch(M){L("profile-save","error",na(M)),y=!0}finally{h=!1,!y&&F.has("profile-save")&&L("profile-save","error","Profile save did not complete. Try again."),(d||u)&&Ge(!1)}},at=(r=!1)=>{const o=D("mpd_hero_url").trim(),d=document.getElementById("mpd_hero_preview");if(d){if(ue("hero",{hasMedia:!!o,hasPreview:!!o}),!o){De(!1),d.removeAttribute("src"),d.style.display="none";return}De(!0),d.style.display="none",d.onload=()=>{De(!1),d.style.display="block",d.onload=null,d.onerror=null},d.onerror=()=>{De(!1),ue("hero",{hasMedia:!!D("mpd_hero_url").trim(),hasPreview:!1}),je("Preview could not load. Save and refresh, or try another image."),d.removeAttribute("src"),d.style.display="none",d.onload=null,d.onerror=null},d.src=r?ia(o):o,d.complete&&d.naturalHeight>0&&(De(!1),d.style.display="block",d.onload=null,d.onerror=null)}},Be=(r=!1)=>{const o=D("mpd_hero_profile_url").trim(),d=D("mpd_hero_url").trim(),c=o||d,u=document.getElementById("mpd_hero_profile_preview");if(_t(),!!u){if(ue("heroProfile",{hasMedia:!!o,hasPreview:!!c}),!c){Fe(!1),u.removeAttribute("src"),u.style.display="none";return}Fe(!0),u.style.display="none",u.onload=()=>{Fe(!1),u.style.display="block",u.onload=null,u.onerror=null},u.onerror=()=>{Fe(!1),ue("heroProfile",{hasMedia:!!D("mpd_hero_profile_url").trim(),hasPreview:!1}),je("Preview could not load. Save and refresh, or try another image."),u.removeAttribute("src"),u.style.display="none",u.onload=null,u.onerror=null},u.src=r?ia(c):c,u.complete&&u.naturalHeight>0&&(Fe(!1),u.style.display="block",u.onload=null,u.onerror=null)}},ri=r=>{if(r==="hero"){I("mpd_hero_url",""),a="",g+=1,at(),Be(),A("Hero image removed. Save to apply this change.");return}if(r==="heroProfile"){I("mpd_hero_profile_url",""),n="",g+=1,Be(),A("Profile image removed. Save to apply this change.");return}const o=/^intro-(\d+)$/.exec(r);if(o){const d=Number(o[1]);if(!Number.isInteger(d)||d<0||d>2)return;I(`mpd_intro_${d}_src`,""),I(`mpd_intro_${d}_alt`,""),I(`mpd_intro_${d}_caption`,""),g+=1,me(d,!1),ue(`intro-${d}`,{hasMedia:!1,hasPreview:!1});const c=document.getElementById(`mpd_intro_${d}_thumb`);c&&(c.removeAttribute("src"),c.style.display="none",c.onload=null,c.onerror=null),A("Introductory work removed. Save to apply this change.")}},O=document.getElementById("mpd_root");O&&!O.dataset.mpdDelegated&&(O.dataset.mpdDelegated="1",O.addEventListener("click",r=>{var j,ee,U,W,G,le,de,J,H,te,N,ie,Pe,X,C,ne,qe,Ee,it,lt,dt,pe,oe,Te,nt,q;const o=r.target&&((ee=(j=r.target).closest)==null?void 0:ee.call(j,".mpd-nav-btn"));if(o&&O.contains(o)){r.preventDefault();const x=o.getAttribute("data-mpd-panel");x&&he(x);return}const d=r.target&&((W=(U=r.target).closest)==null?void 0:W.call(U,"[data-mpd-program-tab]"));if(d&&O.contains(d)){if(r.preventDefault(),d.hasAttribute("hidden")||d.getAttribute("aria-hidden")==="true")return;St(d.getAttribute("data-mpd-program-tab")||"explore");return}const c=r.target&&((le=(G=r.target).closest)==null?void 0:le.call(G,"[data-mpd-payment-program]"));if(c&&O.contains(c)){r.preventDefault(),Ve=c.getAttribute("data-mpd-payment-program")||"",$t();return}const u=r.target&&((J=(de=r.target).closest)==null?void 0:J.call(de,"[data-mpd-flight-choice]"));if(u&&O.contains(u)){if(r.preventDefault(),u.hasAttribute("disabled"))return;Mn(u.getAttribute("data-mpd-flight-choice")||"support");return}const y=r.target&&((te=(H=r.target).closest)==null?void 0:te.call(H,"[data-mpd-payment-action]"));if(y&&O.contains(y)){r.preventDefault();const x=ai();if(!x)return;const Q=y.getAttribute("data-mpd-payment-action")||"";Q==="deposit"?sa(x,"deposit",x.depositCents):Q==="full"?sa(x,"full_payment",x.totalDueCents):Q==="manual"?$n(x):Q==="start-plan"?xn(x):Q==="cancel-plan"&&Ln(x);return}const M=r.target&&((ie=(N=r.target).closest)==null?void 0:ie.call(N,"[data-mpd-my-program-filter]"));if(M&&O.contains(M)){r.preventDefault(),dn(M);return}const P=r.target&&((X=(Pe=r.target).closest)==null?void 0:X.call(Pe,"[data-mpd-application-action]"));if(P&&O.contains(P)){r.preventDefault();const x=P.getAttribute("data-mpd-application-action")||"",Q=P.getAttribute("data-program-id")||"";x==="view"?pn(Q):x==="update"?window.alert("Material updates are coming soon. For now, contact the Fusion team if your application needs changes."):x==="withdraw"&&window.alert("Application withdrawal is coming soon. Contact the Fusion team if you need to withdraw before this action is available.");return}const w=r.target&&((ne=(C=r.target).closest)==null?void 0:ne.call(C,".mpd-section-save"));if(w&&O.contains(w)){r.preventDefault(),ni(w);return}const v=r.target&&((Ee=(qe=r.target).closest)==null?void 0:Ee.call(qe,"[data-mpd-media-delete]"));if(v&&O.contains(v)){r.preventDefault(),r.stopPropagation(),ri(v.getAttribute("data-mpd-media-delete")||"");return}const T=r.target&&((lt=(it=r.target).closest)==null?void 0:lt.call(it,"[data-mpd-edit-target]"));if(T&&O.contains(T)){r.preventDefault();const x=T.getAttribute("data-mpd-edit-target")||"",Q=document.getElementById(x);if(Q instanceof HTMLTextAreaElement||Q instanceof HTMLInputElement){Q.focus();const Ma=Q.value.length;Q.setSelectionRange(Ma,Ma)}return}const $=r.target;if($&&"id"in $&&$.id==="mpd_apply_residency"){r.preventDefault();const x=$;if(x.dataset.applyOpen==="false"){kn();return}const Q=x.dataset.programPath||Et;Ia(Q.startsWith("/")?Q:`/${Q}`);return}const B=r.target&&((pe=(dt=r.target).closest)==null?void 0:pe.call(dt,"[data-mpd-world-source]"));if(B&&O.contains(B)){if(r.preventDefault(),!t)return;ve=Mt(),oa(t,B.getAttribute("data-mpd-world-source"));return}const k=r.target&&((Te=(oe=r.target).closest)==null?void 0:Te.call(oe,"[data-mpd-status]"));if(k&&O.contains(k)){r.preventDefault(),Xa(k.getAttribute("data-mpd-status"));return}const Y=r.target&&((q=(nt=r.target).closest)==null?void 0:q.call(nt,"[data-mpd-visibility]"));if(Y&&O.contains(Y)){r.preventDefault(),ht(Y.getAttribute("data-mpd-visibility"));return}if($&&"id"in $&&$.id==="mpd_links_add"){const x=si("#mpd-links");x.push({type:"website",url:"",label:""}),Za(x)}}),O.addEventListener("keydown",r=>{var P,w;const o=r.target&&((w=(P=r.target).closest)==null?void 0:w.call(P,"[data-mpd-program-tab]"));if(!o||!O.contains(o))return;const d=r.key;if(!["ArrowLeft","ArrowRight","Home","End"].includes(d))return;const c=Array.from(O.querySelectorAll("[data-mpd-program-tab]")).filter(v=>!v.hasAttribute("hidden")&&v.getAttribute("aria-hidden")!=="true"),u=c.indexOf(o);if(u<0)return;r.preventDefault();let y=u;d==="Home"?y=0:d==="End"?y=c.length-1:d==="ArrowRight"?y=(u+1)%c.length:d==="ArrowLeft"&&(y=(u-1+c.length)%c.length);const M=c[y];M instanceof HTMLElement&&(St(M.getAttribute("data-mpd-program-tab")||"explore"),M.focus())}),O.addEventListener("input",r=>{const o=r.target;o instanceof HTMLInputElement&&o.id==="mpd_public_programs_search"&&ra()}),O.addEventListener("change",async r=>{var c,u,y,M;const o=r.target;if(o instanceof HTMLSelectElement&&o.id==="mpd_public_programs_filter"){ra();return}if(!(o instanceof HTMLInputElement))return;if(o.id==="mpd_hero_file"&&((c=o.files)!=null&&c[0])){if(!Ut(o))return;const P=o.files[0];let w=P;try{w=await Rt(P)}catch(v){A(v instanceof Error?v.message:String(v)),o.value="";return}if(qt("hero",w),!z("hero-upload",{operation:"Main artwork",detail:"Uploading main artwork",message:"Uploading main artwork…",pendingMessage:"Still uploading main artwork..."})){ft("hero"),je("Another upload is in progress. Wait for it to finish, then try again."),o.value="";return}De(!0),Ot("Uploading main artwork...");try{const v=await ut(w,null,{area:"account/profile",entityType:"artist",entityId:m||l||"me",fieldKey:"hero"});I("mpd_hero_url",v),a=v,g+=1,Je("hero"),at(!0),Be(!0),L("hero-upload","saved","Main artwork uploaded. Save to apply this change.")}catch(v){Je("hero"),at(!0),Be(!0),L("hero-upload","error",v instanceof Error?v.message:String(v))}finally{F.has("hero-upload")&&L("hero-upload","idle"),Ht()}o.value="";return}if(o.id==="mpd_hero_profile_file"&&((u=o.files)!=null&&u[0])){if(!Ut(o))return;const P=o.files[0];let w=P;try{w=await Rt(P)}catch(v){A(v instanceof Error?v.message:String(v)),o.value="";return}if(qt("heroProfile",w),!z("hero-profile-upload",{operation:"Profile card",detail:"Uploading profile card",message:"Uploading profile card…",pendingMessage:"Still uploading profile card..."})){ft("heroProfile"),je("Another upload is in progress. Wait for it to finish, then try again."),o.value="";return}Fe(!0),Ot("Uploading profile card...");try{const v=await ut(w,null,{area:"account/profile",entityType:"artist",entityId:m||l||"me",fieldKey:"heroProfile"});I("mpd_hero_profile_url",v),n=v,g+=1,Je("heroProfile"),Be(!0),L("hero-profile-upload","saved","Profile card uploaded. Save to apply this change.")}catch(v){Je("heroProfile"),Be(!0),L("hero-profile-upload","error",v instanceof Error?v.message:String(v))}finally{F.has("hero-profile-upload")&&L("hero-profile-upload","idle"),Ht()}o.value="";return}if(o.id==="mpd_audio_file"&&((y=o.files)!=null&&y[0])){const P=o.files[0];if(!z("audio-upload",{operation:"Audio bite",detail:"Uploading audio bite",message:"Uploading audio bite…",pendingMessage:"Still uploading audio bite..."})){o.value="";return}try{const w=await ut(P,null,{area:"account/profile",entityType:"artist",entityId:m||l||"me",fieldKey:"audio"});I("mpd_audio_url",w),i=w,L("audio-upload","saved","Audio bite uploaded. Save to apply this change.")}catch(w){L("audio-upload","error",w instanceof Error?w.message:String(w))}finally{F.has("audio-upload")&&L("audio-upload","idle")}o.value="";return}const d=o.getAttribute("data-intro-slot");if(d!=null&&((M=o.files)!=null&&M[0])){if(!Ut(o))return;const P=Number(d),w=o.files[0];let v=w;try{v=await Rt(w)}catch(k){A(k instanceof Error?k.message:String(k)),o.value="";return}const T=`intro-${P}`;qt(T,v);const $=`intro-upload-${P}`,B=`Introductory work ${P+1}`;if(!z($,{operation:B,detail:`Uploading ${B.toLowerCase()}`,message:`Uploading ${B.toLowerCase()}…`,pendingMessage:`Still uploading ${B.toLowerCase()}...`})){ft(T),je("Another upload is in progress. Wait for it to finish, then try again."),o.value="";return}me(P,!0),Ot(`Uploading ${B.toLowerCase()}...`);try{const k=await ut(v,null,{area:"account/profile",entityType:"artist",entityId:m||l||"me",fieldKey:`intro-${P}`});I(`mpd_intro_${P}_src`,k),g+=1,Xi(T,k),L($,"saved",`${B} uploaded. Save to apply this change.`)}catch(k){ft(T),L($,"error",k instanceof Error?k.message:String(k))}finally{F.has($)&&L($,"idle"),Ht()}o.value=""}}),O.addEventListener("input",r=>{const o=r.target;(o instanceof HTMLInputElement||o instanceof HTMLTextAreaElement)&&(o.classList.contains("mpd-story-input")&&Zt==="world"&&(ve=Mt()),(o.id==="mpd_first_name"||o.id==="mpd_last_name")&&_t())}),O.addEventListener("change",r=>{const o=r.target;o instanceof HTMLSelectElement&&o.id==="mpd_discipline"&&_t()}));const ze=document.getElementById("mpd_root");if(ze&&!ze.dataset.settingsStudioUi){ze.dataset.settingsStudioUi="1";const r="(max-width: 768px)",o=typeof window.matchMedia=="function"?window.matchMedia(r):null,d=c=>{ze.dataset.navOpen=c?"true":"false";const u=document.getElementById("settingsProfileNavBackdrop");u&&(u.hidden=!c,u.setAttribute("aria-hidden",c?"false":"true"));const y=document.getElementById("settingsProfileMenuBtn");y&&y.setAttribute("aria-expanded",c?"true":"false"),c&&(o!=null&&o.matches)?document.body.style.overflow="hidden":document.body.style.overflow=""};(fa=document.getElementById("settingsProfileMenuBtn"))==null||fa.addEventListener("click",()=>{const c=ze.dataset.navOpen!=="true";d(c)}),(ga=document.getElementById("settingsProfileNavBackdrop"))==null||ga.addEventListener("click",()=>d(!1)),o==null||o.addEventListener("change",c=>{c.matches||d(!1)}),window.addEventListener("keydown",c=>{c.key==="Escape"&&ze.dataset.navOpen==="true"&&d(!1)}),(ya=document.getElementById("settingsProfileWordmark"))==null||ya.addEventListener("click",c=>{c.preventDefault(),Ia("/")})}const Tt=document.getElementById("settingsProfileNavContact");Tt&&Tt.dataset.mpdContactWired!=="1"&&(Tt.dataset.mpdContactWired="1",(ha=document.getElementById("settingsProfileNavContactSend"))==null||ha.addEventListener("click",async()=>{const r=document.getElementById("settingsProfileNavContactMessage"),o=document.getElementById("settingsProfileNavContactEmail"),d=document.getElementById("settingsProfileNavContactStatus"),c=String((r==null?void 0:r.value)||"").trim();if(!c){d&&(d.textContent="Enter a message.");return}let u=await Ra();if(!$e(u)&&o instanceof HTMLInputElement&&(u=String(o.value||"").trim()),!$e(u)){Gt(""),d&&(d.textContent="Add your email address so we can reply, then send again."),o==null||o.focus();return}d&&(d.textContent="Sending…");try{const{sendEmail:y}=await _e(()=>import("./index-20317f29.js").then(W=>W.f0),["assets/index-20317f29.js","assets/index-06c7870c.css"]),{DEFAULT_APPLICATION_STAFF_EMAIL:M}=await _e(()=>import("./index-20317f29.js").then(W=>W.e$),["assets/index-20317f29.js","assets/index-06c7870c.css"]),P=await Ne(),w=D("mpd_first_name").trim(),v=D("mpd_last_name").trim();let T=[w,v].filter(Boolean).join(" ").trim();if(!T&&t){const W=Ue(t,"en");T=String(W.name??"").trim()}if(P.authenticated&&$e(u)){let W=!1;try{const G=await Ua();W=$e(G==null?void 0:G.email)}catch{}if(!W&&!await li({firstName:w,lastName:v,email:u}))throw new Error("Could not save your email to your profile. Try again or refresh the page.");Re=u,Gt(u)}const $=P.authenticated&&P.principal?P.principal.toText():"n/a",B=$.length>6?$.slice(-6):$,k=typeof window<"u"?window.location.origin:"",Y=l||"",j=Y&&k?`${k}/profile/${encodeURIComponent(Y)}`:"n/a",ee=[`Name: ${T||"n/a"}`,`Email: ${u}`,`Principal: ${$}`,`Profile: ${j}`,""].join(`
`),U=T?T.slice(0,48):`…${B}`;await y({to:M,subject:`[Fusion Profile settings] Message — ${U}`,text:`${ee}${c}`}),d&&(d.textContent="Sent. We will get back to you soon."),r&&(r.value="")}catch(y){d&&(d.textContent=y instanceof Error?y.message:String(y))}}));const ke=async(r={})=>{var H,te;if(r.force!==!0&&K())return;A(""),S(!0),jt(!1);const o=document.getElementById("settingsProfileMembershipActions");Se(!1),o&&(o.style.display="none",o.setAttribute("hidden",""));const d=await Ne(),c=He()==="test",u=document.getElementById("settingsTestPicker"),y=document.getElementById("settingsTestArtistSelect");if(c&&u&&y){u.style.display="",y.replaceChildren();const N=document.createElement("option");N.value="",N.textContent="— Select artist —",y.appendChild(N);const ie=await ci();for(const X of ie){const C=document.createElement("option");C.value=String(X.id),C.textContent=`${((te=(H=X.locales)==null?void 0:H.en)==null?void 0:te.name)||X.slug||X.id} (${X.slug})`,y.appendChild(C)}const Pe=$a();Pe&&(y.value=Pe),y.onchange=()=>{mi(y.value||null),ke({force:!0})}}else u&&(u.style.display="none");const M=await pt(),P=await ui(M),w=Qi(P),v=document.getElementById("settingsProfileHeading"),T=document.getElementById("settingsProfileSidebarRole"),$=document.getElementById("settingsProfileAvatar");if(v&&(v.textContent=w),T&&(T.textContent=Da(P)),$){const N=Da(P);$.textContent=N?N.charAt(0).toUpperCase():"U"}const B=document.getElementById("settingsProfileHint");if(!c&&!d.authenticated){B&&(B.textContent="Sign in with Internet Identity to edit your profile."),_&&_.setAttribute("hidden",""),S(!1),Oe(w);return}c&&!$a()&&(A("Creating a local profile for this session…"),await ot(),A(""));let k=!1,Y="";if(!c&&d.authenticated){const N=fi(),ie=N!=="admin"&&N!=="staff";ie?k=!0:k=await gi()&&ie}if(!c&&d.authenticated)try{la=await yi()}catch{la=""}if(!c&&d.authenticated&&!k){const N=await ot();if(N==="noAccount"&&!M){B&&(B.textContent="No member account found. You are signed in, so complete your profile setup, then return to this page."),_&&_.setAttribute("hidden",""),S(!1),Oe(w);return}if(N==="needsSubscription"&&!await Ke()){B&&(B.textContent="Your account does not show an active membership yet. If you already paid, finish linking your payment to this Internet Identity login (Join), or refresh status from Stripe."),o&&(o.style.display="flex",o.removeAttribute("hidden")),_&&_.setAttribute("hidden",""),S(!1),Oe(w);return}}let j=await Ke();if(!j&&k&&!c){try{Y=await ot()}catch{Y=""}j=await Ke()}if(!j){if(k){if(B&&(B.textContent="Admin perspective preview could not find a linked artist profile. Use Admin preview bypass to load editable fields for perspective testing."),o&&(o.style.display="flex",o.removeAttribute("hidden")),Se(Y==="needsSubscription"||Y==="noAccount"||Y===""),s){fe(),A("Admin preview bypass active. Fields are loaded without account/membership gating."),Oe(w),S(!1);return}_&&_.setAttribute("hidden",""),S(!1),Oe(w);return}B&&(B.textContent="Your profile could not be loaded. Try refreshing the page. If you just subscribed, wait a moment and try again, or sign out and back in."),_&&_.setAttribute("hidden",""),S(!1),Oe(w);return}const U=j.profile&&typeof j.profile=="object"?j.profile:{};l=String(U.slug??"");const W=Ta(j);try{t=W?JSON.parse(W):{en:{},ja:{}}}catch{t={en:{},ja:{}}}(!t||typeof t!="object")&&(t={en:{},ja:{}});const G=qa();if(G.fullName||G.email){const N=String(G.fullName||"").trim().split(/\s+/).filter(Boolean),ie=N[0]||"",Pe=N.slice(1).join(" ");for(const X of["en","ja"]){const C=Ue(t,X),ne=String(C.firstName??"").trim(),qe=String(C.lastName??"").trim();!ne&&ie&&(C.firstName=ie),!qe&&Pe&&(C.lastName=Pe),!String(C.name??"").trim()&&(C.firstName||C.lastName)&&(C.name=`${String(C.firstName||"").trim()} ${String(C.lastName||"").trim()}`.trim()),t[X]=C}}ln(t,j.applied_json??j.appliedJson),a=String(U.image??"");{const N=U.heroProfileImage??U.hero_profile_image;n=(()=>Array.isArray(N)?String(da(N)??"").trim():String(N??"").trim())()}m=String(U.id??""),ea=m,ta=l,jt(!!(m||l)||He()==="test"),i=String(U.audioUrl??""),I("mpd_hero_url",a),I("mpd_hero_profile_url",n),I("mpd_audio_url",i),I("mpd_audio_title",String(U.audioTitle??"")),at(),Be(),rt=Xe(U.visibility),ht(rt);const le=document.getElementById("mpd_view_profile");le&&le instanceof HTMLAnchorElement&&(le.href=`/profile/${encodeURIComponent(l)}`);const de=document.getElementById("mpd_sidebar_slug");de&&(de.textContent=l?`/${l}`:"—"),S(!1),_&&_.removeAttribute("hidden");const J=document.getElementById("mpd_datasource_pill");J&&c?(J.style.display="",J.textContent="Data: test JSON (localStorage overlays)"):J&&(J.style.display="none"),Jt(on(t),e),String((ve==null?void 0:ve.quote)??"").trim()||(ve={...ve||{},quote:String(U.quote??"")},Zt==="world"&&I("mpd_w_quote",String(U.quote??""))),Ye(),jn(j),St("explore"),Un(),Wn(),he(se()),Ra().then(N=>{Gt(N)}),Oe(w)};window.addEventListener("hashchange",()=>{he(se())}),(ba=document.getElementById("settingsProfileFinishMembership"))==null||ba.addEventListener("click",()=>{window.dispatchEvent(new CustomEvent("fusion-open-join-network",{detail:{}}))}),bt&&window.removeEventListener("fusion-settings-profile-save-choice",bt),bt=r=>{const o=r instanceof CustomEvent&&Bn(r.detail)?r.detail:{},d=String(o.action||""),c=kt;kt=void 0,d==="save"&&oi(c,{translate:o.translate!==!1})},window.addEventListener("fusion-settings-profile-save-choice",bt),(va=document.getElementById("settingsProfileSyncSubscription"))==null||va.addEventListener("click",async()=>{const r=await Ne();if(r.authenticated&&z("membership-sync",{operation:"Membership",detail:"Refreshing subscription",message:"Refreshing subscription status…",pendingMessage:"Still refreshing subscription status..."})){try{const o=await _e(()=>import("./index-20317f29.js").then(y=>y.f0),["assets/index-20317f29.js","assets/index-06c7870c.css"]),d=await pt(),c=String((d==null?void 0:d.paypalSubscriptionId)||"").trim(),u=String((d==null?void 0:d.paymentProvider)||"").toLowerCase();c||u==="paypal"?await o.syncPayPalSubscription({principal:r.principal.toText(),subscriptionId:c}):await o.syncSubscriptionFromStripe(r.principal.toText()),await ot(),ct.capture("membership_subscription_sync_succeeded",{context:"settings_profile"}),L("membership-sync","saved","Subscription refreshed. Loading profile…")}catch(o){L("membership-sync","error",o instanceof Error?o.message:String(o));return}ke({force:!0})}}),(_a=document.getElementById("settingsProfileAdminBypass"))==null||_a.addEventListener("click",()=>{s=!0,A("Admin preview bypass enabled. Loading fields…"),ke({force:!0})});const Nt=async()=>{var o;const r=await Ne();if(r.authenticated&&z("billing-portal",{operation:"Billing",detail:"Opening billing portal",message:"Opening billing portal…",pendingMessage:"Still opening billing portal..."}))try{const{createBillingPortalSession:d}=await _e(()=>import("./index-20317f29.js").then(y=>y.f0),["assets/index-20317f29.js","assets/index-06c7870c.css"]),c=typeof window<"u"&&((o=window.location)!=null&&o.href)?window.location.href:"https://fusionart.world/settings/profile",{url:u}=await d(r.principal.toText(),c);ct.capture("membership_billing_portal_opened",{context:"settings_profile"}),L("billing-portal","saved","Opening billing portal…"),window.location.assign(u)}catch(d){L("billing-portal","error",d instanceof Error?d.message:String(d))}finally{F.has("billing-portal")&&L("billing-portal","idle")}};(wa=document.getElementById("mpd_membership_row_billing"))==null||wa.addEventListener("click",()=>{Nt()}),(Sa=document.getElementById("mpd_membership_row_payment"))==null||Sa.addEventListener("click",()=>{Nt()}),(Pa=document.getElementById("mpd_membership_pm_update"))==null||Pa.addEventListener("click",()=>{Nt()}),(Ea=document.getElementById("mpd_membership_cancel_btn"))==null||Ea.addEventListener("click",()=>{Tn()}),(Aa=document.getElementById("mpdMembershipCancelStay"))==null||Aa.addEventListener("click",()=>{Bt()}),(Ca=document.getElementById("mpdMembershipCancelContinue"))==null||Ca.addEventListener("click",async()=>{const r=await Ne();if(r.authenticated&&(Bt(),!!z("membership-cancel",{operation:"Membership",detail:"Scheduling cancellation",message:"Scheduling cancellation…",pendingMessage:"Still scheduling cancellation..."})))try{const{cancelSubscriptionAtPeriodEnd:o,cancelPayPalSubscriptionAtPeriodEnd:d,syncSubscriptionFromStripe:c,syncPayPalSubscription:u}=await _e(()=>import("./index-20317f29.js").then(w=>w.f0),["assets/index-20317f29.js","assets/index-06c7870c.css"]),y=await pt(),M=String((y==null?void 0:y.paypalSubscriptionId)||"").trim(),P=String((y==null?void 0:y.paymentProvider)||"").toLowerCase();if(M||P==="paypal"){if(!M)throw new Error("No PayPal subscription linked.");await d(M),await u({principal:r.principal.toText(),subscriptionId:M})}else await o(r.principal.toText()),await c(r.principal.toText());ct.capture("membership_cancel_scheduled",{context:"settings_profile"}),await Ie(),L("membership-cancel","saved","Cancellation scheduled for the end of your billing period.")}catch(o){L("membership-cancel","error",o instanceof Error?o.message:String(o))}finally{F.has("membership-cancel")&&L("membership-cancel","idle")}});const ua=r=>{Le()&&(r.preventDefault(),r.returnValue="")};Kt&&window.removeEventListener("beforeunload",Kt),Kt=ua,window.addEventListener("beforeunload",ua),ke({force:!0}),window.addEventListener("fusion-auth-change",()=>void ke()),window.addEventListener("fusion-admin-perspective-change",()=>void ke()),window.addEventListener("fusion-data-source-change",()=>void ke()),document.addEventListener("visibilitychange",()=>{document.visibilityState==="visible"&&ke()})}export{Yi as MPD_MAX_IMAGE_BYTES,Vn as default,Hn as generateSettingsProfileContent};
