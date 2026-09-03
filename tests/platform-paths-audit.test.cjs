const test=require('node:test');
const assert=require('node:assert/strict');
const Audit=require('../scripts/platform-paths-audit.cjs');

const loc=(en)=>({ar:en,en,tr:en});

test('audit marks explicit empty officialPaths complete when metadata exists',()=>{
  const row={id:'plat-1',name:loc('A'),fields:[],officialPaths:[],pathResearch:{lastVerified:'2026-09-04'}};
  assert.equal(Audit.isResearchComplete(row),true);
});

test('audit marks missing research properties incomplete',()=>{
  assert.equal(Audit.isResearchComplete({id:'plat-1',fields:[]}),false);
  assert.equal(Audit.isResearchComplete({id:'plat-1',fields:[],officialPaths:[],pathResearch:{}}),false);
});

test('parseRange converts 1:20 to zero-based slice boundaries',()=>{
  assert.deepEqual(Audit.parseRange('1:20',110),{start:0,end:20});
  assert.deepEqual(Audit.parseRange('101:110',110),{start:100,end:110});
});

test('parseRange rejects reversed and out-of-bounds ranges',()=>{
  assert.throws(()=>Audit.parseRange('20:1',110),/range/i);
  assert.throws(()=>Audit.parseRange('0:20',110),/range/i);
  assert.throws(()=>Audit.parseRange('1:111',110),/range/i);
});

test('summarize reports counts and selected stable positions',()=>{
  const rows=[
    {id:'plat-1',name:loc('One'),fields:[{}],officialPaths:[],pathResearch:{lastVerified:'2026-09-04'}},
    {id:'plat-2',name:loc('Two')},
    {id:'plat-3',name:loc('Three'),fields:[],officialPaths:[{}],pathResearch:{lastVerified:'2026-09-03'}}
  ];
  const summary=Audit.summarize(rows,{start:0,end:3});
  assert.equal(summary.complete,2);
  assert.equal(summary.incomplete,1);
  assert.equal(summary.rows[0].position,1);
  assert.equal(summary.rows[1].id,'plat-2');
  assert.equal(summary.rows[1].status,'INCOMPLETE');
  assert.equal(summary.rows[2].paths,1);
});
