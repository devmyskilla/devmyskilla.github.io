const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

function generatedSeed(){
  return execFileSync(process.execPath, ['scripts/build-platform-seed.mjs'], {encoding:'utf8'});
}

test('seed generator targets exactly the first 40 active platform IDs', () => {
  const sql=generatedSeed();
  const ids=[...sql.matchAll(/where external_id = 'plat-(\d+)';/g)].map(m=>Number(m[1]));
  assert.equal(ids.length,40);
  assert.deepEqual(ids,[...Array(40)].map((_,i)=>i+1));
});

test('seed generator never assigns source-backed verification fields', () => {
  const sql=generatedSeed();
  assert.equal(/^\s*(expected_count|expected_count_type|last_verified)\s*=/m.test(sql),false);
});

test('seed updates presentation fields with coalesce and normalizes composite languages', () => {
  const sql=generatedSeed();
  assert.match(sql,/description_ar = coalesce\(description_ar,/);
  assert.match(sql,/has_free_content = coalesce\(has_free_content,/);
  assert.match(sql,/where external_id = 'plat-5';/);
  assert.match(sql,/array\['Arabic','English'\]::text\[\]/);
});
