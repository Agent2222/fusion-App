/** Minimal Candid interface for fusion-app-backend (integration service only). */
export const idlFactory = ({ IDL }) => {
    const MembershipAccessResult = IDL.Variant({
        noAccount: IDL.Null,
        exempt: IDL.Null,
        ok: IDL.Null,
        needsSubscription: IDL.Null,
    });
    return IDL.Service({
        integrationGetMembershipAccessForPrincipal: IDL.Func(
            [IDL.Principal],
            [MembershipAccessResult],
            ['query'],
        ),
        integrationRecordStripeSubscription: IDL.Func(
            [IDL.Principal, IDL.Opt(IDL.Text), IDL.Opt(IDL.Text), IDL.Opt(IDL.Text), IDL.Opt(IDL.Text)],
            [],
            [],
        ),
    });
};
