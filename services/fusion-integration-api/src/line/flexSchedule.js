/**
 * LINE Flex builders for Studio Schedule announce (event + day).
 * Do not import the Vite frontend from this package.
 */

export const LINE_CAROUSEL_MAX = 12;
export const LINE_PUSH_MAX_MESSAGES = 5;
export const ANNOUNCE_EVENT_CAP = 24;
export const DEFAULT_SCHEDULE_RSVP_ORIGIN = 'https://www.fusionart.world';

const CATEGORY_HEX = {
    traveling: '#f4c2c8',
    creating: '#cfe8d6',
    exploration: '#f3e6c0',
    setup: '#9caf88',
    flights: '#c5dff8',
    presentations: '#4a72c4',
    meals: '#e0b322',
    external: '#ffe14a',
    workshop: '#2ec8c8',
    filming: '#8ef04a',
    tours: '#ff8a1a',
    sage: '#9caf88',
    blue: '#c5dff8',
    sand: '#f3e6c0',
    blush: '#f4c2c8',
};

/**
 * @param {unknown} url
 */
export function lineHttpsImageUrl(url) {
    const u = String(url || '').trim();
    return /^https:\/\//i.test(u) ? u : '';
}

/**
 * @param {string} [siteOrigin]
 */
export function calendarRsvpUrl(siteOrigin) {
    const base = String(siteOrigin || DEFAULT_SCHEDULE_RSVP_ORIGIN).trim().replace(/\/$/, '') || DEFAULT_SCHEDULE_RSVP_ORIGIN;
    return `${base}/settings/profile#calendar`;
}

/**
 * @param {unknown} tz
 */
export function timezoneShortLabel(tz) {
    const raw = String(tz || '').trim();
    if (!raw) return '';
    const parts = raw.split('/');
    return (parts[parts.length - 1] || raw).replace(/_/g, ' ');
}

/**
 * @param {unknown} ev
 */
export function formatEventTimeLabel(ev) {
    if (ev?.allDay) return 'All day';
    const start = String(ev?.startTime || '').trim();
    const end = String(ev?.endTime || '').trim();
    if (start && end) return `${start}–${end}`;
    return start || 'Time TBA';
}

/**
 * @param {unknown} ymd
 */
export function formatAnnounceDateLabel(ymd) {
    const raw = String(ymd || '').trim();
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return raw || 'Date TBA';
    const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    return dt.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
    });
}

/**
 * @param {unknown} raw
 */
export function categoryAccentHex(raw) {
    const key = String(raw || '')
        .trim()
        .toLowerCase();
    return CATEGORY_HEX[key] || '#cfe8d6';
}

/**
 * @param {unknown} raw
 * @param {number} [cap]
 */
export function normalizeAnnounceEvents(raw, cap = ANNOUNCE_EVENT_CAP) {
    const list = Array.isArray(raw) ? raw : [];
    const out = [];
    for (const ev of list) {
        if (!ev || typeof ev !== 'object') continue;
        if (String(ev.status || '').trim().toLowerCase() === 'cancelled') continue;
        const title = String(ev.title || '').trim();
        if (!title) continue;
        out.push({
            id: String(ev.id || '').trim(),
            title: title.slice(0, 80),
            date: String(ev.date || '').trim(),
            startTime: String(ev.startTime || '').trim(),
            endTime: String(ev.endTime || '').trim(),
            allDay: Boolean(ev.allDay),
            timezone: String(ev.timezone || '').trim(),
            locationName: String(ev.locationName || '').trim().slice(0, 80),
            imageUrl: lineHttpsImageUrl(ev.imageUrl),
            acceptRsvp: Boolean(ev.acceptRsvp),
            color: String(ev.color || '').trim(),
        });
        if (out.length >= cap) break;
    }
    return out;
}

/**
 * @param {object} ev
 * @param {{ rsvpUrl: string }} opts
 */
export function buildEventBubble(ev, opts) {
    const title = String(ev?.title || 'Event').slice(0, 80);
    const dateLabel = formatAnnounceDateLabel(ev?.date);
    const timeLabel = formatEventTimeLabel(ev);
    const location = String(ev?.locationName || '').trim() || 'Location TBA';
    const tz = timezoneShortLabel(ev?.timezone);
    const accent = categoryAccentHex(ev?.color);
    const heroUrl = lineHttpsImageUrl(ev?.imageUrl);
    const bodyContents = [
        {
            type: 'box',
            layout: 'vertical',
            contents: [{ type: 'filler' }],
            backgroundColor: accent,
            height: '6px',
        },
        {
            type: 'text',
            text: title,
            weight: 'bold',
            size: 'lg',
            wrap: true,
            color: '#111111',
        },
        {
            type: 'text',
            text: dateLabel,
            size: 'sm',
            color: '#666666',
            wrap: true,
        },
        {
            type: 'text',
            text: tz ? `${timeLabel} · ${tz}` : timeLabel,
            size: 'sm',
            color: '#111111',
            wrap: true,
        },
        {
            type: 'text',
            text: location,
            size: 'sm',
            color: '#666666',
            wrap: true,
        },
    ];
    /** @type {Record<string, unknown>} */
    const bubble = {
        type: 'bubble',
        size: 'kilo',
        body: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            paddingAll: '16px',
            contents: bodyContents,
        },
    };
    if (heroUrl) {
        bubble.hero = {
            type: 'image',
            url: heroUrl,
            size: 'full',
            aspectRatio: '20:13',
            aspectMode: 'cover',
        };
    }
    if (ev?.acceptRsvp && opts?.rsvpUrl) {
        bubble.footer = {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            paddingAll: '12px',
            contents: [
                {
                    type: 'button',
                    style: 'primary',
                    color: '#111827',
                    height: 'sm',
                    action: {
                        type: 'uri',
                        label: 'RSVP',
                        uri: String(opts.rsvpUrl),
                    },
                },
            ],
        };
    }
    return bubble;
}

/**
 * @param {string} programName
 * @param {string} date
 */
export function buildDayHeaderBubble(programName, date) {
    const program = String(programName || 'Program').slice(0, 80);
    const dateLabel = formatAnnounceDateLabel(date);
    return {
        type: 'bubble',
        size: 'kilo',
        body: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            paddingAll: '20px',
            contents: [
                {
                    type: 'text',
                    text: 'TODAY',
                    size: 'xs',
                    weight: 'bold',
                    color: '#888888',
                },
                {
                    type: 'text',
                    text: program,
                    weight: 'bold',
                    size: 'xl',
                    wrap: true,
                    color: '#111111',
                },
                {
                    type: 'text',
                    text: dateLabel,
                    size: 'sm',
                    color: '#666666',
                    wrap: true,
                },
            ],
        },
    };
}

/**
 * @param {object[]} bubbles
 * @param {string} altText
 */
export function chunkFlexBubbles(bubbles, altText) {
    const list = Array.isArray(bubbles) ? bubbles.filter(Boolean) : [];
    const messages = [];
    for (let i = 0; i < list.length && messages.length < LINE_PUSH_MAX_MESSAGES; i += LINE_CAROUSEL_MAX) {
        const slice = list.slice(i, i + LINE_CAROUSEL_MAX);
        if (slice.length === 1) {
            messages.push({
                type: 'flex',
                altText: String(altText || 'Schedule').slice(0, 400),
                contents: slice[0],
            });
        } else {
            messages.push({
                type: 'flex',
                altText: String(altText || 'Schedule').slice(0, 400),
                contents: { type: 'carousel', contents: slice },
            });
        }
    }
    return messages;
}

/**
 * @param {object} ev
 * @param {{ rsvpUrl: string }} opts
 */
export function buildEventFlexMessages(ev, opts) {
    const time = formatEventTimeLabel(ev);
    const alt = `${ev?.title || 'Event'} · ${time}`;
    return chunkFlexBubbles([buildEventBubble(ev, opts)], alt);
}

/**
 * @param {{ programName?: string, date?: string, events?: object[], rsvpUrl: string }} opts
 */
export function buildDayFlexMessages(opts) {
    const events = Array.isArray(opts?.events) ? opts.events : [];
    const programName = String(opts?.programName || 'Program');
    const date = String(opts?.date || events[0]?.date || '');
    const bubbles = [buildDayHeaderBubble(programName, date), ...events.map((ev) => buildEventBubble(ev, opts))];
    const alt = `${programName} · ${formatAnnounceDateLabel(date)}`;
    return chunkFlexBubbles(bubbles, alt);
}

/**
 * @param {{ test?: boolean, adminUserId?: string, announceGroupId?: string }} opts
 */
export function resolveScheduleAnnounceDestination(opts) {
    if (opts?.test) {
        const id = String(opts.adminUserId || '').trim();
        if (!id) {
            const err = new Error('LINE bot admin is not set up yet.');
            err.code = 'LINE_ADMIN_MISSING';
            throw err;
        }
        return { to: id, mode: 'test' };
    }
    const id = String(opts.announceGroupId || '').trim();
    if (!id) {
        const err = new Error('LINE chat isn’t connected for this program');
        err.code = 'LINE_ROOM_UNBOUND';
        throw err;
    }
    return { to: id, mode: 'live' };
}
