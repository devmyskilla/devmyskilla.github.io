(function(root,factory){
  const core=typeof module==='object'&&module.exports?require('./platform-core.js'):root.PlatformCore;
  const api=factory(core);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.PlatformDetail=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(PlatformCore){
  if(!PlatformCore)throw new Error('PlatformCore is required');
  function findPlatform(platforms,id){if(!id)return null;return(Array.isArray(platforms)?platforms:[]).find(p=>p&&p.id===id)||null}
  function localizedList(platform,prefix,lang='en'){
    if(!platform)return[];
    const direct=platform[`${prefix}_${lang}`],english=platform[`${prefix}_en`];
    if(Array.isArray(direct)&&direct.length)return[...direct];
    if(Array.isArray(english)&&english.length)return[...english];
    return[];
  }
  function localizedDescription(platform,lang='en'){
    if(!platform)return'';
    return platform[`description_${lang}`]||platform.description_en||platform.description_ar||platform.description||'';
  }
  function buildDetailModel(platform,lang='en',now=new Date()){
    if(!platform)return null;
    return{
      id:platform.id,name:platform.name||'',description:localizedDescription(platform,lang),logoUrl:platform.logoUrl||'',
      category:platform.category||'',pricingModel:platform.pricingModel||'unknown',languages:Array.isArray(platform.languages)?[...platform.languages]:[],
      hasFreeContent:platform.hasFreeContent===true,certificateAvailable:platform.certificateAvailable===true,platformType:platform.platformType||'',
      countLabel:PlatformCore.contentCountLabel(platform,lang),verification:PlatformCore.verificationState(platform.lastVerified,now),lastVerified:platform.lastVerified||null,
      officialUrl:platform.officialUrl||'',catalogUrl:platform.catalogUrl||'',bestFor:localizedList(platform,'best_for',lang),strengths:localizedList(platform,'strengths',lang),limitations:localizedList(platform,'limitations',lang),dataSource:platform.dataSource||'unknown'
    };
  }
  function similarPlatforms(platforms,current,limit=3){
    if(!current)return[];
    return(Array.isArray(platforms)?platforms:[]).filter(p=>p&&p.id!==current.id&&p.category&&p.category===current.category).slice(0,Math.max(0,limit));
  }
  function validHttpUrl(value){try{const u=new URL(value);return u.protocol==='http:'||u.protocol==='https:'}catch(_){return false}}
  function esc(value=''){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function readJSON(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch(_){return fallback}}
  function writeJSON(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(_){}}
  function recordView(platform){
    const views=readJSON('dunya-views-v2',{});views[platform.id]=(views[platform.id]||0)+1;writeJSON('dunya-views-v2',views);
    let recent=readJSON('dunya-recent-v2',[]).map((x,i)=>typeof x==='string'?{id:x,ts:Date.now()-i}:x).filter(x=>x&&x.id&&x.id!==platform.id);
    recent.unshift({id:platform.id,ts:Date.now()});writeJSON('dunya-recent-v2',recent.slice(0,16));
  }
  function isFavorite(id){return new Set(readJSON('dunya-favorites-v2',[])).has(id)}
  function toggleFavorite(id){const set=new Set(readJSON('dunya-favorites-v2',[]));set.has(id)?set.delete(id):set.add(id);writeJSON('dunya-favorites-v2',[...set]);return set.has(id)}
  function listSection(title,items,cssClass){if(!items.length)return'';return`<section class="profile-panel ${cssClass}"><h2>${esc(title)}</h2><ul>${items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></section>`}
  function logo(model){return`<img class="profile-logo" src="${esc(model.logoUrl||'icon.svg')}" alt="${esc(model.name)}" onerror="this.onerror=null;this.src='icon.svg'">`}
  function fact(label,value){return`<div class="profile-fact"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`}
  function renderSimilar(container,platforms,lang){
    if(!platforms.length){container.hidden=true;return}container.hidden=false;
    container.querySelector('.similar-grid').innerHTML=platforms.map(p=>{const m=buildDetailModel(p,lang);return`<a class="similar-card" href="platform.html?id=${encodeURIComponent(p.id)}&lang=${encodeURIComponent(lang)}"><img src="${esc(m.logoUrl||'icon.svg')}" alt="${esc(m.name)}" onerror="this.onerror=null;this.src='icon.svg'"><div><strong>${esc(m.name)}</strong><small>${esc(typeof translateCat==='function'?translateCat(m.category):m.category)}</small></div></a>`}).join('');
  }
  function renderProfile(platform,platforms,source){
    const rootEl=document.getElementById('platformProfile'),model=buildDetailModel(platform,currentLang),fav=isFavorite(platform.id);
    const official=validHttpUrl(model.officialUrl),catalog=validHttpUrl(model.catalogUrl)&&model.catalogUrl!==model.officialUrl;
    rootEl.innerHTML=`<a class="back-link" href="index.html?lang=${encodeURIComponent(currentLang)}#explore">← ${esc(getText('backToHome'))}</a><article class="profile-hero"><div class="profile-logo-shell">${logo(model)}</div><div class="profile-hero-copy"><div class="badge-row"><span class="tag">${esc(translateCat(model.category))}</span><span class="verification-badge ${model.verification}">${esc(translateVerification(model.verification))}</span></div><h1>${esc(model.name)}</h1><p>${esc(model.description)}</p><div class="profile-actions"><button id="profileFavorite" class="btn btn-soft" type="button" aria-pressed="${fav}">${fav?'♥ '+getText('removeSaved'):'♡ '+getText('savePlatform')}</button><button id="profileShare" class="btn btn-soft" type="button">↗ ${esc(getText('sharePlatform'))}</button>${official?`<a class="btn btn-primary" href="${esc(model.officialUrl)}" target="_blank" rel="noopener noreferrer">${esc(getText('officialSite'))} ↗</a>`:''}${catalog?`<a class="btn btn-soft" href="${esc(model.catalogUrl)}" target="_blank" rel="noopener noreferrer">${esc(getText('officialCatalog'))} ↗</a>`:''}</div></div></article><div class="profile-source ${source}">${source==='supabase'?'✓ '+esc(getText('dataSupabase')):'⚠ '+esc(getText('dataFallback'))}</div><section class="profile-facts"><h2>${esc(getText('facts'))}</h2><div class="profile-facts-grid">${fact(getText('category'),translateCat(model.category))}${fact(getText('price'),translatePricing(model.pricingModel))}${fact(getText('language'),model.languages.map(translateLang).join(' · ')||getText('unknown'))}${fact(getText('freeContent'),model.hasFreeContent?getText('yes'):getText('no'))}${fact(getText('certificate'),model.certificateAvailable?getText('yes'):getText('no'))}${fact(getText('officialContent'),model.countLabel)}${fact(getText('verification'),translateVerification(model.verification))}${fact(getText('lastVerified'),model.lastVerified||getText('unknown'))}</div></section><div class="profile-editorial">${listSection(getText('bestFor'),model.bestFor,'best-for')}${listSection(getText('strengths'),model.strengths,'strengths')}${listSection(getText('limitations'),model.limitations,'limitations')}</div>`;
    const favorite=document.getElementById('profileFavorite');favorite.onclick=()=>{const selected=toggleFavorite(platform.id);favorite.setAttribute('aria-pressed',String(selected));favorite.textContent=selected?'♥ '+getText('removeSaved'):'♡ '+getText('savePlatform')};
    document.getElementById('profileShare').onclick=async()=>{try{if(navigator.share)await navigator.share({title:model.name,text:model.description,url:location.href});else{await navigator.clipboard.writeText(location.href);const toast=document.getElementById('toast');toast.textContent=getText('copied');toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1800)}}catch(_){}};
    renderSimilar(document.getElementById('similarPlatforms'),similarPlatforms(platforms,platform,3),currentLang);document.title=`${model.name} — ${getText('siteName')}`;
  }
  async function initBrowser(){
    const params=new URLSearchParams(location.search),lang=params.get('lang');setLang(lang||currentLang);applyTranslations();document.getElementById('langSwitcher').value=currentLang;
    let saved=null;try{saved=localStorage.getItem('dunya-theme-v2')}catch(_){};const theme=saved||(window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');document.documentElement.dataset.theme=theme;document.getElementById('themeToggle').textContent=theme==='dark'?'☀':'◐';
    document.getElementById('themeToggle').onclick=()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem('dunya-theme-v2',next)}catch(_){};document.getElementById('themeToggle').textContent=next==='dark'?'☀':'◐'};
    document.getElementById('langSwitcher').onchange=e=>{const url=new URL(location.href);url.searchParams.set('lang',e.target.value);location.href=url.href};
    const loaded=await PlatformData.loadPlatforms({...SUPABASE_CONFIG,staticPlatforms:Array.isArray(PLATFORMS_DATA)?PLATFORMS_DATA:[]});
    const platform=findPlatform(loaded.platforms,params.get('id'));
    const loading=document.getElementById('profileLoading');
    if(!platform){loading.textContent='⚠ '+getText('platformNotFound');loading.classList.add('error');document.title=getText('platformNotFound')+' — '+getText('siteName');return}
    loading.remove();recordView(platform);renderProfile(platform,loaded.platforms,loaded.source);
    if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  }
  if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',()=>initBrowser().catch(err=>{console.error(err);const el=document.getElementById('profileLoading');if(el)el.textContent='⚠ '+(typeof getText==='function'?getText('errorLoading'):'Unable to load platform')}));
  return{findPlatform,localizedList,buildDetailModel,similarPlatforms,validHttpUrl};
});
