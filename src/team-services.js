import { authenticateHumanSession } from './human-auth.js';
import { authorize } from './admin-auth.js';

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function clean(value,max=300){return String(value??'').trim().slice(0,max)}
function serviceId(value){const id=clean(value,60).toLowerCase();return /^[a-z0-9_]{2,60}$/.test(id)?id:''}
function roleForServices(services){if(services.includes('admin'))return'owner';if(services.includes('content')||services.includes('sunday_school'))return'editor';return'uploader'}

async function catalog(env,{includeHidden=false}={}){
  if(!env.DB)return[];
  const sql=includeHidden
    ? 'SELECT id,title_zh,title_nl,description_zh,href,icon,status,sort_order FROM team_services ORDER BY sort_order,title_zh'
    : "SELECT id,title_zh,title_nl,description_zh,href,icon,status,sort_order FROM team_services WHERE status!='hidden' ORDER BY sort_order,title_zh";
  const rows=await env.DB.prepare(sql).all();return rows.results||[];
}

export async function servicesForUser(env,userId){
  if(!env.DB||!userId)return[];
  const rows=await env.DB.prepare('SELECT service_id FROM team_service_permissions WHERE user_id=? ORDER BY service_id').bind(userId).all();
  return (rows.results||[]).map(row=>row.service_id);
}

export async function authorizeService(request,env,requiredService){
  const user=await authenticateHumanSession(request,env);
  if(!user)return{response:json({ok:false,error:'请先登录同工账号'},401),user:null,services:[]};
  const services=await servicesForUser(env,user.id);
  if(services.includes('admin')||services.includes(requiredService))return{response:null,user,services};
  return{response:json({ok:false,error:'这个账号没有进入该服事的权限',required_service:requiredService},403),user,services};
}

async function currentServices(request,env){
  const user=await authenticateHumanSession(request,env);
  if(!user)return json({ok:false,error:'请先登录同工账号'},401);
  const assigned=await servicesForUser(env,user.id),all=await catalog(env);
  const admin=assigned.includes('admin');
  const services=all.filter(item=>admin||assigned.includes(item.id));
  return json({ok:true,user,services,assigned_services:assigned,is_service_admin:admin});
}

async function listPermissions(request,env){
  const auth=await authorize(request,env,'owner');if(auth.response)return auth.response;
  const [all,rows]=await Promise.all([
    catalog(env,{includeHidden:true}),
    env.DB.prepare('SELECT user_id,service_id FROM team_service_permissions ORDER BY user_id,service_id').all(),
  ]);
  const permissions={};for(const row of rows.results||[]){(permissions[row.user_id]??=[]).push(row.service_id)}
  return json({ok:true,catalog:all,permissions});
}

async function savePermissions(request,env,userId){
  const auth=await authorize(request,env,'owner');if(auth.response)return auth.response;
  const target=await env.DB.prepare('SELECT id,name,status FROM admin_users WHERE id=?').bind(userId).first();
  if(!target)return json({ok:false,error:'同工账号不存在'},404);
  const body=await request.json().catch(()=>({})),requested=Array.isArray(body.services)?body.services:[];
  const validIds=new Set((await catalog(env,{includeHidden:true})).map(item=>item.id));
  const services=[...new Set(requested.map(serviceId).filter(id=>validIds.has(id)))];
  if(auth.user?.id===userId&&!services.includes('admin'))return json({ok:false,error:'不能从当前负责人账号移除负责人管理权限'},409);
  const statements=[env.DB.prepare('DELETE FROM team_service_permissions WHERE user_id=?').bind(userId)];
  for(const service of services)statements.push(env.DB.prepare('INSERT INTO team_service_permissions(user_id,service_id,granted_by) VALUES(?,?,?)').bind(userId,service,auth.user?.id||null));
  statements.push(env.DB.prepare("UPDATE admin_users SET role=?,updated_at=datetime('now') WHERE id=?").bind(roleForServices(services),userId));
  await env.DB.batch(statements);
  return json({ok:true,user_id:userId,services,role:roleForServices(services)});
}

async function saveService(request,env,idFromPath=''){
  const auth=await authorize(request,env,'owner');if(auth.response)return auth.response;
  const body=await request.json().catch(()=>({})),id=serviceId(idFromPath||body.id);
  if(!id)return json({ok:false,error:'服事 ID 只能使用小写字母、数字和下划线'},400);
  const titleZh=clean(body.title_zh,120);if(!titleZh)return json({ok:false,error:'请填写服事名称'},400);
  const status=['active','planned','hidden'].includes(body.status)?body.status:'planned';
  const existing=await env.DB.prepare('SELECT id FROM team_services WHERE id=?').bind(id).first();
  if(existing){
    await env.DB.prepare("UPDATE team_services SET title_zh=?,title_nl=?,description_zh=?,href=?,icon=?,status=?,sort_order=?,updated_at=datetime('now') WHERE id=?")
      .bind(titleZh,clean(body.title_nl,120),clean(body.description_zh,500),clean(body.href,500),clean(body.icon,20)||'•',status,Number(body.sort_order)||0,id).run();
  }else{
    await env.DB.prepare('INSERT INTO team_services(id,title_zh,title_nl,description_zh,href,icon,status,sort_order) VALUES(?,?,?,?,?,?,?,?)')
      .bind(id,titleZh,clean(body.title_nl,120),clean(body.description_zh,500),clean(body.href,500),clean(body.icon,20)||'•',status,Number(body.sort_order)||0).run();
  }
  return json({ok:true,id,status},existing?200:201);
}

function requiredServiceForPath(path){
  if(path.startsWith('/api/sunday-school/')||path.startsWith('/team/sunday-school'))return'sunday_school';
  if(path.startsWith('/api/admin/activities'))return'media';
  if(path==='/admin/media.html'||path.startsWith('/api/media/')||path.startsWith('/api/admin/sermon-audio')||path.startsWith('/api/ingest/sermon'))return'content';
  if(path.startsWith('/api/admin/users')||path.startsWith('/api/admin/team-services'))return'admin';
  if(path.startsWith('/api/admin/')||path.startsWith('/api/ingest/event'))return'content';
  return'';
}

export async function guardHumanServiceAccess(request,env,url){
  const required=requiredServiceForPath(url.pathname);if(!required)return null;
  const user=await authenticateHumanSession(request,env);if(!user)return null;
  const auth=await authorizeService(request,env,required);return auth.response;
}

export async function handleTeamServicesApi(request,env,url){
  if(request.method==='GET'&&url.pathname==='/api/team/services')return currentServices(request,env);
  if(request.method==='GET'&&url.pathname==='/api/admin/team-services')return listPermissions(request,env);
  if(request.method==='POST'&&url.pathname==='/api/admin/team-services')return saveService(request,env);
  let match=url.pathname.match(/^\/api\/admin\/team-services\/([^/]+)\/update$/);
  if(match&&request.method==='POST')return saveService(request,env,decodeURIComponent(match[1]));
  match=url.pathname.match(/^\/api\/admin\/users\/([^/]+)\/services$/);
  if(match&&request.method==='POST')return savePermissions(request,env,decodeURIComponent(match[1]));
  return null;
}
