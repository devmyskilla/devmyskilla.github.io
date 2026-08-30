# Dunya Al-Dawrat: JSON Data + Decap CMS Migration Design

Date: 2026-08-30

## Goal

Convert the GitHub Pages site from a mixed Supabase/static-data architecture into a fully static, Git-backed content system where `data.json` is the single runtime source of platform data and editable site text. Add a Decap CMS admin surface so future edits can be made through a browser UI and committed back to GitHub.

## Current State

- The platform directory currently attempts to load active platform rows from Supabase and falls back to `js/data.js` when the database request fails.
- `js/i18n.js` contains visible translatable UI copy.
- `js/platform-core.js` generates fallback strings for unknown official counts and verification state.
- `js/app.js` renders cards and comparison rows from normalized platform objects.

## Target Architecture

### 1. Single content source: `data.json`

Create a root-level `data.json` with two top-level sections:

```json
{
  "siteText": {
    "ar": {},
    "en": {},
    "tr": {}
  },
  "platforms": []
}
```

`siteText` will hold all visible copy that a content editor may reasonably want to change, including navigation labels, card labels, status labels, section titles, button text, and the requested Arabic wording.

Each platform object will use one explicit schema instead of mixing legacy and Supabase naming:

```json
{
  "id": "plat-1",
  "name": "FutureLearn",
  "description_ar": "...",
  "description_en": "...",
  "description_tr": "...",
  "category": "تعليم",
  "pricingModel": "free",
  "hasFreeContent": true,
  "certificateAvailable": true,
  "freeCertificate": false,
  "languages": ["إنجليزي"],
  "officialUrl": "https://...",
  "catalogUrl": "https://...",
  "logoUrl": "https://...",
  "officialCount": null,
  "officialCountType": "courses",
  "lastVerified": null,
  "featured": false,
  "displayOrder": 1
}
```

The migration will preserve current platform content and normalize old field names. No platform will be marked as offering a free certificate unless the source data explicitly says so; `freeCertificate` will be a separate editable field.

### 2. Runtime loading with Fetch API

Add a small loader module, `js/data-loader.js`, which performs:

```js
fetch('./data.json', { cache: 'no-store' })
```

It will validate that `siteText` is an object and `platforms` is an array, then expose the loaded data to the existing rendering layer.

The application boot sequence will become asynchronous:

1. Load `data.json`.
2. Initialize localized text from `siteText`.
3. Normalize platform rows.
4. Populate filters, stats, featured cards, and directory cards.
5. Show a clear load-error message if `data.json` cannot be read.

No Supabase call will remain in the runtime path.

### 3. Remove Supabase from the frontend

The following behavior will be removed:

- Supabase REST platform fetches.
- Supabase publishable configuration in the browser.
- Supabase/fallback source-status banner.
- CI assertions that require a live Supabase response.

Files that become obsolete will be removed or replaced, including the current Supabase-specific loader/config files. The site will remain deployable as plain GitHub Pages.

### 4. UI cleanup rules

The directory and comparison/profile views will stop rendering unknown-data placeholders.

Required behavior:

- If `officialCount` is `null`, do not render an “official content” value containing “غير مؤكد رسميًا”.
- If a platform has no valid `lastVerified`, do not render a verification badge containing “لم يتم التحقق بعد”.
- If `lastVerified` is missing, do not render a row/value such as “آخر تحقق غير معروف”.
- Verified data may still display a valid verification status/date.

This removes the specified unwanted phrases from visible output instead of replacing them with another unknown-state phrase.

### 5. Pricing display

Add a single display helper for pricing.

Rules:

- `pricingModel === "free"` -> Arabic display text: **`مجاناً`**.
- `freemium`, `paid`, and `mixed` retain their own localized labels.
- Numeric zero values, if encountered during migration, are normalized to `pricingModel: "free"` and never rendered as `0`.

The same helper will be used by cards, profile pages, and comparison tables so pricing stays consistent.

### 6. Certificate display

Add the explicit `freeCertificate` Boolean field.

Rules:

- `freeCertificate === true` -> display **`الشهادات المجانية`** in Arabic.
- Otherwise, do not reuse the old yes/no certificate wording in the main card certificate slot.
- `certificateAvailable` remains available for filtering and internal logic, but visible wording will be derived from certificate status rather than the old generic “نعم/لا” presentation.

English and Turkish equivalents will be included in `siteText`.

### 7. Decap CMS admin

Add:

- `admin/index.html`
- `admin/config.yml`

The admin route will load Decap CMS and edit the single `data.json` file using a file collection. The schema will expose:

- Site text by language.
- Platform list.
- Platform name/descriptions.
- Category.
- Pricing model.
- Free-content toggle.
- Certificate availability toggle.
- Free-certificate toggle.
- Languages.
- URLs/logo.
- Optional official count/type.
- Optional verification date.
- Featured/display order.

Backend configuration will use the GitHub backend for `devmyskilla/devmyskilla.github.io`, branch `main`.

### Authentication note

Decap’s GitHub backend requires GitHub authentication through an OAuth server. For GitHub Pages, the recommended production setup is:

- Keep the site hosted on GitHub Pages.
- Use Decap CMS at `/admin/`.
- Use the GitHub backend.
- Configure a lightweight external OAuth proxy (for example a Cloudflare Worker) or a supported hosted authentication provider.
- Only GitHub users with write access to the repository can publish directly.

The repository code can be prepared completely, but the OAuth application/client secret must be configured outside the public repository because secrets must never be committed to GitHub Pages.

## Error Handling

- If `data.json` fails to load, show the localized `errorLoading` message and keep the directory empty instead of silently using an old hidden source.
- Invalid individual platform fields should be normalized conservatively rather than crashing the directory.
- Invalid URLs remain hidden from action buttons.
- Missing optional verification/count data is omitted from the UI.

## Testing Strategy

Add/update tests to verify:

1. `data.json` is valid JSON and contains `siteText` + `platforms`.
2. The page loads the JSON loader and no longer includes Supabase runtime scripts.
3. No source code renders the three unwanted Arabic phrases in platform-directory output.
4. A free platform renders `مجاناً`.
5. A platform with `freeCertificate: true` renders `الشهادات المجانية`.
6. Unknown official count and verification fields are omitted rather than rendered as placeholder copy.
7. Decap files exist and point at `data.json` and the correct GitHub repository.
8. Existing search/filter/compare behavior still passes its regression tests.
9. GitHub Pages release smoke tests remain green.

## Migration Sequence

1. Write failing regression tests for the requested UI behavior and JSON-only architecture.
2. Generate `data.json` from the existing local platform dataset and current editable UI copy.
3. Add `data-loader.js` and convert application boot to async JSON loading.
4. Remove Supabase runtime wiring and obsolete source-status UI.
5. Implement pricing/certificate/unknown-data display helpers.
6. Add Decap CMS admin files.
7. Update service-worker cache entries for the new JSON/admin assets as appropriate.
8. Run the complete test suite and release checks.
9. Merge to `main` only after verification.

## Non-goals

- No PHP, Node server, or custom backend will be added to GitHub Pages.
- No secret OAuth credentials will be committed to the repository.
- Decap CMS will edit content; it will not become the runtime data API. The published `data.json` remains the runtime source.
- The current visual design will not be redesigned as part of this migration beyond the requested text/status cleanup.
