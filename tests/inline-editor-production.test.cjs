const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

test('service worker v13 precaches every inline editor browser asset',()=>{
  const sw=read('sw.js');
  assert.match(sw,/dunya-al-dawrat-v13/);
  for(const asset of [
    './css/inline-editor.css',
    './js/edit-descriptors.js',
    './js/inline-editor-config.js',
    './js/inline-editor-api.js',
    './js/inline-editor.js'
  ]) assert.ok(sw.includes(`'${asset}'`),`missing ${asset} from service worker core cache`);
  assert.match(sw,/isDataRequest \|\| isAdminConfigRequest/);
});

test('Decap admin exposes an explicit direct-edit entry point without embedding credentials',()=>{
  const html=read('admin/index.html');
  assert.match(html,/href="\.\.\/?edit=1"/);
  assert.match(html,/تحرير مباشر/);
  assert.doesNotMatch(html,/GITHUB_OAUTH_SECRET|client_secret|access_token/i);
});

test('inline Worker has a deployable Wrangler config with KV binding and no secret values',()=>{
  const toml=read('inline-worker/wrangler.toml');
  assert.match(toml,/name\s*=\s*"dunya-inline-editor"/);
  assert.match(toml,/main\s*=\s*"src\/worker\.mjs"/);
  assert.match(toml,/binding\s*=\s*"INLINE_SESSIONS"/);
  assert.match(toml,/ALLOWED_ORIGIN\s*=\s*"https:\/\/devmyskilla\.github\.io"/);
  assert.match(toml,/GITHUB_REPO\s*=\s*"devmyskilla\/devmyskilla\.github\.io"/);
  assert.match(toml,/GITHUB_BRANCH\s*=\s*"main"/);
  assert.doesNotMatch(toml,/GITHUB_OAUTH_SECRET\s*=/);
});

test('inline editor deployment documentation names required secrets without publishing values',()=>{
  const doc=read('docs/inline-editor-setup.md');
  for(const name of ['GITHUB_OAUTH_ID','GITHUB_OAUTH_SECRET','INLINE_SESSIONS','ALLOWED_ORIGIN','GITHUB_REPO','GITHUB_BRANCH']){
    assert.ok(doc.includes(name),`missing ${name} setup documentation`);
  }
  assert.match(doc,/\/inline\/callback/);
  assert.match(doc,/\?edit=1/);
});
