import { authorizeService } from './team-services.js';

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function clean(value,max=500){return String(value??'').trim().slice(0,max)}
function id(prefix='w'){return `${prefix}_${crypto.randomUUID()}`}
function normalizePostcode(value){return clean(value,20).toUpperCase().replace(/\s+/g,'')}
const MAX_WELCOME_PHOTO_BYTES=12*1024*1024;
const WELCOME_PHOTO_TYPES=new Map([['image/jpeg','jpg'],['image/png','png'],['image/webp','webp'],['image/heic','heic'],['image/heif','heif']]);
function validPhotoBytes(buffer,mime){const b=new Uint8Array(buffer),ascii=(start,length)=>String.fromCharCode(...b.slice(start,start+length));if(mime==='image/jpeg')return b.length>=3&&b[0]===0xff&&b[1]===0xd8&&b[2]===0xff;if(mime==='image/png')return b.length>=8&&b[0]===0x89&&ascii(1,3)==='PNG'&&b[4]===0x0d&&b[5]===0x0a&&b[6]===0x1a&&b[7]===0x0a;if(mime==='image/webp')return b.length>=12&&ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP';if(mime==='image/heic'||mime==='image/heif')return b.length>=12&&ascii(4,4)==='ftyp'&&/^(?:heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(ascii(8,4));return false}
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
  if(person.family_status&&has(group.audience_profile,person.family_status)){score+=6;reasons.push('适合人群较匹配');}
  if(group.capacity_max!=null&&group.current_size!=null&&group.current_size>=group.capacity_max){score-=100;reasons.push('小组人数已满');}
  if(!group.accepting_newcomers){score-=100;reasons.push('目前暂停接收新人');}
  return{score:Math.round(score*10)/10,reasons};
}
async function authWelcome(request,env){return authorizeService(request,env,'welcome')}
function privatePhotoResponse(object,mime,method='GET'){
  const headers=new Headers({'content-type':mime||'application/octet-stream','cache-control':'private, no-store','x-content-type-options':'nosniff','content-disposition':'inline','content-length':String(object.size||0)});
  if(object.httpEtag)headers.set('etag',object.httpEtag);if(object.writeHttpMetadata)object.writeHttpMetadata(headers);
  headers.set('content-type',mime||headers.get('content-type')||'application/octet-stream');headers.set('cache-control','private, no-store');headers.set('content-disposition','inline');
  return new Response(method==='HEAD'?null:object.body,{status:200,headers});
}
async function casePhotoRows(env,caseId){
  const rows=await env.DB.prepare("SELECT id,mime_type,filename,size_bytes,created_at FROM welcome_case_photos WHERE case_id=? AND status='active' ORDER BY created_at DESC").bind(caseId).all();
  return (rows.results||[]).map(photo=>({...photo,href:`/api/welcome/photos/${encodeURIComponent(photo.id)}`}));
}
async function uploadCasePhoto(request,env,caseId){
  const auth=await authWelcome(request,env);if(auth.response)return auth.response;
  if(!env.MEDIA)return json({ok:false,error:'照片存储尚未配置'},503);
  const item=await env.DB.prepare('SELECT id FROM welcome_cases WHERE id=?').bind(caseId).first();if(!item)return json({ok:false,error:'新人记录不存在'},404);
  const form=await request.formData().catch(()=>null),file=form?.get('image');
  if(!file||typeof file.arrayBuffer!=='function')return json({ok:false,error:'请选择信息卡照片'},400);
  const mime=clean(file.type,100).toLowerCase(),ext=WELCOME_PHOTO_TYPES.get(mime);if(!ext)return json({ok:false,error:'仅支持 JPG、PNG、WebP 或 HEIC 照片'},415);
  if(!file.size||file.size>MAX_WELCOME_PHOTO_BYTES)return json({ok:false,error:'每张照片最大 12MB'},413);
  const bytes=await file.arrayBuffer();if(!validPhotoBytes(bytes,mime))return json({ok:false,error:'照片内容与文件格式不符'},415);
  const photoId=id('wphoto'),key=`private/welcome-cards/${caseId}/${photoId}.${ext}`,filename=clean(file.name,180)||`welcome-card.${ext}`;
  await env.MEDIA.put(key,bytes,{httpMetadata:{contentType:mime,contentDisposition:'inline'},customMetadata:{caseId,photoId}});
  try{await env.DB.prepare("INSERT INTO welcome_case_photos(id,case_id,r2_key,mime_type,filename,size_bytes,uploaded_by,status) VALUES(?,?,?,?,?,?,?,'active')").bind(photoId,caseId,key,mime,filename,file.size,auth.user.id).run();}
  catch(error){await env.MEDIA.delete(key).catch(()=>{});console.error('WELCOME_PHOTO_DB_FAILED',error?.message||error);return json({ok:false,error:'照片记录保存失败，已撤销上传'},500)}
  return json({ok:true,photo:{id:photoId,mime_type:mime,filename,size_bytes:file.size,href:`/api/welcome/photos/${encodeURIComponent(photoId)}`}},201);
}
async function readCasePhoto(request,env,photoId){
  const auth=await authWelcome(request,env);if(auth.response)return auth.response;
  if(!env.MEDIA)return json({ok:false,error:'照片存储尚未配置'},503);
  const photo=await env.DB.prepare("SELECT id,r2_key,mime_type FROM welcome_case_photos WHERE id=? AND status='active'").bind(photoId).first();if(!photo)return json({ok:false,error:'照片不存在'},404);
  const object=await env.MEDIA.get(photo.r2_key);if(!object)return json({ok:false,error:'照片文件不存在'},404);
  return privatePhotoResponse(object,photo.mime_type,request.method);
}
async function deleteCasePhoto(request,env,photoId){
  const auth=await authWelcome(request,env);if(auth.response)return auth.response;
  if(!env.MEDIA)return json({ok:false,error:'照片存储尚未配置'},503);
  const photo=await env.DB.prepare("SELECT id,r2_key FROM welcome_case_photos WHERE id=? AND status='active'").bind(photoId).first();if(!photo)return json({ok:false,error:'照片不存在'},404);
  await env.DB.prepare("UPDATE welcome_case_photos SET status='deleted',deleted_at=datetime('now'),deleted_by=? WHERE id=?").bind(auth.user.id,photoId).run();
  try{await env.MEDIA.delete(photo.r2_key);}catch(error){await env.DB.prepare("UPDATE welcome_case_photos SET status='active',deleted_at=NULL,deleted_by=NULL WHERE id=?").bind(photoId).run().catch(()=>{});console.error('WELCOME_PHOTO_DELETE_FAILED',error?.message||error);return json({ok:false,error:'照片删除失败，请稍后再试'},500)}
  return json({ok:true,id:photoId});
}

async function listGroups(request,env){
  const auth=await authWelcome(request,env);if(auth.response)return auth.response;
  const rows=await env.DB.prepare('SELECT * FROM church_groups WHERE is_demo=0 ORDER BY cluster_name,COALESCE(group_number,999),name').all();
  return json({ok:true,groups:rows.results||[]});
}
async function saveGroup(request,env){
  const auth=await authWelcome(request,env);if(auth.response)return auth.response;
  const body=await request.json().catch(()=>({})),name=clean(body.name,120),postcode=normalizePostcode(body.postcode);
  if(!name)return json({ok:false,error:'请填写小组名称'},400);if(!validPostcode(postcode))return json({ok:false,error:'请填写有效邮编'},400);
  const groupNumber=body.group_number===''||body.group_number==null?null:Number(body.group_number);
  if(groupNumber!==null&&(!Number.isInteger(groupNumber)||groupNumber<1||groupNumber>999))return json({ok:false,error:'小组编号必须是 1–999 的整数'},400);
  let geo;try{geo=await geocodePostcode(postcode)}catch(e){return json({ok:false,error:e.message},400)}
  const groupId=clean(body.id,100)||id('grp'),accept=body.accepting_newcomers===false||body.accepting_newcomers===0||body.accepting_newcomers==='0'?0:1;
  const existing=await env.DB.prepare('SELECT id FROM church_groups WHERE id=?').bind(groupId).first();
  if(groupNumber!==null){const duplicate=await env.DB.prepare('SELECT id FROM church_groups WHERE group_number=? AND id<>?').bind(groupNumber,groupId).first();if(duplicate)return json({ok:false,error:`第 ${groupNumber} 组已经存在`},409)}
  const integerOrNull=value=>value===''||value==null?null:Number(value);
  const currentSize=integerOrNull(body.current_size),capacityMax=integerOrNull(body.capacity_max);
  if(currentSize!==null&&(!Number.isInteger(currentSize)||currentSize<0))return json({ok:false,error:'当前人数必须是非负整数'},400);
  if(capacityMax!==null&&(!Number.isInteger(capacityMax)||capacityMax<1))return json({ok:false,error:'人数上限必须是正整数'},400);
  if(currentSize!==null&&capacityMax!==null&&currentSize>capacityMax)return json({ok:false,error:'当前人数不能大于人数上限'},400);
  const visibility=['internal','assigned','public'].includes(body.address_visibility)?body.address_visibility:'assigned';
  const vals=[name,clean(body.cluster_name,100),clean(body.cluster_leader_name,100),clean(body.leader_name,100),clean(body.deputy_leader_name,100),groupNumber,geo.postcode,geo.latitude,geo.longitude,clean(body.meeting_day,30),clean(body.meeting_time,30),clean(body.meeting_frequency,80),['always','often','sometimes','no','unknown'].includes(body.dinner)?body.dinner:'unknown',clean(body.age_profile),clean(body.occupation_profile),clean(body.family_profile),clean(body.children_profile),clean(body.language_profile),clean(body.audience_profile),clean(body.background_profile),clean(body.accessibility_note),currentSize,capacityMax,clean(body.capacity_note),clean(body.contact_mode),clean(body.wechat_note),visibility,clean(body.schedule_note),accept,clean(body.notes),0];
  if(existing){await env.DB.prepare("UPDATE church_groups SET name=?,cluster_name=?,cluster_leader_name=?,leader_name=?,deputy_leader_name=?,group_number=?,postcode=?,latitude=?,longitude=?,meeting_day=?,meeting_time=?,meeting_frequency=?,dinner=?,age_profile=?,occupation_profile=?,family_profile=?,children_profile=?,language_profile=?,audience_profile=?,background_profile=?,accessibility_note=?,current_size=?,capacity_max=?,capacity_note=?,contact_mode=?,wechat_note=?,address_visibility=?,schedule_note=?,accepting_newcomers=?,notes=?,is_demo=?,updated_at=datetime('now') WHERE id=?").bind(...vals,groupId).run();}
  else{await env.DB.prepare('INSERT INTO church_groups(id,name,cluster_name,cluster_leader_name,leader_name,deputy_leader_name,group_number,postcode,latitude,longitude,meeting_day,meeting_time,meeting_frequency,dinner,age_profile,occupation_profile,family_profile,children_profile,language_profile,audience_profile,background_profile,accessibility_note,current_size,capacity_max,capacity_note,contact_mode,wechat_note,address_visibility,schedule_note,accepting_newcomers,notes,is_demo) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(groupId,...vals).run();}
  return json({ok:true,id:groupId,postcode:geo.postcode},existing?200:201);
}

async function hydrateGroupCoordinates(env,groups){
  const missing=groups.filter(group=>validPostcode(group.postcode)&&(group.latitude==null||group.longitude==null));
  await Promise.allSettled(missing.map(async group=>{
    try{
      const geo=await geocodePostcode(group.postcode);
      group.postcode=geo.postcode;group.latitude=geo.latitude;group.longitude=geo.longitude;
      await env.DB.prepare("UPDATE church_groups SET postcode=?,latitude=?,longitude=?,updated_at=datetime('now') WHERE id=?").bind(geo.postcode,geo.latitude,geo.longitude,group.id).run();
    }catch(error){console.error('WELCOME_GROUP_GEOCODE_FAILED',group.id,error?.message||error)}
  }));
  return groups;
}
async function recommend(request,env){
  const auth=await authWelcome(request,env);if(auth.response)return auth.response;
  const body=await request.json().catch(()=>({}));let geo;try{geo=await geocodePostcode(body.postcode)}catch(e){return json({ok:false,error:e.message},400)}
  const rows=await env.DB.prepare('SELECT * FROM church_groups WHERE is_demo=0 ORDER BY cluster_name,COALESCE(group_number,999),name').all(),person={...body,postcode:geo.postcode,latitude:geo.latitude,longitude:geo.longitude};
  const groups=await hydrateGroupCoordinates(env,rows.results||[]);
  const recommendations=groups.filter(g=>g.latitude!=null&&g.longitude!=null).map(group=>{const distance_km=kmBetween(person,group),fit=recommendationScore(person,group,distance_km);return{group,distance_km:Math.round(distance_km*10)/10,...fit}}).sort((a,b)=>b.score-a.score||a.distance_km-b.distance_km);
  const nearest=[...recommendations].sort((a,b)=>a.distance_km-b.distance_km)[0]?.group?.id||null;
  return json({ok:true,postcode:geo.postcode,location:geo.display,recommendations:recommendations.slice(0,5),nearest_group_id:nearest});
}

async function listCases(request,env){
  const auth=await authWelcome(request,env);if(auth.response)return auth.response;
  const rows=await env.DB.prepare(`SELECT c.*,g.name AS group_name,u.name AS carer_account_name,(SELECT COUNT(*) FROM welcome_case_photos p WHERE p.case_id=c.id AND p.status='active') AS photo_count FROM welcome_cases c LEFT JOIN church_groups g ON g.id=c.assigned_group_id LEFT JOIN admin_users u ON u.id=c.primary_carer_user_id ORDER BY CASE c.status WHEN 'new' THEN 0 WHEN 'recommended' THEN 1 WHEN 'assigned' THEN 2 WHEN 'contacted' THEN 3 WHEN 'visited' THEN 4 WHEN 'following' THEN 5 ELSE 9 END,c.updated_at DESC`).all();
  return json({ok:true,cases:rows.results||[]});
}
async function createCase(request,env){
  const auth=await authWelcome(request,env);if(auth.response)return auth.response;
  const body=await request.json().catch(()=>({}));let geo;try{geo=await geocodePostcode(body.postcode)}catch(e){return json({ok:false,error:e.message},400)}
  const caseId=id('case');
  await env.DB.prepare('INSERT INTO welcome_cases(id,display_name,contact_note,postcode,latitude,longitude,age_band,family_status,children_note,occupation_stage,preferred_days,language_note,background_note,reception_site,invited_by,faith_status,status,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(caseId,clean(body.display_name,100)||'新朋友',clean(body.contact_note,500),geo.postcode,geo.latitude,geo.longitude,clean(body.age_band,50),clean(body.family_status,50),clean(body.children_note,100),clean(body.occupation_stage,100),clean(body.preferred_days,100),clean(body.language_note,100),clean(body.background_note,500),clean(body.reception_site,50),clean(body.invited_by,120),clean(body.faith_status,50),'recommended',auth.user.id).run();
  return json({ok:true,id:caseId,postcode:geo.postcode},201);
}
async function caseDetail(request,env,caseId){
  const auth=await authWelcome(request,env);if(auth.response)return auth.response;
  const item=await env.DB.prepare('SELECT c.*,g.name AS group_name,u.name AS carer_account_name FROM welcome_cases c LEFT JOIN church_groups g ON g.id=c.assigned_group_id LEFT JOIN admin_users u ON u.id=c.primary_carer_user_id WHERE c.id=?').bind(caseId).first();
  if(!item)return json({ok:false,error:'新人记录不存在'},404);
  const [assignments,followups,photos]=await Promise.all([env.DB.prepare('SELECT a.*,g.name AS group_name,u.name AS carer_account_name FROM welcome_assignments a LEFT JOIN church_groups g ON g.id=a.group_id LEFT JOIN admin_users u ON u.id=a.carer_user_id WHERE a.case_id=? ORDER BY a.created_at DESC').bind(caseId).all(),env.DB.prepare('SELECT f.*,u.name AS actor_name FROM welcome_followups f LEFT JOIN admin_users u ON u.id=f.actor_user_id WHERE f.case_id=? ORDER BY f.created_at DESC').bind(caseId).all(),casePhotoRows(env,caseId)]);
  return json({ok:true,case:item,assignments:assignments.results||[],followups:followups.results||[],photos});
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
  let m=url.pathname.match(/^\/api\/welcome\/cases\/([^/]+)\/photos$/);if(m&&request.method==='POST')return uploadCasePhoto(request,env,decodeURIComponent(m[1]));
  m=url.pathname.match(/^\/api\/welcome\/photos\/([^/]+)$/);if(m&&(request.method==='GET'||request.method==='HEAD'))return readCasePhoto(request,env,decodeURIComponent(m[1]));
  if(m&&request.method==='DELETE')return deleteCasePhoto(request,env,decodeURIComponent(m[1]));
  m=url.pathname.match(/^\/api\/welcome\/cases\/([^/]+)$/);if(m&&request.method==='GET')return caseDetail(request,env,decodeURIComponent(m[1]));
  m=url.pathname.match(/^\/api\/welcome\/cases\/([^/]+)\/assign$/);if(m&&request.method==='POST')return assignCase(request,env,decodeURIComponent(m[1]));
  m=url.pathname.match(/^\/api\/welcome\/cases\/([^/]+)\/followups$/);if(m&&request.method==='POST')return addFollowup(request,env,decodeURIComponent(m[1]));
  return null;
}
