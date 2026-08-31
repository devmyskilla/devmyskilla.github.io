const SUPPORTED_LOCALES = Object.freeze(['ar','en','tr']);
const REQUIRED_SECTIONS = Object.freeze([
  'settings','assets','seo','siteText','categories','languages','quiz','comparison','platforms'
]);

function isObject(value){ return value && typeof value === 'object' && !Array.isArray(value); }
function isLocalized(value){
  return isObject(value) && SUPPORTED_LOCALES.every(lang => typeof value[lang] === 'string');
}
function validateContentData(data){
  if (!isObject(data)) throw new Error('data.json must contain an object');
  for (const key of REQUIRED_SECTIONS) if (!Object.hasOwn(data,key)) throw new Error(`Missing ${key}`);
  if (!isObject(data.settings) || !isObject(data.assets) || !isObject(data.seo) || !isObject(data.siteText)) throw new Error('CMS objects are invalid');
  if (!Array.isArray(data.categories) || !Array.isArray(data.languages) || !Array.isArray(data.platforms)) throw new Error('CMS collections are invalid');
  if (!isObject(data.quiz) || !isObject(data.comparison)) throw new Error('quiz/comparison must be objects');
  return data;
}
function validateStableReferences(data){
  const categoryIds = new Set(data.categories.map(row => row.id));
  const languageIds = new Set(data.languages.map(row => row.id));
  const platformIds = data.platforms.map(row => row.id);
  if (data.platforms.length !== 110) throw new Error(`Expected 110 platforms, received ${data.platforms.length}`);
  if (new Set(platformIds).size !== platformIds.length) throw new Error('Duplicate platform IDs');
  if (new Set(data.categories.map(row => row.id)).size !== data.categories.length) throw new Error('Duplicate category IDs');
  if (new Set(data.languages.map(row => row.id)).size !== data.languages.length) throw new Error('Duplicate language IDs');
  for (const row of data.platforms) {
    if (!categoryIds.has(row.categoryId)) throw new Error(`${row.id}: unknown categoryId ${row.categoryId}`);
    for (const id of row.languageIds || []) if (!languageIds.has(id)) throw new Error(`${row.id}: unknown languageId ${id}`);
  }
  return data;
}

module.exports = { SUPPORTED_LOCALES, REQUIRED_SECTIONS, isLocalized, validateContentData, validateStableReferences };
