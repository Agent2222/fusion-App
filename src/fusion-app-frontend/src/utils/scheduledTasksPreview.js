/**
 * DEV-only Scheduled Tasks fixtures so Playwright can review the page without II.
 */
import { isRadarPreviewEnvAllowed } from './radarPreview.js';

/**
 * @param {string} [search]
 */
export function isScheduledTasksPreviewActive(search) {
    if (!isRadarPreviewEnvAllowed()) return false;
    const loc = typeof window !== 'undefined' ? window.location : null;
    const p = new URLSearchParams(String(search || loc?.search || '').replace(/^\?/, ''));
    return p.get('scheduledTasksPreview') === '1';
}

export function buildScheduledTasksPreviewPayload() {
    return {
        tasks: [
            {
                id: 'st-preview-arrival',
                name: 'Kaga arrival reminder',
                enabled: true,
                channels: 'email',
                kind: 'flight_followup',
                programIds: ['prog-kaga'],
                lineRooms: 'both',
                customSubject: '',
                customBodyText: '',
                customLineText: '',
                timezone: 'Asia/Tokyo',
                firstRunLocal: '2026-09-04T09:00',
                repeat: 'once',
                skipIfDone: true,
                nextRunAtIso: '2026-09-04T00:00:00.000Z',
                lockedUntilIso: '',
                lastRunAt: '',
                lastStatus: '',
                lastSummary: '',
                createdAt: '2026-08-20T00:00:00.000Z',
                updatedAt: '2026-08-20T00:00:00.000Z',
                createdBy: 'preview',
            },
            {
                id: 'st-preview-invite',
                name: 'Chat invite — weekly',
                enabled: true,
                channels: 'both',
                kind: 'comms_invite',
                programIds: ['prog-kaga'],
                lineRooms: 'both',
                customSubject: '',
                customBodyText: '',
                customLineText: '',
                timezone: 'Asia/Tokyo',
                firstRunLocal: '2026-08-31T10:00',
                repeat: 'weekly',
                skipIfDone: true,
                nextRunAtIso: '2026-08-31T01:00:00.000Z',
                lockedUntilIso: '',
                lastRunAt: '2026-08-26T01:00:00.000Z',
                lastStatus: 'ok',
                lastSummary: 'Sent',
                createdAt: '2026-08-01T00:00:00.000Z',
                updatedAt: '2026-08-26T01:00:00.000Z',
                createdBy: 'preview',
            },
            {
                id: 'st-preview-line-gap',
                name: 'Announcements note',
                enabled: true,
                channels: 'line',
                kind: 'custom',
                programIds: ['prog-open'],
                lineRooms: 'announce',
                customSubject: '',
                customBodyText: '',
                customLineText: 'Please check the announcements room this week.',
                timezone: 'Asia/Tokyo',
                firstRunLocal: '2026-09-10T18:00',
                repeat: 'once',
                skipIfDone: false,
                nextRunAtIso: '2026-09-10T09:00:00.000Z',
                lockedUntilIso: '',
                lastRunAt: '2026-08-28T09:00:00.000Z',
                lastStatus: 'failed',
                lastSummary: 'LINE chat isn’t connected for this program',
                createdAt: '2026-08-15T00:00:00.000Z',
                updatedAt: '2026-08-28T09:00:00.000Z',
                createdBy: 'preview',
            },
            {
                id: 'st-preview-paused',
                name: 'Paused custom note',
                enabled: false,
                channels: 'email',
                kind: 'custom',
                programIds: ['prog-kaga'],
                lineRooms: 'both',
                customSubject: 'A note from Fusion',
                customBodyText: 'We will share more details soon.',
                customLineText: '',
                timezone: 'Asia/Tokyo',
                firstRunLocal: '2026-09-20T09:00',
                repeat: 'once',
                skipIfDone: false,
                nextRunAtIso: '2026-09-20T00:00:00.000Z',
                lockedUntilIso: '',
                lastRunAt: '',
                lastStatus: '',
                lastSummary: '',
                createdAt: '2026-08-18T00:00:00.000Z',
                updatedAt: '2026-08-18T00:00:00.000Z',
                createdBy: 'preview',
            },
        ],
        programs: [
            { id: 'prog-kaga', enCard: { programPage: { headline: 'Kaga City Artist Residency' }, year: 2026 } },
            { id: 'prog-open', enCard: { programPage: { headline: 'Open Studio Week' }, year: 2026 } },
        ],
        applicants: [
            {
                id: 'app-maya',
                programId: 'prog-kaga',
                email: 'maya@example.com',
                fullName: 'Maya Fujita',
                status: 'accepted',
                slotSecured: true,
                hasArrival: false,
                inviteSentAt: '',
            },
            {
                id: 'app-rin',
                programId: 'prog-kaga',
                email: 'rin.takahashi@example.com',
                fullName: 'Rin Takahashi',
                status: 'accepted',
                slotSecured: true,
                hasArrival: true,
                inviteSentAt: '2026-08-12T00:00:00.000Z',
            },
        ],
        bindings: {
            'prog-kaga': { groupGeneralId: 'G-kaga-general', groupAnnounceId: 'G-kaga-announce' },
            'prog-open': { groupGeneralId: '', groupAnnounceId: '' },
        },
    };
}
