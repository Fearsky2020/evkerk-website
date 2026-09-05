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
async function derivePassword(password,saltB64,iterations){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:fromB64(saltB64),iterations},key,256);return toB64(new Uint8Array(bits))}
function constantTimeEqual(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}
async function findUser(env,identifier){const id=clean(identifier,200).toLowerCase();if(!id)return null;return env.DB.prepare("SELECT id,name,email,role,status,password_hash,password_salt,password_iterations FROM admin_users WHERE status='active' AND (lower(name)=? OR lower(email)=?) LIMIT 1").bind(id,id).first()}

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

async function login(request,env){
  if(!env.DB)return json({ok:false,error:'数据库未配置'},503);
  const body=await request.json().catch(()=>({}));
  const user=await findUser(env,body.identifier);
  if(!user?.password_hash||!user?.password_salt)return json({ok:false,error:'账号或密码不正确'},401);
  const password=String(body.password??'');
  const iterations=Number(user.password_iterations)||210000;
  const actual=await derivePassword(password,user.password_salt,iterations);
  if(!constantTimeEqual(actual,user.password_hash))return json({ok:false,error:'账号或密码不正确'},401);

  const token=randomToken();
  const hash=await sha256Hex(token);
  const sessionId=`SES-${crypto.randomUUID()}`;
  const expiresAt=new Date(Date.now()+30*24*60*60*1000).toISOString();

  try{
    await env.DB.prepare("DELETE FROM admin_sessions WHERE datetime(expires_at)<=datetime('now')").run();
  }catch(error){
    console.warn('ADMIN_SESSION_CLEANUP_FAILED',error?.message||error);
  }

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

async function forgot(request,env){
  if(!env.DB)return json({ok:false,error:'数据库未配置'},503);
  if(!env.PASSWORD_RESET_EMAIL)return json({ok:false,error:'找回邮件服务尚未配置'},503);
  const body=await request.json().catch(()=>({}));
  const email=clean(body.email,300).toLowerCase();
  if(!email)return json({ok:true,message:'如果该邮箱已绑定账号，你会收到重置邮件。'});
  const user=await env.DB.prepare("SELECT id,name,email FROM admin_users WHERE status='active' AND lower(email)=? AND password_hash IS NOT NULL LIMIT 1").bind(email).first();
  if(!user)return json({ok:true,message:'如果该邮箱已绑定账号，你会收到重置邮件。'});
  const token=randomToken();
  const hash=await sha256Hex(token);
  const expiresAt=new Date(Date.now()+15*60*1000).toISOString();
  await env.DB.prepare("UPDATE admin_password_resets SET used_at=datetime('now') WHERE user_id=? AND used_at IS NULL").bind(user.id).run();
  await env.DB.prepare('INSERT INTO admin_password_resets(id,user_id,token_hash,expires_at) VALUES(?,?,?,?)').bind(`RST-${crypto.randomUUID()}`,user.id,hash,expiresAt).run();
  const link=`https://evkerk.nl/team/?reset=${encodeURIComponent(token)}`;
  try{
    await env.PASSWORD_RESET_EMAIL.send({to:user.email,from:'noreply@evkerk.nl',subject:'EVKERK 主日学密码重置',text:`${user.name||'您好'}：\n\n请在15分钟内打开下面的链接重置密码：\n${link}\n\n如果不是你本人操作，可以忽略这封邮件。`,html:`<p>${user.name||'您好'}：</p><p>请在15分钟内打开下面的链接重置密码：</p><p><a href="${link}">重置主日学登录密码</a></p><p>如果不是你本人操作，可以忽略这封邮件。</p>`});
  }catch(e){
    console.error('PASSWORD_RESET_EMAIL_FAILED',e?.code||'',e?.message||e);
    await env.DB.prepare("UPDATE admin_password_resets SET used_at=datetime('now') WHERE token_hash=?").bind(hash).run().catch(()=>{});
    return json({ok:false,error:'重置邮件发送失败，请稍后再试'},503);
  }
  return json({ok:true,message:'如果该邮箱已绑定账号，你会收到重置邮件。'});
}

async function resetPassword(request,env){
  if(!env.DB)return json({ok:false,error:'数据库未配置'},503);
  const body=await request.json().catch(()=>({}));
  const token=clean(body.token,300),password=String(body.password??'');
  if(password.length<10)return json({ok:false,error:'新密码至少10个字符，可以用一句自己记得住的话'},400);
  const hash=await sha256Hex(token);
  const row=await env.DB.prepare(`SELECT r.id reset_id,r.user_id FROM admin_password_resets r JOIN admin_users u ON u.id=r.user_id WHERE r.token_hash=? AND r.used_at IS NULL AND datetime(r.expires_at)>datetime('now') AND u.status='active' LIMIT 1`).bind(hash).first();
  if(!row)return json({ok:false,error:'重置链接无效或已过期'},400);
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const saltB64=toB64(salt),iterations=210000,passwordHash=await derivePassword(password,saltB64,iterations);
  try{
    await env.DB.prepare("UPDATE admin_users SET password_hash=?,password_salt=?,password_iterations=?,updated_at=datetime('now') WHERE id=?").bind(passwordHash,saltB64,iterations,row.user_id).run();
    await env.DB.prepare("UPDATE admin_password_resets SET used_at=datetime('now') WHERE id=?").bind(row.reset_id).run();
    await env.DB.prepare('DELETE FROM admin_sessions WHERE user_id=?').bind(row.user_id).run();
  }catch(error){
    console.error('PASSWORD_RESET_COMMIT_FAILED',error?.message||error);
    return json({ok:false,error:'密码重置保存失败，请稍后再试',code:'PASSWORD_RESET_SAVE_FAILED'},500);
  }
  return json({ok:true});
}

export async function handleHumanAuthApi(request,env,url){
  if(!url.pathname.startsWith('/api/human-auth/'))return null;
  if(url.pathname==='/api/human-auth/login'&&request.method==='POST')return login(request,env);
  if(url.pathname==='/api/human-auth/logout'&&request.method==='POST')return logout(request,env);
  if(url.pathname==='/api/human-auth/forgot'&&request.method==='POST')return forgot(request,env);
  if(url.pathname==='/api/human-auth/reset'&&request.method==='POST')return resetPassword(request,env);
  return json({ok:false,error:'not found'},404);
}
