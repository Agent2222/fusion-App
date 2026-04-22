/** Minimal Candid interface for fusion-app-backend (integration service only). */
export const idlFactory = ({ IDL }) => {
    return IDL.Service({
        integrationRecordStripeSubscription: IDL.Func(
            [IDL.Principal, IDL.Opt(IDL.Text), IDL.Opt(IDL.Text), IDL.Opt(IDL.Text), IDL.Opt(IDL.Text)],
            [],
            [],
        ),
    });
};
