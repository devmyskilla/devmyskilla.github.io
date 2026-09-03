const test=require('node:test');
const assert=require('node:assert/strict');
const Schema=require('../scripts/content-schema.cjs');

const loc=(v)=>({ar:v,en:v,tr:v});
const base=()=>({
  id:'plat-x',
  fields:[{id:'ai',name:loc('AI'),officialUrl:'https://example.com/ai'}],
  officialPaths:[{
    id:'p1',officialName:'AI Path',name:loc('AI Path'),type:'learning-path',
    officialUrl:'https://example.com/p1',fieldIds:['ai'],featured:false
  }],
  pathResearch:{
    lastVerified:'2026-09-04',fieldsSourceUrl:'https://example.com/topics',
    pathsSourceUrl:'https://example.com/paths',allPathsUrl:'https://example.com/paths'
  }
});

test('valid platform field/path data passes',()=>{
  const row=base();
  assert.equal(Schema.validatePlatformPathData(row),row);
});

test('missing new research properties remain allowed during migration',()=>{
  const row={id:'plat-old'};
  assert.equal(Schema.validatePlatformPathData(row),row);
});

test('official paths require direct http(s) URLs',()=>{
  const row=base();row.officialPaths[0].officialUrl='';
  assert.throws(()=>Schema.validatePlatformPathData(row),/officialUrl/);
  row.officialPaths[0].officialUrl='javascript:alert(1)';
  assert.throws(()=>Schema.validatePlatformPathData(row),/officialUrl/);
});

test('path fieldIds must reference fields from the same platform',()=>{
  const row=base();row.officialPaths[0].fieldIds=['missing'];
  assert.throws(()=>Schema.validatePlatformPathData(row),/unknown fieldId/);
});

test('path types are restricted to the approved normalized set',()=>{
  const row=base();row.officialPaths[0].type='course';
  assert.throws(()=>Schema.validatePlatformPathData(row),/unsupported path type/);
});

test('more than 20 stored paths require allPathsUrl',()=>{
  const row=base();
  row.officialPaths=Array.from({length:21},(_,i)=>({...row.officialPaths[0],id:`p${i}`,officialUrl:`https://example.com/p${i}`}));
  row.pathResearch.allPathsUrl='';
  assert.throws(()=>Schema.validatePlatformPathData(row),/allPathsUrl/);
});

test('field and path IDs must be unique within a platform',()=>{
  const fields=base();fields.fields.push({...fields.fields[0]});
  assert.throws(()=>Schema.validatePlatformPathData(fields),/duplicate field id/i);
  const paths=base();paths.officialPaths.push({...paths.officialPaths[0]});
  assert.throws(()=>Schema.validatePlatformPathData(paths),/duplicate path id/i);
});

test('field and path names require ar en tr strings',()=>{
  const field=base();delete field.fields[0].name.tr;
  assert.throws(()=>Schema.validatePlatformPathData(field),/name.*ar\/en\/tr/i);
  const path=base();path.officialPaths[0].name.ar=42;
  assert.throws(()=>Schema.validatePlatformPathData(path),/name.*ar\/en\/tr/i);
});

test('research date must be a real YYYY-MM-DD date',()=>{
  const format=base();format.pathResearch.lastVerified='September 4';
  assert.throws(()=>Schema.validatePlatformPathData(format),/lastVerified/);
  const calendar=base();calendar.pathResearch.lastVerified='2026-02-30';
  assert.throws(()=>Schema.validatePlatformPathData(calendar),/lastVerified/);
});

test('field and research source URLs must be http(s) when present',()=>{
  const field=base();field.fields[0].officialUrl='ftp://example.com/ai';
  assert.throws(()=>Schema.validatePlatformPathData(field),/field.*officialUrl/i);
  const source=base();source.pathResearch.fieldsSourceUrl='not-a-url';
  assert.throws(()=>Schema.validatePlatformPathData(source),/fieldsSourceUrl/);
});
