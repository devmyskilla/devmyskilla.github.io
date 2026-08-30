const test = require('node:test');
const assert = require('node:assert/strict');

const DataLoader = require('../js/data-loader.js');

test('loadSiteData returns validated JSON content', async () => {
  const payload = { siteText: { ar: {}, en: {}, tr: {} }, platforms: [{ id: 'p1' }] };
  const result = await DataLoader.loadSiteData({ fetchFn: async () => ({ ok: true, json: async () => payload }) });
  assert.deepEqual(result, payload);
});

test('validate rejects missing siteText', () => {
  assert.throws(() => DataLoader.validate({ platforms: [] }), /siteText/);
});

test('validate rejects non-array platforms', () => {
  assert.throws(() => DataLoader.validate({ siteText: {}, platforms: {} }), /platforms/);
});

test('loadSiteData rejects non-ok HTTP response', async () => {
  await assert.rejects(
    DataLoader.loadSiteData({ fetchFn: async () => ({ ok: false, status: 404 }) }),
    /404/
  );
});
