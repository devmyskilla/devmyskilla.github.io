const SUPPORTED_LOCALES = Object.freeze(['ar','en','tr']);
const REQUIRED_SECTIONS = Object.freeze([
  'settings','assets','seo','siteText','categories','languages','quiz','comparison','platforms'
]);
const PATH_TYPES = Object.freeze(new Set([
  'learning-path','career-path','skill-path','professional-certificate','professional-program',
  'specialization','role-path','structured-series','other-official-path'
]));

function isObject(value){ return value && typeof value === 'object' && !Array.isArray(value); }
function isLocalized(value){
  return isObject(value) && SUPPORTED_LOCALES.every(lang => typeof value[lang] === 'string');
}
function isHttpUrl(value){
  try { return /^https?:$/.test(new URL(String(value)).protocol); }
  catch (_) { return false; }
}
function isDateOnly(value){
  const raw=String(value||'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(raw))return false;
  const date=new Date(`${raw}T00:00:00Z`);
  return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===raw;
}
function assert(condition,message){ if(!condition) throw new Error(message); }

function validatePlatformPathData(platform){
  if(!isObject(platform))throw new Error('platform must be an object');
  const id=String(platform.id||'platform');
  const hasFields=Object.hasOwn(platform,'fields');
  const hasPaths=Object.hasOwn(platform,'officialPaths');
  const hasResearch=Object.hasOwn(platform,'pathResearch');

  if(hasFields)assert(Array.isArray(platform.fields),`${id}: fields must be an array`);
  if(hasPaths)assert(Array.isArray(platform.officialPaths),`${id}: officialPaths must be an array`);
  if(hasResearch)assert(isObject(platform.pathResearch),`${id}: pathResearch must be an object`);

  const fields=hasFields?platform.fields:[];
  const fieldIds=new Set();
  for(const field of fields){
    assert(isObject(field),`${id}: field must be an object`);
    const fieldId=String(field.id||'').trim();
    assert(fieldId,`${id}: field id is required`);
    assert(!fieldIds.has(fieldId),`${id}: duplicate field id ${fieldId}`);
    fieldIds.add(fieldId);
    assert(isLocalized(field.name),`${id}/${fieldId}: field name must contain ar/en/tr strings`);
    if(field.officialUrl!==undefined&&String(field.officialUrl).trim()){
      assert(isHttpUrl(field.officialUrl),`${id}/${fieldId}: field officialUrl must be http(s)`);
    }
  }

  const paths=hasPaths?platform.officialPaths:[];
  const pathIds=new Set();
  for(const path of paths){
    assert(isObject(path),`${id}: official path must be an object`);
    const pathId=String(path.id||'').trim();
    assert(pathId,`${id}: path id is required`);
    assert(!pathIds.has(pathId),`${id}: duplicate path id ${pathId}`);
    pathIds.add(pathId);
    assert(String(path.officialName||'').trim(),`${id}/${pathId}: officialName is required`);
    assert(isLocalized(path.name),`${id}/${pathId}: path name must contain ar/en/tr strings`);
    assert(PATH_TYPES.has(path.type),`${id}/${pathId}: unsupported path type ${path.type}`);
    assert(isHttpUrl(path.officialUrl),`${id}/${pathId}: officialUrl must be a direct http(s) URL`);
    assert(Array.isArray(path.fieldIds),`${id}/${pathId}: fieldIds must be an array`);
    for(const fieldId of path.fieldIds){
      assert(fieldIds.has(String(fieldId)),`${id}/${pathId}: unknown fieldId ${fieldId}`);
    }
    if(path.featured!==undefined)assert(typeof path.featured==='boolean',`${id}/${pathId}: featured must be boolean`);
  }

  if(hasResearch){
    const research=platform.pathResearch;
    if(research.lastVerified!==undefined&&String(research.lastVerified).trim()){
      assert(isDateOnly(research.lastVerified),`${id}: pathResearch.lastVerified must be a real YYYY-MM-DD date`);
    }
    for(const key of ['fieldsSourceUrl','pathsSourceUrl','allPathsUrl']){
      if(research[key]!==undefined&&String(research[key]).trim()){
        assert(isHttpUrl(research[key]),`${id}: pathResearch.${key} must be http(s)`);
      }
    }
  }

  if(paths.length>20){
    assert(hasResearch&&isHttpUrl(platform.pathResearch.allPathsUrl),`${id}: pathResearch.allPathsUrl is required when more than 20 paths are stored`);
  }
  return platform;
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
    validatePlatformPathData(row);
  }
  return data;
}

module.exports = { SUPPORTED_LOCALES, REQUIRED_SECTIONS, PATH_TYPES, isLocalized, validatePlatformPathData, validateContentData, validateStableReferences };
