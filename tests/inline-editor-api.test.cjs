const test=require('node:test');
const assert=require('node:assert/strict');
const InlineEditorAPI=require('../js/inline-editor-api.js');

function storage(){
  const values=new Map();
  return{values,getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
}

test('acceptAuthMessage stores only an opaque session from the site origin',()=>{
  const s=storage();
  const api=InlineEditorAPI.create({apiBase:'https://inline.example',storage:s,siteOrigin:'https://devmyskilla.github.io'});
  const accepted=api.acceptAuthMessage({origin:'https://devmyskilla.github.io',data:{type:'dunya-inline-auth',session:'a'.repeat(48),user:{login:'admin'},access_token:'never-store'}});
  assert.equal(accepted,true);
  assert.equal(s.values.get('dunya-inline-session'),'a'.repeat(48));
  assert.equal([...s.values.values()].some(v=>String(v).includes('never-store')),false);
});

test('acceptAuthMessage rejects another origin and malformed sessions',()=>{
  const s=storage();
  const api=InlineEditorAPI.create({apiBase:'https://inline.example',storage:s,siteOrigin:'https://devmyskilla.github.io'});
  assert.equal(api.acceptAuthMessage({origin:'https://evil.example',data:{type:'dunya-inline-auth',session:'a'.repeat(48)}}),false);
  assert.equal(api.acceptAuthMessage({origin:'https://devmyskilla.github.io',data:{type:'dunya-inline-auth',session:'short'}}),false);
  assert.equal(api.getSessionId(),'');
});

test('login opens only the configured Worker OAuth endpoint',()=>{
  let opened='';
  const api=InlineEditorAPI.create({apiBase:'https://inline.example/',storage:storage(),openFn:url=>{opened=url;return{};}});
  api.login();
  assert.equal(opened,'https://inline.example/inline/auth');
});

test('authenticated requests send only the opaque session bearer',async()=>{
  const s=storage();s.setItem('dunya-inline-session','b'.repeat(48));
  const calls=[];
  const api=InlineEditorAPI.create({apiBase:'https://inline.example',storage:s,fetchFn:async(url,options={})=>{calls.push({url,options});return new Response(JSON.stringify({authenticated:true,user:{login:'admin'}}),{status:200,headers:{'content-type':'application/json'}})}});
  const result=await api.session();
  assert.equal(result.authenticated,true);
  assert.equal(calls[0].options.headers.Authorization,`Bearer ${'b'.repeat(48)}`);
  assert.doesNotMatch(JSON.stringify(calls),/githubToken|access_token/i);
});

test('patch preserves HTTP status for conflict handling',async()=>{
  const s=storage();s.setItem('dunya-inline-session','c'.repeat(48));
  const api=InlineEditorAPI.create({apiBase:'https://inline.example',storage:s,fetchFn:async()=>new Response(JSON.stringify({error:'Content changed'}),{status:409,headers:{'content-type':'application/json'}})});
  await assert.rejects(()=>api.patch({target:{kind:'siteText',key:'hero'},baseSha:'old',value:{ar:'ا',en:'A',tr:'A'}}),err=>err.status===409&&/changed/i.test(err.message));
  assert.equal(api.getSessionId(),'c'.repeat(48));
});

test('logout calls the Worker then clears local session even if response body is empty',async()=>{
  const s=storage();s.setItem('dunya-inline-session','d'.repeat(48));
  let called=false;
  const api=InlineEditorAPI.create({apiBase:'https://inline.example',storage:s,fetchFn:async()=>{called=true;return new Response('',{status:204})}});
  await api.logout();
  assert.equal(called,true);
  assert.equal(api.getSessionId(),'');
});
