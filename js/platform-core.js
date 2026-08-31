(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.PlatformCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function nullish(value){return value===null||value===undefined}
  function text(value,fallback=''){return nullish(value)?fallback:String(value)}
  function array(value){
    if(Array.isArray(value))return value.filter(v=>!nullish(v)&&String(v).trim()!=='').map(String);
    if(nullish(value)||String(value).trim()==='')return[];
    return[String(value)];
  }
  function numberOrNull(value){if(nullish(value)||value==='')return null;const n=Number(value);return Number.isFinite(n)?n:null}
  function intOrNull(value){const n=numberOrNull(value);return n===null?null:Math.trunc(n)}
  function meaningful(value){
    if(nullish(value))return false;
    if(typeof value==='string')return value.trim()!=='';
    if(Array.isArray(value))return value.length>0;
    return true;
  }
  function normalizePricing(value,freeFlag){
    if(value===0||value==='0')return'free';
    if(meaningful(value))return text(value).trim();
    if(freeFlag===true)return'free';
    return'unknown';
  }
  function localized(value){
    if(value&&typeof value==='object'&&!Array.isArray(value)){
      return{ar:text(value.ar),en:text(value.en),tr:text(value.tr)};
    }
    const v=text(value);
    return{ar:v,en:v,tr:v};
  }
  function localizedLists(value,legacy={}){
    const src=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    return{
      ar:array(src.ar!==undefined?src.ar:legacy.ar),
      en:array(src.en!==undefined?src.en:legacy.en),
      tr:array(src.tr!==undefined?src.tr:legacy.tr)
    };
  }
  function preferredLocalized(value){
    if(!value||typeof value!=='object')return text(value);
    return text(value.en||value.ar||value.tr);
  }

  function normalizeText(value=''){
    return String(value).toLowerCase().normalize('NFKD')
      .replace(/[\u064B-\u065F\u0670]/g,'')
      .replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه')
      .replace(/[^\p{L}\p{N}+#.]+/gu,' ').trim();
  }

  function baseShape(){
    return{
      id:'',name:{ar:'',en:'',tr:''},description:{ar:'',en:'',tr:''},
      categoryId:'',languageIds:[],pricingModel:'unknown',hasFreeContent:false,
      certificateAvailable:false,freeCertificate:false,platformType:'',officialUrl:'',catalogUrl:'',
      logo:{src:'',alt:{ar:'',en:'',tr:''}},officialCount:null,officialCountType:'',lastVerified:null,
      editorial:{
        bestFor:{ar:[],en:[],tr:[]},strengths:{ar:[],en:[],tr:[]},limitations:{ar:[],en:[],tr:[]}
      },featured:false,displayOrder:null
    };
  }

  function normalizeStaticPlatform(row={}){
    const out=baseShape();
    const freeFlag=row.hasFreeContent!==undefined?row.hasFreeContent===true:row.free===true;
    const logo=row.logo&&typeof row.logo==='object'&&!Array.isArray(row.logo)?row.logo:{};
    const editorial=row.editorial&&typeof row.editorial==='object'&&!Array.isArray(row.editorial)?row.editorial:{};
    Object.assign(out,{
      id:text(row.id),
      name:localized(row.name||row.platform),
      description:localized(row.description||{ar:row.description_ar||'',en:row.description_en||'',tr:row.description_tr||''}),
      categoryId:text(row.categoryId||row.category),
      languageIds:array(row.languageIds&&row.languageIds.length?row.languageIds:(row.languages&&row.languages.length?row.languages:row.language)),
      pricingModel:normalizePricing(row.pricingModel??row.pricing_model,freeFlag),
      hasFreeContent:freeFlag,
      certificateAvailable:row.certificateAvailable!==undefined?row.certificateAvailable===true:row.certificate===true,
      freeCertificate:row.freeCertificate!==undefined?row.freeCertificate===true:row.free_certificate===true,
      platformType:text(row.platformType||row.platform_type),
      officialUrl:text(row.officialUrl||row.official_url||row.link),
      catalogUrl:text(row.catalogUrl||row.catalog_url||row.link),
      logo:{
        src:text(logo.src||row.logoUrl||row.logo_url||row.thumbnail),
        alt:localized(logo.alt||row.name||row.platform)
      },
      officialCount:numberOrNull(row.officialCount??row.expected_count),
      officialCountType:text(row.officialCountType||row.expected_count_type),
      lastVerified:row.lastVerified||row.last_verified||null,
      editorial:{
        bestFor:localizedLists(editorial.bestFor,{ar:row.best_for_ar,en:row.best_for_en,tr:row.best_for_tr}),
        strengths:localizedLists(editorial.strengths,{ar:row.strengths_ar,en:row.strengths_en,tr:row.strengths_tr}),
        limitations:localizedLists(editorial.limitations,{ar:row.limitations_ar,en:row.limitations_en,tr:row.limitations_tr})
      },
      featured:row.featured===true,
      displayOrder:intOrNull(row.displayOrder??row.display_order)
    });
    return out;
  }

  function verificationState(value,now=new Date()){
    if(!value)return'unverified';
    const verified=new Date(value),current=now instanceof Date?now:new Date(now);
    if(Number.isNaN(verified.getTime())||Number.isNaN(current.getTime()))return'unverified';
    const ageDays=(current.getTime()-verified.getTime())/86400000;
    return ageDays>=0&&ageDays<=30?'recent':'outdated';
  }
  function officialContent(platform={}){
    const count=numberOrNull(platform.officialCount);
    return count===null?null:{count,type:text(platform.officialCountType||'items')};
  }
  function pricingDisplayKey(platform={}){return platform.pricingModel==='free'?'pricing_free_display':`pricing_${platform.pricingModel||'unknown'}`}
  function certificateDisplayKey(platform={}){
    if(platform.freeCertificate===true)return'certificate_free';
    if(platform.certificateAvailable===true)return'certificate_available';
    return'';
  }
  function shouldShowOfficialCount(platform={}){return numberOrNull(platform.officialCount)!==null}
  function shouldShowVerification(platform={}){
    if(!platform.lastVerified)return false;
    return verificationState(platform.lastVerified)!=='unverified';
  }

  function allLocalizedText(value){
    if(!value||typeof value!=='object')return text(value);
    return['ar','en','tr'].map(lang=>text(value[lang])).join(' ');
  }
  function allEditorial(editorial={}){
    const groups=[];
    for(const key of ['bestFor','strengths','limitations']){
      const value=editorial[key]||{};
      for(const lang of ['ar','en','tr'])groups.push(...array(value[lang]));
    }
    return groups.join(' ');
  }
  function searchHaystack(p={}){
    return normalizeText([
      allLocalizedText(p.name),allLocalizedText(p.description),p.categoryId,p.platformType,p.pricingModel,
      ...(Array.isArray(p.languageIds)?p.languageIds:[]),allEditorial(p.editorial)
    ].filter(Boolean).join(' '));
  }
  function searchScore(platform,query){
    const q=normalizeText(query);if(!q)return 0;
    const hay=searchHaystack(platform),terms=q.split(/\s+/).filter(Boolean);
    if(!terms.every(term=>hay.includes(term)))return-1;
    const names=['ar','en','tr'].map(lang=>normalizeText(platform&&platform.name&&platform.name[lang])).filter(Boolean);
    let score=0;
    if(names.some(name=>name===q))score+=120;
    else if(names.some(name=>name.startsWith(q)))score+=80;
    else if(names.some(name=>name.includes(q)))score+=60;
    terms.forEach(term=>{if(names.some(name=>name.includes(term)))score+=18;if(hay.includes(term))score+=6});
    return score;
  }
  function filterPlatforms(platforms,state={}){
    const now=state.now||new Date();
    return(Array.isArray(platforms)?platforms:[]).filter(p=>{
      if(state.query&&searchScore(p,state.query)<0)return false;
      if(state.category&&p.categoryId!==state.category)return false;
      if(state.language&&!(Array.isArray(p.languageIds)&&p.languageIds.includes(state.language)))return false;
      if(state.pricingModel&&p.pricingModel!==state.pricingModel)return false;
      if(state.freeOnly&&p.hasFreeContent!==true)return false;
      if(state.certificateOnly&&p.certificateAvailable!==true)return false;
      if(state.verification&&verificationState(p.lastVerified,now)!==state.verification)return false;
      return true;
    });
  }
  function byName(a,b){return preferredLocalized(a&&a.name).localeCompare(preferredLocalized(b&&b.name))}
  function sortPlatforms(platforms,mode='recommended'){
    const list=[...(Array.isArray(platforms)?platforms:[])];
    if(mode==='name')return list.sort(byName);
    if(mode==='official_count')return list.sort((a,b)=>{
      const ac=numberOrNull(a&&a.officialCount),bc=numberOrNull(b&&b.officialCount);
      if(ac===null&&bc===null)return byName(a,b);if(ac===null)return 1;if(bc===null)return-1;return bc-ac||byName(a,b);
    });
    if(mode==='recently_verified')return list.sort((a,b)=>{
      const at=a&&a.lastVerified?new Date(a.lastVerified).getTime():NaN,bt=b&&b.lastVerified?new Date(b.lastVerified).getTime():NaN;
      const av=Number.isFinite(at)?at:-Infinity,bv=Number.isFinite(bt)?bt:-Infinity;return bv-av||byName(a,b);
    });
    if(mode==='free')return list.sort((a,b)=>Number(b.hasFreeContent===true)-Number(a.hasFreeContent===true)||byName(a,b));
    if(mode==='recommended')return list.sort((a,b)=>{
      const featured=Number(b.featured===true)-Number(a.featured===true);if(featured)return featured;
      const ao=intOrNull(a.displayOrder),bo=intOrNull(b.displayOrder);
      if(ao!==null||bo!==null){if(ao===null)return 1;if(bo===null)return-1;if(ao!==bo)return ao-bo}
      return byName(a,b);
    });
    return list;
  }
  function toggleComparison(ids,id,max=3){
    const next=[...(Array.isArray(ids)?ids:[])],index=next.indexOf(id);
    if(index>=0){next.splice(index,1);return{ids:next,blocked:false}}
    if(next.length>=max)return{ids:next,blocked:true};
    next.push(id);return{ids:next,blocked:false};
  }

  return{normalizeText,normalizeStaticPlatform,verificationState,officialContent,pricingDisplayKey,certificateDisplayKey,shouldShowOfficialCount,shouldShowVerification,searchScore,filterPlatforms,sortPlatforms,toggleComparison};
});
