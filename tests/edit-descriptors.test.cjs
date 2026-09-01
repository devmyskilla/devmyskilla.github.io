const test=require('node:test');
const assert=require('node:assert/strict');
const EditDescriptors=require('../js/edit-descriptors.js');
const ContentAPI=require('../js/content-api.js');

const loc=(ar,en,tr)=>({ar,en,tr});
const data={
  settings:{
    siteName:loc('س','S','S'),
    developerName:loc('م','D','G'),
    copyright:loc('ح','C','T'),
    defaultLanguage:'ar',
    themeColor:'#123456',
    links:{home:'index.html',explore:'explore.html'}
  },
  assets:{
    brandLogo:{src:'logo.png',alt:loc('شعار','Logo','Logo')},
    icons:{search:'⌕'}
  },
  siteText:{
    home:{hero:loc('عنوان','Title','Başlık')},
    common:{save:loc('حفظ','Save','Kaydet')}
  },
  seo:{home:{ar:{title:'أ'},en:{title:'A'},tr:{title:'A'}}},
  quiz:{},comparison:{},
  categories:[{id:'technology',label:loc('تقنية','Technology','Teknoloji'),icon:'◈',enabled:true,displayOrder:10}],
  languages:[{id:'English',label:loc('الإنجليزية','English','İngilizce'),enabled:true,displayOrder:10}],
  platforms:[{
    id:'plat-1',name:loc('منصة','Platform','Platform'),description:loc('وصف','Description','Açıklama'),
    categoryId:'technology',languageIds:['English'],pricingModel:'free',hasFreeContent:true,
    certificateAvailable:true,freeCertificate:false,officialUrl:'https://example.com',catalogUrl:'https://example.com/catalog',
    logo:{src:'x.png',alt:loc('شعار','Logo','Logo')},officialCount:null,officialCountType:'courses',lastVerified:null,
    platformType:'',featured:false,displayOrder:1,
    editorial:{bestFor:{ar:[],en:[],tr:[]},strengths:{ar:[],en:[],tr:[]},limitations:{ar:[],en:[],tr:[]}}
  }]
};

test('Content API resolves a short text key to one canonical path',()=>{
  const api=ContentAPI.create(data,'ar');
  assert.equal(api.findTextPath('hero'),'siteText.home.hero');
  assert.equal(api.findTextPath('home.hero'),'siteText.home.hero');
  assert.equal(api.findTextPath('missing'),'');
});

test('Content API rejects ambiguous short text keys',()=>{
  const ambiguous=structuredClone(data);
  ambiguous.siteText.common.hero=loc('س','S','S');
  assert.equal(ContentAPI.create(ambiguous).findTextPath('hero'),'');
});

test('resolves static localized text to a canonical writable descriptor',()=>{
  const api=EditDescriptors.create(data);
  const r=api.resolveTarget({kind:'siteText',key:'hero'});
  assert.equal(r.descriptor.key,'siteText.home.hero');
  assert.equal(r.descriptor.widget,'localizedText');
  assert.equal(r.descriptor.localized,true);
  assert.equal(r.descriptor.writable,true);
  assert.deepEqual(r.value,loc('عنوان','Title','Başlık'));
});

test('resolves settings links assets categories and languages by known bindings',()=>{
  const api=EditDescriptors.create(data);
  assert.equal(api.resolveTarget({kind:'setting',key:'siteName'}).descriptor.widget,'localizedText');
  assert.equal(api.resolveTarget({kind:'link',key:'explore'}).descriptor.widget,'link');
  assert.equal(api.resolveTarget({kind:'asset',key:'brandLogo'}).descriptor.widget,'asset');
  assert.equal(api.resolveTarget({kind:'category',id:'technology',field:'label'}).descriptor.widget,'localizedText');
  assert.equal(api.resolveTarget({kind:'language',id:'English',field:'label'}).descriptor.widget,'localizedText');
});

test('dynamic platform description uses a stable id',()=>{
  const api=EditDescriptors.create(data);
  const r=api.resolveTarget({kind:'platform',id:'plat-1',field:'description'});
  assert.equal(r.descriptor.id,'plat-1');
  assert.equal(r.descriptor.key,'platform:plat-1:description');
  assert.deepEqual(r.value,loc('وصف','Description','Açıklama'));
});

test('platform stable id and arbitrary paths are never writable',()=>{
  const api=EditDescriptors.create(data);
  assert.equal(api.resolveTarget({kind:'platform',id:'plat-1',field:'id'}),null);
  assert.equal(api.resolveTarget({kind:'path',path:'platforms.0.id'}),null);
});

test('resolveNode converts existing CMS bindings and dynamic markers',()=>{
  const api=EditDescriptors.create(data);
  const staticNode={dataset:{i18n:'hero'}};
  assert.equal(api.resolveNode(staticNode).key,'siteText.home.hero');
  const dynamicNode={dataset:{editKind:'platform',editId:'plat-1',editField:'name'}};
  assert.equal(api.resolveNode(dynamicNode).key,'platform:plat-1:name');
});
