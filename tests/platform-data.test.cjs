const test = require('node:test');
const assert = require('node:assert/strict');
const PlatformData = require('../js/platform-data.js');

test('merges Supabase identity/count data with static descriptions', async () => {
  let seenUrl = '';
  let seenHeaders = null;
  const fakeFetch = async (url, options) => {
    seenUrl = url; seenHeaders = options.headers;
    return { ok: true, json: async () => [{
      id: 1, external_id: 'plat-1', name: 'FutureLearn', status: 'active',
      expected_count: 1673, expected_count_type: 'courses', last_verified: '2026-08-26'
    }] };
  };
  const result = await PlatformData.loadPlatforms({
    projectUrl: 'https://example.supabase.co/', publishableKey: 'public-key',
    staticPlatforms: [{id:'plat-1',name:'FutureLearn',description_en:'Static description',free:true}],
    fetchFn: fakeFetch
  });
  assert.equal(result.source, 'supabase');
  assert.equal(result.platforms[0].officialCount, 1673);
  assert.equal(result.platforms[0].description_en, 'Static description');
  assert.match(seenUrl, /\/rest\/v1\/platforms/);
  assert.match(seenUrl, /status=eq\.active/);
  assert.equal(seenHeaders.apikey, 'public-key');
  assert.equal(seenHeaders.Accept, 'application/json');
});

test('maps the complete public platform profile shape', async () => {
  const fakeFetch = async () => ({ ok:true, json:async()=>[{
    id: 9, external_id:'plat-9', name:'UNITAR', status:'active',
    description:'Base', description_ar:'عربي', description_en:'English', description_tr:'Türkçe',
    logo_url:'https://example.com/logo.png', official_url:'https://example.com', catalog_url:'https://example.com/catalog',
    expected_count:726, expected_count_type:'courses', last_verified:'2026-08-25',
    category:'academic', pricing_model:'mixed', has_free_content:true, certificate_available:true,
    languages:['Arabic','English'], platform_type:'international_organization',
    best_for_ar:['تعلم دولي'], best_for_en:['International learning'], best_for_tr:['Uluslararası öğrenme'],
    strengths_ar:['قوي'], strengths_en:['Strong'], strengths_tr:['Güçlü'],
    limitations_ar:['قيد'], limitations_en:['Limit'], limitations_tr:['Sınır'],
    featured:true, display_order:2
  }] });
  const result = await PlatformData.loadPlatforms({projectUrl:'https://example.supabase.co',publishableKey:'public-key',staticPlatforms:[],fetchFn:fakeFetch});
  const p=result.platforms[0];
  assert.equal(p.description_ar,'عربي');
  assert.equal(p.description_en,'English');
  assert.equal(p.description_tr,'Türkçe');
  assert.equal(p.category,'academic');
  assert.equal(p.pricingModel,'mixed');
  assert.equal(p.hasFreeContent,true);
  assert.equal(p.certificateAvailable,true);
  assert.deepEqual(p.languages,['Arabic','English']);
  assert.equal(p.platformType,'international_organization');
  assert.deepEqual(p.best_for_en,['International learning']);
  assert.deepEqual(p.strengths_tr,['Güçlü']);
  assert.deepEqual(p.limitations_ar,['قيد']);
  assert.equal(p.featured,true);
  assert.equal(p.displayOrder,2);
  assert.equal(p.officialCount,726);
  assert.equal(p.officialCountType,'courses');
  assert.equal(p.lastVerified,'2026-08-25');
});

test('non-null Supabase values override static values including false', async () => {
  const fakeFetch = async () => ({ ok: true, json: async () => [{
    id: 2, external_id: 'plat-2', name: 'Agora', status: 'active',
    category: 'academic', pricing_model: 'paid', has_free_content: false,
    certificate_available: false, languages: ['English','French']
  }] });
  const result = await PlatformData.loadPlatforms({
    projectUrl: 'https://example.supabase.co', publishableKey: 'public-key',
    staticPlatforms: [{ id:'plat-2', name:'Agora', category:'تعليم', free:true, certificate:true, language:'عربي' }],
    fetchFn: fakeFetch
  });
  const p = result.platforms[0];
  assert.equal(p.category, 'academic');
  assert.equal(p.pricingModel, 'paid');
  assert.equal(p.hasFreeContent, false);
  assert.equal(p.certificateAvailable, false);
  assert.deepEqual(p.languages, ['English','French']);
});

test('network failure returns normalized static fallback and error', async () => {
  const result = await PlatformData.loadPlatforms({
    projectUrl: 'https://example.supabase.co', publishableKey: 'public-key',
    staticPlatforms: [{ id:'plat-3', name:'IBM Skills Build', free:true, certificate:true, language:'متعدد اللغات' }],
    fetchFn: async () => { throw new Error('network down'); }
  });
  assert.equal(result.source, 'fallback');
  assert.equal(result.platforms.length, 1);
  assert.equal(result.platforms[0].dataSource, 'static');
  assert.equal(result.platforms[0].hasFreeContent, true);
  assert.match(result.error.message, /network down/);
});

test('malformed Supabase payload falls back instead of breaking the directory', async () => {
  const result = await PlatformData.loadPlatforms({
    projectUrl: 'https://example.supabase.co', publishableKey: 'public-key',
    staticPlatforms: [{ id:'plat-4', name:'Forage' }],
    fetchFn: async () => ({ ok:true, json: async () => ({not:'an array'}) })
  });
  assert.equal(result.source, 'fallback');
  assert.equal(result.platforms[0].id, 'plat-4');
});

test('HTTP errors fall back with a useful error', async () => {
  const result = await PlatformData.loadPlatforms({
    projectUrl: 'https://example.supabase.co', publishableKey: 'public-key',
    staticPlatforms: [{ id:'plat-5', name:'Microsoft' }],
    fetchFn: async () => ({ ok:false, status:403, json: async () => ({}) })
  });
  assert.equal(result.source, 'fallback');
  assert.match(result.error.message, /403/);
});
