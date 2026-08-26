(function(){
  const labels={ar:'الرئيسية',en:'Home',tr:'Ana Sayfa'};
  function syncHome(){document.querySelectorAll('[data-home-link]').forEach(link=>{link.href=`index.html?lang=${encodeURIComponent(currentLang||'ar')}`;if(link.matches('[data-i18n="navHome"]'))link.textContent=labels[currentLang]||labels.ar})}
  document.addEventListener('DOMContentLoaded',()=>{syncHome();const lang=document.getElementById('langSwitcher');if(lang)lang.addEventListener('change',()=>setTimeout(syncHome,0))});
})();
