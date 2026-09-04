const test=require('node:test');
const assert=require('node:assert/strict');
const PlatformDetail=require('../js/platform-detail.js');

test('linked platform fields are fully clickable cards with an external-link affordance',()=>{
  const safe=value=>/^https:\/\//.test(value||'')?value:'';
  const html=PlatformDetail.fieldsMarkup({fields:[
    {id:'ai',name:'Artificial Intelligence',officialUrl:'https://example.com/ai'},
    {id:'data',name:'Data Science',officialUrl:''}
  ]},{title:'Fields'},safe);

  assert.match(html,/class="profile-field-chip profile-field-link"/);
  assert.match(html,/href="https:\/\/example\.com\/ai"/);
  assert.match(html,/target="_blank"/);
  assert.match(html,/rel="noopener noreferrer"/);
  assert.match(html,/class="profile-field-name">Artificial Intelligence<\/span>/);
  assert.match(html,/class="profile-field-action" aria-hidden="true">↗<\/span>/);
  assert.match(html,/class="profile-field-chip profile-field-static"/);
  assert.doesNotMatch(html,/profile-field-static[^>]*href=/);
});
