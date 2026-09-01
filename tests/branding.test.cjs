const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = path => fs.readFileSync(path, 'utf8');
const data = JSON.parse(read('data.json'));

for (const page of ['index.html','explore.html','platform.html']) {
  test(`${page} binds the header brand and favicon to CMS assets`, () => {
    const html = read(page);
    assert.match(html, /class="brand-logo"[^>]*data-asset="brandLogo"/);
    assert.match(html, /data-asset="favicon"[^>]*rel="icon"|rel="icon"[^>]*data-asset="favicon"/);
    assert.match(html, /href="css\/branding\.css"/);
    assert.doesNotMatch(html, /<span class="brand-mark">د<\/span>/);
  });
}

test('brand asset keeps the verified high-resolution emblem as its current CMS value', () => {
  assert.equal(data.assets.brandLogo.src,'assets/dunya-logo-hero-v3.webp');
  assert.equal(data.assets.heroLogo.src,'assets/dunya-logo-hero-v3.webp');
  assert.equal(data.assets.favicon.src,'assets/dunya-logo-192.png');
});

test('landing and explore hero bind to the CMS-managed hero logo', () => {
  assert.match(read('index.html'), /class="hero-brand-logo"[^>]*data-asset="heroLogo"/);
  assert.match(read('explore.html'), /class="hero-brand-logo"[^>]*data-asset="heroLogo"/);
});

test('manifest and service worker keep safe fallback brand assets', () => {
  const manifest = read('manifest.webmanifest');
  const sw = read('sw.js');
  for (const asset of ['assets/dunya-logo-192.png','assets/dunya-logo.svg']) {
    assert.ok(manifest.includes(asset), `manifest missing ${asset}`);
    assert.ok(sw.includes(`./${asset}`), `service worker missing ${asset}`);
  }
  assert.ok(sw.includes('./assets/dunya-logo-hero-v3.webp'));
  assert.ok(sw.includes('./css/branding.css'));
  assert.match(sw, /dunya-al-dawrat-v13/);
});

test('shared branding CSS defines image logo sizing', () => {
  const css = read('css/branding.css');
  assert.match(css, /\.brand-logo\{/);
  assert.match(css, /\.hero-brand-logo\{/);
});
