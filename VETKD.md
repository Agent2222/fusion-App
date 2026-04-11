# VetKD (VetKeys) for Fusion — phased rollout

Sensitive fields (email beyond waitlist, inbox bodies, encrypted notes, payment-related tokens) must **never** be stored in plaintext on the canister. This document tracks how Fusion aligns with [IC VetKeys / vetKD](https://internetcomputer.org/docs/building-apps/network-features/vetkeys/) and Motoko samples.

## Phase A (current)

- `Types.EncryptedBlob` in `src/fusion-app-backend/types.mo` holds `{ ciphertext, iv, alg }` as `Blob` + `Text`.
- Optional `notesEncrypted` on `ArtistRecord` and similar extension points; canister stores **ciphertext only**.
- `Types.ApplicantRecord` includes `payloadJson : Text` — treat as **VetKD-ready**: store ciphertext + metadata in JSON, or plaintext only during dev; production should encrypt PII (names, essays) client-side before `upsertApplicant`.
- `ContentPageRecord.localesJson` — legal/marketing copy is usually public; encrypt only if a page contains restricted data.
- No `vetkd_*` calls in Motoko yet; no client-side derivation yet.

## Phase B — subnet + Motoko

1. Enable vetKD on the deployment subnet per DFINITY docs for your `dfx` / `moc` version.
2. Add a small Motoko module (pattern similar to reference `VetKeys.mo` in SCOGE: `vetkd_public_key`, `vetkd_encrypted_key`, `VetKDPublicKeyRequest` / `VetKDEncryptedKeyRequest`, `key_id`, derivation `path` as `[Blob]`).
3. Expose only what Fusion needs: e.g. encrypt/decrypt helpers used when writing/reading `EncryptedBlob` fields; **never** log plaintext.
4. After changing the actor API, run **`dfx generate fusion-app-backend`** locally (do not hand-edit `src/declarations/**`).

## Phase C — client (`database.js` + callers)

1. Use `@dfinity/agent` with the same host / `fetchRootKey` rules as `src/fusion-app-frontend/src/config.js`.
2. Derive keys per user/document path; encrypt before `upsert`, decrypt after query.
3. Keep the **debug “Data: Test JSON / Live canister”** toggle in sync with local vs mainnet vetKD expectations (see `utils/database.js`).

## References

- [vetKD Motoko sample](https://internetcomputer.org/docs/references/samples/motoko/vetkd)
- Internal pattern reference (read-only): SCOGE `VetKeys.mo` / `ic-config.js` for II URLs and canister ID tables
