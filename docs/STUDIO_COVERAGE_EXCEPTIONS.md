# Studio coverage exceptions

Paths under **`allArtists.artists.*.locales.*`** (and similar deep profile fields) may be **`userProfileOnly`**: end users edit via the future profile dashboard; Studio shows **admin** roster (slug, visibility, featured, batch JSON) instead of full locale forms.

**`featuredArtist`** — derived slice (`testData.allArtists.artists.slice(0, 8)`); not separately edited in Studio; coverage is satisfied via `allArtists`.

Mark new exceptions here with **reason** and optional **read-only** Studio preview.
