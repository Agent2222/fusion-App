import{v as N,aa as L,q as x,l as P,a4 as H,a1 as T}from"./index-9466438f.js";import{s as B}from"./joinCollageRotate-5239e0b7.js";const A=["Artist","Gallery","Curator","Collector"];function t(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function F(e){const n=String(e??"");return n?n.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/&lt;(\/?(?:strong|em|b|i))&gt;/gi,"<$1>"):""}function I(){try{if(typeof window.getLocale=="function"&&window.getLocale()==="ja")return"ja"}catch{}return"en"}function J(e,n){const a=e&&typeof e=="object"?e:{},u=a[n]&&typeof a[n]=="object"?a[n]:null;return{...a.en&&typeof a.en=="object"?a.en:{},...u||{}}}function R(e){const n=String(e||"").toLowerCase();return n==="people"?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="9" cy="8" r="2.4"/><circle cx="16" cy="9" r="2"/><path d="M4.5 18c.6-2.4 2.4-3.6 4.5-3.6s3.9 1.2 4.5 3.6"/><path d="M13.2 18c.35-1.55 1.4-2.45 2.8-2.45 1.2 0 2.15.7 2.55 1.9"/></svg>':n==="doc"?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M8 3.5h6.2L18.5 8v12.5H8z"/><path d="M14.2 3.5V8H18.5"/><path d="M10.5 12h5M10.5 15.5h5"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 8.5h16M5.5 8.5V18M18.5 8.5V18M4 5.5h16M8.5 5.5v3M15.5 5.5v3"/></svg>'}function M(e,n){const a=n==="quarterly"?"planQuarterly":n==="annual"?"planAnnual":"planMonthly",u=e[a]&&typeof e[a]=="object"?e[a]:{},g=Array.isArray(u.includedBullets)?u.includedBullets.map(_=>String(_??"").trim()).filter(Boolean):[];return g.length?g:(Array.isArray(e.includes)?e.includes:[]).map(_=>String(_??"").trim()).filter(Boolean)}function C(e){return e.map(n=>`<li>${t(n)}</li>`).join("")}function O(e,n,a){const u=e.querySelector("#jnpIncludes");u instanceof HTMLElement&&(u.innerHTML=C(M(n,a)))}function q(e,n){const a=Array.isArray(e.roles)&&e.roles.length?e.roles:A,u=Array.isArray(e.collage)?e.collage:[],g=[0,1,2].map(d=>{const h=u[d]||{};return`<img data-jnp-collage="${d}" src="${t(h.src||"")}" alt="${t(h.alt||"")}" loading="lazy" decoding="async" />`}).join(""),_=C(M(e,"monthly")),o=(Array.isArray(e.proof)?e.proof:[]).map((d,h)=>{const v=["japan","people","doc"],i=d.icon||v[h]||"japan",c=d.line?`<span>${t(d.line)}</span>`:"<span></span>";return`
            <div class="join-network-page__proof-item">
                <span class="join-network-page__proof-icon">${R(i)}</span>
                <div>
                  <strong>${t(d.title)}</strong>
                  ${c}
                </div>
            </div>`}).join(""),r=e.planMonthly||{},p=e.planQuarterly||{},s=e.planAnnual||{},l=e.paymentFooterHtml?F(e.paymentFooterHtml):t(e.paymentFooter||"Secure payment by PayPal or card · Cancel anytime"),j=r.badge?`<span class="join-network-page__plan-badge">${t(r.badge)}</span>`:"",f=s.badge?`<span class="join-network-page__plan-badge join-network-page__plan-badge--save">${t(s.badge)}</span>`:"";return`
    <div class="join-network-page page-content" id="joinNetworkPageRoot" data-locale="${t(n)}">
      <div class="join-network-page__main">
        <section class="join-network-page__story" aria-label="Why join">
          <h1 class="join-network-page__story-headline">${t(e.storyHeadline)}</h1>
          <p class="join-network-page__story-sub">${t(e.storySubheadline)}</p>
          <p class="join-network-page__story-sec">${t(e.storySecondary)}</p>
          <div class="join-network-page__media">
            <div class="join-network-page__collage">${g}</div>
            <div class="join-network-page__audio" id="jnpAudioMount" hidden></div>
          </div>
        </section>
        <section class="join-network-page__form-card" aria-label="Join FUSION">
          <h2 class="join-network-page__form-title">${t(e.formTitle)}</h2>
          <p class="join-network-page__form-sub">${t(e.formSubtitle)}</p>
          <span class="join-network-page__label">${t(e.roleLabel||"I am a")}</span>
          <div class="join-network-page__roles" id="jnpRoles" role="group">
            ${a.map((d,h)=>`
              <button type="button" class="join-network-page__role${h===0?" is-active":""}" data-jnp-role="${t(A[h]||d)}" aria-pressed="${h===0?"true":"false"}">${t(d)}</button>`).join("")}
          </div>
          <div class="join-network-page__fields">
            <input type="text" id="jnpFirstName" name="firstName" autocomplete="given-name" placeholder="${t(e.firstNamePlaceholder||"First name")}" />
            <input type="text" id="jnpLastName" name="lastName" autocomplete="family-name" placeholder="${t(e.lastNamePlaceholder||"Last name")}" />
            <input class="join-network-page__field--full" type="email" id="jnpEmail" name="email" autocomplete="email" placeholder="${t(e.emailPlaceholder||"Email")}" />
            <div class="join-network-page__field--full join-network-page__access">
              <button type="button" class="join-network-page__access-toggle" id="jnpAccessToggle" aria-expanded="false" aria-controls="jnpAccessPanel">
                ${t(e.accessCodePrompt||"Have an access code?")}
              </button>
              <div class="join-network-page__access-panel" id="jnpAccessPanel" hidden>
                <label class="join-network-page__label" for="jnpAccessCode">${t(e.accessCodeLabel||"Access code (optional)")}</label>
                <input type="text" id="jnpAccessCode" name="accessCode" inputmode="numeric" maxlength="8" placeholder="${t(e.accessCodePlaceholder||"8-digit code")}" autocomplete="one-time-code" />
              </div>
            </div>
          </div>
          <span class="join-network-page__label">${t(e.planGroupLabel||"Choose your membership")}</span>
          <div class="join-network-page__plans" id="jnpPlans" role="radiogroup" aria-label="${t(e.planGroupLabel||"Choose your membership")}">
            <button type="button" class="join-network-page__plan is-active" data-jnp-plan="monthly" role="radio" aria-checked="true" aria-pressed="true">
              <span class="join-network-page__plan-radio" aria-hidden="true"></span>
              <span class="join-network-page__plan-body">
                ${j}
                <p class="join-network-page__plan-title">${t(r.title||"Monthly")}</p>
                <p class="join-network-page__plan-price">${t(r.displayPrice||"$30")} ${t(r.every||"per month")}</p>
                <p class="join-network-page__plan-sub">${t(r.subtext||"")}</p>
              </span>
            </button>
            <button type="button" class="join-network-page__plan" data-jnp-plan="quarterly" role="radio" aria-checked="false" aria-pressed="false">
              <span class="join-network-page__plan-radio" aria-hidden="true"></span>
              <span class="join-network-page__plan-body">
                <p class="join-network-page__plan-title">${t(p.title||"Quarterly")}</p>
                <p class="join-network-page__plan-price">${t(p.displayPrice||"$75")} ${t(p.every||"per quarter")}</p>
                <p class="join-network-page__plan-sub">${t(p.subtext||"")}</p>
              </span>
            </button>
            <button type="button" class="join-network-page__plan" data-jnp-plan="annual" role="radio" aria-checked="false" aria-pressed="false">
              <span class="join-network-page__plan-radio" aria-hidden="true"></span>
              <span class="join-network-page__plan-body">
                <p class="join-network-page__plan-title">${t(s.title||"Annual")}</p>
                <p class="join-network-page__plan-price">${t(s.displayPrice||"$260")} ${t(s.every||"per year")}</p>
                ${f}
                <p class="join-network-page__plan-sub">${t(s.subtext||"")}</p>
              </span>
            </button>
          </div>
          <ul class="join-network-page__includes" id="jnpIncludes" aria-label="${t(e.includesTitle||"Includes")}">${_}</ul>
          <button type="button" class="join-network-page__cta" id="jnpCheckout">${t(e.ctaLabel||"Continue to secure checkout")}</button>
          <p class="join-network-page__pay-foot">${l}</p>
          <p class="join-network-page__err" id="jnpErr" role="alert"></p>
        </section>
      </div>
      <section class="join-network-page__proof" aria-label="Membership highlights">${o}</section>
      <div class="join-network-page__bridge" aria-hidden="true">
        <app-join-network data-modal-type="membership" data-header-bridge="true" context="join-network" active="true"></app-join-network>
      </div>
    </div>
  `}function $(){document.documentElement.setAttribute("data-fusion-page","join-network"),document.querySelectorAll("app-sound-environment").forEach(n=>{n instanceof HTMLElement&&(n.setAttribute("hidden",""),typeof n.setMasterEnabled=="function"&&n.setMasterEnabled(!1))});const e=document.getElementById("fusionSoundEnvHost");e instanceof HTMLElement&&(e.setAttribute("hidden",""),e.style.display="none")}async function D(e,n){var u,g;const a=e.querySelector("#jnpAudioMount");if(a instanceof HTMLElement)try{const _=n||await P(),o=(Array.isArray(_)?_:[]).filter(j=>H(j));if(!o.length){a.hidden=!0,a.innerHTML="";return}const r=o[Math.floor(Math.random()*o.length)],p=T(r),s=String((r==null?void 0:r.slug)??"").trim(),l=document.createElement("app-audio-row");if(l.setAttribute("active","true"),l.setAttribute("data-layout","join-network"),s&&l.setAttribute("data-artist-href",`/profile/${s}`),p.length>1)l.setAttribute("data-audio-sources",JSON.stringify(p));else if(p.length===1)l.setAttribute("data-audio-src",p[0].url),l.setAttribute("data-audio-title",p[0].title||"Artist audio");else{const j=String(r.audioUrl??"").trim();if(!j){a.hidden=!0;return}const f=String(r.audioTitle??"").trim()||String(((g=(u=r==null?void 0:r.locales)==null?void 0:u.en)==null?void 0:g.name)??"").trim()||"Artist audio";l.setAttribute("data-audio-src",j),l.setAttribute("data-audio-title",f)}a.hidden=!1,a.replaceChildren(l)}catch{a.hidden=!0,a.innerHTML=""}}function G(){return q({},"en")}async function Q(){var h,v;$();const e=I();let n={};try{n=await N("join-network-page",{forStudio:!1})}catch{try{const{testData:i}=await L(()=>import("./index-9466438f.js").then(c=>c.gi),["assets/index-9466438f.js","assets/index-dcd04e76.css"]);n=i.joinNetworkPage||{}}catch{n={}}}const a=n&&typeof n=="object"?n.en:null;if(!(a&&typeof a=="object"&&!Array.isArray(a)&&String(a.storyHeadline||"").trim()))try{const{testData:i}=await L(()=>import("./index-9466438f.js").then(c=>c.gi),["assets/index-9466438f.js","assets/index-dcd04e76.css"]);i.joinNetworkPage&&(n=i.joinNetworkPage)}catch{}const g=J(n,e);x({title:g.seoTitle||"Join FUSION | Membership",description:g.seoDescription||"Join a curated network connecting artists, galleries, curators, and collectors through programs rooted in Japan.",robots:"",homeOrganizationJsonLd:!1});const _=document.getElementById("mainContent");_&&(_.innerHTML=q(g,e));const o=document.getElementById("joinNetworkPageRoot");if(!o)return;$(),requestAnimationFrame($),(async()=>{let i=[];try{i=await P()}catch{i=[]}B(o,{attrName:"data-jnp-collage",artistsPrefetch:i,intervalMs:1e4}),await D(o,i)})();let r=A[0],p="monthly";(h=o.querySelector("#jnpRoles"))==null||h.addEventListener("click",i=>{var m,b;const c=(b=(m=i.target)==null?void 0:m.closest)==null?void 0:b.call(m,"[data-jnp-role]");c instanceof HTMLButtonElement&&(r=c.getAttribute("data-jnp-role")||A[0],o.querySelectorAll("[data-jnp-role]").forEach(y=>{const w=y===c;y.classList.toggle("is-active",w),y.setAttribute("aria-pressed",w?"true":"false")}))}),(v=o.querySelector("#jnpPlans"))==null||v.addEventListener("click",i=>{var b,y;const c=(y=(b=i.target)==null?void 0:b.closest)==null?void 0:y.call(b,"[data-jnp-plan]");if(!(c instanceof HTMLButtonElement))return;const m=c.getAttribute("data-jnp-plan");m!=="monthly"&&m!=="quarterly"&&m!=="annual"||(p=m,o.querySelectorAll("[data-jnp-plan]").forEach(w=>{const k=w===c;w.classList.toggle("is-active",k),w.setAttribute("aria-pressed",k?"true":"false"),w.setAttribute("aria-checked",k?"true":"false")}),O(o,g,p))});const s=o.querySelector("#jnpAccessToggle"),l=o.querySelector("#jnpAccessPanel"),j=o.querySelector("#jnpAccessCode");s==null||s.addEventListener("click",()=>{if(!l||!s)return;l.hasAttribute("hidden")?(l.removeAttribute("hidden"),s.setAttribute("aria-expanded","true"),s.classList.add("is-open"),j==null||j.focus()):(l.setAttribute("hidden",""),s.setAttribute("aria-expanded","false"),s.classList.remove("is-open"),j&&(j.value=""))});const f=o.querySelector("#jnpErr"),d=o.querySelector("#jnpCheckout");d==null||d.addEventListener("click",()=>{var w,k,S,E;f&&(f.textContent="");const i=String(((w=o.querySelector("#jnpFirstName"))==null?void 0:w.value)||"").trim(),c=String(((k=o.querySelector("#jnpLastName"))==null?void 0:k.value)||"").trim(),m=String(((S=o.querySelector("#jnpEmail"))==null?void 0:S.value)||"").trim(),b=String(((E=o.querySelector("#jnpAccessCode"))==null?void 0:E.value)||"").replace(/\D/g,"").slice(0,8);if(!r){f&&(f.textContent=e==="ja"?"役割を選択してください。":"Please select a role.");return}if(!i||!c){f&&(f.textContent=e==="ja"?"姓名を入力してください。":"Please enter your first and last name.");return}if(!m||!m.includes("@")){f&&(f.textContent=e==="ja"?"有効なメールを入力してください。":"Please enter a valid email.");return}const y=b.length===8;window.dispatchEvent(new CustomEvent("fusion-open-join-network",{detail:{firstName:i,lastName:c,email:m,accessCode:y?b:"",category:r,subscriptionTier:p,stage:y?"linkAccount":"payment",fromJoinNetworkPage:!0}}))})}export{Q as default,G as generateJoinNetworkPageContent};
