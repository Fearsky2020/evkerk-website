const $=(s,r=document)=>r.querySelector(s);const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const TOKEN_KEY='evkerk_teacher_token',ID_KEY='evkerk_teacher_identifier';
const state={user:null,schedule:[],lessons:[],teachers:[],students:[],records:[],currentSchedule:null};

function token(){return localStorage.getItem(TOKEN_KEY)||''}
function headers(extra={}){return{authorization:`Bearer ${token()}`,...extra}}
async function api(path,options={}){const response=await fetch(path,{...options,headers:headers(options.headers||{})});const data=await response.json().catch(()=>({ok:false,error:'服务器返回异常'}));if(response.status===401&&path!=='/api/sunday-school/login')logout();if(!response.ok)throw new Error(data.error||'操作失败');return data}
function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function nl(value){return esc(value||'').replace(/\n/g,'<br>')}
function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function formatDate(value){if(!value)return'';const d=new Date(`${value}T12:00:00`);return new Intl.DateTimeFormat('zh-CN',{timeZone:'Europe/Amsterdam',month:'long',day:'numeric',weekday:'short'}).format(d)}
function message(el,text,type=''){el.textContent=text||'';el.className=`message ${type}`.trim()}
function empty(text){return`<div class="empty">${esc(text)}</div>`}

function showApp(){
  $('#loginView').hidden=true;$('#appView').hidden=false;$('#whoName').textContent=state.user?.name||'同工';
  const manage=state.user?.kind==='admin'&&['owner','editor'].includes(state.user.role);$('#manageTab').hidden=!manage;
}
function logout(){localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(ID_KEY);state.user=null;$('#appView').hidden=true;$('#loginView').hidden=false}

async function login(identifier,key){
  localStorage.setItem(TOKEN_KEY,key);localStorage.setItem(ID_KEY,identifier);
  try{const data=await api('/api/sunday-school/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({identifier})});state.user=data.user;await bootstrap();return true}catch(error){localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(ID_KEY);throw error}
}

async function bootstrap(){
  const [dashboard,schedule,lessons,teachers,students,records]=await Promise.all([
    api('/api/sunday-school/dashboard'),api('/api/sunday-school/schedule'),api('/api/sunday-school/lessons'),api('/api/sunday-school/teachers'),api('/api/sunday-school/students'),api('/api/sunday-school/records')
  ]);
  state.user=dashboard.user;state.schedule=schedule.schedule||[];state.lessons=lessons.lessons||[];state.teachers=teachers.teachers||[];state.students=students.students||[];state.records=records.records||[];
  showApp();renderAll();
}

function nextSchedule(){const future=state.schedule.filter(x=>x.lesson_date>=today());if(state.user?.kind==='teacher')return future.find(x=>x.teacher_id===state.user.id)||future[0];return future[0]}
function lessonById(id){return state.lessons.find(x=>x.id===id)}
function scheduleById(id){return state.schedule.find(x=>x.id===id)}

function renderHome(){
  const next=nextSchedule(),box=$('#nextLesson');
  if(!next){box.innerHTML=empty('目前还没有安排下一堂课。');}
  else{const mine=state.user?.kind==='teacher'&&next.teacher_id===state.user.id;box.innerHTML=`<div class="next-card"><p class="eyebrow">${mine?'我的下一堂课':'下一堂主日学'}</p><h2>${esc(next.lesson_title||'课程待安排')}</h2><p class="muted">${esc(next.scripture||'')}</p><div class="next-meta"><span>${esc(formatDate(next.lesson_date))}</span><span>${esc(next.teacher_name||'老师待安排')}</span></div><button class="primary" data-open-class="${esc(next.id)}">${mine?'开始备课':'查看安排'}</button></div>`}
  $('#recentRecords').innerHTML=state.records.length?state.records.slice(0,3).map(recordCard).join(''):empty('还没有课堂记录。第一堂课结束后，它会出现在这里。');
}

function recordCard(r){return`<article class="record-card"><header><div><h3>${esc(r.lesson_title||'主日学')}</h3><div class="meta">${esc(formatDate(r.lesson_date))} · ${esc(r.teacher_name||'')}</div></div></header><div class="record-body"><div><strong>讲到哪里</strong><p>${nl(r.progress)||'—'}</p></div><div><strong>学生反应</strong><p>${nl(r.response)||'—'}</p></div><div><strong>后面留意</strong><p>${nl(r.follow_up)||'—'}</p></div></div>${r.notes?`<p class="muted">${nl(r.notes)}</p>`:''}</article>`}

function renderSchedule(){
  const list=[...state.schedule].sort((a,b)=>a.lesson_date.localeCompare(b.lesson_date));
  $('#scheduleList').innerHTML=list.length?list.map(s=>{const mine=state.user?.kind==='teacher'&&s.teacher_id===state.user.id;return`<article class="schedule-card ${mine?'mine':''}"><header><div class="schedule-date">${esc(formatDate(s.lesson_date))}</div><div class="schedule-main"><h3>${esc(s.lesson_title||'课程待安排')}</h3><div class="meta">${esc(s.scripture||'')} ${s.teacher_name?`· ${esc(s.teacher_name)}`:''}</div>${s.note?`<p class="muted">${esc(s.note)}</p>`:''}<div class="schedule-actions"><button class="secondary" data-open-class="${esc(s.id)}">${mine?'备课 / 记录':'查看'}</button>${s.lesson_id?`<button class="secondary" data-open-lesson="${esc(s.lesson_id)}">课程内容</button>`:''}</div></div></header></article>`}).join(''):empty('课表还是空的。负责人安排后就会显示在这里。')
}

function renderLessons(){
  $('#lessonList').innerHTML=state.lessons.length?state.lessons.map(l=>`<article class="lesson-card" data-open-lesson="${esc(l.id)}"><div class="scripture">${esc(l.scripture||'主日学课程')}</div><h3>${esc(l.title)}</h3><p class="lesson-preview">${esc(l.content||'')}</p></article>`).join(''):empty('课程还没有上传。')
}

function renderAttendancePicker(){
  const select=$('#attendanceSchedule'),choices=state.schedule.filter(s=>s.lesson_date<=today()).sort((a,b)=>b.lesson_date.localeCompare(a.lesson_date));
  select.innerHTML='<option value="">选择日期和课程</option>'+choices.map(s=>`<option value="${esc(s.id)}">${esc(formatDate(s.lesson_date))} · ${esc(s.lesson_title||'主日学')} · ${esc(s.teacher_name||'')}</option>`).join('');
  $('#attendanceCard').innerHTML='<p class="muted">选择一堂已经安排的课程，然后点学生状态。</p>';
}

function renderRecords(){
  $('#recordList').innerHTML=state.records.length?state.records.map(recordCard).join(''):empty('还没有教学记录。')
}

function renderManageOptions(){
  $('#manageTeacherSelect').innerHTML='<option value="">老师待安排</option>'+state.teachers.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('');
  $('#manageLessonSelect').innerHTML='<option value="">课程待安排</option>'+state.lessons.map(l=>`<option value="${esc(l.id)}">${esc(l.title)}</option>`).join('');
  $('#teacherForm').hidden=!(state.user?.kind==='admin'&&state.user.role==='owner');
}
function renderAll(){renderHome();renderSchedule();renderLessons();renderAttendancePicker();renderRecords();renderManageOptions()}

function switchView(name){$$('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===name));$$('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${name}`));window.scrollTo({top:0,behavior:'smooth'})}

function openLesson(id){const lesson=lessonById(id);if(!lesson)return;$('#dialogTitle').textContent=lesson.title;$('#dialogScripture').textContent=lesson.scripture||'课程内容';$('#dialogContent').textContent=lesson.content||'';$('#lessonDialog').showModal()}

async function openClass(id){
  const s=scheduleById(id);if(!s)return;state.currentSchedule=s;
  $('#classDate').textContent=formatDate(s.lesson_date);$('#classTitle').textContent=s.lesson_title||'主日学';$('#classTeacher').textContent=`授课老师：${s.teacher_name||'待安排'}`;$('#openLessonBtn').dataset.lessonId=s.lesson_id||'';
  const canWrite=state.user?.kind==='teacher'&&s.teacher_id===state.user.id;
  $('#teacherNoteBlock').hidden=!canWrite;$('#saveRecordBtn').hidden=!canWrite;['recordProgress','recordResponse','recordFollow','recordNotes'].forEach(id=>$('#'+id).disabled=!canWrite);
  try{
    const [noteData,recordData]=await Promise.all([api(`/api/sunday-school/notes/${encodeURIComponent(id)}`),api(`/api/sunday-school/records/${encodeURIComponent(id)}`)]);
    $('#teacherNote').value=noteData.note?.body||'';const r=recordData.record||{};$('#recordProgress').value=r.progress||'';$('#recordResponse').value=r.response||'';$('#recordFollow').value=r.follow_up||'';$('#recordNotes').value=r.notes||'';
  }catch(error){message($('#recordMessage'),error.message,'error')}
  message($('#noteMessage'),'');message($('#recordMessage'),'');$('#classDialog').showModal();
}

async function loadAttendance(scheduleId){
  if(!scheduleId){$('#attendanceCard').innerHTML='<p class="muted">先选择一堂课。</p>';return}
  $('#attendanceCard').innerHTML='<p class="muted">正在读取学生名单…</p>';
  try{const data=await api(`/api/sunday-school/attendance/${encodeURIComponent(scheduleId)}`);const rows=data.attendance||[];$('#attendanceCard').innerHTML=rows.length?`<div class="attendance-list">${rows.map(row=>`<div class="student-row" data-student="${esc(row.student_id)}"><strong>${esc(row.name)}</strong><div class="status-buttons">${[['present','到场'],['absent','缺席'],['leave','请假']].map(([value,label])=>`<button type="button" data-status="${value}" class="${row.status===value?'active':''}">${label}</button>`).join('')}</div></div>`).join('')}</div><div class="actions"><button class="primary" id="saveAttendance">保存到场记录</button><span class="message" id="attendanceMessage"></span></div>`:empty('学生名单还是空的。');}
  catch(error){$('#attendanceCard').innerHTML=empty(error.message)}
}

async function refresh(){await bootstrap()}

$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();const msg=$('#loginMessage');message(msg,'正在登录…');try{await login($('#identifier').value.trim(),$('#token').value.trim());message(msg,'')}catch(error){message(msg,error.message,'error')}});
$('#logoutBtn').addEventListener('click',logout);
$('#nav').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b)switchView(b.dataset.view)});
document.addEventListener('click',e=>{const go=e.target.closest('[data-go]');if(go)switchView(go.dataset.go);const lesson=e.target.closest('[data-open-lesson]');if(lesson)openLesson(lesson.dataset.openLesson);const cls=e.target.closest('[data-open-class]');if(cls)openClass(cls.dataset.openClass);if(e.target.matches('[data-close]'))e.target.closest('dialog')?.close()});
$('#openLessonBtn').addEventListener('click',()=>{const id=$('#openLessonBtn').dataset.lessonId;if(id)openLesson(id)});
$('#attendanceSchedule').addEventListener('change',e=>loadAttendance(e.target.value));
$('#attendanceCard').addEventListener('click',async e=>{const status=e.target.closest('[data-status]');if(status){const row=status.closest('.student-row');$$('[data-status]',row).forEach(b=>b.classList.remove('active'));status.classList.add('active');return}if(e.target.id==='saveAttendance'){const scheduleId=$('#attendanceSchedule').value,items=$$('.student-row',$('#attendanceCard')).map(row=>({student_id:row.dataset.student,status:$('.status-buttons .active',row)?.dataset.status||'absent'}));const msg=$('#attendanceMessage');message(msg,'正在保存…');try{await api(`/api/sunday-school/attendance/${encodeURIComponent(scheduleId)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({items})});message(msg,'已保存','ok')}catch(error){message(msg,error.message,'error')}}});
$('#saveNoteBtn').addEventListener('click',async()=>{const s=state.currentSchedule;if(!s)return;const msg=$('#noteMessage');message(msg,'正在保存…');try{await api(`/api/sunday-school/notes/${encodeURIComponent(s.id)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({body:$('#teacherNote').value})});message(msg,'授课笔记已保存','ok')}catch(error){message(msg,error.message,'error')}});
$('#saveRecordBtn').addEventListener('click',async()=>{const s=state.currentSchedule;if(!s)return;const msg=$('#recordMessage');message(msg,'正在保存…');try{await api(`/api/sunday-school/records/${encodeURIComponent(s.id)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({progress:$('#recordProgress').value,response:$('#recordResponse').value,follow_up:$('#recordFollow').value,notes:$('#recordNotes').value})});message(msg,'教学记录已保存，其他老师现在也能看到。','ok');await refresh()}catch(error){message(msg,error.message,'error')}});

$('#lessonForm').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,msg=$('.message',form);message(msg,'正在保存…');try{const data=Object.fromEntries(new FormData(form));await api('/api/sunday-school/lessons',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});form.reset();message(msg,'课程已保存','ok');await refresh()}catch(error){message(msg,error.message,'error')}});
$('#scheduleForm').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,msg=$('.message',form);message(msg,'正在保存…');try{const data=Object.fromEntries(new FormData(form));await api('/api/sunday-school/schedule',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});form.reset();message(msg,'课表已更新','ok');await refresh()}catch(error){message(msg,error.message,'error')}});
$('#studentForm').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,msg=$('.message',form);message(msg,'正在添加…');try{const data=Object.fromEntries(new FormData(form));await api('/api/sunday-school/students',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});form.reset();message(msg,'学生已添加','ok');await refresh()}catch(error){message(msg,error.message,'error')}});
$('#teacherForm').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,msg=$('.message',form),box=$('#newTeacherKey');message(msg,'正在创建…');box.hidden=true;try{const data=Object.fromEntries(new FormData(form));const result=await api('/api/sunday-school/teachers',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});form.reset();message(msg,'老师账号已创建。下面的密钥只显示这一次，请交给老师本人。','ok');box.textContent=`个人访问密钥：${result.access_key}`;box.hidden=false;await refresh()}catch(error){message(msg,error.message,'error')}});

(async()=>{const savedToken=token(),savedId=localStorage.getItem(ID_KEY)||'';if(savedToken&&savedId){try{await login(savedId,savedToken)}catch{logout()}}})();
