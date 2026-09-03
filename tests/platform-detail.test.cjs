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
    fields:[
      {id:'ai',name:loc('الذكاء الاصطناعي','Artificial Intelligence','Yapay Zekâ'),officialUrl:'https://example.com/ai'},
      {id:'data',name:loc('علم البيانات','Data Science','Veri Bilimi'),officialUrl:''}
    ],
    officialPaths:[
      {id:'data-path',officialName:'Data Science Path',name:loc('مسار علم البيانات','Data Science Path','Veri Bilimi Yolu'),type:'learning-path',officialUrl:'https://example.com/data-path',fieldIds:['data'],featured:false}
    ],
    pathResearch:{lastVerified:'2026-09-04',allPathsUrl:'https://example.com/all-paths'},
    editorial:{bestFor:{ar:['طلاب الجامعات'],en:['University learners'],tr:[]},strengths:{ar:[],en:['University partners'],tr:[]},limitations:{ar:[],en:['Some certificates are paid'],tr:[]}}
  },
  {id:'plat-2',name:loc('أغورا','Agora','Agora'),description:loc('','',''),categoryId:'academic',languageIds:['English','French'],certificateAvailable:false,freeCertificate:false,officialCount:null,lastVerified:null,logo:{src:'',alt:loc('','','')},fields:[],officialPaths:[],pathResearch:{lastVerified:'2026-09-04'},editorial:{bestFor:{ar:[],en:[],tr:[]},strengths:{ar:[],en:[],tr:[]},limitations:{ar:[],en:[],tr:[]}}}
];
const data={
  settings:{siteName:loc('دنيا الدورات','Dunya','Dunya')},assets:{platformFallbackLogo:{src:'icon.svg',alt:loc('شعار المنصة','Platform logo','Platform logosu')},icons:{}},
  seo:{platform:{ar:{title:'{platform}',description:'',ogTitle:'{platform}',ogDescription:'',ogImage:''},en:{title:'{platform}',description:'',ogTitle:'{platform}',ogDescription:'',ogImage:''},tr:{title:'{platform}',description:'',ogTitle:'{platform}',ogDescription:'',ogImage:''}}},
  siteText:{
    common:{contentUnits:{courses:loc('دورة','courses','kurs'),items:loc('عنصر','items','öğe')}},
    platform:{fields:loc('المجالات','Fields','Alanlar'),officialPaths:loc('المسارات الرسمية','Official Paths','Resmî Yollar'),viewOfficialPath:loc('عرض المسار','View path','Yolu görüntüle'),viewAllOfficialPaths:loc('عرض الكل','View all','Tümünü görüntüle'),pathTypes:{'learning-path':loc('مسار تعليمي','Learning path','Öğrenme yolu')}}
  },
  categories:[{id:'academic',label:loc('أكاديمي','Academic','Akademik')}],languages:[{id:'English',label:loc('الإنجليزية','English','İngilizce')},{id:'French',label:loc('الفرنسية','French','Fransızca')}],quiz:{},comparison:{},platforms
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

test('detail model keeps fields and official paths separate and localized',()=>{
  const api=ContentAPI.create(data,'ar');
  const model=PlatformDetail.buildDetailModel(platforms[0],'ar',new Date(),api);
  assert.equal(model.fields[0].name,'الذكاء الاصطناعي');
  assert.equal(model.fields[1].name,'علم البيانات');
  assert.equal(model.officialPaths[0].name,'مسار علم البيانات');
  assert.equal(model.officialPaths[0].typeLabel,'مسار تعليمي');
  assert.equal(model.officialPaths[0].officialName,'Data Science Path');
  assert.notDeepEqual(model.fields,model.officialPaths);
});

test('detail model caps visible official paths at 20 and exposes View All URL',()=>{
  const many={...platforms[0],officialPaths:Array.from({length:25},(_,i)=>({id:`p-${i}`,officialName:`Path ${i}`,name:loc(`مسار ${i}`,`Path ${i}`,`Yol ${i}`),type:'learning-path',officialUrl:`https://example.com/p-${i}`,fieldIds:['ai'],featured:i===24})),pathResearch:{lastVerified:'2026-09-04',allPathsUrl:'https://example.com/all-paths'}};
  const api=ContentAPI.create(data,'en');
  const model=PlatformDetail.buildDetailModel(many,'en',new Date(),api);
  assert.equal(model.officialPaths.length,20);
  assert.equal(model.officialPaths[0].id,'p-24');
  assert.equal(model.showAllPathsLink,true);
  assert.equal(model.allPathsUrl,'https://example.com/all-paths');
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

test('fields markup hides empty data and renders linked and plain chips',()=>{
  const safe=value=>/^https:\/\//.test(value||'')?value:'';
  assert.equal(PlatformDetail.fieldsMarkup({fields:[]},{title:'Fields'},safe),'');
  const html=PlatformDetail.fieldsMarkup({fields:[{id:'ai',name:'AI',officialUrl:'https://example.com/ai'},{id:'data',name:'Data Science',officialUrl:''}]},{title:'Fields'},safe);
  assert.match(html,/profile-fields-section/);
  assert.match(html,/href="https:\/\/example\.com\/ai"/);
  assert.match(html,/>Data Science</);
  assert.doesNotMatch(html,/href=""/);
});

test('official paths markup hides empty data and uses direct links and conditional View All',()=>{
  const safe=value=>/^https:\/\//.test(value||'')?value:'';
  assert.equal(PlatformDetail.officialPathsMarkup({officialPaths:[]},{title:'Paths',viewPath:'View path',viewAll:'View all'},safe),'');
  const model={officialPaths:[{id:'p1',name:'Localized path',officialName:'Official Source Name',typeLabel:'Learning path',officialUrl:'https://example.com/p1'}],showAllPathsLink:true,allPathsUrl:'https://example.com/all'};
  const html=PlatformDetail.officialPathsMarkup(model,{title:'Paths',viewPath:'View path',viewAll:'View all'},safe);
  assert.match(html,/href="https:\/\/example\.com\/p1"/);
  assert.match(html,/Official Source Name/);
  assert.match(html,/href="https:\/\/example\.com\/all"/);
  const sameName=PlatformDetail.officialPathsMarkup({officialPaths:[{id:'p1',name:'Data Science Path',officialName:'data science path',typeLabel:'Learning path',officialUrl:'https://example.com/p1'}],showAllPathsLink:false,allPathsUrl:''},{title:'Paths',viewPath:'View path',viewAll:'View all'},safe);
  assert.equal((sameName.match(/Data Science Path/gi)||[]).length,1);
  assert.doesNotMatch(sameName,/View all/);
});

test('similarPlatforms excludes current platform and matches categoryId',()=>{
  const similar=PlatformDetail.similarPlatforms(platforms,platforms[0],3);
  assert.deepEqual(similar.map(p=>p.id),['plat-2']);
});
