# Platform Directory Pro 2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `https://devmyskilla.github.io/` into a polished platform-first discovery directory with richer platform cards, category discovery, comparison, a dedicated platform profile page, and Supabase-backed platform metadata while preserving the existing static fallback, languages, dark mode, local personalization, quiz, learning paths, PWA, and GitHub Pages delivery.

**Architecture:** Introduce a pure, testable platform core and a normalized data adapter between the static `PLATFORMS_DATA` fallback and Supabase. Keep page wiring in `app.js`, move directory-specific filtering/rendering into `platform-directory.js`, and create a dedicated `platform.html` + `platform-detail.js` flow. The live site must remain usable between phases: static data works first, Supabase is layered on afterward, and unknown metadata is never fabricated.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js built-in `node:test` for tests, GitHub Pages, GitHub Actions, Supabase REST/Data API with browser publishable key and RLS.

**Spec:** `docs/superpowers/specs/2026-08-26-platform-directory-pro-redesign-design.md`

## Global Constraints

- Keep the product platform-first; do not turn the site into a course catalog.
- Preserve Arabic, English, Turkish, dark/light mode, favorites, recent views, comparison, quiz, learning-path builder, PWA, and offline fallback.
- Never expose a Supabase `service_role`/secret key; frontend may use only the existing browser-safe publishable key.
- Never show `0` for an unknown official content count.
- Never label modules, job simulations, paths, certifications, or other content types as courses.
- Supabase values win only when non-null and authoritative; static `js/data.js` fills missing presentation fields and remains the failure fallback.
- Keep platform IDs stable (`plat-N`) so favorites, recents, existing links, and stored state survive the redesign.
- Preserve existing `course.html?id=plat-N` links through a compatibility redirect to `platform.html?id=plat-N`.
- Every behavior change follows red → green TDD. Run the focused test after each change, then the full suite before each milestone commit.
- Do not modify official counts or verification dates from local catalog assumptions; those fields are populated only from source-backed verification work.

---

## Task 1: Add the test harness and pure platform core

**Files:**
- Create: `tests/platform-core.test.cjs`
- Create: `js/platform-core.js`
- Create: `.github/workflows/test.yml`

- [ ] **Step 1: Write failing tests for normalization, count units, verification, search, filtering, sorting, and compare limit**

Create `tests/platform-core.test.cjs` using Node's built-in test runner. Start with tests like:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const PlatformCore = require('../js/platform-core.js');

test('normalizes legacy static platform data without inventing an official count', () => {
  const p = PlatformCore.normalizeStaticPlatform({
    id: 'plat-1',
    name: 'FutureLearn',
    description: 'AR',
    description_en: 'EN',
    category: 'تعليم',
    language: 'إنجليزي',
    free: true,
    certificate: true,
    link: 'https://www.futurelearn.com/courses'
  });
  assert.equal(p.id, 'plat-1');
  assert.equal(p.hasFreeContent, true);
  assert.equal(p.certificateAvailable, true);
  assert.equal(p.officialCount, null);
});

test('preserves non-course content units', () => {
  const p = { officialCount: 286, officialCountType: 'job_simulations' };
  assert.equal(PlatformCore.contentCountLabel(p, 'en'), '286 job simulations');
});

test('unknown official count is never rendered as zero', () => {
  assert.equal(
    PlatformCore.contentCountLabel({ officialCount: null }, 'en'),
    'Not officially confirmed'
  );
});

test('classifies a verification date inside 30 days as recent', () => {
  assert.equal(
    PlatformCore.verificationState('2026-08-20', new Date('2026-08-26T12:00:00Z')),
    'recent'
  );
});

test('search matches multilingual text', () => {
  const p = PlatformCore.normalizeStaticPlatform({
    id: 'plat-3', name: 'IBM Skills Build', description: 'ذكاء اصطناعي',
    description_en: 'Artificial intelligence', description_tr: 'Yapay zeka',
    category: 'تكنولوجيا', language: 'متعدد اللغات'
  });
  assert.equal(PlatformCore.searchScore(p, 'artificial intelligence') >= 0, true);
  assert.equal(PlatformCore.searchScore(p, 'ذكاء اصطناعي') >= 0, true);
});

test('comparison selection never exceeds three platforms', () => {
  const result = PlatformCore.toggleComparison(['plat-1','plat-2','plat-3'], 'plat-4', 3);
  assert.deepEqual(result.ids, ['plat-1','plat-2','plat-3']);
  assert.equal(result.blocked, true);
});
```

- [ ] **Step 2: Run the tests and confirm RED**

Run:

```bash
node --test tests/platform-core.test.cjs
```

Expected: FAIL because `../js/platform-core.js` does not exist yet.

- [ ] **Step 3: Implement the minimum pure core**

Create `js/platform-core.js` as a UMD-style module so it works in the browser and Node:

```js
(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PlatformCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  // pure helpers only; no DOM and no localStorage
  return {
    normalizeText,
    normalizeStaticPlatform,
    normalizeSupabasePlatform,
    mergePlatform,
    verificationState,
    contentCountLabel,
    searchScore,
    filterPlatforms,
    sortPlatforms,
    toggleComparison
  };
});
```

Normalized platform shape must include at least:

```js
{
  id, databaseId, name,
  description, description_ar, description_en, description_tr,
  category, pricingModel, hasFreeContent, certificateAvailable,
  languages, platformType,
  officialUrl, catalogUrl, logoUrl,
  officialCount, officialCountType, lastVerified,
  best_for_ar, best_for_en, best_for_tr,
  strengths_ar, strengths_en, strengths_tr,
  limitations_ar, limitations_en, limitations_tr,
  featured, displayOrder, dataSource
}
```

Rules:
- static `free` maps to `hasFreeContent`, but pricing defaults to `unknown` unless explicit metadata exists;
- static `certificate` maps to `certificateAvailable`;
- static single language string becomes a one-item `languages` array;
- `expected_count = null` remains `officialCount = null`;
- `verificationState()` returns `recent`, `outdated`, or `unverified`;
- `contentCountLabel()` supports `courses`, `job_simulations`, `modules`, `learning_paths`, `certifications`, `materials`, and a safe generic fallback;
- compare helper returns `{ids, blocked}` and never mutates input.

- [ ] **Step 4: Run the core tests and syntax check**

```bash
node --test tests/platform-core.test.cjs
node --check js/platform-core.js
```

Expected: all tests PASS; syntax check exits 0.

- [ ] **Step 5: Add a CI workflow**

Create `.github/workflows/test.yml`:

```yaml
name: Test platform directory
on:
  push:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: node --test tests/*.test.cjs
      - run: |
          for f in js/*.js; do node --check "$f"; done
      - run: git diff --check
```

- [ ] **Step 6: Commit**

```bash
git add tests/platform-core.test.cjs js/platform-core.js .github/workflows/test.yml
git commit -m "test: add platform directory core harness"
```

---

## Task 2: Create the normalized platform data source with static fallback

**Files:**
- Create: `tests/platform-data.test.cjs`
- Create: `js/platform-data.js`
- Create: `js/supabase-config.js`
- Modify: `index.html`

- [ ] **Step 1: Write failing adapter tests**

Test three cases:
1. Supabase success maps active rows and merges static presentation fields by `external_id`.
2. Supabase non-null values override static values.
3. Network/API failure returns normalized static data and `source: 'fallback'`.

Example:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const PlatformData = require('../js/platform-data.js');

test('merges Supabase identity/count data with static descriptions', async () => {
  const fakeFetch = async () => ({
    ok: true,
    json: async () => [{
      id: 1,
      external_id: 'plat-1',
      name: 'FutureLearn',
      status: 'active',
      expected_count: 1673,
      expected_count_type: 'courses',
      last_verified: '2026-08-26'
    }]
  });
  const result = await PlatformData.loadPlatforms({
    projectUrl: 'https://example.supabase.co', publishableKey: 'public-key',
    staticPlatforms: [{id:'plat-1',name:'FutureLearn',description_en:'Static description'}],
    fetchFn: fakeFetch
  });
  assert.equal(result.source, 'supabase');
  assert.equal(result.platforms[0].officialCount, 1673);
  assert.equal(result.platforms[0].description_en, 'Static description');
});
```

- [ ] **Step 2: Run adapter tests and confirm RED**

```bash
node --test tests/platform-data.test.cjs
```

Expected: FAIL because `js/platform-data.js` does not exist.

- [ ] **Step 3: Add the browser-safe Supabase config**

Create `js/supabase-config.js` using the existing public project config:

```js
var SUPABASE_CONFIG = Object.freeze({
  projectUrl: 'https://pptjaflkltwavyktzphw.supabase.co',
  publishableKey: 'sb_publishable_lUq2yPmkTijaqyYDifTYFA_Es-Xi7Nb'
});
```

Do not add any secret or service-role key.

- [ ] **Step 4: Implement `PlatformData.loadPlatforms()`**

Create `js/platform-data.js` with Node/browser compatibility. Supabase request:

```text
/rest/v1/platforms
?select=id,external_id,name,description,description_ar,description_en,description_tr,logo_url,official_url,catalog_url,status,expected_count,expected_count_type,last_verified,category,pricing_model,has_free_content,certificate_available,languages,platform_type,best_for_ar,best_for_en,best_for_tr,strengths_ar,strengths_en,strengths_tr,limitations_ar,limitations_en,limitations_tr,featured,display_order
&status=eq.active
&order=display_order.asc.nullslast,id.asc
```

Headers:

```js
{ apikey: publishableKey, Accept: 'application/json' }
```

Return:

```js
{ platforms, source: 'supabase' }
```

On request failure or malformed result, return:

```js
{ platforms: normalizedStatic, source: 'fallback', error }
```

Merge rule: locate static row by `external_id`/`id`, normalize both, then prefer meaningful Supabase values and use static values only for missing presentation fields.

- [ ] **Step 5: Run adapter + core tests**

```bash
node --test tests/platform-data.test.cjs tests/platform-core.test.cjs
node --check js/platform-data.js
node --check js/supabase-config.js
```

Expected: PASS.

- [ ] **Step 6: Load the new scripts before `app.js`**

Change the homepage script order to:

```html
<script src="js/i18n.js"></script>
<script src="js/data.js"></script>
<script src="js/platform-core.js"></script>
<script src="js/supabase-config.js"></script>
<script src="js/platform-data.js"></script>
<script src="js/platform-directory.js"></script>
<script src="js/app.js"></script>
```

`platform-directory.js` will be created in Task 3; until then, keep that line out of the live commit or create the empty tested module in the same task before updating HTML. Do not deploy an HTML reference to a missing file.

- [ ] **Step 7: Commit**

```bash
git add tests/platform-data.test.cjs js/platform-data.js js/supabase-config.js js/platform-core.js index.html
git commit -m "feat: add normalized platform data source"
```

---

## Task 3: Extract directory behavior and redesign the homepage

**Files:**
- Create: `tests/platform-directory.test.cjs`
- Create: `js/platform-directory.js`
- Modify: `js/app.js`
- Modify: `index.html`
- Modify: `js/i18n.js`
- Modify: `css/style.css`

- [ ] **Step 1: Write failing tests for directory behavior**

Tests cover:
- category filtering;
- language matching against `languages[]`;
- pricing model filtering;
- free-content and certificate filters;
- verification filter;
- official-count sort places known counts before unknown;
- featured/recommended sort does not use local view count as a global ranking signal.

Example:

```js
test('known official counts sort before unknown counts', () => {
  const list = PlatformCore.sortPlatforms([
    {id:'a',name:'A',officialCount:null},
    {id:'b',name:'B',officialCount:25},
    {id:'c',name:'C',officialCount:100}
  ], 'official_count');
  assert.deepEqual(list.map(x => x.id), ['c','b','a']);
});
```

- [ ] **Step 2: Run focused tests and confirm RED for missing/new behavior**

```bash
node --test tests/platform-directory.test.cjs
```

Expected: FAIL until directory helpers/module are implemented.

- [ ] **Step 3: Create `js/platform-directory.js`**

Keep it free of global application initialization. It owns:
- `getFilterOptions(platforms)`;
- `getCategoryGroups(platforms)`;
- `getStats(platforms)`;
- `getFeatured(platforms, fallbackFeaturedIds)`;
- `getVisiblePlatforms(platforms, state)`;
- safe card field helpers such as count and verification presentation.

Use `PlatformCore` for normalization/search/filter/sort logic.

- [ ] **Step 4: Refactor `app.js` to load data asynchronously**

Replace static initialization:

```js
allPlatforms = Array.isArray(PLATFORMS_DATA) ? PLATFORMS_DATA : [];
```

with:

```js
const loaded = await PlatformData.loadPlatforms({
  ...SUPABASE_CONFIG,
  staticPlatforms: Array.isArray(PLATFORMS_DATA) ? PLATFORMS_DATA : []
});
allPlatforms = loaded.platforms;
platformDataSource = loaded.source;
```

The rest of the app must consume only normalized `allPlatforms`.

- [ ] **Step 5: Change platform detail links from `course.html` to `platform.html`**

```js
function detailUrl(p) {
  return `platform.html?id=${encodeURIComponent(p.id)}&lang=${encodeURIComponent(currentLang)}`;
}
```

Do not remove `course.html`; compatibility is handled in Task 5.

- [ ] **Step 6: Redesign the homepage information architecture**

Update `index.html` so the main order is:
1. header with Explore / Categories / Featured / Compare;
2. platform-first hero;
3. stats;
4. category discovery section;
5. featured platforms;
6. all-platform directory;
7. existing recommendation utilities accessible as secondary actions;
8. footer.

Hero must contain a large search input synchronized with the directory search and quick filter buttons using `data-quick-filter` values:

```html
<div class="hero-platform-search">
  <span>⌕</span>
  <input id="heroSearchInput" type="search" data-i18n-placeholder="heroSearchPlaceholder">
</div>
<div class="quick-filter-chips" id="quickFilterChips">
  <button type="button" data-quick-filter="free">...</button>
  <button type="button" data-quick-filter="certificate">...</button>
  <button type="button" data-quick-filter="arabic">...</button>
  <button type="button" data-quick-filter="english">...</button>
  <button type="button" data-quick-filter="technology">...</button>
  <button type="button" data-quick-filter="business">...</button>
</div>
```

Add `#categoryGrid` and `#platformDataStatus` containers.

- [ ] **Step 7: Expand directory controls**

Add selects for:
- pricing model (`filterPricing`);
- verification (`filterVerification`).

Keep:
- language;
- category;
- free-content toggle;
- certificate toggle;
- favorites/recent tabs.

Add sort options:
- recommended;
- name;
- recently verified;
- official content count;
- free content first;
- locally most viewed (clearly labeled as local personalization).

- [ ] **Step 8: Redesign platform cards**

Cards must show:
- logo;
- name;
- localized short description;
- category;
- languages;
- pricing/free-content state;
- certificate state;
- official count and unit or “not officially confirmed”;
- verification badge;
- `Details`, `Compare`, and `Official site` actions.

Remove the fire/trend badge from the primary decision metadata. Local view data may remain only in a quiet personalization indicator.

Official site links must use `target="_blank" rel="noopener noreferrer"` and be hidden if URL is invalid/missing.

- [ ] **Step 9: Add category discovery behavior**

Clicking a category card sets the matching category filter, switches to the “all” tab, renders, and scrolls to the directory.

- [ ] **Step 10: Add all new i18n keys in Arabic, English, Turkish**

Add translations for:
- hero platform-first title/subtitle/search placeholder;
- navigation labels;
- categories section;
- quick chips;
- pricing model labels;
- verification states;
- official count unit labels;
- “not officially confirmed”;
- data source/fallback status;
- new sort options;
- official site.

No new visible string should be hard-coded in only one language.

- [ ] **Step 11: Apply the visual redesign in `css/style.css`**

Keep existing CSS variables/indigo identity. Add styles for:
- hero search + chips;
- category cards;
- source-status pill;
- richer platform card fact grid;
- verification badges;
- official-count block;
- 4-column wide desktop / 3 normal desktop / 2 tablet / 1 mobile responsive grid;
- mobile filter panel/stack;
- keyboard-visible `:focus-visible` states.

Do not introduce a dashboard/sidebar layout.

- [ ] **Step 12: Run tests and syntax checks**

```bash
node --test tests/*.test.cjs
for f in js/*.js; do node --check "$f"; done
git diff --check
```

Expected: PASS, no whitespace errors.

- [ ] **Step 13: Commit**

```bash
git add index.html css/style.css js/i18n.js js/app.js js/platform-directory.js tests/platform-directory.test.cjs
git commit -m "feat: redesign platform discovery directory"
```

---

## Task 4: Upgrade platform comparison without breaking local personalization

**Files:**
- Modify: `tests/platform-directory.test.cjs`
- Modify: `js/app.js`
- Modify: `js/platform-directory.js`
- Modify: `js/i18n.js`
- Modify: `css/style.css`

- [ ] **Step 1: Add RED tests for comparison presentation data**

Assert comparison rows expose:
- category;
- pricing model;
- free content;
- certificate;
- languages;
- official count + unit;
- verification state/date;
- first localized “best for” item when available;
- official URL.

Also assert selection remains capped at 3.

- [ ] **Step 2: Run focused test and confirm failure**

```bash
node --test tests/platform-directory.test.cjs
```

Expected: FAIL on missing richer comparison helpers.

- [ ] **Step 3: Implement richer comparison model**

Add a pure helper such as:

```js
PlatformDirectory.comparisonRows(platforms, lang, now)
```

and use it to build the existing modal table. Unknown values display translated unknown labels, never fabricated booleans/counts.

- [ ] **Step 4: Isolate the platform comparison storage key**

Use:

```js
compare: 'dunya-platform-compare-v3'
```

On first load, migrate existing IDs from `dunya-compare-v2` if the new key is absent; keep only IDs present in `allPlatforms`, maximum three.

- [ ] **Step 5: Verify comparison UI accessibility**

- selected buttons expose `aria-pressed`;
- modal close works via button, backdrop, and Escape;
- comparison table is horizontally scrollable on mobile;
- compare dock remains usable at narrow widths.

- [ ] **Step 6: Run full tests and commit**

```bash
node --test tests/*.test.cjs
for f in js/*.js; do node --check "$f"; done
git diff --check
git add js/app.js js/platform-directory.js js/i18n.js css/style.css tests/platform-directory.test.cjs
git commit -m "feat: enrich platform comparison"
```

---

## Task 5: Replace the misleading `course.html` detail flow with a rich platform profile

**Files:**
- Create: `tests/platform-detail.test.cjs`
- Create: `platform.html`
- Create: `js/platform-detail.js`
- Modify: `course.html`
- Modify: `js/i18n.js`
- Modify: `css/style.css`

- [ ] **Step 1: Write RED tests for platform detail helpers**

Create pure helpers inside `platform-detail.js` or a small exported detail model that can be required by Node. Test:
- valid ID returns the matching normalized platform;
- invalid ID returns `null` and never defaults to FutureLearn/first platform;
- empty best-for/strengths/limitations arrays are omitted;
- official/catalog links are separately exposed;
- missing official count remains unknown.

- [ ] **Step 2: Run tests and confirm RED**

```bash
node --test tests/platform-detail.test.cjs
```

Expected: FAIL because `platform.html`/new detail module does not exist.

- [ ] **Step 3: Create `platform.html`**

Base it on existing `course.html` styling but make the page explicitly a platform profile. Script order:

```html
<script src="js/i18n.js"></script>
<script src="js/data.js"></script>
<script src="js/platform-core.js"></script>
<script src="js/supabase-config.js"></script>
<script src="js/platform-data.js"></script>
<script src="js/platform-detail.js"></script>
```

Required containers:
- detail hero;
- profile facts;
- overview;
- best for;
- strengths;
- limitations;
- similar platforms;
- source/fallback status.

- [ ] **Step 4: Implement `js/platform-detail.js`**

Flow:
1. initialize language/theme;
2. call `PlatformData.loadPlatforms()`;
3. find exact `id` from URL;
4. if missing, render translated not-found state;
5. record local view only after a valid match;
6. render only sections with actual data;
7. render similar platforms from normalized data by category;
8. preserve favorites/share behavior;
9. show official site and catalog links separately when they differ.

- [ ] **Step 5: Convert `course.html` into a compatibility redirect**

Preserve query string and hash:

```html
<script>
  const target = new URL('platform.html', location.href);
  target.search = location.search;
  target.hash = location.hash;
  location.replace(target.href);
</script>
```

Include a normal `<a>` fallback for users with JavaScript disabled.

- [ ] **Step 6: Add detail-page translations and styles**

Translations: Overview, Best for, Strengths, Limitations, Facts, Official site, Official catalog, Last verified, Verification status, unknown states, fallback data status.

CSS: editorial two-column hero/facts layout on desktop, single column mobile, list cards, verification badge, accessible focus, consistent logo presentation.

- [ ] **Step 7: Run tests and commit**

```bash
node --test tests/*.test.cjs
for f in js/*.js; do node --check "$f"; done
git diff --check
git add platform.html course.html js/platform-detail.js js/i18n.js css/style.css tests/platform-detail.test.cjs
git commit -m "feat: add rich platform profile page"
```

---

## Task 6: Extend Supabase platform metadata safely and enable active-only public reads

**Files:**
- Create: `supabase/platform-directory.sql`
- Modify: `tests/platform-data.test.cjs`
- Modify: `js/platform-data.js`
- Supabase: `public.platforms`

**Important:** Before executing SQL, read the current Supabase changelog/docs for Data API/RLS behavior and inspect current columns, grants, RLS status, and policies. Do not drop or replace existing policies blindly.

- [ ] **Step 1: Inspect current Supabase schema/security**

Run read-only queries equivalent to:

```sql
select column_name, data_type
from information_schema.columns
where table_schema='public' and table_name='platforms'
order by ordinal_position;

select relrowsecurity
from pg_class
where oid='public.platforms'::regclass;

select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname='public' and tablename='platforms';

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema='public' and table_name='platforms'
  and grantee in ('anon','authenticated');
```

Expected: establish exact baseline before DDL/policy changes.

- [ ] **Step 2: Add RED adapter tests for all new Supabase fields**

Test mapping of:
- localized descriptions;
- category;
- pricing model;
- free/cert flags;
- languages array;
- platform type;
- profile arrays;
- featured/display order;
- count/type/date.

- [ ] **Step 3: Create idempotent tracked SQL**

Create `supabase/platform-directory.sql` with `ADD COLUMN IF NOT EXISTS` for:

```sql
alter table public.platforms
  add column if not exists description_ar text,
  add column if not exists description_en text,
  add column if not exists description_tr text,
  add column if not exists category text,
  add column if not exists pricing_model text,
  add column if not exists has_free_content boolean,
  add column if not exists certificate_available boolean,
  add column if not exists languages text[],
  add column if not exists platform_type text,
  add column if not exists best_for_ar text[],
  add column if not exists best_for_en text[],
  add column if not exists best_for_tr text[],
  add column if not exists strengths_ar text[],
  add column if not exists strengths_en text[],
  add column if not exists strengths_tr text[],
  add column if not exists limitations_ar text[],
  add column if not exists limitations_en text[],
  add column if not exists limitations_tr text[],
  add column if not exists featured boolean not null default false,
  add column if not exists display_order integer;
```

Add/validate a pricing check constraint only after confirming no existing values violate it. Allowed values:
`free`, `freemium`, `paid`, `mixed`, `unknown`.

Ensure RLS is enabled. If an equivalent active-only SELECT policy does not already exist, add one for `anon`/`authenticated` using `status = 'active'`. Grant `SELECT` on `public.platforms` to `anon, authenticated` only if not already available.

- [ ] **Step 4: Execute the reviewed SQL through the Supabase connector**

Apply the exact reviewed statements. Do not add client write policies.

- [ ] **Step 5: Verify schema, policy, grants, and public behavior**

Database checks:

```sql
select count(*) from public.platforms where status='active';
select external_id,name,status from public.platforms where status='active' order by id limit 5;
```

Then perform a REST request using the publishable key and confirm:
- HTTP 200;
- only active rows are visible;
- response includes the newly selected columns;
- no secret credentials are required.

- [ ] **Step 6: Update the adapter select list and pass tests**

Run:

```bash
node --test tests/platform-data.test.cjs tests/platform-core.test.cjs
node --check js/platform-data.js
```

Expected: PASS.

- [ ] **Step 7: Commit tracked database definition + adapter changes**

```bash
git add supabase/platform-directory.sql js/platform-data.js tests/platform-data.test.cjs
git commit -m "feat: enable Supabase platform profiles"
```

---

## Task 7: Seed safe presentation metadata without fabricating verification

**Files:**
- Create: `scripts/build-platform-seed.mjs`
- Create: `supabase/platform-directory-seed.sql` (generated/reviewed output)
- Modify: `tests/platform-data.test.cjs`
- Supabase: `public.platforms`

- [ ] **Step 1: Add tests for static-to-seed transformation**

The transformation may populate only safe presentation fields from existing static data:
- localized descriptions;
- category;
- `has_free_content` from legacy `free`;
- `certificate_available` from legacy `certificate`;
- languages from legacy language value;
- logo/official URL only when missing in DB;
- selected `featured` IDs after confirming those IDs exist among active scope.

It must **not** generate or overwrite:
- `expected_count`;
- `expected_count_type`;
- `last_verified`;
- unverifiable strengths/limitations/best-for claims beyond curated content explicitly written and reviewed.

- [ ] **Step 2: Build a deterministic seed generator**

`scripts/build-platform-seed.mjs` reads `js/data.js` safely (or a parsed exported dataset) and emits SQL keyed only by `external_id`.

Generated SQL must use updates shaped like:

```sql
update public.platforms
set
  description_ar = coalesce(description_ar, '<escaped value>'),
  description_en = coalesce(description_en, '<escaped value>'),
  description_tr = coalesce(description_tr, '<escaped value>'),
  category = coalesce(category, '<stable category>'),
  has_free_content = coalesce(has_free_content, true),
  certificate_available = coalesce(certificate_available, true),
  languages = coalesce(languages, array['English']::text[])
where external_id = 'plat-1';
```

Use `coalesce` so existing Supabase metadata is not overwritten.

- [ ] **Step 3: Generate and inspect the seed SQL**

```bash
node scripts/build-platform-seed.mjs > supabase/platform-directory-seed.sql
```

Inspect for:
- only active-scope IDs intended for the platform site;
- no `expected_count`/`last_verified` assignments;
- correct SQL escaping;
- no secret data.

- [ ] **Step 4: Execute seed SQL through Supabase**

Apply after inspection.

- [ ] **Step 5: Verify representative rows**

Query FutureLearn, Agora, IBM SkillsBuild, Forage, Microsoft and several Arabic/Turkish-focused platforms. Confirm:
- descriptions/categories/languages now populate the frontend;
- official counts remain null unless independently verified;
- existing source-backed DB values were not overwritten.

- [ ] **Step 6: Commit**

```bash
git add scripts/build-platform-seed.mjs supabase/platform-directory-seed.sql tests/platform-data.test.cjs
git commit -m "data: seed platform presentation metadata"
```

---

## Task 8: Finish PWA, accessibility, compatibility, and production verification

**Files:**
- Modify: `sw.js`
- Modify: `manifest.webmanifest`
- Modify: `README-UPGRADE.md`
- Modify: `index.html`
- Modify: `platform.html`
- Modify: `css/style.css`
- Modify: `js/app.js`
- Modify: `js/platform-detail.js`

- [ ] **Step 1: Add new production assets to the service worker**

Bump:

```js
const CACHE = 'dunya-al-dawrat-v6';
```

Add to `CORE`:
- `./platform.html`
- `./js/platform-core.js`
- `./js/platform-data.js`
- `./js/platform-directory.js`
- `./js/platform-detail.js`
- `./js/supabase-config.js`

Keep `./course.html` for compatibility redirect caching.

- [ ] **Step 2: Update PWA/product metadata**

`manifest.webmanifest` and meta description should clearly describe the product as a platform discovery/comparison directory, not a course catalog.

- [ ] **Step 3: Update README architecture and deployment notes**

Replace the obsolete “no backend/API” statement with the accurate architecture:
- GitHub Pages static frontend;
- Supabase platform metadata when reachable;
- static `data.js` fallback;
- local-only personalization;
- public publishable key protected by RLS.

- [ ] **Step 4: Run accessibility smoke checks in code**

Verify:
- all interactive controls have text/`aria-label`;
- comparison buttons use `aria-pressed`;
- modals expose appropriate dialog semantics and Escape close;
- logo `alt` text is platform name;
- decorative icons have empty alt/aria-hidden;
- `:focus-visible` is visible;
- mobile controls have adequate tap size.

- [ ] **Step 5: Run the complete verification suite**

```bash
node --test tests/*.test.cjs
for f in js/*.js; do node --check "$f"; done
git diff --check
```

Expected: all PASS.

- [ ] **Step 6: Verify Supabase public read from the exact production config**

Confirm active-platform REST request returns HTTP 200 and the expected active scope. Confirm inactive rows are not exposed through the public policy.

- [ ] **Step 7: Commit the release changes**

```bash
git add sw.js manifest.webmanifest README-UPGRADE.md index.html platform.html css/style.css js/app.js js/platform-detail.js
git commit -m "release: finalize Platform Directory Pro 2.0"
```

- [ ] **Step 8: Verify GitHub Pages deployment for the release commit**

Check the Pages workflow/deployment associated with the final commit and require success before claiming release completion.

- [ ] **Step 9: Verify the live site**

Fetch/open `https://devmyskilla.github.io/` and verify at minimum:
- new platform-first hero is present;
- active platform count is data-driven;
- category discovery works;
- filters work;
- platform cards show unknown counts safely;
- comparison caps at three;
- a valid `platform.html?id=...` profile renders;
- invalid platform ID shows not-found state;
- old `course.html?id=...` link redirects correctly;
- Arabic/English/Turkish switcher works;
- dark mode works;
- mobile CSS does not overflow;
- offline/PWA core files are cached.

Only after these checks may the redesign be reported as complete.
