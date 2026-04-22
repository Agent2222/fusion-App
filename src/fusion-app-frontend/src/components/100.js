import mainHyaku2 from '../assets/main-hyaku-2.jpg';
import { withSeoImageAlt } from '../utils/mediaAltSeo.js';

function buildContent() {
    let element = document.createElement("div")
    element.id = "oneHundredMainContent"
    element.innerHTML = `
        <div class="feedBlock" id="MainFeedBlock100">
            <div id="primaryInfoBlock100">
                <div id="Header100">FUSION 100</div>
                <div id="SubHeader100">The Art Of Objects: Kogei, Sculpture, and Timeless Craft</div>
                <div id="SubHeadText100">Launching October 2026 in Kaga, Japan</div>
                <div id="MainText100">FUSION 100 a new international art fair celebrating form, tradition, and the enduring power of physical art. Join us where heritage meets contemporary mastery.</div>
                <div id="ReadMoreButton100">
                    <div id="ReadMoreText100">Read More</div>
                </div>
                <div class="spaceBlock"></div>
            </div>
            <div id="ctaBlock100">
                <div class="spaceBlock"></div>
                <div id="ctaButtons">
                    <div class="buttonLargeExhibit ml motionEl7">Exhibit</div>
                    <div class="buttonLargeAttend ml motionEl8">Attend</div>
                </div>
                <div id="TBDDate100">
                    <h5>October</h5> 
                    <h4>TBA,</h4> 
                    <h3>2026</h3>
                </div>
                <div id="TBDLocation100">Ishikawa,<br>Japan</div>
            </div>
            <div id="imageBlock100">
                <img src="${mainHyaku2}" alt="${withSeoImageAlt('FUSION 100 hero')}">
            </div>
        </div>
        <div class="feedBlock" id="ConceptFeedBlock100">
            <div></div>
        </div>
        <div class="feedBlock" id="ExhibitorsFeedBlock100">
            <div></div>
            <div></div>
            <div></div>
        </div>
        <div class="feedBlock" id="ExperienceFeedBlock100">
            <div></div>
            <div></div>
            <div></div>
        </div>
        <div class="feedBlock" id="LDFeedBlock100">
            <div></div>
            <div></div>
            <div></div>
        </div>
        <div class="feedBlock" id="HotelsFeedBlock100">
            <div></div>
            <div></div>
            <div></div>
        </div>
    `
    document.getElementById('homeMain').appendChild(element);
    setTimeout(() => {
        element.classList.add('active');
    }, 200);

}

// Content generation function - returns HTML content only (no header/footer)
export function generate100Content() {
    if (!document.getElementById('oneHundredMainContent')) {
        buildContent();
    }
}

// Functionality initialization - called after content is injected
export default function init100() {
    console.log('100 Fair page initialized');
    
    // Add 100 Fair page specific functionality here
}

