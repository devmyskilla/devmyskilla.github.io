(function(){
  function tabs(){ return [...document.querySelectorAll('.tab-btn[role="tab"]')]; }
  function selectTab(selected){
    tabs().forEach(tab => {
      const isSelected = tab === selected;
      tab.classList.toggle('active', isSelected);
      tab.setAttribute('aria-selected', String(isSelected));
      tab.tabIndex = isSelected ? 0 : -1;
    });
  }
  function selectAll(){
    const all = document.querySelector('.tab-btn[data-tab="all"]');
    if (all) selectTab(all);
  }
  function init(){
    const current = document.querySelector('.tab-btn.active[role="tab"]') || document.querySelector('.tab-btn[role="tab"]');
    if (current) selectTab(current);
  }
  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('click', event => {
    const tab = event.target.closest('.tab-btn[role="tab"]');
    if (tab) { queueMicrotask(() => selectTab(tab)); return; }
    if (event.target.closest('#resetFilters,[data-quick-filter],[data-category]')) queueMicrotask(selectAll);
  });
})();
