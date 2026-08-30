const i18n = {
  ar:{errorLoading:'تعذر تحميل المنصات',unknown:'غير معروف'},
  en:{errorLoading:'Unable to load platforms',unknown:'Unknown'},
  tr:{errorLoading:'Platformlar yüklenemedi',unknown:'Bilinmiyor'}
};

const catMap = {
  'برمجة وبيانات':{ar:'برمجة وبيانات',en:'Programming & Data',tr:'Programlama & Veri'},'تكنولوجيا':{ar:'تكنولوجيا',en:'Technology',tr:'Teknoloji'},'تسويق وأعمال':{ar:'تسويق وأعمال',en:'Business & Marketing',tr:'İş & Pazarlama'},'تعليم':{ar:'تعليم وأكاديمي',en:'Education & Academic',tr:'Eğitim & Akademik'},'لغات':{ar:'لغات',en:'Languages',tr:'Diller'},technology:{ar:'تكنولوجيا',en:'Technology',tr:'Teknoloji'},data_ai:{ar:'البيانات والذكاء الاصطناعي',en:'Data & AI',tr:'Veri & Yapay Zeka'},business:{ar:'الأعمال والتسويق',en:'Business & Marketing',tr:'İş & Pazarlama'},languages:{ar:'اللغات',en:'Languages',tr:'Diller'},academic:{ar:'جامعي وأكاديمي',en:'University & Academic',tr:'Üniversite & Akademik'},career:{ar:'مهارات مهنية',en:'Career & Professional',tr:'Kariyer & Profesyonel'},education:{ar:'تعليم',en:'Education',tr:'Eğitim'}
};
const langMap = {'إنجليزي':{ar:'إنجليزي',en:'English',tr:'İngilizce'},'عربي':{ar:'عربي',en:'Arabic',tr:'Arapça'},'عربي/إنجليزي':{ar:'عربي/إنجليزي',en:'Arabic/English',tr:'Arapça/İngilizce'},'متعدد اللغات':{ar:'متعدد اللغات',en:'Multilingual',tr:'Çok dilli'},'إنجليزي/فرنسي':{ar:'إنجليزي/فرنسي',en:'English/French',tr:'İngilizce/Fransızca'},'تركي':{ar:'تركي',en:'Turkish',tr:'Türkçe'},English:{ar:'الإنجليزية',en:'English',tr:'İngilizce'},Arabic:{ar:'العربية',en:'Arabic',tr:'Arapça'},Turkish:{ar:'التركية',en:'Turkish',tr:'Türkçe'},French:{ar:'الفرنسية',en:'French',tr:'Fransızca'}};

let currentLang='ar';
try{currentLang=localStorage.getItem('dunya-lang')||'ar'}catch(_){}

function mergeSiteText(siteText={}){
  for(const lang of ['ar','en','tr']){
    if(siteText[lang] && typeof siteText[lang]==='object' && !Array.isArray(siteText[lang])){
      i18n[lang]={...i18n[lang],...siteText[lang]};
    }
  }
}
function getText(key){return (i18n[currentLang]&&i18n[currentLang][key])||(i18n.en&&i18n.en[key])||key}
function setLang(lang){if(!i18n[lang])lang='ar';currentLang=lang;try{localStorage.setItem('dunya-lang',lang)}catch(_){};if(typeof document!=='undefined'){document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr'}}
function applyTranslations(){if(typeof document==='undefined')return;document.querySelectorAll('[data-i18n]').forEach(el=>{const v=getText(el.dataset.i18n);if(v!==undefined)el.textContent=v});document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{el.placeholder=getText(el.dataset.i18nPlaceholder)})}
function translateCat(cat){return catMap[cat]?catMap[cat][currentLang]:cat||getText('unknown')}
function translateLang(lang){return langMap[lang]?langMap[lang][currentLang]:lang||getText('unknown')}
function translatePricing(model){return getText(model==='free'?'pricing_free_display':'pricing_'+(model||'unknown'))}
function translateVerification(state){if(!state||state==='unverified')return'';return getText('verification_'+state)}
function pf(p,field){if(!p)return'';const localized=p[field+'_'+currentLang];if(localized)return localized;if(field==='description')return p.description_en||p.description_ar||p.description||'';return p[field]||''}
