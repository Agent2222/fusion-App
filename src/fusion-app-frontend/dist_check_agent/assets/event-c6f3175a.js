import{s as k,a3 as O,W as L,q as A,u as j,o as x,E as P,C as H}from"./index-9cf3f32f.js";function $(){const t=window.location.pathname;if(!t.startsWith("/event/"))return null;const s=t.slice(7).split("/").filter(Boolean)[0];if(!s)return null;const n=parseInt(s,10);return Number.isFinite(n)?n:null}function M(t,s){return t==null||!Array.isArray(s)?null:s.find(n=>Number(n==null?void 0:n.id)===t)??null}function J(){return`
        <div class="page event-detail-page">
            <main id="eventMain" class="main-cont">
                <div id="eventMainContent" class="feed-container">
                    <div class="page-content event-detail-content">
                        <nav class="event-detail-back" aria-label="Event">
                            <a href="/journal" class="event-detail-back-link">← Journal</a>
                        </nav>
                        <article class="event-detail" id="eventDetail" hidden>
                            <div class="event-detail-hero">
                                <img id="eventDetailImage" src="" alt="${O}" width="960" height="540" />
                            </div>
                            <div class="event-detail-body">
                                <p id="eventDetailCategory" class="event-detail-category"></p>
                                <h1 id="eventDetailTitle" class="event-detail-title"></h1>
                                <div class="event-detail-meta">
                                    <p id="eventDetailDate" class="event-detail-meta-line"></p>
                                    <p id="eventDetailTime" class="event-detail-meta-line"></p>
                                    <p id="eventDetailLocation" class="event-detail-meta-line"></p>
                                    <p id="eventDetailAddress" class="event-detail-meta-line"></p>
                                </div>
                                <p id="eventDetailDescription" class="event-detail-description"></p>
                            </div>
                            <p id="eventDetailPastNote" class="event-detail-past-note" hidden>This event has passed.</p>
                            <section id="eventRsvpSection" class="event-rsvp" hidden aria-labelledby="eventRsvpHeading">
                                <h2 id="eventRsvpHeading" class="event-rsvp-heading">RSVP</h2>
                                <form id="eventRsvpForm" class="event-rsvp-form">
                                    <div class="event-rsvp-field">
                                        <label for="eventRsvpName">Name</label>
                                        <input type="text" id="eventRsvpName" name="name" required autocomplete="name" />
                                    </div>
                                    <div class="event-rsvp-field">
                                        <label for="eventRsvpEmail">Email</label>
                                        <input type="email" id="eventRsvpEmail" name="email" required autocomplete="email" />
                                    </div>
                                    <button type="submit" class="event-rsvp-submit">Submit RSVP</button>
                                </form>
                                <p id="eventRsvpThanks" class="event-rsvp-thanks" hidden>Thank you — we will confirm by email.</p>
                            </section>
                        </article>
                        <div id="eventDetailNotFound" class="event-detail-not-found" hidden>
                            <p>We could not find that event.</p>
                            <p><a href="/journal">Back to journal</a></p>
                        </div>
                        <section id="eventOtherSection" class="event-other-section" hidden aria-labelledby="eventOtherHeading">
                            <h2 id="eventOtherHeading" class="event-other-heading">More events</h2>
                            <div id="eventOtherRows" class="event-other-rows"></div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    `}function W(t){const s=typeof window.getLocale=="function"?window.getLocale():"en",n=t.en&&typeof t.en=="object"?t.en:{},i=t.ja&&typeof t.ja=="object"?t.ja:{},e=s==="ja"?j(n,i):n,a=(e==null?void 0:e.title)??"",l=(e==null?void 0:e.category)??"",c=(e==null?void 0:e.date)??"",u=(e==null?void 0:e.time)??"",o=(e==null?void 0:e.location)??"",r=(e==null?void 0:e.address)??"",v=(e==null?void 0:e.description)??"",h=document.getElementById("eventDetailImage"),y=document.getElementById("eventDetailCategory"),b=document.getElementById("eventDetailTitle"),D=document.getElementById("eventDetailDate"),I=document.getElementById("eventDetailTime"),B=document.getElementById("eventDetailLocation"),w=document.getElementById("eventDetailAddress"),R=document.getElementById("eventDetailDescription"),S=document.getElementById("eventDetailPastNote"),F=document.getElementById("eventRsvpSection");h&&(h.src=x(t.image,i==null?void 0:i.image,n==null?void 0:n.image),h.alt=P(a)),y&&(y.textContent=l),b&&(b.textContent=a),D&&(D.textContent=c),I&&(I.textContent=u),B&&(B.textContent=o),w&&(w.textContent=r),R&&(R.textContent=v);const f=t.status==="upcoming";if(S&&(S.hidden=f),F){F.hidden=!f;const g=document.getElementById("eventRsvpThanks"),E=document.getElementById("eventRsvpForm");f&&g&&E&&(g.hidden=!0,E.hidden=!1,E.reset())}const T=`${a||"Event"} · Fusion`;document.title=T;const C=window.location.pathname,N=String(v||"").trim()||`${String(a||"Event")} — event on Fusion’s art platform.`;let d=x(t.image,i==null?void 0:i.image,n==null?void 0:n.image);d&&!/^https?:\/\//i.test(d)&&(d=`${H()}${d.startsWith("/")?d:`/${d}`}`),A({title:T,description:N,path:C,ogType:"article",imageUrl:d||void 0,breadcrumbItems:[{name:"Home",path:"/"},{name:"Journal",path:"/journal"},{name:String(a||"Event").slice(0,96),path:C}]})}function _(t,s){const n=document.getElementById("eventOtherSection"),i=document.getElementById("eventOtherRows");if(!n||!i)return;const e=s.filter(a=>Number(a==null?void 0:a.id)!==t);if(i.innerHTML="",e.length===0){n.hidden=!0;return}n.hidden=!1;for(const a of e){const l=document.createElement("app-event-row");l.setAttribute("context","journal"),l.setAttribute("data-event-id",String(a.id)),l.setAttribute("active","true"),i.appendChild(l)}}let p=null,m=null;function U(){p&&(p(),p=null);const t=$(),s=async()=>{const n=document.getElementById("eventRsvpForm");n&&m&&(n.removeEventListener("submit",m),m=null);const i=await L(),e=t!=null?M(t,i):null,a=document.getElementById("eventDetail"),l=document.getElementById("eventDetailNotFound"),c=(o,r)=>{o&&(r?o.removeAttribute("hidden"):o.setAttribute("hidden",""))};if(t==null||!e){c(a,!1),c(l,!0);const o=document.getElementById("eventOtherSection");o&&(o.hidden=!0),A({title:"Event not found · Fusion",description:"This event is not available on Fusion.",path:window.location.pathname,robots:"noindex, nofollow"});return}c(a,!0),c(l,!1),W(e),_(t,i);const u=document.getElementById("eventRsvpForm");u&&e.status==="upcoming"&&(m=o=>{o.preventDefault();const r=document.getElementById("eventRsvpThanks"),v=document.getElementById("eventRsvpForm");r&&(r.hidden=!1),v&&(v.hidden=!0)},u.addEventListener("submit",m))};s(),p=k(()=>{s()})}export{U as default,J as generateEventContent};
