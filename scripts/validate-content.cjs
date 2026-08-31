const fs=require('node:fs');
const {SUPPORTED_LOCALES,isLocalized,validateContentData,validateStableReferences}=require('./content-schema.cjs');
const data=validateStableReferences(validateContentData(JSON.parse(fs.readFileSync('data.json','utf8'))));

function assert(condition,message){if(!condition)throw new Error(message)}
function validateLocalized(value,path){assert(isLocalized(value),`${path} must contain ar/en/tr strings`)}
function walkText(value,path){
  if(isLocalized(value))return;
  assert(value&&typeof value==='object'&&!Array.isArray(value),`${path} must be an object or localized value`);
  for(const [key,child] of Object.entries(value))walkText(child,`${path}.${key}`);
}

validateLocalized(data.settings.siteName,'settings.siteName');
validateLocalized(data.settings.developerName,'settings.developerName');
validateLocalized(data.settings.copyright,'settings.copyright');
assert(SUPPORTED_LOCALES.includes(data.settings.defaultLanguage),'settings.defaultLanguage is invalid');
walkText(data.siteText,'siteText');
for(const row of data.categories){assert(typeof row.id==='string'&&row.id,'category.id is required');validateLocalized(row.label,`category.${row.id}.label`)}
for(const row of data.languages){assert(typeof row.id==='string'&&row.id,'language.id is required');validateLocalized(row.label,`language.${row.id}.label`)}
for(const row of data.platforms){
  validateLocalized(row.name,`${row.id}.name`);validateLocalized(row.description,`${row.id}.description`);
  assert(row.logo&&typeof row.logo==='object',`${row.id}.logo is required`);validateLocalized(row.logo.alt,`${row.id}.logo.alt`);
  assert(row.editorial&&typeof row.editorial==='object',`${row.id}.editorial is required`);
  for(const key of ['bestFor','strengths','limitations']){
    const group=row.editorial[key];assert(group&&typeof group==='object',`${row.id}.editorial.${key} is required`);
    for(const lang of SUPPORTED_LOCALES)assert(Array.isArray(group[lang]),`${row.id}.editorial.${key}.${lang} must be an array`);
  }
}
for(const page of ['home','explore','platform']){
  assert(data.seo[page]&&typeof data.seo[page]==='object',`seo.${page} missing`);
  for(const lang of SUPPORTED_LOCALES){const row=data.seo[page][lang];assert(row&&typeof row==='object',`seo.${page}.${lang} missing`);for(const key of ['title','description','ogTitle','ogDescription','ogImage'])assert(typeof row[key]==='string',`seo.${page}.${lang}.${key} must be string`)}
}
console.log(`Validated full CMS content: ${data.platforms.length} platforms, ${data.categories.length} categories, ${data.languages.length} languages`);
