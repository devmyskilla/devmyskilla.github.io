const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync('index.html','utf8');
const explore = fs.readFileSync('explore.html','utf8');
const sw = fs.readFileSync('sw.js','utf8');
const branding = fs.readFileSync('css/branding.css','utf8');

test('homepage hero uses the real high-resolution generated logo asset', () => {
  assert.match(index, /class="hero-brand-logo"[^>]*src="assets\/dunya-logo-hero-v2\.webp"/);
});

test('explore hero uses the same high-resolution generated logo asset', () => {
  assert.match(explore, /class="hero-brand-logo"[^>]*src="assets\/dunya-logo-hero-v2\.webp"/);
});

test('PWA v9 caches the new cache-busted hero logo', () => {
  assert.match(sw, /dunya-al-dawrat-v9/);
  assert.ok(sw.includes('./assets/dunya-logo-hero-v2.webp'));
});

test('hero logo is intentionally prominent', () => {
  assert.match(branding, /\.hero-brand-logo\{[^}]*width:128px[^}]*height:128px/);
});
