import { authenticateHumanSession } from './human-auth.js';
import { authorize } from './admin-auth.js';

const SERVICE_CATALOG = {
  sunday_school: { title: '主日学', description: '课表、课程、备课、到场记录与教学记录。' },
  media: { title: '活动与照片', description: '上传和管理教会活动照片。' },
  content: { title: '网站内容与讲道', description: '管理讲道、公告、特别活动和网站内容。' },
  admin: { title: '负责人管理', description: '管理同工账号、服事权限和全部网站管理。' },
};
const SERVICE_IDS = new Set(Object.keys(SERVICE_CATALOG));

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function clean(value,max=200){return String(value??'').trim().slice(0,max)}
function normalizedServices(input){const list=Array.isArray(input)?input:[];let out=[...new Set(list.map(x=>clean(x,40)).filter(x=>SERVICE_IDS.has(x)))];if(out.includes('admin'))out=Object.keys(SERVICE_CATALOG);return out}
function roleForServices(services){if(services.includes('admin'))return'owner';if(services.includes('content')||services.includes('sunday_school'))return'editor';return'uploader'}

export async function servicesForUser(env,userId){
  if(!env.DB||!userId)return[];
  const rows=await env.DB.prepare('SELECT service FROM team_service_permissions WHERE user_id=? ORDER BY service').bind(userId).all();
  return (rows.results||[]).map(row=>row.service).filter(service=>SERVICE_IDS.has(service));
}

async function currentServices(request,env){
  const user=await authenticateHumanSession(request,env);
  if(!user)return json({ok:false,error:'请先登录同工账号'},401);
  return json({ok:true,user,services:await servicesForUser(env,user.id),catalog:SERVICE_CATALOG});
}

async function listPermissions(request,env){
  const auth=await authorize(request,env,'owner');if(auth.response)return auth.response;
  const rows=await env.DB.prepare('SELECT user_id,service FROM team_service_permissions ORDER BY user_id,service').all();
  const permissions={};for(const row of rows.results||[]){(permissions[row.user_id]??=[]).push(row.service)}
  return json({ok:true,catalog:SERVICE_CATALOG,permissions});
}

async function savePermissions(request,env,userId){
  const auth=await authorize(request,env,'owner');if(auth.response)return auth.response;
  const target=await env.DB.prepare('SELECT id,name,status FROM admin_users WHERE id=?').bind(userId).first();
  if(!target)return json({ok:false,error:'同工账号不存在'},404);
  const body=await request.json().catch(()=>({}));const services=normalizedServices(body.services);
  if(auth.user?.id===userId&&!services.includes('admin'))return json({ok:false,error:'不能从当前负责人账号移除负责人管理权限'},409);
  const statements=[env.DB.prepare('DELETE FROM team_service_permissions WHERE user_id=?').bind(userId)];
  for(const service of services)statements.push(env.DB.prepare('INSERT INTO team_service_permissions(user_id,service,granted_by) VALUES(?,?,?)').bind(userId,service,auth.user?.id||null));
  statements.push(env.DB.prepare("UPDATE admin_users SET role=?,updated_at=datetime('now') WHERE id=?").bind(roleForServices(services),userId));
  await env.DB.batch(statements);
  return json({ok:true,user_id:userId,services,role:roleForServices(services)});
}

function requiredServices(path){
  if(path.startsWith('/api/sunday-school/')||path.startsWith('/team/sunday-school'))return['sunday_school'];
  if(path.startsWith('/api/admin/activities'))return['media'];
  if(path==='/admin/media.html'||path.startsWith('/api/media/')||path.startsWith('/api/admin/sermon-audio')||path.startsWith('/api/ingest/sermon'))return['content'];
  if(path.startsWith('/api/admin/users')||path.startsWith('/api/admin/team-services'))return['admin'];
  if(path.startsWith('/api/admin/')||path.startsWith('/api/ingest/event'))return['content'];
  if(path==='/admin'||path==='/admin/'||path==='/admin/index.html')return['media','content','admin'];
  return[];
}

export async function guardHumanServiceAccess(request,env,url){
  const required=requiredServices(url.pathname);if(!required.length)return null;
  const user=await authenticateHumanSession(request,env);if(!user)return null;
  const services=await servicesForUser(env,user.id);
  if(required.some(service=>services.includes(service)))return null;
  return json({ok:false,error:'这个账号没有进入该服事的权限',required_services:required},403);
}

export async function handleTeamServicesApi(request,env,url){
  if(request.method==='GET'&&url.pathname==='/api/team/services')return currentServices(request,env);
  if(request.method==='GET'&&url.pathname==='/api/admin/team-services')return listPermissions(request,env);
  const match=url.pathname.match(/^\/api\/admin\/users\/([^/]+)\/services$/);
  if(match&&request.method==='POST')return savePermissions(request,env,decodeURIComponent(match[1]));
  return null;
}
