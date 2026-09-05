import { authenticate, authorize } from './admin-auth.js';

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function clean(value,max=12000){return String(value??'').trim().slice(0,max)}
function bearer(request){return request.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||''}
function hex(bytes){return [...new Uint8Array(bytes)].map(value=>value.toString(16).padStart(2,'0')).join('')}
async function tokenHash(token){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))}
function accessKey(){const bytes=crypto.getRandomValues(new Uint8Array(32));return 'EVK-T-'+btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','')}

async function teacherFromToken(request,env){
  if(!env.DB)return null;
  const token=bearer(request);if(!token)return null;
  const hash=await tokenHash(token);
  const teacher=await env.DB.prepare("SELECT id,name,email,status FROM sunday_school_teachers WHERE token_hash=? AND status='active'").bind(hash).first();
  if(!teacher)return null;
  env.DB.prepare("UPDATE sunday_school_teachers SET last_used_at=datetime('now') WHERE id=?").bind(teacher.id).run().catch(()=>{});
  return{...teacher,kind:'teacher',role:'teacher'};
}

async function portalUser(request,env){
  const teacher=await teacherFromToken(request,env);if(teacher)return teacher;
  const admin=await authenticate(request,env);if(admin)return{...admin,kind:'admin'};
  return null;
}

async function requirePortal(request,env){
  if(!env.DB)return{response:json({ok:false,error:'D1 database is not configured'},503),user:null};
  const user=await portalUser(request,env);
  return user?{response:null,user}:{response:json({ok:false,error:'同工账号或密码不正确'},401),user:null};
}

async function login(request,env){
  const auth=await requirePortal(request,env);if(auth.response)return auth.response;
  const body=await request.json().catch(()=>({}));
  const identifier=clean(body.identifier,200).toLowerCase();
  const user=auth.user;
  const accepted=user.master
    ? ['主管理员','master'].includes(identifier)
    : identifier&&[clean(user.name,120).toLowerCase(),clean(user.email,200).toLowerCase()].filter(Boolean).includes(identifier);
  if(!accepted)return json({ok:false,error:'同工账号或密码不正确'},401);
  return json({ok:true,user});
}

async function listTeachers(request,env){
  const auth=await requirePortal(request,env);if(auth.response)return auth.response;
  const rows=await env.DB.prepare("SELECT id,name,email,status,last_used_at,created_at FROM sunday_school_teachers WHERE status='active' ORDER BY name").all();
  return json({ok:true,teachers:rows.results||[],user:auth.user});
}

async function createTeacher(request,env){
  const auth=await authorize(request,env,'owner');if(auth.response)return auth.response;
  const body=await request.json().catch(()=>({}));
  const name=clean(body.name,120),email=clean(body.email,200).toLowerCase();
  if(!name)return json({ok:false,error:'请填写老师姓名'},400);
  const token=accessKey(),hash=await tokenHash(token),id='T-'+crypto.randomUUID();
  await env.DB.prepare("INSERT INTO sunday_school_teachers(id,name,email,token_hash,status) VALUES(?,?,?,?,'active')").bind(id,name,email||null,hash).run();
  return json({ok:true,teacher:{id,name,email,status:'active'},access_key:token},201);
}

async function setTeacherStatus(request,env,id){
  const auth=await authorize(request,env,'owner');if(auth.response)return auth.response;
  const body=await request.json().catch(()=>({}));
  const status=body.status==='disabled'?'disabled':'active';
  const result=await env.DB.prepare("UPDATE sunday_school_teachers SET status=?,updated_at=datetime('now') WHERE id=?").bind(status,id).run();
  return Number(result.meta?.changes||0)?json({ok:true,id,status}):json({ok:false,error:'老师不存在'},404);
}

async function listLessons(request,env){
  const auth=await requirePortal(request,env);if(auth.response)return auth.response;
  const showDraft=auth.user.kind==='admin';
  const sql=`SELECT id,title,scripture,content,status,sort_order,updated_at FROM sunday_school_lessons ${showDraft?'':"WHERE status='published'"} ORDER BY sort_order ASC,created_at ASC`;
  const rows=await env.DB.prepare(sql).all();
  return json({ok:true,lessons:rows.results||[],user:auth.user});
}

async function saveLesson(request,env,id=''){
  const auth=await authorize(request,env,'editor');if(auth.response)return auth.response;
  const body=await request.json().catch(()=>({}));
  const lessonId=clean(id||body.id||`L-${crypto.randomUUID()}`,120),title=clean(body.title,300);
  if(!title)return json({ok:false,error:'请填写课程标题'},400);
  await env.DB.prepare(`INSERT INTO sunday_school_lessons(id,title,scripture,content,status,sort_order,updated_at)
    VALUES(?,?,?,?,?,?,datetime('now'))
    ON CONFLICT(id) DO UPDATE SET title=excluded.title,scripture=excluded.scripture,content=excluded.content,status=excluded.status,sort_order=excluded.sort_order,updated_at=datetime('now')`)
    .bind(lessonId,title,clean(body.scripture,300),clean(body.content,100000),body.status==='draft'?'draft':'published',Number(body.sort_order)||0).run();
  return json({ok:true,id:lessonId},201);
}

async function listSchedule(request,env){
  const auth=await requirePortal(request,env);if(auth.response)return auth.response;
  const rows=await env.DB.prepare(`SELECT s.id,s.lesson_date,s.teacher_id,s.lesson_id,s.note,s.updated_at,
      t.name teacher_name,l.title lesson_title,l.scripture
    FROM sunday_school_schedule s
    LEFT JOIN sunday_school_teachers t ON t.id=s.teacher_id
    LEFT JOIN sunday_school_lessons l ON l.id=s.lesson_id
    ORDER BY s.lesson_date ASC LIMIT 160`).all();
  return json({ok:true,schedule:rows.results||[],user:auth.user});
}

async function saveSchedule(request,env,id=''){
  const auth=await authorize(request,env,'editor');if(auth.response)return auth.response;
  const body=await request.json().catch(()=>({}));
  const scheduleId=clean(id||body.id||`S-${crypto.randomUUID()}`,120),date=clean(body.lesson_date,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return json({ok:false,error:'请选择上课日期'},400);
  await env.DB.prepare(`INSERT INTO sunday_school_schedule(id,lesson_date,teacher_id,lesson_id,note,updated_at)
    VALUES(?,?,?,?,?,datetime('now'))
    ON CONFLICT(id) DO UPDATE SET lesson_date=excluded.lesson_date,teacher_id=excluded.teacher_id,lesson_id=excluded.lesson_id,note=excluded.note,updated_at=datetime('now')`)
    .bind(scheduleId,date,clean(body.teacher_id,120)||null,clean(body.lesson_id,120)||null,clean(body.note,1000)).run();
  return json({ok:true,id:scheduleId},201);
}

async function listStudents(request,env){
  const auth=await requirePortal(request,env);if(auth.response)return auth.response;
  const rows=await env.DB.prepare("SELECT id,name,status,sort_order FROM sunday_school_students WHERE status='active' ORDER BY sort_order,name").all();
  return json({ok:true,students:rows.results||[],user:auth.user});
}

async function createStudent(request,env){
  const auth=await authorize(request,env,'editor');if(auth.response)return auth.response;
  const body=await request.json().catch(()=>({})),name=clean(body.name,120);
  if(!name)return json({ok:false,error:'请填写学生姓名'},400);
  const id='ST-'+crypto.randomUUID();
  await env.DB.prepare("INSERT INTO sunday_school_students(id,name,sort_order) VALUES(?,?,?)").bind(id,name,Number(body.sort_order)||0).run();
  return json({ok:true,id,name},201);
}

async function getNote(request,env,scheduleId){
  const auth=await requirePortal(request,env);if(auth.response)return auth.response;
  if(auth.user.kind!=='teacher')return json({ok:true,note:null});
  const note=await env.DB.prepare("SELECT id,schedule_id,teacher_id,body,updated_at FROM sunday_school_notes WHERE schedule_id=? AND teacher_id=?").bind(scheduleId,auth.user.id).first();
  return json({ok:true,note:note||null});
}

async function saveNote(request,env,scheduleId){
  const auth=await requirePortal(request,env);if(auth.response)return auth.response;
  if(auth.user.kind!=='teacher')return json({ok:false,error:'请使用老师账号保存个人授课笔记'},403);
  const body=await request.json().catch(()=>({})),id=`N-${scheduleId}-${auth.user.id}`;
  await env.DB.prepare(`INSERT INTO sunday_school_notes(id,schedule_id,teacher_id,body,updated_at)
    VALUES(?,?,?,?,datetime('now'))
    ON CONFLICT(schedule_id,teacher_id) DO UPDATE SET body=excluded.body,updated_at=datetime('now')`)
    .bind(id,scheduleId,auth.user.id,clean(body.body,30000)).run();
  return json({ok:true,id});
}

async function getAttendance(request,env,scheduleId){
  const auth=await requirePortal(request,env);if(auth.response)return auth.response;
  const rows=await env.DB.prepare(`SELECT st.id student_id,st.name,COALESCE(a.status,'absent') status
    FROM sunday_school_students st
    LEFT JOIN sunday_school_attendance a ON a.student_id=st.id AND a.schedule_id=?
    WHERE st.status='active' ORDER BY st.sort_order,st.name`).bind(scheduleId).all();
  return json({ok:true,attendance:rows.results||[]});
}

async function saveAttendance(request,env,scheduleId){
  const auth=await requirePortal(request,env);if(auth.response)return auth.response;
  const body=await request.json().catch(()=>({})),items=Array.isArray(body.items)?body.items:[];
  const statements=[];
  for(const item of items.slice(0,200)){
    const studentId=clean(item.student_id,120);if(!studentId)continue;
    const status=['present','leave'].includes(item.status)?item.status:'absent';
    statements.push(env.DB.prepare(`INSERT INTO sunday_school_attendance(schedule_id,student_id,status,updated_at)
      VALUES(?,?,?,datetime('now')) ON CONFLICT(schedule_id,student_id) DO UPDATE SET status=excluded.status,updated_at=datetime('now')`).bind(scheduleId,studentId,status));
  }
  if(statements.length)await env.DB.batch(statements);
  return json({ok:true,count:statements.length});
}

async function listRecords(request,env){
  const auth=await requirePortal(request,env);if(auth.response)return auth.response;
  const rows=await env.DB.prepare(`SELECT r.id,r.schedule_id,r.teacher_id,r.progress,r.response,r.follow_up,r.notes,r.updated_at,
      s.lesson_date,t.name teacher_name,l.title lesson_title,l.scripture
    FROM sunday_school_records r
    JOIN sunday_school_schedule s ON s.id=r.schedule_id
    LEFT JOIN sunday_school_teachers t ON t.id=r.teacher_id
    LEFT JOIN sunday_school_lessons l ON l.id=s.lesson_id
    ORDER BY s.lesson_date DESC,r.updated_at DESC LIMIT 80`).all();
  return json({ok:true,records:rows.results||[],user:auth.user});
}

async function getRecord(request,env,scheduleId){
  const auth=await requirePortal(request,env);if(auth.response)return auth.response;
  const record=await env.DB.prepare(`SELECT r.*,t.name teacher_name FROM sunday_school_records r LEFT JOIN sunday_school_teachers t ON t.id=r.teacher_id WHERE r.schedule_id=?`).bind(scheduleId).first();
  return json({ok:true,record:record||null});
}

async function saveRecord(request,env,scheduleId){
  const auth=await requirePortal(request,env);if(auth.response)return auth.response;
  if(auth.user.kind!=='teacher')return json({ok:false,error:'请使用老师账号提交课堂记录'},403);
  const body=await request.json().catch(()=>({})),id=`R-${scheduleId}`;
  await env.DB.prepare(`INSERT INTO sunday_school_records(id,schedule_id,teacher_id,progress,response,follow_up,notes,updated_at)
    VALUES(?,?,?,?,?,?,?,datetime('now'))
    ON CONFLICT(schedule_id) DO UPDATE SET teacher_id=excluded.teacher_id,progress=excluded.progress,response=excluded.response,follow_up=excluded.follow_up,notes=excluded.notes,updated_at=datetime('now')`)
    .bind(id,scheduleId,auth.user.id,clean(body.progress,5000),clean(body.response,5000),clean(body.follow_up,5000),clean(body.notes,10000)).run();
  return json({ok:true,id});
}

async function dashboard(request,env){
  const auth=await requirePortal(request,env);if(auth.response)return auth.response;
  const schedules=(await env.DB.prepare(`SELECT s.id,s.lesson_date,s.teacher_id,s.lesson_id,t.name teacher_name,l.title lesson_title,l.scripture
    FROM sunday_school_schedule s LEFT JOIN sunday_school_teachers t ON t.id=s.teacher_id LEFT JOIN sunday_school_lessons l ON l.id=s.lesson_id
    WHERE s.lesson_date>=date('now','-1 day') ORDER BY s.lesson_date ASC LIMIT 8`).all()).results||[];
  const records=(await env.DB.prepare(`SELECT r.schedule_id,r.progress,r.response,r.follow_up,r.notes,r.updated_at,s.lesson_date,t.name teacher_name,l.title lesson_title
    FROM sunday_school_records r JOIN sunday_school_schedule s ON s.id=r.schedule_id LEFT JOIN sunday_school_teachers t ON t.id=r.teacher_id LEFT JOIN sunday_school_lessons l ON l.id=s.lesson_id
    ORDER BY s.lesson_date DESC LIMIT 5`).all()).results||[];
  return json({ok:true,user:auth.user,schedule:schedules,records});
}

export async function handleSundaySchoolApi(request,env,url){
  if(request.method==='POST'&&url.pathname==='/api/sunday-school/login')return login(request,env);
  if(request.method==='GET'&&url.pathname==='/api/sunday-school/dashboard')return dashboard(request,env);
  if(request.method==='GET'&&url.pathname==='/api/sunday-school/teachers')return listTeachers(request,env);
  if(request.method==='POST'&&url.pathname==='/api/sunday-school/teachers')return createTeacher(request,env);
  let match=url.pathname.match(/^\/api\/sunday-school\/teachers\/([^/]+)\/status$/);if(match&&request.method==='POST')return setTeacherStatus(request,env,decodeURIComponent(match[1]));
  if(request.method==='GET'&&url.pathname==='/api/sunday-school/lessons')return listLessons(request,env);
  if(request.method==='POST'&&url.pathname==='/api/sunday-school/lessons')return saveLesson(request,env);
  match=url.pathname.match(/^\/api\/sunday-school\/lessons\/([^/]+)$/);if(match&&request.method==='POST')return saveLesson(request,env,decodeURIComponent(match[1]));
  if(request.method==='GET'&&url.pathname==='/api/sunday-school/schedule')return listSchedule(request,env);
  if(request.method==='POST'&&url.pathname==='/api/sunday-school/schedule')return saveSchedule(request,env);
  match=url.pathname.match(/^\/api\/sunday-school\/schedule\/([^/]+)$/);if(match&&request.method==='POST')return saveSchedule(request,env,decodeURIComponent(match[1]));
  if(request.method==='GET'&&url.pathname==='/api/sunday-school/students')return listStudents(request,env);
  if(request.method==='POST'&&url.pathname==='/api/sunday-school/students')return createStudent(request,env);
  match=url.pathname.match(/^\/api\/sunday-school\/notes\/([^/]+)$/);if(match&&request.method==='GET')return getNote(request,env,decodeURIComponent(match[1]));
  if(match&&request.method==='POST')return saveNote(request,env,decodeURIComponent(match[1]));
  match=url.pathname.match(/^\/api\/sunday-school\/attendance\/([^/]+)$/);if(match&&request.method==='GET')return getAttendance(request,env,decodeURIComponent(match[1]));
  if(match&&request.method==='POST')return saveAttendance(request,env,decodeURIComponent(match[1]));
  if(request.method==='GET'&&url.pathname==='/api/sunday-school/records')return listRecords(request,env);
  match=url.pathname.match(/^\/api\/sunday-school\/records\/([^/]+)$/);if(match&&request.method==='GET')return getRecord(request,env,decodeURIComponent(match[1]));
  if(match&&request.method==='POST')return saveRecord(request,env,decodeURIComponent(match[1]));
  return null;
}
