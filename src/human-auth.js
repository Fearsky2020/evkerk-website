function json(data,status=200,headers={}){
  const h=new Headers({'content-type':'application/json; charset=utf-8','cache-control':'no-store'});
  for(const [k,v] of Object.entries(headers))h.set(k,v);
  return new Response(JSON.stringify(data),{status,headers:h});
}
function clean(v,max=500){return String(v??'').trim().slice(0,max)}
function b64url(bytes){return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','')}
function randomToken(n=32){const b=crypto.getRandomValues(new Uint8Array(n));return b64url(b)}
async function sha256Hex(text){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(d)].map(v=>v.toString(16).padStart(2,'0')).join('')}
function cookieValue(request,name){const raw=request.headers.get('cookie')||'';for(const part of raw.split(';')){const [k,...rest]=part.trim().split('=');if(k===name)return decodeURIComponent(rest.join('='))}return''}
function sessionCookie(token,maxAge=2592000){return `evkerk_admin_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`}
function fromB64(s){const raw=atob(s);return Uint8Array.from(raw,c=>c.charCodeAt(0))}
function toB64(bytes){return btoa(String.fromCharCode(...bytes))}
function constantTimeEqual(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}
async function findUser(env,identifier){const id=clean(identifier,200).toLowerCase();if(!id)return null;return env.DB.prepare("SELECT id,name,email,role,status,password_hash,password_salt,password_iterations FROM admin_users WHERE status='active' AND (lower(name)=? OR lower(email)=?) LIMIT 1").bind(id,id).first()}
async function hmacProof(verifierB64,nonce){const key=await crypto.subtle.importKey('raw',fromB64(verifierB64),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(nonce));return toB64(new Uint8Array(sig))}

export async function authenticateHumanSession(request,env){
  if(!env.DB)return null;
  const token=cookieValue(request,'evkerk_admin_session');
  if(!token)return null;
  const hash=await sha256Hex(token);
  const row=await env.DB.prepare(`SELECT u.id,u.name,u.email,u.role,u.status,s.id session_id FROM admin_sessions s JOIN admin_users u ON u.id=s.user_id WHERE s.token_hash=? AND u.status='active' AND datetime(s.expires_at)>datetime('now') LIMIT 1`).bind(hash).first();
  if(!row)return null;
  env.DB.prepare("UPDATE admin_sessions SET last_used_at=datetime('now') WHERE id=?").bind(row.session_id).run().catch(()=>{});
  return{id:row.id,name:row.name,email:row.email,role:row.role,status:row.status,human_session:true};
}

async function challenge(request,env){
  if(!env.DB)return json({ok:false,error:'数据库未配置'},503);
  const body=await request.json().catch(()=>({}));
  const user=await findUser(env,body.identifier);
  const fakeSalt=toB64(crypto.getRandomValues(new Uint8Array(16)));
  return json({ok:true,salt:user?.password_salt||fakeSalt,iterations:Number(user?.password_iterations)||210000,nonce:randomToken(24)});
}

async function login(request,env){
  if(!env.DB)return json({ok:false,error:'数据库未配置'},503);
  const body=await request.json().catch(()=>({}));
  const user=await findUser(env,body.identifier);
  if(!user?.password_hash||!user?.password_salt)return json({ok:false,error:'这个账号还没有新版登录码，请联系教会负责人重新生成'},401);
  const nonce=clean(body.nonce,200),proof=clean(body.proof,300);
  if(!nonce||!proof)return json({ok:false,error:'登录验证数据不完整'},400);
  const expected=await hmacProof(user.password_hash,nonce);
  if(!constantTimeEqual(expected,proof))return json({ok:false,error:'账号或登录码不正确'},401);

  const token=randomToken();
  const hash=await sha256Hex(token);
  const sessionId=`SES-${crypto.randomUUID()}`;
  const expiresAt=new Date(Date.now()+30*24*60*60*1000).toISOString();
  await env.DB.prepare("DELETE FROM admin_sessions WHERE datetime(expires_at)<=datetime('now')").run().catch(()=>{});
  try{
    await env.DB.prepare('INSERT INTO admin_sessions(id,user_id,token_hash,expires_at) VALUES(?,?,?,?)').bind(sessionId,user.id,hash,expiresAt).run();
  }catch(error){
    console.error('ADMIN_SESSION_INSERT_FAILED',error?.message||error);
    return json({ok:false,error:'登录会话创建失败，请稍后再试',code:'SESSION_CREATE_FAILED'},500);
  }
  return json({ok:true,user:{id:user.id,name:user.name,email:user.email,role:user.role}},200,{'set-cookie':sessionCookie(token)});
}

async function logout(request,env){
  const token=cookieValue(request,'evkerk_admin_session');
  if(token&&env.DB){const hash=await sha256Hex(token);await env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(hash).run().catch(()=>{})}
  return json({ok:true},200,{'set-cookie':sessionCookie('',0)});
}

export async function handleHumanAuthApi(request,env,url){
  if(!url.pathname.startsWith('/api/human-auth/'))return null;
  if(url.pathname==='/api/human-auth/challenge'&&request.method==='POST')return challenge(request,env);
  if(url.pathname==='/api/human-auth/login'&&request.method==='POST')return login(request,env);
  if(url.pathname==='/api/human-auth/logout'&&request.method==='POST')return logout(request,env);
  if((url.pathname==='/api/human-auth/forgot'||url.pathname==='/api/human-auth/reset')&&request.method==='POST')return json({ok:false,error:'邮箱找回已关闭，请联系教会负责人重新生成登录码'},410);
  return json({ok:false,error:'not found'},404);
}
