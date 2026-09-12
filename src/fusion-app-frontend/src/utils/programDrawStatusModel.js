/**
 * Copy and view-model for Settings → My programs `<app-program-draw-status>`.
 */

/**
 * @param {'en'|'ja'} locale
 * @param {{ remaining: number, claimed: number, total: number, cycle: number }} n
 */
export function settingsDrawStatusCopy(locale, n) {
    if (locale === 'ja') {
        return {
            badge: 'プログラム抽選',
            title: 'プログラム抽選エントリー',
            sub: `現在の抽選ラウンドにエントリー済みです。全 ${n.total} 枠が埋まったら、1名がランダムに選ばれます。`,
            active: '開催中',
            cycle: `ラウンド ${n.cycle}`,
            remainingLabel: '残り',
            remainingEntries: '残りエントリー',
            untilWinner: `当選発表まであと ${n.remaining} エントリー`,
            submitted: `${n.claimed} / ${n.total} エントリー提出済み`,
            totalEntries: '合計エントリー',
            estimatedDraw: '抽選予定',
            estimatedBody: `${n.total} 枠が埋まった後、約1週間以内`,
            yourEntry: 'あなたのエントリー',
            entered: 'エントリー済み',
            help: `${n.total} エントリーに達した時点で抽選に含まれます。`,
            withdraw: 'エントリーを取り消す',
            disclaimer: 'エントリーはいつでも取り消せます。返金はありません。',
            withdrawConfirm:
                'プログラム抽選のエントリーを取り消しますか？消費済みのアワードクレジットや支払いの返金はありません。',
            demoToast: 'デモ表示のみです。',
            withdrawing: '取り消し中…',
        };
    }
    return {
        badge: 'Program Draw',
        title: 'Program Draw Entry',
        sub: `You are entered in the current draw cycle. Once all ${n.total} spots are filled, one recipient is randomly selected.`,
        active: 'Active',
        cycle: `Cycle ${n.cycle}`,
        remainingLabel: 'Remaining',
        remainingEntries: 'Remaining entries',
        untilWinner: `${n.remaining} entries until winner announcement`,
        submitted: `${n.claimed} of ${n.total} entries submitted`,
        totalEntries: 'Total entries',
        estimatedDraw: 'Estimated draw',
        estimatedBody: `Within 1 week after ${n.total} entries are filled`,
        yourEntry: 'Your entry',
        entered: 'Entered',
        help: `You will be included in the draw when ${n.total} entries are reached.`,
        withdraw: 'Withdraw entry',
        disclaimer: 'You can withdraw your entry at any time. There is no refund.',
        withdrawConfirm:
            'Withdraw your Program Draw entry? Consumed award credits or payments are not refunded.',
        demoToast: 'Demo only — not a live draw entry.',
        withdrawing: 'Withdrawing…',
    };
}

/**
 * @param {'en'|'ja'} locale
 */
export function settingsDrawStatusClosedCopy(locale) {
    if (locale === 'ja') {
        return {
            badge: 'プログラム抽選',
            title: 'プログラム抽選エントリー',
            sub: 'このプログラム抽選は終了しました。参加特典はメールをご確認ください。',
            closed: '終了',
            yourEntry: 'あなたのエントリー',
            entered: 'エントリー済み',
            help: '参加特典のアクセスコードは、登録メールをご確認ください。',
            redeem: 'アクセスコードを使う',
        };
    }
    return {
        badge: 'Program Draw',
        title: 'Program Draw Entry',
        sub: 'This Program Draw has closed. Check your email for your participation reward.',
        closed: 'Closed',
        yourEntry: 'Your entry',
        entered: 'Entered',
        help: 'Look in your inbox for the access code that unlocks your participation reward.',
        redeem: 'Redeem access code',
    };
}

/**
 * @param {{ closed?: boolean }} opts
 */
export function settingsDrawStatusShowsLiveProgress(opts = {}) {
    return !opts.closed;
}

/**
 * @param {{ closed?: boolean }} opts
 */
export function settingsDrawStatusShowsWithdraw(opts = {}) {
    return !opts.closed;
}
