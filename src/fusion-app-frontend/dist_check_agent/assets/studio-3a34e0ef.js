import{aW as We,bb as zi,bc as ti,aF as Ct,bd as Qr,aP as Ie,be as xa,bf as Ia,bg as Xr,bh as re,bi as He,bj as ee,bk as Zr,C as ws,bl as tl,bm as el,bn as Te,bo as Yi,bp as sl,bq as Hi,br as Bo,bs as Qi,bt as Xi,bu as Js,bv as bs,bw as Oo,bx as qi,by as Pi,bz as Rs,bA as Us,bB as Ni,bC as Ri,bD as ja,o as il,bE as Ha,bF as ol,bG as Ui,P as Vs,bH as nl,bI as al,bJ as rl,bK as ll,bL as ni,bM as ze,bN as ai,bO as dl,bP as Es,bQ as cl,bR as ul,bS as pl,bT as ri,bU as qa,bV as ml,bW as fl,bX as bl,bY as Wt,bZ as Pa,b_ as Zi,b$ as Na,c0 as Ra,c1 as ke,V as to,c2 as eo,c3 as Ws,c4 as xe,c5 as Ua,c6 as gl,c7 as yl,c8 as Jo,c9 as Re,ca as hl,cb as so,cc as li,cd as Vo,ce as vl,cf as Wo,cg as Sl,ch as Go,ci as wl,cj as Ko,ck as zo,cl as _e,cm as El,cn as Fs,co as Ll,cp as Yo,cq as Tl,cr as Al,cs as Fa,ct as kl,cu as _l,cv as Da,cw as qe,cx as Qo,cy as Xo,cz as $l,ac as Cl,cA as Ml,cB as xl,cC as Il,cD as jl,cE as Hl,cF as ql,cG as Pl,cH as Nl,cI as Rl,cJ as Ul,cK as Fl,cL as pe,cM as Ba,cN as di,cO as Fi,cP as Zo,cQ as Dl,cR as tn,cS as Bl,cT as Ol,cU as Oa,cV as Ja,cW as Va,cX as en,E as Jl,a2 as je,cY as io,y as Wa,cZ as Vl,c_ as Wl,a4 as Gs,c$ as Di,d0 as Gl,d1 as Kl,d2 as zl,d3 as Yl,d4 as Ql,d5 as Bi,d6 as Xl,d7 as Zl,ag as ns,al as ei,ao as Ga,d8 as Ka,ax as za,d9 as Ya,da as td,aH as Ts,db as sn,dc as ed,dd as sd,de as oo,df as on,dg as id,dh as od,di as no,dj as nd,dk as ad,dl as rd,dm as ld,dn as dd,dp as cd,l as ao,dq as ud,dr as nn,ds as pd,dt as md,du as fd,dv as bd,dw as an,dx as ci,dy as gd,dz as yd,dA as hd,dB as ui,dC as vd,dD as Sd,dE as wd,dF as rn,dG as Ed,dH as Ld,dI as Td,aS as ks,dJ as ln,dK as dn,dL as pi,dM as _s,dN as cn,A as Ad,aX as un,dO as kd,dP as _d,dQ as $d,dR as Cd,dS as Md,dT as xd,dU as Id,S as jd,dV as Hd,dW as qd,dX as Pd,dY as pn,dZ as Nd,W as Rd,d_ as Ud,d$ as Ds,e0 as Fd,e1 as mn,e2 as Dd,e3 as Bd,e4 as Od,e5 as Jd,e6 as Vd,e7 as fn,e8 as bn,e9 as Wd,ea as Gd,eb as gn,ec as yn,ed as hn,ee as vn,ef as Sn,eg as wn,eh as En,ei as Ln,ej as Tn,ek as Kd,el as zd,em as Yd,en as Qd,eo as Xd,ep as ds,eq as An,er as kn,es as Zd,et as tc,eu as ec,ev as sc,ew as ic,ex as oc,ey as nc,ez as ac,eA as rc,eB as lc,eC as dc,eD as cc,eE as uc,eF as pc,eG as mc,eH as fc,eI as bc,eJ as gc,eK as _n,eL as yc,eM as hc,eN as vc,eO as Sc,eP as wc,eQ as Ec,eR as Lc,eS as Tc,eT as Ac,eU as kc,eV as _c,a5 as $c,M as $n,ab as Cc,eW as Mc}from"./index-20317f29.js";import{a as le,f as zt,d as Qa,s as xc,e as mi,g as Ic,h as Cn,l as jc,j as Hc,k as qc,m as Pc,n as Nc,o as Rc,p as gs,u as Gt,q as Uc,t as Fc,v as Dc}from"./studioDateFormat-30c8922b.js";import{b as Bc}from"./programSidebarRunDates-de5d2f88.js";import{normalizeCommunityVideoRecord as as,parseVideoLocales as Ae,normalizeVideoSlug as Oc,stringifyVideoLocales as Jc,videoMediaStatus as Xa}from"./videoPageModel-ac2c636a.js";import{i as Ce,p as Mn}from"./imageProbe-99c1dfc5.js";import"./communityPageDefaults-7a9546dc.js";function Za(e){if(!e||typeof e!="object")return"";const s=zi(e),i=(s==null?void 0:s.name)!=null?String(s.name).trim():"";return i||String(ti(e,"en")||"").trim()}function tr(e){if(!Array.isArray(e))return[];const s=[];for(const i of e)if(typeof i=="string"){const o=i.trim();o&&s.push(o)}else if(i&&typeof i=="object"&&"name"in i){const o=String(i.name??"").trim();o&&s.push(o)}return s}function er(e,s){const i=String(e||"").trim().toLowerCase();return i?s.some(o=>String(o).trim().toLowerCase()===i):!1}function Vc(e,s){const i=String(e||"").trim().toLowerCase();return i?s.filter(o=>String(o).trim().toLowerCase()!==i):s}function xn(e,s){var r;const i=Array.isArray(s)?s:[],o=e.totalSlots??((r=e.programPage)==null?void 0:r.totalSlots),n=Number(o),a=Number.isFinite(n)&&n>=0?Math.floor(n):0;e.availableSlots=Math.max(0,a-i.length)}async function Wc(e){const s=String(e||"").trim();if(!s||Ct()==="test")return new Set;try{const i=await Qr();if(typeof i.staffGetArtistApplicationsJson!="function")return new Set;const o=await i.staffGetArtistApplicationsJson(s),n=Ie(o);if(n==null||typeof n!="string"||!n.trim())return new Set;const a=JSON.parse(n);return!a||typeof a!="object"?new Set:new Set(Object.keys(a))}catch{return new Set}}async function Gc(e){const s=String(e.programId||"").trim(),i=e.artist&&typeof e.artist=="object"?e.artist:{},o=!!e.reserved;if(!s)throw new Error("program id required");const n=Za(i);if(!n)throw new Error("Artist needs an English name in Identity tab to use Programs.");const a=await xa(s);if(!a||typeof a!="object")throw new Error("Program not found");let r;try{r=JSON.parse(String(a.localesJson||"{}")),(!r||typeof r!="object")&&(r={})}catch{r={}}const l={...r.en&&typeof r.en=="object"?r.en:{}};l.programPage=l.programPage&&typeof l.programPage=="object"?{...l.programPage}:{};let d=tr(l.programPage.confirmedArtists);if(o?er(n,d)||(d=[...d,n]):d=Vc(n,d),l.programPage.confirmedArtists=d,xn(l,d),r.en=l,r.ja&&typeof r.ja=="object"){const L={...r.ja};L.programPage=L.programPage&&typeof L.programPage=="object"?{...L.programPage}:{},L.programPage.confirmedArtists=[...d],xn(L,d),r.ja=L}const p=JSON.stringify(r),u=String(a.id??s),c=String(a.routeLink??""),m=Math.max(0,Math.floor(Number(a.featuredOrder??0))),b=String(a.visibility??""),C=String(a.studioStatus??""),w=new Date().toISOString();await Ia({id:u,routeLink:c,featuredOrder:m,visibility:b,studioStatus:C,updatedAt:w,depositAmountDisplay:String(a.depositAmountDisplay!=null?a.depositAmountDisplay:""),localesJson:p})}function sr(e){if(!e||typeof e!="object")return{en:{},pp:{},list:[]};const s=e;let i=s.enCard&&typeof s.enCard=="object"?s.enCard:null;if(!i)try{const a=JSON.parse(String(s.localesJson||"{}"));i=a.en&&typeof a.en=="object"?a.en:{}}catch{i={}}const o=i.programPage&&typeof i.programPage=="object"?i.programPage:{},n=tr(o.confirmedArtists);return{en:i,pp:o,list:n}}function Kc(e){const{en:s,pp:i,list:o}=sr(e),n=s.totalSlots??i.totalSlots,a=Number(n),r=Number.isFinite(a)&&a>=0?Math.floor(a):null,l=o.length,d=r!=null?Math.max(0,r-l):null;return{confirmedCount:l,totalSlots:r,remaining:d}}function In(e,s){const i=String(s||"").trim();if(!e||typeof e!="object")return{reserved:!1,confirmedCount:0,totalSlots:null,remaining:null};const{confirmedCount:o,totalSlots:n,remaining:a}=Kc(e);if(!i)return{reserved:!1,confirmedCount:o,totalSlots:n,remaining:a};const{list:r}=sr(e);return{reserved:er(i,r),confirmedCount:o,totalSlots:n,remaining:a}}async function zc(e,s){const i=e.querySelector("#studio-art-programs-tbody"),o=e.querySelector("#studio-art-programs-status");if(!i||!s||typeof s!="object")return;const n=String(s.id??""),a=Za(s),r=(l,d)=>{o&&(o.textContent=l,o.className=`studio-muted studio-art-programs-status${d?" studio-banner studio-banner--error":""}`)};try{const[l,d]=await Promise.all([We(),Wc(n)]);r(a?"":"Add an English name under Identity to manage program reservation.",!1);const p=u=>String(u??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;");if(i.replaceChildren(),!l.length){const u=document.createElement("tr");u.innerHTML='<td colspan="5" class="studio-muted">No programs in the roster.</td>',i.appendChild(u);return}for(const u of l){if(!u||typeof u!="object")continue;const c=String(u.id??"");if(!c)continue;const{reserved:m,totalSlots:b,remaining:C}=In(u,a),w=d.has(c);let L=c;try{const f=JSON.parse(String(u.localesJson||"{}")),v=f.en&&typeof f.en=="object"?f.en:{},E=v.programPage&&typeof v.programPage=="object"?v.programPage:{};L=String(E.headline||v.headline||v.location||v.focus||c).trim()||c}catch{}const A=document.createElement("tr");A.dataset.programId=c,A.innerHTML=`
        <td class="studio-td-title">${p(L)}</td>
        <td class="studio-td-num">${b!=null?p(String(b)):"—"}</td>
        <td class="studio-td-num studio-art-prog-remaining">${C!=null?p(String(C)):"—"}</td>
        <td class="studio-td-cb"><input type="checkbox" class="studio-art-prog-applied" disabled ${w?"checked":""} title="Application on file" /></td>
        <td class="studio-td-cb"><input type="checkbox" class="studio-art-prog-reserved" ${m?"checked":""} ${a?"":"disabled"} title="Add/remove from program confirmed artists" /></td>
      `,i.appendChild(A);const g=A.querySelector(".studio-art-prog-reserved");g instanceof HTMLInputElement&&a&&g.addEventListener("change",async()=>{const f=g.checked;g.disabled=!0;try{await Gc({programId:c,artist:s,reserved:f});const E=(await We()).find(S=>S&&String(S.id)===c)||u,j=In(E,a),M=A.querySelector(".studio-art-prog-remaining");M&&(M.textContent=j.remaining!=null?String(j.remaining):"—"),j.reserved!==f&&(g.checked=j.reserved),r("Saved.",!1)}catch(v){g.checked=!f,r(v instanceof Error?v.message:String(v),!0)}finally{g.disabled=!1}})}}catch(l){r(l instanceof Error?l.message:String(l),!0)}}let Ks=null,ro=!1,lo=!1;function ir(e){Ks=e.effectiveMatrix,ro=!!e.permissionsNavAllowed,lo=!!e.teamNavAllowed}function ys(){return{effectiveMatrix:Ks,permissionsNavAllowed:ro,teamNavAllowed:lo}}function Jt(e){return Ks==null?{visible:!0,canEdit:!0}:Ks.get(e)??{visible:!0,canEdit:!0}}const Yc={Programs:"financePrograms",Users:"financeUsers",Products:"financeProducts",Promotions:"financePromotions"},Qc=["Programs","Users","Products","Promotions"];function Ee(e){if(!Jt("finance").visible)return{visible:!1,canEdit:!1};const i=Yc[e]||`finance${e}`;return Jt(i)}function Xc(){return Qc.filter(e=>Ee(e).visible)}function co(e){const s=String(e||"").trim().toLowerCase();return s==="dashboard"?!0:s==="permissions"?ro:s==="team"?lo:Jt(s).visible}function uo(e){const s=String(e||"").toLowerCase();return s?{active:"Active",trialing:"Trialing",past_due:"Past due",canceled:"Canceled",unpaid:"Unpaid",incomplete:"Incomplete",incomplete_expired:"Incomplete (expired)",paused:"Paused"}[s]||String(e):"No subscription"}function As(e){const s=e==null?void 0:e.trialEndsAtSec,i=Number(s);return!Number.isFinite(i)||i<=0?"none":Date.now()/1e3<=i?"active":"expired"}function Zc(e){if(e.membershipExemptManual||As(e)==="active")return"studio-user-sub-dot--ok";const i=String(e.stripeSubscriptionStatus||"").toLowerCase();return i==="active"||i==="trialing"?"studio-user-sub-dot--ok":"studio-user-sub-dot--err"}function tu(e){const s=e&&typeof e=="object"?e:{};if(s.membershipExemptManual)return"muted";if(As(e)==="active")return"ok";const i=String(s.stripeSubscriptionStatus||"").toLowerCase();return i==="active"||i==="trialing"?"ok":i==="past_due"||i==="unpaid"?"warn":"muted"}function eu(e,s=i=>String(i)){const i=e&&typeof e=="object"?e:{},o=tu(e),n=i.membershipExemptManual?"Exempt (manual)":uo(String(i.stripeSubscriptionStatus||""));return`<span class="mpd-membership-badge mpd-membership-badge--${o}"><span class="mpd-membership-badge__icon" aria-hidden="true"></span><span class="mpd-membership-badge__text"><strong>${s(n)}</strong></span></span>`}function De(e,s){const i=String(s||"").trim();if(!i)return!0;const o=e&&typeof e=="object"?e:{};if(i==="exempt")return!!o.membershipExemptManual;const n=As(e);if(i==="trial_active")return n==="active";if(i==="trial_expired")return n==="expired";const a=String(o.stripeSubscriptionStatus||"").toLowerCase();return i==="active"?!o.membershipExemptManual&&a==="active":i==="trialing"?!o.membershipExemptManual&&a==="trialing":i==="past_due"?!o.membershipExemptManual&&a==="past_due":i==="canceled"?!o.membershipExemptManual&&a==="canceled":i==="none"?o.membershipExemptManual||n!=="none"?!1:!a:!0}function zs(e){return le(e)}function or(e,s){const i=String(e||"").trim();return i.startsWith("cus_")?`${String(s||"").startsWith("pk_test_")?"https://dashboard.stripe.com/test":"https://dashboard.stripe.com"}/customers/${encodeURIComponent(i)}`:""}function jn(e){const s=Array.isArray(e)?e:[];let i=0,o=0,n=0,a=0;for(const r of s)De(r,"exempt")?n+=1:De(r,"active")||De(r,"trialing")?i+=1:De(r,"past_due")?o+=1:De(r,"none")&&(a+=1);return{active:i,pastDue:o,exempt:n,none:a,total:s.length}}function su(e){const s=Number((e==null?void 0:e.active)??0),i=Number((e==null?void 0:e.trialing)??0),o=Number((e==null?void 0:e.included)??s+i);if(!o)return"No active membership subscriptions";const n=[];return s&&n.push(`${s} active`),i&&n.push(`${i} trialing`),`${n.join(" · ")} · ${o} included`}function iu(e){return!!(e&&typeof e=="object"&&e.ok===!0&&typeof e.mrrCents=="number")}function ou(e){return`
        <section class="member-profile-dashboard__card studio-finance-revenue-stat-card">
            <div class="mpd-payments-section-head">
                <h3>Membership revenue</h3>
                <span class="studio-muted">Stripe subscription totals</span>
            </div>
            <p class="studio-muted" style="margin:0">Revenue data is unavailable. Check integration API configuration and try refreshing.</p>
        </section>`}function Hn(e,s,i={}){if(!iu(e))return ou();const o=e.cadence&&typeof e.cadence=="object"?e.cadence:{},n=Number(o.monthlyCents??0),a=Number(o.bimonthlyCents??0),r=Number(o.annualCents??0),l=Number(o.otherCents??0),d=Number(e.mrrCents??0),p=e.counts&&typeof e.counts=="object"?e.counts:{},u=su(p),c=(b,C,w)=>`
        <div class="mpd-payments-overview-card">
            <span>${s(b)}</span>
            <strong>${s(zt(C))}</strong>
            <small>${s(w)}</small>
        </div>`,m=[c("Monthly equivalent (MRR)",d,u),c("Bi-monthly billing",a,"Per 2-month cycle total"),c("Monthly billing",n,"Per 1-month cycle total"),c("Annual billing",r,"Per year cycle total")];if(l>0&&m.push(c("Other cadence",l,"Non-standard billing intervals")),i.compact){const b=[c("MRR",d,u),c("Bi-monthly",a,"Per cycle")];return r>0&&b.push(c("Annual",r,"Per cycle")),`
            <div class="mpd-payments-overview-grid studio-finance-revenue-stat-grid">
                ${b.join("")}
            </div>`}return`
        <section class="member-profile-dashboard__card studio-finance-revenue-stat-card">
            <div class="mpd-payments-section-head">
                <h3>Membership revenue</h3>
                <span class="studio-muted">Active and trialing Stripe subscriptions</span>
            </div>
            <div class="mpd-payments-overview-grid studio-finance-revenue-stat-grid">
                ${m.join("")}
            </div>
        </section>`}function qn(e){return String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function qt(e,s={}){const i=s.title?qn(s.title):"",o=s.subtitle?qn(s.subtitle):"";let n=s.panelClass||"studio-modal-panel";s.panelClass||(s.wide?n="studio-modal-panel studio-modal-panel--wide":s.compact&&(n="studio-modal-panel studio-modal-panel--compact"));const a=s.bodyClass?` ${s.bodyClass}`:"",r=s.headerClass?` ${s.headerClass}`:"",l=i?`<div class="studio-modal-header__titles">
                <h2 id="studio-modal-title-el" class="studio-modal-title">${i}</h2>
                ${o?`<p class="studio-modal-subtitle">${o}</p>`:""}
           </div>`:'<span id="studio-modal-title-el" class="studio-modal-title studio-sr-only">Dialog</span>',d=document.createElement("div");d.className="studio-modal-root",d.innerHTML=`
        <div class="studio-modal-backdrop" data-studio-modal-close="1" tabindex="-1"></div>
        <div class="${n}" role="dialog" aria-modal="true" aria-labelledby="studio-modal-title-el">
            <div class="studio-modal-header${r}">
                ${l}
                <button type="button" class="studio-modal-x" data-studio-modal-close="1" aria-label="Close">×</button>
            </div>
            <div class="studio-modal-body${a}">${e}</div>
            ${s.footerHtml||""}
        </div>
    `,document.body.appendChild(d);const p=()=>{var b;document.removeEventListener("keydown",u),d.remove(),(b=s.onClose)==null||b.call(s)},u=b=>{b.key==="Escape"&&p()};document.addEventListener("keydown",u),d.querySelectorAll("[data-studio-modal-close]").forEach(b=>{b.addEventListener("click",()=>p())});const c=d.querySelector(".studio-modal-panel"),m=c==null?void 0:c.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');return m&&m instanceof HTMLElement&&queueMicrotask(()=>m.focus()),{close:p,root:d}}const nr="<!-- fusion-email-layout -->",nu="https://fusionart.world/email/Fusion-X-logo-02.png",au="https://fusionart.world/email/Fusion-Logo-Sig-1.png",ru="'momochidori-variable','Momochidori','Helvetica Neue',Helvetica,Arial,sans-serif",Nt={canvas:"#faf3f4",text:"#000000",ctaBg:"#c12525",ctaText:"#ffffff",pillBg:"#000000",pillText:"#ffffff",footerMuted:"#4a4a4a",bodyLead:"font-size:16px;line-height:1.6;margin:0 0 16px;color:#000000",body:"font-size:15px;line-height:1.6;margin:0 0 20px;color:#000000",bodyLast:"font-size:15px;line-height:1.6;margin:0 0 28px;color:#000000",bodyQuote:"font-size:15px;line-height:1.6;margin:0 0 20px;color:#000000;font-style:italic",bodyList:"font-size:15px;line-height:1.6;margin:0 0 28px;padding-left:1.2em;color:#000000",link:"color:#000000;text-decoration:none;border-bottom:1px solid #000000",footnote:"font-size:12px;margin:26px 0 0;color:#000000"},lu="https://fusionart-bucket.s3.us-east-2.amazonaws.com/uploads/platform-assets/program_hero-1.jpg";function ar(e){return String(e||"").includes(nr)}function se(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Bt(e){const s=String(e||"").split(/[?#]/)[0].toLowerCase();return/\.(mp4|webm|ogg|mov)$/i.test(s)}function rr(e,s="",i=""){const o=String(e||"").trim();if(!o||!Bt(o))return"";const n=se(s||"Video"),a=String(i||"").trim(),r=a&&!Bt(a)?` poster="${se(a)}"`:"";return`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
<tbody><tr>
<td align="center">
<video src="${se(o)}" width="552" controls playsinline${r} style="display:block;width:100%;max-width:552px;height:auto;border:0;margin:0 auto;" aria-label="${n}"></video>
</td>
</tr></tbody></table>`}function lr(e,s="",i=""){const o=String(e||"").trim();if(!o||!Bt(o))return"";const n=se(s||"Video"),a=String(i||"").trim(),r=a&&!Bt(a)?` poster="${se(a)}"`:"";return`<p style="${Nt.bodyLead};text-align:center;"><video src="${se(o)}" controls playsinline${r} style="display:inline-block;max-width:100%;height:auto;border:0" aria-label="${n}"></video></p>`}function dr(e,s="",i=""){return Bt(e)?rr(e,s,i):cu(e,s)}function du(e,s="",i=""){return Bt(e)?lr(e,s,i):uu(e,s)}function cu(e,s=""){const i=String(e||"").trim();if(!i)return"";if(Bt(i))return rr(i,s);const o=se(s||"Fusion");return`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
<tbody><tr>
<td align="center">
<img src="${i}" alt="${o}" width="552" style="display:block;width:100%;max-width:552px;height:auto;border:0;margin:0 auto;">
</td>
</tr></tbody></table>`}function uu(e,s=""){const i=String(e||"").trim();if(!i)return"";if(Bt(i))return lr(i,s);const o=se(s||"");return`<p style="${Nt.bodyLead};text-align:center;"><img src="${i}" alt="${o}" style="display:inline-block;max-width:100%;height:auto;border:0" /></p>`}function Mt(e,s="body"){return`<p style="${s==="lead"?Nt.bodyLead:s==="last"?Nt.bodyLast:s==="quote"?Nt.bodyQuote:Nt.body}">${e}</p>`}function pu(e,s){const i=se(e),o=se(s);return`<a href="${i}" style="${Nt.link}">${o}</a>`}function po(e){const s=String(e??"").trim();if(!s)return"";const i=u=>u.replace(/<a\b([^>]*)>/gi,(c,m)=>{const b=String(m).match(/\bhref=(["'])(.*?)\1/i);return`<a href="${b?b[2]:"https://www.fusionart.world"}" style="${Nt.link}">`}),o=s.match(/<ul[\s\S]*?<\/ul>/i),n=o?i(o[0].replace(/<ul[^>]*>/i,`<ul style="${Nt.bodyList}">`)):"",a=o?s.replace(o[0],"").trim():s,r=[],l=/<p[^>]*>([\s\S]*?)<\/p>/gi;let d;for(;(d=l.exec(a))!==null;){const u=d[1].trim();u&&r.push(u)}if(!r.length){const u=a.replace(/<\/?p[^>]*>/gi,"").trim();return u?i(Mt(u,"last"))+(n?`
${n}`:""):n}const p=r.map((u,c)=>{const m=c===0?"lead":c===r.length-1?"last":"body",b=/^[“"']/.test(u.replace(/<[^>]+>/g,"").trim());return Mt(i(u),b&&c===0?"quote":m)}).join(`
`);return n?`${p}
${n}`:p}function Bs(e={}){var w,L;const s=se(e.eyebrow||"Program Update"),i=String(e.heroImageUrl||"").trim(),o=String(e.heroPosterUrl||"").trim(),n=se(e.heroAlt||""),a=String(e.pillLabel||"").trim(),r=String(e.headlineHtml||"").trim(),l=String(e.bodyHtml||"").trim(),d=String(((w=e.cta)==null?void 0:w.label)||"").trim(),p=String(((L=e.cta)==null?void 0:L.href)||"https://www.fusionart.world").trim(),u=String(e.footnote||"").trim(),c=a?`<div style="display:inline-block;background:${Nt.pillBg};color:${Nt.pillText};padding:6px 12px;font-size:11px;font-weight:700;margin-bottom:18px;letter-spacing:0.06em;">${se(a)}</div>`:"",m=r?`<h1 style="margin:0 0 20px;font-size:44px;line-height:0.95;font-weight:900;letter-spacing:-0.04em;color:${Nt.text};">${r}</h1>`:"",b=d?`<a href="${se(p)}" style="display:inline-block;background:${Nt.ctaBg};color:${Nt.ctaText};text-decoration:none;padding:14px 20px;font-size:12px;font-weight:800;letter-spacing:0.08em;">${se(d)}</a>`:"",C=u?`<p style="${Nt.footnote}">${u}</p>`:"";return`${nr}
<div style="font-family:${ru};max-width:600px;margin:0 auto;background:${Nt.canvas};color:${Nt.text};padding:40px 24px;line-height:1.5">
  <div style="padding-bottom:22px;margin-bottom:26px;display:flex;justify-content:space-between;align-items:center;">
    <img src="${nu}" alt="Fusion" width="160" style="display:block;height:auto;border:0">
    <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-weight:600;color:${Nt.text};">${s}</div>
  </div>
  ${i?dr(i,n,o):""}
  <div style="border-top:1px solid #000000;border-bottom:1px solid #000000;padding:32px 0;">
    ${c}
    ${m}
    ${l}
    ${b}
    ${C}
  </div>
  <div style="margin-top:30px;padding-top:22px;">
    <p style="margin:0 0 12px;font-size:13px;color:${Nt.text};">— Fusion Team</p>
    <img src="${au}" alt="Fusion" width="110" style="display:block;margin-bottom:16px;border:0">
    <p style="margin:0 0 8px;font-size:13px;">
      <a href="https://www.fusionart.world" style="${Nt.link}">fusionart.world</a>
    </p>
    <p style="margin:0;font-size:12px;color:${Nt.footerMuted};letter-spacing:0.05em;">
      IG: @fusion_intl &nbsp;/&nbsp; TT: @fusion_intl &nbsp;/&nbsp; YT: @fusionartworld
    </p>
  </div>
</div>`}function mu(){return{eyebrow:"Program Update",heroImageUrl:lu,heroAlt:"Kaga City, Ishikawa",pillLabel:"JAPAN ARTIST RESIDENCY",headlineHtml:"Kaga City,<br>Ishikawa<br>Fall 2026",bodyHtml:[Mt("Applications are now open for the next FUSION Artist Residency in Japan.","lead"),Mt("A program shaped around place, process, and exchange, moving from the cultural energy of Japan to the quiet, craft-rich landscape of Kaga City."),Mt("Join an evolving platform connecting artists, curators, collectors, and galleries through residency, dialogue, and visibility.","last")].join(`
`),cta:{label:"APPLY / LEARN MORE",href:"https://fusionart.world/program/kaga-ishikawa"},footnote:"Space is limited. Early applications encouraged."}}function Be(e){return Bs(e)}function fu(e){var w,L,A,g,f,v,E,j,M;const s=String(e??"").trim();if(!ar(s))return null;const i=S=>String(S??"").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"'),o=((L=(w=s.match(/text-transform:uppercase;font-weight:600;color:#000000;">([^<]*)</i))==null?void 0:w[1])==null?void 0:L.trim())||((g=(A=s.match(/text-transform:uppercase;font-weight:600;">([^<]*)</i))==null?void 0:A[1])==null?void 0:g.trim())||"",a=(((f=s.match(/<table role="presentation"[\s\S]*?<\/table>/i))==null?void 0:f[0])||"").match(/<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"/i),r=a!=null&&a[1]?i(a[1]):"",l=a!=null&&a[2]?i(a[2]):"",d=((E=(v=s.match(/letter-spacing:0\.06em;">([^<]+)<\/div>/i))==null?void 0:v[1])==null?void 0:E.trim())||"",p=((M=(j=s.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i))==null?void 0:j[1])==null?void 0:M.trim())||"",u=s.match(/<a href="([^"]+)" style="display:inline-block;background:#c12525;color:#ffffff[^"]*"[^>]*>([^<]+)</i)||s.match(/style="display:inline-block;background:#c12525;color:#ffffff[^"]*"[^>]*href="([^"]+)"[^>]*>([^<]+)</i),c=u?{href:i(u[1]),label:i(u[2]).trim()}:void 0,m=s.match(/border-top:1px solid #000000;border-bottom:1px solid #000000;padding:32px 0;">([\s\S]*?)<\/div>\s*<div style="margin-top:30px/);let b="",C="";if(m){let S=m[1];S=S.replace(/<div style="display:inline-block;background:[^"]*#000000[^"]*[\s\S]*?<\/div>\s*/i,""),S=S.replace(/<h1[\s\S]*?<\/h1>\s*/i,""),S=S.replace(/<a href="[^"]*" style="display:inline-block;background:#c12525[\s\S]*?<\/a>\s*/i,"");const h=S.match(/<p style="font-size:12px;margin:26px 0 0[^"]*">([\s\S]*?)<\/p>\s*$/i);h&&(C=h[1].replace(/<[^>]+>/g,"").trim(),S=S.replace(h[0],"")),b=S.trim()}return{eyebrow:i(o),heroImageUrl:r,heroAlt:i(l),pillLabel:i(d),headlineHtml:p,bodyHtml:po(b)||b,cta:c,footnote:i(C)}}function bu(e){const s=fu(e);if(s)return{isBranded:!0,layoutSlots:s,rawBodyHtml:s.bodyHtml||""};const i=String(e??"").trim();return!i||i==="<p><br></p>"||i==="<p></p>"?{isBranded:!1,layoutSlots:null,rawBodyHtml:""}:{isBranded:!1,layoutSlots:null,rawBodyHtml:po(i)||i}}function fi(e){return String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}const gu=new Set(["el jngl","lady pluuto"]);function yu(e){const s=String(e??"").trim();return s?gu.has(s.toLowerCase())?s:s.split(/\s+/).filter(Boolean)[0]||s:""}function Pn(e,s){const i=String(s.artistName??"").trim(),o=yu(i),n=fi(i),a=fi(o),r=fi(s.accessCode??"");return String(e??"").replace(/\{\{ARTIST_FIRST_NAME\}\}/g,a).replace(/\{\{ARTIST_NAME\}\}/g,n).replace(/\{\{ACCESS_CODE\}\}/g,r)}const hu="https://fusionart.world/email/Fusion-X-logo-02.png";function cr(e,s={}){const i=s.includeSignature!==!1?`<p style="margin:0 0 14px;font-size:15px;line-height:1.45">— Fusion Team</p>
<p style="margin:0 0 16px"><img src="https://fusionart.world/email/Fusion-Logo-Sig-1.png" alt="Fusion" width="120" height="auto" style="display:block;max-width:100%;height:auto;border:0" /></p>
<p style="margin:0 0 10px"><a href="https://www.fusionart.world" style="color:#111;text-decoration:underline">Fusion Art World</a></p>
<p style="margin:0;font-size:14px;line-height:1.5;color:#3f3f3f">IG: @fusion_intl | TT: @fusion_intl | YT: @fusionartworld</p>`:"";return`<div style="font-family:system-ui,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 28px 44px;background:#fff;color:#111;line-height:1.5">
<div style="text-align:center;margin:0 0 36px;padding:0 0 8px">
<img src="${hu}" alt="Fusion" width="220" height="auto" style="display:inline-block;max-width:100%;height:auto;border:0" />
</div>
<div style="margin:0 0 40px;padding:0">
${e}
</div>
${i?`<div style="margin:0;padding:40px 0 0;border-top:1px solid #e5e2df">
${i}
</div>`:""}
</div>`}const Nn=mu(),Ge={tpl_general:{id:"tpl_general",name:"General",templateGroup:"updates",defaultEyebrow:"Program Update",defaultSubject:"Kaga City, Ishikawa — Artist Residency (Fall 2026)",defaultPreview:"Applications are open for the next FUSION Artist Residency in Japan.",bodyHtml:Be(Nn),notes:"Full-width branded layout; edit copy and links per campaign."},tpl_program_update:{id:"tpl_program_update",name:"Program Update",templateGroup:"updates",defaultEyebrow:"Program Update",contentSourceTypes:["program"],defaultSubject:"Program update from Fusion",defaultPreview:"News and details about an upcoming Fusion residency program.",bodyHtml:Be({...Nn,eyebrow:"Program Update",headlineHtml:"Program<br>Update",bodyHtml:[Mt("Select a program under Content source to pull hero image, dates, and apply link — or edit this copy manually.","lead"),Mt("Share what is new, who should apply, and one clear next step for readers.","last")].join(`
`),cta:{label:"VIEW PROGRAM",href:"https://www.fusionart.world/programs"}}),notes:"Bind a program card to auto-fill hero, title, and CTA."},tpl_featured_artist:{id:"tpl_featured_artist",name:"Featured Artist",templateGroup:"spotlights",defaultEyebrow:"Artist Spotlight",contentSourceTypes:["artist"],defaultSubject:"Artist spotlight",defaultPreview:"A conversation with a Fusion artist — read the story.",bodyHtml:Be({eyebrow:"Artist Spotlight",pillLabel:"FUSION ARTIST",headlineHtml:"Artist<br>Spotlight",bodyHtml:[Mt("“A short pull quote or highlight about the work.”","quote"),Mt("Intro paragraph: context for readers and a clear reason to visit the full profile.","last")].join(`
`),cta:{label:"VIEW PROFILE",href:"https://www.fusionart.world/artists"}}),notes:"Bind a roster artist to pull image, name, bio, and profile link."},tpl_featured_video:{id:"tpl_featured_video",name:"Featured Video",templateGroup:"spotlights",defaultEyebrow:"Fusion Video",contentSourceTypes:["video"],defaultSubject:"New video on Fusion",defaultPreview:"Studio visit and conversation — watch now on Fusion.",bodyHtml:Be({eyebrow:"Fusion Video",pillLabel:"FUSION VIDEO",headlineHtml:"Featured<br>Video",bodyHtml:[Mt("Lead with what this studio visit or conversation covers — and why it matters to the Fusion community.","lead"),Mt("Invite readers to watch the full video on fusionart.world.","last")].join(`
`),cta:{label:"WATCH NOW",href:"https://www.fusionart.world/videos"}}),notes:"Bind a community video to pull poster, title, description, and watch link."},tpl_journal_entry:{id:"tpl_journal_entry",name:"Journal Entry",templateGroup:"spotlights",defaultEyebrow:"Journal",contentSourceTypes:["journal"],defaultSubject:"From the Fusion journal",defaultPreview:"A new story from the Fusion journal.",bodyHtml:Be({eyebrow:"Journal",pillLabel:"FUSION JOURNAL",headlineHtml:"Journal<br>Entry",bodyHtml:[Mt("Lead with the heart of the piece — what happened, who was involved, and why it matters to the Fusion community.","lead"),Mt("Add a short invitation to read the full entry on fusionart.world.","last")].join(`
`),cta:{label:"READ ENTRY",href:"https://www.fusionart.world/journal"}}),notes:"Bind a journal entry to pull image, title, and link."},tpl_open_call:{id:"tpl_open_call",name:"Open Call Launch",templateGroup:"campaigns",defaultEyebrow:"Open Call",defaultSubject:"Residency open call",defaultPreview:"Apply for the next Fusion residency — limited places.",bodyHtml:Bs({eyebrow:"Open Call",pillLabel:"RESIDENCY",headlineHtml:"Residency<br>Open Call",bodyHtml:[Mt("We are inviting artists to apply for the upcoming program. Share your practice and what you would explore during the residency.","lead"),`<ul style="${Nt.bodyList}">
<li>Key dates in your local timezone</li>
<li>What we provide</li>
<li>How to apply</li>
</ul>`].join(`
`),cta:{label:"APPLY NOW",href:"https://www.fusionart.world"}}),notes:"Add hero image via toolbar if needed."},tpl_open_call_roster:{id:"tpl_open_call_roster",name:"The new Fusion is here (Send blast)",templateGroup:"campaigns",defaultEyebrow:"Platform Update",defaultSubject:"The new Fusion is here! Your access is inside! :)",defaultPreview:"The platform is live. Your profile, the network, and what is next — including Kaga.",bodyHtml:Bs({eyebrow:"Platform Update",pillLabel:"PLATFORM UPDATE",headlineHtml:"The new<br>Fusion is<br>here.",bodyHtml:[Mt('<span style="font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">Your new global footprint — live now</span>',"lead"),Mt("Hi {{ARTIST_FIRST_NAME}},"),Mt("We are thrilled to say: the <strong>new Fusion platform</strong> is live! Your space for profile, programs, and the community we are building together. This is the next chapter in Fusion's evolution: a place where the interconnections between <strong>artists, curators, collectors, and galleries</strong> can grow in private and present in public, and where we believe that exchange will help shape the future of the art world."),Mt("The platform is in <strong>steady development.</strong> You may notice a few kinks along the way, and it will keep evolving over time. <strong>Access is free for all Fusion veterans</strong>, and you can expect it to deepen and refine for impact and strategic positioning in the coming months."),Mt("Below is your personal <strong>access code</strong>. Enter it when you join Fusion as an artist to link your roster profile (single use - once it is redeemed, it clears on our side)."),'<p style="font-size:20px;line-height:1.4;margin:0 0 20px;font-weight:700;letter-spacing:0.12em;color:#000000;">{{ACCESS_CODE}}</p>',Mt("Additionally, we'll be introducing guest passes to extend guest access to artists, curators or collectors you think would benefit from the platform."),Mt("We also have a <strong>new program coming up in Kaga</strong>. If you are interested, you are welcome to <strong>reach out to us directly</strong> for an expedited process, and <strong>first return residency artists are eligible for a discount</strong>."),Mt(`If anything feels off while you explore, please email us at ${pu("mailto:info@fusionart.world","info@fusionart.world")} — we read every message and want to hear from you.`,"last")].join(`
`),cta:{label:"SEE THE NEW FUSION",href:"https://www.fusionart.world"}}),notes:"Send blast: platform launch invite; per-artist name + code; Kaga + support",requiresRosterPlaceholders:!0},tpl_reminder:{id:"tpl_reminder",name:"Reminder (last chance)",templateGroup:"campaigns",defaultEyebrow:"Reminder",defaultSubject:"Last chance to apply",defaultPreview:"Final days — don’t miss the deadline.",bodyHtml:Bs({eyebrow:"Reminder",pillLabel:"DEADLINE",headlineHtml:"Closing<br>Soon",bodyHtml:Mt("This is a short note to remind you that applications close soon. If you have questions, simply reply to this email.","last"),cta:{label:"VIEW DETAILS",href:"https://www.fusionart.world"}})}};Ge.tpl_artist_feature={...Ge.tpl_featured_artist,id:"tpl_artist_feature",name:"Artist Feature (legacy)"};const vu=[{key:"updates",label:"Updates"},{key:"spotlights",label:"Spotlights"},{key:"campaigns",label:"Campaigns"}];function Me(e){return e==="tpl_artist_feature"?Ge.tpl_featured_artist:Ge[e]}function Su(){const e=o=>String(o??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;"),s={};for(const o of Object.values(Ge)){if(o.id==="tpl_artist_feature")continue;const n=o.templateGroup||"campaigns";s[n]||(s[n]=[]),s[n].push(o)}let i='<option value="">— None —</option>';for(const{key:o,label:n}of vu){const a=s[o];if(a!=null&&a.length){i+=`<optgroup label="${e(n)}">`;for(const r of a)i+=`<option value="${e(r.id)}">${e(r.name)}</option>`;i+="</optgroup>"}}return i}const Rn=12e3,ur="fusion-studio-applicant-email-templates",wu="fusion-studio-applicant-email-draft:",pr="tpl-applicant-approved-invitation",Eu="tpl-applicant-secure-slot-nudge";function si(e,s){const i=s?`
<p style="margin:0;color:#333">${s}</p>
`:`
`;return`<div style="padding-top:22px;">

<p style="margin:0 0 6px">Best Regards,</p>
<p style="margin:0 0 4px;font-weight:700">${e}</p>${i}
    <img src="https://fusionart.world/email/Fusion-Logo-Sig-1.png" alt="Fusion" width="110" style="display:block;margin-bottom:16px;border:0">

    <p style="margin:0 0 8px;font-size:13px;">
      <a href="https://www.fusionart.world" style="color:#000000;text-decoration:none;border-bottom:1px solid #000000;">
        fusionart.world
      </a>
    </p>

    <p style="margin:0;font-size:12px;color:#4a4a4a;letter-spacing:0.05em;">
      IG: @fusion_intl &nbsp;/&nbsp; TT: @fusion_intl &nbsp;/&nbsp; YT: @fusionartworld
    </p>

  </div>`}const Oe=si("Zoia Amadi","Communications Director at Fusion Intl."),Lu=Oe,mr=si("Fusion Team"),Tu=si("Akari Koizumi","Events Coordinator / Interpreter"),Au=si("Starr Oge","Founding Director"),bi=[{id:"zoia",label:"Zoia Amadi",html:Oe},{id:"fusion-team",label:"Fusion Team",html:mr},{id:"akari",label:"Akari Koizumi",html:Tu},{id:"starr",label:"Starr Oge",html:Au}];function gi(e){return wu+String(e||"").trim()}function me(e){return String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function ku(e){return`<div style="font-size:15px;line-height:1.55;color:#0f172a;white-space:pre-wrap;word-wrap:break-word">${me(e)}</div>`}function yi(e,s){let i=String(e??"");for(const[o,n]of Object.entries(s))i=i.split(`{{${o}}}`).join(n);return i}function _u(e){const s=String(e||"").trim();return!s||s.toLowerCase()==="there"?"there":s.split(/\s+/).filter(Boolean)[0]||s}function $u(){return`${ws()}/settings/profile`}function Un(e,s={}){if(s.unavailable)return'<p class="studio-applicant-email-composer__hint">Correspondence log is unavailable until the backend is deployed and <code class="studio-code-inline">dfx generate fusion-app-backend</code> is run.</p>';const i=[...e||[]].sort((o,n)=>String(o.sentAt||"").localeCompare(String(n.sentAt||"")));return i.length?`<ol class="studio-applicant-email-composer__outreach-list">${i.map(o=>{const{label:n,title:a}=Qa(o.sentAt),r=me(o.templateName||"Manual"),l=me(o.subject||"—");return`<li><span class="studio-applicant-email-composer__outreach-date" title="${me(a)}">${me(n)}</span> <strong>${r}</strong> <span class="studio-applicant-email-composer__outreach-subject">${l}</span></li>`}).join("")}</ol>`:'<p class="studio-applicant-email-composer__hint">No emails logged yet.</p>'}function $s(){return[{id:pr,name:"Approved applicant invitation",subject:"Fusion {{programLocation}} Program invitation",signatureHtml:Lu,signatureKey:"zoia",builtIn:!0,body:`Hi {{firstName}},

It was a pleasure meeting you and hearing more about your work and the inspiration behind it. We reviewed your application and are thrilled to extend an invitation for the upcoming Fusion {{programLocation}} Program from {{programStartDate}} to {{programEndDate}}.

Please see below for next steps. Spots are first come, first served, so submit your deposit or full payment to secure your spot in the program.

Next steps:
1. Sign in to Fusion.
2. Visit your Settings Profile page: {{profileProgramsUrl}}
3. Open Programs, then select the Payments tab.
4. Select the accepted {{programLocation}} program.
5. Submit your deposit or full payment to secure your position.

After your payment is submitted, we will follow up with confirmation and future onboarding details.`},{id:Eu,name:"Secure your Fusion program slot",subject:"Secure your Fusion {{programLocation}} Program slot",signatureHtml:mr,signatureKey:"fusion-team",builtIn:!0,body:`Hi {{firstName}},

We are excited to move forward with your invitation to the Fusion {{programLocation}} Program from {{programStartDate}} to {{programEndDate}}.

Your application has been approved, and the final step to secure your spot is submitting your deposit or full payment. Spots are first come, first served, so we recommend completing this as soon as possible.

Next steps:
1. Sign in to Fusion.
2. Visit your Settings Profile page: {{profileProgramsUrl}}
3. Open Programs, then select the Payments tab.
4. Select the accepted {{programLocation}} program.
5. Submit your deposit or full payment to secure your position.

Once your payment is submitted, our team will follow up with confirmation and onboarding details.`},{id:"tpl-default-schedule",name:"Schedule meeting",subject:"[Fusion] Program application — {{programId}}",signatureKey:"zoia",builtIn:!0,body:`Hello {{fullName}},

We would like to schedule a meeting to discuss your application for program {{programId}}.

Please select a meeting slot through the link below.
https://calendly.com/fusionart/30min`},{id:"tpl-default-confirmation",name:"Application received",subject:"[Fusion] Program application — {{programId}}",signatureKey:"zoia",builtIn:!0,body:`Hello {{fullName}},

This confirms we have received your application for program {{programId}}.

We will be in touch with next steps.`}]}function Fn(){if(typeof localStorage>"u")return[];try{const e=localStorage.getItem(ur);if(!e)return[];const s=JSON.parse(e);return Array.isArray(s)?s.filter(i=>i&&typeof i=="object"&&i.id&&i.name).map(i=>({id:String(i.id),name:String(i.name),subject:String(i.subject??""),body:String(i.body??""),signatureHtml:typeof i.signatureHtml=="string"?i.signatureHtml:void 0,builtIn:!1})):[]}catch{return[]}}function hi(e){if(!(typeof localStorage>"u"))try{localStorage.setItem(ur,JSON.stringify(e))}catch{}}function Cu(e){return String(e||"upcoming program").trim()||"upcoming program"}function Ye(...e){for(const s of e){const i=String(s??"").trim();if(i)return i}return""}function Mu(e){const s=e!=null&&e.enCard&&typeof e.enCard=="object"?e.enCard:{},i=s.programPage&&typeof s.programPage=="object"?s.programPage:{},o=String(s.location||s.place||i.location||s.headline||s.focus||"").trim(),n={...s,startDate:Ye(s.startDate,s.start,s.programStart,i.startDate),endDate:Ye(s.endDate,s.end,s.programEnd,i.endDate),year:Ye(s.year,i.year)},a=Bc(n,"en"),r=Ye(a==null?void 0:a.start,n.startDate),l=Ye(a==null?void 0:a.end,n.endDate),d=r&&l?`${r} to ${l}`:Ye(r,l,i.runDates,s.runDates,s.year);return{programLocation:o,programDate:d,programStartDate:r||d,programEndDate:l||d}}async function Oi(e,s={}){var Ht,Tt,Yt,Rt,ce,$t,Ut,ue;const{onSent:i,canClearCorrespondence:o=!1}=s,n=String((e==null?void 0:e.id)??"").trim(),a=String((e==null?void 0:e.email)??"").trim(),r=a.toLowerCase().includes("@"),l=String((e==null?void 0:e.fullName)||"there").trim()||"there",d=_u(l),p=String((e==null?void 0:e.programId)||"").trim(),u=String((e==null?void 0:e.status)||"").toLowerCase()==="accepted";let c=Cu(p),m="upcoming program date",b="upcoming program date",C="upcoming program date";try{const ut=(await We()||[]).find(St=>String((St==null?void 0:St.id)||"")===p);if(ut){const St=Mu(ut);c=St.programLocation||c,m=St.programDate||m,b=St.programStartDate||b,C=St.programEndDate||C}}catch{}const w={firstName:d,fullName:l,programId:p,programLocation:c,programDate:m,programStartDate:b,programEndDate:C,profileProgramsUrl:$u(),email:a},L="Email applicant",A=Array.isArray(e==null?void 0:e.emailOutreach)?e.emailOutreach:[],g=`
<div class="studio-applicant-email-composer">
  <div class="studio-applicant-email-composer__layout" role="group" aria-label="Applicant email composer">
    <aside class="studio-applicant-email-composer__rail" aria-label="Applicant and templates">
      <section class="studio-applicant-email-composer__card studio-applicant-email-composer__applicant-card">
        <p class="studio-applicant-email-composer__eyebrow">Applicant</p>
        <h3>${me(l)}</h3>
        <p class="studio-individual-email__to">To: ${r?me(a):"No email on file"}</p>
        <dl class="studio-applicant-email-composer__meta">
          <div><dt>Program</dt><dd>${me(c)}</dd></div>
          <div><dt>Date</dt><dd>${me(m)}</dd></div>
          <div><dt>Status</dt><dd>${me(String((e==null?void 0:e.status)||"pending"))}</dd></div>
        </dl>
      </section>
      <section class="studio-applicant-email-composer__card studio-applicant-email-composer__outreach-card">
        <div class="studio-applicant-email-composer__outreach-head">
          <p class="studio-applicant-email-composer__eyebrow">Correspondence</p>
          <button type="button" class="studio-btn-ghost" id="studio-ae-clear-correspondence" hidden>Clear correspondence</button>
        </div>
        <div id="studio-ae-outreach-list">${Un(A)}</div>
      </section>
      <section class="studio-applicant-email-composer__card">
        <p class="studio-applicant-email-composer__eyebrow">Built-in templates</p>
        <label class="studio-field studio-applicant-email-composer__field">
          <span>Choose template</span>
          <select class="studio-select" id="studio-ae-template-builtin"></select>
        </label>
        <div class="studio-applicant-email-composer__button-grid">
          <button type="button" class="studio-btn-secondary" id="studio-ae-tpl-builtin-apply">Apply</button>
        </div>
      </section>
      <section class="studio-applicant-email-composer__card">
        <p class="studio-applicant-email-composer__eyebrow">Custom templates</p>
        <label class="studio-field studio-applicant-email-composer__field">
          <span>Choose template</span>
          <select class="studio-select" id="studio-ae-template-custom"></select>
        </label>
        <div class="studio-applicant-email-composer__button-grid">
          <button type="button" class="studio-btn-secondary" id="studio-ae-tpl-custom-apply">Apply</button>
          <button type="button" class="studio-btn-ghost" id="studio-ae-tpl-new">New</button>
          <button type="button" class="studio-btn-ghost" id="studio-ae-tpl-update">Update</button>
          <button type="button" class="studio-btn-ghost" id="studio-ae-tpl-delete">Delete</button>
        </div>
        <p class="studio-applicant-email-composer__hint">Custom templates are saved in this browser.</p>
      </section>
      <section class="studio-applicant-email-composer__card">
        <p class="studio-applicant-email-composer__eyebrow">Applicant Draft</p>
        <div class="studio-applicant-email-composer__button-grid">
          <button type="button" class="studio-btn-ghost" id="studio-ae-load-draft">Load</button>
          <button type="button" class="studio-btn-secondary" id="studio-ae-save-draft">Save</button>
          <button type="button" class="studio-btn-ghost" id="studio-ae-delete-draft" disabled>Delete</button>
        </div>
      </section>
    </aside>
    <section class="studio-applicant-email-composer__editor" aria-label="Message editor">
      <div class="studio-applicant-email-composer__editor-head">
        <p class="studio-applicant-email-composer__eyebrow">Email</p>
        <h3>Message</h3>
      </div>
      <label class="studio-field studio-applicant-email-composer__field">
        <span>Subject</span>
        <input type="text" class="studio-input" id="studio-ae-subject" maxlength="998" placeholder="Email subject" />
      </label>
      <label class="studio-field studio-applicant-email-composer__field studio-applicant-email-composer__message-field">
        <span>Message <em>plain text, line breaks kept</em></span>
        <textarea class="studio-textarea studio-individual-email__body" id="studio-ae-body" rows="16" spellcheck="true" placeholder="Write your message…"></textarea>
      </label>
      <div class="studio-applicant-email-composer__quick-draft">
        <label class="studio-field studio-applicant-email-composer__field">
          <span>Quick draft tone</span>
          <select class="studio-select" id="studio-ae-tone">
            <option value="Professional and warm">Professional and warm</option>
            <option value="Short and direct">Short and direct</option>
            <option value="Friendly and encouraging">Friendly and encouraging</option>
            <option value="Formal">Formal</option>
          </select>
        </label>
        <button type="button" class="studio-btn-secondary" id="studio-ae-llm">Quick draft</button>
      </div>
    </section>
    <aside class="studio-applicant-email-composer__review" aria-label="Review and send">
      <section class="studio-applicant-email-composer__card studio-applicant-email-composer__send-card">
        <p class="studio-applicant-email-composer__eyebrow">Review</p>
        <p class="studio-applicant-email-composer__hint">Sending uses the Integration API and Resend path.</p>
        <label class="studio-field studio-applicant-email-composer__field">
          <span>Send test to</span>
          <input type="email" class="studio-input" id="studio-ae-test-to" placeholder="you@org.com" autocomplete="email" />
        </label>
        <button type="button" class="studio-btn-secondary" id="studio-ae-test">Send test</button>
      </section>
      <section class="studio-applicant-email-composer__card studio-applicant-email-composer__signature-card">
        <div class="studio-applicant-email-composer__card-head">
          <p class="studio-applicant-email-composer__eyebrow">Signature</p>
          <button type="button" class="studio-btn-ghost" id="studio-ae-sig-toggle" aria-expanded="false">Edit</button>
        </div>
        <label class="studio-field studio-applicant-email-composer__field">
          <span>Signature preset</span>
          <select class="studio-select" id="studio-ae-signature-choice">
            ${bi.map(it=>`<option value="${me(it.id)}">${me(it.label)}</option>`).join("")}
            <option value="custom">Custom</option>
          </select>
        </label>
        <div id="studio-ae-sig-preview" class="studio-send-blast-sig-preview" aria-hidden="false"></div>
        <div id="studio-ae-sig-editor" class="studio-send-blast-sig-editor" hidden>
          <label class="studio-field studio-applicant-email-composer__field">
            <span class="studio-muted">HTML appended after message</span>
            <textarea class="studio-textarea" id="studio-ae-sig" rows="6" spellcheck="false"></textarea>
          </label>
          <button type="button" class="studio-btn-secondary" id="studio-ae-sig-done">Done editing</button>
        </div>
      </section>
    </aside>
  </div>
  <div class="studio-applicant-email-composer__dock">
    <p id="studio-ae-status" class="studio-send-blast-foot-status" role="status" aria-live="polite"></p>
    <div class="studio-applicant-email-composer__dock-actions">
      <button type="button" class="studio-btn-primary" id="studio-ae-send" disabled>Send now</button>
      <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Close</button>
    </div>
  </div>
</div>`,{root:f}=qt(g,{title:L,wide:!0}),v=f.querySelector("#studio-ae-subject"),E=f.querySelector("#studio-ae-body"),j=f.querySelector("#studio-ae-test-to"),M=f.querySelector("#studio-ae-status"),S=f.querySelector("#studio-ae-send"),h=f.querySelector("#studio-ae-sig"),T=f.querySelector("#studio-ae-sig-preview"),N=f.querySelector("#studio-ae-sig-editor"),O=f.querySelector("#studio-ae-sig-toggle"),G=f.querySelector("#studio-ae-sig-done"),V=f.querySelector("#studio-ae-signature-choice"),at=f.querySelector("#studio-ae-save-draft"),tt=f.querySelector("#studio-ae-load-draft"),z=f.querySelector("#studio-ae-delete-draft"),F=f.querySelector("#studio-ae-template-builtin"),I=f.querySelector("#studio-ae-template-custom"),y=f.querySelector("#studio-ae-outreach-list"),_=f.querySelector("#studio-ae-clear-correspondence");h instanceof HTMLTextAreaElement&&(h.value=Oe);let $=h instanceof HTMLTextAreaElement?h.value:Oe,H=null,R=[...A],x=!1;const q=it=>{if(!(V instanceof HTMLSelectElement))return;const ut=String(it||"").trim();V.value=bi.some(St=>St.id===ut)?ut:"custom"},X=it=>{const ut=bi.find(St=>St.id===it);!ut||!(h instanceof HTMLTextAreaElement)||(h.value=ut.html,$=h.value,q(ut.id),k())},ot=it=>{M&&(M.textContent=it||"")},gt=(it,ut,St)=>{if(!(it instanceof HTMLSelectElement))return;const jt=document.createDocumentFragment(),Pt=document.createElement("option");Pt.value="",Pt.textContent="— Select template —",jt.appendChild(Pt);for(const Vt of ut){const Qt=document.createElement("option");Qt.value=Vt.id,Qt.textContent=Vt.name,jt.appendChild(Qt)}it.replaceChildren(jt),St&&ut.some(Vt=>Vt.id===St)&&(it.value=St)},Lt=new Set($s().map(it=>it.id));let bt=Fn().filter(it=>!Lt.has(it.id));const wt=$s();let _t=[...wt,...bt];const At=u?pr:((Ht=wt[0])==null?void 0:Ht.id)||"",nt=(it="",ut="")=>{bt=Fn().filter(St=>!Lt.has(St.id)),_t=[...$s(),...bt],gt(F,$s(),it),gt(I,bt,ut)};nt(At,"");const dt=()=>{const it=I instanceof HTMLSelectElement?I.value.trim():"",ut=F instanceof HTMLSelectElement?F.value.trim():"",St=it||ut;return St&&_t.find(jt=>jt.id===St)||null},yt=it=>{it==="builtin"&&I instanceof HTMLSelectElement&&(I.value=""),it==="custom"&&F instanceof HTMLSelectElement&&(F.value="")},K=()=>{y instanceof HTMLElement&&(y.innerHTML=Un(R,{unavailable:x})),et()},et=()=>{if(!(_ instanceof HTMLButtonElement))return;const it=o&&!x&&R.length>0;_.hidden=!it},Y=async()=>{if(n){if(x=Ct()==="live"&&!await tl(),x){K();return}try{R=await el(n),K()}catch{K()}}},st=(it,ut="Template applied.")=>{if(!it){ot("Select a template first.");return}H={id:it.id,name:it.name},v instanceof HTMLInputElement&&(v.value=yi(it.subject,w)),E instanceof HTMLTextAreaElement&&(E.value=yi(it.body,w)),h instanceof HTMLTextAreaElement&&(typeof it.signatureHtml=="string"?(h.value=yi(it.signatureHtml,w),$=h.value,q(it.signatureKey||"custom"),k()):it.signatureKey?X(it.signatureKey):it.builtIn&&(h.value=Oe,$=h.value,q("zoia"),k())),ot(ut)},B=()=>{if(typeof localStorage>"u"||!n)return null;try{const it=localStorage.getItem(gi(n));if(!it)return null;const ut=JSON.parse(it);return!ut||typeof ut!="object"?null:ut}catch{return null}},P=()=>{const it=E instanceof HTMLTextAreaElement?E.value:"",ut=ku(it),jt=(h instanceof HTMLTextAreaElement?h.value:"").trim(),Pt=jt?`${ut}<div style="margin:36px 0 0;padding:40px 0 0;border-top:1px solid #e5e2df">${jt}</div>`:ut;return cr(Pt,{includeSignature:!1})},k=()=>{if(!(T instanceof HTMLElement))return;const it=h instanceof HTMLTextAreaElement?h.value:"";T.innerHTML=it.trim()||'<p class="studio-muted">(empty signature)</p>'},J=it=>{N instanceof HTMLElement&&(N.hidden=!it),T instanceof HTMLElement&&(T.hidden=it),O instanceof HTMLButtonElement&&(O.setAttribute("aria-expanded",it?"true":"false"),O.textContent=it?"Cancel":"Edit signature"),T instanceof HTMLElement&&T.setAttribute("aria-hidden",it?"true":"false"),it&&h instanceof HTMLTextAreaElement&&queueMicrotask(()=>h.focus())},W=()=>{const it=!!B();z instanceof HTMLButtonElement&&(z.disabled=!it)},Z=(it,ut)=>{it&&(ut?(it.setAttribute("aria-busy","true"),it.disabled=!0):(it.setAttribute("aria-busy","false"),it.disabled=!1))},ct=(it,ut)=>{it&&(it.classList.add("studio-btn--async-ok"),ut&&(it.textContent=ut),window.setTimeout(()=>{it.classList.remove("studio-btn--async-ok")},1600))},pt=()=>{if(S instanceof HTMLButtonElement){if(Ct()!=="live"){S.disabled=!0,S.title="Switch to live data to send.";return}if(!ee()){S.disabled=!0,S.title="Set Integration API URL under Services.";return}if(!r){S.disabled=!0,S.title="Applicant has no valid email.";return}S.disabled=!1,S.title=""}};k();const ft=wt.find(it=>it.id===At)||wt[0]||null;ft&&st(ft,""),pt(),W(),K(),Y(),_==null||_.addEventListener("click",async()=>{if(!o||!n||R.length===0)return;const it=l||a||n;if(window.confirm(`Clear all logged outreach emails for ${it}? This cannot be undone.`)){_ instanceof HTMLButtonElement&&(_.disabled=!0);try{await Xr(n),R=[],K(),ot("Correspondence cleared."),i&&await i()}catch(ut){alert(ut instanceof Error?ut.message:String(ut)),et(),_ instanceof HTMLButtonElement&&(_.disabled=!1)}}}),F==null||F.addEventListener("change",()=>{F instanceof HTMLSelectElement&&F.value&&yt("builtin")}),I==null||I.addEventListener("change",()=>{I instanceof HTMLSelectElement&&I.value&&yt("custom")}),(Tt=f.querySelector("#studio-ae-tpl-builtin-apply"))==null||Tt.addEventListener("click",()=>{const it=dt();it!=null&&it.builtIn?st(it):ot("Select a built-in template first.")}),(Yt=f.querySelector("#studio-ae-tpl-custom-apply"))==null||Yt.addEventListener("click",()=>{const it=dt();it&&!it.builtIn?st(it):ot("Select a custom template first.")}),(Rt=f.querySelector("#studio-ae-tpl-new"))==null||Rt.addEventListener("click",()=>{const it=window.prompt("Template name?");if(!it||!String(it).trim())return;const ut=v instanceof HTMLInputElement?v.value:"",St=E instanceof HTMLTextAreaElement?E.value:"",jt=`tpl-${Date.now()}`;bt=[...bt,{id:jt,name:String(it).trim(),subject:ut,body:St,builtIn:!1}],hi(bt),nt("",jt),I instanceof HTMLSelectElement&&(I.value=jt),yt("custom"),ot("Template created.")}),(ce=f.querySelector("#studio-ae-tpl-update"))==null||ce.addEventListener("click",()=>{const it=dt();if(!it){ot("Select a template to update.");return}if(it.builtIn){ot("Built-in templates cannot be updated. Create a custom template instead.");return}const ut=v instanceof HTMLInputElement?v.value:"",St=E instanceof HTMLTextAreaElement?E.value:"";bt=bt.map(jt=>jt.id===it.id?{...jt,subject:ut,body:St}:jt),hi(bt),nt("",it.id),ot("Template updated.")}),($t=f.querySelector("#studio-ae-tpl-delete"))==null||$t.addEventListener("click",()=>{const it=dt();if(!it){ot("Select a template to delete.");return}if(it.builtIn){ot("Built-in templates cannot be deleted.");return}if(!window.confirm(`Delete template “${it.name}”?`))return;const ut=it.id;bt=bt.filter(St=>St.id!==ut),hi(bt),nt("",""),ot("Template deleted.")}),O==null||O.addEventListener("click",()=>{N instanceof HTMLElement&&!N.hidden?(h instanceof HTMLTextAreaElement&&(h.value=$),k(),J(!1)):($=h instanceof HTMLTextAreaElement?h.value:$,J(!0))}),G==null||G.addEventListener("click",()=>{h instanceof HTMLTextAreaElement&&($=h.value,q("custom")),k(),J(!1)}),V==null||V.addEventListener("change",()=>{V instanceof HTMLSelectElement&&V.value!=="custom"&&X(V.value)}),at==null||at.addEventListener("click",()=>{if(typeof localStorage>"u"||!n)return;const it={subject:v instanceof HTMLInputElement?v.value:"",message:E instanceof HTMLTextAreaElement?E.value:"",signatureHtml:h instanceof HTMLTextAreaElement?h.value:"",savedAt:new Date().toISOString()};try{localStorage.setItem(gi(n),JSON.stringify(it)),ot("Draft saved locally."),W()}catch(ut){ot(ut instanceof Error?ut.message:String(ut))}}),tt==null||tt.addEventListener("click",()=>{const it=B();if(!it){ot("No saved draft for this applicant.");return}if(v instanceof HTMLInputElement&&(v.value=String(it.subject??"")),E instanceof HTMLTextAreaElement&&(E.value=String(it.message??"")),h instanceof HTMLTextAreaElement){const ut=String(it.signatureHtml??"");h.value=ut||Oe,$=h.value,q("custom")}k(),ot("Loaded draft from this browser."),W()}),z==null||z.addEventListener("click",()=>{typeof localStorage>"u"||!n||B()&&(localStorage.removeItem(gi(n)),v instanceof HTMLInputElement&&(v.value=""),E instanceof HTMLTextAreaElement&&(E.value=""),h instanceof HTMLTextAreaElement&&(h.value=Oe,$=h.value,q("zoia")),k(),ot("Draft deleted."),W())});const It="Quick draft";(Ut=f.querySelector("#studio-ae-llm"))==null||Ut.addEventListener("click",async()=>{var Vt;if(!(E instanceof HTMLTextAreaElement))return;const it=f.querySelector("#studio-ae-llm"),ut=(f.querySelector("#studio-ae-tone")instanceof HTMLSelectElement?(Vt=f.querySelector("#studio-ae-tone"))==null?void 0:Vt.value:"")||"Professional and warm",St=E.value,jt=`Quick draft for a single staff email to a program applicant. Tone: ${ut}. Output plain text only — no HTML, no markdown, no code fences. Use line breaks between paragraphs.`;if(jt.length+St.length>Rn){alert(`Prompt + body exceeds ${Rn} characters. Shorten the message.`);return}it instanceof HTMLButtonElement&&Z(it,!0),ot("Quick draft: working…");let Pt=!1;try{const Qt=await re(jt,St,"en");E.value=Qt.trim(),Pt=!0,ot("Quick draft: message updated below.")}catch(Qt){alert(Qt instanceof Error?Qt.message:String(Qt)),ot("")}finally{it instanceof HTMLButtonElement&&(Z(it,!1),Pt&&(ct(it,"Done"),window.setTimeout(()=>{it.textContent==="Done"&&It&&(it.textContent=It)},1600)))}});const Ft="Send test";(ue=f.querySelector("#studio-ae-test"))==null||ue.addEventListener("click",async()=>{const it=f.querySelector("#studio-ae-test"),ut=j instanceof HTMLInputElement?j.value.trim():"";if(!ut.includes("@")){alert("Enter a valid test recipient email.");return}const St=v instanceof HTMLInputElement?v.value.trim():"";if(!St){alert("Subject is required.");return}it instanceof HTMLButtonElement&&Z(it,!0),ot("Test email: sending…");let jt=!1;try{await He({to:ut,subject:St,html:P()}),jt=!0,ot(`Test email: sent to ${ut}.`)}catch(Pt){alert(Pt instanceof Error?Pt.message:String(Pt)),ot("")}finally{it instanceof HTMLButtonElement&&(Z(it,!1),jt&&(ct(it,"Sent"),window.setTimeout(()=>{it.textContent==="Sent"&&Ft&&(it.textContent=Ft)},1600)))}}),S==null||S.addEventListener("click",async()=>{if(!(S instanceof HTMLButtonElement)||!v||!E)return;if(Ct()!=="live"){alert("Use Live data to send.");return}if(!ee()){alert("Integration API URL is not configured (Studio → Services).");return}if(!r){alert("This applicant has no valid email.");return}const it=v instanceof HTMLInputElement?v.value.trim():"";if(!it){alert("Subject is required.");return}S.disabled=!0,ot("Sending…");try{await He({to:a,subject:it,html:P()});const ut=H||dt();await Zr(n,{subject:it,templateId:(ut==null?void 0:ut.id)||"",templateName:(ut==null?void 0:ut.name)||"Manual"}),R=[...R,{sentAt:new Date().toISOString(),subject:it,templateId:(ut==null?void 0:ut.id)||"",templateName:(ut==null?void 0:ut.name)||"Manual"}],K(),ot(`Sent to ${a}.`),i&&await i()}catch(ut){alert(ut instanceof Error?ut.message:String(ut)),ot("")}finally{pt()}})}const Dn="studio-finance-overview-chips-v1",vi="studio-finance-selected-program-v1";function Bn(e,s={}){const{internalNotes:i}=qi(e);return{internalNotes:i||"",manualDepositSubmitted:Pi(e),applicantCategory:Rs(e),isTester:Us(e),flightCostCents:Ni(e),localTravelCostCents:Ri(e),...s}}const Ys=[{id:"overview",label:"Overview",tab:"overview",chip:"",icon:"group-overview",modifier:"overview"},{id:"programs",label:"Programs",tab:"programs",chip:"programs",icon:"nav-programs",modifier:"programs",category:"Programs"},{id:"users",label:"Users",tab:"users",chip:"users",icon:"nav-subscribers",modifier:"users",category:"Users"},{id:"products",label:"Products",tab:"products",chip:"products",icon:"nav-products",modifier:"products",category:"Products"},{id:"promotions",label:"Promotions",tab:"promotions",chip:"promotions",icon:"nav-email",modifier:"promotions",category:"Promotions"}];function vt(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function xu(e){const s=xc(e);return s?` style="--mpd-icon-url: url('${vt(s)}')"`:""}function Qs(e){return e.tab==="overview"?Jt("finance").visible:e.category?Ee(e.category).visible:!1}function Iu(){const e=Ys.filter(Qs).map(o=>{const n=xu(o.icon),a=o.tab==="overview"?" is-active":"";return`<button type="button" class="mpd-program-tab mpd-program-tab--${o.modifier}${a}" role="tab" id="studio-finance-tab-${o.id}" aria-selected="${o.tab==="overview"?"true":"false"}" tabindex="${o.tab==="overview"?"0":"-1"}" aria-controls="studio-finance-panel-${o.id}" data-finance-tab="${vt(o.tab)}">
                <span class="mpd-program-tab__icon"${n} aria-hidden="true"></span>
                <span>${vt(o.label)}</span>
            </button>`}).join(""),i=Ys.filter(o=>o.chip&&Qs(o)).map(o=>`<button type="button" class="mpd-payments-pill is-active" data-finance-chip="${vt(o.chip)}" aria-pressed="true">${vt(o.label)}</button>`).join("");return`
        <div class="studio-section-stack studio-category-page studio-finance-page">
            <div class="studio-finance-intro">
                <h2 class="studio-finance-intro__title">Finance</h2>
                <p class="studio-muted studio-finance-intro__hint">Revenue and payment health across programs, membership, products, and promotions. Use Overview for a cross-category summary; open a tab for detail.</p>
            </div>
            <p id="studio-finance-status" class="member-profile-dashboard__status-line" role="status" aria-live="polite"></p>
            <div id="studio-finance-loading" class="mpd-initial-loading" role="status" aria-live="polite">
                <div class="mpd-initial-loading__spinner" aria-hidden="true"></div>
                <p>Loading finance data…</p>
            </div>
            <div id="studio-finance-empty" class="studio-banner studio-banner--warn" hidden>No finance category permissions are enabled for your role. Ask an admin to grant Finance sub-keys under Permissions.</div>
            <div id="studio-finance-workspace" hidden>
                <div class="studio-finance-domain-tabs">
                    <div class="mpd-program-tabs" role="tablist" aria-label="Finance sections">${e}</div>
                </div>
                <div class="mpd-program-tab-panel" id="studio-finance-panel-overview" role="tabpanel" aria-labelledby="studio-finance-tab-overview" data-finance-panel="overview">
                    <section class="member-profile-dashboard__card studio-finance-overview-card">
                        <h2>Overview</h2>
                        <p class="studio-muted">Summary metrics for categories you include below. This does not change your permissions.</p>
                        ${i?`<div class="studio-finance-chip-field">
                            <span>Include in overview</span>
                            <div class="mpd-payments-pill-rail" role="group" aria-label="Include in overview">${i}</div>
                            <p id="studio-finance-chip-hint" class="studio-muted mpd-field-hint" hidden>At least one category must stay included.</p>
                        </div>
                        <div id="studio-finance-overview-sections" aria-live="polite"></div>`:'<p class="studio-muted">No category scopes available for overview toggles.</p>'}
                    </section>
                </div>
                <div class="mpd-program-tab-panel" id="studio-finance-panel-programs" role="tabpanel" aria-labelledby="studio-finance-tab-programs" data-finance-panel="programs" hidden>
                    <div class="studio-finance-programs-panel">
                        <div id="studio-finance-program-revenue-stat" class="studio-finance-program-revenue-stat" aria-live="polite"></div>
                        <div class="studio-finance-program-cards-rail studio-finance-program-cards-rail--unified" id="studio-finance-program-cards-unified" role="list" aria-label="Programs"></div>
                        <div id="studio-finance-program-table-wrap" class="studio-finance-program-table-wrap" aria-live="polite"></div>
                    </div>
                </div>
                <div class="mpd-program-tab-panel" id="studio-finance-panel-users" role="tabpanel" aria-labelledby="studio-finance-tab-users" data-finance-panel="users" hidden>
                    <div id="studio-finance-users-revenue-stat" aria-live="polite"></div>
                    <div id="studio-finance-users-summary"></div>
                    <section class="member-profile-dashboard__card" style="margin-top:0.75rem">
                        <div class="mpd-payments-section-head">
                            <h3>Membership accounts</h3>
                            <span class="studio-muted">Join / Fusion subscription on canister</span>
                        </div>
                        <div class="studio-finance-filter-bar">
                            <label class="studio-field">
                                <span>Membership</span>
                                <select id="studio-finance-users-membership" class="studio-select">
                                    <option value="">All</option>
                                    <option value="active">Active</option>
                                    <option value="trialing">Trialing</option>
                                    <option value="past_due">Past due</option>
                                    <option value="canceled">Canceled</option>
                                    <option value="exempt">Exempt (manual)</option>
                                    <option value="none">No subscription</option>
                                </select>
                            </label>
                            <label class="studio-field studio-field--grow">
                                <span>Search</span>
                                <input type="search" id="studio-finance-users-search" class="studio-input" placeholder="Name or email…" autocomplete="off" />
                            </label>
                        </div>
                        <div class="studio-table-wrap studio-table-wrap--sticky-head">
                            <table class="studio-table studio-table--dense">
                                <thead>
                                    <tr>
                                        <th>Status</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Membership</th>
                                        <th>Renews</th>
                                        <th>Stripe</th>
                                        <th>Principal</th>
                                    </tr>
                                </thead>
                                <tbody id="studio-finance-users-tbody"><tr><td colspan="7">Loading…</td></tr></tbody>
                            </table>
                        </div>
                    </section>
                </div>
                <div class="mpd-program-tab-panel" id="studio-finance-panel-products" role="tabpanel" aria-labelledby="studio-finance-tab-products" data-finance-panel="products" hidden>
                    ${On("Products","Edition and object sales reporting will appear when checkout is wired to Stripe.",["Revenue by edition / product","Refunds and partial payments","Links to public edition catalog IDs"])}
                </div>
                <div class="mpd-program-tab-panel" id="studio-finance-panel-promotions" role="tabpanel" aria-labelledby="studio-finance-tab-promotions" data-finance-panel="promotions" hidden>
                    ${On("Promotions","Advertising and promotional spend tracking is planned for a later release.",["Campaign budgets and spend","Attribution to programs or products","Coupon / promo code redemption (optional)"])}
                </div>
            </div>
        </div>
    `}function On(e,s,i){const o=i.map(n=>`<li>${vt(n)}</li>`).join("");return`
        <section class="member-profile-dashboard__card">
            <h2>${vt(e)}</h2>
            <p class="studio-muted">${vt(s)}</p>
            <div class="studio-finance-coming-soon">
                <h4>Coming soon</h4>
                <ul class="studio-muted" style="margin:0;padding-left:1.1rem;line-height:1.5">${o}</ul>
            </div>
        </section>
    `}function ju(e){const s=String(e||"").trim();return s==="completed"?{section:"past",badge:"Completed",badgeKey:"completed"}:s==="comingUp"?{section:"upcoming",badge:"Upcoming",badgeKey:"upcoming"}:s==="active"||s==="open"||s==="full"?{section:"active",badge:"Active",badgeKey:"active"}:{section:"upcoming",badge:"Upcoming",badgeKey:"upcoming"}}function Qe(e){const s=String(e||"").trim().replace(/[^0-9.]/g,"");return s?Math.max(0,Math.round(Number(s)*100)):0}function Hu(e,s,i){return Pc(e,s,i)}function qu(e,s,i){var a,r;const o=ju(e.studioStatus),n=Hu(e,s,i);return{id:String(e.id||""),title:ja(e),imageSrc:il((a=e.jaCard)==null?void 0:a.imageSrc,(r=e.enCard)==null?void 0:r.imageSrc),...o,...n}}function Pu(e,s){const i=Number((e.enCard&&typeof e.enCard=="object"?e.enCard.year:void 0)??0),o=Number((s.enCard&&typeof s.enCard=="object"?s.enCard.year:void 0)??0);return o!==i?o-i:String(e.id||"").localeCompare(String(s.id||""))}function Nu(e,s){let i="No confirmed slots yet";if(e.filledSlots>0){const n=[`${e.filledSlots} slot${e.filledSlots===1?"":"s"}`];e.veteranSlotCount>0&&n.push(`${e.veteranSlotCount} veteran (−${zt(qc)} ea)`),e.avgPerSlotCents>0?n.push(`avg ${zt(e.avgPerSlotCents)}/slot`):n.push("category-adjusted"),i=n.join(" · ")}const o=e.imageSrc?`<img class="studio-finance-program-card__img" src="${vt(e.imageSrc)}" alt="" loading="lazy" />`:'<div class="studio-finance-program-card__placeholder" aria-hidden="true">Fusion</div>';return`<button type="button" class="studio-finance-program-card${s?" is-selected":""}" role="listitem" data-finance-program-id="${vt(e.id)}" aria-pressed="${s?"true":"false"}">
        <div class="studio-finance-program-card__media">${o}</div>
        <div class="studio-finance-program-card__body">
            <div class="studio-finance-program-card__head">
                <h4 class="studio-finance-program-card__title">${vt(e.title)}</h4>
                <span class="studio-finance-program-card__status studio-finance-program-card__status--${vt(e.badgeKey)}">${vt(e.badge)}</span>
            </div>
            <p class="studio-finance-program-card__revenue"><span>Expected revenue</span><strong>${vt(zt(e.expectedCents))}</strong></p>
            <p class="studio-finance-program-card__slots">${vt(i)}</p>
        </div>
    </button>`}function Ru(e){const s=`${Ha(e.category,vt)} <span class="studio-finance-price-amount">${vt(zt(e.priceCategoryCents))}</span>`,i=e.depositPaid?`<span class="mpd-payments-pill mpd-payments-pill--paid">Paid</span> <span class="studio-finance-price-amount">${vt(zt(e.depositAmountCents))}</span>`:'<span class="studio-muted">—</span>',o=e.planActive?'<span class="mpd-payments-pill mpd-payments-pill--active">Active</span>':'<span class="studio-muted">—</span>',n=e.planPriceCents>0?zt(e.planPriceCents):"—",a=e.ownFlight?'<span class="mpd-payments-pill mpd-payments-pill--muted">Own Flight</span>':"",r=(l,d,p="")=>`<button type="button" class="studio-finance-money-btn" data-finance-ledger-open="1" data-applicant-id="${vt(e.applicantId)}" data-finance-ledger-mode="${l}">${vt(zt(d))}</button>${p}`;return`<tr data-finance-applicant-id="${vt(e.applicantId)}">
        <td class="studio-finance-sticky-col studio-finance-sticky-col--first">${vt(e.firstName||"—")}</td>
        <td class="studio-finance-sticky-col studio-finance-sticky-col--second">${vt(e.lastName||"—")}</td>
        <td>${vt(e.discipline||"—")}</td>
        <td class="studio-finance-price-category">${s}</td>
        <td class="studio-finance-price-category">${i}</td>
        <td>${o}</td>
        <td>${vt(n)}</td>
        <td>${r("payments",e.totalPaymentsCents)}</td>
        <td>${r("fees",e.paymentFeesCents)}</td>
        <td class="studio-finance-tickets-cell">${r("tickets",e.ticketsCents,a?` ${a}`:"")}</td>
        <td>${r("travel",e.localTravelCents)}</td>
        <td>${vt(zt(e.partner1Cents))}</td>
        <td>${vt(zt(e.partner2Cents))}</td>
        <td>${vt(zt(e.partner3Cents))}</td>
        <td>${vt(zt(e.subtotalCents))}</td>
        <td>${vt(zt(e.remainingBalanceCents))}</td>
        <td>${vt(zt(e.profitCents))}</td>
        <td><button type="button" class="studio-btn-ghost studio-finance-email-btn" data-finance-email-applicant="${vt(e.applicantId)}">Email</button></td>
    </tr>`}const Uu=18;function Fu(e,s,i){let o="All active programs — slot-secured applicants";if(s){const a=i.get(s);o=a?`Filtered: ${a.title}`:"Filtered to one program"}const n=e.length>0?e.map(a=>Ru(a)).join(""):`<tr><td colspan="${Uu}">${s?"No slot-secured applicants for this program.":"No slot-secured applicants on active programs."}</td></tr>`;return`
        <section class="member-profile-dashboard__card studio-finance-program-table-section">
            <div class="mpd-payments-section-head">
                <h3>Program finance</h3>
                <span class="studio-muted">${vt(o)}</span>
            </div>
            <div class="studio-table-wrap studio-table-wrap--sticky-head studio-finance-program-table-scroll">
                <table class="studio-table studio-table--dense studio-finance-program-table">
                    <thead>
                        <tr>
                            <th class="studio-finance-sticky-col studio-finance-sticky-col--first">First</th>
                            <th class="studio-finance-sticky-col studio-finance-sticky-col--second">Last</th>
                            <th>Discipline</th>
                            <th>Price category</th>
                            <th>Deposit</th>
                            <th>Plan</th>
                            <th>Plan price</th>
                            <th>Total payments</th>
                            <th>Payment fees</th>
                            <th>Tickets</th>
                            <th>Local travel</th>
                            <th>Partner 1</th>
                            <th>Partner 2</th>
                            <th>Partner 3</th>
                            <th>Subtotal</th>
                            <th>Remaining</th>
                            <th>Profit</th>
                            <th>Email</th>
                        </tr>
                    </thead>
                    <tbody>${n}</tbody>
                </table>
            </div>
        </section>
    `}function Du(e,s,i){const{currentRevenueCents:o,rowCount:n}=Rc(e);let a="All active programs";if(s){const r=i.get(s);a=r?r.title:"Selected program"}return`
        <section class="member-profile-dashboard__card studio-finance-revenue-stat-card">
            <div class="mpd-payments-overview-grid studio-finance-revenue-stat-grid">
                <div class="mpd-payments-overview-card">
                    <span>Current revenue</span>
                    <strong>${vt(zt(o))}</strong>
                    <small>${vt(a)} · ${n} slot${n===1?"":"s"}</small>
                </div>
            </div>
        </section>`}async function Bu(e){const s=e.querySelector("#studio-finance-status"),i=e.querySelector("#studio-finance-loading"),o=e.querySelector("#studio-finance-empty"),n=e.querySelector("#studio-finance-workspace"),a=e.querySelector("#studio-finance-overview-sections"),r=e.querySelector("#studio-finance-users-summary"),l=e.querySelector("#studio-finance-users-revenue-stat"),d=e.querySelector("#studio-finance-users-tbody"),p=e.querySelector("#studio-finance-users-membership"),u=e.querySelector("#studio-finance-users-search"),c=e.querySelector("#studio-finance-chip-hint"),m=e.querySelector("#studio-finance-program-revenue-stat"),b=e.querySelector("#studio-finance-program-cards-unified"),C=e.querySelector("#studio-finance-program-table-wrap"),w=B=>{s&&(s.textContent=B||"")},L=B=>{i&&(i.hidden=!B,i.setAttribute("aria-hidden",B?"false":"true"))},A=Ys.filter(Qs),g=Xc(),f=A.filter(B=>B.tab!=="overview");if(!Jt("finance").visible){L(!1),o&&(o.hidden=!1),n&&(n.hidden=!0);return}L(!0),o&&(o.hidden=!0),n&&(n.hidden=!0);let v=[],E=[],j=[],M=new Map,S=new Map,h=null,T=mi({}),N=new Map,O=new Map;const G=Ee("Programs").canEdit;let V=new Map,at={ok:!1},z=(()=>{const B=Ys.filter(P=>P.chip&&Qs(P)).map(P=>P.chip);try{const P=sessionStorage.getItem(Dn);if(!P)return new Set(B);const k=JSON.parse(P);if(!Array.isArray(k))return new Set(B);const J=new Set(B),W=k.filter(Z=>J.has(String(Z)));return W.length?new Set(W):new Set(B)}catch{return new Set(B)}})();const F=()=>{try{sessionStorage.setItem(Dn,JSON.stringify([...z]))}catch{}},I=()=>{e.querySelectorAll("[data-finance-chip]").forEach(B=>{const P=B.getAttribute("data-finance-chip")||"",k=z.has(P);B.classList.toggle("is-active",k),B.setAttribute("aria-pressed",k?"true":"false")})},y=B=>{const P=String(B||"overview");e.querySelectorAll("[data-finance-tab]").forEach(k=>{const J=k.getAttribute("data-finance-tab")===P;k.classList.toggle("is-active",J),k.setAttribute("aria-selected",J?"true":"false"),k.setAttribute("tabindex",J?"0":"-1")}),e.querySelectorAll("[data-finance-panel]").forEach(k=>{k.getAttribute("data-finance-panel")===P?k.removeAttribute("hidden"):k.setAttribute("hidden","")})},_=()=>f.length===1?f[0].tab:"overview",$=(B,P,k)=>`
        <div class="mpd-payments-overview-card">
            <span>${vt(B)}</span>
            <strong>${vt(String(P))}</strong>
            <small>${vt(k)}</small>
        </div>
    `,H=(B,P)=>`
        <div class="studio-finance-category-block" data-finance-category-block="${vt(B)}">
            <h3>${vt(B)}</h3>
            <p class="studio-muted">${vt(P)}</p>
            <div class="studio-finance-coming-soon">
                <h4>Coming soon</h4>
                <p class="studio-muted" style="margin:0">Reporting for this category is not available yet.</p>
            </div>
        </div>
    `,R=()=>{if(!a)return;const B=[],P=jn(v);z.has("programs")&&Ee("Programs").visible&&B.push(H("Programs","Residency deposits, plans, and balances (staff list API pending).")),z.has("users")&&Ee("Users").visible&&B.push(`
                <div class="studio-finance-category-block" data-finance-category-block="Users">
                    <h3>Users — membership</h3>
                    <p class="studio-muted">Fusion / Join subscription status on the canister.</p>
                    ${Hn(at,vt,{compact:!0})}
                    <div class="mpd-payments-overview-grid">
                        ${$("Active",P.active,"Active or trialing")}
                        ${$("Past due",P.pastDue,"Needs billing attention")}
                        ${$("Exempt",P.exempt,"Manual complimentary")}
                        ${$("No subscription",P.none,"No Stripe status")}
                    </div>
                </div>
            `),z.has("products")&&Ee("Products").visible&&B.push(H("Products","Edition checkout and object sales.")),z.has("promotions")&&Ee("Promotions").visible&&B.push(H("Promotions","Advertising and promotional campaigns.")),a.innerHTML=B.length>0?B.join(""):'<p class="studio-muted">Turn on at least one category above to see overview metrics.</p>'},x=()=>{l&&(l.innerHTML=Hn(at,vt))},q=()=>{if(!r)return;const B=jn(v);r.innerHTML=`
            <section class="member-profile-dashboard__card">
                <div class="mpd-payments-section-head">
                    <h3>Membership summary</h3>
                    <span class="studio-muted">${B.total} accounts on canister</span>
                </div>
                <div class="mpd-payments-overview-grid">
                    ${$("Active",B.active,"Active or trialing")}
                    ${$("Past due",B.pastDue,"Needs billing attention")}
                    ${$("Exempt",B.exempt,"Manual complimentary")}
                    ${$("No subscription",B.none,"No Stripe status")}
                </div>
            </section>
        `},X=()=>{if(!d)return;const B=p instanceof HTMLSelectElement?p.value:"",P=(u instanceof HTMLInputElement?u.value:"").trim().toLowerCase(),k=Qi(),J=v.filter(W=>{if(!De(W,B))return!1;if(!P)return!0;const Z=V.get(String(W.principal||""))||null;return`${(Z==null?void 0:Z.fullName)||""} ${(Z==null?void 0:Z.email)||""} ${W.principal||""}`.toLowerCase().includes(P)});if(!J.length){d.innerHTML=`<tr><td colspan="7">${v.length?"No accounts match filters.":"No accounts on this canister yet."}</td></tr>`;return}d.innerHTML=J.map(W=>{const Z=V.get(String(W.principal||""))||null,ct=(Z==null?void 0:Z.fullName)||[Z==null?void 0:Z.firstName,Z==null?void 0:Z.lastName].filter(Boolean).join(" ")||"—",pt=(Z==null?void 0:Z.email)||"—",ft=zs(W.stripeCurrentPeriodEnd),It=String(W.stripeCustomerId||"").trim(),Ft=String(W.stripeSubscriptionId||"").trim(),Ht=or(It,k),Tt=Ht?`<a class="mpd-membership-text-link" href="${vt(Ht)}" target="_blank" rel="noopener noreferrer">Customer</a>${Ft?` · <span class="studio-muted" title="${vt(Ft)}">Sub</span>`:""}`:'<span class="studio-muted">—</span>',Yt=W.membershipExemptManual?"Exempt (manual)":uo(W.stripeSubscriptionStatus);return`<tr>
                    <td>${eu(W,vt)}</td>
                    <td>${vt(ct)}</td>
                    <td>${vt(pt)}</td>
                    <td>${vt(Yt)}</td>
                    <td><span class="studio-muted" title="${vt(W.stripeCurrentPeriodEnd||"")}">${vt(ft)}</span></td>
                    <td>${Tt}</td>
                    <td><span class="studio-identity-short" title="${vt(W.principal)}">${vt(Xi(W.principal))}</span></td>
                </tr>`}).join("")},ot=()=>{try{const B=sessionStorage.getItem(vi);return B&&String(B).trim()?String(B).trim():null}catch{return null}},gt=B=>{try{B?sessionStorage.setItem(vi,B):sessionStorage.removeItem(vi)}catch{}},Lt=()=>{e.querySelectorAll("[data-finance-program-id]").forEach(B=>{const k=(B.getAttribute("data-finance-program-id")||"")===h;B.classList.toggle("is-selected",k),B.setAttribute("aria-pressed",k?"true":"false")})},bt=()=>Nc(j,E,T,{filterProgramId:h,activeOnly:!0}),wt=()=>{if(!m)return;const B=bt();m.innerHTML=Du(B,h,S)},_t=()=>{if(!C)return;const B=bt();N=new Map(B.map(P=>[P.applicantId,P])),C.innerHTML=Fu(B,h,S),wt()},At=async()=>{const[B,P]=await Promise.all([Hi(),Bo()]);j=Array.isArray(B)?B:[],T=mi(P),M=new Map,O=new Map;for(const k of j){const J=String((k==null?void 0:k.id)||"").trim();J&&O.set(J,k);const W=String((k==null?void 0:k.programId)||"").trim();W&&(M.has(W)||M.set(W,[]),M.get(W).push(k))}K()},nt=async()=>{await At()},dt=(B,P)=>{const k=N.get(B);if(!k)return;const J=O.get(B),Z={payments:`Total payments — ${k.firstName} ${k.lastName}`.trim(),fees:`Payment fees — ${k.firstName} ${k.lastName}`.trim(),travel:`Local travel — ${k.firstName} ${k.lastName}`.trim(),tickets:`Tickets — ${k.firstName} ${k.lastName}`.trim()}[P]||"Finance detail";if(P==="tickets"){const $t=(k.ticketsCents/100).toFixed(2),Ut=k.ownFlight?'<p class="studio-muted mpd-field-hint">Applicant selected Own Flight (pricing credit applied in Price category).</p>':"",ue=G?`<form class="studio-finance-ledger-add" id="studio-finance-tickets-form">
                    <h4 class="studio-subheading">Flight / ticket cost</h4>
                    <label class="studio-field"><span>Amount (USD)</span>
                        <input type="text" class="studio-input" id="studio-finance-tickets-amount" inputmode="decimal" placeholder="0.00" value="${vt($t==="0.00"?"":$t)}" />
                    </label>
                    <div class="studio-modal-actions">
                        <button type="submit" class="studio-btn-primary">Save ticket cost</button>
                        <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Close</button>
                    </div>
                    <p class="studio-muted mpd-field-hint" id="studio-finance-ledger-status" role="status"></p>
                </form>`:"",it=`<div class="studio-finance-ledger-modal">${Ut}${ue||'<p class="studio-muted">View only.</p>'}</div>`,{close:ut,root:St}=qt(it,{title:Z,wide:!0}),jt=St.querySelector("#studio-finance-tickets-form");if(!(jt instanceof HTMLFormElement)||!J)return;jt.addEventListener("submit",async Pt=>{Pt.preventDefault();const Vt=St.querySelector("#studio-finance-ledger-status"),Qt=St.querySelector("#studio-finance-tickets-amount"),ve=Qe(Qt instanceof HTMLInputElement?Qt.value:""),Zt=jt.querySelector('button[type="submit"]');Zt instanceof HTMLButtonElement&&(Zt.disabled=!0),Vt&&(Vt.textContent="Saving…");try{const Se=Js(Bn(k.payloadJson,{flightCostCents:ve}),k.payloadJson);await bs({...J,payloadJson:Se}),ut(),await nt()}catch(Se){Vt&&(Vt.textContent=Se instanceof Error?Se.message:String(Se)),Zt instanceof HTMLButtonElement&&(Zt.disabled=!1)}});return}const ct=P==="payments",pt=P==="travel",ft=ct?k.ledger.filter($t=>Ic($t)):pt?k.ledger.filter($t=>Cn($t)&&String(($t==null?void 0:$t.paymentType)||"")==="staff_travel"):k.ledger.filter($t=>Cn($t)&&Number($t.feeCents||0)>0&&String(($t==null?void 0:$t.paymentType)||"")!=="staff_travel"),It=ft.length>0?ft.map($t=>{const Ut=jc($t),ue=Ut==="staff"?'<span class="studio-finance-ledger-badge studio-finance-ledger-badge--staff">Staff</span>':Ut==="paypal"?'<span class="studio-finance-ledger-badge studio-finance-ledger-badge--paypal">PayPal</span>':'<span class="studio-finance-ledger-badge studio-finance-ledger-badge--stripe">Stripe</span>',it=String($t.createdAt||"").slice(0,10)||"—",ut=String($t.staffNote||"").trim(),St=ct?zt($t.amountCents):zt($t.feeCents);return`<tr>
                            <td>${ue}</td>
                            <td>${vt(Hc($t))}</td>
                            <td>${vt(St)}</td>
                            <td>${vt(it)}</td>
                            <td>${ut?vt(ut):"—"}</td>
                          </tr>`}).join(""):`<tr><td colspan="5">${ct?"No payment rows yet.":pt?"No travel fee rows yet.":"No fee rows yet."}</td></tr>`,Ft=ct?"Amount":"Fee";let Ht="";if(G)if(ct)Ht=`<form class="studio-finance-ledger-add" id="studio-finance-ledger-add-form">
                    <h4 class="studio-subheading">Add manual payment</h4>
                    <div class="studio-modal-fields-row">
                        <label class="studio-field"><span>Amount (USD)</span>
                            <input type="text" class="studio-input" id="studio-finance-ledger-amount" inputmode="decimal" placeholder="0.00" required />
                        </label>
                        <label class="studio-field"><span>Fee (USD, optional)</span>
                            <input type="text" class="studio-input" id="studio-finance-ledger-fee" inputmode="decimal" placeholder="0.00" />
                        </label>
                    </div>
                    <label class="studio-field studio-field--full"><span>Note (optional)</span>
                        <input type="text" class="studio-input" id="studio-finance-ledger-note" placeholder="Wire transfer ref…" />
                    </label>
                    <div class="studio-modal-actions">
                        <button type="submit" class="studio-btn-primary">Save payment</button>
                        <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Close</button>
                    </div>
                    <p class="studio-muted mpd-field-hint" id="studio-finance-ledger-status" role="status"></p>
                </form>`;else if(pt){const $t=(k.localTravelPayloadCents/100).toFixed(2);Ht=`<form class="studio-finance-ledger-add" id="studio-finance-ledger-add-form">
                    <h4 class="studio-subheading">Planned local travel (payload)</h4>
                    <label class="studio-field"><span>Planned amount (USD)</span>
                        <input type="text" class="studio-input" id="studio-finance-travel-planned" inputmode="decimal" placeholder="0.00" value="${vt($t==="0.00"?"":$t)}" />
                    </label>
                    <h4 class="studio-subheading">Add travel fee (ledger)</h4>
                    <div class="studio-modal-fields-row">
                        <label class="studio-field"><span>Travel fee (USD)</span>
                            <input type="text" class="studio-input" id="studio-finance-ledger-fee" inputmode="decimal" placeholder="0.00" />
                        </label>
                    </div>
                    <label class="studio-field studio-field--full"><span>Note (optional)</span>
                        <input type="text" class="studio-input" id="studio-finance-ledger-note" placeholder="Taxi, transit pass…" />
                    </label>
                    <div class="studio-modal-actions">
                        <button type="submit" class="studio-btn-primary">Save</button>
                        <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Close</button>
                    </div>
                    <p class="studio-muted mpd-field-hint" id="studio-finance-ledger-status" role="status"></p>
                </form>`}else Ht=`<form class="studio-finance-ledger-add" id="studio-finance-ledger-add-form">
                    <h4 class="studio-subheading">Add manual fee</h4>
                    <div class="studio-modal-fields-row">
                        <label class="studio-field"><span>Fee (USD)</span>
                            <input type="text" class="studio-input" id="studio-finance-ledger-fee" inputmode="decimal" placeholder="0.00" required />
                        </label>
                    </div>
                    <label class="studio-field studio-field--full"><span>Note (optional)</span>
                        <input type="text" class="studio-input" id="studio-finance-ledger-note" placeholder="Processing fee…" />
                    </label>
                    <div class="studio-modal-actions">
                        <button type="submit" class="studio-btn-primary">Save fee</button>
                        <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Close</button>
                    </div>
                    <p class="studio-muted mpd-field-hint" id="studio-finance-ledger-status" role="status"></p>
                </form>`;const Tt=`
            <div class="studio-finance-ledger-modal">
                <div class="studio-table-wrap">
                    <table class="studio-table studio-table--dense">
                        <thead>
                            <tr>
                                <th>Source</th>
                                <th>Type</th>
                                <th>${vt(Ft)}</th>
                                <th>Date</th>
                                <th>Note</th>
                            </tr>
                        </thead>
                        <tbody>${It}</tbody>
                    </table>
                </div>
                ${Ht}
            </div>`,{close:Yt,root:Rt}=qt(Tt,{title:Z,wide:!0}),ce=Rt.querySelector("#studio-finance-ledger-add-form");ce instanceof HTMLFormElement&&ce.addEventListener("submit",async $t=>{$t.preventDefault();const Ut=Rt.querySelector("#studio-finance-ledger-status"),ue=Rt.querySelector("#studio-finance-ledger-note"),it=ue instanceof HTMLInputElement?ue.value.trim():"";let ut=0,St=0;if(ct){const Pt=Rt.querySelector("#studio-finance-ledger-amount"),Vt=Rt.querySelector("#studio-finance-ledger-fee");if(ut=Qe(Pt instanceof HTMLInputElement?Pt.value:""),St=Qe(Vt instanceof HTMLInputElement?Vt.value:""),ut<=0){Ut&&(Ut.textContent="Enter a payment amount.");return}}else if(pt){const Pt=Rt.querySelector("#studio-finance-travel-planned"),Vt=Rt.querySelector("#studio-finance-ledger-fee"),Qt=Qe(Pt instanceof HTMLInputElement?Pt.value:"");St=Qe(Vt instanceof HTMLInputElement?Vt.value:"");const ve=ce.querySelector('button[type="submit"]');ve instanceof HTMLButtonElement&&(ve.disabled=!0),Ut&&(Ut.textContent="Saving…");try{let Zt=!1;if(J){const Se=Js(Bn(k.payloadJson,{localTravelCostCents:Qt}),k.payloadJson);await bs({...J,payloadJson:Se}),Zt=!0}if(St>0&&(await Oo({applicantId:k.applicantId,programId:k.programId,amountCents:0,feeCents:St,staffNote:it,entryKind:"travel"}),Zt=!0),!Zt){Ut&&(Ut.textContent="Enter a travel fee or planned amount."),ve instanceof HTMLButtonElement&&(ve.disabled=!1);return}Yt(),await At()}catch(Zt){Ut&&(Ut.textContent=Zt instanceof Error?Zt.message:String(Zt)),ve instanceof HTMLButtonElement&&(ve.disabled=!1)}return}else{const Pt=Rt.querySelector("#studio-finance-ledger-fee");if(St=Qe(Pt instanceof HTMLInputElement?Pt.value:""),St<=0){Ut&&(Ut.textContent="Enter a fee amount.");return}}const jt=ce.querySelector('button[type="submit"]');jt instanceof HTMLButtonElement&&(jt.disabled=!0),Ut&&(Ut.textContent="Saving…");try{await Oo({applicantId:k.applicantId,programId:k.programId,amountCents:ut,feeCents:St,staffNote:it,entryKind:pt?"travel":"fee"}),Yt(),await At()}catch(Pt){Ut&&(Ut.textContent=Pt instanceof Error?Pt.message:String(Pt)),jt instanceof HTMLButtonElement&&(jt.disabled=!1)}})},yt=B=>{const P=String(B||"").trim();!P||!S.has(P)||(h===P?(h=null,gt(null)):(h=P,gt(P)),Lt(),_t())},K=()=>{const B={active:[],past:[],upcoming:[]};S=new Map;const P=[...E].sort(Pu);for(const k of P){const J=M.get(String(k.id||""))||[],W=qu(k,J,T);S.set(W.id,W),B[W.section].push(W)}if(b){const k=[],J=["active","past","upcoming"],W={active:"Active",past:"Past",upcoming:"Upcoming"};let Z=!1;for(const ct of J){const pt=B[ct];pt.length&&(Z=!0,k.push(`<span class="studio-finance-program-cards-divider" aria-hidden="true">${vt(W[ct])}</span>`),k.push(...pt.map(ft=>Nu(ft,ft.id===h))))}b.innerHTML=Z?k.join(""):'<p class="studio-muted studio-finance-program-section__empty">No programs yet.</p>'}h&&!S.has(h)&&(h=null,gt(null)),Lt(),_t()};e.addEventListener("click",B=>{const P=B.target instanceof Element?B.target.closest("[data-finance-email-applicant]"):null;if(P){const Z=P.getAttribute("data-finance-email-applicant"),ct=Z?O.get(Z):null;ct&&Oi(ct,{onSent:()=>At()});return}const k=B.target instanceof Element?B.target.closest("[data-finance-ledger-open]"):null;if(k){const Z=k.getAttribute("data-applicant-id"),ct=k.getAttribute("data-finance-ledger-mode");Z&&(ct==="payments"||ct==="fees"||ct==="travel"||ct==="tickets")&&dt(Z,ct);return}const J=B.target instanceof Element?B.target.closest("[data-finance-program-id]"):null;if(!J)return;const W=J.getAttribute("data-finance-program-id");W&&yt(W)}),e.querySelectorAll("[data-finance-tab]").forEach(B=>{B.addEventListener("click",()=>{const P=B.getAttribute("data-finance-tab");P&&y(P)})}),e.querySelectorAll("[data-finance-chip]").forEach(B=>{B.addEventListener("click",()=>{const P=B.getAttribute("data-finance-chip");if(P){if(z.has(P)&&z.size<=1){c&&(c.hidden=!1);return}c&&(c.hidden=!0),z.has(P)?z.delete(P):z.add(P),F(),I(),R()}})}),p==null||p.addEventListener("change",X),u==null||u.addEventListener("input",X);const et=Ee("Programs").visible,Y=Ee("Users").visible,st=[];if(Y)try{v=await Te();const B=await Yi().catch(()=>[]);V=new Map((Array.isArray(B)?B:[]).map(P=>{const k=P&&P[0]&&typeof P[0]=="object"&&typeof P[0].toText=="function"?P[0].toText():String((P==null?void 0:P[0])||""),J=(P==null?void 0:P[1])||{},W=String(J.firstName||"").trim(),Z=String(J.lastName||"").trim(),ct=String(J.email||"").trim(),pt=`${W} ${Z}`.trim();return[k,{firstName:W,lastName:Z,fullName:pt,email:ct}]}));try{if(at=await sl(),!at.ok){const P=typeof at.reason=="string"?at.reason:typeof at.error=="string"?at.error:"Membership revenue unavailable";st.push(P)}}catch(P){at={ok:!1},st.push(P instanceof Error?P.message:String(P))}}catch(B){const P=B instanceof Error?B.message:String(B);v=[],V=new Map,st.push(/Unauthorized|admin only|not visible/i.test(P)?"Membership accounts could not be loaded. Enable Finance — Users (view) for this role, then refresh. If permissions are already set, redeploy fusion-app-backend so listAccounts respects staff access.":P)}if(et)try{const[B,P,k]=await Promise.all([We(),Hi(),Bo()]);E=Array.isArray(B)?B:[],j=Array.isArray(P)?P:[],T=mi(k),M=new Map,O=new Map;for(const J of j){const W=String((J==null?void 0:J.id)||"").trim();W&&O.set(W,J);const Z=String((J==null?void 0:J.programId)||"").trim();Z&&(M.has(Z)||M.set(Z,[]),M.get(Z).push(J))}h=ot()}catch(B){const P=B instanceof Error?B.message:String(B);E=[],j=[],M=new Map,st.push(P)}w(st.length?st.join(" "):""),L(!1),n&&(n.hidden=!1),I(),R(),x(),q(),X(),Ee("Programs").visible?K():C&&(C.innerHTML=""),y(_()),g.length||w("Finance is open but no category scopes are enabled for your role.")}function ge(e){return String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Jn(e,s=null){let i="";return`
        <div class="studio-table-wrap">
            <table class="studio-table studio-perm-matrix">
                <thead>
                    <tr>
                        <th>Feature</th>
                        <th>Visible</th>
                        <th>Can change</th>
                    </tr>
                </thead>
                <tbody>${Es.map(n=>{const a=e.get(n.id)??{visible:!0,canEdit:!0},r=!!(s!=null&&s.size&&!s.has(n.id)),l=r?" disabled":"",d=r?" studio-perm-matrix__row--unsupported":"",p=n.group||"";let u="";return p&&p!==i&&(i=p,u=`<tr class="studio-perm-matrix__group"><td colspan="3">${ge(p==="finance"?"Finance (parent + category scopes)":p)}</td></tr>`),`${u}
            <tr data-perm-row="${ge(n.id)}" class="${d.trim()}">
                <td>${ge(n.label)}${r?' <span class="studio-muted">(needs backend upgrade)</span>':""}</td>
                <td class="studio-perm-matrix__cell">
                    <label class="studio-checkbox-label">
                        <input type="checkbox" class="studio-perm-visible" data-feature="${ge(n.id)}" ${a.visible?"checked":""}${l} />
                        <span>Visible</span>
                    </label>
                </td>
                <td class="studio-perm-matrix__cell">
                    <label class="studio-checkbox-label">
                        <input type="checkbox" class="studio-perm-edit" data-feature="${ge(n.id)}" ${a.canEdit?"checked":""}${l} />
                        <span>Can change</span>
                    </label>
                </td>
            </tr>
        `}).join("")}</tbody>
            </table>
        </div>
    `}function Ou(e){const s=new Map;for(const i of Es){const o=e.querySelector(`.studio-perm-visible[data-feature="${i.id}"]`);if(!(o instanceof HTMLInputElement))continue;const n=e.querySelector(`.studio-perm-edit[data-feature="${i.id}"]`);s.set(i.id,{visible:!!o.checked,canEdit:!!(n instanceof HTMLInputElement&&n.checked)})}return s}function Ju(e,s=null){return Es.filter(i=>!s||s.has(i.id)).map(i=>{const o=e.get(i.id)??{visible:!0,canEdit:!0};return[i.id,{visible:o.visible,canEdit:o.canEdit}]})}function Vu(e){const i=(e instanceof Error?e.message:String(e)).match(/Unknown studio feature key:\s*([^'.\s]+)/i);return i?String(i[1]).trim():null}async function Vn(e,s){let i=s;const o=[];for(let n=0;n<32;n++)try{return await e(i),{saved:i,skipped:o}}catch(a){const r=Vu(a);if(!r||!i.some(([l])=>l===r)||(i=i.filter(([l])=>l!==r),o.push(r),!i.length))throw a}throw new Error("Could not save permissions — too many unknown feature keys for this canister.")}function Wu(){return`
        <div class="studio-section-stack studio-permissions-page">
            <div class="studio-section-title-row">
                <h2>Permissions</h2>
            </div>
            <p class="studio-banner studio-banner--info" id="studio-permissions-banner" hidden></p>
            <div class="studio-perm-role-tabs" role="tablist" aria-label="Role category">${ol.map(s=>`<button type="button" class="studio-btn-ghost studio-perm-role-tab" data-role-tab="${ge(s.id)}">${ge(s.label)}</button>`).join("")}</div>
            <div id="studio-perm-role-panel"></div>
            <div id="studio-perm-staff-panel">
                <div class="studio-perm-mode-row">
                    <label class="studio-field-label">Apply to</label>
                    <div class="studio-segment" id="studio-perm-mode">
                        <button type="button" class="studio-segment__btn is-active" data-mode="role">Role default</button>
                        <button type="button" class="studio-segment__btn" data-mode="principal">By principal</button>
                    </div>
                </div>
                <div id="studio-perm-principal-row" class="studio-perm-principal-row" hidden>
                    <label class="studio-field-label" for="studio-perm-principal-select">Studio user</label>
                    <select id="studio-perm-principal-select" class="studio-input studio-perm-principal-select"></select>
                    <p class="studio-help studio-perm-principal-help" id="studio-perm-principal-help" hidden>
                        Super staff: enter a principal in the field below and use Load — account list requires admin.
                    </p>
                    <label class="studio-field-label" for="studio-perm-principal-text">Principal (text)</label>
                    <div class="studio-perm-principal-manual">
                        <input type="text" id="studio-perm-principal-text" class="studio-input" placeholder="aaaaa-aa" autocomplete="off" />
                        <button type="button" class="studio-btn-ghost" id="studio-perm-principal-load">Load</button>
                    </div>
                </div>
                <div id="studio-perm-matrix-host"></div>
                <div class="studio-toolbar">
                    <button type="button" class="studio-btn-primary" id="studio-perm-save">Save</button>
                    <button type="button" class="studio-btn-ghost" id="studio-perm-register-keys" hidden>Register missing keys</button>
                    <button type="button" class="studio-btn-ghost" id="studio-perm-clear-override" hidden>Clear override</button>
                </div>
            </div>
            <div class="studio-perm-super-staff" id="studio-perm-super-staff" hidden>
                <h3>Super staff</h3>
                <p class="studio-help">Principals that may open this Permissions page (same as admins for navigation). Only canister admins may edit this list.</p>
                <ul class="studio-perm-super-list" id="studio-perm-super-list"></ul>
                <div class="studio-perm-super-add">
                    <input type="text" id="studio-perm-super-input" class="studio-input" placeholder="Principal to add" />
                    <button type="button" class="studio-btn-primary" id="studio-perm-super-add">Add</button>
                </div>
            </div>
        </div>
    `}async function Gu(e){var R;const s=e.querySelector("#studio-permissions-banner"),i=e.querySelector("#studio-perm-role-panel"),o=e.querySelector("#studio-perm-staff-panel"),n=e.querySelector("#studio-perm-matrix-host"),a=e.querySelector("#studio-perm-mode"),r=e.querySelector("#studio-perm-principal-row"),l=e.querySelector("#studio-perm-principal-select"),d=e.querySelector("#studio-perm-principal-help"),p=e.querySelector("#studio-perm-principal-text"),u=e.querySelector("#studio-perm-principal-load"),c=e.querySelector("#studio-perm-save"),m=e.querySelector("#studio-perm-register-keys"),b=e.querySelector("#studio-perm-clear-override"),C=e.querySelector("#studio-perm-super-staff"),w=e.querySelector("#studio-perm-super-list"),L=e.querySelector("#studio-perm-super-input"),A=e.querySelector("#studio-perm-super-add"),g=(x,q="info")=>{if(s){if(!x){s.hidden=!0,s.textContent="";return}s.hidden=!1,s.className=`studio-banner studio-banner--${q}`,s.textContent=x}},f=await Ui();if(!(f.isAdmin||f.isSuperStaff)){g("You do not have access to edit permissions.","warn"),c&&(c.disabled=!0);return}let E="staff",j="role",M=new Map,S=null,h=!1;const T=async()=>{try{const x=await cl();if(!x.length||ul(x)){h=!0,S=null;return}h=!1,S=new Set(x)}catch{h=!1,S=null}},N=()=>{if(h){m&&(m.hidden=!1),g("This backend is missing Finance / Schedule permission keys. Click “Register missing keys” to add them on the canister, or redeploy fusion-app-backend if that button is unavailable.","warn");return}if(m&&(m.hidden=!0),!(S!=null&&S.size))return;const x=Es.filter(q=>!S.has(q.id)).map(q=>q.label);x.length&&(m&&(m.hidden=!1),g(`This backend cannot store permissions for: ${x.join(", ")}. Click “Register missing keys” or redeploy fusion-app-backend.`,"warn"))},O=async()=>{m&&(m.disabled=!0);try{const x=await pl();await T(),N(),n&&(n.innerHTML=Jn(M,S)),g(x.length?`Registered ${x.length} permission keys on the canister. You can save Finance / Schedule rows now.`:"Permission keys updated on the canister.")}catch(x){g(x instanceof Error?x.message:String(x),"warn")}finally{m&&(m.disabled=!1)}},G=x=>{j=x,a==null||a.querySelectorAll(".studio-segment__btn").forEach(q=>{const X=q.getAttribute("data-mode");q.classList.toggle("is-active",X===j)}),r&&(r.hidden=j!=="principal"),b&&(b.hidden=j!=="principal")},V=x=>{M=new Map(x),n&&(n.innerHTML=Jn(M,S)),c&&(c.disabled=!1)},at=async x=>{const q=await ri(x);return ni(ze(q))},tt=(x,q)=>{const X=new Map(x);for(const ot of Es)S&&!S.has(ot.id)||q.has(ot.id)&&X.set(ot.id,q.get(ot.id));return Ju(X,S)},z=async(x,q)=>{const X=await ri(x);return tt(ze(X),q)},F=async(x,q,X)=>{const ot=await ai(x),gt=ot&&ot.length?ze(ot):ze(await ri(q));return tt(gt,X)},I=()=>{if(!(!i||!o)){if(E!=="staff"&&E!=="collaborator"){o.style.display="none",i.innerHTML='<p class="studio-banner studio-banner--info">Coming soon — role defaults for this tab are reserved on the canister for a later release.</p>';return}o.style.display="",i.innerHTML=""}},y=async()=>{if(!f.isAdmin||!w)return;let x=[];try{x=await qa()}catch{x=[]}w.innerHTML=x.map(q=>{const X=q&&typeof q=="object"&&"toText"in q&&typeof q.toText=="function"?q.toText():String(q);return`<li class="studio-perm-super-item"><code>${ge(X)}</code> <button type="button" class="studio-btn-ghost studio-perm-super-remove" data-principal="${ge(X)}">Remove</button></li>`}).join(""),w.querySelectorAll(".studio-perm-super-remove").forEach(q=>{q.addEventListener("click",async()=>{const X=q.getAttribute("data-principal");if(X)try{await ml(X),g("Removed super staff principal."),await y()}catch(ot){g(ot instanceof Error?ot.message:String(ot),"warn")}})})};C&&(C.hidden=!f.isAdmin,f.isAdmin&&y()),A==null||A.addEventListener("click",async()=>{const x=String((L==null?void 0:L.value)||"").trim();if(x){try{Vs.fromText(x)}catch{g("Invalid principal text.","warn");return}try{await nl(x),L&&(L.value=""),g("Added super staff principal."),await y()}catch(q){g(q instanceof Error?q.message:String(q),"warn")}}});let _=[];try{_=f.isAdmin?await Te():[]}catch{_=[]}l&&(l.innerHTML=['<option value="">— Select principal —</option>',..._.map(x=>{const q=`${x.principal.slice(0,12)}… (${x.role||"?"})`;return`<option value="${ge(x.principal)}">${ge(q)}</option>`})].join("")),d&&(d.hidden=f.isAdmin);const $=async()=>{if(!(E!=="staff"&&E!=="collaborator"))try{const x=await at(E);V(x),g("")}catch(x){g(x instanceof Error?x.message:String(x),"warn")}},H=async x=>{const q=String(x||"").trim();if(q)try{const X=await ai(q);if(!X||!Array.isArray(X)||X.length===0){const ot=await at(E==="staff"||E==="collaborator"?E:"staff");V(ot),g("No override — showing role default for the selected tab. Save to create an override.")}else{const ot=ze(X),gt=await at(E==="staff"||E==="collaborator"?E:"staff");V(ni(ot,gt)),g("")}}catch(X){g(X instanceof Error?X.message:String(X),"warn")}};e.querySelectorAll(".studio-perm-role-tab").forEach(x=>{x.addEventListener("click",async()=>{const q=x.getAttribute("data-role-tab");q&&(E=q,e.querySelectorAll(".studio-perm-role-tab").forEach(X=>{X.classList.toggle("is-active",X.getAttribute("data-role-tab")===q)}),I(),(q==="staff"||q==="collaborator")&&(G("role"),await $()))})}),a==null||a.querySelectorAll(".studio-segment__btn").forEach(x=>{x.addEventListener("click",()=>{const q=x.getAttribute("data-mode");q!=="role"&&q!=="principal"||(G(q),q==="role"?$():l!=null&&l.value&&H(l.value))})}),l==null||l.addEventListener("change",()=>{j==="principal"&&l.value&&H(l.value)}),u==null||u.addEventListener("click",()=>{const x=p==null?void 0:p.value.trim();x&&H(x)}),m==null||m.addEventListener("click",()=>{O()}),b==null||b.addEventListener("click",async()=>{const x=j==="principal"&&((l==null?void 0:l.value)||(p==null?void 0:p.value.trim()))||"";if(!x){g("Select or enter a principal first.","warn");return}try{await al(x),g("Override cleared."),await H(x),window.dispatchEvent(new Event("fusion-studio-shell-refresh"))}catch(q){g(q instanceof Error?q.message:String(q),"warn")}}),c==null||c.addEventListener("click",async()=>{if(!n)return;const x=Ou(n);try{if(E!=="staff"&&E!=="collaborator"){g("Only Staff and Collaborator role defaults are editable in this build.","warn");return}let q;const X=new Map(x);if(j==="role"){const bt=await z(E,x);q=await Vn(wt=>rl(E,wt),bt)}else{const bt=(l==null?void 0:l.value)||(p==null?void 0:p.value.trim())||"";if(!bt){g("Select or enter a principal for override save.","warn");return}Vs.fromText(bt);const _t=await F(bt,E==="staff"||E==="collaborator"?E:"staff",x);q=await Vn(At=>ll(bt,At),_t)}const ot=j==="role"?await at(E):ni(ze(await ai((l==null?void 0:l.value)||(p==null?void 0:p.value.trim())||"")),await at(E==="staff"||E==="collaborator"?E:"staff"));V(ot);const gt=dl(X,ot);q.skipped.length?g(`Saved supported permissions. Skipped until backend upgrade: ${q.skipped.join(", ")}. Run dfx deploy fusion-app-backend --network ic`,"info"):gt?g(j==="role"?"Role defaults saved.":"Override saved for principal."):g("Saved, but reloaded values differ — redeploy fusion-app-backend if Finance / Schedule rows were edited.","warn");const Lt=await Ui();ir(Lt),window.dispatchEvent(new Event("fusion-studio-shell-refresh"))}catch(q){g(q instanceof Error?q.message:String(q),"warn")}}),I(),(R=e.querySelector('.studio-perm-role-tab[data-role-tab="staff"]'))==null||R.classList.add("is-active"),await T(),N(),await $(),f.isAdmin}function Xt(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function de(e){const s=e.subtitle?`<p class="studio-page-header__subtitle">${Xt(e.subtitle)}</p>`:"",i=e.countLabel??"Total";return`
<header class="studio-page-header">
  <div class="studio-page-header__text">
    <h2 class="studio-page-header__title">${Xt(e.title)}</h2>
    ${s}
  </div>
  <div class="studio-page-header__stat" aria-live="polite" aria-label="${Xt(i)} count">
    <span class="studio-page-header__count" id="${Xt(e.countId)}">—</span>
    <span class="studio-page-header__count-label">${Xt(i)}</span>
  </div>
</header>`}function Pe(e){const s=e.searchPlaceholder??"Search…",i=e.extraHtml??"";return`
<div class="studio-filter-bar">
  <label class="studio-filter-bar__search">
    <span class="studio-sr-only">Search</span>
    <input type="search" id="${Xt(e.searchId)}" class="studio-input studio-filter-bar__input" placeholder="${Xt(s)}" autocomplete="off" />
  </label>
  ${i?`<div class="studio-filter-bar__extra">${i}</div>`:""}
</div>`}function fr(e){const s=e.tabs.map(i=>`<button type="button" class="studio-data-tabs__tab${i.active?" is-active":""}" role="tab" aria-selected="${i.active?"true":"false"}" tabindex="${i.active?"0":"-1"}" data-tab-value="${Xt(i.value)}" id="${Xt(i.id)}">${Xt(i.label)}</button>`).join("");return`
<div class="studio-data-tabs" role="tablist" aria-label="${Xt(e.ariaLabel)}">
  ${s}
</div>`}function Ku(e){return`
<nav class="studio-pagination studio-pagination--full" id="${Xt(e.navId)}" aria-label="Pages">
  <button type="button" class="studio-btn-ghost studio-pagination__prev" id="${Xt(e.prevId)}" aria-label="Previous page">Prev</button>
  <div class="studio-pagination__numbers" id="${Xt(e.numbersId)}"></div>
  <span class="studio-pagination__label" id="${Xt(e.labelId)}"></span>
  <button type="button" class="studio-btn-ghost studio-pagination__next" id="${Xt(e.nextId)}" aria-label="Next page">Next</button>
</nav>`}function zu(e){const s=String(e||"").toLowerCase();return s==="staff"?{staff:null}:s==="collaborator"?{collaborator:null}:s==="admin"?{admin:null}:s==="artist"?{artist:null}:s==="gallery"?{gallery:null}:s==="curator"?{curator:null}:s==="collector"?{collector:null}:{staff:null}}function Yu(e,s){const i=e.rawAccount;if(!i||typeof i!="object")throw new Error("No account record to update.");return{...i,role:zu(s),updatedAt:new Date().toISOString()}}function Cs(e){return e&&typeof e=="object"&&"toText"in e&&typeof e.toText=="function"?e.toText():String(e??"")}function Qu(e){return!e||typeof e!="object"?"—":Object.keys(e)[0]||"—"}async function Wn(e){try{return await navigator.clipboard.writeText(e),!0}catch{try{const s=document.createElement("textarea");return s.value=e,document.body.appendChild(s),s.select(),document.execCommand("copy"),s.remove(),!0}catch{return!1}}}function Xu(){return`
        <div class="studio-section-stack studio-category-page" id="studioTeamRoot">
            ${de({title:"Team",subtitle:"Canister administrators, super staff, and on-chain team roles",countId:"studio-team-count",countLabel:"rows"})}
            <p class="studio-muted" id="studioTeamIntro">
                <strong>Team</strong> is visible only to canister admins. Use join invites to onboard <strong>staff</strong> and <strong>collaborators</strong> via the public
                <a class="studio-inline-link" href="/join-fusion" target="_blank" rel="noopener">/join-fusion</a> page. Collaborator access in Studio is controlled by the
                <a class="studio-inline-link" href="#permissions">Permissions</a> matrix.
            </p>
            <div class="studio-toolbar-actions" id="studioTeamToolbar" style="display:none">
                <button type="button" class="studio-btn-primary" id="studioTeamGenInvite" aria-haspopup="dialog">Generate team join invite</button>
            </div>
            <p class="studio-banner studio-banner--warn" id="studioTeamGate" role="status">Loading…</p>
            <div class="studio-table-wrap studio-table-wrap--sticky-head" id="studioTeamTableWrap" hidden>
                <table class="studio-table studio-table--dense" aria-label="Team directory">
                    <thead>
                        <tr>
                            <th>Identity</th>
                            <th>Team member</th>
                            <th>Contact</th>
                            <th>Account role</th>
                            <th>Status</th>
                            <th>Access</th>
                        </tr>
                    </thead>
                    <tbody id="studioTeamTbody"></tbody>
                </table>
            </div>
            <div id="studioTeamPendingInvitesWrap" class="studio-team-pending-invites" hidden>
                <p class="studio-muted" style="margin-top:1.5rem">
                    <strong>Pending join invites</strong> — single-use codes not yet redeemed. Staff and collaborators
                    use <a class="studio-inline-link" href="/join-fusion" target="_blank" rel="noopener">/join-fusion</a>
                    with the matching role; other roles use the join flow with the same role selected.
                </p>
                <div class="studio-table-wrap studio-table-wrap--sticky-head">
                    <table class="studio-table studio-table--dense" aria-label="Pending join invites">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Role</th>
                                <th>Created</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody id="studioTeamInvitesTbody"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `}async function Gn(e){const s=e.querySelector("#studioTeamPendingInvitesWrap"),i=e.querySelector("#studioTeamInvitesTbody");if(!s||!i)return;let o;try{o=await Na()}catch(r){const l=r instanceof Error?r.message:String(r);i.innerHTML=`<tr><td colspan="4" class="studio-muted">Could not load invites. ${Wt(l)}</td></tr>`,s.hidden=!1;return}const a=(Array.isArray(o)?o:[]).map(r=>{const l=r,d=Array.isArray(l)?l[0]:(l==null?void 0:l[0])??(l==null?void 0:l["0"]),p=Array.isArray(l)?l[1]:(l==null?void 0:l[1])??(l==null?void 0:l["1"]);return{code:String(d??""),rec:p}}).filter(r=>!r.rec||typeof r.rec!="object"?!1:r.rec.active===!0);a.length===0?i.innerHTML='<tr><td colspan="4" class="studio-muted">No active join invites.</td></tr>':(a.sort((r,l)=>r.code.localeCompare(l.code)),i.innerHTML=a.map(({code:r,rec:l})=>{const d=l,p=Qu(d.role),u=Wt(le(d.createdAt));return`<tr>
        <td><code style="user-select:all">${Wt(r)}</code></td>
        <td>${Wt(p)}</td>
        <td>${u}</td>
        <td><button type="button" class="studio-btn-ghost studio-btn-tiny" data-copy-invite="${Wt(r)}">Copy</button></td>
      </tr>`}).join("")),s.hidden=!1}const Zu=new Set(["staff","admin","collaborator"]);async function tp(e){const s=e.querySelector("#studioTeamGate"),i=e.querySelector("#studioTeamTableWrap"),o=e.querySelector("#studioTeamTbody"),n=e.querySelector("#studioTeamToolbar"),a=e.querySelector("#studio-team-count"),r=e.querySelector("#studioTeamIntro");if(!(!s||!o)){if(!await fl()){r&&(r.hidden=!0),i&&(i.hidden=!0),n&&(n.style.display="none");const l=e.querySelector("#studioTeamPendingInvitesWrap");l&&(l.hidden=!0),s.className="studio-banner studio-banner--warn",s.textContent="You need canister admin access to view the Team section.",a&&(a.textContent="—");return}e.dataset.studioTeamInviteCopyBound||(e.dataset.studioTeamInviteCopyBound="1",e.addEventListener("click",l=>{const d=l.target;if(!(d instanceof Element))return;const p=d.closest("button[data-copy-invite]");if(!p||!e.contains(p))return;const u=p.getAttribute("data-copy-invite")||"";Wn(u)})),s.className="studio-banner studio-banner--info",s.textContent="Loading team directory…",n&&(n.style.display="flex");try{const[l,d,p,u]=await Promise.all([bl().catch(()=>[]),qa().catch(()=>[]),Te(),Yi().catch(()=>[])]);let c=p;const m=new Map;(l||[]).forEach((g,f)=>{m.set(Cs(g),f)});const b=new Map,C=g=>(b.has(g)||b.set(g,{principal:g,isAdmin:!1,isSuperStaff:!1,acc:null,contact:null}),b.get(g));for(const g of l||[]){const f=C(Cs(g));f.isAdmin=!0}for(const g of d||[]){const f=C(Cs(g));f.isSuperStaff=!0}for(const g of c)if(Zu.has(String(g.role))){const f=C(g.principal);f.acc=g}for(const g of u||[]){if(!Array.isArray(g)&&!(g&&typeof g=="object"))continue;const f=Array.isArray(g)?g[0]:g[0]??g[0],v=Array.isArray(g)?g[1]:g[1]??g[1];if(!v||typeof v!="object")continue;const E=C(Cs(f));E.contact={firstName:String(v.firstName??v.first_name??""),lastName:String(v.lastName??v.last_name??""),email:String(v.email??"")}}const w=[...b.keys()].sort((g,f)=>{const v=m.has(g)?m.get(g):9999,E=m.has(f)?m.get(f):9999;return v!==E?(v??0)-(E??0):g.localeCompare(f)});s.className="studio-banner studio-banner--ok",s.textContent="Directory is read from the canister. Save role changes after editing a row.",a&&(a.textContent=String(w.length)),i&&(i.hidden=!1),o.innerHTML=w.map(g=>{const f=b.get(g);if(!f)return"";const v=f.contact,j=[(v==null?void 0:v.firstName)||"",(v==null?void 0:v.lastName)||""].map(at=>String(at||"").trim()).filter(Boolean).join(" ")||"—",M=v&&(v.firstName||v.lastName||v.email)?`${[v.firstName,v.lastName].filter(Boolean).join(" ")}${v.email?(v.firstName||v.lastName?" · ":"")+v.email:""}`:"—",S=f.acc,h=S?S.role:"—",T=S?S.status:"—",N=f.isAdmin?'<span class="studio-pill studio-pill--active">Canister admin</span>':"",O=f.isSuperStaff?'<span class="studio-pill studio-pill--dev">Super staff</span>':"",G=g.replace(/[^a-z0-9]/gi,""),V=S?`<div class="studio-team-role-actions">
                <label class="studio-sr-only" for="team-role-${G}">Change role for ${Wt(g)}</label><select class="studio-select" id="team-role-${G}" data-principal="${Wt(g)}" data-kind="account-role" aria-label="Change account role">
                    <option value="staff" ${h==="staff"?"selected":""}>staff</option>
                    <option value="collaborator" ${h==="collaborator"?"selected":""}>collaborator</option>
                    <option value="admin" ${h==="admin"?"selected":""}>admin (account)</option>
                </select>
                <button type="button" class="studio-btn-primary studio-btn-tiny" data-principal="${Wt(g)}" data-kind="save-role">Save</button></div>`:"—";return`<tr>
        <td><span class="studio-identity-short" title="${Wt(g)}">${Wt(Xi(g))}</span>
          <div class="studio-team-badges">${N}${O}</div></td>
        <td>${Wt(j)}</td>
        <td class="studio-td-clip">${Wt(M)}</td>
        <td>${S?Wt(h):"—"}</td>
        <td>${S?Wt(T):"—"}</td>
        <td class="studio-td-wrap">${V}</td>
      </tr>`}).join("");const L=async(g,f)=>{const v=c.find(M=>M.principal===g);if(!v||!v.rawAccount)return;const E=f.value,j=Yu(v,E);try{await Pa(g,j),c=await Te()}catch(M){const S=M instanceof Error?M.message:String(M);window.alert(`Could not save: ${S}`)}};o.addEventListener("click",g=>{const f=g.target;if(!(f instanceof Element))return;const v=f.closest('button[data-kind="save-role"]');if(!v||!o.contains(v))return;const E=v.getAttribute("data-principal")||"";if(!E)return;const j=v.closest("tr"),M=j&&j.querySelector('select[data-kind="account-role"]');M instanceof HTMLSelectElement&&L(E,M)}),await Gn(e);const A=e.querySelector("#studioTeamGenInvite");A&&A.addEventListener("click",()=>{var v;const g=`<div class="studio-section-stack" style="gap:1rem">
          <p class="studio-muted">Creates a <strong>single-use</strong> 8-digit code. The new member must pick the <strong>same</strong> role on <a href="/join-fusion" target="_blank" rel="noopener">/join-fusion</a>.</p>
          <label class="studio-field"><span>Role</span>
            <select id="studioTeamInviteRole" class="studio-select">
              <option value="staff" selected>Staff</option>
              <option value="collaborator">Collaborator</option>
            </select>
          </label>
          <p id="studioTeamInviteResult" class="studio-muted" hidden></p>
          <div class="studio-modal-actions">
            <button type="button" class="studio-btn-primary" id="studioTeamInviteGen">Generate</button>
            <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Close</button>
          </div>
        </div>`,{root:f}=qt(g,{title:"Team join invite",compact:!0});(v=f.querySelector("#studioTeamInviteGen"))==null||v.addEventListener("click",async()=>{var h;const E=f.querySelector("#studioTeamInviteRole"),M=(E instanceof HTMLSelectElement?E.value:"staff")==="collaborator"?{collaborator:null}:{staff:null},S=f.querySelector("#studioTeamInviteResult");try{const T=await Zi(M);S&&(S.innerHTML=`Code: <code style="user-select:all;font-size:1.1em">${Wt(T)}</code> <button type="button" class="studio-btn-ghost" id="studioTeamCopyCode">Copy</button>`,S.hidden=!1,(h=S.querySelector("#studioTeamCopyCode"))==null||h.addEventListener("click",()=>{Wn(T)})),await Gn(e)}catch(T){S&&(S.textContent=T instanceof Error?T.message:String(T),S.hidden=!1)}})})}catch(l){s.className="studio-banner studio-banner--error",s.textContent=l instanceof Error?l.message:String(l),a&&(a.textContent="—")}}}const Kn=new WeakMap;function ep(e){const s=Kn.get(e);if(s&&s.isConnected)return s;const i=document.createElement("div");i.className="studio-artist-manage-busy",i.hidden=!0,i.setAttribute("role","status"),i.setAttribute("aria-live","polite"),i.setAttribute("aria-hidden","true"),i.innerHTML=`
      <div class="studio-artist-manage-busy__panel">
        <div class="studio-artist-manage-busy__spinner" aria-hidden="true"></div>
        <p class="studio-artist-manage-busy__message">Working…</p>
      </div>`;const o=e.querySelector(".studio-artist-manage-shell");return o instanceof HTMLElement?(o.style.position||(o.style.position="relative"),o.appendChild(i)):e instanceof HTMLElement&&(e.style.position||(e.style.position="relative"),e.appendChild(i)),Kn.set(e,i),i}const sp=["#studio-art-form-save","#studio-art-translate-to-new-world","#studio-art-new-world-from-base","#studio-art-cancel","#studio-art-delete","#studio-art-exit-manage"];function Xe(e,s,i="Working…"){const o=ep(e),n=o.querySelector(".studio-artist-manage-busy__message");n&&(n.textContent=i),o.hidden=!s,o.setAttribute("aria-hidden",s?"false":"true"),o.classList.toggle("is-active",s);for(const a of sp){const r=e.querySelector(a);r instanceof HTMLButtonElement&&(r.disabled=s)}}function ip(e){const s=[];let i=[],o="",n=0,a=!1;for(;n<e.length;){const r=e[n];if(a){if(r==='"'){if(e[n+1]==='"'){o+='"',n+=2;continue}a=!1,n+=1;continue}o+=r,n+=1;continue}if(r==='"'){a=!0,n+=1;continue}if(r===","){i.push(o),o="",n+=1;continue}if(r==="\r"){n+=1;continue}if(r===`
`){i.push(o),s.push(i),i=[],o="",n+=1;continue}o+=r,n+=1}return i.push(o),(i.length>1||i.length===1&&i[0]!=="")&&s.push(i),s}function op(e){const s=ip(e.trim());if(s.length<2)return[];const i=s[0].map(u=>u.trim().toLowerCase()),o=i.findIndex(u=>u==="email"),n=i.findIndex(u=>u==="category"),a=i.findIndex(u=>u==="fullname"||u==="name"),r=i.findIndex(u=>u==="intent"),l=i.findIndex(u=>u==="timestamp"),d=i.findIndex(u=>u==="resendsegmentids"||u==="audiences"||u==="resend_segment_ids");if(o<0)return[];const p=[];for(let u=1;u<s.length;u++){const c=s[u],m=(c[o]||"").trim();if(!m)continue;const b=d>=0?(c[d]||"").trim():"",C=b?b.split(/[;,]/).map(w=>w.trim()).filter(Boolean):[];p.push({email:m,category:n>=0?(c[n]||"").trim():"",fullName:a>=0?(c[a]||"").trim():"",intent:r>=0?(c[r]||"").trim():"",timestamp:l>=0?(c[l]||"").trim():new Date().toISOString(),audiences:C})}return p}function zn(e){if(e==null)return"";if(typeof e=="object"){if(Array.isArray(e)){if(e.length===0)return""}else if(Object.keys(e).length===0)return""}try{return JSON.stringify(e,null,2)}catch{return String(e)}}function Yn(e,s){var o;const i=((o=e.split(`
`)[0])==null?void 0:o.trim())||e;switch(s){case"program":return{focus:i,description:e};case"edition":return{title:i,alt:i,description:e};case"journal":return{title:i,description:e,cta:"Read Entry",imageAlt:i};default:return{title:i,description:e}}}function Qn(e,s="generic"){const i=String(e??"").trim();if(!i)return{};try{const o=JSON.parse(i);return o!==null&&typeof o=="object"&&!Array.isArray(o)?o:Yn(i,s)}catch{return Yn(i,s)}}const ss=`<p style="margin:0 0 14px;font-size:15px;line-height:1.45">— Fusion Team</p>
<p style="margin:0 0 16px"><img src="https://fusionart.world/email/Fusion-Logo-Sig-1.png" alt="Fusion" width="120" height="auto" style="display:block;max-width:100%;height:auto;border:0" /></p>
<p style="margin:0 0 10px"><a href="https://www.fusionart.world" style="color:#111;text-decoration:underline">Fusion Art World</a></p>
<p style="margin:0;font-size:14px;line-height:1.5;color:#3f3f3f">IG: @fusion_intl | TT: @fusion_intl | YT: @fusionartworld</p>`,Xn=12e3,np="This layout is sent as HTML from the selected template (same list as Studio → Email). Edit templates there if needed.",ap="Templated blasts use each template’s own layout and footer — the signature block below applies only to custom plain-text messages.";function Zn(e){const s=e==null?void 0:e.filter;if(!s||typeof s!="object")return[];const i=s,o=i.cohortYears??i.cohort_years;if(Array.isArray(o)&&o.length)return o.map(a=>Math.floor(Number(a))).filter(a=>Number.isFinite(a)&&a>1900&&a<2100);const n=Math.max(0,Math.floor(Number(i.cohortYear??i.cohort_year??0)));return n>0?[n]:[]}function Ze(e){var i;const s=(i=e==null?void 0:e.locales)==null?void 0:i.en;return s&&typeof s=="object"&&s.name!=null&&String(s.name).trim()?String(s.name).trim():String((e==null?void 0:e.slug)||(e==null?void 0:e.id)||"").trim()||"—"}function rp(e){return String((e==null?void 0:e.contactEmail)??"").trim().toLowerCase().includes("@")}function Si(e){return String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;")}function Ji(e){return String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function lp(e){return`<div style="font-size:15px;line-height:1.55;color:#0f172a;white-space:pre-wrap;word-wrap:break-word">${Ji(e)}</div>`}function dp(e){var yt,K,et,Y,st,B;const{getArtistsRows:s,onRefresh:i}=e,n=`
<p class="studio-muted" style="margin:0 0 0.75rem">Only send to artists who have agreed to be contacted. Staff are responsible for compliance with applicable law.</p>
<div class="studio-send-blast-toolbar">
  <label class="studio-field studio-field--grow"><span>Search</span>
    <input type="search" class="studio-input" id="studio-send-blast-search" placeholder="Slug, id, name…" autocomplete="off" /></label>
  <div class="studio-field" id="studio-send-blast-cohort-wrap"><span>Cohort years</span>
    <div class="studio-send-blast-cohort" id="studio-send-blast-cohorts"></div>
  </div>
  <div class="studio-send-blast-actions">
    <button type="button" class="studio-btn-ghost" id="studio-send-blast-select-visible">Select all (visible)</button>
    <button type="button" class="studio-btn-ghost" id="studio-send-blast-clear">Clear selection</button>
  </div>
</div>
<div class="studio-send-blast-pills" id="studio-send-blast-pills" role="group" aria-label="Artists"></div>
<p class="studio-muted" id="studio-send-blast-overview" style="margin:0.5rem 0">Loading…</p>
<label class="studio-field" style="margin-top:0.5rem"><span>Subject</span>
  <input type="text" class="studio-input" id="studio-send-blast-subject" maxlength="998" placeholder="Email subject" /></label>
<label class="studio-field"><span>Template</span>
  <select class="studio-input" id="studio-send-blast-template">${'<option value="">— Custom message (plain text) —</option>'+Object.keys(Ge).map(P=>`<option value="${Si(P)}">${Ji(Ge[P].name)}</option>`).join("")}</select>
</label>
<p class="studio-muted" id="studio-send-blast-template-note" style="margin:-0.35rem 0 0.5rem">${Ji(ap)}</p>
<label class="studio-field"><span id="studio-send-blast-body-label">Message (plain text — line breaks kept)</span>
  <textarea class="studio-textarea studio-send-blast-body" id="studio-send-blast-body" rows="8" spellcheck="true" placeholder="Write your message…"></textarea></label>
<div class="studio-modal-fields-row studio-send-blast-llm-wrap" id="studio-send-blast-llm-wrap" style="align-items:flex-end;flex-wrap:wrap;gap:0.5rem">
  <label class="studio-field"><span>Quick draft tone</span>
    <select class="studio-input" id="studio-send-blast-tone">
      <option value="Professional and warm">Professional and warm</option>
      <option value="Short and direct">Short and direct</option>
      <option value="Friendly and encouraging">Friendly and encouraging</option>
      <option value="Formal">Formal</option>
    </select>
  </label>
  <button type="button" class="studio-btn-secondary" id="studio-send-blast-llm">Quick draft</button>
</div>
<div class="studio-field studio-send-blast-sig-block" id="studio-send-blast-sig-block">
  <div class="studio-send-blast-sig-row">
    <span>Signature</span>
    <button type="button" class="studio-btn-ghost" id="studio-send-blast-sig-toggle" aria-expanded="false">Edit signature</button>
  </div>
  <div id="studio-send-blast-sig-preview" class="studio-send-blast-sig-preview" aria-hidden="false"></div>
  <div id="studio-send-blast-sig-editor" class="studio-send-blast-sig-editor" hidden>
    <label class="studio-field" style="margin-bottom:0.5rem"><span class="studio-muted">HTML (appended after the message)</span>
      <textarea class="studio-textarea" id="studio-send-blast-sig" rows="8" spellcheck="false"></textarea>
    </label>
    <button type="button" class="studio-btn-secondary" id="studio-send-blast-sig-done">Done editing</button>
  </div>
</div>
<div class="studio-modal-fields-row" style="align-items:flex-end;flex-wrap:wrap;gap:0.5rem">
  <label class="studio-field studio-field--grow"><span>Send test to</span>
    <input type="email" class="studio-input" id="studio-send-blast-test-to" placeholder="you@org.com" autocomplete="email" /></label>
  <button type="button" class="studio-btn-secondary" id="studio-send-blast-test">Send test</button>
</div>
<div class="studio-send-blast-footer">
  <p id="studio-send-blast-status" class="studio-send-blast-foot-status" role="status" aria-live="polite"></p>
  <div class="studio-modal-actions studio-modal-actions--send-blast">
    <button type="button" class="studio-btn-primary" id="studio-send-blast-send" disabled>Send now (batch)</button>
    <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Close</button>
  </div>
</div>`,{close:a,root:r}=qt(n,{title:"Send blast",wide:!0}),l=r.querySelector("#studio-send-blast-sig"),d=r.querySelector("#studio-send-blast-sig-preview"),p=r.querySelector("#studio-send-blast-sig-editor"),u=r.querySelector("#studio-send-blast-sig-toggle"),c=r.querySelector("#studio-send-blast-sig-done");l instanceof HTMLTextAreaElement&&(l.value=ss);let m=ss;const b=()=>{if(!(d instanceof HTMLElement))return;const P=l instanceof HTMLTextAreaElement?l.value:"";d.innerHTML=P.trim()||'<p class="studio-muted">(empty signature)</p>'},C=P=>{p instanceof HTMLElement&&(p.hidden=!P),d instanceof HTMLElement&&(d.hidden=P),u instanceof HTMLButtonElement&&(u.setAttribute("aria-expanded",P?"true":"false"),u.textContent=P?"Cancel":"Edit signature"),d instanceof HTMLElement&&d.setAttribute("aria-hidden",P?"true":"false"),P&&l instanceof HTMLTextAreaElement&&queueMicrotask(()=>l.focus())};b(),u==null||u.addEventListener("click",()=>{p instanceof HTMLElement&&!p.hidden?(l instanceof HTMLTextAreaElement&&(l.value=m),b(),C(!1)):(m=l instanceof HTMLTextAreaElement?l.value:m,C(!0))}),c==null||c.addEventListener("click",()=>{l instanceof HTMLTextAreaElement&&(m=l.value),b(),C(!1)});const w=r.querySelector("#studio-send-blast-pills"),L=r.querySelector("#studio-send-blast-overview"),A=r.querySelector("#studio-send-blast-search"),g=r.querySelector("#studio-send-blast-cohorts"),f=r.querySelector("#studio-send-blast-subject"),v=r.querySelector("#studio-send-blast-body"),E=r.querySelector("#studio-send-blast-template"),j=r.querySelector("#studio-send-blast-template-note"),M=r.querySelector("#studio-send-blast-body-label"),S=r.querySelector("#studio-send-blast-llm-wrap"),h=r.querySelector("#studio-send-blast-sig-block"),T=r.querySelector("#studio-send-blast-test-to"),N=r.querySelector("#studio-send-blast-status"),O=r.querySelector("#studio-send-blast-send");let G="",V="";const at=()=>E instanceof HTMLSelectElement?E.value.trim():"",tt=()=>{const P=at(),k=P?Me(P):null,J=V;V=P,v instanceof HTMLTextAreaElement&&(P?(J||(G=v.value),k&&f instanceof HTMLInputElement&&(f.value=k.defaultSubject),v.value=np,v.disabled=!0,v.readOnly=!0,v.placeholder="",M&&(M.textContent="Message (HTML template — not editable here)"),S instanceof HTMLElement&&(S.hidden=!0),h instanceof HTMLElement&&(h.hidden=!0),j instanceof HTMLElement&&(j.style.display="none")):(J&&(v.value=G),v.disabled=!1,v.readOnly=!1,v.placeholder="Write your message…",M&&(M.textContent="Message (plain text — line breaks kept)"),S instanceof HTMLElement&&(S.hidden=!1),h instanceof HTMLElement&&(h.hidden=!1),j instanceof HTMLElement&&(j.style.display="")))};E==null||E.addEventListener("change",()=>{tt()}),tt();let z=[];const F=new Set,I=new Set,y=P=>{N&&(N.textContent=P||"")},_=(P,k)=>{P&&(k?(P.setAttribute("aria-busy","true"),P.disabled=!0):(P.setAttribute("aria-busy","false"),P.disabled=!1))},$=(P,k)=>{P.classList.add("studio-btn--async-ok"),k&&(P.textContent=k),window.setTimeout(()=>{P.classList.remove("studio-btn--async-ok")},1600)},H=()=>{const P=v instanceof HTMLTextAreaElement?v.value:"",k=lp(P),W=(l instanceof HTMLTextAreaElement?l.value:"").trim();return W?`${k}<div style="margin:36px 0 0;padding:40px 0 0;border-top:1px solid #e5e2df">${W}</div>`:k},R=P=>{const k=at(),J=k?Me(k):null;if(!J)return H();const W=P?Ze(P):"Artist",Z=P?String(P.accessCode??"").trim():"00000000";return Pn(J.bodyHtml,{artistName:W,accessCode:Z})},x=()=>{for(const P of z)if(F.has(String(P.id??"").trim()))return P;return null},q=()=>{if(O instanceof HTMLButtonElement){if(Ct()!=="live"){O.disabled=!0,O.title="Switch to live data to send email.";return}O.disabled=!1,O.title=""}},X=P=>{const k=new Set;for(const J of P)for(const W of Zn(J))k.add(W);return Array.from(k).sort((J,W)=>J-W)},ot=P=>{if(I.size===0)return!0;const k=Zn(P);return k.length===0?!1:k.some(J=>I.has(J))},gt=()=>{const P=(A instanceof HTMLInputElement?A.value:"").trim().toLowerCase();return z.filter(k=>{if(!ot(k))return!1;if(!P)return!0;const J=Ze(k).toLowerCase();return`${k.slug} ${k.id} ${k.visibility} ${k.mostRecentProgram??""} ${k.contactEmail??""} ${J}`.toLowerCase().includes(P)})},Lt=()=>{if(!L)return;const P=gt(),k=P.filter(ct=>F.has(String(ct.id))).length,J=I.size===0?"all cohorts":`cohort ${[...I].sort((ct,pt)=>ct-pt).join(", ")}`,W=(A instanceof HTMLInputElement?A.value:"").trim(),Z=W?`search “${W}”`:"no search";z.length===0?L.textContent="No artists with a contact email in their roster profile match this list.":L.textContent=`${k} of ${P.length} visible selected (${J}, ${Z}).`},bt=()=>{if(!w)return;const P=gt();w.innerHTML=P.map(k=>{const J=String(k.id??"").trim(),W=Si(Ze(k)),Z=F.has(J);return`<button type="button" class="studio-send-blast-pill${Z?" studio-send-blast-pill--selected":""}" data-artist-id="${Si(J)}" aria-pressed="${Z?"true":"false"}">${W}</button>`}).join(""),w.querySelectorAll("button[data-artist-id]").forEach(k=>{k.addEventListener("click",()=>{const J=k.getAttribute("data-artist-id");J&&(F.has(J)?F.delete(J):F.add(J),k.classList.toggle("studio-send-blast-pill--selected",F.has(J)),k.setAttribute("aria-pressed",F.has(J)?"true":"false"),Lt())})}),Lt()},wt=()=>{if(!g)return;const P=X(z);if(!P.length){g.innerHTML='<span class="studio-muted">—</span>';return}g.innerHTML=P.map(k=>`<label class="studio-send-blast-cohort-label"><input type="checkbox" class="studio-send-blast-cohort-cb" value="${k}" /> ${k}</label>`).join(""),g.querySelectorAll(".studio-send-blast-cohort-cb").forEach(k=>{k.addEventListener("change",()=>{I.clear(),g.querySelectorAll(".studio-send-blast-cohort-cb").forEach(J=>{J instanceof HTMLInputElement&&J.checked&&I.add(Math.floor(Number(J.value)))}),bt(),q()})})};(async()=>{if(Ct()!=="live"){L&&(L.textContent="Send blast requires Live data and Integration API (Resend). Switch data source in Studio or use test emails only in a local integration stack."),O instanceof HTMLButtonElement&&(O.disabled=!0);return}try{const P=await s();z=(Array.isArray(P)?P:[]).filter(rp)}catch(P){L&&(L.textContent=P instanceof Error?P.message:String(P));return}wt(),bt(),q()})(),A==null||A.addEventListener("input",()=>{bt()}),(yt=r.querySelector("#studio-send-blast-select-visible"))==null||yt.addEventListener("click",()=>{for(const P of gt())F.add(String(P.id));bt()}),(K=r.querySelector("#studio-send-blast-clear"))==null||K.addEventListener("click",()=>{F.clear(),bt()});const _t=r.querySelector("#studio-send-blast-llm"),At=_t instanceof HTMLButtonElement&&((et=_t.textContent)!=null&&et.trim())?_t.textContent.trim():"Quick draft";(Y=r.querySelector("#studio-send-blast-llm"))==null||Y.addEventListener("click",async()=>{var pt;if(!(v instanceof HTMLTextAreaElement))return;if(at()){alert("Quick draft applies to custom plain-text messages only. Clear the template to use it.");return}const P=r.querySelector("#studio-send-blast-llm"),k=(r.querySelector("#studio-send-blast-tone")instanceof HTMLSelectElement?(pt=r.querySelector("#studio-send-blast-tone"))==null?void 0:pt.value:"")||"Professional and warm",J=v.value,W=`Quick draft for a staff email to artists. Tone: ${k}. Output plain text only — no HTML, no markdown, no code fences. Use line breaks between paragraphs. Keep a single clear call to action.`;if(W.length+J.length>Xn){alert(`Prompt + body exceeds ${Xn} characters (canister limit). Shorten the body.`);return}P instanceof HTMLButtonElement&&_(P,!0),y("Quick draft: working…");let ct=!1;try{const ft=await re(W,J,"en");v.value=ft.trim(),ct=!0,y("Quick draft: done. Message was updated below.")}catch(ft){alert(ft instanceof Error?ft.message:String(ft)),y("")}finally{P instanceof HTMLButtonElement&&(_(P,!1),ct&&($(P,"Done"),window.setTimeout(()=>{P.textContent==="Done"&&(P.textContent=At)},1600)))}});const nt=r.querySelector("#studio-send-blast-test"),dt=nt instanceof HTMLButtonElement&&((st=nt.textContent)!=null&&st.trim())?nt.textContent.trim():"Send test";(B=r.querySelector("#studio-send-blast-test"))==null||B.addEventListener("click",async()=>{const P=r.querySelector("#studio-send-blast-test"),k=T instanceof HTMLInputElement?T.value.trim():"";if(!k.includes("@")){alert("Enter a valid test recipient email.");return}const J=f instanceof HTMLInputElement?f.value.trim():"";if(!J){alert("Subject is required.");return}P instanceof HTMLButtonElement&&_(P,!0),y("Test email: sending…");let W=!1;try{const Z=at(),ct=x(),pt=Z?R(ct):H();await He({to:k,subject:J,html:pt}),W=!0;const ft=Z&&!ct?" (sample placeholders — select an artist for name/code preview.)":Z&&ct?` (sample: ${Ze(ct)}.)`:"";y(`Test email: sent to ${k}.${ft}`)}catch(Z){alert(Z instanceof Error?Z.message:String(Z)),y("")}finally{P instanceof HTMLButtonElement&&(_(P,!1),W&&($(P,"Sent"),window.setTimeout(()=>{P.textContent==="Sent"&&(P.textContent=dt)},1600)))}}),O==null||O.addEventListener("click",async()=>{if(!(O instanceof HTMLButtonElement)||!f||!v)return;if(Ct()!=="live"){alert("Use Live data to send.");return}const P=f instanceof HTMLInputElement?f.value.trim():"";if(!P){alert("Subject is required.");return}const k=at(),J=k?Me(k):null,W=[],Z=new Set;for(const ft of z){if(!F.has(String(ft.id)))continue;const It=String(ft.contactEmail??"").trim().toLowerCase();It.includes("@")&&(Z.has(It)||(Z.add(It),W.push({row:ft,to:It})))}if(!W.length){alert("No selected artists with a valid contact email.");return}let ct=[],pt=[];if(J){const ft=J.requiresRosterPlaceholders===!0;pt=[];for(const It of W){const Ft=String(It.row.accessCode??"").trim();if(ft&&!/^\d{8}$/.test(Ft)){pt.push(Ze(It.row));continue}const Ht=Pn(J.bodyHtml,{artistName:Ze(It.row),accessCode:Ft});ct.push({to:It.to,subject:P,html:Ht})}if(!ct.length){alert(ft?"No recipients with a valid 8-digit roster access code. Generate codes in Artists → Manage, or pick another template.":"No messages to send.");return}pt.length&&y(`Skipped ${pt.length} without 8-digit access code: ${pt.slice(0,8).join(", ")}${pt.length>8?"…":""}. Sending ${ct.length}…`)}else{const ft=H();ct=W.map(It=>({to:It.to,subject:P,html:ft}))}O.disabled=!0,(!J||!pt.length)&&y(`Sending ${ct.length} message(s)…`);try{const ft=await Ra(ct),It=(ft==null?void 0:ft.okCount)??(ft==null?void 0:ft.ok)??0,Ft=(ft==null?void 0:ft.failCount)??(ft==null?void 0:ft.failed)??0,Ht=J!=null&&J.requiresRosterPlaceholders&&pt.length?` Skipped (no code): ${pt.length}.`:"";y(`Done. Ok: ${It}, failed: ${Ft}.${Ht}`),i&&await i()}catch(ft){alert(ft instanceof Error?ft.message:String(ft)),y("")}finally{O.disabled=!1,q()}})}const ta=12e3,cp="fusion-studio-individual-email-draft:";function wi(e){return cp+String(e||"").trim()}function up(e){var i;const s=(i=e==null?void 0:e.locales)==null?void 0:i.en;return s&&typeof s=="object"&&s.name!=null&&String(s.name).trim()?String(s.name).trim():String((e==null?void 0:e.slug)||(e==null?void 0:e.id)||"").trim()||"—"}function ms(e){return String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function pp(e){return`<div style="font-size:15px;line-height:1.55;color:#0f172a;white-space:pre-wrap;word-wrap:break-word">${ms(e)}</div>`}function br(e,s={}){var y,_;const{onSent:i}=s,o=String((e==null?void 0:e.id)??"").trim(),n=String((e==null?void 0:e.contactEmail)??"").trim(),a=n.toLowerCase().includes("@"),r=up(e),l=String((e==null?void 0:e.slug)??"").trim(),d="Email artist",p=`
<div class="studio-individual-email">
  <p class="studio-muted" style="margin:0 0 0.75rem">
    <strong>${ms(r)}</strong> · <span class="studio-td-ellipsis" style="display:inline-block;max-width:12rem;vertical-align:bottom" title="${ms(l)}">${ms(l||"—")}</span>
    <br />
    <span class="studio-individual-email__to">To: ${a?ms(n):"No contact email on file"}</span>
  </p>
  <p class="studio-banner studio-banner--info" style="margin:0 0 0.75rem">Staff are responsible for compliance. Sending uses the same Integration API as Send blast (Resend path).</p>
  <div class="studio-individual-email__drafts studio-modal-fields-row" style="flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;align-items:center">
    <button type="button" class="studio-btn-ghost" id="studio-ie-load-draft">Load draft</button>
    <button type="button" class="studio-btn-secondary" id="studio-ie-save-draft">Save draft</button>
    <button type="button" class="studio-btn-ghost" id="studio-ie-delete-draft" disabled>Delete draft</button>
  </div>
  <label class="studio-field" style="margin-top:0"><span>Subject</span>
    <input type="text" class="studio-input" id="studio-ie-subject" maxlength="998" placeholder="Email subject" /></label>
  <label class="studio-field"><span>Message (plain text — line breaks kept)</span>
    <textarea class="studio-textarea studio-individual-email__body" id="studio-ie-body" rows="7" spellcheck="true" placeholder="Write your message…"></textarea></label>
  <div class="studio-modal-fields-row" style="align-items:flex-end;flex-wrap:wrap;gap:0.5rem">
    <label class="studio-field"><span>Quick draft tone</span>
      <select class="studio-input" id="studio-ie-tone">
        <option value="Professional and warm">Professional and warm</option>
        <option value="Short and direct">Short and direct</option>
        <option value="Friendly and encouraging">Friendly and encouraging</option>
        <option value="Formal">Formal</option>
      </select>
    </label>
    <button type="button" class="studio-btn-secondary" id="studio-ie-llm">Quick draft</button>
  </div>
  <div class="studio-field studio-send-blast-sig-block">
    <div class="studio-send-blast-sig-row">
      <span>Signature</span>
      <button type="button" class="studio-btn-ghost" id="studio-ie-sig-toggle" aria-expanded="false">Edit signature</button>
    </div>
    <div id="studio-ie-sig-preview" class="studio-send-blast-sig-preview" aria-hidden="false"></div>
    <div id="studio-ie-sig-editor" class="studio-send-blast-sig-editor" hidden>
      <label class="studio-field" style="margin-bottom:0.5rem"><span class="studio-muted">HTML (appended after the message)</span>
        <textarea class="studio-textarea" id="studio-ie-sig" rows="6" spellcheck="false"></textarea>
      </label>
      <button type="button" class="studio-btn-secondary" id="studio-ie-sig-done">Done editing</button>
    </div>
  </div>
  <div class="studio-modal-fields-row" style="align-items:flex-end;flex-wrap:wrap;gap:0.5rem">
    <label class="studio-field studio-field--grow"><span>Send test to</span>
      <input type="email" class="studio-input" id="studio-ie-test-to" placeholder="you@org.com" autocomplete="email" /></label>
    <button type="button" class="studio-btn-secondary" id="studio-ie-test">Send test</button>
  </div>
  <div class="studio-send-blast-footer">
    <p id="studio-ie-status" class="studio-send-blast-foot-status" role="status" aria-live="polite"></p>
    <div class="studio-modal-actions studio-modal-actions--send-blast">
      <button type="button" class="studio-btn-primary" id="studio-ie-send" disabled>Send now</button>
      <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Close</button>
    </div>
  </div>
</div>`,{root:u}=qt(p,{title:d,wide:!0}),c=u.querySelector("#studio-ie-subject"),m=u.querySelector("#studio-ie-body"),b=u.querySelector("#studio-ie-test-to"),C=u.querySelector("#studio-ie-status"),w=u.querySelector("#studio-ie-send"),L=u.querySelector("#studio-ie-sig"),A=u.querySelector("#studio-ie-sig-preview"),g=u.querySelector("#studio-ie-sig-editor"),f=u.querySelector("#studio-ie-sig-toggle"),v=u.querySelector("#studio-ie-sig-done"),E=u.querySelector("#studio-ie-save-draft"),j=u.querySelector("#studio-ie-load-draft"),M=u.querySelector("#studio-ie-delete-draft");L instanceof HTMLTextAreaElement&&(L.value=ss);let S=L instanceof HTMLTextAreaElement?L.value:ss;const h=$=>{C&&(C.textContent=$||"")},T=()=>{if(typeof localStorage>"u"||!o)return null;try{const $=localStorage.getItem(wi(o));if(!$)return null;const H=JSON.parse($);return!H||typeof H!="object"?null:H}catch{return null}},N=()=>{const $=m instanceof HTMLTextAreaElement?m.value:"",H=pp($),x=(L instanceof HTMLTextAreaElement?L.value:"").trim();return x?`${H}<div style="margin:36px 0 0;padding:40px 0 0;border-top:1px solid #e5e2df">${x}</div>`:H},O=()=>{if(!(A instanceof HTMLElement))return;const $=L instanceof HTMLTextAreaElement?L.value:"";A.innerHTML=$.trim()||'<p class="studio-muted">(empty signature)</p>'},G=$=>{g instanceof HTMLElement&&(g.hidden=!$),A instanceof HTMLElement&&(A.hidden=$),f instanceof HTMLButtonElement&&(f.setAttribute("aria-expanded",$?"true":"false"),f.textContent=$?"Cancel":"Edit signature"),A instanceof HTMLElement&&A.setAttribute("aria-hidden",$?"true":"false"),$&&L instanceof HTMLTextAreaElement&&queueMicrotask(()=>L.focus())},V=()=>{const $=!!T();M instanceof HTMLButtonElement&&(M.disabled=!$)},at=($,H)=>{$&&(H?($.setAttribute("aria-busy","true"),$.disabled=!0):($.setAttribute("aria-busy","false"),$.disabled=!1))},tt=($,H)=>{$&&($.classList.add("studio-btn--async-ok"),H&&($.textContent=H),window.setTimeout(()=>{$.classList.remove("studio-btn--async-ok")},1600))},z=()=>{if(w instanceof HTMLButtonElement){if(Ct()!=="live"){w.disabled=!0,w.title="Switch to live data to send to roster contact.";return}if(!a){w.disabled=!0,w.title="Add a contact email in Manage first.";return}w.disabled=!1,w.title=""}};O(),z(),V(),f==null||f.addEventListener("click",()=>{g instanceof HTMLElement&&!g.hidden?(L instanceof HTMLTextAreaElement&&(L.value=S),O(),G(!1)):(S=L instanceof HTMLTextAreaElement?L.value:S,G(!0))}),v==null||v.addEventListener("click",()=>{L instanceof HTMLTextAreaElement&&(S=L.value),O(),G(!1)}),E==null||E.addEventListener("click",()=>{if(typeof localStorage>"u"||!o)return;const $={subject:c instanceof HTMLInputElement?c.value:"",message:m instanceof HTMLTextAreaElement?m.value:"",signatureHtml:L instanceof HTMLTextAreaElement?L.value:"",savedAt:new Date().toISOString()};try{localStorage.setItem(wi(o),JSON.stringify($)),h("Draft saved locally."),V()}catch(H){h(H instanceof Error?H.message:String(H))}}),j==null||j.addEventListener("click",()=>{const $=T();if(!$){h("No saved draft for this artist.");return}if(c instanceof HTMLInputElement&&(c.value=String($.subject??"")),m instanceof HTMLTextAreaElement&&(m.value=String($.message??"")),L instanceof HTMLTextAreaElement){const H=String($.signatureHtml??"");L.value=H||ss,S=L.value}O(),h("Loaded draft from this browser."),V()}),M==null||M.addEventListener("click",()=>{typeof localStorage>"u"||!o||T()&&(localStorage.removeItem(wi(o)),c instanceof HTMLInputElement&&(c.value=""),m instanceof HTMLTextAreaElement&&(m.value=""),L instanceof HTMLTextAreaElement&&(L.value=ss,S=L.value),O(),h("Draft deleted."),V())});const F="Quick draft";(y=u.querySelector("#studio-ie-llm"))==null||y.addEventListener("click",async()=>{var X;if(!(m instanceof HTMLTextAreaElement))return;const $=u.querySelector("#studio-ie-llm"),H=(u.querySelector("#studio-ie-tone")instanceof HTMLSelectElement?(X=u.querySelector("#studio-ie-tone"))==null?void 0:X.value:"")||"Professional and warm",R=m.value,x=`Quick draft for a single staff email to an artist. Tone: ${H}. Output plain text only — no HTML, no markdown, no code fences. Use line breaks between paragraphs.`;if(x.length+R.length>ta){alert(`Prompt + body exceeds ${ta} characters. Shorten the message.`);return}$ instanceof HTMLButtonElement&&at($,!0),h("Quick draft: working…");let q=!1;try{const ot=await re(x,R,"en");m.value=ot.trim(),q=!0,h("Quick draft: message updated below.")}catch(ot){alert(ot instanceof Error?ot.message:String(ot)),h("")}finally{$ instanceof HTMLButtonElement&&(at($,!1),q&&(tt($,"Done"),window.setTimeout(()=>{$.textContent==="Done"&&F&&($.textContent=F)},1600)))}});const I="Send test";(_=u.querySelector("#studio-ie-test"))==null||_.addEventListener("click",async()=>{const $=u.querySelector("#studio-ie-test"),H=b instanceof HTMLInputElement?b.value.trim():"";if(!H.includes("@")){alert("Enter a valid test recipient email.");return}const R=c instanceof HTMLInputElement?c.value.trim():"";if(!R){alert("Subject is required.");return}$ instanceof HTMLButtonElement&&at($,!0),h("Test email: sending…");let x=!1;try{await He({to:H,subject:R,html:N()}),x=!0,h(`Test email: sent to ${H}.`)}catch(q){alert(q instanceof Error?q.message:String(q)),h("")}finally{$ instanceof HTMLButtonElement&&(at($,!1),x&&(tt($,"Sent"),window.setTimeout(()=>{$.textContent==="Sent"&&I&&($.textContent=I)},1600)))}}),w==null||w.addEventListener("click",async()=>{if(!(w instanceof HTMLButtonElement)||!c||!m)return;if(Ct()!=="live"){alert("Use Live data to send.");return}if(!a){alert("This artist has no contact email. Add it in Manage first.");return}const $=c instanceof HTMLInputElement?c.value.trim():"";if(!$){alert("Subject is required.");return}w.disabled=!0,h("Sending…");try{await He({to:n,subject:$,html:N()}),h(`Sent to ${n}.`),i&&await i()}catch(H){alert(H instanceof Error?H.message:String(H)),h("")}finally{z()}})}const Vi="FUSION_EC_META=";function mp(e){const s=String(e??""),i=s.indexOf(`
`),o=i>=0?s.slice(0,i):s;if(!o.startsWith(Vi))return{meta:null,humanNotes:s};try{const n=o.slice(Vi.length).trim(),a=JSON.parse(n),r=i>=0?s.slice(i+1).replace(/^\n/,""):"";return{meta:a,humanNotes:r}}catch{return{meta:null,humanNotes:s}}}function fp(e,s=""){const i=String(s??"").trim();if(!e||!e.templateId&&!e.source)return i;const o=`${Vi}${JSON.stringify(e)}`;return i?`${o}
${i}`:o}function ne(e){const s=String(e??"").trim();if(!s)return"";try{return Ws(s)||s}catch{return s}}function ii(e=[]){let s="",i="";for(const o of e){const n=ne(o);if(n){if(Bt(n)){s||(s=n);continue}return i||(i=n),{heroImageUrl:n,heroPosterUrl:""}}}return s?{heroImageUrl:s,heroPosterUrl:i}:{heroImageUrl:"",heroPosterUrl:""}}function bp(e){var m,b;const s=zi(e),i=ti(e,"en")||"Artist",o=String((e==null?void 0:e.slug)??"").trim(),n=ii([e==null?void 0:e.heroProfileImage,e==null?void 0:e.image,...Array.isArray(s==null?void 0:s.introGallery)?s.introGallery.map(C=>C==null?void 0:C.src):[]]),a=n.heroImageUrl,r=String(((m=s==null?void 0:s.world)==null?void 0:m.quote)??((b=s==null?void 0:s.wordsFromArtist)==null?void 0:b.body)??"").trim(),l=String((s==null?void 0:s.bio)??(s==null?void 0:s.bioLong)??"").trim(),d=String((s==null?void 0:s.discipline)??"").trim(),p=r?Mt(`“${r.replace(/"/g,"&quot;")}”`,"quote"):"",u=Mt(l?`${l.slice(0,480)}${l.length>480?"…":""}`:`Discover ${i}'s practice on Fusion.`,"last"),c=o?`https://www.fusionart.world/profile/${encodeURIComponent(o)}`:"https://www.fusionart.world/artists";return{eyebrow:"Artist Spotlight",heroImageUrl:a,heroPosterUrl:n.heroPosterUrl,heroAlt:i,pillLabel:d?d.toUpperCase():"FUSION ARTIST",headlineHtml:i.replace(/\s+/g,"<br>"),bodyHtml:`${p}${u}`,cta:{label:"VIEW PROFILE",href:c},subject:`${i} — Artist spotlight`,previewText:r||l.slice(0,160)||`Meet ${i} on Fusion.`}}function gr(e){const s=as(e),i=Ae(s.localesJson);return String(i.headlineEn??i.lineEn??s.overlayTitle??s.slug??"Video").trim()||"Video"}function gp(e){const s=as(e),i=Ae(s.localesJson),o=gr(s),n=String(i.kickerEn??"").trim(),a=String(i.lineEn??"").trim(),r=String(i.bodyEn??"").trim(),l=String(s.overlayGuests??"").trim(),d=String(s.overlayDuration??"").trim(),p=ii([s.posterUrl,s.imageUrl,s.previewVideoUrl,s.legacyVideoUrl]),u="https://www.fusionart.world/videos",c=[];if(r?c.push(Mt(`${r.slice(0,520)}${r.length>520?"…":""}`,"lead")):a&&c.push(Mt(a,"lead")),l){const m=d?`Featuring ${l} · ${d}`:`Featuring ${l}`;c.push(Mt(m,c.length?"last":"lead"))}return c.length||c.push(Mt("Watch the latest studio visit and conversation on Fusion.","lead")),c.length===1&&c.push(Mt("Watch the full video on fusionart.world.","last")),{eyebrow:n||"Fusion Video",heroImageUrl:p.heroImageUrl,heroPosterUrl:p.heroPosterUrl,heroAlt:o,pillLabel:n?n.toUpperCase():"FUSION VIDEO",headlineHtml:o.replace(/\s+/g,"<br>"),bodyHtml:c.join(`
`),cta:{label:"WATCH NOW",href:u},subject:o,previewText:a||r.slice(0,160)||`New video on Fusion: ${o}.`}}function yp(e){const s=e!=null&&e.en&&typeof e.en=="object"?e.en:{},i=String(s.title??"Journal entry").trim(),o=String(s.description??s.body??"").trim(),n=ii([e==null?void 0:e.imageSrc,s.imageSrc]),a=n.heroImageUrl,r=(e==null?void 0:e.id)!=null?String(e.id):"",d=String((e==null?void 0:e.link)??"").trim()||(r?`https://www.fusionart.world/journal/entry/${encodeURIComponent(r)}`:"https://www.fusionart.world/journal"),p=Mt(o?`${o.slice(0,520)}${o.length>520?"…":""}`:"Read the latest from the Fusion journal.","last");return{eyebrow:"Journal",heroImageUrl:a,heroPosterUrl:n.heroPosterUrl,heroAlt:i,pillLabel:"FUSION JOURNAL",headlineHtml:i.replace(/\s+/g,"<br>"),bodyHtml:p,cta:{label:"READ ENTRY",href:d},subject:i,previewText:o.slice(0,160)||"From the Fusion journal."}}function hp(e){var f,v,E;const s=e!=null&&e.enCard&&typeof e.enCard=="object"?e.enCard:e;String((e==null?void 0:e.id)??(s==null?void 0:s.id)??"").trim();const i=String((s==null?void 0:s.focus)??"Japan Artist Residency").trim(),o=String((s==null?void 0:s.location)??"").trim(),n=String((s==null?void 0:s.year)??"").trim(),a=String((s==null?void 0:s.startDate)??"").trim(),r=String((s==null?void 0:s.endDate)??"").trim(),l=[a,r,n].filter(Boolean).join(" · "),d=[o.split(",")[0]||i,n].filter(Boolean),p=d.join("<br>")||"Program Update",u=ne(s==null?void 0:s.heroMediaSrc),c=ne(s==null?void 0:s.imageSrc),m=Bt(u)?{heroImageUrl:u,heroPosterUrl:c&&!Bt(c)?c:""}:ii([s==null?void 0:s.heroMediaSrc,s==null?void 0:s.imageSrc,(v=(f=s==null?void 0:s.programPage)==null?void 0:f.fadeGalleryImages)==null?void 0:v[0]]),b=m.heroImageUrl,C=String((s==null?void 0:s.briefDescription)??((E=s==null?void 0:s.programPage)==null?void 0:E.description)??"").trim(),w=String((e==null?void 0:e.routeLink)??(s==null?void 0:s.routeLink)??"").trim(),L=w?w.startsWith("http")?w:`https://www.fusionart.world${w.startsWith("/")?w:`/${w}`}`:"https://www.fusionart.world/programs",A=Mt(C||`Applications and details for the ${i} program.`,"lead"),g=l?Mt(`<strong>Dates:</strong> ${l}`,"last"):"";return{eyebrow:"Program Update",heroImageUrl:b,heroPosterUrl:m.heroPosterUrl,heroAlt:o||i,pillLabel:i.toUpperCase().includes("RESIDENCY")?i.toUpperCase():"JAPAN ARTIST RESIDENCY",headlineHtml:p,bodyHtml:`${A}${g}`,cta:{label:"APPLY / LEARN MORE",href:L},subject:`${d[0]||"Fusion program"}${n?` (${n})`:""}`,previewText:C.slice(0,160)||`Program update: ${i}.`}}function mo(e,s=[],i=[],o=[],n=[]){const a=e==null?void 0:e.type,r=String((e==null?void 0:e.id)??"").trim();if(!a||!r)return null;if(a==="artist"){const l=s.find(d=>String((d==null?void 0:d.id)??"")===r||String((d==null?void 0:d.slug)??"")===r);return l?bp(l):null}if(a==="journal"){const l=i.find(d=>String((d==null?void 0:d.id)??"")===r);return l?yp(l):null}if(a==="program"){const l=o.find(d=>String((d==null?void 0:d.id)??"")===r);return l?hp(l):null}if(a==="video"){const l=n.find(d=>String(as(d).id)===r);return l?gp(l):null}return null}function vp(e,s){return e==="artist"?s.map(i=>({id:String((i==null?void 0:i.id)??(i==null?void 0:i.slug)??""),label:ti(i,"en")||String((i==null?void 0:i.slug)??"Artist"),thumb:ne(i==null?void 0:i.heroProfileImage)||ne(i==null?void 0:i.image)||""})).filter(i=>i.id):e==="journal"?s.map(i=>{const o=i!=null&&i.en&&typeof i.en=="object"?i.en:{};return{id:String((i==null?void 0:i.id)??""),label:String(o.title??`Entry ${(i==null?void 0:i.id)??""}`),thumb:ne((i==null?void 0:i.imageSrc)??o.imageSrc??"")}}).filter(i=>i.id):e==="program"?s.map(i=>{const o=i!=null&&i.enCard&&typeof i.enCard=="object"?i.enCard:i;return{id:String((i==null?void 0:i.id)??(o==null?void 0:o.id)??""),label:String((o==null?void 0:o.focus)??(o==null?void 0:o.location)??(i==null?void 0:i.id)??"Program"),thumb:ne((o==null?void 0:o.imageSrc)??(o==null?void 0:o.heroMediaSrc)??"")}}).filter(i=>i.id):e==="video"?s.map(i=>{const o=as(i),n=gr(o),a=o.visible===!1?" (hidden)":"";return{id:String(o.id),label:`${n}${a}`,thumb:ne(o.posterUrl)||ne(o.imageUrl)||""}}).filter(i=>i.id):[]}function Sp(e,s){const i=Me(e);return{subject:String(s.subject??(i==null?void 0:i.defaultSubject)??"").trim(),previewText:String(s.previewText??(i==null?void 0:i.defaultPreview)??"").trim().slice(0,200),bodyHtml:Be(s)}}function wp(e,s,i={}){if(!s)return null;const o=mo(s,i.artists||[],i.journals||[],i.programs||[],i.videos||[]);return o?Sp(e,o):null}function ea(e=[],s=[]){const i=new Map,o=(a,r,l)=>{const d=ne(a);!d||Bt(d)||i.has(d)||i.set(d,{url:d,label:String(r||"Image").trim(),group:l,thumb:d,kind:"image"})},n=(a,r,l,d="")=>{const p=ne(a);if(!p||!Bt(p)||i.has(p))return;const u=ne(d),c=u&&!Bt(u)?u:"";i.set(p,{url:p,label:String(r||"Video").trim(),group:l,thumb:c,kind:"video",posterUrl:c})};for(const a of e){const r=ti(a,"en")||"Artist";o(a==null?void 0:a.heroProfileImage,`${r} — hero profile`,"Artist media"),o(a==null?void 0:a.image,`${r} — card image`,"Artist media");const l=zi(a);(Array.isArray(l==null?void 0:l.introGallery)?l.introGallery:[]).forEach((p,u)=>{const c=p==null?void 0:p.src;Bt(c)?n(c,`${r} — gallery video ${u+1}`,"Artist media"):o(c,`${r} — gallery ${u+1}`,"Artist media")})}for(const a of s){const r=String((a==null?void 0:a.slug)??(a==null?void 0:a.id)??"Video"),l=ne(a==null?void 0:a.posterUrl),d=ne(a==null?void 0:a.imageUrl);l&&!Bt(l)&&o(l,`${r} — poster`,"Video posters"),d&&!Bt(d)&&o(d,`${r} — card image`,"Video posters"),n(a==null?void 0:a.previewVideoUrl,`${r} — preview`,"Videos",l),n(a==null?void 0:a.legacyVideoUrl,`${r} — full video`,"Videos",l)}return[...i.values()]}async function yr(){const[e,s,i,o]=await Promise.all([ke().catch(()=>[]),to().catch(()=>[]),We().catch(()=>[]),eo().catch(()=>[])]);return{artists:Array.isArray(e)?e:[],journals:Array.isArray(s)?s:[],programs:Array.isArray(i)?i:[],videos:Array.isArray(o)?o:[],media:ea(Array.isArray(e)?e:[],Array.isArray(o)?o:[]),images:ea(Array.isArray(e)?e:[],Array.isArray(o)?o:[])}}function Ep(e,s,i,o={},n={}){const a=Me(e);let r=null;s&&(r=mo(s,o.artists||[],o.journals||[],o.programs||[],o.videos||[]));const l=String(n.subject??"").trim(),d=String(n.previewText??"").trim(),p=!!n.isBranded,u=n.layoutSlots||null,c=String(n.rawBodyHtml??"").trim();return{templateId:e,templateName:(a==null?void 0:a.name)??"",defaultEyebrow:(a==null?void 0:a.defaultEyebrow)??"Program Update",userPrompt:String(i??"").trim().slice(0,2e3),task:"Reformat existingDraft into layout JSON slots. The app applies the Fusion email shell (logo, hero, borders, footer) using styleGuide — return text slots only. Preserve factual names, dates, and URLs from sourceFacts when present.",styleGuide:{canvas:Nt.canvas,textColor:Nt.text,ctaBackground:Nt.ctaBg,bodyLeadStyle:Nt.bodyLead,bodyStyle:Nt.body,bodyLastStyle:Nt.bodyLast,linkStyle:Nt.link,headlineNote:"Use headlineHtml for the h1 slot only (shell renders 44px black). Use pillLabel for the black pill.",bodyNote:"bodyHtml: <p> paragraphs only inside the bordered content block. First p lead, middle body, last bodyLast. Black text only. Links black underline. No CTA button in bodyHtml — use layout.cta."},existingDraft:{subject:l,previewText:d,isBranded:p,layoutSlots:u,bodyHtml:c},sourceFacts:r?{eyebrow:r.eyebrow,headlineHtml:r.headlineHtml,heroImageUrl:r.heroImageUrl,heroAlt:r.heroAlt,pillLabel:r.pillLabel,bodyHtml:r.bodyHtml,cta:r.cta,subject:r.subject,previewText:r.previewText}:null}}function Lp(e,s,i={}){var p,u,c,m,b,C;const o=Me(e),n=i.sourceSlots||null,a=i.editorSlots||{},r=w=>w!=null&&String(w).trim()!==""?String(w).trim():"",l=r(s.bodyHtml)||r(a.bodyHtml)||r(n==null?void 0:n.bodyHtml)||"",d=po(l);return{eyebrow:r(n==null?void 0:n.eyebrow)||r(s.eyebrow)||r(a.eyebrow)||(o==null?void 0:o.defaultEyebrow)||"Program Update",heroImageUrl:r(n==null?void 0:n.heroImageUrl)||r(a.heroImageUrl)||"",heroPosterUrl:r(n==null?void 0:n.heroPosterUrl)||r(a.heroPosterUrl)||"",heroAlt:r(n==null?void 0:n.heroAlt)||r(a.heroAlt)||"",pillLabel:r(s.pillLabel)||r(n==null?void 0:n.pillLabel)||r(a.pillLabel)||"",headlineHtml:r(n==null?void 0:n.headlineHtml)||r(s.headlineHtml)||r(a.headlineHtml)||"",bodyHtml:d,footnote:r(s.footnote)||r(a.footnote)||"",cta:{label:r((p=n==null?void 0:n.cta)==null?void 0:p.label)||r((u=s.cta)==null?void 0:u.label)||r((c=a.cta)==null?void 0:c.label)||"",href:r((m=n==null?void 0:n.cta)==null?void 0:m.href)||r((b=s.cta)==null?void 0:b.href)||r((C=a.cta)==null?void 0:C.href)||"https://www.fusionart.world"},subject:r(s.subject)||r(n==null?void 0:n.subject)||r(a.subject)||(o==null?void 0:o.defaultSubject)||"",previewText:r(s.previewText)||r(n==null?void 0:n.previewText)||r(a.previewText)||(o==null?void 0:o.defaultPreview)||""}}function Tp(e){const s=String(e??"").trim();if(!s)return null;const i=r=>r.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/i,"").trim(),o=r=>{try{return JSON.parse(r)}catch{return null}};let n=o(i(s));if(!n){const r=i(s).match(/\{[\s\S]*\}/);r&&(n=o(r[0]))}if(!n||typeof n!="object")return null;const a=n.layout&&typeof n.layout=="object"?n.layout:{};return{subject:n.subject!=null?String(n.subject):void 0,previewText:n.previewText!=null?String(n.previewText):void 0,layout:{eyebrow:a.eyebrow!=null?String(a.eyebrow):void 0,pillLabel:a.pillLabel!=null?String(a.pillLabel):void 0,headlineHtml:a.headlineHtml!=null?String(a.headlineHtml):void 0,bodyHtml:a.bodyHtml!=null?String(a.bodyHtml):void 0,footnote:a.footnote!=null?String(a.footnote):void 0,cta:a.cta&&typeof a.cta=="object"?{label:a.cta.label!=null?String(a.cta.label):void 0,href:a.cta.href!=null?String(a.cta.href):void 0}:void 0}}}function Ue(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;")}function Ap(e){const s=e.placement==="hero"?"hero":"inline",i=String(e.alt??"").trim(),o=String(e.posterUrl??"").trim();return s==="hero"?dr(e.url,i,o):du(e.url,i,o)}async function kp(e={}){var w,L,A;let s=Array.isArray(e.media)?e.media:Array.isArray(e.images)?e.images:[];if(!s.length){const g=await yr();s=g.media||g.images||[]}const{close:i,root:o}=qt(`<div class="studio-ec-media" data-ec-media-root>
      <div class="studio-ec-media__tabs" role="tablist">
        <button type="button" class="studio-ec-media__tab is-active" data-tab="library">Library</button>
        <button type="button" class="studio-ec-media__tab" data-tab="upload">Upload</button>
        <button type="button" class="studio-ec-media__tab" data-tab="url">URL</button>
      </div>
      <div class="studio-ec-media__panel" data-panel="library">
        <label class="studio-field">
          <span>Search</span>
          <input type="search" class="studio-input" id="ec-media-search" placeholder="Filter by label…" />
        </label>
        <div class="studio-ec-media__grid" id="ec-media-grid" role="listbox"></div>
        <p class="studio-muted studio-ec-media__empty" id="ec-media-empty" hidden>No media in library. Upload or paste a URL.</p>
      </div>
      <div class="studio-ec-media__panel" data-panel="upload" hidden>
        <p class="studio-muted">Upload an image or video to Fusion storage (live mode).</p>
        <label class="studio-file-label studio-btn-secondary">
          Choose file
          <input type="file" id="ec-media-upload" accept="image/*,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" class="studio-sr-only" />
        </label>
        <p class="studio-muted" id="ec-media-upload-status"></p>
      </div>
      <div class="studio-ec-media__panel" data-panel="url" hidden>
        <label class="studio-field">
          <span>Image or video URL</span>
          <input type="url" class="studio-input" id="ec-media-url" placeholder="https://cdn.fusionart.world/…" />
        </label>
        <button type="button" class="studio-btn-secondary" id="ec-media-url-use">Use URL</button>
      </div>
      <div class="studio-ec-media__insert">
        <label class="studio-field">
          <span>Alt text</span>
          <input type="text" class="studio-input" id="ec-media-alt" placeholder="Describe the media" />
        </label>
        <fieldset class="studio-ec-media__placement">
          <legend class="studio-sr-only">Placement</legend>
          <label><input type="radio" name="ec-media-placement" value="inline" checked /> Inline</label>
          <label><input type="radio" name="ec-media-placement" value="hero" /> Hero (centered)</label>
        </fieldset>
        <p class="studio-modal-actions" style="display:flex;gap:0.5rem;justify-content:flex-end;margin-top:0.75rem;flex-wrap:wrap">
          <button type="button" class="studio-btn-ghost" id="ec-media-cancel">Cancel</button>
          <button type="button" class="studio-btn-primary" id="ec-media-insert" disabled>Insert media</button>
        </p>
      </div>
    </div>`,{title:"Insert media",wide:!0});let n="",a="",r="image";const l=o.querySelector("#ec-media-grid"),d=o.querySelector("#ec-media-empty"),p=o.querySelector("#ec-media-insert"),u=o.querySelector("#ec-media-alt"),c=o.querySelector("#ec-media-search"),m=g=>{const f=String(g.thumb||"").trim();return f&&!Bt(f)?`background-image:url('${Ue(f)}')`:g.kind==="video"||Bt(g.url)?"background:#111111":`background-image:url('${Ue(g.url)}')`},b=(g="")=>{if(!(l instanceof HTMLElement))return;const f=g.trim().toLowerCase(),v=s.filter(E=>!f||E.label.toLowerCase().includes(f)||E.group.toLowerCase().includes(f));d instanceof HTMLElement&&(d.hidden=v.length>0),l.innerHTML=v.map(E=>{const j=E.kind==="video"||Bt(E.url);return`<button type="button" class="studio-ec-media__item${n===E.url?" is-selected":""}${j?" is-video":""}" data-url="${Ue(E.url)}" data-label="${Ue(E.label)}" data-kind="${j?"video":"image"}" data-poster="${Ue(E.posterUrl||E.thumb||"")}" role="option">
          <span class="studio-ec-media__thumb" style="${m({...E,kind:j?"video":"image"})}">${j?'<span class="studio-ec-media__play" aria-hidden="true">▶</span>':""}</span>
          <span class="studio-ec-media__label">${Ue(E.label)}</span>
          <span class="studio-ec-media__group">${Ue(E.group)}</span>
        </button>`}).join("")},C=(g,f="",v="image",E="")=>{n=String(g||"").trim(),r=v==="video"||Bt(n)?"video":"image",a=r==="video"&&E&&!Bt(E)?E:"",p instanceof HTMLButtonElement&&(p.disabled=!n),u instanceof HTMLInputElement&&f&&!u.value.trim()&&(u.value=f),b(c instanceof HTMLInputElement?c.value:"")};b(),o.querySelectorAll(".studio-ec-media__tab").forEach(g=>{g.addEventListener("click",()=>{const f=g.getAttribute("data-tab");o.querySelectorAll(".studio-ec-media__tab").forEach(v=>{v.classList.toggle("is-active",v===g)}),o.querySelectorAll(".studio-ec-media__panel").forEach(v=>{const E=v.getAttribute("data-panel")===f;v.toggleAttribute("hidden",!E)})})}),l==null||l.addEventListener("click",g=>{var v,E;const f=(E=(v=g.target)==null?void 0:v.closest)==null?void 0:E.call(v,"[data-url]");f&&C(f.getAttribute("data-url")||"",f.getAttribute("data-label")||"",f.getAttribute("data-kind")||"image",f.getAttribute("data-poster")||"")}),c==null||c.addEventListener("input",()=>{b(c instanceof HTMLInputElement?c.value:"")}),(w=o.querySelector("#ec-media-url-use"))==null||w.addEventListener("click",()=>{var v;const g=o.querySelector("#ec-media-url"),f=g instanceof HTMLInputElement?g.value.trim():"";f&&(C(f,"",Bt(f)?"video":"image"),(v=o.querySelector('[data-tab="library"]'))==null||v.dispatchEvent(new Event("click")))}),(L=o.querySelector("#ec-media-upload"))==null||L.addEventListener("change",async g=>{var j,M;const f=g.target,v=(j=f.files)==null?void 0:j[0],E=o.querySelector("#ec-media-upload-status");if(v){if(Ct()!=="live"){E&&(E.textContent="Upload requires Live data and Integration API.");return}E&&(E.textContent="Uploading…");try{const S=v.type.startsWith("video/")||Bt(v.name),h=S?v:await gs(v),T=await Gt(h,null,{area:"studio/email"}),N=S?"video":"image";s=[...s,{url:T,label:v.name,group:"Upload",thumb:N==="image"?T:"",kind:N}],C(T,v.name,N),E&&(E.textContent="Uploaded."),(M=o.querySelector('[data-tab="library"]'))==null||M.dispatchEvent(new Event("click"))}catch(S){E&&(E.textContent=S instanceof Error?S.message:String(S))}finally{f.value=""}}}),(A=o.querySelector("#ec-media-cancel"))==null||A.addEventListener("click",()=>i()),p==null||p.addEventListener("click",()=>{var v,E;if(!n)return;const g=u instanceof HTMLInputElement?u.value.trim():"",f=((v=o.querySelector('input[name="ec-media-placement"]:checked'))==null?void 0:v.value)==="hero"?"hero":"inline";(E=e.onSelect)==null||E.call(e,{url:n,alt:g,placement:f,posterUrl:r==="video"?a:""}),i()})}const sa=12e3;function Ei(e){if(e&&typeof e=="object"){if("draft"in e)return"draft";if("pendingSend"in e)return"pendingSend";if("sent"in e)return"sent";if("failed"in e)return"failed"}return"draft"}function _p(e){if(e&&typeof e=="object"&&"category"in e){const s=e.category;return`cat:${String(s??"")}`}return"all"}function $p(e){return e.startsWith("cat:")?{category:e.slice(4).trim()||"general"}:{allBroadcast:null}}function Li(e){const s=String(e??"").trim();return s?[s]:[]}function Ti(e){const s=String(e||"").trim()||"<p></p>";return ar(s)||s.includes("fusionart.world/email/")?s:cr(s,{includeSignature:!0})}function Ms(e,s){const i=(s==null?void 0:s.id)!=null?String(s.id):String((e==null?void 0:e.id)??""),o=Array.isArray(e==null?void 0:e.title)?e.title:Li(String(Ie(e==null?void 0:e.title)??""));return{id:i,title:o,subject:String((e==null?void 0:e.subject)??"").trim()||"Untitled",previewText:String((e==null?void 0:e.previewText)??"").trim(),htmlBody:String((e==null?void 0:e.htmlBody)??"").trim()||"<p><br></p>",textBody:Array.isArray(e==null?void 0:e.textBody)?e.textBody:Li(Ie(e==null?void 0:e.textBody)??""),templateId:Array.isArray(e==null?void 0:e.templateId)?e.templateId:Li(Ie(e==null?void 0:e.templateId)??""),audience:(e==null?void 0:e.audience)??{allBroadcast:null},internalNotes:String((e==null?void 0:e.internalNotes)??"").trim(),status:(e==null?void 0:e.status)??{draft:null},createdAt:String((e==null?void 0:e.createdAt)??"").trim(),updatedAt:String((e==null?void 0:e.updatedAt)??"").trim(),sentAt:Array.isArray(e==null?void 0:e.sentAt)?e.sentAt:[],resendBroadcastId:Array.isArray(e==null?void 0:e.resendBroadcastId)?e.resendBroadcastId:[],lastError:Array.isArray(e==null?void 0:e.lastError)?e.lastError:[],createdBy:(e==null?void 0:e.createdBy)??(s==null?void 0:s.Principal)??Vs.anonymous()}}function oe(e){return String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Ai(e,s){const i=`"${s}"`,o=e.indexOf(i);if(o<0)return;const n=e.indexOf(":",o+i.length);if(n<0)return;let a=n+1;for(;a<e.length&&/\s/.test(e[a]);)a+=1;if(a>=e.length||e[a]!=='"')return;a+=1;let r="";for(;a<e.length;){const l=e[a];if(l==="\\"&&a+1<e.length){const d=e[a+1];if(d==="n"){r+=`
`,a+=2;continue}if(d==="r"){r+="\r",a+=2;continue}if(d==="t"){r+="	",a+=2;continue}if(d==="u"&&a+5<e.length){const p=e.slice(a+2,a+6);if(/^[0-9a-fA-F]{4}$/.test(p)){r+=String.fromCharCode(parseInt(p,16)),a+=6;continue}}if(d==='"'||d==="\\"||d==="/"){r+=d,a+=2;continue}}if(l==='"'){let d=a+1;for(;d<e.length&&/\s/.test(e[d]);)d+=1;if(d>=e.length||e[d]===","||e[d]==="}")return r}r+=l,a+=1}return r.length>0?r:void 0}function Cp(e){const s=String(e).replace(/^\uFEFF/,"").trim(),i=p=>p.replace(/^```(?:json)?\s*/i,"").replace(/```\s*$/g,"").trim(),o=p=>{try{return JSON.parse(p)}catch{return null}};for(const p of[s,i(s)]){if(!p)continue;const u=o(p);if(u&&typeof u=="object")return u;const c=p.match(/\{[\s\S]*\}/);if(c){const m=o(c[0]);if(m&&typeof m=="object")return m}}const n=/[\u0000-\u0008\u000B\u000C\u000E-\u001F]+/g;for(const p of[s,i(s)]){if(!p)continue;const u=p.replace(n," "),c=o(u);if(c&&typeof c=="object")return c;const m=u.match(/\{[\s\S]*\}/);if(m){const b=o(m[0]);if(b&&typeof b=="object")return b}}const a=i(s)||s,r=Ai(a,"subject"),l=Ai(a,"previewText"),d=Ai(a,"htmlBody");return r==null&&l==null&&d==null?null:{subject:r,previewText:l,htmlBody:d}}function Mp(){return`
<div class="studio-ec" data-studio-ec-root>
  <div class="studio-ec__layout" role="group" aria-label="Email campaign layout">
    <aside class="studio-ec__col studio-ec__col--assist" aria-label="Campaigns and assistance">
      <div class="studio-ec__subtabs studio-ec__subtabs--four" role="tablist" aria-label="Left panel">
        <button type="button" class="studio-ec__subtab" id="studio-ec-ltab-cam" data-ec-ltab="campaigns" role="tab" aria-selected="false">Campaigns</button>
        <button type="button" class="studio-ec__subtab is-active" id="studio-ec-ltab-a" data-ec-ltab="compose" role="tab" aria-selected="true">Compose</button>
        <button type="button" class="studio-ec__subtab" id="studio-ec-ltab-b" data-ec-ltab="gen" role="tab" aria-selected="false">Generate</button>
        <button type="button" class="studio-ec__subtab" id="studio-ec-ltab-c" data-ec-ltab="tpl" role="tab" aria-selected="false">Templates</button>
      </div>
      <div id="studio-ec-panel-l-campaigns" class="studio-ec__assist-panels studio-ec__panel--campaigns" role="region" aria-label="Saved campaigns" hidden>
        <div class="studio-ec__list-head">
          <h2 class="studio-ec__h">Campaigns</h2>
          <button type="button" class="studio-btn-secondary studio-ec__btn-new" id="studio-ec-new">New</button>
        </div>
        <div class="studio-ec__list-scroll">
          <ul class="studio-ec__campaign-list" id="studio-ec-campaign-list"></ul>
        </div>
        <p class="studio-ec__hint" id="studio-ec-list-hint"></p>
      </div>
      <div id="studio-ec-panel-l-compose" class="studio-ec__assist-panels" role="region" aria-label="Assisted compose">
        <p class="studio-ec__assist-title">Compose with assistance</p>
        <p class="studio-ec__assist-hint">What do you want to send?</p>
        <label class="studio-field studio-ec__field-tight">
          <textarea id="studio-ec-assist-prompt" class="studio-textarea" rows="5" placeholder="Describe your announcement, who it is for, and a link or CTA."></textarea>
        </label>
        <p class="studio-ec__kicker">Examples</p>
        <div class="studio-ec__pills" id="studio-ec-pills" role="group" aria-label="Example prompts">
          <button type="button" class="studio-ec__pill" data-prompt="Residency open call: dates, who should apply, one clear apply link.">Residency open call</button>
          <button type="button" class="studio-ec__pill" data-prompt="Program reminder: deadline soon, one paragraph of context, CTA.">Last-chance reminder</button>
          <button type="button" class="studio-ec__pill" data-prompt="Newsletter: artist spotlight, one quote, link to their profile.">Artist spotlight</button>
        </div>
        <div class="studio-ec__cols2">
          <label class="studio-field">
            <span class="studio-ec__flabel">Tone</span>
            <select id="studio-ec-tone" class="studio-select">
              <option value="Neutral">Neutral</option>
              <option value="Elevated" selected>Elevated</option>
              <option value="Warm and direct">Warm and direct</option>
              <option value="Formal">Formal</option>
            </select>
          </label>
          <label class="studio-field">
            <span class="studio-ec__flabel">Length</span>
            <select id="studio-ec-length" class="studio-select">
              <option value="Short">Short</option>
              <option value="Standard" selected>Standard</option>
              <option value="Long">Long</option>
            </select>
          </label>
        </div>
        <button type="button" class="studio-btn-primary studio-ec__gen-main" id="studio-ec-generate" aria-label="Generate draft with AI">✦ Generate draft</button>
        <p class="studio-ec__ai-disclaimer">AI is a starting point. Review the subject, preview, and body before sending.</p>
        <p class="studio-ec__or">or</p>
        <div class="studio-ec__manual">
          <button type="button" class="studio-btn-ghost" id="studio-ec-focus-body">Write in editor</button>
          <button type="button" class="studio-btn-ghost" id="studio-ec-goto-templates">Browse templates</button>
        </div>
      </div>
      <div id="studio-ec-panel-l-tpl" class="studio-ec__tpl-panel" hidden>
        <p class="studio-ec__assist-hint">Apply a branded Fusion layout. Optionally bind live content, then refine with Quick Design.</p>
        <label class="studio-field">
          <span>Template</span>
          <select class="studio-select" id="studio-ec-template">
            ${Su()}
          </select>
        </label>
        <div id="studio-ec-source-panel" class="studio-ec__source-panel" hidden>
          <p class="studio-ec__kicker">Content source <span class="studio-muted">(optional)</span></p>
          <label class="studio-field">
            <span>Source type</span>
            <select class="studio-select" id="studio-ec-source-type">
              <option value="">— None —</option>
              <option value="artist">Featured artist</option>
              <option value="video">Community video</option>
              <option value="journal">Journal entry</option>
              <option value="program">Program</option>
            </select>
          </label>
          <label class="studio-field">
            <span>Item</span>
            <select class="studio-select" id="studio-ec-source-id" disabled>
              <option value="">— Select type first —</option>
            </select>
          </label>
          <button type="button" class="studio-btn-secondary studio-ec__apply-content" id="studio-ec-apply-content">Apply content</button>
        </div>
        <div class="studio-ec__tpl-actions">
          <button type="button" class="studio-btn-secondary" id="studio-ec-apply-template">Apply template</button>
          <button type="button" class="studio-btn-primary" id="studio-ec-quick-design">Quick Design</button>
        </div>
        <p class="studio-muted studio-ec__tpl-note">Quick Design uses the selected template styling and optional content source. Review before sending.</p>
      </div>
    </aside>
    <section class="studio-ec__col studio-ec__col--editor" aria-label="Message">
      <div class="studio-ec__eyebrow">Email</div>
      <h1 class="studio-ec__title">Message</h1>
      <p class="studio-ec__lede" id="studio-ec-save-state" aria-live="polite">Edit your message, then click Save draft.</p>
      <div class="studio-ec__row-fields">
        <label class="studio-field studio-field--row">
          <span class="studio-ec__lhead">Subject <em class="studio-ec__n" id="studio-ec-subject-n">0 / 998</em></span>
          <input type="text" class="studio-input" id="studio-ec-subject" maxlength="998" required placeholder="FUSION — …" />
        </label>
        <label class="studio-field studio-field--row">
          <span class="studio-ec__lhead">Preview text <em class="studio-ec__n" id="studio-ec-preview-n">0 / 200</em></span>
          <input type="text" class="studio-input" id="studio-ec-preview" maxlength="200" placeholder="Shown in inbox preheader" />
        </label>
      </div>
      <div class="studio-ec__main-panels">
        <div id="studio-ec-panel-m-message" class="studio-ec__main-panel studio-ec__main-panel--message" role="region" aria-label="Message body">
          <div class="studio-ec__edtabs studio-ec__edtabs--bodybar" role="group" aria-label="Message body">
            <span class="studio-ec__body-tab-label" id="studio-ec-body-label">Body</span>
            <button type="button" class="studio-btn-secondary studio-ec__preview-open" id="studio-ec-open-preview" title="Open rendered preview in a window">Preview</button>
          </div>
          <div class="studio-ec__editor-wrap" id="studio-ec-editor-surface">
            <div class="studio-ec__toolbar" id="studio-ec-toolbar" role="toolbar" aria-label="Message formatting">
              <button type="button" class="studio-ec__tbt" data-cmd="bold" title="Bold"><span class="studio-sr-only">Bold</span><b>B</b></button>
              <button type="button" class="studio-ec__tbt" data-cmd="italic" title="Italic"><i>I</i></button>
              <span class="studio-ec__tsep" aria-hidden="true"></span>
              <button type="button" class="studio-ec__tbt" data-cmd="link" title="Link">Link</button>
              <button type="button" class="studio-ec__tbt" data-cmd="ul" title="List">List</button>
              <span class="studio-ec__tsep" aria-hidden="true"></span>
              <div class="studio-ec__image-split" role="group" aria-label="Insert image">
                <button type="button" class="studio-ec__tbt" id="studio-ec-image" title="Insert image from library">Image…</button>
                <button type="button" class="studio-ec__tbt studio-ec__tbt--mini" id="studio-ec-image-upload" title="Upload new image">↑</button>
              </div>
              <span class="studio-ec__tsep" aria-hidden="true"></span>
              <button type="button" class="studio-ec__tbt" id="studio-ec-edit-html" title="Edit raw HTML">&lt;/&gt; HTML</button>
              <input type="file" id="studio-ec-image-file" accept="image/*" class="studio-sr-only" aria-hidden="true" />
            </div>
            <div class="studio-ec__card">
              <div id="studio-ec-body" class="studio-ec__body" contenteditable="true" spellcheck="true" data-placeholder="Type your message, or use Generate in the left panel."></div>
            </div>
            <div class="studio-ec__aibar" id="studio-ec-selbar" role="toolbar" aria-label="Text assistance">
              <span class="studio-ec__aibar-label" id="studio-ec-selbar-label">Content assist</span>
              <button type="button" class="studio-ec__aib" id="studio-ec-sel-refine">Refine</button>
              <button type="button" class="studio-ec__aib" id="studio-ec-ai-expand">Expand</button>
              <button type="button" class="studio-ec__aib" id="studio-ec-ai-shorten">Shorten</button>
              <button type="button" class="studio-ec__aib" id="studio-ec-sel-ja">To Japanese</button>
            </div>
          </div>
        </div>
      </div>
    </section>
    <aside class="studio-ec__col studio-ec__col--settings" aria-label="Campaign, audience, and review">
      <div class="studio-ec__main-tabs studio-ec__main-tabs--stacked" role="tablist" aria-label="Campaign settings">
        <button type="button" class="studio-ec__main-tab is-active" id="studio-ec-mtab-cam" data-ec-mtab="campaign" role="tab" aria-selected="true">Campaign</button>
        <button type="button" class="studio-ec__main-tab" id="studio-ec-mtab-aud" data-ec-mtab="audience" role="tab" aria-selected="false">Audience</button>
        <button type="button" class="studio-ec__main-tab" id="studio-ec-mtab-rev" data-ec-mtab="review" role="tab" aria-selected="false">Review</button>
      </div>
      <div class="studio-ec__main-panels studio-ec__main-panels--settings-rail">
        <div id="studio-ec-panel-m-campaign" class="studio-ec__main-panel studio-ec__main-panel--scroll" role="tabpanel" aria-labelledby="studio-ec-mtab-cam">
          <div class="studio-ec__settings-section">
            <h3 class="studio-ec__sh">Campaign</h3>
            <label class="studio-field">
              <span>Internal title</span>
              <input type="text" class="studio-input" id="studio-ec-title" maxlength="200" placeholder="Optional" />
            </label>
            <p class="studio-ec__st"><span>Status</span> <span class="studio-ec__st-dot" aria-hidden="true"></span> <strong id="studio-ec-status-val">draft</strong></p>
            <div class="studio-ec__delete-wrap">
              <button type="button" class="studio-btn-ghost studio-ec__delete" id="studio-ec-delete" disabled>Delete campaign</button>
              <p class="studio-ec__delete-hint" id="studio-ec-delete-hint" hidden></p>
            </div>
          </div>
        </div>
        <div id="studio-ec-panel-m-audience" class="studio-ec__main-panel studio-ec__main-panel--scroll" role="tabpanel" aria-labelledby="studio-ec-mtab-aud" hidden>
          <div class="studio-ec__settings-section">
            <h3 class="studio-ec__sh">Audience</h3>
            <label class="studio-field">
              <span>Recipients <em class="studio-ec__est" id="studio-ec-recipient-est">—</em></span>
              <select class="studio-select" id="studio-ec-audience"></select>
            </label>
            <label class="studio-field">
              <span>Broadcast segment (Resend)</span>
              <div class="studio-ec-segment-row">
                <select class="studio-select" id="studio-ec-segment-preset" aria-label="Segment from canister">
                  <option value="">— Configured in Services → Resend —</option>
                </select>
                <input type="text" class="studio-input" id="studio-ec-segment" placeholder="Segment UUID" autocomplete="off" />
                <button type="button" class="studio-resend-sync studio-resend-sync--ready" id="studio-ec-sync-audience">READY</button>
              </div>
              <p class="studio-muted" id="studio-ec-sync-hint" style="margin:0.35rem 0 0;font-size:0.85rem"></p>
            </label>
          </div>
        </div>
        <div id="studio-ec-panel-m-review" class="studio-ec__main-panel studio-ec__main-panel--scroll" role="tabpanel" aria-labelledby="studio-ec-mtab-rev" hidden>
          <div class="studio-ec__settings-section">
            <h3 class="studio-ec__sh">Test email</h3>
            <label class="studio-field">
              <span>Address</span>
              <input type="email" class="studio-input" id="studio-ec-test-to" placeholder="you@example.com" autocomplete="email" />
            </label>
          </div>
          <div class="studio-ec__settings-section">
            <h3 class="studio-ec__sh">Internal notes</h3>
            <textarea class="studio-textarea" id="studio-ec-notes" rows="4" placeholder="Not sent to subscribers"></textarea>
          </div>
          <div class="studio-ec__settings-links">
            <button type="button" class="studio-btn-ghost" id="studio-ec-history">Campaign history</button>
            <button type="button" class="studio-btn-ghost" id="studio-ec-csv">Download subscriber CSV</button>
          </div>
        </div>
      </div>
    </aside>
  </div>
  <div class="studio-ec__dock" id="studio-ec-dock" role="region" aria-label="Email actions">
    <p class="studio-ec__msg" id="studio-ec-msg" style="display:none" role="status" aria-live="polite"></p>
    <div class="studio-ec__dock-in">
      <button type="button" class="studio-btn-secondary studio-ec__delete" data-ec-dock="delete" id="studio-ec-dock-delete" disabled>Delete</button>
      <button type="button" class="studio-btn-secondary" data-ec-dock="save" id="studio-ec-dock-save">Save draft</button>
      <button type="button" class="studio-btn-secondary" data-ec-dock="test" id="studio-ec-dock-test">Send test</button>
      <button type="button" class="studio-btn-primary" data-ec-dock="send" id="studio-ec-dock-send">Send campaign</button>
    </div>
  </div>
</div>`}async function xp(e){var Zt,Se,To,Ao,ko,_o,$o,Co,Mo,xo,Io,jo,Ho,qo,Po,No,Ro,Uo,Fo,Do;const s=e.querySelector("[data-studio-ec-root]");if(!s)return;if(!Jt("email").canEdit){s.innerHTML='<p class="studio-muted">You do not have permission to edit Email campaigns.</p>';return}const o=s.querySelector("#studio-ec-campaign-list"),n=s.querySelector("#studio-ec-list-hint"),a=s.querySelector("#studio-ec-body"),r=s.querySelector("#studio-ec-open-preview");s.querySelector(".studio-ec__editor-wrap"),s.querySelector("#studio-ec-selbar");const l=s.querySelector("#studio-ec-save-state"),d=s.querySelector("#studio-ec-dock-save"),p=s.querySelector("#studio-ec-msg"),u=s.querySelector("#studio-ec-status-val"),c=s.querySelector("#studio-ec-subject-n"),m=s.querySelector("#studio-ec-preview-n"),b=s.querySelector("#studio-ec-recipient-est"),C=s.querySelector("#studio-ec-assist-prompt"),w=s.querySelector("#studio-ec-tone"),L=s.querySelector("#studio-ec-length"),A=s.querySelector("#studio-ec-panel-l-campaigns"),g=s.querySelector("#studio-ec-panel-l-compose"),f=s.querySelector("#studio-ec-panel-l-tpl"),v=s.querySelector("#studio-ec-title"),E=s.querySelector("#studio-ec-subject"),j=s.querySelector("#studio-ec-preview"),M=s.querySelector("#studio-ec-template"),S=s.querySelector("#studio-ec-source-panel"),h=s.querySelector("#studio-ec-source-type"),T=s.querySelector("#studio-ec-source-id"),N=s.querySelector("#studio-ec-audience"),O=s.querySelector("#studio-ec-segment"),G=s.querySelector("#studio-ec-segment-preset"),V=s.querySelector("#studio-ec-sync-audience"),at=s.querySelector("#studio-ec-sync-hint"),tt=s.querySelector("#studio-ec-notes"),z=s.querySelector("#studio-ec-test-to");let F=null,I=null,y=!1,_=!1,$=[],H={from:null,segmentId:null},R={artists:[],journals:[],programs:[],videos:[],media:[],images:[]},x={};const q=(D,Q)=>{if(!(p instanceof HTMLElement))return;if(!Q){p.style.display="none",p.textContent="",p.className="studio-ec__msg";return}p.style.display="block";const lt=D==="error",rt=D==="info";p.className=`studio-ec__msg${lt?" studio-ec__msg--err":rt?" studio-ec__msg--info":" studio-ec__msg--ok"}`,p.textContent=Q},X=(D="")=>{l instanceof HTMLElement&&(D?l.textContent=D:l.textContent=y?"Unsaved changes — click Save draft when ready.":"Edit your message, then click Save draft."),d instanceof HTMLButtonElement&&(d.disabled=!y)},ot=()=>{_||y||(y=!0,X())},gt=()=>{y=!1,X()},Lt=()=>y?window.confirm("You have unsaved changes. Discard them and continue?"):!0,bt=()=>{const D=E instanceof HTMLInputElement?E.value.length:0,Q=j instanceof HTMLInputElement?j.value.length:0;c&&(c.textContent=`${D} / 998`),m&&(m.textContent=`${Q} / 200`)},wt=()=>{const D=s.querySelectorAll(".studio-ec__delete"),Q=s.querySelector("#studio-ec-delete-hint"),{teamNavAllowed:lt}=ys(),rt=Ct()==="live",mt=!!I,ht=mt&&(!rt||lt);D.forEach(Et=>{Et instanceof HTMLButtonElement&&(Et.disabled=!ht)}),Q&&(mt?rt&&!lt?(Q.textContent="On-chain, only a canister admin can delete campaigns. Use Campaign history to review IDs.",Q.hidden=!1):(Q.textContent="",Q.hidden=!0):(Q.textContent="Save draft at least once to delete. To clear the editor without saving, use “New” in the list.",Q.hidden=!1))},_t=()=>{if(!(N instanceof HTMLSelectElement)||!b)return;const D=N.value;if(D==="all")b.textContent="(Resend segment — not counted here)";else{const Q=D.slice(4),lt=$.filter(rt=>String((rt==null?void 0:rt.category)||"").trim()!==Q?!1:String((rt==null?void 0:rt.email)||"").trim().includes("@")).length;b.textContent=lt?`~${lt} in category`:"0 in category"}},At=()=>{if(!(a instanceof HTMLElement))return;const D=Ti(a.innerHTML),{root:Q}=qt(`<p class="studio-muted" style="margin:0 0 0.75rem">Approximate appearance in a mail client. Remote images need public URLs to load here.</p>
        <div class="studio-ec-preview-pop"><iframe class="studio-ec__preview-frame studio-ec__preview-frame--pop" title="HTML preview" sandbox="allow-same-origin" style="display:block;width:100%"></iframe></div>`,{title:"Message preview",wide:!0}),lt=Q.querySelector("iframe.studio-ec__preview-frame--pop");if(lt instanceof HTMLIFrameElement){const rt=lt.contentDocument;rt&&(rt.open(),rt.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><base target="_blank" rel="noopener"></head><body style="margin:0;padding:0">${D}</body></html>`),rt.close())}};r==null||r.addEventListener("click",()=>At());const nt=D=>{const Q=D||"compose",lt=Q==="campaigns",rt=Q==="tpl";A&&A.toggleAttribute("hidden",!lt),g&&g.toggleAttribute("hidden",rt||lt),f&&f.toggleAttribute("hidden",!rt),s.querySelectorAll("[data-ec-ltab]").forEach(mt=>{if(mt instanceof HTMLButtonElement){const ht=mt.getAttribute("data-ec-ltab")===Q;mt.classList.toggle("is-active",ht),mt.setAttribute("aria-selected",ht?"true":"false")}})};s.querySelectorAll("[data-ec-ltab]").forEach(D=>{D.addEventListener("click",()=>{const Q=D.getAttribute("data-ec-ltab")||"compose";nt(Q),Q==="gen"&&C instanceof HTMLTextAreaElement&&C.focus()})});const dt=s.querySelector("#studio-ec-panel-m-campaign"),yt=s.querySelector("#studio-ec-panel-m-audience"),K=s.querySelector("#studio-ec-panel-m-review"),et=D=>{const Q=D||"campaign";dt&&dt.toggleAttribute("hidden",Q!=="campaign"),yt&&yt.toggleAttribute("hidden",Q!=="audience"),K&&K.toggleAttribute("hidden",Q!=="review"),s.querySelectorAll("[data-ec-mtab]").forEach(lt=>{if(lt instanceof HTMLButtonElement){const rt=lt.getAttribute("data-ec-mtab")===Q;lt.classList.toggle("is-active",rt),lt.setAttribute("aria-selected",rt?"true":"false")}})};s.querySelectorAll("[data-ec-mtab]").forEach(D=>{D.addEventListener("click",()=>{const Q=D.getAttribute("data-ec-mtab")||"campaign";et(Q)})}),et("campaign"),(Zt=s.querySelector("#studio-ec-goto-templates"))==null||Zt.addEventListener("click",()=>nt("tpl")),(Se=s.querySelector("#studio-ec-focus-body"))==null||Se.addEventListener("click",()=>{a==null||a.focus()}),s.querySelectorAll(".studio-ec__pill[data-prompt]").forEach(D=>{D.addEventListener("click",()=>{const Q=D.getAttribute("data-prompt");Q&&C instanceof HTMLTextAreaElement&&(C.value=Q)})});const Y=async()=>{try{H=await hl(),O instanceof HTMLInputElement&&!O.value.trim()&&H.segmentId&&(O.value=H.segmentId)}catch{H={from:null,segmentId:null}}};let st=[];const B=D=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(D||"").trim()),P=()=>{if(O instanceof HTMLInputElement){const D=O.value.trim();if(D)return D}if(G instanceof HTMLSelectElement){const D=G.value.trim();if(D&&D!=="__custom__")return D}return""},k=()=>{if(!(V instanceof HTMLButtonElement))return;const D=Ct()==="live",Q=!!ee(),lt=P();if(!D||!Q||!lt){V.disabled=!0,V.textContent="SYNC",V.className="studio-resend-sync studio-resend-sync--ready",at&&(at.textContent=D?Q?"Choose or enter a segment UUID for broadcast + SYNC.":"Set Integration API URL under Services.":"SYNC requires Live data source and Integration API.");return}let rt=0;for(const mt of $){const ht=String((mt==null?void 0:mt.email)||"").trim();if(!B(ht))continue;(Array.isArray(mt==null?void 0:mt.audiences)?mt.audiences:[]).includes(lt)||(rt+=1)}rt>0?(V.disabled=!1,V.textContent="SYNC Audience",V.className="studio-resend-sync studio-resend-sync--pending",at&&(at.textContent=`${rt} subscriber(s) not yet in this segment (Fusion + Resend after SYNC).`)):(V.disabled=!0,V.textContent="READY",V.className="studio-resend-sync studio-resend-sync--ready",at&&(at.textContent="All valid emails already include this segment id in Fusion audiences."))},J=async()=>{st=[];try{st=await so()}catch{st=[]}if(!(G instanceof HTMLSelectElement)){k();return}const D=(O instanceof HTMLInputElement?O.value:"").trim(),Q=document.createDocumentFragment(),lt=document.createElement("option");lt.value="",lt.textContent="— Configured in Services → Resend —",Q.appendChild(lt);for(const mt of st){const ht=String((mt==null?void 0:mt.segmentId)||"").trim();if(!ht)continue;const Et=document.createElement("option");Et.value=ht,Et.textContent=String((mt==null?void 0:mt.name)||"").trim()||`${ht.slice(0,8)}…`,Q.appendChild(Et)}const rt=document.createElement("option");rt.value="__custom__",rt.textContent="Custom…",Q.appendChild(rt),G.replaceChildren(Q),D&&[...G.options].some(mt=>mt.value===D)?G.value=D:D&&(G.value="__custom__"),k()},W=async()=>{try{$=await Jo()}catch(D){$=[],n&&(n.textContent=D instanceof Error?D.message:String(D))}Z()},Z=()=>{if(!(N instanceof HTMLSelectElement))return;const D=new Set;for(const rt of $){const mt=String((rt==null?void 0:rt.category)??"").trim();mt&&D.add(mt)}const Q=[...D].sort((rt,mt)=>rt.localeCompare(mt)),lt=N.value;N.innerHTML='<option value="all">All subscribers (Resend broadcast)</option>'+Q.map(rt=>`<option value="cat:${oe(rt)}">Category: ${oe(rt)} (batch)</option>`).join(""),lt&&[...N.options].some(rt=>rt.value===lt)&&(N.value=lt),_t(),k()},ct=D=>{const Q=Me(D);Q&&(E instanceof HTMLInputElement&&(E.value=Q.defaultSubject),j instanceof HTMLInputElement&&(j.value=Q.defaultPreview),a instanceof HTMLElement&&(a.innerHTML=Q.bodyHtml),x={...x,templateId:D},ft(),bt())},pt=()=>{const D=h instanceof HTMLSelectElement?h.value:"",Q=T instanceof HTMLSelectElement?T.value:"";return!D||!Q?null:{type:D,id:Q}},ft=()=>{const D=M instanceof HTMLSelectElement?M.value:"",Q=Me(D),lt=(Q==null?void 0:Q.contentSourceTypes)||[],rt=lt.length>0;S instanceof HTMLElement&&(S.hidden=!rt),h instanceof HTMLSelectElement&&([...h.options].forEach(mt=>{mt.value&&(mt.hidden=!lt.includes(mt.value))}),h.value&&!lt.includes(h.value)&&(h.value="")),It()},It=()=>{var mt;if(!(T instanceof HTMLSelectElement))return;const D=h instanceof HTMLSelectElement?h.value:"";if(!D){T.innerHTML='<option value="">— Select type first —</option>',T.disabled=!0;return}const Q=D==="artist"?R.artists:D==="video"?R.videos:D==="journal"?R.journals:R.programs,lt=vp(D,Q);T.innerHTML='<option value="">— Select —</option>'+lt.map(ht=>`<option value="${oe(ht.id)}">${oe(ht.label)}</option>`).join(""),T.disabled=lt.length===0;const rt=((mt=x==null?void 0:x.source)==null?void 0:mt.type)===D?x.source.id:"";rt&&[...T.options].some(ht=>ht.value===rt)&&(T.value=rt)},Ft=(D=!1)=>{const Q=M instanceof HTMLSelectElement?M.value:"",lt=pt();if(!Q||!lt){q("error","Select a template and content item first.");return}if(!D&&a instanceof HTMLElement&&a.innerText.replace(/\s+/g," ").trim().length>40&&!window.confirm("Replace subject, preview, and body with content from the selected source?"))return;const rt=wp(Q,lt,R);if(!rt){q("error","Could not resolve content for that item.");return}E instanceof HTMLInputElement&&(E.value=rt.subject),j instanceof HTMLInputElement&&(j.value=rt.previewText),a instanceof HTMLElement&&(a.innerHTML=rt.bodyHtml),x={templateId:Q,source:lt},bt(),ot(),q("ok","Content applied.")},Ht=()=>{const D=F&&typeof F=="object"?F:{id:I||""},Q=N instanceof HTMLSelectElement?$p(N.value):{allBroadcast:null},lt=a instanceof HTMLElement?a.innerHTML:String(D.htmlBody||""),rt=(v instanceof HTMLInputElement?v.value:"").trim(),mt=rt?[rt]:[],ht=M instanceof HTMLSelectElement&&M.value?M.value:Ie(D.templateId)||"",Et=tt instanceof HTMLTextAreaElement?tt.value:"",Dt={templateId:ht||x.templateId||"",source:pt()||x.source||null};return Ms({...D,id:String(I||D.id||"").trim(),title:mt,subject:(E instanceof HTMLInputElement?E.value:D.subject||"")||"Untitled",previewText:(j instanceof HTMLInputElement?j.value:D.previewText)||"",htmlBody:lt,templateId:ht?[ht]:[],audience:Q,internalNotes:fp(Dt,Et)},{id:I||String(D.id||"")})},Tt=D=>{var Q,lt;_=!0;try{F=D,I=String((D==null?void 0:D.id)||"")||null,v instanceof HTMLInputElement&&(v.value=Ie(D.title)||""),E instanceof HTMLInputElement&&(E.value=String(D.subject||"")),j instanceof HTMLInputElement&&(j.value=String(D.previewText||""));const rt=mp(String(D.internalNotes||""));if(x=rt.meta||{},tt instanceof HTMLTextAreaElement&&(tt.value=rt.humanNotes),a instanceof HTMLElement){const mt=String(D.htmlBody||"").trim();a.innerHTML=mt||"<p><br></p>"}if(M instanceof HTMLSelectElement){const mt=Ie(D.templateId)||x.templateId||"";M.value=Me(mt)?mt:""}h instanceof HTMLSelectElement&&((Q=x==null?void 0:x.source)!=null&&Q.type)&&(h.value=x.source.type),ft(),T instanceof HTMLSelectElement&&((lt=x==null?void 0:x.source)!=null&&lt.id)&&(T.value=x.source.id),N instanceof HTMLSelectElement&&(N.value=_p(D.audience)),u&&(u.textContent=Ei(D.status)),bt(),_t(),wt()}finally{_=!1,gt()}},Yt=async()=>{X("Saving…"),d instanceof HTMLButtonElement&&(d.disabled=!0);try{const D=Ht(),Q=await li(D);I=Q,F={...D,id:Q},gt(),X("Draft saved"),window.setTimeout(()=>X(),2500),await Rt()}catch(D){X(),q("error",D instanceof Error?D.message:String(D))}},Rt=async()=>{if(!o)return;let D=[];try{D=await Vo()}catch(Q){n&&(n.textContent=Q instanceof Error?Q.message:String(Q))}n&&!n.textContent&&(n.textContent=Ct()==="test"?"Test mode: campaigns in localStorage only.":"Live: stored on-chain."),o.innerHTML=D.map(Q=>{const lt=String(Q.id||""),rt=Ei(Q.status),mt=String(Q.subject||"Untitled").slice(0,64);return`<li><button type="button" class="studio-ec__camp${lt===I?" is-active":""}" data-id="${oe(lt)}"><span class="studio-ec__camp-sub">${oe(mt)}</span><span class="studio-ec__camp-meta">${oe(rt)}</span></button></li>`}).join(""),wt()},ce=async D=>{if(!(o instanceof HTMLElement))return;const Q=D.target;if(!(Q instanceof Element))return;const lt=Q.closest("button.studio-ec__camp[data-id]");if(!(lt instanceof HTMLButtonElement)||!o.contains(lt))return;D.preventDefault();const rt=lt.getAttribute("data-id");if(rt&&Lt())try{const mt=await Re(rt);mt?(Tt(mt),o.querySelectorAll("button.studio-ec__camp").forEach(ht=>{ht.classList.toggle("is-active",ht.getAttribute("data-id")===rt)})):q("error","Campaign not found.")}catch(mt){q("error",mt instanceof Error?mt.message:String(mt))}};o==null||o.addEventListener("click",D=>{ce(D)}),a==null||a.addEventListener("input",()=>ot()),[v,E,j,tt,N,M].forEach(D=>{D==null||D.addEventListener("input",()=>{bt(),ot()}),D==null||D.addEventListener("change",()=>{bt(),D===N&&_t(),ot()})}),M==null||M.addEventListener("change",()=>{ft(),ot()}),h==null||h.addEventListener("change",()=>{It(),x={...x,source:null},ot()}),T==null||T.addEventListener("change",()=>{const D=pt();D&&(x={...x,source:D}),ot()}),(To=s.querySelector("#studio-ec-apply-template"))==null||To.addEventListener("click",()=>{const D=M instanceof HTMLSelectElement?M.value:"";if(!D){q("error","Select a template first.");return}ct(D),ot(),q("ok","Template applied.")}),(Ao=s.querySelector("#studio-ec-apply-content"))==null||Ao.addEventListener("click",()=>{Ft(!1)}),(ko=s.querySelector("#studio-ec-quick-design"))==null||ko.addEventListener("click",async()=>{const D=M instanceof HTMLSelectElement?M.value:"";if(!D){q("error","Select a template before Quick Design.");return}const Q=(C instanceof HTMLTextAreaElement?C.value:"").trim(),lt=pt(),rt=w instanceof HTMLSelectElement?w.value:"Elevated",mt=L instanceof HTMLSelectElement?L.value:"Standard",ht=a instanceof HTMLElement?a.innerHTML:"",Et=E instanceof HTMLInputElement?E.value.trim():"",Dt=j instanceof HTMLInputElement?j.value.trim():"",xt=bu(ht),ie=Ep(D,lt,Q,R,{subject:Et,previewText:Dt,isBranded:xt.isBranded,layoutSlots:xt.layoutSlots,rawBodyHtml:xt.rawBodyHtml}),Ot=`You write marketing email copy for FUSION art platform. ${rt} tone. ${mt} length. Reformat existingDraft into branded layout slots using styleGuide (canvas #faf3f4, black text, #c12525 CTA applied by the app shell). Reply with ONE JSON object only (no markdown). Keys: "subject" (string), "previewText" (string, max 160 chars), "layout" (object with optional string fields: eyebrow, pillLabel, headlineHtml, bodyHtml, footnote, and cta object with label and href). Use <br> inside headlineHtml for line breaks. bodyHtml: <p> paragraphs only — no h1, tables, logo, or CTA button. Black text; links use black underline. Do NOT include hero image URLs. JSON:`,Ne=JSON.stringify(ie);if(Ot.length+Ne.length>sa){q("error","Prompt too long. Shorten the compose description.");return}q("info","Quick Design generating…");try{const rs=await re(Ot,Ne,"en"),fe=Tp(rs.trim());if(!(fe!=null&&fe.layout)){q("error","Could not parse Quick Design JSON. Try again.");return}const zr=lt?mo(lt,R.artists,R.journals,R.programs,R.videos):null,Yr={...xt.layoutSlots||{},bodyHtml:xt.rawBodyHtml,subject:Et,previewText:Dt},ls=Lp(D,{eyebrow:fe.layout.eyebrow,pillLabel:fe.layout.pillLabel,headlineHtml:fe.layout.headlineHtml,bodyHtml:fe.layout.bodyHtml,footnote:fe.layout.footnote,cta:fe.layout.cta,subject:fe.subject,previewText:fe.previewText},{sourceSlots:zr,editorSlots:Yr});E instanceof HTMLInputElement&&ls.subject&&(E.value=ls.subject),j instanceof HTMLInputElement&&ls.previewText&&(j.value=String(ls.previewText).slice(0,200)),a instanceof HTMLElement&&(a.innerHTML=Be(ls)),x={templateId:D,source:lt},q("ok","Quick Design applied. Review before sending."),ot()}catch(rs){q("error",rs instanceof Error?rs.message:String(rs))}}),(_o=s.querySelector("#studio-ec-new"))==null||_o.addEventListener("click",()=>{if(!Lt())return;const D=Ms({id:"",title:[],subject:"Untitled campaign",previewText:"",htmlBody:"<p><br></p>",textBody:[],templateId:[],audience:{allBroadcast:null},internalNotes:"",status:{draft:null},createdAt:"",updatedAt:"",sentAt:[],resendBroadcastId:[],lastError:[],createdBy:Vs.anonymous()},{id:""});F=D,I=null,Tt(D),o&&o.querySelectorAll(".studio-ec__camp").forEach(Q=>Q.classList.remove("is-active")),wt()}),($o=s.querySelector("#studio-ec-dock-save"))==null||$o.addEventListener("click",()=>void Yt()),(Co=s.querySelector("#studio-ec-edit-html"))==null||Co.addEventListener("click",()=>{var mt,ht;if(!(a instanceof HTMLElement))return;const D=a.innerHTML,{close:Q,root:lt}=qt(`<p class="studio-muted">Edit the raw message HTML. Broken markup can affect preview and delivery.</p>
      <label class="studio-field"><span>HTML</span>
        <textarea id="ec-html-ta" class="studio-textarea" rows="22" style="width:100%;min-height:220px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:0.8rem;line-height:1.35"></textarea>
      </label>
      <p class="studio-modal-actions" style="display:flex;gap:0.5rem;justify-content:flex-end;margin-top:0.75rem;flex-wrap:wrap">
        <button type="button" class="studio-btn-ghost" id="ec-html-cancel">Cancel</button>
        <button type="button" class="studio-btn-primary" id="ec-html-apply">Apply</button>
      </p>`,{title:"Edit message HTML",wide:!0}),rt=lt.querySelector("#ec-html-ta");rt instanceof HTMLTextAreaElement&&(rt.value=D),(mt=lt.querySelector("#ec-html-cancel"))==null||mt.addEventListener("click",()=>Q()),(ht=lt.querySelector("#ec-html-apply"))==null||ht.addEventListener("click",()=>{if(rt instanceof HTMLTextAreaElement&&a){const Et=rt.value.trim();a.innerHTML=Et||"<p><br></p>",bt(),ot()}Q()})});const $t=()=>{const D=window.getSelection();if(!D||!D.rangeCount)return null;const Q=D.getRangeAt(0);return!a||!a.contains(Q.commonAncestorContainer)?null:Q},Ut=async D=>{const Q=$t();if(Q&&!Q.collapsed&&Q.toString().trim().length>=2){const lt=Q.toString(),rt=await re(D,lt,"en");return Q.deleteContents(),Q.insertNode(document.createTextNode(rt.trim())),!0}return!1};(Mo=s.querySelector("#studio-ec-generate"))==null||Mo.addEventListener("click",async()=>{let D=(C instanceof HTMLTextAreaElement?C.value:"").trim();if(!D){const xt=window.prompt("Describe the email (goals, audience, and main CTA):","")||"";if(!xt.trim())return;C instanceof HTMLTextAreaElement&&(C.value=xt.trim()),D=xt.trim()}const Q=w instanceof HTMLSelectElement?w.value:"Elevated",lt=L instanceof HTMLSelectElement?L.value:"Standard",rt=E instanceof HTMLInputElement?E.value:"",mt=a instanceof HTMLElement?a.innerText:"",ht={goal:D,tone:Q,length:lt,currentSubject:rt,currentBodyText:mt},Et=`You help staff write marketing email HTML for FUSION. ${Q} tone. ${lt} length. Reply with a single JSON object only (no markdown, no backticks) with keys: "subject" (string), "previewText" (string, max 160 chars), "htmlBody" (string, inner HTML only — use semantic tags, inline styles for email; no full document wrapper; may include a single h1, paragraphs, a CTA link to https://www.fusionart.world). In "htmlBody", if you need a newline inside the string, use the two-character sequence backslash + n, never a raw line break. JSON object:`,Dt=JSON.stringify(ht);if(Et.length+Dt.length>sa){alert("Prompt is too long for the canister. Shorten the description.");return}q("info","Generating…");try{const ie=(await re(Et,Dt,"en")).trim(),Ot=Cp(ie);if(!Ot||Ot.subject==null&&Ot.previewText==null&&Ot.htmlBody==null){q("error","Could not parse JSON from the model. Try a shorter prompt or regenerate.");return}E instanceof HTMLInputElement&&Ot.subject&&(E.value=String(Ot.subject)),j instanceof HTMLInputElement&&Ot.previewText&&(j.value=String(Ot.previewText).slice(0,200)),Ot.htmlBody&&a instanceof HTMLElement&&(a.innerHTML=String(Ot.htmlBody)),q("ok","Draft inserted. Review before sending."),ot()}catch(xt){q("error",xt instanceof Error?xt.message:String(xt))}});const ue=s.querySelector("#studio-ec-selbar-label");document.addEventListener("selectionchange",()=>{if(!(a instanceof HTMLElement)||!ue)return;const D=$t(),Q=D&&!D.collapsed;ue.textContent=Q?"Selection":"Content assist"},{passive:!0}),(xo=s.querySelector("#studio-ec-sel-refine"))==null||xo.addEventListener("click",async()=>{const D=$t();if(!D||D.collapsed){q("error","Select text in the message first.");return}const Q=D.toString();if(Q.length<2)return;const lt="Rewrite the following for clarity and a warm, professional art-community tone. Output the improved text only — no HTML, no JSON.";q("info","Refining…");try{const rt=await re(lt,Q,"en");D.deleteContents(),D.insertNode(document.createTextNode(rt.trim())),q("ok","Replaced selection."),ot()}catch(rt){q("error",rt instanceof Error?rt.message:String(rt))}}),(Io=s.querySelector("#studio-ec-sel-ja"))==null||Io.addEventListener("click",async()=>{const D=$t();if(!D||D.collapsed){q("error","Select text in the message first.");return}const Q=D.toString();if(!(Q.length<2)){q("info","Translating…");try{const lt=await xe(Q);D.deleteContents(),D.insertNode(document.createTextNode(String(lt).trim())),q("ok","Replaced with Japanese."),ot()}catch(lt){q("error",lt instanceof Error?lt.message:String(lt))}}});const it=D=>{const Q=D==="expand"?"Expand the following: add a sentence of useful detail, keep a warm, professional art-community voice. Return only the expanded text, no JSON.":"Make the following shorter: remove filler, keep meaning. Return only the shortened text, no JSON.";return async()=>{a instanceof HTMLElement&&(await Ut(Q)?(q("ok",D==="expand"?"Selection expanded.":"Selection shortened."),ot()):q("error","Select a phrase or sentence to expand or shorten."))}};(jo=s.querySelector("#studio-ec-ai-expand"))==null||jo.addEventListener("click",()=>void it("expand")()),(Ho=s.querySelector("#studio-ec-ai-shorten"))==null||Ho.addEventListener("click",()=>void it("shorten")()),s.querySelectorAll("#studio-ec-toolbar [data-cmd]").forEach(D=>{D.addEventListener("mousedown",Q=>Q.preventDefault()),D.addEventListener("click",()=>{if(!(a instanceof HTMLElement))return;const Q=D.getAttribute("data-cmd");if(a.focus(),Q==="link"){const lt=window.prompt("URL:","https://");if(lt)try{document.execCommand("createLink",!1,lt)}catch{}}else if(Q==="ul")try{document.execCommand("insertUnorderedList",!1)}catch{}else try{document.execCommand(Q==="bold"?"bold":"italic",!1)}catch{}ot()})});const ut=D=>{if(!(a instanceof HTMLElement))return;const Q=window.getSelection(),lt=document.createElement("template");lt.innerHTML=D;const rt=lt.content.firstChild;rt&&(Q&&Q.rangeCount&&a.contains(Q.getRangeAt(0).commonAncestorContainer)?Q.getRangeAt(0).insertNode(rt):a.appendChild(rt),ot())};(qo=s.querySelector("#studio-ec-image"))==null||qo.addEventListener("click",()=>{kp({media:R.media,onSelect:({url:D,alt:Q,placement:lt,posterUrl:rt})=>{ut(Ap({url:D,alt:Q,placement:lt,posterUrl:rt})),q("ok","Media inserted.")}})});const St=s.querySelector("#studio-ec-image-file");(Po=s.querySelector("#studio-ec-image-upload"))==null||Po.addEventListener("click",()=>{St instanceof HTMLInputElement&&St.click()}),St==null||St.addEventListener("change",async()=>{const D=St instanceof HTMLInputElement&&St.files?St.files[0]:null;if(D&&a){if(Ct()!=="live"){q("error","Image upload requires Live data and Integration API (S3).");return}q("info","Uploading image…");try{const Q=await Gt(D,null,{area:"studio/email"}),lt=document.createElement("img");lt.src=Q,lt.alt="",lt.style.maxWidth="100%",lt.style.height="auto";const rt=window.getSelection();rt&&rt.rangeCount&&a.contains(rt.getRangeAt(0).commonAncestorContainer)?rt.getRangeAt(0).insertNode(lt):a.appendChild(lt),q("ok","Image inserted."),ot()}catch(Q){q("error",Q instanceof Error?Q.message:String(Q))}finally{St instanceof HTMLInputElement&&(St.value="")}}});const jt=async(D,Q)=>{const lt=Ms({...D,status:Q,updatedAt:D.updatedAt});return li(lt)},Pt=async()=>{const D=z instanceof HTMLInputElement?z.value.trim():"";if(!D.includes("@")){q("error","Enter a test recipient email.");return}if(!ee()){q("error","Integration API URL is not set. Configure Studio → Services, or VITE_INTEGRATION_API_URL in the build.");return}q("info","Sending test…");try{const Q=Ht(),lt=a instanceof HTMLElement?a.innerHTML:String(Q.htmlBody||""),rt=Ti(lt),mt=E instanceof HTMLInputElement?E.value.trim():"";await He({to:D,subject:mt||"Fusion — test",html:rt}),q("ok","Test email sent.")}catch(Q){q("error",Q instanceof Error?Q.message:String(Q))}};(No=s.querySelector("#studio-ec-dock-test"))==null||No.addEventListener("click",()=>void Pt());const Vt=async()=>{var mt;if(Ct()!=="live"){q("error","Sending requires Live data, Integration API, and Resend.");return}if((!I||y)&&await Yt(),!I){q("error","Save the campaign first.");return}const D=await Re(I)||Ht();if(!D){q("error","Could not load campaign.");return}const Q=E instanceof HTMLInputElement?E.value.trim():String(D.subject||"");if(!Q){q("error","Subject is required.");return}const lt=N instanceof HTMLSelectElement?N.value:"all",rt=Ti(a instanceof HTMLElement?a.innerHTML:D.htmlBody);q("info","Sending…");try{let ht=[];const Et=lt==="all"?P():"";if(lt==="all"){if(!Et){q("error","Choose a broadcast segment (Services → Resend presets or paste UUID next to it).");return}}else{const xt=lt.slice(4),ie=new Set;for(const Ot of $){if(String((Ot==null?void 0:Ot.category)||"").trim()!==xt)continue;const Ne=String((Ot==null?void 0:Ot.email)||"").trim().toLowerCase();!Ne.includes("@")||ie.has(Ne)||(ie.add(Ne),ht.push(Ne))}if(!ht.length){q("error","No subscribers with a valid email in this category.");return}}if(await jt(D,{pendingSend:null}),lt==="all"){const xt=await vl({segmentId:Et,subject:Q,html:rt,name:Ie(D.title)||`Campaign ${I}`,send:!0}),ie=xt&&typeof xt=="object"?xt.id??((mt=xt.data)==null?void 0:mt.id):null,Ot=String(ie||"").trim();await Wo(String(I),Ot||"broadcast",null)}else{const xt=ht.map(ie=>({to:ie,subject:Q,html:rt}));await Ra(xt,{}),await Wo(String(I),"batch",null)}q("ok","Send completed.");const Dt=await Re(String(I));Dt&&Tt(Dt)}catch(ht){const Et=ht instanceof Error?ht.message:String(ht);q("error",Et);try{const Dt=await Re(String(I));if(Dt){const xt=Ms({...Dt,status:{failed:null},lastError:[Et]});await li(xt)}}catch{}}finally{Rt()}};(Ro=s.querySelector("#studio-ec-dock-send"))==null||Ro.addEventListener("click",()=>void Vt()),(Uo=s.querySelector("#studio-ec-csv"))==null||Uo.addEventListener("click",async()=>{try{const D=await Ua(),Q=new Blob([D],{type:"text/csv;charset=utf-8"}),lt=URL.createObjectURL(Q),rt=document.createElement("a");rt.href=lt,rt.download="fusion-subscribers.csv",rt.click(),URL.revokeObjectURL(lt)}catch(D){alert(D instanceof Error?D.message:String(D))}});const Qt=async()=>{const{teamNavAllowed:D}=ys();let Q=[];try{Q=await Vo()}catch(ht){alert(ht instanceof Error?ht.message:String(ht))}const lt=Q.length?Q.map(ht=>{const Et=String(ht.id);return`<tr data-hist-id="${oe(Et)}">
  <td>${oe(String(ht.subject||"").slice(0,40))}</td>
  <td>${oe(Ei(ht.status))}</td>
  <td>${oe(le(ht.updatedAt))}</td>
  <td class="studio-td-actions">
    <button type="button" class="studio-btn-ghost studio-hist-open" data-id="${oe(Et)}">Open</button>
    <button type="button" class="studio-btn-ghost studio-hist-dup" data-id="${oe(Et)}">Duplicate</button>
    ${D?`<button type="button" class="studio-btn-ghost studio-hist-del" data-id="${oe(Et)}">Delete</button>`:""}
  </td>
</tr>`}).join(""):'<tr><td colspan="4">No campaigns yet.</td></tr>',{close:rt,root:mt}=qt(`<p class="studio-muted">Newest first. Duplicate creates an editable copy.</p>
      <div class="studio-table-wrap" style="max-height:50vh;overflow:auto">
        <table class="studio-table"><thead><tr><th>Subject</th><th>Status</th><th>Updated</th><th></th></tr></thead>
        <tbody>${lt}</tbody></table></div>`,{title:"Campaign history",wide:!0});mt.querySelectorAll(".studio-hist-open").forEach(ht=>{ht.addEventListener("click",async()=>{const Et=ht.getAttribute("data-id");if(!Et||!Lt())return;const Dt=await Re(Et);Dt&&Tt(Dt),rt()})}),mt.querySelectorAll(".studio-hist-dup").forEach(ht=>{ht.addEventListener("click",async()=>{const Et=ht.getAttribute("data-id");if(!Et||!Lt())return;const Dt=await Sl(Et),xt=await Re(Dt);xt&&Tt(xt),rt(),Rt()})}),mt.querySelectorAll(".studio-hist-del").forEach(ht=>{ht.addEventListener("click",async()=>{var xt;const Et=ht.getAttribute("data-id");if(!Et||!D||!confirm("Delete this campaign? Admin only."))return;const Dt=await Go(Et);Dt&&Et===I&&((xt=s.querySelector("#studio-ec-new"))==null||xt.dispatchEvent(new Event("click"))),Dt?(Rt(),rt()):alert("Delete failed. Admin only on-chain.")})})};(Fo=s.querySelector("#studio-ec-history"))==null||Fo.addEventListener("click",()=>void Qt()),G==null||G.addEventListener("change",()=>{if(!(G instanceof HTMLSelectElement)||!(O instanceof HTMLInputElement))return;const D=G.value;D!=="__custom__"&&(D&&(O.value=D),k())}),O==null||O.addEventListener("input",()=>k()),O==null||O.addEventListener("change",()=>k()),V==null||V.addEventListener("click",async()=>{const D=P();if(!D){q("error","Set a segment UUID first.");return}if(Ct()!=="live"){q("error","SYNC requires Live data source.");return}if(!ee()){q("error","Integration API URL not set (Studio → Services).");return}q("info","SYNCing audience…");let Q=0,lt=0;for(const rt of $){const mt=String((rt==null?void 0:rt.email)||"").trim();if(!(!B(mt)||(Array.isArray(rt==null?void 0:rt.audiences)?rt.audiences:[]).includes(D))){try{await gl({segmentId:D,email:mt}),await yl(mt,D),Q+=1}catch{lt+=1}await new Promise(Et=>setTimeout(Et,150))}}try{$=await Jo(),Z()}catch{}k(),q("ok",`SYNC done: ${Q} updated, ${lt} failed.`)});const ve=async()=>{var rt;const D=String(I||"").trim();if(!D){q("error","Save the campaign at least once before you can delete it (or use “New” to discard the editor).");return}const{teamNavAllowed:Q}=ys();if(Ct()==="live"&&!Q){q("error","Only a canister admin can delete a campaign on-chain.");return}const lt=E instanceof HTMLInputElement?E.value.trim():"Untitled";if(confirm(`Delete this campaign forever?

“${lt}”

This cannot be undone.`)){q("info","Deleting…");try{if(!await Go(D)){q("error","Delete failed (not found or not permitted).");return}q("ok","Campaign deleted.");const ht=D;String(I)===ht&&(F=null,I=null),await Rt();const Et=o?o.querySelectorAll("button[data-id]"):null;let Dt=!1;if(Et)for(let xt=0;xt<Et.length;xt++){const ie=Et[xt];if(ie.getAttribute("data-id")!==ht){ie instanceof HTMLButtonElement&&ie.click(),Dt=!0;break}}Dt||(rt=s.querySelector("#studio-ec-new"))==null||rt.dispatchEvent(new Event("click"))}catch(mt){q("error",mt instanceof Error?mt.message:String(mt))}finally{wt()}}};s.querySelectorAll(".studio-ec__delete").forEach(D=>{D.addEventListener("click",()=>void ve())}),nt("compose"),bt(),wt(),X(),await Y();try{R=await yr()}catch{R={artists:[],journals:[],programs:[],videos:[],media:[],images:[]}}if(await W(),await J(),O instanceof HTMLInputElement&&!O.value.trim()&&H.segmentId&&(O.value=H.segmentId,k()),await Rt(),!(o!=null&&o.querySelector("button[data-id]")))(Do=s.querySelector("#studio-ec-new"))==null||Do.dispatchEvent(new Event("click"));else{const D=o.querySelector("button[data-id]"),Q=D?D.getAttribute("data-id"):null;if(Q){const lt=await Re(Q);lt&&Tt(lt)}}}function be(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Ip(e){const s=window.getSelection();if(!s||!s.rangeCount||!e.contains(s.getRangeAt(0).commonAncestorContainer))return null;const i=s.toString();return i.trim()?{text:i}:null}function jp(e,s){const i=Da(s);e.focus();try{document.execCommand("insertHTML",!1,i)}catch{const o=document.createElement("template");o.innerHTML=i;const n=window.getSelection();if(n&&n.rangeCount){const a=n.getRangeAt(0);a.deleteContents(),a.insertNode(o.content)}}e.dispatchEvent(new Event("input",{bubbles:!0}))}function xs(e,s){e.innerHTML=Da(s),e.dispatchEvent(new Event("input",{bubbles:!0}))}function ia(e){return Cl(e.innerHTML)}function cs(e){return(e.innerText||e.textContent||"").trim()}function we(e,s){e instanceof HTMLButtonElement&&(e.dataset.label||(e.dataset.label=e.textContent||""),e.disabled=s,e.textContent=s?"Working…":e.dataset.label)}function Is(e,s,i={}){var ot,gt,Lt,bt,wt,_t,At;const o=e||{id:`j_${Date.now()}`,link:"",imageSrc:"",entryStatus:"draft",en:{},ja:{}};let n={},a={};try{const nt=o.localesJson?JSON.parse(String(o.localesJson)):{en:o.en||{},ja:o.ja||{}};n=nt.en&&typeof nt.en=="object"&&!Array.isArray(nt.en)?nt.en:{},a=nt.ja&&typeof nt.ja=="object"&&!Array.isArray(nt.ja)?nt.ja:{}}catch{}const r=wl(n,a),l=!e,d=String(o.link||"").trim()||Ko(r.titleEn,String(o.id||"")),p=zo(r.bodyEn),u=zo(r.bodyJa),c="journals-block",m=_e(c,"link"),b=_e(c,"imageSrc"),C=El.map(nt=>`<option value="${be(nt)}" ${nt==="Elevated"?"selected":""}>${be(nt)}</option>`).join(""),w=["draft","published","archived"].map(nt=>`<option value="${nt}" ${String(o.entryStatus)===nt?"selected":""}>${be(nt)}</option>`).join(""),L=`
<form id="studio-je-form" class="studio-journal-composer">
  <div class="studio-journal-composer__scroll">
    <div class="studio-journal-composer__editor-head">
      <div class="studio-journal-composer__editor-head-row">
        <p class="studio-journal-composer__eyebrow">Journal</p>
        <p id="studio-je-save-state" class="studio-journal-composer__lede">Write your entry, then save.</p>
      </div>
      <div class="studio-journal-composer__locale-tabs" role="tablist" aria-label="Writing language">
        <button type="button" class="studio-journal-composer__locale-tab is-active" role="tab" aria-selected="true" data-je-locale="en" id="studio-je-tab-en">English</button>
        <button type="button" class="studio-journal-composer__locale-tab" role="tab" aria-selected="false" data-je-locale="ja" id="studio-je-tab-ja">日本語</button>
      </div>
    </div>
    <div class="studio-journal-composer__writing">
      <div class="studio-journal-composer__toolbar" role="toolbar" aria-label="Formatting">
        <button type="button" class="studio-journal-composer__tbt" data-je-cmd="bold" title="Bold"><b>B</b></button>
        <button type="button" class="studio-journal-composer__tbt" data-je-cmd="italic" title="Italic"><i>I</i></button>
        <button type="button" class="studio-journal-composer__tbt" data-je-cmd="underline" title="Underline"><u>U</u></button>
        <span class="studio-journal-composer__tsep" aria-hidden="true"></span>
        <button type="button" class="studio-journal-composer__tbt" data-je-cmd="link" title="Insert link">Link</button>
        <span class="studio-journal-composer__tsep" aria-hidden="true"></span>
        <button type="button" class="studio-journal-composer__tbt" id="studio-je-body-image-upload" title="Upload image">Image</button>
        <input type="file" id="studio-je-body-image-file" accept="image/*" class="studio-sr-only" aria-hidden="true" tabindex="-1" />
      </div>
      <div id="studio-je-panel-en" class="studio-journal-composer__locale-panel is-active" role="tabpanel" aria-labelledby="studio-je-tab-en">
        <input type="text" id="studio-je-title-en" class="studio-journal-composer__title-input" value="${be(r.titleEn)}" placeholder="Title" spellcheck="true" autocomplete="off" />
        <div id="studio-je-body-en" class="studio-journal-composer__body-input" contenteditable="true" spellcheck="true" data-placeholder="Write your entry…">${p}</div>
      </div>
      <div id="studio-je-panel-ja" class="studio-journal-composer__locale-panel" role="tabpanel" aria-labelledby="studio-je-tab-ja" hidden>
        <input type="text" id="studio-je-title-ja" class="studio-journal-composer__title-input" value="${be(r.titleJa)}" placeholder="タイトル" spellcheck="true" autocomplete="off" />
        <div id="studio-je-body-ja" class="studio-journal-composer__body-input" contenteditable="true" spellcheck="true" data-placeholder="本文を書く…">${u}</div>
      </div>
    </div>
    <div class="studio-journal-composer__assist" role="toolbar" aria-label="Writing assistance">
      <span class="studio-journal-composer__assist-label">Assist</span>
      <select id="studio-je-tone" class="studio-select studio-journal-composer__tone" aria-label="Draft tone">
        ${C}
      </select>
      <button type="button" class="studio-btn-secondary" id="studio-je-quick-draft">Quick draft</button>
      <button type="button" class="studio-btn-ghost" id="studio-je-refine">Refine</button>
      <button type="button" class="studio-btn-ghost" id="studio-je-expand">Expand</button>
      <button type="button" class="studio-btn-ghost" id="studio-je-shorten">Shorten</button>
      <button type="button" class="studio-btn-ghost" id="studio-je-to-ja">To Japanese</button>
    </div>
    <details class="studio-journal-composer__settings" ${e?"open":""}>
      <summary class="studio-journal-composer__settings-summary">Entry settings</summary>
      <div class="studio-journal-composer__settings-grid">
        <label class="studio-journal-composer__field studio-journal-composer__field--wide">
          <span>Page link <span class="studio-field-kind-badge studio-field-kind-badge--${m}">${be(qe(m))}</span></span>
          <input name="link" id="studio-je-link" class="studio-input" value="${be(d)}" placeholder="/journal/entry/your-slug" />
          <span class="studio-journal-composer__field-hint">Public URL visitors open. Auto-filled from the English title when empty.</span>
        </label>
        <label class="studio-journal-composer__field">
          <span>Status</span>
          <select name="entryStatus" class="studio-select">${w}</select>
        </label>
        <label class="studio-journal-composer__field">
          <span>Entry ID${l?"":" (internal)"}</span>
          <input name="id" required class="studio-input" value="${be(String(o.id))}" ${l?"":"readonly"} />
          ${l?'<span class="studio-journal-composer__field-hint">Optional custom id before first save.</span>':'<span class="studio-journal-composer__field-hint">Fixed after save — use Page link for the public URL.</span>'}
        </label>
        <label class="studio-journal-composer__field studio-journal-composer__field--wide">
          <span>Cover image <span class="studio-field-kind-badge studio-field-kind-badge--${b}">${be(qe(b))}</span></span>
          <div class="studio-journal-composer__cover-row">
            <input name="imageSrc" id="studio-je-img" class="studio-input" value="${be(String(o.imageSrc||""))}" placeholder="Asset path or URL" />
            <label class="studio-file-label studio-btn-ghost studio-journal-composer__upload">
              <input type="file" id="studio-je-img-file" accept="image/*,video/*" class="studio-file-input" />
              Upload
            </label>
          </div>
        </label>
      </div>
      <img id="studio-je-cover-preview" class="studio-journal-composer__cover-preview" alt="" hidden />
      <p class="studio-journal-composer__hint">Ref <code class="studio-code-inline">${be(Fs(String(o.id)))}</code> · URL path visitors open, e.g. <code class="studio-code-inline">/journal/entry/slug</code></p>
    </details>
  </div>
  <div class="studio-journal-composer__dock">
    <p id="studio-je-status" class="studio-journal-composer__dock-status" role="status" aria-live="polite"></p>
    <div class="studio-journal-composer__dock-actions">
      <button type="submit" class="studio-btn-primary" id="studio-je-save">Save entry</button>
      <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Close</button>
    </div>
  </div>
</form>`,{close:A,root:g}=qt(L,{title:e?"Edit journal entry":"Add journal entry",wide:!0}),f=g.querySelector("#studio-je-form"),v=g.querySelector("#studio-je-save-state"),E=g.querySelector("#studio-je-status"),j=g.querySelector("#studio-je-title-en"),M=g.querySelector("#studio-je-title-ja"),S=g.querySelector("#studio-je-body-en"),h=g.querySelector("#studio-je-body-ja"),T=g.querySelector("#studio-je-cover-preview"),N=g.querySelector("#studio-je-img"),O=g.querySelector("#studio-je-link");let G="en",V="",at=!1;const tt=(nt,dt)=>{E instanceof HTMLElement&&(E.textContent=dt||"",E.classList.toggle("is-ok",nt==="ok"),E.classList.toggle("is-err",nt==="error"))},z=()=>{const nt=f instanceof HTMLFormElement?new FormData(f):new FormData;return{id:String(nt.get("id")||""),link:String(nt.get("link")||""),imageSrc:String(nt.get("imageSrc")||""),entryStatus:String(nt.get("entryStatus")||"draft"),titleEn:j instanceof HTMLInputElement?j.value:"",titleJa:M instanceof HTMLInputElement?M.value:"",bodyEn:S instanceof HTMLElement?ia(S):"",bodyJa:h instanceof HTMLElement?ia(h):""}},F=()=>{const nt=Qo(z())!==V;v instanceof HTMLElement&&(v.textContent=nt?"Unsaved changes":"Saved",v.classList.toggle("is-dirty",nt),v.classList.toggle("is-saved",!nt))},I=()=>{V=Qo(z()),F()},y=()=>{if(!(T instanceof HTMLImageElement)||!(N instanceof HTMLInputElement))return;const nt=N.value.trim();if(!nt||/\.(mp4|webm|mov)(\?|$)/i.test(nt)){T.hidden=!0,T.removeAttribute("src");return}T.src=nt,T.hidden=!1},_=nt=>{G=nt,g.querySelectorAll("[data-je-locale]").forEach(et=>{const Y=et.getAttribute("data-je-locale")===nt;et.classList.toggle("is-active",Y),et.setAttribute("aria-selected",Y?"true":"false")});const dt=g.querySelector("#studio-je-panel-en"),yt=g.querySelector("#studio-je-panel-ja");dt instanceof HTMLElement&&(dt.classList.toggle("is-active",nt==="en"),dt.hidden=nt!=="en"),yt instanceof HTMLElement&&(yt.classList.toggle("is-active",nt==="ja"),yt.hidden=nt!=="ja");const K=nt==="ja"?M:j;K instanceof HTMLElement&&K.focus()},$=()=>G==="ja"?h instanceof HTMLElement?h:null:S instanceof HTMLElement?S:null,H=()=>Ct()==="test"?(tt("error","Writing assist requires live mode and admin LLM access."),!1):!at,R=async(nt,dt,yt)=>{if(nt.length+dt.length>Xo)throw new Error(`Prompt + text exceeds ${Xo} characters. Shorten the entry.`);return re(nt,dt,$l(yt))},x=async(nt,{fullBodyFallback:dt=!1}={})=>{var Y;const yt=$();if(!yt||!H())return!1;const K=Ip(yt),et=((Y=K==null?void 0:K.text)==null?void 0:Y.trim())||(dt?cs(yt):"");if(et.length<2)return!1;at=!0;try{const st=await R(nt,et,G),B=String(st).trim();return K?jp(yt,B):xs(yt,B),!0}finally{at=!1}};g.querySelectorAll("[data-je-locale]").forEach(nt=>{nt.addEventListener("click",()=>{const dt=nt.getAttribute("data-je-locale");(dt==="en"||dt==="ja")&&_(dt)})}),g.querySelectorAll(".studio-journal-composer__toolbar [data-je-cmd]").forEach(nt=>{nt.addEventListener("mousedown",dt=>dt.preventDefault()),nt.addEventListener("click",()=>{const dt=$();if(!dt)return;const yt=nt.getAttribute("data-je-cmd");if(dt.focus(),yt==="link"){const K=window.prompt("URL:","https://");if(K)try{document.execCommand("createLink",!1,K)}catch{}}else if(yt==="underline")try{document.execCommand("underline",!1)}catch{}else try{document.execCommand(yt==="bold"?"bold":"italic",!1)}catch{}F()})});const q=g.querySelector("#studio-je-body-image-file");(ot=g.querySelector("#studio-je-body-image-upload"))==null||ot.addEventListener("click",()=>{q instanceof HTMLInputElement&&q.click()}),q==null||q.addEventListener("change",async()=>{const nt=q instanceof HTMLInputElement&&q.files?q.files[0]:null,dt=$();if(!(!nt||!dt)){tt("info","Uploading image…");try{const yt=await Gt(nt,null,{area:"studio/journal",entityType:"journal",entityId:String(o.id||""),fieldKey:"bodyImage"}),et=`<p><img src="${String(yt).replace(/"/g,"&quot;")}" alt="" loading="lazy" style="max-width:100%;height:auto;display:block;margin:0.75rem 0;"></p>`;dt.focus();try{document.execCommand("insertHTML",!1,et)}catch{dt.insertAdjacentHTML("beforeend",et)}dt.dispatchEvent(new Event("input",{bubbles:!0})),tt("ok","Image inserted."),F()}catch(yt){tt("error",yt instanceof Error?yt.message:String(yt))}finally{q instanceof HTMLInputElement&&(q.value="")}}});const X=()=>{if(!(O instanceof HTMLInputElement)||!(j instanceof HTMLInputElement)||O.value.trim())return;const nt=Ko(j.value,z().id);nt&&(O.value=nt)};f==null||f.querySelectorAll("input, select").forEach(nt=>{nt.addEventListener("input",()=>{F(),nt===N&&y()}),nt.addEventListener("change",()=>{F(),nt===N&&y()})}),[S,h].forEach(nt=>{nt instanceof HTMLElement&&(nt.addEventListener("input",F),nt.addEventListener("blur",F))}),j==null||j.addEventListener("blur",()=>{X(),F()}),(gt=g.querySelector("#studio-je-img-file"))==null||gt.addEventListener("change",async nt=>{var K;const dt=nt.target,yt=dt&&"files"in dt?(K=dt.files)==null?void 0:K[0]:null;if(yt){try{await Gt(yt,N,{area:"studio/journal",entityType:"journal",entityId:String(o.id||""),fieldKey:"image"}),y(),F(),tt("ok","Cover uploaded.")}catch(et){tt("error",et instanceof Error?et.message:String(et))}dt&&"value"in dt&&(dt.value="")}}),(Lt=g.querySelector("#studio-je-quick-draft"))==null||Lt.addEventListener("click",async()=>{const nt=g.querySelector("#studio-je-quick-draft"),dt=g.querySelector("#studio-je-tone"),yt=$();if(!yt||!H())return;const K=dt instanceof HTMLSelectElement?dt.value:"Elevated",et=cs(yt),Y=Ll(K,et);we(nt,!0),tt("info","Quick draft: working…");try{const st=await R(Y,et,G);xs(yt,String(st).trim()),tt("ok","Quick draft applied.")}catch(st){tt("error",st instanceof Error?st.message:String(st))}finally{we(nt,!1)}}),(bt=g.querySelector("#studio-je-refine"))==null||bt.addEventListener("click",async()=>{const nt=g.querySelector("#studio-je-refine");if(H()){we(nt,!0),tt("info","Refining…");try{const dt=await x(Yo(),{fullBodyFallback:!0});tt(dt?"ok":"error",dt?"Entry refined.":"Select text or add body content first.")}catch(dt){tt("error",dt instanceof Error?dt.message:String(dt))}finally{we(nt,!1)}}}),(wt=g.querySelector("#studio-je-expand"))==null||wt.addEventListener("click",async()=>{const nt=g.querySelector("#studio-je-expand");if(H()){we(nt,!0),tt("info","Expanding…");try{const dt=await x(Tl());tt(dt?"ok":"error",dt?"Selection expanded.":"Select a phrase or sentence to expand.")}catch(dt){tt("error",dt instanceof Error?dt.message:String(dt))}finally{we(nt,!1)}}}),(_t=g.querySelector("#studio-je-shorten"))==null||_t.addEventListener("click",async()=>{const nt=g.querySelector("#studio-je-shorten");if(H()){we(nt,!0),tt("info","Shortening…");try{const dt=await x(Al());tt(dt?"ok":"error",dt?"Selection shortened.":"Select a phrase or sentence to shorten.")}catch(dt){tt("error",dt instanceof Error?dt.message:String(dt))}finally{we(nt,!1)}}}),(At=g.querySelector("#studio-je-to-ja"))==null||At.addEventListener("click",async()=>{const nt=g.querySelector("#studio-je-to-ja");if(H()){we(nt,!0),tt("info","Translating…");try{if(G==="en"){const dt=j instanceof HTMLInputElement?j.value.trim():"",yt=S instanceof HTMLElement?cs(S):"";if(!yt&&!dt){tt("error","Add English title or body first.");return}if(dt){const K=await xe(dt);M instanceof HTMLInputElement&&(M.value=String(K).trim())}if(yt){const K=await xe(yt);h instanceof HTMLElement&&xs(h,String(K).trim())}_("ja"),tt("ok","English copied to 日本語 tab.")}else{const dt=h instanceof HTMLElement?h:null;if(!dt||cs(dt).length<2){tt("error","Add Japanese body text first.");return}const yt=await R(Yo(),cs(dt),"ja");xs(dt,String(yt).trim()),tt("ok","Japanese text refined.")}F()}catch(dt){tt("error",dt instanceof Error?dt.message:String(dt))}finally{we(nt,!1)}}}),f==null||f.addEventListener("submit",async nt=>{nt.preventDefault();const dt=z(),yt=Fa(dt.link,dt.titleEn,dt.id),{en:K,ja:et}=kl(n,a,{titleEn:dt.titleEn,titleJa:dt.titleJa,bodyEn:dt.bodyEn,bodyJa:dt.bodyJa}),Y=g.querySelector("#studio-je-save");Y instanceof HTMLButtonElement&&(Y.disabled=!0),tt("info","Saving…");try{await _l({id:dt.id,link:yt,imageSrc:dt.imageSrc,entryStatus:dt.entryStatus,localesJson:JSON.stringify({en:K,ja:et})}),I(),A(),typeof i.afterJournalSave=="function"&&i.afterJournalSave(dt.id),s()}catch(st){tt("error",st instanceof Error?st.message:String(st)),Y instanceof HTMLButtonElement&&(Y.disabled=!1)}}),I(),y(),queueMicrotask(()=>{j instanceof HTMLInputElement&&(j.focus(),j.value.trim()||j.select())})}function Hp(e){const s=Math.max(0,Number(e)||0);return s<1024*1024?`${(s/1024).toFixed(1)} KB`:s<1024*1024*1024?`${(s/(1024*1024)).toFixed(1)} MB`:`${(s/(1024*1024*1024)).toFixed(2)} GB`}function qp(e,s,i={}){const o=document.createElement("div");o.className="studio-modal-root studio-upload-progress-root",o.innerHTML=`
        <div class="studio-modal-backdrop"></div>
        <div class="studio-modal-panel studio-upload-progress-panel" role="dialog" aria-modal="true" aria-labelledby="studio-upload-progress-title">
            <div class="studio-modal-header">
                <h2 id="studio-upload-progress-title" class="studio-modal-title">Uploading video</h2>
            </div>
            <div class="studio-modal-body studio-upload-progress-body">
                <p class="studio-upload-progress-name"></p>
                <p class="studio-upload-progress-size studio-muted"></p>
                <div class="studio-upload-progress-bar-wrap" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
                    <div class="studio-upload-progress-bar"></div>
                </div>
                <p class="studio-upload-progress-pct">0%</p>
                <p class="studio-upload-progress-phase studio-muted">Preparing…</p>
                <button type="button" class="studio-btn-ghost studio-upload-progress-cancel">Cancel upload</button>
            </div>
        </div>
    `,document.body.appendChild(o);const n=o.querySelector(".studio-upload-progress-name"),a=o.querySelector(".studio-upload-progress-size"),r=o.querySelector(".studio-upload-progress-bar"),l=o.querySelector(".studio-upload-progress-pct"),d=o.querySelector(".studio-upload-progress-phase"),p=o.querySelector(".studio-upload-progress-bar-wrap"),u=o.querySelector(".studio-upload-progress-cancel");n&&(n.textContent=String(e||"Video")),a&&(a.textContent=Hp(s));let c=!1;const m=()=>{c||(c=!0,o.remove())};u==null||u.addEventListener("click",()=>{var L;(L=i.onCancel)==null||L.call(i),m()});const b=(L={})=>{const A=Math.max(0,Number(L.total)||s||0),g=Math.max(0,Number(L.loaded)||0),f=Number.isFinite(L.percent)?Math.max(0,Math.min(100,Math.round(L.percent))):A>0?Math.max(0,Math.min(100,Math.round(g/A*100))):0;r instanceof HTMLElement&&(r.style.width=`${f}%`),l&&(l.textContent=`${f}%`),p instanceof HTMLElement&&p.setAttribute("aria-valuenow",String(f)),d&&L.phase&&(d.textContent=L.phase)};return{update:b,fail:L=>{d&&(d.textContent=L||"Upload failed",d.classList.add("studio-upload-progress-phase--error")),u instanceof HTMLButtonElement&&(u.textContent="Close"),u==null||u.addEventListener("click",m,{once:!0})},complete:()=>{b({percent:100,phase:"Complete"}),window.setTimeout(m,900)},close:m}}const Pp="fusionMedia/uploads/",ki=4;function Np(e){const s=Math.max(0,Number(e)||0);return s>=1024*1024*1024?`${(s/(1024*1024*1024)).toFixed(1)} GB`:s>=1024*1024?`${(s/(1024*1024)).toFixed(1)} MB`:s>=1024?`${Math.round(s/1024)} KB`:`${s} B`}function Rp(e){const s=String((e==null?void 0:e.type)||"").trim();if(s&&/^video\//i.test(s))return s;const i=String(e instanceof File?e.name:"").toLowerCase();return i.endsWith(".mp4")?"video/mp4":i.endsWith(".webm")?"video/webm":i.endsWith(".mov")?"video/quicktime":"application/octet-stream"}function oa(e,s={}){const i=s.partNumber!=null?`part ${s.partNumber}${s.partCount?` of ${s.partCount}`:""}`:"",o=s.bytesUploaded!=null&&s.bytesUploaded>0?` (~${Np(s.bytesUploaded)} uploaded)`:"";return e===0?s.partNumber!=null&&s.partNumber>1?`Connection dropped while uploading ${i}${o}. Large uploads often fail here due to network timeouts — retry the upload on a stable connection. If it always fails at the same spot, confirm bucket CORS includes PUT, AllowedHeaders "*", and ExposeHeaders "ETag".`:'Upload blocked by the browser (usually bucket CORS or CSP). In Cloudflare R2 or AWS S3, add your exact Studio origin to bucket CORS with PUT allowed, AllowedHeaders ["*"], and ExposeHeaders ["ETag"]. See docs/DEPLOY_RENDER_AND_ICP.md → Object storage CORS.':e===403?`Upload rejected (HTTP 403)${i?` on ${i}`:""}. Check storage credentials and presigned URL expiry.`:`Upload failed: HTTP ${e}${i?` (${i})`:""}`}function Up(e){return new Promise(s=>setTimeout(s,e))}function Fp(e,s,i={}){const{contentType:o,signal:n,onProgress:a,partNumber:r,partCount:l,bytesUploaded:d}=i,p={partNumber:r,partCount:l,bytesUploaded:d};return new Promise((u,c)=>{const m=new XMLHttpRequest;if(m.open("PUT",e,!0),m.timeout=0,o&&m.setRequestHeader("Content-Type",o),n){if(n.aborted){c(new DOMException("Aborted","AbortError"));return}n.addEventListener("abort",()=>{m.abort(),c(new DOMException("Aborted","AbortError"))})}m.upload.onprogress=b=>{b.lengthComputable&&(a==null||a(b.loaded,b.total))},m.onload=()=>{if(m.status>=200&&m.status<300){const b=m.getResponseHeader("ETag")||m.getResponseHeader("etag")||"",C=String(b).replace(/^"|"$/g,"");if(!C){c(new Error(`Upload ${r!=null?`part ${r} `:""}returned no ETag. Add "ExposeHeaders": ["ETag"] to your R2/S3 bucket CORS rule (required to finish multipart uploads).`));return}u(C);return}c(new Error(oa(m.status,p)))},m.onerror=()=>c(new Error(oa(m.status||0,p))),m.ontimeout=()=>c(new Error(`Upload timed out${r!=null?` on part ${r}`:""}. Retry on a stable network connection.`)),m.send(s)})}async function Wi(e,s,i){var n,a;let o=null;for(let r=1;r<=ki;r++){if((n=i.signal)!=null&&n.aborted)throw new DOMException("Aborted","AbortError");r>1&&((a=i.onRetry)==null||a.call(i,r,ki),await Up(400*r));try{const l=await e();return await Fp(l,s,i)}catch(l){if(o=l instanceof Error?l:new Error(String(l)),o instanceof DOMException&&o.name==="AbortError")throw o;if(r>=ki)break}}throw o||new Error("Upload failed")}function Dp(){return crypto.randomUUID().replace(/-/g,"").slice(0,8)}function Bp(e,s=40){const i=String(e||"video.mp4").replace(/[^a-zA-Z0-9._-]/g,"_")||"video.mp4",o=i.lastIndexOf(".");return o>0&&o<i.length-1?`${i.slice(0,o).slice(0,s)}${i.slice(o)}`:i.slice(0,s+16)}async function na(e,s,i,o,n,a,r,l){const d=(e-1)*i;return Wi(a,r,{signal:l,partNumber:e,partCount:s,bytesUploaded:d,onProgress:p=>{n(d+p,o,`Uploading part ${e} of ${s}…`)},onRetry:(p,u)=>{n(d,o,`Retrying part ${e} of ${s} (${p}/${u})…`)}})}async function aa(e,s={}){Uc();const i=s.kind==="full"?"full":"preview",o=Rp(e),n=String(s.contentId||s.videoId||"community-video").trim()||"community-video",a=e.size>Ml;let r=null,l=new AbortController;s.signal&&s.signal.addEventListener("abort",()=>l.abort()),s.showModal!==!1&&(r=qp(e.name,e.size,{onCancel:()=>l.abort()}));const d=(p,u,c)=>{r==null||r.update({loaded:p,total:u,phase:c})};try{if(i==="full"){if(!a){r==null||r.update({phase:"Preparing upload…"});const f=await xl({contentId:n,fileName:e.name,contentType:o});return d(0,e.size,"Uploading…"),await Wi(async()=>f.putUrl,e,{contentType:o,signal:l.signal,onProgress:(v,E)=>d(v,E,"Uploading…")}),r==null||r.complete(),{key:f.key,fileName:f.fileName||e.name}}r==null||r.update({phase:"Starting multipart upload…"});const w=await Il({contentId:n,fileName:e.name,contentType:o,fileSize:e.size}),L=[],A=Number(w.partSize)||32*1024*1024,g=Number(w.partCount)||Math.ceil(e.size/A);try{for(let v=1;v<=g;v++){const E=(v-1)*A,j=Math.min(e.size,E+A),M=e.slice(E,j),S=await na(v,g,A,e.size,d,async()=>{const{putUrl:h}=await jl({key:w.key,uploadId:w.uploadId,partNumber:v});return h},M,l.signal);L.push({partNumber:v,etag:S})}r==null||r.update({phase:"Finishing upload…",percent:99});const f=await Hl({key:w.key,uploadId:w.uploadId,parts:L});return r==null||r.complete(),{key:f.key||w.key,fileName:f.fileName||e.name}}catch(f){throw await ql({key:w.key,uploadId:w.uploadId}).catch(()=>{}),f}}const p=`studio/videos/${n}/${Dp()}-${Bp(e.name)}`,u=Pp;if(!a){r==null||r.update({phase:"Preparing upload…"});const{putUrl:w,publicUrl:L}=await Pl(p,o,{rootPrefix:u});d(0,e.size,"Uploading…"),await Wi(async()=>w,e,{contentType:o,signal:l.signal,onProgress:(g,f)=>d(g,f,"Uploading…")});const A=Ws(L);return r==null||r.complete(),{publicUrl:A,url:A}}r==null||r.update({phase:"Starting multipart upload…"});const c=await Nl({key:p,contentType:o,fileSize:e.size,rootPrefix:u}),m=[],b=Number(c.partSize)||32*1024*1024,C=Number(c.partCount)||Math.ceil(e.size/b);try{for(let A=1;A<=C;A++){const g=(A-1)*b,f=Math.min(e.size,g+b),v=e.slice(g,f),E=await na(A,C,b,e.size,d,async()=>{const{putUrl:j}=await Rl({key:c.key,uploadId:c.uploadId,partNumber:A});return j},v,l.signal);m.push({partNumber:A,etag:E})}r==null||r.update({phase:"Finishing upload…",percent:99});const w=await Ul({key:c.key,uploadId:c.uploadId,parts:m}),L=Ws(w.publicUrl);return r==null||r.complete(),{publicUrl:L,url:L,key:w.key}}catch(w){throw await Fl({key:c.key,uploadId:c.uploadId}).catch(()=>{}),w}}catch(p){const u=p instanceof Error?p.message:String(p);throw p instanceof DOMException&&p.name==="AbortError"?(r==null||r.fail("Upload cancelled"),new Error("Upload cancelled")):(r==null||r.fail(u),p instanceof Error?p:new Error(u))}}function Op(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function ra(e){const s=Math.max(0,Math.floor(Number(e)||0)),i=Math.floor(s/60),o=s%60;return`${i}:${String(o).padStart(2,"0")}`}function Jp(e,s=.92){return new Promise((i,o)=>{const n=e.videoWidth,a=e.videoHeight;if(!n||!a){o(new Error("Video not ready for capture"));return}const r=document.createElement("canvas");r.width=n,r.height=a;const l=r.getContext("2d");if(!l){o(new Error("Canvas unavailable"));return}try{l.drawImage(e,0,0,n,a)}catch{o(new Error("Could not read video frame (CORS). Use a local file or preview URL with CORS."));return}r.toBlob(d=>{d?i(d):o(new Error("Frame capture failed"))},"image/jpeg",s)})}function Vp(e,s){var A,g;if(!e)return()=>{};e.innerHTML=`
        <div class="studio-video-frame-capture">
            <h4 class="studio-subheading">Capture poster &amp; thumbnail</h4>
            <p class="studio-muted studio-video-frame-hint">Scrub to a frame, then capture. Upload preview or pick a local file first.</p>
            <div class="studio-video-frame-player-wrap">
                <video class="studio-video-frame-video" playsinline muted preload="metadata" crossorigin="anonymous"></video>
            </div>
            <input type="range" class="studio-video-frame-scrub" min="0" max="0" step="0.05" value="0" disabled />
            <div class="studio-video-frame-time">
                <span class="studio-video-frame-current">0:00</span>
                <span class="studio-video-frame-duration">0:00</span>
            </div>
            <div class="studio-video-frame-actions">
                <button type="button" class="studio-btn-ghost studio-video-frame-back">◀ 1s</button>
                <button type="button" class="studio-btn-ghost studio-video-frame-forward">1s ▶</button>
                <button type="button" class="studio-btn-secondary studio-video-frame-capture-btn" disabled>Capture frame</button>
            </div>
            <div class="studio-video-frame-preview-wrap" hidden>
                <img class="studio-video-frame-preview-img" alt="Captured frame preview" />
            </div>
            <fieldset class="studio-video-frame-targets">
                <label><input type="radio" name="frame-target" value="both" checked /> Poster &amp; card image</label>
                <label><input type="radio" name="frame-target" value="poster" /> Poster only</label>
                <label><input type="radio" name="frame-target" value="image" /> Card image only</label>
            </fieldset>
            <button type="button" class="studio-btn-primary studio-video-frame-upload-btn" disabled>Upload captured images</button>
            <p class="studio-video-frame-status studio-muted" role="status"></p>
        </div>
    `;const i=e.querySelector(".studio-video-frame-video"),o=e.querySelector(".studio-video-frame-scrub"),n=e.querySelector(".studio-video-frame-hint"),a=e.querySelector(".studio-video-frame-capture-btn"),r=e.querySelector(".studio-video-frame-upload-btn"),l=e.querySelector(".studio-video-frame-preview-wrap"),d=e.querySelector(".studio-video-frame-preview-img"),p=e.querySelector(".studio-video-frame-status"),u=e.querySelector(".studio-video-frame-current"),c=e.querySelector(".studio-video-frame-duration");let m=null,b="";const C=f=>{p&&(p.textContent=f||"")},w=()=>{i instanceof HTMLVideoElement&&(u&&(u.textContent=ra(i.currentTime)),c&&(c.textContent=ra(i.duration||0)),o instanceof HTMLInputElement&&(o.value=String(i.currentTime||0)))},L=async()=>{if(!(i instanceof HTMLVideoElement))return;const f=await s.getVideoSrc();if(!f){n&&(n.textContent="Upload a preview or select a local video file first."),o instanceof HTMLInputElement&&(o.disabled=!0),a instanceof HTMLButtonElement&&(a.disabled=!0);return}b&&b.startsWith("blob:")&&URL.revokeObjectURL(b),i.src=f,b=f,o instanceof HTMLInputElement&&(o.disabled=!1),a instanceof HTMLButtonElement&&(a.disabled=!1),n&&(n.textContent="Scrub to the frame you want for the poster and card thumbnail.")};return i==null||i.addEventListener("loadedmetadata",()=>{o instanceof HTMLInputElement&&i instanceof HTMLVideoElement&&(o.max=String(Math.max(0,i.duration||0))),w()}),i==null||i.addEventListener("timeupdate",w),o==null||o.addEventListener("input",()=>{i instanceof HTMLVideoElement&&o instanceof HTMLInputElement&&(i.currentTime=Number(o.value))}),(A=e.querySelector(".studio-video-frame-back"))==null||A.addEventListener("click",()=>{i instanceof HTMLVideoElement&&(i.currentTime=Math.max(0,i.currentTime-1))}),(g=e.querySelector(".studio-video-frame-forward"))==null||g.addEventListener("click",()=>{i instanceof HTMLVideoElement&&(i.currentTime=Math.min(i.duration||0,i.currentTime+1))}),a==null||a.addEventListener("click",async()=>{if(i instanceof HTMLVideoElement)try{m=await Jp(i),d instanceof HTMLImageElement&&l instanceof HTMLElement&&(d.src=URL.createObjectURL(m),l.hidden=!1),r instanceof HTMLButtonElement&&(r.disabled=!1),C("Frame captured — choose target and upload.")}catch(f){C(f instanceof Error?f.message:String(f))}}),r==null||r.addEventListener("click",async()=>{var E,j;if(!m)return;const f=((E=e.querySelector('input[name="frame-target"]:checked'))==null?void 0:E.value)||"both",v=String(s.videoId||"draft").trim()||"draft";try{C("Uploading captured frame…");const M=new File([m],"poster.jpg",{type:"image/jpeg"}),{file:S}=await gs(M),h={};(f==="both"||f==="poster")&&(h.posterUrl=await Gt(S,null,{area:"studio/videos",entityType:"video",entityId:v,fieldKey:"poster"})),(f==="both"||f==="image")&&(h.imageUrl=await Gt(S,null,{area:"studio/videos",entityType:"video",entityId:v,fieldKey:"card-image"})),f==="both"&&h.posterUrl&&!h.imageUrl&&(h.imageUrl=h.posterUrl),C("Captured images uploaded."),(j=s.onCaptured)==null||j.call(s,h)}catch(M){C(M instanceof Error?M.message:String(M))}}),L(),()=>{b&&b.startsWith("blob:")&&URL.revokeObjectURL(b),e.innerHTML=""}}function Wp(e){return`<div class="studio-video-frame-mount" data-video-id="${Op(e)}"></div>`}function Kt(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function hr(e){const s=Math.max(0,Math.floor(Number(e)||0)),i=Math.floor(s/60),o=s%60;return`${i}:${String(o).padStart(2,"0")}`}function vr(e){const s=String(e??"").trim();if(!s)return 0;if(/^\d+(\.\d+)?$/.test(s))return Math.max(0,Math.floor(Number(s)));const i=s.split(":").map(o=>Number(o));return i.some(o=>!Number.isFinite(o))?0:i.length===2?Math.max(0,Math.floor(i[0]*60+i[1])):i.length===3?Math.max(0,Math.floor(i[0]*3600+i[1]*60+i[2])):0}function _i(e){const i=(e!=null&&e.locales&&typeof e.locales=="object"?e.locales:{}).en;return String((i&&typeof i=="object"?i:{}).name??(e==null?void 0:e.name)??(e==null?void 0:e.slug)??(e==null?void 0:e.id)??"Artist")}function Gp(e,s){const i=String(s??"");return`
        <option value="">Select artist</option>
        ${[...Array.isArray(e)?e:[]].sort((n,a)=>_i(n).localeCompare(_i(a),void 0,{sensitivity:"base"})).map(n=>{const a=String((n==null?void 0:n.id)??"");return`<option value="${Kt(a)}" ${a===i?"selected":""}>${Kt(_i(n))}</option>`}).join("")}
    `}function la(e,s,i,o="Artist timestamps",n="Each row links a video timestamp to an artist in the roster."){const a=(Array.isArray(s)?s:[]).map((r,l)=>{const d=r&&typeof r=="object"?r:{};return`
            <div class="studio-form-grid studio-video-ts__chapter-row" data-chapter-row="${Kt(e)}">
                <label class="studio-field">
                    <span>Artist</span>
                    <select class="studio-select sv-ts-chapter-artist">
                        ${Gp(i,d.artistId)}
                    </select>
                </label>
                <label class="studio-field">
                    <span>Timestamp</span>
                    <input type="text" class="studio-input sv-ts-chapter-time" value="${Kt(hr(d.timestampSec))}" placeholder="1:12" />
                </label>
                <div class="studio-field">
                    <span>&nbsp;</span>
                    <button type="button" class="studio-btn-ghost sv-ts-chapter-del" data-feature="${Kt(e)}" data-chapter-index="${l}">Remove</button>
                </div>
            </div>`}).join("");return`
        <div class="studio-video-ts__section">
            <h4 class="studio-subheading">${Kt(o)}</h4>
            <p class="studio-muted">${Kt(n)}</p>
            ${a||'<p class="studio-muted">No timestamps yet.</p>'}
            <button type="button" class="studio-btn-ghost sv-ts-chapter-add" data-feature="${Kt(e)}">Add timestamp</button>
        </div>`}function da(e,s,i="Idea timestamps",o="Each row adds a localized topic or quote timestamp."){const n=(Array.isArray(s)?s:[]).map((a,r)=>{const l=a&&typeof a=="object"?a:{};return`
            <div class="studio-field-group studio-video-ts__topic-card" data-topic-row="${Kt(e)}">
                <div class="studio-form-grid">
                    <label class="studio-field">
                        <span>Timestamp</span>
                        <input type="text" class="studio-input sv-ts-topic-time" value="${Kt(hr(l.timestampSec))}" placeholder="1:12" />
                    </label>
                    <label class="studio-field">
                        <span>Title EN</span>
                        <input type="text" class="studio-input sv-ts-topic-title-en" value="${Kt(String(l.titleEn??""))}" />
                    </label>
                    <label class="studio-field">
                        <span>Title JA</span>
                        <input type="text" class="studio-input sv-ts-topic-title-ja" value="${Kt(String(l.titleJa??""))}" />
                    </label>
                </div>
                <label class="studio-field">
                    <span>Quote/description EN</span>
                    <textarea class="studio-input sv-ts-topic-quote-en" rows="2">${Kt(String(l.quoteEn??""))}</textarea>
                </label>
                <label class="studio-field">
                    <span>Quote/description JA</span>
                    <textarea class="studio-input sv-ts-topic-quote-ja" rows="2">${Kt(String(l.quoteJa??""))}</textarea>
                </label>
                <button type="button" class="studio-btn-ghost sv-ts-topic-del" data-feature="${Kt(e)}" data-topic-index="${r}">Remove topic</button>
            </div>`}).join("");return`
        <div class="studio-video-ts__section">
            <h4 class="studio-subheading">${Kt(i)}</h4>
            <p class="studio-muted">${Kt(o)}</p>
            ${n||'<p class="studio-muted">No idea timestamps yet.</p>'}
            <button type="button" class="studio-btn-ghost sv-ts-topic-add" data-feature="${Kt(e)}">Add idea timestamp</button>
        </div>`}function Kp(e,s){const i=Array.isArray(e.previewChapters)?e.previewChapters:[],o=Array.isArray(e.previewTopics)?e.previewTopics:[],n=Array.isArray(e.fullChapters)?e.fullChapters:[],a=Array.isArray(e.fullTopics)?e.fullTopics:[];return`
        <div class="studio-video-ts studio-community__timestamp-shell">
            <details class="studio-community__timestamp-group studio-video-ts__group" open>
                <summary>
                    <span>Preview video timestamps</span>
                    <small>Shown to non-members and teaser viewers.</small>
                </summary>
                <div class="studio-community__timestamp-grid studio-video-ts__grid">
                    ${la("preview",i,s,"People","Artist moments for the public preview.")}
                    ${da("preview",o,"Ideas","Topic or quote timestamps for the public preview.")}
                </div>
            </details>
            <details class="studio-community__timestamp-group studio-video-ts__group">
                <summary>
                    <span>Full video timestamps</span>
                    <small>Shown after the members-only full video unlocks.</small>
                </summary>
                <div class="studio-community__timestamp-grid studio-video-ts__grid">
                    ${la("full",n,s,"People","Artist moments for the full members-only video.")}
                    ${da("full",a,"Ideas","Topic or quote timestamps for the full members-only video.")}
                </div>
            </details>
        </div>`}function ca(e,s){const i=e.querySelectorAll(`[data-chapter-row="${s}"]`);return Array.from(i).map(o=>{var r,l;const n=String(((r=o.querySelector(".sv-ts-chapter-artist"))==null?void 0:r.value)??"").trim(),a=vr(((l=o.querySelector(".sv-ts-chapter-time"))==null?void 0:l.value)??"");return n?{artistId:n,timestampSec:a}:null}).filter(Boolean).sort((o,n)=>o.timestampSec-n.timestampSec)}function ua(e,s){const i=e.querySelectorAll(`[data-topic-row="${s}"]`);return Array.from(i).map(o=>{var p,u,c,m,b;const n=String(((p=o.querySelector(".sv-ts-topic-title-en"))==null?void 0:p.value)??"").trim(),a=String(((u=o.querySelector(".sv-ts-topic-title-ja"))==null?void 0:u.value)??"").trim(),r=String(((c=o.querySelector(".sv-ts-topic-quote-en"))==null?void 0:c.value)??"").trim(),l=String(((m=o.querySelector(".sv-ts-topic-quote-ja"))==null?void 0:m.value)??"").trim(),d=vr(((b=o.querySelector(".sv-ts-topic-time"))==null?void 0:b.value)??"");return n||a||r||l?{timestampSec:d,titleEn:n,titleJa:a,quoteEn:r,quoteJa:l}:null}).filter(Boolean).sort((o,n)=>o.timestampSec-n.timestampSec)}function zp(e,s,i,o,n){const a=()=>o(i());e.querySelectorAll(".sv-ts-chapter-add").forEach(r=>{r.addEventListener("click",l=>{l.preventDefault();const d=r.getAttribute("data-feature")||"",p=i(),u=d==="full"?"fullChapters":"previewChapters",c=[...Array.isArray(p[u])?p[u]:[],{artistId:"",timestampSec:0}];o({...p,[u]:c}),n()})}),e.querySelectorAll(".sv-ts-chapter-del").forEach(r=>{r.addEventListener("click",l=>{l.preventDefault();const d=r.getAttribute("data-feature")||"",p=Number(r.getAttribute("data-chapter-index")??-1),u=i(),c=d==="full"?"fullChapters":"previewChapters",m=[...Array.isArray(u[c])?u[c]:[]];p>=0&&m.splice(p,1),o({...u,[c]:m}),n()})}),e.querySelectorAll(".sv-ts-topic-add").forEach(r=>{r.addEventListener("click",l=>{l.preventDefault();const d=r.getAttribute("data-feature")||"",p=i(),u=d==="full"?"fullTopics":"previewTopics",c=[...Array.isArray(p[u])?p[u]:[],{timestampSec:0,titleEn:"",titleJa:"",quoteEn:"",quoteJa:""}];o({...p,[u]:c}),n()})}),e.querySelectorAll(".sv-ts-topic-del").forEach(r=>{r.addEventListener("click",l=>{l.preventDefault();const d=r.getAttribute("data-feature")||"",p=Number(r.getAttribute("data-topic-index")??-1),u=i(),c=d==="full"?"fullTopics":"previewTopics",m=[...Array.isArray(u[c])?u[c]:[]];p>=0&&m.splice(p,1),o({...u,[c]:m}),n()})}),e.querySelectorAll(".studio-video-ts__group").forEach(r=>{r instanceof HTMLDetailsElement&&r.addEventListener("toggle",a)})}function ae(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}let us=null;async function pa(e,s){var O,G,V,at,tt,z,F,I;const i=!(e!=null&&e.id),o=i?"media":"overview",n=as(e||{id:`vid_${Date.now()}`}),a=Ae(n.localesJson),r=Array.isArray((O=s.featured)==null?void 0:O.videoIds)?s.featured.videoIds.map(String):[],l=r.includes(String(n.id)),d=String(((G=s.featured)==null?void 0:G.heroVideoId)||"")===String(n.id),p=r.length>=6&&!l,u=["line","kicker","headline","body","ctaJoinLabel","ctaWatchLabel"],c=(Array.isArray(s.otherVideos)?s.otherVideos:[]).filter(y=>String((y==null?void 0:y.id)??"")!==String(n.id)),m=c.map(y=>{const _=Ae(y.localesJson),$=String(_.headlineEn||_.headlineJa||y.slug||y.id||"Video");return`<option value="${ae(String(y.id))}">${ae($)}</option>`}).join("");us=null,pe("studio_video_modal_opened",{video_id:n.id,is_new:i});let b=[];try{b=await Ba(),Array.isArray(b)||(b=[])}catch{b=[]}let C={previewChapters:Array.isArray(n.previewChapters)?[...n.previewChapters]:[],previewTopics:Array.isArray(n.previewTopics)?[...n.previewTopics]:[],fullChapters:Array.isArray(n.fullChapters)?[...n.fullChapters]:[],fullTopics:Array.isArray(n.fullTopics)?[...n.fullTopics]:[]};const w=`
        <div class="studio-modal-form studio-modal-form--video studio-video-editor">
            <div class="studio-video-editor-rail">
                <div class="studio-video-editor-poster" style="${n.posterUrl?`background-image:url(${ae(n.posterUrl)})`:""}"></div>
                <div class="studio-video-editor-pills">
                    <span>${n.visible?"Visible":"Hidden"}</span>
                    <span>${l?"Featured":"Not featured"}${d?" ★":""}</span>
                    <span>${n.previewVideoUrl?"Preview ✓":"Preview —"}</span>
                    <span>${n.fullVideoKey?"Full ✓":"Full —"}</span>
                </div>
            </div>
            <div class="studio-video-editor-main">
                <div class="studio-tabs studio-video-editor-tabs">
                    <div class="studio-tabs__list" role="tablist">
                    <button type="button" class="studio-tabs__tab studio-video-tab${o==="overview"?" is-active":""}" data-tab="overview">Overview</button>
                    <button type="button" class="studio-tabs__tab studio-video-tab${o==="media"?" is-active":""}" data-tab="media">Media</button>
                    <button type="button" class="studio-tabs__tab studio-video-tab" data-tab="copy">Copy</button>
                    <button type="button" class="studio-tabs__tab studio-video-tab" data-tab="timestamps">Timestamps</button>
                    </div>
                </div>
                <div class="studio-video-panel studio-tabs__panel${o==="overview"?" is-active":""}" data-panel="overview"${o!=="overview"?" hidden":""}>
                    ${i?'<p class="studio-modal-hint">Use the <strong>Media</strong> tab to upload preview and full videos, then add copy and timestamps before saving.</p>':""}
                    <label class="studio-field studio-field--inline">
                        <input type="checkbox" id="sv-visible" ${n.visible?"checked":""} ${s.canEdit?"":"disabled"} />
                        <span>Visible on site</span>
                    </label>
                    <label class="studio-field studio-field--inline">
                        <input type="checkbox" id="sv-featured" ${l?"checked":""} ${!s.canEdit||p&&!l?"disabled":""} />
                        <span>Featured on Community &amp; /videos</span>
                    </label>
                    ${p?'<p class="studio-muted studio-video-featured-hint">Featured list is full (6 max). Remove one from the featured row above, then edit this video again.</p>':'<p class="studio-muted studio-video-featured-hint">Featured videos appear in the Community hero row and /videos page.</p>'}
                    <label class="studio-field"><span>Published (ISO)</span><input class="studio-input" id="sv-published" value="${ae(n.publishedAt)}" /></label>
                    <label class="studio-field"><span>Sort order</span><input class="studio-input" id="sv-sort" type="number" value="${ae(n.sortOrder)}" /></label>
                    <label class="studio-field"><span>Slug</span><input class="studio-input" id="sv-slug" value="${ae(n.slug)}" /></label>
                </div>
                <div class="studio-video-panel studio-tabs__panel studio-video-panel--media${o==="media"?" is-active":""}" data-panel="media"${o!=="media"?" hidden":""}>
                    <div class="studio-video-panel-scroll">
                    <p class="studio-modal-hint">Upload preview (public) and full (members-only) videos. URLs are filled in automatically after upload.</p>
                    <h4 class="studio-subheading">Preview video (public)</h4>
                    <label class="studio-field studio-field--full">
                        <span>Preview video URL</span>
                        <input class="studio-input" id="sv-preview-url" value="${ae(n.previewVideoUrl)}" placeholder="https://… or upload below" />
                    </label>
                    <div class="studio-community__file-actions">
                        <label class="studio-file-label studio-btn-ghost" for="sv-preview-file">
                            <input type="file" id="sv-preview-file" accept="video/*,.mp4,.webm,.mov" class="studio-file-input" />
                            Upload preview video
                        </label>
                    </div>
                    <h4 class="studio-subheading">Full video (members)</h4>
                    <label class="studio-field studio-field--full">
                        <span>Full video key</span>
                        <input class="studio-input" id="sv-full-key" value="${ae(n.fullVideoKey)}" placeholder="fusionMedia/private-video/…" />
                    </label>
                    <p class="studio-muted studio-community__field-hint">Object key in storage, not a CDN URL. Example: <code>fusionMedia/private-video/Rodolfo-Full.mp4</code>. Use the key from “Upload full video” or paste a migrated key.</p>
                    <label class="studio-field studio-field--full">
                        <span>Full video file name</span>
                        <input class="studio-input" id="sv-full-name" value="${ae(n.fullVideoFileName)}" placeholder="File name" />
                    </label>
                    <div class="studio-community__file-actions">
                        <label class="studio-file-label studio-btn-ghost" for="sv-full-file">
                            <input type="file" id="sv-full-file" accept="video/*,.mp4,.webm,.mov" class="studio-file-input" />
                            Upload full video
                        </label>
                    </div>
                    <h4 class="studio-subheading">Images</h4>
                    <label class="studio-field"><span>Poster URL</span><input class="studio-input" id="sv-poster" value="${ae(n.posterUrl)}" /></label>
                    <label class="studio-field"><span>Card image URL</span><input class="studio-input" id="sv-image" value="${ae(n.imageUrl)}" /></label>
                    <div class="studio-community__file-actions">
                        <label class="studio-file-label studio-btn-ghost" for="sv-poster-file">
                            <input type="file" id="sv-poster-file" accept="image/*" class="studio-file-input" />
                            Upload poster
                        </label>
                    </div>
                    ${Wp(String(n.id))}
                    </div>
                </div>
                <div class="studio-video-panel studio-tabs__panel" data-panel="copy" hidden>
                    <div class="studio-video-copy-from">
                        <label class="studio-field studio-video-copy-from__field">
                            <span>Copy from another video</span>
                            <select class="studio-select" id="sv-copy-from"${c.length?"":" disabled"}>
                                <option value="">Select a video…</option>
                                ${m}
                            </select>
                        </label>
                        <button type="button" class="studio-btn-ghost" id="sv-copy-from-btn"${c.length?"":" disabled"}>Copy copy</button>
                    </div>
                    ${u.map(y=>`
                    <label class="studio-field"><span>${y} EN</span><input class="studio-input" id="sv-${y}-en" value="${ae(a[`${y}En`])}" /></label>
                    <label class="studio-field"><span>${y} JA</span><input class="studio-input" id="sv-${y}-ja" value="${ae(a[`${y}Ja`])}" /></label>`).join("")}
                </div>
                <div class="studio-video-panel studio-tabs__panel" data-panel="timestamps" hidden>
                    <div id="sv-timestamps-mount"></div>
                </div>
                <div class="studio-modal-actions">
                    <button type="button" class="studio-btn-primary" id="sv-save">Save</button>
                    ${s.onDelete?'<button type="button" class="studio-btn-danger" id="sv-delete">Delete</button>':""}
                    <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Cancel</button>
                </div>
                <p id="sv-msg" class="studio-banner studio-banner--info" style="display:none"></p>
            </div>
        </div>`,{close:L,root:A}=qt(w,{title:i?"Add video":n.headlineEn||n.slug||"Video",wide:!0}),g=A.querySelector(".studio-video-editor-poster"),f=A.querySelector("#sv-msg"),v=A.querySelector("#sv-timestamps-mount"),E=()=>({previewChapters:ca(A,"preview"),previewTopics:ua(A,"preview"),fullChapters:ca(A,"full"),fullTopics:ua(A,"full")}),j=()=>{v instanceof HTMLElement&&(v.innerHTML=Kp(C,b),zp(v,b,E,y=>{C={previewChapters:Array.isArray(y.previewChapters)?y.previewChapters:[],previewTopics:Array.isArray(y.previewTopics)?y.previewTopics:[],fullChapters:Array.isArray(y.fullChapters)?y.fullChapters:[],fullTopics:Array.isArray(y.fullTopics)?y.fullTopics:[]}},j))};j();const M=(y,_="info")=>{f&&(f.textContent=y,f.className=`studio-banner studio-banner--${_}`,f.style.display=y?"block":"none")};A.querySelectorAll(".studio-video-tab").forEach(y=>{y.addEventListener("click",()=>{const _=y.getAttribute("data-tab");A.querySelectorAll(".studio-video-tab").forEach($=>$.classList.toggle("is-active",$===y)),A.querySelectorAll(".studio-video-panel").forEach($=>{const H=$.getAttribute("data-panel")===_;$.hidden=!H,$.classList.toggle("is-active",H)})})});const S=A.querySelector(".studio-video-frame-mount");let h=()=>{};S instanceof HTMLElement&&(h=Vp(S,{videoId:String(n.id),getVideoSrc:async()=>{var _,$;return us?URL.createObjectURL(us):(($=(_=A.querySelector("#sv-preview-url"))==null?void 0:_.value)==null?void 0:$.trim())||null},onCaptured:y=>{y.posterUrl&&(A.querySelector("#sv-poster").value=y.posterUrl),y.imageUrl&&(A.querySelector("#sv-image").value=y.imageUrl),g instanceof HTMLElement&&(y.posterUrl||y.imageUrl)&&(g.style.backgroundImage=`url("${y.posterUrl||y.imageUrl}")`),pe("studio_video_frame_captured",{video_id:n.id})}}));const T=()=>{var $,H,R,x,q,X,ot,gt,Lt,bt,wt,_t,At,nt,dt,yt,K,et,Y,st,B,P,k,J,W,Z,ct,pt,ft;C=E();const y=((H=($=A.querySelector("#sv-headline-en"))==null?void 0:$.value)==null?void 0:H.trim())||"",_={lineEn:((R=A.querySelector("#sv-line-en"))==null?void 0:R.value)??"",lineJa:((x=A.querySelector("#sv-line-ja"))==null?void 0:x.value)??"",kickerEn:((q=A.querySelector("#sv-kicker-en"))==null?void 0:q.value)??"",kickerJa:((X=A.querySelector("#sv-kicker-ja"))==null?void 0:X.value)??"",headlineEn:y,headlineJa:((ot=A.querySelector("#sv-headline-ja"))==null?void 0:ot.value)??"",bodyEn:((gt=A.querySelector("#sv-body-en"))==null?void 0:gt.value)??"",bodyJa:((Lt=A.querySelector("#sv-body-ja"))==null?void 0:Lt.value)??"",ctaJoinLabelEn:((bt=A.querySelector("#sv-ctaJoinLabel-en"))==null?void 0:bt.value)??"",ctaJoinLabelJa:((wt=A.querySelector("#sv-ctaJoinLabel-ja"))==null?void 0:wt.value)??"",ctaWatchLabelEn:((_t=A.querySelector("#sv-ctaWatchLabel-en"))==null?void 0:_t.value)??"",ctaWatchLabelJa:((At=A.querySelector("#sv-ctaWatchLabel-ja"))==null?void 0:At.value)??""};return as({...n,id:n.id,slug:((dt=(nt=A.querySelector("#sv-slug"))==null?void 0:nt.value)==null?void 0:dt.trim())||Oc(y||n.id),visible:!!((yt=A.querySelector("#sv-visible"))!=null&&yt.checked),publishedAt:((et=(K=A.querySelector("#sv-published"))==null?void 0:K.value)==null?void 0:et.trim())||n.publishedAt,sortOrder:Number(((Y=A.querySelector("#sv-sort"))==null?void 0:Y.value)??n.sortOrder),previewVideoUrl:((B=(st=A.querySelector("#sv-preview-url"))==null?void 0:st.value)==null?void 0:B.trim())??"",fullVideoKey:((k=(P=A.querySelector("#sv-full-key"))==null?void 0:P.value)==null?void 0:k.trim())??"",fullVideoFileName:((W=(J=A.querySelector("#sv-full-name"))==null?void 0:J.value)==null?void 0:W.trim())??"",posterUrl:((ct=(Z=A.querySelector("#sv-poster"))==null?void 0:Z.value)==null?void 0:ct.trim())??"",imageUrl:((ft=(pt=A.querySelector("#sv-image"))==null?void 0:pt.value)==null?void 0:ft.trim())??"",localesJson:Jc(_),previewChaptersJson:JSON.stringify(C.previewChapters),previewTopicsJson:JSON.stringify(C.previewTopics),fullChaptersJson:JSON.stringify(C.fullChapters),fullTopicsJson:JSON.stringify(C.fullTopics)})};(V=A.querySelector("#sv-preview-file"))==null||V.addEventListener("change",async y=>{var H;const _=y.target,$=_ instanceof HTMLInputElement?(H=_.files)==null?void 0:H[0]:null;if($){us=$;try{pe("studio_video_upload_started",{kind:"preview",bytes:$.size});const R=await aa($,{kind:"preview",contentId:String(n.id)});R.url&&(A.querySelector("#sv-preview-url").value=R.url),pe("studio_video_upload_completed",{kind:"preview",bytes:$.size}),M("Preview video uploaded.")}catch(R){pe("studio_video_upload_failed",{kind:"preview"}),M(R instanceof Error?R.message:String(R),"warn")}_.value=""}}),(at=A.querySelector("#sv-full-file"))==null||at.addEventListener("change",async y=>{var H;const _=y.target,$=_ instanceof HTMLInputElement?(H=_.files)==null?void 0:H[0]:null;if($){us=$;try{pe("studio_video_upload_started",{kind:"full",bytes:$.size});const R=await aa($,{kind:"full",contentId:String(n.id)});R.key&&(A.querySelector("#sv-full-key").value=R.key),R.fileName&&(A.querySelector("#sv-full-name").value=R.fileName),pe("studio_video_upload_completed",{kind:"full",bytes:$.size}),M("Full video uploaded.")}catch(R){pe("studio_video_upload_failed",{kind:"full"}),M(R instanceof Error?R.message:String(R),"warn")}_.value=""}}),(tt=A.querySelector("#sv-poster-file"))==null||tt.addEventListener("change",async y=>{var H;const _=y.target,$=_ instanceof HTMLInputElement?(H=_.files)==null?void 0:H[0]:null;if($){try{const R=await Gt($,null,{area:"studio/videos",entityType:"video",entityId:String(n.id),fieldKey:"poster"});A.querySelector("#sv-poster").value=R,A.querySelector("#sv-image").value=R,g instanceof HTMLElement&&(g.style.backgroundImage=`url("${R}")`)}catch(R){M(R instanceof Error?R.message:String(R),"warn")}_.value=""}}),(z=A.querySelector("#sv-copy-from-btn"))==null||z.addEventListener("click",()=>{const y=A.querySelector("#sv-copy-from"),_=y instanceof HTMLSelectElement?y.value.trim():"";if(!_){M("Select a video to copy from.","warn");return}const $=c.find(x=>String(x==null?void 0:x.id)===_);if(!$){M("Source video not found.","warn");return}const H=Ae($.localesJson);for(const x of u){const q=A.querySelector(`#sv-${x}-en`),X=A.querySelector(`#sv-${x}-ja`);q instanceof HTMLInputElement&&(q.value=String(H[`${x}En`]??"")),X instanceof HTMLInputElement&&(X.value=String(H[`${x}Ja`]??""))}const R=String(H.headlineEn||H.headlineJa||$.slug||"video");M(`Copied copy from “${R}”.`),pe("studio_video_copy_from",{video_id:n.id,source_id:_})});const N=async y=>{var q;if(!s.onFeaturedChange)return;const _=A.querySelector("#sv-featured"),$=_ instanceof HTMLInputElement?_.checked:l;let H=[...r],R=(q=s.featured)!=null&&q.heroVideoId?String(s.featured.heroVideoId):null;const x=H.includes(y);if($&&!x){if(H.length>=6){M("Featured list is full (6 max). Save the video, then remove one from the featured row.","warn");return}H.push(y),R||(R=y)}else!$&&x&&(H=H.filter(X=>X!==y),R===y&&(R=H[0]||null));await s.onFeaturedChange({featuredVideoIds:H,heroVideoId:R})};(F=A.querySelector("#sv-save"))==null||F.addEventListener("click",async()=>{if(s.canEdit)try{const y=T();await s.onSave(y),await N(String(y.id)),pe("studio_video_saved",{video_id:y.id}),L(),h()}catch(y){M(y instanceof Error?y.message:String(y),"warn")}}),(I=A.querySelector("#sv-delete"))==null||I.addEventListener("click",async()=>{s.onDelete&&window.confirm("Delete this video?")&&(await s.onDelete(),L(),h())})}function $e(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Yp(e){const s=Date.parse(String(e||""));return Number.isFinite(s)?new Date(s).toLocaleDateString(void 0,{year:"numeric",month:"short",day:"numeric"}):"—"}function Sr(e,s,i={}){const o=Ae(e.localesJson),n=String(o.headlineEn||o.headlineJa||e.slug||"Video"),a=String(o.lineEn||o.lineJa||""),r=String(e.posterUrl||e.imageUrl||""),l=Xa(e),d=i.canEdit&&s?`<button type="button" class="studio-videos-featured-card__hero${i.isHero?" is-hero":""}" data-hero-set="${$e(e.id)}" aria-label="${i.isHero?"Clear landing hero":"Set as landing hero"}">${i.isHero?"★ Hero":"Set hero"}</button>`:"";return`<button type="button" class="studio-videos-featured-card${s?" is-selected":""}" data-video-id="${$e(e.id)}" aria-pressed="${s?"true":"false"}">
        <div class="studio-videos-featured-card__media" style="${r?`background-image:url(${$e(r)})`:""}"></div>
        <div class="studio-videos-featured-card__body">
            <strong>${$e(n)}</strong>
            <span>${$e(a)}</span>
            <div class="studio-videos-featured-card__pills">
                ${i.isHero?'<span class="studio-pill">Hero</span>':""}
                ${l.hasPreview?'<span class="studio-pill">Preview ✓</span>':'<span class="studio-pill studio-pill--muted">Draft</span>'}
            </div>
            ${d}
        </div>
    </button>`}async function Qp(e){var f,v,E,j;const s=Jt("community");if(!s.visible){e.innerHTML='<p class="studio-muted">You do not have access to Videos.</p>';return}const i=s.canEdit;e.innerHTML=`
        <div class="studio-section-stack studio-videos-page">
            <div class="studio-section-head">
                <h2>Videos</h2>
                <p class="studio-muted">Manage the /videos library and Community featured row.</p>
                ${i?'<button type="button" class="studio-btn-primary" id="studio-videos-add">Add video</button>':""}
            </div>
            <section class="studio-videos-featured-section">
                <div class="studio-videos-featured-head">
                    <div>
                        <h3 class="studio-subheading">Featured on Community</h3>
                        <p class="studio-muted">Select up to six visible videos for /community. Star one as the landing hero. Empty selection defaults to the six most recent visible videos.</p>
                    </div>
                    ${i?'<button type="button" class="studio-btn-primary" id="studio-videos-save-featured">Save featured</button>':""}
                </div>
                <div class="studio-videos-featured-rail" id="studio-videos-featured-rail"></div>
            </section>
            <div class="studio-videos-toolbar">
                <input type="search" id="studio-videos-search" class="studio-input" placeholder="Search videos…" />
                <select id="studio-videos-visible" class="studio-select">
                    <option value="all">All</option>
                    <option value="visible">Visible</option>
                    <option value="hidden">Hidden</option>
                </select>
            </div>
            <div class="studio-table-wrap">
                <table class="studio-table studio-table--dense">
                    <thead>
                        <tr>
                            <th>Poster</th>
                            <th>Title</th>
                            <th>Published</th>
                            <th>Visible</th>
                            <th>Media</th>
                            <th>Featured</th>
                        </tr>
                    </thead>
                    <tbody id="studio-videos-tbody"><tr><td colspan="6">Loading…</td></tr></tbody>
                </table>
            </div>
            <nav class="studio-pagination" id="studio-videos-pagination" style="display:none">
                <button type="button" class="studio-btn-ghost" id="studio-videos-prev">Prev</button>
                <span id="studio-videos-page-label"></span>
                <button type="button" class="studio-btn-ghost" id="studio-videos-next">Next</button>
            </nav>
        </div>`;let o=[],n={featuredVideoIds:[],heroVideoId:null},a=[],r=null,l=0;const d=10,p=e.querySelector("#studio-videos-tbody"),u=e.querySelector("#studio-videos-featured-rail"),c=e.querySelector("#studio-videos-search"),m=e.querySelector("#studio-videos-visible"),b=()=>{let M=o;const S=m instanceof HTMLSelectElement?m.value:"all";S==="visible"&&(M=M.filter(T=>T.visible!==!1)),S==="hidden"&&(M=M.filter(T=>T.visible===!1));const h=(c instanceof HTMLInputElement?c.value:"").trim().toLowerCase();return h&&(M=M.filter(T=>{const N=Ae(T.localesJson);return`${N.headlineEn} ${N.headlineJa} ${N.lineEn} ${T.slug}`.toLowerCase().includes(h)})),M},C=()=>{a=[...n.featuredVideoIds],r=n.heroVideoId?String(n.heroVideoId):null},w=()=>{if(!u)return;const M=o.filter(h=>h.visible!==!1),S=M.length?M.map(h=>{const T=String(h.id),N=a.includes(T);return Sr(h,N,{isHero:r===T,canEdit:i})}):[];u.innerHTML=S.length?S.join(""):'<p class="studio-muted">No visible videos yet. Add a video and mark it visible.</p>',u.querySelectorAll("[data-video-id]").forEach(h=>{h.addEventListener("click",T=>{if(T.target instanceof HTMLElement&&T.target.closest("[data-hero-set]"))return;const N=h.getAttribute("data-video-id");if(!N||!i){const G=o.find(V=>String(V.id)===N);G&&A(G);return}T.preventDefault();const O=a.indexOf(N);O>=0?(a.splice(O,1),r===N&&(r=null)):a.length<6&&(a.push(N),r||(r=N)),w()})}),u.querySelectorAll("[data-hero-set]").forEach(h=>{h.addEventListener("click",T=>{T.preventDefault(),T.stopPropagation();const N=h.getAttribute("data-hero-set");if(!(!N||!i)){if(r===N){r=null,w();return}if(!a.includes(N)){if(a.length>=6)return;a.push(N)}r=N,w()}})})},L=()=>{if(!p)return;const M=b(),S=Math.max(1,Math.ceil(M.length/d));l>=S&&(l=Math.max(0,S-1));const h=M.slice(l*d,l*d+d);h.length?(p.innerHTML=h.map(O=>{const G=Ae(O.localesJson),V=String(G.headlineEn||G.headlineJa||O.slug),at=String(O.posterUrl||O.imageUrl||""),tt=Xa(O),z=n.featuredVideoIds.includes(String(O.id)),F=String(n.heroVideoId)===String(O.id);return`<tr class="studio-videos-row" data-video-id="${$e(O.id)}" tabindex="0" role="button">
                        <td>${at?`<img src="${$e(at)}" alt="" width="48" height="27" style="object-fit:cover" />`:"—"}</td>
                        <td>${$e(V)}</td>
                        <td>${$e(Yp(O.publishedAt))}</td>
                        <td>${O.visible!==!1?"Yes":"No"}</td>
                        <td>${tt.hasPreview?"Preview":"—"}${tt.hasFull?" · Full":""}${tt.hasPoster?" · Poster":""}</td>
                        <td>${z?`Featured${F?" ★":""}`:"—"}</td>
                    </tr>`}).join(""),p.querySelectorAll(".studio-videos-row").forEach(O=>{const G=()=>{const V=O.getAttribute("data-video-id"),at=o.find(tt=>String(tt.id)===V);at&&A(at)};O.addEventListener("click",G),O.addEventListener("keydown",V=>{(V.key==="Enter"||V.key===" ")&&G()})})):p.innerHTML=`<tr><td colspan="6">${o.length?"No matches.":"No videos yet."}</td></tr>`;const T=e.querySelector("#studio-videos-pagination"),N=e.querySelector("#studio-videos-page-label");T&&N&&(T.style.display=S>1?"flex":"none",N.textContent=`Page ${l+1} / ${S}`)},A=M=>{pa(M,{canEdit:i,featured:{videoIds:a,heroVideoId:r},otherVideos:o,onFeaturedChange:i?async S=>{await di(S),n=S,a=[...S.featuredVideoIds],r=S.heroVideoId?String(S.heroVideoId):null,w(),L()}:void 0,onSave:async S=>{await Zo(S),await g()},onDelete:i?async()=>{await Dl(String(M.id)),await g()}:void 0})},g=async()=>{[o,n]=await Promise.all([eo(),Fi()]),C(),w(),L()};(f=e.querySelector("#studio-videos-add"))==null||f.addEventListener("click",()=>{pa(null,{canEdit:i,featured:{videoIds:a,heroVideoId:r},otherVideos:o,onFeaturedChange:i?async M=>{await di(M),n=M,a=[...M.featuredVideoIds],r=M.heroVideoId?String(M.heroVideoId):null,w(),L()}:void 0,onSave:async M=>{await Zo(M),await g()}})}),c==null||c.addEventListener("input",()=>{l=0,L()}),m==null||m.addEventListener("change",()=>{l=0,L()}),(v=e.querySelector("#studio-videos-prev"))==null||v.addEventListener("click",()=>{l=Math.max(0,l-1),L()}),(E=e.querySelector("#studio-videos-next"))==null||E.addEventListener("click",()=>{l+=1,L()}),(j=e.querySelector("#studio-videos-save-featured"))==null||j.addEventListener("click",async()=>{const M=e.querySelector("#studio-videos-save-featured");try{M instanceof HTMLButtonElement&&(M.disabled=!0,M.textContent="Saving…"),await di({featuredVideoIds:a,heroVideoId:r}),n=await Fi(),C(),w(),L(),pe("studio_featured_updated",{featured_count:a.length,has_hero:!!r})}catch(S){console.error(S)}finally{M instanceof HTMLButtonElement&&(M.disabled=!1,M.textContent="Save featured")}}),await g(),pe("studio_videos_section_loaded",{count:o.length})}function kt(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Xp(e){return new Promise(s=>{window.setTimeout(s,e)})}function $i(e){return Ws(e).trim()}function Zp(){const e=[["overview","Overview"],["featured","Featured"],["connect","Connect"],["network","Network"],["sessions","Sessions"],["promo","Promo"]];return`
        <div class="studio-section-stack studio-category-page studio-community">
            ${de({title:"Community",subtitle:"/community landing — featured videos, connect, network cards, sessions, promo",countId:"studio-community-header-count",countLabel:""})}
            <p id="studio-community-msg" class="studio-banner studio-banner--info" style="display:none"></p>
            <div class="studio-community__workspace" data-studio-tabs="community">
                <nav class="studio-community__tabs" role="tablist" aria-label="Community editor sections">
                    ${e.map(([s,i],o)=>`
                        <button type="button" class="studio-tabs__tab studio-community__tab ${o===0?"is-active":""}" role="tab" aria-selected="${o===0?"true":"false"}" aria-controls="studio-community-panel-${s}">
                            ${kt(i)}
                        </button>
                    `).join("")}
                </nav>
                <div class="studio-community__panels">
                    ${e.map(([s,i],o)=>`
                        <section class="studio-tabs__panel studio-community__section ${o===0?"is-active":""}" id="studio-community-panel-${s}" role="tabpanel" ${o===0?"":"hidden"} aria-label="${kt(i)}">
                            <div id="studio-com-form-${s}" class="studio-community__form"></div>
                        </section>
                    `).join("")}
                </div>
            </div>
            <div class="studio-community__actions">
                <div class="studio-toolbar-actions">
                    <button type="button" class="studio-btn-primary" id="studio-community-save">Save community page</button>
                </div>
            </div>
        </div>
    `}const Os=[["hero","Landing hero"],["exclusive","Exclusive content row"],["connect","Connect section"],["network","Network cards"],["sessions","Upcoming sessions"],["promo","Promo block"],["join","Join network CTA"]];function Ci(e,s){return!e||typeof e!="object"?!0:e[s]!==!1}function tm(e,s){const i=e.sections&&typeof e.sections=="object"?e.sections:{};return`
        <div class="studio-community__section-head">
            <p class="studio-kicker">Page map</p>
            <h3 class="studio-subheading">Community page structure</h3>
            <p class="studio-muted">Start here to decide what appears publicly. Featured videos and landing hero are managed in the Featured tab or Content → Videos.</p>
        </div>
        <div class="studio-community__overview-grid">
            <div class="studio-community__summary-card">
                <strong>${Os.filter(([n])=>Ci(i,n)).length}/${Os.length}</strong>
                <span>Sections active</span>
            </div>
            <div class="studio-community__summary-card">
                <strong>${kt(String(s.featuredCount))}/6</strong>
                <span>Featured videos</span>
            </div>
            <div class="studio-community__summary-card">
                <strong>${kt(s.heroLabel)}</strong>
                <span>Landing hero</span>
            </div>
            <div class="studio-community__summary-card">
                <strong>${kt(String(Array.isArray(e.sessions)?e.sessions.length:0))}</strong>
                <span>Sessions listed</span>
            </div>
        </div>
        <div class="studio-community__toggle-grid">
            ${Os.map(([n,a])=>`
                    <label class="studio-community__toggle-card">
                        <input type="checkbox" id="st-com-section-${n}" ${Ci(i,n)?"checked":""} />
                        <span>
                            <strong>${kt(a)}</strong>
                            <small>${Ci(i,n)?"Visible on public page":"Hidden from public page"}</small>
                        </span>
                    </label>
                `).join("")}
        </div>
    `}function em(e){const s=e.connect&&typeof e.connect=="object"?e.connect:{},i=Array.isArray(s.bites)?s.bites:[];for(;i.length<3;)i.push({});const o=i.slice(0,3).map((n,a)=>{const r=n&&typeof n=="object"?n:{};return`
            <fieldset class="studio-field-group studio-community__card studio-community__bite-card">
                <legend>${kt(String(r.titleEn||`Bite ${a+1}`))}</legend>
                <label class="studio-field"><span>Title EN</span><input type="text" id="st-com-cn-b${a}-ten" class="studio-input" value="${kt(String(r.titleEn??""))}" /></label>
                <label class="studio-field"><span>Title JA</span><input type="text" id="st-com-cn-b${a}-tja" class="studio-input" value="${kt(String(r.titleJa??""))}" /></label>
                <label class="studio-field"><span>Body EN</span><textarea id="st-com-cn-b${a}-ben" class="studio-input" rows="2">${kt(String(r.bodyEn??""))}</textarea></label>
                <label class="studio-field"><span>Body JA</span><textarea id="st-com-cn-b${a}-bja" class="studio-input" rows="2">${kt(String(r.bodyJa??""))}</textarea></label>
            </fieldset>`});return`
        <div class="studio-community__panel-intro">
            <div>
                <p class="studio-kicker">Connect</p>
                <h3 class="studio-subheading">Communication blocks</h3>
                <p class="studio-muted">Group the public communication copy by purpose: headline, routes, then the three bite-sized explanations.</p>
            </div>
        </div>
        <section class="studio-community__edit-card">
            <h4>Section heading</h4>
            <div class="studio-community__editorial">
                <label class="studio-field"><span>Title EN</span><input type="text" id="st-com-cn-t-en" class="studio-input" value="${kt(String(s.titleEn??""))}" /></label>
                <label class="studio-field"><span>Title JA</span><input type="text" id="st-com-cn-t-ja" class="studio-input" value="${kt(String(s.titleJa??""))}" /></label>
            </div>
        </section>
        <section class="studio-community__edit-card">
            <h4>Links</h4>
            <div class="studio-community__editorial">
                <label class="studio-field"><span>How it works URL</span><input type="text" id="st-com-cn-hiw-h" class="studio-input" value="${kt(String(s.howItWorksHref??""))}" /></label>
                <label class="studio-field"><span>How it works label EN</span><input type="text" id="st-com-cn-hiw-en" class="studio-input" value="${kt(String(s.howItWorksLabelEn??""))}" /></label>
                <label class="studio-field"><span>How it works label JA</span><input type="text" id="st-com-cn-hiw-ja" class="studio-input" value="${kt(String(s.howItWorksLabelJa??""))}" /></label>
                <label class="studio-field"><span>Browse href</span><input type="text" id="st-com-cn-br-h" class="studio-input" value="${kt(String(s.browseHref??""))}" /></label>
                <label class="studio-field"><span>Browse label EN</span><input type="text" id="st-com-cn-br-en" class="studio-input" value="${kt(String(s.browseLabelEn??""))}" /></label>
                <label class="studio-field"><span>Browse label JA</span><input type="text" id="st-com-cn-br-ja" class="studio-input" value="${kt(String(s.browseLabelJa??""))}" /></label>
            </div>
        </section>
        <section class="studio-community__edit-card">
            <h4>How it works cards</h4>
            <div class="studio-community__bite-grid">${o.join("")}</div>
        </section>
    `}function sm(e){const s=e.promo&&typeof e.promo=="object"?e.promo:{};return`
        <div class="studio-community__panel-intro">
            <div>
                <p class="studio-kicker">Promo</p>
                <h3 class="studio-subheading">Final community prompt</h3>
                <p class="studio-muted">Short closing copy that reinforces the invitation before the join CTA.</p>
            </div>
        </div>
        <section class="studio-community__edit-card">
            <h4>Promo copy</h4>
            <div class="studio-community__editorial">
                <label class="studio-field"><span>Headline EN</span><textarea id="st-com-pr-h-en" class="studio-input" rows="2">${kt(String(s.headlineEn??""))}</textarea></label>
                <label class="studio-field"><span>Headline JA</span><textarea id="st-com-pr-h-ja" class="studio-input" rows="2">${kt(String(s.headlineJa??""))}</textarea></label>
                <label class="studio-field"><span>Subline EN</span><input type="text" id="st-com-pr-s-en" class="studio-input" value="${kt(String(s.sublineEn??""))}" /></label>
                <label class="studio-field"><span>Subline JA</span><input type="text" id="st-com-pr-s-ja" class="studio-input" value="${kt(String(s.sublineJa??""))}" /></label>
            </div>
        </section>
    `}function im(e){return`
        <div class="studio-community__panel-intro">
            <div>
                <p class="studio-kicker">Network</p>
                <h3 class="studio-subheading">Member and partner cards</h3>
                <p class="studio-muted">Each row is a public card. Use clear names, roles, and paths so the row reads well before opening it.</p>
            </div>
            <button type="button" class="studio-btn-ghost" id="st-com-net-add">Add network card</button>
        </div>
        <div class="studio-table-wrap studio-table-wrap--rounded studio-community__table-wrap studio-community__summary-table">
            <table class="studio-table studio-table--dense">
                <thead><tr><th>Summary</th><th>Name</th><th>Role</th><th>Location</th><th>Avatar URL</th><th>Connect href</th><th></th></tr></thead>
                <tbody id="st-com-net-tbody">${(Array.isArray(e.networkCards)?e.networkCards:[]).map((o,n)=>{const a=o&&typeof o=="object"?o:{};return`
            <tr>
                <td><strong>${kt(String(a.name||`Card ${n+1}`))}</strong><small>${kt(String(a.role||"Role"))}</small></td>
                <td><input type="text" class="studio-input st-com-net-name" value="${kt(String(a.name??""))}" placeholder="Name" /></td>
                <td><input type="text" class="studio-input st-com-net-role" value="${kt(String(a.role??""))}" /></td>
                <td><input type="text" class="studio-input st-com-net-loc" value="${kt(String(a.location??""))}" /></td>
                <td><input type="text" class="studio-input st-com-net-av" value="${kt(String(a.avatarUrl??""))}" placeholder="Avatar URL" /></td>
                <td><input type="text" class="studio-input st-com-net-href" value="${kt(String(a.connectHref??""))}" placeholder="/…" /></td>
                <td><button type="button" class="studio-btn-ghost st-com-net-del">Remove</button></td>
            </tr>`}).join("")||""}</tbody>
            </table>
        </div>
    `}function om(e){return`
        <div class="studio-community__panel-intro">
            <div>
                <p class="studio-kicker">Sessions</p>
                <h3 class="studio-subheading">Upcoming sessions</h3>
                <p class="studio-muted">Keep sessions scannable with strong titles and simple registration labels.</p>
            </div>
            <button type="button" class="studio-btn-ghost" id="st-com-ss-add">Add session</button>
        </div>
        <div class="studio-table-wrap studio-table-wrap--rounded studio-community__table-wrap studio-community__summary-table">
            <table class="studio-table studio-table--dense">
                <thead><tr><th>Summary</th><th>Thumb</th><th>Kind</th><th>Title</th><th>Date/time line</th><th>Reg label</th><th>Reg href</th><th></th></tr></thead>
                <tbody id="st-com-ss-tbody">${(Array.isArray(e.sessions)?e.sessions:[]).map((o,n)=>{const a=o&&typeof o=="object"?o:{};return`
            <tr>
                <td><strong>${kt(String(a.title||`Session ${n+1}`))}</strong><small>${kt(String(a.datetimeLine||a.kindLabel||"Date/time"))}</small></td>
                <td><input type="text" class="studio-input st-com-ss-thumb" value="${kt(String(a.thumbUrl??""))}" placeholder="Thumb URL" /></td>
                <td><input type="text" class="studio-input st-com-ss-kind" value="${kt(String(a.kindLabel??""))}" /></td>
                <td><input type="text" class="studio-input st-com-ss-title" value="${kt(String(a.title??""))}" /></td>
                <td><input type="text" class="studio-input st-com-ss-dt" value="${kt(String(a.datetimeLine??""))}" /></td>
                <td><input type="text" class="studio-input st-com-ss-rlab" value="${kt(String(a.registerLabel??""))}" /></td>
                <td><input type="text" class="studio-input st-com-ss-rhref" value="${kt(String(a.registerHref??""))}" /></td>
                <td><button type="button" class="studio-btn-ghost st-com-ss-del">Remove</button></td>
            </tr>`}).join("")||""}</tbody>
            </table>
        </div>
    `}function nm(e,s){const i=s.featuredVideoIds.map(d=>e.find(p=>String(p.id)===d)).filter(Boolean),o=i.length?i:e.filter(d=>d.visible!==!1).slice(0,6),n=o.map(d=>Sr(d,s.featuredVideoIds.includes(String(d.id)),{isHero:String(d.id)===String(s.heroVideoId||"")})),a=e.find(d=>String(d.id)===String(s.heroVideoId||"")),r=a?Ae(a.localesJson):null,l=r?String(r.headlineEn||r.headlineJa||(a==null?void 0:a.slug)||"Video"):o.length?"Default (first featured)":"None";return`
        <div class="studio-community__panel-intro">
            <div>
                <p class="studio-kicker">Featured</p>
                <h3 class="studio-subheading">Community video row</h3>
                <p class="studio-muted">Up to six videos appear on /community. Edit the library and featured selection in <a href="/studio#videos">Content → Videos</a>.</p>
            </div>
            <a class="studio-btn-primary" href="/studio#videos">Open Videos workspace</a>
        </div>
        <div class="studio-community__summary-card studio-community__featured-hero-summary">
            <strong>${kt(l)}</strong>
            <span>Landing hero on /community</span>
        </div>
        <div class="studio-videos-featured-rail studio-community__featured-preview" id="studio-com-featured-rail">
            ${n.length?n.join(""):'<p class="studio-muted">No videos in the library yet. Add videos in Content → Videos.</p>'}
        </div>
    `}async function am(e){var g;const s=e.querySelector("#studio-community-msg"),i=(f,v="info")=>{s&&(s.style.display=f?"block":"none",s.textContent=f||"",s.className=`studio-banner studio-banner--${v}`)};if(!Jt("community").canEdit){i("You do not have permission to edit Community.","warn");return}let n={},a=[],r=[],l={featuredVideoIds:[],heroVideoId:null},d=new Set;const p=()=>{const f=l.featuredVideoIds.length||r.filter(M=>M.visible!==!1).slice(0,6).length,v=r.find(M=>String(M.id)===String(l.heroVideoId||"")),E=v?Ae(v.localesJson):null,j=E?String(E.headlineEn||E.headlineJa||(v==null?void 0:v.slug)||"Video"):f?"Default":"None";return{featuredCount:Math.min(f,6),heroLabel:j}},u=e.querySelector('[data-studio-tabs="community"]');if(u){const f=u.querySelectorAll('.studio-tabs__tab[role="tab"]'),v=u.querySelectorAll('.studio-tabs__panel[role="tabpanel"]');f.forEach((E,j)=>{E.addEventListener("click",()=>{f.forEach((M,S)=>{const h=S===j;M.classList.toggle("is-active",h),M.setAttribute("aria-selected",h?"true":"false"),v[S]&&(v[S].classList.toggle("is-active",h),v[S].toggleAttribute("hidden",!h))})})})}function c(){const f=O=>{const G=e.querySelector(`#${O}`);return G&&"value"in G?String(G.value):""},v=O=>{const G=e.querySelector(`#${O}`);return G instanceof HTMLInputElement?G.checked:!0},E=Object.fromEntries(Os.map(([O])=>[O,v(`st-com-section-${O}`)])),j=[0,1,2].map(O=>({titleEn:f(`st-com-cn-b${O}-ten`),titleJa:f(`st-com-cn-b${O}-tja`),bodyEn:f(`st-com-cn-b${O}-ben`),bodyJa:f(`st-com-cn-b${O}-bja`)})),M={titleEn:f("st-com-cn-t-en"),titleJa:f("st-com-cn-t-ja"),howItWorksHref:f("st-com-cn-hiw-h"),howItWorksLabelEn:f("st-com-cn-hiw-en"),howItWorksLabelJa:f("st-com-cn-hiw-ja"),browseHref:f("st-com-cn-br-h"),browseLabelEn:f("st-com-cn-br-en"),browseLabelJa:f("st-com-cn-br-ja"),bites:j},S=[];e.querySelectorAll("#st-com-net-tbody tr").forEach(O=>{var G,V,at,tt,z;S.push({name:String(((G=O.querySelector(".st-com-net-name"))==null?void 0:G.value)??""),role:String(((V=O.querySelector(".st-com-net-role"))==null?void 0:V.value)??""),location:String(((at=O.querySelector(".st-com-net-loc"))==null?void 0:at.value)??""),avatarUrl:String(((tt=O.querySelector(".st-com-net-av"))==null?void 0:tt.value)??""),connectHref:String(((z=O.querySelector(".st-com-net-href"))==null?void 0:z.value)??"")})});const h=[];e.querySelectorAll("#st-com-ss-tbody tr").forEach(O=>{var G,V,at,tt,z,F;h.push({thumbUrl:String(((G=O.querySelector(".st-com-ss-thumb"))==null?void 0:G.value)??""),kindLabel:String(((V=O.querySelector(".st-com-ss-kind"))==null?void 0:V.value)??""),title:String(((at=O.querySelector(".st-com-ss-title"))==null?void 0:at.value)??""),datetimeLine:String(((tt=O.querySelector(".st-com-ss-dt"))==null?void 0:tt.value)??""),registerLabel:String(((z=O.querySelector(".st-com-ss-rlab"))==null?void 0:z.value)??""),registerHref:String(((F=O.querySelector(".st-com-ss-rhref"))==null?void 0:F.value)??"")})});const T={headlineEn:f("st-com-pr-h-en"),headlineJa:f("st-com-pr-h-ja"),sublineEn:f("st-com-pr-s-en"),sublineJa:f("st-com-pr-s-ja")},N={...n,sections:E,connect:M,networkCards:S,sessions:h,promo:T};return delete N.exclusive,delete N.hero,N}function m(){const f=e.querySelector("#studio-com-form-overview"),v=e.querySelector("#studio-com-form-featured"),E=e.querySelector("#studio-com-form-connect"),j=e.querySelector("#studio-com-form-network"),M=e.querySelector("#studio-com-form-sessions"),S=e.querySelector("#studio-com-form-promo");f&&(f.innerHTML=tm(n,p())),v&&(v.innerHTML=nm(r,l)),E&&(E.innerHTML=em(n)),j&&(j.innerHTML=im(n)),M&&(M.innerHTML=om(n)),S&&(S.innerHTML=sm(n))}async function b(f){var E;let v=null;for(const j of[500,900,1400,2200]){await Xp(j);const M=await tn();if(v=M&&typeof M=="object"?M:null,$i((E=v==null?void 0:v.hero)==null?void 0:E.previewVideoUrl)===f)return v}return v}function C(){d=new Set(Array.from(e.querySelectorAll("details[open]")).map(f=>f instanceof HTMLElement?w(f):"").filter(Boolean))}function w(f){var M,S,h;const v=f.querySelector("summary"),E=String((v==null?void 0:v.textContent)||"").replace(/\s+/g," ").trim();return`${((M=f.querySelector("[data-feature]"))==null?void 0:M.getAttribute("data-feature"))||((S=f.querySelector("[data-chapter-row]"))==null?void 0:S.getAttribute("data-chapter-row"))||((h=f.querySelector("[data-topic-row]"))==null?void 0:h.getAttribute("data-topic-row"))||""}|${E}`}function L(){d.size&&e.querySelectorAll("details").forEach(f=>{f instanceof HTMLDetailsElement&&d.has(w(f))&&(f.open=!0)})}function A(){C(),m(),L()}e.addEventListener("click",f=>{const v=f.target;if(v instanceof HTMLElement){if(v.id==="st-com-net-add"){f.preventDefault(),n=c(),n.networkCards=[...Array.isArray(n.networkCards)?n.networkCards:[],{}],A();return}if(v.id==="st-com-ss-add"){f.preventDefault(),n=c(),n.sessions=[...Array.isArray(n.sessions)?n.sessions:[],{}],A();return}if(v.classList.contains("st-com-net-del")){f.preventDefault();const E=v.closest("tr"),j=e.querySelector("#st-com-net-tbody"),M=E&&j?Array.from(j.children).indexOf(E):-1;n=c();const S=[...Array.isArray(n.networkCards)?n.networkCards:[]];M>=0&&S.splice(M,1),n.networkCards=S,m();return}if(v.classList.contains("st-com-ss-del")){f.preventDefault();const E=v.closest("tr"),j=e.querySelector("#st-com-ss-tbody"),M=E&&j?Array.from(j.children).indexOf(E):-1;n=c();const S=[...Array.isArray(n.sessions)?n.sessions:[]];M>=0&&S.splice(M,1),n.sessions=S,m()}}});try{n=await tn(),(!n||typeof n!="object")&&(n={})}catch(f){i(f instanceof Error?f.message:String(f),"warn"),n={}}try{[r,l]=await Promise.all([eo(),Fi()]),Array.isArray(r)||(r=[])}catch{r=[]}try{a=await Ba(),Array.isArray(a)||(a=[])}catch{a=[]}try{m()}catch(f){i(f instanceof Error?f.message:String(f),"warn")}(g=e.querySelector("#studio-community-save"))==null||g.addEventListener("click",async()=>{var v,E;const f=e.querySelector("#studio-community-save");try{f&&(f.disabled=!0,f.textContent="Saving..."),i("Saving community page...","info");const j=c(),M=await Bl(j),S=$i((v=j==null?void 0:j.hero)==null?void 0:v.previewVideoUrl),h=await b(S),T=$i((E=h==null?void 0:h.hero)==null?void 0:E.previewVideoUrl);n=T===S&&h?h:j,m(),i(T===S?`Saved to ${(M==null?void 0:M.mode)==="test"?"local test storage":"backend"}.`:`Saved to ${(M==null?void 0:M.mode)==="test"?"local test storage":"backend"}, but backend read-back is still returning the previous preview URL. Data mode: ${Ol()}.`,T===S?"info":"warn")}catch(j){i(j instanceof Error?j.message:String(j),"warn")}finally{f&&(f.disabled=!1,f.textContent="Save community page")}})}function rm(e){const s={};return e.querySelectorAll(".studio-content-str-value[data-path]").forEach(i=>{const o=i.getAttribute("data-path");o&&(i instanceof HTMLTextAreaElement||i instanceof HTMLInputElement)&&(s[o]=i.value)}),s}function is(e,s,i){e.innerHTML="";const o=String(s||"").trim();if(!o||!/^https?:\/\//i.test(o)){const l=document.createElement("p");l.className="studio-muted studio-content-preview-placeholder",l.textContent=o?"Preview unavailable for this value":"No URL yet",e.appendChild(l);return}if(i==="audioUrl"||/\.(mp3|wav|ogg|m4a)(\?|$)/i.test(o)){const l=en(o),d=document.createElement("audio");d.controls=!0,d.className="studio-content-preview-audio",d.src=l[0]||o,d.preload="metadata",l.length>1&&d.addEventListener("error",()=>{d.src=l[1]},{once:!0}),e.appendChild(d);return}const n=en(o),a=document.createElement("img");a.className="studio-content-preview-img",a.alt=Jl("Content image preview"),a.referrerPolicy="no-referrer",a.loading="lazy",a.src=n[0]||o;let r=!1;a.addEventListener("error",()=>{if(!r&&n.length>1){r=!0,a.src=n[1];return}e.innerHTML='<p class="studio-muted studio-content-preview-placeholder">Could not load image</p>'}),e.appendChild(a)}function lm(e,s,i,o){const n=_e(s,i.path),a=document.createElement("div");a.className=`studio-content-field-row studio-content-field-row--kind-${n}`,a.dataset.fieldKind=n;const r=document.createElement("div");r.className="studio-content-field-head";const l=document.createElement("span");l.className=`studio-field-kind-badge studio-field-kind-badge--${n}`,l.textContent=qe(n);const d=document.createElement("span");d.className="studio-content-field-title",d.textContent=i.label,r.appendChild(l),r.appendChild(d),a.appendChild(r);const p=document.createElement("p"),u=Va(n);p.className="studio-field-kind-helper",u&&(p.textContent=u,a.appendChild(p));const c=document.createElement("div");c.className="studio-content-field-body";let m=null;(n==="assetUrl"||n==="audioUrl")&&(m=document.createElement("div"),m.className="studio-content-preview",is(m,i.value,n));let b;if(n==="plainText"){const L=document.createElement("textarea");L.className="studio-textarea studio-textarea--locale studio-content-str-value",L.dataset.path=i.path,L.rows=Math.max(2,Math.min(14,Math.ceil(i.value.length/72)+1)),L.value=i.value,L.spellcheck=!0,L.addEventListener("input",()=>o.markDirty()),b=L}else{const L=document.createElement("input");L.type="text",L.className="studio-input studio-content-str-value",L.dataset.path=i.path,L.value=i.value,L.spellcheck=!1,L.autocomplete="off",L.addEventListener("input",()=>{o.markDirty(),m&&is(m,L.value,n)}),b=L}c.appendChild(b),m&&c.appendChild(m);const C=document.createElement("div");if(C.className="studio-content-field-actions",n==="route"){const L=document.createElement("button");L.type="button",L.className="studio-btn-ghost studio-btn-ghost--sm",L.textContent="Open on site",L.addEventListener("click",()=>{const A=b instanceof HTMLInputElement?b.value.trim():"";if(A.startsWith("/"))try{window.open(`${window.location.origin}${A}`,"_blank","noopener")}catch{}}),C.appendChild(L)}if(n==="externalUrl"){const L=document.createElement("button");L.type="button",L.className="studio-btn-ghost studio-btn-ghost--sm",L.textContent="Open link",L.addEventListener("click",()=>{const A=b instanceof HTMLInputElement?b.value.trim():"";/^https?:\/\//i.test(A)&&window.open(A,"_blank","noopener noreferrer")}),C.appendChild(L)}if(Oa(n)){const L=document.createElement("label");L.className="studio-file-label studio-btn-ghost studio-content-upload";const A=document.createElement("input");A.type="file",A.className="studio-file-input",A.accept=Ja(i.path,n),A.dataset.uploadFor=i.path,L.appendChild(A);const g=document.createElement("span");g.textContent=n==="externalUrl"?"Upload to CDN":"Upload to storage",L.appendChild(g),C.appendChild(L)}const w=document.createElement("button");w.type="button",w.className="studio-btn-ghost studio-btn-ghost--sm",w.textContent="Clear",w.addEventListener("click",()=>{(b instanceof HTMLTextAreaElement||b instanceof HTMLInputElement)&&(b.value="",o.markDirty(),m&&is(m,"",n))}),C.appendChild(w),c.appendChild(C),a.appendChild(c),e.appendChild(a)}function ma(e,s,i,o){const n=_e(e,s.path),a=document.createElement("div");a.className="studio-content-locale-col";const r=document.createElement("span");r.className="studio-content-locale-col-title",r.textContent=o,a.appendChild(r);let l=null;(n==="assetUrl"||n==="audioUrl")&&(l=document.createElement("div"),l.className="studio-content-preview",is(l,s.value,n));let d;if(n==="plainText"){const c=document.createElement("textarea");c.className="studio-textarea studio-textarea--locale studio-content-str-value",c.dataset.path=s.path,c.rows=Math.max(2,Math.min(14,Math.ceil(s.value.length/72)+1)),c.value=s.value,c.spellcheck=!0,c.addEventListener("input",()=>i.markDirty()),d=c}else{const c=document.createElement("input");c.type="text",c.className="studio-input studio-content-str-value",c.dataset.path=s.path,c.value=s.value,c.spellcheck=!1,c.autocomplete="off",c.addEventListener("input",()=>{i.markDirty(),l&&is(l,c.value,n)}),d=c}a.appendChild(d),l&&a.appendChild(l);const p=document.createElement("div");if(p.className="studio-content-field-actions studio-content-field-actions--locale-col",n==="route"){const c=document.createElement("button");c.type="button",c.className="studio-btn-ghost studio-btn-ghost--sm",c.textContent="Open on site",c.addEventListener("click",()=>{const m=d instanceof HTMLInputElement?d.value.trim():"";if(m.startsWith("/"))try{window.open(`${window.location.origin}${m}`,"_blank","noopener")}catch{}}),p.appendChild(c)}if(n==="externalUrl"){const c=document.createElement("button");c.type="button",c.className="studio-btn-ghost studio-btn-ghost--sm",c.textContent="Open link",c.addEventListener("click",()=>{const m=d instanceof HTMLInputElement?d.value.trim():"";/^https?:\/\//i.test(m)&&window.open(m,"_blank","noopener noreferrer")}),p.appendChild(c)}if(Oa(n)){const c=document.createElement("label");c.className="studio-file-label studio-btn-ghost studio-content-upload";const m=document.createElement("input");m.type="file",m.className="studio-file-input",m.accept=Ja(s.path,n),m.dataset.uploadFor=s.path,c.appendChild(m);const b=document.createElement("span");b.textContent=n==="externalUrl"?"Upload to CDN":"Upload to storage",c.appendChild(b),p.appendChild(c)}const u=document.createElement("button");return u.type="button",u.className="studio-btn-ghost studio-btn-ghost--sm",u.textContent="Clear",u.addEventListener("click",()=>{(d instanceof HTMLTextAreaElement||d instanceof HTMLInputElement)&&(d.value="",i.markDirty(),l&&is(l,"",n))}),p.appendChild(u),a.appendChild(p),{wrap:a,control:d,previewEl:l,kind:n}}function wr(e,s,i,o,n){const a=_e(s,i.path),r=document.createElement("div");r.className=`studio-content-field-row studio-content-field-row--locale-pair studio-content-field-row--kind-${a}`,r.dataset.fieldKind=a;const l=document.createElement("div");l.className="studio-content-field-head";const d=document.createElement("span");d.className=`studio-field-kind-badge studio-field-kind-badge--${a}`,d.textContent=qe(a);const p=document.createElement("span");p.className="studio-content-field-title",p.textContent=`${i.label} · ${o.label}`,l.appendChild(d),l.appendChild(p),r.appendChild(l);const u=Va(a);if(u){const C=document.createElement("p");C.className="studio-field-kind-helper",C.textContent=u,r.appendChild(C)}const c=document.createElement("div");c.className="studio-content-locale-pair-grid";const m=ma(s,i,n,"English"),b=ma(s,o,n,"日本語");if(c.appendChild(m.wrap),c.appendChild(b.wrap),r.appendChild(c),a==="plainText"&&typeof n.translateEnToJa=="function"){const C=document.createElement("button");C.type="button",C.className="studio-btn-ghost studio-btn-ghost--sm studio-content-translate-btn",C.textContent="Translate to Japanese",C.addEventListener("click",async()=>{const L=m.control instanceof HTMLTextAreaElement||m.control instanceof HTMLInputElement?m.control.value.trim():"";if(L){C.disabled=!0;try{const A=await n.translateEnToJa(L);(b.control instanceof HTMLTextAreaElement||b.control instanceof HTMLInputElement)&&(b.control.value=A,n.markDirty())}catch(A){alert(A instanceof Error?A.message:String(A))}finally{C.disabled=!1}}});const w=m.wrap.querySelector(".studio-content-field-actions--locale-col");w?m.wrap.insertBefore(C,w):m.wrap.appendChild(C)}e.appendChild(r)}function fa(e){if(e.startsWith("en."))return`@:${e.slice(3)}`;if(e.startsWith("ja."))return`@:${e.slice(3)}`;const s=e.indexOf(".en.");if(s>=0)return`${e.slice(0,s)}.@:${e.slice(s+4)}`;const i=e.indexOf(".ja.");return i>=0?`${e.slice(0,i)}.@:${e.slice(i+4)}`:null}function dm(e){return e.startsWith("en.")?"en":e.startsWith("ja.")?"ja":e.includes(".en.")?"en":e.includes(".ja.")?"ja":null}function cm(e){const s=new Map,i=[];for(const n of e){const a=fa(n.path),r=dm(n.path);if(!a||!r){i.push(n);continue}let l=s.get(a);l||(l={},s.set(a,l)),r==="en"?l.en=n:l.ja=n}const o=[];for(const[,n]of s)n.en&&n.ja?o.push({type:"pair",key:fa(n.en.path)||"",en:n.en,ja:n.ja}):n.en?o.push({type:"single",row:n.en}):n.ja&&o.push({type:"single",row:n.ja});for(const n of i)o.push({type:"single",row:n});return o.sort((n,a)=>{const r=n.type==="pair"?n.en.path:n.row.path,l=a.type==="pair"?a.en.path:a.row.path;return r.localeCompare(l)}),o}const um={"site-info":[{id:"home",title:"Home",pathPrefixes:["home."]},{id:"programs",title:"Programs page",pathPrefixes:["programs."]},{id:"editions",title:"Editions page",pathPrefixes:["editions."]},{id:"journal",title:"Journal page",pathPrefixes:["journal."]}],"join-network-flow":[{id:"membership",title:"Membership",pathPrefixes:["membership."]},{id:"access",title:"Access",pathPrefixes:["access."]},{id:"apply",title:"Apply",pathPrefixes:["apply."]}],"program-hero":[{id:"en",title:"English",pathPrefixes:["en."]},{id:"ja",title:"日本語",pathPrefixes:["ja."]}]};function pm(e){return e.type==="pair"?e.en.path:e.row.path}function mm(e,s){const i=um[s];if(!(i!=null&&i.length))return[{chapter:null,title:null,items:e}];const o=i.map(r=>({chapter:r,items:[]})),n=[];for(const r of e){const l=pm(r);let d=!1;for(let p=0;p<i.length;p++)if(i[p].pathPrefixes.some(u=>l.startsWith(u))){o[p].items.push(r),d=!0;break}d||n.push(r)}const a=[];for(const r of o)r.items.length&&a.push({chapter:r.chapter,title:r.chapter.title,items:r.items});return n.length&&a.push({chapter:null,title:"Other",items:n}),a.length?a:[{chapter:null,title:null,items:e}]}const fm="studioBreadcrumbTrail",bm="studioBreadcrumbSection";function Er(e){const s=typeof document<"u"?document.getElementById(fm):null;if(!s)return;const i=String(e||"").trim();if(!i){s.textContent="",s.hidden=!0;return}s.textContent=` · ${i}`,s.hidden=!1}function Lr(){Er("")}function gm(e){const s=typeof document<"u"?document.getElementById(bm):null;s&&(s.textContent=e||"Studio")}const Xs=[{id:"membership",label:"Membership",hint:"Join / membership flow",pages:"Home, Journal, Community, Context"},{id:"access",label:"Access",hint:"Gallery & collection access",pages:"Artists, Gallery Access, Editions, Profile"},{id:"apply",label:"Apply",hint:"Application funnels",pages:"Programs (when enabled)"}],Zs=[{id:"band",label:"Page band",shortLabel:"Band",surface:"page",step:"1",callout:e=>`Teaser block on ${e}. Visitors click the band button to open the modal.`},{id:"entry",label:"Step 1 — Identity",shortLabel:"Entry",surface:"modal",step:"2",callout:()=>"First modal screen: name, email, role, optional access code."},{id:"value",label:"Step 2 — Plans",shortLabel:"Plans",surface:"modal",step:"3",callout:()=>"Plan picker, pricing cards, and what’s included accordion."},{id:"payment",label:"Step 3 — Payment",shortLabel:"Payment",surface:"modal",step:"4",callout:()=>"Stripe payment summary and card form labels."},{id:"linkAccount",label:"Link account",shortLabel:"Link",surface:"modal",step:"5a",fork:!0,callout:()=>"After successful payment — Internet Identity linking."},{id:"linkAccountExempt",label:"Link (access code)",shortLabel:"Code path",surface:"modal",step:"5b",fork:!0,callout:()=>"Access-code path — skips payment; II sign-in to complete."},{id:"confirmation",label:"Confirmation",shortLabel:"Done",surface:"modal",step:"6",callout:()=>"Success screen with welcome copy and navigation links."}],oi={band:{cards:[{title:"Page teaser",help:"Shown outside the modal on pages listed for this flow.",fields:[{key:"title",label:"Band headline"},{key:"description",label:"Band description",multiline:!0},{key:"openLabel",label:"Open button label"}]}]},entry:{cards:[{title:"Headlines",fields:[{key:"dialogTitle",label:"Modal headline"},{key:"subtitle",label:"Subtitle",multiline:!0}]},{title:"Form labels",fields:[{key:"firstNamePlaceholder",label:"First name placeholder"},{key:"lastNamePlaceholder",label:"Last name placeholder"},{key:"emailPlaceholder",label:"Email placeholder"},{key:"accessCodeLabel",label:"Access code label"},{key:"accessCodePlaceholder",label:"Access code placeholder"},{key:"roleLabel",label:"Role group label"}]},{title:"Actions & legal",fields:[{key:"continueLabel",label:"Continue button"},{key:"renewHint",label:"Renew hint"},{key:"footerDisclaimer",label:"Footer disclaimer",multiline:!0}]}]},value:{cards:[{title:"Step copy",fields:[{key:"title",label:"Step title"},{key:"lead",label:"Lead paragraph",multiline:!0},{key:"planGroupLabel",label:"Plan group label"},{key:"includesTitle",label:"Includes section title"},{key:"continueLabel",label:"Continue button"},{key:"backLabel",label:"Back button"}]}]},payment:{cards:[{title:"Payment screen copy",fields:[{key:"title",label:"Step title"},{key:"subtitle",label:"Subtitle",multiline:!0},{key:"orderLabel",label:"Order label"},{key:"finalPaymentPrice",label:"Price display"},{key:"finalPaymentStatement",label:"Price statement"},{key:"line3Months",label:"Access line"},{key:"lineRenew",label:"Renew line"},{key:"amount",label:"Amount (Stripe)"},{key:"planKey",label:"Default plan key",help:"Use bi_monthly or annual"},{key:"totalLabel",label:"Total label"},{key:"cardNumberLabel",label:"Card number label"},{key:"expiryLabel",label:"Expiry label"},{key:"cvcLabel",label:"CVC label"},{key:"rememberCard",label:"Remember card label"},{key:"expressOr",label:"Express checkout “or”"},{key:"completeLabel",label:"Complete button"},{key:"processingLabel",label:"Processing label"},{key:"footerNote",label:"Footer note 1"},{key:"footerNote2",label:"Footer note 2"},{key:"devCompleteLabel",label:"Demo complete label"},{key:"backLabel",label:"Back button"}]}]},linkAccount:{cards:[{title:"After payment — Internet Identity",fields:[{key:"paymentSuccessLine",label:"Payment success line"},{key:"iiExplainer",label:"II explainer",multiline:!0},{key:"linkKicker",label:"Kicker line"},{key:"title",label:"Headline"},{key:"lead",label:"Lead",multiline:!0},{key:"help",label:"Help text",multiline:!0},{key:"signInLabel",label:"Sign-in button"}]}]},linkAccountExempt:{cards:[{title:"Access-code path — Internet Identity",help:"Shown when user completes registration with an access code (no payment).",fields:[{key:"paymentSuccessLine",label:"Payment success line"},{key:"iiExplainer",label:"II explainer",multiline:!0},{key:"linkKicker",label:"Kicker line"},{key:"title",label:"Headline"},{key:"lead",label:"Lead",multiline:!0},{key:"help",label:"Help text",multiline:!0},{key:"signInLabel",label:"Sign-in button"}]}]},confirmation:{cards:[{title:"Welcome screen",fields:[{key:"title",label:"Screen title"},{key:"welcomeTitle",label:"Welcome headline"},{key:"welcomeBody",label:"Welcome body",multiline:!0},{key:"primaryCta",label:"Primary CTA"},{key:"applyResidencyLabel",label:"Apply residency label"},{key:"secondaryLine",label:"Secondary line",multiline:!0}]}]}},ym=[{key:"title",label:"Plan title"},{key:"displayPrice",label:"Display price"},{key:"every",label:"Billing frequency"},{key:"subtext",label:"Subtext line 1"},{key:"subtext2",label:"Subtext line 2"}],hm=[{key:"title",label:"Plan title"},{key:"displayPrice",label:"Display price"},{key:"discount",label:"Discount badge"},{key:"subtext",label:"Subtext line 1"},{key:"subtext2",label:"Subtext line 2"}],vm=[{key:"finalPaymentPrice",label:"Price display"},{key:"finalPaymentStatement",label:"Price statement"},{key:"amount",label:"Amount"},{key:"planKey",label:"Plan key",help:"bi_monthly or annual"},{key:"footerNote",label:"Footer note 1"},{key:"footerNote2",label:"Footer note 2"}],Sm=[{key:"price",label:"Legacy price"},{key:"periodLabel",label:"Legacy period label"},{key:"renewLine",label:"Renew line"},{key:"evolvingLine",label:"Evolving line",multiline:!0},{key:"disclaimer",label:"Disclaimer"},{key:"disclaimerFee",label:"Disclaimer fee line"}];function Tr(e,s){const i=s&&typeof s=="object"?s[e]:null;return!i||typeof i!="object"?Zs.map(o=>o.id):Zs.filter(o=>o.id in i).map(o=>o.id)}const Ar=new WeakMap;function hs(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function fo(e){try{return JSON.parse(JSON.stringify(e))}catch{return e}}function kr(e,s){for(const[i,o]of Object.entries(s))o&&typeof o=="object"&&!Array.isArray(o)&&e[i]&&typeof e[i]=="object"&&!Array.isArray(e[i])?kr(e[i],o):e[i]=o}function _r(e,s,i,o){const n=e[s];if(!n||typeof n!="object")return{};const a=n[i];if(!a||typeof a!="object")return{};const r=a[o];return r&&typeof r=="object"?r:{}}function ye(e,s,i,o){(!e[s]||typeof e[s]!="object")&&(e[s]={});const n=e[s];(!n[i]||typeof n[i]!="object")&&(n[i]={});const a=n[i];return(!a[o]||typeof a[o]!="object")&&(a[o]={}),a[o]}function wm(e,s){const i=fo(e&&typeof e=="object"?e:{});return!s||typeof s!="object"||kr(i,s),i}function Em(e){const s=Ar.get(e);return s?fo(s.state):{}}function he(e,s){s.previewTimer&&clearTimeout(s.previewTimer),s.previewTimer=setTimeout(()=>Ve(e,s),150)}function Ve(e,s){const i=e.querySelector("app-join-network[data-studio-preview]"),o=e.querySelector(".studio-jnf-preview-frame");o instanceof HTMLElement&&(o.dataset.previewSurface=s.previewMode==="band"?"band":"modal"),!(!i||typeof i.setStudioPreviewState!="function")&&(Xs.find(n=>n.id===s.flow),i.setAttribute("data-modal-type",s.flow),i.setStudioPreviewState({modalType:s.flow,stage:s.stage,locale:s.locale,flowDraft:s.state,globalBullets:s.globalBullets,selectedPlan:s.previewPlan==="annual"?"annual":"bi_monthly",previewMode:s.previewMode,context:s.flow==="access"?"artists":"home"}))}async function bo(e,s){const i=e.querySelector("[data-jnf-global-list]");try{const o=await Wa(),n=o&&typeof o=="object"?o[s.locale]||o.en:null,a=n&&Array.isArray(n.whatsIncludedBullets)?n.whatsIncludedBullets.map(r=>String(r??"").trim()).filter(Boolean):[];s.globalBullets=a,i&&(i.innerHTML=a.length?a.map(r=>`<li>${hs(r)}</li>`).join(""):'<li class="studio-muted">No global items — configure under Studio → Services → Subscription.</li>')}catch{s.globalBullets=[],i&&(i.innerHTML='<li class="studio-muted">Could not load global items.</li>')}Ve(e,s)}function Ke(e,s,i,o){const n=document.createElement("label");n.className="studio-field";const a=document.createElement("span");a.textContent=e,n.appendChild(a);let r;if(i){const l=document.createElement("textarea");l.className="studio-input",l.rows=3,l.value=s,l.addEventListener("input",()=>o(l.value)),r=l}else{const l=document.createElement("input");l.type="text",l.className="studio-input",l.value=s,l.addEventListener("input",()=>o(l.value)),r=l}return n.appendChild(r),n}function Ls(e,s){const i=document.createElement("section");i.className="studio-jnf-card";const o=document.createElement("h4");if(o.className="studio-jnf-card-title",o.textContent=e,i.appendChild(o),s){const a=document.createElement("p");a.className="studio-muted studio-jnf-card-help",a.textContent=s,i.appendChild(a)}const n=document.createElement("div");return n.className="studio-form-grid studio-community__editorial studio-jnf-editorial",i.appendChild(n),{card:i,grid:n}}function os(e,s,i){e.innerHTML="";const o=Xs.find(p=>p.id===s.flow),n=Zs.find(p=>p.id===s.stage),a=(o==null?void 0:o.pages)||"",r=document.createElement("div");if(r.className="studio-jnf-callout",r.innerHTML=`<strong>Where this appears</strong><p>${hs((n==null?void 0:n.callout(a))||"")}</p>`,s.stage==="band"){const p=document.createElement("p");p.className="studio-muted",p.innerHTML="Per-page band overrides live in <strong>Join network blocks</strong> (Home table).",r.appendChild(p)}e.appendChild(r);const l=_r(s.state,s.flow,s.stage,s.locale);if(s.stage==="value"){Lm(e,s,i,l);return}if(s.stage==="payment"){Tm(e,s,i,l);return}if(s.stage==="confirmation"){Am(e,s,i,l);return}const d=oi[s.stage];for(const p of(d==null?void 0:d.cards)||[]){const{card:u,grid:c}=Ls(p.title,p.help);for(const m of p.fields||[])c.appendChild(Ke(m.label,String(l[m.key]??""),!!m.multiline,b=>{const C=ye(s.state,s.flow,s.stage,s.locale);C[m.key]=b,s.hooks.markDirty(),he(i,s)}));e.appendChild(u)}}function Lm(e,s,i,o){var u,c,m;for(const b of oi.value.cards){const{card:C,grid:w}=Ls(b.title,b.help);for(const L of b.fields||[])w.appendChild(Ke(L.label,String(o[L.key]??""),!!L.multiline,A=>{const g=ye(s.state,s.flow,"value",s.locale);g[L.key]=A,s.hooks.markDirty(),he(i,s)}));e.appendChild(C)}const n=document.createElement("div");n.className="studio-jnf-plan-grid",n.appendChild(ga(s,i,"planBimonthly","Bimonthly",ym,o)),n.appendChild(ga(s,i,"planAnnual","Annual",hm,o)),e.appendChild(n);const a=document.createElement("section");a.className="studio-jnf-card studio-jnf-includes-card",a.innerHTML=`
        <h4 class="studio-jnf-card-title">What's included</h4>
        <p class="studio-muted studio-jnf-card-help">Three tiers — global (every plan), shared fallback, or plan-specific bullets.</p>
        <div class="studio-jnf-includes-tier">
            <h5 class="studio-jnf-tier-title">Included on every plan</h5>
            <p class="studio-muted">From Studio → Services → Subscription</p>
            <ul class="studio-jnf-tier-list" data-jnf-global-list></ul>
            <button type="button" class="studio-btn-ghost studio-jnf-refresh-global">Refresh global list</button>
        </div>
        <div class="studio-jnf-includes-tier">
            <h5 class="studio-jnf-tier-title">Shared list (fallback)</h5>
            <p class="studio-muted">Used when a plan has no plan-specific bullets.</p>
            <div data-jnf-shared-includes></div>
            <div class="studio-jnf-copy-actions">
                <button type="button" class="studio-btn-ghost" data-jnf-copy-shared="planBimonthly">Copy shared → Bimonthly</button>
                <button type="button" class="studio-btn-ghost" data-jnf-copy-shared="planAnnual">Copy shared → Annual</button>
            </div>
        </div>
    `;const r=a.querySelector("[data-jnf-shared-includes]");r&&$r(r,Array.isArray(o.includes)?o.includes.map(String):[],b=>{const C=ye(s.state,s.flow,"value",s.locale);C.includes=b,s.hooks.markDirty(),he(i,s)}),(u=a.querySelector(".studio-jnf-refresh-global"))==null||u.addEventListener("click",()=>{bo(i,s)}),(c=a.querySelector('[data-jnf-copy-shared="planBimonthly"]'))==null||c.addEventListener("click",()=>{ba(s,"planBimonthly"),s.hooks.markDirty(),os(i.querySelector("[data-jnf-editor-col]"),s,i)}),(m=a.querySelector('[data-jnf-copy-shared="planAnnual"]'))==null||m.addEventListener("click",()=>{ba(s,"planAnnual"),s.hooks.markDirty(),os(i.querySelector("[data-jnf-editor-col]"),s,i)}),e.appendChild(a);const l=document.createElement("details");l.className="studio-jnf-legacy",l.innerHTML='<summary class="studio-muted">Legacy fallbacks</summary>';const{card:d,grid:p}=Ls("Legacy fields","Used when newer plan card fields are empty.");for(const b of Sm)p.appendChild(Ke(b.label,String(o[b.key]??""),!!b.multiline,C=>{const w=ye(s.state,s.flow,"value",s.locale);w[b.key]=C,s.hooks.markDirty(),he(i,s)}));l.appendChild(d),e.appendChild(l)}function ba(e,s){const i=_r(e.state,e.flow,"value",e.locale),o=Array.isArray(i.includes)?i.includes.map(String).filter(Boolean):[],n=ye(e.state,e.flow,"value",e.locale);(!n[s]||typeof n[s]!="object")&&(n[s]={}),n[s].includedBullets=[...o]}function ga(e,s,i,o,n,a){const r=document.createElement("section");r.className="studio-jnf-card studio-jnf-plan-card";const l=document.createElement("h4");l.className="studio-jnf-card-title",l.textContent=o,r.appendChild(l);const d=document.createElement("div");d.className="studio-form-grid studio-community__editorial studio-jnf-editorial";const p=a[i]&&typeof a[i]=="object"?a[i]:{};for(const b of n)d.appendChild(Ke(b.label,String(p[b.key]??""),!1,C=>{const w=ye(e.state,e.flow,"value",e.locale);(!w[i]||typeof w[i]!="object")&&(w[i]={}),w[i][b.key]=C,e.hooks.markDirty(),he(s,e)}));r.appendChild(d);const u=document.createElement("div");u.className="studio-jnf-plan-bullets";const c=document.createElement("p");c.className="studio-jnf-tier-title",c.textContent="Plan-specific bullets",u.appendChild(c);const m=p.includedBullets;return $r(u,Array.isArray(m)?m.map(String):[],b=>{const C=ye(e.state,e.flow,"value",e.locale);(!C[i]||typeof C[i]!="object")&&(C[i]={}),C[i].includedBullets=b,e.hooks.markDirty(),he(s,e)}),r.appendChild(u),r}function Tm(e,s,i,o){for(const a of oi.payment.cards){const{card:r,grid:l}=Ls(a.title,a.help);for(const d of a.fields||[])l.appendChild(Ke(d.label,String(o[d.key]??""),!!d.multiline,p=>{const u=ye(s.state,s.flow,"payment",s.locale);u[d.key]=p,s.hooks.markDirty(),he(i,s)}));e.appendChild(r)}const n=document.createElement("div");n.className="studio-jnf-plan-grid",n.appendChild(ya(s,i,"bimonthly","Bimonthly tier",o)),n.appendChild(ya(s,i,"annual","Annual tier",o)),e.appendChild(n)}function ya(e,s,i,o,n){const a=document.createElement("section");a.className="studio-jnf-card studio-jnf-plan-card";const r=document.createElement("h4");r.className="studio-jnf-card-title",r.textContent=o,a.appendChild(r);const l=document.createElement("div");l.className="studio-form-grid studio-community__editorial studio-jnf-editorial";const d=n[i]&&typeof n[i]=="object"?n[i]:{};for(const p of vm)l.appendChild(Ke(p.label,String(d[p.key]??""),!1,u=>{const c=ye(e.state,e.flow,"payment",e.locale);(!c[i]||typeof c[i]!="object")&&(c[i]={}),c[i][p.key]=u,e.hooks.markDirty(),he(s,e)}));return a.appendChild(l),a}function Am(e,s,i,o){for(const r of oi.confirmation.cards){const{card:l,grid:d}=Ls(r.title,r.help);for(const p of r.fields||[])d.appendChild(Ke(p.label,String(o[p.key]??""),!!p.multiline,u=>{const c=ye(s.state,s.flow,"confirmation",s.locale);c[p.key]=u,s.hooks.markDirty(),he(i,s)}));e.appendChild(l)}const n=document.createElement("section");n.className="studio-jnf-card",n.innerHTML='<h4 class="studio-jnf-card-title">Navigation links</h4>';const a=Array.isArray(o.links)?o.links:[];km(n,a,r=>{const l=ye(s.state,s.flow,"confirmation",s.locale);l.links=r,s.hooks.markDirty(),he(i,s)}),e.appendChild(n)}function $r(e,s,i){e.querySelectorAll(".studio-jnf-repeater").forEach(a=>a.remove());const o=document.createElement("div");o.className="studio-jnf-repeater";const n=()=>{o.innerHTML="",s.forEach((r,l)=>{const d=document.createElement("div");d.className="studio-jnf-repeater-row";const p=document.createElement("input");p.type="text",p.className="studio-input",p.value=r,p.addEventListener("input",()=>{s[l]=p.value,i([...s])});const u=document.createElement("button");u.type="button",u.className="studio-btn-ghost",u.textContent="Remove",u.addEventListener("click",()=>{s.splice(l,1),i([...s]),n()}),d.appendChild(p),d.appendChild(u),o.appendChild(d)});const a=document.createElement("button");a.type="button",a.className="studio-btn-ghost",a.textContent="Add item",a.addEventListener("click",()=>{s.push(""),i([...s]),n()}),o.appendChild(a)};n(),e.appendChild(o)}function km(e,s,i){const o=document.createElement("div");o.className="studio-jnf-repeater studio-jnf-links-repeater";const n=()=>{o.innerHTML="",s.forEach((r,l)=>{const d=document.createElement("div");d.className="studio-jnf-link-row";const p=r&&typeof r=="object"?r:{},u=[["id","Id"],["label","Label"],["href","Route"]];for(const[m,b]of u){const C=document.createElement("label");C.className="studio-field studio-field--stack",C.innerHTML=`<span>${b}</span>`;const w=document.createElement("input");w.type="text",w.className="studio-input",w.value=String(p[m]??""),w.addEventListener("input",()=>{(!s[l]||typeof s[l]!="object")&&(s[l]={}),s[l][m]=w.value,i([...s])}),C.appendChild(w),d.appendChild(C)}const c=document.createElement("button");c.type="button",c.className="studio-btn-ghost",c.textContent="Remove link",c.addEventListener("click",()=>{s.splice(l,1),i([...s]),n()}),d.appendChild(c),o.appendChild(d)});const a=document.createElement("button");a.type="button",a.className="studio-btn-ghost",a.textContent="Add link",a.addEventListener("click",()=>{s.push({id:"",label:"",href:"/"}),i([...s]),n()}),o.appendChild(a)};n(),e.appendChild(o)}function es(e,s){var d;const i=Xs.find(p=>p.id===s.flow),o=Tr(s.flow,s.state),n=e.querySelector("[data-jnf-flow-hint]");n&&(n.textContent=`${(i==null?void 0:i.label)||s.flow} · ${(i==null?void 0:i.pages)||""}`);const a=e.querySelector("[data-jnf-flow-nav]");a&&(a.innerHTML=Xs.map(p=>`<button type="button" class="studio-jnf-seg-btn${p.id===s.flow?" is-active":""}" data-jnf-flow="${p.id}">${hs(p.label)}</button>`).join(""));const r=e.querySelector("[data-jnf-stage-nav]");r&&(r.innerHTML=o.map(p=>{const u=Zs.find(m=>m.id===p),c=u!=null&&u.fork?` (${u.step})`:"";return`<button type="button" class="studio-jnf-step-btn${p===s.stage?" is-active":""}" data-jnf-stage="${p}">${hs((u==null?void 0:u.shortLabel)||p)}${c?`<span class="studio-jnf-step-fork">${hs(c)}</span>`:""}</button>`}).join("")),e.querySelectorAll("[data-jnf-locale]").forEach(p=>{p.classList.toggle("is-active",p.getAttribute("data-jnf-locale")===s.locale)}),e.querySelectorAll("[data-jnf-preview-mode]").forEach(p=>{p.classList.toggle("is-active",p.getAttribute("data-jnf-preview-mode")===s.previewMode)}),e.querySelectorAll("[data-jnf-preview-plan]").forEach(p=>{p.classList.toggle("is-active",p.getAttribute("data-jnf-preview-plan")===s.previewPlan)});const l=(d=e.closest(".studio-jnf-shell"))==null?void 0:d.querySelector(".studio-jnf-preview-plan-seg");l instanceof HTMLElement&&(l.hidden=s.stage!=="value"&&s.stage!=="payment")}function _m(e,s){e.addEventListener("click",i=>{const o=i.target;if(!(o instanceof Element))return;const n=o.closest("[data-jnf-flow]");if(n){const p=n.getAttribute("data-jnf-flow")||"membership";if(p===s.flow||s.dirtyGuardEnabled&&!window.confirm("Switch flow? Unsaved edits apply to the whole page when you Save."))return;s.flow=p;const u=Tr(s.flow,s.state);s.stage=u[0]||"band",s.previewMode=s.stage==="band"?"band":"modal",es(e,s),os(e.querySelector("[data-jnf-editor-col]"),s,e),Ve(e,s);return}const a=o.closest("[data-jnf-stage]");if(a){s.stage=a.getAttribute("data-jnf-stage")||"band",s.previewMode=s.stage==="band"?"band":"modal",es(e,s),os(e.querySelector("[data-jnf-editor-col]"),s,e),Ve(e,s);return}const r=o.closest("[data-jnf-locale]");if(r){s.locale=r.getAttribute("data-jnf-locale")||"en",es(e,s),os(e.querySelector("[data-jnf-editor-col]"),s,e),bo(e,s);return}const l=o.closest("[data-jnf-preview-mode]");if(l){s.previewMode=l.getAttribute("data-jnf-preview-mode")||"modal",es(e,s),Ve(e,s);return}const d=o.closest("[data-jnf-preview-plan]");d&&(s.previewPlan=d.getAttribute("data-jnf-preview-plan")||"bimonthly",es(e,s),Ve(e,s))})}async function $m(e,s,i){e.innerHTML="",e.className="studio-content-fields studio-content-fields--join-network-flow";const o=s&&typeof s=="object"?fo(s):{},n={state:o,hooks:i,flow:"membership",stage:"band",locale:"en",previewMode:"band",previewPlan:"bimonthly",globalBullets:[],previewTimer:null,dirtyGuardEnabled:!1};Ar.set(e,n),e.innerHTML=`
        <div class="studio-jnf-shell" data-jnf-root>
            <div class="studio-jnf-toolbar">
                <div class="studio-jnf-flow-row">
                    <div class="studio-jnf-seg" data-jnf-flow-nav role="tablist"></div>
                    <p class="studio-muted studio-jnf-flow-hint" data-jnf-flow-hint></p>
                </div>
                <div class="studio-jnf-toolbar-row">
                    <div class="studio-jnf-seg studio-jnf-locale-seg" role="tablist">
                        <button type="button" class="studio-jnf-seg-btn is-active" data-jnf-locale="en">English</button>
                        <button type="button" class="studio-jnf-seg-btn" data-jnf-locale="ja">日本語</button>
                    </div>
                </div>
                <div class="studio-jnf-stepper" data-jnf-stage-nav role="tablist"></div>
            </div>
            <div class="studio-jnf-split">
                <div class="studio-jnf-editor-col" data-jnf-editor-col></div>
                <aside class="studio-jnf-preview-pane">
                    <div class="studio-jnf-preview-toolbar">
                        <span class="studio-jnf-preview-label">Live preview</span>
                        <div class="studio-jnf-seg studio-jnf-seg--compact">
                            <button type="button" class="studio-jnf-seg-btn" data-jnf-preview-mode="band">Band</button>
                            <button type="button" class="studio-jnf-seg-btn is-active" data-jnf-preview-mode="modal">Modal</button>
                        </div>
                        <div class="studio-jnf-seg studio-jnf-seg--compact studio-jnf-preview-plan-seg">
                            <button type="button" class="studio-jnf-seg-btn is-active" data-jnf-preview-plan="bimonthly">Bi-monthly</button>
                            <button type="button" class="studio-jnf-seg-btn" data-jnf-preview-plan="annual">Annual</button>
                        </div>
                    </div>
                    <div class="studio-jnf-preview-frame">
                        <app-join-network data-studio-preview="true" data-modal-type="membership" context="home" active="true"></app-join-network>
                    </div>
                </aside>
            </div>
            <details class="studio-jnf-advanced">
                <summary>Advanced: all fields by path</summary>
                <div class="studio-jnf-advanced-body" data-jnf-advanced-fields></div>
            </details>
        </div>
    `;const a=e.querySelector("[data-jnf-root]"),r=e.querySelector("[data-jnf-advanced-fields]");if(a instanceof HTMLElement){if(_m(a,n),es(a,n),os(a.querySelector("[data-jnf-editor-col]"),n,a),r instanceof HTMLElement){const{fillStudioContentPlainFields:l}=await je(()=>Promise.resolve().then(()=>Mm),void 0);l(r,o,"join-network-flow",{markDirty:()=>{n.dirtyGuardEnabled=!0,i.markDirty()}}),r.addEventListener("input",()=>{const d=Cr(r),p=io(n.state,d);p&&typeof p=="object"&&(n.state=p,he(a,n))})}await bo(a,n),queueMicrotask(()=>Ve(a,n)),setTimeout(()=>{n.dirtyGuardEnabled=!0},0)}}function Cr(e){const s={};return e.querySelectorAll(".studio-content-str-value[data-path]").forEach(i=>{const o=i.getAttribute("data-path");o&&(i instanceof HTMLTextAreaElement||i instanceof HTMLInputElement)&&(s[o]=i.value)}),s}function Cm(e,s){const i=Em(e),o=e.querySelector("[data-jnf-advanced-fields]");let n=wm(s&&typeof s=="object"?s:{},i&&typeof i=="object"?i:{});return o instanceof HTMLElement&&(n=io(n,Cr(o))),n}function vs(e){return String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function go(e,s){return`
        <div class="studio-section-stack">
            ${s}
            <div class="studio-content-toolbar">
                <label class="studio-field studio-field--inline"><span class="studio-toolbar-label">Search</span>
                    <input type="search" id="${e}-filter" class="studio-input" placeholder="Filter sections…" autocomplete="off" />
                </label>
                <span id="${e}-count" class="studio-muted studio-content-count"></span>
            </div>
            <div class="studio-table-wrap studio-table-wrap--rounded">
                <table class="studio-table studio-table--rows">
                    <thead>
                        <tr>
                            <th>Section</th>
                            <th>Preview</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody id="${e}-tbody"><tr><td colspan="3">Loading…</td></tr></tbody>
                </table>
            </div>
            <div id="${e}-editor" class="studio-content-editor" style="display:none">
                <div class="studio-content-editor__header">
                    <h3 class="studio-subheading" id="${e}-editor-title">Edit</h3>
                    <p class="studio-muted studio-content-editor-slug" id="${e}-editor-slug" hidden></p>
                </div>
                <p class="studio-modal-hint studio-content-hint" id="${e}-hint">Fields are labeled by kind (Route, Media, Text, …). Uploads use Services → S3. Save to persist to storage.</p>
                <p id="${e}-live-placeholder" class="studio-banner studio-banner--placeholder" style="display:none" role="status">
                    Sample copy only — this section is not stored on the canister yet. Use <strong>Save</strong> or <strong>Adopt sample</strong> to persist (including any edits).
                </p>
                <p id="${e}-unsaved" class="studio-banner studio-banner--warn" style="display:none" role="status">You have unsaved changes.</p>
                <div id="${e}-fields" class="studio-content-fields studio-content-fields--scroll"></div>
                <div class="studio-content-editor__footer">
                    <div class="studio-toolbar-actions studio-content-editor__actions">
                        <button type="button" class="studio-btn-primary" id="${e}-save">Save</button>
                        <button type="button" class="studio-btn-primary" id="${e}-adopt" style="display:none">Adopt sample</button>
                        <button type="button" class="studio-btn-ghost" id="${e}-cancel">Cancel</button>
                    </div>
                    <p id="${e}-saved-at" class="studio-muted studio-content-saved-at" style="display:none" aria-live="polite"></p>
                    <p id="${e}-msg" class="studio-banner studio-banner--info" style="display:none"></p>
                </div>
            </div>
        </div>
    `}function Mr(){return go("studio-content",'<p class="studio-muted">Legal pages, application copy, and site sections that are not edited under <strong>Home</strong>, <strong>Programs</strong>, <strong>Products</strong>, or <strong>Journal</strong>. Labels describe where text appears (English and 日本語).</p>')}function xr(){return go("studio-home",'<p class="studio-muted">Homepage and global blocks (program hero, objects, events, audio, <strong>site-info</strong> home chapter, …). Same canister storage as before — one content page per slug.</p>')}function Ir(e,s,i,o,n={}){const a=n.chapterId;e.innerHTML="";let r=zl(s);i==="context"&&(r=r.filter(c=>{if(!c.path.startsWith("ja."))return!0;const m=_e("context",c.path);return m!=="assetUrl"&&m!=="externalUrl"})),r=r.sort((c,m)=>c.path.localeCompare(m.path));const l=cm(r),d={markDirty:()=>o.markDirty(),translateEnToJa:c=>xe(c)};let p=mm(l,i);a&&(p=p.filter(c=>{var m;return((m=c.chapter)==null?void 0:m.id)===a}));for(const c of p){const m=c.title&&c.items.length?(()=>{var L;const b=document.createElement("section");b.className="studio-content-chapter",(L=c.chapter)!=null&&L.id&&(b.dataset.chapterId=c.chapter.id);const C=document.createElement("h3");C.className="studio-content-chapter-title",C.textContent=c.title||"",b.appendChild(C);const w=document.createElement("div");return w.className="studio-content-chapter-body",b.appendChild(w),e.appendChild(b),w})():e;for(const b of c.items)b.type==="pair"?wr(m,i,b.en,b.ja,d):lm(m,i,b.row,o)}const u=Yl(s).sort((c,m)=>c.path.localeCompare(m.path));for(const c of u){const m=document.createElement("div");m.className="studio-content-field-row studio-content-field-row--scalar";const b=document.createElement("label");b.className="studio-field studio-field--stack studio-content-field-main";const C=document.createElement("span");if(C.textContent=`${c.label} (${c.kind})`,b.appendChild(C),c.kind==="boolean"){const w=document.createElement("input");w.type="checkbox",w.className="studio-checkbox",w.dataset.scalarPath=c.path,w.checked=!!c.value,w.addEventListener("change",()=>o.markDirty()),b.appendChild(w)}else{const w=document.createElement("input");w.type="number",w.className="studio-input",w.dataset.scalarPath=c.path,w.value=String(c.value),w.addEventListener("input",()=>o.markDirty()),b.appendChild(w)}m.appendChild(b),e.appendChild(m)}if(Array.isArray(s)&&s.length>0){const c=document.createElement("div");c.className="studio-content-array-hint";const m=document.createElement("table");m.className="studio-table studio-content-mini-table",m.innerHTML="<thead><tr><th>#</th><th>Id / key</th><th>Preview</th></tr></thead><tbody></tbody>";const b=m.querySelector("tbody");s.forEach((w,L)=>{const A=document.createElement("tr"),g=w&&typeof w=="object"?String(w.id??w.href??w.title??w.link??"—"):"—",f=w&&typeof w=="object"&&w.en&&typeof w.en=="object"?String(w.en.title??w.en.category??""):"";A.innerHTML=`<td>${L}</td><td>${vs(g.slice(0,80))}</td><td>${vs(f.slice(0,120))}</td>`,b==null||b.appendChild(A)});const C=document.createElement("p");C.className="studio-muted",C.innerHTML=`<strong>${s.length}</strong> items — edit fields below (paths like <code>0.en.title</code>).`,c.appendChild(C),c.appendChild(m),e.insertBefore(c,e.firstChild)}if(!l.length&&!u.length){const c=document.createElement("p");c.className="studio-muted",c.textContent="No editable text or numeric fields were found for this section.",e.appendChild(c)}}async function yo(e,s,i,o={}){const n=await Gs(s,{forStudio:!0,returnMeta:!0}),a=n&&typeof n=="object"&&"bundle"in n?n.bundle:n,r=n&&typeof n=="object"&&"isLivePlaceholder"in n?n.isLivePlaceholder:!1;return s==="join-network-flow"?(e.className="studio-content-fields studio-content-fields--join-network-flow",await $m(e,a,i),{isLivePlaceholder:r}):(e.className="studio-content-fields studio-content-fields--scroll",Ir(e,a,s||"",i,{chapterId:o.chapterId}),{isLivePlaceholder:r})}async function ho(e,s){if(e==="join-network-flow"){const r=await Gs(e,{forStudio:!0}),l=Cm(s,r);await Di(e,l);return}const i=rm(s),o={};s.querySelectorAll("input[data-scalar-path]").forEach(r=>{const l=r.getAttribute("data-scalar-path");l&&(r instanceof HTMLInputElement&&r.type==="checkbox"?o[l]=r.checked?"true":"false":r instanceof HTMLInputElement&&(o[l]=r.value))});const n=await Gs(e,{forStudio:!0});let a=io(n,i);a=Gl(n,a,o),e==="context"&&(a=Kl(a)),await Di(e,a)}function vo(e,s){const i=s.uploadArea||"studio/content";e.addEventListener("change",async o=>{var d;const n=o.target;if(!(n instanceof HTMLInputElement)||n.type!=="file")return;const a=n.dataset.uploadFor;if(!a)return;const r=(d=n.files)==null?void 0:d[0];if(!r)return;const l=e.querySelector(`.studio-content-str-value[data-path="${CSS.escape(a)}"]`);if(!(!(l instanceof HTMLTextAreaElement)&&!(l instanceof HTMLInputElement))){try{await Gt(r,l,{area:i,entityType:"content",entityId:"page",fieldKey:a.replace(/[^a-z0-9._-]+/gi,"-").toLowerCase()}),s.markDirty(),s.showMsg("ok","Uploaded — URL inserted. Save to persist."),l.dispatchEvent(new Event("input",{bubbles:!0}))}catch(p){const u=p instanceof Error?p.message:String(p),c=/presign|fetch|network|failed/i.test(u)&&!/S3 upload failed/.test(u)?`${u} — configure Services (integration API + S3) via the Services tab.`:u;s.showMsg("error",c)}n.value=""}})}async function jr(e,s){var at,tt;const i=s.prefix,o=e.querySelector(`#${i}-tbody`),n=e.querySelector(`#${i}-editor`),a=e.querySelector(`#${i}-editor-title`),r=e.querySelector(`#${i}-editor-slug`),l=e.querySelector(`#${i}-fields`),d=e.querySelector(`#${i}-msg`),p=e.querySelector(`#${i}-unsaved`),u=e.querySelector(`#${i}-saved-at`),c=e.querySelector(`#${i}-live-placeholder`),m=e.querySelector(`#${i}-adopt`),b=e.querySelector(`#${i}-hint`),C="Fields are labeled by kind (Route, Media, Text, …). Uploads use Services → S3. Save to persist to storage.",w="Edit each flow in journey order — band teaser, modal steps, and confirmation. Live preview updates as you type. Save to persist the same JSON the public site uses.";let L=null,A=!1;const g=(z,F)=>{d&&(d.style.display=F?"block":"none",d.className=`studio-banner studio-banner--${z}`,d.textContent=F)},f=z=>{c&&(c.style.display=z?"block":"none"),m instanceof HTMLElement&&(m.style.display=z?"":"none")},v=z=>{A=z,p&&(p.style.display=z?"block":"none");const F=e.querySelector(`#${i}-save`);F instanceof HTMLButtonElement&&F.setAttribute("aria-busy","false")},E=z=>Ql.find(F=>F.slug===z),j=z=>{A&&(n==null?void 0:n.style.display)!=="none"&&(z.preventDefault(),z.returnValue="")};window.addEventListener("beforeunload",j);const M=await s.getSummary();if(!o)return;const S=z=>{const F=[z.title,z.snippet].filter(Boolean).join(" — ");return F.length>160?`${F.slice(0,157)}…`:F};o.innerHTML=M.map(z=>`
        <tr>
            <td>${vs(z.label)}</td>
            <td>${vs(S(z))}</td>
            <td><button type="button" class="studio-btn-ghost studio-content-edit" data-slug="${vs(z.slug)}">Edit</button></td>
        </tr>`).join("");const h=async z=>{L=z,n&&(n.style.display="block");const F=E(z);a&&(a.textContent=F!=null&&F.label?`Edit: ${F.label}`:"Edit section"),r&&(r.textContent=z?`Slug: ${z}`:"",r.hidden=!z),g("info",""),v(!1),u&&(u.style.display="none"),b&&(b.innerHTML=z==="join-network-flow"?w:C);const{isLivePlaceholder:I}=l?await yo(l,z,{markDirty:()=>v(!0)},{}):{isLivePlaceholder:!1};f(I),Er((F==null?void 0:F.label)||z||""),a==null||a.focus(),n==null||n.scrollIntoView({behavior:"smooth"})};o.querySelectorAll(".studio-content-edit").forEach(z=>{z.addEventListener("click",()=>h(z.getAttribute("data-slug")||""))}),l&&vo(l,{markDirty:()=>v(!0),showMsg:g,uploadArea:s.uploadArea}),(at=e.querySelector(`#${i}-cancel`))==null||at.addEventListener("click",()=>{n&&(n.style.display="none"),L=null,v(!1),f(!1),u&&(u.style.display="none"),Lr()});const T=async()=>{if(!L||!l)return;await ho(L,l);const z=new Date().toLocaleTimeString(void 0,{hour:"2-digit",minute:"2-digit"});u&&(u.textContent=`Last saved ${z}`,u.style.display="block"),v(!1),f(!1),g("ok","Saved.")};(tt=e.querySelector(`#${i}-save`))==null||tt.addEventListener("click",async()=>{try{await T()}catch(z){g("error",z instanceof Error?z.message:String(z))}}),m==null||m.addEventListener("click",async()=>{try{await T()}catch(z){g("error",z instanceof Error?z.message:String(z))}});const N=e.querySelector(`#${i}-filter`),O=e.querySelector(`#${i}-count`),G=M.length,V=()=>{const z=(N instanceof HTMLInputElement?N.value:"").trim().toLowerCase();let F=0;o==null||o.querySelectorAll("tr").forEach(I=>{var $;const y=(($=I.textContent)==null?void 0:$.toLowerCase())??"",_=!z||y.includes(z);I.style.display=_?"":"none",_&&(F+=1)}),O&&(O.textContent=z?`${F} of ${G} section(s) match`:`${G} sections`)};V(),N==null||N.addEventListener("input",V)}async function Hr(e){await jr(e,{prefix:"studio-content",getSummary:()=>Vl(),uploadArea:"studio/content"})}async function qr(e){await jr(e,{prefix:"studio-home",getSummary:()=>Wl("home"),uploadArea:"studio/home-content"})}const Mm=Object.freeze(Object.defineProperty({__proto__:null,attachStudioContentFileUpload:vo,fillStudioContentPlainFields:Ir,initContent:Hr,initHome:qr,loadStudioContentEditorPayload:yo,persistStudioContentPage:ho,renderContent:Mr,renderHome:xr,renderStudioContentPanelHtml:go},Symbol.toStringTag,{value:"Module"})),Je='xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';function xm(e){const s={basics:`<svg ${Je}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,page:`<svg ${Je}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>`,details:`<svg ${Je}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"/></svg>`,application:`<svg ${Je}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 14h6"/><path d="M9 18h4"/></svg>`,faq:`<svg ${Je}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`};return s[e]||s.basics}function ha(){return`<svg ${Je}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`}function va(){return`<svg ${Je} width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`}function Le(e,s){return e(String(s??""))}function Sa(e,s,i,o,n){const a=Bi.find(u=>u.id===s),r=xm(s),l=n==="sidebar"?`studio-prog-editor-nav-card${o?" is-active":""}`:`studio-prog-editor-h-tab${o?" is-active":""}`,d=n==="sidebar"&&(a!=null&&a.subtitle)?`<span class="studio-prog-editor-nav-card__sub">${Le(e,a.subtitle)}</span>`:"",p=n==="sidebar"?`<span class="studio-prog-editor-nav-card__icon">${r}</span>
         <span class="studio-prog-editor-nav-card__text">
           <span class="studio-prog-editor-nav-card__title">${Le(e,i)}</span>
           ${d}
         </span>`:`<span class="studio-prog-editor-h-tab__icon">${r}</span>
         <span class="studio-prog-editor-h-tab__label">${Le(e,i)}</span>`;return`<button type="button" class="${l}" role="tab" data-prog-tab="${Le(e,s)}" aria-selected="${o?"true":"false"}" tabindex="${o?"0":"-1"}">${p}</button>`}function Im(e){const{escapeHtml:s,existing:i,p:o,visOptions:n,studioStatusOptions:a,routeLinkKind:r,routeLinkKindLabel:l,cardImgKind:d,cardImgKindLabel:p,panelsHtml:u}=e,c=Bi.map((b,C)=>Sa(s,b.id,b.label,C===0,"sidebar")).join(""),m=Bi.map((b,C)=>Sa(s,b.id,b.label,C===0,"horizontal")).join("");return`<form id="studio-prog-form" class="studio-modal-form studio-modal-form--program studio-prog-editor">
  <div class="studio-prog-editor-body">
    <aside class="studio-prog-editor-sidebar" aria-label="Program sections">
      <nav class="studio-prog-editor-nav" role="tablist">${c}</nav>
      <div class="studio-prog-editor-sidebar-foot">
        <div class="studio-prog-editor-status-card">
          <div class="studio-prog-editor-status-row">
            <span class="studio-prog-editor-status-label">Studio Status</span>
            <span class="studio-prog-editor-status-value" id="studio-prog-sidebar-status">
              <span class="studio-prog-editor-status-dot" aria-hidden="true"></span>
              <span data-prog-status-display>Open</span>
            </span>
          </div>
          <div class="studio-prog-editor-status-row">
            <span class="studio-prog-editor-status-label">Visibility</span>
            <span class="studio-prog-editor-status-value" id="studio-prog-sidebar-visibility">
              ${va()}
              <span data-prog-visibility-display>Public</span>
            </span>
          </div>
        </div>
        <a class="studio-prog-editor-preview-btn" id="studio-prog-preview-link" href="#" target="_blank" rel="noopener noreferrer">
          ${ha()}
          Preview Program
        </a>
      </div>
    </aside>
    <div class="studio-prog-editor-main">
      <section class="studio-prog-editor-info">
        <div class="studio-prog-editor-info__head">
          <div>
            <h3 class="studio-prog-editor-info__title">Program Information</h3>
            <p class="studio-prog-editor-info__helper">Update the basic information and media for this program.</p>
          </div>
          <a class="studio-prog-editor-view-live" id="studio-prog-view-live" href="#" target="_blank" rel="noopener noreferrer">
            ${ha()}
            View Live Page
          </a>
        </div>
        <div class="studio-prog-editor-info__grid">
          <label class="studio-prog-editor-field">
            <span class="studio-prog-editor-field__label">ID</span>
            <input name="id" required class="studio-prog-editor-input" value="${Le(s,String(o.id))}" ${i?"readonly":""} />
          </label>
          <label class="studio-prog-editor-field">
            <span class="studio-prog-editor-field__label">routeLink (record) <span class="studio-field-kind-badge studio-field-kind-badge--${r}">${Le(s,l)}</span></span>
            <input name="routeLink" class="studio-prog-editor-input" value="${Le(s,String(o.routeLink||""))}" />
          </label>
          <label class="studio-prog-editor-field">
            <span class="studio-prog-editor-field__label">Deposit (on-chain)</span>
            <input name="depositAmountDisplay" class="studio-prog-editor-input" value="${Le(s,String(o.depositAmountDisplay??""))}" placeholder="e.g. $1,000" autocomplete="off" />
          </label>
          <label class="studio-prog-editor-field">
            <span class="studio-prog-editor-field__label">featuredOrder</span>
            <input name="featuredOrder" type="number" class="studio-prog-editor-input" value="${Le(s,String(o.featuredOrder??0))}" />
          </label>
          <label class="studio-prog-editor-field studio-prog-editor-field--select">
            <span class="studio-prog-editor-field__label">visibility</span>
            <div class="studio-prog-editor-select-wrap">
              <span class="studio-prog-editor-select-icon" aria-hidden="true">${va()}</span>
              <select name="visibility" class="studio-prog-editor-input studio-prog-editor-select">${n}</select>
            </div>
          </label>
          <label class="studio-prog-editor-field studio-prog-editor-field--select">
            <span class="studio-prog-editor-field__label">studioStatus</span>
            <div class="studio-prog-editor-select-wrap">
              <span class="studio-prog-editor-status-dot studio-prog-editor-select-dot" aria-hidden="true"></span>
              <select name="studioStatus" class="studio-prog-editor-input studio-prog-editor-select">${a}</select>
            </div>
          </label>
        </div>
      </section>
      <div class="studio-prog-editor-toolbar">
        <div class="studio-prog-editor-toolbar__actions">
          <button type="button" class="studio-prog-editor-btn" id="studio-prog-translate-tab">Translate this tab → 日本語</button>
          <button type="button" class="studio-prog-editor-btn" id="studio-prog-translate-all">Translate all text → 日本語</button>
          <label class="studio-prog-editor-btn studio-prog-editor-btn--file">
            <input type="file" id="studio-prog-cover-file-en" accept="image/*,video/*,.pdf" class="studio-file-input studio-prog-cover-file" data-upload-target-locale="en" />
            Upload → imageSrc (EN)
          </label>
          <label class="studio-prog-editor-btn studio-prog-editor-btn--file">
            <input type="file" id="studio-prog-cover-file-ja" accept="image/*,video/*,.pdf" class="studio-file-input studio-prog-cover-file" data-upload-target-locale="ja" />
            Upload → imageSrc (JA)
          </label>
        </div>
        <p class="studio-prog-editor-media-hint">
          <span class="studio-field-kind-badge studio-field-kind-badge--${d}">${Le(s,p)}</span>
          Fills card <code>imageSrc</code> on the Basics tab.
        </p>
        <p id="studio-prog-modal-status" class="studio-prog-modal-status studio-sr-only" role="status" aria-live="polite"></p>
      </div>
      <div class="studio-prog-editor-h-tabs" role="tablist" aria-label="Program content sections">${m}</div>
      <div class="studio-prog-locale-form">
        <div class="studio-prog-editor-scroll">
          <div class="studio-prog-tab-panels">${u}</div>
        </div>
      </div>
    </div>
  </div>
</form>`}function jm(e){return`<footer class="studio-prog-editor-footer">
  <div class="studio-prog-editor-footer__status" id="studio-prog-save-status" data-state="clean">
    <span class="studio-prog-editor-footer__status-text">No changes yet</span>
  </div>
  <div class="studio-prog-editor-footer__actions">
    <button type="button" class="studio-prog-editor-btn studio-prog-editor-btn--cancel" id="studio-prog-cancel">Cancel</button>
    <button type="submit" class="studio-prog-editor-btn studio-prog-editor-btn--save" form="studio-prog-form">${e?"Save Program":"Add Program"}</button>
  </div>
</footer>`}function wa(e){const s=String(e||"").trim();return!s||s==="none"?s||"—":s.charAt(0).toUpperCase()+s.slice(1)}function Hm(e,s){const i=e.querySelector("#studio-prog-form");if(!(i instanceof HTMLFormElement))return;Xl(e),Zl(e);const o=i.querySelector('select[name="studioStatus"]'),n=i.querySelector('select[name="visibility"]'),a=i.querySelector('input[name="routeLink"]'),r=e.querySelector("[data-prog-status-display]"),l=e.querySelector("[data-prog-visibility-display]"),d=e.querySelector("#studio-prog-view-live"),p=e.querySelector("#studio-prog-preview-link"),u=e.querySelector("#studio-prog-save-status"),c=e.querySelector("#studio-prog-cancel");let m=null,b=null;const C=()=>{const v=new FormData(i),E=i.querySelector(".studio-prog-locale-form"),j=[];return E==null||E.querySelectorAll("[data-prog-locale][data-prog-path]").forEach(M=>{if(!(M instanceof HTMLInputElement||M instanceof HTMLTextAreaElement))return;const S=M.getAttribute("data-prog-locale")||"",h=M.getAttribute("data-prog-path")||"",T=M.type==="checkbox"?String(M.checked):M.value;j.push(`${S}:${h}=${T}`)}),JSON.stringify({meta:Object.fromEntries(v.entries()),locale:j.join("|")})},w=()=>{const v=a instanceof HTMLInputElement?a.value.trim():s.routeLinkSeed||"",E=v&&v.startsWith("/")?v:v?`/${v.replace(/^\//,"")}`:"";[d,p].forEach(j=>{j instanceof HTMLAnchorElement&&(E?(j.href=E,j.removeAttribute("aria-disabled"),j.classList.remove("is-disabled")):(j.href="#",j.setAttribute("aria-disabled","true"),j.classList.add("is-disabled")))})},L=()=>{r&&o instanceof HTMLSelectElement&&(r.textContent=wa(o.value)),l&&n instanceof HTMLSelectElement&&(l.textContent=wa(n.value))},A=v=>{const E=Math.floor((Date.now()-v)/1e3);if(E<10)return"just now";if(E<60)return`${E} seconds ago`;const j=Math.floor(E/60);if(j===1)return"1 minute ago";if(j<60)return`${j} minutes ago`;const M=Math.floor(j/60);return M===1?"1 hour ago":`${M} hours ago`},g=v=>{if(!(u instanceof HTMLElement))return;u.dataset.state=v;const E=u.querySelector(".studio-prog-editor-footer__status-text");E instanceof HTMLElement&&(v==="dirty"?E.textContent="Unsaved changes":v==="saved"&&b?E.innerHTML=`<span class="studio-prog-editor-footer__check" aria-hidden="true"></span> All changes saved · ${A(b)}`:E.textContent="No changes yet")},f=()=>{C()!==m?g("dirty"):g(m?"saved":"clean")};return m=C(),w(),L(),i.addEventListener("input",()=>{w(),f()}),i.addEventListener("change",()=>{L(),w(),f()}),c==null||c.addEventListener("click",()=>{C()!==m&&!window.confirm("Discard unsaved changes?")||s.onCancel()}),e.querySelectorAll("[data-studio-modal-close]").forEach(v=>{v.addEventListener("click",E=>{C()!==m&&(window.confirm("Discard unsaved changes?")||(E.preventDefault(),E.stopImmediatePropagation()))},!0)}),{markSaved(){m=C(),b=Date.now(),g("saved")},markDirty:f}}const Pr=["practice","perspective","vision","constructing","context","quote"];function Nr(e){const s=e&&typeof e=="object"?e:{},i=String(s.image??"").trim(),o=String(s.heroProfileImage??s.hero_profile_image??"").trim();return Ce(i)||Ce(o)}function qm(e){const s=ns(e&&typeof e=="object"?e:{},"en"),i=s.world&&typeof s.world=="object"&&!Array.isArray(s.world)?s.world:{};return ei(i).every(n=>Ce(n.src))}function Pm(e){if(Nr(e))return!0;const s=e&&typeof e=="object"?e:{},i=ns(s.locales&&typeof s.locales=="object"?s.locales:{},"en"),o=i.world&&typeof i.world=="object"&&!Array.isArray(i.world)?i.world:{};return ei(o).some(n=>Ce(n.src))}function Nm(e){const s=e&&typeof e=="object"?e:{},i=Ga(s),o=ns(s,"en");return Pr.every(n=>Ka(za(o,n,i)))}async function Rm(e){const s=e&&typeof e=="object"?e:{},i=String(s.image??"").trim(),o=String(s.heroProfileImage??s.hero_profile_image??"").trim(),n=[i,o].filter(Ce);let a=!1;n.length>0&&(a=(await Promise.all(n.map(m=>Mn(m)))).some(Boolean));const r=s.locales,l=ns(r&&typeof r=="object"?r:{},"en"),d=l.world&&typeof l.world=="object"&&!Array.isArray(l.world)?l.world:{},p=ei(d),u=await Promise.all(p.map(async c=>{const m=String(c.src??"").trim();return Ce(m)?Mn(m):!1}));return{heroOk:a,introSlotsOk:u}}function Ea(e,s=void 0){const i=e&&typeof e=="object"?e:{},o=i.locales,n=s&&typeof s=="object"?s:null,a=Nr(i),r=qm(o),l=n?n.heroOk:a,d=n?n.introSlotsOk.every(Boolean):r,p=l&&d,u=Nm(o),c=String(i.image??"").trim(),m=String(i.heroProfileImage??i.hero_profile_image??"").trim(),b=Ce(c)||Ce(m),C=[];if(l||C.push(n&&b?"banner/headshot hero (image failed to load)":"banner/headshot hero"),!d){const L=ns(o&&typeof o=="object"?o:{},"en"),A=L.world&&typeof L.world=="object"&&!Array.isArray(L.world)?L.world:{};ei(A).forEach((g,f)=>{var j;const v=String(g.src??"").trim();(j=n==null?void 0:n.introSlotsOk)!=null&&j[f]||(n&&Ce(v)?C.push(`intro slot ${f+1} (image failed to load)`):C.push(`intro slot ${f+1}`))})}if(!u){const L=o&&typeof o=="object"?o:{},A=Ga(L),g=ns(L,"en");for(const f of Pr)Ka(za(g,f,A))||C.push(`world.${f}`)}let w="partial";return p&&u?w="ready":!p&&!u&&(w="blocked"),{status:w,hasHero:l,hasAllIntro:d,hasCopy:u,missing:C}}function Rr(e){return e==="ready"?"studio-user-sub-dot--ok":e==="blocked"?"studio-user-sub-dot--err":"studio-user-sub-dot--warn"}function Ur(e){if(e.status==="ready")return"Ready";const s=Array.isArray(e.missing)?e.missing.filter(Boolean):[];return s.length?`Missing: ${s.join(", ")}`:e.status==="blocked"?"Missing images and Story & World copy":"Profile not ready"}function Um(e,s){if(!(e instanceof HTMLElement))return;e.className=`studio-user-sub-dot studio-artist-ready-dot ${Rr(s.status)}`;const i=Ur(s);e.title=i,e.setAttribute("aria-label",i)}const Gi=[{label:"Overview",items:[{id:"home",label:"Home"},{id:"subscribers",label:"Subscribers"}]},{label:"Management",items:[{id:"applicants",label:"Applicants"},{id:"schedule",label:"Schedule"},{id:"finance",label:"Finance"},{id:"travel",label:"Travel"}]},{label:"Content",items:[{id:"programs",label:"Programs"},{id:"products",label:"Products"},{id:"journal",label:"Journal"},{id:"sound",label:"Sound"},{id:"community",label:"Community"},{id:"videos",label:"Videos"},{id:"content",label:"Content"},{id:"email",label:"Email"},{id:"ai",label:"Assistance"}]},{label:"Accounts",items:[{id:"pending-approval",label:"Status"},{id:"artists",label:"Artists"},{id:"curators",label:"Curators"},{id:"collectors",label:"Collectors"},{id:"galleries",label:"Galleries"}]},{label:"Operations",items:[{id:"gallery-access",label:"Gallery Access"},{id:"users",label:"Users"},{id:"services",label:"Services"},{id:"settings",label:"Settings"}]}],So=Gi.flatMap(e=>e.items),te="dashboard",Fr={[te]:"Dashboard",team:"Team",permissions:"Permissions","pending-approval":"Status",...Object.fromEntries(So.map(e=>[e.id,e.label]))};function Ki(e){return Fr[e]||"Studio"}function Dr(e){switch(e){case te:return Fm();case"subscribers":return Dm();case"applicants":return Bm();case"schedule":return Ta("Schedule","Program calendars, artist timelines, and event scheduling tools will live here.","schedule");case"finance":return Iu();case"travel":return Ta("Travel","Travel coordination, accommodation notes, and arrival details will live here.","travel");case"artists":return Om();case"pending-approval":return Jm();case"programs":return Vm();case"products":return Wm();case"gallery-access":return Gm();case"journal":return Qm();case"sound":return Xm();case"community":return Zp();case"videos":return'<div id="studio-videos-root" class="studio-section-root"></div>';case"home":return xr();case"content":return Mr();case"email":return Zm();case"ai":return tf();case"galleries":return Mi("galleries");case"collectors":return Mi("collectors");case"curators":return Mi("curators");case"users":return ef();case"services":return sf();case"settings":return of();case"permissions":return Wu();case"team":return Xu();default:return nf(e)}}function Fm(){return`
        <div class="studio-section-stack">
            <p class="studio-banner studio-banner--info" id="studio-dashboard-banner">
                Loading metrics…
            </p>
            <div class="studio-stats-row" id="studio-dashboard-stats"></div>
            <div id="studio-dashboard-pending-wrap" class="studio-dashboard-pending" hidden>
                <div class="studio-section-title-row">
                    <h2>Pending visibility</h2>
                    <a href="#pending-approval" class="studio-quick-link">View Status queue</a>
                </div>
                <div id="studio-dashboard-pending-list" class="studio-table-wrap"></div>
            </div>
            <div>
                <div class="studio-section-title-row">
                    <h2>Audience pipeline</h2>
                </div>
                <div class="studio-pipeline-row">
                    ${js("Artists")}
                    ${js("Galleries")}
                    ${js("Curators")}
                    ${js("Collectors")}
                </div>
            </div>
            <div>
                <div class="studio-section-title-row">
                    <h2>Quick links</h2>
                </div>
                <ul class="studio-quick-links">
                    ${So.filter(e=>Jt(e.id).visible).map(e=>`<li><a href="#${e.id}" class="studio-quick-link" data-studio-hash="${e.id}">${U(e.label)}</a></li>`).join("")}
                </ul>
            </div>
        </div>
    `}function Dm(){return`
        <div class="studio-section-stack studio-category-page">
            ${de({title:"Subscribers",subtitle:"Newsletter signups and early-access records",countId:"studio-subscribers-header-count",countLabel:"records"})}
            ${Pe({searchId:"studio-subscribers-search",searchPlaceholder:"Search email, name, category…"})}
            <div class="studio-subscribers-toolbar">
                <button type="button" class="studio-btn-primary" id="studio-bootstrap-admin">
                    Claim first admin (local dev)
                </button>
                <button type="button" class="studio-btn-primary" id="studio-subscriber-add">ADD SUBSCRIBER</button>
                <label class="studio-file-label studio-btn-ghost">
                    <input type="file" id="studio-subscriber-csv" accept=".csv,text/csv" class="studio-file-input" />
                    Upload CSV
                </label>
                <button type="button" class="studio-btn-ghost" id="studio-subscribers-download-csv">Download CSV</button>
                <button type="button" class="studio-btn-ghost" id="studio-subscribers-refresh">
                    Refresh list
                </button>
                <button type="button" class="studio-btn-secondary" id="studio-subscribers-all-to-general">All To General</button>
            </div>
            <div id="studio-subscribers-csv-msg" class="studio-banner studio-banner--info" style="display:none"></div>
            <div id="studio-subscribers-banner" class="studio-banner studio-banner--info" style="display:none"></div>
            <div class="studio-table-wrap studio-table-wrap--sticky-head">
                <table class="studio-table studio-table--dense">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Category</th>
                            <th>Name</th>
                            <th>Intent</th>
                            <th>Timestamp</th>
                            <th>Audiences</th>
                            <th class="studio-td-actions studio-subscribers-col-manage">Manage</th>
                            <th class="studio-td-actions studio-subscribers-col-delete">Delete</th>
                        </tr>
                    </thead>
                    <tbody id="studio-subscribers-tbody">
                        <tr><td colspan="8">Loading…</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `}function Bm(){return`
        <div class="studio-section-stack studio-category-page">
            ${de({title:"Applicants",subtitle:"Program applications and pipeline",countId:"studio-applicants-header-count",countLabel:"in view"})}
            ${fr({ariaLabel:"Applicant status",tabs:[{id:"studio-app-tab-all",label:"All",value:"all",active:!0},{id:"studio-app-tab-pending",label:"Pending",value:"pending"},{id:"studio-app-tab-reviewing",label:"Initial review",value:"reviewing"},{id:"studio-app-tab-post-interview",label:"Post interview review",value:"postInterviewReview"},{id:"studio-app-tab-needs",label:"Needs info",value:"needsInfo"},{id:"studio-app-tab-accepted",label:"Approved",value:"accepted"},{id:"studio-app-tab-rejected",label:"Denied",value:"rejected"},{id:"studio-app-tab-pulled-out",label:"Pulled out",value:"pulledOut"},{id:"studio-app-tab-tester",label:"Tester",value:"tester"}]})}
            ${Pe({searchId:"studio-applicants-search",searchPlaceholder:"Search email, name, program…"})}
            <details class="studio-section-accordion studio-section-accordion--applicants-admin">
                <summary class="studio-section-accordion__summary">Add applicant &amp; admin tools</summary>
                <div class="studio-section-accordion__body">
                    <div id="studio-applicants-banner" class="studio-banner studio-banner--info"></div>
                    <div class="studio-modal-actions" style="margin:0.25rem 0 0.5rem">
                        <button type="button" class="studio-btn-secondary" id="studio-applicants-generate-access-code">Generate access code</button>
                    </div>
                    <div class="studio-applicant-add">
                        <h3 class="studio-subheading">Add applicant</h3>
                        <div class="studio-form-grid">
                            <label class="studio-field studio-field--full"><span>Pick veteran artist</span>
                                <select id="studio-app-new-artist" class="studio-select">
                                    <option value="">Manual applicant</option>
                                </select>
                            </label>
                            <label class="studio-field"><span>Applicant reference</span><input type="text" id="studio-app-new-id" class="studio-input" placeholder="Unique reference for this record" /></label>
                            <label class="studio-field"><span>Program ID</span><input type="text" id="studio-app-new-program" class="studio-input" /></label>
                            <label class="studio-field"><span>Email</span><input type="email" id="studio-app-new-email" class="studio-input" /></label>
                            <label class="studio-field"><span>Name</span><input type="text" id="studio-app-new-name" class="studio-input" /></label>
                            <label class="studio-field"><span>Status</span>
                                <select id="studio-app-new-status" class="studio-select">
                                    <option value="pending">Pending</option>
                                    <option value="reviewing">Initial review</option>
                                    <option value="postInterviewReview">Post interview review</option>
                                    <option value="needsInfo">Needs info</option>
                                    <option value="accepted">Approved</option>
                                    <option value="rejected">Denied</option>
                                </select>
                            </label>
                            <label class="studio-field studio-field--full"><span>Notes</span><textarea id="studio-app-new-payload" class="studio-textarea" rows="4" placeholder="Internal notes (plain text)"></textarea></label>
                        </div>
                        <button type="button" class="studio-btn-primary" id="studio-app-new-save">SAVE APPLICANT</button>
                    </div>
                </div>
            </details>
            <div class="studio-table-wrap studio-table-wrap--sticky-head">
                <table class="studio-table studio-table--dense">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Name</th>
                            <th>Program</th>
                            <th>Status</th>
                            <th>Category</th>
                            <th>Slot secured</th>
                            <th>Created</th>
                            <th class="studio-th-actions">View</th>
                            <th class="studio-th-actions">Email</th>
                            <th class="studio-th-actions">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="studio-applicants-tbody"><tr><td colspan="10">Loading…</td></tr></tbody>
                </table>
            </div>
            ${Ku({navId:"studio-applicants-pagination",prevId:"studio-app-page-prev",nextId:"studio-app-page-next",labelId:"studio-app-page-label",numbersId:"studio-app-page-numbers"})}
        </div>
    `}function Om(){return`
        <div class="studio-section-stack studio-category-page">
            <section id="studio-artists-list-surface">
            ${de({title:"Artists",subtitle:"Admin roster — visibility, codes, and public links",countId:"studio-artists-header-count",countLabel:"artists"})}
            ${Pe({searchId:"studio-artists-search",searchPlaceholder:"Filter slug, id, visibility…"})}
            <div class="studio-artists-quick-filters" style="display:flex;flex-wrap:wrap;gap:0.5rem 0.75rem;align-items:center;margin:0.35rem 0 0.75rem">
                <span class="studio-muted" style="margin-right:0.25rem">Quick:</span>
                <button type="button" class="studio-btn-ghost studio-artists-filter is-active" data-filter="all">All</button>
                <button type="button" class="studio-btn-ghost studio-artists-filter" data-filter="featurable">Featurable</button>
                <button type="button" class="studio-btn-ghost studio-artists-filter" data-filter="featured">Featured</button>
                <label class="studio-field" style="margin:0 0 0 0.75rem"><span class="studio-muted">Visibility</span>
                    <select id="studio-artists-filter-visibility" class="studio-select">
                        <option value="">All</option>
                        <option value="inactive">Inactive</option>
                        <option value="pending">Pending</option>
                        <option value="private">Private</option>
                        <option value="public">Public</option>
                    </select>
                </label>
                <label class="studio-muted" style="display:inline-flex;align-items:center;gap:0.35rem;margin-left:0.75rem;cursor:pointer">
                    <input type="checkbox" id="studio-artists-random-featured" />
                    Random featured (pick up to ${Ya} from featurable pool)
                </label>
            </div>
            <details class="studio-section-accordion studio-section-accordion--artists-admin">
                <summary class="studio-section-accordion__summary">Admin tools & guidance</summary>
                <div class="studio-section-accordion__body">
                    <p class="studio-banner studio-banner--info">Admin roster: use <strong>Manage</strong> for structured editing (tabs: roster, identity, world, media, links/SEO). Batch JSON remains for bulk import. <strong>Advanced JSON</strong> in the manage surface applies <strong>test overlay</strong> only (localStorage).</p>
                    <p class="studio-muted">Batch upload: JSON array of artist rows (see <code>ArtistRecord</code> shape), or <code>{ "artists": [ … ] }</code>. Imported rows get an 8-digit access code for future account linking.</p>
                    <p class="studio-muted">Per-artist <strong>access code</strong> in Manage is for claiming an existing roster profile (use <strong>Generate new code</strong> there after a code is used, or save with an empty field to auto-assign). <strong>Generate artist join invite</strong> creates a separate single-use code for new members without a roster row (same 8-digit format).</p>
                    <div class="studio-subscribers-toolbar studio-subscribers-toolbar--artists">
                        <label class="studio-file-label studio-btn-ghost">
                            <input type="file" accept="application/json,.json" id="studio-artists-batch-json" class="studio-file-input" />
                            Batch upload (JSON)
                        </label>
                        <button type="button" class="studio-btn-secondary" id="studio-artists-gen-invite">Generate artist join invite</button>
                        <button type="button" class="studio-btn-ghost" id="studio-artists-sync-hero">Sync Profile Images</button>
                        <button type="button" class="studio-btn-ghost" id="studio-artists-approve-all-profile-images">Approve all profile images</button>
                        <button type="button" class="studio-btn-ghost" id="studio-artists-sync-gallery">Sync Gallery</button>
                        <button type="button" class="studio-btn-ghost" id="studio-artists-migrate-firebase-gallery">Migrate Firebase Gallery</button>
                    </div>
                    <p class="studio-muted">Public <strong>/artists</strong> page — headline above the featured strip (plain text; line breaks preserved). Also listed under <strong>Content</strong>.</p>
                    <div id="studio-artists-shout-fields" class="studio-content-fields"></div>
                    <div class="studio-toolbar-actions" style="margin-top:0.65rem">
                        <button type="button" class="studio-btn-primary" id="studio-artists-shout-save">Save shout headline</button>
                    </div>
                    <p id="studio-artists-shout-msg" class="studio-banner studio-banner--info" style="display:none;margin-top:0.5rem" role="status"></p>
                </div>
            </details>
            <details class="studio-section-accordion studio-section-accordion--artists-world">
                <summary class="studio-section-accordion__summary">World copy generator</summary>
                <div class="studio-section-accordion__body">
                    <p class="studio-muted">
                        Generate <strong>Kamauu-style</strong> <strong>New World</strong> copy (micro-bio, perspective, vision, constructing, context, quote) from English bio/discipline and Story &amp; World fields via the canister LLM. Output is written to <code>locales.*.worldNew</code> (artist-authored Story &amp; World in <code>world</code> stays manual unless they edit it). Japanese locales are filled by translation.
                    </p>
                    <button type="button" class="studio-btn-secondary" id="studio-artists-world-batch-open">Generate New World from bio (batch)…</button>
                </div>
            </details>
            <details class="studio-section-accordion studio-section-accordion--artists-comms">
                <summary class="studio-section-accordion__summary">Comms</summary>
                <div class="studio-section-accordion__body">
                    <button type="button" class="studio-btn-secondary" id="studio-artists-send-blast-open">Send blast…</button>
                </div>
            </details>
            <div id="studio-artists-banner" class="studio-banner studio-banner--info"></div>
            <div class="studio-table-wrap studio-table-wrap--sticky-head">
                <table class="studio-table studio-table--dense">
                    <thead>
                        <tr>
                            <th scope="col" aria-label="Profile readiness">Ready</th>
                            <th>Slug</th>
                            <th>ID</th>
                            <th>Email</th>
                            <th>Imported</th>
                            <th>Access code</th>
                            <th>Visibility</th>
                            <th>Featured</th>
                            <th>Featurable</th>
                            <th>Recent program</th>
                            <th>Public profile</th>
                            <th class="studio-td-actions">Manage</th>
                        </tr>
                    </thead>
                    <tbody id="studio-artists-tbody"><tr><td colspan="12">Loading…</td></tr></tbody>
                </table>
            </div>
            </section>
            <section id="studio-artist-manage-surface" class="studio-artist-manage-surface" hidden></section>
        </div>
    `}function Jm(){return`
        <div class="studio-section-stack studio-category-page">
            <section id="studio-pending-list-surface">
            ${de({title:"Status",subtitle:"Artist roster profiles needing review (pending + inactive)",countId:"studio-pending-approval-header-count",countLabel:"pending + inactive"})}
            ${Pe({searchId:"studio-pending-approval-search",searchPlaceholder:"Filter slug, id, email…"})}
            <p class="studio-muted">Set visibility to <strong>public</strong> when approved, or use <strong>Manage</strong> to move artists between <strong>pending</strong>, <strong>inactive</strong>, and other states.</p>
            <div class="studio-table-wrap studio-table-wrap--sticky-head">
                <table class="studio-table studio-table--dense">
                    <thead>
                        <tr>
                            <th>Slug</th>
                            <th>ID</th>
                            <th>Email</th>
                            <th>Visibility</th>
                            <th>Public profile</th>
                            <th class="studio-td-actions">Manage</th>
                        </tr>
                    </thead>
                    <tbody id="studio-pending-approval-tbody"><tr><td colspan="6">Loading…</td></tr></tbody>
                </table>
            </div>
            </section>
            <section id="studio-pending-manage-surface" class="studio-artist-manage-surface" hidden></section>
        </div>
    `}function Vm(){return`
        <div class="studio-section-stack studio-category-page">
            ${de({title:"Programs",subtitle:"Program records (Manage) — home block & page headline in the section below",countId:"studio-programs-header-count",countLabel:"programs"})}
            ${Pe({searchId:"studio-programs-search",searchPlaceholder:"Search id, focus, location, route…"})}
            <p class="studio-muted">Programs are <code>ProgramRecord</code> — locale fields include card copy and nested <code>programPage</code> (costs, details, FAQ) in the Manage dialog. Test mode uses <code>localStorage</code>.</p>
            <details class="studio-embed-block" open>
                <summary class="studio-subheading">Home block &amp; programs page copy</summary>
                <p class="studio-muted">Edit the all-programs block (card order and fields) and the <strong>/programs</strong> page headline from <code>site-info</code> (same storage as Studio → Home).</p>
                <div class="studio-toolbar-actions" style="margin:0.5rem 0;flex-wrap:wrap;gap:0.5rem">
                    <button type="button" class="studio-btn-primary" id="studio-programs-edit-block">Edit programs block</button>
                    <button type="button" class="studio-btn-ghost" id="studio-programs-edit-siteinfo">Edit programs page headline</button>
                </div>
                <div id="studio-programs-embed-editor" class="studio-content-editor" style="display:none;margin-top:12px">
                    <h3 class="studio-subheading" id="studio-programs-embed-title">Edit</h3>
                    <p id="studio-programs-embed-unsaved" class="studio-banner studio-banner--warn" style="display:none" role="status">You have unsaved changes.</p>
                    <div id="studio-programs-embed-fields" class="studio-content-fields studio-content-fields--scroll" style="max-height:min(50vh,28rem)"></div>
                    <div class="studio-toolbar-actions" style="margin-top:12px">
                        <button type="button" class="studio-btn-primary" id="studio-programs-embed-save">Save</button>
                        <button type="button" class="studio-btn-ghost" id="studio-programs-embed-cancel">Cancel</button>
                    </div>
                    <p id="studio-programs-embed-msg" class="studio-banner studio-banner--info" style="display:none"></p>
                </div>
            </details>
            <div class="studio-subscribers-toolbar">
                <button type="button" class="studio-btn-primary" id="studio-program-add">ADD PROGRAM</button>
                <button type="button" class="studio-btn-ghost" id="studio-programs-refresh">Refresh</button>
                <label class="studio-file-label studio-btn-ghost">
                    <input type="file" accept="application/json,.json" id="studio-programs-batch-json" class="studio-file-input" />
                    Batch upload (JSON)
                </label>
                <label class="studio-field" style="display:inline-flex;align-items:center;flex-wrap:wrap;gap:0.4rem 0.65rem;margin-left:0.5rem">
                    <span class="studio-muted">Current season (program id)</span>
                    <input type="text" id="studio-programs-current-season" class="studio-input" placeholder="e.g. fusionKaga" autocomplete="off" style="min-width:11rem" />
                    <button type="button" class="studio-btn-ghost" id="studio-programs-current-season-save">Save</button>
                </label>
            </div>
            <div id="studio-programs-banner" class="studio-banner studio-banner--info" style="display:none"></div>
            <div class="studio-table-wrap studio-table-wrap--sticky-head">
                <table class="studio-table studio-table--dense">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Focus</th>
                            <th>Location</th>
                            <th>Year</th>
                            <th>Open</th>
                            <th>Route</th>
                            <th>Status</th>
                            <th class="studio-td-actions">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="studio-programs-tbody"><tr><td colspan="8">Loading…</td></tr></tbody>
                </table>
            </div>
        </div>
    `}function Wm(){return`
        <div class="studio-section-stack studio-category-page">
            ${de({title:"Products",subtitle:"Edition records (Manage) — grid JSON & page headline in the section below",countId:"studio-products-header-count",countLabel:"editions"})}
            ${Pe({searchId:"studio-products-search",searchPlaceholder:"Search id, title, href, status…"})}
            <p class="studio-muted studio-banner studio-banner--info">Editions here power the public <code>/editions</code> grid (<code>listEditions</code>). Home “Objects Highlights” uses Studio → <strong>Home</strong> → <strong>Objects highlight</strong> when that JSON includes an <code>objects</code> array; if it is empty or missing, the home block shows up to four of these edition records instead.</p>
            <details class="studio-embed-block" open>
                <summary class="studio-subheading">Editions grid &amp; editions page copy</summary>
                <p class="studio-muted">Structured grid items (often mirror Manage rows) and the <strong>/editions</strong> page headline from <code>site-info</code>.</p>
                <div class="studio-toolbar-actions" style="margin:0.5rem 0;flex-wrap:wrap;gap:0.5rem">
                    <button type="button" class="studio-btn-primary" id="studio-products-edit-grid">Edit editions grid</button>
                    <button type="button" class="studio-btn-ghost" id="studio-products-edit-siteinfo">Edit editions page headline</button>
                </div>
                <div id="studio-products-embed-editor" class="studio-content-editor" style="display:none;margin-top:12px">
                    <h3 class="studio-subheading" id="studio-products-embed-title">Edit</h3>
                    <p id="studio-products-embed-unsaved" class="studio-banner studio-banner--warn" style="display:none" role="status">You have unsaved changes.</p>
                    <div id="studio-products-embed-fields" class="studio-content-fields studio-content-fields--scroll" style="max-height:min(50vh,28rem)"></div>
                    <div class="studio-toolbar-actions" style="margin-top:12px">
                        <button type="button" class="studio-btn-primary" id="studio-products-embed-save">Save</button>
                        <button type="button" class="studio-btn-ghost" id="studio-products-embed-cancel">Cancel</button>
                    </div>
                    <p id="studio-products-embed-msg" class="studio-banner studio-banner--info" style="display:none"></p>
                </div>
            </details>
            <div class="studio-subscribers-toolbar">
                <button type="button" class="studio-btn-primary" id="studio-product-add">ADD EDITION</button>
                <button type="button" class="studio-btn-ghost" id="studio-products-refresh">Refresh</button>
            </div>
            <div id="studio-products-banner" class="studio-banner studio-banner--info" style="display:none"></div>
            <div class="studio-table-wrap studio-table-wrap--sticky-head">
                <table class="studio-table studio-table--dense">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Title (en)</th>
                            <th>Title (ja)</th>
                            <th>href</th>
                            <th>Status</th>
                            <th>Cover</th>
                            <th class="studio-td-actions">Manage</th>
                        </tr>
                    </thead>
                    <tbody id="studio-products-tbody"><tr><td colspan="7">Loading…</td></tr></tbody>
                </table>
            </div>
        </div>
    `}function Gm(){return`
        <div class="studio-section-stack">
            <p class="studio-muted">Subscribers with Gallery-related categories + artists with <code>galleryFilter</code>.</p>
            <h3 class="studio-subheading">Subscribers</h3>
            <div class="studio-table-wrap">
                <table class="studio-table">
                    <thead><tr><th>Email</th><th>Category</th></tr></thead>
                    <tbody id="studio-ga-subs-tbody"><tr><td colspan="2">Loading…</td></tr></tbody>
                </table>
            </div>
            <h3 class="studio-subheading">Artists</h3>
            <div class="studio-table-wrap">
                <table class="studio-table">
                    <thead><tr><th>Slug</th><th>Access type</th><th>Season</th></tr></thead>
                    <tbody id="studio-ga-artists-tbody"><tr><td colspan="3">Loading…</td></tr></tbody>
                </table>
            </div>
        </div>
    `}function Km(e){const s=Ds({entryStatus:e}),i={draft:["studio-journal-status--draft","Draft"],published:["studio-journal-status--published","Published"],archived:["studio-journal-status--archived","Archived"]},[o,n]=i[s]||i.draft;return`<span class="studio-journal-status ${o}">${U(n)}</span>`}function zm(e){const s={yes:["studio-journal-chip--live","Yes"],no:["studio-journal-chip--neutral","No"],hidden:["studio-journal-chip--hidden","Hidden"],broken:["studio-journal-chip--broken","Broken ref"]},[i,o]=s[e]||s.no;return`<span class="studio-journal-chip ${i}">${U(o)}</span>`}function Ym(e){const s={live:["studio-journal-chip--live","Live"],hidden:["studio-journal-chip--hidden","Hidden"],broken:["studio-journal-chip--broken","Broken ref"]},[i,o]=s[e]||s.live;return`<span class="studio-journal-chip ${i}">${U(o)}</span>`}function La(e){var n,a;const s=String(((n=e==null?void 0:e.en)==null?void 0:n.title)??((a=e==null?void 0:e.en)==null?void 0:a.name)??"").trim(),i=Fa(e==null?void 0:e.link,s,e==null?void 0:e.id);if(i.startsWith("/")||/^https?:\/\//i.test(i))return i;const o=String((e==null?void 0:e.id)??"").trim();return o?`/journal/entry/${encodeURIComponent(o)}`:"/journal"}function Qm(){return`
        <div class="studio-section-stack studio-category-page studio-journal-page">
            ${de({title:"Journal",subtitle:"Manage journal entries and curate what appears on /journal",countId:"studio-journal-entries-count",countLabel:"entries"})}
            <section class="studio-journal-section" aria-labelledby="studio-journal-entries-heading">
                <h3 id="studio-journal-entries-heading" class="studio-subheading">Journal entries</h3>
                <p class="studio-muted studio-journal-lede">All CMS journal records. Only <strong>published</strong> entries appear on the public site.</p>
                ${fr({ariaLabel:"Entry status",tabs:[{id:"studio-journal-tab-all",label:"All",value:"all",active:!0},{id:"studio-journal-tab-draft",label:"Draft",value:"draft"},{id:"studio-journal-tab-published",label:"Published",value:"published"},{id:"studio-journal-tab-archived",label:"Archived",value:"archived"}]})}
                ${Pe({searchId:"studio-journal-entries-search",searchPlaceholder:"Search title, id, link…"})}
                <div class="studio-subscribers-toolbar studio-journal-toolbar">
                    <button type="button" class="studio-btn-primary" id="studio-journal-new-entry">+ New journal entry</button>
                </div>
                <div class="studio-table-wrap studio-table-wrap--sticky-head">
                    <table class="studio-table studio-table--dense">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Status</th>
                                <th>On /journal</th>
                                <th>URL</th>
                                <th>Updated</th>
                                <th class="studio-td-actions">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="studio-journal-entries-tbody"><tr><td colspan="6">Loading…</td></tr></tbody>
                    </table>
                </div>
            </section>

            <section class="studio-journal-section" aria-labelledby="studio-journal-home-carousel-heading">
                <div class="studio-journal-section__head">
                    <div>
                        <h3 id="studio-journal-home-carousel-heading" class="studio-subheading">Home carousel</h3>
                        <p class="studio-muted studio-journal-lede">Choose up to <strong>3 published</strong> entries for the homepage journal hero. Slide 1 is the first pagination dot (left). Leave all slots empty to use automatic newest-first order.</p>
                    </div>
                </div>
                <div class="studio-journal-home-carousel">
                    <label class="studio-field">
                        <span>Slide 1</span>
                        <select id="studio-journal-home-slot-0" class="studio-select"><option value="">— Automatic —</option></select>
                    </label>
                    <label class="studio-field">
                        <span>Slide 2</span>
                        <select id="studio-journal-home-slot-1" class="studio-select"><option value="">— None —</option></select>
                    </label>
                    <label class="studio-field">
                        <span>Slide 3</span>
                        <select id="studio-journal-home-slot-2" class="studio-select"><option value="">— None —</option></select>
                    </label>
                </div>
                <div class="studio-subscribers-toolbar studio-journal-toolbar" style="flex-wrap:wrap;gap:0.5rem;align-items:center">
                    <button type="button" class="studio-btn-primary" id="studio-journal-home-carousel-save">Save carousel</button>
                    <button type="button" class="studio-btn-ghost" id="studio-journal-home-carousel-clear">Use automatic order</button>
                </div>
                <p id="studio-journal-home-carousel-msg" class="studio-banner studio-banner--info" style="display:none" role="status"></p>
            </section>

            <section class="studio-journal-section" aria-labelledby="studio-journal-layout-heading">
                <div class="studio-journal-section__head">
                    <div>
                        <h3 id="studio-journal-layout-heading" class="studio-subheading">/journal page layout</h3>
                        <p class="studio-muted studio-journal-lede">Controls what visitors see on <a href="/journal" target="_blank" rel="noopener noreferrer">/journal</a> — only <strong>published</strong> entries with valid refs appear.</p>
                    </div>
                    <p class="studio-journal-layout-stat" aria-live="polite"><span id="studio-journal-header-count">—</span> rows</p>
                </div>
                <p id="studio-journal-layout-unsaved" class="studio-banner studio-banner--warn" style="display:none" role="status">You have unsaved layout changes.</p>
                ${Pe({searchId:"studio-journal-search",searchPlaceholder:"Search layout rows…"})}
                <div class="studio-subscribers-toolbar studio-journal-toolbar" style="flex-wrap:wrap;gap:0.5rem;align-items:center">
                    <button type="button" class="studio-btn-primary" id="studio-journal-add">+ Add layout row</button>
                    <button type="button" class="studio-btn-primary" id="studio-journal-save-layout">Save layout</button>
                    <a href="/journal" target="_blank" rel="noopener noreferrer" class="studio-btn-ghost">Preview /journal</a>
                    <button type="button" class="studio-btn-ghost" id="studio-journal-refresh">Refresh</button>
                </div>
                <div id="studio-journal-banner" class="studio-banner studio-banner--info" style="display:none"></div>
                <div class="studio-table-wrap studio-table-wrap--sticky-head">
                    <table class="studio-table studio-table--dense">
                        <thead>
                            <tr>
                                <th>Order</th>
                                <th>Feature</th>
                                <th>Type</th>
                                <th>Visibility</th>
                                <th>Ref / details</th>
                                <th class="studio-td-actions">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="studio-journal-tbody"><tr><td colspan="6">Loading…</td></tr></tbody>
                    </table>
                </div>
            </section>

            <details class="studio-embed-block studio-journal-settings">
                <summary class="studio-subheading">Home &amp; page settings</summary>
                <p id="studio-journal-settings-note" class="studio-muted"></p>
                <div class="studio-toolbar-actions" style="margin:0.5rem 0;flex-wrap:wrap;gap:0.5rem">
                    <button type="button" class="studio-btn-primary" id="studio-journal-edit-block">Edit test mode home list</button>
                    <button type="button" class="studio-btn-ghost" id="studio-journal-edit-siteinfo">Edit /journal page headline</button>
                </div>
                <div id="studio-journal-embed-editor" class="studio-content-editor" style="display:none;margin-top:12px">
                    <h3 class="studio-subheading" id="studio-journal-embed-title">Edit</h3>
                    <p id="studio-journal-embed-unsaved" class="studio-banner studio-banner--warn" style="display:none" role="status">You have unsaved changes.</p>
                    <div id="studio-journal-embed-fields" class="studio-content-fields studio-content-fields--scroll" style="max-height:min(50vh,28rem)"></div>
                    <div class="studio-toolbar-actions" style="margin-top:12px">
                        <button type="button" class="studio-btn-primary" id="studio-journal-embed-save">Save</button>
                        <button type="button" class="studio-btn-ghost" id="studio-journal-embed-cancel">Cancel</button>
                    </div>
                    <p id="studio-journal-embed-msg" class="studio-banner studio-banner--info" style="display:none"></p>
                </div>
            </details>
        </div>
    `}function Xm(){return`
        <div class="studio-section-stack studio-category-page">
            ${de({title:"Sound",subtitle:"Atmosphere loop + voice overlays in the public site header (after “click to enter”)",countId:"studio-sound-header-count",countLabel:""})}
            <p class="studio-muted">Upload atmosphere audio to S3; choose random artist audio bites (from member profiles) or a manual file. Set timing for how often a voice plays over the bed.</p>
            <form id="studio-sound-form" class="studio-section-stack" style="max-width:40rem">
                <label class="studio-field studio-field--row">
                    <input type="checkbox" id="studio-sound-enabled" name="enabled" />
                    <span>Enable sound environment in the header</span>
                </label>
                <label class="studio-field">
                    <span>Category label (header line: “{label} &amp; Artist Voices”)</span>
                    <input type="text" id="studio-sound-category" class="studio-input" maxlength="200" placeholder="e.g. Nature" />
                </label>
                <label class="studio-field">
                    <span>Atmosphere audio URL</span>
                    <input type="text" id="studio-sound-atmo-url" class="studio-input" placeholder="https://…" />
                </label>
                <label class="studio-file-label studio-btn-ghost">
                    <input type="file" id="studio-sound-atmo-file" accept="audio/*" class="studio-file-input" />
                    Upload atmosphere
                </label>
                <label class="studio-field">
                    <span>Voice selection</span>
                    <select id="studio-sound-voice-mode" class="studio-select">
                        <option value="random">Random (artists with audio)</option>
                        <option value="manual">Manual artist or file</option>
                    </select>
                </label>
                <label class="studio-field" id="studio-sound-artist-wrap">
                    <span>Artist (with audio)</span>
                    <select id="studio-sound-artist" class="studio-select"></select>
                </label>
                <label class="studio-field">
                    <span>Manual voice URL (optional; overrides artist when mode is manual)</span>
                    <input type="text" id="studio-sound-manual-voice-url" class="studio-input" placeholder="https://…" />
                </label>
                <label class="studio-file-label studio-btn-ghost">
                    <input type="file" id="studio-sound-voice-file" accept="audio/*" class="studio-file-input" />
                    Upload voice clip
                </label>
                <div class="studio-modal-fields-row">
                    <label class="studio-field">
                        <span>Min interval (sec)</span>
                        <input type="number" id="studio-sound-min-int" class="studio-input" min="0" step="1" />
                    </label>
                    <label class="studio-field">
                        <span>Max interval (sec)</span>
                        <input type="number" id="studio-sound-max-int" class="studio-input" min="0" step="1" />
                    </label>
                </div>
                <div class="studio-modal-fields-row">
                    <label class="studio-field">
                        <span>Default atmosphere %</span>
                        <input type="number" id="studio-sound-vol-atmo" class="studio-input" min="0" max="100" step="1" />
                    </label>
                    <label class="studio-field">
                        <span>Default voices %</span>
                        <input type="number" id="studio-sound-vol-voice" class="studio-input" min="0" max="100" step="1" />
                    </label>
                </div>
                <label class="studio-field">
                    <span>Learn more — journal entry (internal id)</span>
                    <select id="studio-sound-learn-journal" class="studio-select"></select>
                </label>
                <div class="studio-toolbar-actions" style="margin-top:0.5rem">
                    <button type="submit" class="studio-btn-primary" id="studio-sound-save">Save</button>
                </div>
            </form>
            <p id="studio-sound-msg" class="studio-banner" style="display:none;margin-top:8px" role="status"></p>
        </div>
    `}function Zm(){return Mp()}function tf(){return`
        <div class="studio-section-stack studio-category-page studio-assistance-page">
            <header class="studio-assistance-header">
                <div class="studio-assistance-header__crumbs">Studio <span>›</span> Assistance</div>
                <div class="studio-assistance-header__row">
                    <div>
                        <h2 class="studio-assistance-header__title">Assistance</h2>
                        <p class="studio-assistance-header__subtitle">Internal tools for writing, translation, and refinement across the platform.</p>
                    </div>
                    <button type="button" class="studio-btn-ghost studio-assistance-guide-btn">Usage guide</button>
                </div>
            </header>
            <div class="studio-assistance-layout">
                <section class="studio-assistance-main">
                    <div class="studio-assistance-grid">
                        <div class="studio-assistance-card studio-assistance-tabs-card">
                            <div class="studio-tabs studio-assistance-tabs" id="studio-assist-tabs">
                                <div class="studio-tabs__list" role="tablist" aria-label="Assistance actions">
                                    <button type="button" class="studio-tabs__tab is-active" role="tab" id="studio-assist-tab-refine" aria-selected="true" aria-controls="studio-assist-panel-refine"><span class="studio-assistance-tab-icon" aria-hidden="true">✧</span>Refine</button>
                                    <button type="button" class="studio-tabs__tab" role="tab" id="studio-assist-tab-generate" aria-selected="false" aria-controls="studio-assist-panel-generate"><span class="studio-assistance-tab-icon" aria-hidden="true">✎</span>Generate</button>
                                    <button type="button" class="studio-tabs__tab" role="tab" id="studio-assist-tab-translate" aria-selected="false" aria-controls="studio-assist-panel-translate"><span class="studio-assistance-tab-icon" aria-hidden="true">◌</span>Translate</button>
                                </div>
                            </div>
                        </div>
                        <div class="studio-assistance-col">
                            <section class="studio-assistance-card">
                                <div class="studio-section-title-row">
                                    <h2>1. Input</h2>
                                    <button type="button" class="studio-btn-ghost" id="studio-assist-clear">Clear</button>
                                </div>
                                <p class="studio-muted">Paste or type the content you want to refine.</p>
                                <textarea id="studio-assist-input" class="studio-textarea studio-assist-textarea" rows="12" placeholder="Paste artist bio, email draft, program copy, or notes…"></textarea>
                                <div class="studio-tabs__panels studio-assistance-panels">
                                        <section id="studio-assist-panel-refine" class="studio-tabs__panel is-active" role="tabpanel" aria-labelledby="studio-assist-tab-refine">
                                            <h3 class="studio-assistance-panel-title">2. Refinement options</h3>
                                            <p class="studio-muted">Adjust tone and length to match your needs.</p>
                                            <div class="studio-assist-two-fields">
                                                <label class="studio-field">
                                                    <span>Tone</span>
                                                    <select id="studio-assist-tone" class="studio-select">
                                                        <option value="Neutral">Neutral</option>
                                                        <option value="Elevated" selected>Elevated</option>
                                                        <option value="Direct">Direct</option>
                                                    </select>
                                                </label>
                                                <label class="studio-field">
                                                    <span>Length</span>
                                                    <select id="studio-assist-length" class="studio-select">
                                                        <option value="Shorten">Shorten</option>
                                                        <option value="Keep" selected>Keep</option>
                                                        <option value="Expand">Expand</option>
                                                    </select>
                                                </label>
                                            </div>
                                            <button type="button" class="studio-btn-primary" id="studio-assist-run-refine">Refine Text</button>
                                        </section>
                                        <section id="studio-assist-panel-generate" class="studio-tabs__panel" role="tabpanel" aria-labelledby="studio-assist-tab-generate" hidden>
                                            <h3 class="studio-assistance-panel-title">2. Compose from prompt</h3>
                                            <p class="studio-muted">Create new content from a prompt.</p>
                                            <label class="studio-field">
                                                <span>What do you want to create?</span>
                                                <textarea id="studio-assist-generate-prompt" class="studio-textarea" rows="4" placeholder="Describe what to generate and any constraints."></textarea>
                                            </label>
                                            <div class="studio-assistance-presets" role="group" aria-label="Quick presets">
                                                <button type="button" class="studio-btn-ghost studio-assist-preset" data-preset="Artist bio">Artist bio</button>
                                                <button type="button" class="studio-btn-ghost studio-assist-preset" data-preset="Residency description">Residency description</button>
                                                <button type="button" class="studio-btn-ghost studio-assist-preset" data-preset="Email outreach">Email outreach</button>
                                                <button type="button" class="studio-btn-ghost studio-assist-preset" data-preset="Instagram caption">Instagram caption</button>
                                            </div>
                                            <button type="button" class="studio-btn-primary" id="studio-assist-run-generate">Generate</button>
                                        </section>
                                        <section id="studio-assist-panel-translate" class="studio-tabs__panel" role="tabpanel" aria-labelledby="studio-assist-tab-translate" hidden>
                                            <h3 class="studio-assistance-panel-title">2. Translation options</h3>
                                            <p class="studio-muted">Translate and localize content.</p>
                                            <div class="studio-assist-two-fields">
                                                <label class="studio-field">
                                                    <span>From</span>
                                                    <input type="text" class="studio-input" value="Auto-detect" readonly />
                                                </label>
                                                <label class="studio-field">
                                                    <span>To</span>
                                                    <input type="text" class="studio-input" value="Japanese (日本語)" readonly />
                                                </label>
                                            </div>
                                            <fieldset class="studio-assist-translate-style">
                                                <legend class="studio-sr-only">Translation style</legend>
                                                <label><input type="radio" name="studio-assist-translate-style" value="natural" checked /> Natural / localized</label>
                                                <label><input type="radio" name="studio-assist-translate-style" value="literal" /> Literal / direct</label>
                                            </fieldset>
                                            <button type="button" class="studio-btn-primary" id="studio-assist-run-translate">Translate to Japanese</button>
                                        </section>
                                </div>
                            </section>
                        </div>
                        <div class="studio-assistance-col">
                            <section class="studio-assistance-card">
                                <div class="studio-section-title-row">
                                    <h2>3. Output</h2>
                                    <div class="studio-toolbar-actions" style="margin:0">
                                        <button type="button" class="studio-btn-ghost" id="studio-assist-copy-inline">Copy</button>
                                        <button type="button" class="studio-btn-ghost" id="studio-assist-replace-inline">Replace input</button>
                                    </div>
                                </div>
                                <p class="studio-muted">Refined content ready to use.</p>
                                <textarea id="studio-assist-output" class="studio-textarea studio-assist-textarea" rows="18" placeholder="Output appears here…" readonly></textarea>
                            </section>
                        </div>
                    </div>
                </section>
                <aside class="studio-assistance-sidebar">
                    <section class="studio-assistance-card">
                        <h3 class="studio-subheading">Assistant profile</h3>
                        <div class="studio-assistance-profile">
                            <strong>FUSION Assistant v1</strong>
                            <span class="studio-muted">Tone: Elevated / Editorial</span>
                            <span class="studio-muted">Language bias: EN → JP</span>
                        </div>
                    </section>
                    <section class="studio-assistance-card">
                        <h3 class="studio-subheading">Usage context</h3>
                        <p class="studio-muted">Help the assistant understand what you are working on.</p>
                        <label class="studio-field">
                            <span>Context</span>
                            <select id="studio-assist-context" class="studio-select">
                                <option value="Artist profile">Artist profile</option>
                                <option value="Residency program">Residency program</option>
                                <option value="Email">Email</option>
                                <option value="Internal notes">Internal notes</option>
                            </select>
                        </label>
                    </section>
                    <details class="studio-assistance-card studio-assistance-notes" open>
                        <summary class="studio-subheading">Internal context (not public)</summary>
                        <label class="studio-field studio-field--full">
                            <span class="studio-sr-only">Notes</span>
                            <textarea id="studio-assist-notes" class="studio-textarea" rows="5" placeholder="Use this to guide tone and constraints for this draft."></textarea>
                        </label>
                    </details>
                </aside>
            </div>
            <div class="studio-assistance-bottom-bar">
                <button type="button" class="studio-btn-ghost" id="studio-assist-copy-output">Copy output</button>
                <button type="button" class="studio-btn-ghost" id="studio-assist-apply">Apply to field</button>
                <button type="button" class="studio-btn-primary" id="studio-assist-save-draft">Save draft</button>
            </div>
            <p id="studio-assist-msg" class="studio-banner studio-banner--info" style="display:none"></p>
        </div>
    `}function ef(){return`
        <div class="studio-section-stack studio-category-page">
            ${de({title:"Users",subtitle:"On-chain accounts (roles and linkage) — not full artist bios",countId:"studio-users-header-count",countLabel:"in view"})}
            <p class="studio-muted">Internet Identity has <strong>no password</strong>. Use <strong>Manage</strong> on each row to update account status and manual membership exemption. Rich profile copy belongs in the future <strong>user profile</strong> dashboard.</p>
            <div id="studio-users-self" class="studio-users-self-card">Loading…</div>
            <div class="studio-filter-bar">
                <div class="studio-users-filters" style="margin:0;flex:1;display:flex;flex-wrap:wrap;gap:1rem;align-items:flex-end">
                <label class="studio-field"><span>Role</span>
                    <select id="studio-users-filter-role" class="studio-select">
                        <option value="">All</option>
                        <option value="artist">artist</option>
                        <option value="gallery">gallery</option>
                        <option value="curator">curator</option>
                        <option value="collector">collector</option>
                        <option value="staff">staff</option>
                        <option value="collaborator">collaborator</option>
                        <option value="admin">admin</option>
                    </select>
                </label>
                <label class="studio-field"><span>Status</span>
                    <select id="studio-users-filter-status" class="studio-select">
                        <option value="">All</option>
                        <option value="pending">pending</option>
                        <option value="active">active</option>
                        <option value="suspended">suspended</option>
                    </select>
                </label>
                <label class="studio-field"><span>Membership</span>
                    <select id="studio-users-filter-membership" class="studio-select">
                        <option value="">All</option>
                        <option value="exempt">Exempt (manual)</option>
                        <option value="trial_active">Trial active</option>
                        <option value="trial_expired">Trial expired</option>
                        <option value="active">Active (Stripe)</option>
                        <option value="trialing">Trialing</option>
                        <option value="past_due">Past due</option>
                        <option value="canceled">Canceled</option>
                        <option value="none">No subscription</option>
                    </select>
                </label>
                </div>
            </div>
            <div class="studio-toolbar-actions studio-users-sync-toolbar" style="margin:0.5rem 0 0.75rem;flex-wrap:wrap;gap:0.5rem;align-items:center">
                <h3 class="studio-subheading" style="margin:0;width:100%">All accounts</h3>
                <label class="studio-field">
                    <span>Trial role</span>
                    <select id="studio-users-trial-role" class="studio-select">
                        <option value="artist">artist</option>
                        <option value="gallery">gallery</option>
                        <option value="curator">curator</option>
                        <option value="collector">collector</option>
                    </select>
                </label>
                <button type="button" class="studio-btn-ghost" id="studio-users-generate-trial-code">
                    Generate access code
                </button>
                <button type="button" class="studio-btn-secondary" id="studio-users-view-access-codes">
                    View access codes
                </button>
                <button type="button" class="studio-btn-primary" id="studio-users-sync-all" aria-busy="false">
                    Sync subscriptions
                </button>
                <button type="button" class="studio-btn-secondary" id="studio-users-load-contacts" aria-busy="false">
                    Load contacts
                </button>
                <span id="studio-users-sync-msg" class="studio-muted" role="status"></span>
            </div>
            <div class="studio-table-wrap studio-table-wrap--sticky-head">
                <table class="studio-table studio-table--dense">
                    <thead><tr><th><span class="studio-sr-only">Health</span></th><th>Identity</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Membership</th><th>Trial</th><th>Renews</th><th>Linked artist</th><th>Org</th><th>Updated</th><th class="studio-td-actions">Actions</th></tr></thead>
                    <tbody id="studio-users-tbody"><tr><td colspan="13">Loading…</td></tr></tbody>
                </table>
            </div>
        </div>
    `}function sf(){return`
        <div class="studio-section-stack studio-services">
            <p class="studio-muted">Configure off-chain integrations (Payments, Resend, S3). Publishable keys and URLs can be stored here for dev; <strong>never</strong> ship live secret keys in a public build. Server secrets belong in <code>services/fusion-integration-api/.env</code>.</p>
            <p class="studio-banner studio-banner--info" id="studio-svc-msg" style="display:none"></p>
            <div class="studio-tabs" data-studio-tabs="services">
                <div class="studio-tabs__list" role="tablist" aria-label="Services sections">
                    <button type="button" class="studio-tabs__tab is-active" role="tab" id="studio-svc-tab-connect" aria-selected="true" aria-controls="studio-svc-panel-connect">Connection</button>
                    <button type="button" class="studio-tabs__tab" role="tab" id="studio-svc-tab-subscription" aria-selected="false" aria-controls="studio-svc-panel-subscription">Subscription</button>
                    <button type="button" class="studio-tabs__tab" role="tab" id="studio-svc-tab-stripe" aria-selected="false" aria-controls="studio-svc-panel-stripe">Payments</button>
                    <button type="button" class="studio-tabs__tab" role="tab" id="studio-svc-tab-resend" aria-selected="false" aria-controls="studio-svc-panel-resend">Resend</button>
                    <button type="button" class="studio-tabs__tab" role="tab" id="studio-svc-tab-s3" aria-selected="false" aria-controls="studio-svc-panel-s3">Amazon S3</button>
                </div>
                <div class="studio-tabs__panels">
                    <div id="studio-svc-panel-connect" class="studio-tabs__panel is-active" role="tabpanel" aria-labelledby="studio-svc-tab-connect">
                        <div class="studio-form-grid studio-services-grid studio-services-grid--panel">
                            <h3 class="studio-subheading studio-field--full">Integration API</h3>
                            <label class="studio-field studio-field--full">
                                <span>Base URL</span>
                                <input type="text" id="studio-svc-url" class="studio-input" placeholder="/integration or https://api.example.com" autocomplete="off" />
                            </label>
                            <label class="studio-field studio-field--full">
                                <span>API Bearer (optional)</span>
                                <input type="password" id="studio-svc-bearer" class="studio-input" placeholder="If INTEGRATION_API_KEY is set on server" autocomplete="off" />
                            </label>
                            <div class="studio-field studio-field--full studio-services-actions">
                                <button type="button" class="studio-btn-primary" id="studio-svc-save">Save</button>
                                <button type="button" class="studio-btn-ghost" id="studio-svc-health">Test connection</button>
                            </div>
                        </div>
                    </div>
                    <div id="studio-svc-panel-subscription" class="studio-tabs__panel" role="tabpanel" aria-labelledby="studio-svc-tab-subscription" hidden>
                        <div class="studio-form-grid studio-services-grid studio-services-grid--panel">
                            <h3 class="studio-subheading studio-field--full">Application form — global “what’s included”</h3>
                            <p class="studio-muted studio-field--full">Stored in the canister as site setting <code>applicationPaymentGlobal</code> (admin write). Shown on every program application form, merged with per-program bullets under Programs → Payment option details.</p>
                            <label class="studio-field studio-field--full">
                                <span>English bullets (one per line)</span>
                                <textarea id="studio-svc-subscription-en" class="studio-input studio-textarea" rows="10" spellcheck="true" autocomplete="off"></textarea>
                            </label>
                            <label class="studio-field studio-field--full">
                                <span>日本語 bullets (1行に1つ)</span>
                                <textarea id="studio-svc-subscription-ja" class="studio-input studio-textarea" rows="10" spellcheck="true" autocomplete="off"></textarea>
                            </label>
                            <div class="studio-field studio-field--full studio-services-actions">
                                <button type="button" class="studio-btn-primary" id="studio-svc-subscription-save">Save</button>
                            </div>
                        </div>
                    </div>
                    <div id="studio-svc-panel-stripe" class="studio-tabs__panel" role="tabpanel" aria-labelledby="studio-svc-tab-stripe" hidden>
                        <div class="studio-pay">
                            <div class="studio-pay-topbar">
                                <div class="studio-pay-topbar__intro">
                                    <h3 class="studio-pay-topbar__title">Payments</h3>
                                    <p class="studio-muted">Choose the <strong>active provider</strong> for all new checkouts (memberships, application fees, program payments). Use <strong>Environment</strong> to switch Test/Sandbox vs Live keys for the selected provider.</p>
                                </div>
                                <div class="studio-pay-controls">
                                    <div class="studio-pay-env" role="group" aria-label="Active payment provider">
                                        <span class="studio-pay-env__label">Provider</span>
                                        <div class="studio-pay-segmented">
                                            <input type="radio" name="studio-svc-payment-provider" value="paypal" id="studio-svc-provider-paypal" class="studio-pay-segmented__input" checked />
                                            <label for="studio-svc-provider-paypal" class="studio-pay-segmented__btn">PayPal</label>
                                            <input type="radio" name="studio-svc-payment-provider" value="stripe" id="studio-svc-provider-stripe" class="studio-pay-segmented__input" />
                                            <label for="studio-svc-provider-stripe" class="studio-pay-segmented__btn">Stripe</label>
                                        </div>
                                        <span class="studio-pay-env__pill" data-studio-pay-provider-label>PayPal</span>
                                    </div>
                                    <div class="studio-pay-env" role="group" aria-label="Payment environment">
                                        <span class="studio-pay-env__label">Environment</span>
                                        <div class="studio-pay-segmented">
                                            <input type="radio" name="studio-svc-stripe-mode" value="test" id="studio-svc-mode-test" class="studio-pay-segmented__input" checked />
                                            <label for="studio-svc-mode-test" class="studio-pay-segmented__btn">Test / Sandbox</label>
                                            <input type="radio" name="studio-svc-stripe-mode" value="live" id="studio-svc-mode-live" class="studio-pay-segmented__input" />
                                            <label for="studio-svc-mode-live" class="studio-pay-segmented__btn">Live</label>
                                        </div>
                                        <span class="studio-pay-env__pill" data-studio-pay-env-label>Test / Sandbox</span>
                                    </div>
                                </div>
                            </div>

                            <div class="studio-pay-providers">
                                <section class="studio-pay-card studio-pay-card--active" id="studio-svc-paypal-card" data-studio-pay-card="paypal">
                                    <header class="studio-pay-card__head">
                                        <div class="studio-pay-card__ident">
                                            <span class="studio-pay-logo studio-pay-logo--paypal">PayPal</span>
                                            <span class="studio-pay-badge studio-pay-badge--active" data-studio-pay-provider-badge="paypal">Active · new checkouts</span>
                                        </div>
                                        <span class="studio-pay-status" id="studio-svc-paypal-status">—</span>
                                    </header>
                                    <p class="studio-muted studio-pay-card__desc">Embedded PayPal buttons for memberships and application fees. Set the browser <strong>client ID</strong> here; keep the secret on the integration server (<code>PAYPAL_CLIENT_SECRET</code>).</p>
                                    <label class="studio-field">
                                        <span>Client ID — Sandbox</span>
                                        <input type="text" id="studio-svc-paypal-test" class="studio-input" placeholder="AY… (sandbox)" autocomplete="off" />
                                    </label>
                                    <label class="studio-field">
                                        <span>Client ID — Live</span>
                                        <input type="text" id="studio-svc-paypal-live" class="studio-input" placeholder="AY… (live)" autocomplete="off" />
                                    </label>
                                    <p class="studio-pay-resolved">Resolved for <span data-studio-pay-env-label>Test / Sandbox</span>: <code id="studio-svc-paypal-resolved">—</code></p>
                                    <div class="studio-pay-card__actions">
                                        <button type="button" class="studio-btn-ghost" id="studio-svc-help-paypal">How to set up PayPal</button>
                                    </div>
                                </section>

                                <section class="studio-pay-card studio-pay-card--legacy" id="studio-svc-stripe-card" data-studio-pay-card="stripe">
                                    <header class="studio-pay-card__head">
                                        <div class="studio-pay-card__ident">
                                            <span class="studio-pay-logo studio-pay-logo--stripe">Stripe</span>
                                            <span class="studio-pay-badge studio-pay-badge--legacy" data-studio-pay-provider-badge="stripe">Legacy · existing subs</span>
                                        </div>
                                        <span class="studio-pay-status" id="studio-svc-stripe-status">—</span>
                                    </header>
                                    <p class="studio-muted studio-pay-card__desc">When selected as the active provider, new checkouts use embedded Stripe Elements. Existing Stripe subscriptions still sync, cancel, and appear in Finance.</p>
                                    <label class="studio-field">
                                        <span>Publishable key — Test <code>pk_test_…</code></span>
                                        <input type="text" id="studio-svc-pk-test" class="studio-input" placeholder="pk_test_…" autocomplete="off" />
                                    </label>
                                    <label class="studio-field">
                                        <span>Secret key — Test <code>sk_test_…</code> <em>(server only, never saved)</em></span>
                                        <input type="password" id="studio-svc-sk-test" class="studio-input" placeholder="Paste to build .env; cleared on reload" autocomplete="off" />
                                    </label>
                                    <details class="studio-pay-details" id="studio-svc-live-details">
                                        <summary>Live keys (production)</summary>
                                        <div class="studio-pay-details__body">
                                            <label class="studio-field">
                                                <span>Publishable key — Live <code>pk_live_…</code></span>
                                                <input type="text" id="studio-svc-pk-live" class="studio-input" placeholder="pk_live_…" autocomplete="off" />
                                            </label>
                                            <label class="studio-field">
                                                <span>Secret key — Live <code>sk_live_…</code> <em>(server only, never saved)</em></span>
                                                <input type="password" id="studio-svc-sk-live" class="studio-input" placeholder="Never commit" autocomplete="off" />
                                            </label>
                                        </div>
                                    </details>
                                    <p class="studio-pay-resolved">Resolved for <span data-studio-pay-env-label>Test / Sandbox</span>: <code id="studio-svc-pk-resolved">—</code></p>
                                    <div class="studio-pay-card__actions">
                                        <button type="button" class="studio-btn-ghost" id="studio-svc-help-stripe">How to set up Stripe</button>
                                        <button type="button" class="studio-btn-ghost" id="studio-svc-copy-env">Copy .env snippet</button>
                                    </div>
                                </section>
                            </div>

                            <details class="studio-pay-details studio-pay-devtools">
                                <summary>Developer tools — test Stripe PaymentIntent</summary>
                                <div class="studio-pay-details__body">
                                    <p class="studio-muted">Creates a one-off PaymentIntent via <code>POST /stripe/create-payment-intent</code> (min 50 in smallest units). Test card <code>4242 4242 4242 4242</code>.</p>
                                    <div class="studio-pay-devtools__row">
                                        <label class="studio-field">
                                            <span>Amount</span>
                                            <input type="number" id="studio-svc-pi-amount" class="studio-input" min="0.5" step="0.01" value="1.00" />
                                        </label>
                                        <label class="studio-field">
                                            <span>Currency</span>
                                            <select id="studio-svc-pi-currency" class="studio-input">
                                                <option value="usd" selected>usd</option>
                                                <option value="eur">eur</option>
                                                <option value="gbp">gbp</option>
                                                <option value="jpy">jpy</option>
                                            </select>
                                        </label>
                                    </div>
                                    <div class="studio-pay-card__actions">
                                        <button type="button" class="studio-btn-primary" id="studio-svc-pi-create">Create test PaymentIntent</button>
                                        <button type="button" class="studio-btn-ghost" id="studio-svc-pi-copy" disabled>Copy client secret</button>
                                    </div>
                                    <label class="studio-field studio-field--full">
                                        <span>Client secret</span>
                                        <textarea id="studio-svc-pi-secret" class="studio-input studio-textarea-mono" rows="3" readonly placeholder="Create a PaymentIntent to see the secret"></textarea>
                                    </label>
                                </div>
                            </details>

                            <div class="studio-pay-savebar">
                                <span class="studio-muted studio-pay-savebar__hint">Client IDs, publishable keys, and the environment save to this browser. Secret keys are only used to build the <code>.env</code> snippet.</span>
                                <button type="button" class="studio-btn-primary" id="studio-svc-save-payments">Save payment settings</button>
                            </div>
                        </div>
                    </div>
                    <div id="studio-svc-panel-resend" class="studio-tabs__panel" role="tabpanel" aria-labelledby="studio-svc-tab-resend" hidden>
                        <div class="studio-form-grid studio-services-grid studio-services-grid--panel">
                            <h3 class="studio-subheading studio-field--full">Resend</h3>
                            <p class="studio-muted studio-field--full">The Resend API key stays on the integration server (<code>RESEND_API_KEY</code>). Use this to send a test email through your API.</p>
                            <label class="studio-field studio-field--full">
                                <span>Test recipient email</span>
                                <input type="email" id="studio-svc-resend-to" class="studio-input" placeholder="you@example.com" />
                            </label>
                            <label class="studio-field studio-field--full">
                                <span>From (optional)</span>
                                <input type="text" id="studio-svc-resend-from" class="studio-input" placeholder='Fusion &lt;onboarding@resend.dev&gt; — must be allowed in Resend' autocomplete="off" />
                            </label>
                            <h4 class="studio-subheading studio-field--full" style="margin-top:0.5rem">Audience segments (canister)</h4>
                            <p class="studio-muted studio-field--full">Up to five Resend audience segment UUIDs with display names. Used in Email → broadcast segment picker and Subscribers “Audiences”. Saved on-chain (Services edit permission).</p>
                            <label class="studio-field"><span>Segment 1 name</span><input type="text" id="studio-svc-seg-name-1" class="studio-input" placeholder="e.g. Members" /></label>
                            <label class="studio-field"><span>Segment 1 id</span><input type="text" id="studio-svc-seg-id-1" class="studio-input" placeholder="UUID" autocomplete="off" /></label>
                            <label class="studio-field"><span>Segment 2 name</span><input type="text" id="studio-svc-seg-name-2" class="studio-input" /></label>
                            <label class="studio-field"><span>Segment 2 id</span><input type="text" id="studio-svc-seg-id-2" class="studio-input" autocomplete="off" /></label>
                            <label class="studio-field"><span>Segment 3 name</span><input type="text" id="studio-svc-seg-name-3" class="studio-input" /></label>
                            <label class="studio-field"><span>Segment 3 id</span><input type="text" id="studio-svc-seg-id-3" class="studio-input" autocomplete="off" /></label>
                            <label class="studio-field"><span>Segment 4 name</span><input type="text" id="studio-svc-seg-name-4" class="studio-input" /></label>
                            <label class="studio-field"><span>Segment 4 id</span><input type="text" id="studio-svc-seg-id-4" class="studio-input" autocomplete="off" /></label>
                            <label class="studio-field"><span>Segment 5 name</span><input type="text" id="studio-svc-seg-name-5" class="studio-input" /></label>
                            <label class="studio-field"><span>Segment 5 id</span><input type="text" id="studio-svc-seg-id-5" class="studio-input" autocomplete="off" /></label>
                            <div class="studio-field studio-field--full studio-services-actions">
                                <button type="button" class="studio-btn-primary" id="studio-svc-resend-segments-save">Save segments to canister</button>
                            </div>
                            <h4 class="studio-subheading studio-field--full" style="margin-top:0.5rem">New Applicant Notification</h4>
                            <p class="studio-muted studio-field--full">When someone submits a program application, staff receive an email with the subject <strong>New Fusion &lt;program name&gt; Applicant</strong> (name, website, link to Studio → Applicants). <code>info@fusionart.world</code> always receives these; add more addresses below (comma-separated).</p>
                            <div class="studio-field studio-field--full studio-svc-app-notify-row">
                                <label class="studio-svc-app-notify-row__input">
                                    <span>Additional staff emails</span>
                                    <input type="text" id="studio-svc-application-admin-emails" class="studio-input" placeholder="ops@example.com, hiring@example.com" autocomplete="off" />
                                </label>
                                <div class="studio-svc-app-notify-row__test">
                                    <span class="studio-sr-only">Send a test new-applicant email</span>
                                    <button type="button" class="studio-btn-ghost" id="studio-svc-new-applicant-notify-test">Send Test</button>
                                </div>
                            </div>
                            <div class="studio-field studio-field--full studio-services-actions">
                                <button type="button" class="studio-btn-ghost" id="studio-svc-help-resend">How to set up Resend</button>
                                <button type="button" class="studio-btn-primary" id="studio-svc-send-test">Send test email</button>
                            </div>
                        </div>
                    </div>
                    <div id="studio-svc-panel-s3" class="studio-tabs__panel" role="tabpanel" aria-labelledby="studio-svc-tab-s3" hidden>
                        <div class="studio-form-grid studio-services-grid studio-services-grid--panel">
                            <h3 class="studio-subheading studio-field--full">Amazon S3</h3>
                            <p class="studio-muted studio-field--full">IAM credentials stay on the server. These fields are notes for your <code>.env</code> and copy snippet.</p>
                            <label class="studio-field"><span>Region</span>
                                <input type="text" id="studio-svc-s3-region" class="studio-input" placeholder="us-east-1" />
                            </label>
                            <label class="studio-field"><span>Bucket</span>
                                <input type="text" id="studio-svc-s3-bucket" class="studio-input" placeholder="my-bucket" />
                            </label>
                            <label class="studio-field studio-field--full"><span>Public base URL</span>
                                <input type="text" id="studio-svc-s3-public" class="studio-input" placeholder="https://… or CloudFront" />
                            </label>
                            <div class="studio-field studio-field--full studio-services-actions">
                                <button type="button" class="studio-btn-ghost" id="studio-svc-help-s3">How to set up S3</button>
                            </div>
                            <h4 class="studio-subheading studio-field--full studio-services-test-heading">Test upload</h4>
                            <p class="studio-muted studio-field--full">Presigns via <code>POST /storage/presign</code> then uploads with <code>PUT</code>. Bucket CORS must allow your Studio origin.</p>
                            <div class="studio-field studio-field--full studio-services-file-row">
                                <input type="file" id="studio-svc-s3-file" class="studio-input-file" />
                                <button type="button" class="studio-btn-primary" id="studio-svc-s3-upload">Upload test file</button>
                            </div>
                            <p class="studio-field--full studio-muted" id="studio-svc-s3-status" style="display:none"></p>
                            <label class="studio-field studio-field--full">
                                <span>Public URL</span>
                                <input type="text" id="studio-svc-s3-result-url" class="studio-input" readonly placeholder="—" />
                            </label>
                            <div class="studio-field studio-field--full studio-services-actions">
                                <button type="button" class="studio-btn-ghost" id="studio-svc-s3-copy-url" disabled>Copy URL</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `}function of(){return`
        <div class="studio-section-stack studio-category-page studio-settings-page">
            <section class="studio-settings-card">
            <dl class="studio-dl studio-settings-dl">
                <dt>Data source (<code>database.js</code>)</dt>
                <dd id="studio-set-datasource">—</dd>
                <dt>Network (<code>config.devMode</code>)</dt>
                <dd id="studio-set-network">—</dd>
            </dl>
            <div class="studio-field-row studio-settings-source-row">
                <label class="studio-field studio-field--inline">
                    <input type="radio" name="studio-datasource" value="test" id="studio-ds-test" />
                    Use test data (localStorage overlays)
                </label>
                <label class="studio-field studio-field--inline">
                    <input type="radio" name="studio-datasource" value="live" id="studio-ds-live" />
                    Live canister
                </label>
            </div>
            <p class="studio-muted">Same as the loadscreen Debug control. Internet Identity has no site password — recovery uses II docs.</p>
            </section>
            <section id="studio-platform-banner-tools" class="studio-settings-card" hidden>
                <h3 class="studio-subheading">Platform update banner</h3>
                <p class="studio-muted studio-field--full">
                    Shows a small notice beneath the site header on <strong>public pages only</strong> (hidden on <code>/studio</code>).
                    Stored in the canister as site setting <code>platformUpdateBanner</code> (admin write on live).
                </p>
                <label class="studio-field studio-field--inline studio-field--full">
                    <input type="checkbox" id="studio-platform-banner-enabled" />
                    Show platform update banner
                </label>
                <label class="studio-field studio-field--full">
                    <span>Message (English)</span>
                    <textarea id="studio-platform-banner-en" class="studio-textarea" rows="2" maxlength="512"></textarea>
                </label>
                <label class="studio-field studio-field--full">
                    <span>Message (Japanese)</span>
                    <textarea id="studio-platform-banner-ja" class="studio-textarea" rows="2" maxlength="512"></textarea>
                </label>
                <div class="studio-field-row">
                    <button type="button" class="studio-btn-primary" id="studio-platform-banner-save">Save banner settings</button>
                </div>
                <p id="studio-platform-banner-status" class="studio-muted" role="status" aria-live="polite"></p>
            </section>
            <div id="studio-db-admin-tools" class="studio-db-admin-tools" hidden>
                <h3 class="studio-subheading">Admin — full database backup</h3>
                <p class="studio-muted">
                    Download or restore the entire Fusion backend state (subscribers, accounts, artists, programs, settings, etc.).
                    Restore is destructive and replaces the live canister data in one update.
                </p>
                <p class="studio-muted studio-db-admin-tools__warn">
                    <strong>Warning:</strong> Keep backups safe. A bad restore can lock you out if the JSON does not include your admin principal.
                    Internet Computer ingress limits apply — very large datasets may fail; use a dedicated migration if needed.
                </p>
                <div class="studio-field-row studio-db-admin-tools__actions">
                    <button type="button" class="studio-btn-primary" id="studio-db-download">Download full database (JSON)</button>
                    <input type="file" id="studio-db-restore-file" accept="application/json,.json" class="studio-file-input-hidden" aria-label="Choose backup JSON file" />
                    <button type="button" class="studio-btn-ghost" id="studio-db-restore-pick">Choose backup file…</button>
                    <button type="button" class="studio-btn-ghost" id="studio-db-restore-run" disabled>Restore from file</button>
                </div>
                <p id="studio-db-admin-status" class="studio-muted" role="status" aria-live="polite"></p>
            </div>
        </div>
    `}function Mi(e){const i={galleries:"Gallery",collectors:"Collector",curators:"Curator"}[e]||e;return`
        <div class="studio-section-stack">
            <p class="studio-muted">Subscribers with <strong>${U(i)}</strong> in category (test or live), plus user accounts with role <code>#${U(e.replace(/s$/,""))}</code> when live.</p>
            <div class="studio-toolbar-actions" style="margin:0 0 0.75rem;flex-wrap:wrap;gap:0.5rem">
                <button type="button" class="studio-btn-secondary" id="studio-audience-gen-${e}">Generate ${U(i)} join invite</button>
            </div>
            <h3 class="studio-subheading">Subscribers</h3>
            <div class="studio-table-wrap">
                <table class="studio-table">
                    <thead><tr><th>Email</th><th>Category</th><th>Name</th><th>Intent</th></tr></thead>
                    <tbody id="studio-audience-subs-${e}"><tr><td colspan="4">Loading…</td></tr></tbody>
                </table>
            </div>
            <h3 class="studio-subheading">Accounts</h3>
            <div class="studio-table-wrap">
                <table class="studio-table">
                    <thead><tr><th>Principal</th><th>Role</th><th>Status</th></tr></thead>
                    <tbody id="studio-audience-acc-${e}"><tr><td colspan="3">Loading…</td></tr></tbody>
                </table>
            </div>
        </div>
    `}function nf(e){return`
        <div class="studio-coming-soon">
            <strong>${U(Fr[e]||e)}</strong>
            Unknown section.
        </div>
    `}function Ta(e,s,i=""){return(i?Jt(i):{visible:!0,canEdit:!0}).visible?`
        <div class="studio-section-stack studio-category-page">
            ${de({title:e,subtitle:"Management workspace"})}
            <p class="studio-muted">${U(s)}</p>
            <div class="studio-coming-soon">
                <strong>${U(e)}</strong>
                Placeholder section. We will complete this workflow later.
            </div>
        </div>
    `:`
        <div class="studio-section-stack studio-category-page">
            ${de({title:e,subtitle:"Management workspace"})}
            <p class="studio-banner studio-banner--warn">You do not have access to this section.</p>
        </div>
    `}function js(e){return`
        <div class="studio-pipeline-card">
            <h3>${U(e)}</h3>
            <div class="studio-sparkline" aria-hidden="true"></div>
        </div>
    `}function U(e){return String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function wo(e){const s=Ts(e);return`<span class="studio-roster-vis ${s==="public"?"studio-roster-vis--public":s==="pending"?"studio-roster-vis--pending":s==="private"?"studio-roster-vis--private":"studio-roster-vis--inactive"}">${U(s)}</span>`}function Br(e,s,i,o=null){const n=String(e.slug||"");i.hidden=!1,i.innerHTML='<div class="studio-artist-manage-loading"><p class="studio-muted">Loading artist…</p></div>',o&&(o.hidden=!0);const a=()=>{i.innerHTML="",i.hidden=!0,o&&(o.hidden=!1)};(async()=>{var g,f,v,E,j,M,S,h,T,N,O,G,V,at,tt,z;let r=null;try{r=await Yd(n,e)}catch(F){alert(F instanceof Error?F.message:String(F)),a();return}if(!r){alert("Could not load artist."),a();return}const l=`/profile/${encodeURIComponent(String(r.slug||""))}`,d=String(((f=(g=r.locales)==null?void 0:g.en)==null?void 0:f.status)||r.status||"Artist"),p=String(r.slug||r.id||"").trim(),u=le(r.createdAt||r.joinedAt),c=Ts(r.visibility),m=c==="public"?"is-public":c==="pending"?"is-pending":c==="private"?"is-private":"is-inactive";i.innerHTML=`
            <div class="studio-artist-manage-shell" data-studio-artist-manage>
                <div class="studio-artist-manage-top">
                    <div class="studio-artist-manage-crumb">Studio / Artists</div>
                    <div class="studio-artist-manage-top-actions">
                        <button type="button" class="studio-btn-ghost" id="studio-art-more-actions">More actions</button>
                        <button type="button" class="studio-btn-ghost" id="studio-art-exit-manage" aria-label="Exit manage">✕</button>
                    </div>
                </div>
                <h2 class="studio-artist-manage-title">Manage Artist</h2>
                <section class="studio-artist-identity-bar">
                    <div class="studio-artist-identity-main">
                        <div class="studio-artist-identity-avatar">${U(String(((E=(v=r.locales)==null?void 0:v.en)==null?void 0:E.name)||r.slug||"A").slice(0,2).toUpperCase())}</div>
                        <div class="studio-artist-identity-meta">
                            <div class="studio-artist-identity-name">${U(String(((M=(j=r.locales)==null?void 0:j.en)==null?void 0:M.name)||r.slug||r.id||"Artist"))} <span class="studio-artist-identity-slug">${U(p)}</span></div>
                            <div class="studio-artist-identity-subline">
                                <span>${U(d)}</span>
                                <span class="studio-artist-status-pill ${m}">${U(c)}</span>
                                <span>Joined ${U(u)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="studio-artist-identity-side">
                        <div class="studio-artist-identity-kv">
                            <span>Profile</span>
                            <a class="studio-action-link" href="${U(l)}" target="_blank" rel="noopener">Open profile ↗</a>
                        </div>
                        <div class="studio-artist-identity-kv">
                            <span>Visibility</span>
                            <strong>${U(c)}</strong>
                        </div>
                    </div>
                </section>
                <div class="studio-artist-manage-content">
                    <div class="studio-artist-manage-main">
                        ${Qd(U,r,{isTest:Ct()==="test"})}
                    </div>
                    <aside class="studio-artist-context-panel">
                        <section class="studio-artist-context-card">
                            <h3>Artist Overview</h3>
                            <div class="studio-artist-kv"><span>Total programs</span><strong>${U(String((r.appliedPrograms||[]).length||0))}</strong></div>
                            <div class="studio-artist-kv"><span>Exclusive content</span><strong>${U(String((((h=(S=r.locales)==null?void 0:S.en)==null?void 0:h.links)||[]).length||0))}</strong></div>
                            <div class="studio-artist-kv"><span>Discussions</span><strong>—</strong></div>
                            <div class="studio-artist-kv"><span>Followers</span><strong>—</strong></div>
                            <div class="studio-artist-kv"><span>Last active</span><strong>${U(le(r.updatedAt))}</strong></div>
                        </section>
                        <section class="studio-artist-context-card">
                            <h3>Quick Links</h3>
                            <a class="studio-action-link" href="${U(l)}" target="_blank" rel="noopener">View public profile</a>
                            <a class="studio-action-link" href="/artists" target="_blank" rel="noopener">View artist content</a>
                            <a class="studio-action-link" href="mailto:${U(String(r.contactEmail||""))}">Send email</a>
                            <button type="button" class="studio-action-link studio-action-link--btn" disabled title="Impersonation is unavailable in this build">Impersonate</button>
                        </section>
                        <section class="studio-artist-context-card">
                            <h3>System Info</h3>
                            <div class="studio-artist-kv"><span>Created</span><strong>${U(le(r.createdAt))}</strong></div>
                            <div class="studio-artist-kv"><span>Updated</span><strong>${U(le(r.updatedAt))}</strong></div>
                            <div class="studio-artist-kv"><span>Artist ID</span><strong>${U(String(r.id||"—"))}</strong></div>
                        </section>
                    </aside>
                </div>
            </div>
        `;const b=i,C=()=>{b.querySelectorAll("img[data-preview-input]").forEach(F=>{const I=F.getAttribute("data-preview-input");if(!I)return;const y=b.querySelector(I);if(!(y instanceof HTMLInputElement))return;const _=()=>{var H,R;const $=String(y.value||"").trim();if(!$){F.removeAttribute("src"),(H=F.closest(".studio-asset-thumb"))==null||H.classList.add("is-empty");return}F.setAttribute("src",$),(R=F.closest(".studio-asset-thumb"))==null||R.classList.remove("is-empty")};y.addEventListener("input",_),y.addEventListener("change",_),_()})};(T=b.querySelector("#studio-art-exit-manage"))==null||T.addEventListener("click",()=>a()),(N=b.querySelector("#studio-art-cancel"))==null||N.addEventListener("click",()=>a()),Xd(b),zc(b,r),C(),ds(b,r.locales&&typeof r.locales=="object"?r.locales:{}),b.addEventListener("click",F=>{var _,$;const I=($=(_=F.target)==null?void 0:_.closest)==null?void 0:$.call(_,"[data-studio-world-source]");if(!I||!b.contains(I))return;F.preventDefault();const y=I.getAttribute("data-studio-world-source");if(!(y!=="world"&&y!=="newWorld"))try{const H=An(b,r),R=H.locales&&typeof H.locales=="object"?H.locales:{};ds(b,R,y)}catch{ds(b,{},y)}}),(O=b.querySelector("#studio-art-gen-access-code"))==null||O.addEventListener("click",async()=>{if(Ct()!=="live"){alert("Generate new code is available in Live data mode only.");return}const F=b.querySelector("#studio-art-access-code");try{const I=await ke(),y=kn(Array.isArray(I)?I:[]),_=Zd(y);F instanceof HTMLInputElement&&(F.value=_)}catch(I){alert(I instanceof Error?I.message:String(I))}}),(G=b.querySelector("#studio-art-new-world-from-base"))==null||G.addEventListener("click",async()=>{if(Ct()!=="live"){alert("New World from base requires Live data source (IC LLM on the backend canister).");return}const F=b.querySelector("#studio-art-new-world-from-base"),I=An(b,r);if(!tc(I)){alert("Add bio, discipline, location, or quote on the Identity tab first, then try again.");return}F instanceof HTMLButtonElement&&(F.disabled=!0),Xe(b,!0,"Generating New World from Identity…");try{const y=await ec(I,"fillEmpty",re,xe);sc(b,y),ds(b,y);const _=b.querySelector("#studio-art-tab-new-world");_ instanceof HTMLButtonElement&&_.click(),alert("New World generated from Identity. Review World and New World tabs, then Save changes.")}catch(y){alert(y instanceof Error?y.message:String(y))}finally{Xe(b,!1),F instanceof HTMLButtonElement&&(F.disabled=!1)}}),(V=b.querySelector("#studio-art-translate-to-new-world"))==null||V.addEventListener("click",async()=>{if(Ct()!=="live"){alert("Translate to New World requires Live data source (IC LLM on the backend canister).");return}const F=b.querySelector("#studio-art-new-world-prompt"),I=F instanceof HTMLTextAreaElement?F.value.trim():"";b.querySelector("#studio-art-translate-to-new-world"),Xe(b,!0,"Generating New World…");try{if(await ic(b,{prompt:I,reinterpret:re,translateEnToJa:xe})===0){alert("No World copy to translate. Fill Story & World fields on the World tab, or use New World from base to generate from Identity.");return}ds(b,{en:{worldNew:{practice:"generated"}}},"newWorld");const _=b.querySelector("#studio-art-tab-new-world");_ instanceof HTMLButtonElement&&_.click(),alert("New World generated (Kamauu-style). Open the New World tab to review, then save the artist.")}catch(y){alert(y instanceof Error?y.message:String(y))}finally{Xe(b,!1)}});const w=b.querySelector("#studio-art-hero-file");w instanceof HTMLInputElement&&w.addEventListener("change",async F=>{var $;const I=F.target,y=I instanceof HTMLInputElement?($=I.files)==null?void 0:$[0]:null;if(!y)return;const _=b.querySelector("#studio-art-hero-image");try{const{file:H}=await gs(y);await Gt(H,_ instanceof HTMLInputElement?_:null,{area:"studio/artists",entityType:"artist",entityId:String(r.id||""),fieldKey:"hero"})}catch(H){alert(H instanceof Error?H.message:String(H))}I.value=""});const L=b.querySelector("#studio-art-hero-profile-file");L instanceof HTMLInputElement&&L.addEventListener("change",async F=>{var $;const I=F.target,y=I instanceof HTMLInputElement?($=I.files)==null?void 0:$[0]:null;if(!y)return;const _=b.querySelector("#studio-art-hero-profile-image");try{const{file:H}=await gs(y);await Gt(H,_ instanceof HTMLInputElement?_:null,{area:"studio/artists",entityType:"artist",entityId:String(r.id||""),fieldKey:"heroProfile"})}catch(H){alert(H instanceof Error?H.message:String(H))}I.value=""}),b.querySelectorAll("input.studio-art-intro-file").forEach(F=>{F.addEventListener("change",async I=>{var q;const y=I.target,_=y instanceof HTMLInputElement?(q=y.files)==null?void 0:q[0]:null;if(!_||!(y instanceof HTMLInputElement))return;const $=y.getAttribute("data-art-upload-locale")||"en",H=y.getAttribute("data-art-upload-slot")||"0",R=`world.introGallery.${H}.src`,x=b.querySelector(`input[data-art-locale="${$}"][data-art-path="${R}"]`);try{const{file:X}=await gs(_);await Gt(X,x instanceof HTMLInputElement?x:null,{area:"studio/artists",entityType:"artist",entityId:String(r.id||""),fieldKey:`${$}-intro-${H}`})}catch(X){alert(X instanceof Error?X.message:String(X))}y.value=""})});const A=b.querySelector("#studio-art-audio-file");A instanceof HTMLInputElement&&A.addEventListener("change",async F=>{var $;const I=F.target,y=I instanceof HTMLInputElement?($=I.files)==null?void 0:$[0]:null;if(!y)return;const _=b.querySelector("#studio-art-audio-url");try{await Gt(y,_ instanceof HTMLInputElement?_:null,{area:"studio/artists",entityType:"artist",entityId:String(r.id||""),fieldKey:"audio"})}catch(H){alert(`${H instanceof Error?H.message:String(H)}

Configure S3 presign under Studio → Services.`)}I.value=""}),(at=b.querySelector("#studio-art-manage-form"))==null||at.addEventListener("submit",async F=>{var I;F.preventDefault(),Xe(b,!0,"Saving artist…");try{const y=oc(b,r),_=y._featuredFlags;delete y._featuredFlags;try{y.featuredOrder=await nc(String(r.id),{featured:!!(_!=null&&_.featured),featurable:!!(_!=null&&_.featurable)}),await ac(String(r.id),!!y.heroProfileImageApproved)}catch(R){alert(R instanceof Error?R.message:String(R));return}const $=kn(await ke()),H=rc(y,$,{forceImported:!1});await lc([H]),await dc(String(r.id||((I=H.profile)==null?void 0:I.id)||""),{quote:String(y.quote??""),audioUrl:String(y.audioUrl??""),audioTitle:String(y.audioTitle??"")}),a(),await s()}catch(y){alert(y instanceof Error?y.message:String(y))}finally{Xe(b,!1)}}),(tt=b.querySelector("#studio-art-delete"))==null||tt.addEventListener("click",async()=>{const F=String(r.id??"").trim();if(!F)return;const I=String(r.slug??F);if(confirm(`Delete artist "${I}" permanently?

Linked member accounts will be unlinked and set to pending. This cannot be undone.`))try{await cc(F),a(),await s()}catch(y){alert(y instanceof Error?y.message:String(y))}}),(z=b.querySelector("#studio-art-adv-save"))==null||z.addEventListener("click",()=>{var I;const F=((I=b.querySelector("#studio-art-adv-json"))==null?void 0:I.value)??"";try{uc(String(r.id),F),a(),s()}catch(y){alert(y instanceof Error?y.message:String(y))}})})()}async function Eo(e,s){const i=[`Generated code: ${e}`],o=String(s||"").trim();o&&(i.push(""),i.push(o)),i.push(""),i.push("Single-use: deactivates after the first successful registration with Internet Identity.");const n=i.join(`
`);try{await navigator.clipboard.writeText(e),alert(`${n}

(Copied to clipboard.)`)}catch{alert(n)}}function af(e){if(!e||typeof e!="object")return!1;if(e.membershipExemptManual||As(e)==="active")return!0;const s=String(e.stripeSubscriptionStatus||"").toLowerCase();return s==="active"||s==="trialing"}function rf(e){const s=As(e);if(s==="none")return"—";const i=Number(e==null?void 0:e.trialStartedAtSec),o=Number(e==null?void 0:e.trialEndsAtSec),n=Number.isFinite(i)?le(i):"—",a=Number.isFinite(o)?le(o):"—";return s==="active"?`Trial active (${n} -> ${a})`:`Trial expired (${a})`}function lf(){return" On the host running fusion-integration-api, set FUSION_BACKEND_CANISTER_ID, INTEGRATION_IC_IDENTITY_PEM (or _JSON), and IC_HOST (https://ic0.app for mainnet), then restart. GET /health should show fusionCanister: configured. As admin, call adminSetIntegrationServicePrincipal with the principal of that PEM identity. See services/fusion-integration-api/README.md."}function xi(e){const s=String(e||"");return/canister integration not configured/i.test(s)?lf():/\b404\b|not found|cannot post|cannot get/i.test(s)?" Redeploy fusion-integration-api with POST /stripe/sync-subscription-by-email (see services/fusion-integration-api/README.md).":""}function Aa(e,s){const i=(e==null?void 0:e.synced)===!0,o=(s==null?void 0:s.synced)===!0,n=!i&&(e!=null&&e.reason)?String(e.reason):"",a=!o&&(s!=null&&s.reason)?String(s.reason):"";if(i&&o)return"Email sync: ok. Principal sync: ok.";if(n&&a&&n===a)return`Sync failed (email + principal routes): ${n}.${xi(n)}`;const r=[];return i?r.push("Email sync: ok."):n?r.push(`Email sync: ${n}.${xi(n)}`):ee()&&r.push("Email sync: no success (see console / integration logs)."),o?r.push("Principal sync: ok."):a?r.push(`Principal sync: ${a}${xi(a)}`):i?r.push("Principal sync: not attempted (email sync succeeded first)."):ee()&&r.push("Principal sync: no error detail (see console / integration logs)."),r.join(" ")}async function Or(e,s){let i,o,n=!1;if(!ee())return{emailRes:i,principalRes:o,anySynced:n};const a=String(s??"").trim();return a.includes("@")&&(i=await Ed(a,e),n=(i==null?void 0:i.synced)===!0),n||(o=await Ld(e),n=(o==null?void 0:o.synced)===!0),{emailRes:i,principalRes:o,anySynced:n}}function Jr(e){return Qa(e)}function df(e){const s=new Map;for(const i of e||[]){const o=String(i.slug||"").trim();if(!o)continue;const n=i.locales&&typeof i.locales=="object"?i.locales:null;if(n)for(const a of["en","ja"]){const r=n[a];if(!r||typeof r!="object")continue;const l=r,d=String(l.email??l.contactEmail??"").trim().toLowerCase();d.includes("@")&&s.set(d,o)}}return s}function cf(e){const s=e&&typeof e=="object"?e.locales:null,i=s&&typeof s=="object"&&s.en&&typeof s.en=="object"?s.en:{};return String((e==null?void 0:e.fullName)||(e==null?void 0:e.name)||i.name||(e==null?void 0:e.slug)||(e==null?void 0:e.id)||"").trim()}function Vr(e){return String((e==null?void 0:e.contactEmail)||(e==null?void 0:e.email)||"").trim()}function uf(e){return(Array.isArray(e)?e:[]).map(s=>({id:String((s==null?void 0:s.id)||"").trim(),name:cf(s),email:Vr(s)})).filter(s=>s.id&&s.name).sort((s,i)=>s.name.localeCompare(i.name,void 0,{sensitivity:"base"}))}function pf(e){var i;const s=(i=e==null?void 0:e.locales)==null?void 0:i.en;return s&&typeof s=="object"&&s.name!=null&&String(s.name).trim()?String(s.name).trim():String((e==null?void 0:e.slug)||(e==null?void 0:e.id)||"").trim()||"—"}function mf(e,s){const i=e.querySelector("#studio-artists-world-batch-open");if(!(i instanceof HTMLButtonElement))return;const o=()=>{const n=Ct()==="live";i.disabled=!n,i.title=n?"":"Requires live data source (IC LLM on canister)."};o(),window.addEventListener("fusion-data-source-change",o),i.addEventListener("click",async()=>{var j,M;let n=[];try{n=await ke()}catch(S){alert(S instanceof Error?S.message:String(S));return}const a=pc,r=n.length>a?`<p class="studio-muted">Up to <strong>${a}</strong> artists per run. <strong>Select all</strong> stages the first ${a} in roster order (${n.length} total).</p>`:`<p class="studio-muted">${n.length} artist(s). Maximum <strong>${a}</strong> per run.</p>`,l=n.map(S=>{const h=String(S.id??"").trim(),T=U(pf(S));return`<button type="button" class="studio-world-batch-pill studio-world-batch-pill--idle" data-artist-id="${U(h)}">${T}</button>`}).join(""),d=`
${r}
<label class="studio-field studio-field--row" style="margin:0.75rem 0;align-items:center;gap:0.5rem">
<input type="checkbox" id="studio-world-batch-overwrite" />
<span>Overwrite existing <strong>New World</strong> fields (otherwise only fill empty <code>worldNew</code> fields)</span>
</label>
<div class="studio-world-batch-actions">
<button type="button" class="studio-btn-ghost" id="studio-world-batch-select-all">Select all (up to ${a})</button>
<button type="button" class="studio-btn-ghost" id="studio-world-batch-clear">Clear selection</button>
</div>
<div class="studio-world-batch-pills" id="studio-world-batch-pills">${l}</div>
<div class="studio-world-batch-progress" id="studio-world-batch-progress" hidden>
<div class="studio-world-batch-progress-track" aria-hidden="true"><div class="studio-world-batch-progress-bar" id="studio-world-batch-progress-bar"></div></div>
<span class="studio-muted studio-world-batch-progress-label" id="studio-world-batch-progress-label">0 / 0</span>
</div>
<p class="studio-banner studio-banner--error" id="studio-world-batch-run-error" style="display:none;margin-top:0.5rem" role="alert"></p>
<div class="studio-modal-actions" style="margin-top:1rem;padding-top:0.75rem;border-top:1px solid #e2e8f0">
<button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Cancel</button>
<button type="button" class="studio-btn-primary" id="studio-world-batch-run" disabled>Run</button>
</div>`,{root:p}=qt(d,{title:"Generate New World from bio (batch)",wide:!0}),u=new Map(n.map(S=>[String(S.id),S])),c=new Set,m=a,b=p.querySelector("#studio-world-batch-pills"),C=p.querySelector("#studio-world-batch-run"),w=p.querySelector("#studio-world-batch-progress"),L=p.querySelector("#studio-world-batch-progress-bar"),A=p.querySelector("#studio-world-batch-progress-label"),g=p.querySelector("#studio-world-batch-run-error");function f(S){for(const h of(b==null?void 0:b.querySelectorAll("button[data-artist-id]"))??[])if(h.getAttribute("data-artist-id")===S)return h;return null}function v(S,h,T){const N=f(S);N instanceof HTMLButtonElement&&(N.classList.remove("studio-world-batch-pill--idle","studio-world-batch-pill--staged","studio-world-batch-pill--ok","studio-world-batch-pill--err"),N.classList.add(`studio-world-batch-pill--${h}`),N.title=h==="err"?T||"Error":"",h==="idle"&&N.removeAttribute("title"))}function E(){C instanceof HTMLButtonElement&&(C.disabled=c.size===0)}b==null||b.querySelectorAll(".studio-world-batch-pill").forEach(S=>{S.addEventListener("click",()=>{const h=S.getAttribute("data-artist-id");h&&(c.has(h)?(c.delete(h),v(h,"idle")):c.size>=m?alert(`At most ${m} artists per run.`):(c.add(h),v(h,"staged")),E())})}),(j=p.querySelector("#studio-world-batch-select-all"))==null||j.addEventListener("click",()=>{c.clear(),b==null||b.querySelectorAll(".studio-world-batch-pill").forEach(h=>{const T=h.getAttribute("data-artist-id");T&&v(T,"idle")});let S=0;for(const h of n){const T=String(h.id??"").trim();if(!T||S>=m)break;c.add(T),v(T,"staged"),S+=1}E()}),(M=p.querySelector("#studio-world-batch-clear"))==null||M.addEventListener("click",()=>{c.clear(),b==null||b.querySelectorAll(".studio-world-batch-pill").forEach(S=>{const h=S.getAttribute("data-artist-id");h&&v(h,"idle")}),E()}),C==null||C.addEventListener("click",async()=>{const S=p.querySelector("#studio-world-batch-overwrite"),T=S instanceof HTMLInputElement&&S.checked?"overwrite":"fillEmpty";g instanceof HTMLElement&&(g.style.display="none",g.textContent=""),w instanceof HTMLElement&&(w.hidden=!1);const N=[...c];let O=0;const G=N.length;A&&(A.textContent=`0 / ${G}`),L instanceof HTMLElement&&(L.style.width=G?"0%":"100%"),C instanceof HTMLButtonElement&&(C.disabled=!0);for(const V of N){const at=u.get(V);if(!at){v(V,"err","Row missing"),O+=1,A&&(A.textContent=`${O} / ${G}`),L instanceof HTMLElement&&(L.style.width=G?`${O/G*100}%`:"100%");continue}try{await Td(at,T),v(V,"ok")}catch(tt){const z=tt instanceof Error?tt.message:String(tt);v(V,"err",z),g instanceof HTMLElement&&(g.style.display="block",g.textContent=z)}O+=1,A&&(A.textContent=`${O} / ${G}`),L instanceof HTMLElement&&(L.style.width=G?`${O/G*100}%`:"100%")}C instanceof HTMLButtonElement&&(C.disabled=!1),await s()}),E()})}function ka(e){const s=e.enCard||e;return{focus:String(e.focus??s.focus??""),location:String(s.location??""),year:String(s.year??""),accepting:s.acceptingApplications===!0}}function _a(e){const s=String(e||""),i=s==="postInterviewReview"?"Post interview review":s==="needsInfo"?"Needs info":s==="accepted"?"Approved":s==="rejected"?"Denied":s==="pulledOut"?"Pulled out":s==="reviewing"?"Initial review":s==="pending"?"Pending":s;let o="studio-status-pill--neutral";return s==="pending"?o="studio-status-pill--pending":s==="reviewing"||s==="postInterviewReview"?o="studio-status-pill--reviewing":s==="needsInfo"?o="studio-status-pill--needs":s==="accepted"?o="studio-status-pill--accepted":s==="rejected"?o="studio-status-pill--rejected":s==="pulledOut"&&(o="studio-status-pill--rescinded"),`<span class="studio-status-pill ${o}">${U(i)}</span>`}function ff(e){return Ha(e,U)}function bf(e,s){const i=e&&typeof e=="object"?e:{},o=String(i.id||""),n=o.indexOf("|");if(n>0){const r=o.slice(0,n),l=(Array.isArray(s)?s:[]).find(d=>String((d==null?void 0:d.id)||"")===r);if(l)return l}const a=String(i.email||"").trim().toLowerCase();if(!a)return null;for(const r of Array.isArray(s)?s:[]){const l=Vr(r).trim().toLowerCase();if(l&&l===a)return r;const d=r!=null&&r.locales&&typeof r.locales=="object"?r.locales:null;if(d)for(const p of["en","ja"]){const u=d[p];if(!u||typeof u!="object")continue;const c=String(u.email??u.contactEmail??"").trim().toLowerCase();if(c&&c===a)return r}}return null}function gf(e){const s=String(e||"general");return`<label class="studio-field studio-field--full">
      <span>Category</span>
      <select id="studio-app-modal-category" class="studio-select">${kc.map(o=>`<option value="${U(o.value)}"${o.value===s?" selected":""}>${U(o.label)}</option>`).join("")}</select>
    </label>`}function yf(e){return e?'<span class="studio-status-pill studio-status-pill--confirmed">Confirmed</span>':'<span class="studio-muted">—</span>'}const Wr=new Set(["accepted","rejected","needsInfo","pulledOut"]);function hf(e){return Wr.has(String(e||""))?String(e):"accepted"}function vf(e,s=!1){const i=String(e||"pending");return{submitted:!0,reviewing:["reviewing","postInterviewReview","accepted","rejected","needsInfo","pulledOut"].includes(i),postInterviewReview:["postInterviewReview","accepted","rejected","needsInfo","pulledOut"].includes(i),decision:Wr.has(i),decisionValue:hf(i),slotSecured:!!s}}function Sf(e){const s=e.querySelector("#studio-app-workflow-decision"),i=e.querySelector("#studio-app-step-postInterviewReview"),o=e.querySelector("#studio-app-step-reviewing");if(s instanceof HTMLInputElement&&s.checked){const n=e.querySelector("#studio-app-decision-status");return n instanceof HTMLSelectElement?n.value:"accepted"}return i instanceof HTMLInputElement&&i.checked?"postInterviewReview":o instanceof HTMLInputElement&&o.checked?"reviewing":"pending"}function wf(e){const s=e.querySelector("#studio-app-step-reviewing"),i=e.querySelector("#studio-app-step-postInterviewReview"),o=e.querySelector("#studio-app-workflow-decision");o instanceof HTMLInputElement&&o.checked&&(s instanceof HTMLInputElement&&(s.checked=!0),i instanceof HTMLInputElement&&(i.checked=!0)),i instanceof HTMLInputElement&&i.checked&&s instanceof HTMLInputElement&&(s.checked=!0),s instanceof HTMLInputElement&&!s.checked&&(i instanceof HTMLInputElement&&(i.checked=!1),o instanceof HTMLInputElement&&(o.checked=!1)),i instanceof HTMLInputElement&&!i.checked&&o instanceof HTMLInputElement&&(o.checked=!1);const n=e.querySelector("#studio-app-decision-field");n instanceof HTMLElement&&o instanceof HTMLInputElement&&(n.hidden=!o.checked)}function Ef(e,s=!1,i=!1,o=!1){const n=vf(e,s),a=r=>r?"checked":"";return`<fieldset class="studio-app-workflow" aria-label="Applicant workflow">
      <legend>Program status timeline</legend>
      <label class="studio-app-workflow__step">
        <input type="checkbox" id="studio-app-step-submitted" checked disabled />
        <span><strong>Submitted</strong><small>Connected to Pending</small></span>
      </label>
      <label class="studio-app-workflow__step">
        <input type="checkbox" id="studio-app-step-reviewing" ${a(n.reviewing)} />
        <span><strong>Initial review</strong><small>Connected to Reviewing</small></span>
      </label>
      <label class="studio-app-workflow__step">
        <input type="checkbox" id="studio-app-step-postInterviewReview" ${a(n.postInterviewReview)} />
        <span><strong>Post interview review</strong><small>Connected to Post interview review</small></span>
      </label>
      <label class="studio-app-workflow__step">
        <input type="checkbox" id="studio-app-workflow-decision" ${a(n.decision)} />
        <span><strong>Decision</strong><small>Approved, denied, needs info, or pulled out</small></span>
      </label>
      <label class="studio-field studio-app-workflow__decision" id="studio-app-decision-field" ${n.decision?"":"hidden"}>
        <span>Decision result</span>
        <select id="studio-app-decision-status" class="studio-select">
          <option value="accepted" ${n.decisionValue==="accepted"?"selected":""}>Approved</option>
          <option value="rejected" ${n.decisionValue==="rejected"?"selected":""}>Denied</option>
          <option value="needsInfo" ${n.decisionValue==="needsInfo"?"selected":""}>Needs info</option>
          <option value="pulledOut" ${n.decisionValue==="pulledOut"?"selected":""}>Pulled out</option>
        </select>
      </label>
      <label class="studio-app-workflow__step">
        <input type="checkbox" id="studio-app-step-manual-deposit" ${a(i)} />
        <span><strong>Manual deposit submitted</strong><small>Payment received outside the member dashboard</small></span>
      </label>
      <label class="studio-app-workflow__step">
        <input type="checkbox" id="studio-app-step-is-tester" ${a(o)} />
        <span><strong>Tester</strong><small>Hidden from All and status tabs; visible under Tester filter only</small></span>
      </label>
      <label class="studio-app-workflow__step studio-app-workflow__step--readonly">
        <input type="checkbox" id="studio-app-step-slot-secured" ${a(n.slotSecured||i)} disabled />
        <span><strong>Slot secured</strong><small>Completed after deposit or full payment</small></span>
      </label>
    </fieldset>`}const Lf={[te]:Af,home:qr,subscribers:kf,applicants:_f,finance:Bu,artists:$f,"pending-approval":Cf,programs:Mf,products:xf,"gallery-access":If,journal:Hf,sound:jf,community:am,videos:Qp,content:Hr,email:qf,ai:Pf,galleries:e=>Ii(e,"galleries"),collectors:e=>Ii(e,"collectors"),curators:e=>Ii(e,"curators"),users:Rf,services:Vf,settings:Gf,permissions:Gu,team:tp};async function Tf(e,s){const i=Lf[e];i&&await i(s)}async function Af(e){const s=e.querySelector("#studio-dashboard-stats"),i=e.querySelector("#studio-dashboard-banner");try{const o=await td();i&&(i.className=`studio-banner studio-banner--${o.dataSource==="test"?"info":"ok"}`,i.textContent=o.dataSource==="test"?"Data source: Test JSON — subscribers/applicants can use localStorage overlays from Studio. Switch Debug or Settings to Live for canister data.":"Data source: Live canister — subscriber count requires admin."),s&&(s.innerHTML=[ts(String(o.subscriberCount),"Subscribers","","Waitlist / CRM"),ts(String(o.artistCount),"Artists","","Roster"),ts(String(o.programCount),"Programs","","Residencies"),ts(String(o.journalCount),"Journal entries","","Published"),ts(String(o.editionCount),"Editions","","Products"),ts(String(o.applicantCount),"Applicants","","Pipeline")].join(""));const n=e.querySelector("#studio-dashboard-pending-wrap"),a=e.querySelector("#studio-dashboard-pending-list");if(n&&a&&Jt("pending-approval").visible)try{const l=(await ke()).filter(d=>Ts(d.visibility)==="pending");n.hidden=!1,l.length?a.innerHTML=`
                        <table class="studio-table studio-table--dense">
                            <thead>
                                <tr>
                                    <th>Name / slug</th>
                                    <th>ID</th>
                                    <th>Status</th>
                                    <th class="studio-td-actions">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${l.map(d=>{const p=String(d.slug||""),u=U(p),c=U(String(d.id||""));return`<tr>
                                            <td>${u}</td>
                                            <td><code class="studio-code-inline">${c}</code></td>
                                            <td>${wo(d.visibility)}</td>
                                            <td class="studio-td-actions">
                                                <a href="#pending-approval" class="studio-quick-link">Review</a>
                                                ${p?`<a class="studio-action-link" href="/profile/${encodeURIComponent(p)}" target="_blank" rel="noopener">Profile</a>`:""}
                                            </td>
                                        </tr>`}).join("")}
                            </tbody>
                        </table>`:a.innerHTML='<p class="studio-muted">No artists awaiting visibility review.</p>'}catch{n.hidden=!0}e.querySelectorAll(".studio-quick-link").forEach(r=>{r.addEventListener("click",l=>{l.preventDefault();const d=r.getAttribute("data-studio-hash");d&&(window.location.hash=`#${d}`)})})}catch(o){i&&(i.textContent=o instanceof Error?o.message:String(o))}}function ts(e,s,i,o){return`
        <div class="studio-stat-card">
            <div class="studio-stat-value">${U(e)}</div>
            <div class="studio-stat-label">${U(s)}</div>
            ${i?`<div class="studio-stat-delta">${U(i)}</div>`:""}
            <div class="studio-stat-caption">${U(o)}</div>
        </div>
    `}async function kf(e){var M;const s=e.querySelector("#studio-subscribers-tbody"),i=e.querySelector("#studio-subscribers-banner"),o=e.querySelector("#studio-subscribers-csv-msg"),n=e.querySelector("#studio-bootstrap-admin"),a=e.querySelector("#studio-subscribers-refresh"),r=e.querySelector("#studio-subscriber-add"),l=e.querySelector("#studio-subscribers-all-to-general"),d=e.querySelector("#studio-subscriber-csv"),p=e.querySelector("#studio-subscribers-download-csv"),u=e.querySelector("#studio-subscribers-search"),c=e.querySelector("#studio-subscribers-header-count"),m=Jt("subscribers"),b=m.canEdit?8:6;let C=[],w=[];const L=(S,h)=>{i&&(i.style.display=h?"block":"none",i.className=`studio-banner studio-banner--${S}`,i.textContent=h)},A=(S,h)=>{o&&(o.style.display=h?"block":"none",o.className=`studio-banner studio-banner--${S}`,o.textContent=h)},g=S=>{const h=String(S||"").trim();if(!h)return"—";const T=C.find(N=>String(N.segmentId).trim()===h);return T&&String(T.name||"").trim()||`${h.slice(0,8)}…`},f=S=>{const h=Array.isArray(S.audiences)?S.audiences:[];return h.length?h.map(T=>U(g(T))).join(", "):"—"},v=()=>{s==null||s.querySelectorAll(".studio-sub-delete").forEach(S=>{S.addEventListener("click",async()=>{const h=S.getAttribute("data-email");if(!(!h||!confirm(`Delete subscriber ${h}?`)))try{await mc(h),await j(),L("ok","Deleted.")}catch(T){const N=T instanceof Error?T.message:String(T);L("error",`Delete failed: ${N}`),ks&&console.error(T)}})}),s==null||s.querySelectorAll(".studio-sub-manage").forEach(S=>{S.addEventListener("click",()=>{var F;const h=S.getAttribute("data-email");if(!h)return;const T=w.find(I=>String(I.email).toLowerCase()===h.toLowerCase()),N=new Set((Array.isArray(T==null?void 0:T.audiences)?T.audiences:[]).map(I=>String(I).trim()).filter(Boolean)),O=(C||[]).map(I=>({name:String((I==null?void 0:I.name)||"").trim(),id:String((I==null?void 0:I.segmentId)||"").trim()})).filter(I=>I.id),G=O.length?O.map(I=>`
            <button type="button" class="studio-pill studio-audience-pill ${N.has(I.id)?"studio-pill--active":""}" data-seg="${U(I.id)}">
              ${U(I.name||I.id.slice(0,8)+"…")}
            </button>`).join(""):'<p class="studio-muted">Configure segment names/ids in Studio → Services → Resend, then save to the canister.</p>',V=`<div class="studio-modal-form studio-audience-manage" data-email="${U(h)}">
            <p class="studio-muted">Toggle which Resend segments this address is tagged with in Fusion (canister only). Use Email → <strong>SYNC Audience</strong> to push to Resend.</p>
            <div class="studio-audience-pill-wrap">${G}</div>
            <button type="button" class="studio-btn-primary" id="studio-audience-save">Save</button>
          </div>`,{close:at,root:tt}=qt(V,{title:`Audiences — ${U(h)}`,wide:!0}),z=tt.querySelector(".studio-audience-manage");z==null||z.querySelectorAll(".studio-audience-pill").forEach(I=>{I.addEventListener("click",()=>I.classList.toggle("studio-pill--active"))}),(F=tt.querySelector("#studio-audience-save"))==null||F.addEventListener("click",async()=>{const I=(z==null?void 0:z.getAttribute("data-email"))||h,y=[];z==null||z.querySelectorAll(".studio-audience-pill.studio-pill--active").forEach(_=>{const $=_.getAttribute("data-seg");$&&y.push($)});try{await sn(I,y),at(),await j(),L("ok","Audiences updated.")}catch(_){alert(_ instanceof Error?_.message:String(_))}})})})},E=()=>{if(!s)return;const S=(u instanceof HTMLInputElement?u.value:"").trim().toLowerCase(),h=w.filter(T=>S?`${T.email} ${T.category} ${T.fullName??""} ${T.intent??""}`.toLowerCase().includes(S):!0);h.length?(s.innerHTML=h.map(T=>`
                <tr data-email="${U(T.email)}">
                    <td>${U(T.email)}</td>
                    <td>${U(T.category)}</td>
                    <td>${U(T.fullName??"")}</td>
                    <td>${U(T.intent??"")}</td>
                    <td>${U(T.timestamp)}</td>
                    <td>${f(T)}</td>
                    ${m.canEdit?`<td class="studio-subscribers-col-manage"><button type="button" class="studio-btn-ghost studio-sub-manage" data-email="${U(T.email)}">Audiences</button></td>
                    <td class="studio-td-actions studio-subscribers-col-delete"><button type="button" class="studio-btn-ghost studio-sub-delete" data-email="${U(T.email)}">DELETE</button></td>`:""}
                </tr>
            `).join(""),m.canEdit&&v()):s.innerHTML=`<tr><td colspan="${b}">${w.length?"No rows match search.":"No subscribers yet."}</td></tr>`,c&&(c.textContent=String(S?h.length:w.length))},j=async()=>{if(s){s.innerHTML=`<tr><td colspan="${b}">Loading…</td></tr>`,L("info",""),A("info","");try{let S;try{S=await no()}catch(h){s.innerHTML=`<tr><td colspan="${b}">Bindings out of date — run <code>dfx generate fusion-app-backend</code> after pulling backend changes.</td></tr>`,ks&&console.error(h);return}try{C=await so()}catch{C=[]}Ct()==="test"?L("info","Test mode: subscribers stored in localStorage (<code>fusion-studio-subscribers</code>). Use Live + admin for canister."):L("info","Live canister — listing is admin-only."),w=Array.isArray(S)?S:[],E()}catch(S){const h=S instanceof Error?S.message:String(S);s.innerHTML=`<tr><td colspan="${b}">Could not load subscribers. ${U(h)}</td></tr>`,w=[],c&&(c.textContent="0"),L("error","Listing may be admin-only. Use “Claim first admin” on a fresh canister, or sign in with an admin principal after Internet Identity is wired."),ks&&console.error(S)}}};m.canEdit||(r==null||r.setAttribute("hidden",""),l==null||l.setAttribute("hidden",""),(M=d==null?void 0:d.closest("label"))==null||M.setAttribute("hidden",""),e.querySelectorAll(".studio-subscribers-col-manage, .studio-subscribers-col-delete").forEach(S=>{S.setAttribute("hidden","")})),l==null||l.addEventListener("click",()=>{var G;const S=(C||[]).map(V=>({name:String((V==null?void 0:V.name)||"").trim(),id:String((V==null?void 0:V.segmentId)||"").trim()})).filter(V=>V.id),T=`<div class="studio-modal-form studio-audience-manage studio-audience-manage--batch" id="studio-audience-batch-form">
            <p class="studio-muted">Select one or more Resend audience segments. Each will be <strong>added</strong> to every subscriber’s Fusion audiences (existing tags are kept). Use Email → <strong>SYNC Audience</strong> to push to Resend afterward.</p>
            <div class="studio-audience-pill-wrap">${S.length?S.map(V=>`
            <button type="button" class="studio-pill studio-audience-pill" data-seg="${U(V.id)}">
              ${U(V.name||V.id.slice(0,8)+"…")}
            </button>`).join(""):'<p class="studio-muted">Configure segment names/ids in Studio → Services → Resend, then save to the canister.</p>'}</div>
            <div class="studio-modal-actions" style="gap:0.5rem;flex-wrap:wrap">
              <button type="button" class="studio-btn-primary" id="studio-subscribers-batch-audience-apply">Add to all subscribers</button>
            </div>
          </div>`,{close:N,root:O}=qt(T,{title:"Add audiences to all subscribers",wide:!0});O.querySelectorAll(".studio-audience-pill").forEach(V=>{V.addEventListener("click",()=>V.classList.toggle("studio-pill--active"))}),(G=O.querySelector("#studio-subscribers-batch-audience-apply"))==null||G.addEventListener("click",async()=>{const V=[];if(O.querySelectorAll(".studio-audience-pill.studio-pill--active").forEach(tt=>{const z=tt.getAttribute("data-seg");z&&V.push(z)}),!V.length){alert("Select at least one audience segment.");return}const at=w.length;if(at===0){alert("No subscribers to update.");return}if(confirm(`Add ${V.length} segment(s) to all ${at} subscriber(s)? This updates the canister only; sync to Resend separately if needed.`))try{for(const tt of w){const z=String(tt.email||"").trim();if(!z)continue;const F=new Set((Array.isArray(tt.audiences)?tt.audiences:[]).map(I=>String(I).trim()).filter(Boolean));for(const I of V)I&&F.add(I);await sn(z,[...F])}N(),await j(),L("ok",`Updated audiences for ${at} subscriber(s).`)}catch(tt){alert(tt instanceof Error?tt.message:String(tt))}})}),r==null||r.addEventListener("click",()=>{var N;const S=`
            <form id="studio-sub-form" class="studio-modal-form">
                <label class="studio-field"><span>Email</span><input required type="email" name="email" class="studio-input" /></label>
                <label class="studio-field"><span>Category</span><input type="text" name="category" class="studio-input" /></label>
                <label class="studio-field"><span>Full name</span><input type="text" name="fullName" class="studio-input" /></label>
                <label class="studio-field"><span>Intent</span><input type="text" name="intent" class="studio-input" placeholder="membership | access | apply" /></label>
                <button type="submit" class="studio-btn-primary">Save</button>
            </form>`,{close:h,root:T}=qt(S,{title:"Add subscriber",wide:!0});(N=T.querySelector("#studio-sub-form"))==null||N.addEventListener("submit",async O=>{O.preventDefault();const G=new FormData(O.target);try{await ed({email:String(G.get("email")||""),category:String(G.get("category")||""),fullName:String(G.get("fullName")||""),intent:String(G.get("intent")||"")}),h(),await j(),L("ok","Subscriber saved.")}catch(V){alert(V instanceof Error?V.message:String(V))}})}),d==null||d.addEventListener("change",async S=>{var O,G;const h=(G=(O=S.target)==null?void 0:O.files)==null?void 0:G[0];if(!h)return;const T=await h.text(),N=op(T);if(!N.length){A("error","No valid rows (need an email column).");return}try{const V=await sd(N);A("ok",`Imported ${V} row(s).`),await j()}catch(V){A("error",V instanceof Error?V.message:String(V))}S.target.value=""}),n==null||n.addEventListener("click",async()=>{L("info","");try{const S=await oo();if(typeof S.bootstrapAdminIfEmpty!="function"){L("error","bootstrapAdminIfEmpty missing from declarations — run dfx generate.");return}const h=await S.bootstrapAdminIfEmpty();L(h?"ok":"info",h?"You are now the first admin for this canister.":"Admin list was already set; no change."),await j()}catch(S){const h=S instanceof Error?S.message:String(S);L("error",h),ks&&console.error(S)}}),a==null||a.addEventListener("click",()=>j()),p==null||p.addEventListener("click",async()=>{try{const S=await Ua(),h=new Blob([S],{type:"text/csv;charset=utf-8"}),T=URL.createObjectURL(h),N=document.createElement("a");N.href=T,N.download="fusion-subscribers.csv",N.click(),URL.revokeObjectURL(T)}catch(S){const h=S instanceof Error?S.message:String(S);A("error",h)}}),u==null||u.addEventListener("input",()=>E()),await j()}const ps=50;async function _f(e){var G,V,at,tt,z,F,I;const s=e.querySelector("#studio-applicants-tbody"),i=e.querySelector("#studio-applicants-banner"),o=e.querySelector("#studio-applicants-pagination"),n=e.querySelector("#studio-app-page-label"),a=e.querySelector("#studio-app-page-prev"),r=e.querySelector("#studio-app-page-next"),l=e.querySelector("#studio-app-page-numbers"),d=e.querySelector("#studio-applicants-header-count"),p=e.querySelector("#studio-applicants-search"),u=Jt("applicants");if(!u.visible){i&&(i.className="studio-banner studio-banner--warn",i.textContent="You do not have access to this section.",i.style.display="block"),(G=e.querySelector(".studio-section-accordion"))==null||G.setAttribute("hidden",""),(V=e.querySelector(".studio-table-wrap"))==null||V.setAttribute("hidden",""),o==null||o.setAttribute("hidden","");return}const c=u.canEdit;let m=[],b=0,C="all",w=new Map,L=[],A=[],g=!1;if(Ct()==="test")g=!0;else try{const{getStudioAuthenticatedActor:y}=await je(()=>import("./index-20317f29.js").then($=>$.f1),["assets/index-20317f29.js","assets/index-06c7870c.css"]),_=await y();_&&typeof _.isCallerAdmin=="function"&&(g=await _.isCallerAdmin())}catch{}if(i){let y=Ct()==="test"?"Test mode uses saved applicants on this browser. Open a row to change status or notes.":"Live canister — listApplicants (staff/admin). Open a row to edit.";Ct()!=="test"&&!g&&(y+=" Only admins can delete applicant records."),i.textContent=y}const f=()=>{e.querySelectorAll(".studio-data-tabs__tab").forEach(y=>{const _=y.getAttribute("data-tab-value")||"";y.classList.toggle("is-active",_===C)})},v=()=>{let y=m;C==="tester"?y=y.filter($=>Us($.payloadJson)):(y=y.filter($=>!Us($.payloadJson)),C!=="all"&&(y=y.filter($=>String($.status)===C)));const _=(p instanceof HTMLInputElement?p.value:"").trim().toLowerCase();return _&&(y=y.filter($=>`${$.email} ${$.fullName||""} ${$.programId||""} ${$.status}`.toLowerCase().includes(_))),y},E=y=>{if(!l||(l.innerHTML="",v().length<=ps))return;const $=7;let H=Math.max(0,b-3),R=Math.min(y,H+$);R-H<$&&(H=Math.max(0,R-$));for(let x=H;x<R;x++){const q=document.createElement("button");q.type="button",q.className=`studio-pagination__num${x===b?" is-active":""}`,q.textContent=String(x+1),q.addEventListener("click",()=>{b=x,j()}),l.appendChild(q)}},j=()=>{if(!s)return;const y=v(),_=y.length;d&&(d.textContent=String(_));const $=Math.max(1,Math.ceil(_/ps)||1);b>=$&&(b=Math.max(0,$-1));const H=b*ps,R=y.slice(H,H+ps);if(!R.length)s.innerHTML=`<tr><td colspan="10">${m.length?"No applicants match filters.":"No applicants."}</td></tr>`;else{const x=X=>c&&g?`<td class="studio-td-actions"><button type="button" class="studio-btn-danger studio-app-delete" data-id="${U(X)}">Delete</button></td>`:'<td class="studio-td-actions">—</td>',q=X=>c?`<td class="studio-td-actions"><button type="button" class="studio-btn-ghost studio-app-email" data-id="${U(X)}">Send email</button></td>`:'<td class="studio-td-actions">—</td>';s.innerHTML=R.map(X=>`
        <tr class="studio-app-row" data-id="${U(X.id)}" tabindex="0" role="button">
            <td>${U(X.email)}</td>
            <td>${U(X.fullName||"")}</td>
            <td>${U(X.programId)}</td>
            <td>${_a(X.status)}</td>
            <td>${ff(Rs(X.payloadJson))}</td>
            <td>${yf(!!X.slotSecured)}</td>
            <td><span class="studio-muted" title="${U(X.createdAt||"")}">${U(le(X.createdAt))}</span></td>
            <td class="studio-td-actions"><button type="button" class="studio-btn-ghost studio-app-view" data-id="${U(X.id)}">View</button></td>
            ${q(X.id)}
            ${x(X.id)}
        </tr>`).join(""),s.querySelectorAll(".studio-app-row").forEach(X=>{const ot=()=>{const gt=X.getAttribute("data-id");gt&&(c?O(gt):T(gt))};X.addEventListener("click",gt=>{var bt,wt;if(gt.target&&((wt=(bt=gt.target).closest)==null?void 0:wt.call(bt,".studio-app-delete, .studio-app-view, .studio-app-email"))){gt.preventDefault();return}ot()}),X.addEventListener("keydown",gt=>{(gt.key==="Enter"||gt.key===" ")&&ot()})}),c&&s.querySelectorAll(".studio-app-email").forEach(X=>{X.addEventListener("click",ot=>{ot.stopPropagation();const gt=X.getAttribute("data-id");gt&&N(gt)})}),s.querySelectorAll(".studio-app-view").forEach(X=>{X.addEventListener("click",ot=>{ot.stopPropagation();const gt=X.getAttribute("data-id");gt&&T(gt)})})}f(),E($),o&&n&&(_>ps?(o.style.display="flex",n.textContent=`Page ${b+1} / ${$}`,a&&(a.disabled=b<=0),r&&(r.disabled=b>=$-1)):o.style.display="none")},M=async()=>{m=await Hi(),m=await Promise.all(m.map(async y=>({...y,slotSecured:await ln(y.id,y.programId,y.payloadJson)||Pi(y.payloadJson)})));try{const y=await ke();A=Array.isArray(y)?y:[],w=df(y),L=uf(y),S()}catch{A=[],w=new Map,L=[],S()}j()},S=()=>{const y=e.querySelector("#studio-app-new-artist");if(!(y instanceof HTMLSelectElement))return;const _=y.value;y.innerHTML='<option value="">Manual applicant</option>';for(const $ of L){const H=document.createElement("option");H.value=$.id,H.textContent=$.email?`${$.name} (${$.email})`:$.name,y.appendChild(H)}_&&L.some($=>$.id===_)&&(y.value=_)},h=()=>{const y=e.querySelector("#studio-app-new-artist");if(!(y instanceof HTMLSelectElement)||!y.value)return;const _=L.find(ot=>ot.id===y.value);if(!_)return;const $=e.querySelector("#studio-app-new-program"),H=e.querySelector("#studio-app-new-id"),R=e.querySelector("#studio-app-new-email"),x=e.querySelector("#studio-app-new-name"),q=e.querySelector("#studio-app-new-status"),X=String(($==null?void 0:$.value)||"").trim();H instanceof HTMLInputElement&&X&&(H.value=`${_.id}|${X}`),R instanceof HTMLInputElement&&(R.value=_.email),x instanceof HTMLInputElement&&(x.value=_.name),q instanceof HTMLSelectElement&&(q.value="accepted")},T=y=>{const _=m.find(gt=>gt.id===y);if(!_)return;const $=String(_.email||"").trim().toLowerCase(),H=ws(),R=$&&w.get($)||null,{internalNotes:x}=qi(_.payloadJson),q=dn(_.payloadJson,{siteOrigin:H,profileSlug:R,escapeHtml:U}),X=x&&x.trim()?`<div class="studio-app-internal-notes"><strong>Internal notes</strong><div class="studio-app-internal-notes__body">${U(x)}</div></div>`:"",ot=`
          <div class="studio-modal-form">
            <p><strong>Email:</strong> ${U(_.email)}</p>
            <p><strong>Name:</strong> ${U(_.fullName||"—")}</p>
            <p><strong>Program:</strong> ${U(_.programId)}</p>
            <p><strong>Status:</strong> ${_a(_.status)}</p>
            <p><strong>Created:</strong> ${U(le(_.createdAt))}</p>
            <h3 class="studio-subheading">Application</h3>
            ${q}
            ${X}
          </div>`;qt(ot,{title:"View application",wide:!0})},N=y=>{const _=m.find($=>$.id===y);_&&Oi(_,{onSent:M,canClearCorrespondence:g})},O=y=>{var P,k,J;const _=m.find(W=>W.id===y);if(!_)return;const{internalNotes:$,rawInvalid:H}=qi(_.payloadJson),R=H?fc(_.payloadJson):$,x=Pi(_.payloadJson),q=Us(_.payloadJson),X=Rs(_.payloadJson),ot=(Ni(_.payloadJson)/100).toFixed(2),gt=(Ri(_.payloadJson)/100).toFixed(2),Lt=String(_.email||"").trim().toLowerCase(),bt=ws(),wt=Lt&&w.get(Lt)||null,_t=dn(_.payloadJson,{siteOrigin:bt,profileSlug:wt,escapeHtml:U}),At=H?'<p class="studio-banner studio-banner--warn" style="margin-top:0.5rem">Application payload is not valid JSON. Save keeps the stored payload unchanged until it is valid JSON; internal note edits are ignored in that case.</p>':"",nt=g?`<div class="studio-modal-actions studio-modal-actions--applicant-delete">
            <button type="button" class="studio-btn-danger" id="studio-app-modal-delete">Delete applicant</button>
          </div>`:"",dt=`
          <div class="studio-modal-form">
            <p class="studio-muted">Reference: <code class="studio-code-inline">${U(Fs(_.id))}</code></p>
            <p><strong>${U(_.email)}</strong>${_.fullName?` — ${U(_.fullName)}`:""}</p>
            ${At}
            <h3 class="studio-subheading">Application</h3>
            ${_t}
            <div class="studio-app-status-with-email">
              <div class="studio-app-status-with-email__status">${Ef(_.status,!1,x,q)}</div>
              <div class="studio-app-status-with-email__send">
                <span class="studio-sr-only">Send email to applicant</span>
                <button type="button" class="studio-btn-ghost" id="studio-app-modal-send-email">Send email</button>
              </div>
            </div>
            ${gf(X)}
            <label class="studio-field"><span>Flight / ticket cost (USD)</span>
              <input type="text" id="studio-app-modal-flight-cost" class="studio-input" inputmode="decimal" placeholder="0.00" value="${U(ot==="0.00"?"":ot)}" />
            </label>
            <label class="studio-field"><span>Local travel (USD)</span>
              <input type="text" id="studio-app-modal-local-travel" class="studio-input" inputmode="decimal" placeholder="0.00" value="${U(gt==="0.00"?"":gt)}" />
            </label>
            <label class="studio-field studio-field--full"><span>Internal notes (staff only)</span>
              <textarea id="studio-app-modal-notes" class="studio-textarea" rows="6" placeholder="Visible in Studio only; not sent to the applicant."></textarea>
            </label>
            <button type="button" class="studio-btn-primary" id="studio-app-modal-save">Save</button>
            ${nt}
          </div>`,{close:yt,root:K}=qt(dt,{title:`Applicant — ${U(_.email)}`,wide:!0}),et=K.querySelector("#studio-app-modal-notes");et instanceof HTMLTextAreaElement&&(et.value=R);let Y=_.status;const st=()=>{var Ut;const W=((Ut=K.querySelector("#studio-app-modal-notes"))==null?void 0:Ut.value)??"",Z=K.querySelector("#studio-app-step-manual-deposit"),ct=K.querySelector("#studio-app-step-is-tester"),pt=K.querySelector("#studio-app-modal-category"),ft=Z instanceof HTMLInputElement&&Z.checked,It=ct instanceof HTMLInputElement&&ct.checked,Ft=pt instanceof HTMLSelectElement?pt.value:X,Ht=K.querySelector("#studio-app-modal-flight-cost"),Tt=Ht instanceof HTMLInputElement?Ht.value.trim():"",Yt=Tt?Math.max(0,Math.round(Number(Tt.replace(/[^0-9.]/g,""))*100)):0,Rt=K.querySelector("#studio-app-modal-local-travel"),ce=Rt instanceof HTMLInputElement?Rt.value.trim():"",$t=ce?Math.max(0,Math.round(Number(ce.replace(/[^0-9.]/g,""))*100)):0;return H?_.payloadJson:Js({internalNotes:W,manualDepositSubmitted:ft,applicantCategory:Ft,isTester:It,flightCostCents:Yt,localTravelCostCents:$t},_.payloadJson)},B=()=>{const W=K.querySelector("#studio-app-step-manual-deposit"),Z=K.querySelector("#studio-app-step-slot-secured"),ct=W instanceof HTMLInputElement&&W.checked,pt=Z instanceof HTMLInputElement&&Z.dataset.paymentSecured==="true";Z instanceof HTMLInputElement&&(Z.checked=pt||ct)};(P=K.querySelector("#studio-app-modal-send-email"))==null||P.addEventListener("click",()=>{Oi(_,{onSent:M,canClearCorrespondence:g})}),K.querySelectorAll(".studio-app-workflow input, #studio-app-decision-status").forEach(W=>{W.addEventListener("change",()=>{wf(K),B()})}),(async()=>{const W=await ln(_.id,_.programId,_.payloadJson),Z=K.querySelector("#studio-app-step-slot-secured");if(Z instanceof HTMLInputElement&&(Z.dataset.paymentSecured=W?"true":"false",Z.checked=W||x),!H&&!bc(_.payloadJson)){const ct=bf(_,A),pt=gc(ct,_.programId),ft=K.querySelector("#studio-app-modal-notes"),It=ft instanceof HTMLTextAreaElement?ft.value:R,Ft=Js({internalNotes:It,manualDepositSubmitted:x,applicantCategory:pt,isTester:q,flightCostCents:Ni(_.payloadJson),localTravelCostCents:Ri(_.payloadJson)},_.payloadJson);try{await bs({..._,payloadJson:Ft}),_.payloadJson=Ft;const Ht=m.findIndex(Yt=>Yt.id===_.id);Ht>=0&&(m[Ht]={...m[Ht],payloadJson:Ft});const Tt=K.querySelector("#studio-app-modal-category");Tt instanceof HTMLSelectElement&&(Tt.value=pt),await _n(_.id),j()}catch{}}})(),(k=K.querySelector("#studio-app-modal-save"))==null||k.addEventListener("click",async()=>{const W=Sf(K),Z=st(),ct=K.querySelector("#studio-app-step-manual-deposit"),pt=K.querySelector("#studio-app-modal-category"),ft=ct instanceof HTMLInputElement&&ct.checked,It=Rs(_.payloadJson),Ft=pt instanceof HTMLSelectElement?pt.value:It;try{await bs({..._,status:W,payloadJson:Z}),ft&&await yc(_.id),Ft!==It&&await _n(_.id),Y=W,yt(),await M()}catch(Ht){alert(Ht instanceof Error?Ht.message:String(Ht))}}),(J=K.querySelector("#studio-app-modal-delete"))==null||J.addEventListener("click",async()=>{if(confirm(`Delete applicant ${_.email} (${Fs(_.id)})? This cannot be undone.`))try{if(!await on(_.id)){alert("Delete failed — the record may be read-only, or your admin session may have expired.");return}yt(),await M()}catch(W){alert(W instanceof Error?W.message:String(W))}})};s==null||s.addEventListener("click",async y=>{var x,q;const _=y.target&&((q=(x=y.target).closest)==null?void 0:q.call(x,".studio-app-delete"));if(!_||!s.contains(_)||(y.stopPropagation(),!g))return;const $=_.getAttribute("data-id");if(!$)return;const H=m.find(X=>X.id===$),R=H?`${H.email} (${Fs($)})`:$;if(confirm(`Delete applicant ${R}? This cannot be undone.`))try{if(!await on($)){alert("Delete failed — the record may be read-only, or your admin session may have expired.");return}await M()}catch(X){alert(X instanceof Error?X.message:String(X))}}),a==null||a.addEventListener("click",()=>{b=Math.max(0,b-1),j()}),r==null||r.addEventListener("click",()=>{b+=1,j()}),e.querySelectorAll(".studio-data-tabs__tab").forEach(y=>{y.addEventListener("click",()=>{const _=y.getAttribute("data-tab-value");_&&(C=_,b=0,j())})}),p==null||p.addEventListener("input",()=>{b=0,j()}),c||(at=e.querySelector(".studio-section-accordion"))==null||at.setAttribute("hidden",""),(tt=e.querySelector("#studio-applicants-generate-access-code"))==null||tt.addEventListener("click",async()=>{try{const y=await id();alert(`Generated application payment bypass access code: ${y}

This code is single-use. Share it with an applicant to skip payment and submit.`)}catch(y){alert(y instanceof Error?y.message:String(y))}}),(z=e.querySelector("#studio-app-new-artist"))==null||z.addEventListener("change",h),(F=e.querySelector("#studio-app-new-program"))==null||F.addEventListener("input",h),(I=e.querySelector("#studio-app-new-save"))==null||I.addEventListener("click",async()=>{var x,q,X,ot,gt,Lt,bt,wt,_t,At;h();const y=(q=(x=e.querySelector("#studio-app-new-artist"))==null?void 0:x.value)==null?void 0:q.trim(),_=((ot=(X=e.querySelector("#studio-app-new-program"))==null?void 0:X.value)==null?void 0:ot.trim())||"",$=((Lt=(gt=e.querySelector("#studio-app-new-id"))==null?void 0:gt.value)==null?void 0:Lt.trim())||(y&&_?`${y}|${_}`:"");if(!$){alert("ID required");return}const H=((bt=e.querySelector("#studio-app-new-payload"))==null?void 0:bt.value)??"",R=od(H,"{}");try{await bs({id:$,programId:_,email:((wt=e.querySelector("#studio-app-new-email"))==null?void 0:wt.value)||"",fullName:((_t=e.querySelector("#studio-app-new-name"))==null?void 0:_t.value)||"",status:y?"accepted":((At=e.querySelector("#studio-app-new-status"))==null?void 0:At.value)||"pending",createdAt:new Date().toISOString(),payloadJson:R}),b=0,await M()}catch(nt){alert(nt instanceof Error?nt.message:String(nt))}}),await M()}async function Ii(e,s){var c;const i=e.querySelector(`#studio-audience-subs-${s}`),o=e.querySelector(`#studio-audience-acc-${s}`),n=s==="galleries"?/gallery/i:s==="collectors"?/collector/i:/curator/i,a=s==="galleries"?"gallery":s==="collectors"?"collector":"curator";let r=[];try{r=await no()}catch{r=[]}const l=(Array.isArray(r)?r:[]).filter(m=>n.test(String(m.category||"")));i&&(i.innerHTML=l.length?l.map(m=>`<tr><td>${U(m.email)}</td><td>${U(m.category)}</td><td>${U(m.fullName??"")}</td><td>${U(m.intent??"")}</td></tr>`).join(""):'<tr><td colspan="4">No matching subscribers.</td></tr>');let d=[];try{d=await Te()}catch{d=[]}const p=d.filter(m=>m.role===a);o&&(o.innerHTML=p.length?p.map(m=>`<tr><td><code>${U(m.principal)}</code></td><td>${U(m.role)}</td><td>${U(m.status)}</td></tr>`).join(""):'<tr><td colspan="3">No accounts with this role (admin + live only).</td></tr>');const u=s==="galleries"?{gallery:null}:s==="collectors"?{collector:null}:{curator:null};(c=e.querySelector(`#studio-audience-gen-${s}`))==null||c.addEventListener("click",async()=>{try{const m=await Zi(u);await Eo(m,`Invite for audience: ${t}. Share with one person; they must pick the same role when joining.`)}catch(m){alert(m instanceof Error?m.message:String(m))}})}async function $f(e){var N,O,G,V,at,tt,z,F;const s=e.querySelector("#studio-artists-tbody"),i=e.querySelector("#studio-artists-banner"),o=e.querySelector("#studio-artists-search"),n=e.querySelector("#studio-artists-header-count"),r=Jt("artists").canEdit,l=e.querySelector(".studio-artists-send-blast");l instanceof HTMLElement&&(r||(l.hidden=!0));let d=[],p="all",u=0;const c=6,m=async I=>{if(!s)return;const y=++u,_=I.filter($=>Pm($));for(let $=0;$<_.length;$+=c){if(y!==u)return;const H=_.slice($,$+c);await Promise.all(H.map(async R=>{const x=await Rm(R);if(y!==u)return;const q=String(R.id??""),X=s.querySelector(`.studio-artist-ready-dot[data-artist-id="${CSS.escape(q)}"]`);Um(X,Ea(R,x))}))}},b=()=>{s&&(s.querySelectorAll(".studio-art-manage").forEach(I=>{I.addEventListener("click",()=>{const y=I.getAttribute("data-id"),_=d.find($=>String($.id)===String(y));_&&A(_)})}),s.querySelectorAll(".studio-art-featured-cb").forEach(I=>{I.addEventListener("change",async()=>{if(!(I instanceof HTMLInputElement))return;const y=I.getAttribute("data-id");if(!y)return;const _=await hc(y,I.checked);if(!_.ok){I.checked=!I.checked,i&&(i.className="studio-banner studio-banner--error",i.textContent=_.reason||"Could not update featured");return}await g()})}),s.querySelectorAll(".studio-art-featurable-cb").forEach(I=>{I.addEventListener("change",async()=>{if(!(I instanceof HTMLInputElement))return;const y=I.getAttribute("data-id");y&&(await vc(y,I.checked),await g())})}),s.querySelectorAll(".studio-art-mrp").forEach(I=>{I.addEventListener("blur",async()=>{if(!(I instanceof HTMLInputElement))return;const y=I.getAttribute("data-id");if(!y)return;const _=d.find(R=>String(R.id)===String(y)),$=_?String(_.mostRecentProgram??"").trim():"",H=I.value.trim();if(H!==$)try{await Sc(y,H),_&&(_.mostRecentProgram=H),i&&(i.className="studio-banner studio-banner--ok",i.textContent=`Saved most recent program for ${y}.`)}catch(R){I.value=$,i&&(i.className="studio-banner studio-banner--error",i.textContent=R instanceof Error?R.message:String(R))}})}),s.querySelectorAll(".studio-artist-email-btn").forEach(I=>{I.addEventListener("click",()=>{if(!r)return;const y=I.getAttribute("data-id"),_=d.find($=>String($.id)===String(y));_&&br(_,{onSent:g})})}))},C=()=>{if(!s)return;const I=(o instanceof HTMLInputElement?o.value:"").trim().toLowerCase(),y=e.querySelector("#studio-artists-filter-visibility"),_=y instanceof HTMLSelectElement?String(y.value||"").trim():"",$=d.filter(x=>p==="featurable"&&!x.featurable||p==="featured"&&!x.featured||_&&Ts(x.visibility)!==_?!1:I?`${x.slug} ${x.id} ${x.contactEmail??""} ${x.visibility} ${x.featuredOrder} ${x.mostRecentProgram??""}`.toLowerCase().includes(I):!0);if(n){const x=!!_;n.textContent=String(I||p!=="all"||x?$.length:d.length)}if(!$.length){s.innerHTML=`<tr><td colspan="12">${d.length?"No rows match filters.":"No artists."}</td></tr>`;return}const H="Email (requires Edit permission for Artists in Studio → Permissions)",R=r?"":" disabled";s.innerHTML=$.map(x=>{const q=String(x.slug||""),X=U(q),ot=String(x.contactEmail??"").trim(),Lt=ot.toLowerCase().includes("@")?" studio-artist-email-btn--has-email":"",bt=r?ot||"No contact email on file — open to compose a draft":H,wt=x.imported?"Yes":"—",_t=x.accessCode?U(String(x.accessCode)):"—",At=U(String(x.id||"")),nt=U(String(x.mostRecentProgram??"")),dt=x.featured===!0?"checked":"",yt=x.featurable===!0?"checked":"",K=Ea(x),et=Rr(K.status),Y=Ur(K);return`<tr>
                <td class="studio-td-ready"><span class="studio-user-sub-dot ${et} studio-artist-ready-dot" data-artist-id="${At}" title="${U(Y)}" aria-label="${U(Y)}"></span></td>
                <td>${X}</td>
                <td>${At}</td>
                <td class="studio-td-actions studio-td-email">
                  <button type="button" class="studio-btn-ghost studio-artist-email-btn${Lt}" data-id="${At}"${R} title="${U(bt)}" aria-label="Email artist">Email</button>
                </td>
                <td>${wt}</td>
                <td><code class="studio-code-inline">${_t}</code></td>
                <td>${wo(x.visibility)}</td>
                <td class="studio-td-cb"><input type="checkbox" class="studio-art-featured-cb" data-id="${At}" ${dt} aria-label="Featured" /></td>
                <td class="studio-td-cb"><input type="checkbox" class="studio-art-featurable-cb" data-id="${At}" ${yt} aria-label="Featurable for random" /></td>
                <td><input type="text" class="studio-input studio-art-mrp" data-id="${At}" value="${nt}" placeholder="Program id" aria-label="Most recent program" /></td>
                <td><a class="studio-action-link" href="/profile/${encodeURIComponent(q)}" target="_blank" rel="noopener">Open profile</a></td>
                <td class="studio-td-actions"><button type="button" class="studio-btn-ghost studio-art-manage" data-id="${At}">MANAGE</button></td>
            </tr>`}).join(""),b(),m($)},w=e.querySelector("#studio-artist-manage-surface"),L=e.querySelector("#studio-artists-list-surface"),A=I=>{w instanceof HTMLElement&&Br(I,g,w,L instanceof HTMLElement?L:null)},g=async()=>{i&&(i.textContent=`Data source: ${Ct()} — ${Ct()==="test"?"testData + Studio overlay (localStorage)":"canister (artists + featured strip state)"}`),d=await ke();const I=e.querySelector("#studio-artists-random-featured");if(I instanceof HTMLInputElement)if(Ct()==="test")I.checked=pi().randomFeatured;else try{const y=await oo();if(typeof y.getArtistFeaturedGalleryPublic=="function"){const _=await y.getArtistFeaturedGalleryPublic();I.checked=(_==null?void 0:_.randomFeatured)===!0}else I.checked=pi().randomFeatured}catch{I.checked=pi().randomFeatured}C()};(N=e.querySelector("#studio-artists-batch-json"))==null||N.addEventListener("change",async I=>{var $;const y=I.target,_=y instanceof HTMLInputElement?($=y.files)==null?void 0:$[0]:null;if(y instanceof HTMLInputElement&&(y.value=""),!(!_||!i)){i.className="studio-banner studio-banner--info",i.textContent="Importing…";try{const H=await _.text(),R=JSON.parse(H),x=await nd(R);i.className="studio-banner studio-banner--ok",i.textContent=`Imported ${x} artist record(s). Access codes were assigned where missing.`,await g()}catch(H){i.className="studio-banner studio-banner--error",i.textContent=H instanceof Error?H.message:String(H)}}});const f=async(I,y,_={})=>{const $=_.hero===!0,H=_.firebaseGallery===!0;if(i){i.className="studio-banner studio-banner--info",i.textContent=`${I}…`;try{const R=await y();i.className="studio-banner studio-banner--ok",R>0?i.textContent=$?`${I}: cleared all profile hero images and set legacy CDN URLs for ${R} artist(s). Ensure files exist at cdn.fusionart.world/uploads/legacyProfiles/ if needed.`:`${I}: updated ${R} artist(s). Ensure files exist at cdn.fusionart.world/uploads/legacyProfiles/ if needed.`:i.textContent=$?`${I}: no artists in roster.`:H?`${I}: no artists had Firebase intro gallery URLs.`:`${I}: no artists needed updates (already have URLs or gallery).`,await g()}catch(R){i.className="studio-banner studio-banner--error",i.textContent=R instanceof Error?R.message:String(R)}}},v=I=>{var ot;const y=I==="hero",_=I==="firebase-gallery",$=y?"Sync Profile Images":_?"Migrate Firebase Gallery":"Sync Gallery",H=y?"This clears every artist’s profile hero image, then sets each to the legacy CDN URL below (all roster artists). Matching files should exist on the CDN (or URLs will 404 until uploaded). Temporary tool — see docs/delete-later.md.":_?"One-off migration: for each artist whose English intro gallery has any Firebase Storage URL, replace all three intro slots (EN and JA) with the legacy CDN URLs below. Artists with S3/CDN or empty galleries are unchanged. Run once on live, then remove this button when done — see docs/delete-later.md.":"This fills English and Japanese intro gallery slots when all three slots have no image URL. Matching files should exist on the CDN (or URLs will 404 until uploaded).",R=y?`<p class="studio-muted" style="margin:0 0 0.5rem"><strong>URL format</strong> — one file per artist:</p>
<pre class="studio-code-block" style="margin:0 0 0.75rem;white-space:pre-wrap;word-break:break-all">${U(`${_s}<stem>-hero.jpg`)}</pre>
<p class="studio-muted" style="margin:0"><strong>&lt;stem&gt;</strong> is derived from <code>locales.en.name</code> (first word + last word, hyphenated, lowercased) or from the artist <code>slug</code> if there is no name. Example: <code>hannah-webb-hero.jpg</code>.</p>`:`<p class="studio-muted" style="margin:0 0 0.5rem"><strong>URL format</strong> — three files per artist (slots 0–2):</p>
<pre class="studio-code-block" style="margin:0 0 0.75rem;white-space:pre-wrap;word-break:break-all">${U(`${_s}<stem>-intro-0.jpg
${_s}<stem>-intro-1.jpg
${_s}<stem>-intro-2.jpg`)}</pre>
<p class="studio-muted" style="margin:0"><strong>&lt;stem&gt;</strong> uses the same rules as profile images. Example: <code>hiyori-kanazawa-intro-0.jpg</code>.</p>`,x=`<p style="margin:0 0 0.85rem">${U(H)}</p>
${R}
<div class="studio-modal-actions" style="margin-top:1rem;padding-top:0.75rem;border-top:1px solid #e2e8f0">
<button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Cancel</button>
<button type="button" class="studio-btn-primary" id="studio-legacy-sync-confirm">Confirm</button>
</div>`,{close:q,root:X}=qt(x,{title:`Confirm: ${$}`,compact:!0});(ot=X.querySelector("#studio-legacy-sync-confirm"))==null||ot.addEventListener("click",()=>{q(),f($,y?wc:_?Ec:Lc,y?{hero:!0}:_?{firebaseGallery:!0}:{})})};(O=e.querySelector("#studio-artists-sync-hero"))==null||O.addEventListener("click",()=>{v("hero")}),(G=e.querySelector("#studio-artists-approve-all-profile-images"))==null||G.addEventListener("click",async()=>{if(confirm(`Approve profile images for every artist in the roster?

Cards and program pages will show headshots when approved (Profile toggle on /artists feed, or on program confirmed strips). Artists without a headshot URL still show artwork until one is set in Manage.`)&&i){i.className="studio-banner studio-banner--info",i.textContent="Approving profile images…";try{const I=await ad();i.className="studio-banner studio-banner--ok",i.textContent=I>0?`Approved profile images for ${I} artist(s).`:"No artists in roster.",await g()}catch(I){i.className="studio-banner studio-banner--error",i.textContent=I instanceof Error?I.message:String(I)}}}),(V=e.querySelector("#studio-artists-sync-gallery"))==null||V.addEventListener("click",()=>{v("gallery")}),(at=e.querySelector("#studio-artists-migrate-firebase-gallery"))==null||at.addEventListener("click",()=>{v("firebase-gallery")}),(tt=e.querySelector("#studio-artists-gen-invite"))==null||tt.addEventListener("click",async()=>{try{const I=await Zi({artist:null});await Eo(I,"Artist-role invite for new members without a roster row. For claiming an existing imported profile, set the 8-digit code on the artist row in Manage instead.")}catch(I){alert(I instanceof Error?I.message:String(I))}});const E=e.querySelector("#studio-artists-shout-fields"),j=e.querySelector("#studio-artists-shout-save"),M=e.querySelector("#studio-artists-shout-msg"),S=(I,y)=>{if(M instanceof HTMLElement){if(!y){M.style.display="none",M.textContent="";return}M.style.display="block",M.className=`studio-banner studio-banner--${I}`,M.textContent=y}},h=async()=>{if(!E)return;const I=await Gs("artists-page",{forStudio:!0}),y=I&&typeof I=="object"?I:{en:{},ja:{}},_=y.en&&typeof y.en=="object"?y.en:{},$=y.ja&&typeof y.ja=="object"?y.ja:{},H=typeof _.shoutText=="string"?String(_.shoutText).replace(/\r\n/g,`
`):cn(String(_.shoutHtml??"")),R=typeof $.shoutText=="string"?String($.shoutText).replace(/\r\n/g,`
`):cn(String($.shoutHtml??""));E.replaceChildren(),wr(E,"artists-page",{path:"en.shoutText",label:"Shout headline",value:H},{path:"ja.shoutText",label:"Shout headline",value:R},{markDirty:()=>{},translateEnToJa:x=>xe(x)})};j==null||j.addEventListener("click",async()=>{if(!(E instanceof HTMLElement))return;const I=E.querySelector('[data-path="en.shoutText"]'),y=E.querySelector('[data-path="ja.shoutText"]'),_=I instanceof HTMLTextAreaElement?I.value:"",$=y instanceof HTMLTextAreaElement?y.value:"";j instanceof HTMLButtonElement&&(j.disabled=!0),S("info","Saving…");try{await Di("artists-page",{en:{shoutText:_},ja:{shoutText:$}}),S("ok","Saved. Public /artists page will pick up changes after refresh or navigation.")}catch(H){S("error",H instanceof Error?H.message:String(H))}finally{j instanceof HTMLButtonElement&&(j.disabled=!1)}}),await h(),o==null||o.addEventListener("input",()=>C()),(z=e.querySelector("#studio-artists-filter-visibility"))==null||z.addEventListener("change",()=>C()),e.querySelectorAll(".studio-artists-filter").forEach(I=>{I.addEventListener("click",()=>{const y=I.getAttribute("data-filter");p=y==="featurable"||y==="featured"?y:"all",e.querySelectorAll(".studio-artists-filter").forEach(_=>{_.classList.toggle("is-active",_.getAttribute("data-filter")===p)}),C()})}),(F=e.querySelector("#studio-artists-random-featured"))==null||F.addEventListener("change",async I=>{const y=I.target;if(y instanceof HTMLInputElement)try{await rd(y.checked),i&&(i.className="studio-banner studio-banner--ok",i.textContent=y.checked?`Random featured: up to ${Ya} featurable artists per home load.`:"Manual featured list drives the home strip (max 8).")}catch(_){y.checked=!y.checked,i&&(i.className="studio-banner studio-banner--error",i.textContent=_ instanceof Error?_.message:String(_))}}),mf(e,g);const T=e.querySelector("#studio-artists-send-blast-open");if(T instanceof HTMLButtonElement&&r){const I=()=>{const y=Ct()==="live";T.disabled=!y,T.title=y?"":"Requires live data and Integration API (set Studio → Services)."};I(),window.addEventListener("fusion-data-source-change",I),T.addEventListener("click",()=>{if(r){if(Ct()!=="live"){alert("Send blast uses the Integration API (Resend) and canister roster data. Switch Studio data source to Live and set Integration API URL + key under Studio → Services, then try again.");return}dp({getArtistsRows:ke,onRefresh:g})}})}await g()}async function Cf(e){const s=e.querySelector("#studio-pending-approval-tbody"),i=e.querySelector("#studio-pending-approval-search"),o=e.querySelector("#studio-pending-approval-header-count"),n=e.querySelector("#studio-pending-manage-surface"),a=e.querySelector("#studio-pending-list-surface"),r=Jt("pending-approval");if(!r.visible){s&&(s.innerHTML='<tr><td colspan="6"><p class="studio-banner studio-banner--warn">You do not have access to this section.</p></td></tr>');return}const l=r.canEdit,d=Jt("artists").canEdit,p="Email (requires Edit permission for Artists in Studio → Permissions)",u=d?"":" disabled",c=l?"":" disabled",m=l?"":' title="Requires Edit permission for Status"';let b=[];const C=async()=>{b=(await ke()).filter(A=>{const g=Ts(A.visibility);return g==="pending"||g==="inactive"}),w()},w=()=>{if(!s)return;const L=(i instanceof HTMLInputElement?i.value:"").trim().toLowerCase(),A=b.filter(g=>L?`${g.slug} ${g.id} ${g.contactEmail??""}`.toLowerCase().includes(L):!0);if(o&&(o.textContent=String(A.length)),!A.length){s.innerHTML=`<tr><td colspan="6">${b.length?"No rows match search.":"No artists currently in pending or inactive state."}</td></tr>`;return}s.innerHTML=A.map(g=>{const f=String(g.slug||""),v=U(f),E=String(g.contactEmail??"").trim(),M=E.toLowerCase().includes("@")?" studio-artist-email-btn--has-email":"",S=d?E||"No contact email on file — open to compose a draft":p,h=U(String(g.id||""));return`<tr>
                <td>${v}</td>
                <td>${h}</td>
                <td class="studio-td-actions studio-td-email">
                  <button type="button" class="studio-btn-ghost studio-artist-email-btn${M}" data-id="${h}"${u} title="${U(S)}" aria-label="Email artist">Email</button>
                </td>
                <td>${wo(g.visibility)}</td>
                <td><a class="studio-action-link" href="/profile/${encodeURIComponent(f)}" target="_blank" rel="noopener">Open profile</a></td>
                <td class="studio-td-actions"><button type="button" class="studio-btn-ghost studio-art-pending-manage" data-id="${h}"${c}${m}>MANAGE</button></td>
            </tr>`}).join(""),s.querySelectorAll(".studio-artist-email-btn").forEach(g=>{g.addEventListener("click",()=>{if(!d)return;const f=g.getAttribute("data-id"),v=b.find(E=>String(E.id)===String(f));v&&br(v,{onSent:C})})}),s.querySelectorAll(".studio-art-pending-manage").forEach(g=>{g.addEventListener("click",()=>{if(!l)return;const f=g.getAttribute("data-id"),v=b.find(E=>String(E.id)===String(f));if(v){if(!(n instanceof HTMLElement))return;Br(v,C,n,a instanceof HTMLElement?a:null)}})})};i==null||i.addEventListener("input",()=>w()),await C()}function Lo(e,s){var c,m,b,C;const i=e.querySelector(s.embedEditor),o=e.querySelector(s.embedFields),n=e.querySelector(s.embedTitle),a=e.querySelector(s.embedUnsaved),r=e.querySelector(s.embedMsg);let l=null;const d=(w,L)=>{r&&(r.style.display=L?"block":"none",r.className=`studio-banner studio-banner--${w}`,r.textContent=L)},p=w=>{a&&(a.style.display=w?"block":"none")},u=async(w,L,A)=>{l=w,i&&(i.style.display="block"),n&&(n.textContent=A),d("info",""),p(!1),o&&(await yo(o,w,{markDirty:()=>p(!0)},{chapterId:L}),p(!1),i==null||i.scrollIntoView({behavior:"smooth"}))};(c=e.querySelector(s.btnBlock))==null||c.addEventListener("click",()=>u(s.slugBlock,void 0,s.titleBlock)),(m=e.querySelector(s.btnSiteInfo))==null||m.addEventListener("click",()=>u("site-info",s.siteInfoChapter,s.titleSiteInfo)),o&&vo(o,{markDirty:()=>p(!0),showMsg:d,uploadArea:s.uploadArea}),(b=e.querySelector(s.btnSave))==null||b.addEventListener("click",async()=>{if(!(!l||!o))try{await ho(l,o),d("ok","Saved."),p(!1)}catch(w){d("error",w instanceof Error?w.message:String(w))}}),(C=e.querySelector(s.btnCancel))==null||C.addEventListener("click",()=>{i&&(i.style.display="none"),l=null,p(!1),d("info","")})}async function Mf(e){var u,c,m,b,C;const s=e.querySelector("#studio-programs-tbody"),i=e.querySelector("#studio-programs-banner"),o=e.querySelector("#studio-programs-search"),n=e.querySelector("#studio-programs-header-count");let a=[];const r=(w,L)=>{i&&(i.style.display=L?"block":"none",i.className=`studio-banner studio-banner--${w}`,i.textContent=L)};async function l(){if(!s)return;s.innerHTML='<tr><td colspan="8">Loading…</td></tr>';const w=e.querySelector("#studio-programs-current-season");let L="";try{L=await Ad()}catch{L=""}w instanceof HTMLInputElement&&(w.value=L),a=await We(),d()}function d(){if(!s)return;const w=(o instanceof HTMLInputElement?o.value:"").trim().toLowerCase(),L=a.filter(A=>{if(!w)return!0;const g=ka(A);return`${A.id} ${g.focus} ${g.location} ${g.year} ${A.routeLink??""} ${A.studioStatus??""}`.toLowerCase().includes(w)});if(n&&(n.textContent=String(w?L.length:a.length)),!L.length){s.innerHTML=`<tr><td colspan="8">${a.length?"No rows match search.":"No programs. Add one or switch data source."}</td></tr>`;return}s.innerHTML=L.map(A=>{const g=ka(A),f=A.studioStatus??"",v=g.accepting?"Yes":"—";return`<tr>
                <td>${U(String(A.id??""))}</td>
                <td>${U(String(g.focus||"—"))}</td>
                <td>${U(String(g.location||"—"))}</td>
                <td>${U(String(g.year||"—"))}</td>
                <td>${U(v)}</td>
                <td>${U(String(A.routeLink??""))}</td>
                <td>${U(String(f||"—"))}</td>
                <td class="studio-td-actions">
                  <button type="button" class="studio-btn-ghost studio-prog-view" data-id="${U(String(A.id))}">PREVIEW</button>
                  <button type="button" class="studio-btn-ghost studio-prog-edit" data-id="${U(String(A.id))}">MANAGE</button>
                  <button type="button" class="studio-btn-ghost studio-prog-del" data-id="${U(String(A.id))}">DELETE</button>
                </td>
            </tr>`}).join(""),s.querySelectorAll(".studio-prog-view").forEach(A=>{A.addEventListener("click",async()=>{const g=A.getAttribute("data-id"),f=a.find(T=>String(T.id)===String(g)),v=(f==null?void 0:f.routeLink)||"";if(!v)return;const E=un(f==null?void 0:f.visibility);if(E==="none"){alert('Preview is not available when visibility is "none". Set visibility to public or private.');return}let j=v;try{j=new URL(v,window.location.origin).pathname}catch{}const S=(j.startsWith("/programs/")?`/program/${j.slice(10)}`:j).split("/").filter(Boolean),h=S[0]==="program"&&S[1]&&S[1]!=="private"?S[1]:"";if(E==="private"&&h){window.open(`${window.location.origin}/program/private/${encodeURIComponent(h)}`,"_blank","noopener");return}window.open(`${window.location.origin}${v.startsWith("/")?v:`/${v}`}`,"_blank","noopener")})}),s.querySelectorAll(".studio-prog-edit").forEach(A=>{A.addEventListener("click",async()=>{const g=A.getAttribute("data-id"),f=await xa(g||"");p(f,l)})}),s.querySelectorAll(".studio-prog-del").forEach(A=>{A.addEventListener("click",async()=>{const g=A.getAttribute("data-id");if(!(!g||!confirm(`Delete program ${g}?`)))try{await kd(g),r("ok","Deleted."),await l()}catch(f){r("error",f instanceof Error?f.message:String(f))}})})}const p=(w,L)=>{var z;const A=w||{id:"",routeLink:"",featuredOrder:0,visibility:"public",studioStatus:"open",depositAmountDisplay:"",localesJson:'{"en":{},"ja":{}}'};let g=A.localesJson;if(!g&&(A.enCard||A.jaCard)&&(g=JSON.stringify({en:A.enCard||{},ja:A.jaCard||{}},null,2)),!g){const{_source:F,enCard:I,jaCard:y,..._}=A;g=JSON.stringify({en:I||_,ja:y||{}},null,2)}g||(g="{}");let f={},v={};try{const F=typeof g=="string"?JSON.parse(g):g;F!=null&&F.en&&typeof F.en=="object"&&!Array.isArray(F.en)&&(f=F.en),F!=null&&F.ja&&typeof F.ja=="object"&&!Array.isArray(F.ja)&&(v=F.ja)}catch{}const E=_e("program-hero","routeLink"),j=_e("all-programs","programs.en.0.imageSrc"),M=_d(U,f,v),S=un(A.visibility),h=["public","private","none"].map(F=>`<option value="${F}" ${S===F?"selected":""}>${U(F)}</option>`).join(""),T=["open","full","active","completed","comingUp"].map(F=>`<option value="${F}" ${String(A.studioStatus)===F?"selected":""}>${U(F)}</option>`).join(""),N=Im({escapeHtml:U,existing:!!w,p:A,visOptions:h,studioStatusOptions:T,routeLinkKind:E,routeLinkKindLabel:qe(E),cardImgKind:j,cardImgKindLabel:qe(j),panelsHtml:M}),{close:O,root:G}=qt(N,{title:w?"Edit Program":"Add Program",subtitle:"Manage program content and settings",panelClass:"studio-modal-panel studio-modal-panel--program-editor",bodyClass:"studio-modal-body--program-editor",headerClass:"studio-modal-header--program-editor",footerHtml:jm(!!w)}),V=G.querySelector(".studio-prog-locale-form"),at=F=>{const I=G.querySelector("#studio-prog-modal-status");I&&(I.textContent=F||"",I.classList.toggle("studio-sr-only",!F))},tt=Hm(G,{onCancel:O,routeLinkSeed:String(A.routeLink||"")});$d(G,Cd(f,v),U),Md(G,xe,{setStatus:at}),xd(V),G.querySelectorAll("input.studio-prog-cover-file[data-upload-target-locale]").forEach(F=>{F.addEventListener("change",async I=>{var R;const y=I.target,_=y&&"files"in y?(R=y.files)==null?void 0:R[0]:null;if(!_||!V)return;const $=y.getAttribute("data-upload-target-locale")||"en",H=V.querySelector(`[data-prog-path="imageSrc"][data-prog-locale="${$}"]`);try{await Gt(_,H instanceof HTMLInputElement?H:null,{area:"studio/programs",entityType:"program",entityId:String(A.id||""),fieldKey:`card-image-${$}`})}catch(x){const q=x instanceof Error?x.message:String(x);alert(`${q}

Configure S3 presign under Studio → Services.`)}y.value=""})}),G.querySelectorAll("input.studio-prog-fade-file[data-fade-slot]").forEach(F=>{F.addEventListener("change",async I=>{var R;const y=I.target,_=y&&"files"in y?(R=y.files)==null?void 0:R[0]:null;if(!_||!V)return;const $=y.getAttribute("data-fade-slot")||"0",H=V.querySelector(`.studio-prog-fade-url[data-fade-slot="${$}"]`);try{await Gt(_,H instanceof HTMLInputElement?H:null,{area:"studio/programs",entityType:"program",entityId:String(A.id||""),fieldKey:`fade-gallery-${$}`}),H instanceof HTMLInputElement&&H.dispatchEvent(new Event("input",{bubbles:!0}))}catch(x){const q=x instanceof Error?x.message:String(x);alert(`${q}

Configure S3 presign under Studio → Services.`)}y.value=""})}),G.querySelectorAll("input.studio-prog-strip-file[data-strip-slot]").forEach(F=>{F.addEventListener("change",async I=>{var R;const y=I.target,_=y&&"files"in y?(R=y.files)==null?void 0:R[0]:null;if(!_||!V)return;const $=y.getAttribute("data-strip-slot")||"0",H=V.querySelector(`.studio-prog-strip-url[data-strip-slot="${$}"]`);try{await Gt(_,H instanceof HTMLInputElement?H:null,{area:"studio/programs",entityType:"program",entityId:String(A.id||""),fieldKey:`strip-gallery-${$}`}),H instanceof HTMLInputElement&&H.dispatchEvent(new Event("input",{bubbles:!0}))}catch(x){const q=x instanceof Error?x.message:String(x);alert(`${q}

Configure S3 presign under Studio → Services.`)}y.value=""})}),(z=G.querySelector("#studio-prog-form"))==null||z.addEventListener("submit",async F=>{F.preventDefault();const I=new FormData(F.target);if(!V)return;const y=String(I.get("depositAmountDisplay")||"").trim();let _,$;try{({en:_,ja:$}=Id(V))}catch(x){alert(x instanceof Error?x.message:String(x));return}const H=x=>{if(!x||typeof x!="object"||!y)return;const q=x;q.programPage||(q.programPage={});const X=q.programPage;typeof X!="object"||!X||(X.applicationForm||(X.applicationForm={}),X.applicationForm.depositAmountDisplay=y)};H(_),H($);const R=JSON.stringify({en:_,ja:$});try{await Ia({id:String(I.get("id")||""),routeLink:String(I.get("routeLink")||""),featuredOrder:Number(I.get("featuredOrder")||0),visibility:String(I.get("visibility")||""),studioStatus:String(I.get("studioStatus")||"open"),depositAmountDisplay:y,localesJson:R}),tt==null||tt.markSaved(),O(),L()}catch(x){alert(x instanceof Error?x.message:String(x))}})};(u=e.querySelector("#studio-programs-batch-json"))==null||u.addEventListener("change",async w=>{var g;const L=w.target,A=L instanceof HTMLInputElement?(g=L.files)==null?void 0:g[0]:null;if(L instanceof HTMLInputElement&&(L.value=""),!!A)try{const f=await A.text(),v=JSON.parse(f),E=await ld(v);r("ok",`Imported ${E} program record(s).`),await l()}catch(f){r("error",f instanceof Error?f.message:String(f))}}),(c=e.querySelector("#studio-programs-current-season-save"))==null||c.addEventListener("click",async()=>{const w=e.querySelector("#studio-programs-current-season");if(w instanceof HTMLInputElement)try{await dd(w.value),r("ok","Current season saved.")}catch(L){r("error",L instanceof Error?L.message:String(L))}}),(m=e.querySelector("#studio-program-add"))==null||m.addEventListener("click",()=>p(null,l)),(b=e.querySelector("#studio-programs-refresh"))==null||b.addEventListener("click",()=>l()),(C=e.querySelector("#studio-programs-search"))==null||C.addEventListener("input",()=>d()),Lo(e,{embedEditor:"#studio-programs-embed-editor",embedFields:"#studio-programs-embed-fields",embedTitle:"#studio-programs-embed-title",embedUnsaved:"#studio-programs-embed-unsaved",embedMsg:"#studio-programs-embed-msg",btnSave:"#studio-programs-embed-save",btnCancel:"#studio-programs-embed-cancel",btnBlock:"#studio-programs-edit-block",btnSiteInfo:"#studio-programs-edit-siteinfo",slugBlock:"all-programs",siteInfoChapter:"programs",titleBlock:"Edit: Programs block",titleSiteInfo:"Edit: Programs page headline (site-info)",uploadArea:"studio/programs-content"}),await l()}async function xf(e){var u,c,m;const s=e.querySelector("#studio-products-tbody"),i=e.querySelector("#studio-products-banner"),o=e.querySelector("#studio-products-search"),n=e.querySelector("#studio-products-header-count");let a=[];const r=(b,C)=>{i&&(i.style.display=C?"block":"none",i.className=`studio-banner studio-banner--${b}`,i.textContent=C)};async function l(){s&&(s.innerHTML='<tr><td colspan="7">Loading…</td></tr>',a=await jd(),d())}function d(){if(!s)return;const b=(o instanceof HTMLInputElement?o.value:"").trim().toLowerCase(),C=a.filter(w=>{var f,v;if(!b)return!0;const L=((f=w.en)==null?void 0:f.title)??w.title??"",A=((v=w.ja)==null?void 0:v.title)??"";return`${w.id} ${L} ${A} ${w.href} ${w.productStatus} ${w.imageSrc??""}`.toLowerCase().includes(b)});if(n&&(n.textContent=String(b?C.length:a.length)),!C.length){s.innerHTML=`<tr><td colspan="7">${a.length?"No rows match search.":"No editions."}</td></tr>`;return}s.innerHTML=C.map(w=>{var v,E;const L=((v=w.en)==null?void 0:v.title)??w.title??"",A=((E=w.ja)==null?void 0:E.title)??"",g=w.productStatus??"",f=String(w.imageSrc??"").slice(0,36);return`<tr>
                <td><code class="studio-code-inline">${U(String(w.id||""))}</code></td>
                <td>${U(String(L))}</td>
                <td>${U(String(A))}</td>
                <td>${U(String(w.href||""))}</td>
                <td>${U(String(g||"—"))}</td>
                <td><span class="studio-muted" title="${U(String(w.imageSrc??""))}">${U(f||"—")}${String(w.imageSrc??"").length>36?"…":""}</td>
                <td class="studio-td-actions">
                  <button type="button" class="studio-btn-ghost studio-ed-edit" data-id="${U(String(w.id||""))}">MANAGE</button>
                  <button type="button" class="studio-btn-ghost studio-ed-del" data-id="${U(String(w.id||""))}">DELETE</button>
                </td>
            </tr>`}).join(""),s.querySelectorAll(".studio-ed-edit").forEach(w=>{w.addEventListener("click",async()=>{const L=w.getAttribute("data-id"),A=a.find(g=>String(g.id)===String(L));p(A,l)})}),s.querySelectorAll(".studio-ed-del").forEach(w=>{w.addEventListener("click",async()=>{const L=w.getAttribute("data-id");if(!(!L||!confirm(`Delete edition ${L}?`)))try{await Hd(L),r("ok","Deleted."),await l()}catch(A){r("error",A instanceof Error?A.message:String(A))}})})}const p=(b,C)=>{var N,O,G,V,at,tt;const w=b||{id:`ed_${Date.now()}`,href:"/objects",productStatus:"active",imageSrc:"",en:{},ja:{}};let L={imageSrc:w.imageSrc||"",en:w.en||{},ja:w.ja||{}};if(w.localesJson)try{L={...L,...JSON.parse(String(w.localesJson))}}catch{}const A=zn(L.en),g=zn(L.ja),f=String(L.imageSrc??""),v=_e("editions-feed","href"),E=_e("editions-feed","items.0.imageSrc"),j=`
          <form id="studio-ed-form" class="studio-modal-form">
            <div class="studio-modal-fields-row">
            <label class="studio-field"><span>ID</span><input name="id" required class="studio-input" value="${U(String(w.id))}" ${b?"readonly":""} /></label>
            <label class="studio-field"><span>href <span class="studio-field-kind-badge studio-field-kind-badge--${v}">${U(qe(v))}</span></span><input name="href" class="studio-input" value="${U(String(w.href||""))}" /></label>
            <label class="studio-field"><span>productStatus</span>
              <select name="productStatus" class="studio-select">
                ${["active","sold_out","draft"].map(z=>`<option value="${z}" ${String(w.productStatus)===z?"selected":""}>${U(z)}</option>`).join("")}
              </select>
            </label>
            <label class="studio-field studio-field--grow"><span>imageSrc <span class="studio-field-kind-badge studio-field-kind-badge--${E}">${U(qe(E))}</span></span><input name="imageSrc" id="studio-ed-img" class="studio-input" value="${U(f)}" placeholder="Asset path or URL" /></label>
            <label class="studio-file-label studio-btn-ghost studio-field--shrink">
                <input type="file" id="studio-ed-img-file" accept="image/*,video/*,.pdf" class="studio-file-input" />
                Upload to storage
            </label>
            </div>
            <details class="studio-prog-details" open>
              <summary class="studio-prog-subhead">Locale title &amp; alt</summary>
              <p class="studio-modal-hint">Merged into saved JSON with the locale blobs below.</p>
              <div class="studio-modal-fields-row">
                <label class="studio-field"><span>EN title</span><input type="text" id="studio-ed-q-en-title" class="studio-input" value="${U(String(((N=L.en)==null?void 0:N.title)??""))}" autocomplete="off" /></label>
                <label class="studio-field"><span>JA title</span><input type="text" id="studio-ed-q-ja-title" class="studio-input" value="${U(String(((O=L.ja)==null?void 0:O.title)??""))}" autocomplete="off" /></label>
                <label class="studio-field"><span>EN alt</span><input type="text" id="studio-ed-q-en-alt" class="studio-input" value="${U(String(((G=L.en)==null?void 0:G.alt)??""))}" autocomplete="off" /></label>
                <label class="studio-field"><span>JA alt</span><input type="text" id="studio-ed-q-ja-alt" class="studio-input" value="${U(String(((V=L.ja)==null?void 0:V.alt)??""))}" autocomplete="off" /></label>
              </div>
            </details>
            <div class="studio-locale-split">
              <label class="studio-field studio-field--stack">
                <span class="studio-locale-label">English</span>
                <textarea id="studio-ed-en" class="studio-textarea studio-textarea--locale" rows="14" spellcheck="false"></textarea>
              </label>
              <label class="studio-field studio-field--stack">
                <span class="studio-locale-label">日本語</span>
                <textarea id="studio-ed-ja" class="studio-textarea studio-textarea--locale" rows="14" spellcheck="false"></textarea>
              </label>
            </div>
            <div class="studio-modal-actions">
              <button type="submit" class="studio-btn-primary">Save edition</button>
            </div>
          </form>`,{close:M,root:S}=qt(j,{title:b?"Edit edition":"Add edition",wide:!0}),h=S.querySelector("#studio-ed-en"),T=S.querySelector("#studio-ed-ja");h&&(h.value=A),T&&(T.value=g),(at=S.querySelector("#studio-ed-img-file"))==null||at.addEventListener("change",async z=>{var y;const F=z.target,I=F&&"files"in F?(y=F.files)==null?void 0:y[0]:null;if(I){try{await Gt(I,S.querySelector("#studio-ed-img"),{area:"studio/editions",entityType:"edition",entityId:String(w.id||""),fieldKey:"image"})}catch(_){const $=_ instanceof Error?_.message:String(_);alert(`${$}

Configure S3 presign under Studio → Services.`)}F.value=""}}),(tt=S.querySelector("#studio-ed-form"))==null||tt.addEventListener("submit",async z=>{z.preventDefault();const F=new FormData(z.target);let I=Qn(h==null?void 0:h.value,"edition"),y=Qn(T==null?void 0:T.value,"edition");const _=S.querySelector("#studio-ed-q-en-title"),$=S.querySelector("#studio-ed-q-ja-title"),H=S.querySelector("#studio-ed-q-en-alt"),R=S.querySelector("#studio-ed-q-ja-alt");_ instanceof HTMLInputElement&&$ instanceof HTMLInputElement&&H instanceof HTMLInputElement&&R instanceof HTMLInputElement&&(I={...I,title:_.value,alt:H.value},y={...y,title:$.value,alt:R.value});const x=JSON.stringify({imageSrc:String(F.get("imageSrc")||""),en:I,ja:y});try{await qd({id:String(F.get("id")||""),href:String(F.get("href")||""),productStatus:String(F.get("productStatus")||"active"),localesJson:x}),M(),C()}catch(q){alert(q instanceof Error?q.message:String(q))}})};(u=e.querySelector("#studio-product-add"))==null||u.addEventListener("click",()=>p(null,l)),(c=e.querySelector("#studio-products-refresh"))==null||c.addEventListener("click",()=>l()),(m=e.querySelector("#studio-products-search"))==null||m.addEventListener("input",()=>d()),Lo(e,{embedEditor:"#studio-products-embed-editor",embedFields:"#studio-products-embed-fields",embedTitle:"#studio-products-embed-title",embedUnsaved:"#studio-products-embed-unsaved",embedMsg:"#studio-products-embed-msg",btnSave:"#studio-products-embed-save",btnCancel:"#studio-products-embed-cancel",btnBlock:"#studio-products-edit-grid",btnSiteInfo:"#studio-products-edit-siteinfo",slugBlock:"editions-feed",siteInfoChapter:"editions",titleBlock:"Edit: Editions grid",titleSiteInfo:"Edit: Editions page headline (site-info)",uploadArea:"studio/products-content"}),await l()}async function If(e){const s=e.querySelector("#studio-ga-subs-tbody"),i=e.querySelector("#studio-ga-artists-tbody"),o=Ct()==="test"?[]:await no().catch(()=>[]),n=(Array.isArray(o)?o:[]).filter(l=>{const d=cd(l.category||"");return/gallery/i.test(d)});s&&(s.innerHTML=n.length?n.map(l=>`<tr><td>${U(l.email)}</td><td>${U(l.category)}</td></tr>`).join(""):'<tr><td colspan="2">No gallery-category subscribers (or test mode / not admin).</td></tr>');const r=(await ao()).filter(l=>l.galleryFilter||l.gallery_filter);i&&(i.innerHTML=r.length?r.map(l=>{const d=l.galleryFilter||l.gallery_filter||{};return`<tr>
                        <td>${U(String(l.slug))}</td>
                        <td>${U(String(d.accessType||d.access_type||""))}</td>
                        <td>${U(String(d.season??""))}</td>
                    </tr>`}).join(""):'<tr><td colspan="3">No artists with galleryFilter set.</td></tr>')}async function jf(e){var l,d,p;const s=e.querySelector("#studio-sound-form"),i=e.querySelector("#studio-sound-msg"),o=(u,c)=>{i&&(i.style.display=c?"block":"none",i.className=`studio-banner studio-banner--${u}`,i.textContent=c)},n=async()=>{const u=e.querySelector("#studio-sound-learn-journal");if(!(u instanceof HTMLSelectElement))return;const m=['<option value="">(none)</option>',...(await to().catch(()=>[])).map(C=>{var A;const w=String((C==null?void 0:C.id)??""),L=((A=C==null?void 0:C.en)==null?void 0:A.title)??w;return`<option value="${U(w)}">${U(String(L))} (${U(w)})</option>`})],b=u.value;u.innerHTML=m.join(""),b&&(u.value=b)},a=u=>{const c=e.querySelector("#studio-sound-enabled");c instanceof HTMLInputElement&&(c.checked=!!u.enabled);const m=e.querySelector("#studio-sound-category");m instanceof HTMLInputElement&&(m.value=String(u.categoryLabel||""));const b=e.querySelector("#studio-sound-atmo-url");b instanceof HTMLInputElement&&(b.value=String(u.atmosphereAudioUrl||""));const C=e.querySelector("#studio-sound-voice-mode");C instanceof HTMLSelectElement&&(C.value=u.voiceSelectionMode==="manual"?"manual":"random");const w=e.querySelector("#studio-sound-artist"),L=(Array.isArray(u._artistsWithAudio)?u._artistsWithAudio:null)||[];if(w instanceof HTMLSelectElement){const h=u.voiceArtistId?String(u.voiceArtistId):"";w.innerHTML=['<option value="">—</option>',...L.map(T=>{var O,G;const N=String((T==null?void 0:T.id)??"");return`<option value="${U(N)}" ${N===h?"selected":""}>${U(String(((G=(O=T==null?void 0:T.locales)==null?void 0:O.en)==null?void 0:G.name)??(T==null?void 0:T.slug)??N))}</option>`})].join("")}const A=e.querySelector("#studio-sound-manual-voice-url");A instanceof HTMLInputElement&&(A.value=String(u.manualVoiceAudioUrl||""));const g=e.querySelector("#studio-sound-min-int");g instanceof HTMLInputElement&&(g.value=String(u.minIntervalSec??0));const f=e.querySelector("#studio-sound-max-int");f instanceof HTMLInputElement&&(f.value=String(u.maxIntervalSec??0));const v=e.querySelector("#studio-sound-vol-atmo");v instanceof HTMLInputElement&&(v.value=String(u.atmosphereVolumePercent??0));const E=e.querySelector("#studio-sound-vol-voice");E instanceof HTMLInputElement&&(E.value=String(u.voicesVolumePercent??0));const j=e.querySelector("#studio-sound-learn-journal");if(j instanceof HTMLSelectElement){const h=u.learnMoreJournalEntryId?String(u.learnMoreJournalEntryId):"";h&&(j.value=h)}const M=u.voiceSelectionMode==="manual"?"manual":"random",S=e.querySelector("#studio-sound-artist-wrap");S instanceof HTMLElement&&(S.style.display=M==="manual"?"":"none")},r=async()=>{const u=await Pd(),c=(await ao().catch(()=>[])).filter(C=>String((C==null?void 0:C.audioUrl)??"").trim()),m={...u,_artistsWithAudio:c};await n();const b=e.querySelector("#studio-sound-learn-journal");b instanceof HTMLSelectElement&&u.learnMoreJournalEntryId&&(b.value=String(u.learnMoreJournalEntryId)),a(m)};(l=e.querySelector("#studio-sound-voice-mode"))==null||l.addEventListener("change",u=>{const c=u.target,m=c instanceof HTMLSelectElement?c.value:"random",b=e.querySelector("#studio-sound-artist-wrap");b instanceof HTMLElement&&(b.style.display=m==="manual"?"":"none")}),(d=e.querySelector("#studio-sound-atmo-file"))==null||d.addEventListener("change",async u=>{var b;const c=u.target,m=c&&"files"in c?(b=c.files)==null?void 0:b[0]:null;if(m){try{await Gt(m,e.querySelector("#studio-sound-atmo-url"),{area:"studio/sound",entityType:"site",entityId:"sound-environment",fieldKey:"atmosphere"})}catch(C){alert(C instanceof Error?C.message:String(C))}c.value=""}}),(p=e.querySelector("#studio-sound-voice-file"))==null||p.addEventListener("change",async u=>{var b;const c=u.target,m=c&&"files"in c?(b=c.files)==null?void 0:b[0]:null;if(m){try{await Gt(m,e.querySelector("#studio-sound-manual-voice-url"),{area:"studio/sound",entityType:"site",entityId:"sound-environment",fieldKey:"manual-voice"})}catch(C){alert(C instanceof Error?C.message:String(C))}c.value=""}}),s==null||s.addEventListener("submit",async u=>{u.preventDefault();const c=e.querySelector("#studio-sound-enabled"),m=e.querySelector("#studio-sound-category"),b=e.querySelector("#studio-sound-atmo-url"),C=e.querySelector("#studio-sound-voice-mode"),w=e.querySelector("#studio-sound-artist"),L=e.querySelector("#studio-sound-manual-voice-url"),A=e.querySelector("#studio-sound-min-int"),g=e.querySelector("#studio-sound-max-int"),f=e.querySelector("#studio-sound-vol-atmo"),v=e.querySelector("#studio-sound-vol-voice"),E=e.querySelector("#studio-sound-learn-journal"),j={enabled:c instanceof HTMLInputElement&&c.checked,categoryLabel:m instanceof HTMLInputElement?m.value:"",atmosphereAudioUrl:b instanceof HTMLInputElement?b.value:"",voiceSelectionMode:C instanceof HTMLSelectElement?C.value:"random",voiceArtistId:w instanceof HTMLSelectElement&&w.value?w.value:void 0,manualVoiceAudioUrl:L instanceof HTMLInputElement?L.value:"",minIntervalSec:A instanceof HTMLInputElement?Number(A.value):0,maxIntervalSec:g instanceof HTMLInputElement?Number(g.value):0,atmosphereVolumePercent:f instanceof HTMLInputElement?Number(f.value):0,voicesVolumePercent:v instanceof HTMLInputElement?Number(v.value):0,learnMoreJournalEntryId:E instanceof HTMLSelectElement&&E.value?E.value:void 0};try{await ud(j),o("ok","Sound settings saved.")}catch(M){o("error",M instanceof Error?M.message:String(M))}});try{await r()}catch(u){o("error",u instanceof Error?u.message:String(u))}}async function Hf(e){var gt,Lt,bt,wt,_t,At,nt,dt,yt;const s=e.querySelector("#studio-journal-tbody"),i=e.querySelector("#studio-journal-entries-tbody"),o=e.querySelector("#studio-journal-banner"),n=e.querySelector("#studio-journal-search"),a=e.querySelector("#studio-journal-entries-search"),r=e.querySelector("#studio-journal-header-count"),l=e.querySelector("#studio-journal-entries-count"),d=e.querySelector("#studio-journal-layout-unsaved"),p=e.querySelector("#studio-journal-settings-note"),u=(K,et)=>{o&&(o.style.display=et?"block":"none",o.className=`studio-banner studio-banner--${K}`,o.textContent=et)};if(p){const K=Ct()==="live";p.innerHTML=K?"Use <strong>Home carousel</strong> above to choose homepage slides. The test-mode home list editor below does not affect the live site.":"Use <strong>Home carousel</strong> above for homepage slides. The <strong>/journal</strong> page headline comes from <code>site-info</code> → journal.";const et=e.querySelector("#studio-journal-edit-block");et instanceof HTMLButtonElement&&(et.disabled=K,K&&(et.title="Test mode home list only — not used on the live site"))}const c=e.querySelector("#studio-journal-home-carousel-msg"),m=[0,1,2].map(K=>e.querySelector(`#studio-journal-home-slot-${K}`)),C=Jt("journal").canEdit;let w=[];const L=(K,et)=>{c instanceof HTMLElement&&(c.style.display=et?"block":"none",c.className=`studio-banner studio-banner--${K}`,c.textContent=et)},A=()=>_c(Array.isArray(M)?M:[]),g=K=>`<option value="">—</option>${A().map(Y=>{var P,k;const st=String((Y==null?void 0:Y.id)??""),B=String(((P=Y==null?void 0:Y.en)==null?void 0:P.title)??((k=Y==null?void 0:Y.en)==null?void 0:k.name)??(st||"Untitled"));return`<option value="${U(st)}" ${st===K?"selected":""}>${U(B)}</option>`}).join("")}`,f=()=>{m.forEach((Y,st)=>{if(!(Y instanceof HTMLSelectElement))return;const B=String(w[st]??"");Y.innerHTML=g(B),Y.value=B,Y.disabled=!C});const K=e.querySelector("#studio-journal-home-carousel-save"),et=e.querySelector("#studio-journal-home-carousel-clear");K instanceof HTMLButtonElement&&(K.disabled=!C),et instanceof HTMLButtonElement&&(et.disabled=!C)},v=()=>{const K=[];for(const et of m){if(!(et instanceof HTMLSelectElement))continue;const Y=et.value.trim();Y&&(K.includes(Y)||K.push(Y))}return K.slice(0,3)},E=K=>(Array.isArray(K)?K:[]).map(et=>({rowType:String((et==null?void 0:et.rowType)||"").trim(),refId:String((et==null?void 0:et.refId)||"").trim()||void 0,selectionMode:String((et==null?void 0:et.selectionMode)||"").trim()||void 0,artistId:String((et==null?void 0:et.artistId)||"").trim()||void 0,sortOrder:Math.max(0,Math.floor(Number((et==null?void 0:et.sortOrder)??0))),featured:!!(et!=null&&et.featured)})).filter(et=>et.rowType);let j=[],M=[],S=[],h=[],T="all",N="";const O=()=>JSON.stringify(E(j.map(K=>K))),G=()=>{if(!(d instanceof HTMLElement))return;x();const K=O()!==N;d.style.display=K?"block":"none"},V=()=>{N=O(),d instanceof HTMLElement&&(d.style.display="none")},at=()=>{j.length;let K=0;for(const et of j){const Y=Math.floor(Number(et.sortOrder??0));Y>K&&(K=Y)}return K+1},tt=(K,et)=>`<option value="">—</option>${(K==="audio"?h.filter(B=>String((B==null?void 0:B.audioUrl)??"").trim()):h.filter(B=>String((B==null?void 0:B.quote)??"").trim())).map(B=>{var J,W;const P=String((B==null?void 0:B.id)??""),k=String(((W=(J=B==null?void 0:B.locales)==null?void 0:J.en)==null?void 0:W.name)??(B==null?void 0:B.slug)??P);return`<option value="${U(P)}" ${P===et?"selected":""}>${U(k)}</option>`}).join("")}`,z=K=>{var Y,st,B;const et=String(K.rowType||"");if(et==="journal-entry"){const P=String(K.refId||""),k=M.find(W=>String((W==null?void 0:W.id)??"")===P),J=((Y=k==null?void 0:k.en)==null?void 0:Y.title)??((st=k==null?void 0:k.en)==null?void 0:st.name)??P;return`entry: <code class="studio-code-inline">${U(P)}</code> — ${U(String(J||""))}`}if(et==="event"){const P=String(K.refId||""),k=S.find(W=>String((W==null?void 0:W.id)??"")===P),J=((B=k==null?void 0:k.en)==null?void 0:B.title)??(k==null?void 0:k.title)??P;return`event: <code class="studio-code-inline">${U(P)}</code> — ${U(String(J||""))}`}return et==="quote"||et==="audio"?`${String(K.selectionMode||"random")} · artist <code class="studio-code-inline">${U(String(K.artistId||"—"))}</code>`:"—"};async function F(){const K=E(j.map(et=>et));await pn(K),V(),u("ok","Layout saved."),await R()}async function I(K){const et=String((K==null?void 0:K.id)??"").trim();if(!et)return;const{onLayout:Y}=Tc(et,j);if(Y){u("info","Entry is already on the /journal layout.");return}if(!(Ds(K)==="draft"&&!confirm("This entry is still a draft. Add to the layout anyway? Visitors will not see it until you publish."))){x(),j.push({rowType:"journal-entry",refId:et,sortOrder:at(),featured:!1});try{await F()}catch(st){u("error",st instanceof Error?st.message:String(st))}}}async function y(K){if(!confirm(`Delete journal entry ${K}? This cannot be undone.`))return;x();const et=j.length;j=j.filter(Y=>!(String((Y==null?void 0:Y.rowType)||"").trim().toLowerCase()==="journal-entry"&&String((Y==null?void 0:Y.refId)??"")===K));try{await Ac(K),j.length!==et&&await pn(E(j.map(Y=>Y))),u("ok","Journal entry deleted."),await R()}catch(Y){u("error",Y instanceof Error?Y.message:String(Y))}}const _=K=>{var P;const Y=`<div class="studio-section-stack">
          <p class="studio-muted">Add an event row to the <code>/journal</code> layout. Manage event content in Studio → Content (events) if needed.</p>
          <label class="studio-field">
            <span>Event</span>
            <select id="studio-jp-ev-sel" class="studio-select">${S.map(k=>{var Z;const J=String((k==null?void 0:k.id)??""),W=String(((Z=k==null?void 0:k.en)==null?void 0:Z.title)??(k==null?void 0:k.title)??J);return`<option value="${U(J)}">${U(W)} (${U(J)})</option>`}).join("")||'<option value="">(no events)</option>'}</select>
          </label>
          <div class="studio-modal-actions">
            <button type="button" class="studio-btn-primary" id="studio-jp-ev-ok">Add row</button>
            <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Cancel</button>
          </div>
        </div>`,{root:st,close:B}=qt(Y,{title:"Add event to layout"});(P=st.querySelector("#studio-jp-ev-ok"))==null||P.addEventListener("click",()=>{const k=st.querySelector("#studio-jp-ev-sel"),J=k instanceof HTMLSelectElement?k.value:"";J&&(B(),K(J))})},$=K=>{var W;const Y=`<div class="studio-section-stack">
          <label class="studio-field">
            <span>Mode</span>
            <select id="studio-jp-qa-mode" class="studio-select">
              <option value="random">random</option>
              <option value="manual">manual</option>
            </select>
          </label>
          <label class="studio-field" id="studio-jp-qa-artist-wrap">
            <span>Artist (manual)</span>
            <select id="studio-jp-qa-artist" class="studio-select" disabled>
              ${(K==="audio"?h.filter(Z=>String((Z==null?void 0:Z.audioUrl)??"").trim()):h.filter(Z=>String((Z==null?void 0:Z.quote)??"").trim())).map(Z=>{var pt,ft;const ct=String((Z==null?void 0:Z.id)??"");return`<option value="${U(ct)}">${U(String(((ft=(pt=Z==null?void 0:Z.locales)==null?void 0:pt.en)==null?void 0:ft.name)??(Z==null?void 0:Z.slug)??ct))}</option>`}).join("")}
            </select>
          </label>
          <div class="studio-modal-actions">
            <button type="button" class="studio-btn-primary" id="studio-jp-qa-ok">Add row</button>
            <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Cancel</button>
          </div>
        </div>`,{root:st,close:B}=qt(Y,{title:`Add ${K} row`}),P=st.querySelector("#studio-jp-qa-mode"),k=st.querySelector("#studio-jp-qa-artist"),J=()=>{const Z=P instanceof HTMLSelectElement?P.value:"random";k instanceof HTMLSelectElement&&(k.disabled=Z!=="manual")};P==null||P.addEventListener("change",J),J(),(W=st.querySelector("#studio-jp-qa-ok"))==null||W.addEventListener("click",()=>{const Z=P instanceof HTMLSelectElement?P.value:"random",ct=k instanceof HTMLSelectElement?k.value:"";B(),j.push({rowType:K,refId:void 0,selectionMode:Z,artistId:Z==="manual"&&ct?ct:void 0,sortOrder:at(),featured:!1}),(async()=>{try{await F()}catch(pt){u("error",pt instanceof Error?pt.message:String(pt))}})()})},H=()=>{var Y,st,B,P;const{root:K,close:et}=qt(`<div class="studio-section-stack" style="gap:10px;max-width:24rem">
              <p class="studio-muted">What are you adding?</p>
              <button type="button" class="studio-btn-primary" id="jc-je">Journal entry (CMS) — new or edit, then add to layout</button>
              <button type="button" class="studio-btn-ghost" id="jc-ev">Event (pick existing)</button>
              <button type="button" class="studio-btn-ghost" id="jc-qu">Quote row</button>
              <button type="button" class="studio-btn-ghost" id="jc-au">Audio row</button>
            </div>`,{title:"Add layout row"});(Y=K.querySelector("#jc-je"))==null||Y.addEventListener("click",()=>{et(),Is(null,()=>{},{afterJournalSave:k=>{k&&(j.push({rowType:"journal-entry",refId:String(k),sortOrder:at(),featured:!1}),F())}})}),(st=K.querySelector("#jc-ev"))==null||st.addEventListener("click",()=>{if(et(),!S.length){u("error","No events in the events content bundle. Add events via Studio → Content or test data.");return}_(k=>{j.push({rowType:"event",refId:k,sortOrder:at(),featured:!1}),F()})}),(B=K.querySelector("#jc-qu"))==null||B.addEventListener("click",()=>{et(),$("quote")}),(P=K.querySelector("#jc-au"))==null||P.addEventListener("click",()=>{et(),$("audio")})};async function R(){s&&(s.innerHTML='<tr><td colspan="6">Loading…</td></tr>'),i&&(i.innerHTML='<tr><td colspan="6">Loading…</td></tr>');const[K,et,Y,st,B]=await Promise.all([Nd().catch(()=>[]),to().catch(()=>[]),Rd().catch(()=>[]),ao().catch(()=>[]),Ud().catch(()=>({entryIds:[],updatedAt:""}))]);j=(Array.isArray(K)?K:[]).map(P=>({...P})),M=et,S=Y,h=st,w=Array.isArray(B==null?void 0:B.entryIds)?B.entryIds.map(String).filter(Boolean):[],V(),q(),X(),f()}function x(){s&&s.querySelectorAll("tr[data-jl-idx]").forEach(K=>{const et=Number(K.getAttribute("data-jl-idx"));if(!Number.isFinite(et)||!j[et])return;const Y=K.querySelector("[data-jl-type]"),st=K.querySelector("[data-jl-ref]"),B=K.querySelector("[data-jl-mode]"),P=K.querySelector("[data-jl-artist]"),k=K.querySelector("[data-jl-order]"),J=K.querySelector("[data-jl-featured]"),W={...j[et]};Y instanceof HTMLSelectElement&&(W.rowType=Y.value),k instanceof HTMLInputElement&&(W.sortOrder=Math.max(0,Math.floor(Number(k.value||0)))),J instanceof HTMLInputElement&&(W.featured=J.checked),st instanceof HTMLInputElement&&(W.refId=st.value||void 0),B instanceof HTMLSelectElement&&(W.selectionMode=B.value||void 0),P instanceof HTMLSelectElement&&(W.artistId=P.value||void 0),j[et]=W})}function q(){if(!i)return;const K=(a instanceof HTMLInputElement?a.value:"").trim().toLowerCase(),et=(Array.isArray(M)?M:[]).filter(st=>{var W,Z;const B=Ds(st);if(T!=="all"&&B!==T)return!1;if(!K)return!0;const P=String(((W=st==null?void 0:st.en)==null?void 0:W.title)??((Z=st==null?void 0:st.en)==null?void 0:Z.name)??""),k=String((st==null?void 0:st.id)??""),J=String((st==null?void 0:st.link)??"");return`${P} ${k} ${J} ${B}`.toLowerCase().includes(K)});if(l&&(l.textContent=String(M.length)),!et.length){i.innerHTML=`<tr><td colspan="6">${M.length?"No entries match this filter.":"No journal entries yet. Use <strong>+ New journal entry</strong> to create one."}</td></tr>`;return}const Y=ws();i.innerHTML=et.map(st=>{var pt,ft;const B=String((st==null?void 0:st.id)??""),P=String(((pt=st==null?void 0:st.en)==null?void 0:pt.title)??((ft=st==null?void 0:st.en)==null?void 0:ft.name)??(B||"Untitled")),k=Ds(st),J=Fd(B,j,M),W=La(st),Z=W.startsWith("http")?W:`${Y}${W.startsWith("/")?W:`/${W}`}`,ct=le(st==null?void 0:st.updatedAt);return`<tr data-je-id="${U(B)}">
                <td>${U(P)}</td>
                <td>${Km(k)}</td>
                <td>${zm(J)}</td>
                <td>
                  <code class="studio-code-inline">${U(W)}</code>
                  <button type="button" class="studio-btn-ghost studio-je-copy" data-path="${U(W)}" title="Copy URL">Copy</button>
                </td>
                <td>${U(ct||"—")}</td>
                <td class="studio-td-actions">
                  <button type="button" class="studio-btn-ghost studio-je-edit-entry" data-id="${U(B)}">Edit</button>
                  <button type="button" class="studio-btn-ghost studio-je-add-page" data-id="${U(B)}">Add to page</button>
                  <a href="${U(Z)}" target="_blank" rel="noopener noreferrer" class="studio-btn-ghost">Preview</a>
                  <button type="button" class="studio-btn-ghost studio-je-delete" data-id="${U(B)}">Delete</button>
                </td>
            </tr>`}).join(""),i.querySelectorAll(".studio-je-edit-entry").forEach(st=>{st.addEventListener("click",async()=>{const B=st.getAttribute("data-id"),P=await mn(B||"");Is(P,R,{})})}),i.querySelectorAll(".studio-je-add-page").forEach(st=>{st.addEventListener("click",async()=>{const B=st.getAttribute("data-id"),P=M.find(k=>String((k==null?void 0:k.id)??"")===String(B??""));P&&await I(P)})}),i.querySelectorAll(".studio-je-delete").forEach(st=>{st.addEventListener("click",async()=>{const B=st.getAttribute("data-id");B&&await y(B)})}),i.querySelectorAll(".studio-je-copy").forEach(st=>{st.addEventListener("click",async()=>{const B=st.getAttribute("data-path")||"",P=B.startsWith("http")?B:`${Y}${B.startsWith("/")?B:`/${B}`}`;try{await navigator.clipboard.writeText(P),u("ok","URL copied.")}catch{u("error","Could not copy URL.")}})})}function X(){if(!s)return;const K=(n instanceof HTMLInputElement?n.value:"").trim().toLowerCase(),et=(Array.isArray(j)?j:[]).map((Y,st)=>({r:Y,i:st})).filter(({r:Y})=>{var P;if(!K)return!0;const st=String((Y==null?void 0:Y.rowType)||"");if(`${st} ${(Y==null?void 0:Y.refId)||""} ${(Y==null?void 0:Y.selectionMode)||""} ${(Y==null?void 0:Y.artistId)||""}`.toLowerCase().includes(K))return!0;if(st==="journal-entry"&&(Y!=null&&Y.refId)){const k=M.find(J=>String((J==null?void 0:J.id)??"")===String(Y.refId));if(k){const J=((P=k.en)==null?void 0:P.title)??"",W=k.entryStatus??"";if(`${J} ${k.link??""} ${W}`.toLowerCase().includes(K))return!0}}return!1});if(r&&(r.textContent=String(K?et.length:j.length)),!et.length){s.innerHTML=`<tr><td colspan="6">${j.length?"No layout rows match search.":"No layout rows. Use + Add layout row."}</td></tr>`;return}s.innerHTML=et.map(({r:Y,i:st})=>{const B=String((Y==null?void 0:Y.rowType)||"journal-entry"),P=Math.floor(Number((Y==null?void 0:Y.sortOrder)??0)),k=!!(Y!=null&&Y.featured),J=B==="journal-entry"?Ym(Dd(Y,M)):'<span class="studio-muted">—</span>',W=["journal-entry","event","quote","audio"].map(ft=>`<option value="${U(ft)}" ${ft===B?"selected":""}>${U(ft)}</option>`).join(""),Z=B==="journal-entry"||B==="event",ct=B==="quote"||B==="audio",pt=String((Y==null?void 0:Y.selectionMode)||(ct?"random":""));return`<tr data-jl-idx="${st}">
                <td><input type="number" class="studio-input" style="width:4rem" data-jl-order value="${P}" min="0" step="1" /></td>
                <td><input type="checkbox" data-jl-featured ${k?"checked":""} /></td>
                <td><label class="studio-field"><span class="studio-muted">Type</span><select class="studio-select" data-jl-type>${W}</select></label></td>
                <td>${J}</td>
                <td>
                  <div class="studio-modal-fields-row" style="flex-wrap:wrap;gap:6px;align-items:flex-end">
                    ${Z?`<label class="studio-field"><span class="studio-muted">Ref</span><input class="studio-input" data-jl-ref value="${U(String((Y==null?void 0:Y.refId)||""))}" style="min-width:8rem" placeholder="id or index" /></label>`:""}
                    ${ct?`<label class="studio-field"><span class="studio-muted">Mode</span>
                        <select class="studio-select" data-jl-mode>
                          <option value="random" ${pt==="random"?"selected":""}>random</option>
                          <option value="manual" ${pt==="manual"?"selected":""}>manual</option>
                        </select></label>
                        <label class="studio-field"><span class="studio-muted">Artist</span>
                        <select class="studio-select" data-jl-artist ${pt==="manual"?"":"disabled"}>
                          ${tt(B,String((Y==null?void 0:Y.artistId)||""))}
                        </select></label>`:""}
                    <p class="studio-muted" style="margin:0;font-size:0.8rem;flex:1 1 200px">${z(Y)}</p>
                  </div>
                </td>
                <td class="studio-td-actions">
                  <button type="button" class="studio-btn-ghost studio-jl-apply" data-idx="${st}">Apply row</button>
                  <button type="button" class="studio-btn-ghost studio-jl-rm" data-idx="${st}">Remove</button>
              ${B==="journal-entry"&&(Y!=null&&Y.refId)?`<a href="${U(`${ws()}${La(M.find(ft=>String((ft==null?void 0:ft.id)??"")===String(Y.refId))||{id:Y.refId})}`)}" target="_blank" rel="noopener noreferrer" class="studio-btn-ghost">Preview</a>
                  <button type="button" class="studio-btn-ghost studio-je-edit" data-id="${U(String(Y.refId))}">Edit entry</button>`:""}
                </td>
            </tr>`}).join(""),s.querySelectorAll(".studio-jl-apply").forEach(Y=>{Y.addEventListener("click",async()=>{const st=Number(Y.getAttribute("data-idx"));if(!(!Number.isFinite(st)||!j[st])){x();try{await F()}catch(B){u("error",B instanceof Error?B.message:String(B))}}})}),s.querySelectorAll(".studio-jl-rm").forEach(Y=>{Y.addEventListener("click",async()=>{const st=Number(Y.getAttribute("data-idx"));if(!(!Number.isFinite(st)||!j[st]||!confirm("Remove this row from the /journal layout?"))){x(),j.splice(st,1);try{await F()}catch(B){u("error",B instanceof Error?B.message:String(B))}}})}),s.querySelectorAll("[data-jl-type], [data-jl-mode], [data-jl-order], [data-jl-ref], [data-jl-featured], [data-jl-artist]").forEach(Y=>{const st=Y.matches("[data-jl-featured]")?"change":"input";Y.addEventListener(st,()=>G())}),s.querySelectorAll("[data-jl-type], [data-jl-mode]").forEach(Y=>{Y.addEventListener("change",st=>{const B=st.target&&st.target.closest("tr[data-jl-idx]");if(!B)return;const P=B.querySelector("[data-jl-type]"),k=B.querySelector("[data-jl-mode]"),J=B.querySelector("[data-jl-ref]"),W=B.querySelector("[data-jl-artist]"),Z=P instanceof HTMLSelectElement?P.value:"journal-entry";if(J instanceof HTMLInputElement&&(J.disabled=!(Z==="event"||Z==="journal-entry")),k instanceof HTMLSelectElement&&(k.disabled=!(Z==="quote"||Z==="audio")),W instanceof HTMLSelectElement){const ct=k instanceof HTMLSelectElement?k.value:"random";W.disabled=!(Z==="quote"||Z==="audio")||ct!=="manual",W.innerHTML=tt(Z,W.value)}G()})}),s.querySelectorAll(".studio-je-edit").forEach(Y=>{Y.addEventListener("click",async()=>{const st=Y.getAttribute("data-id"),B=await mn(st||"");Is(B,R,{})})})}(gt=e.querySelector("#studio-journal-add"))==null||gt.addEventListener("click",()=>{H()}),(Lt=e.querySelector("#studio-journal-new-entry"))==null||Lt.addEventListener("click",()=>{Is(null,R,{})}),(bt=e.querySelector("#studio-journal-save-layout"))==null||bt.addEventListener("click",async()=>{x();try{await F()}catch(K){u("error",K instanceof Error?K.message:String(K))}}),(wt=e.querySelector("#studio-journal-refresh"))==null||wt.addEventListener("click",()=>R()),(_t=e.querySelector("#studio-journal-home-carousel-save"))==null||_t.addEventListener("click",async()=>{const K=v(),et=e.querySelector("#studio-journal-home-carousel-save");et instanceof HTMLButtonElement&&(et.disabled=!0),L("info","Saving…");try{await nn({entryIds:K}),w=K,f(),L("ok",K.length?"Home carousel saved. Refresh the homepage to preview.":"Using automatic newest-first order.")}catch(Y){L("error",Y instanceof Error?Y.message:String(Y))}finally{et instanceof HTMLButtonElement&&(et.disabled=!C)}}),(At=e.querySelector("#studio-journal-home-carousel-clear"))==null||At.addEventListener("click",async()=>{m.forEach(et=>{et instanceof HTMLSelectElement&&(et.value="")});const K=e.querySelector("#studio-journal-home-carousel-clear");K instanceof HTMLButtonElement&&(K.disabled=!0),L("info","Saving…");try{await nn({entryIds:[]}),w=[],f(),L("ok","Automatic newest-first order restored.")}catch(et){L("error",et instanceof Error?et.message:String(et))}finally{K instanceof HTMLButtonElement&&(K.disabled=!C)}}),(nt=e.querySelector("#studio-journal-search"))==null||nt.addEventListener("input",()=>X()),(dt=e.querySelector("#studio-journal-entries-search"))==null||dt.addEventListener("input",()=>q());const ot=(yt=e.querySelector("#studio-journal-tab-all"))==null?void 0:yt.closest(".studio-data-tabs");ot==null||ot.querySelectorAll(".studio-data-tabs__tab").forEach(K=>{K.addEventListener("click",()=>{const et=K.getAttribute("data-tab-value");(et==="all"||et==="draft"||et==="published"||et==="archived")&&(T=et,ot.querySelectorAll(".studio-data-tabs__tab").forEach(Y=>{const st=Y.getAttribute("data-tab-value")===et;Y.classList.toggle("is-active",st),Y.setAttribute("aria-selected",st?"true":"false"),Y.setAttribute("tabindex",st?"0":"-1")}),q())})}),Lo(e,{embedEditor:"#studio-journal-embed-editor",embedFields:"#studio-journal-embed-fields",embedTitle:"#studio-journal-embed-title",embedUnsaved:"#studio-journal-embed-unsaved",embedMsg:"#studio-journal-embed-msg",btnSave:"#studio-journal-embed-save",btnCancel:"#studio-journal-embed-cancel",btnBlock:"#studio-journal-edit-block",btnSiteInfo:"#studio-journal-edit-siteinfo",slugBlock:"journals-block",siteInfoChapter:"journal",titleBlock:"Edit: Test mode home list (journals-block)",titleSiteInfo:"Edit: /journal page headline (site-info)",uploadArea:"studio/journal-content"}),await R()}async function qf(e){await xp(e)}function Pf(e){var A,g,f,v,E,j,M,S,h;const s="fusion-studio-assistance-draft-v1",i=e.querySelector("#studio-assist-msg"),o=e.querySelector("#studio-assist-input"),n=e.querySelector("#studio-assist-output"),a=e.querySelector("#studio-assist-notes"),r=e.querySelector("#studio-assist-context"),l=e.querySelector("#studio-assist-tone"),d=e.querySelector("#studio-assist-length"),p=e.querySelector("#studio-assist-generate-prompt"),u=(T,N)=>{if(i instanceof HTMLElement){if(!N){i.style.display="none",i.textContent="";return}i.style.display="block",i.className=`studio-banner studio-banner--${T}`,i.textContent=N}},c=(T,N,O)=>{T instanceof HTMLButtonElement&&(T.dataset.label||(T.dataset.label=T.textContent||""),T.disabled=N,T.textContent=N?O:T.dataset.label)},m=()=>{const T=e.querySelector('input[name="studio-assist-translate-style"]:checked');return T instanceof HTMLInputElement?T.value:"natural"},b=T=>{["refine","generate","translate"].forEach(O=>{const G=e.querySelector(`#studio-assist-tab-${O}`),V=e.querySelector(`#studio-assist-panel-${O}`),at=O===T;G instanceof HTMLButtonElement&&(G.classList.toggle("is-active",at),G.setAttribute("aria-selected",at?"true":"false")),V instanceof HTMLElement&&(V.classList.toggle("is-active",at),V.hidden=!at)})},C=()=>o instanceof HTMLTextAreaElement?o.value.trim():"",w=T=>{n instanceof HTMLTextAreaElement&&(n.value=T||"")};e.querySelectorAll("#studio-assist-tabs .studio-tabs__tab").forEach(T=>{T.addEventListener("click",()=>{const N=T.id.endsWith("generate")?"generate":T.id.endsWith("translate")?"translate":"refine";b(N)})}),e.querySelectorAll(".studio-assist-quick").forEach(T=>{T.addEventListener("click",()=>{const N=T.getAttribute("data-tab");(N==="generate"||N==="translate"||N==="refine")&&b(N);const O=T.getAttribute("data-preset");O&&p instanceof HTMLTextAreaElement&&(p.value=`${O} for FUSION`)})}),e.querySelectorAll(".studio-assist-preset").forEach(T=>{T.addEventListener("click",()=>{const N=T.getAttribute("data-preset")||"";p instanceof HTMLTextAreaElement&&(p.value=N,p.focus())})}),(A=e.querySelector("#studio-assist-clear"))==null||A.addEventListener("click",()=>{o instanceof HTMLTextAreaElement&&(o.value="")}),(g=e.querySelector("#studio-assist-run-refine"))==null||g.addEventListener("click",async T=>{const N=C();if(!N){u("warn","Add input text first.");return}const O=l instanceof HTMLSelectElement?l.value:"Elevated",G=d instanceof HTMLSelectElement?d.value:"Keep",V=r instanceof HTMLSelectElement?r.value:"Artist profile",at=a instanceof HTMLTextAreaElement?a.value.trim():"",tt=["Refine this text for FUSION internal editorial use.",`Context: ${V}.`,`Tone: ${O}.`,`Length instruction: ${G}.`,at?`Internal context: ${at}.`:"","Keep factual meaning, improve clarity and structure."].filter(Boolean).join(" "),z=T.currentTarget;c(z,!0,"Refining…"),u("info","Running refinement…");try{const F=await re(tt,N,"en");w(String(F||"")),u("ok","Refinement complete.")}catch(F){u("error",F instanceof Error?F.message:String(F))}finally{c(z,!1,"Refine Text")}}),(f=e.querySelector("#studio-assist-run-generate"))==null||f.addEventListener("click",async T=>{const N=p instanceof HTMLTextAreaElement?p.value.trim():"";if(!N){u("warn","Add a generation prompt first.");return}const O=r instanceof HTMLSelectElement?r.value:"Artist profile",G=a instanceof HTMLTextAreaElement?a.value.trim():"",V=["Compose new original copy for FUSION.",`Context: ${O}.`,G?`Internal context: ${G}.`:"","Output should be publication-ready and concise."].filter(Boolean).join(" "),at=T.currentTarget;c(at,!0,"Generating…"),u("info","Generating draft…");try{const tt=await re(V,N,"en");w(String(tt||"")),u("ok","Generation complete.")}catch(tt){u("error",tt instanceof Error?tt.message:String(tt))}finally{c(at,!1,"Generate")}}),(v=e.querySelector("#studio-assist-run-translate"))==null||v.addEventListener("click",async T=>{const N=C();if(!N){u("warn","Add English text first.");return}const O=m(),G=T.currentTarget;c(G,!0,"Translating…"),u("info","Translating…");try{let V=await xe(N);O==="literal"&&(V=await re("Rewrite this Japanese translation in a literal/direct style while keeping original meaning.",V,"ja")),w(String(V||"")),u("ok","Translation complete.")}catch(V){u("error",V instanceof Error?V.message:String(V))}finally{c(G,!1,"Translate to Japanese")}});const L=async()=>{const T=n instanceof HTMLTextAreaElement?n.value:"";if(!T.trim()){u("warn","No output to copy yet.");return}try{await navigator.clipboard.writeText(T),u("ok","Output copied.")}catch{u("error","Clipboard unavailable in this browser context.")}};(E=e.querySelector("#studio-assist-copy-inline"))==null||E.addEventListener("click",()=>void L()),(j=e.querySelector("#studio-assist-copy-output"))==null||j.addEventListener("click",()=>void L()),(M=e.querySelector("#studio-assist-replace-inline"))==null||M.addEventListener("click",()=>{const T=n instanceof HTMLTextAreaElement?n.value:"";o instanceof HTMLTextAreaElement&&(o.value=T)}),(S=e.querySelector("#studio-assist-apply"))==null||S.addEventListener("click",()=>{const T=n instanceof HTMLTextAreaElement?n.value:"",N=document.activeElement;if(!T.trim()){u("warn","No output available.");return}if(N instanceof HTMLTextAreaElement||N instanceof HTMLInputElement&&/^(text|search|url|email)$/i.test(N.type)){N.value=T,N.dispatchEvent(new Event("input",{bubbles:!0})),u("ok","Applied to active field.");return}u("info","Focus a text field first, then click Apply to field.")}),(h=e.querySelector("#studio-assist-save-draft"))==null||h.addEventListener("click",()=>{const T={input:o instanceof HTMLTextAreaElement?o.value:"",output:n instanceof HTMLTextAreaElement?n.value:"",notes:a instanceof HTMLTextAreaElement?a.value:"",context:r instanceof HTMLSelectElement?r.value:"Artist profile",tone:l instanceof HTMLSelectElement?l.value:"Elevated",length:d instanceof HTMLSelectElement?d.value:"Keep",prompt:p instanceof HTMLTextAreaElement?p.value:"",translateStyle:m()};try{localStorage.setItem(s,JSON.stringify(T)),u("ok","Draft saved.")}catch(N){u("error",N instanceof Error?N.message:String(N))}});try{const T=localStorage.getItem(s);if(T){const N=JSON.parse(T);if(o instanceof HTMLTextAreaElement&&(o.value=String(N.input||"")),n instanceof HTMLTextAreaElement&&(n.value=String(N.output||"")),a instanceof HTMLTextAreaElement&&(a.value=String(N.notes||"")),r instanceof HTMLSelectElement&&N.context&&(r.value=String(N.context)),l instanceof HTMLSelectElement&&N.tone&&(l.value=String(N.tone)),d instanceof HTMLSelectElement&&N.length&&(d.value=String(N.length)),p instanceof HTMLTextAreaElement&&(p.value=String(N.prompt||"")),N.translateStyle==="literal"||N.translateStyle==="natural"){const O=e.querySelector(`input[name="studio-assist-translate-style"][value="${N.translateStyle}"]`);O instanceof HTMLInputElement&&(O.checked=!0)}}}catch{}}function $a(e){if(!e||typeof e!="object")return'<p class="studio-muted">No account record for the current session.</p>';const s=e,i=s.role&&typeof s.role=="object"?Object.keys(s.role)[0]:"—",o=s.status&&typeof s.status=="object"?Object.keys(s.status)[0]:"—";return`<dl class="studio-dl studio-dl--compact">
      <dt>Your role</dt><dd>${U(String(i))}</dd>
      <dt>Account status</dt><dd>${U(String(o))}</dd>
    </dl>`}function Nf(e,s,i){var y,_,$;const o=e.rawAccount;if(!o||typeof o!="object"){qt('<p class="studio-muted">No account payload for this row.</p>',{title:"Manage account",compact:!0});return}let n=o;const a=e.principal,r=e.role||"artist",l=e.status||"pending",d=!!e.membershipExemptManual,p=e.stripeSubscriptionStatus||"—",u=zs(e.stripeCurrentPeriodEnd),c=d?"Manual exempt":String(p),m=Jr(e.updatedAt),b=U(m.label),C=Bd(a),w=C&&C.includes("@")?`<p class="studio-muted studio-user-manage-billing-hint" id="studio-user-billing-hint">Client billing email (this browser): <code>${U(C)}</code></p>`:'<p class="studio-muted studio-user-manage-billing-hint" id="studio-user-billing-hint" hidden></p>',L=`
      <div class="studio-user-manage-modal">
        <p class="studio-muted studio-user-manage-legend">The Users table <strong>dot</strong> and <strong>Membership</strong> below reflect the <strong>canister</strong>. <strong>Live Stripe</strong> queries Stripe directly — use Push / Check to align the canister.</p>
        <section class="studio-user-manage-section">
          <h3 class="studio-user-manage-section-title">Identity</h3>
          <div class="studio-user-manage-principal-row">
            <p class="studio-user-manage-principal studio-muted" id="studio-user-principal-line">${U(a)}</p>
            <button type="button" class="studio-btn-ghost studio-btn-tiny" id="studio-user-copy-principal">Copy principal</button>
          </div>
          <p class="studio-muted studio-user-manage-meta">Account <code>updatedAt</code> (core): ${b}</p>
          ${w}
        </section>

        <section class="studio-user-manage-section">
          <h3 class="studio-user-manage-section-title">Account status</h3>
          <p class="studio-muted studio-user-manage-hint">Update role assignment and lifecycle (pending / active / suspended).</p>
          <div class="studio-user-manage-control-row">
            <label class="studio-user-manage-label" for="studio-user-edit-role">Role</label>
            <select id="studio-user-edit-role" class="studio-select studio-user-manage-select" aria-label="Account role">
              <option value="artist" ${r==="artist"?"selected":""}>artist</option>
              <option value="gallery" ${r==="gallery"?"selected":""}>gallery</option>
              <option value="curator" ${r==="curator"?"selected":""}>curator</option>
              <option value="collector" ${r==="collector"?"selected":""}>collector</option>
              <option value="staff" ${r==="staff"?"selected":""}>staff</option>
              <option value="collaborator" ${r==="collaborator"?"selected":""}>collaborator</option>
              <option value="admin" ${r==="admin"?"selected":""}>admin</option>
            </select>
          </div>
          <div class="studio-user-manage-control-row">
            <label class="studio-user-manage-label" for="studio-user-edit-status">Status</label>
            <select id="studio-user-edit-status" class="studio-select studio-user-manage-select" aria-label="Account status">
              <option value="pending" ${l==="pending"?"selected":""}>pending</option>
              <option value="active" ${l==="active"?"selected":""}>active</option>
              <option value="suspended" ${l==="suspended"?"selected":""}>suspended</option>
            </select>
          </div>
        </section>

        <section class="studio-user-manage-section">
          <h3 class="studio-user-manage-section-title">Membership (canister)</h3>
          <p class="studio-muted studio-user-manage-hint">Stored on-chain. Use <strong>Live Stripe</strong> below to verify billing in Stripe.</p>
          <div class="studio-user-manage-sync-actions">
            <button type="button" class="studio-btn-ghost" id="studio-user-refresh-canister">Refresh from canister</button>
            <button type="button" class="studio-btn-ghost" id="studio-user-push-subscription">Push subscription to canister</button>
          </div>
          <p id="studio-user-push-result" class="studio-muted studio-user-manage-push-result" hidden></p>
          <dl class="studio-user-manage-dl" id="studio-user-manage-membership-dl">
            <dt>Cached subscription</dt><dd id="studio-user-cache-sub">${U(String(p))}</dd>
            <dt>Period end</dt><dd id="studio-user-cache-renew">${U(String(u))}</dd>
            <dt>Summary</dt><dd id="studio-user-cache-summary">${U(c)}</dd>
          </dl>
          <div class="studio-user-manage-control-row">
            <label class="studio-user-manage-label" for="studio-user-edit-membership">Billing override</label>
            <select id="studio-user-edit-membership" class="studio-select studio-user-manage-select" aria-label="Membership billing override">
              <option value="standard" ${d?"":"selected"}>Standard — follow Stripe</option>
              <option value="manual_exempt" ${d?"selected":""}>Manual exempt (complimentary)</option>
            </select>
          </div>
        </section>

        <section class="studio-user-manage-section studio-user-manage-section--stripe">
          <h3 class="studio-user-manage-section-title">Live Stripe (by email)</h3>
          <p class="studio-muted studio-user-manage-hint">Not from the canister. Requires Studio → Services integration URL + API key.</p>
          <div class="studio-user-manage-stripe-row">
            <label class="studio-user-manage-label studio-sr-only" for="studio-user-stripe-email">Customer email</label>
            <input type="email" id="studio-user-stripe-email" class="studio-input studio-user-manage-email-input" placeholder="customer@email.com" autocomplete="off" />
            <button type="button" class="studio-btn-primary" id="studio-user-stripe-check">Check Stripe</button>
          </div>
          <div id="studio-user-stripe-result" class="studio-user-manage-stripe-result" hidden></div>
          <div id="studio-user-stripe-ids" class="studio-user-manage-stripe-ids" hidden></div>
        </section>

        <p id="studio-user-sync-warn" class="studio-banner studio-banner--warn studio-user-manage-warn" hidden></p>
        <p id="studio-user-edit-err" class="studio-banner studio-banner--error studio-user-manage-err" hidden></p>
        <div class="studio-modal-actions studio-user-manage-actions">
          <button type="button" class="studio-btn-primary" id="studio-user-edit-save">Save changes</button>
          <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Cancel</button>
        </div>
      </div>
    `,{close:A,root:g}=qt(L,{title:"Manage account",wide:!0,onClose:()=>{typeof i=="function"&&(async()=>{try{await i()}catch(H){try{const R=document.querySelector("#studio-users-sync-msg");R&&(R.textContent=H instanceof Error?H.message:String(H))}catch{}}})()}}),f=g.querySelector("#studio-user-edit-save"),v=g.querySelector("#studio-user-edit-err"),E=g.querySelector("#studio-user-stripe-check"),j=g.querySelector("#studio-user-stripe-email"),M=g.querySelector("#studio-user-stripe-result"),S=g.querySelector("#studio-user-sync-warn"),h=g.querySelector("#studio-user-push-result"),T=g.querySelector("#studio-user-stripe-ids"),N="Check Stripe",O=Od(a),G=H=>{S instanceof HTMLElement&&(H?(S.hidden=!1,S.textContent=H):(S.hidden=!0,S.textContent=""))},V=(H,R)=>{h instanceof HTMLElement&&(h.hidden=!R,h.textContent=R?H:"")},at=H=>{if(!(T instanceof HTMLElement))return;const R=H.customerId!=null?String(H.customerId).trim():"",x=H.subscriptionId!=null?String(H.subscriptionId).trim():"";if(!R&&!x){T.hidden=!0,T.innerHTML="";return}const q=Qi(),X=or(R,q),ot=[];R&&ot.push(`<div class="studio-user-manage-id-row"><span class="studio-muted">Customer</span> <code>${U(R)}</code> <button type="button" class="studio-btn-ghost studio-btn-tiny" data-studio-copy="${U(R)}">Copy</button></div>`),x&&ot.push(`<div class="studio-user-manage-id-row"><span class="studio-muted">Subscription</span> <code>${U(x)}</code> <button type="button" class="studio-btn-ghost studio-btn-tiny" data-studio-copy="${U(x)}">Copy</button></div>`),X&&ot.push(`<p class="studio-muted studio-user-manage-stripe-dash"><a href="${U(X)}" target="_blank" rel="noopener noreferrer">Open customer in Stripe Dashboard</a></p>`),T.innerHTML=ot.join(""),T.hidden=!1},tt=async H=>Or(a,H),z=async()=>{let H="",R=null;try{R=(await Te()).find(q=>q.principal===a)??null,F(R)}catch(x){H=x instanceof Error?x.message:String(x)}if(typeof i=="function")try{await i()}catch(x){H=H?`${H}; ${x instanceof Error?x.message:String(x)}`:x instanceof Error?x.message:String(x)}return{up:R,refreshErr:H}};if((y=g.querySelector("#studio-user-copy-principal"))==null||y.addEventListener("click",()=>{Ss(a)}),g.addEventListener("click",H=>{const R=H.target;if(!(R instanceof Element))return;const x=R.closest("[data-studio-copy]");if(!x||!g.contains(x))return;const q=x.getAttribute("data-studio-copy");q&&Ss(q)}),(_=g.querySelector("#studio-user-refresh-canister"))==null||_.addEventListener("click",async()=>{V("Refreshing…",!0),G("");const{refreshErr:H}=await z();H?(G(`Could not refresh: ${H}`),V("",!1)):V("Canister data refreshed.",!0)}),($=g.querySelector("#studio-user-push-subscription"))==null||$.addEventListener("click",async()=>{const H=j instanceof HTMLInputElement?j.value.trim():"";if(!H.includes("@")){V("Enter a valid customer email in Live Stripe first.",!0);return}if(V("Pushing to canister…",!0),G(""),!ee()){V("Set Integration API URL in Studio → Services.",!0);return}const{emailRes:R,principalRes:x,anySynced:q}=await tt(H),X=Aa(R,x),{refreshErr:ot}=await z();G(ot?`${X} Table refresh failed: ${ot}`:q?"":`Canister may still be stale. ${X} If Stripe shows active but the table dot stays red, redeploy the integration API (sync-by-email) and verify INTEGRATION_IC_IDENTITY + adminSetIntegrationServicePrincipal.`),V(q?`Done. ${X}`:`Not synced. ${X}`,!0)}),j instanceof HTMLInputElement){try{const H=localStorage.getItem(O);H&&H.includes("@")&&(j.value=H.trim())}catch{}j.addEventListener("blur",()=>{const H=j.value.trim();if(H.includes("@"))try{localStorage.setItem(O,H)}catch{}})}const F=H=>{if(!H)return;const R=H.stripeSubscriptionStatus||"—",x=H.stripeCurrentPeriodEnd||"",q=x?zs(x):"—",X=!!H.membershipExemptManual,ot=X?"Manual exempt":String(R),gt=g.querySelector("#studio-user-cache-sub"),Lt=g.querySelector("#studio-user-cache-renew"),bt=g.querySelector("#studio-user-cache-summary");gt&&(gt.textContent=String(R)),Lt&&(Lt.textContent=q),bt&&(bt.textContent=ot);const wt=g.querySelector("#studio-user-edit-membership");wt instanceof HTMLSelectElement&&(wt.value=X?"manual_exempt":"standard"),H.rawAccount&&typeof H.rawAccount=="object"&&(n=H.rawAccount)},I=H=>{M&&(M.hidden=!1,M.innerHTML=`<p class="studio-muted studio-stripe-live-footnote">${U(H)}</p>`)};E==null||E.addEventListener("click",async()=>{const H=j instanceof HTMLInputElement?j.value.trim():"";if(!H.includes("@")){I("Enter a valid customer email.");return}E instanceof HTMLButtonElement&&(E.disabled=!0,E.textContent="Checking…"),M&&(M.hidden=!0),T instanceof HTMLElement&&(T.hidden=!0,T.innerHTML=""),G("");try{const R=await Jd(H);try{localStorage.setItem(O,H)}catch{}if(!R||typeof R!="object"||R.ok===!1||typeof R.membershipActive!="boolean"){const nt=R&&typeof R=="object"&&(R.error||R.reason)&&String(R.error||R.reason)||"Could not reach the integration API. Set URL + API key under Studio → Services.";I(nt);return}at(R);const q=R.membershipActive===!0,X=R.subscriptionStatus!=null&&String(R.subscriptionStatus)?String(R.subscriptionStatus):R.reason?String(R.reason):"—",ot=R.cancelAtPeriodEnd?" · cancel at period end":"";M&&(M.hidden=!1,M.innerHTML=`
                  <div class="studio-stripe-live-status">
                    <span class="studio-stripe-live-badge ${q?"is-active":"is-inactive"}">${q?"Active":"Inactive"}</span>
                    <span class="studio-stripe-live-raw studio-muted">${U(X)}${U(ot)}</span>
                  </div>
                  <p class="studio-muted studio-stripe-live-footnote">Live Stripe — independent of table / canister cache until Push / Check sync succeeds.</p>
                `);const{emailRes:gt,principalRes:Lt,anySynced:bt}=await tt(H),wt=Aa(gt,Lt),{up:_t,refreshErr:At}=await z();At?G(`Could not reload canister / table: ${At}. Live Stripe may still differ from what is stored.`):_t?q&&!af(_t)?G(`Stripe shows active membership for this email, but the canister still shows "${String(_t.stripeSubscriptionStatus||"empty")}". ${bt?"":`Sync did not report success. ${wt}`} Check integration service logs, integration identity (adminSetIntegrationServicePrincipal), and redeploy API if sync-by-email returns 404.`):G(""):G("No account row returned for this principal after refresh.")}catch(R){I(R instanceof Error?R.message:String(R))}finally{E instanceof HTMLButtonElement&&(E.disabled=!1,E.textContent=N)}}),f==null||f.addEventListener("click",async()=>{const H=g.querySelector("#studio-user-edit-role"),R=H instanceof HTMLSelectElement?H.value:"artist",x=g.querySelector("#studio-user-edit-status"),q=x instanceof HTMLSelectElement?x.value:"pending",X=g.querySelector("#studio-user-edit-membership"),gt=(X instanceof HTMLSelectElement?X.value:"standard")==="manual_exempt",Lt={...n,role:{[R]:null},status:{[q]:null},membershipExemptManual:gt,trialStartedAtSec:n.trialStartedAtSec??n.trial_started_at_sec??[],trialEndsAtSec:n.trialEndsAtSec??n.trial_ends_at_sec??[],updatedAt:new Date().toISOString()};f instanceof HTMLButtonElement&&(f.disabled=!0),v instanceof HTMLElement&&(v.textContent="",v.hidden=!0);try{await Pa(a,Lt),A(),await s()}catch(bt){const wt=bt instanceof Error?bt.message:String(bt);v instanceof HTMLElement&&(v.textContent=wt,v.hidden=!1)}finally{f instanceof HTMLButtonElement&&(f.disabled=!1)}})}async function Rf(e){const s=e.querySelector("#studio-users-self"),i=e.querySelector("#studio-users-tbody"),o=e.querySelector("#studio-users-filter-role"),n=e.querySelector("#studio-users-filter-status"),a=e.querySelector("#studio-users-filter-membership"),r=e.querySelector("#studio-users-header-count"),l=e.querySelector("#studio-users-sync-all"),d=e.querySelector("#studio-users-load-contacts"),p=e.querySelector("#studio-users-generate-trial-code"),u=e.querySelector("#studio-users-view-access-codes"),c=e.querySelector("#studio-users-trial-role"),m=e.querySelector("#studio-users-sync-msg");let b=[],C=new Map,w=new Map;const L=v=>v.membershipExemptManual?U("Exempt (manual)"):U(uo(v.stripeSubscriptionStatus)),A=v=>new Map((Array.isArray(v)?v:[]).map(E=>{const j=E&&E[0]&&typeof E[0]=="object"&&typeof E[0].toText=="function"?E[0].toText():String((E==null?void 0:E[0])||""),M=(E==null?void 0:E[1])||{},S=String(M.firstName||"").trim(),h=String(M.lastName||"").trim(),T=String(M.email||"").trim(),N=`${S} ${h}`.trim();return[j,{firstName:S,lastName:h,fullName:N,email:T}]})),g=async()=>{const v=await Yi();w=A(v)},f=()=>{if(!i)return;const v=(o==null?void 0:o.value)||"",E=(n==null?void 0:n.value)||"",j=(a==null?void 0:a.value)||"",M=b.filter(S=>!(v&&S.role!==v||E&&S.status!==E||!De(S,j)));if(r&&(r.textContent=String(M.length)),!M.length){const S=b.length===0&&!v&&!E&&!j?"No accounts on this canister yet.":"No accounts match filters.";i.innerHTML=`<tr><td colspan="13">${S}</td></tr>`;return}i.innerHTML=M.map(S=>{const h=S.linkedArtistId?String(S.linkedArtistId):"",T=h?C.get(h)||h:"",N=w.get(String(S.principal||""))||null,O=(N==null?void 0:N.fullName)||[N==null?void 0:N.firstName,N==null?void 0:N.lastName].filter(Boolean).join(" "),G=(N==null?void 0:N.email)||"",V=Jr(S.updatedAt);return`<tr>
                <td><span class="studio-user-sub-dot ${Zc(S)}" title="Subscription health" aria-hidden="true"></span></td>
                <td><span class="studio-identity-short" title="${U(S.principal)}">${U(Xi(S.principal))}</span></td>
                <td>${O?U(O):"—"}</td>
                <td>${G?U(G):"—"}</td>
                <td>${U(S.role)}</td>
                <td>${U(S.status)}</td>
                <td>${L(S)}</td>
                <td>${U(rf(S))}</td>
                <td><span class="studio-muted" title="${U(S.stripeCurrentPeriodEnd||"")}">${U(zs(S.stripeCurrentPeriodEnd))}</span></td>
                <td>${T?U(T):"—"}</td>
                <td>${S.linkedOrgId?U(String(S.linkedOrgId)):"—"}</td>
                <td><span class="studio-muted" title="${U(V.title)}">${U(V.label)}</span></td>
                <td><button type="button" class="studio-btn-primary studio-user-manage" data-principal="${U(S.principal)}">Manage</button></td>
            </tr>`}).join("")};try{const v=await oo();if(typeof v.getAccountForCaller=="function"){const h=await v.getAccountForCaller();let T=h;Array.isArray(h)&&(T=h.length?h[0]:null),s&&(s.innerHTML=$a(T||null))}else s&&(s.innerHTML='<p class="studio-muted">Account lookup is not available. Regenerate canister declarations if needed.</p>');if(typeof v.listAccounts!="function"){i&&(i.innerHTML='<tr><td colspan="13">listAccounts missing from declarations — run <code>dfx generate fusion-app-backend</code>.</td></tr>');return}try{b=await Te();try{const h=await ke();C=new Map((h||[]).map(T=>{const N=String((T==null?void 0:T.id)||""),O=String((T==null?void 0:T.name)||"").trim(),G=String((T==null?void 0:T.contactEmail)||"").trim(),V=[O,G].filter(Boolean).join(" · ");return[N,V||N]}))}catch{C=new Map}try{await g()}catch{w=new Map}}catch(h){i&&(i.innerHTML=`<tr><td colspan="13">${U(h instanceof Error?h.message:String(h))}</td></tr>`),o==null||o.addEventListener("change",f),n==null||n.addEventListener("change",f),a==null||a.addEventListener("change",f);return}f(),o==null||o.addEventListener("change",f),n==null||n.addEventListener("change",f),a==null||a.addEventListener("change",f);const E=p instanceof HTMLButtonElement?p:null;E&&E.addEventListener("click",async()=>{const h=c instanceof HTMLSelectElement?c.value:"artist",T={[h]:null};E.disabled=!0;try{const N=await pd(T,2);await Eo(N,`Role: ${h}
Trial: 2 months from redemption
Use in Join flow to create trial account.`),m&&(m.textContent="Trial access code generated.")}catch(N){const O=N instanceof Error?N.message:String(N);m&&(m.textContent=/Could not allocate trial join code/i.test(O)?"Could not generate a trial access code. Redeploy the backend with the latest access-code generator fix, then try again.":O)}finally{E.disabled=!1}});const j=u instanceof HTMLButtonElement?u:null;j&&j.addEventListener("click",async()=>{j.disabled=!0;try{const h=await Na(),T=(Array.isArray(h)?h:[]).map(V=>{const at=String((V==null?void 0:V[0])??""),tt=(V==null?void 0:V[1])||{},z=tt&&typeof tt=="object"?tt.role:null,F=z&&typeof z=="object"?String(Object.keys(z)[0]||""):"",I=!!(tt&&typeof tt=="object"&&tt.active),y=String((tt&&typeof tt=="object"?tt.createdAt??tt.created_at:"")||"");return{code:at,role:F,active:I,createdAt:y}}).filter(V=>V.code),N=T.filter(V=>V.active),O=T.filter(V=>!V.active),G=(V,at)=>V.length?`<div class="studio-table-wrap"><table class="studio-table studio-table--dense"><thead><tr><th>Code</th><th>Role</th><th>Created</th></tr></thead><tbody>${V.map(tt=>`<tr><td><code>${U(tt.code)}</code></td><td>${U(tt.role||"—")}</td><td><span class="studio-muted" title="${U(tt.createdAt||"")}">${U(le(tt.createdAt))}</span></td></tr>`).join("")}</tbody></table></div>`:`<p class="studio-muted">${U(at)}</p>`;qt(`<div class="studio-section-stack"><h3 class="studio-subheading" style="margin:0">Pending (generated, not redeemed)</h3>${G(N,"No pending access codes.")}<h3 class="studio-subheading" style="margin:0.5rem 0 0">Redeemed</h3>${G(O,"No redeemed access codes.")}</div>`,{title:"Access Codes",compact:!0})}catch(h){m&&(m.textContent=h instanceof Error?h.message:String(h))}finally{j.disabled=!1}}),i&&!i.dataset.studioUserManageBound&&(i.dataset.studioUserManageBound="1",i.addEventListener("click",h=>{const T=h.target;if(!(T instanceof Element))return;const N=T.closest(".studio-user-manage");if(!N||!i.contains(N))return;const O=N.getAttribute("data-principal");if(!O)return;const G=b.find(V=>V.principal===O);G&&Nf(G,async()=>{try{b=await Te(),f(),m&&(m.textContent="Account updated.")}catch(V){m&&(m.textContent=V instanceof Error?V.message:String(V))}},async()=>{try{b=await Te(),f()}catch{}})}));const M=d instanceof HTMLButtonElement?d:null;M&&M.addEventListener("click",async()=>{M.disabled=!0,M.setAttribute("aria-busy","true"),m&&(m.textContent="Loading contacts…");let h=0,T=0,N=0;try{if(ee()){const O=b.map(tt=>tt.principal).filter(Boolean),G=await md(O),V=Array.isArray(G.contacts)?G.contacts:[],at=new Map(V.map(tt=>[String(tt.principal||""),tt]));for(const tt of b){const z=String(tt.principal||"").trim();if(!z){T+=1;continue}const F=w.get(z)||{firstName:"",lastName:"",fullName:"",email:""},I=at.get(z)||{},y=String(I.fullName||"").trim(),_=y.split(/\s+/).filter(Boolean),$=String(I.firstName||"").trim()||(_.length>1?_.slice(0,-1).join(" "):y),H=String(I.lastName||"").trim()||(_.length>1?_[_.length-1]:""),R={firstName:F.firstName||$,lastName:F.lastName||H,email:F.email||String(I.email||"").trim()};if(!R.firstName&&!R.lastName&&!R.email){T+=1;continue}if(R.firstName===F.firstName&&R.lastName===F.lastName&&R.email===F.email){T+=1;continue}try{await fd(z,R),h+=1}catch{N+=1}}N+=Array.isArray(G.failures)?G.failures.length:0}else T=b.length;try{await g()}catch{N+=1}if(f(),m){const O=ee()?"":" Integration API URL is not set; refreshed saved canister contacts only.";m.textContent=`Contacts loaded: ${h} saved, ${T} skipped, ${N} failed.${O}`}}catch(O){m&&(m.textContent=O instanceof Error?O.message:String(O))}finally{M.disabled=!1,M.setAttribute("aria-busy","false")}});const S=l instanceof HTMLButtonElement?l:null;S&&(S.disabled=!ee(),!ee()&&m&&(m.textContent="Set integration API URL to sync subscriptions."),S.addEventListener("click",async()=>{var O;if(!ee())return;S.disabled=!0,S.setAttribute("aria-busy","true"),m&&(m.textContent="Syncing…");let h=0,T=0,N=0;for(const G of b){const V=String(G.principal||"").trim();if(!V){T+=1;continue}const at=((O=w.get(V))==null?void 0:O.email)||"";try{const{anySynced:tt,emailRes:z,principalRes:F}=await Or(V,at);if(tt)h+=1;else{const I=String((z==null?void 0:z.reason)||(F==null?void 0:F.reason)||"no_stripe_match");/no_stripe_customer|no_customer|no_subscription|invalid_email/i.test(I)?T+=1:N+=1}}catch{N+=1}}try{b=await Te(),f()}catch{}if(m){const G=[`${h} synced`];T>0&&G.push(`${T} skipped (no Stripe match)`),N>0&&G.push(`${N} failed`),m.textContent=`Done: ${G.join(", ")}.`}S.disabled=!1,S.setAttribute("aria-busy","false")}))}catch(v){i&&(i.innerHTML=`<tr><td colspan="13">${U(v instanceof Error?v.message:String(v))}</td></tr>`)}}async function Ss(e){try{return await navigator.clipboard.writeText(e),!0}catch{try{const s=document.createElement("textarea");return s.value=e,document.body.appendChild(s),s.select(),document.execCommand("copy"),s.remove(),!0}catch{return!1}}}function Uf(){qt(`
      <p class="studio-muted">PayPal is the active provider for every new payment. You only need the <strong>client ID</strong> in the browser; the secret and plan IDs live on the integration server.</p>
      <ol class="studio-help-list">
        <li>Open the <a href="https://developer.paypal.com/dashboard/applications/sandbox" target="_blank" rel="noopener">PayPal Developer Dashboard → Apps &amp; Credentials</a>. Use <strong>Sandbox</strong> while testing, then repeat in <strong>Live</strong>.</li>
        <li>Create (or open) an app and copy the <strong>Client ID</strong> into the matching field above (Sandbox → Sandbox, Live → Live).</li>
        <li>Copy the <strong>Secret</strong> into <code>services/fusion-integration-api/.env</code> as <code>PAYPAL_CLIENT_SECRET</code>, with <code>PAYPAL_CLIENT_ID</code> and <code>PAYPAL_MODE=sandbox</code> (or <code>live</code>).</li>
        <li>Under <strong>Billing → Products &amp; plans</strong> (or via API), create a product, then subscription plans: bimonthly (<code>MONTH</code> ×2) and annual (<code>YEAR</code> ×1). Put the plan IDs on the server as <code>PAYPAL_PLAN_BIMONTHLY_ID</code> and <code>PAYPAL_PLAN_ANNUAL_ID</code>.</li>
        <li>Add a webhook pointing at <code>&lt;integration-api&gt;/webhooks/paypal</code> and set <code>PAYPAL_WEBHOOK_ID</code>.</li>
        <li>Set the environment toggle above to <strong>Test / Sandbox</strong> for testing. Use the sandbox buyer account to complete a checkout.</li>
      </ol>
      <p class="studio-muted">Program installment plans are currently disabled for PayPal — members use manual payments until variable-length plans ship.</p>`,{title:"Set up PayPal (primary payments)",wide:!0})}function Ff(){qt(`
      <ol class="studio-help-list">
        <li>Open <a href="https://dashboard.stripe.com/test/apikeys" target="_blank" rel="noopener">Stripe Dashboard → Developers → API keys</a> (test mode).</li>
        <li>Copy <strong>Publishable key</strong> (<code>pk_test_…</code>) into Studio above — used by Stripe.js in the browser.</li>
        <li>Copy <strong>Secret key</strong> (<code>sk_test_…</code>) into <code>services/fusion-integration-api/.env</code> as <code>STRIPE_SECRET_KEY</code> (never expose in client bundles).</li>
        <li>Create a recurring <strong>Price</strong> (e.g. $50 every 2 months) and set <code>STRIPE_PRICE_ID=price_…</code> on the integration server. Join uses <code>POST /stripe/create-subscription</code>.</li>
        <li>Register <code>/webhooks/stripe</code> in Stripe with <code>STRIPE_WEBHOOK_SECRET</code>; set <code>FUSION_BACKEND_CANISTER_ID</code>, <code>INTEGRATION_IC_IDENTITY_PEM</code> (full PEM from <code>dfx identity export</code> — Ed25519 or secp256k1), <code>IC_HOST</code>; optionally <code>INTEGRATION_IC_IDENTITY_JSON</code> instead of PEM for legacy Ed25519 JSON. Then call the canister <code>adminSetIntegrationServicePrincipal</code> with that identity’s principal (see <code>services/fusion-integration-api/README.md</code>).</li>
        <li>Run the integration API locally: <code>npm run integration-api</code> from the repo root; use <code>VITE_INTEGRATION_API_URL=/integration</code> with Vite proxy.</li>
        <li>Test cards: <a href="https://stripe.com/docs/testing" target="_blank" rel="noopener">Stripe testing</a> (e.g. <code>4242 4242 4242 4242</code>).</li>
        <li>Studio “Test PaymentIntent” still uses <code>POST /stripe/create-payment-intent</code> for debugging.</li>
      </ol>`,{title:"Set up Stripe (subscriptions + tests)",wide:!0})}function Df(){qt(`
      <ol class="studio-help-list">
        <li>Create an API key at <a href="https://resend.com/api-keys" target="_blank" rel="noopener">resend.com/api-keys</a>.</li>
        <li>Set <code>RESEND_API_KEY</code> and <code>RESEND_FROM</code> (verified domain or onboarding address) in the integration API <code>.env</code>.</li>
        <li>Email is sent via <code>POST /email/send</code> so the browser never holds the Resend secret.</li>
        <li>Optional: Studio <strong>From</strong> overrides the sender for test mail if the address is verified in Resend.</li>
      </ol>`,{title:"Set up Resend",wide:!0})}function Bf(){qt(`
      <ol class="studio-help-list">
        <li>Create an S3 bucket and IAM user/role with <code>s3:PutObject</code> on a prefix such as <code>uploads/*</code>.</li>
        <li>Set <code>AWS_REGION</code>, <code>S3_BUCKET</code>, and optionally <code>S3_PUBLIC_BASE_URL</code> (CloudFront or bucket URL) on the integration server.</li>
        <li>Bucket CORS: allow <code>PUT</code> from your site origin for presigned uploads.</li>
        <li>Studio calls <code>POST /storage/presign</code> then uploads the file with the returned URL.</li>
      </ol>
      <p class="studio-muted"><strong>Key naming</strong> (under <code>uploads/</code> or <code>S3_KEY_PREFIX</code>): <code>{area}/{8-char-id}-{sanitized-filename}</code>. Allowed <code>area</code> values: <code>studio/content</code>, <code>studio/artists</code>, <code>studio/programs</code>, <code>studio/editions</code>, <code>studio/journal</code>, <code>studio/misc</code>, <code>account/profile</code>, <code>services/test</code>. Unknown areas fall back to <code>studio/misc</code>.</p>`,{title:"Set up S3 uploads",wide:!0})}function Of(e,s){return s.toLowerCase()==="jpy"?Math.round(e):Math.round(e*100)}function Jf(e){const s=e.querySelector('[data-studio-tabs="services"]');if(!s)return;const i=s.querySelectorAll('.studio-tabs__tab[role="tab"]'),o=s.querySelectorAll('.studio-tabs__panel[role="tabpanel"]'),n=a=>{const r=a.getAttribute("aria-controls");r&&(i.forEach(l=>{const d=l===a;l.setAttribute("aria-selected",d?"true":"false"),l.classList.toggle("is-active",d)}),o.forEach(l=>{const d=l.id===r;l.hidden=!d,l.classList.toggle("is-active",d)}))};i.forEach(a=>{a.addEventListener("click",()=>n(a))})}async function Vf(e){var ot,gt,Lt,bt,wt,_t,At,nt,dt,yt,K,et,Y,st,B,P;const s=e.querySelector("#studio-svc-msg"),i=(k,J)=>{s&&(s.style.display=J?"block":"none",s.className=`studio-banner studio-banner--${k}`,s.textContent=J)},o=e.querySelector("#studio-svc-url"),n=e.querySelector("#studio-svc-bearer"),a=e.querySelector("#studio-svc-mode-test"),r=e.querySelector("#studio-svc-mode-live"),l=e.querySelector("#studio-svc-provider-paypal"),d=e.querySelector("#studio-svc-provider-stripe"),p=e.querySelector("#studio-svc-pk-test"),u=e.querySelector("#studio-svc-pk-live"),c=e.querySelector("#studio-svc-paypal-test"),m=e.querySelector("#studio-svc-paypal-live"),b=e.querySelector("#studio-svc-sk-test"),C=e.querySelector("#studio-svc-sk-live"),w=e.querySelector("#studio-svc-resend-to"),L=e.querySelector("#studio-svc-resend-from"),A=e.querySelector("#studio-svc-application-admin-emails"),g=e.querySelector("#studio-svc-s3-region"),f=e.querySelector("#studio-svc-s3-bucket"),v=e.querySelector("#studio-svc-s3-public"),E=e.querySelector("#studio-svc-pk-resolved"),j=e.querySelector("#studio-svc-paypal-resolved"),M=e.querySelector("#studio-svc-paypal-status"),S=e.querySelector("#studio-svc-stripe-status"),h=e.querySelectorAll("[data-studio-pay-env-label]"),T=e.querySelectorAll("[data-studio-pay-provider-label]"),N=e.querySelectorAll("[data-studio-pay-provider-badge]"),O=e.querySelectorAll("[data-studio-pay-card]"),G=()=>{var Ft,Ht;const k=r!=null&&r.checked?"live":"test",J=k==="live"?"Live":"Test / Sandbox";h.forEach(Tt=>{Tt.textContent=J});const W=d!=null&&d.checked?"stripe":"paypal",Z=W==="stripe"?"Stripe":"PayPal";T.forEach(Tt=>{Tt.textContent=Z}),O.forEach(Tt=>{if(!(Tt instanceof HTMLElement))return;const Rt=Tt.getAttribute("data-studio-pay-card")===W;Tt.classList.toggle("studio-pay-card--active",Rt),Tt.classList.toggle("studio-pay-card--legacy",!Rt)}),N.forEach(Tt=>{if(!(Tt instanceof HTMLElement))return;const Rt=Tt.getAttribute("data-studio-pay-provider-badge")===W;Tt.textContent=Rt?"Active · new checkouts":"Inactive",Tt.classList.toggle("studio-pay-badge--active",Rt),Tt.classList.toggle("studio-pay-badge--legacy",!Rt)});const pt=((Ft=k==="live"?m==null?void 0:m.value:c==null?void 0:c.value)==null?void 0:Ft.trim())||""||Vd();if(j&&(j.textContent=pt?`${pt.slice(0,14)}…`:"(none)"),M){const Tt=!!pt;M.textContent=Tt?`${J} · client ID set`:`${J} · not configured`,M.classList.toggle("is-ok",Tt),M.classList.toggle("is-warn",!Tt)}const It=((Ht=k==="live"?u==null?void 0:u.value:p==null?void 0:p.value)==null?void 0:Ht.trim())||""||Qi();if(E&&(E.textContent=It?`${It.slice(0,14)}…`:"(none)"),S){const Tt=!!It;S.textContent=Tt?`${J} · key set`:`${J} · not configured`,S.classList.toggle("is-ok",Tt),S.classList.toggle("is-warn",!Tt)}},V=()=>{try{o&&(o.value=localStorage.getItem(fn)||""),n&&(n.value=localStorage.getItem(bn)||"");const k=Wd();a&&(a.checked=k!=="live"),r&&(r.checked=k==="live");const J=Gd();l&&(l.checked=J!=="stripe"),d&&(d.checked=J==="stripe"),p&&(p.value=localStorage.getItem(gn)||""),u&&(u.value=localStorage.getItem(yn)||""),c&&(c.value=localStorage.getItem(hn)||""),m&&(m.value=localStorage.getItem(vn)||""),w&&(w.value=localStorage.getItem(Sn)||""),L&&(L.value=localStorage.getItem(wn)||""),A&&(A.value=localStorage.getItem(ui)||""),g&&(g.value=localStorage.getItem(En)||""),f&&(f.value=localStorage.getItem(Ln)||""),v&&(v.value=localStorage.getItem(Tn)||"")}catch{}G()},at=()=>{try{o&&localStorage.setItem(fn,o.value.trim()),n&&localStorage.setItem(bn,n.value.trim()),r!=null&&r.checked?ci("live"):ci("test"),an(d!=null&&d.checked?"stripe":"paypal"),p&&localStorage.setItem(gn,p.value.trim()),u&&localStorage.setItem(yn,u.value.trim()),c&&localStorage.setItem(hn,c.value.trim()),m&&localStorage.setItem(vn,m.value.trim()),w&&localStorage.setItem(Sn,w.value.trim()),L&&localStorage.setItem(wn,L.value.trim()),A&&localStorage.setItem(ui,A.value.trim()),g&&localStorage.setItem(En,g.value.trim()),f&&localStorage.setItem(Ln,f.value.trim()),v&&localStorage.setItem(Tn,v.value.trim())}catch(k){i("error",k instanceof Error?k.message:String(k));return}V(),i("ok","Saved Services configuration.")};V();const tt=async()=>{for(let k=1;k<=5;k+=1){const J=e.querySelector(`#studio-svc-seg-name-${k}`),W=e.querySelector(`#studio-svc-seg-id-${k}`);J instanceof HTMLInputElement&&(J.value=""),W instanceof HTMLInputElement&&(W.value="")}try{const k=await so();if(!Array.isArray(k))return;k.slice(0,5).forEach((J,W)=>{const Z=W+1,ct=e.querySelector(`#studio-svc-seg-name-${Z}`),pt=e.querySelector(`#studio-svc-seg-id-${Z}`);ct instanceof HTMLInputElement&&(ct.value=String((J==null?void 0:J.name)||"")),pt instanceof HTMLInputElement&&(pt.value=String((J==null?void 0:J.segmentId)||""))})}catch{}};tt(),(ot=e.querySelector("#studio-svc-resend-segments-save"))==null||ot.addEventListener("click",async()=>{const k=[];for(let J=1;J<=5;J+=1){const W=e.querySelector(`#studio-svc-seg-name-${J}`),Z=e.querySelector(`#studio-svc-seg-id-${J}`),ct=W instanceof HTMLInputElement?W.value.trim():"",pt=Z instanceof HTMLInputElement?Z.value.trim():"";(ct||pt)&&k.push({name:ct,segmentId:pt})}if(k.length>5){i("error","At most 5 segments.");return}i("info","Saving…");try{await bd(k),i("ok","Segment config saved to canister."),await tt()}catch(J){i("error",J instanceof Error?J.message:String(J))}});const z=e.querySelector("#studio-svc-subscription-en"),F=e.querySelector("#studio-svc-subscription-ja"),I=async()=>{var k,J;try{const W=await Wa();z&&(z.value=(((k=W.en)==null?void 0:k.whatsIncludedBullets)||[]).join(`
`)),F&&(F.value=(((J=W.ja)==null?void 0:J.whatsIncludedBullets)||[]).join(`
`))}catch{}};I(),Jf(e),[l,d].forEach(k=>{k==null||k.addEventListener("change",()=>{an(d!=null&&d.checked?"stripe":"paypal"),G()})}),[a,r].forEach(k=>{k==null||k.addEventListener("change",()=>{ci(r!=null&&r.checked?"live":"test"),G()})}),[c,m,p,u].forEach(k=>{k==null||k.addEventListener("input",G)}),(gt=e.querySelector("#studio-svc-save-payments"))==null||gt.addEventListener("click",()=>at()),(Lt=e.querySelector("#studio-svc-help-paypal"))==null||Lt.addEventListener("click",()=>Uf()),(bt=e.querySelector("#studio-svc-subscription-save"))==null||bt.addEventListener("click",async()=>{const k=String((z==null?void 0:z.value)||"").split(/\r?\n/).map(W=>W.trim()).filter(Boolean),J=String((F==null?void 0:F.value)||"").split(/\r?\n/).map(W=>W.trim()).filter(Boolean);i("info","Saving…");try{await gd({en:{whatsIncludedBullets:k},ja:{whatsIncludedBullets:J}}),i("ok","Saved subscription application copy."),await I()}catch(W){i("error",W instanceof Error?W.message:String(W))}}),(wt=e.querySelector("#studio-svc-save"))==null||wt.addEventListener("click",()=>at()),(_t=e.querySelector("#studio-svc-health"))==null||_t.addEventListener("click",async()=>{i("info","");try{const k=await yd(),J=[k.stripePrice,k.fusionCanister,k.stripeWebhook].filter(Boolean).length?` | price: ${k.stripePrice??"—"}, canister: ${k.fusionCanister??"—"}, webhook: ${k.stripeWebhook??"—"}`:"";i("ok",`OK — Stripe: ${k.stripe}, Resend: ${k.resend}, S3: ${k.s3}${J}`)}catch(k){i("error",k instanceof Error?k.message:String(k))}}),(At=e.querySelector("#studio-svc-help-stripe"))==null||At.addEventListener("click",()=>Ff()),(nt=e.querySelector("#studio-svc-help-resend"))==null||nt.addEventListener("click",()=>Df()),(dt=e.querySelector("#studio-svc-help-s3"))==null||dt.addEventListener("click",()=>Bf()),(yt=e.querySelector("#studio-svc-copy-env"))==null||yt.addEventListener("click",async()=>{const k=hd((b==null?void 0:b.value)||"",(C==null?void 0:C.value)||"",{awsRegion:(g==null?void 0:g.value)||"",s3Bucket:(f==null?void 0:f.value)||"",s3Public:(v==null?void 0:v.value)||""}),J=await Ss(k);i(J?"ok":"error",J?"Copied .env snippet to clipboard.":"Copy failed.")}),(K=e.querySelector("#studio-svc-send-test"))==null||K.addEventListener("click",async()=>{const k=((w==null?void 0:w.value)||"").trim();if(!k.includes("@")){i("error","Enter a test recipient email.");return}i("info","Sending…");try{const J=((L==null?void 0:L.value)||"").trim();await He({to:k,subject:"Fusion | Studio test email",text:"If you received this, Resend + integration API are configured.",...J&&J.includes("@")?{from:J}:{}}),i("ok","Test email sent.")}catch(J){i("error",J instanceof Error?J.message:String(J))}}),(et=e.querySelector("#studio-svc-new-applicant-notify-test"))==null||et.addEventListener("click",async()=>{if(!ee()){i("error","Integration API URL is not configured (Services → URL).");return}if(A)try{localStorage.setItem(ui,String(A.value||"").trim())}catch{}const k=vd();if(!k.length){i("error","No staff notification recipients (unexpected).");return}i("info","Sending new applicant test…");try{const J=await We(),W=J[0]?ja(J[0]):"Sample program",{subject:Z,text:ct}=Sd({programName:W,payloadFields:{firstName:"Test",lastName:"Applicant",website:"https://example.org"},submittedAt:new Date().toISOString()}),pt=((L==null?void 0:L.value)||"").trim();for(const ft of k)await He({to:ft,subject:Z,text:ct,...pt&&pt.includes("@")?{from:pt}:{}});i("ok","New applicant notification test sent to all staff recipients.")}catch(J){i("error",J instanceof Error?J.message:String(J))}});const y=e.querySelector("#studio-svc-pi-amount"),_=e.querySelector("#studio-svc-pi-currency"),$=e.querySelector("#studio-svc-pi-secret"),H=e.querySelector("#studio-svc-pi-copy");(Y=e.querySelector("#studio-svc-pi-create"))==null||Y.addEventListener("click",async()=>{const k=parseFloat((y==null?void 0:y.value)||"0"),J=((_==null?void 0:_.value)||"usd").toLowerCase();if(!Number.isFinite(k)||k<=0){i("error","Enter a valid amount.");return}const W=Of(k,J);if(W<50){i("error","Amount too small (minimum 50 in smallest currency units, e.g. $0.50 or ¥50).");return}i("info","Creating PaymentIntent…");try{const{clientSecret:Z}=await wd(W,J,{source:"studio-test"});$&&($.value=Z||""),H&&(H.disabled=!Z),i("ok","PaymentIntent created.")}catch(Z){$&&($.value=""),H&&(H.disabled=!0),i("error",Z instanceof Error?Z.message:String(Z))}}),(st=e.querySelector("#studio-svc-pi-copy"))==null||st.addEventListener("click",async()=>{const k=(($==null?void 0:$.value)||"").trim();if(!k)return;const J=await Ss(k);i(J?"ok":"error",J?"Copied client secret.":"Copy failed.")});const R=e.querySelector("#studio-svc-s3-file"),x=e.querySelector("#studio-svc-s3-status"),q=e.querySelector("#studio-svc-s3-result-url"),X=e.querySelector("#studio-svc-s3-copy-url");(B=e.querySelector("#studio-svc-s3-upload"))==null||B.addEventListener("click",async()=>{var J;const k=(J=R==null?void 0:R.files)==null?void 0:J[0];if(!k){i("error","Choose a file first.");return}i("info","Uploading…"),x&&(x.style.display="block",x.textContent="Uploading…"),q&&(q.value=""),X&&(X.disabled=!0);try{const W=await Gt(k,null,{area:"services/test"});q&&(q.value=W),X&&(X.disabled=!1),x&&(x.textContent="Upload complete."),i("ok","File uploaded.")}catch(W){x&&(x.textContent="",x.style.display="none"),i("error",W instanceof Error?W.message:String(W))}}),(P=e.querySelector("#studio-svc-s3-copy-url"))==null||P.addEventListener("click",async()=>{const k=((q==null?void 0:q.value)||"").trim();if(!k)return;const J=await Ss(k);i(J?"ok":"error",J?"Copied public URL.":"Copy failed.")})}function Ca(e){const s=e.paragraphs.map(n=>`<p class="studio-muted" style="margin:0 0 0.75rem">${U(n)}</p>`).join(""),i=e.danger?"studio-btn-danger":"studio-btn-primary",o=`${s}
<div class="studio-modal-actions" style="margin-top:1rem;padding-top:0.75rem;border-top:1px solid #e2e8f0">
<button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Cancel</button>
<button type="button" class="${i}" id="studio-settings-confirm-ok">${U(e.confirmLabel)}</button>
</div>`;return new Promise(n=>{var d;let a=!1;const{close:r,root:l}=qt(o,{title:e.title,compact:!0,onClose:()=>{a||(a=!0,n(!1))}});(d=l.querySelector("#studio-settings-confirm-ok"))==null||d.addEventListener("click",()=>{a||(a=!0,n(!0),r())})})}async function Wf(e){const s=e.querySelector("#studio-platform-banner-tools"),i=e.querySelector("#studio-platform-banner-enabled"),o=e.querySelector("#studio-platform-banner-en"),n=e.querySelector("#studio-platform-banner-ja"),a=e.querySelector("#studio-platform-banner-save"),r=e.querySelector("#studio-platform-banner-status"),l=d=>{r&&(r.textContent=d||"")};if(s){if(!Jt("settings").canEdit){s.hidden=!0;return}if(Ct()==="live"){const{getAuthenticatedFusionBackendActor:d}=await je(()=>import("./index-20317f29.js").then(c=>c.e_),["assets/index-20317f29.js","assets/index-06c7870c.css"]),p=await d();let u=!1;if(p&&typeof p.isCallerAdmin=="function")try{u=await p.isCallerAdmin()}catch{u=!1}if(!u){s.hidden=!0;return}}s.hidden=!1;try{const d=await Kd();i instanceof HTMLInputElement&&(i.checked=!!d.enabled),o instanceof HTMLTextAreaElement&&(o.value=d.messageEn),n instanceof HTMLTextAreaElement&&(n.value=d.messageJa)}catch(d){l(d instanceof Error?d.message:String(d))}a==null||a.addEventListener("click",async()=>{l("Saving…"),a instanceof HTMLButtonElement&&(a.disabled=!0);try{await zd({enabled:i instanceof HTMLInputElement?i.checked:!1,messageEn:o instanceof HTMLTextAreaElement?o.value.trim():"",messageJa:n instanceof HTMLTextAreaElement?n.value.trim():""}),l("Banner settings saved.")}catch(d){l(d instanceof Error?d.message:String(d))}finally{a instanceof HTMLButtonElement&&(a.disabled=!1)}})}}async function Gf(e){const s=e.querySelector("#studio-set-datasource"),i=e.querySelector("#studio-set-network"),o=e.querySelector("#studio-ds-test"),n=e.querySelector("#studio-ds-live"),a=()=>{const A=Ct();s&&(s.textContent=A),o&&(o.checked=A==="test"),n&&(n.checked=A==="live")};a(),o==null||o.addEventListener("change",()=>{o.checked&&rn("test"),a()}),n==null||n.addEventListener("change",()=>{n.checked&&rn("live"),a()}),window.addEventListener("fusion-data-source-change",a),je(()=>import("./index-20317f29.js").then(A=>A.eZ),["assets/index-20317f29.js","assets/index-06c7870c.css"]).then(A=>{i&&(i.textContent=A.DEV_MODE?"devMode true (local / fetch root key)":"devMode false (icp-api.io)")}),await Wf(e);const r=e.querySelector("#studio-db-admin-tools"),l=e.querySelector("#studio-db-admin-status"),d=e.querySelector("#studio-db-download"),p=e.querySelector("#studio-db-restore-file"),u=e.querySelector("#studio-db-restore-pick"),c=e.querySelector("#studio-db-restore-run"),m=A=>{l&&(l.textContent=A||"")};let b=null;if(!r)return;if(Ct()!=="live"){r.hidden=!0;return}if(!Jt("settings").canEdit){r.hidden=!0;return}const{getAuthenticatedFusionBackendActor:C}=await je(()=>import("./index-20317f29.js").then(A=>A.e_),["assets/index-20317f29.js","assets/index-06c7870c.css"]),w=await C();let L=!1;if(w&&typeof w.isCallerAdmin=="function")try{L=await w.isCallerAdmin()}catch{L=!1}if(!L){r.hidden=!0;return}if(r.hidden=!1,!(w!=null&&w.adminExportFullDatabase)||!(w!=null&&w.adminImportFullDatabase)){m("Database export/import requires an updated backend and fresh declarations. Deploy `fusion-app-backend` with adminExportFullDatabase / adminImportFullDatabase, then run `dfx generate fusion-app-backend` from the project root."),d&&(d.disabled=!0),u&&(u.disabled=!0),c&&(c.disabled=!0);return}u==null||u.addEventListener("click",()=>p==null?void 0:p.click()),p==null||p.addEventListener("change",()=>{var g;const A=(g=p.files)==null?void 0:g[0];b=A||null,c&&(c.disabled=!b),m(A?`Selected: ${A.name}`:"")}),d==null||d.addEventListener("click",async()=>{if(await Ca({title:"Download full database?",paragraphs:["This exports all live canister data (accounts, artists, programs, subscribers, site settings, and more) to a JSON file on your device.","Treat the file as highly sensitive. Store it securely; anyone with the file can inspect your data or use it to overwrite a canister when restoring."],confirmLabel:"Download JSON",danger:!1})){m("Exporting…"),d&&(d.disabled=!0);try{const g=await w.adminExportFullDatabase(),{serializeDatabaseSnapshotToJson:f}=await je(()=>import("./databaseSnapshotJson-6bc0c3e5.js"),["assets/databaseSnapshotJson-6bc0c3e5.js","assets/index-20317f29.js","assets/index-06c7870c.css"]),v=f(g),E=new Blob([v],{type:"application/json"}),j=URL.createObjectURL(E),M=document.createElement("a"),S=new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");M.href=j,M.download=`fusion-database-backup-${S}.json`,M.rel="noopener",document.body.appendChild(M),M.click(),M.remove(),URL.revokeObjectURL(j),m("Download started.")}catch(g){m(g instanceof Error?g.message:String(g))}finally{d&&(d.disabled=!1)}}}),c==null||c.addEventListener("click",async()=>{if(!b)return;const A=b.name||"selected file";if(await Ca({title:"Restore entire database?",paragraphs:[`This will replace ALL live canister data with the contents of “${A}”. This cannot be undone.`,"Use only trusted backups. Ensure the JSON includes your admin principal or you may be locked out of Studio."],confirmLabel:"Replace database",danger:!0})){m("Reading file…"),c&&(c.disabled=!0);try{const f=await b.text(),{parseDatabaseSnapshotJson:v,normalizeDatabaseSnapshotV1:E}=await je(()=>import("./databaseSnapshotJson-6bc0c3e5.js"),["assets/databaseSnapshotJson-6bc0c3e5.js","assets/index-20317f29.js","assets/index-06c7870c.css"]),j=E(v(f));m("Restoring on-chain…"),await w.adminImportFullDatabase(j),m("Restore complete. Reload the app to refresh Studio data."),window.dispatchEvent(new CustomEvent("fusion-data-source-change",{detail:{source:"live"}}))}catch(f){m(f instanceof Error?f.message:String(f))}finally{c&&(c.disabled=!b)}}})}function fs(){const e=(window.location.hash||"").replace(/^#/,"").trim().toLowerCase(),s=ys(),i=new Set([te,...So.map(o=>o.id),...s.permissionsNavAllowed?["permissions"]:[],...s.teamNavAllowed?["team"]:[]]);return!e||!i.has(e)||!co(e)?te:e}function Gr(e){const s=ys(),i=[];s.teamNavAllowed&&i.push({id:"team",label:"Team"}),s.permissionsNavAllowed&&i.push({id:"permissions",label:"Permissions"});const o=i.length?[...Gi,{label:"Admin",items:i}]:Gi,n=[];for(const a of o){const r=a.items.filter(u=>co(u.id));if(!r.length)continue;const l=Wt(a.label),d=Fc(a.label),p=r.map(u=>{const c=u.id===e?" is-active":"",m=Wt(u.id),b=Dc(u.id);return`<button type="button" class="studio-nav-item${c}" data-studio-section="${m}">
                  <span class="studio-nav-item__icon" aria-hidden="true">${b?`<img src="${Wt(b)}" alt="" />`:'<span class="studio-nav-item__icon-fallback">•</span>'}</span>
                  <span class="studio-nav-item__label">${Wt(u.label)}</span>
                </button>`}).join("");n.push(`<div class="studio-nav-group" role="group" aria-label="${l}">
              <div class="studio-nav-group__label"><span class="studio-nav-group__icon" aria-hidden="true">${d?`<img src="${Wt(d)}" alt="" />`:'<span class="studio-nav-group__icon-fallback">·</span>'}</span>${l}</div>
              <div class="studio-nav-group__items">${p}</div>
            </div>`)}return n.join("")}function Kf(e){return Gr(e)}function eb(){const e=fs();return`
        <div class="studio-app" id="studioRoot">
            <div class="studio-nav-backdrop" id="studioNavBackdrop" hidden aria-hidden="true"></div>
            <aside class="studio-sidebar" id="studioSidebar" aria-label="Studio navigation">
                <a class="studio-back" href="/">← Public site</a>
                <button type="button" class="studio-wordmark studio-wordmark-btn" id="studioWordmark" aria-label="Fusion Studio">
                    <img class="studio-wordmark-logo" src="${Mc}" alt="Fusion" />
                </button>
                <nav class="studio-nav" id="studioNav">
                    ${Kf(e)}
                </nav>
                <div class="studio-sidebar-footer">
                    <div class="studio-avatar" aria-hidden="true">A</div>
                    <div class="studio-user-meta">
                        <span>Admin</span>
                        <span>Studio</span>
                    </div>
                </div>
            </aside>
            <div class="studio-workspace">
                <header class="studio-topbar">
                    <button type="button" class="studio-menu-btn" id="studioMenuBtn" aria-label="Open navigation menu" aria-expanded="false" aria-controls="studioNav">
                        <span class="studio-menu-btn__bars" aria-hidden="true"></span>
                    </button>
                    <h1 id="studioSectionHeading">${Ki(e)}</h1>
                    <div class="studio-topbar-actions">
                        <span class="studio-topbar-admin-label">Admin</span>
                        <button type="button" class="studio-topbar-account-btn" id="studioAccountBtn" aria-label="Account dashboard">Account</button>
                        <button type="button" id="studioSettingsBtn" aria-label="Settings">
                            <span class="studio-topbar-settings-icon" aria-hidden="true">◦</span>
                        </button>
                    </div>
                </header>
                <div class="studio-workspace-rail">
                    <nav class="studio-breadcrumb" id="studioWorkspaceBreadcrumb" aria-label="Workspace location">
                        <button type="button" class="studio-breadcrumb__root" id="studioBreadcrumbStudio">Studio</button>
                        <span class="studio-breadcrumb__sep" aria-hidden="true">·</span>
                        <span class="studio-breadcrumb__current" id="studioBreadcrumbSection">${Ki(e)}</span>
                        <span class="studio-breadcrumb__trail" id="studioBreadcrumbTrail" hidden></span>
                    </nav>
                    <aside class="studio-workspace-toc" id="studioWorkspaceToc" hidden aria-label="On this page"></aside>
                </div>
                <main id="studioMainContent" class="studio-main" data-studio-section="${e}">
                    ${Dr(e)}
                </main>
                <div
                    id="studioAccountOverlay"
                    class="studio-account-overlay"
                    hidden
                    aria-hidden="true"
                >
                    <div
                        class="studio-account-overlay__scrim"
                        id="studioAccountOverlayScrim"
                        aria-hidden="true"
                    ></div>
                    <div
                        class="studio-account-overlay__panel"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="studioAccountOverlayTitle"
                    >
                        <div class="studio-account-overlay__toolbar">
                            <h2 id="studioAccountOverlayTitle" class="studio-account-overlay__title">Account</h2>
                            <button type="button" class="studio-btn-primary" id="studioAccountOverlayClose">
                                Close
                            </button>
                        </div>
                        <div id="studioAccountOverlayBody" class="studio-account-overlay__body"></div>
                    </div>
                </div>
            </div>
            <div
                class="studio-auth-gate"
                id="studioAuthGate"
                hidden
                aria-hidden="true"
            >
                <div class="studio-auth-gate__scrim" aria-hidden="true"></div>
                <div
                    class="studio-auth-gate__panel"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="studioAuthGateTitle"
                >
                    <h2 id="studioAuthGateTitle" class="studio-auth-gate__title">Fusion Studio</h2>
                    <p class="studio-auth-gate__text">Sign in with Internet Identity to continue.</p>
                    <button type="button" class="studio-btn-primary" id="studioAuthGateLogin">Log in</button>
                </div>
            </div>
        </div>
    `}function Fe(e){const s=`#${e}`;window.location.hash!==s&&(window.location.hash=s)}const Kr="(max-width: 768px)";function Ma(){return typeof window<"u"&&window.matchMedia(Kr).matches}let Hs=null,qs=null,ji=!1,Ps=null,Ns=null;function sb(){var M,S;const e=document.getElementById("studioRoot"),s=document.getElementById("studioMainContent"),i=document.getElementById("studioNav"),o=document.getElementById("studioAccountBtn"),n=document.getElementById("studioSettingsBtn"),a=document.getElementById("studioWordmark"),r=document.getElementById("studioMenuBtn"),l=document.getElementById("studioNavBackdrop");if(!s||!i)return;const d=typeof window.matchMedia=="function"?window.matchMedia(Kr):null,p=h=>{e&&(e.dataset.navOpen=h?"true":"false",l&&(l.hidden=!h,l.setAttribute("aria-hidden",h?"false":"true")),r&&(r.setAttribute("aria-expanded",h?"true":"false"),r.setAttribute("aria-label",h?"Close navigation menu":"Open navigation menu")),h&&Ma()?document.body.style.overflow="hidden":document.body.style.overflow="")},u=()=>{Ma()&&p(!1)};r==null||r.addEventListener("click",()=>{const h=(e==null?void 0:e.dataset.navOpen)!=="true";p(h)}),l==null||l.addEventListener("click",()=>p(!1)),d==null||d.addEventListener("change",h=>{h.matches||p(!1)}),window.addEventListener("keydown",h=>{h.key==="Escape"&&(e==null?void 0:e.dataset.navOpen)==="true"&&p(!1)});const c=async h=>{let T=String(h||fs()||te).trim().toLowerCase();co(T)||(T=te,Fe(T));const N=document.getElementById("studioMainContent"),O=document.getElementById("studioSectionHeading"),G=document.getElementById("studioNav");if(!N||!G)return;const V=Ki(T);O&&(O.textContent=V),gm(V),Lr(),N.dataset.studioSection=T,N.innerHTML=Dr(T),G.querySelectorAll(".studio-nav-item").forEach(at=>{const tt=at.getAttribute("data-studio-section");at.classList.toggle("is-active",tt===T&&T!==te)}),await Tf(T,N)},m=h=>{h.querySelectorAll(".studio-nav-item").forEach(T=>{T.addEventListener("click",()=>{const N=T.getAttribute("data-studio-section");N&&(Fe(N),c(N),u())})})},b=async()=>{const h=await Ui();ir(h);const T=document.getElementById("studioNav");T&&(T.innerHTML=Gr(fs()),m(T)),n&&(n.hidden=!Jt("settings").visible);const N=(window.location.hash||"").replace(/^#/,"").trim().toLowerCase();N==="permissions"&&!h.permissionsNavAllowed&&Fe(te),N==="team"&&!h.teamNavAllowed&&Fe(te),await c(fs())};qs&&window.removeEventListener("fusion-studio-shell-refresh",qs),qs=()=>{b()},window.addEventListener("fusion-studio-shell-refresh",qs);const C=document.getElementById("studioAccountOverlay"),w=document.getElementById("studioAccountOverlayBody"),L=document.getElementById("studioAccountOverlayScrim"),A=document.getElementById("studioAccountOverlayClose");w&&!String(w.innerHTML||"").trim()&&(ji=!1);const g=()=>{C&&(C.hidden=!0,C.setAttribute("aria-hidden","true"),document.body.style.overflow="",o==null||o.focus())},f=async()=>{if(!(!C||!w)){if(!ji){const h=await je(()=>import("./settingsProfile-e571a19b.js"),["assets/settingsProfile-e571a19b.js","assets/index-20317f29.js","assets/index-06c7870c.css","assets/studioDateFormat-30c8922b.js","assets/studioDateFormat-528ac2a2.css"]);w.innerHTML=h.generateSettingsProfileContent(),h.default(),ji=!0}C.hidden=!1,C.setAttribute("aria-hidden","false"),document.body.style.overflow="hidden",A==null||A.focus()}};o==null||o.addEventListener("click",()=>{f()}),A==null||A.addEventListener("click",()=>g()),L==null||L.addEventListener("click",()=>g()),Ps&&window.removeEventListener("keydown",Ps),Ps=h=>{h.key==="Escape"&&(!C||C.hidden||(h.preventDefault(),g()))},window.addEventListener("keydown",Ps),n==null||n.addEventListener("click",()=>{Jt("settings").visible&&(Fe("settings"),c("settings"),u())}),a==null||a.addEventListener("click",()=>{Fe(te),c(te),u()}),(M=document.getElementById("studioBreadcrumbStudio"))==null||M.addEventListener("click",()=>{Fe(te),c(te),u()}),Hs&&window.removeEventListener("hashchange",Hs),Hs=()=>{c(fs())},window.addEventListener("hashchange",Hs);const v=document.getElementById("studioAuthGate"),E=async()=>{const h=await $n();if(v){const T=!h.authenticated;v.hidden=!T,v.setAttribute("aria-hidden",T?"false":"true")}e&&(h.authenticated?e.removeAttribute("data-studio-anonymous"):e.setAttribute("data-studio-anonymous","true"))};(S=document.getElementById("studioAuthGateLogin"))==null||S.addEventListener("click",()=>{$c().catch(()=>{})}),Ns&&window.removeEventListener("fusion-auth-change",Ns),Ns=()=>{(async()=>(await E(),(await $n()).authenticated&&await b()))()},window.addEventListener("fusion-auth-change",Ns),(async()=>(await E(),await b()))();const j=document.querySelector(".studio-back");j==null||j.addEventListener("click",h=>{h.preventDefault(),Cc("/")})}export{sb as default,eb as render};
