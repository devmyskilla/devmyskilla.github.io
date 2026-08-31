const ContentAPIModule = typeof module === 'object' && module.exports ? require('./content-api.js') : null;
const SUPPORTED_LANGS = ['ar','en','tr'];
const TECHNICAL_FALLBACK = { errorLoading:'Unable to load content', platformNotFound:'Content not found' };

let currentLang='ar';
let content=null;
try{
  const saved=typeof localStorage!=='undefined'?localStorage.getItem('dunya-lang'):null;
  if(SUPPORTED_LANGS.includes(saved))currentLang=saved;
}catch(_){}

function contentApiModule(){
  if(ContentAPIModule)return ContentAPIModule;
  if(typeof globalThis!=='undefined'&&globalThis.ContentAPI)return globalThis.ContentAPI;
  return null;
}
function initContent(data){
  const api=contentApiModule();
  if(!api||typeof api.create!=='function')throw new Error('ContentAPI is required');
  content=api.create(data,currentLang);
  return content;
}
function mergeSiteText(){
  // Compatibility shim during the migration; all real content comes from initContent(data).
  return content;
}
function getText(path){
  const value=content?content.text(path,currentLang):'';
  if(value)return value;
  return TECHNICAL_FALLBACK[path]||'';
}
function setLang(lang){
  if(!SUPPORTED_LANGS.includes(lang))lang='ar';
  currentLang=lang;
  if(content)content.setLang(lang);
  try{if(typeof localStorage!=='undefined')localStorage.setItem('dunya-lang',lang)}catch(_){}
  if(typeof document!=='undefined'){
    document.documentElement.lang=lang;
    document.documentElement.dir=lang==='ar'?'rtl':'ltr';
  }
  return currentLang;
}
function applyTranslations(){
  if(typeof document==='undefined')return;
  document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=getText(el.dataset.i18n)});
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{el.placeholder=getText(el.dataset.i18nPlaceholder)});
  document.querySelectorAll('[data-i18n-aria-label]').forEach(el=>{el.setAttribute('aria-label',getText(el.dataset.i18nAriaLabel))});
  document.querySelectorAll('[data-i18n-title]').forEach(el=>{el.setAttribute('title',getText(el.dataset.i18nTitle))});
}
function translateCat(id){return content?content.categoryLabel(id,currentLang):''}
function translateLang(id){return content?content.languageLabel(id,currentLang):''}
function translatePricing(model){return getText(model==='free'?'pricing_free_display':`pricing_${model||'unknown'}`)}
function translateVerification(state){if(!state||state==='unverified')return'';return getText(`verification_${state}`)}
function pf(platform,field){
  if(!content||!platform)return'';
  if(field==='name')return content.platformName(platform,currentLang);
  if(field==='description')return content.platformDescription(platform,currentLang);
  return'';
}

if(typeof module==='object'&&module.exports){
  module.exports={initContent,mergeSiteText,getText,setLang,applyTranslations,translateCat,translateLang,translatePricing,translateVerification,pf,get currentLang(){return currentLang},get content(){return content}};
}
