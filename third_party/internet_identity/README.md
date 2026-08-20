# Vendored Internet Identity (local dfx)

Pinned release: **2026-04-03**. Used by `dfx.json` so local deploys do not depend on GitHub downloads mid-build (HTTP/2 failures are common).

To refresh:

```bash
curl -L --http1.1 -o internet_identity_dev.wasm.gz \
  "https://github.com/dfinity/internet-identity/releases/download/release-2026-04-03/internet_identity_dev.wasm.gz"
curl -L --http1.1 -o internet_identity.did \
  "https://github.com/dfinity/internet-identity/releases/download/release-2026-04-03/internet_identity.did"
curl -L --http1.1 -o internet_identity_frontend.wasm.gz \
  "https://github.com/dfinity/internet-identity/releases/download/release-2026-04-03/internet_identity_frontend.wasm.gz"
curl -L --http1.1 -o internet_identity_frontend.did \
  "https://raw.githubusercontent.com/dfinity/internet-identity/release-2026-04-03/src/internet_identity_frontend/internet_identity_frontend.did"
```

On IC mainnet, `remote.id.ic` still points at the canonical II canisters — these files are for **local** replica only.
