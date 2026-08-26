const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = path => fs.readFileSync(path, 'utf8');

test('landing owns project explanation and routes to explore', () => {
  const html = read('index.html');
  assert.match(html, /href="explore\.html/);
  assert.doesNotMatch(html, /id="platformGrid"/);
  assert.doesNotMatch(html, /id="compareModal"/);
  assert.match(html, /id="aboutProject"/);
  assert.match(html, /id="developerSection"/);
});

test('explore owns the complete discovery application', () => {
  const html = read('explore.html');
  for (const id of ['platformGrid','filterLang','filterCategory','filterPricing','filterVerification','compareModal','quizModal','pathModal']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});

test('platform profile back navigation points to explore', () => {
  const js = read('js/platform-detail.js');
  assert.match(js, /explore\.html\?lang=/);
  assert.doesNotMatch(js, /index\.html\?lang=.*#explore/);
});

test('landing translation keys exist in Arabic English and Turkish', () => {
  const src=read('js/i18n.js');
  const keys=['navHome','landingHeroTitle','landingHeroSubtitle','landingExploreCta','landingLearnMore','landingProblemTitle','landingWhatTitle','landingWhyTitle','landingHowTitle','landingDeveloperTitle','landingFinalCta'];
  for(const key of keys){
    const count=(src.match(new RegExp(`${key}:`,'g'))||[]).length;
    assert.equal(count,3,`${key} must exist in ar/en/tr`);
  }
});
