const test = require('node:test');
const assert = require('node:assert/strict');
const PlatformDetail = require('../js/platform-detail.js');

const platforms = [
  {
    id:'plat-1', name:'FutureLearn', description_ar:'وصف عربي', description_en:'English description',
    category:'academic', pricingModel:'freemium', languages:['English'], hasFreeContent:true,
    certificateAvailable:true, officialCount:1673, officialCountType:'courses', lastVerified:'2026-08-26',
    officialUrl:'https://www.futurelearn.com', catalogUrl:'https://www.futurelearn.com/courses',
    best_for_ar:['طلاب الجامعات'], best_for_en:['University learners'], strengths_en:['University partners'],
    limitations_en:['Some certificates are paid']
  },
  {id:'plat-2',name:'Agora',category:'academic',languages:['English','French']}
];

test('findPlatform matches exact stable ID only', () => {
  assert.equal(PlatformDetail.findPlatform(platforms,'plat-1').name,'FutureLearn');
  assert.equal(PlatformDetail.findPlatform(platforms,'plat-999'),null);
  assert.equal(PlatformDetail.findPlatform(platforms,''),null);
});

test('buildDetailModel preserves official and catalog links separately', () => {
  const model=PlatformDetail.buildDetailModel(platforms[0],'en',new Date('2026-08-26T12:00:00Z'));
  assert.equal(model.officialUrl,'https://www.futurelearn.com');
  assert.equal(model.catalogUrl,'https://www.futurelearn.com/courses');
  assert.equal(model.countLabel,'1673 courses');
  assert.equal(model.verification,'recent');
});

test('buildDetailModel localizes editorial lists with English fallback', () => {
  const ar=PlatformDetail.buildDetailModel(platforms[0],'ar');
  assert.deepEqual(ar.bestFor,['طلاب الجامعات']);
  assert.deepEqual(ar.strengths,['University partners']);
  assert.deepEqual(ar.limitations,['Some certificates are paid']);
});

test('empty editorial arrays remain empty so sections can be omitted', () => {
  const model=PlatformDetail.buildDetailModel(platforms[1],'en');
  assert.deepEqual(model.bestFor,[]);
  assert.deepEqual(model.strengths,[]);
  assert.deepEqual(model.limitations,[]);
  assert.equal(model.countLabel,'Not officially confirmed');
});

test('similarPlatforms excludes the current platform and matches category', () => {
  const similar=PlatformDetail.similarPlatforms(platforms,platforms[0],3);
  assert.deepEqual(similar.map(p=>p.id),['plat-2']);
});
