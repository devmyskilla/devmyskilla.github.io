const test = require('node:test');
const assert = require('node:assert/strict');
const ContentAPI = require('../js/content-api.js');

const fixture = {
  settings:{siteName:{ar:'الاسم',en:'Name',tr:'Ad'},defaultLanguage:'ar',links:{explore:'explore.html'}},
  assets:{brandLogo:{src:'assets/logo.png',alt:{ar:'شعار',en:'Logo',tr:'Logo'}},icons:{share:'↗'}},
  seo:{home:{ar:{title:'الرئيسية',description:'وصف',ogTitle:'رئيسية',ogDescription:'وصف OG',ogImage:'assets/og.png'},en:{title:'Home',description:'Desc',ogTitle:'Home',ogDescription:'OG',ogImage:'assets/og.png'},tr:{title:'Ana',description:'Açıklama',ogTitle:'Ana',ogDescription:'OG',ogImage:'assets/og.png'}}},
  siteText:{common:{hello:{ar:'مرحبا',en:'Hello',tr:'Merhaba'},contentUnits:{courses:{ar:'دورة',en:'courses',tr:'kurs'},items:{ar:'عنصر',en:'items',tr:'öğe'}}},home:{headline:{ar:'عنوان',en:'Headline',tr:'Başlık'}}},
  categories:[{id:'technology',label:{ar:'تقنية',en:'Technology',tr:'Teknoloji'},icon:'⌘'}],
  languages:[{id:'English',label:{ar:'الإنجليزية',en:'English',tr:'İngilizce'}}],
  quiz:{},comparison:{},platforms:[]
};

test('Content API resolves translated values from data only', () => {
  const api = ContentAPI.create(fixture,'ar');
  assert.equal(api.text('common.hello'),'مرحبا');
  assert.equal(api.text('hello'),'مرحبا');
  assert.equal(api.categoryLabel('technology'),'تقنية');
  assert.equal(api.languageLabel('English'),'الإنجليزية');
  api.setLang('tr');
  assert.equal(api.text('common.hello'),'Merhaba');
  assert.equal(api.setting('siteName'),'Ad');
});

test('Content API resolves assets, icons, SEO and settings', () => {
  const api=ContentAPI.create(fixture,'ar');
  assert.deepEqual(api.asset('brandLogo'),{src:'assets/logo.png',alt:'شعار'});
  assert.equal(api.icon('share'),'↗');
  assert.equal(api.link('explore'),'explore.html');
  assert.equal(api.seo('home').title,'الرئيسية');
});

test('invalid links and assets are rejected safely', () => {
  const api = ContentAPI.create(fixture,'en');
  assert.equal(api.safeUrl('javascript:alert(1)',{allowRelative:true}),'');
  assert.equal(api.safeUrl('explore.html',{allowRelative:true}),'explore.html');
  assert.equal(api.safeUrl('https://example.com',{allowRelative:false}),'https://example.com/');
});

test('platform helpers use localized CMS fields and content-unit labels',()=>{
  const api=ContentAPI.create(fixture,'en');
  const platform={
    name:{ar:'منصة',en:'Platform',tr:'Platform'},description:{ar:'وصف',en:'Description',tr:'Açıklama'},
    editorial:{bestFor:{ar:['طلاب'],en:['Students'],tr:['Öğrenciler']}},officialCount:12,officialCountType:'courses'
  };
  assert.equal(api.platformName(platform),'Platform');
  assert.equal(api.platformDescription(platform),'Description');
  assert.deepEqual(api.platformList(platform,'bestFor'),['Students']);
  assert.equal(api.contentCountLabel(platform),'12 courses');
});
