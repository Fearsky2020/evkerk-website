const WR_ACTIVITY_KEY = 'learn-nl-activity-v1';
const WR_SENTENCE_FSRS = 'learn-nl-fsrs-cards-v1';
const WR_VOCAB_FSRS = 'learn-nl-fsrs-vocab-v1';
const WR_NOTEBOOK = 'learn-nl-notebook-v1';
const WR_DAILY_PREFIX = 'learn-nl-daily-plan-';

function wrJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch (_) { return fallback; }
}
function wrSave(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function wrDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function wrFromKey(key) {
  const [y,m,d] = key.split('-').map(Number);
  return new Date(y, m-1, d);
}
function wrShift(date, days) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  copy.setDate(copy.getDate() + days);
  return copy;
}
function wrWeekStart(base = new Date()) {
  const day = base.getDay();
  return wrShift(base, -(day === 0 ? 6 : day - 1));
}
function wrWeekKeys(base = new Date()) {
  const start = wrWeekStart(base);
  return Array.from({length:7}, (_,i) => wrDateKey(wrShift(start, i)));
}
function wrEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function wrWaitFor(selector, timeout = 6500) {
  const found = document.querySelector(selector);
  if (found) return Promise.resolve(found);
  return new Promise(resolve => {
    const observer = new MutationObserver(() => {
      const node = document.querySelector(selector);
      if (!node) return;
      observer.disconnect();
      resolve(node);
    });
    observer.observe(document.documentElement, {childList:true, subtree:true});
    setTimeout(() => {
      observer.disconnect();
      resolve(document.querySelector(selector));
    }, timeout);
  });
}
function wrReadActivity() {
  const data = wrJson(WR_ACTIVITY_KEY, {days:{}});
  if (!data || typeof data !== 'object') return {days:{}};
  if (!data.days || typeof data.days !== 'object') data.days = {};
  return data;
}
function wrPrune(data) {
  const cutoff = wrShift(new Date(), -120).getTime();
  Object.keys(data.days).forEach(key => {
    if (wrFromKey(key).getTime() < cutoff) delete data.days[key];
  });
  return data;
}
function wrDay(data, key = wrDateKey()) {
  if (!data.days[key]) data.days[key] = {active:false, sentenceReviews:0, vocabReviews:0, listening:false, shadowing:false, weeklyTasks:[]};
  return data.days[key];
}
function wrRecord(mutator) {
  const data = wrPrune(wrReadActivity());
  const day = wrDay(data);
  day.active = true;
  mutator?.(day);
  wrSave(WR_ACTIVITY_KEY, data);
  renderWeeklyReview();
}
function wrDateFromAny(value) {
  if (value == null) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
function wrFsrsDates(storageKey) {
  const cards = wrJson(storageKey, {});
  const dates = [];
  Object.values(cards || {}).forEach(card => {
    const date = wrDateFromAny(card?.last_review);
    if (date) dates.push(wrDateKey(date));
  });
  return dates;
}
function wrDailyPlanActive(key) {
  const state = wrJson(`${WR_DAILY_PREFIX}${key}`, {});
  return Boolean(state?.listening || state?.shadowing);
}
function wrActiveSet() {
  const data = wrReadActivity();
  const set = new Set(Object.entries(data.days).filter(([,day]) => day?.active).map(([key]) => key));
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key?.startsWith(WR_DAILY_PREFIX)) continue;
    const dateKey = key.slice(WR_DAILY_PREFIX.length);
    if (wrDailyPlanActive(dateKey)) set.add(dateKey);
  }
  wrFsrsDates(WR_SENTENCE_FSRS).forEach(key => set.add(key));
  wrFsrsDates(WR_VOCAB_FSRS).forEach(key => set.add(key));
  return set;
}
function wrActivityFor(keys) {
  const data = wrReadActivity();
  const wanted = new Set(keys);
  let sentenceReviews = 0;
  let vocabReviews = 0;
  keys.forEach(key => {
    const day = data.days[key];
    sentenceReviews += Number(day?.sentenceReviews || 0);
    vocabReviews += Number(day?.vocabReviews || 0);
  });
  const sentenceFallback = wrFsrsDates(WR_SENTENCE_FSRS).filter(key => wanted.has(key)).length;
  const vocabFallback = wrFsrsDates(WR_VOCAB_FSRS).filter(key => wanted.has(key)).length;
  return {
    sentenceReviews: Math.max(sentenceReviews, sentenceFallback),
    vocabReviews: Math.max(vocabReviews, vocabFallback)
  };
}
function wrStreak(activeSet) {
  const today = new Date();
  let cursor = today;
  if (!activeSet.has(wrDateKey(cursor))) {
    const yesterday = wrShift(today, -1);
    if (!activeSet.has(wrDateKey(yesterday))) return 0;
    cursor = yesterday;
  }
  let streak = 0;
  while (activeSet.has(wrDateKey(cursor)) && streak < 365) {
    streak += 1;
    cursor = wrShift(cursor, -1);
  }
  return streak;
}
function wrVocabSnapshot() {
  const words = wrJson(WR_NOTEBOOK, []);
  const cards = wrJson(WR_VOCAB_FSRS, {});
  const reviewed = Object.values(cards || {}).filter(card => Number(card?.reps || 0) > 0).length;
  const dueText = document.getElementById('loopVocabDue')?.textContent || '';
  const dueMatch = dueText.match(/\d+/);
  return {total:Array.isArray(words) ? words.length : 0, reviewed, due:dueMatch ? Number(dueMatch[0]) : null};
}
function wrSummary(days, sentenceReviews, vocabReviews) {
  if (days === 0) return '这周还没开始也没关系。今天做 5 分钟，就算正式开张。';
  if (days <= 2) return `这周已经学了 ${days} 天。先保持轻量，不急着加课程量。`;
  if (days <= 4) return `这周节奏挺稳：${days} 天有真实学习记录。继续优先清掉到期复习。`;
  if (days <= 6) return `这周已经很扎实了。句子 ${sentenceReviews} 条记录、生词 ${vocabReviews} 条记录，剩下时间可以少学新词。`;
  return '七天都有学习记录。今天完全可以只复习，不必为了“全勤”继续加码。';
}

function injectWeeklyReview() {
  if (document.getElementById('weeklyReview')) return document.getElementById('weeklyReview');
  const daily = document.getElementById('dailyPlan');
  if (!daily) return null;
  const section = document.createElement('section');
  section.className = 'weekly-review shell';
  section.id = 'weeklyReview';
  section.innerHTML = `
    <article class="weekly-review-card">
      <div class="weekly-review-head">
        <div><p class="eyebrow">DEZE WEEK · ZONDER DRUK</p><h2>这周学了多少，看一眼就行。</h2></div>
        <div class="weekly-review-streak" id="wrStreak"></div>
      </div>
      <p class="weekly-review-summary zh-help" id="wrSummary"></p>
      <div class="weekly-review-stats" id="wrStats"></div>
      <div class="weekly-days" id="wrDays" aria-label="本周学习天数"></div>
      <div class="weekly-review-prev zh-help" id="wrPrevious"></div>
    </article>`;
  daily.insertAdjacentElement('afterend', section);
  return section;
}

function renderWeeklyReview() {
  const section = document.getElementById('weeklyReview');
  if (!section) return;
  const currentKeys = wrWeekKeys();
  const prevKeys = wrWeekKeys(wrShift(wrWeekStart(), -1));
  const activeSet = wrActiveSet();
  const currentDays = currentKeys.filter(key => activeSet.has(key)).length;
  const prevDays = prevKeys.filter(key => activeSet.has(key)).length;
  const current = wrActivityFor(currentKeys);
  const previous = wrActivityFor(prevKeys);
  const vocab = wrVocabSnapshot();
  const streak = wrStreak(activeSet);
  const todayKey = wrDateKey();
  const labels = ['一','二','三','四','五','六','日'];

  const streakHost = document.getElementById('wrStreak');
  const summaryHost = document.getElementById('wrSummary');
  const statsHost = document.getElementById('wrStats');
  const daysHost = document.getElementById('wrDays');
  const previousHost = document.getElementById('wrPrevious');

  if (streakHost) streakHost.innerHTML = streak >= 2
    ? `<strong>${streak} 天</strong><span>最近连续 · 断一天也没关系</span>`
    : `<strong>${currentDays} / 7</strong><span>本周学习天数</span>`;
  if (summaryHost) summaryHost.textContent = wrSummary(currentDays, current.sentenceReviews, current.vocabReviews);
  if (statsHost) statsHost.innerHTML = `
    <div><strong>${currentDays}</strong><span>本周学习天</span></div>
    <div><strong>${current.sentenceReviews}</strong><span>句子复习记录</span></div>
    <div><strong>${current.vocabReviews}</strong><span>生词复习记录</span></div>
    <div><strong>${vocab.reviewed}/${vocab.total}</strong><span>生词已复习过</span></div>`;
  if (daysHost) daysHost.innerHTML = currentKeys.map((key,index) => {
    const active = activeSet.has(key);
    const future = wrFromKey(key).getTime() > wrFromKey(todayKey).getTime();
    const today = key === todayKey;
    return `<div class="weekly-day ${active?'active':''} ${future?'future':''} ${today?'today':''}"><span>${labels[index]}</span><b>${active?'✓':'·'}</b></div>`;
  }).join('');
  if (previousHost) previousHost.textContent = prevDays || previous.sentenceReviews || previous.vocabReviews
    ? `上周：学习 ${prevDays} 天 · 句子复习记录 ${previous.sentenceReviews} · 生词复习记录 ${previous.vocabReviews}。`
    : '上周还没有可用的学习记录；从这一版开始会慢慢积累。';
}

function wireWeeklyActivity() {
  document.addEventListener('click', event => {
    if (event.target.closest('[data-fsrs-rating]')) {
      wrRecord(day => { day.sentenceReviews = Number(day.sentenceReviews || 0) + 1; });
      return;
    }
    if (event.target.closest('[data-loop-rating]')) {
      wrRecord(day => { day.vocabReviews = Number(day.vocabReviews || 0) + 1; });
      return;
    }
    const toggle = event.target.closest('[data-dp-toggle]');
    if (toggle) {
      const key = toggle.dataset.dpToggle;
      setTimeout(() => {
        const state = wrJson(`${WR_DAILY_PREFIX}${wrDateKey()}`, {});
        if (!state?.[key]) return renderWeeklyReview();
        wrRecord(day => { if (key === 'listening') day.listening = true; if (key === 'shadowing') day.shadowing = true; });
      }, 0);
    }
  });

  document.addEventListener('change', event => {
    const task = event.target.closest?.('#weeklyTasks input[data-weekly-task]');
    if (!task || !task.checked) return;
    wrRecord(day => {
      if (!Array.isArray(day.weeklyTasks)) day.weeklyTasks = [];
      if (!day.weeklyTasks.includes(task.dataset.weeklyTask)) day.weeklyTasks.push(task.dataset.weeklyTask);
    });
  });
}

async function initWeeklyReview() {
  await wrWaitFor('#dailyPlan');
  const section = injectWeeklyReview();
  if (!section) return;
  const footer = document.querySelector('.learn-footer .zh-help');
  if (footer) footer.textContent = '为在荷兰生活的中文用户制作 · v0.8 preview';
  wireWeeklyActivity();

  await Promise.allSettled([
    wrWaitFor('#reviewDueCount'),
    wrWaitFor('#loopVocabDue'),
    wrWaitFor('#notebookCount')
  ]);
  ['reviewDueCount','loopVocabDue','notebookCount'].forEach(id => {
    const node = document.getElementById(id);
    if (node) new MutationObserver(renderWeeklyReview).observe(node, {childList:true, subtree:true});
  });
  addEventListener('storage', event => { if (event.key?.startsWith('learn-nl-')) renderWeeklyReview(); });
  renderWeeklyReview();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initWeeklyReview, {once:true});
else initWeeklyReview();
