(function(root,factory){
  const directory = typeof module === 'object' && module.exports ? require('./platform-directory.js') : root.PlatformDirectory;
  const api = factory(directory);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.Landing = api;
})(typeof globalThis !== 'undefined' ? globalThis : this,function(PlatformDirectory){
  if(!PlatformDirectory) throw new Error('PlatformDirectory is required');
  function buildStats(platforms){ return PlatformDirectory.getStats(Array.isArray(platforms)?platforms:[]); }
  function withLang(path,lang){ return `${path}?lang=${encodeURIComponent(lang || 'ar')}`; }
  function setTheme(theme){
    document.documentElement.dataset.theme=theme;
    try{localStorage.setItem('dunya-theme-v2',theme)}catch(_){}
    const button=document.getElementById('themeToggle');if(button)button.textContent=theme==='dark'?'☀':'◐';
  }
  function initTheme(){
    let saved=null;try{saved=localStorage.getItem('dunya-theme-v2')}catch(_){}
    const theme=saved||(window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');setTheme(theme);
  }
  function syncExploreLinks(){ document.querySelectorAll('[data-explore-link]').forEach(link=>link.href=withLang('explore.html',currentLang)); }
  function renderStats(stats){
    const map={landingStatPlatforms:stats.platforms,landingStatFree:stats.free,landingStatCert:stats.certificates,landingStatLang:stats.languages};
    Object.entries(map).forEach(([id,value])=>{const el=document.getElementById(id);if(el)el.textContent=value});
  }
  async function initBrowser(){
    const params=new URLSearchParams(location.search);setLang(params.get('lang')||currentLang);initTheme();
    const data=await DataLoader.loadSiteData();mergeSiteText(data.siteText);applyTranslations();
    const lang=document.getElementById('langSwitcher');if(lang)lang.value=currentLang;syncExploreLinks();
    if(lang)lang.onchange=e=>{setLang(e.target.value);applyTranslations();lang.value=currentLang;syncExploreLinks();const url=new URL(location.href);url.searchParams.set('lang',currentLang);history.replaceState(null,'',url)};
    const theme=document.getElementById('themeToggle');if(theme)theme.onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
    const platforms=data.platforms.map(PlatformCore.normalizeStaticPlatform);renderStats(buildStats(platforms));
    if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  }
  if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',()=>initBrowser().catch(err=>{console.error(err);renderStats(buildStats([]))}));
  return {buildStats,withLang};
});
