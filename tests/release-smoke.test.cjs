const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync('index.html','utf8');
const explore = fs.existsSync('explore.html') ? fs.readFileSync('explore.html','utf8') : '';
const platform = fs.readFileSync('platform.html','utf8');
const sw = fs.readFileSync('sw.js','utf8');
const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));

test('production modals expose dialog semantics and labelled headings on explore page', () => {
  for (const [id,label] of [['quizModal','quizTitle'],['compareModal','compareTitle'],['pathModal','pathTitle']]) {
    const re = new RegExp(`<div class="modal" id="${id}"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="${label}"`);
    assert.match(explore,re);
    assert.match(explore,new RegExp(`<h2 id="${label}"`));
  }
});

test('directory tabs expose tab semantics and selected state on explore page', () => {
  assert.match(explore,/role="tablist"/);
  assert.equal((explore.match(/role="tab"/g)||[]).length,3);
  assert.match(explore,/data-tab="all"[^>]*aria-selected="true"/);
});

test('service worker v12 caches CMS runtime and production assets', () => {
  assert.match(sw,/dunya-al-dawrat-v12/);
  for (const asset of [
    './index.html','./explore.html','./platform.html','./course.html','./css/branding.css','./css/landing.css','./css/profile.css',
    './data.json','./js/content-api.js','./js/i18n.js','./js/site-runtime.js','./js/data-loader.js','./js/landing.js','./js/platform-core.js','./js/platform-directory.js','./js/platform-detail.js',
    './assets/dunya-logo-192.png','./assets/dunya-logo.svg','./assets/dunya-logo-hero-v3.webp'
  ]) assert.ok(sw.includes(asset),`missing ${asset}`);
  for (const obsolete of ['./js/platform-data.js','./js/supabase-config.js','./js/data.js','./js/landing-i18n.js']) {
    assert.ok(!sw.includes(obsolete),`obsolete cache entry ${obsolete}`);
  }
});

test('data.json is treated as freshness-sensitive content', () => {
  assert.match(sw,/data\.json/);
  assert.match(sw,/isDataRequest/);
});

test('Decap admin config is always fetched network-first', () => {
  assert.match(sw,/admin\/config\.yml/);
  assert.match(sw,/isAdminConfigRequest/);
  assert.match(sw,/needsFreshCopy\s*=\s*isDataRequest\s*\|\|\s*isAdminConfigRequest/);
});

test('landing page is separate from discovery application', () => {
  assert.doesNotMatch(index,/id="platformGrid"/);
  assert.doesNotMatch(index,/id="compareModal"/);
});

test('profile page loads its dedicated stylesheet', () => {
  assert.match(platform,/css\/profile\.css/);
});

test('static manifest remains a valid fallback while runtime manifest is CMS-managed', () => {
  assert.equal(typeof manifest.name,'string');
  assert.equal(typeof manifest.description,'string');
  assert.match(index,/id="appManifest"/);
  assert.match(explore,/id="appManifest"/);
  assert.match(platform,/id="appManifest"/);
  assert.match(fs.readFileSync('js/site-runtime.js','utf8'),/createManifest/);
});
