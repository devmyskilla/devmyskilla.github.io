import {applyPatch} from './edit-schema.mjs';

const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
function apiFetch(env){return typeof env.FETCH==='function'?env.FETCH:fetch}
function allowedOrigin(env){return String(env.ALLOWED_ORIGIN||'https://devmyskilla.github.io').replace(/\/$/,'')}
function corsHeaders(env,origin){return origin===allowedOrigin(env)?{'access-control-allow-origin':origin,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Authorization,Content-Type','access-control-max-age':'600','vary':'Origin'}:{}}
function json(body,status=200,extra={}){return new Response(JSON.stringify(body),{status,headers:{...JSON_HEADERS,...extra}})}
function error(message,status,extra={}){return json({error:message},status,extra)}
function randomId(bytes=24){const buf=new Uint8Array(bytes);crypto.getRandomValues(buf);return Array.from(buf,b=>b.toString(16).padStart(2,'0')).join('')}
function ttl(env){const value=Number(env.SESSION_TTL_SECONDS||3600);return Number.isFinite(value)&&value>=300?Math.floor(value):3600}
function repoParts(env){const [owner,repo]=String(env.GITHUB_REPO||'devmyskilla/devmyskilla.github.io').split('/');if(!owner||!repo)throw new Error('Invalid GITHUB_REPO');return{owner,repo}}
function ghHeaders(token){return{'accept':'application/vnd.github+json','authorization':`Bearer ${token}`,'x-github-api-version':'2022-11-28','user-agent':'dunya-inline-editor'}}
function encodeBase64(value){const bytes=new TextEncoder().encode(value);let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary)}
function decodeBase64(value){const binary=atob(String(value||'').replace(/\s+/g,''));const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));return new TextDecoder().decode(bytes)}
async function readJson(response){const text=await response.text();let value={};try{value=text?JSON.parse(text):{}}catch{}if(!response.ok){const msg=value&&value.message?value.message:`Upstream request failed (${response.status})`;throw Object.assign(new Error(msg),{status:response.status})}return value}
function sessionId(request){const auth=request.headers.get('authorization')||'';const match=/^Bearer\s+([A-Fa-f0-9]{16,})$/.exec(auth);return match?match[1]:''}
async function loadSession(request,env){
  const id=sessionId(request);if(!id)return null;
  const session=await env.INLINE_SESSIONS.get(`session:${id}`,'json');
  if(!session)return null;
  if(!session.expiresAt||session.expiresAt<=Date.now()){await env.INLINE_SESSIONS.delete(`session:${id}`);return null}
  return{id,...session};
}
function requireOrigin(request,env){const origin=request.headers.get('origin')||'';return origin===allowedOrigin(env)?origin:''}
async function githubContent(env,token){
  const {owner,repo}=repoParts(env),branch=String(env.GITHUB_BRANCH||'main');
  const url=`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/data.json?ref=${encodeURIComponent(branch)}`;
  const response=await apiFetch(env)(url,{headers:ghHeaders(token)});const payload=await readJson(response);
  if(typeof payload.sha!=='string'||typeof payload.content!=='string')throw Object.assign(new Error('GitHub returned invalid data.json metadata'),{status:502});
  let data;try{data=JSON.parse(decodeBase64(payload.content))}catch{throw Object.assign(new Error('GitHub returned invalid data.json content'),{status:502})}
  return{data,sha:payload.sha};
}
async function writeGithubContent(env,token,data,sha,message){
  const {owner,repo}=repoParts(env),branch=String(env.GITHUB_BRANCH||'main');
  const url=`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/data.json`;
  const response=await apiFetch(env)(url,{method:'PUT',headers:{...ghHeaders(token),'content-type':'application/json'},body:JSON.stringify({message,content:encodeBase64(JSON.stringify(data,null,2)+'\n'),sha,branch})});
  const payload=await readJson(response);return payload&&payload.content&&payload.content.sha?payload.content.sha:payload&&payload.commit&&payload.commit.sha||'';
}
async function oauthStart(request,env){
  const url=new URL(request.url),state=randomId();
  await env.INLINE_SESSIONS.put(`oauth:${state}`,JSON.stringify({createdAt:Date.now()}),{expirationTtl:600});
  const auth=new URL('https://github.com/login/oauth/authorize');
  auth.searchParams.set('client_id',env.GITHUB_OAUTH_ID);auth.searchParams.set('redirect_uri',`${url.origin}/inline/callback`);auth.searchParams.set('scope','public_repo');auth.searchParams.set('state',state);
  return Response.redirect(auth.href,302);
}
async function oauthCallback(request,env){
  const url=new URL(request.url),code=url.searchParams.get('code')||'',state=url.searchParams.get('state')||'';
  const pending=state?await env.INLINE_SESSIONS.get(`oauth:${state}`):null;
  if(!code||!state||!pending)return new Response('Invalid OAuth state',{status:400,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}});
  await env.INLINE_SESSIONS.delete(`oauth:${state}`);
  const fx=apiFetch(env);
  let tokenPayload,user,repo;
  try{
    tokenPayload=await readJson(await fx('https://github.com/login/oauth/access_token',{method:'POST',headers:{'accept':'application/json','content-type':'application/json'},body:JSON.stringify({client_id:env.GITHUB_OAUTH_ID,client_secret:env.GITHUB_OAUTH_SECRET,code,redirect_uri:`${url.origin}/inline/callback`,state})}));
    if(!tokenPayload.access_token)throw Object.assign(new Error('GitHub did not issue an access token'),{status:401});
    user=await readJson(await fx('https://api.github.com/user',{headers:ghHeaders(tokenPayload.access_token)}));
    const {owner,repo:repoName}=repoParts(env);
    repo=await readJson(await fx(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}`,{headers:ghHeaders(tokenPayload.access_token)}));
  }catch(e){return new Response('GitHub authentication failed',{status:e.status||502,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}})}
  if(!repo.permissions||repo.permissions.push!==true)return new Response('Repository write access is required',{status:403,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}});
  const id=randomId(),seconds=ttl(env),session={githubToken:tokenPayload.access_token,login:String(user.login||''),avatarUrl:String(user.avatar_url||''),expiresAt:Date.now()+seconds*1000};
  await env.INLINE_SESSIONS.put(`session:${id}`,JSON.stringify(session),{expirationTtl:seconds});
  const payload=JSON.stringify({type:'dunya-inline-auth',session:id,user:{login:session.login,avatarUrl:session.avatarUrl}}).replace(/</g,'\\u003c');
  const origin=JSON.stringify(allowedOrigin(env));
  const html=`<!doctype html><meta charset="utf-8"><title>Authenticated</title><script>if(window.opener){window.opener.postMessage(${payload},${origin})}window.close();<\/script>`;
  return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
}
async function apiSession(request,env,cors){
  const session=await loadSession(request,env);if(!session)return error('Unauthorized',401,cors);
  return json({authenticated:true,user:{login:session.login,avatarUrl:session.avatarUrl},expiresAt:session.expiresAt},200,cors);
}
async function apiContent(request,env,cors){
  const session=await loadSession(request,env);if(!session)return error('Unauthorized',401,cors);
  try{const result=await githubContent(env,session.githubToken);return json(result,200,cors)}catch(e){return error(e.message,e.status||502,cors)}
}
async function apiPatch(request,env,cors){
  const session=await loadSession(request,env);if(!session)return error('Unauthorized',401,cors);
  let body;try{body=await request.json()}catch{return error('Invalid JSON body',400,cors)}
  if(!body||typeof body.baseSha!=='string'||!body.target)return error('Invalid patch request',400,cors);
  try{
    const current=await githubContent(env,session.githubToken);
    if(current.sha!==body.baseSha)return error('Content changed since editing started',409,cors);
    const patched=applyPatch(current.data,body.target,body.value);
    const label=[body.target.kind,body.target.id||body.target.key||'',body.target.field||''].filter(Boolean).join(' ');
    const sha=await writeGithubContent(env,session.githubToken,patched.data,current.sha,`content: inline edit ${label}`);
    return json({ok:true,sha,value:patched.value},200,cors);
  }catch(e){const status=e.status||(e.message&&/unsupported|invalid|unknown|localized|required/i.test(e.message)?400:500);return error(e.message||'Patch failed',status,cors)}
}
async function apiLogout(request,env,cors){const id=sessionId(request);if(id)await env.INLINE_SESSIONS.delete(`session:${id}`);return json({ok:true},200,cors)}

const handler={
  async fetch(request,env){
    const url=new URL(request.url),path=url.pathname;
    if(path==='/inline/auth'&&request.method==='GET')return oauthStart(request,env);
    if(path==='/inline/callback'&&request.method==='GET')return oauthCallback(request,env);
    const origin=requireOrigin(request,env);
    if(!origin)return error('Forbidden origin',403);
    const cors=corsHeaders(env,origin);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
    if(path==='/inline/session'&&request.method==='GET')return apiSession(request,env,cors);
    if(path==='/inline/content'&&request.method==='GET')return apiContent(request,env,cors);
    if(path==='/inline/patch'&&request.method==='POST')return apiPatch(request,env,cors);
    if(path==='/inline/logout'&&request.method==='POST')return apiLogout(request,env,cors);
    return error('Not found',404,cors);
  }
};
export default handler;
export{encodeBase64,decodeBase64,githubContent,writeGithubContent,loadSession};
