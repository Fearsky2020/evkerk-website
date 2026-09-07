import { authorizeService } from './team-services.js';

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function clean(value,max=500){return String(value??'').trim().slice(0,max)}
function id(prefix='w'){return `${prefix}_${crypto.randomUUID()}`}
function normalizePostcode(value){return clean(value,20).toUpperCase().replace(/\s+/g,'')}
function validPostcode(value){return /^\d{4}[A-Z]{2}$/.test(normalizePostcode(value))}
function pointFromText(value){const m=String(value||'').match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/i);return m?{longitude:Number(m[1]),latitude:Number(m[2])}:null}

async function geocodePostcode(postcode){
  const pc=normalizePostcode(postcode);if(!validPostcode(pc))throw new Error('请输入有效的荷兰邮编，例如 2511BT');
  const url=new URL('https://api.pdok.nl/bzk/locatieserver/search/v3_1/free');
  url.searchParams.set('fq','type:postcode');url.searchParams.set('rows','1');url.searchParams.set('q',pc);
  const r=await fetch(url.toString(),{headers:{accept:'application/json'}});if(!r.ok)throw new Error('暂时无法查询这个邮编');
  const data=await r.json(),doc=data?.response?.docs?.[0],point=pointFromText(doc?.centroide_ll);
  if(!doc||!point)throw new Error('没有找到这个邮编');
  return{postcode:normalizePostcode(doc.postcode||pc),display:clean(doc.weergavenaam,200),...point};
}

function kmBetween(a,b){
  const rad=x=>x*Math.PI/180,R=6371,dLat=rad(b.latitude-a.latitude),dLon=rad(b.longitude-a.longitude);
  const x=Math.sin(dLat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dLon/2)**2;
  return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}
function has(text,needle){return needle&&clean(text,1000).toLowerCase().includes(clean(needle,100).toLowerCase())}
function recommendationScore(person,group,distanceKm){
  let score=Math.max(0,55-Math.min(distanceKm,30)*2.2),reasons=[];
  if(distanceKm<=3)reasons.push('距离很近');else if(distanceKm<=7)reasons.push('距离较近');
  if(person.preferred_days&&has(person.preferred_days,group.meeting_day)){score+=18;reasons.push('聚会时间符合');}
  if(person.family_status&&has(group.family_profile,person.family_status)){score+=10;reasons.push('家庭情况较匹配');}
  if(person.children_note&&has(group.children_profile,person.children_note)){score+=8;reasons.push('孩子情况较匹配');}
  if(person.occupation_stage&&has(group.occupation_profile,person.occupation_stage)){score+=7;reasons.push('生活/职业阶段较接近');}
  if(person.language_note&&has(group.language_profile,person.language_note.replace('双语',''))){score+=5;reasons.push('语言情况较合适');}
  if(!group.accepting_newcomers){score-=100;reasons.push('目前暂停接收新人');}
  return{score:Math.round(score*10)/10,reasons};
}
async function authWelcome(request,env){return authorizeService(request,env,'welcome')}

async function listGroups(request,env){
  const auth=await authWelcome(request,env);if(auth.response)return auth.response;
  const rows=await env.DB.prepare('SELECT * FROM church_groups WHERE is_demo=0 ORDER BY cluster_name,COALESCE(group_number,999),name').all();
  return json({ok:true,groups:rows.results||[]});
}
async function saveGroup(request,env){
  const auth=await authWelcome(request,env);if(auth.response)return auth.response;
  const body=await request.json().catch(()=>({})),name=clean(body.name,120),postcode=normalizePostcode(body.postcode);
  if(!name)return json({ok:false,error:'请填写小组名称'},400);if(!validPostcode(postcode))return json({ok:false,error:'请填写有效邮编'},400);
  let geo;try{geo=await geocodePostcode(postcode)}catch(e){return json({ok:false,error:e.message},400)}
  const groupId=clean(body.id,100)||id('grp'),accept=body.accepting_newcomers===false||body.accepting_newcomers===0?0:1;
  const existing=await env.DB.prepare('SELECT id FROM church_groups WHERE id=?').bind(groupId).first();
  const vals=[name,clean(body.cluster_name,100),clean(body.leader_name,100),geo.postcode,geo.latitude,geo.longitude,clean(body.meeting_day,30),clean(body.meeting_time,30),['always','often','sometimes','no','unknown'].includes(body.dinner)?body.dinner:'unknown',clean(body.age_profile),clean(body.occupation_profile),clean(body.family_profile),clean(body.children_profile),clean(body.language_profile),clean(body.background_profile),clean(body.capacity_note),accept,clean(body.notes),0];
  if(existing){await env.DB.prepare("UPDATE church_groups SET name=?,cluster_name=?,leader_name=?,postcode=?,latitude=?,longitude=?,meeting_day=?,meeting_time=?,dinner=?,age_profile=?,occupation_profile=?,family_profile=?,children_profile=?,language_profile=?,background_profile=?,capacity_note=?,accepting_newcomers=?,notes=?,is_demo=?,updated_at=datetime('now') WHERE id=?").bind(...vals,groupId).run();}
  else{await env.DB.prepare('INSERT INTO church_groups(id,name,cluster_name,leader_name,postcode,latitude,longitude,meeting_day,meeting_time,dinner,age_profile,occupation_profile,family_profile,children_profile,language_profile,background_profile,capacity_note,accepting_newcomers,notes,is_demo) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(groupId,...vals).run();}
  return json({ok:true,id:groupId,postcode:geo.postcode},existing?200:201);
}

async function recommend(request,env){
  const auth=await authWelcome(request,env);if(auth.response)return auth.response;
  const body=await request.json().catch(()=>({}));let geo;try{geo=await geocodePostcode(body.postcode)}catch(e){return json({ok:false,error:e.message},400)}
  const rows=await env.DB.prepare('SELECT * FROM church_groups WHERE is_demo=0 ORDER BY cluster_name,COALESCE(group_number,999),name').all(),person={...body,postcode:geo.postcode,latitude:geo.latitude,longitude:geo.longitude};
  const recommendations=(rows.results||[]).filter(g=>g.latitude!=null&&g.longitude!=null).map(group=>{const distance_km=kmBetween(person,group),fit=recommendationScore(person,group,distance_km);return{group,distance_km:Math.round(distance_km*10)/10,...fit}}).sort((a,b)=>b.score-a.score||a.distance_km-b.distance_km);
  const nearest=[...recommendations].sort((a,b)=>a.distance_km-b.distance_km)[0]?.group?.id||null;
  return json({ok:true,postcode:geo.postcode,location:geo.display,recommendations:recommendations.slice(0,5),nearest_group_id:nearest});
}

async function listCases(request,env){
  const auth=await authWelcome(request,env);if(auth.response)return auth.response;
  const rows=await env.DB.prepare(`SELECT c.*,g.name AS group_name,u.name AS carer_account_name FROM welcome_cases c LEFT JOIN church_groups g ON g.id=c.assigned_group_id LEFT JOIN admin_users u ON u.id=c.primary_carer_user_id ORDER BY CASE c.status WHEN 'new' THEN 0 WHEN 'recommended' THEN 1 WHEN 'assigned' THEN 2 WHEN 'contacted' THEN 3 WHEN 'visited' THEN 4 WHEN 'following' THEN 5 ELSE 9 END,c.updated_at DESC`).all();
  return json({ok:true,cases:rows.results||[]});
}
async function createCase(request,env){
  const auth=await authWelcome(request,env);if(auth.response)return auth.response;
  const body=await request.json().catch(()=>({}));let geo;try{geo=await geocodePostcode(body.postcode)}catch(e){return json({ok:false,error:e.message},400)}
  const caseId=id('case');
  await env.DB.prepare('INSERT INTO welcome_cases(id,display_name,contact_note,postcode,latitude,longitude,age_band,family_status,children_note,occupation_stage,preferred_days,language_note,background_note,status,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(caseId,clean(body.display_name,100)||'新朋友',clean(body.contact_note,500),geo.postcode,geo.latitude,geo.longitude,clean(body.age_band,50),clean(body.family_status,50),clean(body.children_note,100),clean(body.occupation_stage,100),clean(body.preferred_days,100),clean(body.language_note,100),clean(body.background_note,500),'recommended',auth.user.id).run();
  return json({ok:true,id:caseId,postcode:geo.postcode},201);
}
async function caseDetail(request,env,caseId){
  const auth=await authWelcome(request,env);if(auth.response)return auth.response;
  const item=await env.DB.prepare('SELECT c.*,g.name AS group_name,u.name AS carer_account_name FROM welcome_cases c LEFT JOIN church_groups g ON g.id=c.assigned_group_id LEFT JOIN admin_users u ON u.id=c.primary_carer_user_id WHERE c.id=?').bind(caseId).first();
  if(!item)return json({ok:false,error:'新人记录不存在'},404);
  const [assignments,followups]=await Promise.all([env.DB.prepare('SELECT a.*,g.name AS group_name,u.name AS carer_account_name FROM welcome_assignments a LEFT JOIN church_groups g ON g.id=a.group_id LEFT JOIN admin_users u ON u.id=a.carer_user_id WHERE a.case_id=? ORDER BY a.created_at DESC').bind(caseId).all(),env.DB.prepare('SELECT f.*,u.name AS actor_name FROM welcome_followups f LEFT JOIN admin_users u ON u.id=f.actor_user_id WHERE f.case_id=? ORDER BY f.created_at DESC').bind(caseId).all()]);
  return json({ok:true,case:item,assignments:assignments.results||[],followups:followups.results||[]});
}
async function assignCase(request,env,caseId){
  const auth=await authWelcome(request,env);if(auth.response)return auth.response;
  const body=await request.json().catch(()=>({})),groupId=clean(body.group_id,100),carerId=clean(body.carer_user_id,100)||null,carerName=clean(body.carer_name,100);
  const item=await env.DB.prepare('SELECT id FROM welcome_cases WHERE id=?').bind(caseId).first();if(!item)return json({ok:false,error:'新人记录不存在'},404);
  if(groupId&&!await env.DB.prepare('SELECT id FROM church_groups WHERE id=?').bind(groupId).first())return json({ok:false,error:'小组不存在'},404);
  const assignmentId=id('asg');
  await env.DB.batch([
    env.DB.prepare("UPDATE welcome_assignments SET active=0,ended_at=datetime('now') WHERE case_id=? AND active=1").bind(caseId),
    env.DB.prepare('INSERT INTO welcome_assignments(id,case_id,group_id,carer_user_id,carer_name,reason,assigned_by) VALUES(?,?,?,?,?,?,?)').bind(assignmentId,caseId,groupId||null,carerId,carerName,clean(body.reason,500),auth.user.id),
    env.DB.prepare("UPDATE welcome_cases SET assigned_group_id=?,primary_carer_user_id=?,primary_carer_name=?,status='assigned',next_followup_at=?,updated_at=datetime('now') WHERE id=?").bind(groupId||null,carerId,carerName,clean(body.next_followup_at,40)||null,caseId)
  ]);
  return json({ok:true,assignment_id:assignmentId});
}
async function addFollowup(request,env,caseId){
  const auth=await authWelcome(request,env);if(auth.response)return auth.response;
  const body=await request.json().catch(()=>({})),outcome=clean(body.outcome,60);if(!outcome)return json({ok:false,error:'请选择本次跟进结果'},400);
  const item=await env.DB.prepare('SELECT id FROM welcome_cases WHERE id=?').bind(caseId).first();if(!item)return json({ok:false,error:'新人记录不存在'},404);
  const statusMap={contacted:'contacted',visited:'visited',following:'following',stable:'stable',reassign:'reassign',paused:'paused',closed:'closed'},status=statusMap[outcome]||'following',followId=id('fu');
  await env.DB.batch([env.DB.prepare('INSERT INTO welcome_followups(id,case_id,actor_user_id,outcome,note,next_followup_at) VALUES(?,?,?,?,?,?)').bind(followId,caseId,auth.user.id,outcome,clean(body.note,1000),clean(body.next_followup_at,40)||null),env.DB.prepare("UPDATE welcome_cases SET status=?,next_followup_at=?,updated_at=datetime('now') WHERE id=?").bind(status,clean(body.next_followup_at,40)||null,caseId)]);
  return json({ok:true,followup_id:followId,status});
}
async function people(request,env){
  const auth=await authWelcome(request,env);if(auth.response)return auth.response;
  const rows=await env.DB.prepare("SELECT id,name,email FROM admin_users WHERE status='active' ORDER BY name").all();return json({ok:true,people:rows.results||[]});
}
async function dashboard(request,env){
  const auth=await authWelcome(request,env);if(auth.response)return auth.response;
  const rows=await env.DB.prepare(`SELECT COUNT(*) total,SUM(CASE WHEN status IN ('new','recommended') THEN 1 ELSE 0 END) pending_assignment,SUM(CASE WHEN status IN ('assigned','contacted','visited','following') THEN 1 ELSE 0 END) active_followup,SUM(CASE WHEN status='stable' THEN 1 ELSE 0 END) stable,SUM(CASE WHEN next_followup_at IS NOT NULL AND datetime(next_followup_at)<datetime('now') AND status NOT IN ('stable','closed','paused') THEN 1 ELSE 0 END) overdue FROM welcome_cases`).first();
  return json({ok:true,stats:rows||{}});
}

export async function handleWelcomeApi(request,env,url){
  if(!url.pathname.startsWith('/api/welcome/'))return null;
  if(request.method==='GET'&&url.pathname==='/api/welcome/groups')return listGroups(request,env);
  if(request.method==='POST'&&url.pathname==='/api/welcome/groups')return saveGroup(request,env);
  if(request.method==='POST'&&url.pathname==='/api/welcome/recommend')return recommend(request,env);
  if(request.method==='GET'&&url.pathname==='/api/welcome/cases')return listCases(request,env);
  if(request.method==='POST'&&url.pathname==='/api/welcome/cases')return createCase(request,env);
  if(request.method==='GET'&&url.pathname==='/api/welcome/people')return people(request,env);
  if(request.method==='GET'&&url.pathname==='/api/welcome/dashboard')return dashboard(request,env);
  let m=url.pathname.match(/^\/api\/welcome\/cases\/([^/]+)$/);if(m&&request.method==='GET')return caseDetail(request,env,decodeURIComponent(m[1]));
  m=url.pathname.match(/^\/api\/welcome\/cases\/([^/]+)\/assign$/);if(m&&request.method==='POST')return assignCase(request,env,decodeURIComponent(m[1]));
  m=url.pathname.match(/^\/api\/welcome\/cases\/([^/]+)\/followups$/);if(m&&request.method==='POST')return addFollowup(request,env,decodeURIComponent(m[1]));
  return null;
}
