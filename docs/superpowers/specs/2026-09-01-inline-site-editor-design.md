# Inline Site Editor Design

**Date:** 2026-09-01

## Goal

Add a secure inline editing mode to the public Dunya Al-Dawrat site. An authenticated administrator can enter edit mode, see pencil controls next to editable content, open a focused modal for that item, edit its values, and publish directly to `main`. Normal visitors must not see editing controls or gain write capability.

The feature builds on the existing `data.json` content architecture, `js/content-api.js`, `js/site-runtime.js`, Decap CMS, GitHub, and GitHub Pages deployment.

## User experience

### Entering edit mode

The public site remains unchanged for normal visitors. Edit mode can be entered through either:

- a `?edit=1` URL flag, or
- a **Direct site editing** link exposed from the existing `/admin/` area.

If the browser does not have a valid inline-editor session, edit mode shows only a GitHub sign-in action. After successful authentication, the editor toolbar appears and editable items gain pencil controls.

The public navigation does not need to advertise administration to ordinary visitors.

### Editor toolbar

The authenticated editor sees a compact fixed toolbar containing:

- edit-mode status,
- authenticated GitHub identity where available,
- save/publish status,
- a link back to the full Decap CMS,
- sign out / leave edit mode.

The toolbar must not affect public layout when edit mode is inactive.

### Pencil controls

Pencil controls appear only for an authenticated editor. They should normally appear on hover/focus to avoid cluttering the page.

A pencil opens a modal tailored to the underlying field type. The modal does not make the DOM itself contenteditable.

For localized text, the modal displays Arabic, English, and Turkish together. This avoids accidentally updating one language while forgetting the others.

If one content key is rendered in multiple places, the modal warns that saving updates every occurrence using that key.

## Editing model

### Static content bindings

The site already exposes content bindings such as:

- `data-i18n="landingHeroTitle"`
- `data-setting="siteName"`
- `data-link="explore"`
- `data-asset="brandLogo"`

The inline editor builds on these bindings instead of creating a second source of truth.

Each editable node is resolved to an **Edit Descriptor** with at least:

- kind,
- stable logical key,
- canonical data path or stable entity identifier,
- editor widget type,
- localized/scalar metadata,
- current values,
- whether the field is writable.

For `data-i18n`, the runtime resolves the short key to its unique canonical path under `siteText`. Ambiguous or unresolved keys do not receive a pencil and produce a diagnostic in development/tests.

### Dynamic content

Dynamic content must use stable entity identifiers, never array positions.

Examples:

- `platform:coursera:name`
- `platform:coursera:description`
- `platform:coursera:editorial.strengths`
- `category:technology:label`
- `language:English:label`

Runtime renderers add edit metadata to generated DOM nodes. Reordering arrays therefore does not change what a pencil edits.

### Supported editor types

The architecture supports the current editorial surface without allowing arbitrary code injection:

1. **Localized text** — Arabic / English / Turkish fields.
2. **Localized string list** — list editor per language for strengths, weaknesses, paths, and similar editorial arrays.
3. **Scalar text/number/boolean** — only for explicitly allowlisted editorial settings.
4. **Link** — URL field with safe URL validation.
5. **Asset** — source path/URL plus localized alt text. Existing Decap remains the preferred media-upload interface.
6. **Enum/reference** — controlled select for category/language/pricing values where inline editing is intentionally enabled.

Raw HTML, CSS, or JavaScript is not supported.

### Protected technical fields

Stable technical identity must not be editable inline. At minimum, the following are protected:

- `platform.id`
- `category.id`
- `language.id`
- arbitrary object paths
- JavaScript/CSS/HTML source
- OAuth settings, secrets, tokens, repository credentials

Reference values such as a platform `categoryId` or `languageIds` may be editable only through controlled selections backed by the existing stable IDs.

## Authentication architecture

### Preserve the existing Decap proxy

The existing Decap CMS authentication flow and its Cloudflare OAuth proxy remain unchanged.

To avoid destabilizing working CMS authentication, inline editing uses a **sibling Cloudflare Worker** dedicated to inline administration. It uses GitHub OAuth and the same administrator GitHub identity, so the administrator does not need a separate username or password.

A separate OAuth application/client for inline editing is preferred because it isolates callback/session behavior from Decap's OAuth proxy.

### OAuth flow

1. The public site opens the inline-editor Worker authentication endpoint in a popup.
2. The Worker generates and stores a short-lived OAuth state value and redirects to GitHub.
3. GitHub redirects to the inline-editor Worker callback.
4. The Worker exchanges the code for a GitHub access token.
5. The Worker verifies the GitHub user has write access to `devmyskilla/devmyskilla.github.io`.
6. The GitHub token is stored server-side with an expiry in Worker storage (for example KV/Durable Object or an equivalent server-side store).
7. The Worker creates a random opaque inline-editor session ID.
8. The popup sends only that opaque session ID and non-sensitive identity metadata to the opener using `postMessage` restricted to `https://devmyskilla.github.io`.
9. The site keeps the opaque session in `sessionStorage` or memory. It never stores the GitHub access token.

The GitHub client secret remains only in Cloudflare secret storage.

### Cross-origin security

The Worker API accepts browser requests only from the configured production site origin. It must implement strict CORS and validate origins on every editor API route.

Write endpoints require an opaque Bearer session token. OAuth `state` protects the login flow. Sessions have a short TTL and explicit revoke/logout support.

No OAuth token, GitHub token, client secret, or permanent credential is committed to the public repository or placed in `data.json`.

## Worker API

The browser never uploads a replacement `data.json`.

### Session endpoints

Conceptual endpoints:

- `GET /inline/auth`
- `GET /inline/callback`
- `GET /inline/session`
- `POST /inline/logout`

### Content endpoint

An authenticated content read endpoint returns the canonical GitHub `data.json` plus its current blob SHA when edit mode initializes. This ensures the editor starts from repository state rather than a potentially delayed GitHub Pages deployment.

Conceptual endpoint:

- `GET /inline/content`

### Patch endpoint

Conceptual request:

```json
{
  "target": {
    "kind": "siteText",
    "key": "landingHeroTitle"
  },
  "baseSha": "<blob-sha>",
  "value": {
    "ar": "...",
    "en": "...",
    "tr": "..."
  }
}
```

Dynamic entities use stable IDs rather than array indices.

The Worker:

1. authenticates the session,
2. checks repository write permission/session validity,
3. fetches current `data.json` and SHA from GitHub,
4. rejects stale `baseSha` with HTTP 409,
5. resolves the target through a server-side allowlist/schema,
6. validates the submitted value type and URLs/references,
7. applies exactly that change,
8. validates the resulting complete content document,
9. commits the updated `data.json` to `main` through GitHub's API,
10. returns the new SHA/commit information and canonical saved value.

The server must not accept a client-supplied arbitrary JSON pointer/path.

## Concurrency and conflict handling

Inline editing uses optimistic concurrency based on the GitHub blob SHA.

If another edit lands after the administrator opened the modal, the Worker returns HTTP 409 rather than overwriting newer work. The UI shows that content changed and offers to reload the current values before retrying.

This protects edits made through Decap, GitHub, or a second inline-editor session.

## Runtime integration

### New client modules

The implementation is expected to add focused modules such as:

- `js/edit-descriptors.js` — converts runtime bindings/entities into safe editor descriptors.
- `js/inline-editor-api.js` — authentication/session/content/patch communication with the Worker.
- `js/inline-editor.js` — toolbar, pencils, modal, local state, conflict UI, and save lifecycle.
- `css/inline-editor.css` — editor-only presentation.

Existing `ContentAPI` remains the read abstraction for public content. `SiteRuntime` remains responsible for applying content to the DOM.

### Static nodes

`SiteRuntime` can expose or cooperate with descriptor resolution for `data-i18n`, `data-setting`, `data-link`, and `data-asset` bindings.

### Dynamic nodes

Platform/directory/detail renderers attach stable edit metadata to editable output. The metadata identifies an entity and field, not its visual index.

## Modal behavior

### Localized text modal

Shows three fields together:

- العربية
- English
- Türkçe

Titles, paragraphs, button labels, labels, descriptions, and similar localized strings use this modal.

### List modal

Lists are edited as ordered items per language. The user can add, remove, and reorder editorial list entries when that field is allowlisted.

### Link modal

Shows the URL and validates it using the same safe URL policy as the public content runtime.

### Asset modal

Shows the asset source and Arabic/English/Turkish alt text. Direct media upload may continue to route users to Decap's Media Library in the first implementation; the inline architecture must not expose filesystem or arbitrary upload credentials.

## Save and publish feedback

Saving has explicit states:

- Ready
- Saving
- Saved to GitHub / publishing
- Published
- Conflict
- Error

After a successful GitHub commit, the page updates the edited value immediately in the current in-memory content and reapplies/re-renders affected UI where practical.

GitHub Pages may take additional time to deploy. The client polls the public `data.json` using a cache-bypassing request and compares the edited value. Once the public value matches the saved canonical value, the toolbar reports **Published**.

Polling is bounded (for example two minutes) and timing out does not mark the GitHub save as failed; it reports that the commit succeeded but deployment confirmation is still pending.

## Edit-mode lifecycle

When the session expires, is revoked, or the user signs out:

- pencil controls are removed,
- write controls close/disable,
- the opaque browser session is cleared,
- the public site remains usable normally.

Leaving `?edit=1` mode does not alter public content.

## Decap interoperability

Decap CMS remains the full-form content editor and media manager. Inline editing is an additional fast editorial surface over the same `data.json`.

Both tools write to the same `main` branch and use SHA conflict protection. A change made in either tool is therefore visible to the other after refresh.

The existing `/admin/` page should expose a clear **Edit directly on site** link. The inline toolbar should expose a **Open full CMS** link.

## Error handling

- Authentication failure: no pencils; editor offers sign-in again.
- Unauthorized GitHub user: Worker refuses to create a writable session.
- Invalid/unsupported target: 400/403 and no repository write.
- Invalid value/reference/URL: validation message in modal.
- Stale SHA: 409 conflict with reload-current-content action.
- GitHub API failure: preserve local modal values and allow retry.
- Deployment confirmation timeout: show saved-but-not-yet-confirmed state.
- `data.json` validation failure: Worker refuses the commit.

## Accessibility

Editor controls are keyboard reachable and have localized accessible labels. The modal uses proper dialog semantics, focus trapping/restoration, Escape to cancel, and explicit save/cancel buttons. Pencil controls must not be the sole indicator of editable state for keyboard users.

## Testing strategy

### Client tests

Cover:

- no pencils for ordinary visitors,
- pencils only after a verified editor session,
- unique resolution of every editable static content key,
- descriptor resolution for settings, links, assets, categories, languages, and platforms,
- stable-ID dynamic targets,
- localized modal values,
- shared-key/multiple-occurrence behavior,
- save lifecycle and immediate local refresh,
- conflict/error UI,
- logout/session expiry cleanup,
- accessibility semantics.

### Worker tests

Cover:

- OAuth state validation,
- allowed production origin/CORS behavior,
- session TTL/revocation,
- GitHub permission verification,
- no GitHub token exposure to browser responses,
- protected-field rejection,
- arbitrary-path rejection,
- value/reference/URL validation,
- SHA conflict handling,
- complete `data.json` validation before commit,
- successful narrow patch generation.

### Regression checks

The existing project suite must remain green, including:

- exactly 110 platforms,
- full CMS schema validation,
- Decap generator/config exact match,
- JavaScript syntax checks,
- no legacy Supabase runtime dependency,
- `git diff --check`,
- GitHub Pages deployment.

## Deployment and operational requirements

The inline Worker is a separate deployable component. Repository source/config templates may be stored in this repository, but secrets must not be committed.

One-time Cloudflare/GitHub setup will be required for the inline editor Worker, including:

- Cloudflare Worker deployment,
- server-side session storage binding,
- GitHub OAuth client ID/secret in Worker secrets,
- exact OAuth callback URL,
- allowed site origin,
- repository name/branch configuration.

This environment does not assume access to the user's Cloudflare account. Implementation can prepare and test the Worker code and deployment configuration, but an authenticated Cloudflare deployment must be performed with the user's Cloudflare credentials or by the user.

## Non-goals

- No WYSIWYG page-layout builder.
- No arbitrary HTML/CSS/JavaScript editing from the public page.
- No public editing controls.
- No replacement of Decap CMS.
- No permanent GitHub token stored in the browser.
- No direct editing by array index.

## Success criteria

The feature is complete when an authorized administrator can enter inline edit mode, authenticate with GitHub, see pencils only in that authenticated mode, edit every intentionally editorial text/paragraph and supported content field from its visible location, safely publish a narrow validated change to `data.json` on `main`, see immediate local feedback and eventual deployment confirmation, while unauthenticated visitors and unsupported fields remain non-editable.