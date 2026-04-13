# Backend storage (`main.mo`) — stable variables and upgrades

## Stable snapshots

The actor persists these **`stable var`** arrays (upgrade checkpoints), with transient `HashMap`s at runtime:

- `adminPrincipals`
- `subscribersStable`, `accountsStable`, `artistsStable`, `programsStable`, `journalsStable`, `editionsStable`, `contentPagesStable`, `applicantsStable`, `siteSettingsStable`

## Upgrade cycle

- **`preupgrade`**: each map is serialized to its `*Stable` array.
- **`postupgrade`**: maps are rebuilt from stable arrays; derived indexes (e.g. `artistSlugToId`) are recreated; `adminPrincipals` merges defaults.

New Studio domains must add a matching **stable** array + **flush** in `preupgrade` + **rebuild** in `postupgrade`, or store JSON in an existing `ContentPageRecord.localesJson`.

## Operational backup

No bulk export API is required for correctness; use **controller snapshots** or add **admin-only** `list*` dumps later. Deploy/build are manual/CI — see Studio plan agent constraints.
