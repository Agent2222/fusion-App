import { describe, expect, it } from 'vitest';
import {
    collectStudioTeamDirectoryRows,
    isStudioTeamAccountRole,
    shouldShowStudioTeamRow,
    studioTeamRoleKey,
} from './studioTeamDirectory.js';

describe('studioTeamDirectory', () => {
    it('treats only admin, staff, and collaborator as team account roles', () => {
        expect(isStudioTeamAccountRole('admin')).toBe(true);
        expect(isStudioTeamAccountRole('Staff')).toBe(true);
        expect(isStudioTeamAccountRole('collaborator')).toBe(true);
        expect(isStudioTeamAccountRole('artist')).toBe(false);
        expect(isStudioTeamAccountRole('gallery')).toBe(false);
        expect(isStudioTeamAccountRole('curator')).toBe(false);
        expect(isStudioTeamAccountRole('collector')).toBe(false);
        expect(studioTeamRoleKey({ artist: null })).toBe('artist');
        expect(isStudioTeamAccountRole(studioTeamRoleKey({ staff: null }))).toBe(true);
        expect(isStudioTeamAccountRole(studioTeamRoleKey({ collector: null }))).toBe(false);
    });

    it('shows canister admins even without an account row', () => {
        expect(shouldShowStudioTeamRow({ isAdmin: true, accountRole: '' })).toBe(true);
        expect(shouldShowStudioTeamRow({ isAdmin: false, accountRole: 'artist' })).toBe(false);
        expect(shouldShowStudioTeamRow({ isAdmin: false, accountRole: 'staff' })).toBe(true);
    });

    it('lists only admin, staff, and collaborator accounts plus canister admins', () => {
        const rows = collectStudioTeamDirectoryRows({
            adminPrincipals: ['aaa-admin'],
            superStaffPrincipals: ['artist-super', 'staff-p'],
            accounts: [
                { principal: 'staff-p', role: 'staff' },
                { principal: 'artist-p', role: 'artist' },
                { principal: 'collab-p', role: 'collaborator' },
                { principal: 'acct-admin', role: 'admin' },
                { principal: 'artist-super', role: 'artist' },
                { principal: 'gallery-p', role: 'gallery' },
            ],
            contactPairs: [
                ['artist-p', { firstName: 'A', lastName: 'Rtist', email: 'a@x.com' }],
                ['staff-p', { firstName: 'S', lastName: 'Taff', email: 's@x.com' }],
                ['random-contact', { firstName: 'R', lastName: 'Andom', email: 'r@x.com' }],
            ],
        });
        expect(rows.map((r) => r.principal)).toEqual(['aaa-admin', 'acct-admin', 'collab-p', 'staff-p']);
        expect(rows.find((r) => r.principal === 'staff-p')?.contact?.email).toBe('s@x.com');
        expect(rows.find((r) => r.principal === 'staff-p')?.isSuperStaff).toBe(true);
        expect(rows.find((r) => r.principal === 'aaa-admin')?.isAdmin).toBe(true);
        expect(rows.some((r) => r.principal === 'artist-p')).toBe(false);
        expect(rows.some((r) => r.principal === 'artist-super')).toBe(false);
        expect(rows.some((r) => r.principal === 'random-contact')).toBe(false);
    });
});
