(function(){
  function syncHome(){document.querySelectorAll('[data-home-link]').forEach(link=>link.href=`index.html?lang=${encodeURIComponent(currentLang||'ar')}`)}
  document.addEventListener('DOMContentLoaded',()=>{syncHome();const lang=document.getElementById('langSwitcher');if(lang)lang.addEventListener('change',()=>setTimeout(syncHome,0))});
})();
