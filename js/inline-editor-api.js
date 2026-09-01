(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.InlineEditorAPI=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const DEFAULT_KEY='dunya-inline-session';
  function trimBase(value){return String(value||'').replace(/\/+$/,'')}
  function validSession(value){return /^[A-Fa-f0-9]{32,}$/.test(String(value||''))}
  function errorFrom(status,payload){const err=new Error(payload&&payload.error||`Request failed (${status})`);err.status=status;err.payload=payload||null;return err}
  function create(options={}){
    const config=(typeof globalThis!=='undefined'&&globalThis.InlineEditorConfig)||{};
    const apiBase=trimBase(options.apiBase||config.apiBase);
    const siteOrigin=String(options.siteOrigin||config.siteOrigin||'https://devmyskilla.github.io').replace(/\/$/,'');
    const sessionKey=String(options.sessionKey||config.sessionKey||DEFAULT_KEY);
    const storage=options.storage||(typeof sessionStorage!=='undefined'?sessionStorage:null);
    const fetchFn=options.fetchFn||(typeof fetch==='function'?fetch.bind(globalThis):null);
    const openFn=options.openFn||(typeof window!=='undefined'&&typeof window.open==='function'?window.open.bind(window):null);
    function getSessionId(){const value=storage&&storage.getItem?storage.getItem(sessionKey):'';return validSession(value)?String(value):''}
    function setSession(id){if(!validSession(id))return false;if(storage&&storage.setItem)storage.setItem(sessionKey,String(id));return true}
    function clearSession(){if(storage&&storage.removeItem)storage.removeItem(sessionKey)}
    function acceptAuthMessage(event){
      if(!event||event.origin!==siteOrigin||!event.data||event.data.type!=='dunya-inline-auth'||!validSession(event.data.session))return false;
      return setSession(event.data.session);
    }
    function login(){if(!apiBase||!openFn)return null;return openFn(`${apiBase}/inline/auth`,'dunya-inline-auth','popup=yes,width=680,height=760')}
    async function request(path,{method='GET',body,allowAnonymous=false}={}){
      if(!fetchFn)throw errorFrom(0,{error:'Fetch unavailable'});
      const session=getSessionId();if(!allowAnonymous&&!session)throw errorFrom(401,{error:'Unauthorized'});
      const headers={};if(session)headers.Authorization=`Bearer ${session}`;if(body!==undefined)headers['Content-Type']='application/json';
      const response=await fetchFn(`${apiBase}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
      let payload=null;const text=await response.text();if(text){try{payload=JSON.parse(text)}catch{payload={error:text}}}
      if(!response.ok)throw errorFrom(response.status,payload);
      return payload||{};
    }
    function session(){return request('/inline/session')}
    function content(){return request('/inline/content')}
    function patch({target,baseSha,value}){return request('/inline/patch',{method:'POST',body:{target,baseSha,value}})}
    async function logout(){try{if(getSessionId())await request('/inline/logout',{method:'POST'})}finally{clearSession()}}
    return{login,acceptAuthMessage,session,content,patch,logout,getSessionId,clearSession,apiBase,siteOrigin};
  }
  return{create,validSession};
});
