const LP_LEVEL_KEY = 'learn-nl-level-v1';
const LP_DONE_KEY = 'learn-nl-first-lesson-v1';
const LP_LEVELS = {
  start: {label:'起步', cefr:'A0–A1', note:'先把短句听熟、敢开口。', recommend:'优先：超市、邻居寒暄、基础电话句。'},
  daily: {label:'日常', cefr:'A1–A2', note:'开始把两三个信息连成一句。', recommend:'优先：医生预约、市政府、完整短对话。'},
  natural: {label:'自然', cefr:'A2–B1', note:'少背孤立句，练解释、追问和补充信息。', recommend:'优先：完整对话、听力、Shadowing 和真实荷兰语。'}
};
function lpRead(key, fallback){ try{return JSON.parse(localStorage.getItem(key)) ?? fallback;}catch(_){return fallback;} }
function lpWrite(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function lpCurrent(){ const id=lpRead(LP_LEVEL_KEY,'daily'); return LP_LEVELS[id] ? id : 'daily'; }
function lpDebug(){ return new URLSearchParams(location.search).get('debug')==='1'; }
function lpInject(){
  if (!lpRead(LP_DONE_KEY,null) && !lpDebug()) return null;
  if (document.getElementById('levelPicker')) return document.getElementById('levelPicker');
  const actions=document.querySelector('.header-actions');
  if(!actions) return null;
  const wrap=document.createElement('div');
  wrap.className='level-picker'; wrap.id='levelPicker';
  actions.insertBefore(wrap, actions.firstChild);
  return wrap;
}
function lpRender(){
  const host=document.getElementById('levelPicker'); if(!host) return;
  const id=lpCurrent(), level=LP_LEVELS[id];
  host.innerHTML=`<button class="level-picker-trigger" type="button" aria-expanded="false" data-lp-open><span>难度</span><strong>${level.label}</strong><small>${level.cefr}</small></button><div class="level-picker-menu" hidden><div class="level-picker-copy"><strong>现在想学多难？</strong><span>不是考试，随时能换。</span></div>${Object.entries(LP_LEVELS).map(([key,item])=>`<button type="button" class="level-picker-option ${key===id?'active':''}" data-lp-level="${key}"><b>${item.label}</b><small>${item.cefr}</small><span>${item.note}</span></button>`).join('')}<div class="level-picker-recommend"><b>当前建议</b><span>${level.recommend}</span></div></div>`;
  document.documentElement.dataset.learnLevel=id;
}
function lpWire(host){
  host.addEventListener('click',event=>{
    const open=event.target.closest('[data-lp-open]');
    if(open){ const menu=host.querySelector('.level-picker-menu'); const next=menu.hidden; menu.hidden=!next; open.setAttribute('aria-expanded',String(next)); return; }
    const option=event.target.closest('[data-lp-level]');
    if(!option) return;
    lpWrite(LP_LEVEL_KEY,option.dataset.lpLevel);
    lpRender();
    dispatchEvent(new CustomEvent('learn-nl-level-change',{detail:{level:option.dataset.lpLevel}}));
  });
  document.addEventListener('click',event=>{ if(host.contains(event.target)) return; const menu=host.querySelector('.level-picker-menu'); const open=host.querySelector('[data-lp-open]'); if(menu){menu.hidden=true;} open?.setAttribute('aria-expanded','false'); });
}
function lpInit(){ const host=lpInject(); if(!host)return; lpRender(); lpWire(host); }
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',lpInit,{once:true});else lpInit();