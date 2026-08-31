const fs = require('node:fs');
const { validateContentData, validateStableReferences } = require('./content-schema.cjs');

const path = 'data.json';
const legacy = JSON.parse(fs.readFileSync(path,'utf8'));

if (legacy.settings && legacy.assets && legacy.seo && Array.isArray(legacy.categories) && Array.isArray(legacy.languages)) {
  validateStableReferences(validateContentData(legacy));
  console.log('data.json is already on the full CMS schema');
  process.exit(0);
}

const localized = (ar='',en=ar,tr=en) => ({ ar:String(ar||''), en:String(en||''), tr:String(tr||'') });
const textAt = (key,lang) => String((legacy.siteText && legacy.siteText[lang] || {})[key] || '');
const locKey = key => localized(textAt(key,'ar'),textAt(key,'en'),textAt(key,'tr'));

function groupForKey(key){
  if (/^(landing|problem|step)/.test(key)) return 'home';
  if (/^(nav)/.test(key)) return 'navigation';
  if (/^(explorer|hero|featured|categories|chip|filter|sort|allTab|favoritesTab|recentTab|browse|random|install|platformsAvailable|noResults|freeOnly|withCertificate|trustCopy)/.test(key)) return 'explore';
  if (/^(bestFor|strengths|limitations|facts|official|similar|savePlatform|removeSaved|sharePlatform|backToHome|platformNotFound|details|overview)/.test(key)) return 'platform';
  if (/^(compare|maxCompare|selected|clear)/.test(key)) return 'comparison';
  if (/^(quiz|qCategory|qLanguage|qBudget|qCertificate|goal|match|freePreferred|paidOkay|certImportant|certNotImportant|showResults|path|stage|generatePath|buildPath)/.test(key)) return 'quiz';
  if (/^(error|loading|unknown|copied|installed)/.test(key)) return 'errors';
  if (/^(footer|developedBy|siteName|tagline|unionBadge)/.test(key)) return 'footer';
  if (/^(close|language|theme|search)/.test(key)) return 'accessibility';
  return 'common';
}

function migrateSiteText(){
  const out = {};
  const keys = [...new Set(['ar','en','tr'].flatMap(lang => Object.keys(legacy.siteText && legacy.siteText[lang] || {})))].sort();
  for (const key of keys) {
    const group = groupForKey(key);
    out[group] ||= {};
    out[group][key] = locKey(key);
  }
  out.common ||= {};
  out.common.contentUnits = {
    courses: localized('دورة','courses','kurs'),
    job_simulations: localized('محاكاة وظيفية','job simulations','iş simülasyonu'),
    modules: localized('وحدة','modules','modül'),
    learning_paths: localized('مسار تعليمي','learning paths','öğrenme yolu'),
    certifications: localized('شهادة','certifications','sertifika'),
    materials: localized('مادة','materials','materyal'),
    items: localized('عنصر','items','öğe')
  };
  out.accessibility ||= {};
  out.accessibility.theme = localized('تبديل المظهر','Toggle theme','Temayı değiştir');
  out.accessibility.language = localized('اللغة','Language','Dil');
  out.accessibility.search = localized('البحث عن منصة','Platform search','Platform arama');
  out.accessibility.close = localized('إغلاق','Close','Kapat');
  return out;
}

const CATEGORY_IDS = {
  'برمجة وبيانات':'programming_data',
  'تكنولوجيا':'technology',
  'تسويق وأعمال':'business_marketing',
  'تعليم':'education',
  'لغات':'languages',
  technology:'technology', data_ai:'data_ai', business:'business', languages:'languages', academic:'academic', career:'career', education:'education'
};
const CATEGORY_LABELS = {
  programming_data: localized('برمجة وبيانات','Programming & Data','Programlama & Veri'),
  technology: localized('تكنولوجيا','Technology','Teknoloji'),
  business_marketing: localized('تسويق وأعمال','Business & Marketing','İş & Pazarlama'),
  education: localized('تعليم','Education','Eğitim'),
  languages: localized('لغات','Languages','Diller'),
  data_ai: localized('البيانات والذكاء الاصطناعي','Data & AI','Veri & Yapay Zeka'),
  business: localized('الأعمال والتسويق','Business & Marketing','İş & Pazarlama'),
  academic: localized('جامعي وأكاديمي','University & Academic','Üniversite & Akademik'),
  career: localized('مهارات مهنية','Career & Professional','Kariyer & Profesyonel')
};
const CATEGORY_ICONS = {
  programming_data:'⌘', technology:'◈', business_marketing:'◎', education:'✦', languages:'▦', data_ai:'◇', business:'↗', academic:'▤', career:'◆'
};

const LANGUAGE_IDS = {
  'إنجليزي':'English', 'عربي':'Arabic', 'تركي':'Turkish', 'إنجليزي/فرنسي':'EnglishFrench', 'عربي/إنجليزي':'ArabicEnglish', 'متعدد اللغات':'Multilingual',
  English:'English', Arabic:'Arabic', Turkish:'Turkish', French:'French'
};
const LANGUAGE_LABELS = {
  English: localized('الإنجليزية','English','İngilizce'),
  Arabic: localized('العربية','Arabic','Arapça'),
  Turkish: localized('التركية','Turkish','Türkçe'),
  French: localized('الفرنسية','French','Fransızca'),
  EnglishFrench: localized('الإنجليزية/الفرنسية','English/French','İngilizce/Fransızca'),
  ArabicEnglish: localized('العربية/الإنجليزية','Arabic/English','Arapça/İngilizce'),
  Multilingual: localized('متعدد اللغات','Multilingual','Çok dilli')
};

function categoryId(value){ return CATEGORY_IDS[value] || String(value || 'uncategorized'); }
function languageId(value){ return LANGUAGE_IDS[value] || String(value || ''); }

function unique(values){ return [...new Set(values.filter(Boolean))]; }
function normalizeText(value=''){
  return String(value).toLowerCase().normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g,'')
    .replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه')
    .replace(/[^\p{L}\p{N}+#.]+/gu,' ').trim();
}

const rows = Array.isArray(legacy.platforms) ? legacy.platforms : [];
const platformName = row => String(row.name || row.platform || '');
function resolvePlatform(name){
  const query=normalizeText(name);
  const exact=rows.find(row=>normalizeText(platformName(row))===query);
  if(exact)return exact;
  const loose=rows.filter(row=>{
    const n=normalizeText(platformName(row));
    return n && (n.includes(query)||query.includes(n));
  });
  if(loose.length===1)return loose[0];
  const aliases={
    'free code camp':['freecodecamp'],
    'w3 school':['w3schools','w3 school'],
    'solo learn':['sololearn','solo learn'],
    'edx':['edx'],
    'ibm skills build':['ibm skillsbuild','ibm skills build'],
    'nvidia':['nvidia'],
    'itu academy':['itu academy','itu akademi'],
    'hp life':['hp life'],
    'google skillshop':['google skillshop','google (skillshop)'],
    'openlearn.aucegypt.edu':['openlearn.aucegypt.edu','aucegypt openlearn','auc openlearn']
  };
  const candidates=aliases[query]||[];
  for(const candidate of candidates){
    const hit=rows.find(row=>normalizeText(platformName(row))===normalizeText(candidate));
    if(hit)return hit;
  }
  throw new Error(`Cannot resolve platform name from current catalog: ${name}`);
}
function resolveId(name){ return String(resolvePlatform(name).id); }

const categoryIdsUsed = unique(rows.map(row=>categoryId(row.category)));
const languageIdsUsed = unique(rows.flatMap(row=>(Array.isArray(row.languages)?row.languages:(row.language?[row.language]:[])).map(languageId)));

const categories = categoryIdsUsed.map((id,index)=>({
  id,
  label: CATEGORY_LABELS[id] || localized(id,id,id),
  icon: CATEGORY_ICONS[id] || '◇',
  enabled: true,
  displayOrder: (index+1)*10
}));
const languages = languageIdsUsed.map((id,index)=>({
  id,
  label: LANGUAGE_LABELS[id] || localized(id,id,id),
  enabled: true,
  displayOrder: (index+1)*10
}));

function migratePlatform(row){
  const brand=platformName(row);
  const langs=Array.isArray(row.languages)?row.languages:(row.language?[row.language]:[]);
  return {
    id:String(row.id),
    name:localized(brand,brand,brand),
    description:localized(row.description_ar || row.description || '', row.description_en || '', row.description_tr || ''),
    categoryId:categoryId(row.category),
    languageIds:unique(langs.map(languageId)),
    pricingModel:row.pricingModel || row.pricing_model || 'unknown',
    hasFreeContent:row.hasFreeContent === true || row.free === true,
    certificateAvailable:row.certificateAvailable === true || row.certificate === true,
    freeCertificate:row.freeCertificate === true || row.free_certificate === true,
    platformType:row.platformType || row.platform_type || '',
    officialUrl:row.officialUrl || row.official_url || row.link || '',
    catalogUrl:row.catalogUrl || row.catalog_url || row.link || '',
    logo:{src:row.logoUrl || row.logo_url || row.thumbnail || '',alt:localized(brand,brand,brand)},
    officialCount:row.officialCount ?? row.expected_count ?? null,
    officialCountType:row.officialCountType || row.expected_count_type || '',
    lastVerified:row.lastVerified || row.last_verified || null,
    editorial:{
      bestFor:{ar:row.best_for_ar || [],en:row.best_for_en || [],tr:row.best_for_tr || []},
      strengths:{ar:row.strengths_ar || [],en:row.strengths_en || [],tr:row.strengths_tr || []},
      limitations:{ar:row.limitations_ar || [],en:row.limitations_en || [],tr:row.limitations_tr || []}
    },
    featured:row.featured === true,
    displayOrder:row.displayOrder ?? row.display_order ?? null
  };
}

function seoLocalized(titleFor,descriptionFor,image){
  return Object.fromEntries(['ar','en','tr'].map(lang=>[lang,{
    title:titleFor(lang),
    description:descriptionFor(lang),
    ogTitle:titleFor(lang),
    ogDescription:descriptionFor(lang),
    ogImage:image
  }]));
}
const siteNameByLang = lang => textAt('siteName',lang) || ({ar:'دنيا الدورات',en:'Dunya Al-Dawrat',tr:'Dünya Kursları'}[lang]);
const homeDescriptionByLang = lang => textAt('landingHeroSubtitle',lang) || textAt('tagline',lang);
const exploreTitleByLang = lang => textAt('heroTitle',lang) || textAt('explorerTitle',lang) || siteNameByLang(lang);
const exploreDescriptionByLang = lang => textAt('explorerSubtitle',lang) || textAt('heroSubtitle',lang) || textAt('tagline',lang);

const PATHS={
  programming:[['Free Code Camp','W3 School','Solo Learn'],['HackerRank','GitHub Learn','Kaggle'],['Coursera','Edx','Udemy']],
  ai:[['Kaggle','DataCamp','Free Code Camp'],['IBM Skills Build','Nvidia','Google Cloud'],['Kaggle','MATLAB Academy','Coursera']],
  cyber:[['Cisco','Huawei','IBM Skills Build'],['Microsoft','Google Cloud','ITU Academy'],['Cisco','Huawei','Coursera']],
  business:[['HP Life','Coursera','Alison'],['HubSpot Academy','Semrush','Google (Skillshop)'],['Forage','Udemy','Coursera']],
  english:[['openlearn.aucegypt.edu','Open Learn','Khan Academy'],['Coursera','Edx','FutureLearn'],['Open Learn','Coursera','FutureLearn']]
};
const GOAL_LABEL_KEYS={programming:'goalProgramming',ai:'goalAI',cyber:'goalCyber',business:'goalBusiness',english:'goalEnglish'};
const learningPaths=Object.fromEntries(Object.entries(PATHS).map(([goal,stages])=>[goal,{
  label:locKey(GOAL_LABEL_KEYS[goal]),
  stages:stages.map(stage=>stage.map(resolveId))
}]));

const homeCloudNames=['Coursera','Edx','Kaggle','Free Code Camp','FutureLearn','IBM Skills Build'];
const homePlatformCloud=homeCloudNames.map(resolveId);

const data={
  settings:{
    siteName:localized(siteNameByLang('ar'),siteNameByLang('en'),siteNameByLang('tr')),
    developerName:localized('اتحاد شباب الأمة','Ummah Youth Union','Ümmet Gençleri Birliği'),
    copyright:locKey('footer'),
    defaultLanguage:'ar',
    localeNames:{ar:'العربية',en:'English',tr:'Türkçe'},
    themeColor:'#4f46e5',
    links:{home:'index.html',explore:'explore.html',about:'#aboutProject',howItWorks:'#howItWorks',developer:'#developerSection',developerExternal:''},
    featuredFallbackIds:['plat-26','plat-25','plat-3','plat-7','plat-34','plat-30'],
    homePlatformCloud
  },
  assets:{
    brandLogo:{src:'assets/dunya-logo-hero-v3.webp',alt:localized('شعار دنيا الدورات','Dunya Al-Dawrat logo','Dünya Kursları logosu')},
    favicon:{src:'assets/dunya-logo-192.png',alt:localized('أيقونة دنيا الدورات','Dunya Al-Dawrat icon','Dünya Kursları simgesi')},
    heroLogo:{src:'assets/dunya-logo-hero-v3.webp',alt:localized('شعار دنيا الدورات','Dunya Al-Dawrat logo','Dünya Kursları logosu')},
    platformFallbackLogo:{src:'icon.svg',alt:localized('شعار المنصة','Platform logo','Platform logosu')},
    icons:{search:'⌕',check:'✓',compare:'⚖',quiz:'✨',random:'🎲',path:'🧭',install:'⬇',favoriteOn:'♥',favoriteOff:'♡',share:'↗',external:'↗',reset:'↺',close:'×',developer:'✦',back:'←',themeLight:'☀',themeDark:'◐'}
  },
  seo:{
    home:seoLocalized(lang=>siteNameByLang(lang),homeDescriptionByLang,'assets/dunya-logo-hero-v3.webp'),
    explore:seoLocalized(lang=>`${exploreTitleByLang(lang)} — ${siteNameByLang(lang)}`,exploreDescriptionByLang,'assets/dunya-logo-hero-v3.webp'),
    platform:seoLocalized(lang=>`{platform} — ${siteNameByLang(lang)}`,lang=>textAt('tagline',lang) || exploreDescriptionByLang(lang),'assets/dunya-logo-hero-v3.webp')
  },
  siteText:migrateSiteText(),
  categories,
  languages,
  quiz:{
    quickFilters:[
      {id:'free',type:'free',targetId:'',label:locKey('chipFree'),icon:'✓'},
      {id:'certificate',type:'certificate',targetId:'',label:locKey('chipCertificate'),icon:'✓'},
      {id:'arabic',type:'language',targetId:'Arabic',label:locKey('chipArabic'),icon:'ع'},
      {id:'english',type:'language',targetId:'English',label:locKey('chipEnglish'),icon:'EN'},
      {id:'technology',type:'category',targetId:'technology',label:locKey('chipTechnology'),icon:'⌘'},
      {id:'business',type:'category',targetId:categoryIdsUsed.includes('business')?'business':'business_marketing',label:locKey('chipBusiness'),icon:'↗'}
    ],
    questions:[
      {id:'category',type:'category',label:locKey('qCategory'),anyLabel:locKey('anyCategory')},
      {id:'language',type:'language',label:locKey('qLanguage'),anyLabel:locKey('anyLanguage')},
      {id:'free',type:'choice',label:locKey('qBudget'),options:[{id:'yes',label:locKey('freePreferred')},{id:'any',label:locKey('paidOkay')}]},
      {id:'certificate',type:'choice',label:locKey('qCertificate'),options:[{id:'yes',label:locKey('certImportant')},{id:'any',label:locKey('certNotImportant')}]}
    ],
    resultsTitle:locKey('quizResults'),
    matchLabel:locKey('match'),
    showResultsLabel:locKey('showResults'),
    learningPaths
  },
  comparison:{maxPlatforms:3,emptyValue:'—'},
  platforms:rows.map(migratePlatform)
};

validateStableReferences(validateContentData(data));
fs.writeFileSync(path,JSON.stringify(data,null,2)+'\n');
console.log(`Migrated ${data.platforms.length} platforms to full CMS schema`);
