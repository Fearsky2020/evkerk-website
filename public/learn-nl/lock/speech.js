(() => {
  'use strict';

  const SPEECH_KEY = 'taalvia-lock-speech-v1';
  const synth = window.speechSynthesis;
  const wordDutch = document.getElementById('wordDutch');
  const speakWordButton = document.getElementById('speakWordButton');
  const autoSpeak = document.getElementById('autoSpeak');
  const speechStatus = document.getElementById('speechStatus');
  const todayGrid = document.getElementById('todayGrid');

  let settings = { autoSpeak: false };
  let voices = [];
  let lastSpoken = '';
  let speakTimer = 0;

  try {
    settings = { ...settings, ...JSON.parse(localStorage.getItem(SPEECH_KEY) || '{}') };
  } catch (_) {}

  function save() {
    try { localStorage.setItem(SPEECH_KEY, JSON.stringify(settings)); } catch (_) {}
  }

  function loadVoices() {
    if (!synth) return;
    voices = synth.getVoices();
    const dutch = voices.find(v => /^nl-NL$/i.test(v.lang)) || voices.find(v => /^nl\b/i.test(v.lang));
    if (speechStatus) {
      speechStatus.textContent = dutch
        ? `荷兰语语音已就绪 · ${dutch.name}`
        : '会优先使用设备里的荷兰语语音；若没有，则由系统选择。';
    }
  }

  function getDutchVoice() {
    return voices.find(v => /^nl-NL$/i.test(v.lang)) || voices.find(v => /^nl\b/i.test(v.lang)) || null;
  }

  function cleanText(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  function speak(text, force = true) {
    const value = cleanText(text);
    if (!value || !synth || typeof SpeechSynthesisUtterance === 'undefined') {
      if (speechStatus) speechStatus.textContent = '这台浏览器暂时不能直接播放系统语音。';
      return false;
    }

    if (force) synth.cancel();
    const utterance = new SpeechSynthesisUtterance(value);
    utterance.lang = 'nl-NL';
    utterance.rate = 0.82;
    utterance.pitch = 1;
    utterance.volume = 1;
    const voice = getDutchVoice();
    if (voice) utterance.voice = voice;
    utterance.onstart = () => {
      lastSpoken = value;
      speakWordButton?.classList.add('speaking');
      speakWordButton?.setAttribute('aria-label', `正在播放 ${value}`);
    };
    utterance.onend = utterance.onerror = () => {
      speakWordButton?.classList.remove('speaking');
      speakWordButton?.setAttribute('aria-label', `播放 ${cleanText(wordDutch?.textContent)} 的荷兰语发音`);
    };
    synth.speak(utterance);
    return true;
  }

  function resizeWord() {
    if (!wordDutch) return;
    const text = cleanText(wordDutch.textContent);
    wordDutch.classList.remove('long-word', 'xlong-word');
    if (text.length > 14) wordDutch.classList.add('xlong-word');
    else if (text.length > 10) wordDutch.classList.add('long-word');
    wordDutch.title = '点一下听发音';
    speakWordButton?.setAttribute('aria-label', `播放 ${text} 的荷兰语发音`);
  }

  function maybeAutoSpeak() {
    resizeWord();
    if (!settings.autoSpeak || document.visibilityState !== 'visible') return;
    clearTimeout(speakTimer);
    speakTimer = window.setTimeout(() => {
      const text = cleanText(wordDutch?.textContent);
      if (text && text !== 'laden…' && text !== lastSpoken) speak(text);
    }, 180);
  }

  function decorateTodayCards() {
    if (!todayGrid) return;
    todayGrid.querySelectorAll('.today-card').forEach(card => {
      const actions = card.querySelector('.card-actions');
      if (!actions || actions.querySelector('[data-action="speak"]')) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.action = 'speak';
      button.className = 'speak-mini';
      button.textContent = '🔊 发音';
      button.setAttribute('aria-label', `播放 ${cleanText(card.querySelector('h3')?.textContent)} 的荷兰语发音`);
      actions.prepend(button);
    });
  }

  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
    speakWordButton?.setAttribute('disabled', '');
    if (speechStatus) speechStatus.textContent = '当前浏览器没有可用的网页语音播放能力。';
  } else {
    loadVoices();
    synth.addEventListener?.('voiceschanged', loadVoices);
  }

  if (autoSpeak) {
    autoSpeak.checked = !!settings.autoSpeak;
    autoSpeak.addEventListener('change', () => {
      settings.autoSpeak = autoSpeak.checked;
      save();
      if (settings.autoSpeak) speak(wordDutch?.textContent || '');
    });
  }

  speakWordButton?.addEventListener('click', () => speak(wordDutch?.textContent || ''));
  wordDutch?.addEventListener('click', () => speak(wordDutch.textContent));
  wordDutch?.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      speak(wordDutch.textContent);
    }
  });
  if (wordDutch) {
    wordDutch.tabIndex = 0;
    wordDutch.setAttribute('role', 'button');
    new MutationObserver(maybeAutoSpeak).observe(wordDutch, { childList: true, characterData: true, subtree: true });
  }

  todayGrid?.addEventListener('click', event => {
    const button = event.target.closest('[data-action="speak"]');
    if (!button) return;
    event.stopPropagation();
    speak(button.closest('.today-card')?.querySelector('h3')?.textContent || '');
  }, true);

  if (todayGrid) {
    new MutationObserver(decorateTodayCards).observe(todayGrid, { childList: true, subtree: true });
  }

  resizeWord();
  decorateTodayCards();
})();
