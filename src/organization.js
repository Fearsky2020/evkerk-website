import { authenticateHumanSession } from './human-auth.js';
import { servicesForUser } from './team-services.js';
import { authenticateMemberAppToken } from './member-auth.js';

const ROLE_ORDER={none:0,group_leader:1,cluster_leader:2,pastor:3};
const GROUP_FIELDS=['name','cluster_id','leader_name','deputy_leader_name','meeting_day','meeting_time','meeting_frequency','meeting_address','postcode','navigation_address','contact_phone','current_size','capacity_max','reception_status','audience_profile','weekly_status','temporary_change','announcement','status','schedule_note','language_profile','family_profile','children_profile','occupation_profile','age_profile','background_profile','capacity_note'];
const VALID={status:['active','inactive','paused'],reception_status:['open','near_full','closed','paused'],weekly_status:['normal','cancelled','changed']};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const clean=(v,max=500)=>String(v??'').trim().slice(0,max);
const id=p=>p+'_'+crypto.randomUUID();
const pc=v=>clean(v,20).replace(/\s+/g,'').toUpperCase();
async function hash(v){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function token(){const b=crypto.getRandomValues(new Uint8Array(32));return btoa(String.fromCharCode(...b)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','')}

async function human(request,env){
  const user=await authenticateHumanSession(request,env);if(!user)return null;
  const services=await servicesForUser(env,user.id);
  const r=await env.DB.prepare("SELECT role,cluster_id,group_id FROM organization_role_assignments WHERE user_id=? AND active=1").bind(user.id).all();
  const assignments=r.results||[];if(user.role==='owner'||services.includes('admin'))assignments.unshift({role:'pastor',cluster_id:null,group_id:null});
  const level=assignments.some(x=>x.role==='pastor')?'pastor':assignments.some(x=>x.role==='cluster_leader')?'cluster_leader':assignments.some(x=>x.role==='group_leader')?'group_leader':'none';
  return{user,services,assignments,level};
}
async function requireHuman(request,env){
  const x=await human(request,env);if(!x)return{response:json({ok:false,error:'请先登录同工账号'},401)};
  if(!x.services.includes('admin')&&!x.services.includes('organization'))return{response:json({ok:false,error:'没有小组与组织管理权限'},403)};
  if(x.level==='none')return{response:json({ok:false,error:'尚未分配组织管理角色'},403)};return{x};
}
function clusters(x){return x.assignments.filter(a=>a.role==='cluster_leader').map(a=>a.cluster_id).filter(Boolean)}
function groups(x){return x.assignments.filter(a=>a.role==='group_leader').map(a=>a.group_id).filter(Boolean)}
function scope(x,alias='g'){
  if(x.level==='pastor')return{sql:'1=1',args:[]};
  const cs=clusters(x),gs=groups(x),p=[],args=[];if(cs.length){p.push(alias+'.cluster_id IN ('+cs.map(()=>'?').join(',')+')');args.push(...cs)}
  if(gs.length){p.push(alias+'.id IN ('+gs.map(()=>'?').join(',')+')');args.push(...gs)}return{sql:p.length?'('+p.join(' OR ')+')':'0=1',args};
}
const canCluster=(x,c)=>x.level==='pastor'||clusters(x).includes(c);
const canGroup=(x,g)=>Boolean(g)&&(x.level==='pastor'||clusters(x).includes(g.cluster_id)||groups(x).includes(g.id));
const getGroup=(env,g)=>env.DB.prepare("SELECT g.*,c.name cluster_display_name FROM church_groups g LEFT JOIN church_clusters c ON c.id=g.cluster_id WHERE g.id=? AND g.is_demo=0").bind(g).first();
async function audit(env,x,action,type,entity,before,after,member=null){await env.DB.prepare("INSERT INTO organization_audit_log(id,actor_user_id,actor_member_id,action,entity_type,entity_id,before_json,after_json) VALUES(?,?,?,?,?,?,?,?)").bind(id('AUD'),x?.user?.id||null,member,action,type,entity,before==null?null:JSON.stringify(before),after==null?null:JSON.stringify(after)).run()}

async function overview(request,env,kind,url){
  const a=await requireHuman(request,env);if(a.response)return a.response;const x=a.x,s=scope(x);
  if(kind==='dashboard'){
    const r=await env.DB.prepare(`SELECT c.id,c.name,c.status,COUNT(DISTINCT g.id) group_count,
      COUNT(DISTINCT CASE WHEN m.status='active' THEN m.id END) member_count,
      COUNT(DISTINCT CASE WHEN g.reception_status='open' AND g.status='active' THEN g.id END) open_groups,
      (SELECT COUNT(*) FROM welcome_cases w WHERE w.assigned_cluster_id=c.id AND w.status IN ('new','triaged','assigned','contacted')) pending_newcomers
      FROM church_clusters c JOIN church_groups g ON g.cluster_id=c.id AND g.is_demo=0
      LEFT JOIN church_members m ON m.group_id=g.id WHERE ${s.sql} GROUP BY c.id ORDER BY c.sort_order`).bind(...s.args).all();
    return json({ok:true,role:x.level,clusters:r.results||[]});
  }
  if(kind==='groups'){
    const where=[s.sql],args=[...s.args];for(const [q,col] of [['cluster_id','g.cluster_id'],['reception_status','g.reception_status']]){const v=clean(url.searchParams.get(q),80);if(v){where.push(col+'=?');args.push(v)}}
    const postcode=pc(url.searchParams.get('postcode'));if(postcode){where.push('g.postcode LIKE ?');args.push('%'+postcode+'%')}
    const leader=clean(url.searchParams.get('leader'),120);if(leader){where.push('g.leader_name LIKE ?');args.push('%'+leader+'%')}
    const r=await env.DB.prepare(`SELECT g.*,c.name cluster_display_name,(SELECT COUNT(*) FROM church_members m WHERE m.group_id=g.id AND m.status='active') member_count
      FROM church_groups g LEFT JOIN church_clusters c ON c.id=g.cluster_id WHERE g.is_demo=0 AND ${where.join(' AND ')} ORDER BY c.sort_order,g.group_number`).bind(...args).all();
    return json({ok:true,role:x.level,groups:r.results||[]});
  }
  if(kind==='members'){
    const where=[s.sql],args=[...s.args],gid=clean(url.searchParams.get('group_id'),100),st=clean(url.searchParams.get('status'),30);
    if(gid){where.push('m.group_id=?');args.push(gid)}if(st){where.push('m.status=?');args.push(st)}
    const r=await env.DB.prepare(`SELECT m.*,g.name group_name,g.group_number,c.name cluster_name FROM church_members m
      JOIN church_groups g ON g.id=m.group_id LEFT JOIN church_clusters c ON c.id=m.cluster_id
      WHERE ${where.join(' AND ')} ORDER BY c.sort_order,g.group_number,m.display_name`).bind(...args).all();
    return json({ok:true,role:x.level,members:r.results||[]});
  }
  const gr=await env.DB.prepare(`SELECT g.id,g.group_number,g.name,g.cluster_id,g.leader_name,g.status,g.reception_status,c.name cluster_name
    FROM church_groups g JOIN church_clusters c ON c.id=g.cluster_id WHERE g.is_demo=0 AND ${s.sql} ORDER BY c.sort_order,g.group_number`).bind(...s.args).all();
  const mr=await env.DB.prepare(`SELECT m.id,m.display_name,m.group_id,m.member_role FROM church_members m JOIN church_groups g ON g.id=m.group_id
    WHERE m.status='active' AND ${s.sql} ORDER BY m.display_name`).bind(...s.args).all();
  const rr=await env.DB.prepare("SELECT r.role,r.cluster_id,r.group_id,u.id user_id,u.name FROM organization_role_assignments r JOIN admin_users u ON u.id=r.user_id WHERE r.active=1").all();
  const out={};for(const g of gr.results||[]){const c=out[g.cluster_id]??={id:g.cluster_id,name:g.cluster_name,leaders:[],groups:[]};c.groups.push({...g,leaders:(rr.results||[]).filter(v=>v.role==='group_leader'&&v.group_id===g.id),members:(mr.results||[]).filter(v=>v.group_id===g.id)})}
  for(const c of Object.values(out))c.leaders=(rr.results||[]).filter(v=>v.role==='cluster_leader'&&v.cluster_id===c.id);
  return json({ok:true,role:x.level,clusters:Object.values(out)});
}
function groupChanges(body){
  const o={};for(const k of GROUP_FIELDS)if(Object.hasOwn(body,k))o[k]=['current_size','capacity_max'].includes(k)?(body[k]===''?null:Number(body[k])):clean(body[k],k==='announcement'?3000:500);
  if(Object.hasOwn(o,'postcode'))o.postcode=pc(o.postcode);for(const k of Object.keys(VALID))if(Object.hasOwn(o,k)&&!VALID[k].includes(o[k]))delete o[k];return o;
}
async function saveGroup(request,env,gid=''){
  const a=await requireHuman(request,env);if(a.response)return a.response;const x=a.x,b=await request.json().catch(()=>({}));
  if(gid){const before=await getGroup(env,gid);if(!before)return json({ok:false,error:'小组不存在'},404);if(!canGroup(x,before))return json({ok:false,error:'不得修改其他大组或小组'},403);
    const c=groupChanges(b);if(c.cluster_id&&c.cluster_id!==before.cluster_id&&x.level!=='pastor')return json({ok:false,error:'只有牧师可以跨大组移动小组'},403);
    const keys=Object.keys(c);if(!keys.length)return json({ok:false,error:'没有可保存字段'},400);const resetGeo=Object.hasOwn(c,'postcode')&&c.postcode!==before.postcode?',latitude=NULL,longitude=NULL':'';
    await env.DB.prepare("UPDATE church_groups SET "+keys.map(k=>k+'=?').join(',')+resetGeo+",updated_at=datetime('now') WHERE id=?").bind(...keys.map(k=>c[k]),gid).run();
    const after=await getGroup(env,gid);await audit(env,x,'group.update','group',gid,before,after);return json({ok:true,group:after});
  }
  if(ROLE_ORDER[x.level]<ROLE_ORDER.cluster_leader)return json({ok:false,error:'只有牧师或大组长可以建立小组'},403);const c=groupChanges(b),cid=clean(c.cluster_id,100),num=Number(b.group_number);
  if(!cid||!canCluster(x,cid)||!Number.isInteger(num)||!c.name)return json({ok:false,error:'小组编号、名称或所属大组不正确'},400);const gidNew=id('group');
  await env.DB.prepare(`INSERT INTO church_groups(id,name,cluster_name,cluster_leader_name,leader_name,group_number,postcode,is_demo,cluster_id,status,
   meeting_day,meeting_time,meeting_frequency,meeting_address,navigation_address,contact_phone,reception_status,weekly_status,temporary_change,announcement)
   SELECT ?,?,c.name,'',?,?,?,0,c.id,?,?,?,?,?,?,?,?,?,?,? FROM church_clusters c WHERE c.id=?`).bind(gidNew,c.name,c.leader_name||'',num,c.postcode||'',c.status||'active',c.meeting_day||'',c.meeting_time||'',c.meeting_frequency||'',c.meeting_address||'',c.navigation_address||'',c.contact_phone||'',c.reception_status||'open',c.weekly_status||'normal',c.temporary_change||'',c.announcement||'',cid).run();
  const after=await getGroup(env,gidNew);await audit(env,x,'group.create','group',gidNew,null,after);return json({ok:true,group:after},201);
}
async function saveMember(request,env,mid=''){
  const a=await requireHuman(request,env);if(a.response)return a.response;const x=a.x,b=await request.json().catch(()=>({})),g=await getGroup(env,clean(b.group_id,100));
  if(!canGroup(x,g))return json({ok:false,error:'不得管理其他范围的成员'},403);const v=[clean(b.display_name,120),clean(b.phone,80),clean(b.email,200),clean(b.address,500),pc(b.postcode),g.cluster_id,g.id,b.member_role==='assistant'?'assistant':'member',clean(b.family_note,500),clean(b.language_note,500),clean(b.private_note,2000)];
  if(!v[0])return json({ok:false,error:'请填写成员姓名'},400);
  if(!mid){mid=id('MEM');await env.DB.prepare("INSERT INTO church_members(id,display_name,phone,email,address,postcode,cluster_id,group_id,member_role,family_note,language_note,private_note,joined_at,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),?)").bind(mid,...v,x.user.id).run();const after=await env.DB.prepare("SELECT * FROM church_members WHERE id=?").bind(mid).first();await audit(env,x,'member.create','member',mid,null,after);return json({ok:true,member:after},201)}
  const before=await env.DB.prepare("SELECT * FROM church_members WHERE id=?").bind(mid).first();if(!before)return json({ok:false,error:'成员不存在'},404);const old=await getGroup(env,before.group_id);if(!canGroup(x,old))return json({ok:false,error:'不得修改其他小组成员'},403);
  if(before.group_id!==g.id&&x.level==='group_leader')return changeRequest(env,x,'member_transfer',mid,before.group_id,g.cluster_id,g.id,b);
  await env.DB.prepare("UPDATE church_members SET display_name=?,phone=?,email=?,address=?,postcode=?,cluster_id=?,group_id=?,member_role=?,family_note=?,language_note=?,private_note=?,updated_at=datetime('now') WHERE id=?").bind(...v,mid).run();
  const after=await env.DB.prepare("SELECT * FROM church_members WHERE id=?").bind(mid).first();await audit(env,x,'member.update','member',mid,before,after);return json({ok:true,member:after});
}
async function changeRequest(env,x,type,mid,gid,tc,tg,b){const rid=id('REQ');await env.DB.prepare("INSERT INTO organization_change_requests(id,request_type,member_id,group_id,target_cluster_id,target_group_id,payload_json,reason,requested_by) VALUES(?,?,?,?,?,?,?,?,?)").bind(rid,type,mid,gid,tc,tg,JSON.stringify(b),clean(b.reason,1000),x.user.id).run();await audit(env,x,'request.create','change_request',rid,null,{type,mid,gid,tc,tg});return json({ok:true,pending:true,request_id:rid},202)}
async function memberAction(request,env,mid,action){
 const a=await requireHuman(request,env);if(a.response)return a.response;const x=a.x,b=await request.json().catch(()=>({})),before=await env.DB.prepare("SELECT * FROM church_members WHERE id=?").bind(mid).first();
 if(!before)return json({ok:false,error:'成员不存在'},404);const old=await getGroup(env,before.group_id);if(!canGroup(x,old))return json({ok:false,error:'无权操作'},403);
 if(x.level==='group_leader')return changeRequest(env,x,action==='leave'?'member_leave':'member_transfer',mid,before.group_id,null,clean(b.target_group_id,100)||null,b);
 if(action==='leave')await env.DB.prepare("UPDATE church_members SET status='left',left_at=datetime('now'),updated_at=datetime('now') WHERE id=?").bind(mid).run();
 else{const g=await getGroup(env,clean(b.target_group_id,100));if(!canGroup(x,g))return json({ok:false,error:'目标小组不在管理范围'},403);await env.DB.prepare("UPDATE church_members SET cluster_id=?,group_id=?,status='active',updated_at=datetime('now') WHERE id=?").bind(g.cluster_id,g.id,mid).run()}
 const after=await env.DB.prepare("SELECT * FROM church_members WHERE id=?").bind(mid).first();await audit(env,x,'member.'+action,'member',mid,before,after);return json({ok:true,member:after});
}
async function appoint(request,env){
 const a=await requireHuman(request,env);if(a.response)return a.response;const x=a.x,b=await request.json().catch(()=>({})),role=clean(b.role,30),uid=clean(b.user_id,100),cid=clean(b.cluster_id,100)||null,gid=clean(b.group_id,100)||null;
 if(!['pastor','cluster_leader','group_leader'].includes(role))return json({ok:false,error:'角色不正确'},400);if(role!=='group_leader'&&x.level!=='pastor')return json({ok:false,error:'只有牧师可以任命牧师或大组长'},403);
 if(role==='group_leader'){const g=await getGroup(env,gid);if(!g||!canCluster(x,g.cluster_id))return json({ok:false,error:'不得任命其他大组的小组长'},403)}
 const u=await env.DB.prepare("SELECT id FROM admin_users WHERE id=? AND status='active'").bind(uid).first();if(!u)return json({ok:false,error:'同工账号不存在'},404);const rid=id('ROLE');
 await env.DB.prepare("INSERT INTO organization_role_assignments(id,user_id,role,cluster_id,group_id,appointed_by) VALUES(?,?,?,?,?,?)").bind(rid,uid,role,cid,gid,x.user.id).run();await audit(env,x,'role.appoint','role_assignment',rid,null,{uid,role,cid,gid});return json({ok:true,id:rid},201);
}
async function roleManagement(request,env,assignmentId=''){
 const a=await requireHuman(request,env);if(a.response)return a.response;const x=a.x;
 if(request.method==='GET'){const r=await env.DB.prepare("SELECT r.*,u.name user_name,c.name cluster_name,g.name group_name FROM organization_role_assignments r JOIN admin_users u ON u.id=r.user_id LEFT JOIN church_clusters c ON c.id=r.cluster_id LEFT JOIN church_groups g ON g.id=r.group_id WHERE r.active=1 ORDER BY r.created_at DESC").all();let rows=r.results||[];if(x.level!=='pastor')rows=rows.filter(v=>(v.role==='group_leader'&&canCluster(x,v.cluster_id))||(v.user_id===x.user.id));return json({ok:true,roles:rows})}
 if(x.level!=='pastor')return json({ok:false,error:'只有牧师可以撤销组织角色'},403);const before=await env.DB.prepare("SELECT * FROM organization_role_assignments WHERE id=? AND active=1").bind(assignmentId).first();if(!before)return json({ok:false,error:'角色任命不存在'},404);
 await env.DB.prepare("UPDATE organization_role_assignments SET active=0,ended_at=datetime('now') WHERE id=?").bind(assignmentId).run();await audit(env,x,'role.revoke','role_assignment',assignmentId,before,{active:0});return json({ok:true});
}
async function changeRequests(request,env,rid=''){
 const a=await requireHuman(request,env);if(a.response)return a.response;const x=a.x,s=scope(x),r=await env.DB.prepare(`SELECT q.*,m.display_name,g.cluster_id source_cluster_id,g.name source_group_name,tg.name target_group_name FROM organization_change_requests q LEFT JOIN church_members m ON m.id=q.member_id LEFT JOIN church_groups g ON g.id=q.group_id LEFT JOIN church_groups tg ON tg.id=q.target_group_id WHERE ${s.sql} ORDER BY q.created_at DESC`).bind(...s.args).all();
 if(request.method==='GET')return json({ok:true,requests:r.results||[]});if(ROLE_ORDER[x.level]<ROLE_ORDER.cluster_leader)return json({ok:false,error:'申请须由牧师或大组长审批'},403);
 const item=(r.results||[]).find(v=>v.id===rid);if(!item)return json({ok:false,error:'申请不存在或不在管理范围'},404);if(item.status!=='pending')return json({ok:false,error:'申请已经处理'},409);const b=await request.json().catch(()=>({})),decision=b.decision==='approved'?'approved':b.decision==='rejected'?'rejected':'';
 if(!decision)return json({ok:false,error:'审批结果不正确'},400);const before=await env.DB.prepare("SELECT * FROM church_members WHERE id=?").bind(item.member_id).first();
 if(decision==='approved'&&item.request_type==='member_leave')await env.DB.prepare("UPDATE church_members SET status='left',left_at=datetime('now'),updated_at=datetime('now') WHERE id=?").bind(item.member_id).run();
 if(decision==='approved'&&item.request_type==='member_transfer'){const g=await getGroup(env,item.target_group_id);if(!g||!canGroup(x,g))return json({ok:false,error:'目标小组不在审批范围'},403);await env.DB.prepare("UPDATE church_members SET cluster_id=?,group_id=?,status='active',updated_at=datetime('now') WHERE id=?").bind(g.cluster_id,g.id,item.member_id).run()}
 await env.DB.prepare("UPDATE organization_change_requests SET status=?,reviewed_by=?,reviewed_at=datetime('now') WHERE id=?").bind(decision,x.user.id,rid).run();const after=await env.DB.prepare("SELECT * FROM church_members WHERE id=?").bind(item.member_id).first();await audit(env,x,'request.'+decision,'change_request',rid,item,{member_before:before,member_after:after});return json({ok:true,status:decision});
}
async function auditLog(request,env,url){const a=await requireHuman(request,env);if(a.response)return a.response;const x=a.x;if(x.level!=='pastor')return json({ok:false,error:'只有牧师可查看完整审计记录'},403);const limit=Math.min(200,Math.max(1,Number(url.searchParams.get('limit'))||100));const r=await env.DB.prepare("SELECT a.*,u.name actor_name FROM organization_audit_log a LEFT JOIN admin_users u ON u.id=a.actor_user_id ORDER BY a.created_at DESC LIMIT ?").bind(limit).all();return json({ok:true,audit:r.results||[]})}
async function staff(request,env){const a=await requireHuman(request,env);if(a.response)return a.response;const r=await env.DB.prepare("SELECT id,name,email,role,status FROM admin_users WHERE status='active' ORDER BY name").all();return json({ok:true,staff:r.results||[]})}
async function notices(request,env){
 const a=await requireHuman(request,env);if(a.response)return a.response;const x=a.x;if(request.method==='GET'){const s=scope(x);const r=await env.DB.prepare(`SELECT n.* FROM group_notifications n WHERE n.scope_type='church' OR (n.scope_type='cluster' AND n.cluster_id IN(SELECT DISTINCT g.cluster_id FROM church_groups g WHERE ${s.sql})) OR (n.scope_type='group' AND n.group_id IN(SELECT g.id FROM church_groups g WHERE ${s.sql})) ORDER BY n.created_at DESC`).bind(...s.args,...s.args).all();return json({ok:true,notifications:r.results||[]})}
 const b=await request.json().catch(()=>({})),st=clean(b.scope_type,20),cid=clean(b.cluster_id,100)||null,gid=clean(b.group_id,100)||null;if(st==='church'&&x.level!=='pastor')return json({ok:false,error:'只有牧师可发布全教会通知'},403);if(st==='cluster'&&!canCluster(x,cid))return json({ok:false,error:'无权发布'},403);if(st==='group'&&!canGroup(x,await getGroup(env,gid)))return json({ok:false,error:'无权发布'},403);const nid=id('NOT');
 await env.DB.prepare("INSERT INTO group_notifications(id,scope_type,cluster_id,group_id,title,body,starts_at,ends_at,status,created_by) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(nid,st,cid,gid,clean(b.title,200),clean(b.body,3000),clean(b.starts_at,50)||null,clean(b.ends_at,50)||null,b.status==='draft'?'draft':'active',x.user.id).run();await audit(env,x,'notification.create','notification',nid,null,b);return json({ok:true,id:nid},201);
}
async function welcome(request,env,caseId='',action=''){
 const a=await requireHuman(request,env);if(a.response)return a.response;const x=a.x;if(!caseId){const r=await env.DB.prepare("SELECT w.*,g.name assigned_group_name,c.name assigned_cluster_name FROM welcome_cases w LEFT JOIN church_groups g ON g.id=w.assigned_group_id LEFT JOIN church_clusters c ON c.id=w.assigned_cluster_id ORDER BY w.updated_at DESC").all();let rows=r.results||[];if(x.level!=='pastor')rows=rows.filter(v=>groups(x).includes(v.assigned_group_id)||clusters(x).includes(v.assigned_cluster_id));return json({ok:true,cases:rows})}
 const b=await request.json().catch(()=>({})),item=await env.DB.prepare("SELECT * FROM welcome_cases WHERE id=?").bind(caseId).first();if(!item)return json({ok:false,error:'新人记录不存在'},404);
 if(action==='assign'){if(x.level==='group_leader')return json({ok:false,error:'最终分配须由牧师或大组长确认'},403);const g=await getGroup(env,clean(b.group_id,100));if(!canGroup(x,g))return json({ok:false,error:'不得跨范围分配'},403);await env.DB.batch([env.DB.prepare("UPDATE welcome_assignments SET active=0,ended_at=datetime('now') WHERE case_id=? AND active=1").bind(caseId),env.DB.prepare("INSERT INTO welcome_assignments(id,case_id,group_id,carer_user_id,carer_name,reason,assigned_by) VALUES(?,?,?,?,?,?,?)").bind(id('ASN'),caseId,g.id,clean(b.carer_user_id,100)||null,clean(b.carer_name,120),clean(b.reason,1000),x.user.id),env.DB.prepare("UPDATE welcome_cases SET assigned_group_id=?,assigned_cluster_id=?,primary_carer_user_id=?,primary_carer_name=?,status='assigned',updated_at=datetime('now') WHERE id=?").bind(g.id,g.cluster_id,clean(b.carer_user_id,100)||null,clean(b.carer_name,120),caseId)]);await audit(env,x,'welcome.assign','welcome_case',caseId,item,{group_id:g.id});return json({ok:true})}
 if(item.assigned_group_id&&!canGroup(x,await getGroup(env,item.assigned_group_id)))return json({ok:false,error:'不得跟进其他范围新人'},403);const fid=id('FUP');await env.DB.prepare("INSERT INTO welcome_followups(id,case_id,actor_user_id,outcome,note,next_followup_at,contact_date,contact_method,welcome_sent,attended,assigned_cluster_id,assigned_group_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)").bind(fid,caseId,x.user.id,clean(b.outcome,120),clean(b.note,2000),clean(b.next_followup_at,50)||null,clean(b.contact_date,50)||null,clean(b.contact_method,80),b.welcome_sent?1:0,b.attended==null?null:(b.attended?1:0),item.assigned_cluster_id,item.assigned_group_id).run();await env.DB.prepare("UPDATE welcome_cases SET welcome_sent=MAX(welcome_sent,?),next_followup_at=?,updated_at=datetime('now') WHERE id=?").bind(b.welcome_sent?1:0,clean(b.next_followup_at,50)||null,caseId).run();await audit(env,x,'welcome.followup','welcome_case',caseId,null,{fid});return json({ok:true,id:fid},201);
}
async function appIdentity(request,env){return authenticateMemberAppToken(request,env)}
async function issueToken(request,env,mid){const a=await requireHuman(request,env);if(a.response)return a.response;if(a.x.level!=='pastor')return json({ok:false,error:'只有牧师可签发 App 令牌'},403);const m=await env.DB.prepare("SELECT id FROM church_members WHERE id=? AND status='active'").bind(mid).first();if(!m)return json({ok:false,error:'成员不存在'},404);const raw=token(),tid=id('TOK');await env.DB.prepare("INSERT INTO member_app_tokens(id,member_id,token_hash,label,created_by) VALUES(?,?,?,?,?)").bind(tid,mid,await hash(raw),'教会 App',a.x.user.id).run();await audit(env,a.x,'app_token.create','member',mid,null,{tid});return json({ok:true,token:raw,notice:'只显示一次'},201)}
const APP_PHOTO_TYPES=new Map([['image/jpeg','jpg'],['image/png','png'],['image/webp','webp'],['image/heic','heic'],['image/heif','heif']]);
function validAppPhotoBytes(buffer,mime){const b=new Uint8Array(buffer);if(mime==='image/jpeg')return b[0]===0xff&&b[1]===0xd8&&b[2]===0xff;if(mime==='image/png')return b.length>8&&b[0]===0x89&&b[1]===0x50&&b[2]===0x4e&&b[3]===0x47;if(mime==='image/webp')return b.length>12&&String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP';if(mime==='image/heic'||mime==='image/heif')return b.length>12&&String.fromCharCode(...b.slice(4,12)).includes('ftyp');return false}
async function appSubmission(request,env,clientRequestId,photo=false){
 const u=await appIdentity(request,env);if(!u)return json({ok:false,error:'App 登录已失效'},401);if(!u.scope_list.includes(photo?'welcome:photo':'welcome:submit'))return json({ok:false,error:'当前账号没有新人接待权限'},403);
 const item=await env.DB.prepare("SELECT id,status,created_at,updated_at FROM welcome_cases WHERE submitted_by_member_id=? AND client_request_id=?").bind(u.member_id,clientRequestId).first();if(!item)return json({ok:false,error:'App 提交记录不存在'},404);
 if(!photo){const p=await env.DB.prepare("SELECT id,mime_type,filename,size_bytes,created_at FROM welcome_case_photos WHERE case_id=? AND status='active' ORDER BY created_at").bind(item.id).all();return json({ok:true,submission:{client_request_id:clientRequestId,...item,photos:p.results||[]}})}
 if(!env.MEDIA)return json({ok:false,error:'照片存储尚未配置'},503);const form=await request.formData().catch(()=>null),file=form?.get('image');if(!file||typeof file.arrayBuffer!=='function')return json({ok:false,error:'请选择信息卡照片'},400);
 const mime=clean(file.type,100).toLowerCase(),ext=APP_PHOTO_TYPES.get(mime);if(!ext)return json({ok:false,error:'仅支持 JPG、PNG、WebP 或 HEIC 照片'},415);if(!file.size||file.size>12*1024*1024)return json({ok:false,error:'每张照片最大 12MB'},413);const bytes=await file.arrayBuffer();if(!validAppPhotoBytes(bytes,mime))return json({ok:false,error:'照片内容与文件格式不符'},415);
 const photoId=id('wphoto'),key=`private/welcome-cards/${item.id}/${photoId}.${ext}`,filename=clean(file.name,180)||`welcome-card.${ext}`;await env.MEDIA.put(key,bytes,{httpMetadata:{contentType:mime,contentDisposition:'inline'},customMetadata:{caseId:item.id,photoId}});
 try{await env.DB.prepare("INSERT INTO welcome_case_photos(id,case_id,r2_key,mime_type,filename,size_bytes,uploaded_by_member_id,status) VALUES(?,?,?,?,?,?,?,'active')").bind(photoId,item.id,key,mime,filename,file.size,u.member_id).run()}catch(error){await env.MEDIA.delete(key).catch(()=>{});return json({ok:false,error:'照片记录保存失败，已撤销上传'},500)}
 await audit(env,null,'welcome.app_photo_upload','welcome_case',item.id,null,{photo_id:photoId},u.member_id);return json({ok:true,photo:{id:photoId,mime_type:mime,filename,size_bytes:file.size}},201);
}
async function app(request,env,kind){
 const u=await appIdentity(request,env);if(!u)return json({ok:false,error:'App 登录已失效'},401);
 if(kind==='my-group'){if(!u.scope_list.includes('my-group:read'))return json({ok:false,error:'当前账号没有读取小组资料的权限'},403);const g=await env.DB.prepare("SELECT g.id,g.group_number,g.name group_name,c.name cluster_name,g.cluster_leader_name,g.leader_name,g.meeting_day,g.meeting_time,g.meeting_frequency,g.meeting_address,g.postcode,g.navigation_address,g.contact_phone,g.reception_status,g.weekly_status,g.temporary_change,g.announcement,g.schedule_note FROM church_groups g JOIN church_clusters c ON c.id=g.cluster_id WHERE g.id=? AND g.status='active'").bind(u.group_id).first();if(!g)return json({ok:false,error:'尚未分配有效小组'},404);const ar=await env.DB.prepare("SELECT m.id,m.display_name FROM group_assistants a JOIN church_members m ON m.id=a.member_id WHERE a.group_id=? AND m.status='active' ORDER BY m.display_name").bind(u.group_id).all();const n=await env.DB.prepare("SELECT id,title,body,scope_type,starts_at,ends_at FROM group_notifications WHERE status='active' AND (scope_type='church' OR (scope_type='cluster' AND cluster_id=?) OR (scope_type='group' AND group_id=?)) AND (starts_at IS NULL OR datetime(starts_at)<=datetime('now')) AND (ends_at IS NULL OR datetime(ends_at)>=datetime('now')) ORDER BY created_at DESC").bind(u.cluster_id,u.group_id).all();return json({ok:true,member:{id:u.member_id,name:u.display_name},group:{...g,assistants:ar.results||[]},notifications:n.results||[]})}
 if(!u.scope_list.includes('welcome:submit'))return json({ok:false,error:'当前账号没有新人接待提交权限'},403);const b=await request.json().catch(()=>({})),postcode=pc(b.postcode),clientRequestId=clean(b.client_request_id,120);if(!postcode)return json({ok:false,error:'请填写新人邮编'},400);if(!clientRequestId||!/^[A-Za-z0-9._:-]{8,120}$/.test(clientRequestId))return json({ok:false,error:'client_request_id 格式不正确'},400);const previous=await env.DB.prepare("SELECT id,status FROM welcome_cases WHERE submitted_by_member_id=? AND client_request_id=?").bind(u.member_id,clientRequestId).first();if(previous)return json({ok:true,id:previous.id,status:previous.status,existing:true});const wid=id('welcome');try{await env.DB.prepare("INSERT INTO welcome_cases(id,display_name,contact_note,postcode,age_band,family_status,children_note,occupation_stage,preferred_days,language_note,background_note,status,source,submitted_by_member_id,client_request_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,'new','app',?,?)").bind(wid,clean(b.display_name,120)||'新朋友',clean(b.contact_note,1000),postcode,clean(b.age_band,80),clean(b.family_status,120),clean(b.children_note,500),clean(b.occupation_stage,120),clean(b.preferred_days,300),clean(b.language_note,300),clean(b.background_note,1000),u.member_id,clientRequestId).run()}catch{const same=await env.DB.prepare("SELECT id,status FROM welcome_cases WHERE submitted_by_member_id=? AND client_request_id=?").bind(u.member_id,clientRequestId).first();if(same)return json({ok:true,id:same.id,status:same.status,existing:true});return json({ok:false,error:'新人资料保存失败'},500)}await audit(env,null,'welcome.app_submit','welcome_case',wid,null,{source:'app',client_request_id:clientRequestId},u.member_id);return json({ok:true,id:wid,status:'new',existing:false},201);
}
export async function handleOrganizationApi(request,env,url){
 if(!url.pathname.startsWith('/api/organization/')&&!url.pathname.startsWith('/api/app/'))return null;
 if(url.pathname==='/api/app/my-group'&&request.method==='GET')return app(request,env,'my-group');if(url.pathname==='/api/app/welcome'&&request.method==='POST')return app(request,env,'welcome');let appMatch=url.pathname.match(/^\/api\/app\/welcome\/submissions\/([^/]+)(\/photos)?$/);if(appMatch&&request.method==='GET'&&!appMatch[2])return appSubmission(request,env,decodeURIComponent(appMatch[1]),false);if(appMatch&&request.method==='POST'&&appMatch[2])return appSubmission(request,env,decodeURIComponent(appMatch[1]),true);
 if(url.pathname==='/api/organization/dashboard'&&request.method==='GET')return overview(request,env,'dashboard',url);if(url.pathname==='/api/organization/tree'&&request.method==='GET')return overview(request,env,'tree',url);
 if(url.pathname==='/api/organization/groups'&&request.method==='GET')return overview(request,env,'groups',url);if(url.pathname==='/api/organization/groups'&&request.method==='POST')return saveGroup(request,env);
 if(url.pathname==='/api/organization/members'&&request.method==='GET')return overview(request,env,'members',url);if(url.pathname==='/api/organization/members'&&request.method==='POST')return saveMember(request,env);
 if(url.pathname==='/api/organization/staff'&&request.method==='GET')return staff(request,env);if(url.pathname==='/api/organization/roles'&&request.method==='POST')return appoint(request,env);if(url.pathname==='/api/organization/roles'&&request.method==='GET')return roleManagement(request,env);if(url.pathname==='/api/organization/requests'&&request.method==='GET')return changeRequests(request,env);if(url.pathname==='/api/organization/audit'&&request.method==='GET')return auditLog(request,env,url);if(url.pathname==='/api/organization/notifications')return notices(request,env);
 if(url.pathname==='/api/organization/welcome'&&request.method==='GET')return welcome(request,env);
 let m=url.pathname.match(/^\/api\/organization\/groups\/([^/]+)$/);if(m&&request.method==='POST')return saveGroup(request,env,decodeURIComponent(m[1]));
 m=url.pathname.match(/^\/api\/organization\/members\/([^/]+)$/);if(m&&request.method==='POST')return saveMember(request,env,decodeURIComponent(m[1]));
 m=url.pathname.match(/^\/api\/organization\/members\/([^/]+)\/(transfer|leave)$/);if(m&&request.method==='POST')return memberAction(request,env,decodeURIComponent(m[1]),m[2]);
 m=url.pathname.match(/^\/api\/organization\/members\/([^/]+)\/app-token$/);if(m&&request.method==='POST')return issueToken(request,env,decodeURIComponent(m[1]));
 m=url.pathname.match(/^\/api\/organization\/roles\/([^/]+)\/revoke$/);if(m&&request.method==='POST')return roleManagement(request,env,decodeURIComponent(m[1]));
 m=url.pathname.match(/^\/api\/organization\/requests\/([^/]+)\/review$/);if(m&&request.method==='POST')return changeRequests(request,env,decodeURIComponent(m[1]));
 m=url.pathname.match(/^\/api\/organization\/welcome\/([^/]+)\/(assign|followups)$/);if(m&&request.method==='POST')return welcome(request,env,decodeURIComponent(m[1]),m[2]);
 return json({ok:false,error:'not found'},404);
}
