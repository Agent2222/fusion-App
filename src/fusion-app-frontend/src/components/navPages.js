/** Shared placeholder sections for primary nav routes (expand per page later). */

function section(title, id) {
    return `
        <div class="page-content nav-page-content">
            <section id="${id}">
                <h2>${title}</h2>
                <p>Content coming soon.</p>
            </section>
        </div>
    `;
}

export function generateArtistsContent() {
    return section('Artists', 'artistsMainContent');
}

export function generateCommunityContent() {
    return `
        <div class="community-page">
            <div class="shoutHeadline" style="height: 40vh; margin-bottom: 50px;">
                This is not for every artist.<br><br>It is for those willing to work<br>within unfamiliar environments—<br>alongside others,<br> in close proximity to place and process.
            </div>
            <div class="page-content nav-page-content">
                <app-join-network id="joinNetworkCommunity" data-modal-type="membership" context="community" active="true" data-margin-top="100px" data-margin-bottom="0px"></app-join-network>
            </div>
        </div>
    `;
}

export function generateContextContent() {
    return `
        <div class="page-content nav-page-content">
            <app-join-network id="joinNetworkContext" data-modal-type="membership" context="context" active="true" data-margin-top="125px" data-margin-bottom="250px"></app-join-network>
        </div>
    `;
}

export function generateSignInContent() {
    return section('Sign in', 'signInMainContent');
}
