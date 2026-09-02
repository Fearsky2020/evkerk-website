const FL_DONE_KEY = 'learn-nl-first-lesson-v1';
const FL_REGISTER_KEY = 'learn-nl-register-nudge-v1';
const FL_LEVEL_KEY = 'learn-nl-level-v1';
const FL_MASTERED_KEY = 'learn-nl-mastered-v1';
const FL_SCENES_KEY = 'learn-nl-scenes-v1';

const FL_LEVELS = {
  start: {
    id: 'start', label: '起步', cefr: 'A0–A1', hint: '我刚开始，只会几个词',
    scene: 'supermarket', context: '在超市找不到东西时，这一句今天就能用。',
    phrase: 'Waar kan ik dit vinden?', zh: '我在哪里可以找到这个？',
    wrong: ['这个多少钱？', '我可以刷卡吗？']
  },
  daily: {
    id: 'daily', label: '日常', cefr: 'A1–A2', hint: '简单句看得懂，但开口还慢',
    scene: 'doctor', context: '预约时不只说“我要预约”，再自然地补一个时间偏好。',
    phrase: 'Ik wil graag een afspraak maken, het liefst in de ochtend.', zh: '我想预约，最好是在上午。',
    wrong: ['我今天早上已经预约过了。', '我想取消上午的预约。']
  },
  natural: {
    id: 'natural', label: '自然', cefr: 'A2–B1', hint: '日常能应付，想说得更完整自然',
    scene: 'gemeente', context: '办事时说明“之前联系过，但还不确定下一步”，非常实用。',
    phrase: 'Ik heb hier eerder over gebeld, maar ik weet niet zeker wat de volgende stap is.', zh: '我之前为这件事打过电话，但不太确定下一步该怎么做。',
    wrong: ['我下一次会提前打电话预约。', '我已经知道下一步该做什么了。']
  }
};

function flRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch (_) { return fallback; }
}
function flWrite(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function flDebug() { return new URLSearchParams(location.search).get('debug') === '1'; }
function flLevel(id) { return FL_LEVELS[id] || FL_LEVELS.start; }
function flSpeak(text, rate = 0.92) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'nl-NL';
  utterance.rate = rate;
  const voices = speechSynthesis.getVoices();
  utterance.voice = voices.find(v => /^nl(-|_)/i.test(v.lang)) || voices.find(v => /Dutch|Nederlands/i.test(v.name)) || null;
  speechSynthesis.speak(utterance);
}

function flSaveLessonProgress(level) {
  const phraseKey = `${level.scene}::${level.phrase}`;
  const mastered = flRead(FL_MASTERED_KEY, []);
  if (Array.isArray(mastered) && !mastered.includes(phraseKey)) mastered.push(phraseKey);
  flWrite(FL_MASTERED_KEY, Array.isArray(mastered) ? mastered : [phraseKey]);

  const scenes = flRead(FL_SCENES_KEY, []);
  const nextScenes = Array.isArray(scenes) ? scenes : [];
  if (!nextScenes.includes(level.scene)) nextScenes.push(level.scene);
  flWrite(FL_SCENES_KEY, nextScenes);
  flWrite(FL_LEVEL_KEY, level.id);
  flWrite(FL_DONE_KEY, { completedAt: new Date().toISOString(), phrase: level.phrase, level: level.id });
}

function flRegistrationMarkup(level) {
  return `
    <div class="first-register-card">
      <span class="first-complete-mark">✓</span>
      <p class="eyebrow">EERSTE LES KLAAR · ${level.label} ${level.cefr}</p>
      <h2>第一课完成。现在再决定要不要注册。</h2>
      <p class="first-register-lead">不注册也能继续学。以后注册的价值只有一个：把你的进度安全地带到别的手机和电脑。</p>
      <div class="first-register-benefits">
        <span>☁ 跨设备同步学习进度</span>
        <span>↻ 保留 FSRS 复习计划</span>
        <span>⇅ 难度以后随时能改</span>
      </div>
      <div class="first-register-actions">
        <button class="btn primary" type="button" data-fl-register>创建免费账号</button>
        <button class="btn secondary" type="button" data-fl-guest>先继续游客学习</button>
      </div>
      <p class="first-register-status zh-help" id="firstRegisterStatus">当前预览版还没有接账号后端；不会收集你的邮箱，也不会假装注册成功。</p>
    </div>`;
}

function flInject() {
  if (flDebug() || flRead(FL_DONE_KEY, null) || document.getElementById('firstLesson')) return null;
  const main = document.querySelector('main');
  if (!main) return null;

  document.body.classList.add('first-lesson-mode');
  const section = document.createElement('section');
  section.id = 'firstLesson';
  section.className = 'first-lesson shell';
  section.innerHTML = `
    <article class="first-lesson-card">
      <div class="first-lesson-top">
        <div>
          <p class="eyebrow">EERSTE LES · GEEN ACCOUNT</p>
          <h1>先选个舒服的难度，<span>马上开始。</span></h1>
          <p class="first-lesson-sub zh-help">不是考试，也不会把你锁死在这个等级。觉得太难或太简单，之后随时换。</p>
        </div>
        <div class="first-step-count"><strong id="firstStepCount">选择</strong><span>难度</span></div>
      </div>
      <div class="first-progress"><span id="firstProgressBar" style="width:0"></span></div>
      <div id="firstLessonStage"></div>
      <p class="first-privacy zh-help">不用注册。学习记录先保存在这台设备；第一课结束后再告诉你注册有什么用。</p>
    </article>`;
  main.insertBefore(section, main.firstChild);
  return section;
}

function flRenderLevelChoice(section) {
  const stage = section.querySelector('#firstLessonStage');
  const count = section.querySelector('#firstStepCount');
  const bar = section.querySelector('#firstProgressBar');
  if (!stage || !count || !bar) return;
  count.textContent = '选择';
  bar.style.width = '0%';
  stage.innerHTML = `
    <div class="first-level-step">
      <span class="first-step-label">你现在更像哪一种？</span>
      <div class="first-level-grid">
        ${Object.values(FL_LEVELS).map((level, index) => `
          <button type="button" class="first-level-option" data-fl-level="${level.id}">
            <span class="first-level-index">0${index + 1}</span>
            <strong>${level.label}</strong>
            <small>${level.cefr}</small>
            <p>${level.hint}</p>
          </button>`).join('')}
      </div>
      <p class="first-feedback zh-help">不知道选哪个？选「日常」也可以，学一课以后再调整。</p>
    </div>`;
}

function flRenderStep(section, step, level) {
  const stage = section.querySelector('#firstLessonStage');
  const count = section.querySelector('#firstStepCount');
  const bar = section.querySelector('#firstProgressBar');
  if (!stage || !count || !bar) return;
  count.textContent = `${Math.min(step, 3)} / 3`;
  bar.style.width = `${Math.min(step, 3) / 3 * 100}%`;

  if (step === 1) {
    stage.innerHTML = `
      <div class="first-step">
        <div class="first-level-chip"><b>${level.label}</b><span>${level.cefr}</span><button type="button" data-fl-change-level>换难度</button></div>
        <span class="first-step-label">① 先听</span>
        <p class="first-dutch">${level.phrase}</p>
        <p class="first-cn zh-help">${level.zh}</p>
        <p class="first-context zh-help">${level.context}</p>
        <div class="first-actions">
          <button class="btn primary" type="button" data-fl-speak="normal">▶ 听一遍</button>
          <button class="btn secondary" type="button" data-fl-speak="slow">🐢 慢一点</button>
          <button class="btn ghost" type="button" data-fl-next>听过了，下一步 →</button>
        </div>
      </div>`;
    return;
  }

  if (step === 2) {
    const answers = [level.wrong[0], level.zh, level.wrong[1]];
    stage.innerHTML = `
      <div class="first-step">
        <div class="first-level-chip"><b>${level.label}</b><span>${level.cefr}</span><button type="button" data-fl-change-level>换难度</button></div>
        <span class="first-step-label">② 认出来</span>
        <p class="first-question">这句话是什么意思？</p>
        <p class="first-question-nl">${level.phrase}</p>
        <div class="first-answers">
          ${answers.map(answer => `<button type="button" data-fl-answer="${answer === level.zh ? 'right' : 'wrong'}">${answer}</button>`).join('')}
        </div>
        <p class="first-feedback zh-help" id="firstFeedback">选一个就行，不考试。</p>
      </div>`;
    return;
  }

  stage.innerHTML = `
    <div class="first-step">
      <div class="first-level-chip"><b>${level.label}</b><span>${level.cefr}</span><button type="button" data-fl-change-level>换难度</button></div>
      <span class="first-step-label">③ 自己说</span>
      <p class="first-dutch">${level.phrase}</p>
      <p class="first-say-hint zh-help">点慢速，跟着说一遍。先练节奏和敢开口，不做假装很精确的 AI 发音评分。</p>
      <div class="first-actions">
        <button class="btn secondary" type="button" data-fl-speak="slow">🐢 跟着听</button>
        <button class="btn primary" type="button" data-fl-complete>我说过了，完成第一课 ✓</button>
      </div>
    </div>`;
}

function flFinish(section, level) {
  flSaveLessonProgress(level);
  const card = section.querySelector('.first-lesson-card');
  if (!card) return;
  card.innerHTML = flRegistrationMarkup(level);
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function flWire(section) {
  let step = 0;
  let level = flLevel(flRead(FL_LEVEL_KEY, null) || 'daily');
  flRenderLevelChoice(section);

  section.addEventListener('click', event => {
    const levelButton = event.target.closest('[data-fl-level]');
    if (levelButton) {
      level = flLevel(levelButton.dataset.flLevel);
      flWrite(FL_LEVEL_KEY, level.id);
      step = 1;
      flRenderStep(section, step, level);
      return;
    }

    if (event.target.closest('[data-fl-change-level]')) {
      step = 0;
      flRenderLevelChoice(section);
      return;
    }

    const speak = event.target.closest('[data-fl-speak]');
    if (speak) {
      flSpeak(level.phrase, speak.dataset.flSpeak === 'slow' ? 0.7 : 0.9);
      return;
    }

    if (event.target.closest('[data-fl-next]')) {
      step = 2;
      flRenderStep(section, step, level);
      return;
    }

    const answer = event.target.closest('[data-fl-answer]');
    if (answer) {
      const feedback = section.querySelector('#firstFeedback');
      if (answer.dataset.flAnswer === 'right') {
        section.querySelectorAll('[data-fl-answer]').forEach(btn => { btn.disabled = true; });
        answer.classList.add('correct');
        if (feedback) feedback.textContent = `✓ 对，就是“${level.zh}”`;
        setTimeout(() => { step = 3; flRenderStep(section, step, level); }, 450);
      } else {
        answer.classList.add('wrong');
        if (feedback) feedback.textContent = '再看一眼，没关系。';
      }
      return;
    }

    if (event.target.closest('[data-fl-complete]')) {
      flFinish(section, level);
      return;
    }

    if (event.target.closest('[data-fl-guest]')) {
      flWrite(FL_REGISTER_KEY, { choice: 'guest', at: new Date().toISOString(), level: level.id });
      location.reload();
      return;
    }

    if (event.target.closest('[data-fl-register]')) {
      flWrite(FL_REGISTER_KEY, { choice: 'register-intent', at: new Date().toISOString(), level: level.id });
      const status = section.querySelector('#firstRegisterStatus');
      if (status) status.textContent = '注册入口已经预留，但当前隔离预览还没有接认证后端。你的第一课和难度选择已保存在本机；现在可以先继续游客学习。';
      event.target.textContent = '注册入口待接入';
      event.target.disabled = true;
    }
  });
}

function initFirstLesson() {
  const section = flInject();
  if (section) flWire(section);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initFirstLesson, { once: true });
else initFirstLesson();
