const fs=require('node:fs');
const path='js/app.js';
let src=fs.readFileSync(path,'utf8');
function replaceOne(from,to,label){
  const count=src.split(from).length-1;
  if(count!==1)throw new Error(`${label}: expected exactly one match, found ${count}`);
  src=src.replace(from,to);
}
replaceOne("let allPlatforms=[];let activeTab='all';let deferredInstallPrompt=null;let siteData=null;","let allPlatforms=[];let activeTab='all';let deferredInstallPrompt=null;let siteData=null;let inlineEditor=null;",'state');
replaceOne('<div class="badge-row"><span class="tag">${esc(content.categoryLabel(p.categoryId))}</span>${verificationBadge}</div><a class="title-link" href="${detailUrl(p)}"><h3>${esc(name)}</h3></a>${compact?\'\':`<p class="platform-desc">${esc(descriptionFor(p))}</p>`}', '<div class="badge-row"><span class="tag" data-edit-kind="category" data-edit-id="${esc(p.categoryId)}" data-edit-field="label">${esc(content.categoryLabel(p.categoryId))}</span>${verificationBadge}</div><a class="title-link" href="${detailUrl(p)}"><h3 data-edit-kind="platform" data-edit-id="${esc(p.id)}" data-edit-field="name">${esc(name)}</h3></a>${compact?\'\':`<p class="platform-desc" data-edit-kind="platform" data-edit-id="${esc(p.id)}" data-edit-field="description">${esc(descriptionFor(p))}</p>`}', 'platform card text');
replaceOne('<a class="btn-inline official" href="${esc(official)}" target="_blank" rel="noopener noreferrer">${esc(getText(\'officialSite\'))} ${esc(externalIcon)}</a>', '<a class="btn-inline official" href="${esc(official)}" target="_blank" rel="noopener noreferrer" data-edit-kind="platform" data-edit-id="${esc(p.id)}" data-edit-field="officialUrl">${esc(getText(\'officialSite\'))} ${esc(externalIcon)}</a>', 'official url');
replaceOne('<strong>${esc(content.categoryLabel(g.categoryId))}</strong>', '<strong data-edit-kind="category" data-edit-id="${esc(g.categoryId)}" data-edit-field="label">${esc(content.categoryLabel(g.categoryId))}</strong>', 'category label');
const append=`\nasync function initInlineEditorApp(){\n  if(typeof InlineEditor==='undefined'||!InlineEditor.isEditRequested(location))return;\n  for(let i=0;i<100&&(!siteData||!content);i++)await new Promise(resolve=>setTimeout(resolve,25));\n  if(!siteData||!content)return;\n  inlineEditor=InlineEditor.create({document,location,data:siteData,content,onDataChange(next){\n    siteData=next;initContent(siteData);setLang(currentLang);allPlatforms=siteData.platforms.map(PlatformCore.normalizeStaticPlatform);\n    SiteRuntime.applyDocument(document,content,'explore');hydrateFilterOptions();renderQuickFilters();renderPlatformCloud();rerender();\n    setTimeout(()=>inlineEditor&&inlineEditor.refreshTargets(),0);\n  }});\n  await inlineEditor.init();\n}\nif(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',()=>initInlineEditorApp().catch(err=>console.error(err)));\n`;
if(src.includes('async function initInlineEditorApp()'))throw new Error('inline editor app integration already present');
src+=append;
fs.writeFileSync(path,src);
