const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const data = JSON.parse(fs.readFileSync('data.json','utf8'));
const required = ['settings','assets','seo','siteText','categories','languages','quiz','comparison','platforms'];

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
    assert.deepEqual(Object.keys(value).sort(), ['ar','en','tr']);
  }
  for (const category of data.categories) assert.deepEqual(Object.keys(category.label).sort(), ['ar','en','tr']);
  for (const language of data.languages) assert.deepEqual(Object.keys(language.label).sort(), ['ar','en','tr']);
  for (const platform of data.platforms) {
    assert.deepEqual(Object.keys(platform.name).sort(), ['ar','en','tr']);
    assert.deepEqual(Object.keys(platform.description).sort(), ['ar','en','tr']);
    assert.deepEqual(Object.keys(platform.logo.alt).sort(), ['ar','en','tr']);
  }
});
