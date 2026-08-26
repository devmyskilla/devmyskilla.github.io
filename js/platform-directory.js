(function(root, factory){
  const core = typeof module === 'object' && module.exports ? require('./platform-core.js') : root.PlatformCore;
  const api = factory(core);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PlatformDirectory = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(PlatformCore){
  if (!PlatformCore) throw new Error('PlatformCore is required');
  function uniqueSorted(values){ return [...new Set(values.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b))); }
  function getFilterOptions(platforms){
    const list = Array.isArray(platforms) ? platforms : [];
    return {
      categories: uniqueSorted(list.map(p=>p.category)),
      languages: uniqueSorted(list.flatMap(p=>Array.isArray(p.languages)?p.languages:[])),
      pricingModels: uniqueSorted(list.map(p=>p.pricingModel).filter(x=>x && x!=='unknown'))
    };
  }
  function getStats(platforms){
    const list = Array.isArray(platforms) ? platforms : [];
    return {platforms:list.length,free:list.filter(p=>p.hasFreeContent===true).length,certificates:list.filter(p=>p.certificateAvailable===true).length,languages:new Set(list.flatMap(p=>Array.isArray(p.languages)?p.languages:[])).size};
  }
  function getCategoryGroups(platforms){
    const counts = new Map();
    (Array.isArray(platforms)?platforms:[]).forEach(p=>{if(p.category)counts.set(p.category,(counts.get(p.category)||0)+1)});
    return [...counts.entries()].map(([category,count])=>({category,count})).sort((a,b)=>b.count-a.count || a.category.localeCompare(b.category));
  }
  function getFeatured(platforms,fallbackFeaturedIds=[]){
    const list=Array.isArray(platforms)?platforms:[];
    const flagged=PlatformCore.sortPlatforms(list.filter(p=>p.featured===true),'recommended');
    if(flagged.length)return flagged;
    const byId=new Map(list.map(p=>[p.id,p]));
    return fallbackFeaturedIds.map(id=>byId.get(id)).filter(Boolean);
  }
  function getVisiblePlatforms(platforms,state={}){return PlatformCore.sortPlatforms(PlatformCore.filterPlatforms(platforms,state),state.sort||'recommended')}
  function cardFacts(platform,lang='en',now=new Date()){return{countLabel:PlatformCore.contentCountLabel(platform,lang),verification:PlatformCore.verificationState(platform&&platform.lastVerified,now),languages:Array.isArray(platform&&platform.languages)?platform.languages:[],pricingModel:platform&&platform.pricingModel?platform.pricingModel:'unknown',hasFreeContent:platform&&platform.hasFreeContent===true,certificateAvailable:platform&&platform.certificateAvailable===true}}
  function firstLocalized(owner,prefix,lang){const key=`${prefix}_${lang}`,fallback=`${prefix}_en`;const values=Array.isArray(owner&&owner[key])&&owner[key].length?owner[key]:(Array.isArray(owner&&owner[fallback])?owner[fallback]:[]);return values[0]||''}
  function comparisonRows(platforms,lang='en',now=new Date()){
    return (Array.isArray(platforms)?platforms:[]).map(p=>({id:p.id,name:p.name,logoUrl:p.logoUrl||'',category:p.category||'',pricingModel:p.pricingModel||'unknown',hasFreeContent:p.hasFreeContent===true,certificateAvailable:p.certificateAvailable===true,languages:Array.isArray(p.languages)?p.languages:[],countLabel:PlatformCore.contentCountLabel(p,lang),verification:PlatformCore.verificationState(p.lastVerified,now),lastVerified:p.lastVerified||null,bestFor:firstLocalized(p,'best_for',lang),officialUrl:p.officialUrl||''}));
  }
  return {getFilterOptions,getStats,getCategoryGroups,getFeatured,getVisiblePlatforms,cardFacts,comparisonRows};
});
