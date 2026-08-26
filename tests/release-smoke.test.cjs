const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync('index.html','utf8');
const platform = fs.readFileSync('platform.html','utf8');
const sw = fs.readFileSync('sw.js','utf8');
const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));

test('production modals expose dialog semantics and labelled headings', () => {
  for (const [id,label] of [['quizModal','quizTitle'],['compareModal','compareTitle'],['pathModal','pathTitle']]) {
    const re = new RegExp(`<div class="modal" id="${id}"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="${label}"`);
    assert.match(index,re);
    assert.match(index,new RegExp(`<h2 id="${label}"`));
  }
});

test('directory tabs expose tab semantics and selected state', () => {
  assert.match(index,/role="tablist"/);
  assert.equal((index.match(/role="tab"/g)||[]).length,3);
  assert.match(index,/data-tab="all"[^>]*aria-selected="true"/);
});

test('service worker v6 caches all platform directory production assets', () => {
  assert.match(sw,/dunya-al-dawrat-v6/);
  for (const asset of [
    './platform.html','./course.html','./css/profile.css','./js/platform-core.js',
    './js/platform-data.js','./js/platform-directory.js','./js/platform-detail.js','./js/supabase-config.js'
  ]) assert.ok(sw.includes(asset),`missing ${asset}`);
});

test('profile page loads its dedicated stylesheet', () => {
  assert.match(platform,/css\/profile\.css/);
});

test('manifest describes a platform discovery and comparison product', () => {
  assert.match(manifest.description,/منصات/);
  assert.match(manifest.description,/مقارنة/);
});
