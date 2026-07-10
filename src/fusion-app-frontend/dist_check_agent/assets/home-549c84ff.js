import{r as y,c as H,d as j,e as w,f as A,h as C,i as b,j as B,k as E}from"./index-9cf3f32f.js";let n=null;function I(){return`
        <div class="page home-page">
            ${y()}
            ${H()}
            <main id="homeMain" class="main-cont">
                <div id="homeMainContent" class="feed-container">
                    <app-program-hero id="programHero" active="true"></app-program-hero>
                    <app-coming-up id="comingUp" active="true"></app-coming-up>
                    <div class="artist-card-toggle-row"><app-artist-card-image-toggle id="homeArtistCardImageToggle" aria-label="Artist card image mode"></app-artist-card-image-toggle></div>
                    <app-featured-artist id="featuredArtist" active="true"></app-featured-artist>
                    <app-objects-highlight id="objectsHighlight" active="true"></app-objects-highlight>
                    <app-gallery-access-cta id="galleryAccessCta" active="true"></app-gallery-access-cta>
                    <app-journal-hero id="journalHero" active="true"></app-journal-hero>
                    <app-join-network id="joinNetwork" data-modal-type="membership" context="home" active="true" data-margin-bottom="200px"></app-join-network>
                </div>
            </main>
        </div>
    `}let c=null;function k(e){const t=e.detail,o=t==null?void 0:t.slug;o&&o!=="program-hero"&&o!=="objects-highlight"&&o!=="gallery-access-cta"||(n=null,d())}async function p(e,t,o,h,f,v){const u=document.getElementById("programHero");u&&typeof u.setProgram=="function"&&u.setProgram(e);const m=document.getElementById("comingUp");m&&typeof m.setComingUp=="function"&&m.setComingUp(t);const a=document.getElementById("featuredArtist");a&&typeof a.setFeaturedArtist=="function"&&(a.setFeaturedArtist({artists:o||[]}),typeof a.createArtistCard=="function"&&await a.createArtistCard((o||[]).length),a.showAllArtistsButton());const i=document.getElementById("objectsHighlight");i&&typeof i.setObjectsHighlight=="function"&&(i.setObjectsHighlight(h),i.createObjects());const r=document.getElementById("galleryAccessCta");r&&typeof r.setGalleryAccessCta=="function"&&(r.setGalleryAccessCta(f),r.createCTA());const s=document.getElementById("journalHero");s&&typeof s.setJournalHero=="function"&&(s.setJournalHero(v),s.createJournals())}async function d(){n&&await p(...n);const e=await Promise.all([j(),w().then(t=>A(t)),C(),b(),B(),E()]);n=e,await p(...e)}let l=null,g=null;function P(){console.log("Home page initialized"),d(),l&&window.removeEventListener("fusion-content-pages-changed",l),l=k,window.addEventListener("fusion-content-pages-changed",l),g&&window.removeEventListener("fusion-artist-featured-meta-change",g),g=()=>{n=null,d()},window.addEventListener("fusion-artist-featured-meta-change",g),c&&window.removeEventListener("fusion-home-journal-carousel-changed",c),c=()=>{n=null,d()},window.addEventListener("fusion-home-journal-carousel-changed",c);const e=document.getElementById("homeButton");e&&e.addEventListener("click",()=>{console.log("Home button clicked")})}function F(){console.log("Home content generated")}export{P as default,F as generateHomeContent,I as render};
