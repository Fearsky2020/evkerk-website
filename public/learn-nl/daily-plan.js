const DAILY_STATE_PREFIX = 'learn-nl-daily-plan-';

function dpToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
function dpRead() {
  try { return JSON.parse(localStorage.getItem(`${DAILY_STATE_PREFIX}${dpToday()}`)) || {}; }
  catch (_) { return {}; }
}
function dpWrite(state) { localStorage.setItem(`${DAILY_STATE_PREFIX}${dpToday()}`, JSON.stringify(state)); }
function dpEscape(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function dpCount(id) {
  const text = document.getElementById(id)?.textContent || '';
  const match = text.match(/\d+/);
  return match ? Number(match[0]) : null;
}
function dpGo(selector) {
  const target = document.querySelector(selector);
  if (target) target.scrollIntoView({behavior:'smooth', block:'start'});
}
function dpWaitFor(selector, timeout = 6500) {
  const found = document.querySelector(selector);
  if (found) return Promise.resolve(found);
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

function injectDailyPlan() {
  if (document.getElementById('dailyPlan')) return document.getElementById('dailyPlan');
  const progress = document.getElementById('progress');
  if (!progress) return null;
  const section = document.createElement('section');
  section.className = 'daily-plan shell';
  section.id = 'dailyPlan';
  section.innerHTML = `
    <article class="daily-plan-card">
      <div class="daily-plan-head">
        <div><p class="eyebrow">VANDAAG · 5–10 MINUTEN</p><h2>今天不用选，照着做就行。</h2></div>
        <div class="daily-plan-score"><strong id="dailyPlanDone">0 / 4</strong><span>核心任务</span></div>
      </div>
      <p class="daily-plan-intro zh-help">计划直接读取你现有的 FSRS、听力、跟读和本周任务状态；它不另造一套学习记录。</p>
      <div class="daily-plan-list" id="dailyPlanList"></div>
      <div class="daily-plan-bonus" id="dailyPlanBonus"></div>
    </article>`;
  progress.insertAdjacentElement('afterend', section);
  return section;
}

function weeklySnapshot() {
  const inputs = [...document.querySelectorAll('#weeklyTasks input[data-weekly-task]')];
  if (!inputs.length) return {total:0, done:0, next:''};
  const done = inputs.filter(input => input.checked).length;
  const next = inputs.find(input => !input.checked)?.closest('label')?.querySelector('span')?.textContent?.trim() || '';
  return {total:inputs.length, done, next};
}

function renderDailyPlan() {
  const list = document.getElementById('dailyPlanList');
  const bonus = document.getElementById('dailyPlanBonus');
  const score = document.getElementById('dailyPlanDone');
  if (!list || !bonus || !score) return;

  const state = dpRead();
  const sentenceDue = dpCount('reviewDueCount');
  const vocabDue = dpCount('loopVocabDue');
  const weekly = weeklySnapshot();

  const sentenceDone = sentenceDue === 0;
  const vocabDone = vocabDue === 0;
  const listeningDone = Boolean(state.listening);
  const shadowDone = Boolean(state.shadowing);
  const doneCount = [sentenceDone, vocabDone, listeningDone, shadowDone].filter(Boolean).length;
  score.textContent = `${doneCount} / 4`;

  const items = [
    {
      key:'sentences', icon:'①', done:sentenceDone,
      title: sentenceDue == null ? '复习到期句子' : sentenceDue ? `复习 ${sentenceDue} 条到期句子` : '到期句子已经清空',
      note: sentenceDue ? '约 2 分钟 · 先回忆，再点“忘了 / 难 / 记得 / 简单”。' : 'FSRS 暂时没有更多句子催你。',
      action: sentenceDue ? '去复习' : '已完成', target:'#smartTools'
    },
    {
      key:'vocab', icon:'②', done:vocabDone,
      title: vocabDue == null ? '复习到期生词' : vocabDue ? `复习 ${vocabDue} 个到期生词` : '到期生词已经清空',
      note: vocabDue ? '约 2 分钟 · 只复习你自己真正收藏过的词。' : '没有到期生词，今天不用硬背。',
      action: vocabDue ? '去复习' : '已完成', target:'#loopVocabReview'
    },
    {
      key:'listening', icon:'③', done:listeningDone,
      title:'做一轮 5 题听力', note:'约 3 分钟 · 先听完整句，再看答案。', action:listeningDone?'今天做过了':'去听力', target:'#listening', manual:true
    },
    {
      key:'shadowing', icon:'④', done:shadowDone,
      title:'跟读 1 句并回听自己', note:'约 2 分钟 · 不评分，先比较节奏、停顿和重音。', action:shadowDone?'今天做过了':'去跟读', target:'#shadowing', manual:true
    }
  ];

  list.innerHTML = items.map(item => `
    <div class="daily-plan-item ${item.done?'done':''}" data-dp-key="${item.key}">
      <span class="daily-plan-num">${item.done?'✓':item.icon}</span>
      <div class="daily-plan-copy"><strong>${dpEscape(item.title)}</strong><span class="zh-help">${dpEscape(item.note)}</span></div>
      <div class="daily-plan-actions">
        <button type="button" data-dp-go="${dpEscape(item.target)}" ${item.done && !item.manual ? 'disabled' : ''}>${dpEscape(item.action)}</button>
        ${item.manual ? `<button class="daily-done-toggle" type="button" data-dp-toggle="${item.key}">${item.done?'撤销':'✓ 完成'}</button>` : ''}
      </div>
    </div>`).join('');

  if (!weekly.total) {
    bonus.innerHTML = '<span>＋ 本周真实荷兰语</span><p class="zh-help">本周任务加载后，这里会自动显示下一项。</p>';
  } else if (weekly.done >= weekly.total) {
    bonus.innerHTML = '<span>★ 本周加餐</span><strong>本周真实荷兰语任务已经全部完成 ✓</strong>';
  } else {
    bonus.innerHTML = `<span>★ 有空再加一项，不算今天的硬指标</span><strong>${dpEscape(weekly.next)}</strong><button type="button" data-dp-go="#weeklyDutch">打开本周任务</button>`;
  }
}

async function initDailyPlan() {
  const section = injectDailyPlan();
  if (!section) return;
  const footer = document.querySelector('.learn-footer .zh-help');
  if (footer) footer.textContent = '为在荷兰生活的中文用户制作 · v0.7 preview';

  section.addEventListener('click', event => {
    const go = event.target.closest('[data-dp-go]');
    if (go && !go.disabled) dpGo(go.dataset.dpGo);
    const toggle = event.target.closest('[data-dp-toggle]');
    if (!toggle) return;
    const state = dpRead();
    state[toggle.dataset.dpToggle] = !state[toggle.dataset.dpToggle];
    dpWrite(state); renderDailyPlan();
  });

  await Promise.allSettled([
    dpWaitFor('#reviewDueCount'),
    dpWaitFor('#loopVocabDue'),
    dpWaitFor('#weeklyTasks')
  ]);

  ['#reviewDueCount','#loopVocabDue','#weeklyTasks'].forEach(selector => {
    const node = document.querySelector(selector);
    if (node) new MutationObserver(renderDailyPlan).observe(node, {childList:true, subtree:true, attributes:true, attributeFilter:['checked']});
  });
  document.getElementById('weeklyTasks')?.addEventListener('change', () => setTimeout(renderDailyPlan, 0));
  renderDailyPlan();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initDailyPlan, {once:true});
else initDailyPlan();
