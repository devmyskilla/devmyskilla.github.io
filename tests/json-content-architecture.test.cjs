const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ContentAPI = require('../js/content-api.js');

const read = path => fs.readFileSync(path, 'utf8');
const data = JSON.parse(read('data.json'));
const pages = ['index.html', 'explore.html', 'platform.html'].map(read);

test('data.json preserves the platform catalog and editable localized landing copy', () => {
  assert.equal(typeof data.siteText, 'object');
  assert.ok(Array.isArray(data.platforms));
  assert.equal(data.platforms.length, 110);
  assert.equal(new Set(data.platforms.map(p => p.id)).size, data.platforms.length);
  for (const lang of ['ar','en','tr']) {
    const api = ContentAPI.create(data,lang);
    assert.ok(api.text('landingHeroTitle').trim(),`landingHeroTitle missing in ${lang}`);
  }
});

test('data.json is the single runtime content source', () => {
  for (const html of pages) {
    assert.match(html, /js\/data-loader\.js/);
    assert.match(html, /js\/content-api\.js/);
    assert.match(html, /js\/site-runtime\.js/);
    assert.doesNotMatch(html, /supabase-config|platform-data\.js|js\/data\.js|landing-i18n\.js/);
  }
});

test('runtime source does not contain banned Arabic placeholder copy', () => {
  const source = ['js/app.js', 'js/platform-detail.js', 'js/platform-core.js', 'js/i18n.js']
    .filter(fs.existsSync).map(read).join('\n');
  for (const phrase of [
    'المحتوى الرسمي غير مؤكد رسميًا',
    'التحقق لم يتم التحقق بعد',
    'آخر تحقق غير معروف'
  ]) assert.ok(!source.includes(phrase), phrase);
});

test('obsolete runtime data files are absent', () => {
  for (const path of ['js/supabase-config.js', 'js/platform-data.js', 'js/data.js', 'js/landing-i18n.js']) {
    assert.equal(fs.existsSync(path), false, `${path} must be removed`);
  }
});
