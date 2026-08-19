const $ = id => document.getElementById(id);
const STORAGE = { favorites:'dunya-favorites-v2', views:'dunya-views-v2', recent:'dunya-recent-v2', theme:'dunya-theme-v2' };
const detailLoading = $('detailLoading'), detailWrapper = $('detailWrapper'), langSwitcher = $('langSwitcher');
let currentPlatform = null;

function readJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; } }
function writeJSON(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }
function escapeHtml(text='') { const d=document.createElement('div'); d.textContent=String(text); return d.innerHTML; }
function isFavorite(id) { return new Set(readJSON(STORAGE.favorites, [])).has(id); }
function toggleFavorite(id) { const s=new Set(readJSON(STORAGE.favorites, [])); s.has(id)?s.delete(id):s.add(id); writeJSON(STORAGE.favorites,[...s]); renderPlatform(currentPlatform,false); }
function recordView(p) {
  const views=readJSON(STORAGE.views,{}); views[p.id]=(views[p.id]||0)+1; writeJSON(STORAGE.views,views);
  let recent=readJSON(STORAGE.recent,[]).map((x,i)=>typeof x==='string'?{id:x,ts:Date.now()-i}:x).filter(x=>x&&x.id&&x.id!==p.id);
  recent.unshift({id:p.id,ts:Date.now()}); writeJSON(STORAGE.recent,recent.slice(0,16));
}
function getViewCount(id){ return readJSON(STORAGE.views,{})[id]||0; }
function showToast(message){ const t=$('toast'); t.textContent=message; t.classList.add('show'); clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>t.classList.remove('show'),2200); }
async function sharePlatform(p){ const url=window.location.href; try{ if(navigator.share) await navigator.share({title:pf(p,'name'),text:pf(p,'description'),url}); else{await navigator.clipboard.writeText(url);showToast(getText('copied'));}}catch(_){} }
function detailUrl(p){return `course.html?id=${encodeURIComponent(p.id)}&lang=${encodeURIComponent(currentLang)}`;}

function renderPlatform(p, renderSimilarToo=true) {
  currentPlatform=p; const existing=detailWrapper.querySelector('.detail-content'); if(existing) existing.remove(); detailLoading.style.display='none';
  const name=pf(p,'name'), desc=pf(p,'description'), cat=translateCat(p.category), langVal=translateLang(p.language), fav=isFavorite(p.id), views=getViewCount(p.id);
  const html=`<article class="detail-content">
    <div class="detail-hero">
      <div class="detail-logo-wrap">${p.thumbnail?`<img class="detail-thumb" src="${escapeHtml(p.thumbnail)}" alt="${escapeHtml(name)}">`:`<div class="detail-thumb-placeholder">🌐</div>`}</div>
      <div class="detail-info"><div class="card-badges"><span class="tag">${escapeHtml(cat)}</span><span class="tag ${p.free?'free':'paid'}">${escapeHtml(p.free?getText('free'):getText('paid'))}</span>${p.certificate?`<span class="tag cert">✓ ${escapeHtml(getText('certificateBadge'))}</span>`:''}</div><h1 class="detail-title">${escapeHtml(name)}</h1><p class="detail-description">${escapeHtml(desc)}</p><div class="detail-view-count">🔥 ${views} ${escapeHtml(getText('viewedLocally'))}</div></div>
    </div>
    <div class="detail-meta-grid"><div class="meta-item"><span>${escapeHtml(getText('category'))}</span><strong>${escapeHtml(cat)}</strong></div><div class="meta-item"><span>${escapeHtml(getText('language'))}</span><strong>${escapeHtml(langVal)}</strong></div><div class="meta-item"><span>${escapeHtml(getText('price'))}</span><strong class="${p.free?'good-text':''}">${escapeHtml(p.free?getText('free'):getText('paid'))}</strong></div><div class="meta-item"><span>${escapeHtml(getText('certificate'))}</span><strong>${escapeHtml(p.certificate?getText('yes'):getText('no'))}</strong></div></div>
    <div class="detail-actions"><button class="btn ${fav?'btn-favorite-active':'btn-soft'}" id="detailFavorite" type="button">${fav?'♥ '+getText('removeSaved'):'♡ '+getText('savePlatform')}</button><button class="btn btn-soft" id="detailShare" type="button">↗ ${getText('sharePlatform')}</button>${p.link?`<a class="btn btn-primary" href="${escapeHtml(p.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(getText('visitPlatform'))} ↗</a>`:''}</div>
  </article>`;
  const backLink=detailWrapper.querySelector('.back-link'); backLink.href='index.html?lang='+currentLang+'#explore'; backLink.insertAdjacentHTML('afterend',html);
  $('detailFavorite').onclick=()=>toggleFavorite(p.id); $('detailShare').onclick=()=>sharePlatform(p);
  document.title=name+' — '+getText('siteName');
  if(renderSimilarToo) renderSimilar(p);
}
function renderSimilar(p){ const list=PLATFORMS_DATA.filter(x=>x.id!==p.id&&x.category===p.category).slice(0,3); if(!list.length)return; $('similarSection').hidden=false; $('similarGrid').innerHTML=list.map(x=>`<article class="course-card compact-card"><div class="card-top"><a class="thumb-link" href="${detailUrl(x)}">${x.thumbnail?`<img class="card-thumb" src="${escapeHtml(x.thumbnail)}" alt="${escapeHtml(pf(x,'name'))}">`:`<div class="card-thumb-placeholder">🌐</div>`}</a></div><div class="card-body"><div class="card-badges"><span class="tag">${escapeHtml(translateCat(x.category))}</span>${x.free?`<span class="tag free">${getText('free')}</span>`:''}</div><a class="title-link" href="${detailUrl(x)}"><h3 class="card-title">${escapeHtml(pf(x,'name'))}</h3></a><div class="card-footer"><span class="language-chip">◉ ${escapeHtml(translateLang(x.language))}</span><a class="card-detail-link" href="${detailUrl(x)}">${getText('details')} →</a></div></div></article>`).join(''); }
function setTheme(theme){document.documentElement.dataset.theme=theme;try{localStorage.setItem(STORAGE.theme,theme)}catch(_){} $('themeToggle').textContent=theme==='dark'?'☀':'◐';}
function initTheme(){let s;try{s=localStorage.getItem(STORAGE.theme)}catch(_){} setTheme(s||(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));}
function changeLang(lang){setLang(lang);applyTranslations();document.querySelector('.logo-link').href='index.html?lang='+lang;document.querySelector('.back-link').href='index.html?lang='+lang+'#explore';if(currentPlatform)renderPlatform(currentPlatform,true);}

document.addEventListener('DOMContentLoaded',()=>{
  const params=new URLSearchParams(window.location.search), lp=params.get('lang'); if(lp)setLang(lp);else setLang(currentLang); initTheme();applyTranslations();langSwitcher.value=currentLang;
  $('themeToggle').onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'); langSwitcher.onchange=e=>changeLang(e.target.value);
  const platform=PLATFORMS_DATA.find(p=>p.id===params.get('id')); if(!platform){detailLoading.textContent='⚠️ '+getText('platformNotFound');return;} recordView(platform);renderPlatform(platform,true);
  if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
});
