function n(t,e){return`
        <div class="page-content nav-page-content">
            <section id="${e}">
                <h2>${t}</h2>
                <p>Content coming soon.</p>
            </section>
        </div>
    `}function o(){return n("Artists","artistsMainContent")}function i(){return`
        <div class="page-content nav-page-content">
            <app-join-network id="joinNetworkContext" data-modal-type="membership" context="context" active="true" data-margin-top="125px" data-margin-bottom="250px"></app-join-network>
        </div>
    `}function a(){return n("Sign in","signInMainContent")}export{o as generateArtistsContent,i as generateContextContent,a as generateSignInContent};
