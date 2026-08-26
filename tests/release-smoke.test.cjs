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

test('service worker v7 caches landing and discovery production assets', () => {
  assert.match(sw,/dunya-al-dawrat-v7/);
  for (const asset of [
    './index.html','./explore.html','./platform.html','./course.html','./css/landing.css','./css/profile.css',
    './js/landing.js','./js/platform-core.js','./js/platform-data.js','./js/platform-directory.js','./js/platform-detail.js','./js/supabase-config.js'
  ]) assert.ok(sw.includes(asset),`missing ${asset}`);
});

test('landing page is separate from discovery application', () => {
  assert.doesNotMatch(index,/id="platformGrid"/);
  assert.doesNotMatch(index,/id="compareModal"/);
});

test('profile page loads its dedicated stylesheet', () => {
  assert.match(platform,/css\/profile\.css/);
});

test('manifest describes a platform discovery and comparison product', () => {
  assert.match(manifest.description,/منصات/);
  assert.match(manifest.description,/مقارنة/);
});
