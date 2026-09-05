(()=>{
const TOKEN_KEY='evkerk_teacher_token';
const $=(s,r=document)=>r.querySelector(s);const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let me=null,current={kind:'lesson',id:'',pages:[],index:0,canEdit:false,lesson:null,music:[]},lastScheduleId='';
function token(){return localStorage.getItem(TOKEN_KEY)||''}
async function api(path,options={}){const r=await fetch(path,{...options,headers:{authorization:`Bearer ${token()}`,...(options.headers||{})}});const d=await r.json().catch(()=>({ok:false,error:'服务器返回异常'}));if(!r.ok)throw new Error(d.error||'操作失败');return d}
function addCss(){if(document.querySelector('link[data-course-studio]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='/team/course-studio.css?v=1';l.dataset.courseStudio='1';document.head.append(l)}
function toast(el,text,ok=false){if(!el)return;el.textContent=text;el.className=`studio-msg ${ok?'ok':''}`}
async function loadMe(){try{const d=await api('/api/sunday-school/dashboard');me=d.user||null}catch{me=null}}
function isAdminEdit(){return me?.kind==='admin'&&['owner','editor'].includes(me.role)}
function isOwner(){return me?.kind==='admin'&&me.role==='owner'}

async function loadMusic(){try{const d=await api('/api/sunday-school/content/music');current.music=d.music||[]}catch{current.music=[]}}
function musicOptions(selected=''){return `<option value="">不选音乐</option>${current.music.map(m=>`<option value="${esc(m.id)}" ${m.id===selected?'selected':''}>${esc(m.title)}</option>`).join('')}`}
function pageLabel(type){return({cover:'封面',scripture:'经文',teaching:'讲解',question:'问题',image:'图片',music:'音乐',summary:'总结',prayer:'祷告'})[type]||'页面'}
function previewHtml(p){
  if(!p)return '<div class="deck-empty">还没有页面。</div>';
  const music=p.music_title||current.music.find(m=>m.id===p.music_id)?.title||'';
  const audio=p.audio_url||current.music.find(m=>m.id===p.music_id)?.audio_url||'';
  return `<article class="slide slide-${esc(p.page_type)}"><div class="slide-kicker">${esc(pageLabel(p.page_type))}</div><h2>${esc(p.title||'')}</h2>${p.scripture?`<div class="slide-scripture">${esc(p.scripture)}</div>`:''}${p.media_url?`<img class="slide-image" src="${esc(p.media_url)}" alt="">`:''}<div class="slide-body">${esc(p.body||'').replace(/\n/g,'<br>')}</div>${music?`<div class="slide-music"><strong>♪ ${esc(music)}</strong>${audio?`<audio controls preload="none" src="${esc(audio)}"></audio>`:''}</div>`:''}</article>`;
}
function renderDeck(){
  const host=$('#dialogContent');if(!host)return;const p=current.pages[current.index];
  host.innerHTML=`<div class="deck-layout"><aside class="deck-thumbs">${current.pages.map((x,i)=>`<button class="deck-thumb ${i===current.index?'active':''}" data-deck-index="${i}"><span>${i+1}</span><b>${esc(x.title||pageLabel(x.page_type))}</b></button>`).join('')}${current.canEdit?`<button class="deck-add" data-deck-add>＋ 添加页面</button>`:''}</aside><section class="deck-stage">${previewHtml(p)}<div class="deck-nav"><button data-deck-prev ${current.index<=0?'disabled':''}>←</button><span>${current.pages.length?current.index+1:0} / ${current.pages.length}</span><button data-deck-next ${current.index>=current.pages.length-1?'disabled':''}>→</button></div>${current.canEdit&&p?`<div class="deck-edit-actions"><button data-page-edit>编辑本页</button><button data-page-up ${current.index===0?'disabled':''}>上移</button><button data-page-down ${current.index===current.pages.length-1?'disabled':''}>下移</button><button class="danger" data-page-delete>删除</button></div>`:''}</section></div>`;
}
async function openStandardDeck(lessonId){
  if(!lessonId)return;await loadMusic();const d=await api(`/api/sunday-school/content/lessons/${encodeURIComponent(lessonId)}/deck`);current={kind:'lesson',id:lessonId,pages:d.pages||[],index:0,canEdit:isAdminEdit(),lesson:d.lesson,music:current.music};$('#dialogTitle').textContent=d.lesson?.title||'课程';$('#dialogScripture').textContent=d.lesson?.scripture||'标准课程';renderDeck();
}
async function openScheduleDeck(scheduleId){
  if(!scheduleId)return;await loadMusic();const d=await api(`/api/sunday-school/content/schedule/${encodeURIComponent(scheduleId)}/deck`);current={kind:'schedule',id:scheduleId,pages:d.pages||[],index:0,canEdit:Boolean(d.can_edit),lesson:{title:d.schedule?.lesson_title,scripture:d.schedule?.scripture},music:current.music};$('#dialogTitle').textContent=d.schedule?.lesson_title||'本次授课';$('#dialogScripture').textContent=d.is_copy?'本次授课版本':'标准课程 · 修改后会自动建立本次授课副本';renderDeck();
}
function pageForm(page={}){
  let dlg=$('#pageEditorDialog');if(!dlg){dlg=document.createElement('dialog');dlg.id='pageEditorDialog';dlg.innerHTML='<form method="dialog" class="studio-editor" id="pageEditorForm"><div class="studio-editor-head"><h2>编辑页面</h2><button value="cancel" class="close">×</button></div><label>页面类型<select name="page_type"><option value="cover">封面</option><option value="scripture">经文</option><option value="teaching">讲解</option><option value="question">问题</option><option value="image">图片</option><option value="music">音乐</option><option value="summary">总结</option><option value="prayer">祷告</option></select></label><label>标题<input name="title"></label><label>经文<textarea name="scripture" rows="3"></textarea></label><label>正文<textarea name="body" rows="8"></textarea></label><label>图片网址<input name="media_url" placeholder="可留空"></label><label>音乐<select name="music_id"></select></label><div class="studio-actions"><button type="button" class="primary" id="pageEditorSave">保存页面</button><span class="studio-msg" id="pageEditorMsg"></span></div></form>';document.body.append(dlg)}
  const f=$('#pageEditorForm');f.elements.page_type.value=page.page_type||'teaching';f.elements.title.value=page.title||'';f.elements.scripture.value=page.scripture||'';f.elements.body.value=page.body||'';f.elements.media_url.value=page.media_url||'';f.elements.music_id.innerHTML=musicOptions(page.music_id||'');f.dataset.pageId=page.id||'';dlg.showModal();
}
async function savePage(){const f=$('#pageEditorForm'),msg=$('#pageEditorMsg'),data=Object.fromEntries(new FormData(f));toast(msg,'正在保存…');try{const pageId=f.dataset.pageId;let path;if(current.kind==='lesson')path=`/api/sunday-school/content/lessons/${encodeURIComponent(current.id)}/pages${pageId?'/'+encodeURIComponent(pageId):''}`;else path=`/api/sunday-school/content/schedule/${encodeURIComponent(current.id)}/pages${pageId?'/'+encodeURIComponent(pageId):''}`;await api(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});$('#pageEditorDialog').close();current.kind==='lesson'?await openStandardDeck(current.id):await openScheduleDeck(current.id);if(!pageId)current.index=current.pages.length-1;renderDeck()}catch(e){toast(msg,e.message)}}
async function removePage(){const p=current.pages[current.index];if(!p||!confirm('删除这一页？模板不会受影响。'))return;const path=current.kind==='lesson'?`/api/sunday-school/content/lessons/${encodeURIComponent(current.id)}/pages/${encodeURIComponent(p.id)}`:`/api/sunday-school/content/schedule/${encodeURIComponent(current.id)}/pages/${encodeURIComponent(p.id)}`;try{await api(path,{method:'DELETE'});current.kind==='lesson'?await openStandardDeck(current.id):await openScheduleDeck(current.id)}catch(e){alert(e.message)}}
async function movePage(delta){const ni=current.index+delta;if(ni<0||ni>=current.pages.length)return;const copy=[...current.pages];[copy[current.index],copy[ni]]=[copy[ni],copy[current.index]];const path=current.kind==='lesson'?`/api/sunday-school/content/lessons/${encodeURIComponent(current.id)}/reorder`:`/api/sunday-school/content/schedule/${encodeURIComponent(current.id)}/reorder`;try{await api(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({page_ids:copy.map(p=>p.id)})});current.pages=copy;current.index=ni;renderDeck()}catch(e){alert(e.message)}}

function injectManage(){
  const grid=$('.manage-grid');if(!grid||grid.dataset.studioInjected)return;grid.dataset.studioInjected='1';
  if(isOwner())grid.insertAdjacentHTML('afterbegin',`<form class="card studio-ai-card" id="aiCourseForm"><p class="eyebrow">未来主流程</p><h2>AI 生成课程草稿</h2><p class="muted">司南或小光负责生成；这里只进入待审核，不会自动发布。</p><label>经文范围<input name="scripture" required placeholder="例如：民数记 9–12章"></label><label>课程标题（可留空）<input name="title"></label><label>年龄 / 班级<input name="audience" value="青少年 14–18岁"></label><label>课时（分钟）<input name="duration_minutes" type="number" min="15" max="120" value="45"></label><label>本课重点<textarea name="focus" rows="3" placeholder="例如：顺服、等候神"></textarea></label><label>执行器<select name="executor"><option value="sinan">司南</option><option value="xiaoguang">小光</option></select></label><button class="primary" type="submit">生成课程草稿</button><p class="studio-msg"></p></form><section class="card studio-review"><div class="studio-section-head"><div><p class="eyebrow">只给负责人</p><h2>AI 待审核</h2></div><button type="button" id="refreshAi">刷新</button></div><div id="aiRequestList" class="studio-request-list"><p class="muted">正在读取…</p></div></section>`);
  grid.insertAdjacentHTML('beforeend',`<form class="card" id="musicForm"><p class="eyebrow">课程素材</p><h2>添加音乐</h2><label>歌曲名称<input name="title" required></label><label>音频网址<input name="audio_url" placeholder="以后也可接网站媒体上传"></label><label>歌词<textarea name="lyrics" rows="5"></textarea></label><button class="primary" type="submit">保存到音乐库</button><p class="studio-msg"></p></form>`);
  bindManage();if(isOwner())loadAiRequests();
}
function statusLabel(s){return({pending_executor:'等待 AI',generating:'正在生成',ready_for_review:'等待审核',approved:'已批准',rejected:'已退回',failed:'生成失败'})[s]||s}
async function loadAiRequests(){const box=$('#aiRequestList');if(!box)return;try{const d=await api('/api/sunday-school/ai/requests');const rs=d.requests||[];box.innerHTML=rs.length?rs.map(r=>`<article class="studio-request"><div><strong>${esc(r.title||r.scripture)}</strong><p>${esc(r.scripture)} · ${esc(r.executor)} · ${esc(statusLabel(r.status))}</p>${r.error?`<p class="error">${esc(r.error)}</p>`:''}</div><div class="studio-request-actions">${r.lesson_id?`<button type="button" data-ai-open="${esc(r.lesson_id)}">预览</button>`:''}${r.status==='ready_for_review'?`<button type="button" class="primary" data-ai-approve="${esc(r.id)}">批准发布</button><button type="button" data-ai-reject="${esc(r.id)}">退回</button>`:''}</div></article>`).join(''):'<p class="muted">目前没有 AI 课程任务。</p>'}catch(e){box.innerHTML=`<p class="error">${esc(e.message)}</p>`}}
function bindManage(){
  $('#aiCourseForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,m=$('.studio-msg',f);toast(m,'正在提交给生成队列…');try{await api('/api/sunday-school/ai/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(f)))});toast(m,'已进入生成队列。司南 / 小光取走任务后会回传待审核课程。',true);await loadAiRequests()}catch(err){toast(m,err.message)}});
  $('#musicForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,m=$('.studio-msg',f);toast(m,'正在保存…');try{await api('/api/sunday-school/content/music',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(f)))});f.reset();toast(m,'已加入音乐库',true);await loadMusic()}catch(err){toast(m,err.message)}});
  $('#refreshAi')?.addEventListener('click',loadAiRequests);
  $('#aiRequestList')?.addEventListener('click',async e=>{const open=e.target.closest('[data-ai-open]');if(open){$('#lessonDialog').showModal();await openStandardDeck(open.dataset.aiOpen);return}const approve=e.target.closest('[data-ai-approve]');if(approve){if(!confirm('审核通过并发布为标准课程？'))return;await api(`/api/sunday-school/ai/requests/${encodeURIComponent(approve.dataset.aiApprove)}/approve`,{method:'POST'});await loadAiRequests();return}const reject=e.target.closest('[data-ai-reject]');if(reject){const notes=prompt('退回原因（可留空）')||'';await api(`/api/sunday-school/ai/requests/${encodeURIComponent(reject.dataset.aiReject)}/reject`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({notes})});await loadAiRequests()}});
}

document.addEventListener('click',e=>{
  const cls=e.target.closest('[data-open-class]');if(cls)lastScheduleId=cls.dataset.openClass||'';
  const lesson=e.target.closest('[data-open-lesson]');if(lesson)setTimeout(()=>openStandardDeck(lesson.dataset.openLesson).catch(()=>{}),0);
  if(e.target.id==='openLessonBtn'&&lastScheduleId)setTimeout(()=>openScheduleDeck(lastScheduleId).catch(()=>{}),0);
  const idx=e.target.closest('[data-deck-index]');if(idx){current.index=Number(idx.dataset.deckIndex)||0;renderDeck()}
  if(e.target.closest('[data-deck-prev]')){current.index=Math.max(0,current.index-1);renderDeck()}
  if(e.target.closest('[data-deck-next]')){current.index=Math.min(current.pages.length-1,current.index+1);renderDeck()}
  if(e.target.closest('[data-deck-add]'))pageForm({page_type:'teaching'});
  if(e.target.closest('[data-page-edit]'))pageForm(current.pages[current.index]||{});
  if(e.target.closest('[data-page-delete]'))removePage();if(e.target.closest('[data-page-up]'))movePage(-1);if(e.target.closest('[data-page-down]'))movePage(1);
});
document.addEventListener('click',e=>{if(e.target.id==='pageEditorSave')savePage()});

async function boot(){addCss();if(!token())return;await loadMe();const timer=setInterval(()=>{if($('#appView')&&!$('#appView').hidden){injectManage();clearInterval(timer)}},250);setTimeout(()=>clearInterval(timer),10000)}
window.addEventListener('storage',()=>location.reload());boot();
})();
