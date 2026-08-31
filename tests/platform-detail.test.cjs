const test=require('node:test');
const assert=require('node:assert/strict');
const PlatformDetail=require('../js/platform-detail.js');
const ContentAPI=require('../js/content-api.js');

const loc=(ar,en=ar,tr=en)=>({ar,en,tr});
const platforms=[
  {
    id:'plat-1',name:loc('فيوتشر ليرن','FutureLearn','FutureLearn'),description:loc('وصف عربي','English description','Türkçe açıklama'),
    categoryId:'academic',pricingModel:'freemium',languageIds:['English'],hasFreeContent:true,certificateAvailable:true,freeCertificate:true,
    officialCount:1673,officialCountType:'courses',lastVerified:'2026-08-26',officialUrl:'https://www.futurelearn.com',catalogUrl:'https://www.futurelearn.com/courses',
    logo:{src:'https://example.com/future.png',alt:loc('شعار فيوتشر ليرن','FutureLearn logo','FutureLearn logosu')},
    editorial:{bestFor:{ar:['طلاب الجامعات'],en:['University learners'],tr:[]},strengths:{ar:[],en:['University partners'],tr:[]},limitations:{ar:[],en:['Some certificates are paid'],tr:[]}}
  },
  {id:'plat-2',name:loc('أغورا','Agora','Agora'),description:loc('','',''),categoryId:'academic',languageIds:['English','French'],certificateAvailable:false,freeCertificate:false,officialCount:null,lastVerified:null,logo:{src:'',alt:loc('','','')},editorial:{bestFor:{ar:[],en:[],tr:[]},strengths:{ar:[],en:[],tr:[]},limitations:{ar:[],en:[],tr:[]}}}
];
const data={
  settings:{siteName:loc('دنيا الدورات','Dunya','Dunya')},assets:{platformFallbackLogo:{src:'icon.svg',alt:loc('شعار المنصة','Platform logo','Platform logosu')},icons:{}},
  seo:{platform:{ar:{title:'{platform}',description:'',ogTitle:'{platform}',ogDescription:'',ogImage:''},en:{title:'{platform}',description:'',ogTitle:'{platform}',ogDescription:'',ogImage:''},tr:{title:'{platform}',description:'',ogTitle:'{platform}',ogDescription:'',ogImage:''}}},
  siteText:{common:{contentUnits:{courses:loc('دورة','courses','kurs'),items:loc('عنصر','items','öğe')}}},categories:[{id:'academic',label:loc('أكاديمي','Academic','Akademik')}],languages:[{id:'English',label:loc('الإنجليزية','English','İngilizce')},{id:'French',label:loc('الفرنسية','French','Fransızca')}],quiz:{},comparison:{},platforms
};

test('findPlatform matches exact stable ID only',()=>{
  assert.equal(PlatformDetail.findPlatform(platforms,'plat-1').id,'plat-1');
  assert.equal(PlatformDetail.findPlatform(platforms,'plat-999'),null);
  assert.equal(PlatformDetail.findPlatform(platforms,''),null);
});

test('buildDetailModel localizes new CMS platform shape',()=>{
  const api=ContentAPI.create(data,'en');
  const model=PlatformDetail.buildDetailModel(platforms[0],'en',new Date('2026-08-26T12:00:00Z'),api);
  assert.equal(model.name,'FutureLearn');
  assert.equal(model.description,'English description');
  assert.equal(model.categoryId,'academic');
  assert.deepEqual(model.languageIds,['English']);
  assert.deepEqual(model.logo,{src:'https://example.com/future.png',alt:'FutureLearn logo'});
  assert.equal(model.countLabel,'1673 courses');
  assert.equal(model.showOfficialCount,true);
  assert.equal(model.verification,'recent');
  assert.equal(model.freeCertificate,true);
});

test('buildDetailModel applies editorial English fallback without inventing values',()=>{
  const api=ContentAPI.create(data,'ar');
  const model=PlatformDetail.buildDetailModel(platforms[0],'ar',new Date(),api);
  assert.deepEqual(model.bestFor,['طلاب الجامعات']);
  assert.deepEqual(model.strengths,['University partners']);
  assert.deepEqual(model.limitations,['Some certificates are paid']);
});

test('missing count and verification remain empty and hidden',()=>{
  const api=ContentAPI.create(data,'en');
  const model=PlatformDetail.buildDetailModel(platforms[1],'en',new Date(),api);
  assert.equal(model.countLabel,'');
  assert.equal(model.showOfficialCount,false);
  assert.equal(model.showVerification,false);
});

test('similarPlatforms excludes current platform and matches categoryId',()=>{
  const similar=PlatformDetail.similarPlatforms(platforms,platforms[0],3);
  assert.deepEqual(similar.map(p=>p.id),['plat-2']);
});
