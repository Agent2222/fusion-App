import { describe, expect, it } from 'vitest';
import {
    STUDIO_PERMISSION_FEATURE_ROWS,
    isStaleCanisterPermissionKeyList,
    studioPermissionGroupLabel,
} from './studioPermissionFeatures.js';

function idsInGroup(group) {
    return STUDIO_PERMISSION_FEATURE_ROWS.filter((r) => r.group === group).map((r) => r.id);
}

describe('studio permission feature rows', () => {
    it('groups Content, Operations, and Moderation so those dashboard sections can be managed', () => {
        expect(idsInGroup('content')).toEqual([
            'programs',
            'products',
            'journal',
            'sound',
            'community',
            'videos',
            'content',
            'user-studio',
            'email',
            'ai',
        ]);
        expect(idsInGroup('moderation')).toEqual([
            'pending-approval',
            'profile-images',
            'audio-files',
            'broadcasts',
        ]);
        expect(idsInGroup('operations')).toEqual([
            'gallery-access',
            'join-network',
            'users',
            'services',
            'scheduled-tasks',
            'links',
            'settings',
        ]);
    });

    it('labels sidebar groups in the permissions matrix', () => {
        expect(studioPermissionGroupLabel('content')).toBe('Content');
        expect(studioPermissionGroupLabel('moderation')).toBe('Moderation');
        expect(studioPermissionGroupLabel('operations')).toBe('Operations');
    });

    it('treats a canister key list missing Videos / Join Network as stale', () => {
        const withoutNew = STUDIO_PERMISSION_FEATURE_ROWS.map((r) => r.id).filter(
            (id) => id !== 'videos' && id !== 'join-network',
        );
        expect(isStaleCanisterPermissionKeyList(withoutNew)).toBe(true);
        expect(isStaleCanisterPermissionKeyList(STUDIO_PERMISSION_FEATURE_ROWS.map((r) => r.id))).toBe(
            false,
        );
    });
});
