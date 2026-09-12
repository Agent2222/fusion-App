/**
 * Become a member (join-unlock) trial access-code field + redeem copy.
 */

/**
 * @param {string} s
 */
function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * @param {'en'|'ja'} locale
 */
export function applicantJoinUnlockAccessCopy(locale = 'en') {
    if (locale === 'ja') {
        return {
            accessPrompt: 'アクセスコードをお持ちですか？',
            accessLabel: 'アクセスコード',
            accessPlaceholder: '8桁のコード',
            accessRedeem: 'コードを使う',
        };
    }
    return {
        accessPrompt: 'Have an access code?',
        accessLabel: 'Access code',
        accessPlaceholder: '8-digit code',
        accessRedeem: 'Redeem code',
    };
}

/**
 * @param {'en'|'ja'} [locale]
 */
export function applicantJoinUnlockRedeemingLabel(locale = 'en') {
    return locale === 'ja' ? '確認中…' : 'Redeeming…';
}

/**
 * Inline messages for `redeemTrialJoinInviteForCaller` on Become a member.
 * @param {'ok' | 'invalidCode' | 'inviteInactive' | 'notTrialInvite' | 'noAccount' | 'unknown' | string} outcome
 * @param {'en'|'ja'} [locale]
 */
export function applicantJoinUnlockRedeemMessage(outcome, locale = 'en') {
    const ja = locale === 'ja';
    switch (String(outcome || '')) {
        case 'ok':
            return ja
                ? '3か月トライアルと応募クレジット1回が適用されました。'
                : 'Your 3-month trial and 1 application credit are now active.';
        case 'invalidCode':
            return ja ? 'このアクセスコードは無効です。' : 'This access code is not valid.';
        case 'inviteInactive':
            return ja
                ? 'この招待コードは使用済みか、無効です。'
                : 'This invite code has already been used or is inactive.';
        case 'notTrialInvite':
            return ja
                ? 'このコードは3か月トライアル用ではありません。'
                : 'This code is not a 3-month trial invite.';
        case 'noAccount':
            return ja
                ? 'コードを使うには Internet Identity でサインインしてください。'
                : 'Sign in with Internet Identity to redeem this code.';
        default:
            return ja
                ? 'コードを適用できませんでした。もう一度お試しください。'
                : 'Could not redeem this code. Try again.';
    }
}

/**
 * @param {{
 *   accessPrompt?: string,
 *   accessLabel?: string,
 *   accessPlaceholder?: string,
 *   accessRedeem?: string,
 * }} model
 */
export function applicantJoinUnlockAccessHtml(model = {}) {
    const copy = {
        ...applicantJoinUnlockAccessCopy('en'),
        ...model,
    };
    return `
      <div class="mpd-join-unlock__access" id="mpdJoinUnlockAccess">
        <button type="button" class="mpd-join-unlock__access-toggle" id="mpdJoinUnlockAccessToggle" aria-expanded="false" aria-controls="mpdJoinUnlockAccessPanel">
          ${esc(copy.accessPrompt)}
        </button>
        <div class="mpd-join-unlock__access-panel" id="mpdJoinUnlockAccessPanel" hidden>
          <label class="mpd-join-unlock__access-label" for="mpdJoinUnlockAccessCode">${esc(copy.accessLabel)}</label>
          <div class="mpd-join-unlock__access-row">
            <input type="text" id="mpdJoinUnlockAccessCode" name="accessCode" inputmode="numeric" maxlength="8" placeholder="${esc(copy.accessPlaceholder)}" autocomplete="one-time-code" />
            <button type="button" class="mpd-join-unlock__access-redeem" id="mpdJoinUnlockAccessRedeem">${esc(copy.accessRedeem)}</button>
          </div>
          <p class="mpd-join-unlock__access-msg" id="mpdJoinUnlockAccessMsg" hidden role="status"></p>
        </div>
      </div>`;
}
