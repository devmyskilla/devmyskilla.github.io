# Inline Site Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** إضافة وضع تحرير مباشر وآمن داخل موقع دنيا الدورات بحيث يرى المدير فقط أقلام التحرير، يعدّل الحقول من نافذة صغيرة، وينشر التغيير الموثق مباشرة إلى `data.json` على `main`.

**Architecture:** يبقى GitHub Pages عامًا للقراءة فقط، وتضاف طبقة Inline Editor في المتصفح فوق Content API الحالية. الكتابة تمر عبر Cloudflare Worker مستقل يستخدم GitHub OAuth وجلسات opaque مخزنة في KV؛ الـWorker وحده يحتفظ بتوكن GitHub ويطبّق تعديلات allowlisted على `data.json` مع حماية SHA قبل commit إلى `main`.

**Tech Stack:** Vanilla HTML/CSS/JavaScript، Node.js 22 native test runner، GitHub REST API، GitHub Pages، Decap CMS 3، Cloudflare Workers + KV، GitHub OAuth.

**Spec:** `docs/superpowers/specs/2026-09-01-inline-site-editor-design.md`

## Global Constraints

- الزائر العادي لا يرى أقلامًا أو toolbar أو أي write capability.
- وضع التحرير يبدأ فقط عبر `?edit=1` أو رابط من `/admin/`.
- تسجيل المدير يستخدم GitHub OAuth؛ لا كلمة مرور إضافية.
- GitHub access token وClient Secret لا يصلان إلى JavaScript العام ولا `sessionStorage` ولا `data.json`.
- المتصفح يحتفظ فقط بـopaque session ID قصير العمر.
- Worker منفصل عن `dunya-decap-oauth.atomy8774.workers.dev` حتى لا يتغير OAuth الخاص بـDecap.
- الحفظ يكتب إلى `data.json` على `main` فقط بعد مطابقة `baseSha` الحالي؛ stale SHA يعيد HTTP 409.
- لا يسمح بمسار JSON يرسله العميل؛ كل target يحل عبر allowlist server-side.
- `platform.id`, `category.id`, `language.id` وملفات HTML/CSS/JS وبيانات OAuth حقول محمية غير قابلة للتحرير inline.
- المحتوى المترجم يظهر العربية/English/Türkçe معًا.
- الحقول الديناميكية تعتمد stable IDs وليس array indexes.
- يجب الحفاظ على 110 منصة، وفحوص CMS وDecap الحالية، وعدم إدخال Supabase.
- `data.json` يظل المصدر الوحيد للمحتوى؛ Decap وInline Editor يكتبان لنفس الملف.
- كل Task تنفذ TDD: اختبار أحمر، أقل تنفيذ، اختبار أخضر، commit مستقل.
- لا يمكن اعتبار الميزة production-ready حتى يُنشر Worker فعليًا وتُضبط GitHub OAuth/KV secrets في Cloudflare؛ الكود والاختبارات يمكن إكمالهما بدون الأسرار.

---

## File Structure Locked by This Plan

**New client files**
- `js/edit-descriptors.js` — يحول bindings والعناصر الديناميكية إلى Edit Descriptors آمنة، ويحل مفتاح `siteText` القصير إلى مسار canonical وحيد.
- `js/inline-editor-api.js` — عميل session/auth/content/patch/logout للـWorker؛ لا يعرف GitHub tokens.
- `js/inline-editor.js` — إدارة edit mode، toolbar، الأقلام، modal، الحفظ، conflict، polling للنشر، logout/focus lifecycle.
- `js/inline-editor-config.js` — public non-secret endpoint/origin configuration فقط.
- `css/inline-editor.css` — واجهة المحرر فقط.

**New Worker files**
- `inline-worker/src/edit-schema.mjs` — allowlist، target resolution، validation، narrow patch functions.
- `inline-worker/src/worker.mjs` — OAuth/session/CORS/GitHub API routes.
- `inline-worker/wrangler.toml.example` — أسماء bindings والـnon-secret vars؛ لا secrets ولا KV IDs حقيقية.
- `inline-worker/README.md` — أوامر إنشاء KV، OAuth App، secrets، deploy والتحقق.

**New tests**
- `tests/edit-descriptors.test.cjs`
- `tests/inline-editor-api.test.cjs`
- `tests/inline-editor.test.cjs`
- `tests/inline-editor-integration.test.cjs`
- `tests/inline-worker.test.mjs`

**Modified files**
- `js/content-api.js` — expose canonical siteText lookup/update helpers اللازمة للمحرر المحلي فقط.
- `js/site-runtime.js` — hook اختياري لإعادة تطبيق bindings بعد save بدون دمج منطق الكتابة فيه.
- `js/landing.js`, `js/app.js`, `js/platform-detail.js` — initialize editor after content is loaded and attach stable dynamic metadata.
- `index.html`, `explore.html`, `platform.html` — تحميل CSS/modules الجديدة بترتيب آمن.
- `admin/index.html` — رابط واضح `تحرير مباشر على الموقع` إلى `/?edit=1` مع بقاء Decap.
- `sw.js` — cache version `v13` وإضافة editor client assets فقط؛ API worker لا يُcache.
- `.github/workflows/test.yml` — syntax check للـWorker ESM واختبارات Worker.
- `tests/release-smoke.test.cjs`, `tests/decap-cms.test.cjs`, `tests/no-hardcoded-content.test.cjs` — عقود regression للمحرر.
- `docs/decap-cms-setup.md` — توثيق العلاقة بين Decap وInline Editor وخطوة Worker الخارجية.

---

### Task 1: Edit Descriptor Contract

**Files:**
- Create: `js/edit-descriptors.js`
- Create: `tests/edit-descriptors.test.cjs`
- Modify: `js/content-api.js`

**Interfaces:**
- Produces: `EditDescriptors.create(data)`.
- Produces: `resolveNode(node)` → descriptor أو `null`.
- Produces: `resolveTarget(target)` → `{ descriptor, value }` أو `null`.
- Produces: `ContentAPI.findTextPath(key)` → canonical `siteText.<group>.<key>` أو `''` عند ambiguous/missing.
- Descriptor shape: `{kind,key,id,field,widget,localized,writable,value}`.

- [ ] **Step 1: اكتب الاختبارات الحمراء**

```js
const test=require('node:test');
const assert=require('node:assert/strict');
const EditDescriptors=require('../js/edit-descriptors.js');

const loc=(ar,en,tr)=>({ar,en,tr});
const data={
  settings:{siteName:loc('س','S','S'),links:{explore:'explore.html'}},
  assets:{brandLogo:{src:'logo.png',alt:loc('ش','L','L')},icons:{}},
  siteText:{home:{hero:loc('عنوان','Title','Başlık')}},
  categories:[{id:'technology',label:loc('تقنية','Technology','Teknoloji')}],
  languages:[{id:'English',label:loc('الإنجليزية','English','İngilizce')}],
  platforms:[{id:'plat-1',name:loc('منصة','Platform','Platform'),description:loc('و','D','A'),categoryId:'technology',languageIds:['English'],pricingModel:'free',hasFreeContent:true,certificateAvailable:true,freeCertificate:false,officialUrl:'https://example.com',catalogUrl:'https://example.com',logo:{src:'x.png',alt:loc('ش','L','L')},editorial:{bestFor:{ar:[],en:[],tr:[]},strengths:{ar:[],en:[],tr:[]},limitations:{ar:[],en:[],tr:[]}}}]
};

test('resolves static localized text to one canonical target',()=>{
  const api=EditDescriptors.create(data);
  const d=api.resolveTarget({kind:'siteText',key:'hero'}).descriptor;
  assert.equal(d.key,'siteText.home.hero');
  assert.equal(d.widget,'localizedText');
  assert.equal(d.writable,true);
});

test('stable IDs are never writable',()=>{
  const api=EditDescriptors.create(data);
  assert.equal(api.resolveTarget({kind:'platform',id:'plat-1',field:'id'}),null);
});

test('dynamic platform description uses stable id',()=>{
  const api=EditDescriptors.create(data);
  const r=api.resolveTarget({kind:'platform',id:'plat-1',field:'description'});
  assert.equal(r.descriptor.id,'plat-1');
  assert.deepEqual(r.value,loc('و','D','A'));
});
```

- [ ] **Step 2: شغّل الاختبار**

```bash
node --test tests/edit-descriptors.test.cjs
```

Expected: FAIL لأن module غير موجود.

- [ ] **Step 3: نفّذ resolver وallowlist العميل**

المسموح في النسخة الأولى:

```js
const PLATFORM_FIELDS={
  name:'localizedText', description:'localizedText',
  'editorial.bestFor':'localizedList','editorial.strengths':'localizedList','editorial.limitations':'localizedList',
  officialUrl:'link',catalogUrl:'link',logo:'asset',categoryId:'categoryRef',languageIds:'languageRefs',
  pricingModel:'pricingRef',hasFreeContent:'boolean',certificateAvailable:'boolean',freeCertificate:'boolean',
  officialCount:'number',officialCountType:'text',lastVerified:'text',platformType:'text',featured:'boolean',displayOrder:'number'
};
```

`siteText`, localized identity settings (`siteName`, `developerName`, `copyright`), `settings.links.*`, assets، icons، category/language labels، SEO، quiz/comparison editorial fields تمر فقط عبر known descriptor factories. لا API لقبول arbitrary path.

- [ ] **Step 4: أضف `findTextPath` في Content API**

اجمع جميع matches لمفتاح short؛ أعد المسار فقط إذا كان match واحدًا. إذا كان المفتاح dotted تحقق من وجوده مباشرة. لا تختر أول match عند ambiguity.

- [ ] **Step 5: شغّل الاختبارات**

```bash
node --test tests/edit-descriptors.test.cjs tests/content-api.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add js/edit-descriptors.js js/content-api.js tests/edit-descriptors.test.cjs tests/content-api.test.cjs
git commit -m "feat: add safe inline edit descriptors"
```

---

### Task 2: Worker Narrow Patch Engine

**Files:**
- Create: `inline-worker/src/edit-schema.mjs`
- Create: `tests/inline-worker.test.mjs`

**Interfaces:**
- Produces: `resolveTarget(data,target)`.
- Produces: `validateValue(data,descriptor,value)`.
- Produces: `applyPatch(data,target,value)` → `{data,value}` without mutating input.
- Consumes same target kinds/field names as Task 1.

- [ ] **Step 1: اكتب اختبارات server-side rejection أولًا**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {applyPatch} from '../inline-worker/src/edit-schema.mjs';
import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync('data.json','utf8'));

test('rejects protected platform id',()=>{
  assert.throws(()=>applyPatch(data,{kind:'platform',id:data.platforms[0].id,field:'id'},'evil'),/unsupported target/);
});

test('rejects arbitrary client path',()=>{
  assert.throws(()=>applyPatch(data,{kind:'path',path:'platforms.0.id'},'evil'),/unsupported target/);
});

test('patches one localized field without mutating source',()=>{
  const id=data.platforms[0].id;
  const value={ar:'أ',en:'A',tr:'A'};
  const result=applyPatch(data,{kind:'platform',id,field:'description'},value);
  assert.deepEqual(result.value,value);
  assert.notDeepEqual(result.data,data);
  assert.notDeepEqual(result.data.platforms.find(p=>p.id===id).description,data.platforms.find(p=>p.id===id).description);
  assert.equal(result.data.platforms.length,110);
});
```

- [ ] **Step 2: شغّل الاختبار**

```bash
node --test tests/inline-worker.test.mjs
```

Expected: FAIL لأن `edit-schema.mjs` غير موجود.

- [ ] **Step 3: نفّذ server allowlist مستقلًا**

لا تستورد allowlist من browser module. Worker يجب أن يملك نسخته server-side. استخدم stable ID lookup، localized triplet validation، URL validation `http/https` أو relative فقط عند الحقول التي تسمح، controlled category/language IDs، finite number validation، وboolean strict validation.

- [ ] **Step 4: أعد استخدام قواعد content validation**

نفّذ داخل Worker validator مكافئًا للعقد المهم: top-level sections، 110 platforms، unique IDs، valid category/language references، localized ar/en/tr shapes. لا تعتمد على CommonJS file مباشرة داخل Worker runtime؛ اجعل اختبار parity يقارن نتائج العينات مع `scripts/content-schema.cjs`.

- [ ] **Step 5: شغّل الاختبارات**

```bash
node --test tests/inline-worker.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add inline-worker/src/edit-schema.mjs tests/inline-worker.test.mjs
git commit -m "feat: validate narrow inline content patches"
```

---

### Task 3: Cloudflare Worker OAuth, Session, GitHub Commit API

**Files:**
- Create: `inline-worker/src/worker.mjs`
- Create: `inline-worker/wrangler.toml.example`
- Modify: `tests/inline-worker.test.mjs`

**Interfaces:**
- Routes: `GET /inline/auth`, `GET /inline/callback`, `GET /inline/session`, `GET /inline/content`, `POST /inline/patch`, `POST /inline/logout`, `OPTIONS`.
- KV binding: `INLINE_SESSIONS`.
- Secrets: `GITHUB_OAUTH_ID`, `GITHUB_OAUTH_SECRET`.
- Vars: `ALLOWED_ORIGIN=https://devmyskilla.github.io`, `GITHUB_REPO=devmyskilla/devmyskilla.github.io`, `GITHUB_BRANCH=main`, `SESSION_TTL_SECONDS=3600`.

- [ ] **Step 1: اكتب tests للـCORS/session/OAuth state**

استعمل fake env KV وfake `fetch` في tests. أثبت أن origin غير المسموح يأخذ 403، session response لا يحتوي `access_token`، وcallback مع state غير صالح يأخذ 400.

- [ ] **Step 2: شغّل الاختبارات وأثبت الفشل**

```bash
node --test tests/inline-worker.test.mjs
```

Expected: FAIL على routes غير المنفذة.

- [ ] **Step 3: نفّذ OAuth lifecycle**

`/inline/auth` ينشئ random state عبر `crypto.getRandomValues` ويحفظ `oauth:<state>` لمدة 10 دقائق ثم يوجه إلى GitHub authorize. callback يستهلك state مرة واحدة، يبادل code، يقرأ `/user` و`/repos/devmyskilla/devmyskilla.github.io` ويتطلب `permissions.push===true`، ثم يحفظ `{githubToken,login,avatarUrl,expiresAt}` تحت `session:<opaqueId>` في KV لمدة 3600 ثانية.

- [ ] **Step 4: نفّذ popup completion بدون تسريب token**

callback يعيد HTML قصيرًا يستدعي:

```js
window.opener && window.opener.postMessage({type:'dunya-inline-auth',session:'OPAQUE',user:{login:'...'}},'https://devmyskilla.github.io');
window.close();
```

القيمة المولدة هي session ID فقط.

- [ ] **Step 5: نفّذ content وpatch**

`GET /inline/content` يستخدم token server-side لجلب Contents API لـ`data.json?ref=main` ويعيد `{data,sha}`. `POST /inline/patch` يجلب current blob، يقارن `baseSha`، يطبق `applyPatch`, validates complete data، ثم PUT contents مع `sha` الحالي وmessage `content: inline edit <kind> <field/key>`.

- [ ] **Step 6: اختبر 409 وعدم تسريب GitHub token**

أضف fake GitHub fetch يؤكد أن stale `baseSha` لا يرسل PUT وأن JSON response لا يحتوي token.

- [ ] **Step 7: شغّل tests**

```bash
node --test tests/inline-worker.test.mjs
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add inline-worker tests/inline-worker.test.mjs
git commit -m "feat: add secure inline editor worker"
```

---

### Task 4: Browser API Client and Session Lifecycle

**Files:**
- Create: `js/inline-editor-config.js`
- Create: `js/inline-editor-api.js`
- Create: `tests/inline-editor-api.test.cjs`

**Interfaces:**
- Public API base target: `https://dunya-inline-editor.atomy8774.workers.dev`.
- Produces: `InlineEditorAPI.create({apiBase,fetchFn,storage,openFn})`.
- Methods: `login()`, `acceptAuthMessage(event)`, `session()`, `content()`, `patch({target,baseSha,value})`, `logout()`, `getSessionId()`.

- [ ] **Step 1: اكتب tests للحفاظ على opaque session فقط**

```js
test('acceptAuthMessage stores only session id from allowed origin',()=>{
  const storage=new Map();
  const api=InlineEditorAPI.create({apiBase:'https://dunya-inline-editor.atomy8774.workers.dev',storage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}});
  assert.equal(api.acceptAuthMessage({origin:'https://devmyskilla.github.io',data:{type:'dunya-inline-auth',session:'abc',user:{login:'admin'},access_token:'never'}}),true);
  assert.equal(storage.get('dunya-inline-session'),'abc');
  assert.equal([...storage.values()].some(v=>String(v).includes('never')),false);
});
```

- [ ] **Step 2: شغّل الاختبار**

```bash
node --test tests/inline-editor-api.test.cjs
```

Expected: FAIL لأن module غير موجود.

- [ ] **Step 3: نفّذ client**

كل API calls ترسل `Authorization: Bearer <session>` و`Origin` يترك للمتصفح. `login()` يفتح `${apiBase}/inline/auth` popup. `acceptAuthMessage` يقبل فقط exact `https://devmyskilla.github.io` و`type==='dunya-inline-auth'`.

- [ ] **Step 4: اختبر 401/409 mapping**

`patch()` يعيد error object يحمل `status` ويحتفظ بالرسالة؛ 401 يؤدي لمسح session فقط عند caller policy، 409 لا يمسح session.

- [ ] **Step 5: شغّل tests**

```bash
node --test tests/inline-editor-api.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add js/inline-editor-config.js js/inline-editor-api.js tests/inline-editor-api.test.cjs
git commit -m "feat: add inline editor browser API client"
```

---

### Task 5: Editor UI, Pencil Discovery, Modal and Save States

**Files:**
- Create: `js/inline-editor.js`
- Create: `css/inline-editor.css`
- Create: `tests/inline-editor.test.cjs`
- Modify: `js/site-runtime.js`

**Interfaces:**
- Produces: `InlineEditor.create({document,location,content,data,descriptorApi,editorApi,onDataChange})`.
- Methods: `init()`, `refreshTargets()`, `destroy()`, `openDescriptor(descriptor)`, `save(value)`, `logout()`.
- Public DOM markers: `.inline-edit-pencil`, `#inlineEditorToolbar`, `#inlineEditorModal`.

- [ ] **Step 1: اكتب الاختبار الذي يمنع الأقلام للزائر**

أثبت أن `init()` بدون `?edit=1` أو بدون verified session لا يضيف `.inline-edit-pencil`. مع `?edit=1` + session valid يضيف قلمًا لعقدة `data-i18n` resolvable فقط.

- [ ] **Step 2: شغّل الاختبار**

```bash
node --test tests/inline-editor.test.cjs
```

Expected: FAIL لأن module غير موجود.

- [ ] **Step 3: نفّذ toolbar وpencil wrappers**

لا تعدّل `textContent` للعقدة الأصلية عند إضافة القلم. استخدم wrapper/overlay button sibling ذو `type=button`, localized `aria-label`, وclass لا يظهر إلا في `html.inline-edit-active`.

- [ ] **Step 4: نفّذ modal localizedText**

Dialog يحمل `role=dialog`, `aria-modal=true`, heading id، ثلاث textarea/input fields `ar/en/tr`, warning عند أكثر من occurrence لنفس descriptor key، Save/Cancel، Escape، focus restoration.

- [ ] **Step 5: نفّذ widgets الأخرى**

`localizedList`: textarea لكل لغة، سطر = item وبالحفظ يحول non-empty lines إلى array. `link`: URL input. `asset`: src + alt ar/en/tr مع رابط `Open full CMS` للرفع. `boolean`: checkbox. `number`: number input. `categoryRef/pricingRef/languageRefs`: select/multi-select من data الحالية.

- [ ] **Step 6: نفّذ save lifecycle**

الحالات النصية داخل editor code ثابتة كـadministration chrome لا كـpublic CMS content: `Ready`, `Saving`, `Saved to GitHub / publishing`, `Published`, `Conflict`, `Error`. عند success حدّث in-memory data بالقيمة canonical، أعد ContentAPI/DOM affected bindings، حدّث `baseSha` إلى returned SHA، ثم ابدأ bounded deployment poll بحد أقصى 120 ثانية.

- [ ] **Step 7: اختبر conflict وlogout**

409 يحافظ على modal values ويظهر reload action. 401/session expiry يستدعي `destroy()` ويمسح الأقلام. logout يستدعي Worker ثم يمسح session محليًا.

- [ ] **Step 8: شغّل tests**

```bash
node --test tests/inline-editor.test.cjs tests/site-runtime.test.cjs
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add js/inline-editor.js css/inline-editor.css js/site-runtime.js tests/inline-editor.test.cjs tests/site-runtime.test.cjs
git commit -m "feat: add authenticated inline editor UI"
```

---

### Task 6: Static and Dynamic Page Integration

**Files:**
- Modify: `index.html`
- Modify: `explore.html`
- Modify: `platform.html`
- Modify: `js/landing.js`
- Modify: `js/app.js`
- Modify: `js/platform-detail.js`
- Create: `tests/inline-editor-integration.test.cjs`

**Interfaces:**
- Static bindings are discovered from existing `data-i18n`, `data-setting`, `data-link`, `data-asset`.
- Dynamic marker contract: `data-edit-kind`, `data-edit-id`, `data-edit-field`.
- All page boot flows call `InlineEditor.create(...).init()` only after `DataLoader.loadSiteData`, `initContent`, and initial render.

- [ ] **Step 1: اكتب integration tests للتحميل والترتيب**

لكل `index.html/explore.html/platform.html` تأكد من وجود `css/inline-editor.css` وscripts بالترتيب: content-api → edit-descriptors → inline-editor-config → inline-editor-api → inline-editor → page logic.

- [ ] **Step 2: اكتب tests لـdynamic stable IDs**

افحص source/renders أن platform card name/description، category card label، profile name/description/logo/editorial sections تحمل markers فيها `p.id`/category id وليس index.

- [ ] **Step 3: شغّل الاختبار**

```bash
node --test tests/inline-editor-integration.test.cjs
```

Expected: FAIL قبل الدمج.

- [ ] **Step 4: أضف scripts/CSS إلى الصفحات**

editor CSS لا يؤثر بدون `.inline-edit-active`. لا تضف قلمًا hardcoded إلى HTML؛ الأقلام تُنشأ بعد verified session فقط.

- [ ] **Step 5: أضف markers إلى app/profile renderers**

أمثلة:

```html
<h3 data-edit-kind="platform" data-edit-id="plat-1" data-edit-field="name">...</h3>
<p data-edit-kind="platform" data-edit-id="plat-1" data-edit-field="description">...</p>
<strong data-edit-kind="category" data-edit-id="technology" data-edit-field="label">...</strong>
```

استخدم escaping الحالي لكل attribute.

- [ ] **Step 6: ربط rerender بعد save**

Home: reapply `SiteRuntime.applyDocument` + cloud if relevant. Explore: `rerender()` + `SiteRuntime.applyDocument`. Platform: rebuild normalized platform list/current profile ثم `renderProfile`. بعد كل rerender استدعِ `editor.refreshTargets()`.

- [ ] **Step 7: شغّل integration + existing page tests**

```bash
node --test tests/inline-editor-integration.test.cjs tests/landing.test.cjs tests/platform-detail.test.cjs tests/platform-directory.test.cjs tests/no-hardcoded-content.test.cjs
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add index.html explore.html platform.html js/landing.js js/app.js js/platform-detail.js tests/inline-editor-integration.test.cjs
git commit -m "feat: expose inline editing across site content"
```

---

### Task 7: Decap Entry Point, Service Worker, CI and Documentation

**Files:**
- Modify: `admin/index.html`
- Modify: `sw.js`
- Modify: `.github/workflows/test.yml`
- Modify: `tests/decap-cms.test.cjs`
- Modify: `tests/release-smoke.test.cjs`
- Modify: `docs/decap-cms-setup.md`
- Create: `inline-worker/README.md`

**Interfaces:**
- `/admin/` exposes `href="../?edit=1"` without changing Decap backend config.
- Service worker cache name becomes `dunya-al-dawrat-v13`.
- CI syntax-checks `inline-worker/src/*.mjs` and runs all Node tests.

- [ ] **Step 1: اكتب tests الحمراء**

```js
test('admin exposes direct editing link without changing Decap oauth',()=>{
  const html=read('admin/index.html'),config=read('admin/config.yml');
  assert.match(html,/href="\.\.\/\?edit=1"/);
  assert.match(config,/base_url: https:\/\/dunya-decap-oauth\.atomy8774\.workers\.dev/);
});
```

وفي release smoke تحقق من `v13`, editor assets في cache، وعدم cache لأي workers.dev API response.

- [ ] **Step 2: شغّل tests وأثبت الفشل**

```bash
node --test tests/decap-cms.test.cjs tests/release-smoke.test.cjs
```

- [ ] **Step 3: أضف رابط الإدارة**

ضع زر/رابط أعلى body قبل Decap script، مع CSS inline صغير خاص بصفحة admin فقط، ولا يغير DOM root الذي يحتاجه Decap.

- [ ] **Step 4: حدّث service worker**

أضف client modules/CSS إلى CORE، bump v13. لأن Worker cross-origin، fetch handler الحالي الذي يتجاهل origins الأخرى كافٍ؛ أضف regression test يثبت عدم إضافة workers.dev إلى CORE.

- [ ] **Step 5: حدّث CI**

بعد JS syntax step أضف:

```yaml
- name: Check inline Worker syntax
  run: |
    for f in inline-worker/src/*.mjs; do node --check "$f"; done
```

الـ`node --test tests/*.test.cjs tests/*.test.mjs` يجب أن يشمل Worker test.

- [ ] **Step 6: اكتب deployment guide دقيقًا**

`inline-worker/README.md` يتضمن الأوامر:

```bash
npx wrangler kv namespace create INLINE_SESSIONS
npx wrangler secret put GITHUB_OAUTH_ID
npx wrangler secret put GITHUB_OAUTH_SECRET
npx wrangler deploy
```

وإعداد GitHub OAuth App:
- Homepage: `https://devmyskilla.github.io/`
- Callback: `https://dunya-inline-editor.atomy8774.workers.dev/inline/callback`

واشرح إدخال KV namespace id الناتج محليًا في نسخة `wrangler.toml` المبنية من example بدون commit للـsecrets.

- [ ] **Step 7: شغّل full local suite**

```bash
node --test tests/*.test.cjs tests/*.test.mjs
for f in js/*.js scripts/*.cjs inline-worker/src/*.mjs; do node --check "$f"; done
node scripts/validate-content.cjs
node scripts/generate-decap-config.cjs --check
git diff --check
```

Expected: جميع الأوامر exit 0، وvalidator يؤكد 110 منصة.

- [ ] **Step 8: Commit**

```bash
git add admin/index.html sw.js .github/workflows/test.yml tests/decap-cms.test.cjs tests/release-smoke.test.cjs docs/decap-cms-setup.md inline-worker/README.md
git commit -m "docs: wire inline editor deployment and release checks"
```

---

### Task 8: Branch Verification and External Deployment Gate

**Files:**
- No product code unless verification finds a defect.

**Interfaces:**
- Requires all earlier tasks complete.
- Produces a branch that is safe to merge independently of Cloudflare secret availability; live pencils remain login-gated and Worker-dependent.

- [ ] **Step 1: شغّل full verification fresh**

```bash
node --test tests/*.test.cjs tests/*.test.mjs
for f in js/*.js scripts/*.cjs inline-worker/src/*.mjs; do node --check "$f"; done
node scripts/validate-content.cjs
node scripts/generate-decap-config.cjs --check
git diff --check
```

- [ ] **Step 2: افحص secrets**

```bash
if grep -RniE 'GITHUB_OAUTH_SECRET\s*[:=]\s*[^$]|client_secret\s*[:=]\s*[^$]|gh[pousr]_[A-Za-z0-9_]+' . --exclude-dir=.git; then exit 1; fi
```

Expected: no committed secret values.

- [ ] **Step 3: افحص GitHub Actions على رأس الفرع**

انتظر workflow `Test platform directory` وتأكد من success لجميع steps.

- [ ] **Step 4: إذا Cloudflare credentials غير متاحة في البيئة الحالية**

لا تدّع أن OAuth live يعمل. سجّل الحالة بدقة: repository implementation tested، وproduction activation يحتاج تنفيذ خطوات `inline-worker/README.md` بحساب Cloudflare/GitHub OAuth. لا تغير Decap proxy كحل بديل.

- [ ] **Step 5: إذا تم نشر Worker خارجيًا**

تحقق يدويًا:
1. افتح `https://devmyskilla.github.io/?edit=1`.
2. سجّل GitHub.
3. تحقق أن القلم يظهر بعد session فقط.
4. عدّل فقرة اختبارية بثلاث لغات واحفظ.
5. تحقق من commit واحد إلى `data.json` في `main`.
6. تحقق من انتقال toolbar من Saved/publishing إلى Published.
7. أعد القيمة الأصلية من نفس المحرر وسجّل commit الاسترجاع.

- [ ] **Step 6: قبل الدمج استخدم verification-before-completion وrequesting-code-review**

أي Critical/Important feedback يُصلح قبل دمج `main`.
