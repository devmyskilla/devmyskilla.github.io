(function(){
  const labels={ar:'الرئيسية',en:'Home',tr:'Ana Sayfa'};
  function syncHome(){document.querySelectorAll('[data-home-link]').forEach(link=>{link.href=`index.html?lang=${encodeURIComponent(currentLang||'ar')}`;if(link.matches('[data-i18n="navHome"]'))link.textContent=labels[currentLang]||labels.ar})}
  function applyCategoryFromQuery(attempt=0){
    const params=new URLSearchParams(location.search),category=params.get('category');if(!category)return;
    const filterCategory=document.getElementById('filterCategory');
    const ready=filterCategory&&[...filterCategory.options].some(option=>option.value===category);
    if(!ready){if(attempt<40)setTimeout(()=>applyCategoryFromQuery(attempt+1),50);return}
    filterCategory.value=category;
    filterCategory.dispatchEvent(new Event('change',{bubbles:true}));
  }
  document.addEventListener('DOMContentLoaded',()=>{syncHome();applyCategoryFromQuery();const lang=document.getElementById('langSwitcher');if(lang)lang.addEventListener('change',()=>setTimeout(syncHome,0))});
})();
