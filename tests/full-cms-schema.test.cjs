const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const data = JSON.parse(fs.readFileSync('data.json','utf8'));
const required = ['settings','assets','seo','siteText','categories','languages','quiz','comparison','platforms'];
const localeKeys = ['ar','en','tr'];

function assertLocalized(value, label) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label}: localized object required`);
  assert.deepEqual(Object.keys(value).sort(), localeKeys, `${label}: expected ar/en/tr`);
  for (const locale of localeKeys) assert.ok(String(value[locale] || '').trim(), `${label}: empty ${locale}`);
}

test('full CMS schema exposes every top-level editable domain', () => {
  for (const key of required) assert.ok(Object.hasOwn(data,key), `missing ${key}`);
  assert.equal(data.platforms.length, 110);
});

test('stable IDs are unique and platform references resolve', () => {
  const categoryIds = new Set(data.categories.map(row => row.id));
  const languageIds = new Set(data.languages.map(row => row.id));
  assert.equal(categoryIds.size, data.categories.length);
  assert.equal(languageIds.size, data.languages.length);
  assert.equal(new Set(data.platforms.map(row => row.id)).size, 110);
  for (const platform of data.platforms) {
    assert.ok(categoryIds.has(platform.categoryId), `${platform.id}: bad categoryId`);
    for (const id of platform.languageIds || []) assert.ok(languageIds.has(id), `${platform.id}: bad languageId ${id}`);
  }
});

test('editable concepts are stored as ar/en/tr triplets', () => {
  for (const value of [data.settings.siteName, data.settings.developerName, data.settings.copyright]) {
    assert.deepEqual(Object.keys(value).sort(), localeKeys);
  }
  for (const category of data.categories) assert.deepEqual(Object.keys(category.label).sort(), localeKeys);
  for (const language of data.languages) assert.deepEqual(Object.keys(language.label).sort(), localeKeys);
  for (const platform of data.platforms) {
    assert.deepEqual(Object.keys(platform.name).sort(), localeKeys);
    assert.deepEqual(Object.keys(platform.description).sort(), localeKeys);
    assert.deepEqual(Object.keys(platform.logo.alt).sort(), localeKeys);
  }
});

test('all 110 platforms have complete localized field and path research', () => {
  assert.equal(data.platforms.length, 110);
  for (const platform of data.platforms) {
    assert.ok(Array.isArray(platform.fields), `${platform.id}: fields must be an array`);
    assert.ok(Array.isArray(platform.officialPaths), `${platform.id}: officialPaths must be an array`);
    assert.ok(platform.pathResearch && typeof platform.pathResearch === 'object' && !Array.isArray(platform.pathResearch), `${platform.id}: pathResearch required`);
    assert.match(String(platform.pathResearch.lastVerified || ''), /^\d{4}-\d{2}-\d{2}$/, `${platform.id}: lastVerified must be YYYY-MM-DD`);

    for (const field of platform.fields) assertLocalized(field.name, `${platform.id}/field/${field.id}`);
    for (const path of platform.officialPaths) assertLocalized(path.name, `${platform.id}/path/${path.id}`);
  }
});
