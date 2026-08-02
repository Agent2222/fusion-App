import{aF as In,aG as Ut,aH as Mn,aI as Ii,E as $n,aJ as kn,aK as Ln,a5 as xe,aL as Tn,aM as xn,ad as Bn,aN as Nn,aO as $a,N as Je,al as Ge,aP as qi,aQ as jn,aR as $t,aS as kt,L as Lt,aT as st,aU as nt,aV as Fn,aW as Wa,aX as Un,aY as ht,F as _t,aZ as Rn,a_ as Dn,a$ as si,ak as Va,b0 as On,b1 as Hn,b2 as qn,l as Wn,b3 as ka,b4 as Vn,b5 as Jn,b6 as Yn,b7 as La,b8 as Gn,O as Tt,b9 as aa,ba as zn,bb as Qn,q as Kn,bc as Xn,aq as Zn,bd as eo,at as Ja,v as Wi,be as to,bf as io,bg as Ya,bh as na,bi as ao,o as de,bj as no,bk as oo,bl as ro,bm as Ga,bn as so,bo as za,am as lo,bp as po,bq as co,br as mo,bs as uo,bt as fo,bu as go,bv as Ta,bw as Jt,bx as yo,by as ho,bz as bo,bA as vo}from"./index-29c64bdd.js";import{u as Nt,p as _o,s as Vi,f as wo,a as oa,c as Ji,P as So,i as Qa,r as Po,b as Eo}from"./studioDateFormat-9eae5dfe.js";import{s as Ao}from"./joinCollageRotate-8b2c036a.js";const Co=3*60*1e3,Io=200;function Mo(e){const t=Math.max(0,Math.floor(e/1e3)),i=Math.floor(t/60),a=t%60;return`${i}:${String(a).padStart(2,"0")}`}function $o(){const e=["audio/webm;codecs=opus","audio/webm","audio/mp4","audio/ogg;codecs=opus"];return typeof MediaRecorder>"u"||typeof MediaRecorder.isTypeSupported!="function"?"":e.find(t=>MediaRecorder.isTypeSupported(t))||""}function ko(e){const t=e.querySelector("#mpdAcPermHelp");if(!t)return;const i=/^((?!chrome|android).)*safari/i.test(navigator.userAgent);t.hidden=!1,t.innerHTML=`
    <p><strong>Microphone access was denied.</strong></p>
    <p>To fix this:</p>
    <ol>
      <li>Click the <strong>${i?"address bar site settings":"lock / site settings icon"}</strong> in your browser's address bar</li>
      <li>Find <strong>Microphone</strong> and change it to <strong>Allow</strong></li>
      <li><strong>Refresh the page</strong> and try recording again</li>
    </ol>
    ${i?"<p>On Safari: go to <strong>Safari &gt; Settings &gt; Websites &gt; Microphone</strong> and set this site to <strong>Allow</strong>.</p>":""}
    <p class="mpd-audio-capture-modal__help-note">If you previously denied access, you may need to reset the site permission before the browser will ask again.</p>
  `}function Lo(e={}){var Ie;const t=document.getElementById("mpdAudioCaptureModal");t&&t.remove();const i=$o(),a=document.createElement("div");a.id="mpdAudioCaptureModal",a.className="mpd-audio-capture-modal",a.setAttribute("role","dialog"),a.setAttribute("aria-modal","true"),a.setAttribute("aria-labelledby","mpdAudioCaptureTitle"),a.innerHTML=`
    <div class="mpd-audio-capture-modal__scrim" data-mpd-ac-close></div>
    <div class="mpd-audio-capture-modal__panel">
      <header class="mpd-audio-capture-modal__head">
        <h2 id="mpdAudioCaptureTitle">Your voice, your art</h2>
        <button type="button" class="mpd-audio-capture-modal__x" data-mpd-ac-close aria-label="Close">&times;</button>
      </header>
      <p class="mpd-audio-capture-modal__lead"><em>"Words mean more than what is set down on paper. It takes the human voice to infuse them with deeper meaning."</em> — Maya Angelou<br><br>Record up to 3 minutes. Your audio bite will live in the sound environment, your profile, and journal — once approved by Fusion staff.</p>
      <div class="mpd-audio-capture-modal__meter" aria-hidden="true">
        <span class="mpd-audio-capture-modal__meter-bar" id="mpdAcMeter"></span>
      </div>
      <div class="mpd-audio-capture-modal__time" id="mpdAcTime">0:00 / 3:00</div>
      <div class="mpd-audio-capture-modal__status" id="mpdAcStatus" role="status"></div>
      <audio id="mpdAcPreview" class="mpd-audio-capture-modal__preview" controls hidden></audio>
      <div id="mpdAcPermHelp" class="mpd-audio-capture-modal__help" hidden></div>
      <div class="mpd-audio-capture-modal__actions">
        <button type="button" class="mpd-upload-btn mpd-audio-record-btn" id="mpdAcRecord">Start recording</button>
        <button type="button" class="mpd-membership-cancel-outline" id="mpdAcStop" hidden>Stop</button>
        <button type="button" class="mpd-upload-btn" id="mpdAcUse" hidden>Use recording</button>
        <button type="button" class="profile-gallery-access-modal__close" data-mpd-ac-close>Cancel</button>
      </div>
    </div>
  `,document.body.appendChild(a);let n=null,s=null,l=[],p=null,m=0,g=null,u=null,f=null,b=null;const j=a.querySelector("#mpdAcTime"),_=a.querySelector("#mpdAcStatus"),S=a.querySelector("#mpdAcPreview"),I=a.querySelector("#mpdAcMeter"),$=a.querySelector("#mpdAcRecord"),Z=a.querySelector("#mpdAcStop"),R=a.querySelector("#mpdAcUse"),L=Q=>{_&&(_.textContent=Q||"")},H=()=>{g&&(clearInterval(g),g=null),b!=null&&(cancelAnimationFrame(b),b=null),u&&(u=null),f&&(f.close().catch(()=>{}),f=null),n&&(n.getTracks().forEach(Q=>Q.stop()),n=null),s=null},me=()=>{H(),S!=null&&S.src&&URL.revokeObjectURL(S.src),a.remove()},re=Q=>{j&&(j.textContent=`${Mo(Q)} / 3:00`)},pe=()=>{if(!u||!I)return;const Q=new Uint8Array(u.frequencyBinCount);u.getByteFrequencyData(Q);let P=0;for(let te=0;te<Q.length;te++)P+=Q[te];const K=P/Math.max(1,Q.length),G=Math.min(100,Math.round(K/180*100));I.style.width=`${Math.max(6,G)}%`,b=requestAnimationFrame(pe)},ee=()=>{if(!(!s||s.state==="inactive"))try{s.stop()}catch{}},Y=async()=>{p=null,l=[],S&&(S.hidden=!0,S.src&&URL.revokeObjectURL(S.src),S.removeAttribute("src")),R&&(R.hidden=!0),L("Requesting microphone…");try{n=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:!0,noiseSuppression:!0,autoGainControl:!0}})}catch(P){P instanceof Error&&/NotAllowed|Permission/i.test(P.name+P.message)?(L(""),ko(a)):L("Could not access microphone on this device.");return}try{f=new AudioContext;const P=f.createMediaStreamSource(n);u=f.createAnalyser(),u.fftSize=256,P.connect(u),pe()}catch{}const Q=i?{mimeType:i}:void 0;try{s=Q?new MediaRecorder(n,Q):new MediaRecorder(n)}catch{H(),L("Recording is not supported in this browser.");return}s.ondataavailable=P=>{P.data&&P.data.size>0&&l.push(P.data)},s.onstop=()=>{var K;H();const P=i||((K=l[0])==null?void 0:K.type)||"audio/webm";p=new Blob(l,{type:P}),S&&p.size>0&&(S.src=URL.createObjectURL(p),S.hidden=!1),$&&($.hidden=!1,$.textContent="Re-record"),Z&&(Z.hidden=!0),R&&(R.hidden=!1),L("Recording ready. Preview, then use it or re-record."),I&&(I.style.width="0%")},m=Date.now(),re(0),s.start(250),$&&($.hidden=!0),Z&&(Z.hidden=!1),L("Recording…"),g=setInterval(()=>{const P=Date.now()-m;re(P),P>=Co&&(L("Reached 3:00 — stopping."),ee())},Io)},De=async()=>{var Q;if(!p||p.size<1){L("No recording to save.");return}R&&(R.disabled=!0),$&&($.disabled=!0),L("Uploading…");try{const P=p.type.includes("mp4")?"m4a":p.type.includes("ogg")?"ogg":"webm",K=new File([p],`artist-audio-capture.${P}`,{type:p.type||"audio/webm"}),G=await Nt(K,null,{area:"account/profile",entityType:"artist",entityId:String(e.artistId||e.slug||"artist"),fieldKey:"audio"}),te=document.getElementById("mpd_audio_url"),dt=document.getElementById("mpd_audio_title");te&&(te.value=G),dt&&!String(dt.value||"").trim()&&(dt.value="Audio bite");const Oe=document.getElementById("mpd_audio_approval_status");Oe&&(Oe.hidden=!1,Oe.textContent="Pending staff approval",Oe.classList.remove("is-approved"),Oe.classList.add("is-pending")),(Q=e.onCaptured)==null||Q.call(e,{url:G,blob:p,durationMs:Date.now()-m}),L("Uploaded. Save your Media Library to keep this clip. Staff approval is required for public playback."),setTimeout(me,700)}catch(P){L(`Upload failed: ${P instanceof Error?P.message:String(P)}`),R&&(R.disabled=!1),$&&($.disabled=!1)}};a.addEventListener("click",Q=>{Q.target.closest("[data-mpd-ac-close]")&&(Q.preventDefault(),me())}),$==null||$.addEventListener("click",()=>void Y()),Z==null||Z.addEventListener("click",()=>ee()),R==null||R.addEventListener("click",()=>void De()),(typeof MediaRecorder>"u"||!((Ie=navigator.mediaDevices)!=null&&Ie.getUserMedia))&&(L("Audio recording is not available in this browser."),$&&($.disabled=!0))}const Yi="fusion-mpd-application-only-display";function xa(){try{return sessionStorage.getItem(Yi)==="1"}catch{return!1}}function To(e){try{e?sessionStorage.setItem(Yi,"1"):sessionStorage.removeItem(Yi)}catch{}}function Ka(e){try{const t=typeof e=="string"?JSON.parse(e):e&&typeof e=="object"?e:{};return!t||typeof t!="object"||Array.isArray(t)?{}:t}catch{return{}}}function xo(e){return Object.keys(Ka(e)).filter(Boolean).length}function Bo(e){const t=Ka(e);for(const i of Object.values(t)){if(!i||typeof i!="object")continue;const a=i,n=[a.payload,a.payloadJson,a];for(const s of n){const l=typeof s=="string"?s:s&&typeof s=="object"?JSON.stringify(s):"";if(l&&In(l))return!0}}return!1}function No(e){return e.applicationOnlyDisplay?!0:String(e.membershipGate||"")!=="needsSubscription"?!1:Number(e.applicationCount)>=1}function jo(e){return e.applicationOnlyDisplay?!1:String(e.membershipGate||"")==="needsSubscription"&&Number(e.applicationCount)<1}function Fo(e){return!!(Ut||e.isRealAdmin||e.hasTesterApplication)}function Se(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Uo(e,t){const i=e&&typeof e=="object"?e:{},a=i.value&&typeof i.value=="object"?i.value:i,n=a.en&&typeof a.en=="object"?a.en:{},s=a[t]&&typeof a[t]=="object"?a[t]:{};return{...n,...s}}function Ro(e){const t=e&&typeof e=="object"&&!Array.isArray(e)?e:{},i=t.includedBullets??t.includes;return Array.isArray(i)?i.map(a=>String(a??"").trim()).filter(Boolean):[]}function Do(e){return e==="ja"?{monthly:{title:"月額メンバーシップ",displayPrice:"$30",every:"月額",subtext:"",badge:"フレキシブル",includedBullets:["フルのアーティストプロフィール","FUSION限定コンテンツ","メンバー料金での応募","いつでも解約可能"]},quarterly:{title:"四半期メンバーシップ",displayPrice:"$75",every:"3か月ごと",subtext:"月あたり約 $25 · 17%お得",badge:"おすすめ",includedBullets:["フルのアーティストプロフィール","FUSION限定コンテンツ","四半期ごとに1回のレジデンシー応募クレジット","四半期ごとに1回のプログラム抽選","追加応募は $35"]},annual:{title:"年間メンバーシップ",displayPrice:"$260",every:"年額",subtext:"月あたり約 $21.67 · 28%お得",badge:"お得",includedBullets:["フルのアーティストプロフィール","FUSION限定コンテンツ","レジデンシー応募無制限","年間4回のプログラム抽選","マーケティング機会の拡大"]}}:{monthly:{title:"Monthly Membership",displayPrice:"$30",every:"per month",subtext:"",badge:"Flexible",includedBullets:["Full artist profile","Exclusive FUSION content","Applications available at member rate","Cancel anytime"]},quarterly:{title:"Quarterly Membership",displayPrice:"$75",every:"every 3 months",subtext:"$25/month · Save 17%",badge:"Recommended",includedBullets:["Full artist profile","Exclusive FUSION content","1 residency application credit per quarter","1 Program Draw entry per quarter","Additional applications $35"]},annual:{title:"Annual Membership",displayPrice:"$260",every:"per year",subtext:"$21.67/month · Save 28%",badge:"Best value",includedBullets:["Full artist profile","Exclusive FUSION content","Unlimited residency applications","4 Program Draw entries per year","Increased marketing opportunities"]}}}function Mi(e,t,i,a,n){const s=i&&typeof i=="object"?i:{},l=Ro(i),p=String(s.every??"").trim()||e.subtext2||t.subtext2||n.every,m=l.length>0?l:e.includedBullets.length>0?e.includedBullets:t.includedBullets.length>0?t.includedBullets:a.length>0?a:[...n.includedBullets];return{title:e.title||t.title||n.title,displayPrice:e.displayPrice||t.displayPrice||n.displayPrice,every:p,subtext:e.subtext||t.subtext||n.subtext,subtext2:e.subtext2||t.subtext2||"",includedBullets:m}}function Oo(e,t,i="en"){const a=i==="ja"?"ja":"en",n=Uo(e,a),s=Mn(t,a),l=Ii(n.planMonthly),p=Ii(n.planQuarterly),m=Ii(n.planAnnual),g=Array.isArray(n.includes)?n.includes.map(H=>String(H??"").trim()).filter(Boolean):[],u=Do(a),f=Mi(l,s.monthly,n.planMonthly,g,u.monthly),b=Mi(p,s.quarterly,n.planQuarterly,g,u.quarterly),j=Mi(m,s.annual,n.planAnnual,g,u.annual),_=String(n.planMonthly&&typeof n.planMonthly=="object"?n.planMonthly.badge??"":"").trim(),S=String(n.planQuarterly&&typeof n.planQuarterly=="object"?n.planQuarterly.badge??"":"").trim(),I=String(n.planAnnual&&typeof n.planAnnual=="object"?n.planAnnual.badge??"":"").trim(),$=Array.isArray(n.collage)?n.collage.map(H=>{if(!H||typeof H!="object")return null;const me=String(H.src??"").trim();return me?{src:me,alt:String(H.alt??"").trim()}:null}).filter(Boolean):[],Z=[{src:$n,alt:a==="ja"?"プログラム":"Programs rooted in Japan"},{src:kn,alt:a==="ja"?"スタジオ実践":"Studio practice"},{src:Ln,alt:a==="ja"?"ネットワーク":"Network and place"}],R=[0,1,2].map(H=>$[H]||Z[H]),L=a==="ja"?{eyebrow:"スタジオをアンロック",headline:"あなたの実践は、より広い文脈に属しています。",support:"FUSIONメンバーになると、フルのアーティストプロフィール、限定コンテンツ、日本をルーツにしたプログラムへの参加が開きます。",notice:"メンバーシップがなくても、プログラム応募状況は確認できます。",cta:"安全なチェックアウトへ",foot:"安全なお支払い · いつでも解約可能"}:{eyebrow:"Unlock your studio",headline:"Your practice belongs in a wider context.",support:"Become a FUSION member to open your full artist profile, access exclusive content, and participate in programs rooted in Japan.",notice:"You can continue to access Programs without membership.",cta:"Continue to secure checkout",foot:"Secure payment · Cancel anytime"};return{eyebrow:L.eyebrow,headline:String(n.storyHeadline??"").trim()||L.headline,support:String(n.storySubheadline??"").trim()||L.support,notice:L.notice,ctaLabel:String(n.ctaLabel??"").trim()||L.cta,foot:L.foot,collage:R,plans:{monthly:{...f,badge:_||u.monthly.badge,tier:"monthly"},quarterly:{...b,badge:S||u.quarterly.badge,tier:"quarterly",recommended:!0},annual:{...j,badge:I||u.annual.badge,tier:"annual"}}}}function Ho(e){const t=(e.collage||[]).map((a,n)=>`<img class="mpd-join-unlock__thumb" data-mpd-join-collage="${n}" src="${Se(a.src)}" alt="${Se(a.alt)}" loading="lazy" decoding="async" />`).join(""),i=a=>{const n=(a.includedBullets||[]).slice(0,6).map(p=>`<li><span class="mpd-join-unlock__check" aria-hidden="true"></span><span>${Se(p)}</span></li>`).join(""),s=a.every||(a.tier==="monthly"?"per month":a.tier==="quarterly"?"every 3 months":"per year");return`
      <button type="button" class="mpd-join-unlock__plan${a.recommended?" is-recommended is-selected":""}" data-mpd-join-tier="${Se(a.tier)}" role="radio" aria-checked="${a.recommended?"true":"false"}">
        ${a.badge?`<span class="mpd-join-unlock__badge">${Se(a.badge)}</span>`:""}
        <span class="mpd-join-unlock__plan-title">${Se(a.title||a.tier)}</span>
        <span class="mpd-join-unlock__plan-price">${Se(a.displayPrice)}</span>
        <span class="mpd-join-unlock__plan-every">${Se(s)}</span>
        ${a.subtext?`<span class="mpd-join-unlock__plan-sub">${Se(a.subtext)}</span>`:""}
        <span class="mpd-join-unlock__rule" aria-hidden="true"></span>
        <ul class="mpd-join-unlock__bullets">${n}</ul>
      </button>`};return`
    <div class="mpd-join-unlock" id="mpdJoinUnlockInner">
      <p class="mpd-join-unlock__eyebrow">${Se(e.eyebrow)}</p>
      <div class="mpd-join-unlock__hero">
        <div class="mpd-join-unlock__copy">
          <h2 class="mpd-join-unlock__headline">${Se(e.headline)}</h2>
          <p class="mpd-join-unlock__support">${Se(e.support)}</p>
          <p class="mpd-join-unlock__notice">
            <span class="mpd-join-unlock__notice-icon" aria-hidden="true"></span>
            <span>${Se(e.notice)}</span>
          </p>
        </div>
        <div class="mpd-join-unlock__collage">${t}</div>
      </div>
      <div class="mpd-join-unlock__plans" id="mpdJoinUnlockPlans" role="radiogroup" aria-label="Membership plans">
        ${i(e.plans.monthly)}
        ${i(e.plans.quarterly)}
        ${i(e.plans.annual)}
      </div>
      <button type="button" class="mpd-join-unlock__cta" id="mpdJoinUnlockCta">${Se(e.ctaLabel)}</button>
      <p class="mpd-join-unlock__foot">${Se(e.foot)}</p>
    </div>`}function qo(e,t={}){var m;let i=t.defaultTier==="monthly"||t.defaultTier==="annual"?t.defaultTier:"quarterly";const a=e.querySelector("#mpdJoinUnlockPlans"),n=()=>{a==null||a.querySelectorAll("[data-mpd-join-tier]").forEach(g=>{const f=g.getAttribute("data-mpd-join-tier")===i;g.classList.toggle("is-selected",f),g.setAttribute("aria-checked",f?"true":"false")})},s=g=>{var b,j;const u=(j=(b=g.target)==null?void 0:b.closest)==null?void 0:j.call(b,"[data-mpd-join-tier]");if(!(u instanceof HTMLElement))return;const f=u.getAttribute("data-mpd-join-tier");f!=="monthly"&&f!=="quarterly"&&f!=="annual"||(i=f,n())},l=()=>{window.dispatchEvent(new CustomEvent("fusion-open-join-network",{detail:{mode:"resubscribe",subscriptionTier:i,fromJoinNetworkPage:!0,stage:"payment"}}))};a==null||a.addEventListener("click",s),(m=e.querySelector("#mpdJoinUnlockCta"))==null||m.addEventListener("click",l),n();const p=Ao(e,{attrName:"data-mpd-join-collage",intervalMs:6e3});return()=>{var g;p(),a==null||a.removeEventListener("click",s),(g=e.querySelector("#mpdJoinUnlockCta"))==null||g.removeEventListener("click",l)}}const Wo="/assets/explore-programs-3becc4f9.svg",Vo="/assets/my-programs-83f66ba0.svg",Gi="/assets/payments-08af1cce.svg",Jo="/assets/manual-payment-417bd749.svg",Ba="/assets/payment-plan-d3fd375b.svg",Yo="/assets/receipt-download-ee91e1a5.svg",bt="/assets/warning-d449b082.svg",Na="/assets/flight-icon-a8cccfa4.png",Go="/assets/identity-f9717c5a.jpg",zo="/assets/work-aaa01cb3.jpg",Qo="/assets/exhibitions-programs-aedd6f13.jpg",Ko="/assets/media-library-30799c76.jpg",Xo="/assets/journal-7d211690.jpg",Zo="/assets/profile-preview-ce335ed0.jpg";function er(){return`<select id="mpd_discipline" class="studio-input" aria-label="Discipline">${['<option value="">Select discipline…</option>',...Qn.map(t=>`<option value="${oe(t.key)}">${oe(t.label)}</option>`)].join("")}</select>`}function oe(e){return String(e??"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function Ae(e){const t=Vi(e);return`<span class="studio-nav-item__icon" aria-hidden="true">${t?`<img src="${oe(t)}" alt="" />`:'<span class="studio-nav-item__icon-fallback">•</span>'}</span>`}function Ye(e,t){return`<span class="${oe(t)}" style="--mpd-icon-url: url(&quot;${oe(e)}&quot;)" aria-hidden="true"></span>`}function pt(e){Kn({title:`${e} · Fusion`,description:"Edit your Fusion member profile and account settings. Sign in with Internet Identity.",path:typeof window<"u"?window.location.pathname:"/settings/profile",robots:"noindex, nofollow"})}const tr={"studio-overview":{en:"Studio Overview",ja:"スタジオ概要"},identity:{en:"Presence",ja:"プレゼンス"},work:{en:"Work",ja:"作品"},programs:{en:"Programs",ja:"プログラム"},media:{en:"Media",ja:"メディア"},journal:{en:"Journal",ja:"ジャーナル"},preview:{en:"Profile",ja:"プロフィール"},settings:{en:"Settings",ja:"設定"},"your-studio":{en:"Studio",ja:"スタジオ"},completion:{en:"PROFILE COMPLETION",ja:"プロフィール完成度"},blindspots:{en:"BLINDSPOTS",ja:"ブラインドスポット"},"studio-sections":{en:"STUDIO SECTIONS",ja:"スタジオセクション"},"publish-settings":{en:"PUBLISH SETTINGS",ja:"公開設定"},"save-changes":{en:"SAVE CHANGES",ja:"変更を保存"},improve:{en:"IMPROVE",ja:"改善"},"edit-section":{en:"EDIT SECTION",ja:"セクションを編集"},manage:{en:"MANAGE",ja:"管理"},"view-profile":{en:"VIEW FULL PROFILE",ja:"プロフィールを見る"},"view-public-profile":{en:"VIEW PUBLIC PROFILE",ja:"公開プロフィールを見る"},"apply-residency":{en:"APPLY TO RESIDENCY",ja:"レジデンシーに応募"},"coming-soon":{en:"Coming soon",ja:"近日公開"},incomplete:{en:"Profile Incomplete",ja:"プロフィール未完成"},complete:{en:"Profile Complete",ja:"プロフィール完成"}};function Qe(e){const t=tr[e];return t?(document.documentElement.lang||"en")==="ja"&&t.ja?t.ja:t.en:e}const di="/program/kaga-ishikawa",ir=1*1024*1024,ar="en",nr=["practice","perspective","vision","constructing","context","quote"];let zi="world",We=null,ai=!1,Qi="",Ki="",Xa=()=>{};const Xi=new Map;let it="inactive",li=[],mt="",pi=[];const ja={"studio-overview":{shoutHtml:"Your creative space.<br />Shape your presence.",hint:"Track your  development, explore sections, and publish when you are ready."},overview:{shoutHtml:"Your creative space.<br />Shape your presence.",hint:"Track your development, explore sections, and publish when you are ready."},identity:{shoutHtml:"Define who you are.",hint:"Name, discipline, bio, status, location, and the story behind your work — save each section as you go."},work:{shoutHtml:"Your portfolio.",hint:"Manage works, projects, and the pieces that define your practice."},media:{shoutHtml:"Your visual library.",hint:"Main artwork, profile card, intro gallery, and audio — all in one place."},journal:{shoutHtml:"Your creative journal.",hint:"Notes, reflections, and entries from your practice."},preview:{shoutHtml:"See how others see you.",hint:"Preview your public profile as visitors will experience it."},settings:{shoutHtml:"Account &amp; membership.",hint:"Membership status, account recovery, and linked account information."},location:{shoutHtml:"Where you are in your practice.",hint:"Set your studio status and location so visitors and partners see the right context."},story:{shoutHtml:"Clarify the core of your work.",hint:"Your practice, perspective, vision, and how you are constructing the world you want to create."},links:{shoutHtml:"Your presence beyond Fusion.",hint:"Link to your site, socials, and portfolios so people can follow your work everywhere."},programs:{shoutHtml:"Programs and opportunities.",hint:"Track applications and explore public programs that match your practice."},"join-unlock":{shoutHtml:"Unlock your studio.",hint:"Become a FUSION member to open your full profile and exclusive platform access. You can still track applications under Programs."},membership:{shoutHtml:"Your membership keeps your practice visible.",hint:"View billing, update payment, or manage your subscription. We are here if you need help."},dev:{shoutHtml:"Developer tools.",hint:"Raw locales JSON for debugging. Use with care."}};function Yt(e,...t){if(!e||typeof e!="object")return"";const i=e;for(const a of t){const n=i[a];if(n!=null){if(Array.isArray(n)){const s=aa(n);if(s!=null)return String(s).trim()}else if(typeof n=="string")return n.trim()}}return""}function Fa(e){if(!e||typeof e!="object")return"";const t=e.locales_json??e.localesJson;if(typeof t=="string")return t;const i=Array.isArray(t)?aa(t):t;return typeof i=="string"?i:""}function or(e){const t=String(e||"").toLowerCase();return t?{active:"Active",trialing:"Trialing",past_due:"Past due",canceled:"Canceled",unpaid:"Unpaid",incomplete:"Incomplete",incomplete_expired:"Incomplete (expired)",paused:"Paused"}[t]||String(e):"No subscription"}function Gt(e){if(!e)return"—";const t=new Date(e);if(Number.isNaN(t.getTime()))return"—";try{return new Intl.DateTimeFormat(void 0,{dateStyle:"long"}).format(t)}catch{return e.slice(0,10)}}function Ua(e){if(!e)return"";const t=new Date(e);if(Number.isNaN(t.getTime()))return"";const i=new Date,a=Math.ceil((t.getTime()-i.getTime())/864e5);return a===0?"Today":a===1?"Tomorrow":a>1?`In ${a} days`:a===-1?"Yesterday":`${Math.abs(a)} days ago`}async function $i(e){const{file:t,heicWarning:i}=await _o(e,ir);return i&&je("HEIC photo accepted — if preview fails, export as JPEG or WebP and upload again."),t}function ki(e){document.querySelectorAll(".mpd-file-input-hidden").forEach(t=>{var i;t instanceof HTMLInputElement&&((i=t.accept)!=null&&i.includes("image"))&&(t.disabled=!e)}),document.querySelectorAll(".mpd-media-upload-label").forEach(t=>{t instanceof HTMLElement&&(t.classList.toggle("is-disabled",!e),t.style.pointerEvents=e?"":"none",t.style.opacity=e?"":"0.45",e?(t.removeAttribute("aria-disabled"),t.removeAttribute("title")):(t.setAttribute("aria-disabled","true"),t.title="Loading profile…"))})}function je(e){if(Xa(e||""),!e)return;const t=document.getElementById("settingsProfileStatus");t&&t.scrollIntoView({block:"nearest",behavior:"smooth"})}function Li(e){return Qi||Ki||nt()==="test"?!0:(je("Profile still loading — wait a moment, then try your upload again."),e.value="",!1)}function Za(e){return document.getElementById(e)}function rr(e){if(!e||typeof e!="object")return"Studio";const t=e.role;return t&&typeof t=="object"&&("user"in t||"artist"in t||"gallery"in t||"curator"in t||"collector"in t||"staff"in t||"admin"in t)?"Studio":"User Profile"}function T(e){const t=Za(e);return!t||!("value"in t)?"":String(t.value??"")}function D(e,t){const i=Za(e);i&&"value"in i&&(i.value=t)}function Ti(){return T("mpd_w_quote").trim()}function Ke(e){const t=document.getElementById("mpd_hero_spinner");t&&(t.hidden=!e,t.setAttribute("aria-hidden",e?"false":"true"))}function Xe(e){const t=document.getElementById("mpd_hero_profile_spinner");t&&(t.hidden=!e,t.setAttribute("aria-hidden",e?"false":"true"))}function Ue(e,t){const i=document.getElementById(`mpd_intro_${e}_spinner`);i&&(i.hidden=!t,i.setAttribute("aria-hidden",t?"false":"true"))}function Re(e,t){const i=document.querySelector(`[data-mpd-media-surface="${e}"]`);if(!i)return;const a=!!(t.hasPreview??t.hasMedia);i.classList.toggle("has-media",!!t.hasMedia),i.classList.toggle("has-preview",a)}function rt(e){const t=Xi.get(e);t&&(URL.revokeObjectURL(t),Xi.delete(e))}function xi(e,t){rt(e);const i=URL.createObjectURL(t);Xi.set(e,i);const a=/^intro-(\d+)$/.exec(e);if(a){const n=Number(a[1]);Re(e,{hasMedia:!1,hasPreview:!0}),Ue(n,!1);const s=document.getElementById(`mpd_intro_${n}_thumb`);s&&(s.src=i,s.style.display="block");return}if(e==="hero"){Re("hero",{hasMedia:!1,hasPreview:!0}),Ke(!1);const n=document.getElementById("mpd_hero_preview");n&&(n.src=i,n.style.display="block");return}if(e==="heroProfile"){Re("heroProfile",{hasMedia:!1,hasPreview:!0}),Xe(!1);const n=document.getElementById("mpd_hero_profile_preview");n&&(n.src=i,n.style.display="block")}}function sr(e,t){rt(e);const i=/^intro-(\d+)$/.exec(e);if(!i)return;const a=Number(i[1]);Re(e,{hasMedia:!0,hasPreview:!0});const n=document.getElementById(`mpd_intro_${a}_thumb`);n&&(n.style.display="none",n.onload=()=>{Ue(a,!1),n.style.display="block",n.onload=null,n.onerror=null},n.onerror=()=>{Ue(a,!1),Re(e,{hasMedia:!0,hasPreview:!1}),je("Preview could not load. Save and refresh, or try another image."),n.onload=null,n.onerror=null},n.src=ci(t),n.complete&&n.naturalHeight>0&&(Ue(a,!1),n.style.display="block",n.onload=null,n.onerror=null))}function zt(e){if(rt(e),Re(e,{hasMedia:!1,hasPreview:!1}),e==="hero"){const i=document.getElementById("mpd_hero_preview");i&&(i.removeAttribute("src"),i.style.display="none"),Ke(!1);return}if(e==="heroProfile"){const i=document.getElementById("mpd_hero_profile_preview");i&&(i.removeAttribute("src"),i.style.display="none"),Xe(!1);return}const t=/^intro-(\d+)$/.exec(e);if(t){const i=Number(t[1]);Ue(i,!1);const a=document.getElementById(`mpd_intro_${i}_thumb`);a&&(a.removeAttribute("src"),a.style.display="none")}}function ni(){const e=document.getElementById("mpd_hero_profile_card_name"),t=document.getElementById("mpd_hero_profile_card_discipline"),i=[T("mpd_first_name"),T("mpd_last_name")].map(s=>s.trim()).filter(Boolean).join(" "),a=document.getElementById("mpd_discipline");let n="";a instanceof HTMLSelectElement?n=a.selectedIndex>0?a.options[a.selectedIndex].text:"":n=T("mpd_discipline").trim(),e&&(e.textContent=i||"Artist Name"),t&&(t.textContent=n||"Discipline")}let oi=0;function Qt(e){oi+=1;const t=document.getElementById("mpd_upload_overlay"),i=document.getElementById("mpd_upload_overlay_label");i&&(i.textContent=e||"Uploading image..."),t&&(t.hidden=!1,t.setAttribute("aria-hidden","false"))}function Kt(){if(oi=Math.max(0,oi-1),oi>0)return;const e=document.getElementById("mpd_upload_overlay");e&&(e.hidden=!0,e.setAttribute("aria-hidden","true"))}function ci(e){const t=String(e||"").trim();if(!t||typeof window>"u")return t;try{const i=new URL(t,window.location.origin);return i.searchParams.set("mpdPreview",String(Date.now())),i.href}catch{const i=t.includes("?")?"&":"?";return`${t}${i}mpdPreview=${Date.now()}`}}function Xt(e,t="",i={}){typeof window>"u"||window.dispatchEvent(new CustomEvent("fusion-profile-save-status",{detail:{state:e,message:t,operation:i.operation||"",detail:i.detail||""}}))}function Zi(e){const t=e instanceof Error?e.message:String(e??""),i=`${t} ${e&&typeof e=="object"&&"message"in e?String(e.message):""}`;return/No linked artist on account/i.test(i)?"Your account is not linked to a profile yet. Refresh this page, or contact Fusion if the problem continues.":/Linked artist not found/i.test(i)?"Your linked profile record could not be found. Refresh this page, or contact Fusion for help.":/No account for caller/i.test(i)?"You're signed in, but this Internet Identity isn't linked to a Fusion member account. Contact support with your checkout email if you paid with a different login.":/Active membership required/i.test(i)?"Translation requires an active membership. Choose Just save to update your profile without translation, or renew membership first.":/Text too long for Studio LLM/i.test(i)?"Some text is too long to translate automatically. Choose Just save, or shorten your bio and story sections.":/Image URL too long|Profile image URL too long/i.test(i)?"An image URL is too long to save. Try re-uploading the image, or use a shorter hosted URL.":/Audio URL too long/i.test(i)?"The audio URL is too long to save. Try re-uploading the file.":/Anonymous caller/i.test(i)?"Your session expired. Sign in again, then retry saving.":t&&t.length<280&&!/Request ID:|Reject code:|ic0\.trap|Canister called/i.test(t)?t:"Profile could not be saved. Try Just save without translation, refresh the page, or contact Fusion if this keeps happening."}function Pe(e){try{return JSON.parse(JSON.stringify(e??null))}catch{return e}}function dr(e,t,i){const n=Ge(e&&typeof e=="object"?e:{},t)[i];return n&&typeof n=="object"&&!Array.isArray(n)?n:{}}function ra(e){const t={};for(const i of nr)t[i]=e[i];return t}function mi(){const e=Wa(T),t=e.world&&typeof e.world=="object"&&!Array.isArray(e.world)?e.world:{};return ra(t)}function Bi(){return We=mi(),Wa(T)}function lr(e){D("mpd_w_practice",String(e.practice??"")),D("mpd_w_perspective",Jt(e.perspective)),D("mpd_w_vision",Jt(e.vision)),D("mpd_w_constructing",Jt(e.constructing)),D("mpd_w_context",Jt(e.context)),D("mpd_w_quote",String(e.quote??""))}function pr(e){const t=document.getElementById("mpd-story");t&&t.classList.toggle("mpd-story--readonly",e),document.querySelectorAll(".mpd-story-input").forEach(i=>{(i instanceof HTMLInputElement||i instanceof HTMLTextAreaElement)&&(i.readOnly=e,i.setAttribute("aria-readonly",e?"true":"false"))}),document.querySelectorAll(".mpd-story-edit-btn").forEach(i=>{i instanceof HTMLButtonElement&&(i.disabled=e,i.setAttribute("aria-hidden",e?"true":"false"))})}function cr(e,t){const i=e==="newWorld"&&t?"newWorld":"world",a=document.getElementById("mpd_public_world_source");a&&(a.value=i);const n=document.getElementById("mpd_public_world_source_note");n&&(n.textContent=`${i==="newWorld"?"New World":"World"} will display on your profile.`),document.querySelectorAll("[data-mpd-world-source]").forEach(s=>{if(!(s instanceof HTMLButtonElement))return;const l=s.getAttribute("data-mpd-world-source"),p=l==="newWorld",m=l===i;s.classList.toggle("is-active",m),s.classList.toggle("is-disabled",p&&!t),s.setAttribute("aria-pressed",m?"true":"false"),s.disabled=!!(p&&!t),p&&!t?(s.setAttribute("aria-disabled","true"),s.title="New World will unlock after generated copy is available."):(s.removeAttribute("aria-disabled"),s.removeAttribute("title"))})}function ea(e,t){ai=Ga(e);let i=t==="world"||t==="newWorld"?t:Ja(e);i==="newWorld"&&!ai&&(i="world"),cr(i,ai)}function en(e,t,i=!1){i&&(We=mi());const a=dr(e,t,"world");ai=Ga(e),lr(We||ra(a)),pr(!1),zi="world"}function ui(e){if(e==null)return[];if(Array.isArray(e))return e.flatMap(i=>ui(i));if(typeof e=="object")return Object.values(e).flatMap(i=>ui(i));const t=String(e).trim();return t?[t]:[]}function mr(e){const t=e.world&&typeof e.world=="object"?e.world:{},i=[e.discipline,e.bio,...ui(t)].join(`
`);return i.trim()?/[\u3040-\u30ff\u3400-\u9fff]/.test(i)?"ja":/[A-Za-z]/.test(i)&&!/[^\x00-\x7F]/.test(i)?"en":"other":"en"}function Ra(e){return ui({firstName:e.firstName,lastName:e.lastName,name:e.name,discipline:e.discipline,bio:e.bio,world:e.world}).some(Boolean)}function ur(e){const t=Ge(e,"en");if(Ra(t))return e;const i=Ge(e,"ja");return Ra(i)?{...e,en:Pe(i)}:e}async function jt(e,t,i){if(e==null)return"";if(Array.isArray(e))return Promise.all(e.map(n=>jt(n,t,i)));const a=String(e??"").trim();return a?(await vo(a,t,i)).trim():""}function at(e){return e==null?"":Array.isArray(e)||typeof e=="object"?JSON.stringify(e):String(e).trim()}async function Zt(e,t,i,a,n){const s=Pe(e)||{},l=a&&typeof a=="object"&&n&&typeof n=="object",p=(L,H)=>l&&at(H)===at(a[L])&&n[L]!=null?Promise.resolve(Pe(n[L])):jt(H,t,i),[m,g]=await Promise.all([p("discipline",e.discipline),p("bio",e.bio)]);s.discipline=m,s.bio=g,s.bioLong="";const u=e.world&&typeof e.world=="object"&&!Array.isArray(e.world)?e.world:{},f=Pe(u)||{},b=l&&a.world&&typeof a.world=="object"?a.world:void 0,j=l&&n.world&&typeof n.world=="object"?n.world:void 0,_=(L,H)=>b&&j&&at(H)===at(b[L])&&j[L]!=null?Promise.resolve(Pe(j[L])):jt(H,t,i),S=await Promise.all([_("practice",u.practice),_("perspective",u.perspective),_("vision",u.vision),_("constructing",u.constructing),_("context",u.context),_("quote",u.quote)]);[f.practice,f.perspective,f.vision,f.constructing,f.context,f.quote]=S;const I=Array.isArray(u.introGallery)?Pe(u.introGallery):[],$=b&&Array.isArray(b.introGallery)?b.introGallery:[],Z=j&&Array.isArray(j.introGallery)?j.introGallery:[],R=await Promise.all(I.filter(L=>L&&typeof L=="object").map(async(L,H)=>{const me=$[H],re=Z[H],pe=me&&typeof me=="object"&&re&&typeof re=="object",[ee,Y]=await Promise.all([pe&&at(L.alt)===at(me.alt)&&re.alt!=null?Promise.resolve(Pe(re.alt)):jt(L.alt,t,i),pe&&at(L.caption)===at(me.caption)&&re.caption!=null?Promise.resolve(Pe(re.caption)):jt(L.caption,t,i)]);return{...L,alt:ee,caption:Y}}));return f.introGallery=R,s.world=f,s}async function fr(e,t,i,a={}){const n=m=>a._valOverrides&&m in a._valOverrides?a._valOverrides[m]:i(m),s=Pe(e&&typeof e=="object"?e:{en:{},ja:{}})||{},l=m=>{const g=Ge(e,m),u=Ge(s,m),f=g.worldNew;u&&typeof u=="object"&&f&&typeof f=="object"&&!Array.isArray(f)&&(u.worldNew=Pe(f),s[m]=u)};if(a.translate===!1)s.en=Pe(t),s.ja=Pe(t);else try{const m=mr(t),g=Ge(e,"en"),u=Ge(e,"ja");if(m==="ja")s.ja=Pe(t),s.en=await Zt(t,"en","ja",u,g);else if(m==="en")s.en=Pe(t),s.ja=await Zt(t,"ja","en",g,u);else{const[f,b]=await Promise.all([Zt(t,"en","auto",g,g),Zt(t,"ja","auto",g,u)]);s.en=f,s.ja=b}}catch(m){const g=Zi(m);throw new Error(g.includes("Just save")?g:`${g} Try Just save without translation.`)}return l("en"),l("ja"),n("mpd_public_world_source")==="world"?s.publicWorldSource="world":delete s.publicWorldSource,za(s)}function ei(e,t){const i=Ge(e,t),a=i.world&&typeof i.world=="object"&&!Array.isArray(i.world)?i.world:{},n=String(i.firstName??"").trim(),s=String(i.lastName??"").trim();if(n||s)D("mpd_first_name",n),D("mpd_last_name",s);else{const u=String(i.name??"").trim().split(/\s+/).filter(Boolean);D("mpd_first_name",u[0]??""),D("mpd_last_name",u.length>1?u.slice(1).join(" "):"")}D("mpd_discipline",Xn(String(i.discipline??""))),ni(),D("mpd_bio",String(i.bio??i.bioLong??"")),nn(i.status);const l=i.location&&typeof i.location=="object"&&!Array.isArray(i.location)?i.location:{};D("mpd_loc_city",String(l.city??"")),D("mpd_loc_state",String(l.state??"")),D("mpd_loc_country",String(l.country??"")),D("mpd_loc_display",String(l.display??"")),We=ra(a);const p=Zn(a);for(let g=0;g<3;g++){const u=p[g]||{src:"",alt:"",caption:""};D(`mpd_intro_${g}_src`,u.src),D(`mpd_intro_${g}_alt`,u.alt),D(`mpd_intro_${g}_caption`,u.caption);const f=document.getElementById(`mpd_intro_${g}_thumb`);f&&(Re(`intro-${g}`,{hasMedia:!!u.src,hasPreview:!!u.src}),u.src?(Ue(g,!0),f.style.display="none",f.onload=()=>{Ue(g,!1),f.style.display="block",f.onload=null,f.onerror=null},f.onerror=()=>{Ue(g,!1),f.onload=null,f.onerror=null},f.src=ci(u.src),f.complete&&f.naturalHeight>0&&(Ue(g,!1),f.style.display="block",f.onload=null,f.onerror=null)):(Ue(g,!1),f.removeAttribute("src"),f.style.display="none"))}const m=document.getElementById("mpd_dev_json");m&&Ut&&(m.value=eo(e)),on(Array.isArray(i.links)?i.links:[]),en(e,t,!1),ea(e,Ja(e)),gr()}function gr(e){const t=document.getElementById("mpd_audio_section");if(!t)return;t.hidden=!1,t.setAttribute("aria-hidden","false"),t.classList.remove("mpd-audio-section--hidden"),t.querySelectorAll("input, textarea").forEach(n=>{(n instanceof HTMLInputElement||n instanceof HTMLTextAreaElement)&&(n.disabled=!1)});const i=document.querySelector('label[for="mpd_audio_file"]');i instanceof HTMLLabelElement&&(i.removeAttribute("aria-disabled"),i.style.pointerEvents="",i.style.opacity="");const a=document.getElementById("mpd_audio_record_open");a instanceof HTMLButtonElement&&(a.disabled=!1,a.style.opacity="")}const yr="“Words mean more than what is set down on paper. It takes the human voice to infuse them with deeper meaning.” — Maya Angelou";async function hr(){var t;const e=document.getElementById("mpd_audio_inspiration");if(e){try{const i=await Wi("user-studio"),a=i==null?void 0:i.audioInspirationText;if(a&&typeof a=="object"){const n=(t=document.documentElement.lang)!=null&&t.startsWith("ja")?"ja":"en",s=String(a[n]||a.en||"").trim();if(s){e.textContent=s;return}}}catch{}e.textContent=yr}}let Pt={heroProfileImage:null,audioEntries:[]};function tn(e){if(!e)return"";let t="pending",i="Pending review";e.approved?(t="approved",i="Approved"):e.reason&&(t="rejected",i="Changes requested");const a=e.reason||e.imageUrl?' <button type="button" class="mpd-asset-review-banner__info-btn" data-action="review-info">More info</button>':"";return`<div class="mpd-asset-review-banner mpd-asset-review-banner--${t}">
    <span class="mpd-asset-review-banner__text">${i}</span>${a}
  </div>`}function an(e){if(!e)return;let t="pending",i="Pending review";e.approved?(t="approved",i="Approved"):e.reason&&(t="rejected",i="Changes requested");const a=g=>String(g??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),n=e.reason?`<p class="mpd-review-note-modal__reason">${a(e.reason)}</p>`:"",s=e.imageUrl?`<img class="mpd-review-note-modal__image" src="${a(e.imageUrl)}" alt="Reference" />`:"",l=e.reviewedAt?`<p class="mpd-review-note-modal__date">Reviewed: ${new Date(Number(e.reviewedAt)/1e6||e.reviewedAt).toLocaleDateString()}</p>`:"",p=document.createElement("div");p.className="mpd-review-note-modal",p.innerHTML=`
    <div class="mpd-review-note-modal__scrim" data-close></div>
    <div class="mpd-review-note-modal__panel">
      <button class="mpd-review-note-modal__x" data-close>&times;</button>
      <h3>Review Note</h3>
      <div class="mpd-review-note-modal__status ${t}">${i}</div>
      ${n}
      ${s}
      ${l}
    </div>
  `;const m=()=>p.remove();p.querySelectorAll("[data-close]").forEach(g=>g.addEventListener("click",m)),document.body.appendChild(p)}async function br(){try{Pt=await to()}catch(e){console.warn("Failed to load asset review notes",e),Pt={heroProfileImage:null,audioEntries:[]}}vr()}function vr(){const e=document.getElementById("mpd_hero_profile_review_banner");e&&(e.innerHTML=tn(Pt.heroProfileImage),e.querySelectorAll('[data-action="review-info"]').forEach(t=>{t.addEventListener("click",()=>an(Pt.heroProfileImage))}))}function Da(e){const t=document.getElementById("mpd_audio_collection"),i=document.getElementById("mpd_audio_count"),a=document.getElementById("mpd_audio_actions");if(!t)return;const n=(e==null?void 0:e.entries)??[],s=(e==null?void 0:e.highlightUrl)??"",l=new Set((e==null?void 0:e.approvedUrls)??[]);if(i&&(i.hidden=n.length===0,i.textContent=`${n.length} / 5 audio bites`),a&&(a.hidden=n.length>=5),n.length===0){t.innerHTML="";return}const p=m=>String(m??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");t.innerHTML=n.map(m=>{const g=m.url===s,u=l.has(m.url),f=g?" is-highlight":"",b=u?"approved":"pending",j=u?"is-approved":"is-pending",_=Pt.audioEntries.find(([I])=>I.endsWith("|"+m.url)),S=_?tn(_[1]):"";return`<div class="mpd-audio-entry${f}" data-audio-url="${p(m.url)}">
        ${S}
        <app-audio-row active="true" data-audio-src="${p(m.url)}" data-audio-title="${p(m.title)}" data-layout="profile"></app-audio-row>
        <div class="mpd-audio-entry-controls">
          <button type="button" class="mpd-audio-highlight-btn${g?" active":""}" title="${g?"Currently highlighted":"Set as highlight"}" data-action="highlight">★</button>
          <span class="mpd-audio-entry-status ${j}">${b}</span>
          <button type="button" class="mpd-audio-delete-btn" title="Delete" data-action="delete">&times;</button>
        </div>
      </div>`}).join("")}async function xt(){try{const e=await Un();Da(e)}catch(e){console.error("Failed to load audio collection",e),Da(null)}}function nn(e){const t=String(e??"").trim(),i=["studio","prep","showing","available"].includes(t)?t:"studio",a=document.getElementById("mpd_status");a&&(a.value=i),document.querySelectorAll("[data-mpd-status]").forEach(n=>{const s=n.getAttribute("data-mpd-status")===i;n.classList.toggle("is-active",s),n.setAttribute("aria-pressed",s?"true":"false")})}function ti(e){const t=ht(e),i=t==="pending"?"public":t,a=document.getElementById("mpd_profile_visibility");a&&(a.value=i),document.querySelectorAll("[data-mpd-visibility]").forEach(p=>{const m=p.getAttribute("data-mpd-visibility")===i;p.classList.toggle("is-active",m),p.setAttribute("aria-pressed",m?"true":"false")});const n=document.getElementById("mpd_profile_visibility_review_notice");if(n){const p=t==="pending";n.hidden=!p,n.setAttribute("aria-hidden",p?"false":"true")}const s=document.getElementById("mpd_overview_visibility");s&&(s.value=i);const l=document.getElementById("mpd_overview_visibility_review");l&&(l.hidden=t!=="pending")}function _r(e,t){if(!e||typeof e!="object")return;let i={};try{t&&(i=typeof t=="string"?JSON.parse(t):t),(!i||typeof i!="object")&&(i={})}catch{return}let a=null,n=-1/0;for(const[,l]of Object.entries(i)){if(!l||typeof l!="object")continue;const p=l,m=p.payload;if(!m||typeof m!="object")continue;const g=p.submittedAt??p.submitted_at;let u=-1/0;if(typeof g=="number"&&Number.isFinite(g))u=g;else if(typeof g=="string"){const f=Date.parse(g);Number.isNaN(f)||(u=f)}u>=n&&(n=u,a=p)}if(!a||!a.payload||typeof a.payload!="object"){for(const[,l]of Object.entries(i))if(l&&typeof l=="object"&&l.payload&&typeof l.payload=="object"){a=l;break}}if(!a||!a.payload||typeof a.payload!="object")return;const s=a.payload;for(const l of["en","ja"]){(!e[l]||typeof e[l]!="object"||Array.isArray(e[l]))&&(e[l]={});const p=e[l],m=String(p.firstName??"").trim(),g=String(p.lastName??"").trim();if(!m&&s.firstName!=null&&(p.firstName=String(s.firstName).trim()),!g&&s.lastName!=null&&(p.lastName=String(s.lastName).trim()),!String(p.name??"").trim()){const _=String(p.firstName??"").trim(),S=String(p.lastName??"").trim();(_||S)&&(p.name=`${_} ${S}`.trim())}let f=p.location&&typeof p.location=="object"&&!Array.isArray(p.location)?{...p.location}:{};const b=(_,S)=>{if(S==null)return;const I=String(S).trim();I&&(String(f[_]??"").trim()||(f[_]=I))};b("country",s.country),b("state",s.stateProvince),b("city",s.city),Object.keys(f).length&&(p.location=f),!String(p.discipline??"").trim()&&s.discipline!=null&&(p.discipline=String(s.discipline).trim()),!String(p.bio??"").trim()&&s.bioStatement!=null&&(p.bio=String(s.bioStatement).trim());const j=s.website!=null?String(s.website).trim():"";if(j){const _=Array.isArray(p.links)?[...p.links]:[];_.some(I=>I&&typeof I=="object"&&String(I.url??"").trim())||(_.push({type:"website",url:j,label:j}),p.links=_)}}}function on(e){const t=document.getElementById("mpd-links");if(!t)return;const i=Array.isArray(e)&&e.length?e:[{type:"website",url:"",label:""}];t.replaceChildren();for(let a=0;a<i.length;a++){const n=i[a]&&typeof i[a]=="object"?i[a]:{},s=document.createElement("div");s.className="mpd-link-row studio-form-grid mpd-editorial-grid mpd-editorial-grid--links",s.innerHTML=`
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
        `;const l=s.querySelector(".mpd-link-type"),p=s.querySelector(".mpd-link-url"),m=s.querySelector(".mpd-link-label");l&&"value"in l&&(l.value=String(n.type??"website")),p&&"value"in p&&(p.value=String(n.url??"")),m&&"value"in m&&(m.value=String(n.label??"")),t.appendChild(s)}}function k(e){return String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}async function wr(e,t){try{return await navigator.clipboard.writeText(e),t instanceof HTMLElement&&(t.classList.add("is-copied"),t.setAttribute("aria-label","Copied"),window.setTimeout(()=>{t.classList.remove("is-copied"),t.setAttribute("aria-label","Copy User ID")},2e3)),!0}catch{return t instanceof HTMLElement&&(t.classList.add("is-copy-failed"),window.setTimeout(()=>{t.classList.remove("is-copy-failed")},2e3)),!1}}function Sr(e,t,i){const a=()=>{wr(i,t||e)};t instanceof HTMLButtonElement&&(t.onclick=a),e instanceof HTMLElement&&(e.onclick=a,e.onkeydown=n=>{(n.key==="Enter"||n.key===" ")&&(n.preventDefault(),a())})}function Ni(e,t="sidebar"){const i={sidebar:{wrapId:"settingsProfileUserIdWrap",valueId:"settingsProfileUserId",copyId:"settingsProfileCopyUserId"},main:{wrapId:"settingsProfileMainUserIdWrap",valueId:"settingsProfileMainUserId",copyId:"settingsProfileMainUserIdCopy"},none:null},a=e.authenticated&&e.principal?e.principal.toText():"";for(const n of["sidebar","main"]){const s=i[n],l=document.getElementById(s.wrapId),p=document.getElementById(s.valueId),m=document.getElementById(s.copyId);if(!(l instanceof HTMLElement)||!(p instanceof HTMLElement))continue;const g=!!a&&t===n;l.hidden=!g,p.textContent=g?a:"—",p.title=g?"Click to copy User ID":"",g?p.setAttribute("aria-label","User ID, click to copy"):p.removeAttribute("aria-label"),g&&Sr(p,m instanceof HTMLButtonElement?m:null,a)}}function Pr(e){e&&(e.textContent="No member account found. You're signed in, but this Internet Identity isn't linked to a Fusion member account.")}function Ce(e){return String(e??"").trim()}function vt(e){const t=document.getElementById("mpd-programs");if(!t)return;const i=["explore","my-programs","payments"].includes(e)?e:"explore",a=t.querySelector(`[data-mpd-program-tab="${i}"]`),n=i==="payments"&&a&&(a.hasAttribute("hidden")||a.getAttribute("aria-hidden")==="true")?"my-programs":i;t.querySelectorAll("[data-mpd-program-tab]").forEach(s=>{const l=s.getAttribute("data-mpd-program-tab")===n;s.classList.toggle("is-active",l),s.setAttribute("aria-selected",l?"true":"false"),s.setAttribute("tabindex",l?"0":"-1")}),t.querySelectorAll("[data-mpd-program-panel]").forEach(s=>{s.getAttribute("data-mpd-program-panel")===n?s.removeAttribute("hidden"):s.setAttribute("hidden","")})}function ta(){const e=document.getElementById("mpd_public_programs_discovery");if(!e)return;const t=e.querySelector("#mpd_public_programs_search"),i=e.querySelector("#mpd_public_programs_filter"),a=String((t==null?void 0:t.value)??"").trim().toLowerCase(),n=String((i==null?void 0:i.value)??"all").trim(),s=Array.from(e.querySelectorAll(".mpd-public-program-card"));let l=0;for(const m of s){const g=String(m.getAttribute("data-search")??"").toLowerCase(),u=String(m.getAttribute("data-status")??""),f=String(m.getAttribute("data-category")??""),b=!a||g.includes(a),j=n==="all"||n==="open"&&u==="open"||n==="not-open"&&u!=="open"||n.startsWith("category:")&&f===n.slice(9),_=b&&j;m.toggleAttribute("hidden",!_),_&&(l+=1)}const p=document.getElementById("mpd_public_programs_no_results");p&&(p.hidden=s.length===0||l>0)}function rn(){var s;const e=document.getElementById("mpd-program-panel-my-programs");if(!e)return;const t=((s=e.querySelector(".mpd-my-program-filter.is-active"))==null?void 0:s.getAttribute("data-mpd-my-program-filter"))||"all",i=Array.from(e.querySelectorAll(".mpd-my-program-card"));let a=0;for(const l of i){const p=String(l.getAttribute("data-status-key")||"submitted"),m=t==="all"||p===t;l.toggleAttribute("hidden",!m),m&&(a+=1)}const n=document.getElementById("mpd_my_programs_no_results");n&&(n.hidden=i.length===0||a>0)}function Er(e){const t=document.getElementById("mpd-program-panel-my-programs");!t||!t.contains(e)||(t.querySelectorAll("[data-mpd-my-program-filter]").forEach(i=>{const a=i===e;i.classList.toggle("is-active",a),i.setAttribute("aria-pressed",a?"true":"false")}),rn())}function Ar(e){var g,u,f;const t=Array.from(document.querySelectorAll(".mpd-my-program-card")).find(b=>b.getAttribute("data-program-id")===e);if(!t)return;const i=((g=t.querySelector("h4"))==null?void 0:g.textContent)||"Application",a=Array.from(t.querySelectorAll("template[data-mpd-application-payload]")).find(b=>b.getAttribute("data-mpd-application-payload")===e)||null,n=(a==null?void 0:a.innerHTML)||'<p class="studio-muted">No application payload details are available.</p>',s=document.createElement("div");s.className="settings-profile-page profile-gallery-access-modal mpd-application-details-modal",s.setAttribute("aria-hidden","false"),s.innerHTML=`
    <div class="profile-gallery-access-modal__scrim" aria-hidden="true"></div>
    <div class="profile-gallery-access-modal__panel mpd-application-details-modal__panel" role="dialog" aria-modal="true" aria-labelledby="mpdApplicationDetailsTitle">
      <h2 id="mpdApplicationDetailsTitle" class="profile-gallery-access-modal__title">${k(i)}</h2>
      <div class="mpd-application-details-modal__body">
        ${n}
      </div>
      <button type="button" class="profile-gallery-access-modal__close">Close</button>
    </div>
  `;const l=()=>{s.remove(),window.removeEventListener("keydown",p)};function p(b){b.key==="Escape"&&l()}(u=s.querySelector(".profile-gallery-access-modal__scrim"))==null||u.addEventListener("click",l),(f=s.querySelector(".profile-gallery-access-modal__close"))==null||f.addEventListener("click",l),window.addEventListener("keydown",p),document.body.appendChild(s);const m=s.querySelector(".profile-gallery-access-modal__close");m instanceof HTMLElement&&m.focus()}function wt(e){return e&&typeof e=="object"&&!Array.isArray(e)?e:{}}function Cr(e){return Array.isArray(e)?e:[]}function Ir(e){const t=Ce(e).toLowerCase().replace(/[\s_-]+/g,"-");return["reviewing","review","in-review","initial-review"].includes(t)?{key:"initial-review",label:"Initial review"}:["postinterviewreview","post-interview-review","under-review","final-review"].includes(t)?{key:"post-interview-review",label:"Post interview review"}:["invited","invite","accepted","approved","payment-required","deposit-due"].includes(t)?{key:"invited",label:"Invited"}:["not-selected","rejected","declined","not-accepted"].includes(t)?{key:"not-selected",label:"Not selected"}:["pulledout","pulled-out","pulled_out","rescinded"].includes(t)?{key:"rescinded",label:"Rescinded"}:["withdrawn","withdrew","cancelled","canceled"].includes(t)?{key:"withdrawn",label:"Withdrawn"}:{key:"submitted",label:"Submitted"}}function Mr(e,t,i){const a=wt(e.enCard),n=wt(e.jaCard),s=wt(i.payload),l=Ir(i.status??i.applicationStatus??i.decision),p=de(a.focus,a.headline),m=de(a.location,a.place),g=m||de(a.title,p,t)||"Program",u=de(a.openTo,a.audience,a.eligibility,a.discipline,a.medium),f=de(a.startDate,a.start),b=de(a.endDate,a.deadline),j=de(a.deadline,a.applicationDeadline,a.deadlineDate,a.applyBy,f&&b?`${f} - ${b}`:f||b,a.year),_=de(n.imageSrc,a.imageSrc,e.image),S=de(a.imageAlt,g),I=de(a.category,a.type,p,"Program");let $="/programs";if(e.routeLink){const H=String(e.routeLink);$=H.startsWith("/")?H:`/${H}`}const Z=de(i.submittedAt,i.submitted_at,i.createdAt),R=!!(i.paymentRequired||i.payment_required||["accepted","approved","payment-required","deposit-due"].includes(Ce(i.status??i.decision).toLowerCase().replace(/[\s_-]+/g,"-"))),L=de(i.teamNote,i.teamNotes,i.programNote,i.note);return{programId:t,title:g,location:m,focus:p,openTo:u,deadline:j,imageSrc:_,imageAlt:S,category:I,route:$,submittedAt:Z,payload:s,status:l,paymentRequired:R,slotSecured:!!i.slotSecured,teamNote:L,rawEntry:i}}function $r(e){const t=e.status.key,i=t==="rescinded"?{completeThrough:1,activeStep:0}:t==="initial-review"?{completeThrough:2,activeStep:3}:t==="post-interview-review"?{completeThrough:3,activeStep:4}:t==="invited"||t==="not-selected"||t==="withdrawn"?{completeThrough:4,activeStep:5}:{completeThrough:e.submittedAt?1:0,activeStep:0},a=!!e.slotSecured;return["Submitted","Initial review","Post interview review","Decision","Slot secured"].map((n,s)=>{const l=s+1,p=l===5&&a||l<=i.completeThrough?"complete":l===i.activeStep?"active":"pending",m=l===1?oa(e.submittedAt):"";return{label:n,state:p,date:m==="—"?"":m}})}function kr(e){const t=(...a)=>a.some(n=>Ce(e[n])),i=t("portfolio","portfolioUrl","portfolioLink","website","websiteUrl")||Cr(e.files).length>0;return[{label:"Personal statement",submitted:t("statement","personalStatement","artistStatement","bio")},{label:"Artist profile",submitted:!0},{label:"Portfolio",submitted:i},{label:"Travel documents",submitted:t("travelDocuments","travelDocument","passport","passportUrl")}]}function Lr(e){if(e.teamNote)return e.teamNote;if(e.paymentRequired)return"You have been invited to continue. Payment details will appear here when the next step opens.";switch(e.status.key){case"initial-review":return"Thank you for your application. Our team is completing the initial review.";case"post-interview-review":return"Thank you for your application. Our team is currently reviewing submissions. You will be notified when a decision is ready.";case"invited":return"Your application has moved forward. Watch this space for next steps from the program team.";case"not-selected":return"Thank you for applying. This application was not selected for the current cycle.";case"withdrawn":return"This application has been withdrawn. No further action is needed.";case"rescinded":return"This application has been rescinded. Contact the program team if you have questions.";default:return"Your application has been received and is queued for review."}}function Tr(e){const t=Object.entries(e).filter(([,i])=>i==null?!1:typeof i=="string"?!!i.trim():Array.isArray(i)?i.length>0:typeof i=="number"||typeof i=="boolean").slice(0,16);return t.length?`<dl class="mpd-application-payload-list">${t.map(([i,a])=>{const n=i.replace(/([a-z])([A-Z])/g,"$1 $2").replace(/[_-]+/g," ").replace(/\b\w/g,l=>l.toUpperCase()),s=Array.isArray(a)?a.join(", "):String(a);return`<dt>${k(n)}</dt><dd>${k(s)}</dd>`}).join("")}</dl>`:'<p class="studio-muted">No application payload details are available.</p>'}function xr(e){const t=$r(e),i=kr(e.payload),a=e.submittedAt?`Submitted: ${oa(e.submittedAt)}`:"";return`
    <article class="mpd-my-program-card mpd-my-program-card--${k(e.status.key)}" data-status-key="${k(e.status.key)}" data-program-id="${k(e.programId)}">
      <div class="mpd-my-program-card__summary">
        <div class="mpd-my-program-card__media">
          ${e.imageSrc?`<img src="${k(e.imageSrc)}" alt="${k(_t(e.imageAlt||e.title))}" loading="lazy" />`:'<div class="mpd-my-program-card__placeholder">Fusion</div>'}
        </div>
        <div class="mpd-my-program-card__meta">
          <div class="mpd-my-program-card__title-row">
            <div>
              <h4>${k(e.title)}</h4>
              ${e.category?`<p class="mpd-my-program-card__category">${k(e.category)}</p>`:""}
            </div>
            <div class="mpd-my-program-card__status-wrap">
              <span class="mpd-my-program-status mpd-my-program-status--${k(e.status.key)}">${k(e.status.label)}</span>
              ${a?`<span class="mpd-my-program-card__date">${k(a)}</span>`:""}
            </div>
          </div>
          <div class="mpd-my-program-card__facts">
            ${e.focus?`<p><strong>Program:</strong> ${k(e.focus)}</p>`:""}
            ${e.openTo?`<p><strong>Open to:</strong> ${k(e.openTo)}</p>`:""}
            ${e.deadline?`<p><strong>Dates:</strong> ${k(e.deadline)}</p>`:""}
          </div>
        </div>
      </div>
      ${e.paymentRequired?'<div class="mpd-my-program-payment-callout"><strong>Payment required</strong><span>Visit the Payments tab to submit your deposit or full payment and secure your slot.</span><button type="button" class="mpd-my-program-action" data-mpd-program-tab="payments">View payments</button></div>':""}
      <ol class="mpd-my-program-timeline" aria-label="Application progress for ${k(e.title)}">
        ${t.map(n=>`
              <li class="mpd-my-program-timeline__step is-${k(n.state)}">
                <span class="mpd-my-program-timeline__dot" aria-hidden="true"></span>
                <span class="mpd-my-program-timeline__label">${k(n.label)}</span>
                ${n.date?`<span class="mpd-my-program-timeline__date">${k(n.date)}</span>`:""}
              </li>
            `).join("")}
      </ol>
      <div class="mpd-my-program-card__details">
        <section>
          <h5>Application materials</h5>
          <ul class="mpd-my-program-materials">
            ${i.map(n=>`
                  <li class="${n.submitted?"is-submitted":"is-pending"}">
                    <span aria-hidden="true">${n.submitted?"✓":"○"}</span>
                    <span>${k(n.label)}</span>
                    <em>${n.submitted?"Submitted":"Pending"}</em>
                  </li>
                `).join("")}
          </ul>
        </section>
        <section>
          <h5>Notes from the program</h5>
          <p>${k(Lr(e))}</p>
        </section>
        <section>
          <h5>Actions</h5>
          <div class="mpd-my-program-actions">
            <button type="button" class="mpd-my-program-action" data-mpd-application-action="view" data-program-id="${k(e.programId)}">View application</button>
            <button type="button" class="mpd-my-program-action" data-mpd-application-action="update" data-program-id="${k(e.programId)}">Update materials</button>
            <button type="button" class="mpd-my-program-action mpd-my-program-action--danger" data-mpd-application-action="withdraw" data-program-id="${k(e.programId)}">Withdraw application</button>
          </div>
        </section>
      </div>
      <template data-mpd-application-payload="${k(e.programId)}">${Tr(e.payload)}</template>
    </article>
  `}function Ft(e){const t=Number(e??0);return Number.isFinite(t)?Math.max(0,Math.round(t)):0}const Fe=wo,sn=So;function Br(e,t){return(t.summaries||[]).find(i=>String(i.programId||"")===String(e))||null}function Nr(e,t){return e&&(t.plans||[]).find(i=>String(i.id||"")===String(e))||null}function jr(e){const t=new Set,i=Array.isArray(e==null?void 0:e.approvedPrograms)?e.approvedPrograms:[];for(const a of i)if((a==null?void 0:a.manualDepositSubmitted)===!0){const n=String((a==null?void 0:a.programId)||"");n&&t.add(n)}for(const a of(e==null?void 0:e.summaries)||[]){const n=String((a==null?void 0:a.programId)||""),s=i.find(m=>String(m.programId||"")===n),l=((e==null?void 0:e.ledger)||[]).filter(m=>String(m.programId||"")===n),p=Ft(a==null?void 0:a.depositAmountCents);Qa(s,a,l,p)&&n&&t.add(n)}return t}function Fr(e,t){return(Array.isArray(t.approvedPrograms)?t.approvedPrograms:[]).map(a=>{var Q,P;const n=String(a.programId||"").trim();if(!n)return null;const s=e.find(K=>String(K.id||"")===n)||{id:n,enCard:{focus:n}},l=wt(s.enCard||s),p=wt(s.jaCard||{}),m=de(l.location,l.place),g=de(l.focus,l.headline,l.title),u=de(m,g,n),f=de(p.imageSrc,l.imageSrc,s.image),b=de(l.imageAlt,g,u),j=de(l.startDate,l.start,l.programStart,(Q=l.programPage)==null?void 0:Q.startDate),_=de(l.year,l.programYear,(P=l.programPage)==null?void 0:P.year),S=Po(s),I=Br(n,t),$=so(a.applicantCategory??(I==null?void 0:I.applicantCategory)),Z=(I==null?void 0:I.ownFlight)===!0||String((I==null?void 0:I.ownFlight)||"").toLowerCase()==="true",R=Eo($),L=Ji({category:$,ownFlight:!1}),H=Z?sn:0,me=Ji({category:$,ownFlight:Z}),re=Ft(I==null?void 0:I.totalPaidCents),pe=I?Ft(I.outstandingCents):Math.max(0,me-re),ee=Nr(I==null?void 0:I.activePlanId,t),Y=(t.ledger||[]).filter(K=>String(K.programId||"")===n).sort((K,G)=>String(G.createdAt||"").localeCompare(String(K.createdAt||""))),De=Qa(a,I,Y,S),Ie=re>0||Y.length>0||!!ee||De;return{programId:n,applicationId:String(a.applicationId||""),title:u,location:m,focus:g,imageSrc:f,imageAlt:b,startText:j,programYear:_,email:String(a.email||""),fullName:String(a.fullName||""),depositCents:S,applicantCategory:$,categoryDiscountCents:R,baseTotalDueCents:L,ownFlight:Z,flightCreditCents:H,totalDueCents:me,totalPaidCents:re,outstandingCents:pe,refundedCents:Ft(I==null?void 0:I.refundedCents),depositPaid:De,paidInFull:pe<=0&&me>0,activePlan:ee,paymentStarted:Ie,ledger:Y,summary:I}}).filter(Boolean)}function Ur(e){return`
    <div class="mpd-payments-pill-rail" role="tablist" aria-label="Approved program payments">
      ${e.map(t=>{const i=t.programId===mt,a=t.paidInFull?"Paid":t.activePlan?"Plan active":t.depositPaid?"Balance due":"Deposit due";return`<button type="button" class="mpd-payments-pill ${i?"is-active":""}" data-mpd-payment-program="${k(t.programId)}" aria-selected="${i?"true":"false"}">
            <strong>${k(t.title)}</strong>
            <span>${k(a)}</span>
          </button>`}).join("")}
    </div>
  `}function Rr(e){return e.ledger.length?`
    <div class="mpd-payments-history-list">
      ${e.ledger.map(t=>{const i=String(t.stripeReceiptUrl||"");return`<div class="mpd-payments-history-row">
            <span>${k(oa(t.createdAt)||"—")}</span>
            <strong>${k(String(t.paymentType||"payment").replace(/_/g," "))}</strong>
            <span>${Fe(t.amountCents)}</span>
            <span class="mpd-payment-status">${k(t.status||"recorded")}</span>
            ${i?`<a href="${oe(i)}" target="_blank" rel="noopener">Receipt</a>`:'<span class="studio-muted">Receipt pending</span>'}
          </div>`}).join("")}
    </div>
  `:'<div class="mpd-payments-empty"><h4>No payment history yet.</h4><p class="studio-muted">Receipts will appear here after your first program payment.</p></div>'}function Dr(e){if(!e)return"";const t=!!e.paymentStarted,i=a=>{const n=e.ownFlight===a,s=a?"I'll book my own flight":"Fusion will book my flight",l=a?"$800 credit":"Included in price",p=a?"$800 credit toward your residency balance.":"Round-trip flight booked by Fusion—no separate flight fee.";return`<button type="button" class="mpd-flight-option ${n?"is-selected":""}" data-mpd-flight-choice="${a?"own":"support"}" aria-pressed="${n?"true":"false"}" ${t?"disabled":""}>
      <span class="mpd-flight-option__icon" aria-hidden="true"><img src="${oe(Na)}" alt="" /></span>
      <span class="mpd-flight-option__copy">
        <strong>${k(s)}</strong>
        <small>${k(p)}</small>
      </span>
      <span class="mpd-flight-option__badge">${k(l)}</span>
    </button>`};return`<section class="mpd-flight-choice-card ${t?"is-locked":""}" aria-label="Flight booking choice">
    <div class="mpd-flight-choice-card__head">
      <div class="mpd-flight-choice-card__icon" aria-hidden="true"><img src="${oe(Na)}" alt="" /></div>
      <div>
        <p class="mpd-payments-eyebrow">Flight booking</p>
        <h3>Who will book your flight?</h3>
        <p class="studio-muted">Fusion can book your round-trip flight as part of your residency. If you book your own flight, you receive an $800 credit toward your program balance.</p>
      </div>
    </div>
    <div class="mpd-flight-options">
      ${i(!0)}
      ${i(!1)}
    </div>
    <div class="mpd-flight-choice-card__note">
      <strong>${e.ownFlight?"Flight credit applied":"Fusion flight booking included"}</strong>
      <span>${e.ownFlight?"The $800 credit is applied to your total residency price once you confirm your program slot.":`Your residency price of ${Fe(e.baseTotalDueCents)} includes Fusion booking your round-trip flight. There is no additional flight charge beyond this amount.`}</span>
      ${t?"<em>Flight choice is locked after payment activity starts.</em>":""}
    </div>
  </section>`}function fi(){var f;const e=document.getElementById("mpd_program_payments_workspace"),t=document.getElementById("mpd-program-tab-payments");if(!e||!t)return;const i=li,a=i.length>0;if(t.toggleAttribute("hidden",!a),t.setAttribute("aria-hidden",a?"false":"true"),!a){e.innerHTML='<div class="mpd-program-placeholder"><h3>Payments</h3><p class="studio-muted">Program payments appear after you are approved for a program.</p></div>',t.classList.contains("is-active")&&vt("my-programs");return}(!mt||!i.some(b=>b.programId===mt))&&(mt=((f=i.find(b=>!b.depositPaid||b.outstandingCents>0))==null?void 0:f.programId)||i[0].programId);const n=i.find(b=>b.programId===mt)||i[0],s=n.depositCents>0&&n.totalDueCents>0,l=io(),p=!!n.activePlan||l,m=n.activePlan?'<button type="button" class="studio-btn-primary" data-mpd-payment-action="cancel-plan">Cancel plan</button>':"",g=n.depositPaid?"":`<div class="mpd-payment-choice-grid">
        <article class="mpd-payment-choice-program">
          <div class="mpd-payment-choice-program__media">
            ${n.imageSrc?`<img src="${oe(n.imageSrc)}" alt="${oe(_t(n.imageAlt||n.title))}" loading="lazy" />`:'<div class="mpd-payment-choice-program__placeholder">Fusion</div>'}
          </div>
          <div class="mpd-payment-choice-program__copy">
            <p class="mpd-payments-eyebrow">Confirm your program slot</p>
            <h3>${k(n.title)}</h3>
            <p class="studio-muted">${k(n.focus||"Choose how you would like to pay.")}</p>
          </div>
        </article>
        <div class="mpd-payment-choice-stack">
          <article class="mpd-payment-choice mpd-payment-choice--deposit">
            <h4>Deposit</h4>
            <span class="mpd-payment-choice__amount">${Fe(n.depositCents)}</span>
            <p class="studio-muted">Secure your accepted program slot today. Remaining balance can be paid later.</p>
            <button type="button" class="studio-btn-primary" data-mpd-payment-action="deposit" ${s?"":"disabled"}>Pay deposit</button>
          </article>
          <article class="mpd-payment-choice mpd-payment-choice--full mpd-payment-choice--recommended">
            <span class="mpd-payment-recommended">Recommended</span>
            <h4>${n.ownFlight?"Total residency price (after flight credit)":"Full payment"}</h4>
            <span class="mpd-payment-choice__amount">${Fe(n.totalDueCents)}</span>
            <p class="studio-muted">Complete your program payment now. No payment plan needed.</p>
            <button type="button" class="studio-btn-primary" data-mpd-payment-action="full" ${s?"":"disabled"}>Pay in full</button>
          </article>
        </div>
      </div>`,u=n.depositPaid?`<div class="mpd-payments-action-grid${p?"":" mpd-payments-action-grid--single"}">
        <article class="mpd-payments-action-card mpd-payments-action-card--manual">
          ${Ye(Jo,"mpd-payments-action-card__icon mpd-payments-action-card__icon--manual")}
          <div class="mpd-payments-action-card__copy">
            <h4>Make a manual payment</h4>
            <p class="studio-muted">Pay any amount toward your outstanding balance.</p>
          </div>
          <button type="button" class="studio-btn-primary" data-mpd-payment-action="manual" ${n.outstandingCents<=0?"disabled":""}>Make a payment</button>
        </article>
        ${p?`<article class="mpd-payments-action-card mpd-payments-action-card--plan">
          ${Ye(Ba,"mpd-payments-action-card__icon mpd-payments-action-card__icon--plan")}
          <div class="mpd-payments-action-card__copy">
            <h4>${n.activePlan?"Payment plan active":"Start a payment plan"}</h4>
            <p class="studio-muted">${n.activePlan?"Cancel future installments if your plans change.":"Split the remaining balance into equal monthly payments."}</p>
          </div>
          ${m}
        </article>`:""}
      </div>
      <div class="mpd-payments-overview-grid">
        <div class="mpd-payments-overview-card mpd-payments-overview-card--paid">
          ${Ye(Gi,"mpd-payments-overview-card__icon")}
          <span>Total residency price</span>
          <strong>${Fe(n.totalDueCents)}</strong>
          <small>${n.ownFlight?"After $800 own-flight credit":"Includes Fusion flight booking"}</small>
        </div>
        ${n.categoryDiscountCents?`<div class="mpd-payments-overview-card mpd-payments-overview-card--outstanding">
          ${Ye(Gi,"mpd-payments-overview-card__icon")}
          <span>Veteran discount</span>
          <strong>-${Fe(n.categoryDiscountCents)}</strong>
          <small>Returning artist pricing</small>
        </div>`:""}
        <div class="mpd-payments-overview-card mpd-payments-overview-card--outstanding">
          ${Ye(bt,"mpd-payments-overview-card__icon")}
          <span>Flight credit</span>
          <strong>${n.flightCreditCents?`-${Fe(n.flightCreditCents)}`:"$0.00"}</strong>
          <small>${n.ownFlight?"Own-flight discount":"Fusion books your flight"}</small>
        </div>
        <div class="mpd-payments-overview-card mpd-payments-overview-card--upcoming">
          ${Ye(Ba,"mpd-payments-overview-card__icon")}
          <span>Total paid</span>
          <strong>${Fe(n.totalPaidCents)}</strong>
          <small>Across ${n.ledger.length} payments</small>
        </div>
        <div class="mpd-payments-overview-card mpd-payments-overview-card--refunded">
          ${Ye(Yo,"mpd-payments-overview-card__icon")}
          <span>Remaining balance</span>
          <strong>${Fe(n.outstandingCents)}</strong>
          <small>${n.outstandingCents>0?"Balance remaining":"Paid in full"}</small>
        </div>
      </div>
      <div class="mpd-payments-detail-grid">
        <section class="mpd-payments-panel">
          <div class="mpd-payments-section-head"><h4>Payment history</h4><span class="studio-muted">Receipts and status</span></div>
          ${Rr(n)}
        </section>
        <section class="mpd-payments-panel">
          <div class="mpd-payments-section-head"><h4>Upcoming payments</h4><span class="studio-muted">${n.activePlan?"Plan scheduled":"No active plan"}</span></div>
          ${n.activePlan?`<div class="mpd-upcoming-payment-card"><strong>${k(n.title)}</strong><span>${Fe(n.activePlan.installmentAmountCents)} monthly</span><small>${k(n.activePlan.installmentCount||"")} installments · ${k(n.activePlan.status||"active")}</small></div>`:'<div class="mpd-payments-empty"><h4>No upcoming payments.</h4><p class="studio-muted">Use manual payments to pay toward your balance.</p></div>'}
        </section>
      </div>`:"";e.innerHTML=`
    <div class="mpd-payments-shell">
      ${Ur(i)}
      ${Dr(n)}
      ${g}
      ${u}
    </div>
  `}async function gi(e){pi=Array.isArray(e)?e:[];let t;try{t=await Ya()}catch{t={approvedPrograms:[],summaries:[],ledger:[],plans:[]}}li=Fr(pi,t),fi()}function dn(){return li.find(e=>e.programId===mt)||li[0]||null}function Or(e,t){e&&(e.ownFlight=!!t,e.flightCreditCents=e.ownFlight?sn:0,e.totalDueCents=Ji({category:e.applicantCategory||"general",ownFlight:e.ownFlight}),e.outstandingCents=Math.max(0,e.totalDueCents-Ft(e.totalPaidCents)),e.paidInFull=e.outstandingCents<=0&&e.totalDueCents>0)}async function Hr(e){const t=dn();if(!t||t.paymentStarted)return;const i=e==="own";if(t.ownFlight===i)return;const a={ownFlight:t.ownFlight,flightCreditCents:t.flightCreditCents,totalDueCents:t.totalDueCents,outstandingCents:t.outstandingCents,paidInFull:t.paidInFull};Or(t,i),fi();try{await Rn({programId:t.programId,applicationId:t.applicationId,ownFlight:i})}catch(n){Object.assign(t,a),fi(),window.alert(n instanceof Error?n.message:String(n))}}function yi(){var e;(e=document.getElementById("mpdProgramPaymentModal"))==null||e.remove();try{document.body.style.overflow=""}catch{}}function ln(e,t){yi();const i=document.createElement("div");return i.id="mpdProgramPaymentModal",i.className="settings-profile-page profile-gallery-access-modal mpd-program-payment-modal",i.innerHTML=`
    <div class="profile-gallery-access-modal__scrim" data-mpd-payment-close aria-hidden="true"></div>
    <div class="profile-gallery-access-modal__panel mpd-program-payment-modal__panel" role="dialog" aria-modal="true" aria-labelledby="mpdProgramPaymentModalTitle">
      <button type="button" class="profile-gallery-access-modal__close" data-mpd-payment-close aria-label="Close payment modal">×</button>
      <h2 id="mpdProgramPaymentModalTitle" class="profile-gallery-access-modal__title">${k(e)}</h2>
      ${t}
    </div>
  `,document.body.appendChild(i),document.body.style.overflow="hidden",i.addEventListener("click",a=>{var s,l;a.target&&((l=(s=a.target).closest)==null?void 0:l.call(s,"[data-mpd-payment-close]"))&&yi()}),i}function qr(e="Loading payment"){return`<div class="mpd-payment-loading" role="status" aria-live="polite">
    <span class="mpd-payment-loading__spinner" aria-hidden="true"></span>
    <span class="mpd-payment-loading__text">${k(e)}</span>
  </div>`}async function ia(e,t,i){if(!e||i<=0)return;const a=await Je();if(!a.authenticated){window.alert("Sign in to make a program payment.");return}const s=ln(t==="deposit"?"Pay program deposit":t==="full_payment"?"Pay in full":"Make a manual payment",`<div class="mpd-program-payment-modal__body">
      <p class="studio-muted">${k(e.title)} · ${Fe(i)}</p>
      <div id="mpdProgramStripeMount" class="mpd-program-stripe-mount">${qr()}</div>
      <p id="mpdProgramPaymentError" class="mpd-membership-inline-error" hidden></p>
    </div>`),l=s.querySelector("#mpdProgramPaymentError"),p=s.querySelector("#mpdProgramStripeMount");try{const[m,g,u,f]=await Promise.all([xe(()=>import("./index-29c64bdd.js").then($=>$.fY),["assets/index-29c64bdd.js","assets/index-526714d8.css"]),xe(()=>import("./index-29c64bdd.js").then($=>$.fX),["assets/index-29c64bdd.js","assets/index-526714d8.css"]),xe(()=>import("./index-29c64bdd.js").then($=>$.g1),["assets/index-29c64bdd.js","assets/index-526714d8.css"]),xe(()=>import("./index-29c64bdd.js").then($=>$.g2),["assets/index-29c64bdd.js","assets/index-526714d8.css"])]),b=g.getPayPalClientIdResolved();if(!b)throw new Error("Configure PayPal client ID in Studio → Services.");const j=await f.fetchPaymentConfig(),_=a.principal.toText(),S=$=>{l instanceof HTMLElement&&(l.hidden=!1,l.textContent=$ instanceof Error?$.message:String($))},I=async $=>{await m.confirmPayPalOneTimePayment($),yi(),await gi(pi)};p&&(p.textContent="",await u.mountPayPalAdvancedOneTimeCheckout(p,{clientId:b,mode:j.mode==="live"?"live":"sandbox",amountCents:i,metadata:{programId:e.programId,purpose:t},createOrder:async()=>m.createPayPalOneTimePayment({principal:_,programId:e.programId,applicationId:e.applicationId,email:e.email,applicantName:e.fullName,paymentType:t,amountCents:i,totalDueCents:e.totalDueCents,depositAmountCents:e.depositCents,ownFlight:e.ownFlight,flightCreditCents:e.flightCreditCents}),onApproved:I,onError:S,showPayNowButton:!0,payNowLabel:"Pay now",onPayNowClick:async $=>{await $()}}))}catch(m){l instanceof HTMLElement&&(l.hidden=!1,l.textContent=m instanceof Error?m.message:String(m))}}function Wr(e){var a;if(!e)return;const t=ln("Make a manual payment",`<div class="mpd-program-payment-modal__body">
      <p class="studio-muted">${k(e.title)} · outstanding ${Fe(e.outstandingCents)}</p>
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
    </div>`),i=t.querySelector("#mpdManualPaymentAmount");t.querySelectorAll('input[name="mpdManualPaymentMode"]').forEach(n=>{n.addEventListener("change",()=>{const s=String((t.querySelector('input[name="mpdManualPaymentMode"]:checked')||{}).value||"custom");i&&(i.value=s==="remaining"?(e.outstandingCents/100).toFixed(2):i.value,i.readOnly=s==="remaining")})}),(a=t.querySelector("#mpdManualPaymentContinue"))==null||a.addEventListener("click",()=>{const n=Math.min(e.outstandingCents,Math.round(Number((i==null?void 0:i.value)||0)*100));if(n<50){window.alert("Enter at least $0.50.");return}yi(),ia(e,"manual",n)})}function Vr(e){if(e){window.alert("Payment plans are temporarily unavailable. Use Make a manual payment toward your balance.");return}}async function Jr(e){if(e!=null&&e.activePlan&&window.confirm("Cancel this payment plan? Future scheduled installments will stop."))try{const t=await xe(()=>import("./index-29c64bdd.js").then(n=>n.fY),["assets/index-29c64bdd.js","assets/index-526714d8.css"]),i=String(e.activePlan.paymentProvider||"stripe").toLowerCase(),a=String(e.activePlan.paypalSubscriptionId||"").trim();i==="paypal"||a?await t.cancelPayPalProgramPaymentPlan({planId:String(e.activePlan.id||""),subscriptionId:a}):await t.cancelProgramPaymentPlan({planId:String(e.activePlan.id||""),subscriptionId:String(e.activePlan.stripeSubscriptionId||"")}),await gi(pi)}catch(t){window.alert(t instanceof Error?t.message:String(t))}}function Yr(e){return!!(e&&typeof e=="object"&&!Array.isArray(e))}function Gr(){const e=document.getElementById("mpdResidencyComingSoonModal");e&&(document.body.appendChild(e),e.hidden=!1,e.setAttribute("aria-hidden","false"))}function ji(){const e=document.getElementById("mpdResidencyComingSoonModal");e&&(e.hidden=!0,e.setAttribute("aria-hidden","true"))}function zr(){const e=document.getElementById("mpdMembershipCancelModal");e&&(document.body.appendChild(e),e.hidden=!1,e.setAttribute("aria-hidden","false"))}function hi(){const e=document.getElementById("mpdMembershipCancelModal");e&&(e.hidden=!0,e.setAttribute("aria-hidden","true"))}function Qr(){const e=document.getElementById("mpdMembershipChangePlanModal");e&&(document.body.appendChild(e),e.hidden=!1,e.setAttribute("aria-hidden","false"))}function St(){const e=document.getElementById("mpdMembershipChangePlanModal");e&&(e.hidden=!0,e.setAttribute("aria-hidden","true"))}function Kr(e){const t=document.getElementById("mpdMembershipChangePlanOptions"),i=document.getElementById("mpdMembershipChangePlanError"),a=document.getElementById("mpdMembershipChangePlanConfirm");if(i&&(i.hidden=!0,i.textContent=""),!t)return;t.replaceChildren();const n=st(e);ri="";const s=(p,m,g,u="")=>{const f=st(p);if(!f||!si[f])return;const b=si[f],j=`mpdMembershipChangePlan_${f}`,_=document.createElement("label");_.className="mpd-membership-change-plan-option",m&&_.classList.add("mpd-membership-change-plan-option--current"),_.setAttribute("for",j),_.innerHTML=`
      <input type="radio" name="mpdMembershipChangePlanTier" id="${j}" value="${oe(f)}"${m?" disabled":""}${g?" checked":""} />
      <span class="mpd-membership-change-plan-option__main">
        <strong>${oe(b.label)}${m?" (current)":""}</strong>
        <span class="studio-muted">${oe(b.priceLine)} — ${oe(b.entitlement)}</span>
      </span>
      ${u?`<span class="mpd-membership-change-plan-option__kind">${oe(u)}</span>`:""}
    `,t.appendChild(_);const S=_.querySelector("input");S==null||S.addEventListener("change",()=>{S instanceof HTMLInputElement&&S.checked&&!S.disabled&&(ri=f)}),g&&!m&&(ri=f)};n&&s(n,!0,!0);let l=!0;for(const p of Dn(n)){const m=p.kind==="upgrade"?"Upgrade":p.kind==="downgrade"?"Downgrade":"";s(p.tier,!1,l,m),l&&(l=!1)}if(a){const p=String((Te==null?void 0:Te.provider)||"").toLowerCase();a.textContent=p==="paypal"?"Continue with PayPal":"Continue"}}function Xr(){const e=document.getElementById("mpdMembershipChangePlanModal");if(!e||e.dataset.mpdChangePlanModalWired==="1")return;e.dataset.mpdChangePlanModalWired="1";const t=e.querySelector(".profile-gallery-access-modal__scrim"),i=e.querySelector("#mpdMembershipChangePlanCancel");t==null||t.addEventListener("click",St),i==null||i.addEventListener("click",St),window.addEventListener("keydown",a=>{a.key==="Escape"&&e&&!e.hidden&&St()})}let ct="",ot="",Te=null,ri="",Bt="monthly";function Zr(e,t=0){const i=st(e),a=["Profile on the public site","Member benefits and updates"];return i==="monthly"?a.unshift("Application fee $35 per submission"):i==="quarterly"?(a.unshift("One application credit per quarter; unused credits roll over"),t>0&&a.push(`${t} application credit${t===1?"":"s"} available now`)):i==="annual"?a.unshift("Applications included while membership is active"):i==="bimonthly"?(a.unshift("Legacy bi-monthly billing"),a.push("New plans are Monthly, Quarterly, or Annual")):a.unshift("Application submission"),a}function Fi(e){const t=st(e),i=t&&si[t]?si[t]:null;return{label:(i==null?void 0:i.label)||"Membership",priceLine:(i==null?void 0:i.priceLine)||"—",legacyNote:t==="bimonthly"?"New plans are Monthly, Quarterly, or Annual.":""}}function Oa(e="membershipPlanUpdated"){if(typeof window>"u")return"";const t=window.location.pathname||"/settings/profile";return`${window.location.origin}${t}?${e}=1#membership`}function Ui(){try{if(typeof window>"u")return;const e=new URL(window.location.href);e.searchParams.delete("membershipPlanUpdated"),e.searchParams.delete("membershipPlanChangeCancelled"),history.replaceState(null,"",`${e.pathname}${e.search}${e.hash}`)}catch{}}function Ri(e,t,i=0){if(e){e.replaceChildren();for(const a of Zr(t,i)){const n=document.createElement("li");n.className="mpd-membership-checklist__item",n.textContent=a,e.appendChild(n)}}}function Ze(e){const t=String(e||"").trim();return t.includes("@")&&t.length>=5}async function Ha(){if(ot&&Ze(ot))return ot.trim();try{const i=await qi(),a=String((i==null?void 0:i.email)||"").trim();if(Ze(a))return ot=a,a}catch{}try{const i=await Je();if(i.authenticated){const{getStoredBillingEmailForPrincipal:a}=await xe(()=>import("./index-29c64bdd.js").then(s=>s.fY),["assets/index-29c64bdd.js","assets/index-526714d8.css"]),n=String(a(i.principal.toText())||"").trim();if(Ze(n))return ot=n,n}}catch{}const e=Va(),t=String(e.email||"").trim();return Ze(t)?(ot=t,t):""}function Di(e=ot){const t=document.getElementById("settingsProfileNavContactEmailWrap"),i=document.getElementById("settingsProfileNavContactEmail");if(!t||!(i instanceof HTMLInputElement))return;const a=Ze(e);t.hidden=a,a?(i.value=e.trim(),i.removeAttribute("required")):(i.value.trim()||(i.value=""),i.setAttribute("required","required"))}function es(){const e=document.getElementById("mpdSaveChoiceModal");if(!e)return;document.body.appendChild(e),e.hidden=!1,e.setAttribute("aria-hidden","false");const t=e.querySelector("#mpdSaveChoiceTranslate"),i=e.querySelector("#mpdSaveChoiceTranslateNote"),a=ct==="needsSubscription";t&&(t.disabled=a,t.setAttribute("aria-disabled",a?"true":"false")),i&&(i.textContent=a?"Translation needs an active membership. Use Just save to update your profile without translation.":"",i.toggleAttribute("hidden",!a))}function Oi(){const e=document.getElementById("mpdSaveChoiceModal");e&&(e.hidden=!0,e.setAttribute("aria-hidden","true"))}function ts(){const e=document.getElementById("mpdSaveChoiceModal");if(!e||e.dataset.mpdSaveChoiceModalWired==="1")return;e.dataset.mpdSaveChoiceModalWired="1";const t=e.querySelector(".profile-gallery-access-modal__scrim"),i=e.querySelector("#mpdSaveChoiceCancel"),a=e.querySelector("#mpdSaveChoiceJustSave"),n=e.querySelector("#mpdSaveChoiceTranslate"),s=()=>{Oi(),window.dispatchEvent(new CustomEvent("fusion-settings-profile-save-choice",{detail:{action:"cancel"}}))};t==null||t.addEventListener("click",s),i==null||i.addEventListener("click",s),a==null||a.addEventListener("click",()=>{Oi(),window.dispatchEvent(new CustomEvent("fusion-settings-profile-save-choice",{detail:{action:"save",translate:!1}}))}),n==null||n.addEventListener("click",()=>{Oi(),window.dispatchEvent(new CustomEvent("fusion-settings-profile-save-choice",{detail:{action:"save",translate:!0}}))}),window.addEventListener("keydown",l=>{l.key==="Escape"&&e&&!e.hidden&&s()})}function is(){const e=document.getElementById("mpdMembershipCancelModal");if(!e||e.dataset.mpdMembershipModalWired==="1")return;e.dataset.mpdMembershipModalWired="1";const t=e.querySelector(".profile-gallery-access-modal__scrim");t==null||t.addEventListener("click",hi),window.addEventListener("keydown",i=>{i.key==="Escape"&&e&&!e.hidden&&hi()})}function as(){const e=document.getElementById("mpdResidencyComingSoonModal");if(!e||e.dataset.mpdResidencyModalWired==="1")return;e.dataset.mpdResidencyModalWired="1";const t=e.querySelector(".profile-gallery-access-modal__scrim"),i=e.querySelector(".profile-gallery-access-modal__close");t==null||t.addEventListener("click",ji),i==null||i.addEventListener("click",ji),window.addEventListener("keydown",a=>{a.key==="Escape"&&e&&!e.hidden&&ji()})}async function ns(e,t,i){const a=document.getElementById("mpd_programs_list");if(!a)return;let n={};try{const f=e.applied_json??e.appliedJson;f&&(n=typeof f=="string"?JSON.parse(f):f),(!n||typeof n!="object")&&(n={})}catch{n={}}let s=[];try{s=await na()}catch{s=[]}a.replaceChildren();const l=Object.keys(n).filter(Boolean),p=document.getElementById("mpd_my_programs_count");if(p&&(p.textContent=String(l.length),p.toggleAttribute("hidden",l.length===0),p.setAttribute("aria-label",`${l.length} applications`)),l.length===0){a.innerHTML=`
      <div class="mpd-programs-empty-state mpd-my-program-empty">
        <h4>No applications yet.</h4>
        <p class="studio-muted">When you apply to a Fusion program, your status and next steps will appear here.</p>
      </div>
    `,await gi(s);return}let m={approvedPrograms:[],summaries:[],ledger:[],plans:[]};try{m=await Ya()}catch{}const g=jr(m),u=l.map(f=>{const b=s.find(j=>String(j.id)===String(f))||{id:f,enCard:{focus:f}};return Mr(b,f,{...wt(n[f]),slotSecured:g.has(String(f))})}).sort((f,b)=>String(b.submittedAt||"").localeCompare(String(f.submittedAt||"")));a.innerHTML=`
    <div class="mpd-my-program-cards">
      ${u.map(xr).join("")}
    </div>
    <div id="mpd_my_programs_no_results" class="mpd-programs-empty-state mpd-my-program-empty" hidden>
      <h4>No applications match this filter.</h4>
      <p class="studio-muted">Choose another status to see more applications.</p>
    </div>
  `;for(const f of document.querySelectorAll("[data-mpd-my-program-filter]")){const b=f.getAttribute("data-mpd-my-program-filter")||"all",j=b==="all"?u.length:u.filter(S=>S.status.key===b).length,_=f.querySelector(".mpd-my-program-filter__count");_&&(_.textContent=String(j))}rn(),await gi(s)}async function os(){const e=document.getElementById("mpd_public_programs_all");if(!e)return;let t=[];try{t=await na()}catch{t=[]}const i=t.filter(p=>ao(p.visibility)==="public");if(e.replaceChildren(),i.length===0){e.innerHTML=`
      <div class="mpd-programs-empty-state">
        <h4>No public programs are listed yet.</h4>
        <p class="studio-muted">When Fusion publishes new public opportunities, they will appear here.</p>
      </div>
    `;return}const a=document.createElement("div");a.className="mpd-public-programs-grid";const n=new Set;for(const p of i){const m=p!=null&&p.enCard&&typeof p.enCard=="object"?p.enCard:{},g=p!=null&&p.jaCard&&typeof p.jaCard=="object"?p.jaCard:{},u=Ce(m.focus??m.headline),f=Ce(m.location)||Ce(m.headline),b=f||u||Ce(m.headline)||Ce(p.id),j=Ce(m.startDate),_=Ce(m.endDate),S=Ce(m.year),I=de(m.openTo,m.audience,m.eligibility,m.discipline,m.medium),$=de(m.deadline,m.applicationDeadline,m.deadlineDate,m.applyBy,j&&_?`${j} - ${_}`:j||_,S),Z=de(m.category,m.type,u),R=Z.toLowerCase().replace(/\s+/g,"-");Z&&n.add(Z);const L=Ce(p==null?void 0:p.studioStatus).toLowerCase(),H=de(g.imageSrc,m.imageSrc),me=Ce(m.imageAlt??m.focus??b)||b;let re="/programs";if(p!=null&&p.routeLink){const te=String(p.routeLink);re=te.startsWith("/")?te:`/${te}`}const pe=document.createElement("article");pe.className="mpd-public-program-card mpd-public-program-card--rich",pe.dataset.status=L||"unknown",pe.dataset.category=R,pe.dataset.search=[b,u,f,I,$,Z,p==null?void 0:p.id,re,L].filter(Boolean).join(" ");const ee=document.createElement("a");ee.className="mpd-public-program-card__link-rich",ee.href=re,ee.target="_blank",ee.rel="noopener noreferrer";const Y=document.createElement("div");Y.className="mpd-public-program-card__image-wrap";const De=document.createElement("div");if(De.className="mpd-public-program-card__focus",De.textContent=Z||u||"Program",Y.appendChild(De),H){const te=document.createElement("img");te.className="mpd-public-program-card__img",te.src=String(H),te.alt=_t(me),te.loading="lazy",Y.appendChild(te)}else{const te=document.createElement("div");te.className="mpd-public-program-card__placeholder",te.textContent="Fusion",Y.appendChild(te)}ee.appendChild(Y);const Ie=document.createElement("div");Ie.className="mpd-public-program-card__body";const Q=document.createElement("div");Q.className="mpd-public-program-card__title",Q.textContent=b||f,Ie.appendChild(Q);const P=document.createElement("div");P.className="mpd-public-program-card__meta";const K=(te,dt)=>{const Oe=Ce(dt);if(!Oe)return;const Ee=document.createElement("p");Ee.className="mpd-public-program-card__meta-row",Ee.innerHTML=`<strong>${k(te)}:</strong> ${k(Oe)}`,P.appendChild(Ee)};K("Program",u),K("Open to",I),K("Deadline",$),P.childElementCount&&Ie.appendChild(P);const G=document.createElement("span");G.className="mpd-public-program-card__cta",G.textContent="View details ->",Ie.appendChild(G),ee.appendChild(Ie),pe.appendChild(ee),a.appendChild(pe)}const s=document.getElementById("mpd_public_programs_filter");if(s){const p=s.value||"all",m=Array.from(n).sort((g,u)=>g.localeCompare(u)).map(g=>{const u=`category:${g.toLowerCase().replace(/\s+/g,"-")}`;return`<option value="${k(u)}">${k(g)}</option>`}).join("");s.innerHTML=`
      <option value="all">All programs</option>
      <option value="open">Open now</option>
      <option value="not-open">Not open yet</option>
      ${m}
    `,s.value=Array.from(s.options).some(g=>g.value===p)?p:"all"}e.appendChild(a);const l=document.createElement("div");l.id="mpd_public_programs_no_results",l.className="mpd-programs-empty-state",l.hidden=!0,l.innerHTML=`
    <h4>No programs match your search.</h4>
    <p class="studio-muted">Try a different keyword or clear the filter to see all public programs.</p>
  `,e.appendChild(l),ta()}async function rs(){const e=document.getElementById("mpd_apply_residency");if(!e)return;let t=[];try{t=await na()}catch{t=[]}const i=di.split("/").filter(Boolean).pop()||"",a=t.find(l=>String(l.routeLink||"").toLowerCase().includes("kaga"))||t.find(l=>String(l.routeLink||"").split("/").filter(Boolean).pop()===i)||null;let n=di;if(a!=null&&a.routeLink){const l=String(a.routeLink);n=l.startsWith("/")?l:`/${l}`}e.dataset.programPath=n;let s=!0;a&&(s=String(a.studioStatus??"").toLowerCase()==="open"),e.dataset.applyOpen=s?"true":"false",e.textContent=s?"Apply to Residency":"Coming soon",e.classList.toggle("mpd-residency-cta--closed",!s)}function ps(){const e='<div class="member-profile-dashboard__card-footer"><button type="button" class="mpd-section-save mpd-section-save--primary">Save</button></div>',t='<div class="member-profile-dashboard__card-footer"><button type="button" class="mpd-section-save mpd-section-save--primary" id="mpd_story_save">Save</button></div>',i=[0,1,2].map(u=>{const f=["5:4","1:1","16:9"][u]||"5:4";return`
                        <div class="member-profile-dashboard__intro-slot member-profile-dashboard__intro-slot--${String(u+1)}">
                            <div class="member-profile-dashboard__intro-preview-col">
                                <input type="hidden" id="mpd_intro_${u}_src" />
                                <input type="hidden" id="mpd_intro_${u}_alt" />
                                <input type="hidden" id="mpd_intro_${u}_caption" />
                                <input type="file" id="mpd_intro_${u}_file" class="mpd-file-input-hidden" accept="image/*" data-intro-slot="${String(u)}" />
                                <div class="member-profile-dashboard__intro-preview-wrap mpd-media-upload-surface" data-mpd-media-surface="intro-${u}">
                                    <label for="mpd_intro_${u}_file" class="mpd-media-upload-label" aria-label="Upload introductory work image ${String(u+1)}">
                                        <div class="mpd-media-spinner" id="mpd_intro_${u}_spinner" hidden aria-hidden="true"></div>
                                        <img id="mpd_intro_${u}_thumb" class="member-profile-dashboard__intro-thumb" alt="${_t("Profile intro artwork preview")}" style="display:none" />
                                        <span class="mpd-media-placeholder mpd-media-placeholder--detailed" aria-hidden="true">
                                            <strong>Add Image</strong>
                                            <small>${f} ratio &middot; JPG &middot; Max 1 MB</small>
                                        </span>
                                        <span class="mpd-media-overlay" aria-hidden="true">
                                            <span class="mpd-media-overlay__empty">Upload</span>
                                            <span class="mpd-media-overlay__filled">Replace</span>
                                            <small class="mpd-media-overlay__ratio">Suggested ${f}</small>
                                        </span>
                                    </label>
                                    <button type="button" class="mpd-media-delete" data-mpd-media-delete="intro-${u}">Delete</button>
                            </div>
                            </div>
                        </div>`}).join(""),a=Ut?`<button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="dev">${Ae("artist-system-info")}<span class="studio-nav-item__label">Developer</span></button>`:"",n=Ut?`<div class="mpd-panel" id="mpd-panel-dev" data-mpd-panel="dev" hidden>
                    <section class="member-profile-dashboard__card">
                        <details id="mpd-dev">
                            <summary style="cursor:pointer;font-variation-settings:var(--fv-subtitle)">Developer — raw locales JSON</summary>
                            <textarea id="mpd_dev_json" class="studio-textarea studio-textarea-mono" rows="14" readonly spellcheck="false" style="margin-top:0.75rem;width:100%"></textarea>
                        </details>
                        ${e}
                    </section>
                </div>`:"",s=Vi("assist-refine"),l=s?`<img src="${oe(s)}" alt="" />`:'<span aria-hidden="true">✎</span>',p=Vi("assist-copy"),m=p?`<img src="${oe(p)}" alt="" class="mpd-user-id__copy-icon" />`:'<span class="mpd-user-id__copy-icon-fallback" aria-hidden="true">⧉</span>',g=u=>{const f=u==="sidebar"?{wrap:"settingsProfileUserIdWrap",value:"settingsProfileUserId",copy:"settingsProfileCopyUserId"}:{wrap:"settingsProfileMainUserIdWrap",value:"settingsProfileMainUserId",copy:"settingsProfileMainUserIdCopy"};return`<div class="mpd-user-id mpd-user-id--${u}" id="${f.wrap}" hidden>
                    <span class="mpd-user-id__label">User ID</span>
                    <div class="mpd-user-id__row">
                        <code class="mpd-user-id__value" id="${f.value}" tabindex="0" role="button" title="Click to copy User ID">—</code>
                        <button type="button" class="mpd-user-id__copy-btn" id="${f.copy}" aria-label="Copy User ID">${m}</button>
                    </div>
                </div>`};return`
        <div class="page settings-profile-page">
            <app-join-network
                id="joinNetworkHeaderBridge"
                data-modal-type="membership"
                data-header-bridge="true"
                context="settings-profile"
                active="true"
            ></app-join-network>
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
                <nav class="studio-nav" id="settingsProfileNav" aria-label="Profile sections">
                    <button type="button" class="studio-nav-item mpd-nav-btn is-active" data-mpd-panel="studio-overview">${Ae("artist-overview")}<span class="studio-nav-item__label" data-mpd-i18n="studio-overview">${Qe("studio-overview")}</span></button>
                    <button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="identity">${Ae("artist-identity")}<span class="studio-nav-item__label" data-mpd-i18n="identity">${Qe("identity")}</span></button>
                    <button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="work">${Ae("nav-products")}<span class="studio-nav-item__label" data-mpd-i18n="work">${Qe("work")}</span></button>
                    <button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="programs">${Ae("nav-programs")}<span class="studio-nav-item__label" data-mpd-i18n="programs">${Qe("programs")}</span></button>
                    <button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="media">${Ae("nav-content")}<span class="studio-nav-item__label" data-mpd-i18n="media">${Qe("media")}</span></button>
                    <button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="journal">${Ae("nav-journal")}<span class="studio-nav-item__label" data-mpd-i18n="journal">${Qe("journal")}</span></button>
                    <button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="settings">${Ae("nav-settings")}<span class="studio-nav-item__label" data-mpd-i18n="settings">${Qe("settings")}</span></button>
                    ${a}
                    <div class="mpd-sidebar-cta-row" aria-label="Profile quick actions">
                        <a class="program-intro-cta mpd-program-intro-cta mpd-sidebar-cta" id="mpd_view_profile" href="#" target="_blank" rel="noopener noreferrer">View public profile &rarr;</a>
                        <button type="button" class="program-intro-cta mpd-program-intro-cta mpd-sidebar-cta" id="mpd_apply_residency" data-program-path="${di}" data-apply-open="true">Apply to Residency &rarr;</button>
                        <button type="button" class="program-intro-cta mpd-program-intro-cta mpd-sidebar-cta mpd-sidebar-cta--become-member" id="mpd_become_member" hidden>Become a member</button>
                    </div>
                    <div class="mpd-application-only-toggle" id="mpdApplicationOnlyToggleWrap" hidden>
                        <label class="mpd-application-only-toggle__label">
                            <input type="checkbox" id="mpdApplicationOnlyToggle" />
                            <span>Application only display</span>
                        </label>
                    </div>
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
                </nav>
                ${g("sidebar")}
            </aside>
            <div class="studio-workspace">
                <header class="studio-topbar">
                    <button type="button" class="studio-menu-btn" id="settingsProfileMenuBtn" aria-label="Open navigation menu" aria-expanded="false" aria-controls="settingsProfileNav">
                        <span class="studio-menu-btn__bars" aria-hidden="true"></span>
                    </button>
                    <h1 id="settingsProfileHeading" data-mpd-i18n="your-studio">Studio</h1>
                </header>
                <div class="studio-main settings-profile-main" id="settingsProfileScrollMain">
                <p id="settingsProfileStatus" class="member-profile-dashboard__status-line" role="status"></p>
                <div id="settingsProfileInitialLoading" class="mpd-initial-loading" role="status" aria-live="polite">
                    <div class="mpd-initial-loading__spinner" aria-hidden="true"></div>
                    <p>Loading profile settings...</p>
                </div>
                <div class="mpd-settings-shout shoutHeadline" id="settingsProfileShout">
                    Your creative space.<br />Shape your presence.
                </div>
                <p id="settingsProfileHint" class="studio-muted mpd-settings-hint"></p>
                ${g("main")}
                <div id="settingsProfileAccountRecovery" class="mpd-account-recovery" hidden>
                    <p class="mpd-account-recovery__lead">If you already paid or completed setup with a different login, contact Fusion support with your checkout email and User ID above to receive a recovery code.</p>
                    <button type="button" class="mpd-account-recovery__toggle" id="settingsProfileRecoverToggle">Enter recovery code</button>
                    <div id="settingsProfileRecoverPanel" class="mpd-account-recovery__panel" hidden>
                        <p class="mpd-account-recovery__notice">Enter the 8-digit recovery code Fusion support sent you.</p>
                        <div class="mpd-account-recovery__row">
                            <label class="studio-sr-only" for="settingsProfileRecoveryCode">Recovery code</label>
                            <input type="text" id="settingsProfileRecoveryCode" class="studio-input mpd-account-recovery__input" inputmode="numeric" maxlength="8" pattern="[0-9]*" autocomplete="one-time-code" placeholder="8-digit code" />
                            <button type="button" class="studio-btn-primary" id="settingsProfileRecoverySubmit">Recover</button>
                        </div>
                        <p id="settingsProfileRecoveryStatus" class="mpd-account-recovery__status studio-muted" role="status"></p>
                    </div>
                </div>
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
                        <!-- ═══ STUDIO OVERVIEW ═══ -->
                        <div class="mpd-panel mpd-panel--studio-overview" id="mpd-panel-studio-overview" data-mpd-panel="studio-overview">
                          <div class="mpd-overview-layout">
                            <div class="mpd-overview-middle">
                                <p id="mpd_datasource_pill" class="member-profile-dashboard__pill" style="display:none;margin-top:0;margin-bottom:0.75rem"></p>

                                <div class="mpd-completion-card" id="mpd_completion_card">
                                    <div class="mpd-completion-card__head">
                                        <span class="mpd-completion-label">PROFILE COMPLETION</span>
                                        <span class="mpd-completion-pill" id="mpd_completion_pill">Profile Incomplete</span>
                                    </div>
                                    <div class="mpd-completion-bar-row">
                                        <div class="mpd-completion-bar">
                                            <div class="mpd-completion-bar__fill" id="mpd_completion_fill" style="width:0%"></div>
                                        </div>
                                        <span class="mpd-completion-pct" id="mpd_completion_pct">0% complete</span>
                                    </div>
                                    <div class="mpd-completion-steps" id="mpd_completion_steps">
                                        <div class="mpd-completion-step" data-step="identity">
                                            <span class="mpd-completion-step__marker">1</span>
                                            <span class="mpd-completion-step__label">Presence</span>
                                            <span class="mpd-completion-step__status">Not started</span>
                                        </div>
                                        <div class="mpd-completion-step" data-step="work">
                                            <span class="mpd-completion-step__marker">2</span>
                                            <span class="mpd-completion-step__label">Work</span>
                                            <span class="mpd-completion-step__status">Not started</span>
                                        </div>
                                        <div class="mpd-completion-step" data-step="programs">
                                            <span class="mpd-completion-step__marker">3</span>
                                            <span class="mpd-completion-step__label">Programs</span>
                                            <span class="mpd-completion-step__status">Not started</span>
                                        </div>
                                        <div class="mpd-completion-step" data-step="media">
                                            <span class="mpd-completion-step__marker">4</span>
                                            <span class="mpd-completion-step__label">Media</span>
                                            <span class="mpd-completion-step__status">Not started</span>
                                        </div>
                                        <div class="mpd-completion-step" data-step="preview">
                                            <span class="mpd-completion-step__marker">5</span>
                                            <span class="mpd-completion-step__label">Profile</span>
                                            <span class="mpd-completion-step__status">Not started</span>
                                        </div>
                                    </div>
                    </div>

                                <div class="mpd-blindspots" id="mpd_blindspots">
                                    <span class="mpd-section-label">BLINDSPOTS</span>
                                    <div class="mpd-blindspots-grid" id="mpd_blindspots_grid"></div>
                                </div>

                                <div class="mpd-studio-sections">
                                    <span class="mpd-section-label">STUDIO SECTIONS</span>
                                    <div class="mpd-sections-grid">
                                        <div class="mpd-section-card mpd-nav-btn" data-mpd-panel="identity">
                                            <div class="mpd-section-card__text">
                                                ${Ae("artist-identity")}
                                                <strong>Identity &amp; Presence</strong>
                                                <p>Name, bio, status, and the story behind your work.</p>
                                                <span class="mpd-section-card__link">EDIT SECTION &rarr;</span>
                                            </div>
                                            <div class="mpd-section-card__img"><img src="${Go}" alt="" loading="lazy" /></div>
                                        </div>
                                        <div class="mpd-section-card mpd-nav-btn" data-mpd-panel="work">
                                            <div class="mpd-section-card__text">
                                                ${Ae("nav-products")}
                                                <strong>Work &amp; Projects</strong>
                                                <p>Portfolio, projects, and the pieces that define your practice.</p>
                                                <span class="mpd-section-card__link">MANAGE &rarr;</span>
                                            </div>
                                            <div class="mpd-section-card__img"><img src="${zo}" alt="" loading="lazy" /></div>
                                        </div>
                                        <div class="mpd-section-card mpd-nav-btn" data-mpd-panel="programs">
                                            <div class="mpd-section-card__text">
                                                ${Ae("nav-programs")}
                                                <strong>Exhibitions &amp; Programs</strong>
                                                <p>Explore, apply, and manage your program participation.</p>
                                                <span class="mpd-section-card__link">MANAGE &rarr;</span>
                                            </div>
                                            <div class="mpd-section-card__img"><img src="${Qo}" alt="" loading="lazy" /></div>
                                        </div>
                                        <div class="mpd-section-card mpd-nav-btn" data-mpd-panel="media">
                                            <div class="mpd-section-card__text">
                                                ${Ae("nav-content")}
                                                <strong>Media Library</strong>
                                                <p>Main artwork, profile card, intro gallery, and audio.</p>
                                                <span class="mpd-section-card__link">EDIT SECTION &rarr;</span>
                                            </div>
                                            <div class="mpd-section-card__img"><img src="${Ko}" alt="" loading="lazy" /></div>
                                        </div>
                                        <div class="mpd-section-card mpd-nav-btn" data-mpd-panel="journal">
                                            <div class="mpd-section-card__text">
                                                ${Ae("nav-journal")}
                                                <strong>Journal / Notes</strong>
                                                <p>Creative journal entries, reflections, and notes.</p>
                                                <span class="mpd-section-card__link">MANAGE &rarr;</span>
                                            </div>
                                            <div class="mpd-section-card__img"><img src="${Xo}" alt="" loading="lazy" /></div>
                                        </div>
                                        <a class="mpd-section-card mpd-section-card--link" id="mpd_overview_profile_card" href="#" target="_blank" rel="noopener noreferrer">
                                            <div class="mpd-section-card__text">
                                                ${Ae("artist-profile-link")}
                                                <strong>Profile</strong>
                                                <p>See how visitors experience your public profile.</p>
                                                <span class="mpd-section-card__link">VIEW PROFILE &rarr;</span>
                                            </div>
                                            <div class="mpd-section-card__img"><img src="${Zo}" alt="" loading="lazy" /></div>
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <aside class="mpd-overview-right">
                                <div class="mpd-publish-card">
                                    <span class="mpd-section-label">PUBLISH SETTINGS</span>
                                    <label class="mpd-publish-select-wrap">
                                        <span class="mpd-publish-select-label">Visibility</span>
                                        <select id="mpd_overview_visibility" class="mpd-publish-select studio-input" aria-label="Profile visibility">
                                            <option value="inactive">Inactive</option>
                                            <option value="private">Private</option>
                                            <option value="public">Public</option>
                                    </select>
                                </label>
                                    <span id="mpd_overview_visibility_review" class="mpd-visibility-review-notice" hidden>Submitted for review</span>
                                    <button type="button" class="mpd-publish-save" id="mpd_overview_publish_save">PUBLISH PROFILE</button>
                                </div>

                                <div class="mpd-preview-card" id="mpd_overview_preview">
                                    <div class="mpd-preview-card__image" id="mpd_overview_preview_img"></div>
                                    <div class="mpd-preview-card__body">
                                        <strong id="mpd_overview_preview_name">—</strong>
                                        <span class="mpd-preview-card__role" id="mpd_overview_preview_discipline">—</span>
                                        <span class="mpd-preview-card__location" id="mpd_overview_preview_location">—</span>
                                    </div>
                                    <a class="mpd-preview-card__link" id="mpd_overview_view_profile" href="#" target="_blank" rel="noopener noreferrer">VIEW FULL PROFILE &rarr;</a>
                                </div>

                                <div class="mpd-quote-card" id="mpd_quote_card">
                                    <blockquote class="mpd-quote-card__text" id="mpd_quote_text">
                                        <em>Every artist was first an amateur.</em>
                                        <span>Clarity attracts connection. Shape your presence with intention.</span>
                                    </blockquote>
                                    <span class="mpd-quote-card__attr">&mdash; FUSION</span>
                                </div>
                            </aside>
                          </div>
                        </div>

                        <!-- ═══ IDENTITY & PRESENCE (merged overview fields + location + story) ═══ -->
                        <div class="mpd-panel" id="mpd-panel-identity" data-mpd-panel="identity" hidden>
                            <div class="mpd-identity-tabs" role="tablist" aria-label="Identity sections">
                                <button type="button" class="mpd-identity-tab is-active" data-mpd-identity-tab="basics" role="tab" aria-selected="true">Basics</button>
                                <button type="button" class="mpd-identity-tab" data-mpd-identity-tab="status" role="tab" aria-selected="false">Status</button>
                                <button type="button" class="mpd-identity-tab" data-mpd-identity-tab="story" role="tab" aria-selected="false">Story</button>
                            </div>

                            <div class="mpd-identity-tab-panel" id="mpd-identity-panel-basics" data-mpd-identity-panel="basics">
                                <section class="member-profile-dashboard__card" id="mpd-overview">
                                    <h2>Identity &amp; Presence</h2>
                                    <p class="studio-muted">Name, discipline, bios, and links — save when you are ready.</p>
                                    <div class="studio-field studio-field--full mpd-visibility-field mpd-visibility-source">
                                        <span>Artist profile visibility</span>
                                        <input type="hidden" id="mpd_profile_visibility" value="inactive" />
                                        <div class="mpd-visibility-toggle" role="group" aria-label="Artist profile visibility" aria-describedby="mpd_profile_visibility_hint">
                                            <button type="button" class="mpd-visibility-toggle__btn is-active" data-mpd-visibility="inactive" aria-pressed="true">Inactive</button>
                                            <button type="button" class="mpd-visibility-toggle__btn" data-mpd-visibility="private" aria-pressed="false">Private</button>
                                            <button type="button" class="mpd-visibility-toggle__btn" data-mpd-visibility="public" aria-pressed="false">Public</button>
                                        </div>
                                        <span id="mpd_profile_visibility_review_notice" class="mpd-visibility-review-notice" hidden>Submitted for review</span>
                                        <span id="mpd_profile_visibility_hint" class="mpd-field-hint">Choose <strong>Public</strong> to submit your profile for staff review.</span>
                                    </div>

                                <h3 class="mpd-identity-subhead">Name &amp; discipline</h3>
                                    <div class="studio-form-grid mpd-editorial-grid">
                                    <label class="studio-field"><span>First name</span>
                                            <input type="text" id="mpd_first_name" class="studio-input" autocomplete="given-name" placeholder="First name" />
                                    </label>
                                    <label class="studio-field"><span>Last name</span>
                                            <input type="text" id="mpd_last_name" class="studio-input" autocomplete="family-name" placeholder="Last name" />
                                    </label>
                                    <label class="studio-field studio-field--full"><span>Discipline</span>
                                            ${er()}
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
                                ${e}
                            </section>
                        </div>

                            <div class="mpd-identity-tab-panel" id="mpd-identity-panel-status" data-mpd-identity-panel="status" hidden>
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

                            <div class="mpd-identity-tab-panel" id="mpd-identity-panel-story" data-mpd-identity-panel="story" hidden>
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
                                            <button type="button" class="mpd-story-edit-btn" data-mpd-edit-target="mpd_w_practice" aria-label="Edit practice">${l}</button>
                                    </div>
                                    <div class="mpd-story-field-dual">
                                            <div class="mpd-story-field-meta">
                                                <span class="mpd-story-field-label">Perspective</span>
                                                <span class="mpd-field-hint">How you see your practice in relation to the field.</span>
                                        </div>
                                            <textarea id="mpd_w_perspective" class="studio-textarea mpd-story-input" rows="3" placeholder="Share your point of view...&#10;&#10;Add another thought here..."></textarea>
                                            <button type="button" class="mpd-story-edit-btn" data-mpd-edit-target="mpd_w_perspective" aria-label="Edit perspective">${l}</button>
                                    </div>
                                    <div class="mpd-story-field-dual">
                                            <div class="mpd-story-field-meta">
                                                <span class="mpd-story-field-label">Vision</span>
                                                <span class="mpd-field-hint">Where you want the work to go — aims, horizons, and what you are building toward.</span>
                                        </div>
                                            <textarea id="mpd_w_vision" class="studio-textarea mpd-story-input" rows="3" placeholder="Where do you want the work to go?"></textarea>
                                            <button type="button" class="mpd-story-edit-btn" data-mpd-edit-target="mpd_w_vision" aria-label="Edit vision">${l}</button>
                                    </div>
                                    <div class="mpd-story-field-dual">
                                            <div class="mpd-story-field-meta">
                                                <span class="mpd-story-field-label">Constructing</span>
                                                <span class="mpd-field-hint">Materials, process, and what you are actively making right now.</span>
                                        </div>
                                            <textarea id="mpd_w_constructing" class="studio-textarea mpd-story-input" rows="2" placeholder="Materials, process, current experiments..."></textarea>
                                            <button type="button" class="mpd-story-edit-btn" data-mpd-edit-target="mpd_w_constructing" aria-label="Edit constructing">${l}</button>
                                    </div>
                                    <div class="mpd-story-field-dual">
                                            <div class="mpd-story-field-meta">
                                                <span class="mpd-story-field-label">Context</span>
                                                <span class="mpd-field-hint">Place, community, or history that situates the work.</span>
                                        </div>
                                            <textarea id="mpd_w_context" class="studio-textarea mpd-story-input" rows="2" placeholder="Place, community, history, or influences..."></textarea>
                                            <button type="button" class="mpd-story-edit-btn" data-mpd-edit-target="mpd_w_context" aria-label="Edit context">${l}</button>
                                    </div>
                                    <div class="mpd-story-field-dual">
                                            <div class="mpd-story-field-meta">
                                                <span class="mpd-story-field-label">Quote</span>
                                                <span class="mpd-field-hint">A single line visitors can read at a glance.</span>
                                        </div>
                                            <input type="text" id="mpd_w_quote" class="studio-input mpd-story-input" placeholder="A short line visitors can remember..." />
                                            <button type="button" class="mpd-story-edit-btn" data-mpd-edit-target="mpd_w_quote" aria-label="Edit quote">${l}</button>
                                    </div>
                                </div>
                                ${t}
                            </section>
                            </div>
                        </div>

                        <!-- ═══ WORK & PROJECTS (shell) ═══ -->
                        <div class="mpd-panel" id="mpd-panel-work" data-mpd-panel="work" hidden>
                            <section class="member-profile-dashboard__card">
                                <h2>Work &amp; Projects</h2>
                                <p class="studio-muted">Manage your portfolio, projects, and the pieces that define your practice.</p>
                                <div class="mpd-coming-soon">
                                    <p>This section is coming soon. In the meantime, your uploaded media is managed in the <button type="button" class="mpd-inline-link mpd-nav-btn" data-mpd-panel="media">Media Library</button>.</p>
                                </div>
                            </section>
                        </div>

                        <!-- ═══ JOIN FUSION UNLOCK (applicant / locked nav) ═══ -->
                        <div class="mpd-panel mpd-panel--join-unlock" id="mpd-panel-join-unlock" data-mpd-panel="join-unlock" hidden>
                            <div id="mpdJoinUnlockMount" class="mpd-join-unlock-mount" aria-live="polite"></div>
                        </div>

                        <!-- ═══ EXHIBITIONS & PROGRAMS ═══ -->
                        <div class="mpd-panel" id="mpd-panel-programs" data-mpd-panel="programs" hidden>
                            <section class="member-profile-dashboard__card mpd-programs-shell" id="mpd-programs">
                                <div class="mpd-program-tabs" role="tablist" aria-label="Programs sections">
                                    <button type="button" class="mpd-program-tab mpd-program-tab--explore is-active" id="mpd-program-tab-explore" role="tab" aria-selected="true" tabindex="0" aria-controls="mpd-program-panel-explore" data-mpd-program-tab="explore">
                                        ${Ye(Wo,"mpd-program-tab__icon")}
                                        <span>Explore programs</span>
                                    </button>
                                    <button type="button" class="mpd-program-tab mpd-program-tab--my-programs" id="mpd-program-tab-my-programs" role="tab" aria-selected="false" tabindex="-1" aria-controls="mpd-program-panel-my-programs" data-mpd-program-tab="my-programs">
                                        ${Ye(Vo,"mpd-program-tab__icon")}
                                        <span>My programs</span>
                                        <span class="mpd-program-tab__count" id="mpd_my_programs_count" hidden>0</span>
                                    </button>
                                    <button type="button" class="mpd-program-tab mpd-program-tab--payments" id="mpd-program-tab-payments" role="tab" aria-selected="false" tabindex="-1" aria-controls="mpd-program-panel-payments" data-mpd-program-tab="payments">
                                        ${Ye(Gi,"mpd-program-tab__icon")}
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

                        <!-- ═══ MEDIA LIBRARY ═══ -->
                        <div class="mpd-panel" id="mpd-panel-media" data-mpd-panel="media" hidden>
                            <section class="member-profile-dashboard__card" id="mpd-media-library">
                                <h2>Media Library</h2>
                                <p class="studio-muted">Main artwork, profile card, intro gallery, and audio — all in one place.</p>

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
                                                <img id="mpd_hero_preview" class="member-profile-dashboard__hero-preview" alt="${_t("Profile hero image preview")}" />
                                                <span class="mpd-media-placeholder mpd-media-placeholder--detailed" aria-hidden="true">
                                                    <strong>Add Artwork</strong>
                                                    <small>5:4 ratio &middot; ~1200 &times; 960px<br/>JPG or JPEG &middot; Max 1 MB</small>
                                                </span>
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
                                                    <img id="mpd_hero_profile_preview" class="member-profile-dashboard__hero-preview" alt="${_t("Profile headshot preview")}" />
                                                    <span class="mpd-media-placeholder mpd-media-placeholder--detailed" aria-hidden="true">
                                                        <strong>Add Portrait</strong>
                                                        <small>3:4 ratio &middot; ~600 &times; 800px<br/>JPG or JPEG &middot; Max 1 MB</small>
                                                    </span>
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
                                    ${i}
                                </div>
                                <div id="mpd_audio_section" class="mpd-audio-section">
                                <h3 class="studio-subheading mpd-media-subhead">Audio bite</h3>
                                <blockquote class="mpd-audio-inspiration" id="mpd_audio_inspiration">“Words mean more than what is set down on paper. It takes the human voice to infuse them with deeper meaning.” — Maya Angelou</blockquote>
                                <p class="studio-muted mpd-media-helper">Upload a file or record up to 3 minutes with your microphone. New recordings require staff approval before they appear in the sound environment, your public profile, or journal audio rows.</p>
                                <input type="hidden" id="mpd_audio_url" value="" />
                                <div class="mpd-audio-actions" id="mpd_audio_actions">
                                    <input type="file" id="mpd_audio_file" class="mpd-file-input-hidden" accept="audio/*" />
                                    <label for="mpd_audio_file" class="mpd-upload-btn">Upload audio</label>
                                    <button type="button" class="mpd-upload-btn mpd-audio-record-btn" id="mpd_audio_record_open">Record audio</button>
                                </div>
                                <p id="mpd_audio_approval_status" class="mpd-audio-approval-status" hidden></p>
                                <label class="studio-field studio-field--full"><span>Audio title</span>
                                    <input type="text" id="mpd_audio_title" class="studio-input" />
                                </label>
                                <div id="mpd_audio_collection" class="mpd-audio-collection"></div>
                                <p class="studio-muted mpd-audio-count" id="mpd_audio_count" hidden></p>
                                </div>
                                ${e}
                            </section>
                        </div>

                        <!-- ═══ JOURNAL / NOTES (shell) ═══ -->
                        <div class="mpd-panel" id="mpd-panel-journal" data-mpd-panel="journal" hidden>
                            <section class="member-profile-dashboard__card">
                                <h2>Journal / Notes</h2>
                                <p class="studio-muted">Creative journal entries, reflections, and notes from your practice.</p>
                                <div class="mpd-coming-soon">
                                    <p>This section is coming soon. Your journal entries will appear here once the feature is available.</p>
                                </div>
                            </section>
                        </div>

                        <!-- ═══ PROFILE PREVIEW (shell) ═══ -->
                        <div class="mpd-panel" id="mpd-panel-preview" data-mpd-panel="preview" hidden>
                            <section class="member-profile-dashboard__card">
                                <h2>Profile Preview</h2>
                                <p class="studio-muted">See how visitors experience your public profile.</p>
                                <div class="mpd-coming-soon">
                                    <p>A live preview of your public profile will appear here. For now, you can <a id="mpd_preview_public_link" href="#" target="_blank" rel="noopener noreferrer">view your public profile</a> directly.</p>
                                </div>
                            </section>
                        </div>

                        <!-- ═══ SETTINGS (membership + account) ═══ -->
                        <div class="mpd-panel" id="mpd-panel-settings" data-mpd-panel="settings" hidden>
                            <section class="member-profile-dashboard__card mpd-membership-card" id="mpd-membership-section">
                                <h2>Membership</h2>
                                <p class="studio-muted">
                                    Manage your subscription, view billing details, and update your membership.
                                </p>
                                <p id="mpd_membership_error" class="mpd-membership-inline-error" role="alert" hidden></p>
                                <p id="mpd_membership_plan_updated" class="mpd-membership-plan-updated" role="status" hidden></p>
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
                                        <span class="studio-muted mpd-membership-legacy-note" id="mpd_membership_plan_legacy_note" hidden></span>
                                        <span class="studio-muted" id="mpd_membership_credit_balance" hidden></span>
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
                                    <div class="mpd-membership-manage-card" id="mpd_membership_manage_wrap">
                                        <h3 class="mpd-membership-subh">Manage membership</h3>
                                        <p class="studio-muted">
                                            Plan changes take effect on your next billing cycle. If you cancel, access
                                            continues until the end of your current period.
                                        </p>
                                        <button
                                            type="button"
                                            class="mpd-membership-action-row mpd-membership-action-row--plan"
                                            id="mpd_membership_change_plan_btn"
                                        >
                                            <span class="mpd-membership-action-row__icon mpd-membership-action-row__icon--plan" aria-hidden="true"></span>
                                            <span class="mpd-membership-action-row__main">
                                                <strong>Change plan</strong>
                                                <span class="studio-muted">Switch to Monthly, Quarterly, or Annual.</span>
                                            </span>
                                            <span class="mpd-membership-action-row__chev" aria-hidden="true"></span>
                                        </button>
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

                        ${n}
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
                <div
                    id="mpdMembershipChangePlanModal"
                    class="profile-gallery-access-modal mpd-membership-change-plan-modal"
                    hidden
                    aria-hidden="true"
                >
                    <div class="profile-gallery-access-modal__scrim" aria-hidden="true"></div>
                    <div
                        class="profile-gallery-access-modal__panel mpd-membership-change-plan-modal__panel"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="mpdMembershipChangePlanTitle"
                    >
                        <h2 id="mpdMembershipChangePlanTitle" class="profile-gallery-access-modal__title">
                            Change plan
                        </h2>
                        <p class="studio-muted mpd-membership-change-plan-modal__lead">
                            Changes take effect on your next billing cycle.
                        </p>
                        <p id="mpdMembershipChangePlanError" class="mpd-membership-inline-error" role="alert" hidden></p>
                        <div
                            id="mpdMembershipChangePlanOptions"
                            class="mpd-membership-change-plan-options"
                            role="radiogroup"
                            aria-labelledby="mpdMembershipChangePlanTitle"
                        ></div>
                        <div class="mpd-membership-change-plan-modal__actions">
                            <button type="button" class="studio-btn-primary" id="mpdMembershipChangePlanConfirm">
                                Continue
                            </button>
                            <button
                                type="button"
                                class="profile-gallery-access-modal__close"
                                id="mpdMembershipChangePlanCancel"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    `}function qa(e,t,i,a,n={}){return JSON.stringify({locales:e,active:t,hero:i,heroProfile:String(n.heroProfileUrl??""),visibility:a,profileQuote:String(n.profileQuote??""),audioUrl:String(n.audioUrl??""),audioTitle:String(n.audioTitle??"")})}let Hi=null,ii=null;function cs(){var ma,ua,fa,ga,ya,ha,ba,va,_a,wa,Sa,Pa,Ea,Aa,Ca,Ia;document.querySelectorAll("#mpdResidencyComingSoonModal").forEach(o=>{const r=document.getElementById("settingsMain");r&&!r.contains(o)&&o.remove()}),document.querySelectorAll("#mpdMembershipCancelModal").forEach(o=>{const r=document.getElementById("settingsMain");r&&!r.contains(o)&&o.remove()}),document.querySelectorAll("#mpdMembershipChangePlanModal").forEach(o=>{const r=document.getElementById("settingsMain");r&&!r.contains(o)&&o.remove()}),document.querySelectorAll("#mpdSaveChoiceModal").forEach(o=>{const r=document.getElementById("settingsMain");r&&!r.contains(o)&&o.remove()}),as(),ts(),is(),Xr(),window.addEventListener("fusion-localechange",()=>{document.querySelectorAll("[data-mpd-i18n]").forEach(r=>{const d=r.getAttribute("data-mpd-i18n");d&&(r.textContent=Qe(d))});const o=document.getElementById("settingsProfileHeading");o&&(o.textContent=Qe("your-studio"))});const e=ar;let t=null,i="",a="",n=!1,s=!1,l="",p=!1,m="",g="",u="",f=!1,b=0,j=0,_=!1,S=!1,I=xa(),$=null;const Z=document.getElementById("settingsProfileStatus"),R=document.getElementById("settingsProfileFormWrap"),L=document.getElementById("settingsProfileInitialLoading"),H=document.getElementById("settingsProfileAccountRecovery"),me=document.getElementById("settingsProfileRecoverToggle"),re=document.getElementById("settingsProfileRecoverPanel"),pe=document.getElementById("settingsProfileRecoveryCode"),ee=document.getElementById("settingsProfileRecoverySubmit"),Y=document.getElementById("settingsProfileRecoveryStatus");let De=!1;const Ie=o=>{H instanceof HTMLElement&&(H.hidden=!o),o||(re instanceof HTMLElement&&(re.hidden=!0),Y&&(Y.textContent=""),pe&&(pe.value=""))},Q=()=>{De||(De=!0,me==null||me.addEventListener("click",()=>{re instanceof HTMLElement&&(re.hidden=!re.hidden)}),ee==null||ee.addEventListener("click",async()=>{var r;const o=((r=pe==null?void 0:pe.value)==null?void 0:r.trim())??"";if(o.replace(/\D/g,"").length!==8){Y&&(Y.textContent="Enter the 8-digit recovery code from support.");return}ee instanceof HTMLButtonElement&&(ee.disabled=!0,ee.textContent="Recovering…"),Y&&(Y.textContent="");try{const d=await no(o);if(!d.ok){Y&&(Y.textContent=oo(d.code));return}const c=await Je(),y=await $t(),h=await qi(),w=h&&typeof h=="object"&&"email"in h?String(h.email??"").trim():"",E=String((y==null?void 0:y.paypalSubscriptionId)||"").trim(),A=c.authenticated&&c.principal?c.principal.toText():d.toPrincipal;try{await ro({principal:A,email:w,paypalSubscriptionId:E})}catch{Y&&(Y.textContent="Account linked. Refreshing subscription had an issue — use Membership → Refresh subscription status if needed. Loading profile…")}Y&&!Y.textContent&&(Y.textContent="Account recovered. Loading profile…"),Ve({force:!0})}catch(d){Y&&(Y.textContent=d instanceof Error?d.message:String(d))}finally{ee instanceof HTMLButtonElement&&(ee.disabled=!1,ee.textContent="Recover")}}))},P=o=>{Z&&(Z.textContent=o||"")};Xa=P;const K=o=>{L&&(L.hidden=!o,L.setAttribute("aria-hidden",o?"false":"true"))},G=new Map,te=()=>{const o=G.size>0;document.querySelectorAll(".mpd-section-save").forEach(r=>{r instanceof HTMLButtonElement&&(o?(r.setAttribute("aria-busy","true"),r.disabled=!0):(r.removeAttribute("aria-busy"),r.disabled=!1))})},dt=()=>G.values().next().value||null,Oe=()=>{const o=dt();if(!o)return!1;const r=o.pendingMessage||`Still ${String(o.detail||"working").toLowerCase()}...`;return P(r),Xt("saving",r,{operation:o.operation,detail:o.detail}),!0},Ee=(o,r,d={})=>{if(G.get(o))return!1;const c=o==="new-world-generation"&&G.size===1&&G.has("profile-save");if(!(d.allowConcurrent===!0||c)&&Oe())return!1;const h={operation:r.operation,detail:r.detail,pendingMessage:r.pendingMessage||`Still ${String(r.detail||"working").toLowerCase()}...`};G.set(o,h),te();const w=r.message||r.detail||r.operation||"Working";return P(w),Xt("saving",w,{operation:h.operation,detail:h.detail}),!0},V=(o,r="idle",d="")=>{const c=G.get(o);if(G.delete(o),te(),r==="idle"){!G.size&&d&&P(d);return}const y=d||(r==="saved"?`${(c==null?void 0:c.operation)||"Profile"} saved`:`${(c==null?void 0:c.operation)||"Operation"} failed`);P(y),Xt(r,y,{operation:(c==null?void 0:c.operation)||"",detail:(c==null?void 0:c.detail)||""})},sa=o=>{const r=document.getElementById("settingsProfileAdminBypass");r&&(o?(r.style.display="",r.removeAttribute("hidden")):(r.style.display="none",r.setAttribute("hidden","")))},pn=()=>{t={en:{},ja:{}},i="",a="",l="",g="",u="",Qi="",Ki="admin-preview",it="inactive",ei(t,e),ti("inactive"),D("mpd_hero_url",""),D("mpd_hero_profile_url",""),D("mpd_audio_url",""),D("mpd_audio_title",""),Et(),et(),Dt(),K(!1),ki(!0),R&&R.removeAttribute("hidden")},cn=async o=>{if(nt()==="test"||!Ta(o))return P("Saved."),!0;try{const r=await Tt(),d=yo(r);if(!d)throw new Error("Could not load profile for world generation.");if(!ho(d))return P("Saved."),!0;if(!Ee("new-world-generation",{operation:"New World",detail:"Generating New World",message:"Generating New World…",pendingMessage:"Still generating New World..."}))return!1;await bo(d,"fillEmpty");const c=await Tt();if(!c)throw new Error("Could not reload profile after world generation.");const y=Fa(c);try{t=y?JSON.parse(y):{en:{},ja:{}}}catch{t={en:{},ja:{}}}return(!t||typeof t!="object")&&(t={en:{},ja:{}}),ei(t,e),Dt(),V("new-world-generation","idle","New World generated."),P("Saved."),!0}catch(r){console.error("New World generation failed after profile save.",r);const d="Couldn’t generate New World. Your profile was saved with World. Please try saving again.";return t&&typeof t=="object"&&(t.publicWorldSource="world"),en(t||o,e,!1),ea(t||o,"world"),V("new-world-generation","error",d),!1}},mn=()=>{const o=document.getElementById("mpd_root");if(!o||typeof window>"u"||!window.matchMedia("(max-width: 768px)").matches)return;o.dataset.navOpen="false";const r=document.getElementById("settingsProfileNavBackdrop");r&&(r.hidden=!0,r.setAttribute("aria-hidden","true"));const d=document.getElementById("settingsProfileMenuBtn");d&&d.setAttribute("aria-expanded","false");try{document.body.style.overflow=""}catch{}},Rt=async()=>{const o=document.getElementById("mpd_membership_error"),r=document.getElementById("mpd_membership_plan_updated"),d=document.getElementById("mpd_membership_scheduled_cancel"),c=document.getElementById("mpd_membership_exempt_note"),y=document.getElementById("mpd_membership_included_list"),h=document.getElementById("mpd_membership_manage_wrap"),w=document.getElementById("mpd_membership_row_billing"),E=document.getElementById("mpd_membership_row_payment"),A=document.getElementById("mpd_membership_pm_update"),v=document.getElementById("mpd_membership_badge"),x=document.getElementById("mpd_membership_badge_label"),B=document.getElementById("mpd_membership_badge_line"),N=document.getElementById("mpd_membership_plan_name"),C=document.getElementById("mpd_membership_plan_price"),J=document.getElementById("mpd_membership_plan_legacy_note"),ie=document.getElementById("mpd_membership_credit_balance"),ue=document.getElementById("mpd_membership_renewal_date"),fe=document.getElementById("mpd_membership_renewal_relative"),z=document.getElementById("mpd_membership_pm_brand"),ce=document.getElementById("mpd_membership_pm_last4"),tt=document.getElementById("mpd_membership_cancel_btn"),ae=document.getElementById("mpd_membership_change_plan_btn");let _e=!1;try{const W=new URLSearchParams(typeof window<"u"?window.location.search:"");_e=W.get("membershipPlanUpdated")==="1",W.get("membershipPlanChangeCancelled")==="1"&&Ui()}catch{}const ge=W=>{v&&(v.className="mpd-membership-badge",W==="ok"?v.classList.add("mpd-membership-badge--ok"):W==="warn"?v.classList.add("mpd-membership-badge--warn"):v.classList.add("mpd-membership-badge--muted"))},we=(W,Ci=!1,Cn=!1)=>{ae instanceof HTMLButtonElement&&(ae.disabled=!W||Ci),tt instanceof HTMLButtonElement&&(tt.disabled=!W||Cn)};if(o&&(o.hidden=!0,o.textContent=""),r&&(r.hidden=!0,r.textContent=""),d&&(d.hidden=!0,d.textContent=""),J&&(J.hidden=!0,J.textContent=""),ie&&(ie.hidden=!0,ie.textContent=""),nt()==="test"){Te={tier:Bt,subscriptionId:"test-subscription",provider:"test"};const W=Fi(Bt);c&&(c.hidden=!0),h&&(h.style.display=""),w&&(w.style.display=""),E&&(E.style.display=""),A&&(A.style.display=""),ge("ok"),x&&(x.textContent="Active"),B&&(B.textContent="Your membership is active and in good standing. (Test mode — sample data.)"),N&&(N.textContent=W.label),C&&(C.textContent=W.priceLine),J&&W.legacyNote&&(J.hidden=!1,J.textContent=W.legacyNote),Ri(y,Bt,0),ue&&(ue.textContent="August 12, 2026"),fe&&(fe.textContent="In 28 days"),z&&(z.textContent="VISA"),ce&&(ce.textContent="•••• 4242"),we(!0),_e&&r&&(r.hidden=!1,r.textContent="Plan update approved. Your new rate applies on your next renewal (August 12, 2026).",Ui());return}const Me=await Je();if(!Me.authenticated)return;const $e=await $t(),q=$e&&typeof $e=="object"?$e:null,He=!!((q==null?void 0:q.membershipExemptManual)??(q==null?void 0:q.membership_exempt_manual));if(w&&(w.style.display=""),E&&(E.style.display=""),A&&(A.style.display=""),h&&(h.style.display=""),c&&(c.hidden=!0),He){Te=null,c&&(c.hidden=!1,c.textContent="Your membership is complimentary. Stripe billing and self-service cancellation are not required."),h&&(h.style.display="none"),w&&(w.style.display="none"),E&&(E.style.display="none"),A&&(A.style.display="none"),ge("ok"),x&&(x.textContent="Active"),B&&(B.textContent="Your membership is active (complimentary)."),N&&(N.textContent="Fusion member"),C&&(C.textContent="—"),Ri(y,"annual",0);const W=Yt(q,"stripeCurrentPeriodEnd","stripe_current_period_end");ue&&(ue.textContent=W?Gt(W):"—"),fe&&(fe.textContent=W?Ua(W):""),z&&(z.textContent=""),ce&&(ce.textContent="—");return}const se=Me.principal.toText(),U=String((q==null?void 0:q.paypalSubscriptionId)||(q==null?void 0:q.paypal_subscription_id)||"").trim(),ne=String((q==null?void 0:q.paymentProvider)||(q==null?void 0:q.payment_provider)||"").toLowerCase(),be=U||ne==="paypal"?"paypal":ne==="stripe"?"stripe":ne||"stripe",ke=Yt(q,"stripeSubscriptionId","stripe_subscription_id"),le=U||ke,ft=Yt(q,"stripeSubscriptionStatus","stripe_subscription_status"),gt=Yt(q,"stripeCurrentPeriodEnd","stripe_current_period_end"),At=await xe(()=>import("./index-29c64bdd.js").then(W=>W.fY),["assets/index-29c64bdd.js","assets/index-526714d8.css"]),{fetchMemberBillingSummary:Ot,syncPayPalSubscription:Ht,getIntegrationBaseUrl:qt}=At,yt=await Ot(se,{subscriptionId:le,provider:be}),O=yt&&typeof yt=="object"?yt:{},ve=!!O.ok,Ct=ve&&O.status!=null?String(O.status):ft,qe=ve&&typeof O.currentPeriodEnd=="string"&&O.currentPeriodEnd.trim()?String(O.currentPeriodEnd).trim():gt,It=ve&&!!O.cancelAtPeriodEnd;let Be=null;ve&&O.paymentMethod&&typeof O.paymentMethod=="object"&&(Be=O.paymentMethod);let he=st(ve&&typeof O.membershipTier=="string"?String(O.membershipTier):"");if(he||(he=st(await On())),!he&&ve&&typeof O.planId=="string"&&O.planId.trim())try{const W=await fetch(`${qt()}/payments/config`),Ci=W.ok?await W.json().catch(()=>({})):{};he=Hn(String(O.planId),Ci)}catch{}if(!he&&ve){const W=typeof O.planLabel=="string"?O.planLabel.toLowerCase():"";W.includes("bi-monthly")||W.includes("bimonthly")?he="bimonthly":W.includes("quarterly")?he="quarterly":W.includes("annual")?he="annual":W.includes("monthly")&&(he="monthly")}const Le=he?Fi(he):null,Wt=(Le==null?void 0:Le.label)||(ve&&typeof O.planLabel=="string"&&O.planLabel.trim()?String(O.planLabel).trim():"Membership"),Vt=(Le==null?void 0:Le.priceLine)||(ve&&typeof O.planPriceLine=="string"&&O.planPriceLine.trim()?String(O.planPriceLine).trim():"—");Te={tier:he||"",subscriptionId:ve&&typeof O.subscriptionId=="string"&&O.subscriptionId.trim()?String(O.subscriptionId).trim():le,provider:ve&&typeof O.provider=="string"&&O.provider.trim()?String(O.provider).toLowerCase():be};let ze=0;if(he==="quarterly")try{ze=await qn()}catch{ze=0}Ri(y,he||"monthly",ze),!ve&&O.reason&&String(O.reason)!=="no_integration_url"&&o&&(o.hidden=!1,o.textContent="Billing details could not be loaded from the payment service. Showing your Fusion account status; use Refresh subscription status or check Studio → Services.");const M=String(Ct||"").toLowerCase();x&&(x.textContent=or(Ct));let F="Your membership status could not be determined.";if(M==="active"||M==="trialing"?(F="Your membership is active and in good standing.",ge("ok")):M==="past_due"||M==="unpaid"?(F="Payment needs attention — update your card or billing in the portal to stay active.",ge("warn")):M==="canceled"||M==="cancelled"?(F="This subscription is no longer active.",ge("muted")):(M||(F="No subscription is linked yet. If you recently paid, use Refresh subscription status or complete Join."),ge("muted")),B&&(B.textContent=F),N&&(N.textContent=Wt),C&&(C.textContent=Vt),J&&(Le!=null&&Le.legacyNote)&&(J.hidden=!1,J.textContent=Le.legacyNote),ie&&ze>0&&(ie.hidden=!1,ie.textContent=`${ze} application credit${ze===1?"":"s"} available`),ue&&(ue.textContent=qe?Gt(qe):"—"),fe&&(fe.textContent=qe?Ua(qe):""),z){const W=Be!=null&&Be.brand?String(Be.brand).toUpperCase():"";z.textContent=W}if(ce){const W=Be!=null&&Be.last4?String(Be.last4):"";ce.textContent=W?`•••• ${W}`:"—"}d&&It&&qe&&(d.hidden=!1,d.textContent=`Cancellation scheduled — access continues until ${Gt(qe)}.`);const ye=!!M||!!le||ve&&typeof O.subscriptionId=="string"&&O.subscriptionId.trim(),Ne=M==="active"||M==="trialing",Mt=It||M==="canceled"||M==="cancelled"||!ye;if(we(ye,Mt||!Ne,Mt),_e&&(r&&(r.hidden=!1,r.textContent=`Plan update approved. Your new rate applies on your next renewal${qe?` (${Gt(qe)})`:""}.`),Ui(),Te.provider==="paypal"&&Te.subscriptionId))try{await Ht({principal:se,subscriptionId:Te.subscriptionId})}catch{}},bi=()=>{const o=["studio-overview","identity","work","programs","media","journal","preview","settings","join-unlock"];return Ut&&o.push("dev"),o},da=new Set(["studio-overview","identity","work","media","journal","preview","settings","dev"]),un=o=>{const r=document.getElementById("settingsProfileShout"),d=document.getElementById("settingsProfileHint"),c=document.getElementById("mpd_root"),h=new Set(bi()).has(o)?o:"studio-overview",w=ja[h]??ja["studio-overview"];r&&(r.innerHTML=w.shoutHtml),d&&(d.textContent=w.hint);const E=h==="join-unlock"&&(_||S);c==null||c.classList.toggle("mpd-root--join-unlock-focus",E)},fn=async()=>{const o=document.getElementById("mpdJoinUnlockMount");if(!(o instanceof HTMLElement))return;$&&($(),$=null);const r=typeof window.getLocale=="function"&&window.getLocale()==="ja"?"ja":"en";let d=null,c=null;try{d=await Wi("join-network-page",{forStudio:!1})}catch{d=null}try{c=await Wi("join-network-flow",{forStudio:!1})}catch{c=null}const y=Oo(d,c,r);o.innerHTML=Ho(y),$=qo(o,{defaultTier:"quarterly"})},vi=o=>{_=!!o.applicantMode,S=!!o.lightGate;const r=document.getElementById("mpd_root");r==null||r.classList.toggle("mpd-root--applicant-studio",_||S);const d=document.getElementById("mpd_view_profile"),c=document.getElementById("mpd_apply_residency"),y=document.getElementById("mpd_become_member"),h=_||S;d instanceof HTMLElement&&(d.hidden=h),c instanceof HTMLElement&&(c.hidden=h),y instanceof HTMLElement&&(y.hidden=!h),document.querySelectorAll("#settingsProfileNav .mpd-nav-btn[data-mpd-panel]").forEach(N=>{if(!(N instanceof HTMLElement))return;const C=N.getAttribute("data-mpd-panel")||"",J=h&&C!=="programs"&&da.has(C);N.classList.toggle("mpd-nav-btn--locked",J),N.toggleAttribute("aria-disabled",J),J?N.setAttribute("title","Become a member to unlock"):N.removeAttribute("title")});const w=document.getElementById("mpd-program-tab-explore"),E=document.getElementById("mpd-program-tab-payments"),A=document.getElementById("mpd-program-tab-my-programs");w instanceof HTMLElement&&(w.hidden=_||S),E instanceof HTMLElement&&(E.hidden=_||S),A instanceof HTMLElement&&(A.hidden=S&&!_);const v=document.getElementById("mpdApplicationOnlyToggleWrap"),x=document.getElementById("mpdApplicationOnlyToggle");v instanceof HTMLElement&&(v.hidden=!o.showTesterToggle),x&&(x.checked=I);const B=document.getElementById("settingsProfileMembershipActions");h&&B&&(B.style.display="none",B.setAttribute("hidden",""))},lt=o=>{let r=o;(_||S)&&r!=="programs"&&r!=="join-unlock"&&(r="join-unlock"),S&&r==="programs"&&(r="join-unlock");const c=new Set(bi()).has(r)?r:"studio-overview";document.querySelectorAll("#mpd_root .mpd-panel").forEach(y=>{const h=y.getAttribute("data-mpd-panel");h&&(y.hidden=h!==c)}),document.querySelectorAll("#mpd_root .mpd-nav-btn").forEach(y=>{const h=y.getAttribute("data-mpd-panel");h&&((_||S)&&h==="programs"&&c==="programs"?y.classList.toggle("is-active",!0):(_||S)&&c==="join-unlock"?(y.classList.toggle("is-active",!1),da.has(h)&&y.classList.remove("is-active")):y.classList.toggle("is-active",h===c))}),un(c),mn(),c==="join-unlock"&&fn(),c==="programs"&&_&&vt("my-programs"),requestAnimationFrame(()=>{const y=document.getElementById("footer");if(y){y.setAttribute("active","true");const h=y;h!=null&&h.bindScrollTargets&&h.bindScrollTargets(),h!=null&&h.syncFooterVisibilityFromScroll&&h.syncFooterVisibilityFromScroll(),setTimeout(()=>{h!=null&&h.syncFooterVisibilityFromScroll&&h.syncFooterVisibilityFromScroll()},300)}}),c==="settings"&&!_&&!S&&Rt();try{if(typeof history<"u"&&history.replaceState&&typeof window<"u"){const y=window.location.pathname+window.location.search;history.replaceState(null,"",`${y}#${c}`)}}catch{}},_i=()=>{let o=(typeof window<"u"&&window.location.hash?window.location.hash:"#studio-overview").replace(/^#/,"").toLowerCase();return o={overview:"studio-overview","mpd-overview":"studio-overview","mpd-media":"media","mpd-basics":"identity",location:"identity","mpd-story":"identity",story:"identity","mpd-links":"identity","mpd-seo":"studio-overview","mpd-programs":"programs","mpd-membership":"settings",membership:"settings","mpd-dev":"dev"}[o]||o,new Set(bi()).has(o)?o:"studio-overview"},wi=()=>{if(!t)return!1;const o=Bi();return qa({draft:o},e,T("mpd_hero_url").trim(),ht(T("mpd_profile_visibility").trim()||"public"),{profileQuote:Ti(),audioUrl:T("mpd_audio_url").trim(),audioTitle:T("mpd_audio_title").trim(),heroProfileUrl:T("mpd_hero_profile_url").trim()})!==m||b!==j},gn=()=>t?f?!0:!!(R&&!R.hasAttribute("hidden")&&wi()):!1,Dt=()=>{if(!t)return;const o=Bi();i=T("mpd_hero_url").trim(),a=T("mpd_hero_profile_url").trim();const r=ht(T("mpd_profile_visibility").trim()||"public");m=qa({draft:o},e,i,r,{profileQuote:Ti(),audioUrl:T("mpd_audio_url").trim(),audioTitle:T("mpd_audio_title").trim(),heroProfileUrl:a}),j=b},Si=o=>{document.querySelectorAll(".mpd-section-save").forEach(r=>{if(r instanceof HTMLButtonElement)if(o)r.setAttribute("aria-busy","true"),r.disabled=!0;else{if(G.size>0)return;r.removeAttribute("aria-busy"),r.disabled=!1}})},yn=()=>{const o=document.getElementById("mpd_story_save");o&&(o.classList.add("mp--async-ok"),window.setTimeout(()=>{o.classList.remove("mp--async-ok")},1400))};let Pi;const hn=o=>{if(p){P("Admin preview bypass is active. This mode is view/edit preview only and cannot save to a linked profile.");return}t&&(Oe()||(Pi=o,es()))},bn=async(o,r={})=>{if(p){P("Admin preview bypass is active. This mode is view/edit preview only and cannot save to a linked profile.");return}if(!t)return;const d=o instanceof HTMLElement&&o.id==="mpd_story_save",c=r.translate!==!1;if(!Ee("profile-save",{operation:"Profile",detail:c?"Translating profile copy":"Saving without translation",message:c?"Saving & translating in background…":"Saving in background…",pendingMessage:"Still saving profile..."}))return;const y=Bi(),h=Pe(t),w=T("mpd_hero_url").trim(),E=T("mpd_hero_profile_url").trim(),A=Ti(),v=T("mpd_audio_url").trim(),x=T("mpd_audio_title").trim(),B=ht(T("mpd_profile_visibility").trim()||"public"),N=n,C=s,J=T("mpd_public_world_source");f=!0,d&&Si(!0),(async()=>{let ue=!1,fe=!1;try{nt()!=="test"&&await kt();const z=await Tt();if(!z)throw new Error("Your profile could not be loaded for saving. Refresh this page and try again.");const ce=z==null?void 0:z.profile,tt=ce&&typeof ce=="object"?ht(ce.visibility):it;t=await fr(h,y,()=>{},{translate:c,_valOverrides:{mpd_public_world_source:J}});const ae=za(t);t=ae;const _e=new Date().toISOString(),ge=[],we=[lo(JSON.stringify(ae),_e)];(w||N)&&we.push(po(w,_e)),(E||C)&&we.push(co(E,_e).catch(se=>{ge.push(`Profile image metadata was not saved: ${se instanceof Error?se.message:String(se)}`)})),we.push(mo({quote:A,audioUrl:v,audioTitle:x},_e).catch(se=>{ge.push(`Quote/audio metadata was not saved: ${se instanceof Error?se.message:String(se)}`)}));const Me=B==="public"&&tt!=="public"?"pending":B;we.push(uo(Me,_e)),await Promise.all(we),it=Me,ti(Me);try{window.dispatchEvent(new CustomEvent("fusion-roster-visibility-updated",{detail:{visibility:Me}}))}catch{}i=w,a=E,n=!1,s=!1,l=v;const $e=ae.en&&typeof ae.en=="object"?ae.en:{},q=fo(String($e.firstName??""),String($e.lastName??""));let He=!1;if(q)try{const se=await go(q);g=se;const U=document.getElementById("mpd_view_profile"),ne=`/profile/${encodeURIComponent(se)}`;U&&U instanceof HTMLAnchorElement&&(U.href=ne);const be=document.getElementById("mpd_overview_profile_card");be&&be instanceof HTMLAnchorElement&&(be.href=ne)}catch(se){He=!0;const U=`${Zi(se)} (Other changes were saved.)`;V("profile-save","error",U),fe=!0}if(ue=nt()!=="test"&&!He&&Ta(ae),ue&&!d&&Si(!0),ei(t,e),Dt(),!He){Lt.capture("profile_settings_saved");const se=await cn(ae);if(ge.length){const ne=`Profile saved, but some media did not persist: ${ge.join(" ")}`;P(ne),V("profile-save","saved",ne)}else V("profile-save","saved","Profile saved.");fe=!0,se&&(Xt("saved","Profile saved",{operation:"Profile",detail:"All changes saved"}),d&&yn())}}catch(z){V("profile-save","error",Zi(z)),fe=!0}finally{f=!1,!fe&&G.has("profile-save")&&V("profile-save","error","Profile save did not complete. Try again."),(d||ue)&&Si(!1)}})()},Et=(o=!1)=>{const r=T("mpd_hero_url").trim(),d=document.getElementById("mpd_hero_preview");if(d){if(Re("hero",{hasMedia:!!r,hasPreview:!!r}),!r){Ke(!1),d.removeAttribute("src"),d.style.display="none";return}Ke(!0),d.style.display="none",d.onload=()=>{Ke(!1),d.style.display="block",d.onload=null,d.onerror=null},d.onerror=()=>{Ke(!1),Re("hero",{hasMedia:!!T("mpd_hero_url").trim(),hasPreview:!1}),je("Preview could not load. Save and refresh, or try another image."),d.removeAttribute("src"),d.style.display="none",d.onload=null,d.onerror=null},d.src=o?ci(r):r,d.complete&&d.naturalHeight>0&&(Ke(!1),d.style.display="block",d.onload=null,d.onerror=null)}},et=(o=!1)=>{const r=T("mpd_hero_profile_url").trim(),d=T("mpd_hero_url").trim(),c=r||d,y=document.getElementById("mpd_hero_profile_preview");if(ni(),!!y){if(Re("heroProfile",{hasMedia:!!r,hasPreview:!!c}),!c){Xe(!1),y.removeAttribute("src"),y.style.display="none";return}Xe(!0),y.style.display="none",y.onload=()=>{Xe(!1),y.style.display="block",y.onload=null,y.onerror=null},y.onerror=()=>{Xe(!1),Re("heroProfile",{hasMedia:!!T("mpd_hero_profile_url").trim(),hasPreview:!1}),je("Preview could not load. Save and refresh, or try another image."),y.removeAttribute("src"),y.style.display="none",y.onload=null,y.onerror=null},y.src=o?ci(c):c,y.complete&&y.naturalHeight>0&&(Xe(!1),y.style.display="block",y.onload=null,y.onerror=null)}},vn=o=>{if(o==="hero"){D("mpd_hero_url",""),i="",n=!0,b+=1,Et(),et(),P("Hero image removed. Save to apply this change.");return}if(o==="heroProfile"){D("mpd_hero_profile_url",""),a="",s=!0,b+=1,et(),P("Profile image removed. Save to apply this change.");return}const r=/^intro-(\d+)$/.exec(o);if(r){const d=Number(r[1]);if(!Number.isInteger(d)||d<0||d>2)return;rt(`intro-${d}`),D(`mpd_intro_${d}_src`,""),D(`mpd_intro_${d}_alt`,""),D(`mpd_intro_${d}_caption`,""),b+=1,Ue(d,!1),Re(`intro-${d}`,{hasMedia:!1,hasPreview:!1});const c=document.getElementById(`mpd_intro_${d}_thumb`);c&&(c.removeAttribute("src"),c.style.display="none",c.onload=null,c.onerror=null),P("Introductory work removed. Save to apply this change.")}},la=[{quote:"Every artist was first an amateur.",note:"Clarity attracts connection. Shape your presence with intention."},{quote:"Art is not what you see, but what you make others see.",note:"Your profile is the bridge between your practice and the world."},{quote:"The earth has music for those who listen.",note:"Let your creative voice resonate through every detail."},{quote:"Creativity takes courage.",note:"Share your work boldly — your perspective matters."},{quote:"To create is to bring something into being.",note:"Every section you complete brings your studio closer to life."}],_n=()=>{var ie;const o=document.getElementById("mpd_overview_preview_name"),r=document.getElementById("mpd_overview_preview_discipline"),d=document.getElementById("mpd_overview_preview_location"),c=document.getElementById("mpd_overview_preview_img"),y=document.getElementById("mpd_overview_view_profile"),h=T("mpd_first_name").trim(),w=T("mpd_last_name").trim(),E=[h,w].filter(Boolean).join(" ")||"—";o&&(o.textContent=E);const A=document.getElementById("mpd_discipline");r&&A&&(r.textContent=((ie=A.options[A.selectedIndex])==null?void 0:ie.text)||"—");const v=T("mpd_loc_city").trim(),x=T("mpd_loc_country").trim(),B=[v,x].filter(Boolean).join(", ")||"—";d&&(d.textContent=B);const N=T("mpd_hero_profile_url").trim()||T("mpd_hero_url").trim();c&&(N?c.innerHTML=`<img src="${oe(N)}" alt="" style="width:100%;height:100%;object-fit:cover;" />`:c.innerHTML='<span style="display:grid;place-items:center;width:100%;height:100%;color:rgba(15,23,42,0.3);font-size:0.8rem;text-transform:uppercase">No image</span>');const C=document.getElementById("mpd_view_profile");y&&C&&y.setAttribute("href",C.getAttribute("href")||"#");const J=document.getElementById("mpd_preview_public_link");J&&C&&J.setAttribute("href",C.getAttribute("href")||"#")},pa=o=>{document.querySelectorAll("[data-mpd-visibility]").forEach(h=>{const w=h.getAttribute("data-mpd-visibility");h.classList.toggle("is-active",w===o),h.setAttribute("aria-pressed",w===o?"true":"false")}),D("mpd_profile_visibility",o);const r=document.getElementById("mpd_overview_visibility");r&&(r.value=o);const d=document.getElementById("mpd_profile_visibility_review_notice"),c=document.getElementById("mpd_overview_visibility_review"),y=it==="pending";d&&(d.hidden=!y),c&&(c.hidden=!y)},wn=()=>{const o={identity:!1,work:!1,programs:!1,media:!1,preview:!1},r=T("mpd_first_name").trim(),d=T("mpd_last_name").trim(),c=T("mpd_bio").trim(),y=T("mpd_discipline").trim();o.identity=!!(r&&d&&c&&y);const h=T("mpd_hero_url").trim();o.work=!!h,o.programs=!0;const w=T("mpd_hero_profile_url").trim()||T("mpd_hero_url").trim();return o.media=!!w,o.preview=!!(r&&h),o},Sn=()=>{const o=wn(),r=["identity","work","programs","media","preview"],d=r.length,c=r.filter(v=>o[v]).length,y=Math.round(c/d*100),h=document.getElementById("mpd_completion_fill");h&&(h.style.width=`${y}%`);const w=document.getElementById("mpd_completion_pct");w&&(w.textContent=`${y}% complete`);const E=document.getElementById("mpd_completion_pill");if(E){const v=d-c;E.textContent=y>=100?"Profile Complete":v===1?"1 section to complete":`${v} sections to complete`,E.classList.toggle("mpd-completion-pill--complete",y>=100)}let A=!1;r.forEach((v,x)=>{const B=document.querySelector(`.mpd-completion-step[data-step="${v}"]`);if(!B)return;const N=!!o[v],C=!N&&!A;C&&(A=!0),B.classList.toggle("is-complete",N),B.classList.toggle("is-active",C),B.classList.toggle("is-pending",!N&&!C);const J=B.querySelector(".mpd-completion-step__marker");J&&(J.textContent=N?"✓":String(x+1));const ie=B.querySelector(".mpd-completion-step__status");ie&&(ie.textContent=N?"Complete":C?"In progress":"Not started")})},Pn=()=>{const o=document.getElementById("mpd_blindspots_grid");if(!o)return;const r=[];T("mpd_hero_url").trim()||r.push({title:"Add main artwork",panel:"media",icon:bt}),T("mpd_hero_profile_url").trim()||r.push({title:"Add profile image",panel:"media",icon:bt}),T("mpd_bio").trim()||r.push({title:"Write your bio",panel:"identity",icon:bt}),T("mpd_loc_city").trim()||r.push({title:"Set location",panel:"identity",tab:"status",icon:bt}),T("mpd_audio_url").trim()||r.push({title:"Add audio bite",panel:"media",icon:bt});const d=r.slice(0,5);if(!d.length){o.innerHTML='<p class="studio-muted" style="grid-column:1/-1;text-align:center;padding:1rem 0">Looking good — no blindspots detected.</p>';return}o.innerHTML=d.map(c=>`
      <div class="mpd-blindspot-card mpd-nav-btn" data-mpd-panel="${oe(c.panel)}"${c.tab?` data-mpd-identity-tab-target="${oe(c.tab)}"`:""}>
        <img src="${oe(c.icon)}" alt="" class="mpd-blindspot-card__icon" />
        <strong class="mpd-blindspot-card__title">${oe(c.title)}</strong>
        <span class="mpd-blindspot-card__link">IMPROVE &rarr;</span>
      </div>
    `).join("")},En=()=>{const o=Math.floor(Math.random()*la.length),r=la[o],d=document.getElementById("mpd_quote_text");d&&(d.innerHTML=`<em>${oe(r.quote)}</em><span>${oe(r.note)}</span>`)},An=()=>{_n(),Sn(),Pn(),En()},X=document.getElementById("mpd_root");X&&!X.dataset.mpdDelegated&&(X.dataset.mpdDelegated="1",X.addEventListener("click",o=>{var ce,tt,ae,_e,ge,we,Me,$e,q,He,se,U,ne,be,ke,le,ft,gt,At,Ot,Ht,qt,yt,O,ve,Ct,qe,It,Be,he,Le,Wt,Vt,ze;const r=o.target&&((tt=(ce=o.target).closest)==null?void 0:tt.call(ce,".mpd-nav-btn"));if(r&&X.contains(r)){o.preventDefault();const M=r.getAttribute("data-mpd-panel");if(M){if(wi()&&!confirm("You have unsaved changes. Continue without saving?"))return;lt(M)}return}const d=o.target&&((_e=(ae=o.target).closest)==null?void 0:_e.call(ae,"[data-mpd-identity-tab]"));if(d&&X.contains(d)){o.preventDefault();const M=d.getAttribute("data-mpd-identity-tab")||"basics";document.querySelectorAll("#mpd_root .mpd-identity-tab").forEach(F=>{const ye=F.getAttribute("data-mpd-identity-tab");F.classList.toggle("is-active",ye===M),F.setAttribute("aria-selected",ye===M?"true":"false")}),document.querySelectorAll("#mpd_root .mpd-identity-tab-panel").forEach(F=>{const ye=F.getAttribute("data-mpd-identity-panel");F.hidden=ye!==M});return}const c=o.target&&((we=(ge=o.target).closest)==null?void 0:we.call(ge,"#mpd_overview_publish_save"));if(c&&X.contains(c)){o.preventDefault();const M=document.getElementById("mpd_overview_visibility");if(M){const F=M.value;xe(()=>import("./index-29c64bdd.js").then(ye=>ye.f$),["assets/index-29c64bdd.js","assets/index-526714d8.css"]).then(async ye=>{try{await ye.updateMyArtistVisibility(F,new Date().toISOString()),it=F,P("Visibility updated."),pa(F)}catch{P("Failed to update visibility.")}})}return}const y=o.target&&(($e=(Me=o.target).closest)==null?void 0:$e.call(Me,"[data-action]"));if(y){const M=y.closest(".mpd-audio-entry"),F=M==null?void 0:M.getAttribute("data-audio-url"),ye=y.getAttribute("data-action");if(F&&ye==="delete"){o.preventDefault(),y.disabled=!0,Tn(F).then(()=>xt()).catch(Ne=>{P(`Delete failed: ${Ne instanceof Error?Ne.message:String(Ne)}`),y.disabled=!1});return}if(F&&ye==="highlight"){o.preventDefault(),y.disabled=!0,xn(F).then(()=>xt()).catch(Ne=>{P(`Highlight failed: ${Ne instanceof Error?Ne.message:String(Ne)}`),y.disabled=!1});return}if(ye==="review-info"){o.preventDefault();const Ne=(M==null?void 0:M.getAttribute("data-audio-url"))??"",Mt=Pt.audioEntries.find(([Ma])=>Ma.endsWith("|"+Ne));Mt&&an(Mt[1]);return}}const h=o.target&&((He=(q=o.target).closest)==null?void 0:He.call(q,"#mpd_audio_record_open"));if(h&&X.contains(h)){o.preventDefault(),Lo({artistId:u,slug:g,onCaptured:({url:M})=>{l=M,b+=1,$a(M,"Audio bite").then(()=>xt()).catch(F=>console.error("Failed to add audio entry",F)),P("Recording uploaded and added to your collection.")}});return}const w=o.target&&((U=(se=o.target).closest)==null?void 0:U.call(se,"[data-mpd-program-tab]"));if(w&&X.contains(w)){if(o.preventDefault(),w.hasAttribute("hidden")||w.getAttribute("aria-hidden")==="true")return;vt(w.getAttribute("data-mpd-program-tab")||"explore");return}const E=o.target&&((be=(ne=o.target).closest)==null?void 0:be.call(ne,"[data-mpd-payment-program]"));if(E&&X.contains(E)){o.preventDefault(),mt=E.getAttribute("data-mpd-payment-program")||"",fi();return}const A=o.target&&((le=(ke=o.target).closest)==null?void 0:le.call(ke,"[data-mpd-flight-choice]"));if(A&&X.contains(A)){if(o.preventDefault(),A.hasAttribute("disabled"))return;Hr(A.getAttribute("data-mpd-flight-choice")||"support");return}const v=o.target&&((gt=(ft=o.target).closest)==null?void 0:gt.call(ft,"[data-mpd-payment-action]"));if(v&&X.contains(v)){o.preventDefault();const M=dn();if(!M)return;const F=v.getAttribute("data-mpd-payment-action")||"";F==="deposit"?ia(M,"deposit",M.depositCents):F==="full"?ia(M,"full_payment",M.totalDueCents):F==="manual"?Wr(M):F==="start-plan"?Vr(M):F==="cancel-plan"&&Jr(M);return}const x=o.target&&((Ot=(At=o.target).closest)==null?void 0:Ot.call(At,"[data-mpd-my-program-filter]"));if(x&&X.contains(x)){o.preventDefault(),Er(x);return}const B=o.target&&((qt=(Ht=o.target).closest)==null?void 0:qt.call(Ht,"[data-mpd-application-action]"));if(B&&X.contains(B)){o.preventDefault();const M=B.getAttribute("data-mpd-application-action")||"",F=B.getAttribute("data-program-id")||"";M==="view"?Ar(F):M==="update"?window.alert("Material updates are coming soon. For now, contact the Fusion team if your application needs changes."):M==="withdraw"&&window.alert("Application withdrawal is coming soon. Contact the Fusion team if you need to withdraw before this action is available.");return}const N=o.target&&((O=(yt=o.target).closest)==null?void 0:O.call(yt,".mpd-section-save"));if(N&&X.contains(N)){o.preventDefault(),hn(N);return}const C=o.target&&((Ct=(ve=o.target).closest)==null?void 0:Ct.call(ve,"[data-mpd-media-delete]"));if(C&&X.contains(C)){o.preventDefault(),o.stopPropagation(),vn(C.getAttribute("data-mpd-media-delete")||"");return}const J=o.target&&((It=(qe=o.target).closest)==null?void 0:It.call(qe,"[data-mpd-edit-target]"));if(J&&X.contains(J)){o.preventDefault();const M=J.getAttribute("data-mpd-edit-target")||"",F=document.getElementById(M);if(F instanceof HTMLTextAreaElement||F instanceof HTMLInputElement){F.focus();const ye=F.value.length;F.setSelectionRange(ye,ye)}return}const ie=o.target;if(ie&&"id"in ie&&ie.id==="mpd_apply_residency"){o.preventDefault();const M=ie;if(M.dataset.applyOpen==="false"){Gr();return}const F=M.dataset.programPath||di;Bn(F.startsWith("/")?F:`/${F}`);return}const ue=o.target&&((he=(Be=o.target).closest)==null?void 0:he.call(Be,"[data-mpd-world-source]"));if(ue&&X.contains(ue)){if(o.preventDefault(),!t)return;We=mi(),ea(t,ue.getAttribute("data-mpd-world-source"));return}const fe=o.target&&((Wt=(Le=o.target).closest)==null?void 0:Wt.call(Le,"[data-mpd-status]"));if(fe&&X.contains(fe)){o.preventDefault(),nn(fe.getAttribute("data-mpd-status"));return}const z=o.target&&((ze=(Vt=o.target).closest)==null?void 0:ze.call(Vt,"[data-mpd-visibility]"));if(z&&X.contains(z)){o.preventDefault(),ti(z.getAttribute("data-mpd-visibility"));return}if(ie&&"id"in ie&&ie.id==="mpd_links_add"){const M=Nn("#mpd-links");M.push({type:"website",url:"",label:""}),on(M)}}),X.addEventListener("keydown",o=>{var E,A;const r=o.target&&((A=(E=o.target).closest)==null?void 0:A.call(E,"[data-mpd-program-tab]"));if(!r||!X.contains(r))return;const d=o.key;if(!["ArrowLeft","ArrowRight","Home","End"].includes(d))return;const c=Array.from(X.querySelectorAll("[data-mpd-program-tab]")).filter(v=>!v.hasAttribute("hidden")&&v.getAttribute("aria-hidden")!=="true"),y=c.indexOf(r);if(y<0)return;o.preventDefault();let h=y;d==="Home"?h=0:d==="End"?h=c.length-1:d==="ArrowRight"?h=(y+1)%c.length:d==="ArrowLeft"&&(h=(y-1+c.length)%c.length);const w=c[h];w instanceof HTMLElement&&(vt(w.getAttribute("data-mpd-program-tab")||"explore"),w.focus())}),X.addEventListener("input",o=>{const r=o.target;r instanceof HTMLInputElement&&r.id==="mpd_public_programs_search"&&ta()}),X.addEventListener("change",async o=>{var c,y,h,w;const r=o.target;if(r instanceof HTMLSelectElement&&r.id==="mpd_public_programs_filter"){ta();return}if(!(r instanceof HTMLInputElement))return;if(r.id==="mpd_hero_file"&&((c=r.files)!=null&&c[0])){if(!Li(r))return;const E=r.files[0];let A=E;try{A=await $i(E)}catch(v){je(v instanceof Error?v.message:String(v)),r.value="";return}if(xi("hero",A),!Ee("hero-upload",{operation:"Main artwork",detail:"Uploading main artwork",message:"Uploading main artwork…",pendingMessage:"Still uploading main artwork..."})){zt("hero"),je("Another upload is in progress. Wait for it to finish, then try again."),r.value="";return}Ke(!0),Qt("Uploading main artwork...");try{const v=await Nt(A,null,{area:"account/profile",entityType:"artist",entityId:u||g||"me",fieldKey:"hero",timeoutMs:6e4});D("mpd_hero_url",v),i=v,n=!1,b+=1,rt("hero"),Et(!0),et(!0),V("hero-upload","saved","Main artwork uploaded. Save to apply this change.")}catch(v){rt("hero"),Ke(!1),Et(!0),et(!0),V("hero-upload","error",v instanceof Error?v.message:String(v))}finally{G.has("hero-upload")&&V("hero-upload","idle"),Kt()}r.value="";return}if(r.id==="mpd_hero_profile_file"&&((y=r.files)!=null&&y[0])){if(!Li(r))return;const E=r.files[0];let A=E;try{A=await $i(E)}catch(v){je(v instanceof Error?v.message:String(v)),r.value="";return}if(xi("heroProfile",A),!Ee("hero-profile-upload",{operation:"Profile card",detail:"Uploading profile card",message:"Uploading profile card…",pendingMessage:"Still uploading profile card..."})){zt("heroProfile"),je("Another upload is in progress. Wait for it to finish, then try again."),r.value="";return}Xe(!0),Qt("Uploading profile card...");try{const v=await Nt(A,null,{area:"account/profile",entityType:"artist",entityId:u||g||"me",fieldKey:"heroProfile",timeoutMs:6e4});D("mpd_hero_profile_url",v),a=v,s=!1,b+=1,rt("heroProfile"),et(!0),V("hero-profile-upload","saved","Profile card uploaded. Save to apply this change.")}catch(v){rt("heroProfile"),Xe(!1),et(!0),V("hero-profile-upload","error",v instanceof Error?v.message:String(v))}finally{G.has("hero-profile-upload")&&V("hero-profile-upload","idle"),Kt()}r.value="";return}if(r.id==="mpd_audio_file"&&((h=r.files)!=null&&h[0])){const E=r.files[0],A=10*1024*1024;if(E.size>A){je(`Audio file is too large (${Math.round(E.size/1024)} KB). Maximum size is ${Math.round(A/1024)} KB.`),r.value="";return}if(!Ee("audio-upload",{operation:"Audio bite",detail:"Uploading audio bite",message:"Uploading audio bite…",pendingMessage:"Still uploading audio bite..."})){r.value="";return}Qt("Uploading audio bite...");try{const v=await Nt(E,null,{area:"account/profile",entityType:"artist",entityId:u||g||"me",fieldKey:"audio",timeoutMs:12e4});D("mpd_audio_url",v),l=v,b+=1,$a(v,"Audio bite").then(()=>xt()).catch(B=>console.error("Failed to add audio entry",B));const x=document.getElementById("mpd_audio_approval_status");x&&(x.hidden=!1,x.textContent="Pending staff approval",x.classList.add("is-pending"),x.classList.remove("is-approved")),V("audio-upload","saved","Audio bite uploaded and added to your collection.")}catch(v){V("audio-upload","error",v instanceof Error?v.message:String(v))}finally{G.has("audio-upload")&&V("audio-upload","idle"),Kt()}r.value="";return}const d=r.getAttribute("data-intro-slot");if(d!=null&&((w=r.files)!=null&&w[0])){if(!Li(r))return;const E=Number(d),A=r.files[0];let v=A;try{v=await $i(A)}catch(C){je(C instanceof Error?C.message:String(C)),r.value="";return}const x=`intro-${E}`;xi(x,v);const B=`intro-upload-${E}`,N=`Introductory work ${E+1}`;if(!Ee(B,{operation:N,detail:`Uploading ${N.toLowerCase()}`,message:`Uploading ${N.toLowerCase()}…`,pendingMessage:`Still uploading ${N.toLowerCase()}...`})){zt(x),je("Another upload is in progress. Wait for it to finish, then try again."),r.value="";return}Ue(E,!0),Qt(`Uploading ${N.toLowerCase()}...`);try{const C=await Nt(v,null,{area:"account/profile",entityType:"artist",entityId:u||g||"me",fieldKey:`intro-${E}`,timeoutMs:6e4});D(`mpd_intro_${E}_src`,C),b+=1,sr(x,C),V(B,"saved",`${N} uploaded. Save to apply this change.`)}catch(C){zt(x),V(B,"error",C instanceof Error?C.message:String(C))}finally{G.has(B)&&V(B,"idle"),Kt()}r.value=""}}),X.addEventListener("input",o=>{const r=o.target;(r instanceof HTMLInputElement||r instanceof HTMLTextAreaElement)&&(r.classList.contains("mpd-story-input")&&zi==="world"&&(We=mi()),(r.id==="mpd_first_name"||r.id==="mpd_last_name")&&ni())}),X.addEventListener("change",o=>{const r=o.target;r instanceof HTMLSelectElement&&r.id==="mpd_discipline"&&ni()}));const ut=document.getElementById("mpd_root");if(ut&&!ut.dataset.settingsStudioUi){ut.dataset.settingsStudioUi="1";const o="(max-width: 768px)",r=typeof window.matchMedia=="function"?window.matchMedia(o):null,d=c=>{ut.dataset.navOpen=c?"true":"false";const y=document.getElementById("settingsProfileNavBackdrop");y&&(y.hidden=!c,y.setAttribute("aria-hidden",c?"false":"true"));const h=document.getElementById("settingsProfileMenuBtn");h&&h.setAttribute("aria-expanded",c?"true":"false"),c&&(r!=null&&r.matches)?document.body.style.overflow="hidden":document.body.style.overflow=""};(ma=document.getElementById("settingsProfileMenuBtn"))==null||ma.addEventListener("click",()=>{const c=ut.dataset.navOpen!=="true";d(c)}),(ua=document.getElementById("settingsProfileNavBackdrop"))==null||ua.addEventListener("click",()=>d(!1)),r==null||r.addEventListener("change",c=>{c.matches||d(!1)}),window.addEventListener("keydown",c=>{c.key==="Escape"&&ut.dataset.navOpen==="true"&&d(!1)})}const Ei=document.getElementById("settingsProfileNavContact");Ei&&Ei.dataset.mpdContactWired!=="1"&&(Ei.dataset.mpdContactWired="1",(fa=document.getElementById("settingsProfileNavContactSend"))==null||fa.addEventListener("click",async()=>{const o=document.getElementById("settingsProfileNavContactMessage"),r=document.getElementById("settingsProfileNavContactEmail"),d=document.getElementById("settingsProfileNavContactStatus"),c=String((o==null?void 0:o.value)||"").trim();if(!c){d&&(d.textContent="Enter a message.");return}let y=await Ha();if(!Ze(y)&&r instanceof HTMLInputElement&&(y=String(r.value||"").trim()),!Ze(y)){Di(""),d&&(d.textContent="Add your email address so we can reply, then send again."),r==null||r.focus();return}d&&(d.textContent="Sending…");try{const{sendEmail:h}=await xe(()=>import("./index-29c64bdd.js").then(z=>z.fY),["assets/index-29c64bdd.js","assets/index-526714d8.css"]),{DEFAULT_APPLICATION_STAFF_EMAIL:w}=await xe(()=>import("./index-29c64bdd.js").then(z=>z.fX),["assets/index-29c64bdd.js","assets/index-526714d8.css"]),E=await Je(),A=T("mpd_first_name").trim(),v=T("mpd_last_name").trim();let x=[A,v].filter(Boolean).join(" ").trim();if(!x&&t){const z=Ge(t,"en");x=String(z.name??"").trim()}if(E.authenticated&&Ze(y)){let z=!1;try{const ce=await qi();z=Ze(ce==null?void 0:ce.email)}catch{}if(!z&&!await jn({firstName:A,lastName:v,email:y}))throw new Error("Could not save your email to your profile. Try again or refresh the page.");ot=y,Di(y)}const B=E.authenticated&&E.principal?E.principal.toText():"n/a",N=B.length>6?B.slice(-6):B,C=typeof window<"u"?window.location.origin:"",J=g||"",ie=J&&C?`${C}/profile/${encodeURIComponent(J)}`:"n/a",ue=[`Name: ${x||"n/a"}`,`Email: ${y}`,`Principal: ${B}`,`Profile: ${ie}`,""].join(`
`),fe=x?x.slice(0,48):`…${N}`;await h({to:w,subject:`[Fusion Profile settings] Message — ${fe}`,text:`${ue}${c}`}),d&&(d.textContent="Sent. We will get back to you soon."),o&&(o.value="")}catch(h){d&&(d.textContent=h instanceof Error?h.message:String(h))}}));const Ve=async(o={})=>{var He,se;if(o.force!==!0&&gn())return;P(""),K(!0),ki(!1),Ie(!1);const r=document.getElementById("settingsProfileMembershipActions");sa(!1),r&&(r.style.display="none",r.setAttribute("hidden",""));const d=await Je(),c=nt()==="test",y=document.getElementById("settingsTestPicker"),h=document.getElementById("settingsTestArtistSelect");if(c&&y&&h){y.style.display="",h.replaceChildren();const U=document.createElement("option");U.value="",U.textContent="— Select artist —",h.appendChild(U);const ne=await Wn();for(const ke of ne){const le=document.createElement("option");le.value=String(ke.id),le.textContent=`${((se=(He=ke.locales)==null?void 0:He.en)==null?void 0:se.name)||ke.slug||ke.id} (${ke.slug})`,h.appendChild(le)}const be=ka();be&&(h.value=be),h.onchange=()=>{Vn(h.value||null),Ve({force:!0})}}else y&&(y.style.display="none");const w=await $t(),E=await Jn(w),A=rr(E),v=document.getElementById("settingsProfileHeading");v&&(v.textContent=A);const x=document.getElementById("settingsProfileHint");if(Ni(d,d.authenticated?"sidebar":"none"),!c&&!d.authenticated){x&&(x.textContent="Sign in with Internet Identity to edit your profile."),R&&R.setAttribute("hidden",""),K(!1),pt(A);return}c&&!ka()&&(P("Creating a local profile for this session…"),await kt(),P(""));let B=!1,N="";if(!c&&d.authenticated){const U=Yn(),ne=U!=="admin"&&U!=="staff";ne?B=!0:B=await La()&&ne}if(I=xa(),!c&&d.authenticated)try{ct=await Gn()}catch{ct=""}else c&&(ct="exempt");if(!c&&d.authenticated&&!B&&await kt()==="noAccount"&&!w){Ni(d,"main"),Pr(x),Ie(!0),Q(),vi({applicantMode:!1,lightGate:!1,showTesterToggle:!1}),R&&R.setAttribute("hidden",""),K(!1),pt(A);return}let C=await Tt();if(!C&&B&&!c){try{N=await kt()}catch{N=""}C=await Tt()}const J=C?xo(C.applied_json??C.appliedJson):0,ie=C?Bo(C.applied_json??C.appliedJson):!1;let ue=!1;try{ue=await La()}catch{ue=!1}const fe=Fo({isRealAdmin:ue,hasTesterApplication:ie}),z=No({membershipGate:ct,applicationCount:J,applicationOnlyDisplay:I}),ce=jo({membershipGate:ct,applicationCount:J,applicationOnlyDisplay:I});if(!C){if(B){if(x&&(x.textContent="Admin perspective preview could not find a linked artist profile. Use Admin preview bypass to load editable fields for perspective testing."),r&&(r.style.display="flex",r.removeAttribute("hidden")),sa(N==="needsSubscription"||N==="noAccount"||N===""),p){pn(),P("Admin preview bypass active. Fields are loaded without account/membership gating."),pt(A),K(!1);return}R&&R.setAttribute("hidden",""),K(!1),pt(A);return}if(ce||I||ct==="needsSubscription"){vi({applicantMode:!1,lightGate:!0,showTesterToggle:fe}),K(!1),R&&R.removeAttribute("hidden"),x&&(x.textContent="Become a FUSION member to unlock your full studio. You can track applications under Programs once you have applied."),lt("join-unlock"),pt(A);return}x&&(x.textContent="Your profile could not be loaded. Try refreshing the page. If you just subscribed, wait a moment and try again, or sign out and back in."),R&&R.setAttribute("hidden",""),K(!1),pt(A);return}vi({applicantMode:z,lightGate:ce&&!z,showTesterToggle:fe});const ae=C.profile&&typeof C.profile=="object"?C.profile:{};g=String(ae.slug??"");const _e=Fa(C);try{t=_e?JSON.parse(_e):{en:{},ja:{}}}catch{t={en:{},ja:{}}}(!t||typeof t!="object")&&(t={en:{},ja:{}});const ge=Va();if(ge.fullName||ge.email){const U=String(ge.fullName||"").trim().split(/\s+/).filter(Boolean),ne=U[0]||"",be=U.slice(1).join(" ");for(const ke of["en","ja"]){const le=Ge(t,ke),ft=String(le.firstName??"").trim(),gt=String(le.lastName??"").trim();!ft&&ne&&(le.firstName=ne),!gt&&be&&(le.lastName=be),!String(le.name??"").trim()&&(le.firstName||le.lastName)&&(le.name=`${String(le.firstName||"").trim()} ${String(le.lastName||"").trim()}`.trim()),t[ke]=le}}_r(t,C.applied_json??C.appliedJson),i=String(ae.image??""),n=!1,s=!1;{const U=ae.heroProfileImage??ae.hero_profile_image;a=(()=>Array.isArray(U)?String(aa(U)??"").trim():String(U??"").trim())()}u=String(ae.id??""),Qi=u,Ki=g,ki(!!(u||g)||nt()==="test"),l=String(ae.audioUrl??""),D("mpd_hero_url",i),D("mpd_hero_profile_url",a),D("mpd_audio_url",l),D("mpd_audio_title",String(ae.audioTitle??""));{const U=document.getElementById("mpd_audio_approval_status");if(U)if(l){U.hidden=!1;const ne=zn(ae);U.textContent=ne?"Approved for public playback":"Pending staff approval",U.classList.toggle("is-approved",ne),U.classList.toggle("is-pending",!ne)}else U.hidden=!0,U.textContent=""}hr(),xt(),br(),Et(),et(),it=ht(ae.visibility),ti(it);const we=document.getElementById("mpd_view_profile"),Me=`/profile/${encodeURIComponent(g)}`;we&&we instanceof HTMLAnchorElement&&(we.href=Me);const $e=document.getElementById("mpd_overview_profile_card");$e&&$e instanceof HTMLAnchorElement&&($e.href=Me),K(!1),R&&R.removeAttribute("hidden");const q=document.getElementById("mpd_datasource_pill");if(q&&c?(q.style.display="",q.textContent="Data: test JSON (localStorage overlays)"):q&&(q.style.display="none"),ei(ur(t),e),String((We==null?void 0:We.quote)??"").trim()||(We={...We||{},quote:String(ae.quote??"")},zi==="world"&&D("mpd_w_quote",String(ae.quote??""))),Dt(),ns(C),_?vt("my-programs"):(vt("explore"),os(),rs()),S)lt("join-unlock");else if(_){const U=_i();lt(U==="join-unlock"?"join-unlock":"programs")}else lt(_i());!_&&!S&&An(),pa(it),Ni(d,"sidebar"),Ha().then(U=>{Di(U)}),pt(A)};window.addEventListener("hashchange",()=>{lt(_i())}),(ga=document.getElementById("settingsProfileFinishMembership"))==null||ga.addEventListener("click",()=>{window.dispatchEvent(new CustomEvent("fusion-open-join-network",{detail:{mode:"resubscribe",fromJoinNetworkPage:!0,stage:"payment",subscriptionTier:"monthly"}}))}),(ya=document.getElementById("mpd_become_member"))==null||ya.addEventListener("click",()=>{lt("join-unlock")}),(ha=document.getElementById("mpdApplicationOnlyToggle"))==null||ha.addEventListener("change",o=>{const r=o.target instanceof HTMLInputElement&&o.target.checked;To(r),I=r,Ve({force:!0})}),ii&&window.removeEventListener("fusion-settings-profile-save-choice",ii),ii=o=>{const r=o instanceof CustomEvent&&Yr(o.detail)?o.detail:{},d=String(r.action||""),c=Pi;Pi=void 0,d==="save"&&bn(c,{translate:r.translate!==!1})},window.addEventListener("fusion-settings-profile-save-choice",ii),(ba=document.getElementById("settingsProfileSyncSubscription"))==null||ba.addEventListener("click",async()=>{const o=await Je();if(o.authenticated&&Ee("membership-sync",{operation:"Membership",detail:"Refreshing subscription",message:"Refreshing subscription status…",pendingMessage:"Still refreshing subscription status..."})){try{const r=await xe(()=>import("./index-29c64bdd.js").then(h=>h.fY),["assets/index-29c64bdd.js","assets/index-526714d8.css"]),d=await $t(),c=String((d==null?void 0:d.paypalSubscriptionId)||"").trim(),y=String((d==null?void 0:d.paymentProvider)||"").toLowerCase();c||y==="paypal"?await r.syncPayPalSubscription({principal:o.principal.toText(),subscriptionId:c}):await r.syncSubscriptionFromStripe(o.principal.toText()),await kt(),Lt.capture("membership_subscription_sync_succeeded",{context:"settings_profile"}),V("membership-sync","saved","Subscription refreshed. Loading profile…")}catch(r){V("membership-sync","error",r instanceof Error?r.message:String(r));return}Ve({force:!0})}}),(va=document.getElementById("settingsProfileAdminBypass"))==null||va.addEventListener("click",()=>{p=!0,P("Admin preview bypass enabled. Loading fields…"),Ve({force:!0})});const Ai=async()=>{var r;const o=await Je();if(o.authenticated&&Ee("billing-portal",{operation:"Billing",detail:"Opening billing portal",message:"Opening billing portal…",pendingMessage:"Still opening billing portal..."}))try{const{createBillingPortalSession:d}=await xe(()=>import("./index-29c64bdd.js").then(h=>h.fY),["assets/index-29c64bdd.js","assets/index-526714d8.css"]),c=typeof window<"u"&&((r=window.location)!=null&&r.href)?window.location.href:"https://fusionart.world/settings/profile",{url:y}=await d(o.principal.toText(),c);Lt.capture("membership_billing_portal_opened",{context:"settings_profile"}),V("billing-portal","saved","Opening billing portal…"),window.location.assign(y)}catch(d){V("billing-portal","error",d instanceof Error?d.message:String(d))}finally{G.has("billing-portal")&&V("billing-portal","idle")}};(_a=document.getElementById("mpd_membership_row_billing"))==null||_a.addEventListener("click",()=>{Ai()}),(wa=document.getElementById("mpd_membership_row_payment"))==null||wa.addEventListener("click",()=>{Ai()}),(Sa=document.getElementById("mpd_membership_pm_update"))==null||Sa.addEventListener("click",()=>{Ai()}),(Pa=document.getElementById("mpd_membership_change_plan_btn"))==null||Pa.addEventListener("click",()=>{const o=(Te==null?void 0:Te.tier)||"monthly";Kr(o),Qr()}),(Ea=document.getElementById("mpdMembershipChangePlanConfirm"))==null||Ea.addEventListener("click",async()=>{const o=document.getElementById("mpdMembershipChangePlanError"),r=st(ri);if(!r||r==="bimonthly"){o&&(o.hidden=!1,o.textContent="Choose Monthly, Quarterly, or Annual.");return}const d=Te;if(!d){o&&(o.hidden=!1,o.textContent="Membership billing details are not loaded yet.");return}if(nt()==="test"){const h=["monthly","quarterly","annual"],w=h.indexOf(st(d.tier)||"monthly");Bt=h[(w+1)%h.length]||"monthly",St(),await Rt(),V("membership-change-plan","saved",`Test mode: plan set to ${Fi(Bt).label}.`);return}const c=await Je();if(!c.authenticated||!Ee("membership-change-plan",{operation:"Membership",detail:"Starting plan change",message:"Starting plan change…",pendingMessage:"Still starting plan change..."}))return;let y=!1;try{const h=await Fn({provider:d.provider,principal:c.principal.toText(),targetTier:r,subscriptionId:d.subscriptionId,returnUrl:Oa("membershipPlanUpdated"),cancelUrl:Oa("membershipPlanChangeCancelled")});if(h.message){o&&(o.hidden=!1,o.textContent=h.message),V("membership-change-plan","error",h.message);return}if(h.approveUrl){y=!0,St(),Lt.capture("membership_plan_change_started",{context:"settings_profile",target_tier:r,provider:d.provider}),V("membership-change-plan","saved","Opening PayPal to approve your plan change…"),window.location.assign(h.approveUrl);return}V("membership-change-plan","saved","Plan change request submitted."),St(),await Rt()}catch(h){const w=h instanceof Error?h.message:String(h);o&&(o.hidden=!1,o.textContent=w),V("membership-change-plan","error",w)}finally{!y&&G.has("membership-change-plan")&&V("membership-change-plan","idle")}}),(Aa=document.getElementById("mpd_membership_cancel_btn"))==null||Aa.addEventListener("click",()=>{zr()}),(Ca=document.getElementById("mpdMembershipCancelStay"))==null||Ca.addEventListener("click",()=>{hi()}),(Ia=document.getElementById("mpdMembershipCancelContinue"))==null||Ia.addEventListener("click",async()=>{const o=await Je();if(o.authenticated&&(hi(),!!Ee("membership-cancel",{operation:"Membership",detail:"Scheduling cancellation",message:"Scheduling cancellation…",pendingMessage:"Still scheduling cancellation..."})))try{const{cancelSubscriptionAtPeriodEnd:r,cancelPayPalSubscriptionAtPeriodEnd:d,syncSubscriptionFromStripe:c,syncPayPalSubscription:y}=await xe(()=>import("./index-29c64bdd.js").then(A=>A.fY),["assets/index-29c64bdd.js","assets/index-526714d8.css"]),h=await $t(),w=String((h==null?void 0:h.paypalSubscriptionId)||"").trim(),E=String((h==null?void 0:h.paymentProvider)||"").toLowerCase();if(w||E==="paypal"){if(!w)throw new Error("No PayPal subscription linked.");await d(w),await y({principal:o.principal.toText(),subscriptionId:w})}else await r(o.principal.toText()),await c(o.principal.toText());Lt.capture("membership_cancel_scheduled",{context:"settings_profile"}),await Rt(),V("membership-cancel","saved","Cancellation scheduled for the end of your billing period.")}catch(r){V("membership-cancel","error",r instanceof Error?r.message:String(r))}finally{G.has("membership-cancel")&&V("membership-cancel","idle")}});const ca=o=>{wi()&&(o.preventDefault(),o.returnValue="")};Hi&&window.removeEventListener("beforeunload",Hi),Hi=ca,window.addEventListener("beforeunload",ca),Ve({force:!0}),window.addEventListener("fusion-auth-change",()=>void Ve()),window.addEventListener("fusion-admin-perspective-change",()=>void Ve()),window.addEventListener("fusion-data-source-change",()=>void Ve()),document.addEventListener("visibilitychange",()=>{document.visibilityState==="visible"&&Ve()})}export{ir as MPD_MAX_IMAGE_BYTES,cs as default,ps as generateSettingsProfileContent};
