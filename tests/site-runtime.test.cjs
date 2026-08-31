const test=require('node:test');
const assert=require('node:assert/strict');
const ContentAPI=require('../js/content-api.js');
const SiteRuntime=require('../js/site-runtime.js');

const fixture={
  settings:{siteName:{ar:'الاسم',en:'Name',tr:'Ad'},defaultLanguage:'ar',themeColor:'#123456',localeNames:{ar:'العربية',en:'English',tr:'Türkçe'},links:{home:'index.html',explore:'explore.html'}},
  assets:{brandLogo:{src:'assets/logo.png',alt:{ar:'شعار',en:'Logo',tr:'Logo'}},favicon:{src:'assets/icon.png',alt:{ar:'أيقونة',en:'Icon',tr:'Simge'}},icons:{search:'⌕'}},
  seo:{home:{ar:{title:'الرئيسية',description:'وصف',ogTitle:'رئيسية OG',ogDescription:'وصف OG',ogImage:'assets/og.png'},en:{title:'Home',description:'Desc',ogTitle:'Home OG',ogDescription:'OG Desc',ogImage:'assets/og.png'},tr:{title:'Ana',description:'Açıklama',ogTitle:'Ana OG',ogDescription:'OG',ogImage:'assets/og.png'}}},
  siteText:{home:{headline:{ar:'عنوان',en:'Headline',tr:'Başlık'}},accessibility:{language:{ar:'اللغة',en:'Language',tr:'Dil'}}},
  categories:[],languages:[],quiz:{},comparison:{},platforms:[]
};

function element(dataset={}){
  return{dataset:{...dataset},textContent:'',src:'',href:'',alt:'',placeholder:'',attributes:{},setAttribute(name,value){this.attributes[name]=String(value);if(name==='content')this.content=String(value);if(name==='href')this.href=String(value);if(name==='src')this.src=String(value);if(name==='alt')this.alt=String(value);if(name==='aria-label')this.ariaLabel=String(value);if(name==='title')this.title=String(value)}};
}
function seoDocument(){
  const metas={
    'meta[name="description"]':element(),
    'meta[property="og:title"]':element(),
    'meta[property="og:description"]':element(),
    'meta[property="og:image"]':element(),
    'meta[name="theme-color"]':element()
  };
  return{title:'',documentElement:{lang:'',dir:''},querySelector(sel){return metas[sel]||null},querySelectorAll(){return[]},metas};
}

test('SEO follows the selected CMS language',()=>{
  const api=ContentAPI.create(fixture,'ar'),doc=seoDocument();
  SiteRuntime.applySeo(doc,api,'home');
  assert.equal(doc.title,'الرئيسية');
  assert.equal(doc.metas['meta[name="description"]'].content,'وصف');
  api.setLang('en');
  SiteRuntime.applySeo(doc,api,'home');
  assert.equal(doc.title,'Home');
  assert.equal(doc.metas['meta[name="description"]'].content,'Desc');
});

test('asset binding changes src and localized alt without innerHTML',()=>{
  const api=ContentAPI.create(fixture,'ar'),asset=element({asset:'brandLogo'});
  const doc={querySelectorAll(sel){return sel==='[data-asset]'?[asset]:[]},querySelector(){return null}};
  SiteRuntime.applyAssets(doc,api);
  assert.equal(asset.src,'assets/logo.png');
  assert.equal(asset.alt,'شعار');
  assert.equal(Object.hasOwn(asset,'innerHTML'),false);
});

test('settings links icons and translated text are bound from CMS data',()=>{
  const api=ContentAPI.create(fixture,'en');
  const setting=element({setting:'siteName'}),link=element({link:'explore'}),icon=element({icon:'search'}),text=element({i18n:'home.headline'});
  const doc={
    documentElement:{},
    querySelector(){return null},
    querySelectorAll(sel){return {'[data-setting]':[setting],'[data-link]':[link],'[data-icon]':[icon],'[data-i18n]':[text],'[data-i18n-placeholder]':[],'[data-i18n-aria-label]':[],'[data-i18n-title]':[],'[data-asset]':[]}[sel]||[]}
  };
  SiteRuntime.applyContentBindings(doc,api);
  assert.equal(setting.textContent,'Name');
  assert.equal(link.href,'explore.html');
  assert.equal(icon.textContent,'⌕');
  assert.equal(text.textContent,'Headline');
});

test('createManifest is driven by CMS identity and validated assets',()=>{
  const api=ContentAPI.create(fixture,'en');
  const manifest=SiteRuntime.createManifest(api,'https://example.com/');
  assert.equal(manifest.name,'Name');
  assert.equal(manifest.start_url,'index.html');
  assert.equal(manifest.theme_color,'#123456');
  assert.equal(manifest.icons[0].src,'https://example.com/assets/icon.png');
});

test('platform SEO substitutes only the platform token',()=>{
  const data=structuredClone(fixture);
  data.seo.platform={en:{title:'{platform} — Name',description:'Profile for {platform}',ogTitle:'{platform}',ogDescription:'Profile for {platform}',ogImage:'assets/og.png'}};
  const api=ContentAPI.create(data,'en'),doc=seoDocument();
  SiteRuntime.applyPlatformSeo(doc,api,{name:'Example <b>'});
  assert.equal(doc.title,'Example <b> — Name');
  assert.equal(doc.metas['meta[name="description"]'].content,'Profile for Example <b>');
});
