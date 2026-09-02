const BACKUP_VERSION = 1;
const BACKUP_PREFIX = 'learn-nl-';
const EXTRA_KEYS = new Set(['evkerk-theme']);

function q(id){ return document.getElementById(id); }
function allowedKey(key){ return key.startsWith(BACKUP_PREFIX) || EXTRA_KEYS.has(key); }

function collectProgress(){
  const data = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && allowedKey(key)) data[key] = localStorage.getItem(key);
  }
  return {
    product: 'evkerk-learn-nl',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data
  };
}

function downloadBackup(){
  const payload = JSON.stringify(collectProgress(), null, 2);
  const blob = new Blob([payload], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const day = new Date().toISOString().slice(0,10);
  a.href = url;
  a.download = `nederlands-leren-backup-${day}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function restoreBackup(file){
  const text = await file.text();
  const payload = JSON.parse(text);
  if (payload?.product !== 'evkerk-learn-nl' || typeof payload.data !== 'object') throw new Error('不是本学习工具的备份文件');
  let count = 0;
  Object.entries(payload.data).forEach(([key,value]) => {
    if (!allowedKey(key) || typeof value !== 'string') return;
    localStorage.setItem(key, value);
    count += 1;
  });
  return count;
}

function downloadBackup(){
  const payload = JSON.stringify(collectProgress(), null, 2);
  const blob = new Blob([payload], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const day = new Date().toISOString().slice(0,10);
  a.href = url;
  a.download = `nederlands-leren-backup-${day}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function restoreBackup(file){
  const text = await file.text();
  const payload = JSON.parse(text);
  if (payload?.product !== 'evkerk-learn-nl' || typeof payload.data !== 'object') throw new Error('不是本学习工具的备份文件');
  let count = 0;
  Object.entries(payload.data).forEach(([key,value]) => {
    if (!allowedKey(key) || typeof value !== 'string') return;
    localStorage.setItem(key, value);
    count += 1;
  });
  return count;
}

function injectPortable(){
  if (q('portableTools')) return;
  const future = document.querySelector('.future-section');
  if (!future) return;
  const section = document.createElement('section');
  section.className = 'portable-section';
  section.id = 'portableTools';
  section.innerHTML = `
    <div class="shell">
      <article class="portable-card">
        <div class="portable-head">
          <div><p class="eyebrow">ZONDER ACCOUNT · 0€</p><h2>不注册，也别丢学习进度。</h2></div>
          <p class="zh-help">先把“账号同步”这个花钱又复杂的东西绕过去：学习记录留在本机，需要换设备时导出一个备份文件，再在新设备恢复。</p>
        </div>
        <div class="portable-grid">
          <div class="portable-box">
            <h3>📦 学习进度备份</h3>
            <p class="zh-help">包含生词本、FSRS 复习、听力/测验成绩、本周任务和页面偏好；不包含麦克风录音，也不会上传服务器。</p>
            <div class="portable-actions">
              <button class="btn primary" id="exportProgress" type="button">导出备份</button>
              <label class="btn secondary portable-import">恢复备份<input id="importProgress" type="file" accept="application/json,.json"></label>
            </div>
            <div class="portable-status" id="backupStatus">数据仍只在这台设备里。</div>
          </div>
          <div class="portable-box">
            <h3>📱 像 App 一样打开</h3>
            <p class="zh-help">核心课程会缓存到浏览器。安装到桌面以后入口更顺手；第一次加载智能组件和 Easy Dutch 仍需要联网。</p>
            <div class="portable-actions"><button class="btn primary" id="installLearnNl" type="button" hidden>安装到设备</button></div>
            <div class="portable-status"><span class="portable-dot" id="networkDot"></span><span id="networkText"></span></div>
            <div class="install-tip zh-help" id="installTip">iPhone / iPad：Safari 分享按钮 →“添加到主屏幕”。Android / 桌面 Chrome：可使用浏览器的“安装应用”。</div>
          </div>
        </div>
      </article>
    </div>`;
  future.parentNode.insertBefore(section, future);
}

function initBackup(){
  const exportButton = q('exportProgress');
  const importInput = q('importProgress');
  const status = q('backupStatus');
  exportButton?.addEventListener('click', () => {
    downloadBackup();
    if (status) status.textContent = '备份已生成。把这个 JSON 留好，换设备时可以恢复。';
  });
  importInput?.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    try {
      const count = await restoreBackup(file);
      if (status) status.textContent = `已恢复 ${count} 项学习数据。页面将刷新。`;
      setTimeout(() => location.reload(), 700);
    } catch (error) {
      if (status) status.textContent = `恢复失败：${error.message}`;
    } finally {
      importInput.value = '';
    }
  });
}

function initNetwork(){
  const dot = q('networkDot');
  const text = q('networkText');
  const render = () => {
    const online = navigator.onLine;
    dot?.classList.toggle('online', online);
    dot?.classList.toggle('offline', !online);
    if (text) text.textContent = online ? '当前在线 · 会更新缓存' : '当前离线 · 使用已缓存的核心课程';
  };
  addEventListener('online', render);
  addEventListener('offline', render);
  render();
}

function initInstall(){
  const button = q('installLearnNl');
  let promptEvent = null;
  addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    promptEvent = event;
    if (button) button.hidden = false;
  });
  button?.addEventListener('click', async () => {
    if (!promptEvent) return;
    promptEvent.prompt();
    await promptEvent.userChoice;
    promptEvent = null;
    button.hidden = true;
  });
  addEventListener('appinstalled', () => { if (button) button.hidden = true; });
}

async function initServiceWorker(){
  if (!('serviceWorker' in navigator)) return;
  try { await navigator.serviceWorker.register('./sw.js', {scope:'./'}); }
  catch (error) { console.warn('Learn NL service worker unavailable.', error); }
}

function loadOptionalLayer(cssHref, marker, moduleHref, label){
  if (!document.querySelector(`link[${marker}]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssHref;
    link.setAttribute(marker, '1');
    document.head.appendChild(link);
  }
  import(moduleHref).catch(error => console.warn(`${label} unavailable.`, error));
}

function initFirstLessonLayer(){
  loadOptionalLayer('./first-lesson.css?v=1', 'data-first-lesson', './first-lesson.js?v=1', 'First lesson onboarding');
}

function initOpenTaalLayer(){
  loadOptionalLayer('./opentaal-spell.css?v=1', 'data-opentaal-spell', './opentaal-spell.js?v=1', 'OpenTaal spelling layer');
}

function markVersion(){
  const footer = document.querySelector('.learn-footer .zh-help');
  if (footer) footer.textContent = '为在荷兰生活的中文用户制作 · v0.10 preview';
}

function init(){
  initFirstLessonLayer();
  injectPortable();
  initBackup();
  initNetwork();
  initInstall();
  initServiceWorker();
  initOpenTaalLayer();
  markVersion();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
else init();