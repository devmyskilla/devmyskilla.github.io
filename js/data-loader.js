(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DataLoader = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  function validate(data){
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('data.json must contain an object');
    }
    if (!data.siteText || typeof data.siteText !== 'object' || Array.isArray(data.siteText)) {
      throw new Error('data.json siteText is required');
    }
    if (!Array.isArray(data.platforms)) {
      throw new Error('data.json platforms must be an array');
    }
    return data;
  }

  async function loadSiteData(options = {}){
    const fetchFn = options.fetchFn || ((...args) => fetch(...args));
    const url = options.url || './data.json';
    const response = await fetchFn(url, { cache: 'no-store' });
    if (!response || !response.ok) {
      const status = response && response.status ? response.status : 'unknown';
      throw new Error(`data.json load failed: ${status}`);
    }
    return validate(await response.json());
  }

  return { validate, loadSiteData };
});
