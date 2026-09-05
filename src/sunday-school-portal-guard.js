import { authenticate, authorize } from './admin-auth.js';

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function bearer(request){return request.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||''}
function hex(bytes){return [...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('')}
async function tokenHash(token){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))}
function clean(value,max=12000){return String(value??'').trim().slice(0,max)}
const PAGE_TYPES=new Set(['cover','scripture','teaching','question','image','music','summary','prayer']);

async function teacherFromToken(request,env){
  if(!env.DB)return null;
  const token=bearer(request);if(!token)return null;
  const hash=await tokenHash(token);
  const teacher=await env.DB.prepare("SELECT id,name,email,status FROM sunday_school_teachers WHERE token_hash=? AND status='active'").bind(hash).first();
  return teacher?{...teacher,kind:'teacher',role:'teacher'}:null;
}
async function portalUser(request,env){const teacher=await teacherFromToken(request,env);if(teacher)return teacher;const admin=await authenticate(request,env);return admin?{...admin,kind:'admin'}:null}
async function requirePortal(request,env){
  if(!env.DB)return{response:json({ok:false,error:'D1 database is not configured'},503),user:null};
  const user=await portalUser(request,env);
  return user?{response:null,user}:{response:json({ok:false,error:'同工账号或密码不正确'},401),user:null};
}

async function scheduleRow(env,scheduleId){
  return env.DB.prepare(`SELECT s.id,s.lesson_id,s.teacher_id,s.lesson_date,t.name teacher_name,
      l.title lesson_title,l.scripture,l.content,l.status lesson_status
    FROM sunday_school_schedule s
    LEFT JOIN sunday_school_teachers t ON t.id=s.teacher_id
    LEFT JOIN sunday_school_lessons l ON l.id=s.lesson_id
    WHERE s.id=?`).bind(scheduleId).first();
}
async function lessonRow(env,lessonId){
  return env.DB.prepare('SELECT id,title,scripture,content,status FROM sunday_school_lessons WHERE id=?').bind(lessonId).first();
}

async function guardAssignedWrite(request,env,scheduleId,{allowAdmin=false}={}){
  const auth=await requirePortal(request,env);if(auth.response)return auth.response;
  if(auth.user.kind==='admin')return allowAdmin?null:json({ok:false,error:'只有本堂授课老师可以修改这堂课的记录'},403);
  const row=await scheduleRow(env,scheduleId);
  if(!row)return json({ok:false,error:'课表记录不存在'},404);
  if(row.teacher_id!==auth.user.id)return json({ok:false,error:'只有本堂授课老师可以修改这堂课的记录'},403);
  return null;
}

async function guardDraftLesson(request,env,lessonId){
  const auth=await requirePortal(request,env);if(auth.response)return auth.response;
  if(auth.user.kind==='admin')return null;
  const lesson=await env.DB.prepare('SELECT id,status FROM sunday_school_lessons WHERE id=?').bind(lessonId).first();
  if(!lesson)return json({ok:false,error:'课程不存在'},404);
  if(lesson.status!=='published')return json({ok:false,error:'这套课程尚未审核发布'},403);
  return null;
}

async function getScheduleDeckCompat(request,env,scheduleId){
  const auth=await requirePortal(request,env);if(auth.response)return auth.response;
  const schedule=await scheduleRow(env,scheduleId);if(!schedule)return json({ok:false,error:'课表记录不存在'},404);
  if(auth.user.kind==='teacher'&&schedule.lesson_status&&schedule.lesson_status!=='published')return json({ok:false,error:'这套课程尚未审核发布'},403);
  const canEdit=auth.user.kind==='admin'||(auth.user.kind==='teacher'&&schedule.teacher_id===auth.user.id);
  const custom=await env.DB.prepare(`SELECT p.id,p.schedule_id,p.source_page_id,p.page_type,p.title,p.body,p.scripture,p.media_url,p.music_id,p.sort_order,m.title music_title,m.audio_url,m.lyrics
    FROM sunday_school_schedule_pages p LEFT JOIN sunday_school_music m ON m.id=p.music_id
    WHERE p.schedule_id=? ORDER BY p.sort_order,p.created_at`).bind(scheduleId).all();
  let pages=custom.results||[],isCopy=pages.length>0;
  if(!pages.length&&schedule.lesson_id){
    const standard=await env.DB.prepare(`SELECT p.id,p.lesson_id,p.page_type,p.title,p.body,p.scripture,p.media_url,p.music_id,p.sort_order,m.title music_title,m.audio_url,m.lyrics
      FROM sunday_school_lesson_pages p LEFT JOIN sunday_school_music m ON m.id=p.music_id
      WHERE p.lesson_id=? ORDER BY p.sort_order,p.created_at`).bind(schedule.lesson_id).all();
    pages=standard.results||[];
    if(!pages.length&&schedule.content){
      pages=[{id:`legacy:${schedule.lesson_id}`,lesson_id:schedule.lesson_id,page_type:'teaching',title:schedule.lesson_title||'',body:schedule.content,scripture:schedule.scripture||'',media_url:'',music_id:null,sort_order:0}];
    }
  }
  return json({ok:true,schedule,pages,is_copy:isCopy,can_edit:canEdit,user:auth.user});
}

function normalizedPage(body={}){
  return{
    page_type:PAGE_TYPES.has(body.page_type)?body.page_type:'teaching',
    title:clean(body.title,500),
    body:clean(body.body,30000),
    scripture:clean(body.scripture,5000),
    media_url:clean(body.media_url,2000),
    music_id:clean(body.music_id,120)||null,
  };
}

async function saveLegacySchedulePage(request,env,scheduleId){
  const denied=await guardAssignedWrite(request,env,scheduleId,{allowAdmin:true});if(denied)return denied;
  const page=normalizedPage(await request.json().catch(()=>({})));
  const max=await env.DB.prepare('SELECT COALESCE(MAX(sort_order),-1) max_order FROM sunday_school_schedule_pages WHERE schedule_id=?').bind(scheduleId).first();
  const id=`SP-${crypto.randomUUID()}`;
  await env.DB.prepare(`INSERT INTO sunday_school_schedule_pages(id,schedule_id,source_page_id,page_type,title,body,scripture,media_url,music_id,sort_order,updated_at)
    VALUES(?,?,NULL,?,?,?,?,?,?,?,datetime('now'))`).bind(id,scheduleId,page.page_type,page.title,page.body,page.scripture,page.media_url,page.music_id,Number(max?.max_order??-1)+1).run();
  return json({ok:true,page:{id,...page}},201);
}

async function materializeLegacyScheduleBeforeAdd(request,env,scheduleId){
  const denied=await guardAssignedWrite(request,env,scheduleId,{allowAdmin:true});if(denied)return denied;
  const count=await env.DB.prepare('SELECT COUNT(*) count FROM sunday_school_schedule_pages WHERE schedule_id=?').bind(scheduleId).first();
  if(Number(count?.count||0)>0)return null;
  const schedule=await scheduleRow(env,scheduleId);if(!schedule||!clean(schedule.content,100000))return null;
  const id=`SP-${crypto.randomUUID()}`;
  await env.DB.prepare(`INSERT INTO sunday_school_schedule_pages(id,schedule_id,source_page_id,page_type,title,body,scripture,media_url,music_id,sort_order,updated_at)
    VALUES(?,?,NULL,'teaching',?,?,?,'',NULL,0,datetime('now'))`).bind(id,scheduleId,clean(schedule.lesson_title,500),clean(schedule.content,30000),clean(schedule.scripture,5000)).run();
  return null;
}

async function materializeLegacyLessonBeforeAdd(request,env,lessonId){
  const auth=await authorize(request,env,'editor');if(auth.response)return auth.response;
  const count=await env.DB.prepare('SELECT COUNT(*) count FROM sunday_school_lesson_pages WHERE lesson_id=?').bind(lessonId).first();
  if(Number(count?.count||0)>0)return null;
  const lesson=await lessonRow(env,lessonId);if(!lesson)return json({ok:false,error:'课程不存在'},404);
  if(!clean(lesson.content,100000))return null;
  const id=`P-${crypto.randomUUID()}`;
  await env.DB.prepare(`INSERT INTO sunday_school_lesson_pages(id,lesson_id,page_type,title,body,scripture,media_url,music_id,sort_order,updated_at)
    VALUES(?,?,'teaching',?,?,?,'',NULL,0,datetime('now'))`).bind(id,lessonId,clean(lesson.title,500),clean(lesson.content,30000),clean(lesson.scripture,5000)).run();
  await env.DB.prepare("UPDATE sunday_school_lessons SET content='',updated_at=datetime('now') WHERE id=?").bind(lessonId).run();
  return null;
}

async function saveLegacyLessonPage(request,env,lessonId){
  const auth=await authorize(request,env,'editor');if(auth.response)return auth.response;
  const lesson=await lessonRow(env,lessonId);if(!lesson)return json({ok:false,error:'课程不存在'},404);
  const count=await env.DB.prepare('SELECT COUNT(*) count FROM sunday_school_lesson_pages WHERE lesson_id=?').bind(lessonId).first();
  if(Number(count?.count||0)>0)return json({ok:false,error:'旧版页面已转换，请刷新后继续编辑'},409);
  const page=normalizedPage(await request.json().catch(()=>({})));
  const id=`P-${crypto.randomUUID()}`;
  await env.DB.prepare(`INSERT INTO sunday_school_lesson_pages(id,lesson_id,page_type,title,body,scripture,media_url,music_id,sort_order,updated_at)
    VALUES(?,?,?,?,?,?,?,?,0,datetime('now'))`).bind(id,lessonId,page.page_type,page.title,page.body,page.scripture,page.media_url,page.music_id).run();
  await env.DB.prepare("UPDATE sunday_school_lessons SET content='',updated_at=datetime('now') WHERE id=?").bind(lessonId).run();
  return json({ok:true,page:{id,...page}},201);
}

async function guardReviewState(request,env,id){
  const auth=await authorize(request,env,'owner');if(auth.response)return auth.response;
  const row=await env.DB.prepare('SELECT id,status,lesson_id FROM sunday_school_generation_requests WHERE id=?').bind(id).first();
  if(!row)return json({ok:false,error:'任务不存在'},404);
  if(row.status!=='ready_for_review')return json({ok:false,error:`当前状态 ${row.status} 不能审核`},409);
  if(!row.lesson_id)return json({ok:false,error:'没有可审核的课程'},409);
  return null;
}

async function guardExecutorFail(request,env,id){
  if(!env.SINAN_TOKEN||bearer(request)!==env.SINAN_TOKEN)return null;
  const row=await env.DB.prepare('SELECT status FROM sunday_school_generation_requests WHERE id=?').bind(id).first();
  if(!row)return json({ok:false,error:'生成任务不存在'},404);
  if(!['pending_executor','generating'].includes(row.status))return json({ok:false,error:`任务状态为 ${row.status}`},409);
  return null;
}

export async function handleSundaySchoolPortalGuard(request,env,url){
  if(!url.pathname.startsWith('/api/sunday-school/'))return null;
  let m;

  m=url.pathname.match(/^\/api\/sunday-school\/content\/lessons\/([^/]+)\/deck$/);
  if(m&&request.method==='GET')return guardDraftLesson(request,env,decodeURIComponent(m[1]));

  m=url.pathname.match(/^\/api\/sunday-school\/content\/lessons\/([^/]+)\/pages\/legacy$/);
  if(m&&request.method==='POST')return saveLegacyLessonPage(request,env,decodeURIComponent(m[1]));
  if(m&&request.method==='DELETE')return json({ok:false,error:'旧版课程请先编辑或添加一页，转换为新版课程后再删除页面'},409);

  m=url.pathname.match(/^\/api\/sunday-school\/content\/lessons\/([^/]+)\/pages$/);
  if(m&&request.method==='POST'){
    const denied=await materializeLegacyLessonBeforeAdd(request,env,decodeURIComponent(m[1]));
    if(denied)return denied;
  }

  m=url.pathname.match(/^\/api\/sunday-school\/content\/schedule\/([^/]+)\/deck$/);
  if(m&&request.method==='GET')return getScheduleDeckCompat(request,env,decodeURIComponent(m[1]));

  m=url.pathname.match(/^\/api\/sunday-school\/content\/schedule\/([^/]+)\/pages\/legacy%3A[^/]+$/i);
  if(!m)m=url.pathname.match(/^\/api\/sunday-school\/content\/schedule\/([^/]+)\/pages\/legacy:[^/]+$/i);
  if(m&&request.method==='POST')return saveLegacySchedulePage(request,env,decodeURIComponent(m[1]));
  if(m&&request.method==='DELETE')return json({ok:false,error:'旧版课程请先编辑或添加一页，建立本次授课版本后再删除页面'},409);

  m=url.pathname.match(/^\/api\/sunday-school\/content\/schedule\/([^/]+)\/pages$/);
  if(m&&request.method==='POST'){
    const denied=await materializeLegacyScheduleBeforeAdd(request,env,decodeURIComponent(m[1]));
    if(denied)return denied;
  }

  m=url.pathname.match(/^\/api\/sunday-school\/ai\/requests\/([^/]+)\/(approve|reject)$/);
  if(m&&request.method==='POST')return guardReviewState(request,env,decodeURIComponent(m[1]));

  m=url.pathname.match(/^\/api\/sunday-school\/ai\/executor\/requests\/([^/]+)\/fail$/);
  if(m&&request.method==='POST')return guardExecutorFail(request,env,decodeURIComponent(m[1]));

  for(const pattern of [
    /^\/api\/sunday-school\/notes\/([^/]+)$/,
    /^\/api\/sunday-school\/attendance\/([^/]+)$/,
    /^\/api\/sunday-school\/records\/([^/]+)$/,
  ]){
    m=url.pathname.match(pattern);
    if(m&&request.method==='POST')return guardAssignedWrite(request,env,decodeURIComponent(m[1]));
  }
  return null;
}
