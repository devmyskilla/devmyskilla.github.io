const fs=require('node:fs');
const {isLocalized,validateContentData,validateStableReferences}=require('./content-schema.cjs');
const data=validateStableReferences(validateContentData(JSON.parse(fs.readFileSync('data.json','utf8'))));
const langs=[['ar','العربية'],['en','English'],['tr','Türkçe']];

function q(value){return `"${String(value).replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,'\\n')}"`}
function pad(n){return' '.repeat(n)}
function scalar(label,name,widget='string',indent=0,extra=[]){
  const lines=[`${pad(indent)}- label: ${q(label)}`,`${pad(indent)}  name: ${name}`,`${pad(indent)}  widget: ${widget}`];
  for(const line of extra)lines.push(`${pad(indent)}  ${line}`);
  return lines.join('\n');
}
function localizedField(label,name,indent=0,{widget='string',required=true}={}){
  const out=[`${pad(indent)}- label: ${q(label)}`,`${pad(indent)}  name: ${name}`,`${pad(indent)}  widget: object`,`${pad(indent)}  collapsed: true`,`${pad(indent)}  fields:`];
  for(const [code,langLabel] of langs){
    out.push(`${pad(indent+4)}- label: ${q(langLabel)}`);
    out.push(`${pad(indent+4)}  name: ${code}`);
    out.push(`${pad(indent+4)}  widget: ${widget}`);
    if(!required)out.push(`${pad(indent+4)}  required: false`);
  }
  return out.join('\n');
}
function stringList(label,name,indent=0,{required=false,hint=''}={}){
  const out=[`${pad(indent)}- label: ${q(label)}`,`${pad(indent)}  name: ${name}`,`${pad(indent)}  widget: list`];
  if(!required)out.push(`${pad(indent)}  required: false`);
  if(hint)out.push(`${pad(indent)}  hint: ${q(hint)}`);
  out.push(`${pad(indent)}  field: { label: ${q('Value')}, name: value, widget: string }`);
  return out.join('\n');
}
function localizedList(label,name,indent=0){
  const out=[`${pad(indent)}- label: ${q(label)}`,`${pad(indent)}  name: ${name}`,`${pad(indent)}  widget: object`,`${pad(indent)}  collapsed: true`,`${pad(indent)}  fields:`];
  for(const [code,langLabel] of langs)out.push(stringList(langLabel,code,indent+4));
  return out.join('\n');
}
function objectStart(label,name,indent=0,collapsed=true){return[`${pad(indent)}- label: ${q(label)}`,`${pad(indent)}  name: ${name}`,`${pad(indent)}  widget: object`,`${pad(indent)}  collapsed: ${collapsed}`,`${pad(indent)}  fields:`].join('\n')}
function renderTextTree(label,name,value,indent=0){
  if(isLocalized(value))return localizedField(label,name,indent,{widget:String(Object.values(value).some(v=>String(v).length>120)?'text':'string')});
  if(value&&typeof value==='object'&&!Array.isArray(value)){
    const out=[objectStart(label,name,indent,true)];
    for(const key of Object.keys(value).sort())out.push(renderTextTree(key,key,value[key],indent+4));
    return out.join('\n');
  }
  return scalar(label,name,'string',indent,['required: false']);
}
function assetField(label,name,indent=0){
  return [objectStart(label,name,indent,true),scalar('الصورة / Image','src','image',indent+4,['required: false']),localizedField('النص البديل / Alt text','alt',indent+4,{required:false})].join('\n');
}
function seoPage(page,indent=0){
  const out=[objectStart(page,page,indent,true)];
  for(const [code,label] of langs){
    out.push(objectStart(label,code,indent+4,true));
    out.push(scalar('Page title','title','string',indent+8));
    out.push(scalar('Meta description','description','text',indent+8));
    out.push(scalar('Open Graph title','ogTitle','string',indent+8));
    out.push(scalar('Open Graph description','ogDescription','text',indent+8));
    out.push(scalar('Open Graph image','ogImage','image',indent+8,['required: false']));
  }
  return out.join('\n');
}
function settingsFields(indent){
  const out=[];
  out.push(localizedField('اسم الموقع','siteName',indent));
  out.push(localizedField('اسم الجهة المطورة','developerName',indent));
  out.push(localizedField('حقوق النشر','copyright',indent));
  out.push(`${pad(indent)}- label: ${q('اللغة الافتراضية')}\n${pad(indent)}  name: defaultLanguage\n${pad(indent)}  widget: select\n${pad(indent)}  options:\n${pad(indent+4)}- { label: ${q('العربية')}, value: ar }\n${pad(indent+4)}- { label: ${q('English')}, value: en }\n${pad(indent+4)}- { label: ${q('Türkçe')}, value: tr }`);
  out.push(objectStart('أسماء اللغات في المحول','localeNames',indent,true));
  out.push(scalar('العربية','ar','string',indent+4));out.push(scalar('English','en','string',indent+4));out.push(scalar('Türkçe','tr','string',indent+4));
  out.push(scalar('لون الواجهة الرئيسي','themeColor','string',indent,['hint: "Hex color such as #4f46e5"']));
  out.push(objectStart('الروابط العامة','links',indent,true));
  for(const key of Object.keys(data.settings.links||{}).sort())out.push(scalar(key,key,'string',indent+4,['required: false']));
  out.push(stringList('معرفات المنصات المميزة الاحتياطية','featuredFallbackIds',indent,{hint:'Stable platform IDs'}));
  out.push(stringList('منصات السحابة البصرية','homePlatformCloud',indent,{hint:'Stable platform IDs'}));
  return out.join('\n');
}
function assetsFields(indent){
  const out=[];
  for(const key of ['brandLogo','favicon','heroLogo','platformFallbackLogo'])if(data.assets[key])out.push(assetField(key,key,indent));
  out.push(objectStart('الأيقونات القابلة للتحرير','icons',indent,true));
  for(const key of Object.keys(data.assets.icons||{}).sort())out.push(scalar(key,key,'string',indent+4,['required: false']));
  return out.join('\n');
}
function taxonomyField(label,name,indent){
  const out=[`${pad(indent)}- label: ${q(label)}`,`${pad(indent)}  name: ${name}`,`${pad(indent)}  widget: list`,`${pad(indent)}  summary: ${q('{{fields.id}}')}`,`${pad(indent)}  fields:`];
  out.push(scalar('معرّف تقني — لا تغيّره بعد النشر','id','string',indent+4,['hint: "Stable ID used by platform references"']));
  out.push(localizedField('الاسم المترجم','label',indent+4));
  if(name==='categories')out.push(scalar('الأيقونة','icon','string',indent+4,['required: false']));
  out.push(scalar('مفعّل','enabled','boolean',indent+4,['default: true']));
  out.push(scalar('ترتيب العرض','displayOrder','number',indent+4,['value_type: int','required: false']));
  return out.join('\n');
}
function quizFields(indent){
  const out=[];
  out.push(`${pad(indent)}- label: ${q('الفلاتر السريعة')}\n${pad(indent)}  name: quickFilters\n${pad(indent)}  widget: list\n${pad(indent)}  fields:`);
  out.push(scalar('ID','id','string',indent+4));
  out.push(`${pad(indent+4)}- label: ${q('النوع')}\n${pad(indent+4)}  name: type\n${pad(indent+4)}  widget: select\n${pad(indent+4)}  options: [free, certificate, category, language]`);
  out.push(scalar('Target ID','targetId','string',indent+4,['required: false']));
  out.push(localizedField('النص','label',indent+4));
  out.push(scalar('الأيقونة','icon','string',indent+4,['required: false']));
  out.push(`${pad(indent)}- label: ${q('أسئلة الاختبار')}\n${pad(indent)}  name: questions\n${pad(indent)}  widget: list\n${pad(indent)}  summary: ${q('{{fields.id}}')}\n${pad(indent)}  fields:`);
  out.push(scalar('ID','id','string',indent+4));
  out.push(`${pad(indent+4)}- label: ${q('النوع')}\n${pad(indent+4)}  name: type\n${pad(indent+4)}  widget: select\n${pad(indent+4)}  options: [category, language, choice]`);
  out.push(localizedField('السؤال','label',indent+4));
  out.push(localizedField('خيار الكل','anyLabel',indent+4,{required:false}));
  out.push(`${pad(indent+4)}- label: ${q('الخيارات')}\n${pad(indent+4)}  name: options\n${pad(indent+4)}  widget: list\n${pad(indent+4)}  required: false\n${pad(indent+4)}  fields:`);
  out.push(scalar('ID','id','string',indent+8));out.push(localizedField('النص','label',indent+8));
  out.push(localizedField('عنوان النتائج','resultsTitle',indent));
  out.push(localizedField('نص نسبة التوافق','matchLabel',indent));
  out.push(localizedField('زر عرض النتائج','showResultsLabel',indent));
  out.push(objectStart('المسارات التعليمية','learningPaths',indent,true));
  for(const goal of Object.keys(data.quiz.learningPaths||{}).sort()){
    out.push(objectStart(goal,goal,indent+4,true));
    out.push(localizedField('اسم الهدف','label',indent+8));
    out.push(`${pad(indent+8)}- label: ${q('المراحل')}\n${pad(indent+8)}  name: stages\n${pad(indent+8)}  widget: list\n${pad(indent+8)}  field:\n${pad(indent+12)}label: ${q('معرفات المنصات في المرحلة')}\n${pad(indent+12)}name: value\n${pad(indent+12)}widget: list\n${pad(indent+12)}field: { label: ${q('Platform ID')}, name: value, widget: string }`);
  }
  return out.join('\n');
}
function comparisonFields(indent){
  return [scalar('الحد الأقصى للمقارنة','maxPlatforms','number',indent,['value_type: int']),scalar('رمز القيمة الفارغة','emptyValue','string',indent)].join('\n');
}
function editorialFields(indent){
  const out=[objectStart('المحتوى التحريري','editorial',indent,true)];
  out.push(localizedList('مناسب لـ','bestFor',indent+4));
  out.push(localizedList('نقاط القوة','strengths',indent+4));
  out.push(localizedList('القيود','limitations',indent+4));
  return out.join('\n');
}
function platformResearchFields(indent){
  const out=[];
  out.push(`${pad(indent)}- label: ${q('المجالات / Fields')}\n${pad(indent)}  name: fields\n${pad(indent)}  widget: list\n${pad(indent)}  required: false\n${pad(indent)}  summary: ${q('{{fields.id}} — {{fields.name.en}}')}\n${pad(indent)}  fields:`);
  out.push(scalar('معرّف المجال الثابت','id','string',indent+4,['hint: "Stable field ID"']));
  out.push(localizedField('اسم المجال','name',indent+4));
  out.push(scalar('رابط المجال الرسمي','officialUrl','string',indent+4,['required: false']));
  out.push(`${pad(indent)}- label: ${q('المسارات الرسمية / Official Paths')}\n${pad(indent)}  name: officialPaths\n${pad(indent)}  widget: list\n${pad(indent)}  required: false\n${pad(indent)}  summary: ${q('{{fields.officialName}}')}\n${pad(indent)}  fields:`);
  out.push(scalar('معرّف المسار الثابت','id','string',indent+4,['hint: "Stable path ID"']));
  out.push(scalar('الاسم الرسمي الأصلي','officialName','string',indent+4));
  out.push(localizedField('اسم العرض المترجم','name',indent+4));
  out.push(`${pad(indent+4)}- label: ${q('نوع المسار')}\n${pad(indent+4)}  name: type\n${pad(indent+4)}  widget: select\n${pad(indent+4)}  options: [learning-path, career-path, skill-path, professional-certificate, professional-program, specialization, role-path, structured-series, other-official-path]`);
  out.push(scalar('الرابط الرسمي المباشر','officialUrl','string',indent+4));
  out.push(stringList('معرّفات المجالات المرتبطة','fieldIds',indent+4,{hint:'IDs from this platform fields list'}));
  out.push(scalar('مسار مميز','featured','boolean',indent+4,['default: false']));
  out.push(`${pad(indent)}- label: ${q('بيانات التحقق من المسارات')}\n${pad(indent)}  name: pathResearch\n${pad(indent)}  widget: object\n${pad(indent)}  collapsed: true\n${pad(indent)}  required: false\n${pad(indent)}  fields:`);
  out.push(scalar('آخر تحقق','lastVerified','datetime',indent+4,['format: "YYYY-MM-DD"','date_format: "YYYY-MM-DD"','time_format: false','required: false']));
  out.push(scalar('مصدر المجالات','fieldsSourceUrl','string',indent+4,['required: false']));
  out.push(scalar('مصدر المسارات','pathsSourceUrl','string',indent+4,['required: false']));
  out.push(scalar('رابط جميع المسارات','allPathsUrl','string',indent+4,['required: false']));
  return out.join('\n');
}
function platformFields(indent){
  const out=[];
  out.push(scalar('معرّف تقني — لا تغيّره بعد النشر','id','string',indent,['hint: "Stable platform ID"']));
  out.push(localizedField('اسم المنصة','name',indent));
  out.push(localizedField('الوصف','description',indent,{widget:'text',required:false}));
  out.push(scalar('معرّف التصنيف','categoryId','string',indent,['hint: "Use an ID from التصنيفات"']));
  out.push(stringList('معرفات اللغات','languageIds',indent,{hint:'Use IDs from اللغات'}));
  out.push(`${pad(indent)}- label: ${q('حالة السعر')}\n${pad(indent)}  name: pricingModel\n${pad(indent)}  widget: select\n${pad(indent)}  options: [free, freemium, paid, mixed, unknown]`);
  out.push(scalar('يوفر محتوى مجاني','hasFreeContent','boolean',indent,['default: false']));
  out.push(scalar('يوفر شهادات','certificateAvailable','boolean',indent,['default: false']));
  out.push(scalar('الشهادات مجانية','freeCertificate','boolean',indent,['default: false']));
  out.push(scalar('نوع المنصة','platformType','string',indent,['required: false']));
  out.push(scalar('الموقع الرسمي','officialUrl','string',indent,['required: false']));
  out.push(scalar('رابط الكتالوج','catalogUrl','string',indent,['required: false']));
  out.push(objectStart('شعار المنصة','logo',indent,true));
  out.push(scalar('الصورة','src','image',indent+4,['required: false']));
  out.push(localizedField('النص البديل','alt',indent+4,{required:false}));
  out.push(scalar('عدد المحتوى الرسمي','officialCount','number',indent,['value_type: int','required: false']));
  out.push(`${pad(indent)}- label: ${q('نوع العدد الرسمي')}\n${pad(indent)}  name: officialCountType\n${pad(indent)}  widget: select\n${pad(indent)}  required: false\n${pad(indent)}  options: [courses, modules, learning_paths, job_simulations, certifications, materials, items]`);
  out.push(scalar('آخر تحقق','lastVerified','datetime',indent,['format: "YYYY-MM-DD"','date_format: "YYYY-MM-DD"','time_format: false','required: false']));
  out.push(platformResearchFields(indent));
  out.push(editorialFields(indent));
  out.push(scalar('منصة مميزة','featured','boolean',indent,['default: false']));
  out.push(scalar('ترتيب العرض','displayOrder','number',indent,['value_type: int','required: false']));
  return out.join('\n');
}

const fields=[];
fields.push(objectStart('إعدادات الموقع','settings',10,false));fields.push(settingsFields(14));
fields.push(objectStart('الهوية والصور','assets',10,true));fields.push(assetsFields(14));
fields.push(objectStart('نصوص الموقع','siteText',10,true));for(const group of Object.keys(data.siteText).sort())fields.push(renderTextTree(group,group,data.siteText[group],14));
fields.push(taxonomyField('التصنيفات','categories',10));
fields.push(taxonomyField('اللغات','languages',10));
fields.push(objectStart('الاختبار والترشيحات','quiz',10,true));fields.push(quizFields(14));
fields.push(objectStart('المقارنة','comparison',10,true));fields.push(comparisonFields(14));
fields.push(objectStart('SEO','seo',10,true));for(const page of ['home','explore','platform'])fields.push(seoPage(page,14));
fields.push(`${pad(10)}- label: ${q('المنصات')}\n${pad(10)}  name: platforms\n${pad(10)}  widget: list\n${pad(10)}  summary: ${q('{{fields.id}} — {{fields.name.en}}')}\n${pad(10)}  fields:`);fields.push(platformFields(14));

const config=`backend:
  name: github
  repo: devmyskilla/devmyskilla.github.io
  branch: main
  base_url: https://dunya-decap-oauth.atomy8774.workers.dev
  auth_endpoint: auth

site_url: https://devmyskilla.github.io
logo_url: https://devmyskilla.github.io/assets/dunya-logo-192.png
publish_mode: simple
media_folder: assets/uploads
public_folder: /assets/uploads

collections:
  - label: ${q('إدارة دنيا الدورات')}
    name: site_data
    files:
      - label: ${q('محتوى وإعدادات الموقع')}
        name: site_data
        file: data.json
        fields:
${fields.join('\n')}
`;

const path='admin/config.yml';
if(process.argv.includes('--check')){
  const existing=fs.existsSync(path)?fs.readFileSync(path,'utf8'):'';
  if(existing!==config){console.error(`${path} is not generated from the current data.json schema`);process.exit(1)}
  console.log(`${path} is current`);
}else{
  fs.mkdirSync('admin',{recursive:true});fs.writeFileSync(path,config);console.log(`Generated ${path} for full CMS control of ${data.platforms.length} platforms`);
}
