const SC_DEBUG_KEY = 'learn-nl-debug';
const SC_RUNTIME_ERRORS = [];

function scDebugEnabled(){
  const params = new URLSearchParams(location.search);
  try { return params.get('debug') === '1' || localStorage.getItem(SC_DEBUG_KEY) === '1'; }
  catch (_) { return params.get('debug') === '1'; }
}
function scEscape(value){ return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function scWaitFor(selector, timeout = 8000){
  const found = document.querySelector(selector); if (found) return Promise.resolve(found);
  return new Promise(resolve => {
    const observer = new MutationObserver(() => {
      const node = document.querySelector(selector);
      if (!node) return;
      observer.disconnect(); resolve(node);
    });
    observer.observe(document.documentElement, {childList:true, subtree:true});
    setTimeout(() => { observer.disconnect(); resolve(document.querySelector(selector)); }, timeout);
  });
}
function scResult(name, status, detail){ return {name,status,detail}; }
function scDom(name, selector){
  const node = document.querySelector(selector);
  return scResult(name, node ? 'pass' : 'fail', node ? selector : `缺少 ${selector}`);
}
function scText(name, selector, pattern){
  const node = document.querySelector(selector);
  if (!node) return scResult(name,'fail',`缺少 ${selector}`);
  const text = node.textContent.trim();
  return scResult(name, pattern.test(text) ? 'pass' : 'warn', text || '没有可读状态');
}
function scLocalStorage(){
  const key = 'learn-nl-self-check-temp';
  try { localStorage.setItem(key,'ok'); const ok = localStorage.getItem(key) === 'ok'; localStorage.removeItem(key); return scResult('本地学习存储', ok?'pass':'fail', ok?'localStorage 可读写':'写入后读取失败'); }
  catch (error) { return scResult('本地学习存储','fail',error.message); }
}
function scLearningLevel(){
  try {
    const value = JSON.parse(localStorage.getItem('learn-nl-level-v1') || '"daily"');
    const ok = ['start','daily','natural'].includes(value);
    return scResult('学习难度状态', ok?'pass':'warn', ok?`当前 ${value}`:`未知等级 ${String(value)}`);
  } catch (error) { return scResult('学习难度状态','warn',error.message); }
}
async function scServiceWorker(){
  if (!('serviceWorker' in navigator)) return scResult('PWA Service Worker','warn','当前浏览器不支持 Service Worker');
  try {
    const registration = await navigator.serviceWorker.getRegistration('./');
    if (!registration) return scResult('PWA Service Worker','warn','支持 Service Worker，但当前还没有完成注册；首次加载可刷新后再测');
    return scResult('PWA Service Worker','pass', registration.active ? '已注册且 active' : '已注册，正在安装/激活');
  } catch (error) { return scResult('PWA Service Worker','warn',error.message); }
}
async function scCoreAssets(){
  const assets = ['./app.js?v=1','./practice.js?v=2','./smart-tools.js?v=1','./weekly-practice.js?v=1','./portable.js?v=1','./opentaal-spell.js?v=1','./learning-loop.js?v=1','./daily-plan.js?v=1','./weekly-review.js?v=1','./self-check.js?v=1','./first-lesson.js?v=2','./level-picker.js?v=1'];
  const failed = [];
  await Promise.all(assets.map(async path => {
    try { const response = await fetch(path,{cache:'no-store'}); if (!response.ok) failed.push(`${path} ${response.status}`); }
    catch (error) { failed.push(`${path} ${error.message}`); }
  }));
  return failed.length ? scResult('核心脚本可读取','fail',failed.join('；')) : scResult('核心脚本可读取','pass',`${assets.length} 个脚本均返回成功`);
}
async function scRun(){
  await Promise.allSettled([
    scWaitFor('#smartSearchResults'), scWaitFor('#reviewDueCount'), scWaitFor('#notebookForm'),
    scWaitFor('#loopVocabReview'), scWaitFor('#dailyPlan'), scWaitFor('#weeklyReview'), scWaitFor('#levelPicker')
  ]);
  const results = [
    scDom('基础课程','#sceneGrid'),
    scDom('智能搜索','#smartSearchInput'),
    scDom('搜索结果','#smartSearchResults .search-result'),
    scText('句子 FSRS','#reviewDueCount',/\d+|离线/),
    scDom('Shadowing','#shadowing'),
    scDom('Easy Dutch','#easyDutchPlayer'),
    scDom('生词本','#notebookForm'),
    scText('生词 FSRS','#loopVocabDue',/\d+|离线/),
    scDom('今日计划','#dailyPlan'),
    scDom('每周复盘','#weeklyReview'),
    scDom('难度切换器','#levelPicker'),
    scLearningLevel(),
    scDom('PWA Manifest','link[rel="manifest"]'),
    scLocalStorage(),
    await scServiceWorker(),
    await scCoreAssets()
  ];
  if (SC_RUNTIME_ERRORS.length) results.push(scResult('运行时错误','fail',SC_RUNTIME_ERRORS.slice(-5).join('；')));
  else results.push(scResult('运行时错误','pass','当前页面未捕获到 error / unhandledrejection'));
  return results;
}
function scInject(){
  if (!scDebugEnabled() || document.getElementById('selfCheckPanel')) return null;
  const panel = document.createElement('aside');
  panel.id = 'selfCheckPanel'; panel.className = 'self-check-panel';
  panel.innerHTML = `<div class="self-check-head"><div><strong>Learn NL 自检</strong><span>v0.11 debug</span></div><button type="button" data-sc-close>×</button></div><div class="self-check-summary" id="scSummary">准备检查…</div><div class="self-check-list" id="scList"></div><div class="self-check-actions"><button type="button" data-sc-run>重新检查</button><button type="button" data-sc-copy>复制结果</button><button type="button" data-sc-disable>关闭调试</button></div>`;
  document.body.appendChild(panel);
  panel.addEventListener('click', async event => {
    if (event.target.closest('[data-sc-close]')) panel.remove();
    if (event.target.closest('[data-sc-run]')) await scRender(panel);
    if (event.target.closest('[data-sc-copy]')) {
      const text = panel.dataset.report || '';
      try { await navigator.clipboard.writeText(text); event.target.textContent='已复制'; setTimeout(()=>event.target.textContent='复制结果',1000); } catch (_) {}
    }
    if (event.target.closest('[data-sc-disable]')) {
      try { localStorage.removeItem(SC_DEBUG_KEY); } catch (_) {}
      panel.remove();
    }
  });
  return panel;
}
async function scRender(panel = document.getElementById('selfCheckPanel')){
  if (!panel) return;
  const list = panel.querySelector('#scList'); const summary = panel.querySelector('#scSummary');
  summary.textContent = '检查中…'; list.innerHTML = '';
  const results = await scRun();
  const pass = results.filter(x=>x.status==='pass').length;
  const warn = results.filter(x=>x.status==='warn').length;
  const fail = results.filter(x=>x.status==='fail').length;
  summary.innerHTML = `<strong>${pass} 通过</strong><span>${warn} 提醒</span><b>${fail} 失败</b>`;
  list.innerHTML = results.map(item => `<div class="self-check-item ${item.status}"><span>${item.status==='pass'?'✓':item.status==='warn'?'!':'×'}</span><div><strong>${scEscape(item.name)}</strong><small>${scEscape(item.detail)}</small></div></div>`).join('');
  panel.dataset.report = [`Learn NL self-check ${new Date().toISOString()}`, ...results.map(x=>`[${x.status.toUpperCase()}] ${x.name}: ${x.detail}`)].join('\n');
}
function scMarkVersion(){ const footer=document.querySelector('.learn-footer .zh-help'); if(footer)footer.textContent='为在荷兰生活的中文用户制作 · v0.11 preview'; }

addEventListener('error', event => { if (event?.message) SC_RUNTIME_ERRORS.push(event.message); });
addEventListener('unhandledrejection', event => { SC_RUNTIME_ERRORS.push(event?.reason?.message || String(event?.reason || 'Unhandled rejection')); });

async function initSelfCheck(){
  scMarkVersion();
  window.learnNlSelfCheck = async () => {
    try { localStorage.setItem(SC_DEBUG_KEY,'1'); } catch (_) {}
    const panel = scInject() || document.getElementById('selfCheckPanel');
    await scRender(panel);
    return panel?.dataset.report || '';
  };
  if (!scDebugEnabled()) return;
  const panel = scInject();
  await scRender(panel);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initSelfCheck,{once:true});else initSelfCheck();