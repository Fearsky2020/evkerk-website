const ROLE_LEVEL={uploader:1,editor:2,owner:3};

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function clean(value,max=300){return String(value??'').trim().slice(0,max)}
function bearer(request){return request.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||''}
function hex(bytes){return [...new Uint8Array(bytes)].map(value=>value.toString(16).padStart(2,'0')).join('')}
async function tokenHash(token){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))}
function accessKey(){const bytes=crypto.getRandomValues(new Uint8Array(32));return 'EVK-'+btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','')}

export async function authenticate(request,env){
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
  if(!user)return{response:json({ok:false,error:'后台访问密钥不正确'},401),user:null};
  if((ROLE_LEVEL[user.role]||0)<(ROLE_LEVEL[minimum]||99))return{response:json({ok:false,error:'你的账号没有执行此操作的权限'},403),user};
  return{response:null,user};
}

async function listUsers(request,env){
  const auth=await authorize(request,env,'owner');if(auth.response)return auth.response;
  const result=await env.DB.prepare("SELECT id,name,email,role,status,last_used_at,created_at,updated_at FROM admin_users ORDER BY status ASC,created_at DESC LIMIT 100").all();
  return json({ok:true,users:result.results||[],current:auth.user});
}
async function createUser(request,env){
  const auth=await authorize(request,env,'owner');if(auth.response)return auth.response;
  const body=await request.json().catch(()=>({})),name=clean(body.name,120),email=clean(body.email,200).toLowerCase(),role=['owner','editor','uploader'].includes(body.role)?body.role:'uploader';
  if(!name)return json({ok:false,error:'请填写管理员姓名'},400);
  const token=accessKey(),id='ADM-'+crypto.randomUUID(),hash=await tokenHash(token);
  await env.DB.prepare("INSERT INTO admin_users(id,name,email,role,token_hash,status) VALUES(?,?,?,?,?,'active')").bind(id,name,email||null,role,hash).run();
  return json({ok:true,user:{id,name,email,role,status:'active'},access_key:token},201);
}
async function updateUser(request,env,id){
  const auth=await authorize(request,env,'owner');if(auth.response)return auth.response;
  const body=await request.json().catch(()=>({})),name=clean(body.name,120),email=clean(body.email,200).toLowerCase(),role=['owner','editor','uploader'].includes(body.role)?body.role:'uploader',status=body.status==='disabled'?'disabled':'active';
  if(!name)return json({ok:false,error:'请填写管理员姓名'},400);
  const result=await env.DB.prepare("UPDATE admin_users SET name=?,email=?,role=?,status=?,updated_at=datetime('now') WHERE id=?").bind(name,email||null,role,status,id).run();
  if(!Number(result.meta?.changes||0))return json({ok:false,error:'管理员不存在'},404);
  return json({ok:true,id});
}
async function rotateKey(request,env,id){
  const auth=await authorize(request,env,'owner');if(auth.response)return auth.response;
  const token=accessKey(),hash=await tokenHash(token);
  const result=await env.DB.prepare("UPDATE admin_users SET token_hash=?,status='active',updated_at=datetime('now') WHERE id=?").bind(hash,id).run();
  if(!Number(result.meta?.changes||0))return json({ok:false,error:'管理员不存在'},404);
  return json({ok:true,id,access_key:token});
}

export async function handleAdminAuthApi(request,env,url){
  if(request.method==='GET'&&url.pathname==='/api/admin/me'){const user=await authenticate(request,env);return user?json({ok:true,user}):json({ok:false,error:'后台访问密钥不正确'},401)}
  if(request.method==='GET'&&url.pathname==='/api/admin/users')return listUsers(request,env);
  if(request.method==='POST'&&url.pathname==='/api/admin/users')return createUser(request,env);
  let match=url.pathname.match(/^\/api\/admin\/users\/([^/]+)\/update$/);if(match&&request.method==='POST')return updateUser(request,env,decodeURIComponent(match[1]));
  match=url.pathname.match(/^\/api\/admin\/users\/([^/]+)\/rotate-key$/);if(match&&request.method==='POST')return rotateKey(request,env,decodeURIComponent(match[1]));
  return null;
}
