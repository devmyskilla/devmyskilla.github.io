const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = path => fs.readFileSync(path, 'utf8');

for (const page of ['index.html','explore.html','platform.html']) {
  test(`${page} uses the Dunya image logo instead of letter mark`, () => {
    const html = read(page);
    assert.match(html, /class="brand-logo"[^>]*src="assets\/dunya-logo-192\.png"/);
    assert.match(html, /rel="icon"[^>]*href="assets\/dunya-logo-192\.png"/);
    assert.match(html, /href="css\/branding\.css"/);
    assert.doesNotMatch(html, /<span class="brand-mark">د<\/span>/);
  });
}

test('landing visual uses the verified high-resolution emblem', () => {
  const html = read('index.html');
  assert.match(html, /class="hero-brand-logo"[^>]*src="assets\/dunya-logo-hero-v3\.webp"/);
  assert.doesNotMatch(html, /<span class="brand-mark big">د<\/span>/);
});

test('explore hero uses the verified high-resolution emblem', () => {
  const html = read('explore.html');
  assert.match(html, /class="hero-brand-logo"[^>]*src="assets\/dunya-logo-hero-v3\.webp"/);
  assert.doesNotMatch(html, /<span class="brand-mark big">د<\/span>/);
});

test('manifest and service worker reference brand icon assets', () => {
  const manifest = read('manifest.webmanifest');
  const sw = read('sw.js');
  for (const asset of ['assets/dunya-logo-192.png','assets/dunya-logo.svg']) {
    assert.ok(manifest.includes(asset), `manifest missing ${asset}`);
    assert.ok(sw.includes(`./${asset}`), `service worker missing ${asset}`);
  }
  assert.ok(sw.includes('./assets/dunya-logo-hero-v3.webp'));
  assert.ok(sw.includes('./css/branding.css'));
  assert.match(sw, /dunya-al-dawrat-v9/);
});

test('shared branding CSS defines image logo sizing', () => {
  const css = read('css/branding.css');
  assert.match(css, /\.brand-logo\{/);
  assert.match(css, /\.hero-brand-logo\{/);
});