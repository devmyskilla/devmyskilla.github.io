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
