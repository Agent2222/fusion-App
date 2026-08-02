import{s as p,a6 as h,T as w,q as f,u as v,o as g,F as b,D as y}from"./index-29c64bdd.js";function E(t,a){if(!t||!Array.isArray(a))return null;for(const i of a)if((i==null?void 0:i.href)===t)return i;return null}function I(){return`
        <div class="page edition-view-page">
            <main id="editionViewMain" class="main-cont">
                <div id="editionViewMainContent" class="feed-container">
                    <div class="page-content edition-view-content">
                        <nav class="edition-view-back" aria-label="Edition">
                            <a href="/editions" class="edition-view-back-link">← Editions</a>
                        </nav>
                        <article class="edition-detail" id="editionDetail" hidden>
                            <div class="edition-detail-hero">
                                <img id="editionDetailImage" src="" alt="${h}" width="960" height="540" />
                            </div>
                            <div class="edition-detail-body">
                                <h1 id="editionDetailTitle" class="edition-detail-title"></h1>
                            </div>
                        </article>
                        <div id="editionDetailNotFound" class="edition-view-not-found" hidden>
                            <p>We could not find that edition.</p>
                            <p><a href="/editions">Browse editions</a></p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    `}function S(t){const a=typeof window.getLocale=="function"?window.getLocale():"en",i=t.en&&typeof t.en=="object"?t.en:{},e=t.ja&&typeof t.ja=="object"?t.ja:{},n=a==="ja"?v(i,e):i,o=(n==null?void 0:n.title)||"",l=(n==null?void 0:n.alt)||o,d=document.getElementById("editionDetailImage"),c=document.getElementById("editionDetailTitle");d&&(d.src=g(t.imageSrc,e==null?void 0:e.imageSrc,i==null?void 0:i.imageSrc),d.alt=b(l)),c&&(c.textContent=o);const u=`${o||"Edition"} · Fusion`;document.title=u;const m=window.location.pathname;let s=g(t.imageSrc,e==null?void 0:e.imageSrc,i==null?void 0:i.imageSrc);s&&!/^https?:\/\//i.test(s)&&(s=`${y()}${s.startsWith("/")?s:`/${s}`}`),f({title:u,description:String(o||"").trim()||"Limited editions and objects from Fusion artists.",path:m,ogType:"article",imageUrl:s||void 0,breadcrumbItems:[{name:"Home",path:"/"},{name:"Editions",path:"/editions"},{name:String(o||"Edition").slice(0,96),path:m}]})}let r=null;function A(){r&&(r(),r=null);const t=window.location.pathname,a=async()=>{const i=await w(),e=E(t,i),n=document.getElementById("editionDetail"),o=document.getElementById("editionDetailNotFound"),l=(d,c)=>{d&&(c?d.removeAttribute("hidden"):d.setAttribute("hidden",""))};if(!e){l(n,!1),l(o,!0),f({title:"Edition not found · Fusion",description:"This edition is not available on Fusion.",path:t,robots:"noindex, nofollow"});return}l(n,!0),l(o,!1),S(e)};a(),r=p(()=>{a()})}export{A as default,I as generateEditionViewContent};
