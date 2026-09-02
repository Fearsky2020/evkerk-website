(() => {
  const practiceByScene = {
    supermarket: {
      title: '在超市问东西',
      subtitle: '先听完整对话，再只练“你”的台词。',
      dialogue: [
        {speaker:'A', role:'你', user:true, nl:'Goedemiddag. Waar kan ik de melk vinden?', cn:'下午好。请问牛奶在哪里？'},
        {speaker:'B', role:'店员', user:false, nl:'De melk staat achterin, naast de yoghurt.', cn:'牛奶在里面靠后的位置，酸奶旁边。'},
        {speaker:'A', role:'你', user:true, nl:'Dank u wel. En waar is de kassa?', cn:'谢谢。收银台在哪里？'},
        {speaker:'B', role:'店员', user:false, nl:'Daar rechts. U kunt daar ook pinnen.', cn:'右边那里。您也可以在那里刷卡。'}
      ],
      grammar: {
        label:'万能问路句型',
        pattern:'Waar kan ik + iets + vinden?',
        note:'“Waar kan ik … vinden?” 是非常实用的固定结构。把中间的东西换掉，就能在超市、商店、车站甚至办公室里直接用。',
        examples:[['Waar kan ik de koffie vinden?','咖啡在哪里？'],['Waar kan ik het toilet vinden?','洗手间在哪里？'],['Waar kan ik deze maat vinden?','这个尺码在哪里？']]
      }
    },
    doctor: {
      title: '给 huisarts 打电话预约',
      subtitle: '重点不是说得复杂，而是让前台迅速听懂你要什么。',
      dialogue: [
        {speaker:'A', role:'前台', user:false, nl:'Goedemorgen, huisartsenpraktijk De Linde.', cn:'早上好，这里是 De Linde 家庭医生诊所。'},
        {speaker:'B', role:'你', user:true, nl:'Goedemorgen. Ik wil graag een afspraak maken.', cn:'早上好。我想预约一下。'},
        {speaker:'A', role:'前台', user:false, nl:'Natuurlijk. Wat zijn uw klachten?', cn:'当然。您有什么症状？'},
        {speaker:'B', role:'你', user:true, nl:'Ik heb sinds gisteren pijn in mijn keel en koorts.', cn:'我从昨天开始喉咙痛，还有发烧。'}
      ],
      grammar: {
        label:'礼貌表达需求',
        pattern:'Ik wil graag + ...',
        note:'“graag” 会让表达比直接说 “Ik wil …” 更柔和。在预约、点餐、柜台办事时都很好用。',
        examples:[['Ik wil graag een afspraak maken.','我想预约。'],['Ik wil graag met de huisarts spreken.','我想和家庭医生说话。'],['Ik wil graag wat informatie.','我想了解一些信息。']]
      }
    },
    gemeente: {
      title: '到 gemeente 办事',
      subtitle: '先说明有预约，再问自己应该去哪里。',
      dialogue: [
        {speaker:'A', role:'你', user:true, nl:'Goedemorgen. Ik heb een afspraak om tien uur.', cn:'早上好。我十点有预约。'},
        {speaker:'B', role:'工作人员', user:false, nl:'Waarvoor heeft u een afspraak?', cn:'您预约办理什么？'},
        {speaker:'A', role:'你', user:true, nl:'Voor mijn inschrijving. Waar moet ik me melden?', cn:'办理登记。我应该在哪里报到？'},
        {speaker:'B', role:'工作人员', user:false, nl:'Bij balie vier. Neemt u daar plaats.', cn:'四号柜台。请在那里等候。'}
      ],
      grammar: {
        label:'必须 / 应该去哪里',
        pattern:'Waar moet ik + ...?',
        note:'“moeten” 常表示“必须、需要”。在办事场景里用 “Waar moet ik …?” 很自然，不一定带有强硬语气。',
        examples:[['Waar moet ik wachten?','我应该在哪里等？'],['Waar moet ik tekenen?','我应该在哪里签字？'],['Waar moet ik dit formulier inleveren?','这张表我应该交到哪里？']]
      }
    },
    neighbors: {
      title: '和邻居自然聊两句',
      subtitle: '荷兰式寒暄通常很短，能接住一句就已经很好。',
      dialogue: [
        {speaker:'A', role:'邻居', user:false, nl:'Hoi! Alles goed?', cn:'嗨！都好吗？'},
        {speaker:'B', role:'你', user:true, nl:'Ja hoor, prima. En met jou?', cn:'嗯，挺好的。你呢？'},
        {speaker:'A', role:'邻居', user:false, nl:'Ook goed. Lekker weer vandaag, hè?', cn:'我也挺好。今天天气不错，是吧？'},
        {speaker:'B', role:'你', user:true, nl:'Ja, eindelijk! Fijne dag nog.', cn:'是啊，终于！祝你今天愉快。'}
      ],
      grammar: {
        label:'口语里的反问小尾巴',
        pattern:'..., hè?',
        note:'句尾的 “hè?” 很像中文里的“是吧？”“对吧？”。它在日常聊天里非常常见，语气通常轻松友好。',
        examples:[['Mooi weer, hè?','天气不错，是吧？'],['Druk vandaag, hè?','今天挺忙，是吧？'],['Gezellig hier, hè?','这里挺有氛围，是吧？']]
      }
    },
    phone: {
      title: '电话里没听懂怎么办',
      subtitle: '电话里最值钱的能力，是敢让对方重复和放慢。',
      dialogue: [
        {speaker:'A', role:'对方', user:false, nl:'Goedemiddag, waarmee kan ik u helpen?', cn:'下午好，我能怎么帮您？'},
        {speaker:'B', role:'你', user:true, nl:'Ik bel voor een afspraak.', cn:'我打电话是为了预约。'},
        {speaker:'A', role:'对方', user:false, nl:'Dat kan. Heeft u volgende week dinsdag tijd?', cn:'可以。您下周二有时间吗？'},
        {speaker:'B', role:'你', user:true, nl:'Sorry, kunt u dat iets langzamer herhalen?', cn:'不好意思，您可以说慢一点再重复一次吗？'}
      ],
      grammar: {
        label:'礼貌请求',
        pattern:'Kunt u + ...?',
        note:'“Kunt u …?” 是正式又自然的请求方式。电话、诊所、市政府和不熟悉的人之间都非常好用。',
        examples:[['Kunt u dat herhalen?','您可以再说一遍吗？'],['Kunt u mij helpen?','您可以帮我吗？'],['Kunt u iets langzamer spreken?','您可以说慢一点吗？']]
      }
    }
  };

  const listeningPool = [
    ['Kunt u dat herhalen, alstublieft?','您可以再说一遍吗？'],
    ['Ik wil graag een afspraak maken.','我想预约一下。'],
    ['Waar kan ik dit vinden?','我在哪里可以找到这个？'],
    ['Hoeveel kost dit?','这个多少钱？'],
    ['Ik voel me niet goed.','我感觉不舒服。'],
    ['Welke documenten heb ik nodig?','我需要哪些文件？'],
    ['Waar moet ik me melden?','我应该在哪里报到？'],
    ['Hoe was je weekend?','你周末过得怎么样？'],
    ['Fijne dag nog!','祝你今天接下来愉快！'],
    ['Ik bel voor een afspraak.','我打电话是为了预约。'],
    ['Kunt u iets langzamer spreken?','您可以说慢一点吗？'],
    ['Dank u wel voor uw hulp.','谢谢您的帮助。']
  ];

  const $ = id => document.getElementById(id);
  const dialogueList = $('dialogueList');
  const grammarExamples = $('grammarExamples');
  const dialogueCard = $('dialogueCard');
  if (!dialogueList || !grammarExamples || !dialogueCard) return;

  let currentScene = 'supermarket';
  let listenSession = null;
  const listenBestKey = 'learn-nl-listen-best-v1';

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  }

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function dutchVoice() {
    const voices = window.speechSynthesis?.getVoices?.() || [];
    return voices.find(v => /^nl(-|_)/i.test(v.lang)) || voices.find(v => /Dutch|Nederlands/i.test(v.name));
  }

  function speak(text, rate = 0.94, onend) {
    if (!('speechSynthesis' in window)) {
      alert('当前浏览器不支持语音播放。');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'nl-NL';
    utterance.rate = rate;
    const voice = dutchVoice();
    if (voice) utterance.voice = voice;
    if (onend) utterance.onend = onend;
    window.speechSynthesis.speak(utterance);
  }

  function speakLines(lines, index = 0) {
    if (!lines[index]) return;
    const utterance = new SpeechSynthesisUtterance(lines[index].nl);
    utterance.lang = 'nl-NL';
    utterance.rate = 0.9;
    const voice = dutchVoice();
    if (voice) utterance.voice = voice;
    utterance.onend = () => speakLines(lines, index + 1);
    window.speechSynthesis.speak(utterance);
  }

  function renderPractice(sceneId) {
    const item = practiceByScene[sceneId] || practiceByScene.supermarket;
    currentScene = sceneId in practiceByScene ? sceneId : 'supermarket';
    $('dialogueTitle').textContent = item.title;
    $('dialogueSubtitle').textContent = item.subtitle;
    dialogueList.innerHTML = item.dialogue.map(line => `
      <article class="dialogue-line ${line.user ? 'is-user' : ''}">
        <span class="speaker-badge" title="${escapeHtml(line.role)}">${escapeHtml(line.speaker)}</span>
        <div class="dialogue-copy">
          <p class="dialogue-nl">${escapeHtml(line.nl)}</p>
          <p class="dialogue-cn zh-help">${escapeHtml(line.role)}：${escapeHtml(line.cn)}</p>
        </div>
        <button class="mini-speak" type="button" data-dialogue-speak="${escapeHtml(line.nl)}" aria-label="播放这句话">🔊</button>
      </article>`).join('');

    $('grammarLabel').textContent = item.grammar.label;
    $('grammarPattern').textContent = item.grammar.pattern;
    $('grammarNote').textContent = item.grammar.note;
    grammarExamples.innerHTML = item.grammar.examples.map(([nl, cn]) => `
      <div class="grammar-example">
        <span><strong>${escapeHtml(nl)}</strong><small class="zh-help">${escapeHtml(cn)}</small></span>
        <button class="mini-speak" type="button" data-dialogue-speak="${escapeHtml(nl)}" aria-label="播放例句">🔊</button>
      </div>`).join('');
  }

  dialogueList.addEventListener('click', event => {
    const button = event.target.closest('[data-dialogue-speak]');
    if (button) speak(button.dataset.dialogueSpeak);
  });

  grammarExamples.addEventListener('click', event => {
    const button = event.target.closest('[data-dialogue-speak]');
    if (button) speak(button.dataset.dialogueSpeak);
  });

  $('dialoguePlay').addEventListener('click', () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    speakLines(practiceByScene[currentScene].dialogue);
  });

  $('roleMode').addEventListener('click', () => {
    const active = dialogueCard.classList.toggle('role-mode');
    $('roleMode').textContent = active ? '退出角色练习' : '只练我的台词';
    $('roleMode').setAttribute('aria-pressed', String(active));
  });

  $('sceneGrid')?.addEventListener('click', event => {
    const button = event.target.closest('[data-scene]');
    if (button) renderPractice(button.dataset.scene);
  });

  function makeListeningQuestions() {
    return shuffle(listeningPool).slice(0, 5).map(([nl, cn]) => {
      const distractors = shuffle(listeningPool.filter(item => item[1] !== cn).map(item => item[1])).slice(0, 3);
      return {nl, cn, options: shuffle([cn, ...distractors])};
    });
  }

  function startListening() {
    listenSession = {questions:makeListeningQuestions(), index:0, score:0, answered:false};
    renderListening();
  }

  function renderListening() {
    const session = listenSession;
    const q = session.questions[session.index];
    session.answered = false;
    $('listenStep').textContent = `${session.index + 1} / ${session.questions.length}`;
    $('listenScore').textContent = `${session.score} 分`;
    $('listenReveal').hidden = true;
    $('listenNext').hidden = true;
    $('listenOptions').innerHTML = q.options.map(option => `<button class="listen-option" type="button" data-listen-option="${escapeHtml(option)}">${escapeHtml(option)}</button>`).join('');
    $('listenBest').textContent = localStorage.getItem(listenBestKey) ? `最佳 ${localStorage.getItem(listenBestKey)}/5` : '首次练习';
  }

  function playListening(rate) {
    const q = listenSession?.questions?.[listenSession.index];
    if (!q) return;
    const wave = $('listenWave');
    wave.classList.add('playing');
    speak(q.nl, rate, () => wave.classList.remove('playing'));
    setTimeout(() => wave.classList.remove('playing'), 6000);
  }

  $('listenPlay').addEventListener('click', () => playListening(0.92));
  $('listenSlow').addEventListener('click', () => playListening(0.72));

  $('listenOptions').addEventListener('click', event => {
    const button = event.target.closest('[data-listen-option]');
    const session = listenSession;
    if (!button || !session || session.answered) return;
    session.answered = true;
    const q = session.questions[session.index];
    const chosen = button.dataset.listenOption;
    const correct = chosen === q.cn;
    if (correct) session.score += 1;
    [...$('listenOptions').querySelectorAll('.listen-option')].forEach(option => {
      option.disabled = true;
      if (option.dataset.listenOption === q.cn) option.classList.add('correct');
    });
    if (!correct) button.classList.add('wrong');
    $('listenScore').textContent = `${session.score} 分`;
    $('listenReveal').innerHTML = `<strong>${escapeHtml(q.nl)}</strong><span class="zh-help">${escapeHtml(q.cn)}</span>`;
    $('listenReveal').hidden = false;
    $('listenNext').hidden = false;
    $('listenNext').textContent = session.index === session.questions.length - 1 ? '看听力成绩' : '下一题';
  });

  $('listenNext').addEventListener('click', () => {
    const session = listenSession;
    if (!session || !session.answered) return;
    if (session.index < session.questions.length - 1) {
      session.index += 1;
      renderListening();
      return;
    }
    const oldBest = Number(localStorage.getItem(listenBestKey)) || 0;
    if (session.score > oldBest) localStorage.setItem(listenBestKey, String(session.score));
    $('listenOptions').innerHTML = '';
    $('listenReveal').hidden = false;
    $('listenReveal').innerHTML = `<strong>听力完成：${session.score} / 5</strong><span class="zh-help">${session.score >= 4 ? '已经能抓住大部分核心句了。下一步可以尝试听完后直接跟读。' : '没关系。先反复听熟两三句，比一次做很多题更有效。'}</span>`;
    $('listenNext').hidden = true;
    $('listenBest').textContent = `最佳 ${Math.max(oldBest, session.score)}/5`;
  });

  $('listenRestart').addEventListener('click', startListening);

  renderPractice('supermarket');
  startListening();
})();
