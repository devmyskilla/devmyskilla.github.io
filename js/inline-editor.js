(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.InlineEditor=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const LANGS=['ar','en','tr'];
  const LABELS={
    ar:{mode:'وضع التحرير',login:'تسجيل الدخول بـ GitHub',ready:'جاهز للتعديل',saving:'جارٍ الحفظ…',publishing:'تم الحفظ في GitHub — جارٍ النشر',published:'تم النشر',conflict:'تغيّر المحتوى منذ بدء التحرير. حدّث البيانات ثم أعد المحاولة.',error:'تعذر حفظ التعديل',edit:'تعديل',cancel:'إلغاء',save:'حفظ ونشر',logout:'تسجيل الخروج',cms:'لوحة الإدارة الكاملة',confirm:'سيتم نشر هذا التعديل مباشرة على الموقع. هل تريد المتابعة؟',multiple:'هذا المحتوى مستخدم في أكثر من موضع، وسيتم تحديث جميع مواضعه.',reload:'تحديث البيانات',arabic:'العربية',english:'English',turkish:'Türkçe',src:'الصورة / المسار'},
    en:{mode:'Edit mode',login:'Sign in with GitHub',ready:'Ready to edit',saving:'Saving…',publishing:'Saved to GitHub — publishing',published:'Published',conflict:'Content changed since editing started. Refresh data and try again.',error:'Could not save the change',edit:'Edit',cancel:'Cancel',save:'Save & publish',logout:'Sign out',cms:'Full CMS',confirm:'This change will be published directly to the site. Continue?',multiple:'This content appears in more than one place; all occurrences will update.',reload:'Refresh data',arabic:'العربية',english:'English',turkish:'Türkçe',src:'Image / path'},
    tr:{mode:'Düzenleme modu',login:'GitHub ile giriş yap',ready:'Düzenlemeye hazır',saving:'Kaydediliyor…',publishing:'GitHub’a kaydedildi — yayınlanıyor',published:'Yayınlandı',conflict:'Düzenleme sırasında içerik değişti. Veriyi yenileyip tekrar deneyin.',error:'Değişiklik kaydedilemedi',edit:'Düzenle',cancel:'İptal',save:'Kaydet ve yayınla',logout:'Çıkış yap',cms:'Tam CMS',confirm:'Bu değişiklik doğrudan siteye yayınlanacak. Devam edilsin mi?',multiple:'Bu içerik birden fazla yerde kullanılıyor; tüm kullanımlar güncellenecek.',reload:'Veriyi yenile',arabic:'العربية',english:'English',turkish:'Türkçe',src:'Görsel / yol'}
  };
  function isObject(value){return value&&typeof value==='object'&&!Array.isArray(value)}
  function clone(value){return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value))}
  function split(path){return String(path||'').split('.').filter(Boolean)}
  function get(owner,path){return split(path).reduce((value,key)=>value&&Object.hasOwn(value,key)?value[key]:undefined,owner)}
  function set(owner,path,value){const keys=split(path);if(!keys.length)return false;let cursor=owner;for(const key of keys.slice(0,-1)){if(!cursor||typeof cursor!=='object'||!Object.hasOwn(cursor,key))return false;cursor=cursor[key]}cursor[keys.at(-1)]=clone(value);return true}
  function isEditRequested(locationLike){try{return new URLSearchParams(String(locationLike&&locationLike.search||'')).get('edit')==='1'}catch{return false}}
  function targetOf(descriptor){
    if(!descriptor||descriptor.writable===false)return null;
    if(descriptor.kind==='siteText')return{kind:'siteText',key:descriptor.key};
    if(descriptor.kind==='setting')return{kind:'setting',key:descriptor.field||String(descriptor.key||'').replace(/^settings\./,'')};
    if(descriptor.kind==='link')return{kind:'link',key:descriptor.field||String(descriptor.key||'').replace(/^settings\.links\./,'')};
    if(descriptor.kind==='asset'||descriptor.kind==='icon')return{kind:descriptor.kind,key:descriptor.field||String(descriptor.key||'').replace(/^assets(?:\.icons)?\./,'')};
    if(['category','language','platform'].includes(descriptor.kind))return{kind:descriptor.kind,id:descriptor.id,field:descriptor.field};
    if(descriptor.kind==='seo'){
      const bits=String(descriptor.field||'').split('.');return bits.length===2?{kind:'seo',id:descriptor.id,lang:bits[0],field:bits[1]}:null;
    }
    if(descriptor.kind==='quizPath')return{kind:'quizPath',id:descriptor.id,field:descriptor.field};
    return null;
  }
  function applyLocalPatch(data,target,value){
    if(!data||!target)return false;
    if(target.kind==='siteText'){
      const path=String(target.key||'').replace(/^siteText\./,'');return set(data.siteText,path,value);
    }
    if(target.kind==='setting')return set(data.settings,target.key,value);
    if(target.kind==='link')return set(data.settings&&data.settings.links,String(target.key||'').replace(/^links\./,''),value);
    if(target.kind==='asset')return set(data.assets,target.key,value);
    if(target.kind==='icon')return set(data.assets&&data.assets.icons,target.key,value);
    if(target.kind==='category'||target.kind==='language'){
      const list=target.kind==='category'?data.categories:data.languages,row=(list||[]).find(item=>item.id===target.id);if(!row||target.field!=='label')return false;row.label=clone(value);return true;
    }
    if(target.kind==='platform'){
      const row=(data.platforms||[]).find(item=>item.id===target.id);if(!row||target.field==='id')return false;return set(row,target.field,value);
    }
    if(target.kind==='seo')return set(data.seo,`${target.id}.${target.lang}.${target.field}`,value);
    if(target.kind==='quizPath'&&target.field==='label')return set(data.quiz&&data.quiz.paths,`${target.id}.label`,value);
    return false;
  }
  function valueFor(data,target){
    if(!data||!target)return undefined;
    if(target.kind==='siteText')return get(data.siteText,String(target.key||'').replace(/^siteText\./,''));
    if(target.kind==='setting')return get(data.settings,target.key);
    if(target.kind==='link')return get(data.settings&&data.settings.links,String(target.key||'').replace(/^links\./,''));
    if(target.kind==='asset')return get(data.assets,target.key);
    if(target.kind==='icon')return get(data.assets&&data.assets.icons,target.key);
    if(target.kind==='category'||target.kind==='language'){const row=(target.kind==='category'?data.categories:data.languages||[]).find(item=>item.id===target.id);return row&&row[target.field]}
    if(target.kind==='platform'){const row=(data.platforms||[]).find(item=>item.id===target.id);return row&&get(row,target.field)}
    if(target.kind==='seo')return get(data.seo,`${target.id}.${target.lang}.${target.field}`);
    if(target.kind==='quizPath')return get(data.quiz&&data.quiz.paths,`${target.id}.${target.field}`);
    return undefined;
  }
  function same(a,b){try{return JSON.stringify(a)===JSON.stringify(b)}catch{return false}}
  function langOf(content){const lang=content&&content.getLang?content.getLang():(typeof document!=='undefined'&&document.documentElement&&document.documentElement.lang)||'ar';return LANGS.includes(lang)?lang:'ar'}
  function textFor(content,key){const lang=langOf(content);return LABELS[lang][key]||LABELS.en[key]||key}
  function el(doc,tag,className,text){const node=doc.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node}

  function create(options={}){
    const doc=options.document||(typeof document!=='undefined'?document:null);
    const locationLike=options.location||(typeof location!=='undefined'?location:{search:''});
    const editorApi=options.editorApi||((typeof InlineEditorAPI!=='undefined'&&InlineEditorAPI.create)?InlineEditorAPI.create():null);
    const descriptorFactory=options.descriptorFactory||(typeof EditDescriptors!=='undefined'?EditDescriptors:null);
    const confirmFn=options.confirmFn||(typeof confirm==='function'?confirm:()=>true);
    const fetchFn=options.fetchFn||(typeof fetch==='function'?fetch.bind(globalThis):null);
    const onDataChange=typeof options.onDataChange==='function'?options.onDataChange:()=>{};
    let data=options.data||{},content=options.content||null,descriptorApi=options.descriptorApi||(descriptorFactory&&descriptorFactory.create?descriptorFactory.create(data):null);
    let active=false,baseSha='',user=null,currentDescriptor=null,returnFocus=null,publishTimer=null,messageListener=null;
    const pencils=[];
    let toolbar=null,modal=null,statusNode=null,formNode=null,warningNode=null,titleNode=null;

    function rebuildDescriptors(){if(descriptorFactory&&descriptorFactory.create)descriptorApi=descriptorFactory.create(data)}
    function setStatus(key,detail=''){if(statusNode)statusNode.textContent=`${textFor(content,key)}${detail?`: ${detail}`:''}`}
    function removePencils(){while(pencils.length){const node=pencils.pop();if(node&&node.remove)node.remove()}if(doc&&doc.querySelectorAll)for(const node of doc.querySelectorAll('.inline-edit-target')||[])node.classList&&node.classList.remove('inline-edit-target')}
    function ensureToolbar(loginOnly=false){
      if(!doc||!doc.body||!doc.createElement)return;
      if(toolbar&&toolbar.remove)toolbar.remove();
      toolbar=el(doc,'aside','inline-editor-toolbar');toolbar.id='inlineEditorToolbar';toolbar.setAttribute('role','region');toolbar.setAttribute('aria-label',textFor(content,'mode'));
      const head=el(doc,'strong','inline-editor-toolbar-title',textFor(content,'mode'));toolbar.appendChild(head);
      statusNode=el(doc,'span','inline-editor-status',loginOnly?textFor(content,'login'):textFor(content,'ready'));toolbar.appendChild(statusNode);
      if(user&&user.login)toolbar.appendChild(el(doc,'span','inline-editor-user',`@${user.login}`));
      if(loginOnly){const login=el(doc,'button','inline-editor-action',textFor(content,'login'));login.type='button';login.addEventListener('click',()=>editorApi&&editorApi.login&&editorApi.login());toolbar.appendChild(login)}
      else{
        const cms=el(doc,'a','inline-editor-action',textFor(content,'cms'));cms.href=((typeof InlineEditorConfig!=='undefined'&&InlineEditorConfig.adminUrl)||'admin/');toolbar.appendChild(cms);
        const out=el(doc,'button','inline-editor-action',textFor(content,'logout'));out.type='button';out.addEventListener('click',()=>logout());toolbar.appendChild(out);
      }
      doc.body.appendChild(toolbar);
    }
    function targetNodes(){
      if(!doc||!doc.querySelectorAll)return[];
      const selector='[data-edit-kind],[data-i18n],[data-setting],[data-asset],[data-link],[data-icon]';
      return Array.from(doc.querySelectorAll(selector)||[]).filter(node=>!node.closest||!node.closest('#inlineEditorToolbar,#inlineEditorModal'));
    }
    function descriptorCountKey(d){return d&&d.key||[d&&d.kind,d&&d.id,d&&d.field].join(':')}
    function refreshTargets(){
      removePencils();if(!active||!doc||!descriptorApi||typeof descriptorApi.resolveNode!=='function')return 0;
      const rows=[];for(const node of targetNodes()){const d=descriptorApi.resolveNode(node);if(d&&d.writable!==false&&targetOf(d))rows.push({node,d})}
      const counts=new Map();for(const row of rows){const key=descriptorCountKey(row.d);counts.set(key,(counts.get(key)||0)+1)}
      for(const {node,d} of rows){
        node.classList&&node.classList.add('inline-edit-target');
        const button=el(doc,'button','inline-edit-pencil','✏️');button.type='button';button.setAttribute('aria-label',`${textFor(content,'edit')} ${d.field||d.key||''}`);button.dataset.editDescriptor=descriptorCountKey(d);button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openDescriptor(d,node,counts.get(descriptorCountKey(d))||1)});
        if(node.insertAdjacentElement)node.insertAdjacentElement('afterend',button);else if(node.parentNode&&node.parentNode.insertBefore)node.parentNode.insertBefore(button,node.nextSibling||null);
        pencils.push(button);
      }
      return pencils.length;
    }
    function ensureModal(){
      if(modal||!doc||!doc.body||!doc.createElement)return modal;
      modal=el(doc,'div','inline-editor-modal');modal.id='inlineEditorModal';modal.hidden=true;modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','inlineEditorTitle');
      const panel=el(doc,'div','inline-editor-panel');titleNode=el(doc,'h2','inline-editor-title');titleNode.id='inlineEditorTitle';panel.appendChild(titleNode);
      warningNode=el(doc,'p','inline-editor-warning');warningNode.hidden=true;panel.appendChild(warningNode);
      formNode=el(doc,'form','inline-editor-form');panel.appendChild(formNode);
      const actions=el(doc,'div','inline-editor-modal-actions');
      const cancel=el(doc,'button','inline-editor-cancel',textFor(content,'cancel'));cancel.type='button';cancel.addEventListener('click',closeModal);actions.appendChild(cancel);
      const save=el(doc,'button','inline-editor-save',textFor(content,'save'));save.type='submit';actions.appendChild(save);panel.appendChild(actions);
      formNode.addEventListener('submit',async event=>{event.preventDefault();const value=readFormValue(currentDescriptor);if(!confirmFn(textFor(content,'confirm')))return;await saveDescriptor(currentDescriptor,value)});
      modal.addEventListener('click',event=>{if(event.target===modal)closeModal()});modal.appendChild(panel);doc.body.appendChild(modal);
      return modal;
    }
    function field(labelText,name,value,{type='text',textarea=false}={}){
      const wrap=el(doc,'label','inline-editor-field');wrap.appendChild(el(doc,'span','',labelText));const input=el(doc,textarea?'textarea':'input','inline-editor-input');input.name=name;if(!textarea)input.type=type;if(type==='checkbox')input.checked=!!value;else input.value=value===null||value===undefined?'':String(value);wrap.appendChild(input);formNode.appendChild(wrap);return input;
    }
    function localizedFields(value,list=false){
      const labels={ar:textFor(content,'arabic'),en:textFor(content,'english'),tr:textFor(content,'turkish')};
      for(const lang of LANGS)field(labels[lang],`lang-${lang}`,list?(Array.isArray(value&&value[lang])?value[lang].join('\n'):''):(value&&value[lang]||''),{textarea:true});
    }
    function populateForm(descriptor,value){
      formNode.replaceChildren();const widget=descriptor.widget;
      if(widget==='localizedText')localizedFields(value,false);
      else if(widget==='localizedList')localizedFields(value,true);
      else if(widget==='asset'){field(textFor(content,'src'),'asset-src',value&&value.src||'');localizedFields(value&&value.alt||{},false)}
      else if(widget==='boolean')field(descriptor.field||descriptor.key,'value',value,{type:'checkbox'});
      else if(widget==='number'||widget==='nullableNumber')field(descriptor.field||descriptor.key,'value',value,{type:'number'});
      else if(widget==='categoryRef')selectField('value',(data.categories||[]).map(row=>({value:row.id,label:row.label&&row.label[langOf(content)]||row.id})),[value],false);
      else if(widget==='languageRefs')selectField('value',(data.languages||[]).map(row=>({value:row.id,label:row.label&&row.label[langOf(content)]||row.id})),Array.isArray(value)?value:[],true);
      else if(widget==='pricingRef')selectField('value',['free','paid','mixed','unknown'].map(v=>({value:v,label:v})),[value],false);
      else field(descriptor.field||descriptor.key,'value',value===null?'':value,{type:widget==='link'?'url':'text'});
    }
    function selectField(name,options,selected,multiple){
      const wrap=el(doc,'label','inline-editor-field');wrap.appendChild(el(doc,'span','',name));const select=el(doc,'select','inline-editor-input');select.name=name;select.multiple=!!multiple;
      for(const option of options){const item=el(doc,'option','',option.label);item.value=option.value;item.selected=selected.includes(option.value);select.appendChild(item)}wrap.appendChild(select);formNode.appendChild(wrap);return select;
    }
    function readFormValue(descriptor){
      const widget=descriptor.widget,q=name=>formNode.querySelector(`[name="${name}"]`);
      if(widget==='localizedText'||widget==='localizedList'){
        const out={};for(const lang of LANGS){const raw=q(`lang-${lang}`).value;if(widget==='localizedList')out[lang]=raw.split(/\r?\n/).map(v=>v.trim()).filter(Boolean);else out[lang]=raw}return out;
      }
      if(widget==='asset'){const alt={};for(const lang of LANGS)alt[lang]=q(`lang-${lang}`).value;return{src:q('asset-src').value,alt}}
      const input=q('value');if(widget==='boolean')return!!input.checked;if(widget==='number')return Number(input.value);if(widget==='nullableNumber')return input.value===''?null:Number(input.value);if(widget==='languageRefs')return Array.from(input.selectedOptions||[]).map(o=>o.value);return input.value;
    }
    function openDescriptor(descriptor,node,count=1){
      if(!active||!descriptor||!targetOf(descriptor))return false;ensureModal();currentDescriptor=descriptor;returnFocus=node||null;titleNode.textContent=`${textFor(content,'edit')}: ${descriptor.field||descriptor.key||''}`;warningNode.hidden=count<2;warningNode.textContent=count>1?textFor(content,'multiple'):'';
      const target=targetOf(descriptor),value=valueFor(data,target);populateForm(descriptor,value);modal.hidden=false;modal.classList&&modal.classList.add('is-open');const focusable=formNode.querySelector&&formNode.querySelector('input,textarea,select,button');if(focusable&&focusable.focus)focusable.focus();return true;
    }
    function closeModal(){if(!modal)return;modal.hidden=true;modal.classList&&modal.classList.remove('is-open');currentDescriptor=null;if(returnFocus&&returnFocus.focus)returnFocus.focus();returnFocus=null}
    async function reloadAuthoritative(){const result=await editorApi.content();if(result&&result.data&&result.sha){data=result.data;baseSha=result.sha;rebuildDescriptors();onDataChange(data,{reason:'reload'});refreshTargets();return true}return false}
    async function waitForPublished(target,value){
      if(!fetchFn)return false;const deadline=Date.now()+120000;
      while(Date.now()<deadline){
        try{const response=await fetchFn(`data.json?inline=${Date.now()}`,{cache:'no-store'});if(response&&response.ok){const published=await response.json();if(same(valueFor(published,target),value))return true}}catch{}
        await new Promise(resolve=>setTimeout(resolve,3000));
      }
      return false;
    }
    async function saveDescriptor(descriptor,value){
      if(!active||!editorApi||!editorApi.patch)return{status:'inactive'};const target=targetOf(descriptor);if(!target)return{status:'unsupported'};setStatus('saving');
      try{
        const result=await editorApi.patch({target,baseSha,value});
        applyLocalPatch(data,target,result.value===undefined?value:result.value);baseSha=result.sha||baseSha;rebuildDescriptors();onDataChange(data,{reason:'save',target,value:result.value===undefined?value:result.value});setStatus('publishing');closeModal();refreshTargets();
        if(options.pollPublished!==false)waitForPublished(target,result.value===undefined?value:result.value).then(ok=>setStatus(ok?'published':'publishing'));
        return{status:'saved',sha:baseSha,value:result.value===undefined?value:result.value};
      }catch(err){
        if(err&&err.status===409){setStatus('conflict');return{status:'conflict',error:err}}
        if(err&&err.status===401){editorApi.clearSession&&editorApi.clearSession();deactivate();ensureToolbar(true);return{status:'expired',error:err}}
        setStatus('error',err&&err.message||'');return{status:'error',error:err};
      }
    }
    function deactivate(){active=false;removePencils();if(doc&&doc.documentElement&&doc.documentElement.classList)doc.documentElement.classList.remove('inline-edit-active');closeModal()}
    async function logout(){try{if(editorApi&&editorApi.logout)await editorApi.logout()}finally{deactivate();ensureToolbar(true)}}
    async function activate(){
      const verified=await editorApi.session();if(!verified||verified.authenticated!==true)throw Object.assign(new Error('Unauthorized'),{status:401});user=verified.user||null;const source=await editorApi.content();if(!source||!source.data||!source.sha)throw new Error('Invalid editor content');data=source.data;baseSha=source.sha;rebuildDescriptors();active=true;if(doc&&doc.documentElement&&doc.documentElement.classList)doc.documentElement.classList.add('inline-edit-active');ensureToolbar(false);onDataChange(data,{reason:'activate'});refreshTargets();return'active';
    }
    async function init(){
      if(!isEditRequested(locationLike))return'public';
      if(typeof window!=='undefined'&&window.addEventListener){messageListener=async event=>{if(editorApi&&editorApi.acceptAuthMessage&&editorApi.acceptAuthMessage(event)){try{await activate()}catch{deactivate();ensureToolbar(true)}}};window.addEventListener('message',messageListener)}
      if(!editorApi||!editorApi.getSessionId||!editorApi.getSessionId()){ensureToolbar(true);return'login-required'}
      try{return await activate()}catch(err){if(err&&err.status===401)editorApi.clearSession&&editorApi.clearSession();deactivate();ensureToolbar(true);return'login-required'}
    }
    function destroy(){deactivate();if(toolbar&&toolbar.remove)toolbar.remove();toolbar=null;if(modal&&modal.remove)modal.remove();modal=null;if(messageListener&&typeof window!=='undefined'&&window.removeEventListener)window.removeEventListener('message',messageListener);messageListener=null;if(publishTimer)clearTimeout(publishTimer)}
    return{init,destroy,refreshTargets,openDescriptor,closeModal,saveDescriptor,logout,reloadAuthoritative,isActive:()=>active,getBaseSha:()=>baseSha,getData:()=>data};
  }
  return{create,isEditRequested,targetOf,applyLocalPatch,valueFor};
});
