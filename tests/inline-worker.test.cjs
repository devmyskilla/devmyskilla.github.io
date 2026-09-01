const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const data=JSON.parse(fs.readFileSync('data.json','utf8'));
async function schema(){return import('../inline-worker/src/edit-schema.mjs')}

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
