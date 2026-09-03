const test = require('node:test');
const assert = require('node:assert/strict');
const PlatformCore = require('../js/platform-core.js');

const now = new Date('2026-08-26T12:00:00Z');
const loc=(ar,en=ar,tr=en)=>({ar,en,tr});

test('normalizes full-CMS platform data without inventing an official count', () => {
  const p = PlatformCore.normalizeStaticPlatform({
    id:'plat-1', name:loc('فيوتشر ليرن','FutureLearn','FutureLearn'), description:loc('AR','EN','TR'),
    categoryId:'education', languageIds:['English'], pricingModel:'free', hasFreeContent:true,
    certificateAvailable:true, freeCertificate:true, officialUrl:'https://www.futurelearn.com/courses',
    logo:{src:'https://example.com/logo.png',alt:loc('شعار','Logo','Logo')}
  });
  assert.equal(p.id,'plat-1');
  assert.equal(p.hasFreeContent,true);
  assert.equal(p.certificateAvailable,true);
  assert.equal(p.freeCertificate,true);
  assert.deepEqual(p.languageIds,['English']);
  assert.equal(p.categoryId,'education');
  assert.equal(p.officialCount,null);
  assert.equal(p.pricingModel,'free');
  assert.equal(p.officialUrl,'https://www.futurelearn.com/courses');
  assert.equal(p.logo.src,'https://example.com/logo.png');
});

test('normalizes zero pricing to free', () => {
  assert.equal(PlatformCore.normalizeStaticPlatform({ pricingModel:0 }).pricingModel,'free');
  assert.equal(PlatformCore.normalizeStaticPlatform({ pricing_model:'0' }).pricingModel,'free');
});

test('official content exposes count and type without hardcoded labels',()=>{
  assert.deepEqual(PlatformCore.officialContent({officialCount:286,officialCountType:'job_simulations'}),{count:286,type:'job_simulations'});
  assert.equal(PlatformCore.officialContent({officialCount:null}),null);
  assert.equal(PlatformCore.shouldShowOfficialCount({officialCount:0}),true);
});

test('classifies verification date and hides missing verification', () => {
  assert.equal(PlatformCore.verificationState('2026-08-20', now), 'recent');
  assert.equal(PlatformCore.verificationState('2026-07-01', now), 'outdated');
  assert.equal(PlatformCore.verificationState(null, now), 'unverified');
  assert.equal(PlatformCore.shouldShowVerification({ lastVerified: null }), false);
  assert.equal(PlatformCore.shouldShowVerification({ lastVerified: 'invalid-date' }), false);
  assert.equal(PlatformCore.shouldShowVerification({ lastVerified: '2026-08-20' }), true);
});

test('selects localized pricing and certificate display keys', () => {
  assert.equal(PlatformCore.pricingDisplayKey({ pricingModel: 'free' }), 'pricing_free_display');
  assert.equal(PlatformCore.pricingDisplayKey({ pricingModel: 'paid' }), 'pricing_paid');
  assert.equal(PlatformCore.certificateDisplayKey({ freeCertificate: true }), 'certificate_free');
  assert.equal(PlatformCore.certificateDisplayKey({ certificateAvailable: true, freeCertificate: false }), 'certificate_available');
  assert.equal(PlatformCore.certificateDisplayKey({ certificateAvailable: false }), '');
});

test('search matches multilingual CMS fields and misses unrelated terms', () => {
  const p = PlatformCore.normalizeStaticPlatform({
    id:'plat-3',name:loc('IBM Skills Build','IBM Skills Build','IBM Skills Build'),
    description:loc('ذكاء اصطناعي','Artificial intelligence','Yapay zeka'),
    categoryId:'technology',languageIds:['Multilingual'],editorial:{bestFor:{ar:['طلاب'],en:['Students'],tr:['Öğrenciler']}}
  });
  assert.equal(PlatformCore.searchScore(p,'artificial intelligence')>=0,true);
  assert.equal(PlatformCore.searchScore(p,'ذكاء اصطناعي')>=0,true);
  assert.equal(PlatformCore.searchScore(p,'Yapay zeka')>=0,true);
  assert.equal(PlatformCore.searchScore(p,'quantum chemistry'),-1);
});

test('filters use stable category and language IDs', () => {
  const platforms=[
    PlatformCore.normalizeStaticPlatform({id:'a',name:loc('أ','A','A'),description:loc('','',''),categoryId:'technology',languageIds:['English'],pricingModel:'freemium',hasFreeContent:true,certificateAvailable:true,lastVerified:'2026-08-20'}),
    PlatformCore.normalizeStaticPlatform({id:'b',name:loc('ب','B','B'),description:loc('','',''),categoryId:'business',languageIds:['Arabic'],pricingModel:'paid',hasFreeContent:false,certificateAvailable:false,lastVerified:'2026-06-01'})
  ];
  const result=PlatformCore.filterPlatforms(platforms,{category:'technology',language:'English',pricingModel:'freemium',freeOnly:true,certificateOnly:true,verification:'recent',now});
  assert.deepEqual(result.map(p=>p.id),['a']);
});

test('sorts official counts descending with unknown values last', () => {
  const list=PlatformCore.sortPlatforms([
    {id:'a',name:loc('A'),officialCount:null},{id:'b',name:loc('B'),officialCount:25},{id:'c',name:loc('C'),officialCount:100}
  ],'official_count');
  assert.deepEqual(list.map(x=>x.id),['c','b','a']);
});

test('recommended sort uses featured and display order, not local view count', () => {
  const list=PlatformCore.sortPlatforms([
    {id:'a',name:loc('A'),featured:false,displayOrder:1,localViews:9999},
    {id:'b',name:loc('B'),featured:true,displayOrder:9,localViews:0},
    {id:'c',name:loc('C'),featured:false,displayOrder:0,localViews:0}
  ],'recommended');
  assert.deepEqual(list.map(x=>x.id),['b','c','a']);
});

test('comparison selection never exceeds three platforms and does not mutate input', () => {
  const input=['plat-1','plat-2','plat-3'];
  const result=PlatformCore.toggleComparison(input,'plat-4',3);
  assert.deepEqual(result.ids,['plat-1','plat-2','plat-3']);
  assert.equal(result.blocked,true);
  assert.deepEqual(input,['plat-1','plat-2','plat-3']);
});

test('comparison toggles an existing platform off', () => {
  const result=PlatformCore.toggleComparison(['plat-1','plat-2'],'plat-2',3);
  assert.deepEqual(result.ids,['plat-1']);
  assert.equal(result.blocked,false);
});

test('normalizeStaticPlatform preserves fields, official paths and research metadata',()=>{
  const row={
    id:'plat-x',name:loc('س','X','X'),description:loc('','',''),
    fields:[{id:'ai',name:loc('الذكاء الاصطناعي','Artificial Intelligence','Yapay Zekâ'),officialUrl:'https://example.com/ai'}],
    officialPaths:[{id:'ai-path',officialName:'AI Path',name:loc('مسار الذكاء الاصطناعي','AI Path','Yapay Zekâ Yolu'),type:'learning-path',officialUrl:'https://example.com/paths/ai',fieldIds:['ai'],featured:true}],
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
