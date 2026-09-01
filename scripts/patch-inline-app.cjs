const fs=require('node:fs');

function patchFile(path,patcher){
  let source=fs.readFileSync(path,'utf8');
  const tools={
    replaceOne(from,to,label){
      const count=source.split(from).length-1;
      if(count!==1)throw new Error(`${path} ${label}: expected exactly one match, found ${count}`);
      source=source.replace(from,to);
    },
    append(text){source+=text;},
    includes(text){return source.includes(text);}
  };
  patcher(tools);
  fs.writeFileSync(path,source);
}

patchFile('js/app.js',({replaceOne,append,includes})=>{
  replaceOne("let allPlatforms=[];let activeTab='all';let deferredInstallPrompt=null;let siteData=null;","let allPlatforms=[];let activeTab='all';let deferredInstallPrompt=null;let siteData=null;let inlineEditor=null;",'state');
  replaceOne('<div class="badge-row"><span class="tag">${esc(content.categoryLabel(p.categoryId))}</span>${verificationBadge}</div><a class="title-link" href="${detailUrl(p)}"><h3>${esc(name)}</h3></a>${compact?\'\':`<p class="platform-desc">${esc(descriptionFor(p))}</p>`}', '<div class="badge-row"><span class="tag" data-edit-kind="category" data-edit-id="${esc(p.categoryId)}" data-edit-field="label">${esc(content.categoryLabel(p.categoryId))}</span>${verificationBadge}</div><a class="title-link" href="${detailUrl(p)}"><h3 data-edit-kind="platform" data-edit-id="${esc(p.id)}" data-edit-field="name">${esc(name)}</h3></a>${compact?\'\':`<p class="platform-desc" data-edit-kind="platform" data-edit-id="${esc(p.id)}" data-edit-field="description">${esc(descriptionFor(p))}</p>`}', 'platform card text');
  replaceOne('<a class="btn-inline official" href="${esc(official)}" target="_blank" rel="noopener noreferrer">${esc(getText(\'officialSite\'))} ${esc(externalIcon)}</a>', '<a class="btn-inline official" href="${esc(official)}" target="_blank" rel="noopener noreferrer" data-edit-kind="platform" data-edit-id="${esc(p.id)}" data-edit-field="officialUrl">${esc(getText(\'officialSite\'))} ${esc(externalIcon)}</a>', 'official url');
  replaceOne('<strong>${esc(content.categoryLabel(g.categoryId))}</strong>', '<strong data-edit-kind="category" data-edit-id="${esc(g.categoryId)}" data-edit-field="label">${esc(content.categoryLabel(g.categoryId))}</strong>', 'category label');
  if(includes('async function initInlineEditorApp()'))throw new Error('js/app.js inline editor integration already present');
  append(`\nasync function initInlineEditorApp(){\n  if(typeof InlineEditor==='undefined'||!InlineEditor.isEditRequested(location))return;\n  for(let i=0;i<100&&(!siteData||!content);i++)await new Promise(resolve=>setTimeout(resolve,25));\n  if(!siteData||!content)return;\n  inlineEditor=InlineEditor.create({document,location,data:siteData,content,onDataChange(next){\n    siteData=next;initContent(siteData);setLang(currentLang);allPlatforms=siteData.platforms.map(PlatformCore.normalizeStaticPlatform);\n    SiteRuntime.applyDocument(document,content,'explore');hydrateFilterOptions();renderQuickFilters();renderPlatformCloud();rerender();\n    setTimeout(()=>inlineEditor&&inlineEditor.refreshTargets(),0);\n  }});\n  await inlineEditor.init();\n}\nif(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',()=>initInlineEditorApp().catch(err=>console.error(err)));\n`);
});

patchFile('js/platform-detail.js',({replaceOne})=>{
  replaceOne('function listSection(title,items,cssClass,platformId,field){if(!items.length)return\'\';return`<section class="profile-panel ${cssClass}"><h2>${esc(title)}</h2><ul data-edit-kind="platform" data-edit-id="${esc(platformId)}" data-edit-field="${esc(field)}">${items.map(item=>`<li>${esc(item)}</li>`).join(\'\')}</ul></section>`}', 'function listSection(title,items,cssClass,platformId,fieldAttr){if(!items.length)return\'\';return`<section class="profile-panel ${cssClass}"><h2>${esc(title)}</h2><ul data-edit-kind="platform" data-edit-id="${esc(platformId)}" ${fieldAttr}>${items.map(item=>`<li>${esc(item)}</li>`).join(\'\')}</ul></section>`}', 'editorial helper');
  replaceOne("listSection(getText('bestFor'),model.bestFor,'best-for',platform.id,'editorial.bestFor')","listSection(getText('bestFor'),model.bestFor,'best-for',platform.id,'data-edit-field=\"editorial.bestFor\"')",'bestFor marker');
  replaceOne("listSection(getText('strengths'),model.strengths,'strengths',platform.id,'editorial.strengths')","listSection(getText('strengths'),model.strengths,'strengths',platform.id,'data-edit-field=\"editorial.strengths\"')",'strengths marker');
  replaceOne("listSection(getText('limitations'),model.limitations,'limitations',platform.id,'editorial.limitations')","listSection(getText('limitations'),model.limitations,'limitations',platform.id,'data-edit-field=\"editorial.limitations\"')",'limitations marker');
});
