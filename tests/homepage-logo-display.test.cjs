const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync('index.html','utf8');
const explore = fs.readFileSync('explore.html','utf8');
const sw = fs.readFileSync('sw.js','utf8');
const branding = fs.readFileSync('css/branding.css','utf8');
const data = JSON.parse(fs.readFileSync('data.json','utf8'));
const heroAssetPath = data.assets.heroLogo.src;

test('homepage hero is bound to the CMS-managed hero logo', () => {
  assert.match(index, /class="hero-brand-logo"[^>]*data-asset="heroLogo"/);
  assert.equal(heroAssetPath,'assets/dunya-logo-hero-v3.webp');
});

test('explore hero uses the same CMS-managed hero logo binding', () => {
  assert.match(explore, /class="hero-brand-logo"[^>]*data-asset="heroLogo"/);
});

test('hero logo file is a real WebP image', () => {
  assert.ok(fs.existsSync(heroAssetPath), `${heroAssetPath} is missing`);
  const heroAsset = fs.readFileSync(heroAssetPath);
  assert.equal(heroAsset.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(heroAsset.subarray(8, 12).toString('ascii'), 'WEBP');
});

test('PWA caches the current verified hero logo fallback', () => {
  assert.ok(sw.includes(`./${heroAssetPath}`));
});

test('hero logo is intentionally prominent', () => {
  assert.match(branding, /\.hero-brand-logo\{[^}]*width:128px[^}]*height:128px/);
});

test('hero logo preserves the full source image instead of cropping it', () => {
  assert.match(branding, /\.hero-brand-logo\{[^}]*object-fit:contain/);
});
