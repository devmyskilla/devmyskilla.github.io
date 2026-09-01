const LANGS=['ar','en','tr'];
const PLATFORM_FIELDS={
  name:'localizedText',description:'localizedText',
  'editorial.bestFor':'localizedList','editorial.strengths':'localizedList','editorial.limitations':'localizedList',
  officialUrl:'link',catalogUrl:'link',logo:'asset',categoryId:'categoryRef',languageIds:'languageRefs',
  pricingModel:'pricingRef',hasFreeContent:'boolean',certificateAvailable:'boolean',freeCertificate:'boolean',
  officialCount:'nullableNumber',officialCountType:'text',lastVerified:'nullableText',platformType:'text',featured:'boolean',displayOrder:'number'
};
const SETTINGS={siteName:'localizedText',developerName:'localizedText',copyright:'localizedText',defaultLanguage:'languageCode',themeColor:'hex'};
const SEO_FIELDS=new Set(['title','description','ogTitle','ogDescription','ogImage']);
const PRICING=new Set(['free','paid','mixed','unknown']);

function object(value){return !!value&&typeof value==='object'&&!Array.isArray(value)}
function container(value){return !!value&&typeof value==='object'}
function clone(value){return structuredClone(value)}
function parts(path){return String(path||'').split('.').filter(Boolean)}
function get(owner,path){return parts(path).reduce((value,key)=>value&&Object.hasOwn(value,key)?value[key]:undefined,owner)}
function set(owner,path,value){const keys=parts(path);if(!keys.length)throw new Error('unsupported target');let cursor=owner;for(const key of keys.slice(0,-1)){if(!container(cursor[key]))throw new Error('unsupported target');cursor=cursor[key]}cursor[keys.at(-1)]=value}
function findTextPath(siteText,key){
  if(!object(siteText))return'';
  const wanted=String(key||'').replace(/^siteText\./,'');
  if(!wanted)return'';
  if(wanted.includes('.'))return get(siteText,wanted)!==undefined?`siteText.${wanted}`:'';
  const matches=[];
  for(const [group,values] of Object.entries(siteText))if(object(values)&&Object.hasOwn(values,wanted))matches.push(`siteText.${group}.${wanted}`);
  return matches.length===1?matches[0]:'';
}
function localized(value,{list=false}={}){
  if(!object(value)||!LANGS.every(lang=>Object.hasOwn(value,lang)))throw new Error('localized value must include ar/en/tr');
  for(const lang of LANGS){
    if(list){if(!Array.isArray(value[lang])||value[lang].some(v=>typeof v!=='string'))throw new Error('localized list must contain string arrays')}
    else if(typeof value[lang]!=='string')throw new Error('localized value must contain strings');
  }
  return clone(value);
}
function safeLink(value,{relative=false}={}){
  if(typeof value!=='string')throw new Error('link must be a string');
  const raw=value.trim();if(!raw)return'';
  if(relative&&(/^(?:#|\.?\.?\/)/.test(raw)||/^[A-Za-z0-9_./-]+(?:\.[A-Za-z0-9]+)?(?:[?#].*)?$/.test(raw)))return raw;
  let url;try{url=new URL(raw)}catch{throw new Error('invalid link')}
  if(!/^https?:$/.test(url.protocol))throw new Error('invalid link protocol');
  return url.href;
}
function asset(value){
  if(!object(value))throw new Error('asset must be an object');
  return{src:safeLink(String(value.src||''),{relative:true}),alt:localized(value.alt||{})};
}
function validateWidget(data,widget,value){
  if(widget==='localizedText')return localized(value);
  if(widget==='localizedList')return localized(value,{list:true});
  if(widget==='link')return safeLink(value,{relative:true});
  if(widget==='asset')return asset(value);
  if(widget==='boolean'){if(typeof value!=='boolean')throw new Error('boolean value required');return value}
  if(widget==='number'){if(typeof value!=='number'||!Number.isFinite(value))throw new Error('number value required');return value}
  if(widget==='nullableNumber'){if(value===null||value==='')return null;if(typeof value!=='number'||!Number.isFinite(value))throw new Error('number value required');return value}
  if(widget==='text'){if(typeof value!=='string')throw new Error('text value required');return value}
  if(widget==='nullableText'){if(value===null||value==='')return null;if(typeof value!=='string')throw new Error('text value required');return value}
  if(widget==='categoryRef'){if(typeof value!=='string'||!(data.categories||[]).some(row=>row.id===value))throw new Error('unknown category reference');return value}
  if(widget==='languageRefs'){
    if(!Array.isArray(value)||value.some(id=>typeof id!=='string'))throw new Error('language references must be an array');
    const ids=new Set((data.languages||[]).map(row=>row.id));for(const id of value)if(!ids.has(id))throw new Error(`unknown language reference ${id}`);return[...new Set(value)];
  }
  if(widget==='pricingRef'){if(typeof value!=='string'||!PRICING.has(value))throw new Error('invalid pricing model');return value}
  if(widget==='languageCode'){if(!LANGS.includes(value))throw new Error('invalid language code');return value}
  if(widget==='hex'){if(typeof value!=='string'||!/^#[0-9a-fA-F]{6}$/.test(value))throw new Error('invalid hex color');return value}
  throw new Error('unsupported target');
}
function descriptor(path,widget,target){return{path,widget,target}}

export function resolveTarget(data,target){
  if(!object(target)||typeof target.kind!=='string')throw new Error('unsupported target');
  if(target.kind==='siteText'){
    const path=findTextPath(data.siteText,target.key);if(!path)throw new Error('unsupported target');
    const value=get(data,path);const widget=object(value)&&LANGS.every(x=>Array.isArray(value[x]))?'localizedList':'localizedText';
    return descriptor(path,widget,target);
  }
  if(target.kind==='setting'){
    const widget=SETTINGS[target.key];if(!widget||get(data.settings,target.key)===undefined)throw new Error('unsupported target');
    return descriptor(`settings.${target.key}`,widget,target);
  }
  if(target.kind==='link'){
    const key=String(target.key||'').replace(/^links\./,'');if(typeof get(data.settings&&data.settings.links,key)!=='string')throw new Error('unsupported target');
    return descriptor(`settings.links.${key}`,'link',target);
  }
  if(target.kind==='asset'){
    const key=String(target.key||'');if(!object(get(data.assets,key)))throw new Error('unsupported target');return descriptor(`assets.${key}`,'asset',target);
  }
  if(target.kind==='icon'){
    const key=String(target.key||'');if(typeof get(data.assets&&data.assets.icons,key)!=='string')throw new Error('unsupported target');return descriptor(`assets.icons.${key}`,'text',target);
  }
  if(target.kind==='category'||target.kind==='language'){
    if(target.field!=='label')throw new Error('unsupported target');
    const collection=target.kind==='category'?data.categories:data.languages;const index=(collection||[]).findIndex(row=>row.id===target.id);if(index<0)throw new Error('unsupported target');
    return descriptor(`${target.kind==='category'?'categories':'languages'}.${index}.label`,'localizedText',target);
  }
  if(target.kind==='platform'){
    const widget=PLATFORM_FIELDS[target.field];if(!widget)throw new Error('unsupported target');
    const index=(data.platforms||[]).findIndex(row=>row.id===target.id);if(index<0)throw new Error('unsupported target');
    return descriptor(`platforms.${index}.${target.field}`,widget,target);
  }
  if(target.kind==='seo'){
    const page=String(target.id||target.page||''),lang=String(target.lang||''),field=String(target.field||'');
    if(!['home','explore','platform'].includes(page)||!LANGS.includes(lang)||!SEO_FIELDS.has(field)||typeof get(data.seo,`${page}.${lang}.${field}`)!=='string')throw new Error('unsupported target');
    return descriptor(`seo.${page}.${lang}.${field}`,field==='ogImage'?'link':'text',target);
  }
  if(target.kind==='quizPath'){
    if(target.field!=='label'||typeof target.id!=='string'||!object(data.quiz&&data.quiz.paths&&data.quiz.paths[target.id]))throw new Error('unsupported target');
    return descriptor(`quiz.paths.${target.id}.label`,'localizedText',target);
  }
  throw new Error('unsupported target');
}

export function validateValue(data,descriptor,value){return validateWidget(data,descriptor.widget,value)}

export function validateDocument(data){
  for(const key of ['settings','assets','seo','siteText','categories','languages','quiz','comparison','platforms'])if(!(key in(data||{})))throw new Error(`missing ${key}`);
  if(!Array.isArray(data.platforms)||data.platforms.length!==110)throw new Error(`expected 110 platforms`);
  if(!Array.isArray(data.categories)||!Array.isArray(data.languages))throw new Error('invalid taxonomy');
  const categoryIds=new Set(),languageIds=new Set(),platformIds=new Set();
  for(const row of data.categories){if(!row||typeof row.id!=='string'||categoryIds.has(row.id))throw new Error('invalid category id');categoryIds.add(row.id);localized(row.label)}
  for(const row of data.languages){if(!row||typeof row.id!=='string'||languageIds.has(row.id))throw new Error('invalid language id');languageIds.add(row.id);localized(row.label)}
  for(const row of data.platforms){
    if(!row||typeof row.id!=='string'||platformIds.has(row.id))throw new Error('invalid platform id');platformIds.add(row.id);
    if(!categoryIds.has(row.categoryId))throw new Error(`${row.id}: unknown category reference`);
    for(const id of row.languageIds||[])if(!languageIds.has(id))throw new Error(`${row.id}: unknown language reference ${id}`);
    localized(row.name);localized(row.description);asset(row.logo);
    for(const key of ['bestFor','strengths','limitations'])localized(row.editorial&&row.editorial[key],{list:true});
  }
  return true;
}

export function applyPatch(data,target,value){
  validateDocument(data);
  const d=resolveTarget(data,target);
  const normalized=validateValue(data,d,value);
  const next=clone(data);set(next,d.path,normalized);validateDocument(next);
  return{data:next,value:normalized,descriptor:d};
}

export const INLINE_EDIT_FIELDS=Object.freeze({platform:{...PLATFORM_FIELDS},settings:{...SETTINGS}});
