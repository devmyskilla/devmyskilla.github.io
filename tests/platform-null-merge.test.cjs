const test = require('node:test');
const assert = require('node:assert/strict');
const PlatformCore = require('../js/platform-core.js');

test('null Supabase booleans and pricing do not overwrite static presentation values', () => {
  const fallback = PlatformCore.normalizeStaticPlatform({
    id:'plat-1', name:'FutureLearn', free:true, certificate:true, pricing_model:'freemium'
  });
  const db = PlatformCore.normalizeSupabasePlatform({
    id:1, external_id:'plat-1', name:'FutureLearn',
    has_free_content:null, certificate_available:null, pricing_model:null
  });
  const merged = PlatformCore.mergePlatform(fallback, db);
  assert.equal(merged.hasFreeContent,true);
  assert.equal(merged.certificateAvailable,true);
  assert.equal(merged.pricingModel,'freemium');
});
