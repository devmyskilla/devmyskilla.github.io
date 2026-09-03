const test=require('node:test');
const assert=require('node:assert/strict');
const {applyPatch}=require('../scripts/apply-platform-paths-patch.cjs');

const loc=v=>({ar:v,en:v,tr:v});
function fixture(){return{
  siteText:{platform:{facts:loc('Facts')}},
  platforms:[
    {id:'plat-1',name:loc('One'),description:loc(''),categoryId:'x',languageIds:[]},
    {id:'plat-2',name:loc('Two'),description:loc(''),categoryId:'x',languageIds:[]}
  ]
}}

test('patch merges only platform UI text and approved research fields',()=>{
  const data=fixture();
  const patch={
    siteTextPlatform:{fields:loc('Fields'),pathTypes:{'learning-path':loc('Learning path')}},
    platforms:[{id:'plat-1',fields:[{id:'ai',name:loc('AI')}],officialPaths:[],pathResearch:{lastVerified:'2026-09-04'}}]
  };
  const out=applyPatch(data,patch);
  assert.equal(out.siteText.platform.facts.en,'Facts');
  assert.equal(out.siteText.platform.fields.en,'Fields');
  assert.equal(out.siteText.platform.pathTypes['learning-path'].en,'Learning path');
  assert.equal(out.platforms[0].fields[0].id,'ai');
  assert.deepEqual(out.platforms[0].officialPaths,[]);
  assert.equal(out.platforms[0].pathResearch.lastVerified,'2026-09-04');
  assert.equal(out.platforms[1].fields,undefined);
});

test('patch rejects unknown platform IDs',()=>{
  assert.throws(()=>applyPatch(fixture(),{platforms:[{id:'missing',fields:[]}]}),/unknown platform/i);
});

test('patch rejects attempts to mutate unrelated platform fields',()=>{
  assert.throws(()=>applyPatch(fixture(),{platforms:[{id:'plat-1',name:loc('Changed')}]}),/unsupported platform patch key/i);
});

test('patch rejects unsupported top-level keys and duplicate platform patches',()=>{
  assert.throws(()=>applyPatch(fixture(),{settings:{}}),/unsupported patch key/i);
  assert.throws(()=>applyPatch(fixture(),{platforms:[{id:'plat-1',fields:[]},{id:'plat-1',fields:[]}]}),/duplicate platform patch/i);
});

test('patch does not mutate the input object',()=>{
  const data=fixture();
  const snapshot=JSON.stringify(data);
  applyPatch(data,{siteTextPlatform:{fields:loc('Fields')}});
  assert.equal(JSON.stringify(data),snapshot);
});
