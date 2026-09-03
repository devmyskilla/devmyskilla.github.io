# Platform Fields and Official Paths Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Research all 110 platforms against official sources, store broad subject fields and verified official learning paths separately, and render both cleanly on each platform detail page in Arabic, English, and Turkish.

**Architecture:** Extend the existing normalized platform shape in `js/platform-core.js`, validate the raw CMS data incrementally with structural checks plus a completeness audit CLI, and render fields/paths through the existing `platform-detail.js` page model. Research data stays in the central `data.json`, Decap gains explicit editors for the new structures, and the inline editor remains unchanged because arbitrary nested editing would weaken the existing allowlist.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js 22, `node:test`, JSON CMS data, Decap CMS, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-04-platform-fields-paths-design.md`

## Global Constraints

- The site contains exactly **110 platforms**; platform IDs must remain stable and unique.
- Store platform **fields / subject areas** separately from **official learning paths**.
- Official paths must come from official platform sources; standalone courses must not be promoted into paths.
- Every visible stored path requires an official `http` or `https` URL.
- Supported locales remain exactly `ar`, `en`, and `tr`.
- Supported normalized path types are exactly: `learning-path`, `career-path`, `skill-path`, `professional-certificate`, `professional-program`, `specialization`, `role-path`, `structured-series`, `other-official-path`.
- Hide the Official Paths section when `officialPaths` is missing or empty.
- Hide the Fields section when `fields` is missing or empty.
- Display at most 20 official paths on a platform page; if more than 20 verified paths are stored, `pathResearch.allPathsUrl` is required and the UI must show a localized “View all official paths” action.
- Preserve the original published wording in `officialName`; translated display labels live in `name.ar/en/tr`.
- Research metadata uses `pathResearch.lastVerified` in `YYYY-MM-DD` format.
- The first implementation does **not** add inline-pencil editing for fields/paths and must not weaken the Worker allowlist.
- Existing Decap OAuth and inline OAuth URLs must remain unchanged.
- `data.json`, navigation, existing facts, editorial content, favorites, sharing, SEO, and similar-platform behavior must continue working.
- Use TDD for all code changes; research-content batches are validated with the structural/completeness audit before commit.

---

## File Structure

**Modify**
- `js/platform-core.js` — normalize `fields`, `officialPaths`, and `pathResearch`; expose path-display helpers.
- `js/content-api.js` — localize field/path labels and normalized path-type labels.
- `js/platform-detail.js` — include fields/paths in the detail model and render the two separate sections.
- `css/profile.css` — responsive chips/cards for fields and official paths.
- `data.json` — localized UI labels plus researched platform data for all 110 platforms.
- `scripts/content-schema.cjs` — validate optional field/path structures and referential integrity.
- `scripts/validate-content.cjs` — run platform field/path validation for every record.
- `scripts/generate-decap-config.cjs` — expose `fields`, `officialPaths`, and `pathResearch` in Decap CMS.
- `admin/config.yml` — regenerated output only; never edit manually.
- `tests/platform-core.test.cjs` — normalization and 20-item display behavior.
- `tests/content-api.test.cjs` — localization helpers.
- `tests/platform-detail.test.cjs` — model separation, hidden-empty behavior, links, cap behavior.
- `tests/decap-cms.test.cjs` — CMS exposes new structures.
- `tests/full-cms-schema.test.cjs` — final completeness across 110 researched platforms.

**Create**
- `scripts/platform-paths-audit.cjs` — deterministic progress/completeness CLI for research batches.
- `tests/platform-paths-schema.test.cjs` — raw structure validation and invalid-reference tests.
- `tests/platform-paths-audit.test.cjs` — batch/range/completeness behavior.

**Do not modify**
- `inline-worker/src/*`
- `js/edit-descriptors.js`
- `js/inline-editor.js`
- Decap/inline OAuth host configuration

---

### Task 1: Preserve and Normalize Fields / Official Paths in PlatformCore

**Files:**
- Modify: `js/platform-core.js`
- Test: `tests/platform-core.test.cjs`

**Interfaces:**
- Consumes raw platform fields:
  - `fields: Array<{id:string,name:{ar:string,en:string,tr:string},officialUrl?:string}>`
  - `officialPaths: Array<{id:string,officialName:string,name:{ar:string,en:string,tr:string},type:string,officialUrl:string,fieldIds:string[],featured?:boolean}>`
  - `pathResearch: {lastVerified?:string,fieldsSourceUrl?:string,pathsSourceUrl?:string,allPathsUrl?:string}`
- Produces:
  - `PlatformCore.normalizeStaticPlatform(row)` preserving normalized structures.
  - `PlatformCore.visibleOfficialPaths(platform, limit=20)` returning featured-first paths capped to `limit` without deleting stored data.
  - `PlatformCore.shouldShowAllPathsLink(platform, limit=20)` returning true only when more than `limit` paths exist and `allPathsUrl` is present.

- [ ] **Step 1: Add failing normalization tests**

Append tests equivalent to:

```js
test('normalizeStaticPlatform preserves fields, official paths and research metadata',()=>{
  const row={
    id:'plat-x',name:{ar:'س',en:'X',tr:'X'},description:{ar:'',en:'',tr:''},
    fields:[{id:'ai',name:{ar:'الذكاء الاصطناعي',en:'Artificial Intelligence',tr:'Yapay Zekâ'},officialUrl:'https://example.com/ai'}],
    officialPaths:[{id:'ai-path',officialName:'AI Path',name:{ar:'مسار الذكاء الاصطناعي',en:'AI Path',tr:'Yapay Zekâ Yolu'},type:'learning-path',officialUrl:'https://example.com/paths/ai',fieldIds:['ai'],featured:true}],
    pathResearch:{lastVerified:'2026-09-04',fieldsSourceUrl:'https://example.com/topics',pathsSourceUrl:'https://example.com/paths',allPathsUrl:'https://example.com/paths'}
  };
  const out=PlatformCore.normalizeStaticPlatform(row);
  assert.equal(out.fields[0].id,'ai');
  assert.equal(out.fields[0].name.en,'Artificial Intelligence');
  assert.equal(out.officialPaths[0].officialName,'AI Path');
  assert.deepEqual(out.officialPaths[0].fieldIds,['ai']);
  assert.equal(out.pathResearch.lastVerified,'2026-09-04');
});
```

Also add:

```js
test('visibleOfficialPaths caps display at 20 and puts featured paths first',()=>{
  const officialPaths=Array.from({length:25},(_,i)=>({id:`p-${i}`,featured:i===24}));
  const visible=PlatformCore.visibleOfficialPaths({officialPaths},20);
  assert.equal(visible.length,20);
  assert.equal(visible[0].id,'p-24');
  assert.equal(PlatformCore.shouldShowAllPathsLink({officialPaths,pathResearch:{allPathsUrl:'https://example.com/paths'}},20),true);
  assert.equal(PlatformCore.shouldShowAllPathsLink({officialPaths,pathResearch:{}},20),false);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test tests/platform-core.test.cjs
```

Expected: FAIL because normalized output currently drops `fields`, `officialPaths`, and `pathResearch`, and display helpers do not exist.

- [ ] **Step 3: Implement minimal normalization**

In `js/platform-core.js` add focused helpers with behavior equivalent to:

```js
function normalizedUrl(value){
  const raw=text(value).trim();
  if(!raw)return'';
  try{const url=new URL(raw);return /^https?:$/.test(url.protocol)?url.href:''}catch{return''}
}
function normalizeField(row={}){
  return{id:text(row.id),name:localized(row.name),officialUrl:normalizedUrl(row.officialUrl)};
}
function normalizeOfficialPath(row={}){
  return{
    id:text(row.id),officialName:text(row.officialName),name:localized(row.name),type:text(row.type),
    officialUrl:normalizedUrl(row.officialUrl),fieldIds:array(row.fieldIds),featured:row.featured===true
  };
}
function normalizePathResearch(row={}){
  const src=row&&typeof row==='object'&&!Array.isArray(row)?row:{};
  return{
    lastVerified:text(src.lastVerified),
    fieldsSourceUrl:normalizedUrl(src.fieldsSourceUrl),
    pathsSourceUrl:normalizedUrl(src.pathsSourceUrl),
    allPathsUrl:normalizedUrl(src.allPathsUrl)
  };
}
function visibleOfficialPaths(platform={},limit=20){
  const list=[...(Array.isArray(platform.officialPaths)?platform.officialPaths:[])];
  return list.sort((a,b)=>Number(b&&b.featured===true)-Number(a&&a.featured===true)).slice(0,Math.max(0,limit));
}
function shouldShowAllPathsLink(platform={},limit=20){
  const count=Array.isArray(platform.officialPaths)?platform.officialPaths.length:0;
  return count>limit&&!!(platform.pathResearch&&platform.pathResearch.allPathsUrl);
}
```

Extend `baseShape()` with `fields:[]`, `officialPaths:[]`, and empty `pathResearch`, and extend `normalizeStaticPlatform()` to map them.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
node --test tests/platform-core.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Run the full existing suite**

Run:

```bash
node --test tests/*.test.cjs
```

Expected: PASS; no existing directory behavior regresses.

- [ ] **Step 6: Commit**

```bash
git add js/platform-core.js tests/platform-core.test.cjs
git commit -m "feat: normalize platform fields and official paths"
```

---

### Task 2: Validate Field / Path Structures and References

**Files:**
- Modify: `scripts/content-schema.cjs`
- Modify: `scripts/validate-content.cjs`
- Create: `tests/platform-paths-schema.test.cjs`

**Interfaces:**
- Produces `validatePlatformPathData(platform)` exported from `scripts/content-schema.cjs`.
- Validation is incremental: missing `fields`, `officialPaths`, or `pathResearch` is allowed while research is unfinished; when present, each structure must be valid.
- Completeness across all 110 platforms is handled by Task 3’s audit CLI, not by the base CMS validator.

- [ ] **Step 1: Write failing schema tests**

Create `tests/platform-paths-schema.test.cjs` with cases equivalent to:

```js
const test=require('node:test');
const assert=require('node:assert/strict');
const {validatePlatformPathData}=require('../scripts/content-schema.cjs');
const loc=(v)=>({ar:v,en:v,tr:v});
const base=()=>({id:'plat-x',fields:[{id:'ai',name:loc('AI'),officialUrl:'https://example.com/ai'}],officialPaths:[{id:'p1',officialName:'AI Path',name:loc('AI Path'),type:'learning-path',officialUrl:'https://example.com/p1',fieldIds:['ai']}],pathResearch:{lastVerified:'2026-09-04',allPathsUrl:'https://example.com/paths'}});

test('valid platform field/path data passes',()=>assert.equal(validatePlatformPathData(base()).id,'plat-x'));

test('official paths require direct http(s) URLs',()=>{
  const row=base();row.officialPaths[0].officialUrl='';
  assert.throws(()=>validatePlatformPathData(row),/officialUrl/);
});

test('path fieldIds must reference fields from the same platform',()=>{
  const row=base();row.officialPaths[0].fieldIds=['missing'];
  assert.throws(()=>validatePlatformPathData(row),/unknown fieldId/);
});

test('path types are restricted to the approved normalized set',()=>{
  const row=base();row.officialPaths[0].type='course';
  assert.throws(()=>validatePlatformPathData(row),/unsupported path type/);
});

test('more than 20 stored paths require allPathsUrl',()=>{
  const row=base();row.officialPaths=Array.from({length:21},(_,i)=>({...row.officialPaths[0],id:`p${i}`,officialUrl:`https://example.com/p${i}`}));row.pathResearch.allPathsUrl='';
  assert.throws(()=>validatePlatformPathData(row),/allPathsUrl/);
});
```

Also test duplicate field IDs, duplicate path IDs, invalid `YYYY-MM-DD`, and missing `ar/en/tr` strings.

- [ ] **Step 2: Run the new test and verify RED**

```bash
node --test tests/platform-paths-schema.test.cjs
```

Expected: FAIL because `validatePlatformPathData` does not exist.

- [ ] **Step 3: Implement validation**

Add constants and helpers in `scripts/content-schema.cjs`:

```js
const PATH_TYPES=Object.freeze(new Set([
  'learning-path','career-path','skill-path','professional-certificate','professional-program',
  'specialization','role-path','structured-series','other-official-path'
]));
function isHttpUrl(value){try{return /^https?:$/.test(new URL(String(value)).protocol)}catch{return false}}
function isDateOnly(value){return /^\d{4}-\d{2}-\d{2}$/.test(String(value||''))&&!Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())}
```

Implement `validatePlatformPathData(platform)` so that:
- absent new properties are allowed;
- present `fields` / `officialPaths` must be arrays;
- every field/path ID is non-empty and unique within that platform;
- every field/path `name` passes `isLocalized`;
- `officialUrl` is optional for fields but must be `http(s)` when non-empty;
- `officialUrl` is mandatory for every official path;
- `officialName` is non-empty;
- `type` is in `PATH_TYPES`;
- every `fieldIds` member exists in `fields`;
- `pathResearch.lastVerified`, when present, is a date-only string;
- research URLs, when present, are `http(s)`;
- if `officialPaths.length > 20`, `pathResearch.allPathsUrl` is a valid official URL.

Export `validatePlatformPathData` and call it for every platform inside `validateStableReferences()` or `validate-content.cjs`.

- [ ] **Step 4: Verify new tests GREEN**

```bash
node --test tests/platform-paths-schema.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Verify current `data.json` remains valid before research migration**

```bash
node scripts/validate-content.cjs
```

Expected: PASS even though many platforms do not have the new properties yet.

- [ ] **Step 6: Run full tests**

```bash
node --test tests/*.test.cjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add scripts/content-schema.cjs scripts/validate-content.cjs tests/platform-paths-schema.test.cjs
git commit -m "test: validate platform fields and official paths"
```

---

### Task 3: Add a Research Completeness Audit CLI

**Files:**
- Create: `scripts/platform-paths-audit.cjs`
- Create: `tests/platform-paths-audit.test.cjs`

**Interfaces:**
- CLI usage:
  - `node scripts/platform-paths-audit.cjs`
  - `node scripts/platform-paths-audit.cjs --range 1:20`
  - `node scripts/platform-paths-audit.cjs --range 1:20 --require-complete`
  - `node scripts/platform-paths-audit.cjs --require-complete`
- Range positions are 1-based indexes in the stable `data.platforms` array.
- A platform is “research complete” only when:
  - it owns `fields` as an array,
  - it owns `officialPaths` as an array,
  - it owns `pathResearch` as an object,
  - `pathResearch.lastVerified` is present.

- [ ] **Step 1: Write failing audit tests**

Create tests using a temporary fixture or exported pure functions:

```js
test('audit marks explicit empty officialPaths as complete when research metadata exists',()=>{
  const row={id:'plat-1',name:{en:'A'},fields:[],officialPaths:[],pathResearch:{lastVerified:'2026-09-04'}};
  assert.equal(Audit.isResearchComplete(row),true);
});

test('audit marks missing research properties incomplete',()=>{
  assert.equal(Audit.isResearchComplete({id:'plat-1',fields:[]}),false);
});

test('parseRange converts 1:20 to zero-based slice boundaries',()=>{
  assert.deepEqual(Audit.parseRange('1:20',110),{start:0,end:20});
});
```

- [ ] **Step 2: Run and verify RED**

```bash
node --test tests/platform-paths-audit.test.cjs
```

Expected: FAIL because the audit module does not exist.

- [ ] **Step 3: Implement CLI and pure helpers**

Implement `isResearchComplete`, `parseRange`, `summarize`, and a CLI entry point. Output one line per selected platform:

```text
001 plat-1 FutureLearn COMPLETE fields=8 paths=4 verified=2026-09-04
002 plat-2 Agora INCOMPLETE fields=? paths=? verified=-
```

When `--require-complete` is supplied, set `process.exitCode=1` if any selected record is incomplete.

- [ ] **Step 4: Verify tests GREEN**

```bash
node --test tests/platform-paths-audit.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Smoke the CLI against current data**

```bash
node scripts/platform-paths-audit.cjs --range 1:3
```

Expected: prints the first three platform IDs/names and currently reports them incomplete before the pilot research task.

- [ ] **Step 6: Commit**

```bash
git add scripts/platform-paths-audit.cjs tests/platform-paths-audit.test.cjs
git commit -m "chore: add platform path research audit"
```

---

### Task 4: Add Localized UI Labels and ContentAPI Helpers

**Files:**
- Modify: `data.json`
- Modify: `js/content-api.js`
- Test: `tests/content-api.test.cjs`

**Interfaces:**
- New CMS text under `siteText.platform`:
  - `fields`
  - `officialPaths`
  - `viewOfficialPath`
  - `viewAllOfficialPaths`
  - `pathTypes.<normalized-type>` for all nine types.
- New helpers:
  - `content.platformFieldName(field, lang?)`
  - `content.platformPathName(path, lang?)`
  - `content.pathTypeLabel(type, lang?)`

- [ ] **Step 1: Add failing ContentAPI tests**

Extend the fixture and tests:

```js
test('platform field/path helpers localize names and path types',()=>{
  const api=ContentAPI.create(fixture,'ar');
  const field={name:{ar:'الذكاء الاصطناعي',en:'Artificial Intelligence',tr:'Yapay Zekâ'}};
  const path={name:{ar:'مسار علم البيانات',en:'Data Science Path',tr:'Veri Bilimi Yolu'}};
  assert.equal(api.platformFieldName(field),'الذكاء الاصطناعي');
  assert.equal(api.platformPathName(path),'مسار علم البيانات');
  assert.equal(api.pathTypeLabel('learning-path'),'مسار تعليمي');
});
```

Add `fixture.siteText.platform.pathTypes['learning-path']` so the test is data-driven.

- [ ] **Step 2: Run focused test and verify RED**

```bash
node --test tests/content-api.test.cjs
```

Expected: FAIL because these helpers do not exist.

- [ ] **Step 3: Add exact localized labels to `data.json`**

Add:

```json
"fields": {"ar":"المجالات","en":"Fields & Subject Areas","tr":"Alanlar ve Konular"},
"officialPaths": {"ar":"المسارات الرسمية","en":"Official Learning Paths","tr":"Resmî Öğrenme Yolları"},
"viewOfficialPath": {"ar":"عرض المسار الرسمي","en":"View official path","tr":"Resmî yolu görüntüle"},
"viewAllOfficialPaths": {"ar":"عرض جميع المسارات الرسمية","en":"View all official paths","tr":"Tüm resmî yolları görüntüle"}
```

Add `pathTypes` labels:

```json
{
  "learning-path":{"ar":"مسار تعليمي","en":"Learning path","tr":"Öğrenme yolu"},
  "career-path":{"ar":"مسار مهني","en":"Career path","tr":"Kariyer yolu"},
  "skill-path":{"ar":"مسار مهارة","en":"Skill path","tr":"Beceri yolu"},
  "professional-certificate":{"ar":"شهادة مهنية","en":"Professional certificate","tr":"Profesyonel sertifika"},
  "professional-program":{"ar":"برنامج مهني","en":"Professional program","tr":"Profesyonel program"},
  "specialization":{"ar":"تخصص","en":"Specialization","tr":"Uzmanlık"},
  "role-path":{"ar":"مسار وظيفي","en":"Role-based path","tr":"Rol tabanlı yol"},
  "structured-series":{"ar":"سلسلة منظمة","en":"Structured series","tr":"Yapılandırılmış seri"},
  "other-official-path":{"ar":"مسار رسمي","en":"Official path","tr":"Resmî yol"}
}
```

- [ ] **Step 4: Implement ContentAPI helpers**

Inside `create()` add:

```js
function platformFieldName(field,override){return localized(field&&field.name,override||lang)}
function platformPathName(path,override){return localized(path&&path.name,override||lang)}
function pathTypeLabel(type,override){return localized(byPath(data&&data.siteText,`platform.pathTypes.${type}`),override||lang)}
```

Return all three helpers from the API object.

- [ ] **Step 5: Verify tests and content validation**

```bash
node --test tests/content-api.test.cjs
node scripts/validate-content.cjs
```

Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add data.json js/content-api.js tests/content-api.test.cjs
git commit -m "feat: localize platform fields and path labels"
```

---

### Task 5: Extend Platform Detail Model and Pure Markup Helpers

**Files:**
- Modify: `js/platform-detail.js`
- Test: `tests/platform-detail.test.cjs`

**Interfaces:**
- `buildDetailModel()` adds:
  - `fields: Array<{id,name,officialUrl}>`
  - `officialPaths: Array<{id,officialName,name,type,typeLabel,officialUrl,fieldIds,featured}>`
  - `showAllPathsLink:boolean`
  - `allPathsUrl:string`
- Export pure helpers for testability:
  - `fieldsMarkup(model, labels, safeUrlFn)`
  - `officialPathsMarkup(model, labels, safeUrlFn)`

- [ ] **Step 1: Add a representative model fixture**

Extend `platforms[0]` in `tests/platform-detail.test.cjs` with two fields and two official paths. Add `siteText.platform` path labels to the test `data` fixture.

- [ ] **Step 2: Add failing model tests**

```js
test('buildDetailModel keeps fields and official paths separate and localized',()=>{
  const api=ContentAPI.create(data,'ar');
  const model=PlatformDetail.buildDetailModel(platforms[0],'ar',new Date(),api);
  assert.equal(model.fields[0].name,'الذكاء الاصطناعي');
  assert.equal(model.officialPaths[0].name,'مسار علم البيانات');
  assert.equal(model.officialPaths[0].typeLabel,'مسار تعليمي');
  assert.notDeepEqual(model.fields,model.officialPaths);
});
```

Add a synthetic 25-path platform and assert:

```js
assert.equal(model.officialPaths.length,20);
assert.equal(model.showAllPathsLink,true);
assert.equal(model.allPathsUrl,'https://example.com/all-paths');
```

- [ ] **Step 3: Run focused tests and verify RED**

```bash
node --test tests/platform-detail.test.cjs
```

Expected: FAIL because the model has no new properties.

- [ ] **Step 4: Implement model mapping**

Use `PlatformCore.visibleOfficialPaths(platform,20)` and `ContentAPI` helpers. Sanitize stored URLs at render time using `content.safeUrl(...,{allowRelative:false})`; if a URL becomes empty, skip that link/card rather than emit unsafe markup.

- [ ] **Step 5: Add failing pure-markup tests**

Test that:
- `fieldsMarkup()` returns `''` for an empty field list;
- `officialPathsMarkup()` returns `''` for an empty path list;
- field links point to official field URLs when available;
- official path cards include the direct official path URL;
- markup contains a View All link only when `showAllPathsLink` is true;
- `officialName` appears as secondary text only when it materially differs from the localized display name.

- [ ] **Step 6: Implement pure markup helpers**

Use semantic sections such as:

```html
<section class="profile-learning profile-fields-section">
  <h2>...</h2>
  <div class="profile-field-chips">...</div>
</section>
<section class="profile-learning profile-paths-section">
  <h2>...</h2>
  <div class="profile-path-grid">...</div>
  <a class="btn btn-soft profile-paths-all" ...>...</a>
</section>
```

Do **not** add `data-edit-kind` markers to the new nested structures in this first implementation.

- [ ] **Step 7: Verify focused tests GREEN**

```bash
node --test tests/platform-detail.test.cjs
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add js/platform-detail.js tests/platform-detail.test.cjs
git commit -m "feat: model platform fields and official paths"
```

---

### Task 6: Integrate New Sections into the Detail Page and Style Them Responsively

**Files:**
- Modify: `js/platform-detail.js`
- Modify: `css/profile.css`
- Test: `tests/platform-detail.test.cjs`
- Test: `tests/release-smoke.test.cjs`

**Interfaces:**
- `renderProfile()` order becomes:
  1. hero/actions
  2. facts
  3. fields section, when non-empty
  4. official paths section, when non-empty
  5. existing editorial sections
  6. similar platforms outside `#platformProfile` as before

- [ ] **Step 1: Add failing integration assertions**

Add source-level/release assertions confirming that `renderProfile()` inserts `fieldsMarkup(...)` and `officialPathsMarkup(...)` between facts and `.profile-editorial`, and that no literal empty-state text for paths exists.

- [ ] **Step 2: Run focused tests and verify RED**

```bash
node --test tests/platform-detail.test.cjs tests/release-smoke.test.cjs
```

Expected: FAIL because the sections are not integrated.

- [ ] **Step 3: Integrate sections**

Compose:

```js
const learningSections=`${fieldsMarkup(model,labels,url=>content.safeUrl(url,{allowRelative:false}))}${officialPathsMarkup(model,labels,url=>content.safeUrl(url,{allowRelative:false}))}`;
```

Insert `learningSections` after `.profile-facts` and before `.profile-editorial`.

- [ ] **Step 4: Add responsive CSS**

Append focused styles to `css/profile.css` using the existing variables only. Required behavior:
- `.profile-learning` uses the same surface/border/radius language as current profile panels;
- `.profile-field-chips` is `display:flex; flex-wrap:wrap; gap:8px`;
- field chips are compact, keyboard-focusable links/spans;
- `.profile-path-grid` uses `repeat(2,minmax(0,1fr))` on desktop;
- path cards use existing `var(--surface)`, `var(--bg)`, `var(--border)`, and `var(--primary)` tokens;
- at `max-width:900px`, path grid becomes one column;
- official names and type labels use muted smaller text;
- no hard-coded theme colors are introduced.

- [ ] **Step 5: Run tests and syntax check**

```bash
node --test tests/platform-detail.test.cjs tests/release-smoke.test.cjs
node --check js/platform-detail.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add js/platform-detail.js css/profile.css tests/platform-detail.test.cjs tests/release-smoke.test.cjs
git commit -m "feat: render platform fields and official paths"
```

---

### Task 7: Expose Fields / Paths / Research Metadata in Decap CMS

**Files:**
- Modify: `scripts/generate-decap-config.cjs`
- Modify: `tests/decap-cms.test.cjs`
- Regenerate: `admin/config.yml`

**Interfaces:**
- Decap platform editor exposes three new groups:
  - `fields`
  - `officialPaths`
  - `pathResearch`
- Existing OAuth proxy lines remain byte-for-byte semantically unchanged.

- [ ] **Step 1: Add failing Decap assertions**

```js
test('Decap exposes platform fields, official paths and research metadata',()=>{
  const config=read('admin/config.yml');
  assert.match(config,/name: fields/);
  assert.match(config,/name: officialPaths/);
  assert.match(config,/name: pathResearch/);
  assert.match(config,/name: officialName/);
  assert.match(config,/name: fieldIds/);
  assert.match(config,/name: allPathsUrl/);
});
```

- [ ] **Step 2: Run and verify RED**

```bash
node --test tests/decap-cms.test.cjs
```

Expected: FAIL.

- [ ] **Step 3: Extend `platformFields(indent)`**

Generate a `fields` list with:
- stable `id`
- localized `name`
- optional `officialUrl`

Generate an `officialPaths` list with:
- stable `id`
- `officialName`
- localized `name`
- select `type` containing exactly the approved path types
- `officialUrl`
- string-list `fieldIds`
- boolean `featured`

Generate `pathResearch` object with:
- `lastVerified` date-only field
- optional `fieldsSourceUrl`
- optional `pathsSourceUrl`
- optional `allPathsUrl`

- [ ] **Step 4: Regenerate the Decap file**

```bash
node scripts/generate-decap-config.cjs
```

- [ ] **Step 5: Verify generated config and OAuth invariants**

```bash
node --test tests/decap-cms.test.cjs
node scripts/generate-decap-config.cjs --check
grep -n "dunya-decap-oauth.atomy8774.workers.dev" admin/config.yml
```

Expected: tests PASS, `--check` PASS, and the existing Decap OAuth host remains present.

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-decap-config.cjs tests/decap-cms.test.cjs admin/config.yml
git commit -m "feat: expose platform paths in Decap CMS"
```

---

### Task 8: Pilot Research — Platforms 1–3

**Files:**
- Modify: `data.json`

**Research scope:** The first three stable array records currently include `plat-1` FutureLearn, `plat-2` Agora, and `plat-3` IBM Skills Build.

**Interfaces:**
- Every researched platform ends with explicit `fields`, explicit `officialPaths` (including `[]` when none are verified), and `pathResearch.lastVerified`.

- [ ] **Step 1: List the pilot records from the audit CLI**

```bash
node scripts/platform-paths-audit.cjs --range 1:3
```

Expected: exactly three rows, confirming IDs/names before editing.

- [ ] **Step 2: Research FutureLearn from official pages only**

Start from `officialUrl` / `catalogUrl`, then inspect official subject/category/program pages. Store broad fields, verified structured paths/programs only, direct official URLs, localized names, and `pathResearch` source URLs. Do not treat individual FutureLearn courses as paths.

- [ ] **Step 3: Research Agora from official UNICEF Agora pages only**

Store broad training subject fields. If no official structured learning paths are verifiable, set `officialPaths: []` and omit `pathsSourceUrl`; this explicit empty list is the evidence that research was performed rather than forgotten.

- [ ] **Step 4: Research IBM SkillsBuild from official SkillsBuild pages only**

Store broad fields and only officially structured paths/programs. Link each stored path directly to its official page and connect `fieldIds` only to fields stored on the same platform.

- [ ] **Step 5: Validate the pilot**

```bash
node scripts/validate-content.cjs
node scripts/platform-paths-audit.cjs --range 1:3 --require-complete
node --test tests/platform-paths-schema.test.cjs tests/platform-detail.test.cjs
```

Expected: all commands PASS and pilot audit reports 3 complete records.

- [ ] **Step 6: Manually smoke all three detail pages locally or via branch preview**

Verify:
- fields and paths are separate;
- Agora shows no Official Paths section when `officialPaths` is empty;
- each visible official path opens the official domain;
- language switching shows AR/EN/TR labels.

- [ ] **Step 7: Commit**

```bash
git add data.json
git commit -m "content: research platform fields and paths batch 01-03"
```

---

### Task 9: Research Platforms 4–20

**Files:**
- Modify: `data.json`

- [ ] **Step 1: Freeze the exact batch list before research**

```bash
node scripts/platform-paths-audit.cjs --range 4:20
```

Copy the printed 17 IDs/names into the working notes for this execution checkpoint; array positions must not be reordered during the batch.

- [ ] **Step 2: Research every printed platform from its official domain**

For each record, inspect the official site/catalog and official Subjects/Topics/Categories/Skills pages to populate `fields`. Use normalized stable IDs; merge synonymous duplicate fields. `officialUrl` on a field is optional and should be stored only when an official field landing page exists.

- [ ] **Step 3: Research structured paths separately for every printed platform**

Search official Learning Paths, Career Paths, Skill Paths, Professional Programs, Professional Certificates, Specializations, role-based paths, or equivalent official structured sequences. Exclude standalone courses. Store `officialPaths: []` when nothing qualifies.

- [ ] **Step 4: Record research provenance**

Set `pathResearch.lastVerified` to the actual research date. Store canonical `fieldsSourceUrl` / `pathsSourceUrl` where available. If more than 20 paths are stored, add a valid `allPathsUrl`.

- [ ] **Step 5: Validate batch 4–20**

```bash
node scripts/validate-content.cjs
node scripts/platform-paths-audit.cjs --range 4:20 --require-complete
```

Expected: both PASS.

- [ ] **Step 6: Run full tests**

```bash
node --test tests/*.test.cjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add data.json
git commit -m "content: research platform fields and paths batch 04-20"
```

---

### Task 10: Research Platforms 21–40

**Files:**
- Modify: `data.json`

- [ ] **Step 1: List and freeze positions 21–40**

```bash
node scripts/platform-paths-audit.cjs --range 21:40
```

Expected: exactly 20 records.

- [ ] **Step 2: Populate broad fields from official category/topic/subject pages**

For all 20 printed records, store localized AR/EN/TR field names, stable field IDs, and official field URLs only when canonical field pages exist.

- [ ] **Step 3: Populate official structured paths independently of fields**

Use only official provider sources. Store the provider’s exact title in `officialName`, localized display labels in `name`, an approved normalized `type`, a direct `officialUrl`, and valid local `fieldIds`. Store an explicit empty array if no official paths are found.

- [ ] **Step 4: Add verification metadata for every record**

Every selected platform must have `pathResearch.lastVerified`; record canonical source pages when available and `allPathsUrl` whenever stored path count exceeds 20.

- [ ] **Step 5: Validate batch 21–40**

```bash
node scripts/validate-content.cjs
node scripts/platform-paths-audit.cjs --range 21:40 --require-complete
node --test tests/platform-paths-schema.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add data.json
git commit -m "content: research platform fields and paths batch 21-40"
```

---

### Task 11: Research Platforms 41–60

**Files:**
- Modify: `data.json`

- [ ] **Step 1: List the exact batch**

```bash
node scripts/platform-paths-audit.cjs --range 41:60
```

Expected: exactly 20 records.

- [ ] **Step 2: Research and normalize subject fields for all listed platforms**

Use official subject/category/topic/skill pages where possible. Do not create fields from one-off course titles. Merge duplicates such as “AI” and “Artificial Intelligence” into one field record when they represent the same official subject area.

- [ ] **Step 3: Research official paths for all listed platforms**

Accept only provider-defined structured sequences/programs. Preserve `officialName`, translate display name, map approved `type`, add direct official URL, and connect to stored field IDs. Use `officialPaths: []` when no qualifying paths exist.

- [ ] **Step 4: Record verification sources and date**

Populate `pathResearch` for all 20 records; require `allPathsUrl` for any platform storing more than 20 paths.

- [ ] **Step 5: Validate and test**

```bash
node scripts/validate-content.cjs
node scripts/platform-paths-audit.cjs --range 41:60 --require-complete
node --test tests/*.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add data.json
git commit -m "content: research platform fields and paths batch 41-60"
```

---

### Task 12: Research Platforms 61–80

**Files:**
- Modify: `data.json`

- [ ] **Step 1: List the exact batch**

```bash
node scripts/platform-paths-audit.cjs --range 61:80
```

Expected: exactly 20 records.

- [ ] **Step 2: Research fields for every selected platform using official sources**

Store broad learnable/professional domains, not individual classes. Localize each field into AR/EN/TR and retain an official field URL only when the platform publishes a canonical page for that field.

- [ ] **Step 3: Research official structured paths separately**

Check official Learning/Career/Skill/Role paths and multi-course professional programs. Exclude standalone courses and unofficial blog lists. For zero-result platforms, explicitly store `officialPaths: []`.

- [ ] **Step 4: Record pathResearch**

Set verification date and the best canonical official source URLs available. Add `allPathsUrl` when needed for the >20 rule.

- [ ] **Step 5: Validate and test**

```bash
node scripts/validate-content.cjs
node scripts/platform-paths-audit.cjs --range 61:80 --require-complete
node --test tests/platform-paths-schema.test.cjs tests/platform-detail.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add data.json
git commit -m "content: research platform fields and paths batch 61-80"
```

---

### Task 13: Research Platforms 81–100

**Files:**
- Modify: `data.json`

- [ ] **Step 1: List positions 81–100**

```bash
node scripts/platform-paths-audit.cjs --range 81:100
```

Expected: exactly 20 records.

- [ ] **Step 2: Research and store fields**

Use official catalog/category/topic pages, normalize duplicates, translate names, and preserve official URLs where available.

- [ ] **Step 3: Research and store official paths**

Verify every candidate on an official provider page. Store only structured paths/programs; never infer a path from multiple topic-related courses. Preserve original title in `officialName`, direct URL, normalized type, localized names, and valid `fieldIds`.

- [ ] **Step 4: Complete research metadata**

Every selected platform gets `pathResearch.lastVerified` and canonical source URLs where available. Any platform with more than 20 stored paths must have `allPathsUrl`.

- [ ] **Step 5: Validate the batch and entire suite**

```bash
node scripts/validate-content.cjs
node scripts/platform-paths-audit.cjs --range 81:100 --require-complete
node --test tests/*.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add data.json
git commit -m "content: research platform fields and paths batch 81-100"
```

---

### Task 14: Research Platforms 101–110

**Files:**
- Modify: `data.json`

- [ ] **Step 1: List the final ten records**

```bash
node scripts/platform-paths-audit.cjs --range 101:110
```

Expected: exactly 10 records.

- [ ] **Step 2: Research official subject fields for all ten**

Use official source pages, broad fields only, localized names, stable IDs, and canonical official URLs where they exist.

- [ ] **Step 3: Research official structured paths for all ten**

Use the same strict provider-defined path criteria. Store direct URLs, official names, localized names, approved types, and valid field references; explicitly store `[]` when none qualify.

- [ ] **Step 4: Record research metadata for all ten**

Populate `lastVerified`, source URLs where available, and `allPathsUrl` for large stored catalogs.

- [ ] **Step 5: Validate final batch**

```bash
node scripts/validate-content.cjs
node scripts/platform-paths-audit.cjs --range 101:110 --require-complete
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add data.json
git commit -m "content: research platform fields and paths batch 101-110"
```

---

### Task 15: Enforce Final 110-Platform Completeness

**Files:**
- Modify: `tests/full-cms-schema.test.cjs`
- Test: `tests/full-cms-schema.test.cjs`

**Interfaces:**
- After all batches, every platform must explicitly have `fields`, `officialPaths`, and `pathResearch.lastVerified`.

- [ ] **Step 1: Add the final completeness test**

Append:

```js
test('all 110 platforms have completed field/path research',()=>{
  for(const platform of data.platforms){
    assert.equal(Array.isArray(platform.fields),true,`${platform.id}: fields missing`);
    assert.equal(Array.isArray(platform.officialPaths),true,`${platform.id}: officialPaths missing`);
    assert.ok(platform.pathResearch&&/^\d{4}-\d{2}-\d{2}$/.test(platform.pathResearch.lastVerified||''),`${platform.id}: pathResearch.lastVerified missing`);
    for(const field of platform.fields)assert.deepEqual(Object.keys(field.name).sort(),['ar','en','tr'],`${platform.id}/${field.id}: field translation shape`);
    for(const path of platform.officialPaths)assert.deepEqual(Object.keys(path.name).sort(),['ar','en','tr'],`${platform.id}/${path.id}: path translation shape`);
  }
});
```

- [ ] **Step 2: Run the final audit and completeness test**

```bash
node scripts/platform-paths-audit.cjs --require-complete
node --test tests/full-cms-schema.test.cjs
```

Expected: all 110 records COMPLETE and test PASS.

- [ ] **Step 3: Run base validation and Decap consistency**

```bash
node scripts/validate-content.cjs
node scripts/generate-decap-config.cjs --check
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/full-cms-schema.test.cjs
git commit -m "test: require platform field and path research completeness"
```

---

### Task 16: Final Verification, Diff Review, and Release Smoke

**Files:**
- Verify all changed files; no new feature code should be added in this task unless a failing verification exposes a defect.

- [ ] **Step 1: Run the exact CI-equivalent test command**

```bash
node --test tests/*.test.cjs
```

Expected: PASS with zero failed tests.

- [ ] **Step 2: Run syntax validation**

```bash
for f in js/*.js scripts/*.cjs; do node --check "$f"; done
for f in inline-worker/src/*.mjs; do node --check "$f"; done
```

Expected: no syntax errors.

- [ ] **Step 3: Validate all content and generated CMS config**

```bash
node scripts/validate-content.cjs
node scripts/platform-paths-audit.cjs --require-complete
node scripts/generate-decap-config.cjs --check
```

Expected: all PASS; audit reports 110 complete platforms.

- [ ] **Step 4: Verify no inline OAuth / Worker scope drift**

```bash
git diff main...HEAD -- inline-worker js/edit-descriptors.js js/inline-editor.js js/inline-editor-api.js js/inline-editor-config.js
```

Expected: no changes to Worker allowlist/auth infrastructure or inline-editor authorization logic.

- [ ] **Step 5: Review only intentional data changes**

```bash
git diff --stat main...HEAD
git diff --check main...HEAD
```

Expected: changed files match this plan; `git diff --check` returns no whitespace errors.

- [ ] **Step 6: Browser smoke representative cases**

Verify at minimum:
- `platform.html?id=plat-1&lang=ar` — populated fields and any verified paths;
- `platform.html?id=plat-2&lang=en` — no empty Official Paths section if no verified paths;
- a platform with >20 stored paths — exactly 20 cards plus View All official link;
- same representative pages in Turkish;
- normal `index.html` and `explore.html` still load and navigate to platform detail pages.

- [ ] **Step 7: Verify branch CI**

Push the branch and wait for `.github/workflows/test.yml`; expected conclusion: success.

- [ ] **Step 8: Commit only if verification required a correction**

If a defect was found, fix it with a failing regression test first, then commit the focused correction. If no defect was found, do not create an empty verification commit.

---

## Research Quality Checklist Applied to Every Batch

For each of the 110 platforms, the executor must answer all of these before marking it complete:

- Is each `field` a broad subject/professional area rather than a single course?
- Does each stored official path exist on an official provider-controlled page?
- Is the candidate genuinely a structured path/program/series rather than a standalone course?
- Is `officialName` copied from the official source wording?
- Are `name.ar`, `name.en`, and `name.tr` present and semantically faithful?
- Does every `fieldIds` reference exist inside the same platform’s `fields` array?
- Are duplicate fields and duplicate paths removed?
- Is every path URL direct and usable rather than just the provider homepage?
- Is `pathResearch.lastVerified` set to the research date?
- Are canonical source URLs recorded where the provider exposes them?
- If more than 20 paths are stored, is `allPathsUrl` present?
- If no paths exist, is `officialPaths: []` explicitly stored so the UI hides the section intentionally?

## Definition of Done

The work is done only when all of the following are true:

1. Every one of the 110 platform records has been researched and passes `--require-complete`.
2. Fields and official paths are stored as separate structures.
3. No standalone courses were invented into paths.
4. No Official Paths section appears for platforms with zero verified paths.
5. Path display is capped at 20 while stored research is retained.
6. Large path sets have a valid official “View all” destination.
7. AR/EN/TR labels render correctly.
8. Decap can edit the new structures without exposing secrets.
9. Existing inline-editor authorization/allowlist code is unchanged.
10. `node --test tests/*.test.cjs`, syntax checks, `validate-content.cjs`, audit completeness, Decap `--check`, and branch CI all pass.
