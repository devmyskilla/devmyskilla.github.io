(function(){
  function sync(){const link=document.querySelector('.back-link');if(link)link.href=`explore.html?lang=${encodeURIComponent(currentLang||'ar')}`}
  document.addEventListener('DOMContentLoaded',()=>{sync();const root=document.getElementById('platformProfile');if(root)new MutationObserver(sync).observe(root,{childList:true,subtree:true})});
})();
