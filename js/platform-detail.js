(function(root,factory){
  const core=typeof module==='object'&&module.exports?require('./platform-core.js'):root.PlatformCore;
  const api=factory(core);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.PlatformDetail=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(PlatformCore){
  if(!PlatformCore)throw new Error('PlatformCore is required');
  let inlineEditor=null;
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
    const fields=(Array.isArray(platform.fields)?platform.fields:[]).map(field=>({
      id:field&&field.id||'',
      name:contentApi?contentApi.platformFieldName(field,lang):localize(field&&field.name,lang),
      officialUrl:field&&field.officialUrl||''
    }));
    const officialPaths=PlatformCore.visibleOfficialPaths(platform,20).map(path=>({
      id:path&&path.id||'',officialName:path&&path.officialName||'',
      name:contentApi?contentApi.platformPathName(path,lang):localize(path&&path.name,lang),
      type:path&&path.type||'',typeLabel:contentApi?contentApi.pathTypeLabel(path&&path.type,lang):path&&path.type||'',
      officialUrl:path&&path.officialUrl||'',fieldIds:Array.isArray(path&&path.fieldIds)?[...path.fieldIds]:[],featured:path&&path.featured===true
    }));
    return{
      id:platform.id,name,description,logo:{src:logoSrc,alt:logoAlt},categoryId:platform.categoryId||'',pricingModel:platform.pricingModel||'unknown',languageIds:Array.isArray(platform.languageIds)?[...platform.languageIds]:[],
      hasFreeContent:platform.hasFreeContent===true,certificateAvailable:platform.certificateAvailable===true,freeCertificate:platform.freeCertificate===true,platformType:platform.platformType||'',
      countLabel:contentApi?contentApi.contentCountLabel(platform,lang):'',showOfficialCount:PlatformCore.shouldShowOfficialCount(platform),verification:PlatformCore.verificationState(platform.lastVerified,now),showVerification:PlatformCore.shouldShowVerification(platform),lastVerified:platform.lastVerified||null,
      officialUrl:platform.officialUrl||'',catalogUrl:platform.catalogUrl||'',fields,officialPaths,
      showAllPathsLink:PlatformCore.shouldShowAllPathsLink(platform,20),allPathsUrl:platform.pathResearch&&platform.pathResearch.allPathsUrl||'',
      bestFor,strengths,limitations
    };
  }
  function similarPlatforms(platforms,current,limit=3){if(!current)return[];return(Array.isArray(platforms)?platforms:[]).filter(p=>p&&p.id!==current.id&&p.categoryId&&p.categoryId===current.categoryId).slice(0,Math.max(0,limit))}
  function esc(value=''){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function fieldsMarkup(model,{title}={},safeUrlFn=value=>value){
    const fields=Array.isArray(model&&model.fields)?model.fields:[];
    if(!fields.length)return'';
    const chips=fields.map(field=>{
      const name=field&&field.name||'';
      const url=safeUrlFn(field&&field.officialUrl||'');
      return url?`<a class="profile-field-chip profile-field-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><span class="profile-field-name">${esc(name)}</span><span class="profile-field-action" aria-hidden="true">↗</span></a>`:`<span class="profile-field-chip profile-field-static"><span class="profile-field-name">${esc(name)}</span></span>`;
    }).join('');
    return`<section class="profile-learning profile-fields-section"><h2>${esc(title||'')}</h2><div class="profile-field-chips">${chips}</div></section>`;
  }
  function officialPathsMarkup(model,{title,viewPath,viewAll}={},safeUrlFn=value=>value){
    const paths=Array.isArray(model&&model.officialPaths)?model.officialPaths:[];
    if(!paths.length)return'';
    const cards=paths.map(path=>{
      const url=safeUrlFn(path&&path.officialUrl||'');
      if(!url)return'';
      const name=String(path&&path.name||'');
      const officialName=String(path&&path.officialName||'');
      const showOfficialName=officialName.trim()&&officialName.trim().toLocaleLowerCase()!==name.trim().toLocaleLowerCase();
      return`<a class="profile-path-card" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><span class="profile-path-type">${esc(path&&path.typeLabel||'')}</span><strong>${esc(name)}</strong>${showOfficialName?`<small class="profile-path-official-name">${esc(officialName)}</small>`:''}<span class="profile-path-action">${esc(viewPath||'')} ↗</span></a>`;
    }).filter(Boolean).join('');
    if(!cards)return'';
    const allUrl=model&&model.showAllPathsLink?safeUrlFn(model.allPathsUrl||''):'';
    const all=allUrl?`<a class="btn btn-soft profile-paths-all" href="${esc(allUrl)}" target="_blank" rel="noopener noreferrer">${esc(viewAll||'')} ↗</a>`:'';
    return`<section class="profile-learning profile-paths-section"><h2>${esc(title||'')}</h2><div class="profile-path-grid">${cards}</div>${all}</section>`;
  }
  function readJSON(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch(_){return fallback}}
  function writeJSON(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(_){}}
  function recordView(platform){const views=readJSON('dunya-views-v2',{});views[platform.id]=(views[platform.id]||0)+1;writeJSON('dunya-views-v2',views);let recent=readJSON('dunya-recent-v2',[]).map((x,i)=>typeof x==='string'?{id:x,ts:Date.now()-i}:x).filter(x=>x&&x.id&&x.id!==platform.id);recent.unshift({id:platform.id,ts:Date.now()});writeJSON('dunya-recent-v2',recent.slice(0,16))}
  function isFavorite(id){return new Set(readJSON('dunya-favorites-v2',[])).has(id)}
  function toggleFavorite(id){const set=new Set(readJSON('dunya-favorites-v2',[]));set.has(id)?set.delete(id):set.add(id);writeJSON('dunya-favorites-v2',[...set]);return set.has(id)}
  function listSection(title,items,cssClass,platformId,fieldAttr){if(!items.length)return'';return`<section class="profile-panel ${cssClass}"><h2>${esc(title)}</h2><ul data-edit-kind="platform" data-edit-id="${esc(platformId)}" ${fieldAttr}>${items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></section>`}
  function logoMarkup(model,platformId){let src=content.safeUrl(model.logo.src,{allowRelative:true}),alt=model.logo.alt;if(!src){const fallback=content.asset('platformFallbackLogo');src=fallback.src;alt=alt||fallback.alt}return src?`<img class="profile-logo" src="${esc(src)}" alt="${esc(alt||model.name)}" data-edit-kind="platform" data-edit-id="${esc(platformId)}" data-edit-field="logo">`:''}
  function fact(label,value){return label&&value?`<div class="profile-fact"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`:''}
  function renderSimilar(container,platforms){if(!platforms.length){container.hidden=true;return}container.hidden=false;container.querySelector('.similar-grid').innerHTML=platforms.map(p=>{const m=buildDetailModel(p,currentLang,new Date(),content);let src=content.safeUrl(m.logo.src,{allowRelative:true}),alt=m.logo.alt;if(!src){const fallback=content.asset('platformFallbackLogo');src=fallback.src;alt=alt||fallback.alt}return`<a class="similar-card" href="platform.html?id=${encodeURIComponent(p.id)}&lang=${encodeURIComponent(currentLang)}">${src?`<img src="${esc(src)}" alt="${esc(alt||m.name)}" data-edit-kind="platform" data-edit-id="${esc(p.id)}" data-edit-field="logo">`:''}<div><strong data-edit-kind="platform" data-edit-id="${esc(p.id)}" data-edit-field="name">${esc(m.name)}</strong><small data-edit-kind="category" data-edit-id="${esc(m.categoryId)}" data-edit-field="label">${esc(content.categoryLabel(m.categoryId))}</small></div></a>`}).join('')}
  function renderProfile(platform,platforms){
    const rootEl=document.getElementById('platformProfile'),model=buildDetailModel(platform,currentLang,new Date(),content),fav=isFavorite(platform.id);
    const official=content.safeUrl(model.officialUrl,{allowRelative:false}),catalog=content.safeUrl(model.catalogUrl,{allowRelative:false});
    const verificationBadge=model.showVerification?`<span class="verification-badge ${esc(model.verification)}">${esc(translateVerification(model.verification))}</span>`:'';
    const certificateKey=PlatformCore.certificateDisplayKey(model),languages=model.languageIds.map(id=>content.languageLabel(id)).filter(Boolean).join(' · ');
    const facts=[fact(getText('category'),content.categoryLabel(model.categoryId)),fact(getText('price'),getText(PlatformCore.pricingDisplayKey(model))),fact(getText('language'),languages),fact(getText('freeContent'),model.hasFreeContent?getText('yes'):getText('no')),certificateKey?fact(getText('certificate'),getText(certificateKey)):'',model.showOfficialCount?fact(getText('officialContent'),model.countLabel):'',model.showVerification?fact(getText('verification'),translateVerification(model.verification)):'',model.showVerification&&model.lastVerified?fact(getText('lastVerified'),model.lastVerified):''].filter(Boolean).join('');
    const fieldsHtml=fieldsMarkup(model,{title:getText('fields')},url=>content.safeUrl(url,{allowRelative:false}));
    const pathsHtml=officialPathsMarkup(model,{title:getText('officialPaths'),viewPath:getText('viewOfficialPath'),viewAll:getText('viewAllOfficialPaths')},url=>content.safeUrl(url,{allowRelative:false}));
    const learningSections=`${fieldsHtml}${pathsHtml}`;
    const backIcon=content.icon('back'),favIcon=content.icon(fav?'favoriteOn':'favoriteOff'),shareIcon=content.icon('share'),externalIcon=content.icon('external');
    const explore=content.link('explore')||'explore.html',backHref=`${explore}?lang=${encodeURIComponent(currentLang)}#explore`;
    rootEl.innerHTML=`<a class="back-link" href="${esc(backHref)}">${esc(backIcon)} ${esc(getText('backToHome'))}</a><article class="profile-hero"><div class="profile-logo-shell">${logoMarkup(model,platform.id)}</div><div class="profile-hero-copy"><div class="badge-row"><span class="tag" data-edit-kind="category" data-edit-id="${esc(model.categoryId)}" data-edit-field="label">${esc(content.categoryLabel(model.categoryId))}</span>${verificationBadge}</div><h1 data-edit-kind="platform" data-edit-id="${esc(platform.id)}" data-edit-field="name">${esc(model.name)}</h1><p data-edit-kind="platform" data-edit-id="${esc(platform.id)}" data-edit-field="description">${esc(model.description)}</p><div class="profile-actions"><button id="profileFavorite" class="btn btn-soft" type="button" aria-pressed="${fav}">${esc(favIcon)} ${esc(fav?getText('removeSaved'):getText('savePlatform'))}</button><button id="profileShare" class="btn btn-soft" type="button">${esc(shareIcon)} ${esc(getText('sharePlatform'))}</button>${official?`<a class="btn btn-primary" href="${esc(official)}" target="_blank" rel="noopener noreferrer" data-edit-kind="platform" data-edit-id="${esc(platform.id)}" data-edit-field="officialUrl">${esc(getText('officialSite'))} ${esc(externalIcon)}</a>`:''}${catalog&&catalog!==official?`<a class="btn btn-soft" href="${esc(catalog)}" target="_blank" rel="noopener noreferrer" data-edit-kind="platform" data-edit-id="${esc(platform.id)}" data-edit-field="catalogUrl">${esc(getText('officialCatalog'))} ${esc(externalIcon)}</a>`:''}</div></div></article><section class="profile-facts"><h2>${esc(getText('facts'))}</h2><div class="profile-facts-grid">${facts}</div></section>${learningSections}<div class="profile-editorial">${listSection(getText('bestFor'),model.bestFor,'best-for',platform.id,'data-edit-field="editorial.bestFor"')}${listSection(getText('strengths'),model.strengths,'strengths',platform.id,'data-edit-field="editorial.strengths"')}${listSection(getText('limitations'),model.limitations,'limitations',platform.id,'data-edit-field="editorial.limitations"')}</div>`;
    const favorite=document.getElementById('profileFavorite');favorite.onclick=()=>{const selected=toggleFavorite(platform.id);favorite.setAttribute('aria-pressed',String(selected));favorite.textContent=`${content.icon(selected?'favoriteOn':'favoriteOff')} ${selected?getText('removeSaved'):getText('savePlatform')}`};
    document.getElementById('profileShare').onclick=async()=>{try{if(navigator.share)await navigator.share({title:model.name,text:model.description,url:location.href});else{await navigator.clipboard.writeText(location.href);const toast=document.getElementById('toast');toast.textContent=getText('copied');toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1800)}}catch(_){}};
    renderSimilar(document.getElementById('similarPlatforms'),similarPlatforms(platforms,platform,3));SiteRuntime.applyPlatformSeo(document,content,model);
  }
  function setTheme(theme){document.documentElement.dataset.theme=theme;try{localStorage.setItem('dunya-theme-v2',theme)}catch(_){}const button=document.getElementById('themeToggle');if(button)button.textContent=content.icon(theme==='dark'?'themeLight':'themeDark')}
  function renderFromData(data,platformId){
    initContent(data);setLang(currentLang);SiteRuntime.applyDocument(document,content,'platform');
    const platforms=data.platforms.map(PlatformCore.normalizeStaticPlatform),platform=findPlatform(platforms,platformId);if(platform)renderProfile(platform,platforms);
    return{platforms,platform};
  }
  async function initBrowser(){
    const params=new URLSearchParams(location.search);let data=await DataLoader.loadSiteData();initContent(data);setLang(params.get('lang')||content.rawSetting('defaultLanguage')||'ar');SiteRuntime.applyDocument(document,content,'platform');
    let saved=null;try{saved=localStorage.getItem('dunya-theme-v2')}catch(_){}setTheme(saved||(window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'));
    let platforms=data.platforms.map(PlatformCore.normalizeStaticPlatform),platformId=params.get('id'),platform=findPlatform(platforms,platformId),loading=document.getElementById('profileLoading');
    document.getElementById('themeToggle').onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
    document.getElementById('langSwitcher').onchange=e=>{const url=new URL(location.href);url.searchParams.set('lang',e.target.value);location.href=url.href};
    if(!platform){loading.textContent=getText('platformNotFound');loading.classList.add('error');return}
    loading.remove();recordView(platform);renderProfile(platform,platforms);
    inlineEditor=InlineEditor.create({document,location,data,content,onDataChange(next){data=next;const rendered=renderFromData(data,platformId);platforms=rendered.platforms;platform=rendered.platform;setTimeout(()=>inlineEditor&&inlineEditor.refreshTargets(),0)}});
    await inlineEditor.init();
    if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  }
  if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',()=>initBrowser().catch(err=>{console.error(err);const el=document.getElementById('profileLoading');if(el)el.textContent=getText('errorLoading')||'Unable to load content'}));
  return{findPlatform,buildDetailModel,fieldsMarkup,officialPathsMarkup,similarPlatforms};
});