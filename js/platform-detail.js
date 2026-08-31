(function(root,factory){
  const core=typeof module==='object'&&module.exports?require('./platform-core.js'):root.PlatformCore;
  const api=factory(core);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.PlatformDetail=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(PlatformCore){
  if(!PlatformCore)throw new Error('PlatformCore is required');
  function findPlatform(platforms,id){if(!id)return null;return(Array.isArray(platforms)?platforms:[]).find(p=>p&&p.id===id)||null}
  function localize(value,lang='en'){
    if(typeof value==='string')return value;
    if(!value||typeof value!=='object'||Array.isArray(value))return'';
    return value[lang]||value.en||value.ar||value.tr||'';
  }
  function listFallback(value,lang='en'){
    if(!value||typeof value!=='object'||Array.isArray(value))return[];
    for(const candidate of [lang,'en','ar','tr']){const list=value[candidate];if(Array.isArray(list)&&list.length)return[...list]}
    return[];
  }
  function buildDetailModel(platform,lang='en',now=new Date(),contentApi=null){
    if(!platform)return null;
    const name=contentApi?contentApi.platformName(platform,lang):localize(platform.name,lang);
    const description=contentApi?contentApi.platformDescription(platform,lang):localize(platform.description,lang);
    const logoSrc=platform.logo&&platform.logo.src?String(platform.logo.src):'';
    const logoAlt=contentApi?contentApi.localize(platform.logo&&platform.logo.alt,lang):localize(platform.logo&&platform.logo.alt,lang);
    const bestFor=contentApi?contentApi.platformList(platform,'bestFor',lang):listFallback(platform.editorial&&platform.editorial.bestFor,lang);
    const strengths=contentApi?contentApi.platformList(platform,'strengths',lang):listFallback(platform.editorial&&platform.editorial.strengths,lang);
    const limitations=contentApi?contentApi.platformList(platform,'limitations',lang):listFallback(platform.editorial&&platform.editorial.limitations,lang);
    return{
      id:platform.id,name,description,logo:{src:logoSrc,alt:logoAlt},categoryId:platform.categoryId||'',pricingModel:platform.pricingModel||'unknown',languageIds:Array.isArray(platform.languageIds)?[...platform.languageIds]:[],
      hasFreeContent:platform.hasFreeContent===true,certificateAvailable:platform.certificateAvailable===true,freeCertificate:platform.freeCertificate===true,platformType:platform.platformType||'',
      countLabel:contentApi?contentApi.contentCountLabel(platform,lang):'',showOfficialCount:PlatformCore.shouldShowOfficialCount(platform),verification:PlatformCore.verificationState(platform.lastVerified,now),showVerification:PlatformCore.shouldShowVerification(platform),lastVerified:platform.lastVerified||null,
      officialUrl:platform.officialUrl||'',catalogUrl:platform.catalogUrl||'',bestFor,strengths,limitations
    };
  }
  function similarPlatforms(platforms,current,limit=3){if(!current)return[];return(Array.isArray(platforms)?platforms:[]).filter(p=>p&&p.id!==current.id&&p.categoryId&&p.categoryId===current.categoryId).slice(0,Math.max(0,limit))}
  function esc(value=''){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function readJSON(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch(_){return fallback}}
  function writeJSON(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(_){}}
  function recordView(platform){const views=readJSON('dunya-views-v2',{});views[platform.id]=(views[platform.id]||0)+1;writeJSON('dunya-views-v2',views);let recent=readJSON('dunya-recent-v2',[]).map((x,i)=>typeof x==='string'?{id:x,ts:Date.now()-i}:x).filter(x=>x&&x.id&&x.id!==platform.id);recent.unshift({id:platform.id,ts:Date.now()});writeJSON('dunya-recent-v2',recent.slice(0,16))}
  function isFavorite(id){return new Set(readJSON('dunya-favorites-v2',[])).has(id)}
  function toggleFavorite(id){const set=new Set(readJSON('dunya-favorites-v2',[]));set.has(id)?set.delete(id):set.add(id);writeJSON('dunya-favorites-v2',[...set]);return set.has(id)}
  function listSection(title,items,cssClass){if(!items.length)return'';return`<section class="profile-panel ${cssClass}"><h2>${esc(title)}</h2><ul>${items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></section>`}
  function logoMarkup(model){let src=content.safeUrl(model.logo.src,{allowRelative:true}),alt=model.logo.alt;if(!src){const fallback=content.asset('platformFallbackLogo');src=fallback.src;alt=alt||fallback.alt}return src?`<img class="profile-logo" src="${esc(src)}" alt="${esc(alt||model.name)}">`:''}
  function fact(label,value){return label&&value?`<div class="profile-fact"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`:''}
  function renderSimilar(container,platforms){if(!platforms.length){container.hidden=true;return}container.hidden=false;container.querySelector('.similar-grid').innerHTML=platforms.map(p=>{const m=buildDetailModel(p,currentLang,new Date(),content);let src=content.safeUrl(m.logo.src,{allowRelative:true}),alt=m.logo.alt;if(!src){const fallback=content.asset('platformFallbackLogo');src=fallback.src;alt=alt||fallback.alt}return`<a class="similar-card" href="platform.html?id=${encodeURIComponent(p.id)}&lang=${encodeURIComponent(currentLang)}">${src?`<img src="${esc(src)}" alt="${esc(alt||m.name)}">`:''}<div><strong>${esc(m.name)}</strong><small>${esc(content.categoryLabel(m.categoryId))}</small></div></a>`}).join('')}
  function renderProfile(platform,platforms){
    const rootEl=document.getElementById('platformProfile'),model=buildDetailModel(platform,currentLang,new Date(),content),fav=isFavorite(platform.id);
    const official=content.safeUrl(model.officialUrl,{allowRelative:false}),catalog=content.safeUrl(model.catalogUrl,{allowRelative:false});
    const verificationBadge=model.showVerification?`<span class="verification-badge ${esc(model.verification)}">${esc(translateVerification(model.verification))}</span>`:'';
    const certificateKey=PlatformCore.certificateDisplayKey(model),languages=model.languageIds.map(id=>content.languageLabel(id)).filter(Boolean).join(' · ');
    const facts=[fact(getText('category'),content.categoryLabel(model.categoryId)),fact(getText('price'),getText(PlatformCore.pricingDisplayKey(model))),fact(getText('language'),languages),fact(getText('freeContent'),model.hasFreeContent?getText('yes'):getText('no')),certificateKey?fact(getText('certificate'),getText(certificateKey)):'',model.showOfficialCount?fact(getText('officialContent'),model.countLabel):'',model.showVerification?fact(getText('verification'),translateVerification(model.verification)):'',model.showVerification&&model.lastVerified?fact(getText('lastVerified'),model.lastVerified):''].filter(Boolean).join('');
    const backIcon=content.icon('back'),favIcon=content.icon(fav?'favoriteOn':'favoriteOff'),shareIcon=content.icon('share'),externalIcon=content.icon('external');
    const explore=content.link('explore')||'explore.html',backHref=`${explore}?lang=${encodeURIComponent(currentLang)}#explore`;
    rootEl.innerHTML=`<a class="back-link" href="${esc(backHref)}">${esc(backIcon)} ${esc(getText('backToHome'))}</a><article class="profile-hero"><div class="profile-logo-shell">${logoMarkup(model)}</div><div class="profile-hero-copy"><div class="badge-row"><span class="tag">${esc(content.categoryLabel(model.categoryId))}</span>${verificationBadge}</div><h1>${esc(model.name)}</h1><p>${esc(model.description)}</p><div class="profile-actions"><button id="profileFavorite" class="btn btn-soft" type="button" aria-pressed="${fav}">${esc(favIcon)} ${esc(fav?getText('removeSaved'):getText('savePlatform'))}</button><button id="profileShare" class="btn btn-soft" type="button">${esc(shareIcon)} ${esc(getText('sharePlatform'))}</button>${official?`<a class="btn btn-primary" href="${esc(official)}" target="_blank" rel="noopener noreferrer">${esc(getText('officialSite'))} ${esc(externalIcon)}</a>`:''}${catalog&&catalog!==official?`<a class="btn btn-soft" href="${esc(catalog)}" target="_blank" rel="noopener noreferrer">${esc(getText('officialCatalog'))} ${esc(externalIcon)}</a>`:''}</div></div></article><section class="profile-facts"><h2>${esc(getText('facts'))}</h2><div class="profile-facts-grid">${facts}</div></section><div class="profile-editorial">${listSection(getText('bestFor'),model.bestFor,'best-for')}${listSection(getText('strengths'),model.strengths,'strengths')}${listSection(getText('limitations'),model.limitations,'limitations')}</div>`;
    const favorite=document.getElementById('profileFavorite');favorite.onclick=()=>{const selected=toggleFavorite(platform.id);favorite.setAttribute('aria-pressed',String(selected));favorite.textContent=`${content.icon(selected?'favoriteOn':'favoriteOff')} ${selected?getText('removeSaved'):getText('savePlatform')}`};
    document.getElementById('profileShare').onclick=async()=>{try{if(navigator.share)await navigator.share({title:model.name,text:model.description,url:location.href});else{await navigator.clipboard.writeText(location.href);const toast=document.getElementById('toast');toast.textContent=getText('copied');toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1800)}}catch(_){}};
    renderSimilar(document.getElementById('similarPlatforms'),similarPlatforms(platforms,platform,3));SiteRuntime.applyPlatformSeo(document,content,model);
  }
  function setTheme(theme){document.documentElement.dataset.theme=theme;try{localStorage.setItem('dunya-theme-v2',theme)}catch(_){}const button=document.getElementById('themeToggle');if(button)button.textContent=content.icon(theme==='dark'?'themeLight':'themeDark')}
  async function initBrowser(){
    const params=new URLSearchParams(location.search),data=await DataLoader.loadSiteData();initContent(data);setLang(params.get('lang')||content.rawSetting('defaultLanguage')||'ar');SiteRuntime.applyDocument(document,content,'platform');
    let saved=null;try{saved=localStorage.getItem('dunya-theme-v2')}catch(_){}setTheme(saved||(window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'));
    const platforms=data.platforms.map(PlatformCore.normalizeStaticPlatform),platform=findPlatform(platforms,params.get('id')),loading=document.getElementById('profileLoading');
    document.getElementById('themeToggle').onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
    document.getElementById('langSwitcher').onchange=e=>{const url=new URL(location.href);url.searchParams.set('lang',e.target.value);location.href=url.href};
    if(!platform){loading.textContent=getText('platformNotFound');loading.classList.add('error');return}
    loading.remove();recordView(platform);renderProfile(platform,platforms);
    if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  }
  if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',()=>initBrowser().catch(err=>{console.error(err);const el=document.getElementById('profileLoading');if(el)el.textContent=getText('errorLoading')||'Unable to load content'}));
  return{findPlatform,buildDetailModel,similarPlatforms};
});
