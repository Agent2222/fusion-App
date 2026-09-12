import { describe, expect, it } from 'vitest';
import {
    STUDIO_ROLE_PREVIEW_STORAGE_KEY,
    applyStudioRolePreviewToGate,
    getStudioRolePreview,
    isStudioRolePreviewActive,
    normalizeStudioRolePreview,
    setStudioRolePreview,
    studioRolePreviewInitial,
    studioRolePreviewLabel,
    studioRolePreviewMenuItems,
} from './studioRolePreview.js';

function memoryStorage(initial = {}) {
    const data = { ...initial };
    return {
        getItem(k) {
            return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null;
        },
        setItem(k, v) {
            data[k] = String(v);
        },
        removeItem(k) {
            delete data[k];
        },
        data,
    };
}

describe('studioRolePreview', () => {
    it('normalizes unknown values to admin', () => {
        expect(normalizeStudioRolePreview('')).toBe('admin');
        expect(normalizeStudioRolePreview('curator')).toBe('admin');
        expect(normalizeStudioRolePreview('Staff')).toBe('staff');
        expect(normalizeStudioRolePreview('collaborator')).toBe('collaborator');
    });

    it('persists staff and collaborator, and clears storage for admin', () => {
        const storage = memoryStorage();
        expect(setStudioRolePreview('staff', storage)).toBe('staff');
        expect(storage.data[STUDIO_ROLE_PREVIEW_STORAGE_KEY]).toBe('staff');
        expect(getStudioRolePreview(storage)).toBe('staff');
        setStudioRolePreview('admin', storage);
        expect(storage.data[STUDIO_ROLE_PREVIEW_STORAGE_KEY]).toBeUndefined();
        expect(getStudioRolePreview(storage)).toBe('admin');
    });

    it('labels preview roles for the sidebar footer', () => {
        expect(studioRolePreviewLabel('staff')).toBe('Staff');
        expect(studioRolePreviewLabel('collaborator')).toBe('Collaborator');
        expect(studioRolePreviewInitial('admin')).toBe('A');
        expect(isStudioRolePreviewActive('staff')).toBe(true);
        expect(isStudioRolePreviewActive('admin')).toBe(false);
    });

    it('does not overlay a matrix when the caller is not an admin', () => {
        const matrix = new Map([['schedule', { visible: false, canEdit: false }]]);
        const out = applyStudioRolePreviewToGate(
            {
                isAdmin: false,
                permissionsNavAllowed: false,
                teamNavAllowed: false,
                effectiveMatrix: matrix,
            },
            'staff',
            new Map([['schedule', { visible: true, canEdit: true }]]),
        );
        expect(out.previewRole).toBe('');
        expect(out.effectiveMatrix).toBe(matrix);
        expect(out.permissionsNavAllowed).toBe(false);
    });

    it('keeps unrestricted admin access when previewing admin', () => {
        const out = applyStudioRolePreviewToGate(
            {
                isAdmin: true,
                permissionsNavAllowed: true,
                teamNavAllowed: true,
                effectiveMatrix: null,
            },
            'admin',
            new Map(),
        );
        expect(out.previewRole).toBe('admin');
        expect(out.effectiveMatrix).toBeNull();
        expect(out.teamNavAllowed).toBe(true);
        expect(out.permissionsNavAllowed).toBe(true);
    });

    it('applies staff matrix and hides Team / Permissions nav', () => {
        const staffMatrix = new Map([['schedule', { visible: true, canEdit: false }]]);
        const out = applyStudioRolePreviewToGate(
            {
                isAdmin: true,
                permissionsNavAllowed: true,
                teamNavAllowed: true,
                effectiveMatrix: null,
            },
            'staff',
            staffMatrix,
        );
        expect(out.previewRole).toBe('staff');
        expect(out.effectiveMatrix).toBe(staffMatrix);
        expect(out.teamNavAllowed).toBe(false);
        expect(out.permissionsNavAllowed).toBe(false);
        expect(out.isAdmin).toBe(true);
    });

    it('falls back to the real admin gate when no matrix is available', () => {
        const out = applyStudioRolePreviewToGate(
            {
                isAdmin: true,
                permissionsNavAllowed: true,
                teamNavAllowed: true,
                effectiveMatrix: null,
            },
            'collaborator',
            null,
        );
        expect(out.previewRole).toBe('admin');
        expect(out.effectiveMatrix).toBeNull();
        expect(out.teamNavAllowed).toBe(true);
    });

    it('marks the selected menu item', () => {
        const items = studioRolePreviewMenuItems('collaborator');
        expect(items.map((i) => i.id)).toEqual(['admin', 'staff', 'collaborator']);
        expect(items.find((i) => i.id === 'collaborator')?.selected).toBe(true);
        expect(items.find((i) => i.id === 'admin')?.selected).toBe(false);
    });
});
