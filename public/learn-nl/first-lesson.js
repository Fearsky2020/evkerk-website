const FL_DONE_KEY = 'learn-nl-first-lesson-v1';
const FL_REGISTER_KEY = 'learn-nl-register-nudge-v1';
const FL_MASTERED_KEY = 'learn-nl-mastered-v1';
const FL_SCENES_KEY = 'learn-nl-scenes-v1';
const FL_PHRASE_KEY = 'supermarket::Waar kan ik dit vinden?';

function flRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch (_) { return fallback; }
}
function flWrite(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function flDebug() { return new URLSearchParams(location.search).get('debug') === '1'; }
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

function flSaveLessonProgress() {
  const mastered = flRead(FL_MASTERED_KEY, []);
  if (Array.isArray(mastered) && !mastered.includes(FL_PHRASE_KEY)) mastered.push(FL_PHRASE_KEY);
  flWrite(FL_MASTERED_KEY, Array.isArray(mastered) ? mastered : [FL_PHRASE_KEY]);

  const scenes = flRead(FL_SCENES_KEY, []);
  const nextScenes = Array.isArray(scenes) ? scenes : [];
  if (!nextScenes.includes('supermarket')) nextScenes.push('supermarket');
  flWrite(FL_SCENES_KEY, nextScenes);

  flWrite(FL_DONE_KEY, { completedAt: new Date().toISOString(), phrase: 'Waar kan ik dit vinden?' });
}

function flRegistrationMarkup() {
  return `
    <div class="first-register-card">
      <span class="first-complete-mark">✓</span>
      <p class="eyebrow">EERSTE LES KLAAR</p>
      <h2>第一课完成。现在再决定要不要注册。</h2>
      <p class="first-register-lead">不注册也能继续学。以后注册的价值只有一个：把你的进度安全地带到别的手机和电脑。</p>
      <div class="first-register-benefits">
        <span>☁ 跨设备同步学习进度</span>
        <span>↻ 保留 FSRS 复习计划</span>
        <span>📱 手机、电脑接着学</span>
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
          <p class="eyebrow">EERSTE LES · 2 MINUTEN</p>
          <h1>先学一句，<span>不用注册。</span></h1>
          <p class="first-lesson-sub zh-help">在超市找不到东西时，这一句今天就能用。</p>
        </div>
        <div class="first-step-count"><strong id="firstStepCount">1 / 3</strong><span>第一课</span></div>
      </div>
      <div class="first-progress"><span id="firstProgressBar"></span></div>
      <div id="firstLessonStage"></div>
      <p class="first-privacy zh-help">学习记录先保存在这台设备。第一课结束后再告诉你注册有什么用。</p>
    </article>`;
  main.insertBefore(section, main.firstChild);
  return section;
}

function flRenderStep(section, step) {
  const stage = section.querySelector('#firstLessonStage');
  const count = section.querySelector('#firstStepCount');
  const bar = section.querySelector('#firstProgressBar');
  if (!stage || !count || !bar) return;
  count.textContent = `${Math.min(step, 3)} / 3`;
  bar.style.width = `${Math.min(step, 3) / 3 * 100}%`;

  if (step === 1) {
    stage.innerHTML = `
      <div class="first-step">
        <span class="first-step-label">① 先听</span>
        <p class="first-dutch">Waar kan ik dit vinden?</p>
        <p class="first-cn zh-help">我在哪里可以找到这个？</p>
        <div class="first-actions">
          <button class="btn primary" type="button" data-fl-speak="normal">▶ 听一遍</button>
          <button class="btn secondary" type="button" data-fl-speak="slow">🐢 慢一点</button>
          <button class="btn ghost" type="button" data-fl-next>听过了，下一步 →</button>
        </div>
      </div>`;
    return;
  }

  if (step === 2) {
    stage.innerHTML = `
      <div class="first-step">
        <span class="first-step-label">② 认出来</span>
        <p class="first-question">“Waar kan ik dit vinden?” 是什么意思？</p>
        <div class="first-answers">
          <button type="button" data-fl-answer="wrong">这个多少钱？</button>
          <button type="button" data-fl-answer="right">我在哪里可以找到这个？</button>
          <button type="button" data-fl-answer="wrong">我可以刷卡吗？</button>
        </div>
        <p class="first-feedback zh-help" id="firstFeedback">选一个就行，不考试。</p>
      </div>`;
    return;
  }

  stage.innerHTML = `
    <div class="first-step">
      <span class="first-step-label">③ 自己说</span>
      <p class="first-dutch">Waar kan ik dit vinden?</p>
      <p class="first-say-hint zh-help">点慢速，跟着说一遍。现在先练敢开口，不做假装很精确的 AI 发音评分。</p>
      <div class="first-actions">
        <button class="btn secondary" type="button" data-fl-speak="slow">🐢 跟着听</button>
        <button class="btn primary" type="button" data-fl-complete>我说过了，完成第一课 ✓</button>
      </div>
    </div>`;
}

function flFinish(section) {
  flSaveLessonProgress();
  const card = section.querySelector('.first-lesson-card');
  if (!card) return;
  card.innerHTML = flRegistrationMarkup();
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function flWire(section) {
  let step = 1;
  flRenderStep(section, step);
  section.addEventListener('click', event => {
    const speak = event.target.closest('[data-fl-speak]');
    if (speak) {
      flSpeak('Waar kan ik dit vinden?', speak.dataset.flSpeak === 'slow' ? 0.72 : 0.92);
      return;
    }

    if (event.target.closest('[data-fl-next]')) {
      step = 2;
      flRenderStep(section, step);
      return;
    }

    const answer = event.target.closest('[data-fl-answer]');
    if (answer) {
      const feedback = section.querySelector('#firstFeedback');
      if (answer.dataset.flAnswer === 'right') {
        section.querySelectorAll('[data-fl-answer]').forEach(btn => { btn.disabled = true; });
        answer.classList.add('correct');
        if (feedback) feedback.textContent = '✓ 对，就是“我在哪里可以找到这个？”';
        setTimeout(() => { step = 3; flRenderStep(section, step); }, 450);
      } else {
        answer.classList.add('wrong');
        if (feedback) feedback.textContent = '再看一眼，没关系。';
      }
      return;
    }

    if (event.target.closest('[data-fl-complete]')) {
      flFinish(section);
      return;
    }

    if (event.target.closest('[data-fl-guest]')) {
      flWrite(FL_REGISTER_KEY, { choice: 'guest', at: new Date().toISOString() });
      location.reload();
      return;
    }

    if (event.target.closest('[data-fl-register]')) {
      flWrite(FL_REGISTER_KEY, { choice: 'register-intent', at: new Date().toISOString() });
      const status = section.querySelector('#firstRegisterStatus');
      if (status) status.textContent = '注册入口已经预留，但当前隔离预览还没有接认证后端。你的第一课已保存在本机；现在可以先继续游客学习。';
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
