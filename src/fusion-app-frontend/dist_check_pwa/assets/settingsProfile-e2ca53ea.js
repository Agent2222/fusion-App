import{aK as Nn,aL as Ut,aM as jn,aN as Mi,E as Fn,aO as Un,aP as Dn,aQ as Re,aR as ka,aS as $a,aa as Le,aT as Rn,aU as Hn,aV as On,U as vt,ai as qn,aW as Wn,aX as xa,T as Ve,aq as Ke,aY as Wi,aZ as Vn,a_ as _t,a$ as $t,Q as xt,b0 as rt,b1 as Jn,b2 as Ga,b3 as Yn,b4 as wt,b5 as za,b6 as Qa,b7 as Ka,b8 as Gn,b9 as Xa,F as Et,ba as zn,bb as Qn,bc as di,ap as Za,bd as oa,be as en,bf as Kn,l as Xn,bg as Ta,bh as Zn,bi as eo,bj as to,bk as Ba,bl as ra,bm as io,bn as ao,q as no,bo as oo,av as ro,bp as so,ay as tn,v as Vi,bq as lo,o as ce,br as co,bs as po,bt as mo,bu as uo,bv as fo,bw as an,bx as go,by as nn,ar as yo,bz as ho,bA as bo,bB as vo,bC as _o,bD as wo,bE as So,bF as Na,bG as Yt,bH as Po,bI as Eo,bJ as Ao,bK as Co}from"./index-9466438f.js";import{u as Nt,p as Io,s as Ji,f as sa,a as Mo,i as on,c as Yi,P as Lo,r as ko,b as $o}from"./studioDateFormat-95bfa1d0.js";import{s as xo}from"./joinCollageRotate-5239e0b7.js";const To=3*60*1e3,Bo=200;function No(e){const t=Math.max(0,Math.floor(e/1e3)),i=Math.floor(t/60),a=t%60;return`${i}:${String(a).padStart(2,"0")}`}function jo(){const e=["audio/webm;codecs=opus","audio/webm","audio/mp4","audio/ogg;codecs=opus"];return typeof MediaRecorder>"u"||typeof MediaRecorder.isTypeSupported!="function"?"":e.find(t=>MediaRecorder.isTypeSupported(t))||""}function Fo(e){const t=e.querySelector("#mpdAcPermHelp");if(!t)return;const i=/^((?!chrome|android).)*safari/i.test(navigator.userAgent);t.hidden=!1,t.innerHTML=`
    <p><strong>Microphone access was denied.</strong></p>
    <p>To fix this:</p>
    <ol>
      <li>Click the <strong>${i?"address bar site settings":"lock / site settings icon"}</strong> in your browser's address bar</li>
      <li>Find <strong>Microphone</strong> and change it to <strong>Allow</strong></li>
      <li><strong>Refresh the page</strong> and try recording again</li>
    </ol>
    ${i?"<p>On Safari: go to <strong>Safari &gt; Settings &gt; Websites &gt; Microphone</strong> and set this site to <strong>Allow</strong>.</p>":""}
    <p class="mpd-audio-capture-modal__help-note">If you previously denied access, you may need to reset the site permission before the browser will ask again.</p>
  `}function Uo(e={}){var ke;const t=document.getElementById("mpdAudioCaptureModal");t&&t.remove();const i=jo(),a=document.createElement("div");a.id="mpdAudioCaptureModal",a.className="mpd-audio-capture-modal",a.setAttribute("role","dialog"),a.setAttribute("aria-modal","true"),a.setAttribute("aria-labelledby","mpdAudioCaptureTitle"),a.innerHTML=`
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
  `,document.body.appendChild(a);let n=null,s=null,l=[],d=null,p=0,u=null,f=null,g=null,b=null;const C=a.querySelector("#mpdAcTime"),v=a.querySelector("#mpdAcStatus"),w=a.querySelector("#mpdAcPreview"),P=a.querySelector("#mpdAcMeter"),L=a.querySelector("#mpdAcRecord"),Y=a.querySelector("#mpdAcStop"),U=a.querySelector("#mpdAcUse"),$=K=>{v&&(v.textContent=K||"")},O=()=>{u&&(clearInterval(u),u=null),b!=null&&(cancelAnimationFrame(b),b=null),f&&(f=null),g&&(g.close().catch(()=>{}),g=null),n&&(n.getTracks().forEach(K=>K.stop()),n=null),s=null},ee=()=>{O(),w!=null&&w.src&&URL.revokeObjectURL(w.src),a.remove()},te=K=>{C&&(C.textContent=`${No(K)} / 3:00`)},me=()=>{if(!f||!P)return;const K=new Uint8Array(f.frequencyBinCount);f.getByteFrequencyData(K);let A=0;for(let ae=0;ae<K.length;ae++)A+=K[ae];const X=A/Math.max(1,K.length),z=Math.min(100,Math.round(X/180*100));P.style.width=`${Math.max(6,z)}%`,b=requestAnimationFrame(me)},ie=()=>{if(!(!s||s.state==="inactive"))try{s.stop()}catch{}},G=async()=>{d=null,l=[],w&&(w.hidden=!0,w.src&&URL.revokeObjectURL(w.src),w.removeAttribute("src")),U&&(U.hidden=!0),$("Requesting microphone…");try{n=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:!0,noiseSuppression:!0,autoGainControl:!0}})}catch(A){A instanceof Error&&/NotAllowed|Permission/i.test(A.name+A.message)?($(""),Fo(a)):$("Could not access microphone on this device.");return}try{g=new AudioContext;const A=g.createMediaStreamSource(n);f=g.createAnalyser(),f.fftSize=256,A.connect(f),me()}catch{}const K=i?{mimeType:i}:void 0;try{s=K?new MediaRecorder(n,K):new MediaRecorder(n)}catch{O(),$("Recording is not supported in this browser.");return}s.ondataavailable=A=>{A.data&&A.data.size>0&&l.push(A.data)},s.onstop=()=>{var X;O();const A=i||((X=l[0])==null?void 0:X.type)||"audio/webm";d=new Blob(l,{type:A}),w&&d.size>0&&(w.src=URL.createObjectURL(d),w.hidden=!1),L&&(L.hidden=!1,L.textContent="Re-record"),Y&&(Y.hidden=!0),U&&(U.hidden=!1),$("Recording ready. Preview, then use it or re-record."),P&&(P.style.width="0%")},p=Date.now(),te(0),s.start(250),L&&(L.hidden=!0),Y&&(Y.hidden=!1),$("Recording…"),u=setInterval(()=>{const A=Date.now()-p;te(A),A>=To&&($("Reached 3:00 — stopping."),ie())},Bo)},He=async()=>{var K;if(!d||d.size<1){$("No recording to save.");return}U&&(U.disabled=!0),L&&(L.disabled=!0),$("Uploading…");try{const A=d.type.includes("mp4")?"m4a":d.type.includes("ogg")?"ogg":"webm",X=new File([d],`artist-audio-capture.${A}`,{type:d.type||"audio/webm"}),z=await Nt(X,null,{area:"account/profile",entityType:"artist",entityId:String(e.artistId||e.slug||"artist"),fieldKey:"audio"}),ae=document.getElementById("mpd_audio_url"),dt=document.getElementById("mpd_audio_title");ae&&(ae.value=z),dt&&!String(dt.value||"").trim()&&(dt.value="Audio bite");const Oe=document.getElementById("mpd_audio_approval_status");Oe&&(Oe.hidden=!1,Oe.textContent="Pending staff approval",Oe.classList.remove("is-approved"),Oe.classList.add("is-pending")),(K=e.onCaptured)==null||K.call(e,{url:z,blob:d,durationMs:Date.now()-p}),$("Uploaded. Save your Media Library to keep this clip. Staff approval is required for public playback."),setTimeout(ee,700)}catch(A){$(`Upload failed: ${A instanceof Error?A.message:String(A)}`),U&&(U.disabled=!1),L&&(L.disabled=!1)}};a.addEventListener("click",K=>{K.target.closest("[data-mpd-ac-close]")&&(K.preventDefault(),ee())}),L==null||L.addEventListener("click",()=>void G()),Y==null||Y.addEventListener("click",()=>ie()),U==null||U.addEventListener("click",()=>void He()),(typeof MediaRecorder>"u"||!((ke=navigator.mediaDevices)!=null&&ke.getUserMedia))&&($("Audio recording is not available in this browser."),L&&(L.disabled=!0))}const Gi="fusion-mpd-application-only-display";function ja(){try{return sessionStorage.getItem(Gi)==="1"}catch{return!1}}function Do(e){try{e?sessionStorage.setItem(Gi,"1"):sessionStorage.removeItem(Gi)}catch{}}function rn(e){try{const t=typeof e=="string"?JSON.parse(e):e&&typeof e=="object"?e:{};return!t||typeof t!="object"||Array.isArray(t)?{}:t}catch{return{}}}function Ro(e){return Object.keys(rn(e)).filter(Boolean).length}function Ho(e){const t=rn(e);for(const i of Object.values(t)){if(!i||typeof i!="object")continue;const a=i,n=[a.payload,a.payloadJson,a];for(const s of n){const l=typeof s=="string"?s:s&&typeof s=="object"?JSON.stringify(s):"";if(l&&Nn(l))return!0}}return!1}function Oo(e){return e.applicationOnlyToggleVisible?!!e.applicationOnlyDisplay:e.applicationOnlyDisplay?!0:String(e.membershipGate||"")!=="needsSubscription"?!1:Number(e.applicationCount)>=1}function qo(e){return e.applicationOnlyToggleVisible||e.applicationOnlyDisplay?!1:String(e.membershipGate||"")==="needsSubscription"&&Number(e.applicationCount)<1}function Wo(e){return!!(Ut||e.isRealAdmin||e.hasTesterApplication)}function Ee(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Vo(e,t){const i=e&&typeof e=="object"?e:{},a=i.value&&typeof i.value=="object"?i.value:i,n=a.en&&typeof a.en=="object"?a.en:{},s=a[t]&&typeof a[t]=="object"?a[t]:{};return{...n,...s}}function Jo(e){const t=e&&typeof e=="object"&&!Array.isArray(e)?e:{},i=t.includedBullets??t.includes;return Array.isArray(i)?i.map(a=>String(a??"").trim()).filter(Boolean):[]}function Yo(e){return e==="ja"?{monthly:{title:"月額メンバーシップ",displayPrice:"$30",every:"月額",subtext:"",badge:"フレキシブル",includedBullets:["フルのアーティストプロフィール","FUSION限定コンテンツ","メンバー料金での応募","いつでも解約可能"]},quarterly:{title:"四半期メンバーシップ",displayPrice:"$75",every:"3か月ごと",subtext:"月あたり約 $25 · 17%お得",badge:"おすすめ",includedBullets:["フルのアーティストプロフィール","FUSION限定コンテンツ","四半期ごとに1回のレジデンシー応募クレジット","四半期ごとに1回のプログラムアワード参加","追加応募は $35"]},annual:{title:"年間メンバーシップ",displayPrice:"$260",every:"年額",subtext:"月あたり約 $21.67 · 28%お得",badge:"お得",includedBullets:["フルのアーティストプロフィール","FUSION限定コンテンツ","年間4回のレジデンシー応募クレジット","年間4回のプログラムアワード参加","マーケティング機会の拡大"]}}:{monthly:{title:"Monthly Membership",displayPrice:"$30",every:"per month",subtext:"",badge:"Flexible",includedBullets:["Full artist profile","Exclusive FUSION content","Applications available at member rate","Cancel anytime"]},quarterly:{title:"Quarterly Membership",displayPrice:"$75",every:"every 3 months",subtext:"$25/month · Save 17%",badge:"Recommended",includedBullets:["Full artist profile","Exclusive FUSION content","1 residency application credit per quarter","1 Program Award entry per quarter","Additional applications $35"]},annual:{title:"Annual Membership",displayPrice:"$260",every:"per year",subtext:"$21.67/month · Save 28%",badge:"Best value",includedBullets:["Full artist profile","Exclusive FUSION content","4 residency application credits per year","4 Program Award entries per year","Increased marketing opportunities"]}}}function Li(e,t,i,a,n){const s=i&&typeof i=="object"?i:{},l=Jo(i),d=String(s.every??"").trim()||e.subtext2||t.subtext2||n.every,p=l.length>0?l:e.includedBullets.length>0?e.includedBullets:t.includedBullets.length>0?t.includedBullets:a.length>0?a:[...n.includedBullets];return{title:e.title||t.title||n.title,displayPrice:e.displayPrice||t.displayPrice||n.displayPrice,every:d,subtext:e.subtext||t.subtext||n.subtext,subtext2:e.subtext2||t.subtext2||"",includedBullets:p}}function Go(e,t,i="en"){const a=i==="ja"?"ja":"en",n=Vo(e,a),s=jn(t,a),l=Mi(n.planMonthly),d=Mi(n.planQuarterly),p=Mi(n.planAnnual),u=Array.isArray(n.includes)?n.includes.map(O=>String(O??"").trim()).filter(Boolean):[],f=Yo(a),g=Li(l,s.monthly,n.planMonthly,u,f.monthly),b=Li(d,s.quarterly,n.planQuarterly,u,f.quarterly),C=Li(p,s.annual,n.planAnnual,u,f.annual),v=String(n.planMonthly&&typeof n.planMonthly=="object"?n.planMonthly.badge??"":"").trim(),w=String(n.planQuarterly&&typeof n.planQuarterly=="object"?n.planQuarterly.badge??"":"").trim(),P=String(n.planAnnual&&typeof n.planAnnual=="object"?n.planAnnual.badge??"":"").trim(),L=Array.isArray(n.collage)?n.collage.map(O=>{if(!O||typeof O!="object")return null;const ee=String(O.src??"").trim();return ee?{src:ee,alt:String(O.alt??"").trim()}:null}).filter(Boolean):[],Y=[{src:Fn,alt:a==="ja"?"プログラム":"Programs rooted in Japan"},{src:Un,alt:a==="ja"?"スタジオ実践":"Studio practice"},{src:Dn,alt:a==="ja"?"ネットワーク":"Network and place"}],U=[0,1,2].map(O=>L[O]||Y[O]),$=a==="ja"?{eyebrow:"スタジオをアンロック",headline:"あなたの実践は、より広い文脈に属しています。",support:"FUSIONメンバーになると、フルのアーティストプロフィール、限定コンテンツ、日本をルーツにしたプログラムへの参加が開きます。",notice:"メンバーシップがなくても、プログラム応募状況は確認できます。",cta:"安全なチェックアウトへ",foot:"安全なお支払い · いつでも解約可能"}:{eyebrow:"Unlock your studio",headline:"Your practice belongs in a wider context.",support:"Become a FUSION member to open your full artist profile, access exclusive content, and participate in programs rooted in Japan.",notice:"You can continue to access Programs without membership.",cta:"Continue to secure checkout",foot:"Secure payment · Cancel anytime"};return{eyebrow:$.eyebrow,headline:String(n.storyHeadline??"").trim()||$.headline,support:String(n.storySubheadline??"").trim()||$.support,notice:$.notice,ctaLabel:String(n.ctaLabel??"").trim()||$.cta,foot:$.foot,collage:U,plans:{monthly:{...g,badge:v||f.monthly.badge,tier:"monthly"},quarterly:{...b,badge:w||f.quarterly.badge,tier:"quarterly",recommended:!0},annual:{...C,badge:P||f.annual.badge,tier:"annual"}}}}function zo(e){const t=(e.collage||[]).map((a,n)=>`<img class="mpd-join-unlock__thumb" data-mpd-join-collage="${n}" src="${Ee(a.src)}" alt="${Ee(a.alt)}" loading="lazy" decoding="async" />`).join(""),i=a=>{const n=(a.includedBullets||[]).slice(0,6).map(d=>`<li><span class="mpd-join-unlock__check" aria-hidden="true"></span><span>${Ee(d)}</span></li>`).join(""),s=a.every||(a.tier==="monthly"?"per month":a.tier==="quarterly"?"every 3 months":"per year");return`
      <button type="button" class="mpd-join-unlock__plan${a.recommended?" is-recommended is-selected":""}" data-mpd-join-tier="${Ee(a.tier)}" role="radio" aria-checked="${a.recommended?"true":"false"}">
        ${a.badge?`<span class="mpd-join-unlock__badge">${Ee(a.badge)}</span>`:""}
        <span class="mpd-join-unlock__plan-title">${Ee(a.title||a.tier)}</span>
        <span class="mpd-join-unlock__plan-price">${Ee(a.displayPrice)}</span>
        <span class="mpd-join-unlock__plan-every">${Ee(s)}</span>
        ${a.subtext?`<span class="mpd-join-unlock__plan-sub">${Ee(a.subtext)}</span>`:""}
        <span class="mpd-join-unlock__rule" aria-hidden="true"></span>
        <ul class="mpd-join-unlock__bullets">${n}</ul>
      </button>`};return`
    <div class="mpd-join-unlock" id="mpdJoinUnlockInner">
      <p class="mpd-join-unlock__eyebrow">${Ee(e.eyebrow)}</p>
      <div class="mpd-join-unlock__hero">
        <div class="mpd-join-unlock__copy">
          <h2 class="mpd-join-unlock__headline">${Ee(e.headline)}</h2>
          <p class="mpd-join-unlock__support">${Ee(e.support)}</p>
          <p class="mpd-join-unlock__notice">
            <span class="mpd-join-unlock__notice-icon" aria-hidden="true"></span>
            <span>${Ee(e.notice)}</span>
          </p>
        </div>
        <div class="mpd-join-unlock__collage">${t}</div>
      </div>
      <div class="mpd-join-unlock__plans" id="mpdJoinUnlockPlans" role="radiogroup" aria-label="Membership plans">
        ${i(e.plans.monthly)}
        ${i(e.plans.quarterly)}
        ${i(e.plans.annual)}
      </div>
      <button type="button" class="mpd-join-unlock__cta" id="mpdJoinUnlockCta">${Ee(e.ctaLabel)}</button>
      <p class="mpd-join-unlock__foot">${Ee(e.foot)}</p>
    </div>`}function Qo(e,t={}){var p;let i=t.defaultTier==="monthly"||t.defaultTier==="annual"?t.defaultTier:"quarterly";const a=e.querySelector("#mpdJoinUnlockPlans"),n=()=>{a==null||a.querySelectorAll("[data-mpd-join-tier]").forEach(u=>{const g=u.getAttribute("data-mpd-join-tier")===i;u.classList.toggle("is-selected",g),u.setAttribute("aria-checked",g?"true":"false")})},s=u=>{var b,C;const f=(C=(b=u.target)==null?void 0:b.closest)==null?void 0:C.call(b,"[data-mpd-join-tier]");if(!(f instanceof HTMLElement))return;const g=f.getAttribute("data-mpd-join-tier");g!=="monthly"&&g!=="quarterly"&&g!=="annual"||(i=g,n())},l=()=>{const u=typeof t.getBillingEmail=="function"?String(t.getBillingEmail()||"").trim():"";window.dispatchEvent(new CustomEvent("fusion-open-join-network",{detail:{mode:"resubscribe",subscriptionTier:i,fromJoinNetworkPage:!0,stage:"payment",...u.includes("@")?{email:u}:{}}}))};a==null||a.addEventListener("click",s),(p=e.querySelector("#mpdJoinUnlockCta"))==null||p.addEventListener("click",l),n();const d=xo(e,{attrName:"data-mpd-join-collage",intervalMs:1e4});return()=>{var u;d(),a==null||a.removeEventListener("click",s),(u=e.querySelector("#mpdJoinUnlockCta"))==null||u.removeEventListener("click",l)}}function Ko(e=new Date){const t=e.getUTCFullYear(),i=e.getUTCMonth(),a=Math.floor(i/3)*3;let n=t,s=a+3;return s>=12&&(s=0,n+=1),new Date(Date.UTC(n,s,1,0,0,0,0))}function Xo(e,t=new Date){const i=String(e||"").trim();if(i){const a=new Date(i);if(!Number.isNaN(a.getTime())&&a.getTime()>t.getTime())return a}return new Date(Date.UTC(t.getUTCFullYear()+1,0,1,0,0,0,0))}function Zo(e){if(!(e instanceof Date)||Number.isNaN(e.getTime()))return"—";try{return new Intl.DateTimeFormat(void 0,{year:"numeric",month:"short",day:"numeric",timeZone:"UTC"}).format(e)}catch{return e.toISOString().slice(0,10)}}function er(e){const t=String(e.access||"").trim().toLowerCase(),i=Re(e.tier),a=!!e.showForMonthly,n=e.now instanceof Date?e.now:new Date,s=Math.max(0,Math.round(Number(e.appCreditBalance)||0)),l=Math.max(0,Math.round(Number(e.awardEntryBalance)||0)),d=String(e.nextAccrualHint||"").trim();if(t==="exempt")return{visible:!0,tier:i||"",access:"exempt",applicationCreditsLabel:String(Math.max(1,s)),awardEntriesLabel:String(l),drawCreditsLabel:String(l),nextCreditsLabel:d||"Included",nextCreditsHint:"Complimentary membership includes formal applications. No included Program Award credits — purchase available when a cycle is active.",appCreditBalance:Math.max(1,s),awardEntryBalance:l,quarterKey:ka(n),yearKey:$a(n)};if(i!=="quarterly"&&i!=="annual"&&!(a&&i==="monthly"))return null;const p=i==="quarterly"?Ko(n):i==="annual"?Xo(e.periodEndIso,n):null;let u="Credits apply to formal program applications only. Program Award entries are separate.";i==="quarterly"?u="+1 application credit and +1 Program Award entry when membership renews each quarter. Credits apply to formal applications only.":i==="annual"?u="+4 application credits and +4 Program Award entries when membership renews each year (stackable).":i==="monthly"&&(u="No included application credits — $35 per formal application. Buy a $50 Program Award entry on an active cycle.");let f=p?Zo(p):"—";return d&&(/^\d{4}(-Q[1-4])?$/.test(d)||d.toLowerCase()==="included")&&(f=d),{visible:!0,tier:i||"",access:t||"ok",applicationCreditsLabel:String(s),awardEntriesLabel:String(l),drawCreditsLabel:String(l),nextCreditsLabel:f,nextCreditsHint:u,appCreditBalance:s,awardEntryBalance:l,quarterKey:ka(n),yearKey:$a(n)}}const tr="/assets/explore-programs-3becc4f9.svg",ir="/assets/my-programs-83f66ba0.svg",zi="/assets/payments-08af1cce.svg",ar="/assets/manual-payment-417bd749.svg",Fa="/assets/payment-plan-d3fd375b.svg",nr="/assets/receipt-download-ee91e1a5.svg",St="/assets/warning-d449b082.svg",Ua="/assets/flight-icon-a8cccfa4.png",or="/assets/identity-f9717c5a.jpg",rr="/assets/work-aaa01cb3.jpg",sr="/assets/exhibitions-programs-aedd6f13.jpg",dr="/assets/media-library-30799c76.jpg",lr="/assets/journal-7d211690.jpg",cr="/assets/profile-preview-ce335ed0.jpg";function pr(){return`<select id="mpd_discipline" class="studio-input" aria-label="Discipline">${['<option value="">Select discipline…</option>',...ao.map(t=>`<option value="${se(t.key)}">${se(t.label)}</option>`)].join("")}</select>`}function se(e){return String(e??"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function Ie(e){const t=Ji(e);return`<span class="studio-nav-item__icon" aria-hidden="true">${t?`<img src="${se(t)}" alt="" />`:'<span class="studio-nav-item__icon-fallback">•</span>'}</span>`}function ze(e,t){return`<span class="${se(t)}" style="--mpd-icon-url: url(&quot;${se(e)}&quot;)" aria-hidden="true"></span>`}function pt(e){no({title:`${e} · Fusion`,description:"Edit your Fusion member profile and account settings. Sign in with Internet Identity.",path:typeof window<"u"?window.location.pathname:"/settings/profile",robots:"noindex, nofollow"})}const mr={"studio-overview":{en:"Studio Overview",ja:"スタジオ概要"},identity:{en:"Presence",ja:"プレゼンス"},work:{en:"Work",ja:"作品"},programs:{en:"Programs",ja:"プログラム"},media:{en:"Media",ja:"メディア"},journal:{en:"Journal",ja:"ジャーナル"},preview:{en:"Profile",ja:"プロフィール"},settings:{en:"Settings",ja:"設定"},"your-studio":{en:"Studio",ja:"スタジオ"},completion:{en:"PROFILE COMPLETION",ja:"プロフィール完成度"},blindspots:{en:"BLINDSPOTS",ja:"ブラインドスポット"},"studio-sections":{en:"STUDIO SECTIONS",ja:"スタジオセクション"},"publish-settings":{en:"PUBLISH SETTINGS",ja:"公開設定"},"save-changes":{en:"SAVE CHANGES",ja:"変更を保存"},improve:{en:"IMPROVE",ja:"改善"},"edit-section":{en:"EDIT SECTION",ja:"セクションを編集"},manage:{en:"MANAGE",ja:"管理"},"view-profile":{en:"VIEW FULL PROFILE",ja:"プロフィールを見る"},"view-public-profile":{en:"VIEW PUBLIC PROFILE",ja:"公開プロフィールを見る"},"apply-residency":{en:"APPLY TO RESIDENCY",ja:"レジデンシーに応募"},"coming-soon":{en:"Coming soon",ja:"近日公開"},incomplete:{en:"Profile Incomplete",ja:"プロフィール未完成"},complete:{en:"Profile Complete",ja:"プロフィール完成"}};function Xe(e){const t=mr[e];return t?(document.documentElement.lang||"en")==="ja"&&t.ja?t.ja:t.en:e}const li="/program/kaga-ishikawa",ur=1*1024*1024,fr="en",gr=["practice","perspective","vision","constructing","context","quote"];let Qi="world",Je=null,ni=!1,Ki="",Xi="",sn=()=>{};const Zi=new Map;let nt="inactive",ci=[],ut="",pi=[];const Da={"studio-overview":{shoutHtml:"Your creative space.<br />Shape your presence.",hint:"Track your  development, explore sections, and publish when you are ready."},overview:{shoutHtml:"Your creative space.<br />Shape your presence.",hint:"Track your development, explore sections, and publish when you are ready."},identity:{shoutHtml:"Define who you are.",hint:"Name, discipline, bio, status, location, and the story behind your work — save each section as you go."},work:{shoutHtml:"Your portfolio.",hint:"Manage works, projects, and the pieces that define your practice."},media:{shoutHtml:"Your visual library.",hint:"Main artwork, profile card, intro gallery, and audio — all in one place."},journal:{shoutHtml:"Your creative journal.",hint:"Notes, reflections, and entries from your practice."},preview:{shoutHtml:"See how others see you.",hint:"Preview your public profile as visitors will experience it."},settings:{shoutHtml:"Account &amp; membership.",hint:"Membership status, account recovery, and linked account information."},location:{shoutHtml:"Where you are in your practice.",hint:"Set your studio status and location so visitors and partners see the right context."},story:{shoutHtml:"Clarify the core of your work.",hint:"Your practice, perspective, vision, and how you are constructing the world you want to create."},links:{shoutHtml:"Your presence beyond Fusion.",hint:"Link to your site, socials, and portfolios so people can follow your work everywhere."},programs:{shoutHtml:"Programs and opportunities.",hint:"Track applications and explore public programs that match your practice."},"join-unlock":{shoutHtml:"Unlock your studio.",hint:"Become a FUSION member to open your full profile and exclusive platform access. You can still track applications under Programs."},membership:{shoutHtml:"Your membership keeps your practice visible.",hint:"View billing, update payment, or manage your subscription. We are here if you need help."},dev:{shoutHtml:"Developer tools.",hint:"Raw locales JSON for debugging. Use with care."}};function Gt(e,...t){if(!e||typeof e!="object")return"";const i=e;for(const a of t){const n=i[a];if(n!=null){if(Array.isArray(n)){const s=ra(n);if(s!=null)return String(s).trim()}else if(typeof n=="string")return n.trim()}}return""}function Ra(e){if(!e||typeof e!="object")return"";const t=e.locales_json??e.localesJson;if(typeof t=="string")return t;const i=Array.isArray(t)?ra(t):t;return typeof i=="string"?i:""}function yr(e){const t=String(e||"").toLowerCase();return t?{active:"Active",trialing:"Trialing",past_due:"Past due",canceled:"Canceled",unpaid:"Unpaid",incomplete:"Incomplete",incomplete_expired:"Incomplete (expired)",paused:"Paused"}[t]||String(e):"No subscription"}function zt(e){if(!e)return"—";const t=new Date(e);if(Number.isNaN(t.getTime()))return"—";try{return new Intl.DateTimeFormat(void 0,{dateStyle:"long"}).format(t)}catch{return e.slice(0,10)}}function Ha(e){if(!e)return"";const t=new Date(e);if(Number.isNaN(t.getTime()))return"";const i=new Date,a=Math.ceil((t.getTime()-i.getTime())/864e5);return a===0?"Today":a===1?"Tomorrow":a>1?`In ${a} days`:a===-1?"Yesterday":`${Math.abs(a)} days ago`}async function ki(e){const{file:t,heicWarning:i}=await Io(e,ur);return i&&je("HEIC photo accepted — if preview fails, export as JPEG or WebP and upload again."),t}function $i(e){document.querySelectorAll(".mpd-file-input-hidden").forEach(t=>{var i;t instanceof HTMLInputElement&&((i=t.accept)!=null&&i.includes("image"))&&(t.disabled=!e)}),document.querySelectorAll(".mpd-media-upload-label").forEach(t=>{t instanceof HTMLElement&&(t.classList.toggle("is-disabled",!e),t.style.pointerEvents=e?"":"none",t.style.opacity=e?"":"0.45",e?(t.removeAttribute("aria-disabled"),t.removeAttribute("title")):(t.setAttribute("aria-disabled","true"),t.title="Loading profile…"))})}function je(e){if(sn(e||""),!e)return;const t=document.getElementById("settingsProfileStatus");t&&t.scrollIntoView({block:"nearest",behavior:"smooth"})}function xi(e){return Ki||Xi||rt()==="test"?!0:(je("Profile still loading — wait a moment, then try your upload again."),e.value="",!1)}function dn(e){return document.getElementById(e)}function hr(e){if(!e||typeof e!="object")return"Studio";const t=e.role;return t&&typeof t=="object"&&("user"in t||"artist"in t||"gallery"in t||"curator"in t||"collector"in t||"staff"in t||"admin"in t)?"Studio":"User Profile"}function T(e){const t=dn(e);return!t||!("value"in t)?"":String(t.value??"")}function H(e,t){const i=dn(e);i&&"value"in i&&(i.value=t)}function Ti(){return T("mpd_w_quote").trim()}function Ze(e){const t=document.getElementById("mpd_hero_spinner");t&&(t.hidden=!e,t.setAttribute("aria-hidden",e?"false":"true"))}function et(e){const t=document.getElementById("mpd_hero_profile_spinner");t&&(t.hidden=!e,t.setAttribute("aria-hidden",e?"false":"true"))}function Ue(e,t){const i=document.getElementById(`mpd_intro_${e}_spinner`);i&&(i.hidden=!t,i.setAttribute("aria-hidden",t?"false":"true"))}function De(e,t){const i=document.querySelector(`[data-mpd-media-surface="${e}"]`);if(!i)return;const a=!!(t.hasPreview??t.hasMedia);i.classList.toggle("has-media",!!t.hasMedia),i.classList.toggle("has-preview",a)}function st(e){const t=Zi.get(e);t&&(URL.revokeObjectURL(t),Zi.delete(e))}function Bi(e,t){st(e);const i=URL.createObjectURL(t);Zi.set(e,i);const a=/^intro-(\d+)$/.exec(e);if(a){const n=Number(a[1]);De(e,{hasMedia:!1,hasPreview:!0}),Ue(n,!1);const s=document.getElementById(`mpd_intro_${n}_thumb`);s&&(s.src=i,s.style.display="block");return}if(e==="hero"){De("hero",{hasMedia:!1,hasPreview:!0}),Ze(!1);const n=document.getElementById("mpd_hero_preview");n&&(n.src=i,n.style.display="block");return}if(e==="heroProfile"){De("heroProfile",{hasMedia:!1,hasPreview:!0}),et(!1);const n=document.getElementById("mpd_hero_profile_preview");n&&(n.src=i,n.style.display="block")}}function br(e,t){st(e);const i=/^intro-(\d+)$/.exec(e);if(!i)return;const a=Number(i[1]);De(e,{hasMedia:!0,hasPreview:!0});const n=document.getElementById(`mpd_intro_${a}_thumb`);n&&(n.style.display="none",n.onload=()=>{Ue(a,!1),n.style.display="block",n.onload=null,n.onerror=null},n.onerror=()=>{Ue(a,!1),De(e,{hasMedia:!0,hasPreview:!1}),je("Preview could not load. Save and refresh, or try another image."),n.onload=null,n.onerror=null},n.src=mi(t),n.complete&&n.naturalHeight>0&&(Ue(a,!1),n.style.display="block",n.onload=null,n.onerror=null))}function Qt(e){if(st(e),De(e,{hasMedia:!1,hasPreview:!1}),e==="hero"){const i=document.getElementById("mpd_hero_preview");i&&(i.removeAttribute("src"),i.style.display="none"),Ze(!1);return}if(e==="heroProfile"){const i=document.getElementById("mpd_hero_profile_preview");i&&(i.removeAttribute("src"),i.style.display="none"),et(!1);return}const t=/^intro-(\d+)$/.exec(e);if(t){const i=Number(t[1]);Ue(i,!1);const a=document.getElementById(`mpd_intro_${i}_thumb`);a&&(a.removeAttribute("src"),a.style.display="none")}}function oi(){const e=document.getElementById("mpd_hero_profile_card_name"),t=document.getElementById("mpd_hero_profile_card_discipline"),i=[T("mpd_first_name"),T("mpd_last_name")].map(s=>s.trim()).filter(Boolean).join(" "),a=document.getElementById("mpd_discipline");let n="";a instanceof HTMLSelectElement?n=a.selectedIndex>0?a.options[a.selectedIndex].text:"":n=T("mpd_discipline").trim(),e&&(e.textContent=i||"Artist Name"),t&&(t.textContent=n||"Discipline")}let ri=0;function Kt(e){ri+=1;const t=document.getElementById("mpd_upload_overlay"),i=document.getElementById("mpd_upload_overlay_label");i&&(i.textContent=e||"Uploading image..."),t&&(t.hidden=!1,t.setAttribute("aria-hidden","false"))}function Xt(){if(ri=Math.max(0,ri-1),ri>0)return;const e=document.getElementById("mpd_upload_overlay");e&&(e.hidden=!0,e.setAttribute("aria-hidden","true"))}function mi(e){const t=String(e||"").trim();if(!t||typeof window>"u")return t;try{const i=new URL(t,window.location.origin);return i.searchParams.set("mpdPreview",String(Date.now())),i.href}catch{const i=t.includes("?")?"&":"?";return`${t}${i}mpdPreview=${Date.now()}`}}function Zt(e,t="",i={}){typeof window>"u"||window.dispatchEvent(new CustomEvent("fusion-profile-save-status",{detail:{state:e,message:t,operation:i.operation||"",detail:i.detail||""}}))}function ea(e){const t=e instanceof Error?e.message:String(e??""),i=`${t} ${e&&typeof e=="object"&&"message"in e?String(e.message):""}`;return/No linked artist on account/i.test(i)?"Your account is not linked to a profile yet. Refresh this page, or contact Fusion if the problem continues.":/Linked artist not found/i.test(i)?"Your linked profile record could not be found. Refresh this page, or contact Fusion for help.":/No account for caller/i.test(i)?"You're signed in, but this Internet Identity isn't linked to a Fusion member account. Contact support with your checkout email if you paid with a different login.":/Active membership required/i.test(i)?"Translation requires an active membership. Choose Just save to update your profile without translation, or renew membership first.":/Text too long for Studio LLM/i.test(i)?"Some text is too long to translate automatically. Choose Just save, or shorten your bio and story sections.":/Image URL too long|Profile image URL too long/i.test(i)?"An image URL is too long to save. Try re-uploading the image, or use a shorter hosted URL.":/Audio URL too long/i.test(i)?"The audio URL is too long to save. Try re-uploading the file.":/Anonymous caller/i.test(i)?"Your session expired. Sign in again, then retry saving.":t&&t.length<280&&!/Request ID:|Reject code:|ic0\.trap|Canister called/i.test(t)?t:"Profile could not be saved. Try Just save without translation, refresh the page, or contact Fusion if this keeps happening."}function Ae(e){try{return JSON.parse(JSON.stringify(e??null))}catch{return e}}function vr(e,t,i){const n=Ke(e&&typeof e=="object"?e:{},t)[i];return n&&typeof n=="object"&&!Array.isArray(n)?n:{}}function da(e){const t={};for(const i of gr)t[i]=e[i];return t}function ui(){const e=Ga(T),t=e.world&&typeof e.world=="object"&&!Array.isArray(e.world)?e.world:{};return da(t)}function Ni(){return Je=ui(),Ga(T)}function _r(e){H("mpd_w_practice",String(e.practice??"")),H("mpd_w_perspective",Yt(e.perspective)),H("mpd_w_vision",Yt(e.vision)),H("mpd_w_constructing",Yt(e.constructing)),H("mpd_w_context",Yt(e.context)),H("mpd_w_quote",String(e.quote??""))}function wr(e){const t=document.getElementById("mpd-story");t&&t.classList.toggle("mpd-story--readonly",e),document.querySelectorAll(".mpd-story-input").forEach(i=>{(i instanceof HTMLInputElement||i instanceof HTMLTextAreaElement)&&(i.readOnly=e,i.setAttribute("aria-readonly",e?"true":"false"))}),document.querySelectorAll(".mpd-story-edit-btn").forEach(i=>{i instanceof HTMLButtonElement&&(i.disabled=e,i.setAttribute("aria-hidden",e?"true":"false"))})}function Sr(e,t){const i=e==="newWorld"&&t?"newWorld":"world",a=document.getElementById("mpd_public_world_source");a&&(a.value=i);const n=document.getElementById("mpd_public_world_source_note");n&&(n.textContent=`${i==="newWorld"?"New World":"World"} will display on your profile.`),document.querySelectorAll("[data-mpd-world-source]").forEach(s=>{if(!(s instanceof HTMLButtonElement))return;const l=s.getAttribute("data-mpd-world-source"),d=l==="newWorld",p=l===i;s.classList.toggle("is-active",p),s.classList.toggle("is-disabled",d&&!t),s.setAttribute("aria-pressed",p?"true":"false"),s.disabled=!!(d&&!t),d&&!t?(s.setAttribute("aria-disabled","true"),s.title="New World will unlock after generated copy is available."):(s.removeAttribute("aria-disabled"),s.removeAttribute("title"))})}function ta(e,t){ni=an(e);let i=t==="world"||t==="newWorld"?t:tn(e);i==="newWorld"&&!ni&&(i="world"),Sr(i,ni)}function ln(e,t,i=!1){i&&(Je=ui());const a=vr(e,t,"world");ni=an(e),_r(Je||da(a)),wr(!1),Qi="world"}function fi(e){if(e==null)return[];if(Array.isArray(e))return e.flatMap(i=>fi(i));if(typeof e=="object")return Object.values(e).flatMap(i=>fi(i));const t=String(e).trim();return t?[t]:[]}function Pr(e){const t=e.world&&typeof e.world=="object"?e.world:{},i=[e.discipline,e.bio,...fi(t)].join(`
`);return i.trim()?/[\u3040-\u30ff\u3400-\u9fff]/.test(i)?"ja":/[A-Za-z]/.test(i)&&!/[^\x00-\x7F]/.test(i)?"en":"other":"en"}function Oa(e){return fi({firstName:e.firstName,lastName:e.lastName,name:e.name,discipline:e.discipline,bio:e.bio,world:e.world}).some(Boolean)}function Er(e){const t=Ke(e,"en");if(Oa(t))return e;const i=Ke(e,"ja");return Oa(i)?{...e,en:Ae(i)}:e}async function jt(e,t,i){if(e==null)return"";if(Array.isArray(e))return Promise.all(e.map(n=>jt(n,t,i)));const a=String(e??"").trim();return a?(await Co(a,t,i)).trim():""}function ot(e){return e==null?"":Array.isArray(e)||typeof e=="object"?JSON.stringify(e):String(e).trim()}async function ei(e,t,i,a,n){const s=Ae(e)||{},l=a&&typeof a=="object"&&n&&typeof n=="object",d=($,O)=>l&&ot(O)===ot(a[$])&&n[$]!=null?Promise.resolve(Ae(n[$])):jt(O,t,i),[p,u]=await Promise.all([d("discipline",e.discipline),d("bio",e.bio)]);s.discipline=p,s.bio=u,s.bioLong="";const f=e.world&&typeof e.world=="object"&&!Array.isArray(e.world)?e.world:{},g=Ae(f)||{},b=l&&a.world&&typeof a.world=="object"?a.world:void 0,C=l&&n.world&&typeof n.world=="object"?n.world:void 0,v=($,O)=>b&&C&&ot(O)===ot(b[$])&&C[$]!=null?Promise.resolve(Ae(C[$])):jt(O,t,i),w=await Promise.all([v("practice",f.practice),v("perspective",f.perspective),v("vision",f.vision),v("constructing",f.constructing),v("context",f.context),v("quote",f.quote)]);[g.practice,g.perspective,g.vision,g.constructing,g.context,g.quote]=w;const P=Array.isArray(f.introGallery)?Ae(f.introGallery):[],L=b&&Array.isArray(b.introGallery)?b.introGallery:[],Y=C&&Array.isArray(C.introGallery)?C.introGallery:[],U=await Promise.all(P.filter($=>$&&typeof $=="object").map(async($,O)=>{const ee=L[O],te=Y[O],me=ee&&typeof ee=="object"&&te&&typeof te=="object",[ie,G]=await Promise.all([me&&ot($.alt)===ot(ee.alt)&&te.alt!=null?Promise.resolve(Ae(te.alt)):jt($.alt,t,i),me&&ot($.caption)===ot(ee.caption)&&te.caption!=null?Promise.resolve(Ae(te.caption)):jt($.caption,t,i)]);return{...$,alt:ie,caption:G}}));return g.introGallery=U,s.world=g,s}async function Ar(e,t,i,a={}){const n=p=>a._valOverrides&&p in a._valOverrides?a._valOverrides[p]:i(p),s=Ae(e&&typeof e=="object"?e:{en:{},ja:{}})||{},l=p=>{const u=Ke(e,p),f=Ke(s,p),g=u.worldNew;f&&typeof f=="object"&&g&&typeof g=="object"&&!Array.isArray(g)&&(f.worldNew=Ae(g),s[p]=f)};if(a.translate===!1)s.en=Ae(t),s.ja=Ae(t);else try{const p=Pr(t),u=Ke(e,"en"),f=Ke(e,"ja");if(p==="ja")s.ja=Ae(t),s.en=await ei(t,"en","ja",f,u);else if(p==="en")s.en=Ae(t),s.ja=await ei(t,"ja","en",u,f);else{const[g,b]=await Promise.all([ei(t,"en","auto",u,u),ei(t,"ja","auto",u,f)]);s.en=g,s.ja=b}}catch(p){const u=ea(p);throw new Error(u.includes("Just save")?u:`${u} Try Just save without translation.`)}return l("en"),l("ja"),n("mpd_public_world_source")==="world"?s.publicWorldSource="world":delete s.publicWorldSource,nn(s)}function ti(e,t){const i=Ke(e,t),a=i.world&&typeof i.world=="object"&&!Array.isArray(i.world)?i.world:{},n=String(i.firstName??"").trim(),s=String(i.lastName??"").trim();if(n||s)H("mpd_first_name",n),H("mpd_last_name",s);else{const f=String(i.name??"").trim().split(/\s+/).filter(Boolean);H("mpd_first_name",f[0]??""),H("mpd_last_name",f.length>1?f.slice(1).join(" "):"")}H("mpd_discipline",oo(String(i.discipline??""))),oi(),H("mpd_bio",String(i.bio??i.bioLong??"")),mn(i.status);const l=i.location&&typeof i.location=="object"&&!Array.isArray(i.location)?i.location:{};H("mpd_loc_city",String(l.city??"")),H("mpd_loc_state",String(l.state??"")),H("mpd_loc_country",String(l.country??"")),H("mpd_loc_display",String(l.display??"")),Je=da(a);const d=ro(a);for(let u=0;u<3;u++){const f=d[u]||{src:"",alt:"",caption:""};H(`mpd_intro_${u}_src`,f.src),H(`mpd_intro_${u}_alt`,f.alt),H(`mpd_intro_${u}_caption`,f.caption);const g=document.getElementById(`mpd_intro_${u}_thumb`);g&&(De(`intro-${u}`,{hasMedia:!!f.src,hasPreview:!!f.src}),f.src?(Ue(u,!0),g.style.display="none",g.onload=()=>{Ue(u,!1),g.style.display="block",g.onload=null,g.onerror=null},g.onerror=()=>{Ue(u,!1),g.onload=null,g.onerror=null},g.src=mi(f.src),g.complete&&g.naturalHeight>0&&(Ue(u,!1),g.style.display="block",g.onload=null,g.onerror=null)):(Ue(u,!1),g.removeAttribute("src"),g.style.display="none"))}const p=document.getElementById("mpd_dev_json");p&&Ut&&(p.value=so(e)),un(Array.isArray(i.links)?i.links:[]),ln(e,t,!1),ta(e,tn(e)),Cr()}function Cr(e){const t=document.getElementById("mpd_audio_section");if(!t)return;t.hidden=!1,t.setAttribute("aria-hidden","false"),t.classList.remove("mpd-audio-section--hidden"),t.querySelectorAll("input, textarea").forEach(n=>{(n instanceof HTMLInputElement||n instanceof HTMLTextAreaElement)&&(n.disabled=!1)});const i=document.querySelector('label[for="mpd_audio_file"]');i instanceof HTMLLabelElement&&(i.removeAttribute("aria-disabled"),i.style.pointerEvents="",i.style.opacity="");const a=document.getElementById("mpd_audio_record_open");a instanceof HTMLButtonElement&&(a.disabled=!1,a.style.opacity="")}const Ir="“Words mean more than what is set down on paper. It takes the human voice to infuse them with deeper meaning.” — Maya Angelou";async function Mr(){var t;const e=document.getElementById("mpd_audio_inspiration");if(e){try{const i=await Vi("user-studio"),a=i==null?void 0:i.audioInspirationText;if(a&&typeof a=="object"){const n=(t=document.documentElement.lang)!=null&&t.startsWith("ja")?"ja":"en",s=String(a[n]||a.en||"").trim();if(s){e.textContent=s;return}}}catch{}e.textContent=Ir}}let Ct={heroProfileImage:null,audioEntries:[]};function cn(e){if(!e)return"";let t="pending",i="Pending review";e.approved?(t="approved",i="Approved"):e.reason&&(t="rejected",i="Changes requested");const a=e.reason||e.imageUrl?' <button type="button" class="mpd-asset-review-banner__info-btn" data-action="review-info">More info</button>':"";return`<div class="mpd-asset-review-banner mpd-asset-review-banner--${t}">
    <span class="mpd-asset-review-banner__text">${i}</span>${a}
  </div>`}function pn(e){if(!e)return;let t="pending",i="Pending review";e.approved?(t="approved",i="Approved"):e.reason&&(t="rejected",i="Changes requested");const a=u=>String(u??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),n=e.reason?`<p class="mpd-review-note-modal__reason">${a(e.reason)}</p>`:"",s=e.imageUrl?`<img class="mpd-review-note-modal__image" src="${a(e.imageUrl)}" alt="Reference" />`:"",l=e.reviewedAt?`<p class="mpd-review-note-modal__date">Reviewed: ${new Date(Number(e.reviewedAt)/1e6||e.reviewedAt).toLocaleDateString()}</p>`:"",d=document.createElement("div");d.className="mpd-review-note-modal",d.innerHTML=`
    <div class="mpd-review-note-modal__scrim" data-close></div>
    <div class="mpd-review-note-modal__panel">
      <button class="mpd-review-note-modal__x" data-close>&times;</button>
      <h3>Review Note</h3>
      <div class="mpd-review-note-modal__status ${t}">${i}</div>
      ${n}
      ${s}
      ${l}
    </div>
  `;const p=()=>d.remove();d.querySelectorAll("[data-close]").forEach(u=>u.addEventListener("click",p)),document.body.appendChild(d)}async function Lr(){try{Ct=await lo()}catch(e){console.warn("Failed to load asset review notes",e),Ct={heroProfileImage:null,audioEntries:[]}}kr()}function kr(){const e=document.getElementById("mpd_hero_profile_review_banner");e&&(e.innerHTML=cn(Ct.heroProfileImage),e.querySelectorAll('[data-action="review-info"]').forEach(t=>{t.addEventListener("click",()=>pn(Ct.heroProfileImage))}))}function qa(e){const t=document.getElementById("mpd_audio_collection"),i=document.getElementById("mpd_audio_count"),a=document.getElementById("mpd_audio_actions");if(!t)return;const n=(e==null?void 0:e.entries)??[],s=(e==null?void 0:e.highlightUrl)??"",l=new Set((e==null?void 0:e.approvedUrls)??[]);if(i&&(i.hidden=n.length===0,i.textContent=`${n.length} / 5 audio bites`),a&&(a.hidden=n.length>=5),n.length===0){t.innerHTML="";return}const d=p=>String(p??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");t.innerHTML=n.map(p=>{const u=p.url===s,f=l.has(p.url),g=u?" is-highlight":"",b=f?"approved":"pending",C=f?"is-approved":"is-pending",v=Ct.audioEntries.find(([P])=>P.endsWith("|"+p.url)),w=v?cn(v[1]):"";return`<div class="mpd-audio-entry${g}" data-audio-url="${d(p.url)}">
        ${w}
        <app-audio-row active="true" data-audio-src="${d(p.url)}" data-audio-title="${d(p.title)}" data-layout="profile"></app-audio-row>
        <div class="mpd-audio-entry-controls">
          <button type="button" class="mpd-audio-highlight-btn${u?" active":""}" title="${u?"Currently highlighted":"Set as highlight"}" data-action="highlight">★</button>
          <span class="mpd-audio-entry-status ${C}">${b}</span>
          <button type="button" class="mpd-audio-delete-btn" title="Delete" data-action="delete">&times;</button>
        </div>
      </div>`}).join("")}async function Tt(){try{const e=await Yn();qa(e)}catch(e){console.error("Failed to load audio collection",e),qa(null)}}function mn(e){const t=String(e??"").trim(),i=["studio","prep","showing","available"].includes(t)?t:"studio",a=document.getElementById("mpd_status");a&&(a.value=i),document.querySelectorAll("[data-mpd-status]").forEach(n=>{const s=n.getAttribute("data-mpd-status")===i;n.classList.toggle("is-active",s),n.setAttribute("aria-pressed",s?"true":"false")})}function ii(e){const t=wt(e),i=t==="pending"?"public":t,a=document.getElementById("mpd_profile_visibility");a&&(a.value=i),document.querySelectorAll("[data-mpd-visibility]").forEach(d=>{const p=d.getAttribute("data-mpd-visibility")===i;d.classList.toggle("is-active",p),d.setAttribute("aria-pressed",p?"true":"false")});const n=document.getElementById("mpd_profile_visibility_review_notice");if(n){const d=t==="pending";n.hidden=!d,n.setAttribute("aria-hidden",d?"false":"true")}const s=document.getElementById("mpd_overview_visibility");s&&(s.value=i);const l=document.getElementById("mpd_overview_visibility_review");l&&(l.hidden=t!=="pending")}function $r(e,t){if(!e||typeof e!="object")return;let i={};try{t&&(i=typeof t=="string"?JSON.parse(t):t),(!i||typeof i!="object")&&(i={})}catch{return}let a=null,n=-1/0;for(const[,l]of Object.entries(i)){if(!l||typeof l!="object")continue;const d=l,p=d.payload;if(!p||typeof p!="object")continue;const u=d.submittedAt??d.submitted_at;let f=-1/0;if(typeof u=="number"&&Number.isFinite(u))f=u;else if(typeof u=="string"){const g=Date.parse(u);Number.isNaN(g)||(f=g)}f>=n&&(n=f,a=d)}if(!a||!a.payload||typeof a.payload!="object"){for(const[,l]of Object.entries(i))if(l&&typeof l=="object"&&l.payload&&typeof l.payload=="object"){a=l;break}}if(!a||!a.payload||typeof a.payload!="object")return;const s=a.payload;for(const l of["en","ja"]){(!e[l]||typeof e[l]!="object"||Array.isArray(e[l]))&&(e[l]={});const d=e[l],p=String(d.firstName??"").trim(),u=String(d.lastName??"").trim();if(!p&&s.firstName!=null&&(d.firstName=String(s.firstName).trim()),!u&&s.lastName!=null&&(d.lastName=String(s.lastName).trim()),!String(d.name??"").trim()){const v=String(d.firstName??"").trim(),w=String(d.lastName??"").trim();(v||w)&&(d.name=`${v} ${w}`.trim())}let g=d.location&&typeof d.location=="object"&&!Array.isArray(d.location)?{...d.location}:{};const b=(v,w)=>{if(w==null)return;const P=String(w).trim();P&&(String(g[v]??"").trim()||(g[v]=P))};b("country",s.country),b("state",s.stateProvince),b("city",s.city),Object.keys(g).length&&(d.location=g),!String(d.discipline??"").trim()&&s.discipline!=null&&(d.discipline=String(s.discipline).trim()),!String(d.bio??"").trim()&&s.bioStatement!=null&&(d.bio=String(s.bioStatement).trim());const C=s.website!=null?String(s.website).trim():"";if(C){const v=Array.isArray(d.links)?[...d.links]:[];v.some(P=>P&&typeof P=="object"&&String(P.url??"").trim())||(v.push({type:"website",url:C,label:C}),d.links=v)}}}function un(e){const t=document.getElementById("mpd-links");if(!t)return;const i=Array.isArray(e)&&e.length?e:[{type:"website",url:"",label:""}];t.replaceChildren();for(let a=0;a<i.length;a++){const n=i[a]&&typeof i[a]=="object"?i[a]:{},s=document.createElement("div");s.className="mpd-link-row studio-form-grid mpd-editorial-grid mpd-editorial-grid--links",s.innerHTML=`
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
        `;const l=s.querySelector(".mpd-link-type"),d=s.querySelector(".mpd-link-url"),p=s.querySelector(".mpd-link-label");l&&"value"in l&&(l.value=String(n.type??"website")),d&&"value"in d&&(d.value=String(n.url??"")),p&&"value"in p&&(p.value=String(n.label??"")),t.appendChild(s)}}function x(e){return String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}async function xr(e,t){try{return await navigator.clipboard.writeText(e),t instanceof HTMLElement&&(t.classList.add("is-copied"),t.setAttribute("aria-label","Copied"),window.setTimeout(()=>{t.classList.remove("is-copied"),t.setAttribute("aria-label","Copy User ID")},2e3)),!0}catch{return t instanceof HTMLElement&&(t.classList.add("is-copy-failed"),window.setTimeout(()=>{t.classList.remove("is-copy-failed")},2e3)),!1}}function Tr(e,t,i){const a=()=>{xr(i,t||e)};t instanceof HTMLButtonElement&&(t.onclick=a),e instanceof HTMLElement&&(e.onclick=a,e.onkeydown=n=>{(n.key==="Enter"||n.key===" ")&&(n.preventDefault(),a())})}function ji(e,t="sidebar"){const i={sidebar:{wrapId:"settingsProfileUserIdWrap",valueId:"settingsProfileUserId",copyId:"settingsProfileCopyUserId"},main:{wrapId:"settingsProfileMainUserIdWrap",valueId:"settingsProfileMainUserId",copyId:"settingsProfileMainUserIdCopy"},none:null},a=e.authenticated&&e.principal?e.principal.toText():"";for(const n of["sidebar","main"]){const s=i[n],l=document.getElementById(s.wrapId),d=document.getElementById(s.valueId),p=document.getElementById(s.copyId);if(!(l instanceof HTMLElement)||!(d instanceof HTMLElement))continue;const u=!!a&&t===n;l.hidden=!u,d.textContent=u?a:"—",d.title=u?"Click to copy User ID":"",u?d.setAttribute("aria-label","User ID, click to copy"):d.removeAttribute("aria-label"),u&&Tr(d,p instanceof HTMLButtonElement?p:null,a)}}function Br(e){e&&(e.textContent="No member account found. You're signed in, but this Internet Identity isn't linked to a Fusion member account.")}function Me(e){return String(e??"").trim()}function Pt(e){const t=document.getElementById("mpd-programs");if(!t)return;const i=["explore","my-programs","payments"].includes(e)?e:"explore",a=t.querySelector(`[data-mpd-program-tab="${i}"]`),n=i==="payments"&&a&&(a.hasAttribute("hidden")||a.getAttribute("aria-hidden")==="true")?"my-programs":i;t.querySelectorAll("[data-mpd-program-tab]").forEach(s=>{const l=s.getAttribute("data-mpd-program-tab")===n;s.classList.toggle("is-active",l),s.setAttribute("aria-selected",l?"true":"false"),s.setAttribute("tabindex",l?"0":"-1")}),t.querySelectorAll("[data-mpd-program-panel]").forEach(s=>{s.getAttribute("data-mpd-program-panel")===n?s.removeAttribute("hidden"):s.setAttribute("hidden","")}),n==="explore"&&ia()}async function ia(){const e=document.getElementById("mpd_program_credits");if(!(e instanceof HTMLElement))return;const t=document.getElementById("mpd_app_credits_value"),i=document.getElementById("mpd_draw_credits_value"),a=document.getElementById("mpd_credits_next_date"),n=document.getElementById("mpd_credits_next_hint"),s=e.querySelector(".mpd-program-credits__item:nth-child(2) .mpd-program-credits__label");let l="";try{l=String(await za()||"").trim()}catch{l=""}let d="";try{d=Re(await Qa())}catch{d=""}!d&&(ve!=null&&ve.tier)&&(d=Re(ve.tier));let p=0,u=0,f="";try{const[C,v]=await Promise.all([Ka(),Gn()]);p=Number(C==null?void 0:C.balance)||0,u=Number(v==null?void 0:v.balance)||0,f=String((C==null?void 0:C.nextAccrualHint)||(v==null?void 0:v.nextGrantHint)||"").trim(),!d&&(C!=null&&C.membershipTier)&&(d=Re(C.membershipTier))}catch{if(d==="quarterly"||d==="annual")try{p=await Xa()}catch{p=0}}let g="";if(d==="annual"&&l!=="exempt")try{const C=await Ve();if(C.authenticated){const v=C.principal.toText(),w=await _t(),P=w&&typeof w=="object"?w:{},L=String(P.paypalSubscriptionId||P.paypal_subscription_id||"").trim(),Y=String(P.stripeSubscriptionId||P.stripe_subscription_id||"").trim(),U=L?"paypal":Y?"stripe":"",$=L||Y;if(U&&$){const{fetchMemberBillingSummary:O}=await Le(()=>import("./index-9466438f.js").then(te=>te.gh),["assets/index-9466438f.js","assets/index-dcd04e76.css"]),ee=await O(v,{subscriptionId:$,provider:U});ee&&typeof ee=="object"&&ee.ok&&typeof ee.currentPeriodEnd=="string"&&(g=String(ee.currentPeriodEnd).trim())}}}catch{g=""}const b=er({tier:d,access:l,appCreditBalance:p,awardEntryBalance:u,periodEndIso:g,nextAccrualHint:f,showForMonthly:d==="monthly"});if(!b){e.hidden=!0;return}e.hidden=!1,s instanceof HTMLElement&&(s.textContent="Program Award entries"),t&&(t.textContent=b.applicationCreditsLabel),i&&(i.textContent=b.awardEntriesLabel??b.drawCreditsLabel),a&&(a.textContent=b.nextCreditsLabel),n&&(n.textContent=b.nextCreditsHint)}function aa(){const e=document.getElementById("mpd_public_programs_discovery");if(!e)return;const t=e.querySelector("#mpd_public_programs_search"),i=e.querySelector("#mpd_public_programs_filter"),a=String((t==null?void 0:t.value)??"").trim().toLowerCase(),n=String((i==null?void 0:i.value)??"all").trim(),s=Array.from(e.querySelectorAll(".mpd-public-program-card"));let l=0;for(const p of s){const u=String(p.getAttribute("data-search")??"").toLowerCase(),f=String(p.getAttribute("data-status")??""),g=String(p.getAttribute("data-category")??""),b=!a||u.includes(a),C=n==="all"||n==="open"&&f==="open"||n==="not-open"&&f!=="open"||n.startsWith("category:")&&g===n.slice(9),v=b&&C;p.toggleAttribute("hidden",!v),v&&(l+=1)}const d=document.getElementById("mpd_public_programs_no_results");d&&(d.hidden=s.length===0||l>0)}function fn(){var s;const e=document.getElementById("mpd-program-panel-my-programs");if(!e)return;const t=((s=e.querySelector(".mpd-my-program-filter.is-active"))==null?void 0:s.getAttribute("data-mpd-my-program-filter"))||"all",i=Array.from(e.querySelectorAll(".mpd-my-program-card"));let a=0;for(const l of i){const d=String(l.getAttribute("data-status-key")||"submitted"),p=t==="all"||d===t;l.toggleAttribute("hidden",!p),p&&(a+=1)}const n=document.getElementById("mpd_my_programs_no_results");n&&(n.hidden=i.length===0||a>0)}function Nr(e){const t=document.getElementById("mpd-program-panel-my-programs");!t||!t.contains(e)||(t.querySelectorAll("[data-mpd-my-program-filter]").forEach(i=>{const a=i===e;i.classList.toggle("is-active",a),i.setAttribute("aria-pressed",a?"true":"false")}),fn())}function jr(e){var u,f,g;const t=Array.from(document.querySelectorAll(".mpd-my-program-card")).find(b=>b.getAttribute("data-program-id")===e);if(!t)return;const i=((u=t.querySelector("h4"))==null?void 0:u.textContent)||"Application",a=Array.from(t.querySelectorAll("template[data-mpd-application-payload]")).find(b=>b.getAttribute("data-mpd-application-payload")===e)||null,n=(a==null?void 0:a.innerHTML)||'<p class="studio-muted">No application payload details are available.</p>',s=document.createElement("div");s.className="settings-profile-page profile-gallery-access-modal mpd-application-details-modal",s.setAttribute("aria-hidden","false"),s.innerHTML=`
    <div class="profile-gallery-access-modal__scrim" aria-hidden="true"></div>
    <div class="profile-gallery-access-modal__panel mpd-application-details-modal__panel" role="dialog" aria-modal="true" aria-labelledby="mpdApplicationDetailsTitle">
      <h2 id="mpdApplicationDetailsTitle" class="profile-gallery-access-modal__title">${x(i)}</h2>
      <div class="mpd-application-details-modal__body">
        ${n}
      </div>
      <button type="button" class="profile-gallery-access-modal__close">Close</button>
    </div>
  `;const l=()=>{s.remove(),window.removeEventListener("keydown",d)};function d(b){b.key==="Escape"&&l()}(f=s.querySelector(".profile-gallery-access-modal__scrim"))==null||f.addEventListener("click",l),(g=s.querySelector(".profile-gallery-access-modal__close"))==null||g.addEventListener("click",l),window.addEventListener("keydown",d),document.body.appendChild(s);const p=s.querySelector(".profile-gallery-access-modal__close");p instanceof HTMLElement&&p.focus()}function ft(e){return e&&typeof e=="object"&&!Array.isArray(e)?e:{}}function Fr(e){return Array.isArray(e)?e:[]}function Ur(e){const t=Me(e).toLowerCase().replace(/[\s_-]+/g,"-");return["reviewing","review","in-review","initial-review"].includes(t)?{key:"initial-review",label:"Initial review"}:["postinterviewreview","post-interview-review","under-review","final-review"].includes(t)?{key:"post-interview-review",label:"Post interview review"}:["invited","invite","accepted","approved","payment-required","deposit-due"].includes(t)?{key:"invited",label:"Invited"}:["not-selected","rejected","declined","not-accepted"].includes(t)?{key:"not-selected",label:"Not selected"}:["pulledout","pulled-out","pulled_out","rescinded"].includes(t)?{key:"rescinded",label:"Rescinded"}:["withdrawn","withdrew","cancelled","canceled"].includes(t)?{key:"withdrawn",label:"Withdrawn"}:{key:"submitted",label:"Submitted"}}function Dr(e,t,i){const a=ft(e.enCard),n=ft(e.jaCard),s=ft(i.payload),l=Ur(i.status??i.applicationStatus??i.decision),d=ce(a.focus,a.headline),p=ce(a.location,a.place),u=p||ce(a.title,d,t)||"Program",f=ce(a.openTo,a.audience,a.eligibility,a.discipline,a.medium),g=ce(a.startDate,a.start),b=ce(a.endDate,a.deadline),C=ce(a.deadline,a.applicationDeadline,a.deadlineDate,a.applyBy,g&&b?`${g} - ${b}`:g||b,a.year),v=ce(n.imageSrc,a.imageSrc,e.image),w=ce(a.imageAlt,u),P=ce(a.category,a.type,d,"Program");let L="/programs";if(e.routeLink){const O=String(e.routeLink);L=O.startsWith("/")?O:`/${O}`}const Y=ce(i.submittedAt,i.submitted_at,i.createdAt),U=!!(i.paymentRequired||i.payment_required||["accepted","approved","payment-required","deposit-due"].includes(Me(i.status??i.decision).toLowerCase().replace(/[\s_-]+/g,"-"))),$=ce(i.teamNote,i.teamNotes,i.programNote,i.note);return{programId:t,title:u,location:p,focus:d,openTo:f,deadline:C,imageSrc:v,imageAlt:w,category:P,route:L,submittedAt:Y,payload:s,status:l,paymentRequired:U,slotSecured:!!i.slotSecured,teamNote:$,rawEntry:i}}function Rr(e){const t=e.status.key,i=t==="rescinded"?{completeThrough:1,activeStep:0}:t==="initial-review"?{completeThrough:2,activeStep:3}:t==="post-interview-review"?{completeThrough:3,activeStep:4}:t==="invited"||t==="not-selected"||t==="withdrawn"?{completeThrough:4,activeStep:5}:{completeThrough:e.submittedAt?1:0,activeStep:0},a=!!e.slotSecured;return["Submitted","Initial review","Post interview review","Decision","Slot secured"].map((n,s)=>{const l=s+1,d=l===5&&a||l<=i.completeThrough?"complete":l===i.activeStep?"active":"pending",p=l===1?sa(e.submittedAt):"";return{label:n,state:d,date:p==="—"?"":p}})}function Hr(e){const t=(...a)=>a.some(n=>Me(e[n])),i=t("portfolio","portfolioUrl","portfolioLink","website","websiteUrl")||Fr(e.files).length>0;return[{label:"Personal statement",submitted:t("statement","personalStatement","artistStatement","bio")},{label:"Artist profile",submitted:!0},{label:"Portfolio",submitted:i},{label:"Travel documents",submitted:t("travelDocuments","travelDocument","passport","passportUrl")}]}function Or(e){if(e.teamNote)return e.teamNote;if(e.paymentRequired)return"You have been invited to continue. Payment details will appear here when the next step opens.";switch(e.status.key){case"initial-review":return"Thank you for your application. Our team is completing the initial review.";case"post-interview-review":return"Thank you for your application. Our team is currently reviewing submissions. You will be notified when a decision is ready.";case"invited":return"Your application has moved forward. Watch this space for next steps from the program team.";case"not-selected":return"Thank you for applying. This application was not selected for the current cycle.";case"withdrawn":return"This application has been withdrawn. No further action is needed.";case"rescinded":return"This application has been rescinded. Contact the program team if you have questions.";default:return"Your application has been received and is queued for review."}}function qr(e){const t=Object.entries(e).filter(([,i])=>i==null?!1:typeof i=="string"?!!i.trim():Array.isArray(i)?i.length>0:typeof i=="number"||typeof i=="boolean").slice(0,16);return t.length?`<dl class="mpd-application-payload-list">${t.map(([i,a])=>{const n=i.replace(/([a-z])([A-Z])/g,"$1 $2").replace(/[_-]+/g," ").replace(/\b\w/g,l=>l.toUpperCase()),s=Array.isArray(a)?a.join(", "):String(a);return`<dt>${x(n)}</dt><dd>${x(s)}</dd>`}).join("")}</dl>`:'<p class="studio-muted">No application payload details are available.</p>'}function Wr(e){var n;const t=Rr(e),i=Hr(e.payload),a=e.submittedAt?`Submitted: ${sa(e.submittedAt)}`:"";return`
    <article class="mpd-my-program-card mpd-my-program-card--${x(e.status.key)}" data-status-key="${x(e.status.key)}" data-program-id="${x(e.programId)}">
      <div class="mpd-my-program-card__summary">
        <div class="mpd-my-program-card__media">
          ${e.imageSrc?`<img src="${x(e.imageSrc)}" alt="${x(Et(e.imageAlt||e.title))}" loading="lazy" />`:'<div class="mpd-my-program-card__placeholder">Fusion</div>'}
        </div>
        <div class="mpd-my-program-card__meta">
          <div class="mpd-my-program-card__title-row">
            <div>
              <h4>${x(e.title)}</h4>
              ${e.category?`<p class="mpd-my-program-card__category">${x(e.category)}</p>`:""}
            </div>
            <div class="mpd-my-program-card__status-wrap">
              <span class="mpd-my-program-status mpd-my-program-status--${x(e.status.key)}">${x(e.status.label)}</span>
              ${a?`<span class="mpd-my-program-card__date">${x(a)}</span>`:""}
            </div>
          </div>
          <div class="mpd-my-program-card__facts">
            ${e.focus?`<p><strong>Program:</strong> ${x(e.focus)}</p>`:""}
            ${e.openTo?`<p><strong>Open to:</strong> ${x(e.openTo)}</p>`:""}
            ${e.deadline?`<p><strong>Dates:</strong> ${x(e.deadline)}</p>`:""}
          </div>
        </div>
      </div>
      ${e.paymentRequired?'<div class="mpd-my-program-payment-callout"><strong>Payment required</strong><span>Visit the Payments tab to submit your deposit or full payment and secure your slot.</span><button type="button" class="mpd-my-program-action" data-mpd-program-tab="payments">View payments</button></div>':""}
      <ol class="mpd-my-program-timeline" aria-label="Application progress for ${x(e.title)}">
        ${t.map(s=>`
              <li class="mpd-my-program-timeline__step is-${x(s.state)}">
                <span class="mpd-my-program-timeline__dot" aria-hidden="true"></span>
                <span class="mpd-my-program-timeline__label">${x(s.label)}</span>
                ${s.date?`<span class="mpd-my-program-timeline__date">${x(s.date)}</span>`:""}
              </li>
            `).join("")}
      </ol>
      <div class="mpd-my-program-card__details">
        <section>
          <h5>Application materials</h5>
          <ul class="mpd-my-program-materials">
            ${i.map(s=>`
                  <li class="${s.submitted?"is-submitted":"is-pending"}">
                    <span aria-hidden="true">${s.submitted?"✓":"○"}</span>
                    <span>${x(s.label)}</span>
                    <em>${s.submitted?"Submitted":"Pending"}</em>
                  </li>
                `).join("")}
          </ul>
        </section>
        <section>
          <h5>Notes from the program</h5>
          <p>${x(Or(e))}</p>
        </section>
        <section>
          <h5>Actions</h5>
          <div class="mpd-my-program-actions">
            <button type="button" class="mpd-my-program-action" data-mpd-application-action="view" data-program-id="${x(e.programId)}">View application</button>
            <button type="button" class="mpd-my-program-action" data-mpd-application-action="update" data-program-id="${x(e.programId)}">Update materials</button>
            ${((n=e.status)==null?void 0:n.key)==="withdrawn"?"":`<button type="button" class="mpd-my-program-action mpd-my-program-action--danger" data-mpd-application-action="withdraw" data-program-id="${x(e.programId)}">Withdraw application</button>`}
          </div>
        </section>
      </div>
      <template data-mpd-application-payload="${x(e.programId)}">${qr(e.payload)}</template>
    </article>
  `}function Ft(e){const t=Number(e??0);return Number.isFinite(t)?Math.max(0,Math.round(t)):0}const Fe=Mo,gn=Lo;function Vr(e,t){return(t.summaries||[]).find(i=>String(i.programId||"")===String(e))||null}function Jr(e,t){return e&&(t.plans||[]).find(i=>String(i.id||"")===String(e))||null}function Yr(e){const t=new Set,i=Array.isArray(e==null?void 0:e.approvedPrograms)?e.approvedPrograms:[];for(const a of i)if((a==null?void 0:a.manualDepositSubmitted)===!0){const n=String((a==null?void 0:a.programId)||"");n&&t.add(n)}for(const a of(e==null?void 0:e.summaries)||[]){const n=String((a==null?void 0:a.programId)||""),s=i.find(p=>String(p.programId||"")===n),l=((e==null?void 0:e.ledger)||[]).filter(p=>String(p.programId||"")===n),d=Ft(a==null?void 0:a.depositAmountCents);on(s,a,l,d)&&n&&t.add(n)}return t}function Gr(e,t){return(Array.isArray(t.approvedPrograms)?t.approvedPrograms:[]).map(a=>{var K,A;const n=String(a.programId||"").trim();if(!n)return null;const s=e.find(X=>String(X.id||"")===n)||{id:n,enCard:{focus:n}},l=ft(s.enCard||s),d=ft(s.jaCard||{}),p=ce(l.location,l.place),u=ce(l.focus,l.headline,l.title),f=ce(p,u,n),g=ce(d.imageSrc,l.imageSrc,s.image),b=ce(l.imageAlt,u,f),C=ce(l.startDate,l.start,l.programStart,(K=l.programPage)==null?void 0:K.startDate),v=ce(l.year,l.programYear,(A=l.programPage)==null?void 0:A.year),w=ko(s),P=Vr(n,t),L=go(a.applicantCategory??(P==null?void 0:P.applicantCategory)),Y=(P==null?void 0:P.ownFlight)===!0||String((P==null?void 0:P.ownFlight)||"").toLowerCase()==="true",U=$o(L),$=Yi({category:L,ownFlight:!1}),O=Y?gn:0,ee=Yi({category:L,ownFlight:Y}),te=Ft(P==null?void 0:P.totalPaidCents),me=P?Ft(P.outstandingCents):Math.max(0,ee-te),ie=Jr(P==null?void 0:P.activePlanId,t),G=(t.ledger||[]).filter(X=>String(X.programId||"")===n).sort((X,z)=>String(z.createdAt||"").localeCompare(String(X.createdAt||""))),He=on(a,P,G,w),ke=te>0||G.length>0||!!ie||He;return{programId:n,applicationId:String(a.applicationId||""),title:f,location:p,focus:u,imageSrc:g,imageAlt:b,startText:C,programYear:v,email:String(a.email||""),fullName:String(a.fullName||""),depositCents:w,applicantCategory:L,categoryDiscountCents:U,baseTotalDueCents:$,ownFlight:Y,flightCreditCents:O,totalDueCents:ee,totalPaidCents:te,outstandingCents:me,refundedCents:Ft(P==null?void 0:P.refundedCents),depositPaid:He,paidInFull:me<=0&&ee>0,activePlan:ie,paymentStarted:ke,ledger:G,summary:P}}).filter(Boolean)}function zr(e){return`
    <div class="mpd-payments-pill-rail" role="tablist" aria-label="Approved program payments">
      ${e.map(t=>{const i=t.programId===ut,a=t.paidInFull?"Paid":t.activePlan?"Plan active":t.depositPaid?"Balance due":"Deposit due";return`<button type="button" class="mpd-payments-pill ${i?"is-active":""}" data-mpd-payment-program="${x(t.programId)}" aria-selected="${i?"true":"false"}">
            <strong>${x(t.title)}</strong>
            <span>${x(a)}</span>
          </button>`}).join("")}
    </div>
  `}function Qr(e){return e.ledger.length?`
    <div class="mpd-payments-history-list">
      ${e.ledger.map(t=>{const i=String(t.stripeReceiptUrl||"");return`<div class="mpd-payments-history-row">
            <span>${x(sa(t.createdAt)||"—")}</span>
            <strong>${x(String(t.paymentType||"payment").replace(/_/g," "))}</strong>
            <span>${Fe(t.amountCents)}</span>
            <span class="mpd-payment-status">${x(t.status||"recorded")}</span>
            ${i?`<a href="${se(i)}" target="_blank" rel="noopener">Receipt</a>`:'<span class="studio-muted">Receipt pending</span>'}
          </div>`}).join("")}
    </div>
  `:'<div class="mpd-payments-empty"><h4>No payment history yet.</h4><p class="studio-muted">Receipts will appear here after your first program payment.</p></div>'}function Kr(e){if(!e)return"";const t=!!e.paymentStarted,i=a=>{const n=e.ownFlight===a,s=a?"I'll book my own flight":"Fusion will book my flight",l=a?"$800 credit":"Included in price",d=a?"$800 credit toward your residency balance.":"Round-trip flight booked by Fusion—no separate flight fee.";return`<button type="button" class="mpd-flight-option ${n?"is-selected":""}" data-mpd-flight-choice="${a?"own":"support"}" aria-pressed="${n?"true":"false"}" ${t?"disabled":""}>
      <span class="mpd-flight-option__icon" aria-hidden="true"><img src="${se(Ua)}" alt="" /></span>
      <span class="mpd-flight-option__copy">
        <strong>${x(s)}</strong>
        <small>${x(d)}</small>
      </span>
      <span class="mpd-flight-option__badge">${x(l)}</span>
    </button>`};return`<section class="mpd-flight-choice-card ${t?"is-locked":""}" aria-label="Flight booking choice">
    <div class="mpd-flight-choice-card__head">
      <div class="mpd-flight-choice-card__icon" aria-hidden="true"><img src="${se(Ua)}" alt="" /></div>
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
  </section>`}function gi(){var g;const e=document.getElementById("mpd_program_payments_workspace"),t=document.getElementById("mpd-program-tab-payments");if(!e||!t)return;const i=ci,a=i.length>0;if(t.toggleAttribute("hidden",!a),t.setAttribute("aria-hidden",a?"false":"true"),!a){e.innerHTML='<div class="mpd-program-placeholder"><h3>Payments</h3><p class="studio-muted">Program payments appear after you are approved for a program.</p></div>',t.classList.contains("is-active")&&Pt("my-programs");return}(!ut||!i.some(b=>b.programId===ut))&&(ut=((g=i.find(b=>!b.depositPaid||b.outstandingCents>0))==null?void 0:g.programId)||i[0].programId);const n=i.find(b=>b.programId===ut)||i[0],s=n.depositCents>0&&n.totalDueCents>0,l=co(),d=!!n.activePlan||l,p=n.activePlan?'<button type="button" class="studio-btn-primary" data-mpd-payment-action="cancel-plan">Cancel plan</button>':"",u=n.depositPaid?"":`<div class="mpd-payment-choice-grid">
        <article class="mpd-payment-choice-program">
          <div class="mpd-payment-choice-program__media">
            ${n.imageSrc?`<img src="${se(n.imageSrc)}" alt="${se(Et(n.imageAlt||n.title))}" loading="lazy" />`:'<div class="mpd-payment-choice-program__placeholder">Fusion</div>'}
          </div>
          <div class="mpd-payment-choice-program__copy">
            <p class="mpd-payments-eyebrow">Confirm your program slot</p>
            <h3>${x(n.title)}</h3>
            <p class="studio-muted">${x(n.focus||"Choose how you would like to pay.")}</p>
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
      </div>`,f=n.depositPaid?`<div class="mpd-payments-action-grid${d?"":" mpd-payments-action-grid--single"}">
        <article class="mpd-payments-action-card mpd-payments-action-card--manual">
          ${ze(ar,"mpd-payments-action-card__icon mpd-payments-action-card__icon--manual")}
          <div class="mpd-payments-action-card__copy">
            <h4>Make a manual payment</h4>
            <p class="studio-muted">Pay any amount toward your outstanding balance.</p>
          </div>
          <button type="button" class="studio-btn-primary" data-mpd-payment-action="manual" ${n.outstandingCents<=0?"disabled":""}>Make a payment</button>
        </article>
        ${d?`<article class="mpd-payments-action-card mpd-payments-action-card--plan">
          ${ze(Fa,"mpd-payments-action-card__icon mpd-payments-action-card__icon--plan")}
          <div class="mpd-payments-action-card__copy">
            <h4>${n.activePlan?"Payment plan active":"Start a payment plan"}</h4>
            <p class="studio-muted">${n.activePlan?"Cancel future installments if your plans change.":"Split the remaining balance into equal monthly payments."}</p>
          </div>
          ${p}
        </article>`:""}
      </div>
      <div class="mpd-payments-overview-grid">
        <div class="mpd-payments-overview-card mpd-payments-overview-card--paid">
          ${ze(zi,"mpd-payments-overview-card__icon")}
          <span>Total residency price</span>
          <strong>${Fe(n.totalDueCents)}</strong>
          <small>${n.ownFlight?"After $800 own-flight credit":"Includes Fusion flight booking"}</small>
        </div>
        ${n.categoryDiscountCents?`<div class="mpd-payments-overview-card mpd-payments-overview-card--outstanding">
          ${ze(zi,"mpd-payments-overview-card__icon")}
          <span>Veteran discount</span>
          <strong>-${Fe(n.categoryDiscountCents)}</strong>
          <small>Returning artist pricing</small>
        </div>`:""}
        <div class="mpd-payments-overview-card mpd-payments-overview-card--outstanding">
          ${ze(St,"mpd-payments-overview-card__icon")}
          <span>Flight credit</span>
          <strong>${n.flightCreditCents?`-${Fe(n.flightCreditCents)}`:"$0.00"}</strong>
          <small>${n.ownFlight?"Own-flight discount":"Fusion books your flight"}</small>
        </div>
        <div class="mpd-payments-overview-card mpd-payments-overview-card--upcoming">
          ${ze(Fa,"mpd-payments-overview-card__icon")}
          <span>Total paid</span>
          <strong>${Fe(n.totalPaidCents)}</strong>
          <small>Across ${n.ledger.length} payments</small>
        </div>
        <div class="mpd-payments-overview-card mpd-payments-overview-card--refunded">
          ${ze(nr,"mpd-payments-overview-card__icon")}
          <span>Remaining balance</span>
          <strong>${Fe(n.outstandingCents)}</strong>
          <small>${n.outstandingCents>0?"Balance remaining":"Paid in full"}</small>
        </div>
      </div>
      <div class="mpd-payments-detail-grid">
        <section class="mpd-payments-panel">
          <div class="mpd-payments-section-head"><h4>Payment history</h4><span class="studio-muted">Receipts and status</span></div>
          ${Qr(n)}
        </section>
        <section class="mpd-payments-panel">
          <div class="mpd-payments-section-head"><h4>Upcoming payments</h4><span class="studio-muted">${n.activePlan?"Plan scheduled":"No active plan"}</span></div>
          ${n.activePlan?`<div class="mpd-upcoming-payment-card"><strong>${x(n.title)}</strong><span>${Fe(n.activePlan.installmentAmountCents)} monthly</span><small>${x(n.activePlan.installmentCount||"")} installments · ${x(n.activePlan.status||"active")}</small></div>`:'<div class="mpd-payments-empty"><h4>No upcoming payments.</h4><p class="studio-muted">Use manual payments to pay toward your balance.</p></div>'}
        </section>
      </div>`:"";e.innerHTML=`
    <div class="mpd-payments-shell">
      ${zr(i)}
      ${Kr(n)}
      ${u}
      ${f}
    </div>
  `}async function yi(e){pi=Array.isArray(e)?e:[];let t;try{t=await en()}catch{t={approvedPrograms:[],summaries:[],ledger:[],plans:[]}}ci=Gr(pi,t),gi()}function yn(){return ci.find(e=>e.programId===ut)||ci[0]||null}function Xr(e,t){e&&(e.ownFlight=!!t,e.flightCreditCents=e.ownFlight?gn:0,e.totalDueCents=Yi({category:e.applicantCategory||"general",ownFlight:e.ownFlight}),e.outstandingCents=Math.max(0,e.totalDueCents-Ft(e.totalPaidCents)),e.paidInFull=e.outstandingCents<=0&&e.totalDueCents>0)}async function Zr(e){const t=yn();if(!t||t.paymentStarted)return;const i=e==="own";if(t.ownFlight===i)return;const a={ownFlight:t.ownFlight,flightCreditCents:t.flightCreditCents,totalDueCents:t.totalDueCents,outstandingCents:t.outstandingCents,paidInFull:t.paidInFull};Xr(t,i),gi();try{await zn({programId:t.programId,applicationId:t.applicationId,ownFlight:i})}catch(n){Object.assign(t,a),gi(),window.alert(n instanceof Error?n.message:String(n))}}function hi(){var e;(e=document.getElementById("mpdProgramPaymentModal"))==null||e.remove();try{document.body.style.overflow=""}catch{}}function hn(e,t){hi();const i=document.createElement("div");return i.id="mpdProgramPaymentModal",i.className="settings-profile-page profile-gallery-access-modal mpd-program-payment-modal",i.innerHTML=`
    <div class="profile-gallery-access-modal__scrim" data-mpd-payment-close aria-hidden="true"></div>
    <div class="profile-gallery-access-modal__panel mpd-program-payment-modal__panel" role="dialog" aria-modal="true" aria-labelledby="mpdProgramPaymentModalTitle">
      <button type="button" class="profile-gallery-access-modal__close" data-mpd-payment-close aria-label="Close payment modal">×</button>
      <h2 id="mpdProgramPaymentModalTitle" class="profile-gallery-access-modal__title">${x(e)}</h2>
      ${t}
    </div>
  `,document.body.appendChild(i),document.body.style.overflow="hidden",i.addEventListener("click",a=>{var s,l;a.target&&((l=(s=a.target).closest)==null?void 0:l.call(s,"[data-mpd-payment-close]"))&&hi()}),i}function es(e="Loading payment"){return`<div class="mpd-payment-loading" role="status" aria-live="polite">
    <span class="mpd-payment-loading__spinner" aria-hidden="true"></span>
    <span class="mpd-payment-loading__text">${x(e)}</span>
  </div>`}async function na(e,t,i){if(!e||i<=0)return;const a=await Ve();if(!a.authenticated){window.alert("Sign in to make a program payment.");return}const s=hn(t==="deposit"?"Pay program deposit":t==="full_payment"?"Pay in full":"Make a manual payment",`<div class="mpd-program-payment-modal__body">
      <p class="studio-muted">${x(e.title)} · ${Fe(i)}</p>
      <div id="mpdProgramStripeMount" class="mpd-program-stripe-mount">${es()}</div>
      <p id="mpdProgramPaymentError" class="mpd-membership-inline-error" hidden></p>
    </div>`),l=s.querySelector("#mpdProgramPaymentError"),d=s.querySelector("#mpdProgramStripeMount");try{const[p,u,f,g]=await Promise.all([Le(()=>import("./index-9466438f.js").then(L=>L.gh),["assets/index-9466438f.js","assets/index-dcd04e76.css"]),Le(()=>import("./index-9466438f.js").then(L=>L.gg),["assets/index-9466438f.js","assets/index-dcd04e76.css"]),Le(()=>import("./index-9466438f.js").then(L=>L.gm),["assets/index-9466438f.js","assets/index-dcd04e76.css"]),Le(()=>import("./index-9466438f.js").then(L=>L.gn),["assets/index-9466438f.js","assets/index-dcd04e76.css"])]),b=u.getPayPalClientIdResolved();if(!b)throw new Error("Configure PayPal client ID in Studio → Services.");const C=await g.fetchPaymentConfig(),v=a.principal.toText(),w=L=>{l instanceof HTMLElement&&(l.hidden=!1,l.textContent=L instanceof Error?L.message:String(L))},P=async L=>{await p.confirmPayPalOneTimePayment(L),hi(),await yi(pi)};d&&(d.textContent="",await f.mountPayPalAdvancedOneTimeCheckout(d,{clientId:b,mode:C.mode==="live"?"live":"sandbox",amountCents:i,metadata:{programId:e.programId,purpose:t},createOrder:async()=>p.createPayPalOneTimePayment({principal:v,programId:e.programId,applicationId:e.applicationId,email:e.email,applicantName:e.fullName,paymentType:t,amountCents:i,totalDueCents:e.totalDueCents,depositAmountCents:e.depositCents,ownFlight:e.ownFlight,flightCreditCents:e.flightCreditCents}),onApproved:P,onError:w,showPayNowButton:!0,payNowLabel:"Pay now",onPayNowClick:async L=>{await L()}}))}catch(p){l instanceof HTMLElement&&(l.hidden=!1,l.textContent=p instanceof Error?p.message:String(p))}}function ts(e){var a;if(!e)return;const t=hn("Make a manual payment",`<div class="mpd-program-payment-modal__body">
      <p class="studio-muted">${x(e.title)} · outstanding ${Fe(e.outstandingCents)}</p>
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
    </div>`),i=t.querySelector("#mpdManualPaymentAmount");t.querySelectorAll('input[name="mpdManualPaymentMode"]').forEach(n=>{n.addEventListener("change",()=>{const s=String((t.querySelector('input[name="mpdManualPaymentMode"]:checked')||{}).value||"custom");i&&(i.value=s==="remaining"?(e.outstandingCents/100).toFixed(2):i.value,i.readOnly=s==="remaining")})}),(a=t.querySelector("#mpdManualPaymentContinue"))==null||a.addEventListener("click",()=>{const n=Math.min(e.outstandingCents,Math.round(Number((i==null?void 0:i.value)||0)*100));if(n<50){window.alert("Enter at least $0.50.");return}hi(),na(e,"manual",n)})}function is(e){if(e){window.alert("Payment plans are temporarily unavailable. Use Make a manual payment toward your balance.");return}}async function as(e){if(e!=null&&e.activePlan&&window.confirm("Cancel this payment plan? Future scheduled installments will stop."))try{const t=await Le(()=>import("./index-9466438f.js").then(n=>n.gh),["assets/index-9466438f.js","assets/index-dcd04e76.css"]),i=String(e.activePlan.paymentProvider||"stripe").toLowerCase(),a=String(e.activePlan.paypalSubscriptionId||"").trim();i==="paypal"||a?await t.cancelPayPalProgramPaymentPlan({planId:String(e.activePlan.id||""),subscriptionId:a}):await t.cancelProgramPaymentPlan({planId:String(e.activePlan.id||""),subscriptionId:String(e.activePlan.stripeSubscriptionId||"")}),await yi(pi)}catch(t){window.alert(t instanceof Error?t.message:String(t))}}function ns(e){return!!(e&&typeof e=="object"&&!Array.isArray(e))}function os(){const e=document.getElementById("mpdResidencyComingSoonModal");e&&(document.body.appendChild(e),e.hidden=!1,e.setAttribute("aria-hidden","false"))}function Fi(){const e=document.getElementById("mpdResidencyComingSoonModal");e&&(e.hidden=!0,e.setAttribute("aria-hidden","true"))}function rs(){const e=document.getElementById("mpdMembershipCancelModal");e&&(document.body.appendChild(e),e.hidden=!1,e.setAttribute("aria-hidden","false"))}function bi(){const e=document.getElementById("mpdMembershipCancelModal");e&&(e.hidden=!0,e.setAttribute("aria-hidden","true"))}function ss(){const e=document.getElementById("mpdMembershipChangePlanModal");e&&(document.body.appendChild(e),e.hidden=!1,e.setAttribute("aria-hidden","false"))}function At(){const e=document.getElementById("mpdMembershipChangePlanModal");e&&(e.hidden=!0,e.setAttribute("aria-hidden","true"))}function ds(e){const t=document.getElementById("mpdMembershipChangePlanOptions"),i=document.getElementById("mpdMembershipChangePlanError"),a=document.getElementById("mpdMembershipChangePlanConfirm");if(i&&(i.hidden=!0,i.textContent=""),!t)return;t.replaceChildren();const n=Re(e);si="";const s=(d,p,u,f="")=>{const g=Re(d);if(!g||!di[g])return;const b=di[g],C=`mpdMembershipChangePlan_${g}`,v=document.createElement("label");v.className="mpd-membership-change-plan-option",p&&v.classList.add("mpd-membership-change-plan-option--current"),v.setAttribute("for",C),v.innerHTML=`
      <input type="radio" name="mpdMembershipChangePlanTier" id="${C}" value="${se(g)}"${p?" disabled":""}${u?" checked":""} />
      <span class="mpd-membership-change-plan-option__main">
        <strong>${se(b.label)}${p?" (current)":""}</strong>
        <span class="studio-muted">${se(b.priceLine)} — ${se(b.entitlement)}</span>
      </span>
      ${f?`<span class="mpd-membership-change-plan-option__kind">${se(f)}</span>`:""}
    `,t.appendChild(v);const w=v.querySelector("input");w==null||w.addEventListener("change",()=>{w instanceof HTMLInputElement&&w.checked&&!w.disabled&&(si=g)}),u&&!p&&(si=g)};n&&s(n,!0,!0);let l=!0;for(const d of Qn(n)){const p=d.kind==="upgrade"?"Upgrade":d.kind==="downgrade"?"Downgrade":"";s(d.tier,!1,l,p),l&&(l=!1)}if(a){const d=String((ve==null?void 0:ve.provider)||"").toLowerCase();a.textContent=d==="paypal"?"Continue with PayPal":"Continue"}}function ls(){const e=document.getElementById("mpdMembershipChangePlanModal");if(!e||e.dataset.mpdChangePlanModalWired==="1")return;e.dataset.mpdChangePlanModalWired="1";const t=e.querySelector(".profile-gallery-access-modal__scrim"),i=e.querySelector("#mpdMembershipChangePlanCancel");t==null||t.addEventListener("click",At),i==null||i.addEventListener("click",At),window.addEventListener("keydown",a=>{a.key==="Escape"&&e&&!e.hidden&&At()})}let mt="",Qe="",ve=null,si="",Bt="monthly";function cs(e,t=0){const i=Re(e),a=["Profile on the public site","Member benefits and updates"];return i==="monthly"?(a.unshift("Application fee $35 per submission"),a.push("Program Award entries $50 each when a cycle is active")):i==="quarterly"?(a.unshift("One application credit per quarter; unused credits roll over"),a.push("One Program Award entry per quarter (max one per program)"),t>0&&a.push(`${t} application credit${t===1?"":"s"} available now`)):i==="annual"?(a.unshift("4 stackable application credits per year"),a.push("4 Program Award entries per year"),t>0&&a.push(`${t} application credit${t===1?"":"s"} available now`)):i==="bimonthly"?(a.unshift("Legacy bi-monthly billing"),a.push("New plans are Monthly, Quarterly, or Annual")):a.unshift("Application submission"),a}function Ui(e){const t=Re(e),i=t&&di[t]?di[t]:null;return{label:(i==null?void 0:i.label)||"Membership",priceLine:(i==null?void 0:i.priceLine)||"—",legacyNote:t==="bimonthly"?"New plans are Monthly, Quarterly, or Annual.":""}}function Wa(e="membershipPlanUpdated"){if(typeof window>"u")return"";const t=window.location.pathname||"/settings/profile";return`${window.location.origin}${t}?${e}=1#membership`}function Di(){try{if(typeof window>"u")return;const e=new URL(window.location.href);e.searchParams.delete("membershipPlanUpdated"),e.searchParams.delete("membershipPlanChangeCancelled"),history.replaceState(null,"",`${e.pathname}${e.search}${e.hash}`)}catch{}}function Ri(e,t,i=0){if(e){e.replaceChildren();for(const a of cs(t,i)){const n=document.createElement("li");n.className="mpd-membership-checklist__item",n.textContent=a,e.appendChild(n)}}}function tt(e){const t=String(e||"").trim();return t.includes("@")&&t.length>=5}async function Va(){if(Qe&&tt(Qe))return Qe.trim();try{const i=await Wi(),a=String((i==null?void 0:i.email)||"").trim();if(tt(a))return Qe=a,a}catch{}try{const i=await Ve();if(i.authenticated){const{getStoredBillingEmailForPrincipal:a}=await Le(()=>import("./index-9466438f.js").then(s=>s.gh),["assets/index-9466438f.js","assets/index-dcd04e76.css"]),n=String(a(i.principal.toText())||"").trim();if(tt(n))return Qe=n,n}}catch{}const e=Za(),t=String(e.email||"").trim();return tt(t)?(Qe=t,t):""}function Hi(e=Qe){const t=document.getElementById("settingsProfileNavContactEmailWrap"),i=document.getElementById("settingsProfileNavContactEmail");if(!t||!(i instanceof HTMLInputElement))return;const a=tt(e);t.hidden=a,a?(i.value=e.trim(),i.removeAttribute("required")):(i.value.trim()||(i.value=""),i.setAttribute("required","required"))}function ps(){const e=document.getElementById("mpdSaveChoiceModal");if(!e)return;document.body.appendChild(e),e.hidden=!1,e.setAttribute("aria-hidden","false");const t=e.querySelector("#mpdSaveChoiceTranslate"),i=e.querySelector("#mpdSaveChoiceTranslateNote"),a=mt==="needsSubscription";t&&(t.disabled=a,t.setAttribute("aria-disabled",a?"true":"false")),i&&(i.textContent=a?"Translation needs an active membership. Use Just save to update your profile without translation.":"",i.toggleAttribute("hidden",!a))}function Oi(){const e=document.getElementById("mpdSaveChoiceModal");e&&(e.hidden=!0,e.setAttribute("aria-hidden","true"))}function ms(){const e=document.getElementById("mpdSaveChoiceModal");if(!e||e.dataset.mpdSaveChoiceModalWired==="1")return;e.dataset.mpdSaveChoiceModalWired="1";const t=e.querySelector(".profile-gallery-access-modal__scrim"),i=e.querySelector("#mpdSaveChoiceCancel"),a=e.querySelector("#mpdSaveChoiceJustSave"),n=e.querySelector("#mpdSaveChoiceTranslate"),s=()=>{Oi(),window.dispatchEvent(new CustomEvent("fusion-settings-profile-save-choice",{detail:{action:"cancel"}}))};t==null||t.addEventListener("click",s),i==null||i.addEventListener("click",s),a==null||a.addEventListener("click",()=>{Oi(),window.dispatchEvent(new CustomEvent("fusion-settings-profile-save-choice",{detail:{action:"save",translate:!1}}))}),n==null||n.addEventListener("click",()=>{Oi(),window.dispatchEvent(new CustomEvent("fusion-settings-profile-save-choice",{detail:{action:"save",translate:!0}}))}),window.addEventListener("keydown",l=>{l.key==="Escape"&&e&&!e.hidden&&s()})}function us(){const e=document.getElementById("mpdMembershipCancelModal");if(!e||e.dataset.mpdMembershipModalWired==="1")return;e.dataset.mpdMembershipModalWired="1";const t=e.querySelector(".profile-gallery-access-modal__scrim");t==null||t.addEventListener("click",bi),window.addEventListener("keydown",i=>{i.key==="Escape"&&e&&!e.hidden&&bi()})}function fs(){const e=document.getElementById("mpdResidencyComingSoonModal");if(!e||e.dataset.mpdResidencyModalWired==="1")return;e.dataset.mpdResidencyModalWired="1";const t=e.querySelector(".profile-gallery-access-modal__scrim"),i=e.querySelector(".profile-gallery-access-modal__close");t==null||t.addEventListener("click",Fi),i==null||i.addEventListener("click",Fi),window.addEventListener("keydown",a=>{a.key==="Escape"&&e&&!e.hidden&&Fi()})}async function Ja(e,t,i){const a=document.getElementById("mpd_programs_list");if(!a)return;let n={};try{const g=e.applied_json??e.appliedJson;g&&(n=typeof g=="string"?JSON.parse(g):g),(!n||typeof n!="object")&&(n={})}catch{n={}}let s=[];try{s=await oa()}catch{s=[]}a.replaceChildren();const l=Object.keys(n).filter(Boolean),d=document.getElementById("mpd_my_programs_count");if(d&&(d.textContent=String(l.length),d.toggleAttribute("hidden",l.length===0),d.setAttribute("aria-label",`${l.length} applications`)),l.length===0){a.innerHTML=`
      <div class="mpd-programs-empty-state mpd-my-program-empty">
        <h4>No applications yet.</h4>
        <p class="studio-muted">When you apply to a Fusion program, your status and next steps will appear here.</p>
      </div>
    `,await yi(s);return}let p={approvedPrograms:[],summaries:[],ledger:[],plans:[]};try{p=await en()}catch{}const u=Yr(p),f=l.map(g=>{const b=s.find(C=>String(C.id)===String(g))||{id:g,enCard:{focus:g}};return Dr(b,g,{...ft(n[g]),slotSecured:u.has(String(g))})}).sort((g,b)=>String(b.submittedAt||"").localeCompare(String(g.submittedAt||"")));a.innerHTML=`
    <div class="mpd-my-program-cards">
      ${f.map(Wr).join("")}
    </div>
    <div id="mpd_my_programs_no_results" class="mpd-programs-empty-state mpd-my-program-empty" hidden>
      <h4>No applications match this filter.</h4>
      <p class="studio-muted">Choose another status to see more applications.</p>
    </div>
  `;for(const g of document.querySelectorAll("[data-mpd-my-program-filter]")){const b=g.getAttribute("data-mpd-my-program-filter")||"all",C=b==="all"?f.length:f.filter(w=>w.status.key===b).length,v=g.querySelector(".mpd-my-program-filter__count");v&&(v.textContent=String(C))}fn(),await yi(s)}async function gs(){const e=document.getElementById("mpd_public_programs_all");if(!e)return;let t=[];try{t=await oa()}catch{t=[]}const i=t.filter(d=>po(d.visibility)==="public");if(e.replaceChildren(),i.length===0){e.innerHTML=`
      <div class="mpd-programs-empty-state">
        <h4>No public programs are listed yet.</h4>
        <p class="studio-muted">When Fusion publishes new public opportunities, they will appear here.</p>
      </div>
    `,ia();return}const a=document.createElement("div");a.className="mpd-public-programs-grid";const n=new Set;for(const d of i){const p=d!=null&&d.enCard&&typeof d.enCard=="object"?d.enCard:{},u=d!=null&&d.jaCard&&typeof d.jaCard=="object"?d.jaCard:{},f=Me(p.focus??p.headline),g=Me(p.location)||Me(p.headline),b=g||f||Me(p.headline)||Me(d.id),C=Me(p.startDate),v=Me(p.endDate),w=Me(p.year),P=ce(p.openTo,p.audience,p.eligibility,p.discipline,p.medium),L=ce(p.deadline,p.applicationDeadline,p.deadlineDate,p.applyBy,C&&v?`${C} - ${v}`:C||v,w),Y=ce(p.category,p.type,f),U=Y.toLowerCase().replace(/\s+/g,"-");Y&&n.add(Y);const $=Me(d==null?void 0:d.studioStatus).toLowerCase(),O=ce(u.imageSrc,p.imageSrc),ee=Me(p.imageAlt??p.focus??b)||b;let te="/programs";if(d!=null&&d.routeLink){const ae=String(d.routeLink);te=ae.startsWith("/")?ae:`/${ae}`}const me=document.createElement("article");me.className="mpd-public-program-card mpd-public-program-card--rich",me.dataset.status=$||"unknown",me.dataset.category=U,me.dataset.search=[b,f,g,P,L,Y,d==null?void 0:d.id,te,$].filter(Boolean).join(" ");const ie=document.createElement("a");ie.className="mpd-public-program-card__link-rich",ie.href=te,ie.target="_blank",ie.rel="noopener noreferrer";const G=document.createElement("div");G.className="mpd-public-program-card__image-wrap";const He=document.createElement("div");if(He.className="mpd-public-program-card__focus",He.textContent=Y||f||"Program",G.appendChild(He),O){const ae=document.createElement("img");ae.className="mpd-public-program-card__img",ae.src=String(O),ae.alt=Et(ee),ae.loading="lazy",G.appendChild(ae)}else{const ae=document.createElement("div");ae.className="mpd-public-program-card__placeholder",ae.textContent="Fusion",G.appendChild(ae)}ie.appendChild(G);const ke=document.createElement("div");ke.className="mpd-public-program-card__body";const K=document.createElement("div");K.className="mpd-public-program-card__title",K.textContent=b||g,ke.appendChild(K);const A=document.createElement("div");A.className="mpd-public-program-card__meta";const X=(ae,dt)=>{const Oe=Me(dt);if(!Oe)return;const Ce=document.createElement("p");Ce.className="mpd-public-program-card__meta-row",Ce.innerHTML=`<strong>${x(ae)}:</strong> ${x(Oe)}`,A.appendChild(Ce)};X("Program",f),X("Open to",P),X("Deadline",L),A.childElementCount&&ke.appendChild(A);const z=document.createElement("span");z.className="mpd-public-program-card__cta",z.textContent="View details ->",ke.appendChild(z),ie.appendChild(ke),me.appendChild(ie),a.appendChild(me)}const s=document.getElementById("mpd_public_programs_filter");if(s){const d=s.value||"all",p=Array.from(n).sort((u,f)=>u.localeCompare(f)).map(u=>{const f=`category:${u.toLowerCase().replace(/\s+/g,"-")}`;return`<option value="${x(f)}">${x(u)}</option>`}).join("");s.innerHTML=`
      <option value="all">All programs</option>
      <option value="open">Open now</option>
      <option value="not-open">Not open yet</option>
      ${p}
    `,s.value=Array.from(s.options).some(u=>u.value===d)?d:"all"}e.appendChild(a);const l=document.createElement("div");l.id="mpd_public_programs_no_results",l.className="mpd-programs-empty-state",l.hidden=!0,l.innerHTML=`
    <h4>No programs match your search.</h4>
    <p class="studio-muted">Try a different keyword or clear the filter to see all public programs.</p>
  `,e.appendChild(l),aa(),ia()}async function ys(){const e=document.getElementById("mpd_apply_residency");if(!e)return;let t=[];try{t=await oa()}catch{t=[]}const i=li.split("/").filter(Boolean).pop()||"",a=t.find(l=>String(l.routeLink||"").toLowerCase().includes("kaga"))||t.find(l=>String(l.routeLink||"").split("/").filter(Boolean).pop()===i)||null;let n=li;if(a!=null&&a.routeLink){const l=String(a.routeLink);n=l.startsWith("/")?l:`/${l}`}e.dataset.programPath=n;let s=!0;a&&(s=String(a.studioStatus??"").toLowerCase()==="open"),e.dataset.applyOpen=s?"true":"false",e.textContent=s?"Apply to Residency":"Coming soon",e.classList.toggle("mpd-residency-cta--closed",!s)}function _s(){const e='<div class="member-profile-dashboard__card-footer"><button type="button" class="mpd-section-save mpd-section-save--primary">Save</button></div>',t='<div class="member-profile-dashboard__card-footer"><button type="button" class="mpd-section-save mpd-section-save--primary" id="mpd_story_save">Save</button></div>',i=[0,1,2].map(f=>{const g=["5:4","1:1","16:9"][f]||"5:4";return`
                        <div class="member-profile-dashboard__intro-slot member-profile-dashboard__intro-slot--${String(f+1)}">
                            <div class="member-profile-dashboard__intro-preview-col">
                                <input type="hidden" id="mpd_intro_${f}_src" />
                                <input type="hidden" id="mpd_intro_${f}_alt" />
                                <input type="hidden" id="mpd_intro_${f}_caption" />
                                <input type="file" id="mpd_intro_${f}_file" class="mpd-file-input-hidden" accept="image/*" data-intro-slot="${String(f)}" />
                                <div class="member-profile-dashboard__intro-preview-wrap mpd-media-upload-surface" data-mpd-media-surface="intro-${f}">
                                    <label for="mpd_intro_${f}_file" class="mpd-media-upload-label" aria-label="Upload introductory work image ${String(f+1)}">
                                        <div class="mpd-media-spinner" id="mpd_intro_${f}_spinner" hidden aria-hidden="true"></div>
                                        <img id="mpd_intro_${f}_thumb" class="member-profile-dashboard__intro-thumb" alt="${Et("Profile intro artwork preview")}" style="display:none" />
                                        <span class="mpd-media-placeholder mpd-media-placeholder--detailed" aria-hidden="true">
                                            <strong>Add Image</strong>
                                            <small>${g} ratio &middot; JPG &middot; Max 1 MB</small>
                                        </span>
                                        <span class="mpd-media-overlay" aria-hidden="true">
                                            <span class="mpd-media-overlay__empty">Upload</span>
                                            <span class="mpd-media-overlay__filled">Replace</span>
                                            <small class="mpd-media-overlay__ratio">Suggested ${g}</small>
                                        </span>
                                    </label>
                                    <button type="button" class="mpd-media-delete" data-mpd-media-delete="intro-${f}">Delete</button>
                            </div>
                            </div>
                        </div>`}).join(""),a=Ut?`<button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="dev">${Ie("artist-system-info")}<span class="studio-nav-item__label">Developer</span></button>`:"",n=Ut?`<div class="mpd-panel" id="mpd-panel-dev" data-mpd-panel="dev" hidden>
                    <section class="member-profile-dashboard__card">
                        <details id="mpd-dev">
                            <summary style="cursor:pointer;font-variation-settings:var(--fv-subtitle)">Developer — raw locales JSON</summary>
                            <textarea id="mpd_dev_json" class="studio-textarea studio-textarea-mono" rows="14" readonly spellcheck="false" style="margin-top:0.75rem;width:100%"></textarea>
                        </details>
                        ${e}
                    </section>
                </div>`:"",s=Ji("assist-refine"),l=s?`<img src="${se(s)}" alt="" />`:'<span aria-hidden="true">✎</span>',d=Ji("assist-copy"),p=d?`<img src="${se(d)}" alt="" class="mpd-user-id__copy-icon" />`:'<span class="mpd-user-id__copy-icon-fallback" aria-hidden="true">⧉</span>',u=f=>{const g=f==="sidebar"?{wrap:"settingsProfileUserIdWrap",value:"settingsProfileUserId",copy:"settingsProfileCopyUserId"}:{wrap:"settingsProfileMainUserIdWrap",value:"settingsProfileMainUserId",copy:"settingsProfileMainUserIdCopy"};return`<div class="mpd-user-id mpd-user-id--${f}" id="${g.wrap}" hidden>
                    <span class="mpd-user-id__label">User ID</span>
                    <div class="mpd-user-id__row">
                        <code class="mpd-user-id__value" id="${g.value}" tabindex="0" role="button" title="Click to copy User ID">—</code>
                        <button type="button" class="mpd-user-id__copy-btn" id="${g.copy}" aria-label="Copy User ID">${p}</button>
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
                    <button type="button" class="studio-nav-item mpd-nav-btn is-active" data-mpd-panel="studio-overview">${Ie("artist-overview")}<span class="studio-nav-item__label" data-mpd-i18n="studio-overview">${Xe("studio-overview")}</span></button>
                    <button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="identity">${Ie("artist-identity")}<span class="studio-nav-item__label" data-mpd-i18n="identity">${Xe("identity")}</span></button>
                    <button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="work">${Ie("nav-products")}<span class="studio-nav-item__label" data-mpd-i18n="work">${Xe("work")}</span></button>
                    <button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="programs">${Ie("nav-programs")}<span class="studio-nav-item__label" data-mpd-i18n="programs">${Xe("programs")}</span></button>
                    <button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="media">${Ie("nav-content")}<span class="studio-nav-item__label" data-mpd-i18n="media">${Xe("media")}</span></button>
                    <button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="journal">${Ie("nav-journal")}<span class="studio-nav-item__label" data-mpd-i18n="journal">${Xe("journal")}</span></button>
                    <button type="button" class="studio-nav-item mpd-nav-btn" data-mpd-panel="settings">${Ie("nav-settings")}<span class="studio-nav-item__label" data-mpd-i18n="settings">${Xe("settings")}</span></button>
                    ${a}
                    <div class="mpd-sidebar-cta-row" aria-label="Profile quick actions">
                        <a class="program-intro-cta mpd-program-intro-cta mpd-sidebar-cta" id="mpd_view_profile" href="#" target="_blank" rel="noopener noreferrer">View public profile &rarr;</a>
                        <button type="button" class="program-intro-cta mpd-program-intro-cta mpd-sidebar-cta" id="mpd_apply_residency" data-program-path="${li}" data-apply-open="true">Apply to Residency &rarr;</button>
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
                ${u("sidebar")}
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
                ${u("main")}
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
                                                ${Ie("artist-identity")}
                                                <strong>Identity &amp; Presence</strong>
                                                <p>Name, bio, status, and the story behind your work.</p>
                                                <span class="mpd-section-card__link">EDIT SECTION &rarr;</span>
                                            </div>
                                            <div class="mpd-section-card__img"><img src="${or}" alt="" loading="lazy" /></div>
                                        </div>
                                        <div class="mpd-section-card mpd-nav-btn" data-mpd-panel="work">
                                            <div class="mpd-section-card__text">
                                                ${Ie("nav-products")}
                                                <strong>Work &amp; Projects</strong>
                                                <p>Portfolio, projects, and the pieces that define your practice.</p>
                                                <span class="mpd-section-card__link">MANAGE &rarr;</span>
                                            </div>
                                            <div class="mpd-section-card__img"><img src="${rr}" alt="" loading="lazy" /></div>
                                        </div>
                                        <div class="mpd-section-card mpd-nav-btn" data-mpd-panel="programs">
                                            <div class="mpd-section-card__text">
                                                ${Ie("nav-programs")}
                                                <strong>Exhibitions &amp; Programs</strong>
                                                <p>Explore, apply, and manage your program participation.</p>
                                                <span class="mpd-section-card__link">MANAGE &rarr;</span>
                                            </div>
                                            <div class="mpd-section-card__img"><img src="${sr}" alt="" loading="lazy" /></div>
                                        </div>
                                        <div class="mpd-section-card mpd-nav-btn" data-mpd-panel="media">
                                            <div class="mpd-section-card__text">
                                                ${Ie("nav-content")}
                                                <strong>Media Library</strong>
                                                <p>Main artwork, profile card, intro gallery, and audio.</p>
                                                <span class="mpd-section-card__link">EDIT SECTION &rarr;</span>
                                            </div>
                                            <div class="mpd-section-card__img"><img src="${dr}" alt="" loading="lazy" /></div>
                                        </div>
                                        <div class="mpd-section-card mpd-nav-btn" data-mpd-panel="journal">
                                            <div class="mpd-section-card__text">
                                                ${Ie("nav-journal")}
                                                <strong>Journal / Notes</strong>
                                                <p>Creative journal entries, reflections, and notes.</p>
                                                <span class="mpd-section-card__link">MANAGE &rarr;</span>
                                            </div>
                                            <div class="mpd-section-card__img"><img src="${lr}" alt="" loading="lazy" /></div>
                                        </div>
                                        <a class="mpd-section-card mpd-section-card--link" id="mpd_overview_profile_card" href="#" target="_blank" rel="noopener noreferrer">
                                            <div class="mpd-section-card__text">
                                                ${Ie("artist-profile-link")}
                                                <strong>Profile</strong>
                                                <p>See how visitors experience your public profile.</p>
                                                <span class="mpd-section-card__link">VIEW PROFILE &rarr;</span>
                                            </div>
                                            <div class="mpd-section-card__img"><img src="${cr}" alt="" loading="lazy" /></div>
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
                                            ${pr()}
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
                                        ${ze(tr,"mpd-program-tab__icon")}
                                        <span>Explore programs</span>
                                    </button>
                                    <button type="button" class="mpd-program-tab mpd-program-tab--my-programs" id="mpd-program-tab-my-programs" role="tab" aria-selected="false" tabindex="-1" aria-controls="mpd-program-panel-my-programs" data-mpd-program-tab="my-programs">
                                        ${ze(ir,"mpd-program-tab__icon")}
                                        <span>My programs</span>
                                        <span class="mpd-program-tab__count" id="mpd_my_programs_count" hidden>0</span>
                                    </button>
                                    <button type="button" class="mpd-program-tab mpd-program-tab--payments" id="mpd-program-tab-payments" role="tab" aria-selected="false" tabindex="-1" aria-controls="mpd-program-panel-payments" data-mpd-program-tab="payments">
                                        ${ze(zi,"mpd-program-tab__icon")}
                                        <span>Payments</span>
                                    </button>
                                </div>

                                <div class="mpd-program-tab-panel" id="mpd-program-panel-explore" role="tabpanel" aria-labelledby="mpd-program-tab-explore" data-mpd-program-panel="explore">
                                <div class="mpd-public-programs-discovery" id="mpd_public_programs_discovery">
                                        <div class="mpd-program-credits" id="mpd_program_credits" hidden aria-live="polite">
                                            <div class="mpd-program-credits__item">
                                                <span class="mpd-program-credits__icon mpd-program-credits__icon--app" aria-hidden="true"></span>
                                                <div class="mpd-program-credits__copy">
                                                    <span class="mpd-program-credits__label">Application credits</span>
                                                    <strong class="mpd-program-credits__value" id="mpd_app_credits_value">—</strong>
                                                </div>
                                            </div>
                                            <div class="mpd-program-credits__item">
                                                <span class="mpd-program-credits__icon mpd-program-credits__icon--draw" aria-hidden="true"></span>
                                                <div class="mpd-program-credits__copy">
                                                    <span class="mpd-program-credits__label">Program Award entries</span>
                                                    <strong class="mpd-program-credits__value" id="mpd_draw_credits_value">—</strong>
                                                </div>
                                            </div>
                                            <div class="mpd-program-credits__item mpd-program-credits__item--next">
                                                <span class="mpd-program-credits__icon mpd-program-credits__icon--next" aria-hidden="true"></span>
                                                <div class="mpd-program-credits__copy">
                                                    <span class="mpd-program-credits__label">Next credits</span>
                                                    <strong class="mpd-program-credits__value" id="mpd_credits_next_date">—</strong>
                                                    <span class="mpd-program-credits__hint" id="mpd_credits_next_hint"></span>
                                                </div>
                                            </div>
                                        </div>
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
                                                <img id="mpd_hero_preview" class="member-profile-dashboard__hero-preview" alt="${Et("Profile hero image preview")}" />
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
                                                    <img id="mpd_hero_profile_preview" class="member-profile-dashboard__hero-preview" alt="${Et("Profile headshot preview")}" />
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
    `}function Ya(e,t,i,a,n={}){return JSON.stringify({locales:e,active:t,hero:i,heroProfile:String(n.heroProfileUrl??""),visibility:a,profileQuote:String(n.profileQuote??""),audioUrl:String(n.audioUrl??""),audioTitle:String(n.audioTitle??"")})}let qi=null,ai=null;function ws(){var fa,ga,ya,ha,ba,va,_a,wa,Sa,Pa,Ea,Aa,Ca,Ia,Ma,La;document.querySelectorAll("#mpdResidencyComingSoonModal").forEach(o=>{const r=document.getElementById("settingsMain");r&&!r.contains(o)&&o.remove()}),document.querySelectorAll("#mpdMembershipCancelModal").forEach(o=>{const r=document.getElementById("settingsMain");r&&!r.contains(o)&&o.remove()}),document.querySelectorAll("#mpdMembershipChangePlanModal").forEach(o=>{const r=document.getElementById("settingsMain");r&&!r.contains(o)&&o.remove()}),document.querySelectorAll("#mpdSaveChoiceModal").forEach(o=>{const r=document.getElementById("settingsMain");r&&!r.contains(o)&&o.remove()}),fs(),ms(),us(),ls(),window.addEventListener("fusion-localechange",()=>{document.querySelectorAll("[data-mpd-i18n]").forEach(r=>{const c=r.getAttribute("data-mpd-i18n");c&&(r.textContent=Xe(c))});const o=document.getElementById("settingsProfileHeading");o&&(o.textContent=Xe("your-studio"))});const e=fr;let t=null,i="",a="",n=!1,s=!1,l="",d=!1,p="",u="",f="",g=!1,b=0,C=0,v=!1,w=!1,P=ja(),L=null;const Y=document.getElementById("settingsProfileStatus"),U=document.getElementById("settingsProfileFormWrap"),$=document.getElementById("settingsProfileInitialLoading"),O=document.getElementById("settingsProfileAccountRecovery"),ee=document.getElementById("settingsProfileRecoverToggle"),te=document.getElementById("settingsProfileRecoverPanel"),me=document.getElementById("settingsProfileRecoveryCode"),ie=document.getElementById("settingsProfileRecoverySubmit"),G=document.getElementById("settingsProfileRecoveryStatus");let He=!1;const ke=o=>{O instanceof HTMLElement&&(O.hidden=!o),o||(te instanceof HTMLElement&&(te.hidden=!0),G&&(G.textContent=""),me&&(me.value=""))},K=()=>{He||(He=!0,ee==null||ee.addEventListener("click",()=>{te instanceof HTMLElement&&(te.hidden=!te.hidden)}),ie==null||ie.addEventListener("click",async()=>{var r;const o=((r=me==null?void 0:me.value)==null?void 0:r.trim())??"";if(o.replace(/\D/g,"").length!==8){G&&(G.textContent="Enter the 8-digit recovery code from support.");return}ie instanceof HTMLButtonElement&&(ie.disabled=!0,ie.textContent="Recovering…"),G&&(G.textContent="");try{const c=await mo(o);if(!c.ok){G&&(G.textContent=uo(c.code));return}const m=await Ve(),h=await _t(),y=await Wi(),S=y&&typeof y=="object"&&"email"in y?String(y.email??"").trim():"",E=String((h==null?void 0:h.paypalSubscriptionId)||"").trim(),I=m.authenticated&&m.principal?m.principal.toText():c.toPrincipal;try{await fo({principal:I,email:S,paypalSubscriptionId:E})}catch{G&&(G.textContent="Account linked. Refreshing subscription had an issue — use Membership → Refresh subscription status if needed. Loading profile…")}G&&!G.textContent&&(G.textContent="Account recovered. Loading profile…"),Ye({force:!0})}catch(c){G&&(G.textContent=c instanceof Error?c.message:String(c))}finally{ie instanceof HTMLButtonElement&&(ie.disabled=!1,ie.textContent="Recover")}}))},A=o=>{Y&&(Y.textContent=o||"")};sn=A;const X=o=>{$&&($.hidden=!o,$.setAttribute("aria-hidden",o?"false":"true"))},z=new Map,ae=()=>{const o=z.size>0;document.querySelectorAll(".mpd-section-save").forEach(r=>{r instanceof HTMLButtonElement&&(o?(r.setAttribute("aria-busy","true"),r.disabled=!0):(r.removeAttribute("aria-busy"),r.disabled=!1))})},dt=()=>z.values().next().value||null,Oe=()=>{const o=dt();if(!o)return!1;const r=o.pendingMessage||`Still ${String(o.detail||"working").toLowerCase()}...`;return A(r),Zt("saving",r,{operation:o.operation,detail:o.detail}),!0},Ce=(o,r,c={})=>{if(z.get(o))return!1;const m=o==="new-world-generation"&&z.size===1&&z.has("profile-save");if(!(c.allowConcurrent===!0||m)&&Oe())return!1;const y={operation:r.operation,detail:r.detail,pendingMessage:r.pendingMessage||`Still ${String(r.detail||"working").toLowerCase()}...`};z.set(o,y),ae();const S=r.message||r.detail||r.operation||"Working";return A(S),Zt("saving",S,{operation:y.operation,detail:y.detail}),!0},V=(o,r="idle",c="")=>{const m=z.get(o);if(z.delete(o),ae(),r==="idle"){!z.size&&c&&A(c);return}const h=c||(r==="saved"?`${(m==null?void 0:m.operation)||"Profile"} saved`:`${(m==null?void 0:m.operation)||"Operation"} failed`);A(h),Zt(r,h,{operation:(m==null?void 0:m.operation)||"",detail:(m==null?void 0:m.detail)||""})},la=o=>{const r=document.getElementById("settingsProfileAdminBypass");r&&(o?(r.style.display="",r.removeAttribute("hidden")):(r.style.display="none",r.setAttribute("hidden","")))},bn=()=>{t={en:{},ja:{}},i="",a="",l="",u="",f="",Ki="",Xi="admin-preview",nt="inactive",ti(t,e),ii("inactive"),H("mpd_hero_url",""),H("mpd_hero_profile_url",""),H("mpd_audio_url",""),H("mpd_audio_title",""),It(),it(),Rt(),X(!1),$i(!0),U&&U.removeAttribute("hidden")},vn=async o=>{if(rt()==="test"||!Na(o))return A("Saved."),!0;try{const r=await vt(),c=Po(r);if(!c)throw new Error("Could not load profile for world generation.");if(!Eo(c))return A("Saved."),!0;if(!Ce("new-world-generation",{operation:"New World",detail:"Generating New World",message:"Generating New World…",pendingMessage:"Still generating New World..."}))return!1;await Ao(c,"fillEmpty");const m=await vt();if(!m)throw new Error("Could not reload profile after world generation.");const h=Ra(m);try{t=h?JSON.parse(h):{en:{},ja:{}}}catch{t={en:{},ja:{}}}return(!t||typeof t!="object")&&(t={en:{},ja:{}}),ti(t,e),Rt(),V("new-world-generation","idle","New World generated."),A("Saved."),!0}catch(r){console.error("New World generation failed after profile save.",r);const c="Couldn’t generate New World. Your profile was saved with World. Please try saving again.";return t&&typeof t=="object"&&(t.publicWorldSource="world"),ln(t||o,e,!1),ta(t||o,"world"),V("new-world-generation","error",c),!1}},_n=()=>{const o=document.getElementById("mpd_root");if(!o||typeof window>"u"||!window.matchMedia("(max-width: 768px)").matches)return;o.dataset.navOpen="false";const r=document.getElementById("settingsProfileNavBackdrop");r&&(r.hidden=!0,r.setAttribute("aria-hidden","true"));const c=document.getElementById("settingsProfileMenuBtn");c&&c.setAttribute("aria-expanded","false");try{document.body.style.overflow=""}catch{}},Dt=async()=>{const o=document.getElementById("mpd_membership_error"),r=document.getElementById("mpd_membership_plan_updated"),c=document.getElementById("mpd_membership_scheduled_cancel"),m=document.getElementById("mpd_membership_exempt_note"),h=document.getElementById("mpd_membership_included_list"),y=document.getElementById("mpd_membership_manage_wrap"),S=document.getElementById("mpd_membership_row_billing"),E=document.getElementById("mpd_membership_row_payment"),I=document.getElementById("mpd_membership_pm_update"),_=document.getElementById("mpd_membership_badge"),B=document.getElementById("mpd_membership_badge_label"),N=document.getElementById("mpd_membership_badge_line"),j=document.getElementById("mpd_membership_plan_name"),M=document.getElementById("mpd_membership_plan_price"),J=document.getElementById("mpd_membership_plan_legacy_note"),ne=document.getElementById("mpd_membership_credit_balance"),fe=document.getElementById("mpd_membership_renewal_date"),de=document.getElementById("mpd_membership_renewal_relative"),Q=document.getElementById("mpd_membership_pm_brand"),ue=document.getElementById("mpd_membership_pm_last4"),at=document.getElementById("mpd_membership_cancel_btn"),oe=document.getElementById("mpd_membership_change_plan_btn");let Se=!1;try{const R=new URLSearchParams(typeof window<"u"?window.location.search:"");Se=R.get("membershipPlanUpdated")==="1",R.get("membershipPlanChangeCancelled")==="1"&&Di()}catch{}const ye=R=>{_&&(_.className="mpd-membership-badge",R==="ok"?_.classList.add("mpd-membership-badge--ok"):R==="warn"?_.classList.add("mpd-membership-badge--warn"):_.classList.add("mpd-membership-badge--muted"))},Pe=(R,Ii=!1,Bn=!1)=>{oe instanceof HTMLButtonElement&&(oe.disabled=!R||Ii),at instanceof HTMLButtonElement&&(at.disabled=!R||Bn)};if(o&&(o.hidden=!0,o.textContent=""),r&&(r.hidden=!0,r.textContent=""),c&&(c.hidden=!0,c.textContent=""),J&&(J.hidden=!0,J.textContent=""),ne&&(ne.hidden=!0,ne.textContent=""),rt()==="test"){ve={tier:Bt,subscriptionId:"test-subscription",provider:"test"};const R=Ui(Bt);m&&(m.hidden=!0),y&&(y.style.display=""),S&&(S.style.display=""),E&&(E.style.display=""),I&&(I.style.display=""),ye("ok"),B&&(B.textContent="Active"),N&&(N.textContent="Your membership is active and in good standing. (Test mode — sample data.)"),j&&(j.textContent=R.label),M&&(M.textContent=R.priceLine),J&&R.legacyNote&&(J.hidden=!1,J.textContent=R.legacyNote),Ri(h,Bt,0),fe&&(fe.textContent="August 12, 2026"),de&&(de.textContent="In 28 days"),Q&&(Q.textContent="VISA"),ue&&(ue.textContent="•••• 4242"),Pe(!0),Se&&r&&(r.hidden=!1,r.textContent="Plan update approved. Your new rate applies on your next renewal (August 12, 2026).",Di());return}const $e=await Ve();if(!$e.authenticated)return;const xe=await _t(),W=xe&&typeof xe=="object"?xe:null,qe=!!((W==null?void 0:W.membershipExemptManual)??(W==null?void 0:W.membership_exempt_manual));if(S&&(S.style.display=""),E&&(E.style.display=""),I&&(I.style.display=""),y&&(y.style.display=""),m&&(m.hidden=!0),qe){ve=null,m&&(m.hidden=!1,m.textContent="Your membership is complimentary. Stripe billing and self-service cancellation are not required."),y&&(y.style.display="none"),S&&(S.style.display="none"),E&&(E.style.display="none"),I&&(I.style.display="none"),ye("ok"),B&&(B.textContent="Active"),N&&(N.textContent="Your membership is active (complimentary)."),j&&(j.textContent="Fusion member"),M&&(M.textContent="—"),Ri(h,"annual",0);const R=Gt(W,"stripeCurrentPeriodEnd","stripe_current_period_end");fe&&(fe.textContent=R?zt(R):"—"),de&&(de.textContent=R?Ha(R):""),Q&&(Q.textContent=""),ue&&(ue.textContent="—");return}const le=$e.principal.toText(),D=String((W==null?void 0:W.paypalSubscriptionId)||(W==null?void 0:W.paypal_subscription_id)||"").trim(),re=String((W==null?void 0:W.paymentProvider)||(W==null?void 0:W.payment_provider)||"").toLowerCase(),_e=D||re==="paypal"?"paypal":re==="stripe"?"stripe":re||"stripe",Te=Gt(W,"stripeSubscriptionId","stripe_subscription_id"),pe=D||Te,yt=Gt(W,"stripeSubscriptionStatus","stripe_subscription_status"),ht=Gt(W,"stripeCurrentPeriodEnd","stripe_current_period_end"),Mt=await Le(()=>import("./index-9466438f.js").then(R=>R.gh),["assets/index-9466438f.js","assets/index-dcd04e76.css"]),{fetchMemberBillingSummary:Ht,syncPayPalSubscription:Ot,getIntegrationBaseUrl:qt}=Mt,bt=await Ht(le,{subscriptionId:pe,provider:_e}),q=bt&&typeof bt=="object"?bt:{},we=!!q.ok,Lt=we&&q.status!=null?String(q.status):yt,We=we&&typeof q.currentPeriodEnd=="string"&&q.currentPeriodEnd.trim()?String(q.currentPeriodEnd).trim():ht,kt=we&&!!q.cancelAtPeriodEnd;let Ne=null;we&&q.paymentMethod&&typeof q.paymentMethod=="object"&&(Ne=q.paymentMethod);let be=Re(we&&typeof q.membershipTier=="string"?String(q.membershipTier):"");if(be||(be=Re(await Qa())),!be&&we&&typeof q.planId=="string"&&q.planId.trim())try{const R=await fetch(`${qt()}/payments/config`),Ii=R.ok?await R.json().catch(()=>({})):{};be=Kn(String(q.planId),Ii)}catch{}if(!be&&we){const R=typeof q.planLabel=="string"?q.planLabel.toLowerCase():"";R.includes("bi-monthly")||R.includes("bimonthly")?be="bimonthly":R.includes("quarterly")?be="quarterly":R.includes("annual")?be="annual":R.includes("monthly")&&(be="monthly")}const Be=be?Ui(be):null,Wt=(Be==null?void 0:Be.label)||(we&&typeof q.planLabel=="string"&&q.planLabel.trim()?String(q.planLabel).trim():"Membership"),Vt=(Be==null?void 0:Be.priceLine)||(we&&typeof q.planPriceLine=="string"&&q.planPriceLine.trim()?String(q.planPriceLine).trim():"—");ve={tier:be||"",subscriptionId:we&&typeof q.subscriptionId=="string"&&q.subscriptionId.trim()?String(q.subscriptionId).trim():pe,provider:we&&typeof q.provider=="string"&&q.provider.trim()?String(q.provider).toLowerCase():_e};let Ge=0;if(be==="quarterly"||be==="annual")try{const R=await Ka();Ge=Number(R==null?void 0:R.balance)||0}catch{try{Ge=await Xa()}catch{Ge=0}}Ri(h,be||"monthly",Ge),!we&&q.reason&&String(q.reason)!=="no_integration_url"&&o&&(o.hidden=!1,o.textContent="Billing details could not be loaded from the payment service. Showing your Fusion account status; use Refresh subscription status or check Studio → Services.");const k=String(Lt||"").toLowerCase();B&&(B.textContent=yr(Lt));let F="Your membership status could not be determined.";if(k==="active"||k==="trialing"?(F="Your membership is active and in good standing.",ye("ok")):k==="past_due"||k==="unpaid"?(F="Payment needs attention — update your card or billing in the portal to stay active.",ye("warn")):k==="canceled"||k==="cancelled"?(F="This subscription is no longer active.",ye("muted")):(k||(F="No subscription is linked yet. If you recently paid, use Refresh subscription status or complete Join."),ye("muted")),N&&(N.textContent=F),j&&(j.textContent=Wt),M&&(M.textContent=Vt),J&&(Be!=null&&Be.legacyNote)&&(J.hidden=!1,J.textContent=Be.legacyNote),ne&&Ge>0&&(ne.hidden=!1,ne.textContent=`${Ge} application credit${Ge===1?"":"s"} available`),fe&&(fe.textContent=We?zt(We):"—"),de&&(de.textContent=We?Ha(We):""),Q){const R=Ne!=null&&Ne.brand?String(Ne.brand).toUpperCase():"";Q.textContent=R}if(ue){const R=Ne!=null&&Ne.last4?String(Ne.last4):"";ue.textContent=R?`•••• ${R}`:"—"}c&&kt&&We&&(c.hidden=!1,c.textContent=`Cancellation scheduled — access continues until ${zt(We)}.`);const he=!!k||!!pe||we&&typeof q.subscriptionId=="string"&&q.subscriptionId.trim(),ge=k==="active"||k==="trialing",ct=kt||k==="canceled"||k==="cancelled"||!he;if(Pe(he,ct||!ge,ct),Se&&(r&&(r.hidden=!1,r.textContent=`Plan update approved. Your new rate applies on your next renewal${We?` (${zt(We)})`:""}.`),Di(),ve.provider==="paypal"&&ve.subscriptionId))try{await Ot({principal:le,subscriptionId:ve.subscriptionId})}catch{}},vi=()=>{const o=["studio-overview","identity","work","programs","media","journal","preview","settings","join-unlock"];return Ut&&o.push("dev"),o},ca=new Set(["studio-overview","identity","work","media","journal","preview","settings","dev"]),wn=o=>{const r=document.getElementById("settingsProfileShout"),c=document.getElementById("settingsProfileHint"),m=document.getElementById("mpd_root"),y=new Set(vi()).has(o)?o:"studio-overview",S=Da[y]??Da["studio-overview"];r&&(r.innerHTML=S.shoutHtml),c&&(c.textContent=S.hint);const E=y==="join-unlock"&&(v||w);m==null||m.classList.toggle("mpd-root--join-unlock-focus",E)},Sn=async()=>{const o=document.getElementById("mpdJoinUnlockMount");if(!(o instanceof HTMLElement))return;L&&(L(),L=null);const r=typeof window.getLocale=="function"&&window.getLocale()==="ja"?"ja":"en";let c=null,m=null;try{c=await Vi("join-network-page",{forStudio:!1})}catch{c=null}try{m=await Vi("join-network-flow",{forStudio:!1})}catch{m=null}const h=Go(c,m,r);o.innerHTML=zo(h),L=Qo(o,{defaultTier:"quarterly",getBillingEmail:()=>{const y=String(Qe||"").trim();if(y.includes("@"))return y;const S=document.getElementById("settingsProfileNavContactEmail");if(S instanceof HTMLInputElement){const E=String(S.value||"").trim();if(E.includes("@"))return E}return""}})},_i=o=>{v=!!o.applicantMode,w=!!o.lightGate;const r=document.getElementById("mpd_root");r==null||r.classList.toggle("mpd-root--applicant-studio",v||w);const c=document.getElementById("mpd_view_profile"),m=document.getElementById("mpd_apply_residency"),h=document.getElementById("mpd_become_member"),y=v||w;c instanceof HTMLElement&&(c.hidden=y),m instanceof HTMLElement&&(m.hidden=y),h instanceof HTMLElement&&(h.hidden=!y),document.querySelectorAll("#settingsProfileNav .mpd-nav-btn[data-mpd-panel]").forEach(j=>{if(!(j instanceof HTMLElement))return;const M=j.getAttribute("data-mpd-panel")||"",J=y&&M!=="programs"&&ca.has(M);j.classList.toggle("mpd-nav-btn--locked",J),j.toggleAttribute("aria-disabled",J),J?j.setAttribute("title","Become a member to unlock"):j.removeAttribute("title")});const S=document.getElementById("mpd-program-tab-explore"),E=document.getElementById("mpd-program-tab-payments"),I=document.getElementById("mpd-program-tab-my-programs");S instanceof HTMLElement&&(S.hidden=v||w),E instanceof HTMLElement&&(E.hidden=v||w),I instanceof HTMLElement&&(I.hidden=w&&!v);const _=document.getElementById("mpdApplicationOnlyToggleWrap"),B=document.getElementById("mpdApplicationOnlyToggle");_ instanceof HTMLElement&&(_.hidden=!o.showTesterToggle),B&&(B.checked=P);const N=document.getElementById("settingsProfileMembershipActions");y&&N&&(N.style.display="none",N.setAttribute("hidden",""))},lt=o=>{let r=o;(v||w)&&r!=="programs"&&r!=="join-unlock"&&(r="join-unlock"),w&&r==="programs"&&(r="join-unlock");const m=new Set(vi()).has(r)?r:"studio-overview";document.querySelectorAll("#mpd_root .mpd-panel").forEach(h=>{const y=h.getAttribute("data-mpd-panel");y&&(h.hidden=y!==m)}),document.querySelectorAll("#mpd_root .mpd-nav-btn").forEach(h=>{const y=h.getAttribute("data-mpd-panel");y&&((v||w)&&y==="programs"&&m==="programs"?h.classList.toggle("is-active",!0):(v||w)&&m==="join-unlock"?(h.classList.toggle("is-active",!1),ca.has(y)&&h.classList.remove("is-active")):h.classList.toggle("is-active",y===m))}),wn(m),_n(),m==="join-unlock"&&Sn(),m==="programs"&&v&&Pt("my-programs"),requestAnimationFrame(()=>{const h=document.getElementById("footer");if(h){h.setAttribute("active","true");const y=h;y!=null&&y.bindScrollTargets&&y.bindScrollTargets(),y!=null&&y.syncFooterVisibilityFromScroll&&y.syncFooterVisibilityFromScroll(),setTimeout(()=>{y!=null&&y.syncFooterVisibilityFromScroll&&y.syncFooterVisibilityFromScroll()},300)}}),m==="settings"&&!v&&!w&&Dt();try{if(typeof history<"u"&&history.replaceState&&typeof window<"u"){const h=window.location.pathname+window.location.search;history.replaceState(null,"",`${h}#${m}`)}}catch{}},wi=()=>{let o=(typeof window<"u"&&window.location.hash?window.location.hash:"#studio-overview").replace(/^#/,"").toLowerCase();return o={overview:"studio-overview","mpd-overview":"studio-overview","mpd-media":"media","mpd-basics":"identity",location:"identity","mpd-story":"identity",story:"identity","mpd-links":"identity","mpd-seo":"studio-overview","mpd-programs":"programs","mpd-membership":"settings",membership:"settings","mpd-dev":"dev"}[o]||o,new Set(vi()).has(o)?o:"studio-overview"},Si=()=>{if(!t)return!1;const o=Ni();return Ya({draft:o},e,T("mpd_hero_url").trim(),wt(T("mpd_profile_visibility").trim()||"public"),{profileQuote:Ti(),audioUrl:T("mpd_audio_url").trim(),audioTitle:T("mpd_audio_title").trim(),heroProfileUrl:T("mpd_hero_profile_url").trim()})!==p||b!==C},Pn=()=>t?g?!0:!!(U&&!U.hasAttribute("hidden")&&Si()):!1,Rt=()=>{if(!t)return;const o=Ni();i=T("mpd_hero_url").trim(),a=T("mpd_hero_profile_url").trim();const r=wt(T("mpd_profile_visibility").trim()||"public");p=Ya({draft:o},e,i,r,{profileQuote:Ti(),audioUrl:T("mpd_audio_url").trim(),audioTitle:T("mpd_audio_title").trim(),heroProfileUrl:a}),C=b},Pi=o=>{document.querySelectorAll(".mpd-section-save").forEach(r=>{if(r instanceof HTMLButtonElement)if(o)r.setAttribute("aria-busy","true"),r.disabled=!0;else{if(z.size>0)return;r.removeAttribute("aria-busy"),r.disabled=!1}})},En=()=>{const o=document.getElementById("mpd_story_save");o&&(o.classList.add("mp--async-ok"),window.setTimeout(()=>{o.classList.remove("mp--async-ok")},1400))};let Ei;const An=o=>{if(d){A("Admin preview bypass is active. This mode is view/edit preview only and cannot save to a linked profile.");return}t&&(Oe()||(Ei=o,ps()))},Cn=async(o,r={})=>{if(d){A("Admin preview bypass is active. This mode is view/edit preview only and cannot save to a linked profile.");return}if(!t)return;const c=o instanceof HTMLElement&&o.id==="mpd_story_save",m=r.translate!==!1;if(!Ce("profile-save",{operation:"Profile",detail:m?"Translating profile copy":"Saving without translation",message:m?"Saving & translating in background…":"Saving in background…",pendingMessage:"Still saving profile..."}))return;const h=Ni(),y=Ae(t),S=T("mpd_hero_url").trim(),E=T("mpd_hero_profile_url").trim(),I=Ti(),_=T("mpd_audio_url").trim(),B=T("mpd_audio_title").trim(),N=wt(T("mpd_profile_visibility").trim()||"public"),j=n,M=s,J=T("mpd_public_world_source");g=!0,c&&Pi(!0),(async()=>{let fe=!1,de=!1;try{rt()!=="test"&&await $t();const Q=await vt();if(!Q)throw new Error("Your profile could not be loaded for saving. Refresh this page and try again.");const ue=Q==null?void 0:Q.profile,at=ue&&typeof ue=="object"?wt(ue.visibility):nt;t=await Ar(y,h,()=>{},{translate:m,_valOverrides:{mpd_public_world_source:J}});const oe=nn(t);t=oe;const Se=new Date().toISOString(),ye=[],Pe=[yo(JSON.stringify(oe),Se)];(S||j)&&Pe.push(ho(S,Se)),(E||M)&&Pe.push(bo(E,Se).catch(le=>{ye.push(`Profile image metadata was not saved: ${le instanceof Error?le.message:String(le)}`)})),Pe.push(vo({quote:I,audioUrl:_,audioTitle:B},Se).catch(le=>{ye.push(`Quote/audio metadata was not saved: ${le instanceof Error?le.message:String(le)}`)}));const $e=N==="public"&&at!=="public"?"pending":N;Pe.push(_o($e,Se)),await Promise.all(Pe),nt=$e,ii($e);try{window.dispatchEvent(new CustomEvent("fusion-roster-visibility-updated",{detail:{visibility:$e}}))}catch{}i=S,a=E,n=!1,s=!1,l=_;const xe=oe.en&&typeof oe.en=="object"?oe.en:{},W=wo(String(xe.firstName??""),String(xe.lastName??""));let qe=!1;if(W)try{const le=await So(W);u=le;const D=document.getElementById("mpd_view_profile"),re=`/profile/${encodeURIComponent(le)}`;D&&D instanceof HTMLAnchorElement&&(D.href=re);const _e=document.getElementById("mpd_overview_profile_card");_e&&_e instanceof HTMLAnchorElement&&(_e.href=re)}catch(le){qe=!0;const D=`${ea(le)} (Other changes were saved.)`;V("profile-save","error",D),de=!0}if(fe=rt()!=="test"&&!qe&&Na(oe),fe&&!c&&Pi(!0),ti(t,e),Rt(),!qe){xt.capture("profile_settings_saved");const le=await vn(oe);if(ye.length){const re=`Profile saved, but some media did not persist: ${ye.join(" ")}`;A(re),V("profile-save","saved",re)}else V("profile-save","saved","Profile saved.");de=!0,le&&(Zt("saved","Profile saved",{operation:"Profile",detail:"All changes saved"}),c&&En())}}catch(Q){V("profile-save","error",ea(Q)),de=!0}finally{g=!1,!de&&z.has("profile-save")&&V("profile-save","error","Profile save did not complete. Try again."),(c||fe)&&Pi(!1)}})()},It=(o=!1)=>{const r=T("mpd_hero_url").trim(),c=document.getElementById("mpd_hero_preview");if(c){if(De("hero",{hasMedia:!!r,hasPreview:!!r}),!r){Ze(!1),c.removeAttribute("src"),c.style.display="none";return}Ze(!0),c.style.display="none",c.onload=()=>{Ze(!1),c.style.display="block",c.onload=null,c.onerror=null},c.onerror=()=>{Ze(!1),De("hero",{hasMedia:!!T("mpd_hero_url").trim(),hasPreview:!1}),je("Preview could not load. Save and refresh, or try another image."),c.removeAttribute("src"),c.style.display="none",c.onload=null,c.onerror=null},c.src=o?mi(r):r,c.complete&&c.naturalHeight>0&&(Ze(!1),c.style.display="block",c.onload=null,c.onerror=null)}},it=(o=!1)=>{const r=T("mpd_hero_profile_url").trim(),c=T("mpd_hero_url").trim(),m=r||c,h=document.getElementById("mpd_hero_profile_preview");if(oi(),!!h){if(De("heroProfile",{hasMedia:!!r,hasPreview:!!m}),!m){et(!1),h.removeAttribute("src"),h.style.display="none";return}et(!0),h.style.display="none",h.onload=()=>{et(!1),h.style.display="block",h.onload=null,h.onerror=null},h.onerror=()=>{et(!1),De("heroProfile",{hasMedia:!!T("mpd_hero_profile_url").trim(),hasPreview:!1}),je("Preview could not load. Save and refresh, or try another image."),h.removeAttribute("src"),h.style.display="none",h.onload=null,h.onerror=null},h.src=o?mi(m):m,h.complete&&h.naturalHeight>0&&(et(!1),h.style.display="block",h.onload=null,h.onerror=null)}},In=o=>{if(o==="hero"){H("mpd_hero_url",""),i="",n=!0,b+=1,It(),it(),A("Hero image removed. Save to apply this change.");return}if(o==="heroProfile"){H("mpd_hero_profile_url",""),a="",s=!0,b+=1,it(),A("Profile image removed. Save to apply this change.");return}const r=/^intro-(\d+)$/.exec(o);if(r){const c=Number(r[1]);if(!Number.isInteger(c)||c<0||c>2)return;st(`intro-${c}`),H(`mpd_intro_${c}_src`,""),H(`mpd_intro_${c}_alt`,""),H(`mpd_intro_${c}_caption`,""),b+=1,Ue(c,!1),De(`intro-${c}`,{hasMedia:!1,hasPreview:!1});const m=document.getElementById(`mpd_intro_${c}_thumb`);m&&(m.removeAttribute("src"),m.style.display="none",m.onload=null,m.onerror=null),A("Introductory work removed. Save to apply this change.")}},pa=[{quote:"Every artist was first an amateur.",note:"Clarity attracts connection. Shape your presence with intention."},{quote:"Art is not what you see, but what you make others see.",note:"Your profile is the bridge between your practice and the world."},{quote:"The earth has music for those who listen.",note:"Let your creative voice resonate through every detail."},{quote:"Creativity takes courage.",note:"Share your work boldly — your perspective matters."},{quote:"To create is to bring something into being.",note:"Every section you complete brings your studio closer to life."}],Mn=()=>{var ne;const o=document.getElementById("mpd_overview_preview_name"),r=document.getElementById("mpd_overview_preview_discipline"),c=document.getElementById("mpd_overview_preview_location"),m=document.getElementById("mpd_overview_preview_img"),h=document.getElementById("mpd_overview_view_profile"),y=T("mpd_first_name").trim(),S=T("mpd_last_name").trim(),E=[y,S].filter(Boolean).join(" ")||"—";o&&(o.textContent=E);const I=document.getElementById("mpd_discipline");r&&I&&(r.textContent=((ne=I.options[I.selectedIndex])==null?void 0:ne.text)||"—");const _=T("mpd_loc_city").trim(),B=T("mpd_loc_country").trim(),N=[_,B].filter(Boolean).join(", ")||"—";c&&(c.textContent=N);const j=T("mpd_hero_profile_url").trim()||T("mpd_hero_url").trim();m&&(j?m.innerHTML=`<img src="${se(j)}" alt="" style="width:100%;height:100%;object-fit:cover;" />`:m.innerHTML='<span style="display:grid;place-items:center;width:100%;height:100%;color:rgba(15,23,42,0.3);font-size:0.8rem;text-transform:uppercase">No image</span>');const M=document.getElementById("mpd_view_profile");h&&M&&h.setAttribute("href",M.getAttribute("href")||"#");const J=document.getElementById("mpd_preview_public_link");J&&M&&J.setAttribute("href",M.getAttribute("href")||"#")},ma=o=>{document.querySelectorAll("[data-mpd-visibility]").forEach(y=>{const S=y.getAttribute("data-mpd-visibility");y.classList.toggle("is-active",S===o),y.setAttribute("aria-pressed",S===o?"true":"false")}),H("mpd_profile_visibility",o);const r=document.getElementById("mpd_overview_visibility");r&&(r.value=o);const c=document.getElementById("mpd_profile_visibility_review_notice"),m=document.getElementById("mpd_overview_visibility_review"),h=nt==="pending";c&&(c.hidden=!h),m&&(m.hidden=!h)},Ln=()=>{const o={identity:!1,work:!1,programs:!1,media:!1,preview:!1},r=T("mpd_first_name").trim(),c=T("mpd_last_name").trim(),m=T("mpd_bio").trim(),h=T("mpd_discipline").trim();o.identity=!!(r&&c&&m&&h);const y=T("mpd_hero_url").trim();o.work=!!y,o.programs=!0;const S=T("mpd_hero_profile_url").trim()||T("mpd_hero_url").trim();return o.media=!!S,o.preview=!!(r&&y),o},kn=()=>{const o=Ln(),r=["identity","work","programs","media","preview"],c=r.length,m=r.filter(_=>o[_]).length,h=Math.round(m/c*100),y=document.getElementById("mpd_completion_fill");y&&(y.style.width=`${h}%`);const S=document.getElementById("mpd_completion_pct");S&&(S.textContent=`${h}% complete`);const E=document.getElementById("mpd_completion_pill");if(E){const _=c-m;E.textContent=h>=100?"Profile Complete":_===1?"1 section to complete":`${_} sections to complete`,E.classList.toggle("mpd-completion-pill--complete",h>=100)}let I=!1;r.forEach((_,B)=>{const N=document.querySelector(`.mpd-completion-step[data-step="${_}"]`);if(!N)return;const j=!!o[_],M=!j&&!I;M&&(I=!0),N.classList.toggle("is-complete",j),N.classList.toggle("is-active",M),N.classList.toggle("is-pending",!j&&!M);const J=N.querySelector(".mpd-completion-step__marker");J&&(J.textContent=j?"✓":String(B+1));const ne=N.querySelector(".mpd-completion-step__status");ne&&(ne.textContent=j?"Complete":M?"In progress":"Not started")})},$n=()=>{const o=document.getElementById("mpd_blindspots_grid");if(!o)return;const r=[];T("mpd_hero_url").trim()||r.push({title:"Add main artwork",panel:"media",icon:St}),T("mpd_hero_profile_url").trim()||r.push({title:"Add profile image",panel:"media",icon:St}),T("mpd_bio").trim()||r.push({title:"Write your bio",panel:"identity",icon:St}),T("mpd_loc_city").trim()||r.push({title:"Set location",panel:"identity",tab:"status",icon:St}),T("mpd_audio_url").trim()||r.push({title:"Add audio bite",panel:"media",icon:St});const c=r.slice(0,5);if(!c.length){o.innerHTML='<p class="studio-muted" style="grid-column:1/-1;text-align:center;padding:1rem 0">Looking good — no blindspots detected.</p>';return}o.innerHTML=c.map(m=>`
      <div class="mpd-blindspot-card mpd-nav-btn" data-mpd-panel="${se(m.panel)}"${m.tab?` data-mpd-identity-tab-target="${se(m.tab)}"`:""}>
        <img src="${se(m.icon)}" alt="" class="mpd-blindspot-card__icon" />
        <strong class="mpd-blindspot-card__title">${se(m.title)}</strong>
        <span class="mpd-blindspot-card__link">IMPROVE &rarr;</span>
      </div>
    `).join("")},xn=()=>{const o=Math.floor(Math.random()*pa.length),r=pa[o],c=document.getElementById("mpd_quote_text");c&&(c.innerHTML=`<em>${se(r.quote)}</em><span>${se(r.note)}</span>`)},Tn=()=>{Mn(),kn(),$n(),xn()},Z=document.getElementById("mpd_root");Z&&!Z.dataset.mpdDelegated&&(Z.dataset.mpdDelegated="1",Z.addEventListener("click",o=>{var ue,at,oe,Se,ye,Pe,$e,xe,W,qe,le,D,re,_e,Te,pe,yt,ht,Mt,Ht,Ot,qt,bt,q,we,Lt,We,kt,Ne,be,Be,Wt,Vt,Ge;const r=o.target&&((at=(ue=o.target).closest)==null?void 0:at.call(ue,".mpd-nav-btn"));if(r&&Z.contains(r)){o.preventDefault();const k=r.getAttribute("data-mpd-panel");if(k){if(Si()&&!confirm("You have unsaved changes. Continue without saving?"))return;lt(k)}return}const c=o.target&&((Se=(oe=o.target).closest)==null?void 0:Se.call(oe,"[data-mpd-identity-tab]"));if(c&&Z.contains(c)){o.preventDefault();const k=c.getAttribute("data-mpd-identity-tab")||"basics";document.querySelectorAll("#mpd_root .mpd-identity-tab").forEach(F=>{const he=F.getAttribute("data-mpd-identity-tab");F.classList.toggle("is-active",he===k),F.setAttribute("aria-selected",he===k?"true":"false")}),document.querySelectorAll("#mpd_root .mpd-identity-tab-panel").forEach(F=>{const he=F.getAttribute("data-mpd-identity-panel");F.hidden=he!==k});return}const m=o.target&&((Pe=(ye=o.target).closest)==null?void 0:Pe.call(ye,"#mpd_overview_publish_save"));if(m&&Z.contains(m)){o.preventDefault();const k=document.getElementById("mpd_overview_visibility");if(k){const F=k.value;Le(()=>import("./index-9466438f.js").then(he=>he.gk),["assets/index-9466438f.js","assets/index-dcd04e76.css"]).then(async he=>{try{await he.updateMyArtistVisibility(F,new Date().toISOString()),nt=F,A("Visibility updated."),ma(F)}catch{A("Failed to update visibility.")}})}return}const h=o.target&&((xe=($e=o.target).closest)==null?void 0:xe.call($e,"[data-action]"));if(h){const k=h.closest(".mpd-audio-entry"),F=k==null?void 0:k.getAttribute("data-audio-url"),he=h.getAttribute("data-action");if(F&&he==="delete"){o.preventDefault(),h.disabled=!0,Rn(F).then(()=>Tt()).catch(ge=>{A(`Delete failed: ${ge instanceof Error?ge.message:String(ge)}`),h.disabled=!1});return}if(F&&he==="highlight"){o.preventDefault(),h.disabled=!0,Hn(F).then(()=>Tt()).catch(ge=>{A(`Highlight failed: ${ge instanceof Error?ge.message:String(ge)}`),h.disabled=!1});return}if(he==="review-info"){o.preventDefault();const ge=(k==null?void 0:k.getAttribute("data-audio-url"))??"",ct=Ct.audioEntries.find(([Jt])=>Jt.endsWith("|"+ge));ct&&pn(ct[1]);return}}const y=o.target&&((qe=(W=o.target).closest)==null?void 0:qe.call(W,"#mpd_audio_record_open"));if(y&&Z.contains(y)){o.preventDefault(),Uo({artistId:f,slug:u,onCaptured:({url:k})=>{l=k,b+=1,xa(k,"Audio bite").then(()=>Tt()).catch(F=>console.error("Failed to add audio entry",F)),A("Recording uploaded and added to your collection.")}});return}const S=o.target&&((D=(le=o.target).closest)==null?void 0:D.call(le,"[data-mpd-program-tab]"));if(S&&Z.contains(S)){if(o.preventDefault(),S.hasAttribute("hidden")||S.getAttribute("aria-hidden")==="true")return;Pt(S.getAttribute("data-mpd-program-tab")||"explore");return}const E=o.target&&((_e=(re=o.target).closest)==null?void 0:_e.call(re,"[data-mpd-payment-program]"));if(E&&Z.contains(E)){o.preventDefault(),ut=E.getAttribute("data-mpd-payment-program")||"",gi();return}const I=o.target&&((pe=(Te=o.target).closest)==null?void 0:pe.call(Te,"[data-mpd-flight-choice]"));if(I&&Z.contains(I)){if(o.preventDefault(),I.hasAttribute("disabled"))return;Zr(I.getAttribute("data-mpd-flight-choice")||"support");return}const _=o.target&&((ht=(yt=o.target).closest)==null?void 0:ht.call(yt,"[data-mpd-payment-action]"));if(_&&Z.contains(_)){o.preventDefault();const k=yn();if(!k)return;const F=_.getAttribute("data-mpd-payment-action")||"";F==="deposit"?na(k,"deposit",k.depositCents):F==="full"?na(k,"full_payment",k.totalDueCents):F==="manual"?ts(k):F==="start-plan"?is(k):F==="cancel-plan"&&as(k);return}const B=o.target&&((Ht=(Mt=o.target).closest)==null?void 0:Ht.call(Mt,"[data-mpd-my-program-filter]"));if(B&&Z.contains(B)){o.preventDefault(),Nr(B);return}const N=o.target&&((qt=(Ot=o.target).closest)==null?void 0:qt.call(Ot,"[data-mpd-application-action]"));if(N&&Z.contains(N)){o.preventDefault();const k=N.getAttribute("data-mpd-application-action")||"",F=N.getAttribute("data-program-id")||"";if(k==="view")jr(F);else if(k==="update")window.alert("Material updates are coming soon. For now, contact the Fusion team if your application needs changes.");else if(k==="withdraw"){if(!window.confirm("Withdraw this application? Application credits are not refunded. You can then enter the Program Draw for this program if it is open.")||!F)return;(async()=>{try{await On(F);const ge=await vt();if(ge){const ct=ft(ge.locales??ge.localesJson),Jt=typeof window.getLocale=="function"&&window.getLocale()==="ja"?"ja":"en";await Ja(ge,ct,Jt)}window.alert("Application withdrawn. Application credits were not refunded.")}catch(ge){window.alert(ge instanceof Error?ge.message:"Could not withdraw this application.")}})()}return}const j=o.target&&((q=(bt=o.target).closest)==null?void 0:q.call(bt,".mpd-section-save"));if(j&&Z.contains(j)){o.preventDefault(),An(j);return}const M=o.target&&((Lt=(we=o.target).closest)==null?void 0:Lt.call(we,"[data-mpd-media-delete]"));if(M&&Z.contains(M)){o.preventDefault(),o.stopPropagation(),In(M.getAttribute("data-mpd-media-delete")||"");return}const J=o.target&&((kt=(We=o.target).closest)==null?void 0:kt.call(We,"[data-mpd-edit-target]"));if(J&&Z.contains(J)){o.preventDefault();const k=J.getAttribute("data-mpd-edit-target")||"",F=document.getElementById(k);if(F instanceof HTMLTextAreaElement||F instanceof HTMLInputElement){F.focus();const he=F.value.length;F.setSelectionRange(he,he)}return}const ne=o.target;if(ne&&"id"in ne&&ne.id==="mpd_apply_residency"){o.preventDefault();const k=ne;if(k.dataset.applyOpen==="false"){os();return}const F=k.dataset.programPath||li;qn(F.startsWith("/")?F:`/${F}`);return}const fe=o.target&&((be=(Ne=o.target).closest)==null?void 0:be.call(Ne,"[data-mpd-world-source]"));if(fe&&Z.contains(fe)){if(o.preventDefault(),!t)return;Je=ui(),ta(t,fe.getAttribute("data-mpd-world-source"));return}const de=o.target&&((Wt=(Be=o.target).closest)==null?void 0:Wt.call(Be,"[data-mpd-status]"));if(de&&Z.contains(de)){o.preventDefault(),mn(de.getAttribute("data-mpd-status"));return}const Q=o.target&&((Ge=(Vt=o.target).closest)==null?void 0:Ge.call(Vt,"[data-mpd-visibility]"));if(Q&&Z.contains(Q)){o.preventDefault(),ii(Q.getAttribute("data-mpd-visibility"));return}if(ne&&"id"in ne&&ne.id==="mpd_links_add"){const k=Wn("#mpd-links");k.push({type:"website",url:"",label:""}),un(k)}}),Z.addEventListener("keydown",o=>{var E,I;const r=o.target&&((I=(E=o.target).closest)==null?void 0:I.call(E,"[data-mpd-program-tab]"));if(!r||!Z.contains(r))return;const c=o.key;if(!["ArrowLeft","ArrowRight","Home","End"].includes(c))return;const m=Array.from(Z.querySelectorAll("[data-mpd-program-tab]")).filter(_=>!_.hasAttribute("hidden")&&_.getAttribute("aria-hidden")!=="true"),h=m.indexOf(r);if(h<0)return;o.preventDefault();let y=h;c==="Home"?y=0:c==="End"?y=m.length-1:c==="ArrowRight"?y=(h+1)%m.length:c==="ArrowLeft"&&(y=(h-1+m.length)%m.length);const S=m[y];S instanceof HTMLElement&&(Pt(S.getAttribute("data-mpd-program-tab")||"explore"),S.focus())}),Z.addEventListener("input",o=>{const r=o.target;r instanceof HTMLInputElement&&r.id==="mpd_public_programs_search"&&aa()}),Z.addEventListener("change",async o=>{var m,h,y,S;const r=o.target;if(r instanceof HTMLSelectElement&&r.id==="mpd_public_programs_filter"){aa();return}if(!(r instanceof HTMLInputElement))return;if(r.id==="mpd_hero_file"&&((m=r.files)!=null&&m[0])){if(!xi(r))return;const E=r.files[0];let I=E;try{I=await ki(E)}catch(_){je(_ instanceof Error?_.message:String(_)),r.value="";return}if(Bi("hero",I),!Ce("hero-upload",{operation:"Main artwork",detail:"Uploading main artwork",message:"Uploading main artwork…",pendingMessage:"Still uploading main artwork..."})){Qt("hero"),je("Another upload is in progress. Wait for it to finish, then try again."),r.value="";return}Ze(!0),Kt("Uploading main artwork...");try{const _=await Nt(I,null,{area:"account/profile",entityType:"artist",entityId:f||u||"me",fieldKey:"hero",timeoutMs:6e4});H("mpd_hero_url",_),i=_,n=!1,b+=1,st("hero"),It(!0),it(!0),V("hero-upload","saved","Main artwork uploaded. Save to apply this change.")}catch(_){st("hero"),Ze(!1),It(!0),it(!0),V("hero-upload","error",_ instanceof Error?_.message:String(_))}finally{z.has("hero-upload")&&V("hero-upload","idle"),Xt()}r.value="";return}if(r.id==="mpd_hero_profile_file"&&((h=r.files)!=null&&h[0])){if(!xi(r))return;const E=r.files[0];let I=E;try{I=await ki(E)}catch(_){je(_ instanceof Error?_.message:String(_)),r.value="";return}if(Bi("heroProfile",I),!Ce("hero-profile-upload",{operation:"Profile card",detail:"Uploading profile card",message:"Uploading profile card…",pendingMessage:"Still uploading profile card..."})){Qt("heroProfile"),je("Another upload is in progress. Wait for it to finish, then try again."),r.value="";return}et(!0),Kt("Uploading profile card...");try{const _=await Nt(I,null,{area:"account/profile",entityType:"artist",entityId:f||u||"me",fieldKey:"heroProfile",timeoutMs:6e4});H("mpd_hero_profile_url",_),a=_,s=!1,b+=1,st("heroProfile"),it(!0),V("hero-profile-upload","saved","Profile card uploaded. Save to apply this change.")}catch(_){st("heroProfile"),et(!1),it(!0),V("hero-profile-upload","error",_ instanceof Error?_.message:String(_))}finally{z.has("hero-profile-upload")&&V("hero-profile-upload","idle"),Xt()}r.value="";return}if(r.id==="mpd_audio_file"&&((y=r.files)!=null&&y[0])){const E=r.files[0],I=10*1024*1024;if(E.size>I){je(`Audio file is too large (${Math.round(E.size/1024)} KB). Maximum size is ${Math.round(I/1024)} KB.`),r.value="";return}if(!Ce("audio-upload",{operation:"Audio bite",detail:"Uploading audio bite",message:"Uploading audio bite…",pendingMessage:"Still uploading audio bite..."})){r.value="";return}Kt("Uploading audio bite...");try{const _=await Nt(E,null,{area:"account/profile",entityType:"artist",entityId:f||u||"me",fieldKey:"audio",timeoutMs:12e4});H("mpd_audio_url",_),l=_,b+=1,xa(_,"Audio bite").then(()=>Tt()).catch(N=>console.error("Failed to add audio entry",N));const B=document.getElementById("mpd_audio_approval_status");B&&(B.hidden=!1,B.textContent="Pending staff approval",B.classList.add("is-pending"),B.classList.remove("is-approved")),V("audio-upload","saved","Audio bite uploaded and added to your collection.")}catch(_){V("audio-upload","error",_ instanceof Error?_.message:String(_))}finally{z.has("audio-upload")&&V("audio-upload","idle"),Xt()}r.value="";return}const c=r.getAttribute("data-intro-slot");if(c!=null&&((S=r.files)!=null&&S[0])){if(!xi(r))return;const E=Number(c),I=r.files[0];let _=I;try{_=await ki(I)}catch(M){je(M instanceof Error?M.message:String(M)),r.value="";return}const B=`intro-${E}`;Bi(B,_);const N=`intro-upload-${E}`,j=`Introductory work ${E+1}`;if(!Ce(N,{operation:j,detail:`Uploading ${j.toLowerCase()}`,message:`Uploading ${j.toLowerCase()}…`,pendingMessage:`Still uploading ${j.toLowerCase()}...`})){Qt(B),je("Another upload is in progress. Wait for it to finish, then try again."),r.value="";return}Ue(E,!0),Kt(`Uploading ${j.toLowerCase()}...`);try{const M=await Nt(_,null,{area:"account/profile",entityType:"artist",entityId:f||u||"me",fieldKey:`intro-${E}`,timeoutMs:6e4});H(`mpd_intro_${E}_src`,M),b+=1,br(B,M),V(N,"saved",`${j} uploaded. Save to apply this change.`)}catch(M){Qt(B),V(N,"error",M instanceof Error?M.message:String(M))}finally{z.has(N)&&V(N,"idle"),Xt()}r.value=""}}),Z.addEventListener("input",o=>{const r=o.target;(r instanceof HTMLInputElement||r instanceof HTMLTextAreaElement)&&(r.classList.contains("mpd-story-input")&&Qi==="world"&&(Je=ui()),(r.id==="mpd_first_name"||r.id==="mpd_last_name")&&oi())}),Z.addEventListener("change",o=>{const r=o.target;r instanceof HTMLSelectElement&&r.id==="mpd_discipline"&&oi()}));const gt=document.getElementById("mpd_root");if(gt&&!gt.dataset.settingsStudioUi){gt.dataset.settingsStudioUi="1";const o="(max-width: 768px)",r=typeof window.matchMedia=="function"?window.matchMedia(o):null,c=m=>{gt.dataset.navOpen=m?"true":"false";const h=document.getElementById("settingsProfileNavBackdrop");h&&(h.hidden=!m,h.setAttribute("aria-hidden",m?"false":"true"));const y=document.getElementById("settingsProfileMenuBtn");y&&y.setAttribute("aria-expanded",m?"true":"false"),m&&(r!=null&&r.matches)?document.body.style.overflow="hidden":document.body.style.overflow=""};(fa=document.getElementById("settingsProfileMenuBtn"))==null||fa.addEventListener("click",()=>{const m=gt.dataset.navOpen!=="true";c(m)}),(ga=document.getElementById("settingsProfileNavBackdrop"))==null||ga.addEventListener("click",()=>c(!1)),r==null||r.addEventListener("change",m=>{m.matches||c(!1)}),window.addEventListener("keydown",m=>{m.key==="Escape"&&gt.dataset.navOpen==="true"&&c(!1)})}const Ai=document.getElementById("settingsProfileNavContact");Ai&&Ai.dataset.mpdContactWired!=="1"&&(Ai.dataset.mpdContactWired="1",(ya=document.getElementById("settingsProfileNavContactSend"))==null||ya.addEventListener("click",async()=>{const o=document.getElementById("settingsProfileNavContactMessage"),r=document.getElementById("settingsProfileNavContactEmail"),c=document.getElementById("settingsProfileNavContactStatus"),m=String((o==null?void 0:o.value)||"").trim();if(!m){c&&(c.textContent="Enter a message.");return}let h=await Va();if(!tt(h)&&r instanceof HTMLInputElement&&(h=String(r.value||"").trim()),!tt(h)){Hi(""),c&&(c.textContent="Add your email address so we can reply, then send again."),r==null||r.focus();return}c&&(c.textContent="Sending…");try{const{sendEmail:y}=await Le(()=>import("./index-9466438f.js").then(Q=>Q.gh),["assets/index-9466438f.js","assets/index-dcd04e76.css"]),{DEFAULT_APPLICATION_STAFF_EMAIL:S}=await Le(()=>import("./index-9466438f.js").then(Q=>Q.gg),["assets/index-9466438f.js","assets/index-dcd04e76.css"]),E=await Ve(),I=T("mpd_first_name").trim(),_=T("mpd_last_name").trim();let B=[I,_].filter(Boolean).join(" ").trim();if(!B&&t){const Q=Ke(t,"en");B=String(Q.name??"").trim()}if(E.authenticated&&tt(h)){let Q=!1;try{const ue=await Wi();Q=tt(ue==null?void 0:ue.email)}catch{}if(!Q&&!await Vn({firstName:I,lastName:_,email:h}))throw new Error("Could not save your email to your profile. Try again or refresh the page.");Qe=h,Hi(h)}const N=E.authenticated&&E.principal?E.principal.toText():"n/a",j=N.length>6?N.slice(-6):N,M=typeof window<"u"?window.location.origin:"",J=u||"",ne=J&&M?`${M}/profile/${encodeURIComponent(J)}`:"n/a",fe=[`Name: ${B||"n/a"}`,`Email: ${h}`,`Principal: ${N}`,`Profile: ${ne}`,""].join(`
`),de=B?B.slice(0,48):`…${j}`;await y({to:S,subject:`[Fusion Profile settings] Message — ${de}`,text:`${fe}${m}`}),c&&(c.textContent="Sent. We will get back to you soon."),o&&(o.value="")}catch(y){c&&(c.textContent=y instanceof Error?y.message:String(y))}}));const Ye=async(o={})=>{var qe,le;if(o.force!==!0&&Pn())return;A(""),X(!0),$i(!1),ke(!1);const r=document.getElementById("settingsProfileMembershipActions");la(!1),r&&(r.style.display="none",r.setAttribute("hidden",""));const c=await Ve(),m=rt()==="test",h=document.getElementById("settingsTestPicker"),y=document.getElementById("settingsTestArtistSelect");if(m&&h&&y){h.style.display="",y.replaceChildren();const D=document.createElement("option");D.value="",D.textContent="— Select artist —",y.appendChild(D);const re=await Xn();for(const Te of re){const pe=document.createElement("option");pe.value=String(Te.id),pe.textContent=`${((le=(qe=Te.locales)==null?void 0:qe.en)==null?void 0:le.name)||Te.slug||Te.id} (${Te.slug})`,y.appendChild(pe)}const _e=Ta();_e&&(y.value=_e),y.onchange=()=>{Zn(y.value||null),Ye({force:!0})}}else h&&(h.style.display="none");const S=await _t(),E=await eo(S),I=hr(E),_=document.getElementById("settingsProfileHeading");_&&(_.textContent=I);const B=document.getElementById("settingsProfileHint");if(ji(c,c.authenticated?"sidebar":"none"),!m&&!c.authenticated){B&&(B.textContent="Sign in with Internet Identity to edit your profile."),U&&U.setAttribute("hidden",""),X(!1),pt(I);return}m&&!Ta()&&(A("Creating a local profile for this session…"),await $t(),A(""));let N=!1,j="";if(!m&&c.authenticated){const D=to(),re=D!=="admin"&&D!=="staff";re?N=!0:N=await Ba()&&re}if(P=ja(),!m&&c.authenticated)try{mt=await za()}catch{mt=""}else m&&(mt="exempt");if(!m&&c.authenticated&&!N&&await $t()==="noAccount"&&!S){ji(c,"main"),Br(B),ke(!0),K(),_i({applicantMode:!1,lightGate:!1,showTesterToggle:!1}),U&&U.setAttribute("hidden",""),X(!1),pt(I);return}let M=await vt();if(!M&&N&&!m){try{j=await $t()}catch{j=""}M=await vt()}const J=M?Ro(M.applied_json??M.appliedJson):0,ne=M?Ho(M.applied_json??M.appliedJson):!1;let fe=!1;try{fe=await Ba()}catch{fe=!1}const de=Wo({isRealAdmin:fe,hasTesterApplication:ne}),Q=Oo({membershipGate:mt,applicationCount:J,applicationOnlyDisplay:P,applicationOnlyToggleVisible:de}),ue=qo({membershipGate:mt,applicationCount:J,applicationOnlyDisplay:P,applicationOnlyToggleVisible:de});if(!M){if(N){if(B&&(B.textContent="Admin perspective preview could not find a linked artist profile. Use Admin preview bypass to load editable fields for perspective testing."),r&&(r.style.display="flex",r.removeAttribute("hidden")),la(j==="needsSubscription"||j==="noAccount"||j===""),d){bn(),A("Admin preview bypass active. Fields are loaded without account/membership gating."),pt(I),X(!1);return}U&&U.setAttribute("hidden",""),X(!1),pt(I);return}if(P||!de&&(ue||mt==="needsSubscription")){_i({applicantMode:!1,lightGate:!0,showTesterToggle:de}),X(!1),U&&U.removeAttribute("hidden"),B&&(B.textContent="Become a FUSION member to unlock your full studio. You can track applications under Programs once you have applied."),lt("join-unlock"),pt(I);return}B&&(B.textContent="Your profile could not be loaded. Try refreshing the page. If you just subscribed, wait a moment and try again, or sign out and back in."),U&&U.setAttribute("hidden",""),X(!1),pt(I);return}_i({applicantMode:Q,lightGate:ue&&!Q,showTesterToggle:de});const oe=M.profile&&typeof M.profile=="object"?M.profile:{};u=String(oe.slug??"");const Se=Ra(M);try{t=Se?JSON.parse(Se):{en:{},ja:{}}}catch{t={en:{},ja:{}}}(!t||typeof t!="object")&&(t={en:{},ja:{}});const ye=Za();if(ye.fullName||ye.email){const D=String(ye.fullName||"").trim().split(/\s+/).filter(Boolean),re=D[0]||"",_e=D.slice(1).join(" ");for(const Te of["en","ja"]){const pe=Ke(t,Te),yt=String(pe.firstName??"").trim(),ht=String(pe.lastName??"").trim();!yt&&re&&(pe.firstName=re),!ht&&_e&&(pe.lastName=_e),!String(pe.name??"").trim()&&(pe.firstName||pe.lastName)&&(pe.name=`${String(pe.firstName||"").trim()} ${String(pe.lastName||"").trim()}`.trim()),t[Te]=pe}}$r(t,M.applied_json??M.appliedJson),i=String(oe.image??""),n=!1,s=!1;{const D=oe.heroProfileImage??oe.hero_profile_image;a=(()=>Array.isArray(D)?String(ra(D)??"").trim():String(D??"").trim())()}f=String(oe.id??""),Ki=f,Xi=u,$i(!!(f||u)||rt()==="test"),l=String(oe.audioUrl??""),H("mpd_hero_url",i),H("mpd_hero_profile_url",a),H("mpd_audio_url",l),H("mpd_audio_title",String(oe.audioTitle??""));{const D=document.getElementById("mpd_audio_approval_status");if(D)if(l){D.hidden=!1;const re=io(oe);D.textContent=re?"Approved for public playback":"Pending staff approval",D.classList.toggle("is-approved",re),D.classList.toggle("is-pending",!re)}else D.hidden=!0,D.textContent=""}Mr(),Tt(),Lr(),It(),it(),nt=wt(oe.visibility),ii(nt);const Pe=document.getElementById("mpd_view_profile"),$e=`/profile/${encodeURIComponent(u)}`;Pe&&Pe instanceof HTMLAnchorElement&&(Pe.href=$e);const xe=document.getElementById("mpd_overview_profile_card");xe&&xe instanceof HTMLAnchorElement&&(xe.href=$e),X(!1),U&&U.removeAttribute("hidden");const W=document.getElementById("mpd_datasource_pill");if(W&&m?(W.style.display="",W.textContent="Data: test JSON (localStorage overlays)"):W&&(W.style.display="none"),ti(Er(t),e),String((Je==null?void 0:Je.quote)??"").trim()||(Je={...Je||{},quote:String(oe.quote??"")},Qi==="world"&&H("mpd_w_quote",String(oe.quote??""))),Rt(),Ja(M),v?Pt("my-programs"):(Pt("explore"),gs(),ys()),w)lt("join-unlock");else if(v){const D=wi();lt(D==="join-unlock"?"join-unlock":"programs")}else lt(wi());!v&&!w&&Tn(),ma(nt),ji(c,"sidebar"),Va().then(D=>{Hi(D)}),pt(I)};window.addEventListener("hashchange",()=>{lt(wi())}),(ha=document.getElementById("settingsProfileFinishMembership"))==null||ha.addEventListener("click",()=>{const o=String(Qe||"").trim();window.dispatchEvent(new CustomEvent("fusion-open-join-network",{detail:{mode:"resubscribe",fromJoinNetworkPage:!0,stage:"payment",subscriptionTier:"monthly",...o.includes("@")?{email:o}:{}}}))}),(ba=document.getElementById("mpd_become_member"))==null||ba.addEventListener("click",()=>{lt("join-unlock")}),(va=document.getElementById("mpdApplicationOnlyToggle"))==null||va.addEventListener("change",o=>{const r=o.target instanceof HTMLInputElement&&o.target.checked;Do(r),P=r,Ye({force:!0})}),ai&&window.removeEventListener("fusion-settings-profile-save-choice",ai),ai=o=>{const r=o instanceof CustomEvent&&ns(o.detail)?o.detail:{},c=String(r.action||""),m=Ei;Ei=void 0,c==="save"&&Cn(m,{translate:r.translate!==!1})},window.addEventListener("fusion-settings-profile-save-choice",ai),(_a=document.getElementById("settingsProfileSyncSubscription"))==null||_a.addEventListener("click",async()=>{const o=await Ve();if(o.authenticated&&Ce("membership-sync",{operation:"Membership",detail:"Refreshing subscription",message:"Refreshing subscription status…",pendingMessage:"Still refreshing subscription status..."})){try{const r=await Le(()=>import("./index-9466438f.js").then(y=>y.gh),["assets/index-9466438f.js","assets/index-dcd04e76.css"]),c=await _t(),m=String((c==null?void 0:c.paypalSubscriptionId)||"").trim(),h=String((c==null?void 0:c.paymentProvider)||"").toLowerCase();m||h==="paypal"?await r.syncPayPalSubscription({principal:o.principal.toText(),subscriptionId:m}):await r.syncSubscriptionFromStripe(o.principal.toText()),await $t(),xt.capture("membership_subscription_sync_succeeded",{context:"settings_profile"}),V("membership-sync","saved","Subscription refreshed. Loading profile…")}catch(r){V("membership-sync","error",r instanceof Error?r.message:String(r));return}Ye({force:!0})}}),(wa=document.getElementById("settingsProfileAdminBypass"))==null||wa.addEventListener("click",()=>{d=!0,A("Admin preview bypass enabled. Loading fields…"),Ye({force:!0})});const Ci=async()=>{var r;const o=await Ve();if(o.authenticated&&Ce("billing-portal",{operation:"Billing",detail:"Opening billing portal",message:"Opening billing portal…",pendingMessage:"Still opening billing portal..."}))try{const{createBillingPortalSession:c}=await Le(()=>import("./index-9466438f.js").then(y=>y.gh),["assets/index-9466438f.js","assets/index-dcd04e76.css"]),m=typeof window<"u"&&((r=window.location)!=null&&r.href)?window.location.href:"https://fusionart.world/settings/profile",{url:h}=await c(o.principal.toText(),m);xt.capture("membership_billing_portal_opened",{context:"settings_profile"}),V("billing-portal","saved","Opening billing portal…"),window.location.assign(h)}catch(c){V("billing-portal","error",c instanceof Error?c.message:String(c))}finally{z.has("billing-portal")&&V("billing-portal","idle")}};(Sa=document.getElementById("mpd_membership_row_billing"))==null||Sa.addEventListener("click",()=>{Ci()}),(Pa=document.getElementById("mpd_membership_row_payment"))==null||Pa.addEventListener("click",()=>{Ci()}),(Ea=document.getElementById("mpd_membership_pm_update"))==null||Ea.addEventListener("click",()=>{Ci()}),(Aa=document.getElementById("mpd_membership_change_plan_btn"))==null||Aa.addEventListener("click",()=>{const o=(ve==null?void 0:ve.tier)||"monthly";ds(o),ss()}),(Ca=document.getElementById("mpdMembershipChangePlanConfirm"))==null||Ca.addEventListener("click",async()=>{const o=document.getElementById("mpdMembershipChangePlanError"),r=Re(si);if(!r||r==="bimonthly"){o&&(o.hidden=!1,o.textContent="Choose Monthly, Quarterly, or Annual.");return}const c=ve;if(!c){o&&(o.hidden=!1,o.textContent="Membership billing details are not loaded yet.");return}if(rt()==="test"){const y=["monthly","quarterly","annual"],S=y.indexOf(Re(c.tier)||"monthly");Bt=y[(S+1)%y.length]||"monthly",At(),await Dt(),V("membership-change-plan","saved",`Test mode: plan set to ${Ui(Bt).label}.`);return}const m=await Ve();if(!m.authenticated||!Ce("membership-change-plan",{operation:"Membership",detail:"Starting plan change",message:"Starting plan change…",pendingMessage:"Still starting plan change..."}))return;let h=!1;try{const y=await Jn({provider:c.provider,principal:m.principal.toText(),targetTier:r,subscriptionId:c.subscriptionId,returnUrl:Wa("membershipPlanUpdated"),cancelUrl:Wa("membershipPlanChangeCancelled")});if(y.message){o&&(o.hidden=!1,o.textContent=y.message),V("membership-change-plan","error",y.message);return}if(y.approveUrl){h=!0,At(),xt.capture("membership_plan_change_started",{context:"settings_profile",target_tier:r,provider:c.provider}),V("membership-change-plan","saved","Opening PayPal to approve your plan change…"),window.location.assign(y.approveUrl);return}V("membership-change-plan","saved","Plan change request submitted."),At(),await Dt()}catch(y){const S=y instanceof Error?y.message:String(y);o&&(o.hidden=!1,o.textContent=S),V("membership-change-plan","error",S)}finally{!h&&z.has("membership-change-plan")&&V("membership-change-plan","idle")}}),(Ia=document.getElementById("mpd_membership_cancel_btn"))==null||Ia.addEventListener("click",()=>{rs()}),(Ma=document.getElementById("mpdMembershipCancelStay"))==null||Ma.addEventListener("click",()=>{bi()}),(La=document.getElementById("mpdMembershipCancelContinue"))==null||La.addEventListener("click",async()=>{const o=await Ve();if(o.authenticated&&(bi(),!!Ce("membership-cancel",{operation:"Membership",detail:"Scheduling cancellation",message:"Scheduling cancellation…",pendingMessage:"Still scheduling cancellation..."})))try{const{cancelSubscriptionAtPeriodEnd:r,cancelPayPalSubscriptionAtPeriodEnd:c,syncSubscriptionFromStripe:m,syncPayPalSubscription:h}=await Le(()=>import("./index-9466438f.js").then(I=>I.gh),["assets/index-9466438f.js","assets/index-dcd04e76.css"]),y=await _t(),S=String((y==null?void 0:y.paypalSubscriptionId)||"").trim(),E=String((y==null?void 0:y.paymentProvider)||"").toLowerCase();if(S||E==="paypal"){if(!S)throw new Error("No PayPal subscription linked.");await c(S),await h({principal:o.principal.toText(),subscriptionId:S})}else await r(o.principal.toText()),await m(o.principal.toText());xt.capture("membership_cancel_scheduled",{context:"settings_profile"}),await Dt(),V("membership-cancel","saved","Cancellation scheduled for the end of your billing period.")}catch(r){V("membership-cancel","error",r instanceof Error?r.message:String(r))}finally{z.has("membership-cancel")&&V("membership-cancel","idle")}});const ua=o=>{Si()&&(o.preventDefault(),o.returnValue="")};qi&&window.removeEventListener("beforeunload",qi),qi=ua,window.addEventListener("beforeunload",ua),Ye({force:!0}),window.addEventListener("fusion-auth-change",()=>void Ye()),window.addEventListener("fusion-admin-perspective-change",()=>void Ye()),window.addEventListener("fusion-data-source-change",()=>void Ye()),document.addEventListener("visibilitychange",()=>{document.visibilityState==="visible"&&Ye()})}export{ur as MPD_MAX_IMAGE_BYTES,ws as default,_s as generateSettingsProfileContent};
