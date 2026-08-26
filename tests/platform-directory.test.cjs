const test = require('node:test');
const assert = require('node:assert/strict');
const PlatformDirectory = require('../js/platform-directory.js');

const sample = [
  {id:'a',name:'Alpha',category:'technology',languages:['English'],pricingModel:'freemium',hasFreeContent:true,certificateAvailable:true,lastVerified:'2026-08-20',officialCount:100,officialCountType:'courses',featured:false,displayOrder:2,best_for_en:['Beginners'],officialUrl:'https://alpha.example'},
  {id:'b',name:'Beta',category:'business',languages:['Arabic','English'],pricingModel:'paid',hasFreeContent:false,certificateAvailable:true,lastVerified:'2026-06-01',officialCount:null,featured:true,displayOrder:4,best_for_en:[],officialUrl:'https://beta.example'},
  {id:'c',name:'Gamma',category:'technology',languages:['Turkish'],pricingModel:'free',hasFreeContent:true,certificateAvailable:false,lastVerified:null,officialCount:25,officialCountType:'modules',featured:false,displayOrder:1}
];

test('builds unique filter options from normalized arrays', () => {
  const options = PlatformDirectory.getFilterOptions(sample);
  assert.deepEqual(options.categories, ['business','technology']);
  assert.deepEqual(options.languages, ['Arabic','English','Turkish']);
  assert.deepEqual(options.pricingModels, ['free','freemium','paid']);
});

test('computes platform-level stats only', () => {
  assert.deepEqual(PlatformDirectory.getStats(sample), {platforms:3,free:2,certificates:2,languages:3});
});

test('groups categories with counts', () => {
  assert.deepEqual(PlatformDirectory.getCategoryGroups(sample), [{category:'technology',count:2},{category:'business',count:1}]);
});

test('uses featured flag first and fallback IDs only when no rows are featured', () => {
  assert.deepEqual(PlatformDirectory.getFeatured(sample,['a']).map(p=>p.id), ['b']);
  const noFlags = sample.map(p=>({...p,featured:false}));
  assert.deepEqual(PlatformDirectory.getFeatured(noFlags,['a','c']).map(p=>p.id), ['a','c']);
});

test('visible platforms apply category language pricing and verification filters', () => {
  const visible = PlatformDirectory.getVisiblePlatforms(sample, {
    category:'technology',language:'English',pricingModel:'freemium',verification:'recent',
    freeOnly:true,certificateOnly:true,sort:'recommended',now:new Date('2026-08-26T12:00:00Z')
  });
  assert.deepEqual(visible.map(p=>p.id), ['a']);
});

test('official count sort keeps unknown counts last', () => {
  assert.deepEqual(PlatformDirectory.getVisiblePlatforms(sample,{sort:'official_count'}).map(p=>p.id), ['a','c','b']);
});

test('recommended sort does not use local view counts as a global signal', () => {
  const withViews = sample.map(p=>({...p,localViews:p.id==='a'?99999:0}));
  assert.deepEqual(PlatformDirectory.getVisiblePlatforms(withViews,{sort:'recommended'}).map(p=>p.id), ['b','c','a']);
});

test('card facts preserve unknown count and verification presentation', () => {
  const facts = PlatformDirectory.cardFacts(sample[1], 'en', new Date('2026-08-26T12:00:00Z'));
  assert.equal(facts.countLabel, 'Not officially confirmed');
  assert.equal(facts.verification, 'outdated');
});

test('comparison rows expose decision fields without relabeling content types', () => {
  const rows = PlatformDirectory.comparisonRows([sample[0], sample[2]], 'en', new Date('2026-08-26T12:00:00Z'));
  assert.deepEqual(rows[0], {
    id:'a', name:'Alpha', logoUrl:'', category:'technology', pricingModel:'freemium',
    hasFreeContent:true, certificateAvailable:true, languages:['English'], countLabel:'100 courses',
    verification:'recent', lastVerified:'2026-08-20', bestFor:'Beginners', officialUrl:'https://alpha.example'
  });
  assert.equal(rows[1].countLabel, '25 modules');
});

test('comparison migration prefers existing v3 data, removes invalid IDs, deduplicates and caps at three', () => {
  const result = PlatformDirectory.migrateComparisonIds(
    ['c','c','missing','a','b','extra'],
    ['b','a'],
    ['a','b','c','d'],
    3
  );
  assert.deepEqual(result, ['c','a','b']);
});

test('comparison migration uses legacy IDs only when the new key is absent', () => {
  const result = PlatformDirectory.migrateComparisonIds(null, ['b','missing','a','c','d'], ['a','b','c','d'], 3);
  assert.deepEqual(result, ['b','a','c']);
});
