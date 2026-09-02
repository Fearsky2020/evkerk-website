const WEEKLY_MISSION = {
  id: '2026-08-27-werken-in-nederland',
  checked: '2026-09-02',
  published: '2026-08-27',
  title: '27: Werken in Nederland',
  duration: '25:56',
  source: 'Easy Dutch Podcast',
  url: 'https://www.easydutch.fm/',
  summary: '这一期聊“在荷兰工作”：工作文化、最低工资和荷兰办公室里很快的午餐节奏。',
  tasks: [
    '先连续听 10 分钟，不暂停，不追每一个词。',
    '自己记下 3 个你真想在工作场景里用的表达。',
    '用荷兰语说一句自己的工作情况，例如：Ik werk bij… / Ik werk als…',
    '从本页挑一句做一次 Shadowing 跟读。'
  ],
  starterWords: [
    ['werken', '工作'],
    ['de baan', '工作 / 职位'],
    ['de collega', '同事'],
    ['het salaris', '工资 / 薪水'],
    ['de lunchpauze', '午休']
  ]
};

const NOTEBOOK_KEY = 'learn-nl-notebook-v1';
const WEEKLY_KEY = `learn-nl-weekly-${WEEKLY_MISSION.id}`;

function byId(id) { return document.getElementById(id); }
function safe(value) { return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
function speakNl(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'nl-NL';
  utterance.rate = 0.92;
  const voices = speechSynthesis.getVoices();
  utterance.voice = voices.find(v => /^nl(-|_)/i.test(v.lang)) || voices.find(v => /Dutch|Nederlands/i.test(v.name)) || null;
  speechSynthesis.speak(utterance);
}

function loadJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch (_) { return fallback; }
}
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

function injectWeeklySection() {
  if (byId('weeklyDutch')) return;
  const easy = byId('easyDutch');
  const future = document.querySelector('.future-section');
  const anchor = easy || future;
  if (!anchor) return;

  const section = document.createElement('section');
  section.className = 'weekly-section';
  section.id = 'weeklyDutch';
  section.innerHTML = `
    <div class="shell">
      <div class="weekly-heading">
        <div>
          <p class="eyebrow">DEZE WEEK · 0€</p>
          <h2>本周真实荷兰语</h2>
        </div>
        <p class="zh-help">不用付费课程。我们只挑公开可听/可看的真实荷兰语，再用自己的复习、跟读和笔记把它吃干净。</p>
      </div>

      <div class="weekly-grid">
        <article class="mission-card">
          <div class="mission-meta">
            <span>${safe(WEEKLY_MISSION.source)}</span>
            <span>${safe(WEEKLY_MISSION.published)}</span>
            <span>${safe(WEEKLY_MISSION.duration)}</span>
          </div>
          <h3>${safe(WEEKLY_MISSION.title)}</h3>
          <p class="zh-help">${safe(WEEKLY_MISSION.summary)}</p>
          <div class="mission-tasks" id="weeklyTasks"></div>
          <a class="btn primary weekly-open" href="${WEEKLY_MISSION.url}" target="_blank" rel="noopener">打开 Easy Dutch 免费 Podcast ↗</a>
          <p class="weekly-note zh-help">最后人工核对：${safe(WEEKLY_MISSION.checked)}。这里只链接免费公开节目；会员 transcript / vocab helper 不抓取、不复制。</p>
        </article>

        <article class="notebook-card" id="notebook">
          <div class="notebook-titleline">
            <div><p class="eyebrow">MIJN WOORDEN</p><h3>我的生词本</h3></div>
            <strong id="notebookCount">0</strong>
          </div>
          <p class="zh-help">只存在这台手机/电脑里。看到真正想用的词再收，不追求“收藏一万词”。</p>
          <form class="notebook-form" id="notebookForm">
            <input id="notebookNl" type="text" lang="nl" autocomplete="off" placeholder="荷兰语，例如：de collega" required>
            <input id="notebookZh" type="text" autocomplete="off" placeholder="中文意思，例如：同事" required>
            <button class="btn primary" type="submit">＋ 收进生词本</button>
          </form>
          <div class="starter-words">
            <span class="zh-help">本周词汇起点：</span>
            <div id="starterWords"></div>
          </div>
          <div class="notebook-list" id="notebookList"></div>
          <div class="notebook-review" id="notebookReview"></div>
        </article>
      </div>
    </div>`;

  if (easy && easy.parentNode) easy.insertAdjacentElement('afterend', section);
  else future.parentNode.insertBefore(section, future);
}

function initWeeklyTasks() {
  const host = byId('weeklyTasks');
  if (!host) return;
  const state = loadJson(WEEKLY_KEY, {});
  const render = () => {
    const done = WEEKLY_MISSION.tasks.filter((_, i) => state[i]).length;
    host.innerHTML = `
      <div class="task-progress"><strong>${done} / ${WEEKLY_MISSION.tasks.length}</strong><span>本周任务</span></div>
      ${WEEKLY_MISSION.tasks.map((task, i) => `
        <label class="weekly-task ${state[i] ? 'done' : ''}">
          <input type="checkbox" data-weekly-task="${i}" ${state[i] ? 'checked' : ''}>
          <span>${safe(task)}</span>
        </label>`).join('')}`;
  };
  host.addEventListener('change', event => {
    const input = event.target.closest('[data-weekly-task]');
    if (!input) return;
    state[input.dataset.weeklyTask] = input.checked;
    saveJson(WEEKLY_KEY, state);
    render();
  });
  render();
}

function initNotebook() {
  const form = byId('notebookForm');
  const list = byId('notebookList');
  const count = byId('notebookCount');
  const review = byId('notebookReview');
  const starter = byId('starterWords');
  if (!form || !list || !count || !review || !starter) return;

  let words = loadJson(NOTEBOOK_KEY, []);
  const persist = () => saveJson(NOTEBOOK_KEY, words);
  const addWord = (nl, zh) => {
    nl = nl.trim(); zh = zh.trim();
    if (!nl || !zh) return;
    const exists = words.some(item => item.nl.toLocaleLowerCase() === nl.toLocaleLowerCase());
    if (!exists) {
      words.unshift({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, nl, zh, addedAt: Date.now() });
      persist();
    }
    render();
  };

  const renderReview = () => {
    if (!words.length) {
      review.innerHTML = '<p class="zh-help">先收几个真正会用的词，这里就会出现“抽一个复习”。</p>';
      return;
    }
    review.innerHTML = '<button class="btn secondary" type="button" id="notebookDraw">🎲 抽一个复习</button><div id="notebookFlash"></div>';
    byId('notebookDraw').addEventListener('click', () => {
      const item = words[Math.floor(Math.random() * words.length)];
      byId('notebookFlash').innerHTML = `<div class="notebook-flash"><button type="button" data-nb-speak="${safe(item.nl)}">🔊</button><strong>${safe(item.nl)}</strong><span class="zh-help" data-nb-answer hidden>${safe(item.zh)}</span><button class="reveal-answer" type="button" data-nb-reveal>显示意思</button></div>`;
    });
  };

  const render = () => {
    count.textContent = words.length;
    list.innerHTML = words.length ? words.slice(0, 12).map(item => `
      <div class="notebook-item" data-nb-id="${safe(item.id)}">
        <button class="nb-speak" type="button" data-nb-speak="${safe(item.nl)}">🔊</button>
        <div><strong>${safe(item.nl)}</strong><span class="zh-help">${safe(item.zh)}</span></div>
        <button class="nb-delete" type="button" data-nb-delete aria-label="删除 ${safe(item.nl)}">×</button>
      </div>`).join('') : '<p class="notebook-empty zh-help">还没有生词。下面这 5 个工作主题词可以一键收进去。</p>';
    renderReview();
  };

  starter.innerHTML = WEEKLY_MISSION.starterWords.map(([nl, zh]) => `<button type="button" data-starter-nl="${safe(nl)}" data-starter-zh="${safe(zh)}">＋ ${safe(nl)}</button>`).join('');
  starter.addEventListener('click', event => {
    const button = event.target.closest('[data-starter-nl]');
    if (button) addWord(button.dataset.starterNl, button.dataset.starterZh);
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    addWord(byId('notebookNl').value, byId('notebookZh').value);
    form.reset();
    byId('notebookNl').focus();
  });

  list.addEventListener('click', event => {
    const speak = event.target.closest('[data-nb-speak]');
    if (speak) return speakNl(speak.dataset.nbSpeak);
    const remove = event.target.closest('[data-nb-delete]');
    if (!remove) return;
    const row = remove.closest('[data-nb-id]');
    words = words.filter(item => item.id !== row.dataset.nbId);
    persist(); render();
  });

  review.addEventListener('click', event => {
    const speak = event.target.closest('[data-nb-speak]');
    if (speak) return speakNl(speak.dataset.nbSpeak);
    const reveal = event.target.closest('[data-nb-reveal]');
    if (!reveal) return;
    const answer = review.querySelector('[data-nb-answer]');
    if (answer) answer.hidden = false;
    reveal.hidden = true;
  });

  render();
}

function init() {
  injectWeeklySection();
  initWeeklyTasks();
  initNotebook();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
