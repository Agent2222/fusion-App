import{s as c,Y as p,Z as r}from"./index-9466438f.js";let i=null,n=null;function u(){return`
        <div class="page editions-page">
            <app-feed-filter state="editions"></app-feed-filter>
            <main id="editionsMain" class="main-cont">
                <div id="editionsMainContent" class="feed-container">
                    <app-info context="editions" active="true" topP="0px"></app-info>
                    <app-editions-feed id="editionsFeed" active="true"></app-editions-feed>
                    <app-join-network id="joinNetworkEditions" data-modal-type="access" context="editions" active="true" data-margin-top="48px" data-margin-bottom="96px"></app-join-network>
                </div>
            </main>
        </div>
    `}function E(){const t=document.getElementById("editionsFeed");if(!t||typeof t.setEditions!="function")return;n&&(n(),n=null);const a=async()=>{const o=await p();i&&window.removeEventListener("fusion-feed-filter",i),i=e=>{var s;const d=e;if(((s=d.detail)==null?void 0:s.state)!=="editions")return;const l=r(o,d.detail.criteria||{});t.setEditions({items:l})},window.addEventListener("fusion-feed-filter",i);const f=r(o,{yearId:"allEditionYears",formatId:"allEditionFormats",categoryKeys:[]});t.setEditions({items:f}),queueMicrotask(()=>{const e=document.querySelector('app-feed-filter[state="editions"]');e&&typeof e.hydrateFilterData=="function"&&e.hydrateFilterData({state:"editions",editions:o||[]})})};a(),n=c(()=>void a())}function v(){return u()}export{E as default,v as generateEditionsContent,u as render};
