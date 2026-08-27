const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync('index.html','utf8');
const explore = fs.readFileSync('explore.html','utf8');
const platform = fs.readFileSync('platform.html','utf8');
const sw = fs.readFileSync('sw.js','utf8');
const manifest = fs.readFileSync('manifest.webmanifest','utf8');
const branding = fs.readFileSync('css/branding.css','utf8');

for (const html of [index, explore, platform]) {
  test('navigation uses cache-busted Dunya logo asset', () => {
    assert.match(html, /assets\/dunya-logo-v2-192\.png/);
  });
}

test('homepage hero uses the real 512px generated logo asset', () => {
  assert.match(index, /class="hero-brand-logo"[^>]*src="assets\/dunya-logo-v2-512\.png"/);
});

test('explore hero uses the real 512px generated logo asset', () => {
  assert.match(explore, /class="hero-brand-logo"[^>]*src="assets\/dunya-logo-v2-512\.png"/);
});

test('PWA v9 caches both new logo sizes', () => {
  assert.match(sw, /dunya-al-dawrat-v9/);
  for (const asset of ['./assets/dunya-logo-v2-192.png','./assets/dunya-logo-v2-512.png']) {
    assert.ok(sw.includes(asset), `missing ${asset}`);
    assert.ok(manifest.includes(asset.slice(2)), `manifest missing ${asset}`);
  }
});

test('hero logo is intentionally prominent', () => {
  assert.match(branding, /\.hero-brand-logo\{[^}]*width:128px[^}]*height:128px/);
});
