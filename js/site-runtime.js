(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SiteRuntime=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function each(doc,selector,fn){
    if(!doc||typeof doc.querySelectorAll!=='function')return;
    for(const node of doc.querySelectorAll(selector)||[])fn(node);
  }
  function setAttr(node,name,value){
    if(!node)return;
    if(typeof node.setAttribute==='function')node.setAttribute(name,value);
    else node[name]=value;
  }
  function setContentMeta(node,value){
    if(!node)return;
    setAttr(node,'content',String(value||''));
  }
  function meta(doc,selector,attrs={}){
    if(!doc||typeof doc.querySelector!=='function')return null;
    let node=doc.querySelector(selector);
    if(node)return node;
    if(!doc.createElement||!doc.head||!doc.head.appendChild)return null;
    node=doc.createElement('meta');
    for(const [name,value] of Object.entries(attrs))setAttr(node,name,value);
    doc.head.appendChild(node);
    return node;
  }
  function safeHex(value,fallback='#4f46e5'){
    const raw=String(value||'');
    return /^#[0-9a-fA-F]{6}$/.test(raw)?raw:fallback;
  }
  function applySettings(doc,content){
    each(doc,'[data-setting]',node=>{node.textContent=content.setting(node.dataset.setting)});
  }
  function applyText(doc,content){
    each(doc,'[data-i18n]',node=>{node.textContent=content.text(node.dataset.i18n)});
    each(doc,'[data-i18n-placeholder]',node=>{node.placeholder=content.text(node.dataset.i18nPlaceholder)});
    each(doc,'[data-i18n-aria-label]',node=>setAttr(node,'aria-label',content.text(node.dataset.i18nAriaLabel)));
    each(doc,'[data-i18n-title]',node=>setAttr(node,'title',content.text(node.dataset.i18nTitle)));
  }
  function applyIcons(doc,content){
    each(doc,'[data-icon]',node=>{node.textContent=content.icon(node.dataset.icon)});
  }
  function applyLinks(doc,content){
    each(doc,'[data-link]',node=>{
      const value=content.link(node.dataset.link);
      if(value)setAttr(node,'href',value);else if(typeof node.removeAttribute==='function')node.removeAttribute('href');else node.href='';
    });
  }
  function applyAssets(doc,content){
    each(doc,'[data-asset]',node=>{
      const value=content.asset(node.dataset.asset);
      const tag=String(node.tagName||'').toLowerCase();
      if(tag==='link'){
        if(value.src)setAttr(node,'href',value.src);
        return;
      }
      if(value.src)setAttr(node,'src',value.src);else if(typeof node.removeAttribute==='function')node.removeAttribute('src');else node.src='';
      setAttr(node,'alt',value.alt||'');
    });
  }
  function applyLocaleOptions(doc,content){
    if(!doc||typeof doc.querySelector!=='function')return;
    const select=doc.querySelector('#langSwitcher');
    if(!select)return;
    const names=content.rawSetting('localeNames')||{};
    if(typeof select.replaceChildren==='function'&&doc.createElement){
      const nodes=[];
      for(const code of ['ar','en','tr']){
        const option=doc.createElement('option');option.value=code;option.textContent=String(names[code]||code);nodes.push(option);
      }
      select.replaceChildren(...nodes);
    }else if('innerHTML'in select){
      const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      select.innerHTML=['ar','en','tr'].map(code=>`<option value="${code}">${esc(names[code]||code)}</option>`).join('');
    }
    select.value=content.getLang();
  }
  function applySeo(doc,content,pageKey){
    const seo=content.seo(pageKey)||{};
    if(doc)doc.title=String(seo.title||'');
    setContentMeta(meta(doc,'meta[name="description"]',{name:'description'}),seo.description||'');
    setContentMeta(meta(doc,'meta[property="og:title"]',{property:'og:title'}),seo.ogTitle||seo.title||'');
    setContentMeta(meta(doc,'meta[property="og:description"]',{property:'og:description'}),seo.ogDescription||seo.description||'');
    const image=content.safeUrl(seo.ogImage,{allowRelative:true});
    setContentMeta(meta(doc,'meta[property="og:image"]',{property:'og:image'}),image);
  }
  function applyPlatformSeo(doc,content,model){
    const seo=content.seo('platform')||{};
    const name=String(model&&model.name||'');
    const subst=value=>String(value||'').split('{platform}').join(name);
    if(doc)doc.title=subst(seo.title);
    setContentMeta(meta(doc,'meta[name="description"]',{name:'description'}),subst(seo.description));
    setContentMeta(meta(doc,'meta[property="og:title"]',{property:'og:title'}),subst(seo.ogTitle||seo.title));
    setContentMeta(meta(doc,'meta[property="og:description"]',{property:'og:description'}),subst(seo.ogDescription||seo.description));
    setContentMeta(meta(doc,'meta[property="og:image"]',{property:'og:image'}),content.safeUrl(seo.ogImage,{allowRelative:true}));
  }
  function applyThemeColor(doc,content){
    const value=safeHex(content.rawSetting('themeColor'));
    setContentMeta(meta(doc,'meta[name="theme-color"]',{name:'theme-color'}),value);
  }
  function createManifest(content,origin){
    const icon=content.asset('favicon');
    let iconUrl='';
    try{if(icon.src)iconUrl=new URL(icon.src,origin).href}catch(_){}
    return{
      name:content.setting('siteName'),
      short_name:content.setting('siteName'),
      start_url:content.link('home')||'index.html',
      display:'standalone',
      background_color:'#ffffff',
      theme_color:safeHex(content.rawSetting('themeColor')),
      icons:iconUrl?[{src:iconUrl,sizes:'192x192',type:'image/png'}]:[]
    };
  }
  function applyManifest(doc,content){
    if(!doc||typeof doc.querySelector!=='function'||typeof Blob==='undefined'||typeof URL==='undefined'||typeof URL.createObjectURL!=='function')return;
    const link=doc.querySelector('#appManifest');if(!link)return;
    const origin=doc.location&&doc.location.href?doc.location.href:(typeof location!=='undefined'?location.href:'https://example.invalid/');
    const manifest=createManifest(content,origin),blob=new Blob([JSON.stringify(manifest)],{type:'application/manifest+json'});
    const url=URL.createObjectURL(blob);setAttr(link,'href',url);
  }
  function applyContentBindings(doc,content){
    applySettings(doc,content);applyText(doc,content);applyIcons(doc,content);applyLinks(doc,content);applyAssets(doc,content);applyLocaleOptions(doc,content);
  }
  function applyDocument(doc,content,pageKey){
    if(!doc||!content)return;
    if(doc.documentElement){doc.documentElement.lang=content.getLang();doc.documentElement.dir=content.getLang()==='ar'?'rtl':'ltr'}
    applyContentBindings(doc,content);applySeo(doc,content,pageKey);applyThemeColor(doc,content);applyManifest(doc,content);
  }
  return{applyContentBindings,applySettings,applyText,applyIcons,applyLinks,applyAssets,applySeo,applyPlatformSeo,applyThemeColor,applyDocument,createManifest};
});
