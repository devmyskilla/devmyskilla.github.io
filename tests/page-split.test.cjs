const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ContentAPI = require('../js/content-api.js');

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

test('cross-page navigation preserves language', () => {
  const exploreNav=read('js/explore-nav.js');
  const backNav=read('js/platform-back-nav.js');
  assert.match(exploreNav,/index\.html\?lang=/);
  assert.match(backNav,/explore\.html\?lang=/);
});

test('landing translation keys exist in Arabic English and Turkish in data.json', () => {
  const data=JSON.parse(read('data.json'));
  const keys=['navHome','landingHeroTitle','landingHeroSubtitle','landingExploreCta','landingLearnMore','landingProblemTitle','landingWhatTitle','landingWhyTitle','landingHowTitle','landingDeveloperTitle','landingFinalCta'];
  for(const lang of ['ar','en','tr']){
    const api=ContentAPI.create(data,lang);
    for(const key of keys){
      const value=api.text(key);
      assert.equal(typeof value,'string',`${key} must exist in ${lang}`);
      assert.ok(value.trim().length>0,`${key} must not be empty in ${lang}`);
    }
  }
});
