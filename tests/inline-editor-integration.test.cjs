const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

for(const page of ['index.html','explore.html','platform.html']){
  test(`${page} loads inline editor assets in dependency order`,()=>{
    const html=read(page);
    assert.match(html,/href="css\/inline-editor\.css"/);
    const order=['js/content-api.js','js/edit-descriptors.js','js/inline-editor-config.js','js/inline-editor-api.js','js/inline-editor.js'];
    let last=-1;
    for(const asset of order){const at=html.indexOf(asset);assert.ok(at>last,`${asset} must load in order on ${page}`);last=at;}
    assert.doesNotMatch(html,/class="inline-edit-pencil"/,'pencils must never be hardcoded for public visitors');
  });
}

test('explore dynamic platform content carries stable edit markers',()=>{
  const src=read('js/app.js');
  assert.match(src,/data-edit-kind="platform"/);
  assert.match(src,/data-edit-id="\$\{esc\(p\.id\)\}"/);
  assert.match(src,/data-edit-field="name"/);
  assert.match(src,/data-edit-field="description"/);
  assert.match(src,/data-edit-kind="category"/);
  assert.match(src,/data-edit-id="\$\{esc\(g\.categoryId\)\}"/);
  assert.doesNotMatch(src,/data-edit-id="\$\{[^}]*index/i);
});

test('platform profile exposes stable markers for platform name description logo and editorial lists',()=>{
  const src=read('js/platform-detail.js');
  for(const field of ['name','description','logo','editorial.bestFor','editorial.strengths','editorial.limitations']){
    assert.ok(src.includes(`data-edit-field="${field}"`),`missing ${field} edit marker`);
  }
  assert.match(src,/data-edit-id="\$\{esc\(platform\.id\)\}"/);
});

test('each page boot flow initializes inline editor after content is loaded',()=>{
  for(const path of ['js/landing.js','js/app.js','js/platform-detail.js']){
    const src=read(path);
    assert.match(src,/InlineEditor\.create\(/,`${path} must create the inline editor`);
    assert.match(src,/\.init\(\)/,`${path} must initialize the inline editor`);
    assert.match(src,/onDataChange/,`${path} must rerender after an inline save`);
  }
});
