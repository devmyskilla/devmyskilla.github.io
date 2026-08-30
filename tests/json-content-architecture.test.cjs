const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = path => fs.readFileSync(path, 'utf8');

const pages = ['index.html', 'explore.html', 'platform.html'].map(read);

test('data.json preserves the current platform catalog and editable landing copy', () => {
  const data = JSON.parse(read('data.json'));
  assert.equal(typeof data.siteText, 'object');
  assert.ok(Array.isArray(data.platforms));
  assert.equal(data.platforms.length, 40);
  assert.equal(new Set(data.platforms.map(p => p.id)).size, data.platforms.length);
  assert.ok(data.siteText.ar.landingHeroTitle);
  assert.ok(data.siteText.en.landingHeroTitle);
  assert.ok(data.siteText.tr.landingHeroTitle);
});

test('data.json is the single runtime content source', () => {
  for (const html of pages) {
    assert.match(html, /js\/data-loader\.js/);
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
