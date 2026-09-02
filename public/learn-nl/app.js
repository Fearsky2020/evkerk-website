(() => {
  const scenes = [
    {
      id: 'supermarket', icon: '🛒', label: '在超市', nl: 'Boodschappen', intro: '先学问位置、价格和结账时最常见的句子。',
      vocab: [['de kassa','收银台'],['de aanbieding','特价 / 优惠'],['de tas','袋子'],['contant','现金'],['pinnen','刷卡 / 借记卡支付']],
      phrases: [
        ['Waar kan ik dit vinden?','我在哪里可以找到这个？'],
        ['Hoeveel kost dit?','这个多少钱？'],
        ['Heeft u dit ook in een andere maat?','这个有其他尺寸吗？'],
        ['Mag ik een tasje?','可以给我一个袋子吗？'],
        ['Kan ik pinnen?','我可以刷卡吗？']
      ]
    },
    {
      id: 'doctor', icon: '🩺', label: '看医生', nl: 'Bij de huisarts', intro: '预约、描述症状和确认下一步，是最值得先练熟的三件事。',
      vocab: [['de afspraak','预约'],['de klacht','症状 / 不适'],['de pijn','疼痛'],['het recept','处方'],['de apotheek','药房']],
      phrases: [
        ['Ik wil graag een afspraak maken.','我想预约一下。'],
        ['Ik heb sinds gisteren pijn.','我从昨天开始疼。'],
        ['Ik voel me niet goed.','我感觉不舒服。'],
        ['Moet ik medicijnen gebruiken?','我需要用药吗？'],
        ['Wanneer moet ik terugkomen?','我什么时候需要再来？']
      ]
    },
    {
      id: 'gemeente', icon: '🏛️', label: '市政府', nl: 'Bij de gemeente', intro: '办证件、预约和询问信息时，先把这些句子说顺。',
      vocab: [['de gemeente','市政府'],['de afspraak','预约'],['het formulier','表格'],['het paspoort','护照'],['de inschrijving','登记 / 注册']],
      phrases: [
        ['Ik heb een afspraak om tien uur.','我十点有一个预约。'],
        ['Waar moet ik me melden?','我应该在哪里报到？'],
        ['Welke documenten heb ik nodig?','我需要哪些文件？'],
        ['Kunt u mij hiermee helpen?','您能帮我处理这个吗？'],
        ['Wanneer is het klaar?','什么时候可以办好？']
      ]
    },
    {
      id: 'neighbors', icon: '👋', label: '邻居寒暄', nl: 'Met de buren', intro: '荷兰日常社交不需要复杂，先会自然地打招呼和接一句话。',
      vocab: [['de buurman','男邻居'],['de buurvrouw','女邻居'],['gezellig','愉快 / 有氛围'],['het weekend','周末'],['het weer','天气']],
      phrases: [
        ['Goedemorgen! Alles goed?','早上好！都好吗？'],
        ['Hoe was je weekend?','你周末过得怎么样？'],
        ['Lekker weer vandaag, hè?','今天天气不错，是吧？'],
        ['Fijne dag nog!','祝你今天接下来愉快！'],
        ['Tot ziens!','再见！']
      ]
    },
    {
      id: 'phone', icon: '📞', label: '打电话', nl: 'Aan de telefoon', intro: '电话最难的是没有表情和手势，所以固定句型特别有用。',
      vocab: [['bellen','打电话'],['doorverbinden','转接电话'],['bereikbaar','可以联系到'],['het nummer','号码'],['een momentje','稍等一下']],
      phrases: [
        ['Goedemorgen, u spreekt met Wang.','早上好，我是 Wang。'],
        ['Ik bel voor een afspraak.','我打电话是为了预约。'],
        ['Kunt u dat herhalen, alstublieft?','您可以再说一遍吗？'],
        ['Kunt u iets langzamer spreken?','您可以说慢一点吗？'],
        ['Dank u wel voor uw hulp.','谢谢您的帮助。']
      ]
    }
  ];

  const dailySentences = [
    ['Goedemorgen! Hoe gaat het?','早上好！你好吗？','非常常用的日常问候。熟人之间也常直接说 “Alles goed?”'],
    ['Kunt u dat herhalen, alstublieft?','您可以再说一遍吗？','听不懂时最实用的一句。礼貌、自然，而且几乎任何场景都能用。'],
    ['Ik wil graag een afspraak maken.','我想预约一下。','“Ik wil graag …” 比直接说 “Ik wil …” 更柔和、自然。'],
    ['Waar kan ik dit vinden?','我在哪里可以找到这个？','在超市、商店、车站都能套用，只要把 “dit” 换成具体东西。'],
    ['Kunt u mij hiermee helpen?','您能帮我处理这个吗？','这是非常万能的求助句，在市政府、银行、柜台都好用。'],
    ['Kunt u iets langzamer spreken?','您可以说慢一点吗？','比只说 “Langzamer!” 礼貌很多，也更适合初学者。'],
    ['Fijne dag nog!','祝你今天接下来愉快！','荷兰人结账、办完事、结束简短聊天时很常说。'],
    ['Hoeveel kost dit?','这个多少钱？','最基础也最实用的购物句。'],
    ['Waar moet ik me melden?','我应该在哪里报到？','去医院、市政府、学校或活动现场时都很常见。'],
    ['Dank u wel voor uw hulp.','谢谢您的帮助。','正式场景用 “u”，熟人之间可以说 “Dank je wel”。']
  ];

  const STORAGE = {
    mastered: 'learn-nl-mastered-v1',
    best: 'learn-nl-quiz-best-v1',
    scenes: 'learn-nl-scenes-v1',
    assist: 'learn-nl-assist',
    theme: 'evkerk-theme'
  };

  const state = {
    sceneId: 'supermarket',
    mastered: new Set(readJson(STORAGE.mastered, [])),
    visited: new Set(readJson(STORAGE.scenes, ['supermarket'])),
    quiz: null
  };

  const $ = (id) => document.getElementById(id);
  const sceneGrid = $('sceneGrid');
  const phraseList = $('phraseList');
  const vocabList = $('vocabList');
  const themeToggle = $('themeToggle');
  const assistToggle = $('assistToggle');

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return Array.isArray(value) ? value : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function saveSet(key, set) {
    localStorage.setItem(key, JSON.stringify([...set]));
  }

  function phraseKey(sceneId, dutch) {
    return `${sceneId}::${dutch}`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  }

  function speak(text, rate = 0.96) {
    if (!('speechSynthesis' in window)) {
      alert('当前浏览器不支持语音播放。可以换用最新版 Chrome、Edge 或 Safari。');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'nl-NL';
    utterance.rate = rate;
    utterance.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const nlVoice = voices.find(v => /^nl(-|_)/i.test(v.lang)) || voices.find(v => /Dutch|Nederlands/i.test(v.name));
    if (nlVoice) utterance.voice = nlVoice;
    window.speechSynthesis.speak(utterance);
  }

  function speakSequence(items) {
    if (!('speechSynthesis' in window)) return speak(items[0] || '');
    window.speechSynthesis.cancel();
    const voices = window.speechSynthesis.getVoices();
    const nlVoice = voices.find(v => /^nl(-|_)/i.test(v.lang)) || voices.find(v => /Dutch|Nederlands/i.test(v.name));
    items.forEach((text, index) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'nl-NL';
      utterance.rate = 0.88;
      if (nlVoice) utterance.voice = nlVoice;
      if (index < items.length - 1) utterance.onend = () => {};
      window.speechSynthesis.speak(utterance);
    });
  }

  function renderScenes() {
    sceneGrid.innerHTML = scenes.map(scene => `
      <button class="scene-card ${scene.id === state.sceneId ? 'active' : ''}" type="button" data-scene="${scene.id}" aria-pressed="${scene.id === state.sceneId}">
        <span class="scene-icon" aria-hidden="true">${scene.icon}</span>
        <span class="arrow" aria-hidden="true">↗</span>
        <h3>${escapeHtml(scene.label)}</h3>
        <p>${escapeHtml(scene.nl)}</p>
      </button>`).join('');
  }

  function renderLesson() {
    const scene = scenes.find(item => item.id === state.sceneId) || scenes[0];
    $('lessonEyebrow').textContent = scene.nl.toUpperCase();
    $('lessonTitle').textContent = scene.label;
    $('lessonIntro').textContent = scene.intro;

    phraseList.innerHTML = scene.phrases.map(([dutch, chinese]) => {
      const key = phraseKey(scene.id, dutch);
      const mastered = state.mastered.has(key);
      return `
        <article class="phrase-row ${mastered ? 'is-mastered' : ''}" data-key="${escapeHtml(key)}">
          <div>
            <p class="phrase-dutch">${escapeHtml(dutch)}</p>
            <p class="phrase-cn zh-help">${escapeHtml(chinese)}</p>
          </div>
          <div class="phrase-actions">
            <button class="round-action speak" type="button" data-speak="${escapeHtml(dutch)}" aria-label="播放：${escapeHtml(dutch)}">🔊</button>
            <button class="round-action master ${mastered ? 'active' : ''}" type="button" data-master="${escapeHtml(key)}" aria-label="标记已掌握">${mastered ? '✓' : '○'}</button>
          </div>
        </article>`;
    }).join('');

    vocabList.innerHTML = scene.vocab.map(([word, chinese]) => `
      <button class="vocab-item" type="button" data-speak="${escapeHtml(word)}">
        <span><span class="vocab-word">${escapeHtml(word)}</span><span class="vocab-cn zh-help">${escapeHtml(chinese)}</span></span>
        <span class="vocab-speak">🔊</span>
      </button>`).join('');

    updateProgress();
  }

  function setScene(id, scroll = true) {
    if (!scenes.some(scene => scene.id === id)) return;
    state.sceneId = id;
    state.visited.add(id);
    saveSet(STORAGE.scenes, state.visited);
    renderScenes();
    renderLesson();
    if (scroll) $('lesson').scrollIntoView({behavior:'smooth', block:'start'});
  }

  function toggleMaster(key) {
    if (state.mastered.has(key)) state.mastered.delete(key);
    else state.mastered.add(key);
    saveSet(STORAGE.mastered, state.mastered);
    renderLesson();
    renderDaily();
  }

  function updateProgress() {
    $('masteredCount').textContent = state.mastered.size;
    $('visitedCount').textContent = state.visited.size;
    const best = Number(localStorage.getItem(STORAGE.best));
    $('bestScore').textContent = Number.isFinite(best) && best > 0 ? `${best}/5` : '—';
    $('progressTitle').textContent = state.mastered.size >= 15 ? '已经积累得很不错了' : state.mastered.size >= 5 ? '很好，继续把句子用起来' : '今天继续一点点';
  }

  function dayOfYear(date = new Date()) {
    const start = new Date(date.getFullYear(), 0, 0);
    return Math.floor((date - start) / 86400000);
  }

  function renderDaily() {
    const idx = dayOfYear() % dailySentences.length;
    const [dutch, chinese, note] = dailySentences[idx];
    const key = phraseKey('daily', dutch);
    $('dailyIndex').textContent = String(idx + 1).padStart(2, '0');
    $('dailyDutch').textContent = dutch;
    $('dailyChinese').textContent = chinese;
    $('dailyNote').textContent = note;
    $('dailySpeak').dataset.speak = dutch;
    $('dailySlow').dataset.speak = dutch;
    $('dailyMaster').dataset.master = key;
    const mastered = state.mastered.has(key);
    $('dailyMaster').textContent = mastered ? '✓ 已掌握' : '○ 我会了';
    $('dailyMaster').classList.toggle('is-mastered', mastered);
  }

  function allQuizPairs() {
    return scenes.flatMap(scene => scene.phrases.map(([dutch, chinese]) => ({dutch, chinese, scene: scene.label})));
  }

  function shuffled(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function buildQuiz() {
    const pool = allQuizPairs();
    const selected = shuffled(pool).slice(0, 5);
    return selected.map((item, index) => {
      const reverse = index % 2 === 1;
      const correct = reverse ? item.dutch : item.chinese;
      const wrongPool = pool
        .filter(other => other.dutch !== item.dutch)
        .map(other => reverse ? other.dutch : other.chinese)
        .filter((value, position, arr) => arr.indexOf(value) === position && value !== correct);
      return {
        reverse,
        question: reverse ? item.chinese : item.dutch,
        answer: correct,
        options: shuffled([correct, ...shuffled(wrongPool).slice(0, 3)]),
        scene: item.scene
      };
    });
  }

  function startQuiz() {
    state.quiz = {questions: buildQuiz(), index: 0, score: 0, answered: false};
    $('quizIntro').hidden = true;
    $('quizResult').hidden = true;
    $('quizBody').hidden = false;
    renderQuizQuestion();
  }

  function renderQuizQuestion() {
    const quiz = state.quiz;
    if (!quiz) return;
    const q = quiz.questions[quiz.index];
    quiz.answered = false;
    $('quizStep').textContent = `${quiz.index + 1} / ${quiz.questions.length}`;
    $('quizScore').textContent = `${quiz.score} 分`;
    $('quizProgressBar').style.width = `${((quiz.index + 1) / quiz.questions.length) * 100}%`;
    $('quizPromptLabel').textContent = q.reverse ? '这句中文用荷兰语怎么说？' : '这句荷兰语是什么意思？';
    $('quizQuestion').textContent = q.question;
    $('quizFeedback').textContent = '';
    $('quizNext').hidden = true;
    $('quizNext').textContent = quiz.index === quiz.questions.length - 1 ? '看成绩' : '下一题';
    $('quizOptions').innerHTML = q.options.map(option => `<button class="quiz-option" type="button" data-option="${escapeHtml(option)}">${escapeHtml(option)}</button>`).join('');
  }

  function answerQuiz(option, button) {
    const quiz = state.quiz;
    if (!quiz || quiz.answered) return;
    quiz.answered = true;
    const q = quiz.questions[quiz.index];
    const correct = option === q.answer;
    if (correct) quiz.score += 1;
    [...$('quizOptions').querySelectorAll('.quiz-option')].forEach(btn => {
      btn.disabled = true;
      if (btn.dataset.option === q.answer) btn.classList.add('correct');
    });
    if (!correct) button.classList.add('wrong');
    $('quizScore').textContent = `${quiz.score} 分`;
    $('quizFeedback').textContent = correct ? `✓ 对了。这个表达来自「${q.scene}」场景。` : `正确答案：${q.answer}`;
    $('quizNext').hidden = false;
  }

  function nextQuiz() {
    const quiz = state.quiz;
    if (!quiz || !quiz.answered) return;
    if (quiz.index >= quiz.questions.length - 1) return finishQuiz();
    quiz.index += 1;
    renderQuizQuestion();
  }

  function finishQuiz() {
    const quiz = state.quiz;
    if (!quiz) return;
    const currentBest = Number(localStorage.getItem(STORAGE.best)) || 0;
    if (quiz.score > currentBest) localStorage.setItem(STORAGE.best, String(quiz.score));
    $('quizBody').hidden = true;
    $('quizResult').hidden = false;
    $('resultScore').textContent = `${quiz.score} / 5`;
    if (quiz.score === 5) {
      $('resultTitle').textContent = '满分，漂亮。';
      $('resultText').textContent = '下一步别只认得出来，试着今天真实用上一句。';
    } else if (quiz.score >= 3) {
      $('resultTitle').textContent = '已经记住大半了。';
      $('resultText').textContent = '把错的句子再听两遍，再来一轮会更稳。';
    } else {
      $('resultTitle').textContent = '先不用追求背住。';
      $('resultText').textContent = '回到一个生活场景，只挑两三句反复听和开口就够了。';
    }
    updateProgress();
  }

  function applyTheme(theme, remember = true) {
    const dark = theme === 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    themeToggle.textContent = dark ? '☀︎' : '☾';
    themeToggle.title = dark ? 'Light mode' : 'Dark mode';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#121512' : '#f6f2ea';
    if (remember) localStorage.setItem(STORAGE.theme, dark ? 'dark' : 'light');
  }

  function applyAssist(showChinese, remember = true) {
    document.body.classList.toggle('nl-only', !showChinese);
    assistToggle.setAttribute('aria-pressed', String(!showChinese));
    assistToggle.textContent = showChinese ? '中' : 'NL';
    assistToggle.title = showChinese ? '隐藏中文辅助' : '显示中文辅助';
    if (remember) localStorage.setItem(STORAGE.assist, showChinese ? 'show' : 'hide');
  }

  sceneGrid.addEventListener('click', event => {
    const button = event.target.closest('[data-scene]');
    if (button) setScene(button.dataset.scene);
  });

  phraseList.addEventListener('click', event => {
    const speakButton = event.target.closest('[data-speak]');
    const masterButton = event.target.closest('[data-master]');
    if (speakButton) speak(speakButton.dataset.speak);
    if (masterButton) toggleMaster(masterButton.dataset.master);
  });

  vocabList.addEventListener('click', event => {
    const button = event.target.closest('[data-speak]');
    if (button) speak(button.dataset.speak, 0.9);
  });

  document.querySelectorAll('.church-phrase').forEach(button => button.addEventListener('click', () => speak(button.dataset.speak)));

  $('dailySpeak').addEventListener('click', () => speak($('dailySpeak').dataset.speak));
  $('dailySlow').addEventListener('click', () => speak($('dailySlow').dataset.speak, 0.72));
  $('dailyMaster').addEventListener('click', () => toggleMaster($('dailyMaster').dataset.master));
  $('practiceAll').addEventListener('click', () => {
    const scene = scenes.find(item => item.id === state.sceneId) || scenes[0];
    speakSequence(scene.phrases.map(item => item[0]));
  });

  $('quizStart').addEventListener('click', startQuiz);
  $('quizRetry').addEventListener('click', startQuiz);
  $('quizNext').addEventListener('click', nextQuiz);
  $('quizOptions').addEventListener('click', event => {
    const button = event.target.closest('[data-option]');
    if (button) answerQuiz(button.dataset.option, button);
  });

  themeToggle.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
  assistToggle.addEventListener('click', () => applyAssist(document.body.classList.contains('nl-only')));

  const savedTheme = localStorage.getItem(STORAGE.theme) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const showChinese = localStorage.getItem(STORAGE.assist) !== 'hide';
  applyTheme(savedTheme, false);
  applyAssist(showChinese, false);
  renderDaily();
  renderScenes();
  renderLesson();
})();
