(function(root,factory){
  const core=typeof module==='object'&&module.exports?require('./platform-core.js'):root.PlatformCore;
  const api=factory(core);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.PlatformDirectory=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(PlatformCore){
  if(!PlatformCore)throw new Error('PlatformCore is required');

  function uniqueSorted(values){return[...new Set(values.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)))}
  function getFilterOptions(platforms){
    const list=Array.isArray(platforms)?platforms:[];
    return{
      categories:uniqueSorted(list.map(p=>p.categoryId)),
      languages:uniqueSorted(list.flatMap(p=>Array.isArray(p.languageIds)?p.languageIds:[])),
      pricingModels:uniqueSorted(list.map(p=>p.pricingModel).filter(x=>x&&x!=='unknown'))
    };
  }
  function getStats(platforms){
    const list=Array.isArray(platforms)?platforms:[];
    return{
      platforms:list.length,
      free:list.filter(p=>p.hasFreeContent===true).length,
      certificates:list.filter(p=>p.certificateAvailable===true).length,
      languages:new Set(list.flatMap(p=>Array.isArray(p.languageIds)?p.languageIds:[])).size
    };
  }
  function getCategoryGroups(platforms){
    const counts=new Map();
    (Array.isArray(platforms)?platforms:[]).forEach(p=>{if(p.categoryId)counts.set(p.categoryId,(counts.get(p.categoryId)||0)+1)});
    return[...counts.entries()].map(([categoryId,count])=>({categoryId,count})).sort((a,b)=>b.count-a.count||a.categoryId.localeCompare(b.categoryId));
  }
  function getFeatured(platforms,fallbackFeaturedIds=[]){
    const list=Array.isArray(platforms)?platforms:[];
    const flagged=PlatformCore.sortPlatforms(list.filter(p=>p.featured===true),'recommended');
    if(flagged.length)return flagged;
    const byId=new Map(list.map(p=>[p.id,p]));
    return fallbackFeaturedIds.map(id=>byId.get(id)).filter(Boolean);
  }
  function getVisiblePlatforms(platforms,state={}){return PlatformCore.sortPlatforms(PlatformCore.filterPlatforms(platforms,state),state.sort||'recommended')}
  function cardFacts(platform,now=new Date()){
    return{
      officialContent:PlatformCore.officialContent(platform),
      verification:PlatformCore.verificationState(platform&&platform.lastVerified,now),
      showOfficialCount:PlatformCore.shouldShowOfficialCount(platform),
      showVerification:PlatformCore.shouldShowVerification(platform),
      languageIds:Array.isArray(platform&&platform.languageIds)?platform.languageIds:[],
      pricingModel:platform&&platform.pricingModel?platform.pricingModel:'unknown',
      hasFreeContent:platform&&platform.hasFreeContent===true,
      certificateAvailable:platform&&platform.certificateAvailable===true,
      freeCertificate:platform&&platform.freeCertificate===true
    };
  }
  function comparisonRows(platforms,now=new Date()){
    return(Array.isArray(platforms)?platforms:[]).map(p=>({
      id:p.id,name:p.name,logo:p.logo||{src:'',alt:{ar:'',en:'',tr:''}},categoryId:p.categoryId||'',pricingModel:p.pricingModel||'unknown',
      hasFreeContent:p.hasFreeContent===true,certificateAvailable:p.certificateAvailable===true,freeCertificate:p.freeCertificate===true,
      languageIds:Array.isArray(p.languageIds)?p.languageIds:[],officialContent:PlatformCore.officialContent(p),
      showOfficialCount:PlatformCore.shouldShowOfficialCount(p),verification:PlatformCore.verificationState(p.lastVerified,now),
      showVerification:PlatformCore.shouldShowVerification(p),lastVerified:p.lastVerified||null,
      editorial:p.editorial||{bestFor:{ar:[],en:[],tr:[]},strengths:{ar:[],en:[],tr:[]},limitations:{ar:[],en:[],tr:[]}},
      officialUrl:p.officialUrl||''
    }));
  }
  function migrateComparisonIds(currentIds,legacyIds,validIds,max=3){
    const source=Array.isArray(currentIds)?currentIds:(Array.isArray(legacyIds)?legacyIds:[]);
    const valid=new Set(Array.isArray(validIds)?validIds:[]),result=[];
    for(const id of source){if(!valid.has(id)||result.includes(id))continue;result.push(id);if(result.length>=max)break}
    return result;
  }
  return{getFilterOptions,getStats,getCategoryGroups,getFeatured,getVisiblePlatforms,cardFacts,comparisonRows,migrateComparisonIds};
});
