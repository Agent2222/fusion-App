import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Principal } from '@dfinity/principal';
import {
    setupPic,
    teardownPic,
    deployBackend,
    ADMIN_PRINCIPAL,
    USER1_PRINCIPAL,
    USER2_PRINCIPAL,
} from './setup.js';

describe('User Account CRUD', () => {
    let pic;
    let picCtx;
    let actor;

    beforeAll(async () => {
        picCtx = await setupPic();
        pic = picCtx.pic;
    });

    afterAll(async () => {
        await teardownPic(picCtx);
    });

    beforeEach(async () => {
        const fixture = await deployBackend(pic);
        actor = fixture.actor;
    });

    // --- Create ---

    describe('registerOrUpdateAccount', () => {
        it('creates a new account with pending status', async () => {
            actor.setPrincipal(USER1_PRINCIPAL);
            await actor.registerOrUpdateAccount({ artist: null });

            const account = await actor.getAccountForCaller();
            expect(account).toHaveLength(1);
            const acct = account[0];
            expect(acct.role).toEqual({ artist: null });
            expect(acct.status).toEqual({ pending: null });
            expect(acct.linkedArtistId).toEqual([]);
            expect(acct.linkedOrgId).toEqual([]);
        });

        it('updates role on second call but preserves status', async () => {
            actor.setPrincipal(USER1_PRINCIPAL);
            await actor.registerOrUpdateAccount({ artist: null });
            await actor.registerOrUpdateAccount({ collector: null });

            const account = await actor.getAccountForCaller();
            expect(account).toHaveLength(1);
            expect(account[0].role).toEqual({ collector: null });
            expect(account[0].status).toEqual({ pending: null });
        });

        it('rejects privileged roles (staff, admin)', async () => {
            actor.setPrincipal(USER1_PRINCIPAL);
            await expect(
                actor.registerOrUpdateAccount({ admin: null }),
            ).rejects.toThrow();
            await expect(
                actor.registerOrUpdateAccount({ staff: null }),
            ).rejects.toThrow();
        });
    });

    // --- Read ---

    describe('getAccountForCaller', () => {
        it('returns empty for unregistered principal', async () => {
            actor.setPrincipal(USER2_PRINCIPAL);
            const account = await actor.getAccountForCaller();
            expect(account).toHaveLength(0);
        });

        it('returns the account after registration', async () => {
            actor.setPrincipal(USER1_PRINCIPAL);
            await actor.registerOrUpdateAccount({ gallery: null });

            const account = await actor.getAccountForCaller();
            expect(account).toHaveLength(1);
            expect(account[0].role).toEqual({ gallery: null });
        });
    });

    describe('getMyAccountContactForCaller', () => {
        it('returns empty for anonymous principal', async () => {
            actor.setPrincipal(Principal.anonymous());
            const contact = await actor.getMyAccountContactForCaller();
            expect(contact).toHaveLength(0);
        });

        it('returns empty when no contact is set', async () => {
            actor.setPrincipal(USER1_PRINCIPAL);
            await actor.registerOrUpdateAccount({ artist: null });
            const contact = await actor.getMyAccountContactForCaller();
            expect(contact).toHaveLength(0);
        });

        it('returns contact after setMyAccountContact', async () => {
            actor.setPrincipal(USER1_PRINCIPAL);
            await actor.registerOrUpdateAccount({ artist: null });
            await actor.setMyAccountContact({
                firstName: 'Jane',
                lastName: 'Doe',
                email: 'jane@example.com',
            });
            const contact = await actor.getMyAccountContactForCaller();
            expect(contact).toHaveLength(1);
            expect(contact[0].firstName).toBe('Jane');
            expect(contact[0].lastName).toBe('Doe');
            expect(contact[0].email).toBe('jane@example.com');
        });
    });

    // --- Update ---

    describe('setMyAccountContact', () => {
        it('traps for caller with no account', async () => {
            actor.setPrincipal(USER2_PRINCIPAL);
            await expect(
                actor.setMyAccountContact({
                    firstName: 'Test',
                    lastName: 'User',
                    email: 'test@example.com',
                }),
            ).rejects.toThrow();
        });

        it('traps for anonymous caller', async () => {
            actor.setPrincipal(Principal.anonymous());
            await expect(
                actor.setMyAccountContact({
                    firstName: 'Anon',
                    lastName: 'User',
                    email: 'anon@example.com',
                }),
            ).rejects.toThrow();
        });

        it('succeeds for registered user', async () => {
            actor.setPrincipal(USER1_PRINCIPAL);
            await actor.registerOrUpdateAccount({ curator: null });
            await actor.setMyAccountContact({
                firstName: 'Alice',
                lastName: 'Smith',
                email: 'alice@example.com',
            });
            const contact = await actor.getMyAccountContactForCaller();
            expect(contact[0].email).toBe('alice@example.com');
        });

        it('updates existing contact', async () => {
            actor.setPrincipal(USER1_PRINCIPAL);
            await actor.registerOrUpdateAccount({ artist: null });
            await actor.setMyAccountContact({
                firstName: 'Old',
                lastName: 'Name',
                email: 'old@example.com',
            });
            await actor.setMyAccountContact({
                firstName: 'New',
                lastName: 'Name',
                email: 'new@example.com',
            });
            const contact = await actor.getMyAccountContactForCaller();
            expect(contact[0].firstName).toBe('New');
            expect(contact[0].email).toBe('new@example.com');
        });
    });

    describe('adminSetAccountContact', () => {
        it('allows admin to set contact for any principal', async () => {
            // First register USER1
            actor.setPrincipal(USER1_PRINCIPAL);
            await actor.registerOrUpdateAccount({ artist: null });

            // Admin sets contact
            actor.setPrincipal(ADMIN_PRINCIPAL);
            await actor.adminSetAccountContact(USER1_PRINCIPAL, {
                firstName: 'Admin',
                lastName: 'Set',
                email: 'admin-set@example.com',
            });

            // Verify as USER1
            actor.setPrincipal(USER1_PRINCIPAL);
            const contact = await actor.getMyAccountContactForCaller();
            expect(contact[0].firstName).toBe('Admin');
            expect(contact[0].email).toBe('admin-set@example.com');
        });

        it('traps for non-admin caller', async () => {
            actor.setPrincipal(USER1_PRINCIPAL);
            await expect(
                actor.adminSetAccountContact(USER2_PRINCIPAL, {
                    firstName: 'Hack',
                    lastName: 'Attempt',
                    email: 'hack@example.com',
                }),
            ).rejects.toThrow();
        });
    });

    // --- Admin Read ---

    describe('listAccounts', () => {
        it('traps for non-admin / non-staff caller', async () => {
            actor.setPrincipal(USER1_PRINCIPAL);
            await expect(actor.listAccounts()).rejects.toThrow();
        });

        it('returns all accounts for admin caller', async () => {
            // Register two users
            actor.setPrincipal(USER1_PRINCIPAL);
            await actor.registerOrUpdateAccount({ artist: null });
            actor.setPrincipal(USER2_PRINCIPAL);
            await actor.registerOrUpdateAccount({ gallery: null });

            // Admin lists
            actor.setPrincipal(ADMIN_PRINCIPAL);
            const accounts = await actor.listAccounts();
            expect(accounts.length).toBeGreaterThanOrEqual(2);

            const principals = accounts.map(([p]) => p.toText());
            expect(principals).toContain(USER1_PRINCIPAL.toText());
            expect(principals).toContain(USER2_PRINCIPAL.toText());
        });
    });

    // --- Create with invite code ---

    describe('registerWithJoinAccessCode', () => {
        it('returns invalidCode for a bogus code', async () => {
            actor.setPrincipal(USER1_PRINCIPAL);
            const result = await actor.registerWithJoinAccessCode(
                { artist: null },
                '00000000',
                'Test',
                'User',
                'test@example.com',
            );
            expect(result).toEqual({ invalidCode: null });
        });

        it('returns accountExists if caller already has an account', async () => {
            // Register first
            actor.setPrincipal(USER1_PRINCIPAL);
            await actor.registerOrUpdateAccount({ artist: null });

            // Try invite code registration
            const result = await actor.registerWithJoinAccessCode(
                { artist: null },
                '12345678',
                'Test',
                'User',
                'test@example.com',
            );
            expect(result).toEqual({ accountExists: null });
        });

        it('returns wrongRole for admin role', async () => {
            actor.setPrincipal(USER1_PRINCIPAL);
            const result = await actor.registerWithJoinAccessCode(
                { admin: null },
                '12345678',
                'Test',
                'User',
                'test@example.com',
            );
            expect(result).toEqual({ wrongRole: null });
        });

        it('succeeds with a valid admin-created invite code', async () => {
            // Admin creates an invite code
            actor.setPrincipal(ADMIN_PRINCIPAL);
            const code = await actor.adminCreateJoinInviteCode({
                artist: null,
            });
            expect(code).toHaveLength(8);

            // User registers with the code
            actor.setPrincipal(USER1_PRINCIPAL);
            const result = await actor.registerWithJoinAccessCode(
                { artist: null },
                code,
                'Invited',
                'Artist',
                'invited@example.com',
            );
            expect(result).toEqual({ ok: null });

            // Verify account is active (not pending)
            const account = await actor.getAccountForCaller();
            expect(account[0].status).toEqual({ active: null });
            expect(account[0].membershipExemptManual).toBe(true);
        });

        it('returns inviteInactive for a redeemed code', async () => {
            // Admin creates code
            actor.setPrincipal(ADMIN_PRINCIPAL);
            const code = await actor.adminCreateJoinInviteCode({
                gallery: null,
            });

            // First user redeems
            actor.setPrincipal(USER1_PRINCIPAL);
            const first = await actor.registerWithJoinAccessCode(
                { gallery: null },
                code,
                'First',
                'User',
                'first@example.com',
            );
            expect(first).toEqual({ ok: null });

            // Second user tries same code
            actor.setPrincipal(USER2_PRINCIPAL);
            const second = await actor.registerWithJoinAccessCode(
                { gallery: null },
                code,
                'Second',
                'User',
                'second@example.com',
            );
            expect(second).toEqual({ inviteInactive: null });
        });
    });
});
