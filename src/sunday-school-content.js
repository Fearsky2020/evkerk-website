import { authenticate, authorize } from './admin-auth.js';

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function clean(value,max=12000){return String(value??'').trim().slice(0,max)}
function bearer(request){return request.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||''}
function hex(bytes){return [...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('')}
async function tokenHash(token){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))}

async function teacherFromToken(request,env){
  if(!env.DB)return null;
  const token=bearer(request);if(!token)return null;
  const hash=await tokenHash(token);
  const teacher=await env.DB.prepare("SELECT id,name,email,status FROM sunday_school_teachers WHERE token_hash=? AND status='active'").bind(hash).first();
  return teacher?{...teacher,kind:'teacher',role:'teacher'}:null;
}
async function portalUser(request,env){const teacher=await teacherFromToken(request,env);if(teacher)return teacher;const admin=await authenticate(request,env);return admin?{...admin,kind:'admin'}:null}
async function requirePortal(request,env){if(!env.DB)return{response:json({ok:false,error:'D1 database is not configured'},503),user:null};const user=await portalUser(request,env);return user?{response:null,user}:{response:json({ok:false,error:'同工账号或密码不正确'},401),user:null}}
async function requireOwner(request,env){return authorize(request,env,'owner')}
async function requireEditor(request,env){return authorize(request,env,'editor')}
function isExecutor(request,env){return Boolean(env.SINAN_TOKEN)&&bearer(request)===env.SINAN_TOKEN}

const PAGE_TYPES=new Set(['cover','scripture','teaching','question','image','music','summary','prayer']);
function normalizePage(raw={},index=0){
  return{
    id:clean(raw.id||`P-${crypto.randomUUID()}`,120),
    page_type:PAGE_TYPES.has(raw.page_type)?raw.page_type:'teaching',
    title:clean(raw.title,500),
    body:clean(raw.body,30000),
    scripture:clean(raw.scripture,5000),
    media_url:clean(raw.media_url,2000),
    music_id:clean(raw.music_id,120)||null,
    sort_order:Number.isFinite(Number(raw.sort_order))?Number(raw.sort_order):index,
  };
}
async function lessonExists(env,lessonId){return env.DB.prepare('SELECT id,title,scripture,content,status,source,generation_id,approved_at FROM sunday_school_lessons WHERE id=?').bind(lessonId).first()}
async function lessonPages(env,lessonId){const rows=await env.DB.prepare(`SELECT p.id,p.lesson_id,p.page_type,p.title,p.body,p.scripture,p.media_url,p.music_id,p.sort_order,m.title music_title,m.audio_url,m.lyrics FROM sunday_school_lesson_pages p LEFT JOIN sunday_school_music m ON m.id=p.music_id WHERE p.lesson_id=? ORDER BY p.sort_order,p.created_at`).bind(lessonId).all();return rows.results||[]}

async function getDeck(request,env,lessonId){
  const auth=await requirePortal(request,env);if(auth.response)return auth.response;
  const lesson=await lessonExists(env,lessonId);if(!lesson)return json({ok:false,error:'课程不存在'},404);
  let pages=await lessonPages(env,lessonId);
  if(!pages.length&&lesson.content){pages=[{id:'legacy',lesson_id:lessonId,page_type:'teaching',title:lesson.title,body:lesson.content,scripture:lesson.scripture||'',media_url:'',music_id:null,sort_order:0}]}
  return json({ok:true,lesson,pages,user:auth.user});
}
async function createPage(request,env,lessonId){
  const auth=await requireEditor(request,env);if(auth.response)return auth.response;
  if(!await lessonExists(env,lessonId))return json({ok:false,error:'课程不存在'},404);
  const raw=await request.json().catch(()=>({})),page=normalizePage(raw,0);
  const max=await env.DB.prepare('SELECT COALESCE(MAX(sort_order),-1) max_order FROM sunday_school_lesson_pages WHERE lesson_id=?').bind(lessonId).first();
  page.sort_order=raw.sort_order==null?Number(max?.max_order??-1)+1:page.sort_order;
  await env.DB.prepare(`INSERT INTO sunday_school_lesson_pages(id,lesson_id,page_type,title,body,scripture,media_url,music_id,sort_order,updated_at) VALUES(?,?,?,?,?,?,?,?,?,datetime('now'))`).bind(page.id,lessonId,page.page_type,page.title,page.body,page.scripture,page.media_url,page.music_id,page.sort_order).run();
  return json({ok:true,page},201);
}
async function updatePage(request,env,lessonId,pageId){
  const auth=await requireEditor(request,env);if(auth.response)return auth.response;
  const raw=await request.json().catch(()=>({})),page=normalizePage({...raw,id:pageId},0);
  const result=await env.DB.prepare(`UPDATE sunday_school_lesson_pages SET page_type=?,title=?,body=?,scripture=?,media_url=?,music_id=?,sort_order=?,updated_at=datetime('now') WHERE id=? AND lesson_id=?`).bind(page.page_type,page.title,page.body,page.scripture,page.media_url,page.music_id,page.sort_order,pageId,lessonId).run();
  return Number(result.meta?.changes||0)?json({ok:true,page}):json({ok:false,error:'页面不存在'},404);
}
async function deletePage(request,env,lessonId,pageId){const auth=await requireEditor(request,env);if(auth.response)return auth.response;const result=await env.DB.prepare('DELETE FROM sunday_school_lesson_pages WHERE id=? AND lesson_id=?').bind(pageId,lessonId).run();return Number(result.meta?.changes||0)?json({ok:true,id:pageId}):json({ok:false,error:'页面不存在'},404)}
async function reorderPages(request,env,lessonId){const auth=await requireEditor(request,env);if(auth.response)return auth.response;const body=await request.json().catch(()=>({})),ids=Array.isArray(body.page_ids)?body.page_ids.slice(0,200):[];const stmts=ids.map((id,i)=>env.DB.prepare("UPDATE sunday_school_lesson_pages SET sort_order=?,updated_at=datetime('now') WHERE id=? AND lesson_id=?").bind(i,clean(id,120),lessonId));if(stmts.length)await env.DB.batch(stmts);return json({ok:true,count:stmts.length})}

async function ensureScheduleCopy(env,scheduleId,lessonId){
  const count=await env.DB.prepare('SELECT COUNT(*) count FROM sunday_school_schedule_pages WHERE schedule_id=?').bind(scheduleId).first();
  if(Number(count?.count||0)>0)return;
  const pages=await lessonPages(env,lessonId);
  if(!pages.length)return;
  const stmts=pages.map((p,i)=>env.DB.prepare(`INSERT INTO sunday_school_schedule_pages(id,schedule_id,source_page_id,page_type,title,body,scripture,media_url,music_id,sort_order,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,datetime('now'))`).bind(`SP-${crypto.randomUUID()}`,scheduleId,p.id,p.page_type,p.title,p.body,p.scripture,p.media_url,p.music_id,i));
  await env.DB.batch(stmts);
}
async function scheduleAccess(request,env,scheduleId){
  const auth=await requirePortal(request,env);if(auth.response)return auth;
  const schedule=await env.DB.prepare(`SELECT s.id,s.lesson_id,s.teacher_id,s.lesson_date,t.name teacher_name,l.title lesson_title,l.scripture FROM sunday_school_schedule s LEFT JOIN sunday_school_teachers t ON t.id=s.teacher_id LEFT JOIN sunday_school_lessons l ON l.id=s.lesson_id WHERE s.id=?`).bind(scheduleId).first();
  if(!schedule)return{response:json({ok:false,error:'课表记录不存在'},404),user:auth.user,schedule:null};
  const canEdit=auth.user.kind==='admin'||(auth.user.kind==='teacher'&&schedule.teacher_id===auth.user.id);
  return{response:null,user:auth.user,schedule,canEdit};
}
async function getScheduleDeck(request,env,scheduleId){
  const access=await scheduleAccess(request,env,scheduleId);if(access.response)return access.response;
  const rows=await env.DB.prepare(`SELECT p.id,p.schedule_id,p.source_page_id,p.page_type,p.title,p.body,p.scripture,p.media_url,p.music_id,p.sort_order,m.title music_title,m.audio_url,m.lyrics FROM sunday_school_schedule_pages p LEFT JOIN sunday_school_music m ON m.id=p.music_id WHERE p.schedule_id=? ORDER BY p.sort_order,p.created_at`).bind(scheduleId).all();
  let pages=rows.results||[],is_copy=pages.length>0;
  if(!pages.length&&access.schedule.lesson_id)pages=await lessonPages(env,access.schedule.lesson_id);
  return json({ok:true,schedule:access.schedule,pages,is_copy,can_edit:access.canEdit,user:access.user});
}
async function saveSchedulePage(request,env,scheduleId,pageId=''){
  const access=await scheduleAccess(request,env,scheduleId);if(access.response)return access.response;if(!access.canEdit)return json({ok:false,error:'只有本堂授课老师可以修改本次授课版本'},403);
  if(!access.schedule.lesson_id)return json({ok:false,error:'这堂课还没有绑定课程'},409);
  await ensureScheduleCopy(env,scheduleId,access.schedule.lesson_id);
  const raw=await request.json().catch(()=>({})),page=normalizePage({...raw,id:pageId||undefined},0);
  if(pageId){const result=await env.DB.prepare(`UPDATE sunday_school_schedule_pages SET page_type=?,title=?,body=?,scripture=?,media_url=?,music_id=?,sort_order=?,updated_at=datetime('now') WHERE id=? AND schedule_id=?`).bind(page.page_type,page.title,page.body,page.scripture,page.media_url,page.music_id,page.sort_order,pageId,scheduleId).run();return Number(result.meta?.changes||0)?json({ok:true,page}):json({ok:false,error:'页面不存在'},404)}
  const max=await env.DB.prepare('SELECT COALESCE(MAX(sort_order),-1) max_order FROM sunday_school_schedule_pages WHERE schedule_id=?').bind(scheduleId).first();page.sort_order=Number(max?.max_order??-1)+1;await env.DB.prepare(`INSERT INTO sunday_school_schedule_pages(id,schedule_id,source_page_id,page_type,title,body,scripture,media_url,music_id,sort_order,updated_at) VALUES(?,?,NULL,?,?,?,?,?,?,?,datetime('now'))`).bind(page.id,scheduleId,page.page_type,page.title,page.body,page.scripture,page.media_url,page.music_id,page.sort_order).run();return json({ok:true,page},201);
}
async function deleteSchedulePage(request,env,scheduleId,pageId){const access=await scheduleAccess(request,env,scheduleId);if(access.response)return access.response;if(!access.canEdit)return json({ok:false,error:'只有本堂授课老师可以修改本次授课版本'},403);if(access.schedule.lesson_id)await ensureScheduleCopy(env,scheduleId,access.schedule.lesson_id);const result=await env.DB.prepare('DELETE FROM sunday_school_schedule_pages WHERE id=? AND schedule_id=?').bind(pageId,scheduleId).run();return Number(result.meta?.changes||0)?json({ok:true,id:pageId}):json({ok:false,error:'页面不存在'},404)}
async function reorderSchedulePages(request,env,scheduleId){const access=await scheduleAccess(request,env,scheduleId);if(access.response)return access.response;if(!access.canEdit)return json({ok:false,error:'只有本堂授课老师可以修改本次授课版本'},403);if(access.schedule.lesson_id)await ensureScheduleCopy(env,scheduleId,access.schedule.lesson_id);const body=await request.json().catch(()=>({})),ids=Array.isArray(body.page_ids)?body.page_ids.slice(0,200):[];const stmts=ids.map((id,i)=>env.DB.prepare("UPDATE sunday_school_schedule_pages SET sort_order=?,updated_at=datetime('now') WHERE id=? AND schedule_id=?").bind(i,clean(id,120),scheduleId));if(stmts.length)await env.DB.batch(stmts);return json({ok:true,count:stmts.length})}

async function listMusic(request,env){const auth=await requirePortal(request,env);if(auth.response)return auth.response;const rows=await env.DB.prepare("SELECT id,title,audio_url,lyrics,status,updated_at FROM sunday_school_music WHERE status='active' ORDER BY title").all();return json({ok:true,music:rows.results||[]})}
async function saveMusic(request,env){const auth=await requireEditor(request,env);if(auth.response)return auth.response;const body=await request.json().catch(()=>({})),title=clean(body.title,300);if(!title)return json({ok:false,error:'请填写歌曲名称'},400);const id=clean(body.id||`M-${crypto.randomUUID()}`,120);await env.DB.prepare(`INSERT INTO sunday_school_music(id,title,audio_url,lyrics,status,updated_at) VALUES(?,?,?,?,?,datetime('now')) ON CONFLICT(id) DO UPDATE SET title=excluded.title,audio_url=excluded.audio_url,lyrics=excluded.lyrics,status=excluded.status,updated_at=datetime('now')`).bind(id,title,clean(body.audio_url,2000),clean(body.lyrics,50000),body.status==='inactive'?'inactive':'active').run();return json({ok:true,id},201)}

function generationContract(body){return{version:1,task:'sunday_school.lesson.generate',language:'zh-CN',title:clean(body.title,300),scripture:clean(body.scripture,1000),audience:clean(body.audience||'青少年 14–18岁',300),duration_minutes:Math.max(15,Math.min(120,Number(body.duration_minutes)||45)),focus:clean(body.focus,3000),style_notes:clean(body.style_notes,5000),rules:['只生成课程草稿，不允许发布','经文原文必须来自调用方提供或可靠经文源，不凭记忆伪造','模板样式由网站控制，模型只输出内容','核心重点最多3个','避免道德主义式结论，应用应回到福音与恩典','输出适合网页幻灯片的短页面','音乐只能给出主题/关键词建议；最终歌曲从已审核音乐库选择'],output_schema:{title:'string',scripture:'string',summary:'string',pages:[{page_type:'cover|scripture|teaching|question|image|music|summary|prayer',title:'string',body:'string',scripture:'string',media_prompt:'string optional',music_query:'string optional'}]}}}
async function requestGeneration(request,env){
  const auth=await requireOwner(request,env);if(auth.response)return auth.response;
  const body=await request.json().catch(()=>({}));if(!clean(body.scripture,1000))return json({ok:false,error:'请填写经文范围'},400);
  const id=`GEN-${crypto.randomUUID()}`,contract=generationContract(body);
  await env.DB.prepare(`INSERT INTO sunday_school_generation_requests(id,title,scripture,audience,duration_minutes,focus,style_notes,status,executor,requested_by,payload_json,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,datetime('now'))`).bind(id,contract.title||contract.scripture,contract.scripture,contract.audience,contract.duration_minutes,contract.focus,contract.style_notes,'pending_executor',clean(body.executor||'sinan',40),auth.user.id,JSON.stringify(contract)).run();
  return json({ok:true,id,status:'pending_executor',executor:clean(body.executor||'sinan',40)},202);
}
async function listGenerationRequests(request,env){const auth=await requireOwner(request,env);if(auth.response)return auth.response;const rows=await env.DB.prepare(`SELECT g.id,g.title,g.scripture,g.audience,g.duration_minutes,g.focus,g.status,g.executor,g.lesson_id,g.error,g.created_at,g.updated_at,g.completed_at,l.title lesson_title FROM sunday_school_generation_requests g LEFT JOIN sunday_school_lessons l ON l.id=g.lesson_id ORDER BY g.created_at DESC LIMIT 50`).all();return json({ok:true,requests:rows.results||[]})}
async function executorPending(request,env,url){if(!isExecutor(request,env))return json({ok:false,error:'unauthorized executor'},401);const executor=clean(url.searchParams.get('executor'),40);const sql=executor?`SELECT id,title,scripture,audience,duration_minutes,focus,style_notes,executor,payload_json,created_at FROM sunday_school_generation_requests WHERE status='pending_executor' AND executor=? ORDER BY created_at ASC LIMIT 10`:`SELECT id,title,scripture,audience,duration_minutes,focus,style_notes,executor,payload_json,created_at FROM sunday_school_generation_requests WHERE status='pending_executor' ORDER BY created_at ASC LIMIT 10`;const rows=executor?await env.DB.prepare(sql).bind(executor).all():await env.DB.prepare(sql).all();return json({ok:true,requests:rows.results||[]})}
async function executorStart(request,env,id){if(!isExecutor(request,env))return json({ok:false,error:'unauthorized executor'},401);const result=await env.DB.prepare("UPDATE sunday_school_generation_requests SET status='generating',updated_at=datetime('now') WHERE id=? AND status='pending_executor'").bind(id).run();return Number(result.meta?.changes||0)?json({ok:true,id,status:'generating'}):json({ok:false,error:'任务不存在或已被领取'},409)}
async function executorComplete(request,env,id){
  if(!isExecutor(request,env))return json({ok:false,error:'unauthorized executor'},401);
  const req=await env.DB.prepare('SELECT * FROM sunday_school_generation_requests WHERE id=?').bind(id).first();if(!req)return json({ok:false,error:'生成任务不存在'},404);if(!['pending_executor','generating'].includes(req.status))return json({ok:false,error:`任务状态为 ${req.status}`},409);
  const body=await request.json().catch(()=>({})),pagesRaw=Array.isArray(body.pages)?body.pages:[];if(!pagesRaw.length)return json({ok:false,error:'生成结果没有页面'},400);if(pagesRaw.length>80)return json({ok:false,error:'页面数量过多'},400);
  const lessonId=`L-AI-${crypto.randomUUID()}`,title=clean(body.title||req.title||req.scripture,300),scripture=clean(body.scripture||req.scripture,1000),summary=clean(body.summary,30000);
  await env.DB.prepare(`INSERT INTO sunday_school_lessons(id,title,scripture,content,status,sort_order,source,generation_id,updated_at) VALUES(?,?,?,?, 'draft',0,'ai',?,datetime('now'))`).bind(lessonId,title,scripture,summary,id).run();
  const pages=pagesRaw.map((p,i)=>normalizePage(p,i));
  const stmts=pages.map((p,i)=>env.DB.prepare(`INSERT INTO sunday_school_lesson_pages(id,lesson_id,page_type,title,body,scripture,media_url,music_id,sort_order,updated_at) VALUES(?,?,?,?,?,?,?,?,?,datetime('now'))`).bind(p.id,lessonId,p.page_type,p.title,p.body,p.scripture,p.media_url,null,i));
  if(stmts.length)await env.DB.batch(stmts);
  await env.DB.prepare(`UPDATE sunday_school_generation_requests SET status='ready_for_review',lesson_id=?,result_json=?,completed_at=datetime('now'),updated_at=datetime('now') WHERE id=?`).bind(lessonId,JSON.stringify({title,scripture,summary,page_count:pages.length}),id).run();
  return json({ok:true,id,status:'ready_for_review',lesson_id:lessonId,page_count:pages.length});
}
async function executorFail(request,env,id){if(!isExecutor(request,env))return json({ok:false,error:'unauthorized executor'},401);const body=await request.json().catch(()=>({}));await env.DB.prepare("UPDATE sunday_school_generation_requests SET status='failed',error=?,completed_at=datetime('now'),updated_at=datetime('now') WHERE id=?").bind(clean(body.error||'AI generation failed',3000),id).run();return json({ok:true,id,status:'failed'})}
async function approveGeneration(request,env,id){const auth=await requireOwner(request,env);if(auth.response)return auth.response;const req=await env.DB.prepare('SELECT * FROM sunday_school_generation_requests WHERE id=?').bind(id).first();if(!req?.lesson_id)return json({ok:false,error:'没有可审核的课程'},409);await env.DB.batch([env.DB.prepare("UPDATE sunday_school_lessons SET status='published',approved_by=?,approved_at=datetime('now'),updated_at=datetime('now') WHERE id=?").bind(auth.user.id,req.lesson_id),env.DB.prepare("UPDATE sunday_school_generation_requests SET status='approved',updated_at=datetime('now') WHERE id=?").bind(id)]);return json({ok:true,id,status:'approved',lesson_id:req.lesson_id})}
async function rejectGeneration(request,env,id){const auth=await requireOwner(request,env);if(auth.response)return auth.response;const body=await request.json().catch(()=>({}));const req=await env.DB.prepare('SELECT * FROM sunday_school_generation_requests WHERE id=?').bind(id).first();if(!req)return json({ok:false,error:'任务不存在'},404);await env.DB.prepare("UPDATE sunday_school_generation_requests SET status='rejected',review_notes=?,updated_at=datetime('now') WHERE id=?").bind(clean(body.notes,5000),id).run();return json({ok:true,id,status:'rejected'})}

export async function handleSundaySchoolContentApi(request,env,url){
  if(!url.pathname.startsWith('/api/sunday-school/content/')&&!url.pathname.startsWith('/api/sunday-school/ai/'))return null;
  let m;
  m=url.pathname.match(/^\/api\/sunday-school\/content\/lessons\/([^/]+)\/deck$/);if(m&&request.method==='GET')return getDeck(request,env,decodeURIComponent(m[1]));
  m=url.pathname.match(/^\/api\/sunday-school\/content\/lessons\/([^/]+)\/pages$/);if(m&&request.method==='POST')return createPage(request,env,decodeURIComponent(m[1]));
  m=url.pathname.match(/^\/api\/sunday-school\/content\/lessons\/([^/]+)\/pages\/([^/]+)$/);if(m&&request.method==='POST')return updatePage(request,env,decodeURIComponent(m[1]),decodeURIComponent(m[2]));if(m&&request.method==='DELETE')return deletePage(request,env,decodeURIComponent(m[1]),decodeURIComponent(m[2]));
  m=url.pathname.match(/^\/api\/sunday-school\/content\/lessons\/([^/]+)\/reorder$/);if(m&&request.method==='POST')return reorderPages(request,env,decodeURIComponent(m[1]));
  m=url.pathname.match(/^\/api\/sunday-school\/content\/schedule\/([^/]+)\/deck$/);if(m&&request.method==='GET')return getScheduleDeck(request,env,decodeURIComponent(m[1]));
  m=url.pathname.match(/^\/api\/sunday-school\/content\/schedule\/([^/]+)\/pages$/);if(m&&request.method==='POST')return saveSchedulePage(request,env,decodeURIComponent(m[1]));
  m=url.pathname.match(/^\/api\/sunday-school\/content\/schedule\/([^/]+)\/pages\/([^/]+)$/);if(m&&request.method==='POST')return saveSchedulePage(request,env,decodeURIComponent(m[1]),decodeURIComponent(m[2]));if(m&&request.method==='DELETE')return deleteSchedulePage(request,env,decodeURIComponent(m[1]),decodeURIComponent(m[2]));
  m=url.pathname.match(/^\/api\/sunday-school\/content\/schedule\/([^/]+)\/reorder$/);if(m&&request.method==='POST')return reorderSchedulePages(request,env,decodeURIComponent(m[1]));
  if(url.pathname==='/api/sunday-school/content/music'&&request.method==='GET')return listMusic(request,env);if(url.pathname==='/api/sunday-school/content/music'&&request.method==='POST')return saveMusic(request,env);
  if(url.pathname==='/api/sunday-school/ai/generate'&&request.method==='POST')return requestGeneration(request,env);
  if(url.pathname==='/api/sunday-school/ai/requests'&&request.method==='GET')return listGenerationRequests(request,env);
  if(url.pathname==='/api/sunday-school/ai/executor/pending'&&request.method==='GET')return executorPending(request,env,url);
  m=url.pathname.match(/^\/api\/sunday-school\/ai\/executor\/requests\/([^/]+)\/(start|complete|fail)$/);if(m){const id=decodeURIComponent(m[1]);if(m[2]==='start'&&request.method==='POST')return executorStart(request,env,id);if(m[2]==='complete'&&request.method==='POST')return executorComplete(request,env,id);if(m[2]==='fail'&&request.method==='POST')return executorFail(request,env,id)}
  m=url.pathname.match(/^\/api\/sunday-school\/ai\/requests\/([^/]+)\/(approve|reject)$/);if(m&&request.method==='POST')return m[2]==='approve'?approveGeneration(request,env,decodeURIComponent(m[1])):rejectGeneration(request,env,decodeURIComponent(m[1]));
  return json({ok:false,error:'not found'},404);
}
