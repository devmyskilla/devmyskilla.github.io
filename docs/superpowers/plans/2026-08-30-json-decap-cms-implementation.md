# JSON Data + Decap CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `data.json` the only runtime content source for Dunya Al-Dawrat, clean unknown-status output, standardize free pricing/free-certificate wording, and add a Git-backed Decap CMS admin surface compatible with GitHub Pages.

**Architecture:** Preserve the existing rendering/search/filter modules, but replace the Supabase + `js/data.js` source layer with `js/data-loader.js` fetching a root-level `data.json`. Load editable translations from the same JSON before rendering. Keep platform normalization in `platform-core.js`, add display-model helpers there, and configure Decap CMS to edit the single JSON document while leaving OAuth secrets outside the repository.

**Tech Stack:** Static HTML/CSS/JavaScript, Fetch API, Node built-in test runner, GitHub Pages, Decap CMS, GitHub backend.

**Spec:** `docs/superpowers/specs/2026-08-30-json-decap-cms-design.md`

## Global Constraints

- `data.json` is the only runtime source for platform data and editable UI copy.
- No Supabase REST request, Supabase browser configuration, PHP, Node server, or custom runtime backend.
- Do not render the Arabic phrases `المحتوى الرسمي غير مؤكد رسميًا`, `التحقق لم يتم التحقق بعد`, or `آخر تحقق غير معروف` in directory/profile/comparison output.
- Free pricing renders as `مجاناً` in Arabic; a numeric zero must normalize to the free pricing model.
- `freeCertificate === true` renders `الشهادات المجانية` in Arabic; `certificateAvailable` remains usable for filters.
- Missing official count or verification fields are omitted from visible UI rather than replaced by unknown placeholders.
- Preserve existing search, filters, favorites, comparison, recent views, language switching, and overall visual design.
- Decap CMS must target `devmyskilla/devmyskilla.github.io`, branch `main`, and edit `data.json`; no OAuth secret may be committed.

---

### Task 1: Lock the JSON-only architecture and display requirements with failing tests

**Files:**
- Create: `tests/json-content-architecture.test.cjs`
- Modify: `tests/platform-core.test.cjs`
- Modify: `tests/platform-directory.test.cjs`
- Modify: `tests/platform-detail.test.cjs`
- Modify: `tests/release-smoke.test.cjs`

**Interfaces:**
- Consumes: existing Node test runner and modules in `js/`.
- Produces: regression expectations for `DataLoader.loadSiteData`, `PlatformCore.pricingDisplayKey`, `PlatformCore.certificateDisplayKey`, omission helpers, and HTML script wiring.

- [ ] **Step 1: Add architecture tests that initially fail**

Create assertions equivalent to:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const pages = ['index.html', 'explore.html', 'platform.html'].map(p => fs.readFileSync(p, 'utf8'));

test('data.json is the single runtime content source', () => {
  const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
  assert.equal(typeof data.siteText, 'object');
  assert.ok(Array.isArray(data.platforms));
  for (const html of pages) {
    assert.match(html, /js\/data-loader\.js/);
    assert.doesNotMatch(html, /supabase-config|platform-data\.js|js\/data\.js/);
  }
});

test('runtime source does not contain banned Arabic placeholder copy', () => {
  const files = ['js/app.js', 'js/platform-detail.js', 'js/platform-core.js', 'js/i18n.js'];
  const source = files.filter(fs.existsSync).map(f => fs.readFileSync(f, 'utf8')).join('\n');
  for (const phrase of [
    'المحتوى الرسمي غير مؤكد رسميًا',
    'التحقق لم يتم التحقق بعد',
    'آخر تحقق غير معروف'
  ]) assert.ok(!source.includes(phrase), phrase);
});
```

- [ ] **Step 2: Add core behavior tests**

Add exact behavior tests:

```js
assert.equal(core.pricingDisplayKey({ pricingModel: 'free' }), 'pricing_free_display');
assert.equal(core.certificateDisplayKey({ freeCertificate: true }), 'certificate_free');
assert.equal(core.certificateDisplayKey({ certificateAvailable: true, freeCertificate: false }), 'certificate_available');
assert.equal(core.certificateDisplayKey({ certificateAvailable: false }), '');
assert.equal(core.shouldShowOfficialCount({ officialCount: null }), false);
assert.equal(core.shouldShowVerification({ lastVerified: null }), false);
```

Also add a normalization test proving `pricingModel: 0` becomes `free` and `freeCertificate` survives normalization.

- [ ] **Step 3: Run tests and confirm RED**

Run:

```bash
node --test tests/json-content-architecture.test.cjs tests/platform-core.test.cjs tests/platform-directory.test.cjs tests/platform-detail.test.cjs tests/release-smoke.test.cjs
```

Expected: FAIL because `data.json`, `js/data-loader.js`, and the new helpers do not yet exist and pages still reference Supabase/static scripts.

- [ ] **Step 4: Commit the failing tests**

```bash
git add tests/
git commit -m "test: define JSON content architecture"
```

---

### Task 2: Create `data.json` and the Fetch API loader

**Files:**
- Create: `data.json`
- Create: `js/data-loader.js`
- Replace tests: retire Supabase-specific expectations in `tests/platform-data.test.cjs` or rename its coverage to loader behavior.

**Interfaces:**
- Produces: `DataLoader.loadSiteData(options?) -> Promise<{ siteText, platforms }>`.
- `options.fetchFn` is injectable for Node tests; default is browser `fetch`.
- Consumed later by `js/app.js`, `js/platform-detail.js`, and landing initialization.

- [ ] **Step 1: Migrate existing content into valid JSON**

Build a root document with this exact shape:

```json
{
  "siteText": {
    "ar": {
      "pricing_free_display": "مجاناً",
      "certificate_free": "الشهادات المجانية",
      "certificate_available": "الشهادات متاحة"
    },
    "en": {
      "pricing_free_display": "Free",
      "certificate_free": "Free certificates",
      "certificate_available": "Certificates available"
    },
    "tr": {
      "pricing_free_display": "Ücretsiz",
      "certificate_free": "Ücretsiz sertifikalar",
      "certificate_available": "Sertifika mevcut"
    }
  },
  "platforms": []
}
```

Copy all current editable `i18n` keys into each language object and migrate every current `PLATFORMS_DATA` row into the normalized schema. Preserve IDs, descriptions, category, URLs, logo, and feature/order metadata. Use `freeCertificate: false` unless the existing source explicitly proves free certificates.

- [ ] **Step 2: Implement the loader**

`js/data-loader.js` should expose both CommonJS and browser API, following current module style:

```js
(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DataLoader = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  function validate(data){
    if (!data || typeof data !== 'object') throw new Error('data.json must contain an object');
    if (!data.siteText || typeof data.siteText !== 'object') throw new Error('data.json siteText is required');
    if (!Array.isArray(data.platforms)) throw new Error('data.json platforms must be an array');
    return data;
  }
  async function loadSiteData(options = {}){
    const fetchFn = options.fetchFn || ((...args) => fetch(...args));
    const url = options.url || './data.json';
    const response = await fetchFn(url, { cache: 'no-store' });
    if (!response || !response.ok) throw new Error(`data.json load failed: ${response?.status || 'unknown'}`);
    return validate(await response.json());
  }
  return { validate, loadSiteData };
});
```

- [ ] **Step 3: Test valid/invalid/error loader cases**

Test success, missing `siteText`, non-array `platforms`, and non-OK HTTP responses using injected `fetchFn`.

- [ ] **Step 4: Run loader/data tests**

```bash
node --test tests/json-content-architecture.test.cjs tests/platform-data.test.cjs
```

Expected: loader/data-level assertions PASS; page script-wiring assertions may still fail until Task 4.

- [ ] **Step 5: Commit**

```bash
git add data.json js/data-loader.js tests/platform-data.test.cjs
git commit -m "feat: load site content from data.json"
```

---

### Task 3: Add normalized pricing/certificate/optional-status display helpers

**Files:**
- Modify: `js/platform-core.js`
- Modify: `js/platform-directory.js`
- Modify: `js/platform-detail.js`
- Test: `tests/platform-core.test.cjs`
- Test: `tests/platform-directory.test.cjs`
- Test: `tests/platform-detail.test.cjs`

**Interfaces:**
- Produces:
  - `PlatformCore.pricingDisplayKey(platform) -> string`
  - `PlatformCore.certificateDisplayKey(platform) -> string`
  - `PlatformCore.shouldShowOfficialCount(platform) -> boolean`
  - `PlatformCore.shouldShowVerification(platform) -> boolean`
- Normalized platform shape adds `freeCertificate:boolean`.

- [ ] **Step 1: Extend the normalized platform shape**

Add `freeCertificate:false` to `baseShape()`. In `normalizeStaticPlatform`, map `freeCertificate` and `free_certificate`; normalize a numeric/string zero pricing value to `pricingModel:'free'`.

- [ ] **Step 2: Implement the display helpers minimally**

```js
function pricingDisplayKey(platform={}){
  return platform.pricingModel === 'free' ? 'pricing_free_display' : `pricing_${platform.pricingModel || 'unknown'}`;
}
function certificateDisplayKey(platform={}){
  if (platform.freeCertificate === true) return 'certificate_free';
  if (platform.certificateAvailable === true) return 'certificate_available';
  return '';
}
function shouldShowOfficialCount(platform={}){
  return numberOrNull(platform.officialCount) !== null;
}
function shouldShowVerification(platform={}){
  return Boolean(platform.lastVerified) && verificationState(platform.lastVerified) !== 'unverified';
}
```

Change `contentCountLabel()` so a missing count returns an empty string instead of an unknown placeholder.

- [ ] **Step 3: Propagate `freeCertificate` and optional flags into directory/detail models**

`cardFacts()` and `buildDetailModel()` must include `freeCertificate`, `showOfficialCount`, and `showVerification` so rendering code does not have to rediscover the rules.

- [ ] **Step 4: Run focused tests**

```bash
node --test tests/platform-core.test.cjs tests/platform-directory.test.cjs tests/platform-detail.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/platform-core.js js/platform-directory.js js/platform-detail.js tests/platform-core.test.cjs tests/platform-directory.test.cjs tests/platform-detail.test.cjs
git commit -m "feat: standardize platform display states"
```

---

### Task 4: Rewire the browser boot flow to JSON and clean the visible directory/profile/comparison UI

**Files:**
- Modify: `js/i18n.js`
- Modify: `js/app.js`
- Modify: `js/platform-detail.js`
- Modify: `js/landing.js`
- Modify: `index.html`
- Modify: `explore.html`
- Modify: `platform.html`
- Delete after all references are gone: `js/supabase-config.js`, `js/platform-data.js`, `js/data.js`
- Test: `tests/json-content-architecture.test.cjs`
- Test: `tests/release-smoke.test.cjs`

**Interfaces:**
- `mergeSiteText(siteText)` merges JSON translations into the runtime translation object before `applyTranslations()`.
- Browser boot obtains platforms only through `DataLoader.loadSiteData()` and normalizes with `PlatformCore.normalizeStaticPlatform`.

- [ ] **Step 1: Make translations accept JSON overrides**

Add an exported/browser function:

```js
function mergeSiteText(siteText={}){
  for (const lang of ['ar','en','tr']) {
    if (!siteText[lang] || typeof siteText[lang] !== 'object') continue;
    i18n[lang] = { ...i18n[lang], ...siteText[lang] };
  }
}
```

Keep only stable fallback/error strings in `js/i18n.js`; editable user-facing copy lives in `data.json`.

- [ ] **Step 2: Replace `PlatformData.loadPlatforms(...)` in directory boot**

Use:

```js
const data = await DataLoader.loadSiteData();
mergeSiteText(data.siteText);
allPlatforms = data.platforms.map(PlatformCore.normalizeStaticPlatform);
platformDataSource = 'json';
```

Remove the Supabase/fallback status banner behavior entirely.

- [ ] **Step 3: Clean `platformCard()` output**

Required rendering rules:

```js
const priceText = getText(PlatformCore.pricingDisplayKey(p));
const certificateKey = PlatformCore.certificateDisplayKey(p);
```

Render the price value from `priceText`. Render a certificate fact only when `certificateKey` is non-empty. Render `official-count` only when `facts.showOfficialCount`. Render verification badge only when `facts.showVerification`.

- [ ] **Step 4: Clean comparison table output**

Build optional rows conditionally:

- Price always uses the pricing display helper.
- Certificate row uses `certificateDisplayKey`; platforms without certificate text render `—` rather than old yes/no wording.
- Official-content row is included only if at least one compared platform has a real official count.
- Verification row/date row are included only if at least one platform has valid verification data; missing individual values render `—`, never unknown copy.

- [ ] **Step 5: Rewire profile boot and profile facts**

Replace the Supabase call with JSON loading, remove `.profile-source`, and conditionally include official-count/verification/date facts using `showOfficialCount` and `showVerification`. Price/certificate use the same helpers as cards.

- [ ] **Step 6: Rewire landing stats**

Landing initialization loads `data.json`, merges `siteText`, normalizes platform rows, then uses the existing stats helper. Do not load `js/data.js`, Supabase config, or Supabase data modules.

- [ ] **Step 7: Update HTML script order**

The relevant pages must load in dependency order:

```html
<script src="js/i18n.js"></script>
<script src="js/platform-core.js"></script>
<script src="js/data-loader.js"></script>
```

Then page-specific directory/detail/landing scripts. Remove all runtime references to `js/data.js`, `js/supabase-config.js`, and `js/platform-data.js`.

- [ ] **Step 8: Delete obsolete runtime files**

Only after grep/tests prove no remaining references, delete:

```text
js/data.js
js/supabase-config.js
js/platform-data.js
```

- [ ] **Step 9: Run browser-architecture and regression tests**

```bash
node --test tests/*.test.cjs
```

Expected: all Node tests PASS, including search/filter/compare regressions.

- [ ] **Step 10: Commit**

```bash
git add index.html explore.html platform.html js/ tests/
git commit -m "refactor: make JSON the only runtime data source"
```

---

### Task 5: Add Decap CMS editing for `data.json`

**Files:**
- Create: `admin/index.html`
- Create: `admin/config.yml`
- Create: `docs/decap-cms-setup.md`
- Test: `tests/decap-cms.test.cjs`

**Interfaces:**
- Decap file collection edits root `data.json`.
- Backend repository is `devmyskilla/devmyskilla.github.io`; branch is `main`.
- `base_url`/OAuth endpoint is intentionally documented as an external deployment value, not a committed secret.

- [ ] **Step 1: Write failing Decap configuration tests**

Assert the admin files exist, `config.yml` contains:

```yaml
backend:
  name: github
  repo: devmyskilla/devmyskilla.github.io
  branch: main
```

and the collection contains `file: data.json`.

- [ ] **Step 2: Add `admin/index.html`**

Use a minimal static shell:

```html
<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dunya Al-Dawrat Admin</title></head>
<body><script src="https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js"></script></body></html>
```

- [ ] **Step 3: Add `admin/config.yml` file collection**

Configure one collection, `site_data`, with a file entry pointing at `data.json`. Model `siteText.ar/en/tr` as nested objects and `platforms` as a `list` with fields matching the normalized schema. `pricingModel` is a select with `free`, `freemium`, `paid`, `mixed`; booleans expose `hasFreeContent`, `certificateAvailable`, `freeCertificate`, `featured`; optional count/date fields use `required: false`.

- [ ] **Step 4: Document OAuth setup without secrets**

`docs/decap-cms-setup.md` must explain:

1. Create a GitHub OAuth App.
2. Deploy an OAuth proxy (recommended Cloudflare Worker or another Decap-compatible provider).
3. Point the CMS `base_url`/`auth_endpoint` at that proxy.
4. Store client secret only in the proxy's secret store.
5. Give publishing users write access to the repository.
6. Open `https://devmyskilla.github.io/admin/` after deployment.

- [ ] **Step 5: Run Decap tests**

```bash
node --test tests/decap-cms.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add admin/ docs/decap-cms-setup.md tests/decap-cms.test.cjs
git commit -m "feat: add Decap CMS admin"
```

---

### Task 6: Update offline caching and release checks, then verify deployment readiness

**Files:**
- Modify: `sw.js`
- Modify: `tests/release-smoke.test.cjs`
- Modify: `.github/workflows/test.yml` if it still performs live Supabase checks.

**Interfaces:**
- Service worker caches `data.json` and `js/data-loader.js` as core assets.
- No CI step depends on Supabase availability.

- [ ] **Step 1: Bump the service-worker cache version**

Change the cache key from v9 to v10 and replace obsolete cached assets with:

```js
'./data.json', './js/data-loader.js'
```

Do not cache deleted Supabase/static-data scripts.

- [ ] **Step 2: Make dynamic JSON requests freshness-safe**

Treat `data.json` as network-first (or explicitly bypass cache first) so newly published CMS edits appear without waiting for stale cache eviction, with cache fallback only for offline use.

- [ ] **Step 3: Remove live Supabase CI checks**

If `.github/workflows/test.yml` still requests the Supabase REST endpoint or expects exactly 40 database rows, replace that with local validation such as:

```bash
node -e "const d=require('./data.json'); if(!Array.isArray(d.platforms)||!d.platforms.length) process.exit(1)"
```

- [ ] **Step 4: Run the complete verification suite**

```bash
node --test tests/*.test.cjs
node --check js/*.js
git diff --check
```

Expected: zero test failures, zero syntax failures, zero whitespace errors.

- [ ] **Step 5: Search for forbidden/obsolete runtime references**

```bash
grep -R "supabase-config\|PlatformData\|SUPABASE_CONFIG\|PLATFORMS_DATA" -n --exclude-dir=.git .
grep -R "المحتوى الرسمي غير مؤكد رسميًا\|التحقق لم يتم التحقق بعد\|آخر تحقق غير معروف" -n --exclude-dir=.git .
```

Expected: no runtime matches; documentation/spec history may be excluded from the check.

- [ ] **Step 6: Commit release wiring**

```bash
git add sw.js .github/workflows/test.yml tests/release-smoke.test.cjs
git commit -m "chore: finalize JSON-only release checks"
```

- [ ] **Step 7: Push branch, verify GitHub Actions, then fast-forward `main` only if green**

The implementation branch must have a successful `Test platform directory` workflow run. After merging/fast-forwarding, verify both the `main` test workflow and GitHub Pages deployment succeed on the same head SHA.

## Self-review

- Spec coverage: JSON-only runtime source, text cleanup, free pricing, free certificates, optional unknown data, Decap CMS, OAuth documentation, service worker, CI cleanup, and preserved interaction regressions are all mapped to tasks.
- Placeholder scan: no TBD/TODO/"implement later" steps remain.
- Interface consistency: the plan uses `DataLoader.loadSiteData`, `mergeSiteText`, `pricingDisplayKey`, `certificateDisplayKey`, `shouldShowOfficialCount`, and `shouldShowVerification` consistently across tasks.
