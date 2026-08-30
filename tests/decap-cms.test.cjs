const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = p => fs.readFileSync(p, 'utf8');

test('Decap admin shell and configuration exist', () => {
  assert.equal(fs.existsSync('admin/index.html'), true);
  assert.equal(fs.existsSync('admin/config.yml'), true);
  assert.match(read('admin/index.html'), /decap-cms/);
});

test('Decap uses GitHub main and edits data.json', () => {
  const config = read('admin/config.yml');
  assert.match(config, /name: github/);
  assert.match(config, /repo: devmyskilla\/devmyskilla\.github\.io/);
  assert.match(config, /branch: main/);
  assert.match(config, /file: data\.json/);
  assert.match(config, /name: siteText/);
  assert.match(config, /name: platforms/);
  assert.match(config, /name: freeCertificate/);
});

test('language groups are nested under the siteText object', () => {
  const config = read('admin/config.yml');
  assert.match(config, /name: siteText\n            widget: object\n            collapsed: true\n            fields:\n              - label: "العربية"/);
  assert.match(config, /name: "ar"\n                widget: object\n                collapsed: true\n                fields:\n                  - /);
});

test('Decap configuration contains no OAuth client secret', () => {
  const config = read('admin/config.yml');
  assert.doesNotMatch(config, /client_secret|CLIENT_SECRET|github_client_secret/i);
});
