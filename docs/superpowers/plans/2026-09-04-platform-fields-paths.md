# Platform Fields and Official Paths Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Research all 110 platforms against official sources, store broad subject fields and verified official learning paths separately, and render both cleanly on each platform detail page in Arabic, English, and Turkish.

**Architecture:** Extend the existing normalized platform shape in `js/platform-core.js`, validate raw CMS data incrementally through `scripts/content-schema.cjs`, track research completeness with a deterministic audit CLI, and render the two new sections through `js/platform-detail.js`. All researched content stays in `data.json`; Decap gains explicit editors for the new structures; the inline editor/Worker allowlist stays unchanged in this first implementation.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js 22, `node:test`, JSON CMS data, Decap CMS, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-04-platform-fields-paths-design.md`

## Global Constraints

- The site contains exactly **110 platforms**; platform IDs must remain stable and unique.
- Store platform **fields / subject areas** separately from **official learning paths**.
- Official paths must come from official platform sources; standalone courses must not be promoted into paths.
- Every stored official path requires a direct official `http` or `https` URL.
- Supported locales remain exactly `ar`, `en`, and `tr`.
- Supported normalized path types are exactly: `learning-path`, `career-path`, `skill-path`, `professional-certificate`, `professional-program`, `specialization`, `role-path`, `structured-series`, `other-official-path`.
- Hide the Official Paths section when `officialPaths` is missing or empty.
- Hide the Fields section when `fields` is missing or empty.
- Display at most 20 official paths on a platform page. If more than 20 verified paths are stored, `pathResearch.allPathsUrl` is required and the UI must show a localized “View all official paths” action.
- Preserve the source title in `officialName`; translated display labels live in `name.ar/en/tr`.
- Research metadata uses `pathResearch.lastVerified` in `YYYY-MM-DD` format.
- The first implementation does **not** add inline-pencil editing for fields/paths and must not weaken the Worker allowlist.
- Existing Decap OAuth and inline OAuth URLs must remain unchanged.
- Existing platform facts, editorial content, favorites, sharing, SEO, similar-platform behavior, navigation, and `data.json` loading must continue working.
- Use TDD for code changes. Research-content batches must pass structural validation and the completeness audit before commit.

---

## File Structure

**Modify**
- `js/platform-core.js` — normalize `fields`, `officialPaths`, `pathResearch`; expose display-cap helpers.
- `js/content-api.js` — localize field/path labels and normalized path-type labels.
- `js/platform-detail.js` — build and render separate Fields and Official Paths sections.
- `css/profile.css` — responsive field chips and path cards.
- `data.json` — new localized UI text and researched content for all 110 platforms.
- `scripts/content-schema.cjs` — optional incremental validation plus path/field referential integrity.
- `scripts/validate-content.cjs` — existing full-content validation entry point; no duplicate path validation logic.
- `scripts/generate-decap-config.cjs` — Decap editors for new platform structures.
- `admin/config.yml` — regenerated output only.
- `tests/platform-core.test.cjs`
- `tests/content-api.test.cjs`
- `tests/platform-detail.test.cjs`
- `tests/decap-cms.test.cjs`
- `tests/full-cms-schema.test.cjs`
- `tests/release-smoke.test.cjs`

**Create**
- `scripts/platform-paths-audit.cjs`
- `tests/platform-paths-schema.test.cjs`
- `tests/platform-paths-audit.test.cjs`

**Do not modify**
- `inline-worker/src/*`
- `js/edit-descriptors.js`
- `js/inline-editor.js`
- `js/inline-editor-api.js`
- `js/inline-editor-config.js`
- OAuth host configuration

---

### Task 1: Normalize Fields, Paths, and Research Metadata

**Files:**
- Modify: `js/platform-core.js`
- Test: `tests/platform-core.test.cjs`

**Interfaces:**
- Raw field: `{id,name:{ar,en,tr},officialUrl?}`
- Raw official path: `{id,officialName,name:{ar,en,tr},type,officialUrl,fieldIds,featured?}`
- Research metadata: `{lastVerified?,fieldsSourceUrl?,pathsSourceUrl?,allPathsUrl?}`
- Produces:
  - `normalizeStaticPlatform(row)` with normalized `fields`, `officialPaths`, `pathResearch`.
  - `visibleOfficialPaths(platform, limit=20)`.
  - `shouldShowAllPathsLink(platform, limit=20)`.

- [ ] **Step 1: Write failing normalization tests**

Append to `tests/platform-core.test.cjs`:

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

test('visibleOfficialPaths caps display at 20 and puts featured paths first',()=>{
  const officialPaths=Array.from({length:25},(_,i)=>({id:`p-${i}`,featured:i===24}));
  const visible=PlatformCore.visibleOfficialPaths({officialPaths},20);
  assert.equal(visible.length,20);
  assert.equal(visible[0].id,'p-24');
  assert.equal(PlatformCore.shouldShowAllPathsLink({officialPaths,pathResearch:{allPathsUrl:'https://example.com/paths'}},20),true);
  assert.equal(PlatformCore.shouldShowAllPathsLink({officialPaths,pathResearch:{}},20),false);
});
```

- [ ] **Step 2: Run RED**

```bash
node --test tests/platform-core.test.cjs
```

Expected: FAIL because current normalization drops the new structures and the display helpers do not exist.

- [ ] **Step 3: Implement minimal helpers**

Add to `js/platform-core.js`:

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
  return{id:text(row.id),officialName:text(row.officialName),name:localized(row.name),type:text(row.type),officialUrl:normalizedUrl(row.officialUrl),fieldIds:array(row.fieldIds),featured:row.featured===true};
}
function normalizePathResearch(row={}){
  const src=row&&typeof row==='object'&&!Array.isArray(row)?row:{};
  return{lastVerified:text(src.lastVerified),fieldsSourceUrl:normalizedUrl(src.fieldsSourceUrl),pathsSourceUrl:normalizedUrl(src.pathsSourceUrl),allPathsUrl:normalizedUrl(src.allPathsUrl)};
}
function visibleOfficialPaths(platform={},limit=20){
  return [...(Array.isArray(platform.officialPaths)?platform.officialPaths:[])]
    .sort((a,b)=>Number(b&&b.featured===true)-Number(a&&a.featured===true))
    .slice(0,Math.max(0,limit));
}
function shouldShowAllPathsLink(platform={},limit=20){
  const count=Array.isArray(platform.officialPaths)?platform.officialPaths.length:0;
  return count>limit&&!!(platform.pathResearch&&platform.pathResearch.allPathsUrl);
}
```

Extend `baseShape()` with `fields:[]`, `officialPaths:[]`, and an empty normalized `pathResearch`. Extend `normalizeStaticPlatform()` to map the raw arrays through the helpers.

- [ ] **Step 4: Run GREEN**

```bash
node --test tests/platform-core.test.cjs
node --test tests/*.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/platform-core.js tests/platform-core.test.cjs
git commit -m "feat: normalize platform fields and official paths"
```

---

### Task 2: Validate New Structures Incrementally

**Files:**
- Modify: `scripts/content-schema.cjs`
- Test: `tests/platform-paths-schema.test.cjs`

**Interfaces:**
- Export `validatePlatformPathData(platform)` from `scripts/content-schema.cjs`.
- `validateStableReferences(data)` must call `validatePlatformPathData(row)` for every platform before returning `data`.
- Missing new properties remain allowed until the research pass reaches that platform.

- [ ] **Step 1: Create failing schema tests**

Create `tests/platform-paths-schema.test.cjs`:

```js
const test=require('node:test');
const assert=require('node:assert/strict');
const {validatePlatformPathData}=require('../scripts/content-schema.cjs');
const loc=v=>({ar:v,en:v,tr:v});
const base=()=>({
  id:'plat-x',
  fields:[{id:'ai',name:loc('AI'),officialUrl:'https://example.com/ai'}],
  officialPaths:[{id:'p1',officialName:'AI Path',name:loc('AI Path'),type:'learning-path',officialUrl:'https://example.com/p1',fieldIds:['ai']}],
  pathResearch:{lastVerified:'2026-09-04',allPathsUrl:'https://example.com/paths'}
});

test('valid platform field/path data passes',()=>assert.equal(validatePlatformPathData(base()).id,'plat-x'));
test('official paths require direct http(s) URLs',()=>{const row=base();row.officialPaths[0].officialUrl='';assert.throws(()=>validatePlatformPathData(row),/officialUrl/)});
test('path fieldIds must resolve inside the same platform',()=>{const row=base();row.officialPaths[0].fieldIds=['missing'];assert.throws(()=>validatePlatformPathData(row),/unknown fieldId/)});
test('path types reject standalone course',()=>{const row=base();row.officialPaths[0].type='course';assert.throws(()=>validatePlatformPathData(row),/unsupported path type/)});
test('more than 20 paths require allPathsUrl',()=>{const row=base();row.officialPaths=Array.from({length:21},(_,i)=>({...row.officialPaths[0],id:`p${i}`,officialUrl:`https://example.com/p${i}`}));row.pathResearch.allPathsUrl='';assert.throws(()=>validatePlatformPathData(row),/allPathsUrl/)});
```

Add cases for duplicate field IDs, duplicate path IDs, invalid `YYYY-MM-DD`, missing localized strings, and invalid research URLs.

- [ ] **Step 2: Run RED**

```bash
node --test tests/platform-paths-schema.test.cjs
```

Expected: FAIL because the exported validator does not exist.

- [ ] **Step 3: Implement exact validation rules**

Add:

```js
const PATH_TYPES=Object.freeze(new Set(['learning-path','career-path','skill-path','professional-certificate','professional-program','specialization','role-path','structured-series','other-official-path']));
function isHttpUrl(value){try{return /^https?:$/.test(new URL(String(value)).protocol)}catch{return false}}
function isDateOnly(value){return /^\d{4}-\d{2}-\d{2}$/.test(String(value||''))&&!Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())}
```

`validatePlatformPathData(platform)` must enforce:
- present `fields` and `officialPaths` are arrays;
- unique, non-empty field IDs and path IDs;
- every field/path `name` passes `isLocalized`;
- field `officialUrl`, when non-empty, is `http(s)`;
- each path has non-empty `officialName`, approved `type`, direct `http(s)` `officialUrl`, and array `fieldIds`;
- each `fieldIds` member resolves to a field on the same platform;
- `pathResearch`, when present, is an object;
- `lastVerified`, when non-empty, passes `isDateOnly`;
- research URLs, when non-empty, are `http(s)`;
- more than 20 paths requires valid `pathResearch.allPathsUrl`.

At the end of the existing `for (const row of data.platforms)` loop in `validateStableReferences(data)`, call:

```js
validatePlatformPathData(row);
```

Export `PATH_TYPES`, `validatePlatformPathData` with the existing schema exports.

- [ ] **Step 4: Run GREEN and current CMS validation**

```bash
node --test tests/platform-paths-schema.test.cjs
node scripts/validate-content.cjs
node --test tests/*.test.cjs
```

Expected: PASS; existing platforms without new properties remain valid during migration.

- [ ] **Step 5: Commit**

```bash
git add scripts/content-schema.cjs tests/platform-paths-schema.test.cjs
git commit -m "test: validate platform fields and official paths"
```

---

### Task 3: Add Research Completeness Audit CLI

**Files:**
- Create: `scripts/platform-paths-audit.cjs`
- Create: `tests/platform-paths-audit.test.cjs`

**Interfaces:**
- Export exactly: `isResearchComplete`, `parseRange`, `summarize`, `main`.
- CLI forms:
  - `node scripts/platform-paths-audit.cjs`
  - `node scripts/platform-paths-audit.cjs --range 1:20`
  - `node scripts/platform-paths-audit.cjs --range 1:20 --require-complete`
  - `node scripts/platform-paths-audit.cjs --require-complete`

- [ ] **Step 1: Write failing pure-function tests**

```js
const test=require('node:test');
const assert=require('node:assert/strict');
const Audit=require('../scripts/platform-paths-audit.cjs');

test('explicit empty officialPaths can be research-complete',()=>{
  const row={id:'plat-1',fields:[],officialPaths:[],pathResearch:{lastVerified:'2026-09-04'}};
  assert.equal(Audit.isResearchComplete(row),true);
});
test('missing properties are incomplete',()=>assert.equal(Audit.isResearchComplete({id:'plat-1',fields:[]}),false));
test('1:20 maps to zero-based slice',()=>assert.deepEqual(Audit.parseRange('1:20',110),{start:0,end:20}));
```

- [ ] **Step 2: Run RED**

```bash
node --test tests/platform-paths-audit.test.cjs
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the audit**

`isResearchComplete(row)` returns true only if the record owns array `fields`, array `officialPaths`, object `pathResearch`, and a non-empty `lastVerified`.

`parseRange(raw,total)` accepts `N:M`, rejects zero/negative/reversed/out-of-bounds ranges, and returns `{start:N-1,end:M}`.

`summarize(rows,startIndex=0)` emits objects containing `index,id,name,status,fieldsCount,pathsCount,lastVerified`.

`main()` loads `data.json`, applies optional range, prints rows in this stable form:

```text
001 plat-1 FutureLearn COMPLETE fields=8 paths=4 verified=2026-09-04
002 plat-2 Agora INCOMPLETE fields=? paths=? verified=-
```

With `--require-complete`, set `process.exitCode=1` if any selected row is incomplete.

- [ ] **Step 4: Run GREEN and smoke current data**

```bash
node --test tests/platform-paths-audit.test.cjs
node scripts/platform-paths-audit.cjs --range 1:3
```

Expected: tests PASS; pre-research rows print as incomplete.

- [ ] **Step 5: Commit**

```bash
git add scripts/platform-paths-audit.cjs tests/platform-paths-audit.test.cjs
git commit -m "chore: add platform path research audit"
```

---

### Task 4: Add Localized UI Labels and Content Helpers

**Files:**
- Modify: `data.json`
- Modify: `js/content-api.js`
- Test: `tests/content-api.test.cjs`

**Interfaces:**
- Add under `siteText.platform`: `fields`, `officialPaths`, `viewOfficialPath`, `viewAllOfficialPaths`, `pathTypes`.
- Produce `platformFieldName(field,override?)`, `platformPathName(path,override?)`, `pathTypeLabel(type,override?)`.

- [ ] **Step 1: Write failing helper test**

```js
test('platform field/path helpers localize names and path types',()=>{
  const api=ContentAPI.create(fixture,'ar');
  assert.equal(api.platformFieldName({name:{ar:'الذكاء الاصطناعي',en:'Artificial Intelligence',tr:'Yapay Zekâ'}}),'الذكاء الاصطناعي');
  assert.equal(api.platformPathName({name:{ar:'مسار علم البيانات',en:'Data Science Path',tr:'Veri Bilimi Yolu'}}),'مسار علم البيانات');
  assert.equal(api.pathTypeLabel('learning-path'),'مسار تعليمي');
});
```

Extend the fixture with `siteText.platform.pathTypes['learning-path']`.

- [ ] **Step 2: Run RED**

```bash
node --test tests/content-api.test.cjs
```

Expected: FAIL.

- [ ] **Step 3: Add localized content exactly**

```json
"fields":{"ar":"المجالات","en":"Fields & Subject Areas","tr":"Alanlar ve Konular"},
"officialPaths":{"ar":"المسارات الرسمية","en":"Official Learning Paths","tr":"Resmî Öğrenme Yolları"},
"viewOfficialPath":{"ar":"عرض المسار الرسمي","en":"View official path","tr":"Resmî yolu görüntüle"},
"viewAllOfficialPaths":{"ar":"عرض جميع المسارات الرسمية","en":"View all official paths","tr":"Tüm resmî yolları görüntüle"}
```

Add all nine `pathTypes` triplets:
- learning path: `مسار تعليمي / Learning path / Öğrenme yolu`
- career path: `مسار مهني / Career path / Kariyer yolu`
- skill path: `مسار مهارة / Skill path / Beceri yolu`
- professional certificate: `شهادة مهنية / Professional certificate / Profesyonel sertifika`
- professional program: `برنامج مهني / Professional program / Profesyonel program`
- specialization: `تخصص / Specialization / Uzmanlık`
- role path: `مسار وظيفي / Role-based path / Rol tabanlı yol`
- structured series: `سلسلة منظمة / Structured series / Yapılandırılmış seri`
- other official path: `مسار رسمي / Official path / Resmî yol`

- [ ] **Step 4: Implement helpers**

```js
function platformFieldName(field,override){return localized(field&&field.name,override||lang)}
function platformPathName(path,override){return localized(path&&path.name,override||lang)}
function pathTypeLabel(type,override){return localized(byPath(data&&data.siteText,`platform.pathTypes.${type}`),override||lang)}
```

Return them from the API object.

- [ ] **Step 5: Run GREEN**

```bash
node --test tests/content-api.test.cjs
node scripts/validate-content.cjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add data.json js/content-api.js tests/content-api.test.cjs
git commit -m "feat: localize platform fields and path labels"
```

---

### Task 5: Extend Platform Detail Model and Testable Markup

**Files:**
- Modify: `js/platform-detail.js`
- Test: `tests/platform-detail.test.cjs`

**Interfaces:**
- `buildDetailModel()` adds `fields`, visible `officialPaths`, `showAllPathsLink`, `allPathsUrl`.
- Export exactly:
  - `fieldsMarkup(model,{title},safeUrlFn)`
  - `officialPathsMarkup(model,{title,viewPath,viewAll},safeUrlFn)`

- [ ] **Step 1: Add representative fixture data**

Extend `platforms[0]` in `tests/platform-detail.test.cjs` with:

```js
fields:[
  {id:'ai',name:loc('الذكاء الاصطناعي','Artificial Intelligence','Yapay Zekâ'),officialUrl:'https://example.com/ai'},
  {id:'data',name:loc('علم البيانات','Data Science','Veri Bilimi'),officialUrl:''}
],
officialPaths:[
  {id:'data-path',officialName:'Data Science Path',name:loc('مسار علم البيانات','Data Science Path','Veri Bilimi Yolu'),type:'learning-path',officialUrl:'https://example.com/data-path',fieldIds:['data'],featured:false}
],
pathResearch:{lastVerified:'2026-09-04',allPathsUrl:'https://example.com/all-paths'}
```

Add matching `siteText.platform` labels to the fixture.

- [ ] **Step 2: Add failing model assertions**

```js
test('detail model keeps fields and official paths separate and localized',()=>{
  const api=ContentAPI.create(data,'ar');
  const model=PlatformDetail.buildDetailModel(platforms[0],'ar',new Date(),api);
  assert.equal(model.fields[0].name,'الذكاء الاصطناعي');
  assert.equal(model.officialPaths[0].name,'مسار علم البيانات');
  assert.equal(model.officialPaths[0].typeLabel,'مسار تعليمي');
});
```

Add a synthetic 25-path platform and assert visible paths length `20`, `showAllPathsLink===true`, and `allPathsUrl` is preserved.

- [ ] **Step 3: Run RED**

```bash
node --test tests/platform-detail.test.cjs
```

Expected: FAIL.

- [ ] **Step 4: Implement model mapping**

Map fields using `contentApi.platformFieldName`. Map `PlatformCore.visibleOfficialPaths(platform,20)` using `platformPathName` and `pathTypeLabel`. Preserve `officialName`, `type`, `officialUrl`, `fieldIds`, `featured`.

Set:

```js
showAllPathsLink:PlatformCore.shouldShowAllPathsLink(platform,20),
allPathsUrl:platform.pathResearch&&platform.pathResearch.allPathsUrl||''
```

- [ ] **Step 5: Add failing pure-markup tests**

Assert:
- empty fields => `fieldsMarkup(...) === ''`;
- empty official paths => `officialPathsMarkup(...) === ''`;
- valid field URLs become links;
- fields without URLs render non-link chips;
- each path card links to its direct official URL;
- View All renders only when `showAllPathsLink` is true;
- original `officialName` appears as secondary text only when `String(officialName).trim().toLocaleLowerCase()` differs from `String(name).trim().toLocaleLowerCase()`.

- [ ] **Step 6: Implement exact markup signatures**

```js
function fieldsMarkup(model,{title},safeUrlFn){ /* return '' when model.fields is empty */ }
function officialPathsMarkup(model,{title,viewPath,viewAll},safeUrlFn){ /* return '' when paths are empty */ }
```

Use semantic containers:

```html
<section class="profile-learning profile-fields-section"><h2>...</h2><div class="profile-field-chips">...</div></section>
<section class="profile-learning profile-paths-section"><h2>...</h2><div class="profile-path-grid">...</div>...</section>
```

Do not add inline-editor `data-edit-*` markers to nested field/path structures.

- [ ] **Step 7: Run GREEN**

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

### Task 6: Integrate and Style the New Detail Sections

**Files:**
- Modify: `js/platform-detail.js`
- Modify: `css/profile.css`
- Test: `tests/platform-detail.test.cjs`
- Test: `tests/release-smoke.test.cjs`

- [ ] **Step 1: Add failing integration assertions**

Confirm source/markup order is facts → fields → paths → editorial, and no empty-state message is emitted for missing paths.

- [ ] **Step 2: Run RED**

```bash
node --test tests/platform-detail.test.cjs tests/release-smoke.test.cjs
```

Expected: FAIL because render integration does not exist.

- [ ] **Step 3: Integrate with explicitly defined labels**

Inside `renderProfile()` define:

```js
const fieldsHtml=fieldsMarkup(model,{title:getText('fields')},url=>content.safeUrl(url,{allowRelative:false}));
const pathsHtml=officialPathsMarkup(model,{
  title:getText('officialPaths'),
  viewPath:getText('viewOfficialPath'),
  viewAll:getText('viewAllOfficialPaths')
},url=>content.safeUrl(url,{allowRelative:false}));
const learningSections=`${fieldsHtml}${pathsHtml}`;
```

Insert `learningSections` immediately after `.profile-facts` and before `.profile-editorial`.

- [ ] **Step 4: Add responsive CSS**

Use existing design tokens only:
- `.profile-learning`: surface, border, 24px-radius family, margin-top 16px;
- `.profile-field-chips`: `display:flex;flex-wrap:wrap;gap:8px`;
- `.profile-field-chip`: compact pill, visible focus state inherited from `.profile-page :focus-visible`;
- `.profile-path-grid`: `display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px`;
- `.profile-path-card`: border/background/radius using existing variables;
- `.profile-path-type` and `.profile-path-official-name`: smaller muted text;
- `@media(max-width:900px)`: `.profile-path-grid{grid-template-columns:1fr}`.

- [ ] **Step 5: Run GREEN and syntax**

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

### Task 7: Expose New Structures in Decap CMS

**Files:**
- Modify: `scripts/generate-decap-config.cjs`
- Modify: `tests/decap-cms.test.cjs`
- Regenerate: `admin/config.yml`

- [ ] **Step 1: Add failing Decap test**

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

- [ ] **Step 2: Run RED**

```bash
node --test tests/decap-cms.test.cjs
```

Expected: FAIL.

- [ ] **Step 3: Extend `platformFields(indent)`**

Generate:
- `fields` list: `id`, localized `name`, optional `officialUrl`;
- `officialPaths` list: `id`, `officialName`, localized `name`, approved-type select, `officialUrl`, `fieldIds` string list, `featured` boolean;
- `pathResearch` object: date-only `lastVerified`, optional `fieldsSourceUrl`, optional `pathsSourceUrl`, optional `allPathsUrl`.

- [ ] **Step 4: Regenerate and verify**

```bash
node scripts/generate-decap-config.cjs
node --test tests/decap-cms.test.cjs
node scripts/generate-decap-config.cjs --check
grep -n "dunya-decap-oauth.atomy8774.workers.dev" admin/config.yml
```

Expected: PASS and existing Decap OAuth host remains present.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-decap-config.cjs tests/decap-cms.test.cjs admin/config.yml
git commit -m "feat: expose platform paths in Decap CMS"
```

---

### Task 8: Pilot Research — Platforms 1–3

**Files:**
- Modify: `data.json`

**Scope:** `plat-1` FutureLearn, `plat-2` Agora, `plat-3` IBM Skills Build.

- [ ] **Step 1: Confirm stable records**

```bash
node scripts/platform-paths-audit.cjs --range 1:3
```

Expected: exactly the three IDs/names above.

- [ ] **Step 2: Research FutureLearn from official pages only**

Use the platform’s official subject/category/program pages. Store broad fields, qualifying structured official programs/paths only, direct official URLs, localized names, and provenance. Never treat a standalone FutureLearn course as a path.

- [ ] **Step 3: Research UNICEF Agora from official Agora pages only**

Store broad fields. If no provider-defined structured paths qualify, store `officialPaths: []`; do not invent a path from related courses.

- [ ] **Step 4: Research IBM SkillsBuild from official SkillsBuild pages only**

Store broad fields and provider-defined structured pathways/programs only, with direct links and valid local `fieldIds`.

- [ ] **Step 5: Set research metadata and validate**

Every pilot row gets explicit `fields`, explicit `officialPaths`, and `pathResearch.lastVerified` equal to the actual research date.

```bash
node scripts/validate-content.cjs
node scripts/platform-paths-audit.cjs --range 1:3 --require-complete
node --test tests/platform-paths-schema.test.cjs tests/platform-detail.test.cjs
```

Expected: PASS and 3 COMPLETE rows.

- [ ] **Step 6: Browser smoke the pilot**

Verify separate sections, no empty path section for a zero-path pilot, correct official destinations, and AR/EN/TR switching.

- [ ] **Step 7: Commit**

```bash
git add data.json
git commit -m "content: research platform fields and paths batch 01-03"
```

---

### Task 9: Research Platforms 4–20

**Files:**
- Modify: `data.json`

- [ ] **Step 1: Freeze batch list**

```bash
node scripts/platform-paths-audit.cjs --range 4:20
```

Expected: 17 rows. Do not reorder the platform array during research.

- [ ] **Step 2: Research fields for every listed platform**

Use official subject/topic/category/skills/catalog pages; store broad areas only, normalized stable IDs, localized names, and canonical field URLs when available.

- [ ] **Step 3: Research official paths independently**

Accept only provider-defined Learning/Career/Skill/Role paths, professional programs/certificates, specializations, structured series, or equivalent sequences. Exclude standalone courses. Store `officialPaths: []` when none qualify.

- [ ] **Step 4: Record provenance and validate**

Set `lastVerified` for all 17; source URLs when available; `allPathsUrl` when stored path count exceeds 20.

```bash
node scripts/validate-content.cjs
node scripts/platform-paths-audit.cjs --range 4:20 --require-complete
node --test tests/*.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add data.json
git commit -m "content: research platform fields and paths batch 04-20"
```

---

### Task 10: Research Platforms 21–40

**Files:**
- Modify: `data.json`

- [ ] **Step 1: Freeze batch**

```bash
node scripts/platform-paths-audit.cjs --range 21:40
```

Expected: 20 rows.

- [ ] **Step 2: Research official broad fields for all 20**

Use provider-controlled pages only; merge synonyms; translate AR/EN/TR; add canonical field URL when available.

- [ ] **Step 3: Research official structured paths for all 20**

Preserve `officialName`; localize display `name`; set approved `type`; direct official URL; valid local `fieldIds`; explicit `[]` for zero-path platforms.

- [ ] **Step 4: Record provenance and validate**

```bash
node scripts/validate-content.cjs
node scripts/platform-paths-audit.cjs --range 21:40 --require-complete
node --test tests/platform-paths-schema.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add data.json
git commit -m "content: research platform fields and paths batch 21-40"
```

---

### Task 11: Research Platforms 41–60

**Files:**
- Modify: `data.json`

- [ ] **Step 1: Freeze batch**

```bash
node scripts/platform-paths-audit.cjs --range 41:60
```

Expected: 20 rows.

- [ ] **Step 2: Research fields**

Use official subject/category/topic pages. Do not derive fields from one-off course titles. Merge synonymous duplicates.

- [ ] **Step 3: Research provider-defined paths**

Store only structured sequences/programs, direct URLs, official source names, localized labels, approved types, and valid field references. Store empty array when no paths qualify.

- [ ] **Step 4: Record provenance and validate**

```bash
node scripts/validate-content.cjs
node scripts/platform-paths-audit.cjs --range 41:60 --require-complete
node --test tests/*.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add data.json
git commit -m "content: research platform fields and paths batch 41-60"
```

---

### Task 12: Research Platforms 61–80

**Files:**
- Modify: `data.json`

- [ ] **Step 1: Freeze batch**

```bash
node scripts/platform-paths-audit.cjs --range 61:80
```

Expected: 20 rows.

- [ ] **Step 2: Research fields from official source pages**

Broad learnable/professional domains only; localized labels; optional canonical official field link.

- [ ] **Step 3: Research structured paths separately**

Exclude standalone courses and unofficial aggregators. Store direct official URLs and explicit empty path arrays when no qualifying structures exist.

- [ ] **Step 4: Record provenance and validate**

```bash
node scripts/validate-content.cjs
node scripts/platform-paths-audit.cjs --range 61:80 --require-complete
node --test tests/platform-paths-schema.test.cjs tests/platform-detail.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add data.json
git commit -m "content: research platform fields and paths batch 61-80"
```

---

### Task 13: Research Platforms 81–100

**Files:**
- Modify: `data.json`

- [ ] **Step 1: Freeze batch**

```bash
node scripts/platform-paths-audit.cjs --range 81:100
```

Expected: 20 rows.

- [ ] **Step 2: Research fields from provider-controlled catalog/topic pages**

Normalize duplicates, localize names, and retain official field links when canonical pages exist.

- [ ] **Step 3: Research official paths**

Verify every candidate on the provider’s site. Never infer a path from several courses sharing a subject. Preserve source title and direct link.

- [ ] **Step 4: Record provenance and validate**

```bash
node scripts/validate-content.cjs
node scripts/platform-paths-audit.cjs --range 81:100 --require-complete
node --test tests/*.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add data.json
git commit -m "content: research platform fields and paths batch 81-100"
```

---

### Task 14: Research Platforms 101–110

**Files:**
- Modify: `data.json`

- [ ] **Step 1: Freeze final batch**

```bash
node scripts/platform-paths-audit.cjs --range 101:110
```

Expected: 10 rows.

- [ ] **Step 2: Research official fields for all ten**

Broad fields only, provider-controlled source pages, localized names, canonical official links when present.

- [ ] **Step 3: Research official paths for all ten**

Provider-defined structured sequences only; direct links; source titles; localized names; approved type; valid `fieldIds`; explicit empty arrays when none qualify.

- [ ] **Step 4: Record provenance and validate**

```bash
node scripts/validate-content.cjs
node scripts/platform-paths-audit.cjs --range 101:110 --require-complete
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add data.json
git commit -m "content: research platform fields and paths batch 101-110"
```

---

### Task 15: Enforce Final Completeness Across 110 Platforms

**Files:**
- Modify: `tests/full-cms-schema.test.cjs`

- [ ] **Step 1: Add final completeness test**

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

- [ ] **Step 2: Run final completeness checks**

```bash
node scripts/platform-paths-audit.cjs --require-complete
node --test tests/full-cms-schema.test.cjs
node scripts/validate-content.cjs
node scripts/generate-decap-config.cjs --check
```

Expected: 110 COMPLETE rows and all commands PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/full-cms-schema.test.cjs
git commit -m "test: require platform field and path research completeness"
```

---

### Task 16: Final Verification and Release Smoke

**Files:**
- Verify all changed files; add code only if a failing verification exposes a defect, and then use a failing regression test first.

- [ ] **Step 1: Run CI-equivalent tests**

```bash
node --test tests/*.test.cjs
```

Expected: zero failures.

- [ ] **Step 2: Run syntax checks**

```bash
for f in js/*.js scripts/*.cjs; do node --check "$f"; done
for f in inline-worker/src/*.mjs; do node --check "$f"; done
```

Expected: no errors.

- [ ] **Step 3: Run content, completeness, and generated-config validation**

```bash
node scripts/validate-content.cjs
node scripts/platform-paths-audit.cjs --require-complete
node scripts/generate-decap-config.cjs --check
```

Expected: PASS and 110 COMPLETE.

- [ ] **Step 4: Prove inline OAuth / Worker scope did not drift**

```bash
git diff main...HEAD -- inline-worker js/edit-descriptors.js js/inline-editor.js js/inline-editor-api.js js/inline-editor-config.js
```

Expected: empty diff.

- [ ] **Step 5: Review diff hygiene**

```bash
git diff --stat main...HEAD
git diff --check main...HEAD
```

Expected: only planned files changed and no whitespace errors.

- [ ] **Step 6: Browser smoke representative cases**

Verify:
- `platform.html?id=plat-1&lang=ar` shows fields and any verified paths separately;
- `platform.html?id=plat-2&lang=en` has no empty Official Paths section when zero verified paths are stored;
- one platform with more than 20 stored paths shows exactly 20 cards plus the official View All link;
- representative pages work in Turkish;
- `index.html` and `explore.html` still navigate correctly to details.

- [ ] **Step 7: Verify branch CI**

Push `feat/platform-fields-paths` and wait for `.github/workflows/test.yml`; expected conclusion: success.

- [ ] **Step 8: Only commit a verification correction when needed**

If verification finds a defect, first add a focused failing regression test, implement the minimal fix, rerun the affected test plus the full suite, then commit. If no defect is found, create no empty commit.

---

## Research Quality Checklist for Every Platform

- Each field is a broad subject/professional area, not a single course.
- Each official path is verified on a provider-controlled official page.
- The path is genuinely structured and not a standalone course.
- `officialName` preserves official source wording.
- `name.ar`, `name.en`, `name.tr` are present and faithful.
- Every `fieldIds` member resolves inside the same platform.
- Duplicate/near-duplicate fields and duplicate paths are removed.
- Every path link is direct, usable, and official rather than a generic homepage.
- `pathResearch.lastVerified` equals the actual research date.
- Canonical fields/path source URLs are recorded when available.
- More than 20 stored paths implies a valid `allPathsUrl`.
- Zero qualifying paths is represented explicitly as `officialPaths: []`.

## Definition of Done

1. All 110 platforms pass `node scripts/platform-paths-audit.cjs --require-complete`.
2. Fields and official paths are stored and displayed separately.
3. No standalone course is invented into a path.
4. Zero-path platforms show no Official Paths section.
5. More-than-20 path catalogs display only 20 cards plus an official View All action.
6. AR/EN/TR content works for headings, field names, path names, and path-type labels.
7. Decap can edit the new data structures without exposing secrets.
8. Existing inline editor/Worker authorization and allowlist code is unchanged.
9. `node --test tests/*.test.cjs`, syntax checks, `validate-content.cjs`, completeness audit, Decap `--check`, and branch CI all pass.
