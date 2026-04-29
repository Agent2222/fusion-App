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
