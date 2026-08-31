const test = require('node:test');
const assert = require('node:assert/strict');
const PlatformDirectory = require('../js/platform-directory.js');

const loc=(ar,en=ar,tr=en)=>({ar,en,tr});
const sample=[
  {id:'a',name:loc('ألفا','Alpha','Alpha'),categoryId:'technology',languageIds:['English'],pricingModel:'freemium',hasFreeContent:true,certificateAvailable:true,freeCertificate:true,lastVerified:'2026-08-20',officialCount:100,officialCountType:'courses',featured:false,displayOrder:2,editorial:{bestFor:{ar:['مبتدئون'],en:['Beginners'],tr:['Yeni başlayanlar']}},officialUrl:'https://alpha.example'},
  {id:'b',name:loc('بيتا','Beta','Beta'),categoryId:'business',languageIds:['Arabic','English'],pricingModel:'paid',hasFreeContent:false,certificateAvailable:true,freeCertificate:false,lastVerified:'2026-06-01',officialCount:null,featured:true,displayOrder:4,editorial:{bestFor:{ar:[],en:[],tr:[]}},officialUrl:'https://beta.example'},
  {id:'c',name:loc('غاما','Gamma','Gamma'),categoryId:'technology',languageIds:['Turkish'],pricingModel:'free',hasFreeContent:true,certificateAvailable:false,freeCertificate:false,lastVerified:null,officialCount:25,officialCountType:'modules',featured:false,displayOrder:1,editorial:{bestFor:{ar:[],en:[],tr:[]}}}
];

test('builds unique filter options from stable IDs',()=>{
  const options=PlatformDirectory.getFilterOptions(sample);
  assert.deepEqual(options.categories,['business','technology']);
  assert.deepEqual(options.languages,['Arabic','English','Turkish']);
  assert.deepEqual(options.pricingModels,['free','freemium','paid']);
});

test('computes platform-level stats only',()=>{
  assert.deepEqual(PlatformDirectory.getStats(sample),{platforms:3,free:2,certificates:2,languages:3});
});

test('groups categories with counts',()=>{
  assert.deepEqual(PlatformDirectory.getCategoryGroups(sample),[{categoryId:'technology',count:2},{categoryId:'business',count:1}]);
});

test('uses featured flag first and fallback IDs only when no rows are featured',()=>{
  assert.deepEqual(PlatformDirectory.getFeatured(sample,['a']).map(p=>p.id),['b']);
  const noFlags=sample.map(p=>({...p,featured:false}));
  assert.deepEqual(PlatformDirectory.getFeatured(noFlags,['a','c']).map(p=>p.id),['a','c']);
});

test('visible platforms apply stable category and language filters',()=>{
  const visible=PlatformDirectory.getVisiblePlatforms(sample,{category:'technology',language:'English',pricingModel:'freemium',verification:'recent',freeOnly:true,certificateOnly:true,sort:'recommended',now:new Date('2026-08-26T12:00:00Z')});
  assert.deepEqual(visible.map(p=>p.id),['a']);
});

test('official count sort keeps unknown counts last',()=>{
  assert.deepEqual(PlatformDirectory.getVisiblePlatforms(sample,{sort:'official_count'}).map(p=>p.id),['a','c','b']);
});

test('recommended sort does not use local view counts as a global signal',()=>{
  const withViews=sample.map(p=>({...p,localViews:p.id==='a'?99999:0}));
  assert.deepEqual(PlatformDirectory.getVisiblePlatforms(withViews,{sort:'recommended'}).map(p=>p.id),['b','c','a']);
});

test('card facts expose raw official content and verification flags',()=>{
  const facts=PlatformDirectory.cardFacts(sample[0],new Date('2026-08-26T12:00:00Z'));
  assert.deepEqual(facts.officialContent,{count:100,type:'courses'});
  assert.equal(facts.showOfficialCount,true);
  assert.equal(facts.verification,'recent');
  assert.equal(facts.showVerification,true);
});

test('card facts hide missing count and verification',()=>{
  const facts=PlatformDirectory.cardFacts(sample[1],new Date('2026-08-26T12:00:00Z'));
  assert.equal(facts.officialContent,null);
  assert.equal(facts.showOfficialCount,false);
});

test('comparison rows expose stable IDs and editorial data',()=>{
  const rows=PlatformDirectory.comparisonRows([sample[0],sample[2]],new Date('2026-08-26T12:00:00Z'));
  assert.equal(rows[0].categoryId,'technology');
  assert.deepEqual(rows[0].languageIds,['English']);
  assert.deepEqual(rows[0].officialContent,{count:100,type:'courses'});
  assert.deepEqual(rows[0].editorial.bestFor.en,['Beginners']);
  assert.equal(rows[1].showVerification,false);
});

test('comparison migration prefers current IDs, removes invalid IDs, deduplicates and caps at three',()=>{
  assert.deepEqual(PlatformDirectory.migrateComparisonIds(['c','c','missing','a','b','extra'],['b','a'],['a','b','c','d'],3),['c','a','b']);
});

test('comparison migration uses legacy IDs only when the new key is absent',()=>{
  assert.deepEqual(PlatformDirectory.migrateComparisonIds(null,['b','missing','a','c','d'],['a','b','c','d'],3),['b','a','c']);
});
