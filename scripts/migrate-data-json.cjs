const fs = require('node:fs');
const vm = require('node:vm');

function readLegacyPlatforms(){
  const source = fs.readFileSync('js/data.js', 'utf8');
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${source}\n;globalThis.__PLATFORMS__ = PLATFORMS_DATA;`, sandbox);
  if (!Array.isArray(sandbox.__PLATFORMS__)) throw new Error('PLATFORMS_DATA was not found');
  return sandbox.__PLATFORMS__;
}

function readLegacyI18n(){
  const source = fs.readFileSync('js/i18n.js', 'utf8');
  const marker = '\n\nconst catMap';
  const index = source.indexOf(marker);
  if (index < 0) throw new Error('i18n object boundary was not found');
  const objectSource = source.slice(0, index);
  const landingSource = fs.readFileSync('js/landing-i18n.js', 'utf8');
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${objectSource}\n${landingSource}\n;globalThis.__I18N__ = i18n;`, sandbox);
  if (!sandbox.__I18N__ || typeof sandbox.__I18N__ !== 'object') throw new Error('i18n object was not found');
  return JSON.parse(JSON.stringify(sandbox.__I18N__));
}

function pricingModel(row){
  const raw = row.pricingModel ?? row.pricing_model;
  if (raw === 0 || raw === '0') return 'free';
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return row.free === true ? 'free' : 'paid';
}

function asList(value){
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (value === null || value === undefined || String(value).trim() === '') return [];
  return [String(value)];
}

function migratePlatform(row, index){
  return {
    id: String(row.id || `plat-${index + 1}`),
    name: String(row.name || row.platform || ''),
    description_ar: String(row.description_ar || row.description || ''),
    description_en: String(row.description_en || ''),
    description_tr: String(row.description_tr || ''),
    category: String(row.category || ''),
    pricingModel: pricingModel(row),
    hasFreeContent: row.hasFreeContent !== undefined ? row.hasFreeContent === true : row.free === true,
    certificateAvailable: row.certificateAvailable !== undefined ? row.certificateAvailable === true : row.certificate === true,
    freeCertificate: row.freeCertificate === true || row.free_certificate === true,
    languages: asList(row.languages && row.languages.length ? row.languages : row.language),
    platformType: String(row.platformType || row.platform_type || ''),
    officialUrl: String(row.officialUrl || row.official_url || row.link || ''),
    catalogUrl: String(row.catalogUrl || row.catalog_url || row.link || ''),
    logoUrl: String(row.logoUrl || row.logo_url || row.thumbnail || ''),
    officialCount: Number.isFinite(Number(row.officialCount ?? row.expected_count)) && (row.officialCount ?? row.expected_count) !== '' && (row.officialCount ?? row.expected_count) !== null && (row.officialCount ?? row.expected_count) !== undefined ? Number(row.officialCount ?? row.expected_count) : null,
    officialCountType: String(row.officialCountType || row.expected_count_type || 'courses'),
    lastVerified: row.lastVerified || row.last_verified || null,
    best_for_ar: asList(row.best_for_ar),
    best_for_en: asList(row.best_for_en),
    best_for_tr: asList(row.best_for_tr),
    strengths_ar: asList(row.strengths_ar),
    strengths_en: asList(row.strengths_en),
    strengths_tr: asList(row.strengths_tr),
    limitations_ar: asList(row.limitations_ar),
    limitations_en: asList(row.limitations_en),
    limitations_tr: asList(row.limitations_tr),
    featured: row.featured === true,
    displayOrder: Number.isFinite(Number(row.displayOrder ?? row.display_order)) ? Number(row.displayOrder ?? row.display_order) : index + 1
  };
}

const siteText = readLegacyI18n();
siteText.ar.pricing_free = 'مجاناً';
siteText.en.pricing_free = 'Free';
siteText.tr.pricing_free = 'Ücretsiz';
siteText.ar.pricing_free_display = 'مجاناً';
siteText.en.pricing_free_display = 'Free';
siteText.tr.pricing_free_display = 'Ücretsiz';
siteText.ar.certificate_free = 'الشهادات المجانية';
siteText.en.certificate_free = 'Free certificates';
siteText.tr.certificate_free = 'Ücretsiz sertifikalar';
siteText.ar.certificate_available = 'الشهادات متاحة';
siteText.en.certificate_available = 'Certificates available';
siteText.tr.certificate_available = 'Sertifikalar mevcut';
for (const lang of ['ar','en','tr']) {
  delete siteText[lang].verification_unverified;
  delete siteText[lang].dataSupabase;
  delete siteText[lang].dataFallback;
}

const platforms = readLegacyPlatforms().map(migratePlatform);
const output = { siteText, platforms };
fs.writeFileSync('data.json', JSON.stringify(output, null, 2) + '\n');
console.log(`Migrated ${platforms.length} platforms and landing copy to data.json`);
