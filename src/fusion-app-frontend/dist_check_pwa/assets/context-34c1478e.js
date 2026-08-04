import{s as S,ab as E,v as h,F as H,u as C}from"./index-9466438f.js";function b(){return`
        <div class="page context-page">
            <main id="contextMain" class="main-cont">
                <div id="contextMainContent" class="feed-container">
                    <h1 class="seo-primary-h1">Context — Fusion mission and ecosystem</h1>
                    <div id="contextHeadline"></div>
                    <div id="contextSubHeadlineSection">
                        <div id="contextSubHeadlineText"></div>
                        <div id="contextSubHeadlineImage">
                            <img id="contextSubImage" src="" alt="${E}">
                        </div>
                    </div>
                    <app-features-row data-area="context" active="true"></app-features-row>
                    <div id="contextHeadline2" class="shoutHeadline"></div>
                    <app-staff-feed id="contextStaffSection" active="true"></app-staff-feed>
                    <app-extended-network-feed id="contextExtendedNetworkSection" active="true"></app-extended-network-feed>
                    <div id="contextEcosystemPartnersSection">
                        <div id="contextEcosystemPartnersHeadline"></div>
                        <div id="contextEcosystemPartnersDescription"></div>
                        <div id="contextEcosystemPartnersGrid"></div>
                    </div>
                    <div id="contextHeadline3" class="shoutHeadline"></div>
                </div>
            </main>
        </div>
    `}function w(t){if(!t||typeof t!="object")return null;const e=typeof window.getLocale=="function"?window.getLocale():"en",n=t.en&&typeof t.en=="object"?t.en:{},i=t.ja&&typeof t.ja=="object"?t.ja:{};return e==="ja"?C(n,i):n}function I(){const t=["contextHeadline","contextSubHeadlineText","contextHeadline2","contextHeadline3"];for(const i of t){const a=document.getElementById(i);a&&(a.innerHTML="")}const e=document.getElementById("contextSubImage");e&&(e.removeAttribute("src"),e.alt=E),y("contextEcosystemPartnersHeadline",""),y("contextEcosystemPartnersDescription","");const n=document.getElementById("contextEcosystemPartnersGrid");n&&n.replaceChildren()}function y(t,e){const n=document.getElementById(t);n&&(n.textContent=e)}function P(t){const e=w(t);if(!e){I();return}const n=(d,s)=>{const o=document.getElementById(d);o&&(o.innerHTML=String(s??""))},i=(d,s)=>{const o=document.getElementById(d);o&&(o.textContent=String(s??""))};n("contextHeadline",e.headline),n("contextSubHeadlineText",e.subheadline);const a=document.getElementById("contextSubImage");a&&e.subImage&&(a.src=typeof e.subImage=="string"?e.subImage:String(e.subImage)),n("contextHeadline2",e.headline2),i("contextEcosystemPartnersHeadline",e.ecosystemPartnersTitle||""),i("contextEcosystemPartnersDescription",e.ecosystemPartnersHeadline||""),n("contextHeadline3",e.headline3);const u=document.getElementById("contextEcosystemPartnersGrid");if(u){u.replaceChildren();const d=Array.isArray(e.ecosystemPartnersCards)?e.ecosystemPartnersCards:[];for(const s of d){if(!s||typeof s!="object")continue;const o=s,p=String(o.name??o.title??"").trim(),f=o.link!=null?String(o.link):"",v=o.image!=null?String(o.image):"",x=document.createElement("div");x.className="context-ecosystem-card";const c=document.createElement(f&&/^https?:\/\//i.test(f)?"a":"div");if(c instanceof HTMLAnchorElement?(c.href=f,c.target="_blank",c.rel="noopener noreferrer",c.className="context-ecosystem-card__link"):c.className="context-ecosystem-card__static",v){const r=document.createElement("img");r.src=v,r.alt=H(p),r.loading="lazy",c.appendChild(r)}const g=document.createElement("span");g.className="context-ecosystem-card__label",g.textContent=p,c.appendChild(g),x.appendChild(c),u.appendChild(x)}}}let l=null,m=null;function _(){l&&(l(),l=null),m&&(m(),m=null);const t=async()=>{const n=await h("context",{forStudio:!1});P(n&&typeof n=="object"?n:null)};t(),l=S(()=>{t()});const e=n=>{var a;const i=(a=n.detail)==null?void 0:a.slug;i&&i!=="context"||t()};window.addEventListener("fusion-content-pages-changed",e),window.addEventListener("fusion-localechange",t),m=()=>{window.removeEventListener("fusion-localechange",t),window.removeEventListener("fusion-content-pages-changed",e)}}function j(){return b()}export{_ as default,j as generateContextContent,b as render};
