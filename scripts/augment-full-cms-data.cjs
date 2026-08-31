const fs=require('node:fs');
const {validateContentData,validateStableReferences}=require('./content-schema.cjs');
const path='data.json';
const data=JSON.parse(fs.readFileSync(path,'utf8'));
validateStableReferences(validateContentData(data));

data.assets ||= {};
data.assets.icons ||= {};
Object.assign(data.assets.icons,{
  problemMany:data.assets.icons.problemMany||'⌘',
  problemPrice:data.assets.icons.problemPrice||'◐',
  problemCert:data.assets.icons.problemCert||'✓',
  problemCompare:data.assets.icons.problemCompare||'⇄',
  developerMark:data.assets.icons.developerMark||'أ'
});

data.settings ||= {};
data.settings.homePlatformCloud ||= [];
data.quiz ||= {};
data.quiz.quickFilters ||= [];
data.quiz.questions ||= [];
data.quiz.learningPaths ||= {};
data.comparison ||= {};
if(!Number.isInteger(data.comparison.maxPlatforms))data.comparison.maxPlatforms=3;
if(typeof data.comparison.emptyValue!=='string')data.comparison.emptyValue='—';

validateStableReferences(validateContentData(data));
fs.writeFileSync(path,JSON.stringify(data,null,2)+'\n');
console.log(`Augmented full CMS data for ${data.platforms.length} platforms`);
