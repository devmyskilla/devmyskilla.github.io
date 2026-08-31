# Full CMS Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** جعل `data.json` وDecap CMS مصدر التحكم لكل المحتوى والهوية القابلة للتحرير في دنيا الدورات، مع بقاء منطق التطبيق في JavaScript والحفاظ على جميع المنصات الـ110.

**Architecture:** سنحوّل البيانات الحالية إلى مخطط مركزي منظم (`settings/assets/seo/siteText/categories/languages/quiz/comparison/platforms`) ونضيف Content API نقية تفصل شكل البيانات عن الصفحات. طبقة runtime منفصلة ستطبّق النصوص والروابط والصور وalt وSEO وبيانات الـPWA على DOM، بينما تبقى `i18n.js` مسؤولة فقط عن اللغة والاتجاه وواجهات الترجمة المتوافقة مع بقية التطبيق.

**Tech Stack:** GitHub Pages، Vanilla HTML/CSS/JavaScript (UMD/CommonJS-compatible modules)، JSON، Node.js 22 native test runner، Decap CMS 3، GitHub backend، Cloudflare OAuth proxy.

**Spec:** `docs/superpowers/specs/2026-08-31-full-cms-control-design.md`

## Global Constraints

- يبقى GitHub Pages هو الاستضافة؛ لا backend جديد ولا Supabase ولا خدمة مدفوعة.
- يبقى `data.json` مصدر المحتوى الرئيسي وقت التشغيل.
- يجب الحفاظ على **110 منصة** بالضبط أثناء الهجرة وعدم تخمين حقائق جديدة.
- كل محتوى تحريري متعدد اللغة يستخدم `ar/en/tr` معًا قدر الإمكان.
- المعرفات التقنية (`platform.id`, `category.id`, `language.id`) مستقرة ومنفصلة عن labels القابلة للتحرير.
- لا يسمح بحقن HTML أو CSS أو JavaScript خام من CMS؛ النصوص تطبق بـ`textContent` والروابط/الأصول تمر عبر validation.
- غياب المحتوى الاختياري يعني إخفاءه؛ لا نعيد إدخال `Unknown/غير معروف` كحشو افتراضي للمحتوى.
- `scripts/generate-decap-config.cjs` يبقى المصدر الوحيد المولد لـ`admin/config.yml` ويحافظ على `https://dunya-decap-oauth.atomy8774.workers.dev` و`auth_endpoint: auth`.
- `media_folder: assets/uploads` و`public_folder: /assets/uploads` يبقيان كما هما.
- كل Task تُنفّذ TDD: اختبار يفشل أولًا، ثم أقل تنفيذ ينجحه، ثم commit مستقل.

---

## File Structure Locked by This Plan

**New files**

- `js/content-api.js` — API نقية لقراءة النصوص والإعدادات والأصول والتصنيفات واللغات وSEO وبيانات المنصات من المخطط الجديد.
- `js/site-runtime.js` — تطبيق Content API على DOM: text/aria/placeholder/link/image/alt/theme color/SEO/manifest bindings.
- `scripts/content-schema.cjs` — قواعد تحقق مشتركة ومساعدات recursive schema تستخدمها migration وvalidation وDecap generator.
- `scripts/migrate-full-cms-data.cjs` — هجرة حتمية one-time من الشكل الحالي إلى المخطط الجديد؛ يبقى في المستودع للتوثيق وقابلية المراجعة.
- `scripts/validate-content.cjs` — validation مستقل يستعمله CI بدل inline JSON checks.
- `tests/full-cms-schema.test.cjs` — عقد المخطط الجديد، المرجعيات، الـ110 منصة، والمعرفات.
- `tests/content-api.test.cjs` — اختبارات Content API والفallback الآمن والروابط/الأصول.
- `tests/site-runtime.test.cjs` — اختبارات DOM bindings وSEO وalt واللغة وmanifest metadata.
- `tests/no-hardcoded-content.test.cjs` — اختبارات مستهدفة تمنع عودة النصوص/الخرائط/الأصول التي نُقلت إلى CMS.

**Files modified**

- `data.json` — هجرة كاملة إلى المخطط المعتمد.
- `js/i18n.js` — إزالة content dictionaries و`catMap/langMap` وتحويله إلى language façade فوق Content API.
- `js/platform-core.js` — استخدام `categoryId/languageIds` والنماذج المترجمة وإزالة `UNIT_LABELS` المرئية من الكود.
- `js/platform-directory.js` — الفلاتر والإحصاءات والمقارنة على IDs الجديدة.
- `js/app.js` — كل user-facing copy/icons/quick filters/quiz/path configuration من البيانات.
- `js/landing.js` — تهيئة Content API/Runtime وتطبيق settings/assets/SEO.
- `js/platform-detail.js` — النموذج والرندر من البيانات المترجمة وContent API، بدون hardcoded visible fallbacks.
- `index.html` — shell فقط مع `data-*` bindings؛ إزالة literals القابلة للتحرير.
- `explore.html` — shell فقط مع bindings؛ إزالة labels/aria/icons/cloud names القابلة للتحرير.
- `platform.html` — shell فقط مع bindings؛ إزالة literals القابلة للتحرير.
- `manifest.webmanifest` — يبقى fallback تقنيًا صالحًا، بينما runtime manifest يعكس الإعدادات المدارة من CMS بعد تحميل البيانات.
- `scripts/generate-decap-config.cjs` — مولد recursive للمخطط الجديد وimage/url/list/object widgets.
- `admin/config.yml` — regenerated only، لا تعديل يدوي.
- `sw.js` — cache version جديد وإضافة runtime modules الجديدة.
- `.github/workflows/test.yml` — استعمال validator الجديد وفحوص hardcoded content.
- `tests/data-loader.test.cjs`, `tests/platform-core.test.cjs`, `tests/platform-directory.test.cjs`, `tests/platform-detail.test.cjs`, `tests/landing.test.cjs`, `tests/decap-cms.test.cjs`, `tests/release-smoke.test.cjs`, `tests/branding.test.cjs` — تحديث العقود إلى المخطط الجديد.
- `docs/decap-cms-setup.md` — توثيق أقسام CMS الجديدة والـstable IDs والوسائط.

---

### Task 1: تثبيت عقد المخطط الجديد قبل الهجرة

**Files:**
- Create: `scripts/content-schema.cjs`
- Create: `tests/full-cms-schema.test.cjs`
- Modify: `tests/data-loader.test.cjs`
- Modify: `js/data-loader.js`

**Interfaces:**
- Produces: `SUPPORTED_LOCALES`, `isLocalized(value)`, `validateContentData(data)`, `validateStableReferences(data)` من `scripts/content-schema.cjs` للاستخدام في scripts/tests.
- Produces runtime contract: `DataLoader.validate(data)` يتطلب الأقسام `settings`, `assets`, `seo`, `siteText`, `categories`, `languages`, `quiz`, `comparison`, `platforms`.

- [ ] **Step 1: اكتب اختبار المخطط الجديد ليفشل على `data.json` الحالي**

أضف في `tests/full-cms-schema.test.cjs`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const data = JSON.parse(fs.readFileSync('data.json','utf8'));
const required = ['settings','assets','seo','siteText','categories','languages','quiz','comparison','platforms'];

test('full CMS schema exposes every top-level editable domain', () => {
  for (const key of required) assert.ok(Object.hasOwn(data,key), `missing ${key}`);
  assert.equal(data.platforms.length, 110);
});

test('stable IDs are unique and platform references resolve', () => {
  const categoryIds = new Set(data.categories.map(row => row.id));
  const languageIds = new Set(data.languages.map(row => row.id));
  assert.equal(categoryIds.size, data.categories.length);
  assert.equal(languageIds.size, data.languages.length);
  assert.equal(new Set(data.platforms.map(row => row.id)).size, 110);
  for (const platform of data.platforms) {
    assert.ok(categoryIds.has(platform.categoryId), `${platform.id}: bad categoryId`);
    for (const id of platform.languageIds || []) assert.ok(languageIds.has(id), `${platform.id}: bad languageId ${id}`);
  }
});
```

- [ ] **Step 2: شغّل الاختبار وأثبت أنه يفشل للسبب الصحيح**

Run:

```bash
node --test tests/full-cms-schema.test.cjs
```

Expected: FAIL لأن `settings/assets/seo/categories/languages/quiz/comparison` غير موجودة بعد.

- [ ] **Step 3: أنشئ schema helpers المشتركة**

في `scripts/content-schema.cjs` استخدم هذا العقد:

```js
const SUPPORTED_LOCALES = Object.freeze(['ar','en','tr']);
const REQUIRED_SECTIONS = Object.freeze([
  'settings','assets','seo','siteText','categories','languages','quiz','comparison','platforms'
]);

function isObject(value){ return value && typeof value === 'object' && !Array.isArray(value); }
function isLocalized(value){
  return isObject(value) && SUPPORTED_LOCALES.every(lang => typeof value[lang] === 'string');
}
function validateContentData(data){
  if (!isObject(data)) throw new Error('data.json must contain an object');
  for (const key of REQUIRED_SECTIONS) if (!Object.hasOwn(data,key)) throw new Error(`Missing ${key}`);
  if (!isObject(data.settings) || !isObject(data.assets) || !isObject(data.seo) || !isObject(data.siteText)) throw new Error('CMS objects are invalid');
  if (!Array.isArray(data.categories) || !Array.isArray(data.languages) || !Array.isArray(data.platforms)) throw new Error('CMS collections are invalid');
  if (!isObject(data.quiz) || !isObject(data.comparison)) throw new Error('quiz/comparison must be objects');
  return data;
}
function validateStableReferences(data){
  const categoryIds = new Set(data.categories.map(row => row.id));
  const languageIds = new Set(data.languages.map(row => row.id));
  const platformIds = data.platforms.map(row => row.id);
  if (data.platforms.length !== 110) throw new Error(`Expected 110 platforms, received ${data.platforms.length}`);
  if (new Set(platformIds).size !== platformIds.length) throw new Error('Duplicate platform IDs');
  if (new Set(data.categories.map(row => row.id)).size !== data.categories.length) throw new Error('Duplicate category IDs');
  if (new Set(data.languages.map(row => row.id)).size !== data.languages.length) throw new Error('Duplicate language IDs');
  for (const row of data.platforms) {
    if (!categoryIds.has(row.categoryId)) throw new Error(`${row.id}: unknown categoryId ${row.categoryId}`);
    for (const id of row.languageIds || []) if (!languageIds.has(id)) throw new Error(`${row.id}: unknown languageId ${id}`);
  }
  return data;
}
module.exports = { SUPPORTED_LOCALES, REQUIRED_SECTIONS, isLocalized, validateContentData, validateStableReferences };
```

- [ ] **Step 4: وسّع `DataLoader.validate` لنفس الأقسام مع رسالة fallback تقنية فقط**

اجعل runtime validator يرفض البنية القديمة، ولا يضيف نصوص محتوى افتراضية. أبقِ fallback التقني الوحيد في loader/boot كرسالة فشل قصيرة.

- [ ] **Step 5: شغّل اختبارات loader والعقد؛ يجب أن يبقى عقد CMS الجديد أحمر حتى Task 2**

Run:

```bash
node --test tests/data-loader.test.cjs tests/full-cms-schema.test.cjs
```

Expected: loader unit tests PASS بعد تحديث fixtures، وfull schema FAIL فقط لأن `data.json` لم يهاجر بعد.

- [ ] **Step 6: Commit**

```bash
git add scripts/content-schema.cjs tests/full-cms-schema.test.cjs tests/data-loader.test.cjs js/data-loader.js
git commit -m "test: define full CMS content schema"
```

---

### Task 2: هجرة `data.json` حتميًا مع الحفاظ على 110 منصة

**Files:**
- Create: `scripts/migrate-full-cms-data.cjs`
- Modify: `data.json`
- Test: `tests/full-cms-schema.test.cjs`

**Interfaces:**
- Consumes: `SUPPORTED_LOCALES` وvalidators من Task 1.
- Produces data shape المستعمل لاحقًا: `settings`, `assets`, `seo`, grouped `siteText`, `categories`, `languages`, `quiz`, `comparison`, migrated `platforms`.

- [ ] **Step 1: أضف اختبارًا يثبت الشكل المترجم للحقول الرئيسية**

```js
test('editable concepts are stored as ar/en/tr triplets', () => {
  for (const value of [data.settings.siteName, data.settings.developerName, data.settings.copyright]) {
    assert.deepEqual(Object.keys(value).sort(), ['ar','en','tr']);
  }
  for (const category of data.categories) assert.deepEqual(Object.keys(category.label).sort(), ['ar','en','tr']);
  for (const language of data.languages) assert.deepEqual(Object.keys(language.label).sort(), ['ar','en','tr']);
  for (const platform of data.platforms) {
    assert.deepEqual(Object.keys(platform.name).sort(), ['ar','en','tr']);
    assert.deepEqual(Object.keys(platform.description).sort(), ['ar','en','tr']);
  }
});
```

- [ ] **Step 2: شغّله وتأكد من الفشل**

```bash
node --test tests/full-cms-schema.test.cjs
```

Expected: FAIL على `settings.siteName` أو `platform.name`.

- [ ] **Step 3: أنشئ migration script بشكل حتمي**

استخدم helpers فعلية بهذا الشكل في `scripts/migrate-full-cms-data.cjs`:

```js
const fs = require('node:fs');
const { validateContentData, validateStableReferences } = require('./content-schema.cjs');
const legacy = JSON.parse(fs.readFileSync('data.json','utf8'));

const localized = (ar='',en=ar,tr=en) => ({ ar:String(ar||''), en:String(en||''), tr:String(tr||'') });
const textAt = (key,lang) => String((legacy.siteText[lang] || {})[key] || '');

function groupForKey(key){
  if (/^(landing|problem|step)/.test(key)) return 'home';
  if (/^(nav)/.test(key)) return 'navigation';
  if (/^(explorer|hero|featured|categories|chip|filter|sort|allTab|favoritesTab|recentTab|browse|random|install|platformsAvailable|noResults|freeOnly|withCertificate|trustCopy)/.test(key)) return 'explore';
  if (/^(bestFor|strengths|limitations|facts|official|similar|savePlatform|removeSaved|sharePlatform|backToHome|platformNotFound)/.test(key)) return 'platform';
  if (/^(compare|maxCompare|selected|clear)/.test(key)) return 'comparison';
  if (/^(quiz|qCategory|qLanguage|qBudget|qCertificate|goal|match|freePreferred|paidOkay|certImportant|certNotImportant|showResults|path)/.test(key)) return 'quiz';
  if (/^(error|loading|unknown|copied|installed)/.test(key)) return 'errors';
  if (/^(footer|developedBy|siteName|tagline|unionBadge)/.test(key)) return 'footer';
  return 'common';
}

function migrateSiteText(){
  const out = {};
  const keys = [...new Set(['ar','en','tr'].flatMap(lang => Object.keys(legacy.siteText[lang] || {})))].sort();
  for (const key of keys) {
    const group = groupForKey(key);
    out[group] ||= {};
    out[group][key] = localized(textAt(key,'ar'), textAt(key,'en'), textAt(key,'tr'));
  }
  out.common.contentUnits = {
    courses: localized('دورة','courses','kurs'),
    job_simulations: localized('محاكاة وظيفية','job simulations','iş simülasyonu'),
    modules: localized('وحدة','modules','modül'),
    learning_paths: localized('مسار تعليمي','learning paths','öğrenme yolu'),
    certifications: localized('شهادة','certifications','sertifika'),
    materials: localized('مادة','materials','materyal'),
    items: localized('عنصر','items','öğe')
  };
  return out;
}
```

استخدم canonical mappings الحالية بلا تخمين:

```js
const CATEGORY_IDS = {
  'برمجة وبيانات':'programming_data','تكنولوجيا':'technology','تسويق وأعمال':'business_marketing','تعليم':'education','لغات':'languages',
  technology:'technology',data_ai:'data_ai',business:'business',languages:'languages',academic:'academic',career:'career',education:'education'
};
const LANGUAGE_IDS = {
  'إنجليزي':'English','عربي':'Arabic','تركي':'Turkish','إنجليزي/فرنسي':'EnglishFrench','عربي/إنجليزي':'ArabicEnglish','متعدد اللغات':'Multilingual',
  English:'English',Arabic:'Arabic',Turkish:'Turkish',French:'French'
};
```

ابنِ `categories` و`languages` من القيم الموجودة فعليًا في الـ110 منصة، واستخدم translations الموجودة حاليًا في `catMap/langMap` كseed. إذا ظهرت قيمة غير موجودة في هذه الخرائط، أنشئ record يحافظ على نفس النص في اللغات الثلاث بدل تخمين ترجمة جديدة.

- [ ] **Step 4: انقل platform rows إلى الشكل الجديد**

العقد النهائي لكل منصة:

```js
function migratePlatform(row){
  const brand = String(row.name || row.platform || '');
  return {
    id: String(row.id),
    name: localized(brand,brand,brand),
    description: localized(row.description_ar || row.description || '', row.description_en || '', row.description_tr || ''),
    categoryId: CATEGORY_IDS[row.category] || String(row.category),
    languageIds: (row.languages || []).map(value => LANGUAGE_IDS[value] || String(value)),
    pricingModel: row.pricingModel || 'unknown',
    hasFreeContent: row.hasFreeContent === true,
    certificateAvailable: row.certificateAvailable === true,
    freeCertificate: row.freeCertificate === true,
    platformType: row.platformType || '',
    officialUrl: row.officialUrl || '',
    catalogUrl: row.catalogUrl || '',
    logo: { src: row.logoUrl || '', alt: localized(brand,brand,brand) },
    officialCount: row.officialCount ?? null,
    officialCountType: row.officialCountType || '',
    lastVerified: row.lastVerified || null,
    editorial: {
      bestFor: { ar: row.best_for_ar || [], en: row.best_for_en || [], tr: row.best_for_tr || [] },
      strengths: { ar: row.strengths_ar || [], en: row.strengths_en || [], tr: row.strengths_tr || [] },
      limitations: { ar: row.limitations_ar || [], en: row.limitations_en || [], tr: row.limitations_tr || [] }
    },
    featured: row.featured === true,
    displayOrder: row.displayOrder ?? null
  };
}
```

- [ ] **Step 5: أضف settings/assets/seo/quiz/comparison بدون فقد المحتوى الحالي**

استخدم قيم الموقع الحالية كبذور، ومنها:

```js
settings: {
  siteName: localized(textAt('siteName','ar'),textAt('siteName','en'),textAt('siteName','tr')),
  developerName: localized('اتحاد شباب الأمة','Ummah Youth Union','Ümmet Gençleri Birliği'),
  copyright: localized(textAt('footer','ar'),textAt('footer','en'),textAt('footer','tr')),
  defaultLanguage: 'ar',
  localeNames: { ar:'العربية', en:'English', tr:'Türkçe' },
  themeColor: '#4f46e5',
  links: { home:'index.html', explore:'explore.html', about:'#aboutProject', howItWorks:'#howItWorks', developer:'#developerSection' },
  featuredFallbackIds: ['plat-26','plat-25','plat-3','plat-7','plat-34','plat-30']
},
assets: {
  brandLogo: { src:'assets/dunya-logo-hero-v3.webp', alt: localized('شعار دنيا الدورات','Dunya Al-Dawrat logo','Dünya Kursları logosu') },
  favicon: { src:'assets/dunya-logo-192.png', alt: localized('أيقونة دنيا الدورات','Dunya Al-Dawrat icon','Dünya Kursları simgesi') },
  heroLogo: { src:'assets/dunya-logo-hero-v3.webp', alt: localized('شعار دنيا الدورات','Dunya Al-Dawrat logo','Dünya Kursları logosu') },
  icons: {
    search:'⌕', check:'✓', compare:'⚖', quiz:'✨', random:'🎲', path:'🧭', install:'⬇', favoriteOn:'♥', favoriteOff:'♡', share:'↗', reset:'↺', close:'×', developer:'✦', back:'←', themeLight:'☀', themeDark:'◐'
  }
}
```

ضع SEO الحالي في `seo.home`, `seo.explore`, `seo.platform` لكل لغة، مع `title/description/ogTitle/ogDescription/ogImage`.

انقل learning-path stage names الحالية من `PATHS` إلى `quiz.learningPaths` كـplatform IDs مستقرة باستخدام lookup على أسماء المنصات أثناء migration؛ إذا لم يجد script اسمًا موجودًا حاليًا في `PATHS` يجب أن يرمي خطأ ويوقف الهجرة بدل إسقاطه بصمت.

- [ ] **Step 6: شغّل migration ثم validators**

```bash
node scripts/migrate-full-cms-data.cjs
node --test tests/full-cms-schema.test.cjs
```

Expected: PASS، و`data.platforms.length === 110`، وكل category/language reference صالح.

- [ ] **Step 7: Commit**

```bash
git add data.json scripts/migrate-full-cms-data.cjs tests/full-cms-schema.test.cjs
git commit -m "feat: migrate site content to full CMS schema"
```

---

### Task 3: إضافة Content API نقية وإعادة بناء i18n فوقها

**Files:**
- Create: `js/content-api.js`
- Create: `tests/content-api.test.cjs`
- Modify: `js/i18n.js`
- Modify: `tests/platform-core.test.cjs`

**Interfaces:**
- Produces: `ContentAPI.create(data, initialLang)` returning `text(path,lang?)`, `setting(path,lang?)`, `asset(path,lang?)`, `icon(key)`, `link(key)`, `categoryLabel(id,lang?)`, `languageLabel(id,lang?)`, `seo(page,lang?)`, `platformName(platform,lang?)`, `platformDescription(platform,lang?)`, `platformList(platform,key,lang?)`, `contentCountLabel(platform,lang?)`, `safeUrl(value,{allowRelative})`, `setLang(lang)`, `getLang()`.
- `i18n.js` keeps globals used by app: `setLang`, `getText`, `translateCat`, `translateLang`, `pf`, `applyTranslations`, plus new `initContent(data)`.

- [ ] **Step 1: اكتب اختبارات API قبل الملف**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const ContentAPI = require('../js/content-api.js');

const fixture = {
  settings:{siteName:{ar:'الاسم',en:'Name',tr:'Ad'},links:{explore:'explore.html'}},
  assets:{brandLogo:{src:'assets/logo.png',alt:{ar:'شعار',en:'Logo',tr:'Logo'}},icons:{share:'↗'}},
  seo:{home:{ar:{title:'الرئيسية',description:'وصف',ogTitle:'رئيسية',ogDescription:'وصف OG',ogImage:'assets/og.png'},en:{title:'Home',description:'Desc',ogTitle:'Home',ogDescription:'OG',ogImage:'assets/og.png'},tr:{title:'Ana',description:'Açıklama',ogTitle:'Ana',ogDescription:'OG',ogImage:'assets/og.png'}}},
  siteText:{common:{hello:{ar:'مرحبا',en:'Hello',tr:'Merhaba'},contentUnits:{courses:{ar:'دورة',en:'courses',tr:'kurs'},items:{ar:'عنصر',en:'items',tr:'öğe'}}}},
  categories:[{id:'technology',label:{ar:'تقنية',en:'Technology',tr:'Teknoloji'}}],
  languages:[{id:'English',label:{ar:'الإنجليزية',en:'English',tr:'İngilizce'}}],
  quiz:{},comparison:{},platforms:[]
};

test('Content API resolves translated values from data only', () => {
  const api = ContentAPI.create(fixture,'ar');
  assert.equal(api.text('common.hello'),'مرحبا');
  assert.equal(api.categoryLabel('technology'),'تقنية');
  assert.equal(api.languageLabel('English'),'الإنجليزية');
  api.setLang('tr');
  assert.equal(api.text('common.hello'),'Merhaba');
});

test('invalid links and assets are rejected safely', () => {
  const api = ContentAPI.create(fixture,'en');
  assert.equal(api.safeUrl('javascript:alert(1)',{allowRelative:true}),'');
  assert.equal(api.safeUrl('explore.html',{allowRelative:true}),'explore.html');
  assert.equal(api.safeUrl('https://example.com',{allowRelative:false}),'https://example.com/');
});
```

- [ ] **Step 2: شغّل الاختبارات وتأكد أنها تفشل لأن module غير موجود**

```bash
node --test tests/content-api.test.cjs
```

Expected: FAIL `Cannot find module '../js/content-api.js'`.

- [ ] **Step 3: نفّذ Content API بقراءة path آمنة وfallback محدد**

استخدم UMD مثل بقية المشروع، ومساعدات أساسية:

```js
function byPath(owner,path){
  return String(path).split('.').reduce((value,key)=>value && Object.hasOwn(value,key) ? value[key] : undefined, owner);
}
function localized(value,lang){
  if (!value || typeof value !== 'object' || Array.isArray(value)) return typeof value === 'string' ? value : '';
  return value[lang] || value.en || value.ar || value.tr || '';
}
function safeUrl(value,{allowRelative=true}={}){
  const raw=String(value||'').trim();
  if(!raw)return'';
  if(allowRelative && /^(?:#|\.?\.?\/|[A-Za-z0-9_.-]+(?:\.html)?(?:[?#].*)?$)/.test(raw)) return raw;
  try { const url=new URL(raw); return /^https?:$/.test(url.protocol) ? url.href : ''; } catch(_){ return ''; }
}
```

`contentCountLabel(platform,lang)` يأخذ unit label من `siteText.common.contentUnits[officialCountType]` بدل أي constants داخل PlatformCore.

- [ ] **Step 4: أعد كتابة `i18n.js` كواجهة رقيقة**

العقد:

```js
let currentLang='ar';
let content=null;
function initContent(data){ content=ContentAPI.create(data,currentLang); }
function getText(path){ return content ? content.text(path,currentLang) : ''; }
function translateCat(id){ return content ? content.categoryLabel(id,currentLang) : ''; }
function translateLang(id){ return content ? content.languageLabel(id,currentLang) : ''; }
function pf(platform,field){
  if(!content)return'';
  if(field==='name')return content.platformName(platform,currentLang);
  if(field==='description')return content.platformDescription(platform,currentLang);
  return '';
}
```

وسّع `applyTranslations()` ليدعم:

```text
data-i18n
data-i18n-placeholder
data-i18n-aria-label
data-i18n-title
```

- [ ] **Step 5: شغّل Content API وi18n-related tests**

```bash
node --test tests/content-api.test.cjs tests/platform-core.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add js/content-api.js js/i18n.js tests/content-api.test.cjs tests/platform-core.test.cjs
git commit -m "feat: add CMS content API and data-driven i18n"
```

---

### Task 4: تحويل Platform Core/Directory إلى stable category/language IDs

**Files:**
- Modify: `js/platform-core.js`
- Modify: `js/platform-directory.js`
- Modify: `js/platform-detail.js` model helpers only
- Modify: `tests/platform-core.test.cjs`
- Modify: `tests/platform-directory.test.cjs`
- Modify: `tests/platform-detail.test.cjs`

**Interfaces:**
- Platform normalized shape uses `name` localized object, `description` localized object, `categoryId`, `languageIds`, `logo`, `editorial`.
- `PlatformCore.contentCountLabel` is removed; formatting is owned by Content API.
- `PlatformDirectory.getFilterOptions()` returns category/language IDs.

- [ ] **Step 1: غيّر tests أولًا إلى IDs الجديدة**

مثال:

```js
test('filters use stable category and language IDs', () => {
  const rows=[
    PlatformCore.normalizeStaticPlatform({id:'a',name:{ar:'أ',en:'A',tr:'A'},description:{ar:'',en:'',tr:''},categoryId:'technology',languageIds:['English'],pricingModel:'free'}),
    PlatformCore.normalizeStaticPlatform({id:'b',name:{ar:'ب',en:'B',tr:'B'},description:{ar:'',en:'',tr:''},categoryId:'business',languageIds:['Turkish'],pricingModel:'paid'})
  ];
  assert.deepEqual(PlatformDirectory.getFilterOptions(rows).categories,['business','technology']);
  assert.equal(PlatformCore.filterPlatforms(rows,{category:'technology',language:'English'}).length,1);
});
```

- [ ] **Step 2: شغّل tests وأثبت فشلها**

```bash
node --test tests/platform-core.test.cjs tests/platform-directory.test.cjs tests/platform-detail.test.cjs
```

Expected: FAIL بسبب استمرار `category/languages/name string`.

- [ ] **Step 3: حدّث `normalizeStaticPlatform`**

`baseShape()` يصبح:

```js
{
  id:'', name:{ar:'',en:'',tr:''}, description:{ar:'',en:'',tr:''},
  categoryId:'', languageIds:[], pricingModel:'unknown', hasFreeContent:false,
  certificateAvailable:false, freeCertificate:false, platformType:'', officialUrl:'', catalogUrl:'',
  logo:{src:'',alt:{ar:'',en:'',tr:''}}, officialCount:null, officialCountType:'', lastVerified:null,
  editorial:{bestFor:{ar:[],en:[],tr:[]},strengths:{ar:[],en:[],tr:[]},limitations:{ar:[],en:[],tr:[]}},
  featured:false, displayOrder:null
}
```

البحث (`searchHaystack`) يأخذ كل قيم `name/description` وكل IDs والنصوص التحريرية، لكنه لا يحتاج labels؛ labels يضيفها caller عند البحث إذا لزم لاحقًا.

- [ ] **Step 4: حدّث الفلترة/الإحصاءات/المقارنة**

استخدم `p.categoryId`, `p.languageIds` في كل `filter/getFilterOptions/getCategoryGroups/cardFacts/comparisonRows/similarPlatforms`.

`getFeatured` يبقى يأخذ fallback IDs، لكن caller سيأتي بها من `settings.featuredFallbackIds` بدل constant.

- [ ] **Step 5: أزل `UNIT_LABELS` نهائيًا**

`PlatformCore` يعيد count/type فقط، مثل:

```js
function officialContent(platform={}){
  const count=numberOrNull(platform.officialCount);
  return count===null ? null : { count, type:text(platform.officialCountType||'items') };
}
```

- [ ] **Step 6: شغّل الاختبارات**

```bash
node --test tests/platform-core.test.cjs tests/platform-directory.test.cjs tests/platform-detail.test.cjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add js/platform-core.js js/platform-directory.js js/platform-detail.js tests/platform-core.test.cjs tests/platform-directory.test.cjs tests/platform-detail.test.cjs
git commit -m "refactor: use stable platform taxonomy IDs"
```

---

### Task 5: إضافة Site Runtime للـDOM والروابط والصور وSEO والـPWA

**Files:**
- Create: `js/site-runtime.js`
- Create: `tests/site-runtime.test.cjs`
- Modify: `manifest.webmanifest`
- Modify: `index.html`
- Modify: `explore.html`
- Modify: `platform.html`

**Interfaces:**
- Produces: `SiteRuntime.applyDocument(doc, content, pageKey)`, `applySeo(doc,content,pageKey)`, `applyAssets(doc,content)`, `applyLinks(doc,content)`, `createManifest(content,origin)`.
- Consumes: Content API from Task 3.

- [ ] **Step 1: اكتب tests لـSEO/assets/links قبل التنفيذ**

استخدم fake document صغير يحتوي `querySelector/querySelectorAll` stubs، واختبر على الأقل:

```js
test('SEO follows the selected CMS language', () => {
  const doc = makeDocument();
  SiteRuntime.applySeo(doc,api,'home');
  assert.equal(doc.title,'الرئيسية');
  assert.equal(doc.meta.description,'وصف');
  api.setLang('en');
  SiteRuntime.applySeo(doc,api,'home');
  assert.equal(doc.title,'Home');
  assert.equal(doc.meta.description,'Desc');
});

test('asset binding changes src and localized alt without innerHTML', () => {
  const doc = makeDocumentWithAssetNode('brandLogo');
  SiteRuntime.applyAssets(doc,api);
  assert.equal(doc.asset.src,'assets/logo.png');
  assert.equal(doc.asset.alt,'شعار');
});
```

- [ ] **Step 2: شغّل tests وأثبت فشل module**

```bash
node --test tests/site-runtime.test.cjs
```

Expected: FAIL `Cannot find module '../js/site-runtime.js'`.

- [ ] **Step 3: نفّذ binding contract الآمن**

استخدم attributes التالية فقط:

```text
data-setting="siteName"
data-link="links.explore"
data-asset="brandLogo"
data-icon="search"
data-i18n="home.landingHeroTitle"
data-i18n-placeholder="explore.searchPlaceholder"
data-i18n-aria-label="accessibility.search"
```

`applyDocument` يجب أن يستخدم `textContent`, `setAttribute`, وproperty assignments فقط؛ لا يأخذ HTML من CMS.

- [ ] **Step 4: طبّق SEO وtheme color**

حدّث/أنشئ:

```html
<meta name="description">
<meta property="og:title">
<meta property="og:description">
<meta property="og:image">
<meta name="theme-color">
```

من `seo[pageKey][lang]` و`settings.themeColor`.

- [ ] **Step 5: أنشئ runtime manifest من CMS settings/assets**

`createManifest(content, origin)` يعيد object آمن:

```js
{
  name: content.setting('siteName'),
  short_name: content.setting('siteName'),
  start_url: content.link('links.home') || 'index.html',
  display: 'standalone',
  background_color: '#ffffff',
  theme_color: content.rawSetting('themeColor') || '#4f46e5',
  icons: [{ src: new URL(content.asset('favicon').src, origin).href, sizes:'192x192', type:'image/png' }]
}
```

runtime يحول JSON إلى Blob URL ويضعه على `<link id="appManifest" rel="manifest">`. `manifest.webmanifest` يبقى fallback صالحًا فقط إذا فشل runtime قبل تحميل البيانات.

- [ ] **Step 6: حوّل HTML إلى shells بلا literals تحريرية**

أمثلة مطلوبة:

```html
<title></title>
<meta name="description" content="">
<link id="appFavicon" rel="icon" href="">
<img class="brand-logo" data-asset="brandLogo" src="" alt="">
<strong data-setting="developerName"></strong>
<button id="themeToggle" data-i18n-aria-label="accessibility.theme"></button>
<select id="langSwitcher" data-i18n-aria-label="accessibility.language"></select>
```

أزل من HTML أسماء `Coursera/edX/...` في cloud؛ containers تبقى فارغة ليتم render من data. أزل `اتحاد شباب الأمة`, aria labels الإنجليزية الثابتة، رموز الأزرار القابلة للتحرير، والـSEO literals.

- [ ] **Step 7: شغّل tests**

```bash
node --test tests/site-runtime.test.cjs tests/release-smoke.test.cjs
```

Expected: Site runtime tests PASS؛ release smoke قد يبقى أحمر حتى Tasks 6–7 إذا كان يفحص scripts الجديدة.

- [ ] **Step 8: Commit**

```bash
git add js/site-runtime.js tests/site-runtime.test.cjs manifest.webmanifest index.html explore.html platform.html
git commit -m "feat: bind site identity assets and SEO from CMS"
```

---

### Task 6: تحويل صفحة الاستكشاف والاختبار والمسارات إلى CMS-driven content

**Files:**
- Modify: `js/app.js`
- Modify: `explore.html`
- Modify: `tests/platform-directory.test.cjs`
- Create: `tests/no-hardcoded-content.test.cjs`

**Interfaces:**
- Consumes global `content`/Content API initialized at boot.
- `quickFilters` تأتي من `data.json.quiz.quickFilters` أو `settings.quickFilters` حسب migrated shape؛ نثبت هنا الخيار النهائي: **`quiz.quickFilters`**.
- `quiz.learningPaths` stores stage platform IDs, not names.

- [ ] **Step 1: اكتب test يمنع hardcoded maps/icons القديمة**

```js
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const app=fs.readFileSync('js/app.js','utf8');
const explore=fs.readFileSync('explore.html','utf8');

test('explore runtime has no hardcoded CMS-owned content maps',()=>{
  assert.doesNotMatch(app,/const FEATURED_IDS=/);
  assert.doesNotMatch(app,/const PATHS=/);
  assert.doesNotMatch(app,/const icons=\[/);
  assert.doesNotMatch(app,/\['english','انجليزي','إنجليزي'\]/);
  assert.doesNotMatch(explore,/>Coursera<|>edX<|>اتحاد شباب الأمة</);
});
```

- [ ] **Step 2: شغّل test وتأكد من الفشل على constants الحالية**

```bash
node --test tests/no-hardcoded-content.test.cjs
```

Expected: FAIL على `FEATURED_IDS`, `PATHS`, `icons` أو cloud literals.

- [ ] **Step 3: عدّل boot sequence**

بعد `DataLoader.loadSiteData()`:

```js
const data = await DataLoader.loadSiteData();
initContent(data);
setLang(params.get('lang') || content.rawSetting('defaultLanguage') || 'ar');
SiteRuntime.applyDocument(document, content, 'explore');
```

ثم normalize platforms.

- [ ] **Step 4: استبدل category/language labels والـcontent count**

`descriptionFor`, `languagesLabel`, `renderCategories`, `platformCard`, `buildCompareTable` تستخدم `content.platformName`, `content.platformDescription`, `content.categoryLabel`, `content.languageLabel`, `content.contentCountLabel`.

category card icon يأتي من `category.icon`; لا array داخل JS.

- [ ] **Step 5: اجعل quick filters data-driven**

شكل البيانات:

```json
{
  "id":"free",
  "type":"free",
  "targetId":"",
  "label":{"ar":"محتوى مجاني","en":"Free content","tr":"Ücretsiz içerik"},
  "icon":"✓"
}
```

الأنواع المسموحة فقط: `free`, `certificate`, `category`, `language`. أي type آخر لا يُرندر.

- [ ] **Step 6: اجعل quiz/path config من البيانات**

`buildQuiz()` يقرأ questions/options labels من `quiz`، بينما `runQuiz()` يبقي scoring algorithm في الكود باستخدام stable IDs.

`buildPath()` يقرأ `quiz.learningPaths[goalId].stages`, وكل stage array تحتوي platform IDs؛ لا lookup بالاسم ولا `PATHS` constant.

- [ ] **Step 7: اجعل كل icons المرئية من `assets.icons`**

استخدم `content.icon('favoriteOn')`, `content.icon('favoriteOff')`, `content.icon('share')`, `content.icon('compare')`, `content.icon('external') || content.icon('share')`, `content.icon('random')`, `content.icon('path')`, `content.icon('install')`, `content.icon('reset')`.

- [ ] **Step 8: شغّل اختبارات الصفحة/الدليل**

```bash
node --test tests/no-hardcoded-content.test.cjs tests/platform-directory.test.cjs tests/release-smoke.test.cjs
```

Expected: PASS للـhardcoded test والدليل؛ smoke يجب ألا يحتوي literals المنقولة.

- [ ] **Step 9: Commit**

```bash
git add js/app.js explore.html tests/no-hardcoded-content.test.cjs tests/platform-directory.test.cjs tests/release-smoke.test.cjs
git commit -m "feat: drive explorer quiz and paths from CMS data"
```

---

### Task 7: تحويل Landing وPlatform Detail بالكامل إلى Content API

**Files:**
- Modify: `js/landing.js`
- Modify: `js/platform-detail.js`
- Modify: `index.html`
- Modify: `platform.html`
- Modify: `tests/landing.test.cjs`
- Modify: `tests/platform-detail.test.cjs`
- Modify: `tests/no-hardcoded-content.test.cjs`

**Interfaces:**
- Both pages consume `ContentAPI`, `SiteRuntime`, and `initContent(data)`.
- Platform detail uses `categoryId/languageIds/logo/editorial` shape from Task 4.

- [ ] **Step 1: أضف tests لتغيير اسم الموقع/logo/alt واللغة**

اختبر أن landing boot contract يستدعي content initialization قبل translations، وأن detail model يعيد:

```js
{
  name: 'Localized name',
  description: 'Localized description',
  categoryId: 'technology',
  languageIds: ['English'],
  logo: {src:'...',alt:'Localized alt'}
}
```

- [ ] **Step 2: شغّل tests وأثبت الفشل**

```bash
node --test tests/landing.test.cjs tests/platform-detail.test.cjs
```

Expected: FAIL بسبب الاعتماد الحالي على `mergeSiteText`, `p.name`, `p.category`, `p.languages`, `icon.svg`.

- [ ] **Step 3: حدّث Landing boot**

```js
const data = await DataLoader.loadSiteData();
initContent(data);
setLang(params.get('lang') || content.rawSetting('defaultLanguage') || 'ar');
SiteRuntime.applyDocument(document, content, 'home');
renderPlatformCloud(data.settings.homePlatformCloud || []);
```

إحصاءات المنصات تبقى من `PlatformDirectory.getStats`.

- [ ] **Step 4: حدّث Platform Detail model والرندر**

- name/description/logo alt/editorial من Content API.
- `similarPlatforms` يقارن `categoryId`.
- fallback logo من `assets.platformFallbackLogo` إن كان موجودًا؛ إذا لم يوجد logo ولا fallback، لا ترندر `<img>` بدل استخدام `icon.svg` hardcoded.
- official/catalog links تمر عبر `content.safeUrl(...,{allowRelative:false})`.
- `document.title` لا يُبنى يدويًا؛ `SiteRuntime.applySeo` يدير page title الأساسي، ثم detail page يمرر token platform name إلى helper `applyPlatformSeo(doc, content, model)` الذي يستبدل `{platform}` في CMS-managed template.

شكل `seo.platform[lang].title` يجب أن يدعم template مثل:

```text
{platform} — دنيا الدورات
```

ولا يسمح إلا باستبدال `{platform}` كنص.

- [ ] **Step 5: حدّث `index.html` و`platform.html` bindings**

أزل developer name والرموز/aria/alt/SEO literals المتبقية. كل editable destination يستخدم `data-link`.

- [ ] **Step 6: شغّل tests**

```bash
node --test tests/landing.test.cjs tests/platform-detail.test.cjs tests/no-hardcoded-content.test.cjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add js/landing.js js/platform-detail.js index.html platform.html tests/landing.test.cjs tests/platform-detail.test.cjs tests/no-hardcoded-content.test.cjs
git commit -m "feat: drive landing and platform profile from CMS"
```

---

### Task 8: إعادة بناء Decap config generator للمخطط الكامل

**Files:**
- Modify: `scripts/generate-decap-config.cjs`
- Modify: `admin/config.yml` (generated)
- Modify: `tests/decap-cms.test.cjs`
- Modify: `docs/decap-cms-setup.md`

**Interfaces:**
- Generator reads `data.json` and recursively renders grouped `siteText` translation fields.
- Top-level Decap entry remains **واحدًا** يشير إلى `data.json` لتجنب conflicting writes على نفس الملف؛ داخله object groups مطوية وواضحة للأقسام الـ11.

- [ ] **Step 1: اكتب failing tests للـCMS structure**

```js
test('Decap exposes all full CMS groups',()=>{
  for(const label of ['إعدادات الموقع','الهوية والصور','نصوص الموقع','التصنيفات','اللغات','الاختبار والترشيحات','المقارنة','SEO','المنصات']) {
    assert.ok(config.includes(label),`missing ${label}`);
  }
});

test('image fields use Decap media library and OAuth proxy remains configured',()=>{
  assert.match(config,/widget: image/);
  assert.match(config,/base_url: https:\/\/dunya-decap-oauth\.atomy8774\.workers\.dev/);
  assert.match(config,/auth_endpoint: auth/);
  assert.doesNotMatch(config,/GITHUB_OAUTH_SECRET|client_secret/i);
});
```

- [ ] **Step 2: شغّل tests وأثبت فشل structure الحالية**

```bash
node --test tests/decap-cms.test.cjs
```

Expected: FAIL على المجموعات الجديدة/image widgets.

- [ ] **Step 3: أضف recursive translation field renderer**

```js
function isLocalizedLeaf(value){
  return value && typeof value==='object' && !Array.isArray(value) && ['ar','en','tr'].every(lang => typeof value[lang]==='string');
}
function renderEditableTree(label,name,value,indent){
  if(isLocalizedLeaf(value)) return renderTranslationObject(label,name,indent);
  if(value && typeof value==='object' && !Array.isArray(value)) return renderObjectFields(label,name,value,indent);
  throw new Error(`Unsupported siteText node ${name}`);
}
```

`renderTranslationObject` يعرض العربية/English/Türkçe في نفس الحقل المفهومي.

- [ ] **Step 4: أضف widgets لكل domain**

- settings links: `string` مع hint أنها URL/path.
- themeColor: `color` إن كان مدعومًا في النسخة المستخدمة؛ إن لم يكن، `string` مع pattern hex في validation runtime.
- global assets وplatform logo: `image`.
- alt/name/description/SEO labels: object يحتوي ar/en/tr.
- categories/languages: list مع `id`, localized `label`, `icon`, `enabled`, `displayOrder`.
- platform technical IDs: string labels تحذر: `معرّف تقني — لا تغيّره بعد النشر`.
- categoryId/languageIds داخل platform: string/list string؛ لا تستخدم relation widget لأن السجلات nested داخل نفس file entry ولا نريد config stale عند إضافة taxonomy عبر CMS.
- officialUrl/catalogUrl: `string`، runtime validator هو صاحب الحكم النهائي.

- [ ] **Step 5: ولّد config ثم check**

```bash
node scripts/generate-decap-config.cjs
node scripts/generate-decap-config.cjs --check
node --test tests/decap-cms.test.cjs
```

Expected: الثلاثة PASS.

- [ ] **Step 6: حدّث دليل Decap**

وثّق أن:

```text
- المستخدم يحرر كل شيء من entry واحدة منظمة لأن كل الأقسام تكتب إلى data.json نفسه.
- IDs التقنية لا تغير بعد النشر إلا مع فهم المرجعيات.
- رفع الصور يتم إلى assets/uploads.
- OAuth Secret يبقى في Cloudflare فقط.
- إضافة category/language جديدة تتطلب ID جديدًا فريدًا، ثم استخدام نفس ID في platform references.
```

- [ ] **Step 7: Commit**

```bash
git add scripts/generate-decap-config.cjs admin/config.yml tests/decap-cms.test.cjs docs/decap-cms-setup.md
git commit -m "feat: expose full site content in Decap CMS"
```

---

### Task 9: تحديث Service Worker وCI ومنع regression للمحتوى الثابت

**Files:**
- Create: `scripts/validate-content.cjs`
- Modify: `sw.js`
- Modify: `.github/workflows/test.yml`
- Modify: `tests/release-smoke.test.cjs`
- Modify: `tests/branding.test.cjs`
- Modify: `tests/no-hardcoded-content.test.cjs`

**Interfaces:**
- `scripts/validate-content.cjs` uses `scripts/content-schema.cjs` and exits non-zero on schema/reference errors.
- Service worker version becomes `dunya-al-dawrat-v12`.

- [ ] **Step 1: اكتب validator script واختباره عبر التنفيذ**

`scripts/validate-content.cjs`:

```js
const fs=require('node:fs');
const {validateContentData,validateStableReferences}=require('./content-schema.cjs');
const data=JSON.parse(fs.readFileSync('data.json','utf8'));
validateStableReferences(validateContentData(data));
console.log(`Validated ${data.platforms.length} CMS-managed platforms`);
```

Run:

```bash
node scripts/validate-content.cjs
```

Expected: `Validated 110 CMS-managed platforms`.

- [ ] **Step 2: حدّث service worker إلى v12**

أضف إلى CORE:

```text
./js/content-api.js
./js/site-runtime.js
```

واحتفظ `data.json` و`admin/config.yml` network-first. حدّث tests التي تتوقع `v11` إلى `v12` فقط بعد تعديل `sw.js`.

- [ ] **Step 3: استبدل inline JSON validation في workflow**

في `.github/workflows/test.yml`:

```yaml
- name: Validate CMS content
  run: node scripts/validate-content.cjs
- name: Verify Decap configuration matches data.json
  run: node scripts/generate-decap-config.cjs --check
- name: Prevent CMS-owned content regressions
  run: node --test tests/no-hardcoded-content.test.cjs
```

احتفظ ببقية unit tests, syntax checks, Supabase ban, `git diff --check`.

- [ ] **Step 4: قوِّ no-hardcoded tests على المواضع المعروفة**

افحص `i18n.js` لعدم وجود `catMap`, `langMap`, `UNIT_LABELS`, أو أسماء التصنيفات/اللغات المنقولة. افحص HTML لعدم وجود developer/site names/cloud names/aria labels المنقولة. لا تمنع كل string literal في JavaScript.

- [ ] **Step 5: شغّل مجموعة التحقق الكاملة محليًا**

```bash
node --test tests/*.test.cjs
for f in js/*.js scripts/*.cjs; do node --check "$f"; done
node scripts/validate-content.cjs
node scripts/generate-decap-config.cjs --check
git diff --check
```

Expected: جميع الأوامر exit 0؛ test count لا يحتوي failures؛ validator يطبع 110.

- [ ] **Step 6: Commit**

```bash
git add scripts/validate-content.cjs sw.js .github/workflows/test.yml tests/release-smoke.test.cjs tests/branding.test.cjs tests/no-hardcoded-content.test.cjs
git commit -m "chore: validate full CMS content in CI"
```

---

### Task 10: تحقق وظيفي نهائي من كل صفحة قبل الدمج

**Files:**
- Modify only if failures reveal missing bindings: `index.html`, `explore.html`, `platform.html`, `js/*.js`, relevant tests.
- Test: full `tests/*.test.cjs`.

**Interfaces:**
- No new interfaces. هذه بوابة قبول للمواصفة كلها.

- [ ] **Step 1: نفّذ automated acceptance checks**

Run:

```bash
node --test tests/*.test.cjs
for f in js/*.js scripts/*.cjs; do node --check "$f"; done
node scripts/validate-content.cjs
node scripts/generate-decap-config.cjs --check
git diff --check
```

Expected: 0 failures، 110 platforms، config current.

- [ ] **Step 2: اختبر تغيير اللغة في fixtures/runtime tests**

يجب أن تثبت tests أن الانتقال ar → en → tr يغيّر معًا:

```text
html.lang
html.dir
visible text
image alt
SEO title
meta description
category label
language label
```

- [ ] **Step 3: اختبر تعريف الانتهاء على data copy محلي لا على main**

باستخدام Node script صغير مؤقت داخل command فقط، اقرأ `data.json`, غيّر في نسخة memory القيم التالية ثم مررها إلى Content API/SiteRuntime tests دون كتابة الملف:

```text
settings.siteName.ar
siteText.home.landingHeroTitle.ar
categories[0].label.ar
languages[0].label.ar
assets.brandLogo.src + alt.ar
seo.home.ar.title + description
platforms[0].description.ar
```

Expected: كل getter/binding يعكس القيمة الجديدة ولا يحتاج تعديل كود.

- [ ] **Step 4: راجع عدم فقد البيانات**

Run:

```bash
node - <<'NODE'
const d=require('./data.json');
console.log({platforms:d.platforms.length,categories:d.categories.length,languages:d.languages.length});
if(d.platforms.length!==110)process.exit(1);
NODE
```

Expected: `platforms: 110`.

- [ ] **Step 5: Commit فقط إن احتجت إصلاحات acceptance**

```bash
git add -A
git commit -m "fix: complete full CMS acceptance bindings"
```

إذا لم توجد تغييرات، لا تنشئ commit فارغًا.

---

### Task 11: الدمج، GitHub Pages، واختبار Decap الحقيقي

**Files:**
- No planned code changes; أي bug مكتشف يعاد إلى Task مناسب مع failing test أولًا.

**Interfaces:**
- Uses existing GitHub/Cloudflare OAuth setup.

- [ ] **Step 1: قبل الدمج، تحقق من CI على branch التنفيذ**

Expected required checks:

```text
Run unit and architecture tests — success
Check JavaScript syntax — success
Validate CMS content — success
Verify Decap configuration matches data.json — success
Prevent legacy Supabase runtime dependencies — success
Prevent CMS-owned content regressions — success
git diff --check — success
```

- [ ] **Step 2: ادمج إلى `main` فقط بعد نجاح CI**

استخدم fast-forward أو PR merge وفق حالة branch، بدون force push على main.

- [ ] **Step 3: تحقق من GitHub Pages deployment**

Expected: `pages build and deployment` على SHA المدمج ينتهي `success`.

- [ ] **Step 4: اختبر `/admin/` وتسجيل GitHub OAuth**

افتح:

```text
https://devmyskilla.github.io/admin/
```

ثم `Login with GitHub`. Expected auth path يبدأ بـ:

```text
https://dunya-decap-oauth.atomy8774.workers.dev/auth
```

ولا يعود إلى `api.netlify.com`.

- [ ] **Step 5: نفّذ smoke edit حقيقي من CMS ثم أعده**

من Decap غيّر مؤقتًا قيمة غير خطرة، مثل `siteText.home.landingHeroTitle.ar` بإضافة ` — اختبار CMS`، انشر، انتظر Pages deployment، وتأكد أنها تظهر. بعدها أعد القيمة الأصلية **من Decap نفسه** وانشر مرة ثانية وتأكد من عودة النص الأصلي.

هذا الاختبار يثبت end-to-end:

```text
Decap form → GitHub commit → data.json → GitHub Pages → runtime Content API → DOM
```

- [ ] **Step 6: نفّذ smoke edit للوسائط بدون تغيير الهوية نهائيًا**

ارفع صورة اختبار صغيرة من Media Library إلى `assets/uploads`, اخترها مؤقتًا لـ`assets.heroLogo`, انشر وتأكد من ظهورها وalt الصحيح، ثم أعد الأصل الحالي من Decap وانشر مرة ثانية. أبقِ ملف الاختبار في `assets/uploads` فقط إذا كان مقصودًا؛ وإلا احذفه بcommit cleanup بعد التحقق.

- [ ] **Step 7: تحقق النهائي بعد إعادة القيم الأصلية**

Expected:

```text
CI main: success
Pages: success
/admin/: loads
GitHub OAuth: succeeds
110 platforms: preserved
site text/assets/SEO/taxonomy/platform edit flow: proven
```

إذا ظهرت مشكلة، لا تعمل workaround يدويًا في `admin/config.yml`; أصلح source generator أو runtime المناسب واكتب regression test أولًا.

---

## Plan Self-Review Result

- **Spec coverage:** جميع أقسام المواصفة مغطاة: schema، migration، Content API، i18n، HTML bindings، links/assets/icons/alt، categories/languages IDs، quiz/comparison/path data، SEO، fallback، Decap generator، media library، CI، service worker، GitHub Pages، واختبار `/admin/` الحقيقي.
- **Data preservation:** يوجد gate صريح للـ110 منصة ومرجعيات categories/languages في Tasks 1, 2, 9, 10, 11.
- **No raw injection:** Site Runtime contract يقصر التحديث على `textContent`/attributes validated ولا يسمح HTML/CSS/JS من CMS.
- **Type consistency:** `categoryId`, `languageIds`, localized `{ar,en,tr}`, `logo:{src,alt}`, و`editorial` تستخدم نفس الأسماء من migration حتى runtime/tests.
- **Decap consistency:** generator هو المصدر الوحيد لـ`admin/config.yml`; OAuth proxy محفوظ؛ no secret in repo.
- **No placeholders:** لا توجد خطوات مؤجلة أو تعليمات عامة غير مرتبطة بأمر/ملف/عقد محدد.
