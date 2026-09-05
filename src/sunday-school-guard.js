import { authenticate, authorize } from './admin-auth.js';

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function bearer(request){return request.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||''}
function hex(bytes){return [...new Uint8Array(bytes)].map(value=>value.toString(16).padStart(2,'0')).join('')}
async function tokenHash(token){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))}

async function activeTeacher(request,env){
  if(!env.DB)return null;
  const token=bearer(request);if(!token)return null;
  const hash=await tokenHash(token);
  return env.DB.prepare("SELECT id,name FROM sunday_school_teachers WHERE token_hash=? AND status='active'").bind(hash).first();
}

async function guardAssignedTeacher(request,env,scheduleId){
  if(!env.DB)return null;
  const teacher=await activeTeacher(request,env);
  if(!teacher){
    const admin=await authenticate(request,env);
    if(admin)return json({ok:false,error:'只有本堂授课老师可以修改这堂课的数据'},403);
    return null;
  }
  const schedule=await env.DB.prepare('SELECT id,teacher_id FROM sunday_school_schedule WHERE id=?').bind(scheduleId).first();
  if(!schedule)return json({ok:false,error:'课表记录不存在'},404);
  if(schedule.teacher_id!==teacher.id)return json({ok:false,error:'只有本堂授课老师可以修改这堂课的数据'},403);
  return null;
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

export async function handleSundaySchoolGuard(request,env,url){
  if(request.method==='POST'){
    let m=url.pathname.match(/^\/api\/sunday-school\/(attendance|records)\/([^/]+)$/);
    if(m)return guardAssignedTeacher(request,env,decodeURIComponent(m[2]));

    m=url.pathname.match(/^\/api\/sunday-school\/ai\/requests\/([^/]+)\/(approve|reject)$/);
    if(m)return guardReviewState(request,env,decodeURIComponent(m[1]));

    m=url.pathname.match(/^\/api\/sunday-school\/ai\/executor\/requests\/([^/]+)\/fail$/);
    if(m)return guardExecutorFail(request,env,decodeURIComponent(m[1]));
  }
  return null;
}
