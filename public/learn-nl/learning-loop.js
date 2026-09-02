const LOOP_NOTEBOOK_KEY = 'learn-nl-notebook-v1';
const LOOP_FSRS_KEY = 'learn-nl-fsrs-vocab-v1';

function loopRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch (_) { return fallback; }
}
function loopWrite(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function loopEsc(value) { return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function loopWords() { return loopRead(LOOP_NOTEBOOK_KEY, []); }
function loopWordExists(nl) { const q = String(nl).trim().toLocaleLowerCase('nl-NL'); return loopWords().some(item => String(item.nl).trim().toLocaleLowerCase('nl-NL') === q); }
function loopSpeak(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'nl-NL'; utterance.rate = 0.92;
  const voices = speechSynthesis.getVoices();
  utterance.voice = voices.find(v => /^nl(-|_)/i.test(v.lang)) || voices.find(v => /Dutch|Nederlands/i.test(v.name)) || null;
  speechSynthesis.speak(utterance);
}

function waitForLoop(selector, timeout = 6000) {
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

function addWordFallback(nl, zh) {
  const words = loopWords();
  if (words.some(item => String(item.nl).trim().toLocaleLowerCase('nl-NL') === nl.trim().toLocaleLowerCase('nl-NL'))) return false;
  words.unshift({id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, nl:nl.trim(), zh:zh.trim(), addedAt:Date.now(), source:'search'});
  loopWrite(LOOP_NOTEBOOK_KEY, words);
  return true;
}

function saveThroughNotebook(nl, zh, returnFocus) {
  if (!nl || !zh || loopWordExists(nl)) return false;
  const form = document.getElementById('notebookForm');
  const nlInput = document.getElementById('notebookNl');
  const zhInput = document.getElementById('notebookZh');
  if (!form || !nlInput || !zhInput) return addWordFallback(nl, zh);
  const y = window.scrollY;
  nlInput.value = nl; zhInput.value = zh;
  form.dispatchEvent(new Event('submit', {bubbles:true, cancelable:true}));
  requestAnimationFrame(() => {
    try { returnFocus?.focus({preventScroll:true}); } catch (_) { returnFocus?.focus?.(); }
    window.scrollTo(0, y);
  });
  return true;
}

function enhanceSearchResults(host) {
  const words = loopWords();
  const saved = new Set(words.map(item => String(item.nl).trim().toLocaleLowerCase('nl-NL')));
  host.querySelectorAll('.search-result[data-search-speak]').forEach(button => {
    let chip = button.querySelector('[data-loop-save]');
    if (!chip) {
      chip = document.createElement('span');
      chip.className = 'loop-save-chip';
      chip.dataset.loopSave = '1';
      chip.setAttribute('role', 'button'); chip.setAttribute('tabindex', '0');
      chip.setAttribute('aria-label', '收藏到我的生词本');
      button.appendChild(chip);
    }
    const isSaved = saved.has(String(button.dataset.searchSpeak).trim().toLocaleLowerCase('nl-NL'));
    chip.textContent = isSaved ? '✓ 已收藏' : '＋ 收藏';
    chip.classList.toggle('saved', isSaved);
    chip.setAttribute('aria-disabled', String(isSaved));
  });
}

async function initSearchToNotebook() {
  const host = await waitForLoop('#smartSearchResults');
  const searchInput = document.getElementById('smartSearchInput');
  if (!host) return;
  const saveFromTarget = target => {
    const chip = target.closest?.('[data-loop-save]');
    if (!chip) return false;
    const row = chip.closest('.search-result[data-search-speak]');
    if (!row) return true;
    const nl = row.dataset.searchSpeak || '';
    const zh = row.querySelector('.zh-help')?.textContent?.trim() || '';
    if (!loopWordExists(nl)) saveThroughNotebook(nl, zh, searchInput);
    enhanceSearchResults(host);
    return true;
  };
  host.addEventListener('click', event => {
    if (!event.target.closest('[data-loop-save]')) return;
    event.preventDefault(); event.stopPropagation();
    saveFromTarget(event.target);
  }, true);
  host.addEventListener('keydown', event => {
    if (!event.target.closest('[data-loop-save]') || !['Enter',' '].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation(); saveFromTarget(event.target);
  }, true);
  const observer = new MutationObserver(() => enhanceSearchResults(host));
  observer.observe(host, {childList:true, subtree:true});
  enhanceSearchResults(host);
}

function serializeLoopCard(card) {
  return {...card, due:card.due instanceof Date ? card.due.getTime() : card.due, last_review:card.last_review instanceof Date ? card.last_review.getTime() : (card.last_review ?? null)};
}
function loopWhen(dateInput) {
  const date = new Date(dateInput); const ms = date.getTime() - Date.now();
  if (ms <= 60000) return '很快';
  const minutes = Math.round(ms / 60000); if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.round(ms / 3600000); if (hours < 24) return `${hours} 小时`;
  const days = Math.round(ms / 86400000); if (days <= 30) return `${days} 天`;
  return date.toLocaleDateString('zh-CN', {month:'short', day:'numeric'});
}

async function initNotebookFsrs() {
  const reviewTool = await waitForLoop('.review-tool');
  if (!reviewTool || document.getElementById('loopVocabReview')) return;
  const stage = document.createElement('div');
  stage.className = 'loop-review-wrap';
  stage.innerHTML = `
    <div class="loop-review-head"><span>MIJN WOORDEN · FSRS</span><strong id="loopVocabDue">—</strong></div>
    <p class="loop-review-note zh-help">从搜索或生词本收藏的内容会自动进入这里，和课程复习使用同样的 FSRS 记忆调度。</p>
    <div id="loopVocabReview" class="loop-review-stage"><p class="zh-help">正在读取生词复习…</p></div>`;
  reviewTool.appendChild(stage);
  const host = document.getElementById('loopVocabReview');
  const count = document.getElementById('loopVocabDue');
  try {
    const mod = await import('https://cdn.jsdelivr.net/npm/ts-fsrs@5.4.1/+esm');
    const scheduler = mod.fsrs({request_retention:0.9, maximum_interval:3650, enable_fuzz:true, enable_short_term:true});
    const {Rating, createEmptyCard} = mod;
    let cards = loopRead(LOOP_FSRS_KEY, {});
    let current = null;
    const getId = word => `notebook::${word.id}`;
    const getCard = word => cards[getId(word)] || serializeLoopCard(createEmptyCard(new Date()));
    const cleanup = () => {
      const valid = new Set(loopWords().map(getId)); let changed = false;
      Object.keys(cards).forEach(id => { if (!valid.has(id)) { delete cards[id]; changed = true; } });
      if (changed) loopWrite(LOOP_FSRS_KEY, cards);
    };
    const dueWords = () => loopWords().filter(word => new Date(getCard(word).due).getTime() <= Date.now());
    const render = () => {
      cleanup();
      const due = dueWords(); current = due[0] || null;
      count.textContent = `${due.length} 条`;
      if (!current) {
        host.innerHTML = loopWords().length ? '<div class="loop-review-done"><strong>生词也复习完了 ✓</strong><p class="zh-help">到时间以后它们会自己回来。</p></div>' : '<p class="zh-help">先从搜索结果点“＋ 收藏”，这里就会开始安排复习。</p>';
        return;
      }
      const card = getCard(current); const preview = scheduler.repeat(card, new Date());
      const ratings = [[Rating.Again,'忘了'],[Rating.Hard,'有点难'],[Rating.Good,'记得'],[Rating.Easy,'太简单']];
      host.innerHTML = `
        <div class="loop-review-word"><button type="button" data-loop-speak="${loopEsc(current.nl)}">🔊</button><div><strong>${loopEsc(current.nl)}</strong><span class="zh-help">${loopEsc(current.zh)}</span></div></div>
        <div class="loop-rating-grid">${ratings.map(([rating,label]) => `<button type="button" data-loop-rating="${rating}"><strong>${label}</strong><small>${loopWhen(preview[rating].card.due)}后</small></button>`).join('')}</div>`;
    };
    host.addEventListener('click', event => {
      const speak = event.target.closest('[data-loop-speak]'); if (speak) return loopSpeak(speak.dataset.loopSpeak);
      const ratingButton = event.target.closest('[data-loop-rating]'); if (!ratingButton || !current) return;
      const rating = Number(ratingButton.dataset.loopRating);
      const result = scheduler.next(getCard(current), new Date(), rating);
      cards[getId(current)] = serializeLoopCard(result.card);
      loopWrite(LOOP_FSRS_KEY, cards); render();
    });
    const notebook = await waitForLoop('#notebookList');
    if (notebook) new MutationObserver(() => { cards = loopRead(LOOP_FSRS_KEY, {}); render(); }).observe(notebook, {childList:true, subtree:true});
    render();
  } catch (error) {
    console.warn('Notebook FSRS unavailable.', error);
    count.textContent = '离线'; host.innerHTML = '<p class="zh-help">生词 FSRS 暂时没有加载成功；生词本本身仍可正常使用。</p>';
  }
}

function loadLoopStyles() {
  if (document.querySelector('link[data-learning-loop]')) return;
  const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = './learning-loop.css?v=1'; link.dataset.learningLoop = '1'; document.head.appendChild(link);
}

async function initLearningLoop() {
  loadLoopStyles();
  await Promise.allSettled([initSearchToNotebook(), initNotebookFsrs()]);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initLearningLoop, {once:true});
else initLearningLoop();
