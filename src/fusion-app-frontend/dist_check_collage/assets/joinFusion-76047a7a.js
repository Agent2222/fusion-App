import{a7 as y,a8 as b,N as F,a9 as S,aa as w,ab as C,L as _,ac as E,ad as R,q as x}from"./index-29c64bdd.js";let l=null;function A(){return`
        <div class="join-fusion-page" id="joinFusionRoot">
            <h1 class="join-fusion-page__title">Join the Fusion Team Studio</h1>
            <p class="join-fusion-page__intro">Sign in with Internet Identity, then complete the form below.</p>
            <p id="joinFusionAuth" class="join-fusion-page__status" role="status">Checking session…</p>
            <form id="joinFusionForm" class="join-fusion-form" hidden>
                <div class="form-group">
                    <label for="joinFusionFirst">First name</label>
                    <input type="text" id="joinFusionFirst" name="firstName" autocomplete="given-name" required maxlength="256" />
                </div>
                <div class="form-group">
                    <label for="joinFusionLast">Last name</label>
                    <input type="text" id="joinFusionLast" name="lastName" autocomplete="family-name" required maxlength="256" />
                </div>
                <div class="form-group">
                    <label for="joinFusionEmail">Email</label>
                    <input type="email" id="joinFusionEmail" name="email" autocomplete="email" required maxlength="256" />
                </div>
                <div class="form-group">
                    <label for="joinFusionRole">Role (must match the invite)</label>
                    <select id="joinFusionRole" name="role" required>
                        <option value="staff" selected>Staff</option>
                        <option value="collaborator">Collaborator</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="joinFusionCode">8-digit access code</label>
                    <input type="text" id="joinFusionCode" name="code" inputmode="numeric" pattern="[0-9]{8}" minlength="8" maxlength="8" required />
                </div>
                <p id="joinFusionErr" class="join-fusion-page__err" role="alert" hidden></p>
                <div class="join-fusion-form__actions">
                    <button type="submit" class="join-fusion-btn--primary join-fusion-form__submit" id="joinFusionSubmit">Register</button>
                </div>
            </form>
            <p class="join-fusion-page__hint" id="joinFusionHint" aria-live="polite"></p>
        </div>
    `}function q(i){return i==="collaborator"?{collaborator:null}:{staff:null}}async function g(i){const e=i.querySelector("#joinFusionAuth"),t=i.querySelector("#joinFusionForm"),o=i.querySelector("#joinFusionHint"),a=await F();a.authenticated?(e&&(e.textContent=`Signed in. Principal: ${a.principal.toText()}`),t&&(t.hidden=!1),o&&(o.textContent="Submitting registers your on-chain team account. You can then open Studio from the site header (permissions apply).")):(e&&(e.innerHTML='Not signed in. <button type="button" class="join-fusion-btn--primary" id="joinFusionIIBtn">Sign in with Internet Identity</button>'),t&&(t.hidden=!0),o&&(o.textContent=""))}function I(i){x({title:"Join Fusion team",description:"Onboard to Fusion as staff or collaborator with an invite code.",path:i,robots:"noindex, nofollow",homeOrganizationJsonLd:!1})}function k(){const i=window.location.pathname.replace(/\/$/,"")||"/";(i==="/join-fusion"||i.endsWith("/join-fusion"))&&I(i);const e=document.getElementById("joinFusionRoot")||document.getElementById("mainContent");if(!e)return;l&&window.removeEventListener("fusion-auth-change",l),l=()=>{g(e)},window.addEventListener("fusion-auth-change",l),g(e),e.addEventListener("click",o=>{const a=o.target;a&&a.id==="joinFusionIIBtn"&&(o.preventDefault(),(async()=>{try{await y()}catch(u){if(u===b)return}})())},{capture:!0});const t=e.querySelector("#joinFusionForm");t instanceof HTMLFormElement&&t.addEventListener("submit",o=>{var d,f,m,p;o.preventDefault();const a=String(((d=e.querySelector("#joinFusionFirst"))==null?void 0:d.value)||"").trim(),u=String(((f=e.querySelector("#joinFusionLast"))==null?void 0:f.value)||"").trim(),j=String(((m=e.querySelector("#joinFusionEmail"))==null?void 0:m.value)||"").trim(),v=String(((p=e.querySelector("#joinFusionCode"))==null?void 0:p.value)||""),c=e.querySelector("#joinFusionRole")instanceof HTMLSelectElement?e.querySelector("#joinFusionRole").value:"staff",n=e.querySelector("#joinFusionErr");n&&(n.textContent="",n.hidden=!0),(async()=>{if(!(await F()).authenticated){n&&(n.textContent="Sign in with Internet Identity first.",n.hidden=!1);return}const r=e.querySelector("#joinFusionSubmit");r instanceof HTMLButtonElement&&(r.disabled=!0);try{const s=await S(q(c),v,a,u,j);if(s!=="ok"){const h={invalidCode:"The code is not valid. Use the 8 digits you received.",wrongRole:"The code is for a different role. Check Staff vs Collaborator.",artistAlreadyLinked:"This code was for a different flow.",accountExists:"This Internet Identity already has a Fusion account.",inviteInactive:"This code was already used or is inactive.",unknown:"Registration could not be completed. Try again."};n&&(n.textContent=h[s]||h.unknown,n.hidden=!1)}else w(),await C(),_.capture("join_fusion_registration_succeeded",{role:c,ads_conversion:"CompleteRegistration"}),E("CompleteRegistration",{content_name:"join_fusion"}),t&&t.reset(),R("/studio")}catch(s){n&&(n.textContent=s instanceof Error?s.message:String(s),n.hidden=!1)}finally{r instanceof HTMLButtonElement&&(r.disabled=!1)}})()})}export{k as default,A as generateJoinFusionContent};
