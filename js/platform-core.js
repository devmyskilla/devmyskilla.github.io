(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PlatformCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  const UNIT_LABELS = {
    en: { courses:'courses', job_simulations:'job simulations', modules:'modules', learning_paths:'learning paths', certifications:'certifications', materials:'materials', items:'items' },
    ar: { courses:'دورة', job_simulations:'محاكاة وظيفية', modules:'وحدة', learning_paths:'مسار تعليمي', certifications:'شهادة', materials:'مادة', items:'عنصر' },
    tr: { courses:'kurs', job_simulations:'iş simülasyonu', modules:'modül', learning_paths:'öğrenme yolu', certifications:'sertifika', materials:'materyal', items:'öğe' }
  };

  function nullish(value){ return value === null || value === undefined; }
  function text(value, fallback=''){ return nullish(value) ? fallback : String(value); }
  function array(value){
    if (Array.isArray(value)) return value.filter(v => !nullish(v) && String(v).trim() !== '').map(String);
    if (nullish(value) || String(value).trim() === '') return [];
    return [String(value)];
  }
  function numberOrNull(value){
    if (nullish(value) || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  function intOrNull(value){ const n = numberOrNull(value); return n === null ? null : Math.trunc(n); }
  function meaningful(value){
    if (nullish(value)) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }
  function normalizePricing(value, freeFlag){
    if (value === 0 || value === '0') return 'free';
    if (meaningful(value)) return text(value).trim();
    if (freeFlag === true) return 'free';
    return 'unknown';
  }

  function normalizeText(value=''){
    return String(value).toLowerCase().normalize('NFKD')
      .replace(/[\u064B-\u065F\u0670]/g,'')
      .replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه')
      .replace(/[^\p{L}\p{N}+#.]+/gu,' ').trim();
  }

  function baseShape(){
    return {
      id:'', name:'',
      description:'', description_ar:'', description_en:'', description_tr:'',
      category:'', pricingModel:'unknown', hasFreeContent:false, certificateAvailable:false, freeCertificate:false,
      languages:[], platformType:'', officialUrl:'', catalogUrl:'', logoUrl:'',
      officialCount:null, officialCountType:'', lastVerified:null,
      best_for_ar:[], best_for_en:[], best_for_tr:[],
      strengths_ar:[], strengths_en:[], strengths_tr:[],
      limitations_ar:[], limitations_en:[], limitations_tr:[],
      featured:false, displayOrder:null
    };
  }

  function normalizeStaticPlatform(row={}){
    const out = baseShape();
    const freeFlag = row.hasFreeContent !== undefined ? row.hasFreeContent === true : row.free === true;
    Object.assign(out, {
      id:text(row.id), name:text(row.name || row.platform),
      description:text(row.description), description_ar:text(row.description_ar || row.description),
      description_en:text(row.description_en), description_tr:text(row.description_tr),
      category:text(row.category),
      pricingModel:normalizePricing(row.pricingModel ?? row.pricing_model, freeFlag),
      hasFreeContent:freeFlag,
      certificateAvailable:row.certificateAvailable !== undefined ? row.certificateAvailable === true : row.certificate === true,
      freeCertificate:row.freeCertificate !== undefined ? row.freeCertificate === true : row.free_certificate === true,
      languages:array(row.languages && row.languages.length ? row.languages : row.language),
      platformType:text(row.platformType || row.platform_type),
      officialUrl:text(row.officialUrl || row.official_url || row.link),
      catalogUrl:text(row.catalogUrl || row.catalog_url || row.link),
      logoUrl:text(row.logoUrl || row.logo_url || row.thumbnail),
      officialCount:numberOrNull(row.officialCount ?? row.expected_count),
      officialCountType:text(row.officialCountType || row.expected_count_type),
      lastVerified:row.lastVerified || row.last_verified || null,
      best_for_ar:array(row.best_for_ar), best_for_en:array(row.best_for_en), best_for_tr:array(row.best_for_tr),
      strengths_ar:array(row.strengths_ar), strengths_en:array(row.strengths_en), strengths_tr:array(row.strengths_tr),
      limitations_ar:array(row.limitations_ar), limitations_en:array(row.limitations_en), limitations_tr:array(row.limitations_tr),
      featured:row.featured === true, displayOrder:intOrNull(row.displayOrder ?? row.display_order)
    });
    return out;
  }

  function verificationState(value, now=new Date()){
    if (!value) return 'unverified';
    const verified = new Date(value);
    const current = now instanceof Date ? now : new Date(now);
    if (Number.isNaN(verified.getTime()) || Number.isNaN(current.getTime())) return 'unverified';
    const ageDays = (current.getTime() - verified.getTime()) / 86400000;
    return ageDays >= 0 && ageDays <= 30 ? 'recent' : 'outdated';
  }

  function contentCountLabel(platform={}, lang='en'){
    const count = numberOrNull(platform.officialCount);
    if (count === null) return '';
    const locale = UNIT_LABELS[lang] ? lang : 'en';
    const type = text(platform.officialCountType || 'items');
    const unit = UNIT_LABELS[locale][type] || UNIT_LABELS[locale].items;
    return `${count} ${unit}`;
  }

  function pricingDisplayKey(platform={}){
    return platform.pricingModel === 'free' ? 'pricing_free_display' : `pricing_${platform.pricingModel || 'unknown'}`;
  }
  function certificateDisplayKey(platform={}){
    if (platform.freeCertificate === true) return 'certificate_free';
    if (platform.certificateAvailable === true) return 'certificate_available';
    return '';
  }
  function shouldShowOfficialCount(platform={}){ return numberOrNull(platform.officialCount) !== null; }
  function shouldShowVerification(platform={}){
    if (!platform.lastVerified) return false;
    return verificationState(platform.lastVerified) !== 'unverified';
  }

  function searchHaystack(p={}){
    return normalizeText([
      p.name,p.description,p.description_ar,p.description_en,p.description_tr,p.category,p.platformType,p.pricingModel,
      ...(Array.isArray(p.languages)?p.languages:[]),...(p.best_for_ar||[]),...(p.best_for_en||[]),...(p.best_for_tr||[])
    ].filter(Boolean).join(' '));
  }

  function searchScore(platform, query){
    const q = normalizeText(query);
    if (!q) return 0;
    const hay = searchHaystack(platform);
    const terms = q.split(/\s+/).filter(Boolean);
    if (!terms.every(term => hay.includes(term))) return -1;
    const name = normalizeText(platform && platform.name);
    let score = 0;
    if (name === q) score += 120;
    else if (name.startsWith(q)) score += 80;
    else if (name.includes(q)) score += 60;
    terms.forEach(term => { if (name.includes(term)) score += 18; if (hay.includes(term)) score += 6; });
    return score;
  }

  function filterPlatforms(platforms, state={}){
    const now = state.now || new Date();
    return (Array.isArray(platforms)?platforms:[]).filter(p => {
      if (state.query && searchScore(p,state.query) < 0) return false;
      if (state.category && p.category !== state.category) return false;
      if (state.language && !(Array.isArray(p.languages) && p.languages.includes(state.language))) return false;
      if (state.pricingModel && p.pricingModel !== state.pricingModel) return false;
      if (state.freeOnly && p.hasFreeContent !== true) return false;
      if (state.certificateOnly && p.certificateAvailable !== true) return false;
      if (state.verification && verificationState(p.lastVerified,now) !== state.verification) return false;
      return true;
    });
  }

  function byName(a,b){ return text(a&&a.name).localeCompare(text(b&&b.name)); }
  function sortPlatforms(platforms, mode='recommended'){
    const list = [...(Array.isArray(platforms)?platforms:[])];
    if (mode === 'name') return list.sort(byName);
    if (mode === 'official_count') return list.sort((a,b) => {
      const ac = numberOrNull(a&&a.officialCount), bc = numberOrNull(b&&b.officialCount);
      if (ac === null && bc === null) return byName(a,b);
      if (ac === null) return 1;
      if (bc === null) return -1;
      return bc-ac || byName(a,b);
    });
    if (mode === 'recently_verified') return list.sort((a,b) => {
      const at = a&&a.lastVerified ? new Date(a.lastVerified).getTime() : NaN;
      const bt = b&&b.lastVerified ? new Date(b.lastVerified).getTime() : NaN;
      const av = Number.isFinite(at) ? at : -Infinity, bv = Number.isFinite(bt) ? bt : -Infinity;
      return bv-av || byName(a,b);
    });
    if (mode === 'free') return list.sort((a,b) => Number(b.hasFreeContent===true)-Number(a.hasFreeContent===true) || byName(a,b));
    if (mode === 'recommended') return list.sort((a,b) => {
      const featured = Number(b.featured===true)-Number(a.featured===true);
      if (featured) return featured;
      const ao = intOrNull(a.displayOrder), bo = intOrNull(b.displayOrder);
      if (ao !== null || bo !== null) {
        if (ao === null) return 1;
        if (bo === null) return -1;
        if (ao !== bo) return ao-bo;
      }
      return byName(a,b);
    });
    return list;
  }

  function toggleComparison(ids, id, max=3){
    const next = [...(Array.isArray(ids)?ids:[])];
    const index = next.indexOf(id);
    if (index >= 0) { next.splice(index,1); return {ids:next,blocked:false}; }
    if (next.length >= max) return {ids:next,blocked:true};
    next.push(id);
    return {ids:next,blocked:false};
  }

  return { normalizeText, normalizeStaticPlatform, verificationState, contentCountLabel, pricingDisplayKey, certificateDisplayKey, shouldShowOfficialCount, shouldShowVerification, searchScore, filterPlatforms, sortPlatforms, toggleComparison };
});
