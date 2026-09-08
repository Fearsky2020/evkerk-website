import { authenticateHumanSession } from './human-auth.js';

const ROLE_LEVEL={uploader:1,editor:2,owner:3};

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function clean(value,max=300){return String(value??'').trim().slice(0,max)}
function bearer(request){return request.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||''}
function hex(bytes){return [...new Uint8Array(bytes)].map(value=>value.toString(16).padStart(2,'0')).join('')}
async function tokenHash(token){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))}
function accessKey(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',bytes=crypto.getRandomValues(new Uint8Array(8)),chars=[...bytes].map(v=>alphabet[v%alphabet.length]).join('');return chars.slice(0,4)+'-'+chars.slice(4)}

export async function authenticate(request,env){
  const session=await authenticateHumanSession(request,env);if(session)return session;
  const token=bearer(request);
  if(!token)return null;
  if(env.INGEST_TOKEN&&token===env.INGEST_TOKEN)return{id:'master',name:'主管理员',email:'',role:'owner',master:true};
  if(!env.DB)return null;
  const hash=await tokenHash(token);
  const user=await env.DB.prepare("SELECT id,name,email,role,status FROM admin_users WHERE token_hash=? AND status='active'").bind(hash).first();
  if(!user)return null;
  env.DB.prepare("UPDATE admin_users SET last_used_at=datetime('now') WHERE id=?").bind(user.id).run().catch(()=>{});
  return user;
}

export async function authorize(request,env,minimum='uploader'){
  if(!env.DB)return{response:json({ok:false,error:'D1 database is not configured'},503),user:null};
  const user=await authenticate(request,env);
  if(!user)return{response:json({ok:false,error:'账号或登录状态无效'},401),user:null};
  if((ROLE_LEVEL[user.role]||0)<(ROLE_LEVEL[minimum]||99))return{response:json({ok:false,error:'你的账号没有执行此操作的权限'},403),user};
  return{response:null,user};
}

async function loginUser(request,env){
  const user=await authenticate(request,env);
  if(!user)return json({ok:false,error:'账号或登录码不正确'},401);
  const body=await request.json().catch(()=>({}));
  const identifier=clean(body.identifier,200).toLowerCase();
  const matches=user.master
    ? ['主管理员','master'].includes(identifier)
    : identifier&&[clean(user.name,120).toLowerCase(),clean(user.email,200).toLowerCase()].filter(Boolean).includes(identifier);
  if(!matches)return json({ok:false,error:'账号或登录码不正确'},401);
  return json({ok:true,user});
}

async function listUsers(request,env){
  const auth=await authorize(request,env,'owner');if(auth.response)return auth.response;
  const result=await env.DB.prepare("SELECT id,name,email,role,status,last_used_at,created_at,updated_at,CASE WHEN password_hash IS NOT NULL THEN 1 ELSE 0 END password_ready FROM admin_users ORDER BY status ASC,created_at DESC LIMIT 100").all();
  return json({ok:true,users:result.results||[],current:auth.user});
}
async function createUser(request,env){
  const auth=await authorize(request,env,'owner');if(auth.response)return auth.response;
  const body=await request.json().catch(()=>({})),name=clean(body.name,120),email=clean(body.email,200).toLowerCase(),role=['owner','editor','uploader'].includes(body.role)?body.role:'uploader';
  if(!name)return json({ok:false,error:'请填写同工姓名'},400);
  const existing=await env.DB.prepare("SELECT id,name,email,role,status FROM admin_users WHERE lower(name)=? OR (?<>'' AND lower(email)=?) LIMIT 1").bind(name.toLowerCase(),email,email).first();
  if(existing)return json({ok:false,error:'这个同工账号已经存在。请在下方找到他，然后点“重新生成登录码”。',code:'ACCOUNT_EXISTS',user_id:existing.id},409);
  const token=accessKey(),id='ADM-'+crypto.randomUUID(),hash=await tokenHash(token);
  try{await env.DB.prepare("INSERT INTO admin_users(id,name,email,role,token_hash,status) VALUES(?,?,?,?,?,'active')").bind(id,name,email||null,role,hash).run()}catch(error){console.error('ADMIN_USER_CREATE_FAILED',error?.message||error);return json({ok:false,error:'创建同工账号失败，请稍后再试',code:'USER_CREATE_FAILED'},500)}
  return json({ok:true,user:{id,name,email,role,status:'active',password_ready:0},access_key:token,login_code:token},201);
}
async function updateUser(request,env,id){
  const auth=await authorize(request,env,'owner');if(auth.response)return auth.response;
  const body=await request.json().catch(()=>({})),name=clean(body.name,120),email=clean(body.email,200).toLowerCase(),role=['owner','editor','uploader'].includes(body.role)?body.role:'uploader',status=body.status==='disabled'?'disabled':'active';
  if(!name)return json({ok:false,error:'请填写同工姓名'},400);
  const result=await env.DB.prepare("UPDATE admin_users SET name=?,email=?,role=?,status=?,updated_at=datetime('now') WHERE id=?").bind(name,email||null,role,status,id).run();
  if(!Number(result.meta?.changes||0))return json({ok:false,error:'同工账号不存在'},404);
  return json({ok:true,id});
}
async function deleteUser(request,env,id){
  const auth=await authorize(request,env,'owner');if(auth.response)return auth.response;
  const user=await env.DB.prepare("SELECT id,name,status FROM admin_users WHERE id=?").bind(id).first();
  if(!user)return json({ok:false,error:'同工账号不存在'},404);
  if(user.status!=='disabled')return json({ok:false,error:'请先停用该同工账号，再永久删除'},409);
  await env.DB.prepare("DELETE FROM admin_users WHERE id=? AND status='disabled'").bind(id).run();
  return json({ok:true,id});
}

async function rotateKey(request,env,id){
  const auth=await authorize(request,env,'owner');if(auth.response)return auth.response;
  const token=accessKey(),hash=await tokenHash(token);
  const result=await env.DB.prepare("UPDATE admin_users SET token_hash=?,password_hash=NULL,password_salt=NULL,password_iterations=NULL,status='active',updated_at=datetime('now') WHERE id=?").bind(hash,id).run();
  if(!Number(result.meta?.changes||0))return json({ok:false,error:'同工账号不存在'},404);
  await env.DB.prepare('DELETE FROM admin_sessions WHERE user_id=?').bind(id).run().catch(()=>{});
  return json({ok:true,id,access_key:token,login_code:token});
}


async function resetOtherLoginCodes(request,env){
  const auth=await authorize(request,env,'owner');if(auth.response)return auth.response;
  const excluded=new Set(['ADM-PASTOR',auth.user?.id].filter(Boolean));
  const rows=await env.DB.prepare("SELECT id,name,email,status FROM admin_users ORDER BY created_at").all();
  const targets=(rows.results||[]).filter(user=>!excluded.has(user.id));
  const codes=[],statements=[];
  for(const user of targets){const code=accessKey(),hash=await tokenHash(code);codes.push({id:user.id,name:user.name,email:user.email||'',status:user.status,login_code:code});statements.push(env.DB.prepare("UPDATE admin_users SET token_hash=?,password_hash=NULL,password_salt=NULL,password_iterations=NULL,updated_at=datetime('now') WHERE id=?").bind(hash,user.id));statements.push(env.DB.prepare('DELETE FROM admin_sessions WHERE user_id=?').bind(user.id));statements.push(env.DB.prepare('DELETE FROM admin_password_resets WHERE user_id=?').bind(user.id));}
  if(statements.length)await env.DB.batch(statements);
  return json({ok:true,reset_count:codes.length,users:codes});
}

export async function handleAdminAuthApi(request,env,url){
  if(request.method==='POST'&&url.pathname==='/api/admin/login')return loginUser(request,env);
  if(request.method==='GET'&&url.pathname==='/api/admin/me'){const user=await authenticate(request,env);return user?json({ok:true,user}):json({ok:false,error:'登录状态无效'},401)}
  if(request.method==='GET'&&url.pathname==='/api/admin/users')return listUsers(request,env);
  if(request.method==='POST'&&url.pathname==='/api/admin/users')return createUser(request,env);
  if(request.method==='POST'&&url.pathname==='/api/admin/users/reset-others')return resetOtherLoginCodes(request,env);
  let match=url.pathname.match(/^\/api\/admin\/users\/([^/]+)\/update$/);if(match&&request.method==='POST')return updateUser(request,env,decodeURIComponent(match[1]));
  match=url.pathname.match(/^\/api\/admin\/users\/([^/]+)\/rotate-key$/);if(match&&request.method==='POST')return rotateKey(request,env,decodeURIComponent(match[1]));
  match=url.pathname.match(/^\/api\/admin\/users\/([^/]+)\/delete$/);if(match&&request.method==='POST')return deleteUser(request,env,decodeURIComponent(match[1]));
  return null;
}
