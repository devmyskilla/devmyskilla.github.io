/* Dunya Al-Dawrat — client-only experience. Developed for Ummah Youth Union. */
let allPlatforms = [];
let filtersData = { languages: [], categories: [] };
let activeTab = 'all';
let deferredInstallPrompt = null;

const $ = id => document.getElementById(id);
const STORAGE = {
  favorites: 'dunya-favorites-v2', compare: 'dunya-compare-v2', views: 'dunya-views-v2',
  recent: 'dunya-recent-v2', theme: 'dunya-theme-v2'
};
const FEATURED_IDS = ['plat-26', 'plat-25', 'plat-3', 'plat-7', 'plat-34', 'plat-30'];

const els = {
  filterLang: $('filterLang'), filterCategory: $('filterCategory'), filterFree: $('filterFree'), filterCert: $('filterCert'),
  sortSelect: $('sortSelect'), resetBtn: $('resetFilters'), coursesGrid: $('coursesGrid'), resultsCount: $('resultsCount'),
  langSwitcher: $('langSwitcher'), searchInput: $('searchInput'), featuredGrid: $('featuredGrid'),
  compareDock: $('compareDock'), compareNames: $('compareNames'), compareCount: $('compareCount'),
  quizModal: $('quizModal'), compareModal: $('compareModal'), pathModal: $('pathModal'), toast: $('toast')
};

function readJSON(key, fallback) {
  try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch (_) { return fallback; }
}
function writeJSON(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }
function getFavorites() { return new Set(readJSON(STORAGE.favorites, [])); }
function setFavorites(set) { writeJSON(STORAGE.favorites, [...set]); }
function getCompare() { return new Set(readJSON(STORAGE.compare, [])); }
function setCompare(set) { writeJSON(STORAGE.compare, [...set]); }
function getViews() { return readJSON(STORAGE.views, {}); }
function getRecent() {
  const raw = readJSON(STORAGE.recent, []);
  return raw.map((item, index) => typeof item === 'string' ? { id: item, ts: Date.now() - index } : item).filter(x => x && x.id);
}
function escapeHtml(text = '') { const div = document.createElement('div'); div.textContent = String(text); return div.innerHTML; }
function normalizeText(text = '') {
  return String(text).toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[^\p{L}\p{N}+#.]+/gu, ' ').trim();
}
function platformText(p) {
  return normalizeText([p.name, p.name_en, p.name_tr, p.platform, p.description, p.description_en, p.description_tr, p.category, translateCat(p.category), p.language, translateLang(p.language)].filter(Boolean).join(' '));
}
function searchScore(p, query) {
  if (!query) return 0;
  const q = normalizeText(query); if (!q) return 0;
  const name = normalizeText(p.name); const hay = platformText(p); const terms = q.split(/\s+/).filter(Boolean);
  if (!terms.every(term => hay.includes(term))) return -1;
  let score = 0;
  if (name === q) score += 120; else if (name.startsWith(q)) score += 80; else if (name.includes(q)) score += 60;
  terms.forEach(term => { if (name.includes(term)) score += 18; if (hay.includes(term)) score += 6; });
  return score;
}
function platformById(id) { return allPlatforms.find(p => p.id === id); }
function detailUrl(p) { return `course.html?id=${encodeURIComponent(p.id)}&lang=${encodeURIComponent(currentLang)}`; }

function fetchFilters() {
  allPlatforms = Array.isArray(PLATFORMS_DATA) ? PLATFORMS_DATA : [];
  filtersData.languages = [...new Set(allPlatforms.map(p => p.language).filter(Boolean))].sort();
  filtersData.categories = [...new Set(allPlatforms.map(p => p.category).filter(Boolean))].sort();
  populateSelect(els.filterLang, filtersData.languages, translateLang);
  populateSelect(els.filterCategory, filtersData.categories, translateCat);
}
function populateSelect(select, options, translateFn) {
  if (!select) return;
  const old = select.value;
  select.innerHTML = `<option value="">${escapeHtml(getText('all'))}</option>` + options.map(opt => `<option value="${escapeHtml(opt)}">${escapeHtml(translateFn ? translateFn(opt) : opt)}</option>`).join('');
  if (options.includes(old)) select.value = old;
}
function renderStats() {
  $('statPlatforms').textContent = allPlatforms.length;
  $('statFree').textContent = allPlatforms.filter(p => p.free).length;
  $('statCert').textContent = allPlatforms.filter(p => p.certificate).length;
  $('statLang').textContent = new Set(allPlatforms.map(p => p.language)).size;
  $('allBadge').textContent = allPlatforms.length;
  $('favBadge').textContent = getFavorites().size;
  $('recentBadge').textContent = getRecent().length;
}
function getFilteredPlatforms() {
  const query = els.searchInput ? els.searchInput.value : '';
  const favorites = getFavorites();
  const recent = getRecent();
  const recentMap = Object.fromEntries(recent.map(x => [x.id, x.ts]));
  const views = getViews();
  let list = allPlatforms.map(p => ({ p, score: searchScore(p, query) })).filter(x => x.score >= 0);

  if (activeTab === 'favorites') list = list.filter(x => favorites.has(x.p.id));
  if (activeTab === 'recent') list = list.filter(x => recentMap[x.p.id]);
  if (els.filterLang && els.filterLang.value) list = list.filter(x => x.p.language === els.filterLang.value);
  if (els.filterCategory && els.filterCategory.value) list = list.filter(x => x.p.category === els.filterCategory.value);
  if (els.filterFree && els.filterFree.checked) list = list.filter(x => x.p.free);
  if (els.filterCert && els.filterCert.checked) list = list.filter(x => x.p.certificate);

  const sort = els.sortSelect ? els.sortSelect.value : 'recommended';
  list.sort((a, b) => {
    if (sort === 'name') return pf(a.p, 'name').localeCompare(pf(b.p, 'name'), currentLang);
    if (sort === 'viewed') return (views[b.p.id] || 0) - (views[a.p.id] || 0) || pf(a.p, 'name').localeCompare(pf(b.p, 'name'));
    if (sort === 'recent') return (recentMap[b.p.id] || 0) - (recentMap[a.p.id] || 0);
    if (sort === 'free') return Number(b.p.free) - Number(a.p.free) || Number(b.p.certificate) - Number(a.p.certificate);
    return b.score - a.score || Number(FEATURED_IDS.includes(b.p.id)) - Number(FEATURED_IDS.includes(a.p.id)) || (views[b.p.id] || 0) - (views[a.p.id] || 0);
  });
  return list.map(x => x.p);
}
function platformCard(p, compact = false) {
  const favorites = getFavorites(); const compare = getCompare(); const views = getViews();
  const fav = favorites.has(p.id); const selected = compare.has(p.id); const count = views[p.id] || 0;
  const name = pf(p, 'name'); const desc = pf(p, 'description'); const url = detailUrl(p);
  return `<article class="course-card${compact ? ' compact-card' : ''}" data-id="${escapeHtml(p.id)}">
    <div class="card-top">
      <a class="thumb-link" href="${url}">${p.thumbnail ? `<img class="card-thumb" src="${escapeHtml(p.thumbnail)}" alt="${escapeHtml(name)}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'card-thumb-placeholder',textContent:'🌐'}))">` : `<div class="card-thumb-placeholder">🌐</div>`}</a>
      <div class="card-icon-actions">
        <button class="round-action favorite-action ${fav ? 'active' : ''}" data-action="favorite" data-id="${p.id}" type="button" title="${escapeHtml(fav ? getText('unfavorite') : getText('favorite'))}">${fav ? '♥' : '♡'}</button>
        <button class="round-action share-action" data-action="share" data-id="${p.id}" type="button" title="${escapeHtml(getText('share'))}">↗</button>
      </div>
    </div>
    <div class="card-body">
      <div class="card-badges"><span class="tag">${escapeHtml(translateCat(p.category))}</span>${p.free ? `<span class="tag free">${escapeHtml(getText('free'))}</span>` : `<span class="tag paid">${escapeHtml(getText('paid'))}</span>`}${p.certificate ? `<span class="tag cert">✓ ${escapeHtml(getText('certificateBadge'))}</span>` : ''}${count ? `<span class="tag trend">🔥 ${count}</span>` : ''}</div>
      <a href="${url}" class="title-link"><h3 class="card-title">${escapeHtml(name)}</h3></a>
      ${compact ? '' : `<p class="card-desc">${escapeHtml(desc)}</p>`}
      <div class="card-footer">
        <span class="language-chip">◉ ${escapeHtml(translateLang(p.language))}</span>
        <div class="footer-actions"><button class="compare-action ${selected ? 'active' : ''}" data-action="compare" data-id="${p.id}" type="button">${selected ? '✓ ' + getText('selected') : '⚖ ' + getText('compare')}</button><a class="card-detail-link" href="${url}">${escapeHtml(getText('details'))} →</a></div>
      </div>
    </div>
  </article>`;
}
function renderPlatforms() {
  const platforms = getFilteredPlatforms();
  els.resultsCount.textContent = platforms.length;
  if (!platforms.length) { els.coursesGrid.innerHTML = `<div class="no-results"><span>⌕</span><strong>${escapeHtml(getText('noResults'))}</strong></div>`; return; }
  els.coursesGrid.innerHTML = platforms.map(p => platformCard(p)).join('');
  const views = getViews(); const top = [...platforms].sort((a,b)=>(views[b.id]||0)-(views[a.id]||0))[0];
  $('trendHint').textContent = top && views[top.id] ? `🔥 ${getText('localTrend')}: ${pf(top,'name')} · ${views[top.id]} ${getText('views')}` : '';
}
function renderFeatured() {
  const featured = FEATURED_IDS.map(platformById).filter(Boolean).slice(0, 6);
  els.featuredGrid.innerHTML = featured.map(p => platformCard(p, true)).join('');
}
function resetFilters() {
  els.searchInput.value = ''; els.filterLang.value = ''; els.filterCategory.value = ''; els.filterFree.checked = false; els.filterCert.checked = false; els.sortSelect.value = 'recommended'; activeTab = 'all';
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'all'));
  renderPlatforms();
}
function updateCompareDock() {
  const compare = getCompare(); const items = [...compare].map(platformById).filter(Boolean);
  els.compareCount.textContent = `${items.length}/3`;
  els.compareNames.textContent = items.map(p => pf(p, 'name')).join(' · ');
  els.compareDock.classList.toggle('show', items.length > 0);
}
function toggleFavorite(id) {
  const set = getFavorites(); set.has(id) ? set.delete(id) : set.add(id); setFavorites(set); renderStats(); renderPlatforms(); renderFeatured();
}
function toggleCompare(id) {
  const set = getCompare();
  if (set.has(id)) set.delete(id); else { if (set.size >= 3) { showToast(getText('maxCompare')); return; } set.add(id); }
  setCompare(set); updateCompareDock(); renderPlatforms(); renderFeatured();
}
async function sharePlatform(id) {
  const p = platformById(id); if (!p) return;
  const url = new URL(detailUrl(p), window.location.href).href;
  const data = { title: pf(p, 'name'), text: pf(p, 'description'), url };
  try { if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(url); showToast(getText('copied')); } } catch (_) {}
}
function showToast(message) {
  els.toast.textContent = message; els.toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => els.toast.classList.remove('show'), 2400);
}
function openModal(id) { const m = $(id); if (!m) return; m.classList.add('open'); m.setAttribute('aria-hidden','false'); document.body.classList.add('modal-open'); }
function closeModal(id) { const m = $(id); if (!m) return; m.classList.remove('open'); m.setAttribute('aria-hidden','true'); if (!document.querySelector('.modal.open')) document.body.classList.remove('modal-open'); }

function buildCompareTable() {
  const items = [...getCompare()].map(platformById).filter(Boolean); if (!items.length) return;
  const row = (label, values) => `<tr><th>${escapeHtml(label)}</th>${values.map(v => `<td>${v}</td>`).join('')}</tr>`;
  $('compareTable').innerHTML = `<table class="compare-table"><thead><tr><th>${escapeHtml(getText('platform'))}</th>${items.map(p => `<th><div class="compare-head">${p.thumbnail ? `<img src="${escapeHtml(p.thumbnail)}" alt="" onerror="this.remove()">` : ''}<strong>${escapeHtml(pf(p,'name'))}</strong></div></th>`).join('')}</tr></thead><tbody>
    ${row(getText('category'), items.map(p=>escapeHtml(translateCat(p.category))))}
    ${row(getText('language'), items.map(p=>escapeHtml(translateLang(p.language))))}
    ${row(getText('price'), items.map(p=>`<span class="${p.free?'good':'neutral'}">${escapeHtml(p.free?getText('free'):getText('paid'))}</span>`))}
    ${row(getText('certificate'), items.map(p=>`<span class="${p.certificate?'good':'neutral'}">${escapeHtml(p.certificate?getText('yes'):getText('no'))}</span>`))}
    ${row('', items.map(p=>`<a class="btn btn-primary small" href="${detailUrl(p)}">${escapeHtml(getText('details'))}</a>`))}
  </tbody></table>`;
}

function buildQuiz() {
  const cats = filtersData.categories; const langs = filtersData.languages;
  $('quizForm').innerHTML = `<div class="quiz-grid">
    <label><span>${getText('qCategory')}</span><select id="quizCategory"><option value="">${getText('anyCategory')}</option>${cats.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(translateCat(c))}</option>`).join('')}</select></label>
    <label><span>${getText('qLanguage')}</span><select id="quizLanguage"><option value="">${getText('anyLanguage')}</option>${langs.map(l=>`<option value="${escapeHtml(l)}">${escapeHtml(translateLang(l))}</option>`).join('')}</select></label>
    <label><span>${getText('qBudget')}</span><select id="quizFree"><option value="yes">${getText('freePreferred')}</option><option value="any">${getText('paidOkay')}</option></select></label>
    <label><span>${getText('qCertificate')}</span><select id="quizCert"><option value="yes">${getText('certImportant')}</option><option value="any">${getText('certNotImportant')}</option></select></label>
  </div><button class="btn btn-primary quiz-submit" id="runQuiz" type="button">✨ ${getText('showResults')}</button>`;
  $('quizResults').innerHTML = '';
  $('runQuiz').onclick = runQuiz;
}
function runQuiz() {
  const cat = $('quizCategory').value, lang = $('quizLanguage').value, free = $('quizFree').value, cert = $('quizCert').value;
  const ranked = allPlatforms.map(p => {
    let points = 10, max = 10;
    if (cat) { max += 40; if (p.category === cat) points += 40; }
    if (lang) { max += 25; if (p.language === lang) points += 25; else if (p.language === 'متعدد اللغات') points += 18; else if (p.language.includes(lang.split('/')[0])) points += 12; }
    if (free === 'yes') { max += 15; if (p.free) points += 15; }
    if (cert === 'yes') { max += 10; if (p.certificate) points += 10; }
    return { p, pct: Math.round(points / max * 100) };
  }).sort((a,b)=>b.pct-a.pct || Number(b.p.free)-Number(a.p.free) || Number(b.p.certificate)-Number(a.p.certificate)).slice(0,3);
  $('quizResults').innerHTML = `<div class="quiz-results"><h3>${getText('quizResults')}</h3>${ranked.map((r,i)=>`<a class="match-card" href="${detailUrl(r.p)}"><span class="match-rank">${i+1}</span>${r.p.thumbnail?`<img src="${escapeHtml(r.p.thumbnail)}" alt="" onerror="this.remove()">`:''}<div><strong>${escapeHtml(pf(r.p,'name'))}</strong><small>${escapeHtml(translateCat(r.p.category))} · ${escapeHtml(translateLang(r.p.language))}</small></div><b>${r.pct}% <small>${getText('match')}</small></b></a>`).join('')}</div>`;
}

const PATHS = {
  programming: {
    label: 'goalProgramming', stages: [
      { ar:'أساسيات الويب والبرمجة', en:'Programming & web foundations', tr:'Programlama ve web temelleri', names:['Free Code Camp','W3 School','Solo Learn','Code Academy'] },
      { ar:'التطبيق وحل المشكلات', en:'Practice & problem solving', tr:'Pratik ve problem çözme', names:['HackerRank','GitHub Learn','Kaggle'] },
      { ar:'التعمق وبناء المشاريع', en:'Advanced learning & projects', tr:'İleri öğrenme ve projeler', names:['Coursera','Edx','Udemy'] }
    ]
  },
  ai: { label:'goalAI', stages:[
    { ar:'Python والبيانات', en:'Python & data foundations', tr:'Python ve veri temelleri', names:['Kaggle','DataCamp','Free Code Camp'] },
    { ar:'الذكاء الاصطناعي وتعلم الآلة', en:'AI & machine learning', tr:'Yapay zeka ve makine öğrenmesi', names:['IBM Skills Build','Nvidia','Google Cloud'] },
    { ar:'المشاريع والتخصص', en:'Projects & specialization', tr:'Projeler ve uzmanlaşma', names:['Kaggle','MATLAB Academy','Coursera'] }
  ]},
  cyber: { label:'goalCyber', stages:[
    { ar:'الشبكات والأساسيات', en:'Networks & foundations', tr:'Ağlar ve temeller', names:['Cisco','Huawei','IBM Skills Build'] },
    { ar:'الأمن السحابي والتقني', en:'Cloud & technical security', tr:'Bulut ve teknik güvenlik', names:['Microsoft','Google Cloud','ITU Academy'] },
    { ar:'تثبيت المعرفة بالشهادات', en:'Deepen with certificates', tr:'Sertifikalarla derinleşme', names:['Cisco','Huawei','Coursera'] }
  ]},
  business: { label:'goalBusiness', stages:[
    { ar:'أساسيات الأعمال', en:'Business foundations', tr:'İş temelleri', names:['HP Life','Coursera','Alison'] },
    { ar:'التسويق الرقمي', en:'Digital marketing', tr:'Dijital pazarlama', names:['HubSpot Academy','Semrush','Google (Skillshop)'] },
    { ar:'الخبرة العملية', en:'Practical experience', tr:'Pratik deneyim', names:['Forage','Udemy','Coursera'] }
  ]},
  english: { label:'goalEnglish', stages:[
    { ar:'تحديد المستوى وبناء الأساس', en:'Build the foundation', tr:'Temeli oluşturma', names:['openlearn.aucegypt.edu','Open Learn','Khan Academy'] },
    { ar:'تعلم أكاديمي منظم', en:'Structured academic learning', tr:'Düzenli akademik öğrenme', names:['Coursera','Edx','FutureLearn'] },
    { ar:'استمرار وتخصص', en:'Continue through your interests', tr:'İlgi alanlarıyla devam', names:['Open Learn','Coursera','FutureLearn'] }
  ]}
};
function findByName(name) { const n = normalizeText(name); return allPlatforms.find(p => normalizeText(p.name) === n) || allPlatforms.find(p => normalizeText(p.name).includes(n) || n.includes(normalizeText(p.name))); }
function buildPathBuilder() {
  $('pathBuilder').innerHTML = `<div class="path-controls"><label><span>${getText('pathGoal')}</span><select id="pathGoal">${Object.entries(PATHS).map(([key,val])=>`<option value="${key}">${getText(val.label)}</option>`).join('')}</select></label><button class="btn btn-primary" id="generatePath" type="button">🧭 ${getText('generatePath')}</button></div>`;
  $('pathResults').innerHTML = '';
  $('generatePath').onclick = generatePath;
}
function generatePath() {
  const path = PATHS[$('pathGoal').value]; if (!path) return;
  $('pathResults').innerHTML = `<div class="learning-path">${path.stages.map((stage,index)=>{
    const title = stage[currentLang] || stage.en;
    const platforms = stage.names.map(findByName).filter(Boolean).slice(0,4);
    return `<div class="path-stage"><div class="stage-number">${index+1}</div><div class="stage-content"><small>${getText('stage')} ${index+1}</small><h3>${escapeHtml(title)}</h3><div class="stage-platforms">${platforms.map(p=>`<a href="${detailUrl(p)}">${p.thumbnail?`<img src="${escapeHtml(p.thumbnail)}" alt="" onerror="this.remove()">`:''}<span>${escapeHtml(pf(p,'name'))}</span></a>`).join('')}</div></div></div>`;
  }).join('')}</div>`;
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(STORAGE.theme, theme); } catch (_) {}
  $('themeToggle').textContent = theme === 'dark' ? '☀' : '◐';
}
function initTheme() {
  let saved = null; try { saved = localStorage.getItem(STORAGE.theme); } catch (_) {}
  const preferred = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  setTheme(saved || preferred);
}
function changeLang(lang) {
  setLang(lang); applyTranslations(); document.title = getText('siteName'); populateSelect(els.filterLang, filtersData.languages, translateLang); populateSelect(els.filterCategory, filtersData.categories, translateCat);
  renderStats(); renderFeatured(); renderPlatforms(); updateCompareDock(); buildQuiz(); buildPathBuilder();
}
function initReveal() {
  if (!('IntersectionObserver' in window)) { document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible')); return; }
  const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } }), { threshold:.12 });
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
}
function registerPWA() {
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstallPrompt = e; $('installBtn').hidden = false; });
  $('installBtn').addEventListener('click', async () => { if (deferredInstallPrompt) { deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt = null; $('installBtn').hidden = true; } else showToast(getText('installed')); });
}

function bindEvents() {
  [els.filterLang, els.filterCategory, els.filterFree, els.filterCert, els.sortSelect].forEach(el => el && el.addEventListener('change', renderPlatforms));
  els.searchInput.addEventListener('input', renderPlatforms); els.resetBtn.addEventListener('click', resetFilters);
  els.langSwitcher.addEventListener('change', e => changeLang(e.target.value));
  $('themeToggle').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => { activeTab = btn.dataset.tab; document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b===btn)); renderPlatforms(); }));
  document.addEventListener('click', e => {
    const action = e.target.closest('[data-action]');
    if (action) { e.preventDefault(); e.stopPropagation(); const { id } = action.dataset; if (action.dataset.action === 'favorite') toggleFavorite(id); if (action.dataset.action === 'compare') toggleCompare(id); if (action.dataset.action === 'share') sharePlatform(id); }
    const closer = e.target.closest('[data-close]'); if (closer) closeModal(closer.dataset.close);
    if (e.target.classList.contains('modal')) closeModal(e.target.id);
  });
  $('heroQuizBtn').addEventListener('click', () => { buildQuiz(); openModal('quizModal'); });
  $('randomBtn').addEventListener('click', () => { const list = getFilteredPlatforms().length ? getFilteredPlatforms() : allPlatforms; if (list.length) window.location.href = detailUrl(list[Math.floor(Math.random()*list.length)]); });
  $('pathBtn').addEventListener('click', () => { buildPathBuilder(); openModal('pathModal'); });
  $('clearCompare').addEventListener('click', () => { setCompare(new Set()); updateCompareDock(); renderPlatforms(); renderFeatured(); });
  $('compareNow').addEventListener('click', () => { buildCompareTable(); openModal('compareModal'); });
  document.addEventListener('keydown', e => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); els.searchInput.focus(); } if (e.key === 'Escape') document.querySelectorAll('.modal.open').forEach(m=>closeModal(m.id)); });
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    const params = new URLSearchParams(window.location.search); const lp = params.get('lang'); if (lp) setLang(lp); else setLang(currentLang);
    initTheme(); applyTranslations(); document.title = getText('siteName'); if (els.langSwitcher) els.langSwitcher.value = currentLang;
    fetchFilters(); renderStats(); renderFeatured(); renderPlatforms(); updateCompareDock(); bindEvents(); initReveal(); registerPWA();
  } catch (err) { console.error(err); if (els.coursesGrid) els.coursesGrid.innerHTML = `<div class="no-results">${escapeHtml(getText('errorLoading'))}</div>`; }
});
