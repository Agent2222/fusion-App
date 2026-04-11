import { testData } from '../testData.js';

export function render() {
    return `
        <div class="page context-page">
            <main id="contextMain" class="main-cont">
                <div id="contextMainContent" class="feed-container">
                    <div id="contextHeadline">${testData.context.en.headline}</div>
                    <div id="contextSubHeadlineSection">
                        <div id="contextSubHeadlineText">${testData.context.en.subheadline}</div>
                        <div id="contextSubHeadlineImage">
                            <img src="${testData.context.en.subImage}" alt="Japan Artist Residency">
                        </div>
                    </div>
                    <app-features-row data-area="context" active="true"></app-features-row>
                    <div id="contextHeadline2" class="shoutHeadline">${testData.context.en.headline2}</div>
                    <app-staff-feed id="contextStaffSection" active="true"></app-staff-feed>
                    <app-extended-network-feed id="contextExtendedNetworkSection" active="true"></app-extended-network-feed>
                    <div id="contextEcosystemPartnersSection">
                        <div id="contextEcosystemPartnersHeadline">${testData.context.en.ecosystemPartnersTitle}</div>
                        <div id="contextEcosystemPartnersDescription">${testData.context.en.ecosystemPartnersHeadline}</div>
                        <div id="contextEcosystemPartnersGrid"></div>
                    </div>
                    <div id="contextHeadline3" class="shoutHeadline">${testData.context.en.headline3}</div>
                </div>
            </main>
        </div>
    `;
}

export default function initContext() {}

export function generateContextContent() {
    return render();
}
