(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ContentAPI=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const SUPPORTED=['ar','en','tr'];

  function isObject(value){return value&&typeof value==='object'&&!Array.isArray(value)}
  function byPath(owner,path){
    return String(path||'').split('.').filter(Boolean).reduce((value,key)=>value&&Object.hasOwn(value,key)?value[key]:undefined,owner);
  }
  function localized(value,lang){
    if(typeof value==='string')return value;
    if(!isObject(value))return'';
    return value[lang]||value.en||value.ar||value.tr||'';
  }
  function findSiteText(siteText,key){
    if(!isObject(siteText))return undefined;
    if(String(key).includes('.'))return byPath(siteText,key);
    for(const group of Object.values(siteText)){
      if(isObject(group)&&Object.hasOwn(group,key))return group[key];
    }
    return undefined;
  }
  function safeUrl(value,{allowRelative=true}={}){
    const raw=String(value||'').trim();
    if(!raw)return'';
    if(allowRelative&&(/^(?:#|\.?\.?\/)/.test(raw)||/^[A-Za-z0-9_./-]+(?:\.[A-Za-z0-9]+)?(?:[?#].*)?$/.test(raw)))return raw;
    try{
      const url=new URL(raw);
      return /^https?:$/.test(url.protocol)?url.href:'';
    }catch(_){return''}
  }
  function create(data,initialLang='ar'){
    let lang=SUPPORTED.includes(initialLang)?initialLang:'ar';
    const categoryMap=new Map((Array.isArray(data&&data.categories)?data.categories:[]).map(row=>[row.id,row]));
    const languageMap=new Map((Array.isArray(data&&data.languages)?data.languages:[]).map(row=>[row.id,row]));

    function setLang(next){if(SUPPORTED.includes(next))lang=next;return lang}
    function getLang(){return lang}
    function text(path,override){return localized(findSiteText(data&&data.siteText,path),override||lang)}
    function rawSetting(path){return byPath(data&&data.settings,path)}
    function setting(path,override){return localized(rawSetting(path),override||lang)}
    function rawAsset(path){return byPath(data&&data.assets,path)}
    function asset(path,override){
      const value=rawAsset(path);
      if(!isObject(value))return{src:'',alt:''};
      const src=safeUrl(value.src,{allowRelative:true});
      return{src,alt:localized(value.alt,override||lang)};
    }
    function icon(key){const value=byPath(data&&data.assets&&data.assets.icons,key);return typeof value==='string'?value:''}
    function link(key){
      const path=String(key||'').startsWith('links.')?key:`links.${key}`;
      return safeUrl(rawSetting(path),{allowRelative:true});
    }
    function category(id){return categoryMap.get(id)||null}
    function language(id){return languageMap.get(id)||null}
    function categoryLabel(id,override){const row=category(id);return row?localized(row.label,override||lang):''}
    function languageLabel(id,override){const row=language(id);return row?localized(row.label,override||lang):''}
    function seo(page,override){
      const value=byPath(data&&data.seo,`${page}.${override||lang}`);
      return isObject(value)?{...value}:{title:'',description:'',ogTitle:'',ogDescription:'',ogImage:''};
    }
    function platformName(platform,override){return localized(platform&&platform.name,override||lang)}
    function platformDescription(platform,override){return localized(platform&&platform.description,override||lang)}
    function platformList(platform,key,override){
      const value=platform&&platform.editorial&&platform.editorial[key];
      if(!isObject(value))return[];
      const wanted=override||lang;
      for(const candidate of [wanted,'en','ar','tr']){
        const list=value[candidate];
        if(Array.isArray(list)&&list.length)return[...list];
      }
      return[];
    }
    function contentCountLabel(platform,override){
      const raw=platform&&platform.officialCount;
      if(raw===null||raw===undefined||raw==='')return'';
      const count=Number(raw);
      if(!Number.isFinite(count))return'';
      const type=String(platform.officialCountType||'items');
      const unit=localized(byPath(data&&data.siteText,`common.contentUnits.${type}`),override||lang)
        ||localized(byPath(data&&data.siteText,'common.contentUnits.items'),override||lang);
      return unit?`${count} ${unit}`:String(count);
    }
    function raw(path){return byPath(data,path)}
    function localize(value,override){return localized(value,override||lang)}

    return{data,text,setting,rawSetting,asset,rawAsset,icon,link,category,language,categoryLabel,languageLabel,seo,platformName,platformDescription,platformList,contentCountLabel,safeUrl,setLang,getLang,raw,localize};
  }

  return{create,safeUrl};
});
