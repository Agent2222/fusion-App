import { describe, expect, it } from 'vitest';
import { isFusionEmailLayout } from './emailFusionLayout.js';
import {
    addFriendUrlFromBasicId,
    applicantPublicEmail,
    applicantsReadyToEmail,
    buildProgramCommsInviteSubject,
    collectProgramCommsInviteMessages,
    confirmedApplicantsForComms,
    emptyProgramCommsConfig,
    formatCommsInviteSentAt,
    defaultProviderThumbUrl,
    filterMemberCommsRooms,
    fileFromPngDataUrl,
    isMemberCommsRoomReady,
    isProgramCommsInviteHtml,
    isProgramCommsInviteReady,
    isProgramCommsMemberReady,
    LINE_ANDROID_STORE_URL,
    LINE_IOS_STORE_URL,
    normalizeProgramCommsConfig,
    resolveInviteMessage,
    resolveProviderThumbUrl,
    DEFAULT_MEMBER_COMMS_INVITE_MESSAGE,
    renderProgramCommsInviteHtml,
    sampleProgramCommsInviteHtml,
} from './programCommsInvite.js';

const READY_ASSETS = {
    iosStoreUrl: LINE_IOS_STORE_URL,
    androidStoreUrl: LINE_ANDROID_STORE_URL,
    iosQrUrl: 'https://cdn.example/ios.png',
    androidQrUrl: 'https://cdn.example/android.png',
    groupGeneralName: 'General',
    groupGeneralInviteUrl: 'https://line.me/R/ti/g/general',
    groupGeneralQrUrl: 'https://cdn.example/general.png',
    groupAnnounceName: 'Announcements',
    groupAnnounceInviteUrl: 'https://line.me/R/ti/g/announce',
    groupAnnounceQrUrl: 'https://cdn.example/announce.png',
};

describe('addFriendUrlFromBasicId', () => {
    it('prefixes @ and builds the Official Account add-friend URL', () => {
        expect(addFriendUrlFromBasicId('fusion')).toBe('https://line.me/R/ti/p/@fusion');
        expect(addFriendUrlFromBasicId('@fusion')).toBe('https://line.me/R/ti/p/@fusion');
        expect(addFriendUrlFromBasicId('')).toBe('');
    });
});

describe('normalizeProgramCommsConfig', () => {
    it('maps leftover V1 group fields onto General and defaults store URLs', () => {
        const rec = normalizeProgramCommsConfig({
            programId: 'p1',
            groupName: 'Kaga Fall',
            groupInviteUrl: 'https://line.me/R/ti/g/legacy',
            groupQrUrl: 'https://cdn.example/legacy.png',
        });
        expect(rec.groupGeneralName).toBe('Kaga Fall');
        expect(rec.groupGeneralInviteUrl).toBe('https://line.me/R/ti/g/legacy');
        expect(rec.groupGeneralQrUrl).toBe('https://cdn.example/legacy.png');
        expect(rec.groupAnnounceInviteUrl).toBe('');
        expect(rec.iosStoreUrl).toBe(LINE_IOS_STORE_URL);
        expect(rec.androidStoreUrl).toBe(LINE_ANDROID_STORE_URL);
    });
});

describe('isProgramCommsInviteReady', () => {
    it('requires both rooms and both hosted store QRs', () => {
        expect(isProgramCommsInviteReady(emptyProgramCommsConfig('p1'))).toBe(false);
        expect(isProgramCommsInviteReady(READY_ASSETS)).toBe(true);
        expect(
            isProgramCommsInviteReady({
                ...READY_ASSETS,
                iosQrUrl: 'data:image/png;base64,xx',
            }),
        ).toBe(false);
        expect(
            isProgramCommsInviteReady({
                ...READY_ASSETS,
                groupAnnounceInviteUrl: '',
            }),
        ).toBe(false);
        expect(
            isProgramCommsInviteReady({
                groupName: 'Legacy',
                groupInviteUrl: 'https://line.me/R/ti/g/legacy',
                groupQrUrl: 'https://cdn.example/legacy.png',
            }),
        ).toBe(false);
    });
});

describe('confirmedApplicantsForComms', () => {
    const rows = [
        { id: 'a', programId: 'p1', slotSecured: true, status: 'accepted', email: 'a@x.com', fullName: 'A' },
        { id: 'b', programId: 'p1', slotSecured: true, status: 'withdrawn', email: 'b@x.com', fullName: 'B' },
        { id: 'c', programId: 'p1', slotSecured: false, status: 'accepted', email: 'c@x.com', fullName: 'C' },
        { id: 'd', programId: 'p2', slotSecured: true, status: 'accepted', email: 'd@x.com', fullName: 'D' },
        { id: 'e', programId: 'p1', slotSecured: true, status: 'pulledOut', email: 'e@x.com', fullName: 'E' },
    ];

    it('keeps slot-secured applicants for the program only', () => {
        expect(confirmedApplicantsForComms(rows, 'p1').map((r) => r.id)).toEqual(['a']);
    });
});

describe('applicantsReadyToEmail', () => {
    it('skips missing or invalid emails', () => {
        const rows = [
            { id: '1', email: 'ok@example.com' },
            { id: '2', email: '' },
            { id: '3', email: 'no-at' },
        ];
        expect(applicantsReadyToEmail(rows).map((r) => r.id)).toEqual(['1']);
        expect(applicantPublicEmail({ email: 'ok@example.com' })).toBe('ok@example.com');
        expect(applicantPublicEmail({ email: '' })).toBe('');
    });
});

describe('renderProgramCommsInviteHtml', () => {
    it('uses Fusion layout with communications pill, two steps, and no sage CTAs', () => {
        const html = renderProgramCommsInviteHtml({
            programName: 'Kaga City',
            applicantName: 'Sam',
            iosStoreUrl: LINE_IOS_STORE_URL,
            androidStoreUrl: LINE_ANDROID_STORE_URL,
            iosQrUrl: 'https://cdn.example/ios.png',
            androidQrUrl: 'https://cdn.example/android.png',
            groupGeneralName: 'General',
            groupAnnounceName: 'Announcements',
            groupGeneralInviteUrl: 'https://line.me/R/ti/g/general',
            groupAnnounceInviteUrl: 'https://line.me/R/ti/g/announce',
            groupGeneralQrUrl: 'https://cdn.example/general.png',
            groupAnnounceQrUrl: 'https://cdn.example/announce.png',
        });
        expect(isFusionEmailLayout(html)).toBe(true);
        expect(isProgramCommsInviteHtml(html)).toBe(true);
        expect(html).toContain('COMMUNICATIONS');
        expect(html).toContain('Official Chat Rooms');
        expect(html).toContain('Step 1 — Download');
        expect(html).toContain('Step 2 — Join both rooms');
        expect(html).toContain('https://cdn.example/ios.png');
        expect(html).toContain('https://cdn.example/android.png');
        expect(html).toContain('https://cdn.example/general.png');
        expect(html).toContain('https://cdn.example/announce.png');
        expect(html).toContain(LINE_IOS_STORE_URL);
        expect(html).toContain(LINE_ANDROID_STORE_URL);
        expect(html).toContain('Join General');
        expect(html).toContain('Join Announcements');
        expect(html).toContain('Sam');
        expect(html).toContain('Kaga City');
        expect(html).not.toMatch(/you are confirmed/i);
        expect(html).not.toContain('#a2b792');
        expect(html).not.toContain('ADD FUSION ON LINE');
        expect(html).not.toContain('JOIN THE GROUP');
    });

    it('sample template is Fusion-branded communications email', () => {
        const html = sampleProgramCommsInviteHtml();
        expect(isFusionEmailLayout(html)).toBe(true);
        expect(isProgramCommsInviteHtml(html)).toBe(true);
        expect(html).toContain('COMMUNICATIONS');
        expect(html).not.toContain('#a2b792');
    });
});

describe('collectProgramCommsInviteMessages', () => {
    it('builds one message per email and reports skips', () => {
        const cfg = normalizeProgramCommsConfig({
            programId: 'p1',
            ...READY_ASSETS,
            oaName: 'Fusion',
        });
        const { messages, skipped, subject } = collectProgramCommsInviteMessages({
            applicants: [
                { id: 'a', email: 'a@x.com', fullName: 'Ada' },
                { id: 'b', email: '', fullName: 'No Mail' },
            ],
            cfg,
            programName: 'Kaga City',
        });
        expect(subject).toBe(buildProgramCommsInviteSubject('Kaga City'));
        expect(subject).toBe('The Kaga City Official Chat Rooms');
        expect(messages).toHaveLength(1);
        expect(messages[0].to).toBe('a@x.com');
        expect(messages[0].applicantId).toBe('a');
        expect(messages[0].html).toContain('Ada');
        expect(messages[0].html).toContain('Official Chat Rooms');
        expect(skipped).toEqual([{ id: 'b', name: 'No Mail', reason: 'no public email' }]);
    });
});

describe('formatCommsInviteSentAt', () => {
    it('formats ISO and nanosecond Motoko timestamps', () => {
        expect(formatCommsInviteSentAt('2026-08-30T12:00:00.000Z')).toMatch(/2026/);
        expect(formatCommsInviteSentAt('1756555200000000000')).toMatch(/\d{4}|Sent/);
        expect(formatCommsInviteSentAt('')).toBe('');
    });
});

describe('member comms publish helpers', () => {
    const ready = {
        programId: 'p1',
        memberActive: true,
        ...READY_ASSETS,
        inviteMessage: '',
        provider: 'line',
    };

    it('uses Fusion default invite copy until staff override', () => {
        expect(resolveInviteMessage({})).toBe(DEFAULT_MEMBER_COMMS_INVITE_MESSAGE);
        expect(DEFAULT_MEMBER_COMMS_INVITE_MESSAGE).not.toMatch(/confirmed/i);
        expect(resolveInviteMessage({ inviteMessage: '  Meet in LINE  ' })).toBe('Meet in LINE');
    });

    it('falls back to the bundled LINE brand icon', () => {
        const url = defaultProviderThumbUrl('line');
        expect(url).toBeTruthy();
        expect(url).toMatch(/line-logo/i);
        expect(resolveProviderThumbUrl({ provider: 'line' })).toBe(url);
        expect(resolveProviderThumbUrl({ provider: 'line', providerThumbUrl: 'https://cdn.example/custom.png' })).toBe(
            'https://cdn.example/custom.png',
        );
        expect(defaultProviderThumbUrl('whatsapp')).toBe('');
    });

    it('requires both rooms and both store QRs before the member tab can publish', () => {
        expect(isProgramCommsMemberReady(emptyProgramCommsConfig('p1'))).toBe(false);
        expect(isProgramCommsMemberReady(ready)).toBe(true);
        expect(isMemberCommsRoomReady({ ...ready, memberActive: false })).toBe(false);
        expect(isMemberCommsRoomReady(ready)).toBe(true);
        expect(isProgramCommsMemberReady({ ...ready, androidQrUrl: '' })).toBe(false);
    });

    it('filters member rooms by activate + QR + slot secured', () => {
        const rooms = filterMemberCommsRooms(
            [
                ready,
                { ...ready, programId: 'p2', memberActive: false },
                { ...ready, programId: 'p3', groupAnnounceQrUrl: '' },
                { ...ready, programId: 'p4' },
            ],
            ['p1'],
        );
        expect(rooms.map((r) => r.programId)).toEqual(['p1']);
        expect(rooms[0].groupGeneralInviteUrl).toBe(READY_ASSETS.groupGeneralInviteUrl);
        expect(rooms[0].iosQrUrl).toBe(READY_ASSETS.iosQrUrl);
    });
});

describe('fileFromPngDataUrl', () => {
    const tinyPng =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';

    it('decodes a PNG data URL without fetch', () => {
        const file = fileFromPngDataUrl(tinyPng, 'line-group-qr.png');
        expect(file.name).toBe('line-group-qr.png');
        expect(file.type).toBe('image/png');
        expect(file.size).toBeGreaterThan(20);
    });

    it('rejects non-data URLs', () => {
        expect(() => fileFromPngDataUrl('https://example.com/qr.png')).toThrow(/QR generation failed/);
    });
});
