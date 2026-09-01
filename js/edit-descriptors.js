(function(root,factory){
  const ContentAPI=(typeof module==='object'&&module.exports)?require('./content-api.js'):(root&&root.ContentAPI);
  const api=factory(ContentAPI);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.EditDescriptors=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(ContentAPI){
  const PLATFORM_FIELDS={
    name:'localizedText',description:'localizedText',
    'editorial.bestFor':'localizedList','editorial.strengths':'localizedList','editorial.limitations':'localizedList',
    officialUrl:'link',catalogUrl:'link',logo:'asset',categoryId:'categoryRef',languageIds:'languageRefs',
    pricingModel:'pricingRef',hasFreeContent:'boolean',certificateAvailable:'boolean',freeCertificate:'boolean',
    officialCount:'nullableNumber',officialCountType:'text',lastVerified:'text',platformType:'text',featured:'boolean',displayOrder:'number'
  };
  const SETTING_FIELDS={siteName:'localizedText',developerName:'localizedText',copyright:'localizedText',defaultLanguage:'text',themeColor:'text'};
  const SEO_FIELDS=new Set(['title','description','ogTitle','ogDescription','ogImage']);
  const LOCALIZED_WIDGETS=new Set(['localizedText','localizedList']);

  function isObject(value){return value&&typeof value==='object'&&!Array.isArray(value)}
  function byPath(owner,path){return String(path||'').split('.').filter(Boolean).reduce((value,key)=>value&&Object.hasOwn(value,key)?value[key]:undefined,owner)}
  function descriptor({kind,key='',id='',field='',widget='text',value}){
    return{kind,key,id,field,widget,localized:LOCALIZED_WIDGETS.has(widget)||widget==='asset',writable:true,value};
  }
  function create(data){
    const content=ContentAPI&&ContentAPI.create?ContentAPI.create(data):null;
    const platforms=new Map((data&&Array.isArray(data.platforms)?data.platforms:[]).map(row=>[String(row.id),row]));
    const categories=new Map((data&&Array.isArray(data.categories)?data.categories:[]).map(row=>[String(row.id),row]));
    const languages=new Map((data&&Array.isArray(data.languages)?data.languages:[]).map(row=>[String(row.id),row]));

    function textTarget(key){
      const path=content&&content.findTextPath?content.findTextPath(key):'';
      if(!path)return null;
      const value=byPath(data,path);
      return{descriptor:descriptor({kind:'siteText',key:path,widget:'localizedText',value}),value};
    }
    function settingTarget(key){
      const widget=SETTING_FIELDS[key];
      if(!widget)return null;
      const value=byPath(data&&data.settings,key);
      if(value===undefined)return null;
      return{descriptor:descriptor({kind:'setting',key:`settings.${key}`,field:key,widget,value}),value};
    }
    function linkTarget(key){
      const normalized=String(key||'').replace(/^links\./,'');
      const value=byPath(data&&data.settings&&data.settings.links,normalized);
      if(typeof value!=='string')return null;
      return{descriptor:descriptor({kind:'link',key:`settings.links.${normalized}`,field:normalized,widget:'link',value}),value};
    }
    function assetTarget(key){
      const value=byPath(data&&data.assets,key);
      if(!isObject(value)||!Object.hasOwn(value,'src'))return null;
      return{descriptor:descriptor({kind:'asset',key:`assets.${key}`,field:key,widget:'asset',value}),value};
    }
    function iconTarget(key){
      const value=byPath(data&&data.assets&&data.assets.icons,key);
      if(typeof value!=='string')return null;
      return{descriptor:descriptor({kind:'icon',key:`assets.icons.${key}`,field:key,widget:'text',value}),value};
    }
    function taxonomyTarget(kind,id,field){
      if(field!=='label')return null;
      const row=(kind==='category'?categories:languages).get(String(id));
      if(!row)return null;
      return{descriptor:descriptor({kind,id:String(id),field:'label',key:`${kind}:${id}:label`,widget:'localizedText',value:row.label}),value:row.label};
    }
    function platformTarget(id,field){
      const widget=PLATFORM_FIELDS[field];
      if(!widget)return null;
      const row=platforms.get(String(id));
      if(!row)return null;
      const value=byPath(row,field);
      return{descriptor:descriptor({kind:'platform',id:String(id),field,key:`platform:${id}:${field}`,widget,value}),value};
    }
    function seoTarget(page,lang,field){
      if(!['home','explore','platform'].includes(String(page))||!['ar','en','tr'].includes(String(lang))||!SEO_FIELDS.has(String(field)))return null;
      const value=byPath(data&&data.seo,`${page}.${lang}.${field}`);
      if(typeof value!=='string')return null;
      return{descriptor:descriptor({kind:'seo',id:String(page),field:`${lang}.${field}`,key:`seo:${page}:${lang}:${field}`,widget:field==='ogImage'?'link':'text',value}),value};
    }
    function resolveTarget(target){
      if(!target||typeof target!=='object')return null;
      switch(target.kind){
        case'siteText':return textTarget(target.key);
        case'setting':return settingTarget(target.key);
        case'link':return linkTarget(target.key);
        case'asset':return assetTarget(target.key);
        case'icon':return iconTarget(target.key);
        case'category':return taxonomyTarget('category',target.id,target.field);
        case'language':return taxonomyTarget('language',target.id,target.field);
        case'platform':return platformTarget(target.id,target.field);
        case'seo':return seoTarget(target.id||target.page,target.lang,target.field);
        default:return null;
      }
    }
    function resolveNode(node){
      const ds=node&&node.dataset||{};
      let result=null;
      if(ds.editKind) result=resolveTarget({kind:ds.editKind,id:ds.editId,field:ds.editField,key:ds.editKey,lang:ds.editLang});
      else if(ds.i18n) result=resolveTarget({kind:'siteText',key:ds.i18n});
      else if(ds.setting) result=resolveTarget({kind:'setting',key:ds.setting});
      else if(ds.asset) result=resolveTarget({kind:'asset',key:ds.asset});
      else if(ds.link) result=resolveTarget({kind:'link',key:ds.link});
      else if(ds.icon) result=resolveTarget({kind:'icon',key:ds.icon});
      return result?result.descriptor:null;
    }
    return{resolveTarget,resolveNode,platformFields:{...PLATFORM_FIELDS}};
  }
  return{create,PLATFORM_FIELDS:{...PLATFORM_FIELDS}};
});
