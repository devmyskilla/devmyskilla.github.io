const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');

test('explorer runtime has no legacy CMS-owned content maps',()=>{
  const app=read('js/app.js');
  assert.doesNotMatch(app,/const FEATURED_IDS\s*=/);
  assert.doesNotMatch(app,/const PATHS\s*=/);
  assert.doesNotMatch(app,/const icons\s*=\s*\[/);
  assert.doesNotMatch(app,/\['english','انجليزي','إنجليزي'\]/);
});

test('i18n contains no hardcoded category language or unit maps',()=>{
  const code=read('js/i18n.js')+read('js/platform-core.js');
  assert.doesNotMatch(code,/\bcatMap\b/);
  assert.doesNotMatch(code,/\blangMap\b/);
  assert.doesNotMatch(code,/\bUNIT_LABELS\b/);
});

test('production page shells do not hardcode identity or platform-cloud names',()=>{
  const html=['index.html','explore.html','platform.html'].map(read).join('\n');
  assert.doesNotMatch(html,/>اتحاد شباب الأمة</);
  assert.doesNotMatch(html,/>Coursera<|>edX<|>FutureLearn<|>Kaggle<|>freeCodeCamp<|>IBM SkillsBuild</);
  assert.doesNotMatch(html,/aria-label="Theme"|aria-label="Language"|aria-label="Close"/);
});

test('all production pages load CMS content and site runtime before page logic',()=>{
  for(const path of ['index.html','explore.html','platform.html']){
    const html=read(path),content=html.indexOf('js/content-api.js'),runtime=html.indexOf('js/site-runtime.js');
    assert.ok(content>=0,`${path} missing content API`);
    assert.ok(runtime>content,`${path} runtime ordering invalid`);
  }
});
