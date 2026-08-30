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
    isProgramCommsInviteReady,
    isProgramCommsMemberReady,
    normalizeProgramCommsConfig,
    resolveInviteMessage,
    resolveProviderThumbUrl,
    DEFAULT_MEMBER_COMMS_INVITE_MESSAGE,
    renderProgramCommsInviteHtml,
    sampleProgramCommsInviteHtml,
} from './programCommsInvite.js';

describe('addFriendUrlFromBasicId', () => {
    it('prefixes @ and builds the Official Account add-friend URL', () => {
        expect(addFriendUrlFromBasicId('fusion')).toBe('https://line.me/R/ti/p/@fusion');
        expect(addFriendUrlFromBasicId('@fusion')).toBe('https://line.me/R/ti/p/@fusion');
        expect(addFriendUrlFromBasicId('')).toBe('');
    });
});

describe('isProgramCommsInviteReady', () => {
    it('requires hosted QR URLs and both join links', () => {
        expect(isProgramCommsInviteReady(emptyProgramCommsConfig('p1'))).toBe(false);
        expect(
            isProgramCommsInviteReady({
                basicId: '@fusion',
                addFriendUrl: 'https://line.me/R/ti/p/@fusion',
                groupInviteUrl: 'https://line.me/R/ti/g/abc',
                addFriendQrUrl: 'https://cdn.example/friend.png',
                groupQrUrl: 'https://cdn.example/group.png',
            }),
        ).toBe(true);
        expect(
            isProgramCommsInviteReady({
                addFriendUrl: 'https://line.me/R/ti/p/@fusion',
                groupInviteUrl: 'https://line.me/R/ti/g/abc',
                addFriendQrUrl: 'data:image/png;base64,xx',
                groupQrUrl: 'https://cdn.example/group.png',
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
    it('uses Fusion layout with both QR images and CTAs', () => {
        const html = renderProgramCommsInviteHtml({
            programName: 'Kaga City',
            applicantName: 'Sam',
            addFriendUrl: 'https://line.me/R/ti/p/@fusion',
            groupInviteUrl: 'https://line.me/R/ti/g/abc',
            addFriendQrUrl: 'https://cdn.example/friend.png',
            groupQrUrl: 'https://cdn.example/group.png',
            groupName: 'Kaga Fall',
        });
        expect(isFusionEmailLayout(html)).toBe(true);
        expect(html).toContain('https://cdn.example/friend.png');
        expect(html).toContain('https://cdn.example/group.png');
        expect(html).toContain('https://line.me/R/ti/p/@fusion');
        expect(html).toContain('https://line.me/R/ti/g/abc');
        expect(html).toContain('ADD FUSION ON LINE');
        expect(html).toContain('JOIN THE GROUP');
        expect(html).toContain('Sam');
        expect(html).toContain('Kaga City');
    });

    it('sample template is Fusion-branded', () => {
        expect(isFusionEmailLayout(sampleProgramCommsInviteHtml())).toBe(true);
    });
});

describe('collectProgramCommsInviteMessages', () => {
    it('builds one message per email and reports skips', () => {
        const cfg = normalizeProgramCommsConfig({
            programId: 'p1',
            basicId: '@fusion',
            addFriendUrl: 'https://line.me/R/ti/p/@fusion',
            groupInviteUrl: 'https://line.me/R/ti/g/abc',
            addFriendQrUrl: 'https://cdn.example/friend.png',
            groupQrUrl: 'https://cdn.example/group.png',
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
        expect(messages).toHaveLength(1);
        expect(messages[0].to).toBe('a@x.com');
        expect(messages[0].applicantId).toBe('a');
        expect(messages[0].html).toContain('Ada');
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
        groupInviteUrl: 'https://line.me/R/ti/g/abc',
        groupQrUrl: 'https://cdn.example/group.png',
        inviteMessage: '',
        provider: 'line',
    };

    it('uses Fusion default invite copy until staff override', () => {
        expect(resolveInviteMessage({})).toBe(DEFAULT_MEMBER_COMMS_INVITE_MESSAGE);
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

    it('requires group URL + hosted QR before the member tab can publish', () => {
        expect(isProgramCommsMemberReady(emptyProgramCommsConfig('p1'))).toBe(false);
        expect(isProgramCommsMemberReady(ready)).toBe(true);
        expect(isMemberCommsRoomReady({ ...ready, memberActive: false })).toBe(false);
        expect(isMemberCommsRoomReady(ready)).toBe(true);
    });

    it('filters member rooms by activate + QR + slot secured', () => {
        const rooms = filterMemberCommsRooms(
            [
                ready,
                { ...ready, programId: 'p2', memberActive: false },
                { ...ready, programId: 'p3', groupQrUrl: '' },
                { ...ready, programId: 'p4' },
            ],
            ['p1'],
        );
        expect(rooms.map((r) => r.programId)).toEqual(['p1']);
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
