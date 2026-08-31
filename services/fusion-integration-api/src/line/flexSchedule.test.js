import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    LINE_CAROUSEL_MAX,
    buildDayFlexMessages,
    buildEventBubble,
    buildEventFlexMessages,
    chunkFlexBubbles,
    lineHttpsImageUrl,
    normalizeAnnounceEvents,
    resolveScheduleAnnounceDestination,
} from './flexSchedule.js';

const baseEvent = {
    id: 'e1',
    title: 'Opening dinner',
    date: '2026-09-02',
    startTime: '18:00',
    endTime: '20:00',
    allDay: false,
    timezone: 'Asia/Tokyo',
    locationName: 'Kaga hall',
    imageUrl: '',
    acceptRsvp: false,
    color: 'meals',
};

describe('lineHttpsImageUrl', () => {
    it('keeps https images and drops everything else', () => {
        assert.equal(lineHttpsImageUrl('https://cdn.example.com/flier.jpg'), 'https://cdn.example.com/flier.jpg');
        assert.equal(lineHttpsImageUrl('http://cdn.example.com/flier.jpg'), '');
        assert.equal(lineHttpsImageUrl('/uploads/flier.jpg'), '');
        assert.equal(lineHttpsImageUrl(''), '');
    });
});

describe('buildEventBubble', () => {
    const rsvpUrl = 'https://www.fusionart.world/settings/profile#calendar';

    it('omits hero without an https image', () => {
        const bubble = buildEventBubble({ ...baseEvent, imageUrl: 'http://x.com/a.jpg' }, { rsvpUrl });
        assert.equal(bubble.hero, undefined);
    });

    it('includes hero for https images', () => {
        const bubble = buildEventBubble(
            { ...baseEvent, imageUrl: 'https://cdn.fusionart.world/flier.jpg' },
            { rsvpUrl },
        );
        assert.equal(bubble.hero?.url, 'https://cdn.fusionart.world/flier.jpg');
    });

    it('adds RSVP only when acceptRsvp is on', () => {
        const off = buildEventBubble(baseEvent, { rsvpUrl });
        assert.equal(off.footer, undefined);
        const on = buildEventBubble({ ...baseEvent, acceptRsvp: true }, { rsvpUrl });
        const action = on.footer?.contents?.[0]?.action;
        assert.equal(action?.type, 'uri');
        assert.equal(action?.label, 'RSVP');
        assert.equal(action?.uri, rsvpUrl);
    });
});

describe('chunkFlexBubbles', () => {
    it('chunks day carousels at 12 bubbles', () => {
        const bubbles = Array.from({ length: 13 }, (_, i) => ({ type: 'bubble', id: i }));
        const messages = chunkFlexBubbles(bubbles, 'Day');
        assert.equal(messages.length, 2);
        assert.equal(messages[0].contents.type, 'carousel');
        assert.equal(messages[0].contents.contents.length, LINE_CAROUSEL_MAX);
        assert.equal(messages[1].contents.type, 'bubble');
    });
});

describe('buildDayFlexMessages', () => {
    it('starts with a header bubble then one per event', () => {
        const messages = buildDayFlexMessages({
            programName: 'Kaga',
            date: '2026-09-02',
            events: [baseEvent, { ...baseEvent, id: 'e2', title: 'Tour' }],
            rsvpUrl: 'https://www.fusionart.world/settings/profile#calendar',
        });
        assert.equal(messages.length, 1);
        assert.equal(messages[0].contents.type, 'carousel');
        assert.equal(messages[0].contents.contents.length, 3);
    });
});

describe('buildEventFlexMessages', () => {
    it('sends a single flex bubble', () => {
        const messages = buildEventFlexMessages(baseEvent, {
            rsvpUrl: 'https://www.fusionart.world/settings/profile#calendar',
        });
        assert.equal(messages.length, 1);
        assert.equal(messages[0].type, 'flex');
        assert.match(messages[0].altText, /Opening dinner/);
    });
});

describe('normalizeAnnounceEvents', () => {
    it('drops cancelled events and caps at 24', () => {
        const raw = [
            { ...baseEvent, status: 'cancelled' },
            { ...baseEvent, id: 'ok' },
            { title: '' },
            ...Array.from({ length: 30 }, (_, i) => ({ ...baseEvent, id: `n${i}`, title: `E${i}` })),
        ];
        const out = normalizeAnnounceEvents(raw);
        assert.equal(out.some((e) => e.id === 'ok'), true);
        assert.equal(out.length, 24);
    });
});

describe('resolveScheduleAnnounceDestination', () => {
    it('uses the admin user id for test sends', () => {
        const dest = resolveScheduleAnnounceDestination({
            test: true,
            adminUserId: 'Uadmin',
            announceGroupId: 'Cannounce',
        });
        assert.deepEqual(dest, { to: 'Uadmin', mode: 'test' });
    });

    it('uses the announce group id for live sends', () => {
        const dest = resolveScheduleAnnounceDestination({
            test: false,
            adminUserId: 'Uadmin',
            announceGroupId: 'Cannounce',
        });
        assert.deepEqual(dest, { to: 'Cannounce', mode: 'live' });
    });

    it('fails when the test admin or live room is missing', () => {
        assert.throws(
            () => resolveScheduleAnnounceDestination({ test: true, adminUserId: '', announceGroupId: 'C' }),
            /LINE bot admin/,
        );
        assert.throws(
            () => resolveScheduleAnnounceDestination({ test: false, adminUserId: 'U', announceGroupId: '' }),
            /isn’t connected/,
        );
    });
});
