import { handleSundaySchoolContentApi } from './sunday-school-content.js';

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function clean(value,max=12000){return String(value??'').trim().slice(0,max)}

async function legacyLesson(env,lessonId){
  if(!env.DB||!lessonId)return null;
  const lesson=await env.DB.prepare('SELECT id,title,scripture,content FROM sunday_school_lessons WHERE id=?').bind(lessonId).first();
  return lesson&&clean(lesson.content,100000)?lesson:null;
}

function legacyPage(lesson){
  return {id:'legacy',lesson_id:lesson.id,page_type:'teaching',title:lesson.title,body:lesson.content,scripture:lesson.scripture||'',media_url:'',music_id:null,sort_order:0};
}

function rewrittenRequest(request,newUrl,body){
  const init={method:request.method,headers:new Headers(request.headers)};
  if(body!==undefined){init.body=JSON.stringify(body);init.headers.set('content-type','application/json')}
  return new Request(newUrl,init);
}

async function lessonHasPages(env,lessonId){
  const row=await env.DB.prepare('SELECT COUNT(*) count FROM sunday_school_lesson_pages WHERE lesson_id=?').bind(lessonId).first();
  return Number(row?.count||0)>0;
}

async function scheduleLegacyInfo(env,scheduleId){
  const schedule=await env.DB.prepare('SELECT id,lesson_id FROM sunday_school_schedule WHERE id=?').bind(scheduleId).first();
  if(!schedule?.lesson_id)return null;
  const row=await env.DB.prepare('SELECT COUNT(*) count FROM sunday_school_schedule_pages WHERE schedule_id=?').bind(scheduleId).first();
  if(Number(row?.count||0)>0)return null;
  const lesson=await legacyLesson(env,schedule.lesson_id);
  return lesson?{schedule,lesson}:null;
}

async function createViaDelegate(request,env,url,body){
  const req=rewrittenRequest(request,url,body);
  return handleSundaySchoolContentApi(req,env,new URL(url));
}

export async function handleSundaySchoolCompatibility(request,env,url){
  if(!env.DB||!url.pathname.startsWith('/api/sunday-school/content/'))return null;
  let m;

  m=url.pathname.match(/^\/api\/sunday-school\/content\/lessons\/([^/]+)\/pages$/);
  if(m&&request.method==='POST'){
    const lessonId=decodeURIComponent(m[1]);
    if(!await lessonHasPages(env,lessonId)){
      const lesson=await legacyLesson(env,lessonId);
      if(lesson){
        const first=await createViaDelegate(request,env,url.toString(),legacyPage(lesson));
        if(!first||!first.ok)return first;
        await env.DB.prepare("UPDATE sunday_school_lessons SET content='',updated_at=datetime('now') WHERE id=?").bind(lessonId).run();
      }
    }
    return handleSundaySchoolContentApi(request,env,url);
  }

  m=url.pathname.match(/^\/api\/sunday-school\/content\/lessons\/([^/]+)\/pages\/legacy$/);
  if(m){
    const lessonId=decodeURIComponent(m[1]);
    const lesson=!await lessonHasPages(env,lessonId)?await legacyLesson(env,lessonId):null;
    if(lesson&&request.method==='POST'){
      const body=await request.clone().json().catch(()=>({}));
      const createUrl=new URL(url);createUrl.pathname=`/api/sunday-school/content/lessons/${encodeURIComponent(lessonId)}/pages`;
      const response=await createViaDelegate(request,env,createUrl.toString(),body);
      if(response?.ok)await env.DB.prepare("UPDATE sunday_school_lessons SET content='',updated_at=datetime('now') WHERE id=?").bind(lessonId).run();
      return response;
    }
    if(lesson&&request.method==='DELETE')return json({ok:false,error:'旧版课程只有这一页。请先新增一页，再删除旧版页。'},409);
  }

  m=url.pathname.match(/^\/api\/sunday-school\/content\/schedule\/([^/]+)\/deck$/);
  if(m&&request.method==='GET'){
    const response=await handleSundaySchoolContentApi(request,env,url);if(!response||!response.ok)return response;
    const data=await response.clone().json().catch(()=>null);
    if(!data||data.pages?.length||!data.schedule?.lesson_id)return response;
    const lesson=await legacyLesson(env,data.schedule.lesson_id);if(!lesson)return response;
    return json({...data,pages:[legacyPage(lesson)],is_copy:false});
  }

  m=url.pathname.match(/^\/api\/sunday-school\/content\/schedule\/([^/]+)\/pages$/);
  if(m&&request.method==='POST'){
    const scheduleId=decodeURIComponent(m[1]),info=await scheduleLegacyInfo(env,scheduleId);
    if(info){
      const first=await createViaDelegate(request,env,url.toString(),legacyPage(info.lesson));
      if(!first||!first.ok)return first;
    }
    return handleSundaySchoolContentApi(request,env,url);
  }

  m=url.pathname.match(/^\/api\/sunday-school\/content\/schedule\/([^/]+)\/pages\/legacy$/);
  if(m){
    const scheduleId=decodeURIComponent(m[1]),info=await scheduleLegacyInfo(env,scheduleId);
    if(info&&request.method==='POST'){
      const createUrl=new URL(url);createUrl.pathname=`/api/sunday-school/content/schedule/${encodeURIComponent(scheduleId)}/pages`;
      return handleSundaySchoolContentApi(rewrittenRequest(request,createUrl.toString(),await request.clone().json().catch(()=>({}))),env,createUrl);
    }
    if(info&&request.method==='DELETE')return json({ok:false,error:'旧版课程只有这一页。请先新增一页，再删除旧版页。'},409);
  }

  return null;
}
