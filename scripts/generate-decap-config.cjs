const fs = require('node:fs');

const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
const langs = [
  ['ar', 'العربية'],
  ['en', 'English'],
  ['tr', 'Türkçe']
];

function q(value){
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function textFields(lang, indent){
  const keys = Object.keys(data.siteText[lang] || {}).sort();
  return keys.map(key => `${indent}- { label: ${q(key)}, name: ${q(key)}, widget: string }`).join('\n');
}

function listField(label, name, indent='              '){
  return `${indent}- label: ${q(label)}\n${indent}  name: ${q(name)}\n${indent}  widget: list\n${indent}  required: false\n${indent}  field: { label: ${q('Value')}, name: ${q('value')}, widget: string }`;
}

const languageObjects = langs.map(([name,label]) => `              - label: ${q(label)}\n                name: ${q(name)}\n                widget: object\n                collapsed: true\n                fields:\n${textFields(name, '                  ')}`).join('\n');

const platformLists = [
  ['مناسب لـ — عربي','best_for_ar'],['Best for — English','best_for_en'],['Uygun — Türkçe','best_for_tr'],
  ['نقاط القوة — عربي','strengths_ar'],['Strengths — English','strengths_en'],['Güçlü yönler — Türkçe','strengths_tr'],
  ['القيود — عربي','limitations_ar'],['Limitations — English','limitations_en'],['Sınırlamalar — Türkçe','limitations_tr']
].map(([label,name])=>listField(label,name)).join('\n');

const config = `backend:
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
  - label: ${q('بيانات دنيا الدورات')}
    name: site_data
    files:
      - label: ${q('النصوص والمنصات')}
        name: site_data
        file: data.json
        fields:
          - label: ${q('نصوص الموقع')}
            name: siteText
            widget: object
            collapsed: true
            fields:
${languageObjects}
          - label: ${q('المنصات')}
            name: platforms
            widget: list
            summary: ${q('{{fields.name}}')}
            fields:
              - { label: ${q('ID')}, name: id, widget: string }
              - { label: ${q('اسم المنصة')}, name: name, widget: string }
              - { label: ${q('الوصف العربي')}, name: description_ar, widget: text, required: false }
              - { label: ${q('English description')}, name: description_en, widget: text, required: false }
              - { label: ${q('Türkçe açıklama')}, name: description_tr, widget: text, required: false }
              - { label: ${q('التصنيف')}, name: category, widget: string }
              - label: ${q('حالة السعر')}
                name: pricingModel
                widget: select
                options:
                  - { label: ${q('مجاني')}, value: free }
                  - { label: ${q('مجاني جزئيًا')}, value: freemium }
                  - { label: ${q('مدفوع')}, value: paid }
                  - { label: ${q('مختلط')}, value: mixed }
              - { label: ${q('يوفر محتوى مجاني')}, name: hasFreeContent, widget: boolean, default: false }
              - { label: ${q('يوفر شهادات')}, name: certificateAvailable, widget: boolean, default: false }
              - { label: ${q('الشهادات مجانية')}, name: freeCertificate, widget: boolean, default: false }
              - label: ${q('اللغات')}
                name: languages
                widget: list
                required: false
                field: { label: ${q('اللغة')}, name: ${q('value')}, widget: string }
              - { label: ${q('نوع المنصة')}, name: platformType, widget: string, required: false }
              - { label: ${q('الموقع الرسمي')}, name: officialUrl, widget: string, required: false }
              - { label: ${q('رابط الكتالوج')}, name: catalogUrl, widget: string, required: false }
              - { label: ${q('رابط الشعار')}, name: logoUrl, widget: string, required: false }
              - { label: ${q('عدد المحتوى الرسمي')}, name: officialCount, widget: number, value_type: int, required: false }
              - label: ${q('نوع العدد الرسمي')}
                name: officialCountType
                widget: select
                required: false
                options:
                  - { label: courses, value: courses }
                  - { label: modules, value: modules }
                  - { label: learning_paths, value: learning_paths }
                  - { label: job_simulations, value: job_simulations }
                  - { label: certifications, value: certifications }
                  - { label: materials, value: materials }
                  - { label: items, value: items }
              - { label: ${q('آخر تحقق')}, name: lastVerified, widget: datetime, format: ${q('YYYY-MM-DD')}, date_format: ${q('YYYY-MM-DD')}, time_format: false, required: false }
${platformLists}
              - { label: ${q('منصة مميزة')}, name: featured, widget: boolean, default: false }
              - { label: ${q('ترتيب العرض')}, name: displayOrder, widget: number, value_type: int, required: false }
`;

const path = 'admin/config.yml';
if(process.argv.includes('--check')){
  const existing = fs.existsSync(path) ? fs.readFileSync(path,'utf8') : '';
  if(existing !== config){
    console.error(`${path} is not generated from the current data.json schema`);
    process.exit(1);
  }
  console.log(`${path} is current`);
}else{
  fs.mkdirSync('admin',{recursive:true});
  fs.writeFileSync(path,config);
  console.log(`Generated ${path} with ${langs.map(([lang])=>Object.keys(data.siteText[lang]||{}).length).join('/')} editable text fields`);
}
