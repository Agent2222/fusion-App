import{s as p,l as y,X as o,m as d}from"./index-9466438f.js";let e=null,s=null;function g(){return`
        <div class="page gallery-access-page">
            <app-feed-filter state="gallery-access"></app-feed-filter>
            <main id="galleryAccessMain" class="main-cont">
                <div id="galleryAccessMainContent" class="feed-container">
                    <div class="page-content nav-page-content">
                        <app-artists-ga-feed id="artistsGAFeed"></app-artists-ga-feed>
                        <app-join-network id="joinNetworkGalleryAccess" data-modal-type="access" context="gallery-access" active="true" data-margin-top="48px" data-margin-bottom="96px"></app-join-network>
                    </div>
                </div>
            </main>
        </div>
    `}function m(){const a=document.getElementById("artistsGAFeed");if(!a||typeof a.setArtists!="function")return;s&&(s(),s=null),e&&(window.removeEventListener("fusion-feed-filter",e),e=null);const l=async()=>{const r=await y(),i=Array.isArray(r)?r:[];e=t=>{var c;const n=t;if(((c=n.detail)==null?void 0:c.state)!=="gallery-access")return;const u=o(i,n.detail.criteria||{});a.setArtists(d(u))},window.addEventListener("fusion-feed-filter",e);const f=o(i,{locationKey:"all",seasonId:"allGallerySeason",viewId:"allGalleryView"});a.setArtists(d(f)),queueMicrotask(()=>{const t=document.querySelector('app-feed-filter[state="gallery-access"]');t&&typeof t.hydrateFilterData=="function"&&t.hydrateFilterData({state:"gallery-access",artists:i})})};l(),s=p(()=>{e&&(window.removeEventListener("fusion-feed-filter",e),e=null),l()})}function A(){return g()}export{m as default,A as generateGalleryAccessContent,g as render};
