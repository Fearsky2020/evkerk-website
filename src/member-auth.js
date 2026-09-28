import { authenticateHumanSession } from './human-auth.js';
import { servicesForUser } from './team-services.js';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const clean=(v,n=500)=>String(v??'').trim().slice(0,n);
const normalizeIdentifier=v=>clean(v,200).toLowerCase().replace(/\s+/g,'');
const normalizePostcode=v=>clean(v,20).toUpperCase().replace(/\s+/g,'');
const id=p=>p+'_'+crypto.randomUUID();
async function hash(v){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function rawToken(){const b=crypto.getRandomValues(new Uint8Array(32));return btoa(String.fromCharCode(...b)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','')}
function loginCode(){const b=crypto.getRandomValues(new Uint32Array(2));return String(b[0]%1000000).padStart(6,'0')+String(b[1]%1000).padStart(3,'0')}
function bearer(r){return(r.headers.get('authorization')||'').replace(/^Bearer\s+/i,'')}
export function parseMemberScopes(value){
 if(Array.isArray(value))return[...new Set(value.map(v=>clean(v,100)).filter(Boolean))];
 const raw=clean(value,2000);if(!raw)return[];
 if(raw.startsWith('[')){try{const parsed=JSON.parse(raw);if(Array.isArray(parsed))return parseMemberScopes(parsed)}catch{}}
 return[...new Set(raw.split(/[\s,]+/).map(v=>clean(v,100)).filter(Boolean))];
}
export async function authenticateMemberAppToken(request,env){
 const raw=bearer(request);if(!raw)return null;
 const row=await env.DB.prepare("SELECT t.id token_id,t.scopes,t.access_expires_at,m.id member_id,m.display_name,m.status member_status,m.cluster_id,m.group_id FROM member_app_tokens t JOIN church_members m ON m.id=t.member_id WHERE t.token_hash=? AND t.status='active' AND datetime(t.access_expires_at)>datetime('now')").bind(await hash(raw)).first();
 if(!row||row.member_status!=='active')return null;
 row.scope_list=parseMemberScopes(row.scopes);
 env.DB.prepare("UPDATE member_app_tokens SET last_used_at=datetime('now') WHERE id=?").bind(row.token_id).run().catch(()=>{});
 return row;
}
async function staff(request,env){
 const u=await authenticateHumanSession(request,env);if(!u)return null;
 const services=await servicesForUser(env,u.id);
 if(u.role!=='owner'&&!services.includes('admin')&&!services.includes('organization'))return null;
 const r=await env.DB.prepare("SELECT role,cluster_id,group_id FROM organization_role_assignments WHERE user_id=? AND active=1").bind(u.id).all();
 const assignments=r.results||[];
 if(u.role==='owner'||services.includes('admin'))assignments.unshift({role:'pastor',cluster_id:null,group_id:null});
 const level=assignments.some(x=>x.role==='pastor')?'pastor':assignments.some(x=>x.role==='cluster_leader')?'cluster_leader':assignments.some(x=>x.role==='group_leader')?'group_leader':'none';
 return{...u,services,assignments,level,cluster_ids:assignments.filter(x=>x.role==='cluster_leader'&&x.cluster_id).map(x=>x.cluster_id),group_ids:assignments.filter(x=>x.role==='group_leader'&&x.group_id).map(x=>x.group_id)};
}
async function issue(env,memberId,scopes,deviceId,createdBy=null){
 scopes=parseMemberScopes([...scopes,'my-group:read','my-group:question:submit']);
 const access=rawToken(),refresh=rawToken(),tid=id('ATK');
 const accessExpiresAt=new Date(Date.now()+60*60*1000).toISOString();
 const refreshExpiresAt=new Date(Date.now()+30*24*60*60*1000).toISOString();
 await env.DB.prepare("INSERT INTO member_app_tokens(id,member_id,token_hash,label,status,created_by,scopes,device_id,access_expires_at,refresh_token_hash,refresh_expires_at) VALUES(?,?,?,?, 'active',?,?,?,?,?,?)")
  .bind(tid,memberId,await hash(access),'教会 App',createdBy,scopes.join(' '),clean(deviceId,200),accessExpiresAt,await hash(refresh),refreshExpiresAt).run();
 return{access_token:access,refresh_token:refresh,token_type:'Bearer',expires_in:3600,scopes};
}
async function publicGroups(env){
 const r=await env.DB.prepare("SELECT g.id,g.group_number,g.name,c.name cluster_name,g.meeting_day,g.meeting_time,g.meeting_frequency,g.postcode,g.reception_status FROM church_groups g JOIN church_clusters c ON c.id=g.cluster_id WHERE g.status='active' AND g.is_demo=0 AND g.reception_status IN ('open','near_full') ORDER BY c.sort_order,g.group_number").all();
 return json({ok:true,groups:r.results||[]});
}
async function register(request,env){
 const b=await request.json().catch(()=>({})),name=clean(b.display_name,120),phone=normalizeIdentifier(b.phone),email=normalizeIdentifier(b.email),postcode=normalizePostcode(b.postcode),requestedGroupId=clean(b.requested_group_id,100);
 if(!name||!phone)return json({ok:false,error:'请填写姓名和手机号'},400);
 if(!/^[1-9]\d{3}[A-Z]{2}$/.test(postcode))return json({ok:false,error:'请输入有效的荷兰住址邮编，例如 2511EC'},400);
 if(!requestedGroupId)return json({ok:false,error:'请先选择要加入的小组'},400);
 const group=await env.DB.prepare("SELECT id,group_number,name,cluster_id,reception_status FROM church_groups WHERE id=? AND status='active' AND is_demo=0").bind(requestedGroupId).first();
 if(!group)return json({ok:false,error:'所选小组不存在或暂不可加入'},404);
 if(['closed','paused'].includes(group.reception_status))return json({ok:false,error:'该小组目前暂停接纳新组员，请选择其他小组或联系牧者'},409);
 const existing=await env.DB.prepare("SELECT id,display_name,group_id,status FROM church_members WHERE status='active' AND phone=? LIMIT 1").bind(phone).first();
 if(existing){
  if(existing.group_id===group.id)return json({ok:false,error:'你已经是这个小组的组员，请直接登录我的小组'},409);
  return json({ok:false,error:'你已经属于其他小组；如需转组，请联系现任小组长或牧者'},409);
 }
 const aid=id('APP');
 try{
  await env.DB.prepare("INSERT INTO member_registration_applications(id,display_name,phone,email,postcode,requested_group_id,requested_group_number,note) VALUES(?,?,?,?,?,?,?,?)")
   .bind(aid,name,phone,email,postcode,group.id,group.group_number,clean(b.note,1000)).run();
 }catch{
  const pending=await env.DB.prepare("SELECT id,requested_group_id FROM member_registration_applications WHERE status='pending' AND phone=? ORDER BY created_at DESC LIMIT 1").bind(phone).first();
  if(pending)return json({ok:true,application_id:pending.id,status:'pending',message:'申请已经提交，正在等待小组长审核'},202);
  return json({ok:false,error:'加入小组申请暂时无法保存，请稍后重试'},500);
 }
 return json({ok:true,application_id:aid,status:'pending',requested_group:{id:group.id,name:group.name,number:group.group_number},message:'申请已收到，等待'+group.name+'小组长审核'},202);
}
async function login(request,env){
 const b=await request.json().catch(()=>({})),identifier=normalizeIdentifier(b.identifier),code=clean(b.login_code,120);
 if(!identifier||!code)return json({ok:false,error:'请输入账号和登录码'},400);
 const row=await env.DB.prepare("SELECT c.member_id,c.login_code_hash,c.failed_attempts,c.locked_until,m.display_name,m.status FROM member_app_credentials c JOIN church_members m ON m.id=c.member_id WHERE c.identifier=? AND c.status='active'").bind(identifier).first();
 if(!row||row.status!=='active'||(row.locked_until&&Date.parse(row.locked_until)>Date.now())||row.login_code_hash!==await hash(code)){
  if(row)await env.DB.prepare("UPDATE member_app_credentials SET failed_attempts=failed_attempts+1,locked_until=CASE WHEN failed_attempts>=4 THEN datetime('now','+15 minutes') ELSE locked_until END WHERE member_id=?").bind(row.member_id).run().catch(()=>{});
  return json({ok:false,error:'账号或登录码不正确'},401);
 }
 await env.DB.prepare("UPDATE member_app_credentials SET failed_attempts=0,locked_until=NULL,updated_at=datetime('now') WHERE member_id=?").bind(row.member_id).run();
 const tokens=await issue(env,row.member_id,['my-group:read'],b.device_id);
 return json({ok:true,member:{id:row.member_id,name:row.display_name},...tokens});
}
async function exchange(request,env){
 const u=await authenticateHumanSession(request,env);if(!u)return json({ok:false,error:'同工登录已失效'},401);
 const m=await env.DB.prepare("SELECT id,display_name FROM church_members WHERE admin_user_id=? AND status='active'").bind(u.id).first();
 if(!m)return json({ok:false,error:'同工账号尚未绑定成员资料'},409);
 const services=await servicesForUser(env,u.id),scopes=['my-group:read'];
 if(services.includes('welcome')||services.includes('admin'))scopes.push('welcome:submit','welcome:photo');
 return json({ok:true,member:{id:m.id,name:m.display_name},...await issue(env,m.id,scopes,(await request.json().catch(()=>({}))).device_id,u.id)});
}
async function refresh(request,env){
 const b=await request.json().catch(()=>({})),raw=clean(b.refresh_token,500);if(!raw)return json({ok:false,error:'缺少刷新令牌'},401);
 const row=await env.DB.prepare("SELECT id,member_id,scopes,device_id FROM member_app_tokens WHERE refresh_token_hash=? AND status='active' AND datetime(refresh_expires_at)>datetime('now')").bind(await hash(raw)).first();
 if(!row)return json({ok:false,error:'刷新令牌无效或已撤销'},401);
 await env.DB.prepare("UPDATE member_app_tokens SET status='revoked',revoked_at=datetime('now'),revoked_reason='rotated' WHERE id=?").bind(row.id).run();
 return json({ok:true,...await issue(env,row.member_id,parseMemberScopes(row.scopes),row.device_id)});
}
async function session(request,env){
 const row=await authenticateMemberAppToken(request,env);if(!row)return json({ok:false,error:'App 登录已失效'},401);
 return json({ok:true,member:{id:row.member_id,name:row.display_name},scopes:row.scope_list,expires_at:row.access_expires_at});
}
async function logout(request,env){
 const access=bearer(request),b=await request.json().catch(()=>({})),refresh=clean(b.refresh_token,500);
 if(access)await env.DB.prepare("UPDATE member_app_tokens SET status='revoked',revoked_at=datetime('now'),revoked_reason='logout' WHERE token_hash=?").bind(await hash(access)).run();
 else if(refresh)await env.DB.prepare("UPDATE member_app_tokens SET status='revoked',revoked_at=datetime('now'),revoked_reason='logout' WHERE refresh_token_hash=?").bind(await hash(refresh)).run();
 return json({ok:true});
}
async function changeCode(request,env){
 const raw=bearer(request),b=await request.json().catch(()=>({})),current=clean(b.current_login_code,120),next=clean(b.new_login_code,120);
 if(!raw||next.length<8)return json({ok:false,error:'新登录码至少需要 8 位'},400);
 const row=await env.DB.prepare("SELECT t.member_id,c.login_code_hash FROM member_app_tokens t JOIN member_app_credentials c ON c.member_id=t.member_id WHERE t.token_hash=? AND t.status='active' AND datetime(t.access_expires_at)>datetime('now')").bind(await hash(raw)).first();
 if(!row||row.login_code_hash!==await hash(current))return json({ok:false,error:'当前登录码不正确'},401);
 await env.DB.prepare("UPDATE member_app_credentials SET login_code_hash=?,must_change_code=0,failed_attempts=0,locked_until=NULL,updated_at=datetime('now') WHERE member_id=?").bind(await hash(next),row.member_id).run();
 await env.DB.prepare("UPDATE member_app_tokens SET status='revoked',revoked_at=datetime('now'),revoked_reason='credential_changed' WHERE member_id=?").bind(row.member_id).run();
 return json({ok:true,relogin_required:true});
}
async function applications(request,env,url){
 const u=await staff(request,env);if(!u)return json({ok:false,error:'没有小组申请审核权限'},403);
 if(request.method==='GET'){
  const r=await env.DB.prepare("SELECT a.id,a.display_name,a.phone,a.email,a.postcode,a.requested_group_id,a.requested_group_number,a.note,a.status,a.member_id,a.created_at,a.reviewed_at,g.name requested_group_name,g.cluster_id requested_cluster_id,c.name requested_cluster_name FROM member_registration_applications a LEFT JOIN church_groups g ON g.id=a.requested_group_id LEFT JOIN church_clusters c ON c.id=g.cluster_id ORDER BY a.created_at DESC LIMIT 200").all();
  let rows=r.results||[];
  if(u.level!=='pastor')rows=rows.filter(a=>(a.requested_group_id&&u.group_ids.includes(a.requested_group_id))||(a.requested_cluster_id&&u.cluster_ids.includes(a.requested_cluster_id)));
  return json({ok:true,role:u.level,applications:rows});
 }
 const m=url.pathname.match(/^\/api\/organization\/member-applications\/([^/]+)\/review$/);if(!m)return null;
 const aid=decodeURIComponent(m[1]),b=await request.json().catch(()=>({})),decision=b.decision==='approved'?'approved':b.decision==='rejected'?'rejected':'';
 if(!decision)return json({ok:false,error:'审核结果不正确'},400);
 const a=await env.DB.prepare("SELECT a.*,g.cluster_id requested_cluster_id,g.name requested_group_name FROM member_registration_applications a LEFT JOIN church_groups g ON g.id=a.requested_group_id WHERE a.id=? AND a.status='pending'").bind(aid).first();
 if(!a)return json({ok:false,error:'申请不存在或已经处理'},404);
 const requestedGroupId=clean(a.requested_group_id,100);
 if(!requestedGroupId)return json({ok:false,error:'这是旧版申请，尚未选择目标小组，请由牧者处理'},409);
 const requestedGroup=await env.DB.prepare("SELECT id,group_number,name,cluster_id,status,reception_status FROM church_groups WHERE id=? AND is_demo=0").bind(requestedGroupId).first();
 if(!requestedGroup)return json({ok:false,error:'申请的小组已不存在'},409);
 const mayReview=u.level==='pastor'||u.group_ids.includes(requestedGroup.id);
 if(!mayReview)return json({ok:false,error:'只有该小组组长或牧者可以审批这份申请'},403);
 if(decision==='rejected'){
  await env.DB.prepare("UPDATE member_registration_applications SET status='rejected',rejection_reason=?,reviewed_by=?,reviewed_at=datetime('now'),updated_at=datetime('now') WHERE id=?").bind(clean(b.reason,500),u.id,aid).run();
  return json({ok:true,status:'rejected'});
 }
 let targetGroup=requestedGroup;
 const overrideGroupId=clean(b.group_id,100);
 if(overrideGroupId&&overrideGroupId!==requestedGroup.id){
  if(u.level!=='pastor')return json({ok:false,error:'小组长只能批准加入申请人选择的本组'},403);
  targetGroup=await env.DB.prepare("SELECT id,group_number,name,cluster_id,status,reception_status FROM church_groups WHERE id=? AND status='active' AND is_demo=0").bind(overrideGroupId).first();
  if(!targetGroup)return json({ok:false,error:'牧者指定的目标小组不存在'},404);
 }
 let mid=clean(b.member_id,100);
 if(mid){
  const existing=await env.DB.prepare("SELECT id,group_id,status FROM church_members WHERE id=?").bind(mid).first();
  if(!existing)return json({ok:false,error:'指定成员不存在'},404);
  if(existing.status==='active'&&existing.group_id&&existing.group_id!==targetGroup.id)return json({ok:false,error:'该成员已经属于其他小组，请使用转组流程'},409);
  await env.DB.prepare("UPDATE church_members SET display_name=?,phone=?,email=?,postcode=?,cluster_id=?,group_id=?,status='active',updated_at=datetime('now') WHERE id=?")
   .bind(a.display_name,a.phone,a.email,a.postcode||'',targetGroup.cluster_id,targetGroup.id,mid).run();
 }else{
  const duplicate=await env.DB.prepare("SELECT id,group_id,status FROM church_members WHERE status='active' AND phone=? LIMIT 1").bind(a.phone).first();
  if(duplicate){
   if(duplicate.group_id!==targetGroup.id)return json({ok:false,error:'该申请人已经属于其他小组，请使用转组流程'},409);
   mid=duplicate.id;
  }else{
   mid=id('MEM');
   await env.DB.prepare("INSERT INTO church_members(id,display_name,phone,email,postcode,cluster_id,group_id,status,joined_at,created_by) VALUES(?,?,?,?,?,?,?,'active',datetime('now'),?)")
    .bind(mid,a.display_name,a.phone,a.email,a.postcode||'',targetGroup.cluster_id,targetGroup.id,u.id).run();
  }
 }
 const identifier=normalizeIdentifier(b.identifier||a.phone||a.email);if(!identifier)return json({ok:false,error:'审核通过前须设置手机号登录账号'},400);
 const code=loginCode();
 await env.DB.prepare("INSERT INTO member_app_credentials(member_id,identifier,login_code_hash,created_by) VALUES(?,?,?,?) ON CONFLICT(member_id) DO UPDATE SET identifier=excluded.identifier,login_code_hash=excluded.login_code_hash,status='active',must_change_code=1,updated_at=datetime('now')").bind(mid,identifier,await hash(code),u.id).run();
 await env.DB.prepare("UPDATE member_registration_applications SET status='approved',member_id=?,reviewed_by=?,reviewed_at=datetime('now'),updated_at=datetime('now') WHERE id=?").bind(mid,u.id,aid).run();
 await env.DB.prepare("INSERT INTO organization_audit_log(id,actor_user_id,action,entity_type,entity_id,after_json) VALUES(?,?,?,?,?,?)").bind(id('AUD'),u.id,'member_account.approve','member',mid,JSON.stringify({application_id:aid,identifier,group_id:targetGroup.id})).run();
 return json({ok:true,status:'approved',member_id:mid,group:{id:targetGroup.id,name:targetGroup.name,number:targetGroup.group_number},identifier,initial_login_code:code,notice:'初始登录码只显示一次'});
}
async function inviteMember(request,env){
 const u=await staff(request,env);if(!u)return json({ok:false,error:'没有会友账号管理权限'},403);
 const b=await request.json().catch(()=>({})),mid=clean(b.member_id,100),identifier=normalizeIdentifier(b.identifier);
 const m=await env.DB.prepare("SELECT id,display_name FROM church_members WHERE id=? AND status='active'").bind(mid).first();
 if(!m)return json({ok:false,error:'成员不存在或已停用'},404);if(!identifier)return json({ok:false,error:'请设置手机号或邮箱登录账号'},400);
 const code=loginCode();
 try{await env.DB.prepare("INSERT INTO member_app_credentials(member_id,identifier,login_code_hash,created_by) VALUES(?,?,?,?) ON CONFLICT(member_id) DO UPDATE SET identifier=excluded.identifier,login_code_hash=excluded.login_code_hash,status='active',must_change_code=1,failed_attempts=0,locked_until=NULL,updated_at=datetime('now')").bind(mid,identifier,await hash(code),u.id).run()}
 catch{return json({ok:false,error:'该手机号或邮箱已绑定其他会友'},409)}
 await env.DB.prepare("UPDATE member_app_tokens SET status='revoked',revoked_at=datetime('now'),revoked_reason='credential_reset' WHERE member_id=? AND status='active'").bind(mid).run();
 await env.DB.prepare("INSERT INTO organization_audit_log(id,actor_user_id,action,entity_type,entity_id,after_json) VALUES(?,?,?,?,?,?)").bind(id('AUD'),u.id,'member_account.invite','member',mid,JSON.stringify({identifier})).run();
 return json({ok:true,member:{id:mid,name:m.display_name},identifier,initial_login_code:code,notice:'初始登录码只显示一次'});
}
async function memberSessions(request,env,url){
 const u=await staff(request,env);if(!u)return json({ok:false,error:'没有会友设备管理权限'},403);
 const m=url.pathname.match(/^\/api\/organization\/members\/([^/]+)\/app-sessions(?:\/([^/]+)\/revoke)?$/);if(!m)return null;
 const mid=decodeURIComponent(m[1]),tokenId=m[2]?decodeURIComponent(m[2]):'';
 if(request.method==='GET'&&!tokenId){const q=await env.DB.prepare("SELECT id,label,status,scopes,device_id,access_expires_at,refresh_expires_at,last_used_at,created_at,revoked_at,revoked_reason FROM member_app_tokens WHERE member_id=? ORDER BY created_at DESC LIMIT 100").bind(mid).all();return json({ok:true,sessions:q.results||[]})}
 if(request.method==='POST'&&tokenId){const before=await env.DB.prepare("SELECT id,status,device_id FROM member_app_tokens WHERE id=? AND member_id=?").bind(tokenId,mid).first();if(!before)return json({ok:false,error:'登录设备不存在'},404);await env.DB.prepare("UPDATE member_app_tokens SET status='revoked',revoked_at=datetime('now'),revoked_reason='staff_revoke' WHERE id=? AND member_id=?").bind(tokenId,mid).run();await env.DB.prepare("INSERT INTO organization_audit_log(id,actor_user_id,action,entity_type,entity_id,before_json,after_json) VALUES(?,?,?,?,?,?,?)").bind(id('AUD'),u.id,'member_session.revoke','member',mid,JSON.stringify(before),JSON.stringify({token_id:tokenId,status:'revoked'})).run();return json({ok:true})}
 return json({ok:false,error:'not found'},404);
}
export async function handleMemberAuthApi(request,env,url){
 if(url.pathname==='/api/app/groups'&&request.method==='GET')return publicGroups(env);
 if(url.pathname==='/api/app/register'&&request.method==='POST')return register(request,env);
 if(url.pathname==='/api/app/auth/login'&&request.method==='POST')return login(request,env);
 if(url.pathname==='/api/app/auth/exchange'&&request.method==='POST')return exchange(request,env);
 if(url.pathname==='/api/app/auth/refresh'&&request.method==='POST')return refresh(request,env);
 if(url.pathname==='/api/app/auth/logout'&&request.method==='POST')return logout(request,env);
 if(url.pathname==='/api/app/auth/change-code'&&request.method==='POST')return changeCode(request,env);
 if(url.pathname==='/api/app/session'&&request.method==='GET')return session(request,env);
 if(url.pathname==='/api/organization/member-applications'&&request.method==='GET')return applications(request,env,url);
 if(url.pathname==='/api/organization/member-invitations'&&request.method==='POST')return inviteMember(request,env);
 if(/^\/api\/organization\/members\/[^/]+\/app-sessions(?:\/[^/]+\/revoke)?$/.test(url.pathname))return memberSessions(request,env,url);
 if(/^\/api\/organization\/member-applications\/[^/]+\/review$/.test(url.pathname)&&request.method==='POST')return applications(request,env,url);
 return null;
}
