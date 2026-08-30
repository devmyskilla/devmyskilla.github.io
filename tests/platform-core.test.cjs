const test = require('node:test');
const assert = require('node:assert/strict');
const PlatformCore = require('../js/platform-core.js');

const now = new Date('2026-08-26T12:00:00Z');

test('normalizes static platform data without inventing an official count', () => {
  const p = PlatformCore.normalizeStaticPlatform({
    id: 'plat-1', name: 'FutureLearn', description_ar: 'AR', description_en: 'EN',
    category: 'تعليم', languages: ['إنجليزي'], pricingModel: 'free', hasFreeContent: true,
    certificateAvailable: true, freeCertificate: true,
    officialUrl: 'https://www.futurelearn.com/courses', logoUrl: 'https://example.com/logo.png'
  });
  assert.equal(p.id, 'plat-1');
  assert.equal(p.hasFreeContent, true);
  assert.equal(p.certificateAvailable, true);
  assert.equal(p.freeCertificate, true);
  assert.deepEqual(p.languages, ['إنجليزي']);
  assert.equal(p.officialCount, null);
  assert.equal(p.pricingModel, 'free');
  assert.equal(p.officialUrl, 'https://www.futurelearn.com/courses');
  assert.equal(p.logoUrl, 'https://example.com/logo.png');
});

test('normalizes zero pricing to free', () => {
  assert.equal(PlatformCore.normalizeStaticPlatform({ pricingModel: 0 }).pricingModel, 'free');
  assert.equal(PlatformCore.normalizeStaticPlatform({ pricing_model: '0' }).pricingModel, 'free');
});

test('preserves non-course content units', () => {
  assert.equal(PlatformCore.contentCountLabel({ officialCount: 286, officialCountType: 'job_simulations' }, 'en'), '286 job simulations');
  assert.equal(PlatformCore.contentCountLabel({ officialCount: 300, officialCountType: 'modules' }, 'en'), '300 modules');
  assert.equal(PlatformCore.contentCountLabel({ officialCount: 20, officialCountType: 'learning_paths' }, 'en'), '20 learning paths');
});

test('unknown official count is omitted', () => {
  assert.equal(PlatformCore.contentCountLabel({ officialCount: null }, 'en'), '');
  assert.equal(PlatformCore.contentCountLabel({ officialCount: null }, 'ar'), '');
  assert.equal(PlatformCore.shouldShowOfficialCount({ officialCount: null }), false);
  assert.equal(PlatformCore.shouldShowOfficialCount({ officialCount: 0 }), true);
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

test('search matches multilingual text and misses unrelated terms', () => {
  const p = PlatformCore.normalizeStaticPlatform({
    id: 'plat-3', name: 'IBM Skills Build', description_ar: 'ذكاء اصطناعي',
    description_en: 'Artificial intelligence', description_tr: 'Yapay zeka',
    category: 'تكنولوجيا', languages: ['متعدد اللغات']
  });
  assert.equal(PlatformCore.searchScore(p, 'artificial intelligence') >= 0, true);
  assert.equal(PlatformCore.searchScore(p, 'ذكاء اصطناعي') >= 0, true);
  assert.equal(PlatformCore.searchScore(p, 'Yapay zeka') >= 0, true);
  assert.equal(PlatformCore.searchScore(p, 'quantum chemistry'), -1);
});

test('filters by category, language, pricing, free content, certificate, and verification', () => {
  const platforms = [
    { id: 'a', name: 'A', category: 'technology', languages: ['English'], pricingModel: 'freemium', hasFreeContent: true, certificateAvailable: true, lastVerified: '2026-08-20' },
    { id: 'b', name: 'B', category: 'business', languages: ['Arabic'], pricingModel: 'paid', hasFreeContent: false, certificateAvailable: false, lastVerified: '2026-06-01' }
  ];
  const result = PlatformCore.filterPlatforms(platforms, {
    category: 'technology', language: 'English', pricingModel: 'freemium',
    freeOnly: true, certificateOnly: true, verification: 'recent', now
  });
  assert.deepEqual(result.map(p => p.id), ['a']);
});

test('sorts official counts descending with unknown values last', () => {
  const list = PlatformCore.sortPlatforms([
    {id:'a',name:'A',officialCount:null},
    {id:'b',name:'B',officialCount:25},
    {id:'c',name:'C',officialCount:100}
  ], 'official_count');
  assert.deepEqual(list.map(x => x.id), ['c','b','a']);
});

test('recommended sort uses featured and display order, not local view count', () => {
  const list = PlatformCore.sortPlatforms([
    {id:'a',name:'A',featured:false,displayOrder:1,localViews:9999},
    {id:'b',name:'B',featured:true,displayOrder:9,localViews:0},
    {id:'c',name:'C',featured:false,displayOrder:0,localViews:0}
  ], 'recommended');
  assert.deepEqual(list.map(x => x.id), ['b','c','a']);
});

test('comparison selection never exceeds three platforms and does not mutate input', () => {
  const input = ['plat-1','plat-2','plat-3'];
  const result = PlatformCore.toggleComparison(input, 'plat-4', 3);
  assert.deepEqual(result.ids, ['plat-1','plat-2','plat-3']);
  assert.equal(result.blocked, true);
  assert.deepEqual(input, ['plat-1','plat-2','plat-3']);
});

test('comparison toggles an existing platform off', () => {
  const result = PlatformCore.toggleComparison(['plat-1','plat-2'], 'plat-2', 3);
  assert.deepEqual(result.ids, ['plat-1']);
  assert.equal(result.blocked, false);
});
