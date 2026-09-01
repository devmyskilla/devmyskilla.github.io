const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const data=JSON.parse(fs.readFileSync('data.json','utf8'));
const SESSION='a'.repeat(48);
const encodedData=()=>Buffer.from(JSON.stringify(data),'utf8').toString('base64');
async function schema(){return import('../inline-worker/src/edit-schema.mjs')}
async function worker(){return import('../inline-worker/src/worker.mjs')}

class FakeKV{
  constructor(){this.map=new Map()}
  async put(key,value,opts={}){this.map.set(key,{value:String(value),opts})}
  async get(key,type){const row=this.map.get(key);if(!row)return null;return type==='json'?JSON.parse(row.value):row.value}
  async delete(key){this.map.delete(key)}
}
function env(overrides={}){
  return{
    INLINE_SESSIONS:new FakeKV(),
    GITHUB_OAUTH_ID:'client-id',GITHUB_OAUTH_SECRET:'client-secret',
    ALLOWED_ORIGIN:'https://devmyskilla.github.io',
    GITHUB_REPO:'devmyskilla/devmyskilla.github.io',GITHUB_BRANCH:'main',SESSION_TTL_SECONDS:'3600',
    ...overrides
  };
}
function req(path,{method='GET',origin='https://devmyskilla.github.io',headers={},body}={}){
  const h=new Headers(headers);if(origin!==null)h.set('Origin',origin);
  return new Request(`https://inline.example${path}`,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)});
}

test('server patch engine rejects protected platform id',async()=>{
  const {applyPatch}=await schema();
  assert.throws(()=>applyPatch(data,{kind:'platform',id:data.platforms[0].id,field:'id'},'evil'),/unsupported target/i);
});

test('server patch engine rejects arbitrary client paths',async()=>{
  const {applyPatch}=await schema();
  assert.throws(()=>applyPatch(data,{kind:'path',path:'platforms.0.id'},'evil'),/unsupported target/i);
});

test('patches one localized platform field by stable id without mutating source',async()=>{
  const {applyPatch}=await schema();
  const id=data.platforms[0].id;
  const before=structuredClone(data.platforms.find(p=>p.id===id).description);
  const value={ar:'أ',en:'A',tr:'A'};
  const result=applyPatch(data,{kind:'platform',id,field:'description'},value);
  assert.deepEqual(result.value,value);
  assert.deepEqual(data.platforms.find(p=>p.id===id).description,before);
  assert.deepEqual(result.data.platforms.find(p=>p.id===id).description,value);
  assert.equal(result.data.platforms.length,110);
});

test('validates references and localized triplets before accepting a patch',async()=>{
  const {applyPatch}=await schema();
  const id=data.platforms[0].id;
  assert.throws(()=>applyPatch(data,{kind:'platform',id,field:'description'},{ar:'أ',en:'A'}),/localized/i);
  assert.throws(()=>applyPatch(data,{kind:'platform',id,field:'categoryId'},'missing-category'),/category/i);
  assert.throws(()=>applyPatch(data,{kind:'platform',id,field:'languageIds'},['missing-language']),/language/i);
});

test('allows editable category and language labels but never their IDs',async()=>{
  const {applyPatch}=await schema();
  const category=data.categories[0];
  const language=data.languages[0];
  assert.deepEqual(applyPatch(data,{kind:'category',id:category.id,field:'label'},{ar:'س',en:'X',tr:'X'}).value,{ar:'س',en:'X',tr:'X'});
  assert.deepEqual(applyPatch(data,{kind:'language',id:language.id,field:'label'},{ar:'ل',en:'L',tr:'L'}).value,{ar:'ل',en:'L',tr:'L'});
  assert.throws(()=>applyPatch(data,{kind:'category',id:category.id,field:'id'},'x'),/unsupported target/i);
  assert.throws(()=>applyPatch(data,{kind:'language',id:language.id,field:'id'},'x'),/unsupported target/i);
});

test('full-document validation keeps the 110-platform and stable-reference contract',async()=>{
  const {validateDocument}=await schema();
  assert.equal(validateDocument(data),true);
  const bad=structuredClone(data);
  bad.platforms[0].languageIds=['not-real'];
  assert.throws(()=>validateDocument(bad),/language/i);
});

test('worker rejects API requests from an unapproved origin',async()=>{
  const {default:handler}=await worker();
  const response=await handler.fetch(req('/inline/session',{origin:'https://evil.example'}),env());
  assert.equal(response.status,403);
});

test('worker starts OAuth with one-time state and least-privilege public repo scope',async()=>{
  const {default:handler}=await worker();
  const e=env();
  const response=await handler.fetch(req('/inline/auth',{origin:null}),e);
  assert.equal(response.status,302);
  const location=response.headers.get('location');
  assert.match(location,/github\.com\/login\/oauth\/authorize/);
  const authUrl=new URL(location);
  assert.equal(authUrl.searchParams.get('scope'),'public_repo');
  const state=authUrl.searchParams.get('state');
  assert.ok(state);
  assert.ok(await e.INLINE_SESSIONS.get(`oauth:${state}`));
});

test('callback rejects an invalid or already-consumed OAuth state',async()=>{
  const {default:handler}=await worker();
  const response=await handler.fetch(req('/inline/callback?code=x&state=bad',{origin:null}),env());
  assert.equal(response.status,400);
});

test('session response never exposes the GitHub access token',async()=>{
  const {default:handler}=await worker();
  const e=env();
  await e.INLINE_SESSIONS.put(`session:${SESSION}`,JSON.stringify({githubToken:'secret-token',login:'admin',avatarUrl:'avatar',expiresAt:Date.now()+60000}));
  const response=await handler.fetch(req('/inline/session',{headers:{Authorization:`Bearer ${SESSION}`}}),e);
  assert.equal(response.status,200);
  const text=await response.text();
  assert.doesNotMatch(text,/secret-token|githubToken|access_token/i);
  assert.deepEqual(JSON.parse(text).user,{login:'admin',avatarUrl:'avatar'});
});

test('stale baseSha returns 409 and never sends a GitHub write',async()=>{
  const {default:handler}=await worker();
  const e=env();let writes=0;
  await e.INLINE_SESSIONS.put(`session:${SESSION}`,JSON.stringify({githubToken:'secret-token',login:'admin',avatarUrl:'',expiresAt:Date.now()+60000}));
  e.FETCH=async(url,options={})=>{
    if(options.method==='PUT')writes++;
    return new Response(JSON.stringify({sha:'current-sha',content:encodedData()}),{status:200,headers:{'content-type':'application/json'}});
  };
  const response=await handler.fetch(req('/inline/patch',{method:'POST',headers:{Authorization:`Bearer ${SESSION}`},body:{target:{kind:'platform',id:data.platforms[0].id,field:'description'},baseSha:'stale-sha',value:{ar:'أ',en:'A',tr:'A'}}}),e);
  assert.equal(response.status,409);
  assert.equal(writes,0);
});

test('valid patch writes only data.json and returns the new SHA without exposing token',async()=>{
  const {default:handler}=await worker();
  const e=env();let putBody=null;
  await e.INLINE_SESSIONS.put(`session:${SESSION}`,JSON.stringify({githubToken:'secret-token',login:'admin',avatarUrl:'',expiresAt:Date.now()+60000}));
  e.FETCH=async(url,options={})=>{
    if(options.method==='PUT'){
      putBody=JSON.parse(options.body);
      return new Response(JSON.stringify({content:{sha:'new-sha'}}),{status:200,headers:{'content-type':'application/json'}});
    }
    return new Response(JSON.stringify({sha:'current-sha',content:encodedData()}),{status:200,headers:{'content-type':'application/json'}});
  };
  const value={ar:'تعديل',en:'Edit',tr:'Düzenle'};
  const response=await handler.fetch(req('/inline/patch',{method:'POST',headers:{Authorization:`Bearer ${SESSION}`},body:{target:{kind:'platform',id:data.platforms[0].id,field:'description'},baseSha:'current-sha',value}}),e);
  assert.equal(response.status,200);
  const result=await response.json();
  assert.equal(result.sha,'new-sha');
  assert.deepEqual(result.value,value);
  assert.ok(putBody.sha==='current-sha');
  assert.ok(typeof putBody.content==='string');
  assert.doesNotMatch(JSON.stringify(result),/secret-token/);
});
