const test=require('node:test');
const assert=require('node:assert/strict');
const InlineEditor=require('../js/inline-editor.js');

const loc=(ar,en,tr)=>({ar,en,tr});
const sample={
  settings:{siteName:loc('س','S','S'),links:{explore:'explore.html'}},
  assets:{icons:{}},siteText:{home:{hero:loc('أ','A','A')}},
  categories:[{id:'cat',label:loc('ق','C','K')}],languages:[{id:'English',label:loc('ل','L','L')}],
  platforms:[{id:'p1',name:loc('ن','N','N'),description:loc('و','D','D'),categoryId:'cat',languageIds:['English'],editorial:{bestFor:{ar:[],en:[],tr:[]},strengths:{ar:[],en:[],tr:[]},limitations:{ar:[],en:[],tr:[]}}}]
};

test('edit mode is opt-in through edit=1 only',()=>{
  assert.equal(InlineEditor.isEditRequested({search:'?edit=1'}),true);
  assert.equal(InlineEditor.isEditRequested({search:'?lang=ar&edit=1'}),true);
  assert.equal(InlineEditor.isEditRequested({search:'?edit=0'}),false);
  assert.equal(InlineEditor.isEditRequested({search:''}),false);
});

test('descriptor target conversion never creates arbitrary JSON paths',()=>{
  assert.deepEqual(InlineEditor.targetOf({kind:'siteText',key:'siteText.home.hero'}),{kind:'siteText',key:'siteText.home.hero'});
  assert.deepEqual(InlineEditor.targetOf({kind:'platform',id:'p1',field:'description'}),{kind:'platform',id:'p1',field:'description'});
  assert.deepEqual(InlineEditor.targetOf({kind:'setting',field:'siteName'}),{kind:'setting',key:'siteName'});
  assert.equal(InlineEditor.targetOf({kind:'path',key:'platforms.0.id'}),null);
});

test('local patch updates dynamic entity by stable id, not array index',()=>{
  const data=structuredClone(sample);
  const first=data.platforms[0];
  data.platforms.unshift({id:'other',name:loc('x','x','x')});
  const value=loc('جديد','New','Yeni');
  InlineEditor.applyLocalPatch(data,{kind:'platform',id:'p1',field:'description'},value);
  assert.deepEqual(first.description,value);
  assert.notDeepEqual(data.platforms[0].description,value);
});

test('public init never calls session APIs or activates editor',async()=>{
  let sessionCalls=0;
  const editor=InlineEditor.create({location:{search:''},document:null,data:structuredClone(sample),editorApi:{getSessionId:()=>'',session:async()=>{sessionCalls++;return{};}}});
  assert.equal(await editor.init(),'public');
  assert.equal(sessionCalls,0);
  assert.equal(editor.isActive(),false);
});

test('edit request without a stored session remains login-only and inactive',async()=>{
  let sessionCalls=0;
  const editor=InlineEditor.create({location:{search:'?edit=1'},document:null,data:structuredClone(sample),editorApi:{getSessionId:()=>'',session:async()=>{sessionCalls++;return{};}}});
  assert.equal(await editor.init(),'login-required');
  assert.equal(sessionCalls,0);
  assert.equal(editor.isActive(),false);
});

test('editor activates only after verified session and authoritative content load',async()=>{
  let contentCalls=0;
  const authoritative=structuredClone(sample);
  const editor=InlineEditor.create({
    location:{search:'?edit=1'},document:null,data:structuredClone(sample),
    editorApi:{getSessionId:()=> 'a'.repeat(48),session:async()=>({authenticated:true,user:{login:'admin'}}),content:async()=>{contentCalls++;return{data:authoritative,sha:'sha-1'}}},
    descriptorFactory:{create:()=>({resolveNode:()=>null,resolveTarget:()=>null})}
  });
  assert.equal(await editor.init(),'active');
  assert.equal(contentCalls,1);
  assert.equal(editor.isActive(),true);
  assert.equal(editor.getBaseSha(),'sha-1');
});

test('409 conflict preserves edit state and reports conflict without logging out',async()=>{
  const editor=InlineEditor.create({
    location:{search:'?edit=1'},document:null,data:structuredClone(sample),
    editorApi:{getSessionId:()=> 'b'.repeat(48),session:async()=>({authenticated:true}),content:async()=>({data:structuredClone(sample),sha:'sha-1'}),patch:async()=>{const e=new Error('changed');e.status=409;throw e;}},
    descriptorFactory:{create:()=>({resolveNode:()=>null,resolveTarget:()=>null})}
  });
  await editor.init();
  const result=await editor.saveDescriptor({kind:'siteText',key:'siteText.home.hero',widget:'localizedText'},loc('ب','B','B'));
  assert.equal(result.status,'conflict');
  assert.equal(editor.isActive(),true);
  assert.equal(editor.getBaseSha(),'sha-1');
});
