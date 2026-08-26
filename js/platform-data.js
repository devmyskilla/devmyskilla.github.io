(function(root, factory){
  const core = typeof module === 'object' && module.exports ? require('./platform-core.js') : root.PlatformCore;
  const api = factory(core);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PlatformData = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(PlatformCore){
  if (!PlatformCore) throw new Error('PlatformCore is required');

  const PLATFORM_SELECT = [
    'id','external_id','name','description','description_ar','description_en','description_tr',
    'logo_url','official_url','catalog_url','status','expected_count','expected_count_type','last_verified',
    'category','pricing_model','has_free_content','certificate_available','languages','platform_type',
    'best_for_ar','best_for_en','best_for_tr','strengths_ar','strengths_en','strengths_tr',
    'limitations_ar','limitations_en','limitations_tr','featured','display_order'
  ].join(',');

  function cleanProjectUrl(value){ return String(value || '').replace(/\/+$/, ''); }
  function headers(publishableKey){
    if (!publishableKey) throw new Error('Supabase publishable key is required');
    return { apikey: publishableKey, Accept: 'application/json' };
  }
  function buildPlatformsUrl(projectUrl){
    const base = cleanProjectUrl(projectUrl);
    if (!base) throw new Error('Supabase project URL is required');
    const url = new URL(`${base}/rest/v1/platforms`);
    url.searchParams.set('select', PLATFORM_SELECT);
    url.searchParams.set('status', 'eq.active');
    url.searchParams.set('order', 'display_order.asc.nullslast,id.asc');
    return url.toString();
  }
  function normalizeStaticList(staticPlatforms){
    return (Array.isArray(staticPlatforms) ? staticPlatforms : []).map(PlatformCore.normalizeStaticPlatform);
  }
  function mergeRows(rows, staticPlatforms){
    const normalizedStatic = normalizeStaticList(staticPlatforms);
    const staticById = new Map(normalizedStatic.map(p => [p.id, p]));
    return rows.map(row => {
      const db = PlatformCore.normalizeSupabasePlatform(row);
      return PlatformCore.mergePlatform(staticById.get(db.id) || null, db);
    });
  }
  async function loadPlatforms(options = {}){
    const staticPlatforms = Array.isArray(options.staticPlatforms) ? options.staticPlatforms : [];
    const fallback = () => normalizeStaticList(staticPlatforms);
    try {
      const url = buildPlatformsUrl(options.projectUrl);
      const fetchFn = options.fetchFn || ((...args) => fetch(...args));
      const response = await fetchFn(url, { headers: headers(options.publishableKey), cache: 'no-store' });
      if (!response || !response.ok) {
        const status = response && response.status ? response.status : 'unknown';
        throw new Error(`Supabase ${status}: platform request failed`);
      }
      const rows = await response.json();
      if (!Array.isArray(rows)) throw new Error('Supabase platforms response must be an array');
      return { platforms: mergeRows(rows, staticPlatforms), source: 'supabase', error: null };
    } catch (error) {
      return { platforms: fallback(), source: 'fallback', error };
    }
  }

  return { PLATFORM_SELECT, buildPlatformsUrl, loadPlatforms };
});
