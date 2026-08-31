const test = require('node:test');
const assert = require('node:assert/strict');

const DataLoader = require('../js/data-loader.js');

function payload(){
  return {
    settings:{}, assets:{}, seo:{}, siteText:{}, categories:[], languages:[], quiz:{}, comparison:{},
    platforms:[{ id:'p1' }]
  };
}

test('loadSiteData returns validated JSON content', async () => {
  const body = payload();
  const result = await DataLoader.loadSiteData({ fetchFn: async () => ({ ok: true, json: async () => body }) });
  assert.deepEqual(result, body);
});

test('validate rejects missing siteText', () => {
  const body=payload();
  delete body.siteText;
  assert.throws(() => DataLoader.validate(body), /siteText/);
});

test('validate rejects non-array platforms', () => {
  const body=payload();
  body.platforms={};
  assert.throws(() => DataLoader.validate(body), /collection/);
});

test('validate rejects a missing CMS section', () => {
  const body=payload();
  delete body.seo;
  assert.throws(() => DataLoader.validate(body), /seo/);
});

test('loadSiteData rejects non-ok HTTP response', async () => {
  await assert.rejects(
    DataLoader.loadSiteData({ fetchFn: async () => ({ ok: false, status: 404 }) }),
    /404/
  );
});
