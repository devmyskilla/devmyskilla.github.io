# Landing + Explore Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split Dunya Al-Dawrat into a youthful project landing page at `index.html` and a dedicated platform-discovery application at `explore.html` without losing any existing discovery, comparison, favorites, recent-history, i18n, theme, PWA, Supabase, or platform-profile behavior.

**Architecture:** Preserve the existing discovery runtime and data layer, move its page shell from `index.html` to `explore.html`, and build a small new landing runtime that consumes the same normalized platform data only for live statistics and navigation. Keep LocalStorage keys and platform URLs unchanged, update cross-page navigation and service-worker caching, and validate the split with page-structure, navigation, i18n, PWA, regression, and real Supabase smoke tests.

**Tech Stack:** Static HTML/CSS/JavaScript, GitHub Pages, Node.js `node:test`, Supabase REST/Data API, Service Worker/PWA, LocalStorage.

**Spec:** `docs/superpowers/specs/2026-08-26-landing-and-explore-split-design.md`

## Global Constraints

- The project remains a directory for discovering learning platforms, not a catalog of individual courses.
- `index.html` is explanatory and must not host the full platform discovery application.
- `explore.html` must retain all existing discovery behavior.
- Keep `platform.html?id=<platformId>&lang=<currentLang>` URLs valid.
- Keep all existing LocalStorage keys unchanged: `dunya-favorites-v2`, `dunya-platform-compare-v3`, `dunya-compare-v2`, `dunya-views-v2`, `dunya-recent-v2`, `dunya-theme-v2`.
- Supabase remains authoritative with the existing local `js/data.js` fallback.
- All new user-facing strings support Arabic, English, and Turkish.
- Arabic remains RTL; English/Turkish remain LTR.
- Do not hardcode old platform totals such as 110.
- No unsupported official counts or verification dates may be invented.
- Preserve current accessibility, reduced-motion behavior, dark/light mode, and PWA/offline behavior.
- Merge to `main` only after the full CI suite is green on the feature branch.

---

## File Structure

### Create
- `explore.html` — dedicated discovery page containing the current directory application shell.
- `js/landing.js` — landing-only initialization, language/theme handling, CTA language preservation, and live statistics.
- `css/landing.css` — landing-specific visual system and responsive sections.
- `tests/page-split.test.cjs` — page responsibility and navigation tests.
- `tests/landing.test.cjs` — landing runtime/statistics tests.

### Modify
- `index.html` — replace discovery application shell with the project landing page.
- `js/app.js` — discovery-only navigation assumptions where `index.html` was previously the current page.
- `js/platform-detail.js` — back navigation targets `explore.html`.
- `js/i18n.js` — landing and new navigation strings for ar/en/tr.
- `css/style.css` — shared header/button utilities only where needed by both pages.
- `sw.js` — new cache version and `explore.html`/landing assets.
- `manifest.webmanifest` — keep product positioning aligned with learning-platform discovery if metadata needs wording adjustment.
- `README-UPGRADE.md` — document landing/discovery architecture.
- `tests/release-smoke.test.cjs` — PWA and route expectations for the new page split.

### Preserve unchanged unless a failing test proves otherwise
- `js/platform-core.js`
- `js/platform-data.js`
- `js/platform-directory.js`
- `js/supabase-config.js`
- `js/data.js`
- Supabase schema/seed files

---

### Task 1: Lock the Page Split with Failing Tests

**Files:**
- Create: `tests/page-split.test.cjs`
- Modify: `tests/release-smoke.test.cjs`

**Interfaces:**
- Consumes: current `index.html`, `platform.html`, `sw.js`.
- Produces: structural requirements that later tasks must satisfy.

- [ ] **Step 1: Write failing page-responsibility tests**

Create tests that load `index.html` and `explore.html` from disk and assert:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = path => fs.readFileSync(path, 'utf8');

test('landing owns project explanation and routes to explore', () => {
  const html = read('index.html');
  assert.match(html, /href="explore\.html/);
  assert.doesNotMatch(html, /id="platformGrid"/);
  assert.doesNotMatch(html, /id="compareModal"/);
  assert.match(html, /id="aboutProject"/);
  assert.match(html, /id="developerSection"/);
});

test('explore owns the complete discovery application', () => {
  const html = read('explore.html');
  for (const id of ['platformGrid','filterLang','filterCategory','filterPricing','filterVerification','compareModal','quizModal','pathModal']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});

test('platform profile back navigation points to explore', () => {
  const js = read('js/platform-detail.js');
  assert.match(js, /explore\.html\?lang=/);
  assert.doesNotMatch(js, /index\.html\?lang=.*#explore/);
});
```

- [ ] **Step 2: Add failing PWA expectations**

Update `tests/release-smoke.test.cjs` to expect the next cache version and these assets:

```js
for (const asset of ['./index.html','./explore.html','./platform.html','./css/landing.css','./js/landing.js']) {
  assert.match(sw, new RegExp(asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}
```

- [ ] **Step 3: Run the focused tests and verify RED**

Run:

```bash
node --test tests/page-split.test.cjs tests/release-smoke.test.cjs
```

Expected: failures because `explore.html`, `landing.js`, `landing.css`, and the new navigation/cache rules do not exist yet.

- [ ] **Step 4: Commit only the failing tests**

```bash
git add tests/page-split.test.cjs tests/release-smoke.test.cjs
git commit -m "test: define landing and explore page split"
```

---

### Task 2: Move the Existing Discovery Shell to `explore.html`

**Files:**
- Create: `explore.html`
- Modify: `js/app.js`
- Test: `tests/page-split.test.cjs`, existing platform tests

**Interfaces:**
- Consumes: existing discovery DOM IDs and `js/app.js` runtime.
- Produces: `explore.html` with all IDs `app.js` expects and stable platform links.

- [ ] **Step 1: Create `explore.html` from the current discovery page shell**

Copy the current `index.html` discovery structure into `explore.html`, preserving every runtime-critical ID:

```text
heroSearchInput
quickFilterChips
categoryGrid
featuredGrid
platformDataStatus
searchInput
filterLang
filterCategory
filterPricing
filterVerification
filterFree
filterCert
sortSelect
platformGrid
compareDock
quizModal
compareModal
pathModal
```

Change the discovery header so Home links to:

```html
<a href="index.html" data-home-link data-i18n="navHome"></a>
```

Keep discovery scripts in the same order:

```html
<script src="js/i18n.js"></script>
<script src="js/data.js"></script>
<script src="js/platform-core.js"></script>
<script src="js/supabase-config.js"></script>
<script src="js/platform-data.js"></script>
<script src="js/platform-directory.js"></script>
<script src="js/accessibility.js"></script>
<script src="js/app.js"></script>
```

- [ ] **Step 2: Add a discovery-page URL helper to `js/app.js`**

Add a small helper that preserves language when returning Home:

```js
function homeUrl(){
  return `index.html?lang=${encodeURIComponent(currentLang)}`;
}
```

During language changes, update `[data-home-link]` if present:

```js
function syncPageLinks(){
  document.querySelectorAll('[data-home-link]').forEach(link => link.href = homeUrl());
}
```

Call `syncPageLinks()` after initial language setup and inside `changeLang()`.

- [ ] **Step 3: Keep all existing discovery behavior unchanged**

Do not rename LocalStorage keys, modal IDs, platform card links, filter IDs, or comparison storage.

- [ ] **Step 4: Run tests**

```bash
node --test tests/page-split.test.cjs tests/platform-core.test.cjs tests/platform-data.test.cjs tests/platform-directory.test.cjs
for f in js/*.js; do node --check "$f"; done
```

Expected: discovery test passes; landing test still fails because `index.html` is not yet replaced.

- [ ] **Step 5: Commit**

```bash
git add explore.html js/app.js
git commit -m "feat: move platform discovery to explore page"
```

---

### Task 3: Build a Shared-Data Landing Runtime with TDD

**Files:**
- Create: `js/landing.js`
- Create: `tests/landing.test.cjs`

**Interfaces:**
- Consumes: `PlatformData.loadPlatforms(options)`, `PlatformDirectory.getStats(platforms)`, `setLang`, `applyTranslations`.
- Produces: `Landing.buildStats(platforms)`, `Landing.withLang(path, lang)`, and browser initialization.

- [ ] **Step 1: Write failing pure-function tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const Landing = require('../js/landing.js');

test('landing stats delegate to platform-level normalized data', () => {
  const stats = Landing.buildStats([
    {hasFreeContent:true,certificateAvailable:true,languages:['Arabic','English']},
    {hasFreeContent:false,certificateAvailable:true,languages:['English']}
  ]);
  assert.deepEqual(stats,{platforms:2,free:1,certificates:2,languages:2});
});

test('withLang preserves selected language in cross-page navigation', () => {
  assert.equal(Landing.withLang('explore.html','tr'),'explore.html?lang=tr');
  assert.equal(Landing.withLang('explore.html','ar'),'explore.html?lang=ar');
});
```

- [ ] **Step 2: Verify RED**

```bash
node --test tests/landing.test.cjs
```

Expected: FAIL because `js/landing.js` does not exist.

- [ ] **Step 3: Implement pure landing helpers**

Use a UMD-style module consistent with other project files:

```js
(function(root,factory){
  const directory = typeof module === 'object' && module.exports
    ? require('./platform-directory.js')
    : root.PlatformDirectory;
  const api = factory(directory);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.Landing = api;
})(typeof globalThis !== 'undefined' ? globalThis : this,function(PlatformDirectory){
  function buildStats(platforms){ return PlatformDirectory.getStats(platforms); }
  function withLang(path,lang){ return `${path}?lang=${encodeURIComponent(lang || 'ar')}`; }
  return {buildStats,withLang};
});
```

Then extend browser-only initialization to:
- set language from `?lang=`.
- apply translations.
- load Supabase via `PlatformData.loadPlatforms` with `PLATFORMS_DATA` fallback.
- populate `landingStatPlatforms`, `landingStatFree`, `landingStatCert`, `landingStatLang`.
- update all `[data-explore-link]` URLs with the current language.
- preserve `dunya-theme-v2` behavior.
- allow language switcher changes without losing the landing page.
- register the service worker.

- [ ] **Step 4: Run landing tests**

```bash
node --test tests/landing.test.cjs
node --check js/landing.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/landing.js tests/landing.test.cjs
git commit -m "feat: add landing page runtime"
```

---

### Task 4: Replace `index.html` with the Youthful Project Landing Page

**Files:**
- Modify: `index.html`
- Create: `css/landing.css`
- Modify: `css/style.css` only for shared utilities if required
- Test: `tests/page-split.test.cjs`

**Interfaces:**
- Consumes: `js/i18n.js`, `js/data.js`, `js/platform-core.js`, `js/platform-data.js`, `js/platform-directory.js`, `js/supabase-config.js`, `js/landing.js`.
- Produces: explanatory landing page with IDs expected by `landing.js`.

- [ ] **Step 1: Replace the discovery shell in `index.html`**

Use this page-level section structure:

```html
<header>...</header>
<main>
  <section id="landingHero">...</section>
  <section id="problemSection">...</section>
  <section id="aboutProject">...</section>
  <section id="whySection">...</section>
  <section id="howItWorks">...</section>
  <section id="landingStats">...</section>
  <section id="developerSection">...</section>
  <section id="landingCta">...</section>
</main>
<footer>...</footer>
```

Hero CTAs:

```html
<a class="btn btn-primary" data-explore-link href="explore.html" data-i18n="landingExploreCta"></a>
<a class="btn btn-soft" href="#aboutProject" data-i18n="landingLearnMore"></a>
```

Live stats IDs:

```text
landingStatPlatforms
landingStatFree
landingStatCert
landingStatLang
```

Developer section must visibly contain the literal organization identity:

```html
<strong>اتحاد شباب الأمة</strong>
```

- [ ] **Step 2: Add `css/landing.css`**

Create landing-specific classes for:
- hero two-column layout.
- technical platform cloud/orbit visual.
- problem cards.
- project definition panel.
- five-step process row.
- live-stat band.
- developer card.
- final CTA block.
- mobile stacking.
- `prefers-reduced-motion` overrides.

Do not duplicate directory card/filter CSS from `style.css`.

- [ ] **Step 3: Load only landing dependencies**

End `index.html` with:

```html
<script src="js/i18n.js"></script>
<script src="js/data.js"></script>
<script src="js/platform-core.js"></script>
<script src="js/supabase-config.js"></script>
<script src="js/platform-data.js"></script>
<script src="js/platform-directory.js"></script>
<script src="js/landing.js"></script>
```

Do not load `js/app.js` or discovery modals on the landing page.

- [ ] **Step 4: Run structural tests**

```bash
node --test tests/page-split.test.cjs tests/landing.test.cjs
```

Expected: landing responsibility tests pass.

- [ ] **Step 5: Commit**

```bash
git add index.html css/landing.css css/style.css
git commit -m "feat: build project landing page"
```

---

### Task 5: Add Complete Arabic, English, and Turkish Landing Copy

**Files:**
- Modify: `js/i18n.js`
- Test: `tests/page-split.test.cjs`

**Interfaces:**
- Consumes: existing `getText`, `setLang`, `applyTranslations` behavior.
- Produces: identical landing/navigation key sets for `ar`, `en`, `tr`.

- [ ] **Step 1: Add a failing translation-key parity test**

Add to `tests/page-split.test.cjs` a test that evaluates/loads the translation dictionaries and asserts these keys exist in all three languages:

```text
navHome
navExplore
landingHeroTitle
landingHeroSubtitle
landingExploreCta
landingLearnMore
landingProblemTitle
landingWhatTitle
landingWhyTitle
landingHowTitle
landingStatsTitle
landingDeveloperTitle
landingDeveloperBody
landingFinalTitle
landingFinalCta
```

- [ ] **Step 2: Verify RED**

```bash
node --test tests/page-split.test.cjs
```

Expected: missing landing keys.

- [ ] **Step 3: Add concise student-centered translations**

Arabic core copy should communicate:
- `landingHeroTitle`: `دليلك الذكي لاكتشاف أفضل منصات التعلّم`
- clearly that Dunya Al-Dawrat is a platform directory/comparison guide, not a course provider.
- the problem of fragmented search across platforms.
- the five steps Search → Filter → Compare → Choose → Official site.
- اتحاد شباب الأمة as developer.

Add equivalent English and Turkish text with the same meaning rather than literal machine-style translation.

- [ ] **Step 4: Run tests**

```bash
node --test tests/page-split.test.cjs tests/landing.test.cjs
node --check js/i18n.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/i18n.js tests/page-split.test.cjs
git commit -m "feat: add multilingual landing content"
```

---

### Task 6: Fix Cross-Page Navigation and Preserve Language

**Files:**
- Modify: `js/platform-detail.js`
- Modify: `platform.html` if static labels/navigation require changes
- Modify: `explore.html`
- Test: `tests/page-split.test.cjs`, `tests/platform-detail.test.cjs`

**Interfaces:**
- Consumes: `currentLang`, existing platform detail runtime.
- Produces: Landing → Explore → Platform → Explore navigation with language query preservation.

- [ ] **Step 1: Add failing navigation assertions**

Assert:
- landing CTA targets `explore.html`.
- explore cards still construct `platform.html?id=...&lang=...`.
- profile back link uses `explore.html?lang=...`.
- explore Home link is language-aware via runtime marker `data-home-link`.

- [ ] **Step 2: Verify RED for profile back link**

```bash
node --test tests/page-split.test.cjs tests/platform-detail.test.cjs
```

- [ ] **Step 3: Update profile back link**

In `js/platform-detail.js`, replace:

```js
index.html?lang=${encodeURIComponent(currentLang)}#explore
```

with:

```js
explore.html?lang=${encodeURIComponent(currentLang)}
```

Change the translated label from a generic “back home” meaning to “back to discovery” where necessary.

- [ ] **Step 4: Verify all navigation tests**

```bash
node --test tests/page-split.test.cjs tests/platform-detail.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/platform-detail.js platform.html explore.html tests/page-split.test.cjs tests/platform-detail.test.cjs
git commit -m "fix: preserve language across landing discovery navigation"
```

---

### Task 7: Update PWA Cache, Metadata, and Documentation

**Files:**
- Modify: `sw.js`
- Modify: `manifest.webmanifest`
- Modify: `README-UPGRADE.md`
- Test: `tests/release-smoke.test.cjs`

**Interfaces:**
- Consumes: new page/runtime asset set.
- Produces: offline availability for landing, explore, and platform pages.

- [ ] **Step 1: Bump service-worker cache version**

Change:

```js
const CACHE = 'dunya-al-dawrat-v6';
```

to:

```js
const CACHE = 'dunya-al-dawrat-v7';
```

- [ ] **Step 2: Cache the new production assets**

`CORE` must include at least:

```js
'./',
'./index.html',
'./explore.html',
'./platform.html',
'./course.html',
'./offline.html',
'./css/style.css',
'./css/landing.css',
'./css/profile.css',
'./js/i18n.js',
'./js/data.js',
'./js/platform-core.js',
'./js/supabase-config.js',
'./js/platform-data.js',
'./js/platform-directory.js',
'./js/landing.js',
'./js/accessibility.js',
'./js/app.js',
'./js/platform-detail.js',
'./manifest.webmanifest',
'./icon.svg',
'./icon-192.png',
'./icon-512.png'
```

Keep navigation/scripts/styles network-first.

- [ ] **Step 3: Align manifest and README wording**

Manifest description must describe a guide for discovering/comparing learning platforms, not a course marketplace.

README must document:

```text
index.html = project landing
explore.html = platform discovery
platform.html = platform profile
```

- [ ] **Step 4: Run PWA tests**

```bash
node --test tests/release-smoke.test.cjs
```

Expected: PASS with v7 and all required assets.

- [ ] **Step 5: Commit**

```bash
git add sw.js manifest.webmanifest README-UPGRADE.md tests/release-smoke.test.cjs
git commit -m "chore: update PWA for landing and explore pages"
```

---

### Task 8: Full Regression, Supabase Smoke, Review, and Integration Gate

**Files:**
- No new production files unless a failing check identifies a defect.
- Modify tests/code only through a new RED → GREEN cycle if defects are found.

**Interfaces:**
- Consumes: complete feature branch.
- Produces: merge-ready green branch.

- [ ] **Step 1: Run the complete Node test suite**

```bash
node --test tests/*.test.cjs
```

Expected: 0 failures.

- [ ] **Step 2: Run syntax checks**

```bash
for f in js/*.js; do node --check "$f"; done
```

Expected: 0 syntax errors.

- [ ] **Step 3: Verify generated Supabase seed remains deterministic**

```bash
node scripts/build-platform-seed.mjs > /tmp/platform-directory-seed.sql
diff -u supabase/platform-directory-seed.sql /tmp/platform-directory-seed.sql
```

Expected: no diff.

- [ ] **Step 4: Run the existing public Supabase REST smoke check**

Use the same CI logic already present in `.github/workflows/test.yml` and require:
- successful HTTP response.
- 40 active platform rows.
- no non-active rows visible through the public client.

- [ ] **Step 5: Run whitespace/diff validation**

```bash
git diff --check main...HEAD
```

Expected: no output.

- [ ] **Step 6: Review the final diff against the spec**

Confirm explicitly:
- `index.html` has no `platformGrid`, filters, compare/quiz/path modals.
- `explore.html` contains every discovery control from the previous production page.
- LocalStorage keys are unchanged.
- `platform.html` links remain stable.
- landing stats consume `PlatformData` + `PlatformDirectory`, not hardcoded values.
- ar/en/tr navigation works.
- service worker caches both page experiences.

- [ ] **Step 7: Verify GitHub Actions on the feature branch**

Require the latest workflow for `feat/landing-and-explore-split` to conclude `success` on the exact HEAD SHA.

- [ ] **Step 8: Integration decision**

Do not move `main` until the human partner selects the integration option after the branch is green.
