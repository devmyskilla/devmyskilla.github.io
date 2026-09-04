const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('homepage exposes course categories that link to filtered explore results', () => {
  const index = read('index.html');
  const landing = read('js/landing.js');
  const exploreApp = read('js/app.js');

  assert.match(index, /id="landingCategoryGrid"/, 'homepage should include a categories grid');
  assert.match(landing, /function renderCategories\(/, 'landing page should render categories from site data');
  assert.match(landing, /categoryExploreUrl/, 'category links should preserve language and category in the URL');
  assert.match(exploreApp, /params\.get\(['"]category['"]\)/, 'explore page should read the category query parameter');
});
