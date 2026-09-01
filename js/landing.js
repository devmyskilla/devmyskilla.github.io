(function(root,factory){
  const directory=typeof module==='object'&&module.exports?require('./platform-directory.js'):root.PlatformDirectory;
  const api=factory(directory);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.Landing=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(PlatformDirectory){
  if(!PlatformDirectory)throw new Error('PlatformDirectory is required');
  let inlineEditor=null;
  function buildStats(platforms){return PlatformDirectory.getStats(Array.isArray(platforms)?platforms:[])}
  function withLang(path,lang){const separator=String(path).includes('?')?'&':'?';return `${path}${separator}lang=${encodeURIComponent(lang||'ar')}`}
  function setTheme(theme){
    document.documentElement.dataset.theme=theme;
    try{localStorage.setItem('dunya-theme-v2',theme)}catch(_){}
    const button=document.getElementById('themeToggle');if(button)button.textContent=content?content.icon(theme==='dark'?'themeLight':'themeDark'):'';
  }
  function initTheme(){let saved=null;try{saved=localStorage.getItem('dunya-theme-v2')}catch(_){}const theme=saved||(window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');setTheme(theme)}
  function syncExploreLinks(){const path=content&&content.link('explore')||'explore.html';document.querySelectorAll('[data-explore-link]').forEach(link=>link.href=withLang(path,currentLang))}
  function renderStats(stats){const map={landingStatPlatforms:stats.platforms,landingStatFree:stats.free,landingStatCert:stats.certificates,landingStatLang:stats.languages};Object.entries(map).forEach(([id,value])=>{const el=document.getElementById(id);if(el)el.textContent=value})}
  function renderPlatformCloud(platforms){
    const orbit=document.getElementById('homePlatformCloud');if(!orbit||!content)return;
    const core=orbit.querySelector('.landing-core');orbit.querySelectorAll('.orbit-chip').forEach(node=>node.remove());
    const byId=new Map((platforms||[]).map(p=>[p.id,p])),ids=Array.isArray(content.rawSetting('homePlatformCloud'))?content.rawSetting('homePlatformCloud'):[];
    ids.map(id=>byId.get(id)).filter(Boolean).forEach(p=>{const chip=document.createElement('span');chip.className='orbit-chip';chip.textContent=content.platformName(p);chip.dataset.editKind='platform';chip.dataset.editId=p.id;chip.dataset.editField='name';orbit.insertBefore(chip,core)});
  }
  function applyLandingData(data){
    initContent(data);setLang(currentLang);SiteRuntime.applyDocument(document,content,'home');syncExploreLinks();
    const platforms=data.platforms.map(PlatformCore.normalizeStaticPlatform);renderPlatformCloud(platforms);renderStats(buildStats(platforms));
    const lang=document.getElementById('langSwitcher');if(lang)lang.value=currentLang;
    return platforms;
  }
  async function initBrowser(){
    const params=new URLSearchParams(location.search);let data=await DataLoader.loadSiteData();
    initContent(data);setLang(params.get('lang')||content.rawSetting('defaultLanguage')||'ar');SiteRuntime.applyDocument(document,content,'home');initTheme();syncExploreLinks();
    let platforms=data.platforms.map(PlatformCore.normalizeStaticPlatform);renderPlatformCloud(platforms);renderStats(buildStats(platforms));
    const lang=document.getElementById('langSwitcher');if(lang)lang.value=currentLang;
    if(lang)lang.onchange=e=>{setLang(e.target.value);SiteRuntime.applyDocument(document,content,'home');lang.value=currentLang;syncExploreLinks();renderPlatformCloud(platforms);const url=new URL(location.href);url.searchParams.set('lang',currentLang);history.replaceState(null,'',url);if(inlineEditor)inlineEditor.refreshTargets()};
    const theme=document.getElementById('themeToggle');if(theme)theme.onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
    inlineEditor=InlineEditor.create({document,location,data,content,onDataChange(next){data=next;platforms=applyLandingData(data);setTimeout(()=>inlineEditor&&inlineEditor.refreshTargets(),0)}});
    await inlineEditor.init();
    if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  }
  if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',()=>initBrowser().catch(err=>{console.error(err);renderStats(buildStats([]))}));
  return{buildStats,withLang};
});
