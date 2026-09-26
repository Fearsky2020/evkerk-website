(() => {
  const path = window.location.pathname || '/';
  if (path.startsWith('/admin') || path.startsWith('/team')) return;
  if (document.getElementById('evkerk-ai-root')) return;

  const isBible = path === '/bible' || path === '/bible.html';
  const lang = (document.documentElement.lang || 'zh').toLowerCase();
  const isNl = lang.startsWith('nl');
  const storageKey = `evkerk-ai-chat:${isBible ? 'bible' : 'public'}`;
  const title = isBible ? (isNl ? 'Bijbelassistent' : '圣经助手') : (isNl ? 'Evangeliekerk-assistent' : '福音教会助手');
  const subtitle = isBible ? (isNl ? 'Zoek teksten en verhalen' : '找经文 · 找故事 · 查出处') : (isNl ? 'Diensten · Preken · Activiteiten' : '聚会 · 讲道 · 活动');
  const greeting = isBible
    ? (isNl ? 'Hallo! Vertel wat u zich van een Bijbeltekst of verhaal herinnert, dan help ik zoeken.' : '您好，平安。您可以告诉我记得的经文、人物或故事情节，我来帮您找出处。')
    : (isNl ? 'Hallo! Ik kan actuele informatie opzoeken over diensten, preken en activiteiten van Evangeliekerk.' : '您好，平安。我可以帮您查询最新的主日聚会、讲道、近期活动和教会公开信息。');

  const starters = isBible
    ? (isNl ? ['Waar staat de vijf broden en twee vissen?', 'Zoek Psalm 23', 'Waar staat de verloren zoon?'] : ['五饼二鱼在哪里？', '帮我找诗篇23篇', '浪子回头在哪里？'])
    : (isNl ? ['Wanneer is de zondagdienst?', 'Wat is de nieuwste preek?', 'Welke activiteiten zijn er binnenkort?'] : ['这个星期日几点聚会？', '最新一篇讲道是什么？', '最近有什么活动？']);

  const root = document.createElement('div');
  root.id = 'evkerk-ai-root';
  root.innerHTML = `
    <button class="evk-ai-launcher" type="button" aria-label="${title}" aria-expanded="false">
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <path class="bubble" d="M8.3 10.8c0-2.2 1.8-4 4-4h15.4c2.2 0 4 1.8 4 4v11.4c0 2.2-1.8 4-4 4H18l-6.7 5.1.9-5.1c-2.2 0-3.9-1.8-3.9-4V10.8Z"/>
        <circle cx="15" cy="17" r="1.7"/><circle cx="20" cy="17" r="1.7"/><circle cx="25" cy="17" r="1.7"/>
        <path class="spark" d="M30.4 4.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z"/>
      </svg>
    </button>
    <section class="evk-ai-panel" aria-hidden="true" aria-label="${title}">
      <header class="evk-ai-header">
        <div class="evk-ai-brandmark" aria-hidden="true">
          <svg viewBox="0 0 32 32"><path d="M7 9.5A4.5 4.5 0 0 1 11.5 5h9A4.5 4.5 0 0 1 25 9.5v7A4.5 4.5 0 0 1 20.5 21H15l-5.4 4 .8-4A4.5 4.5 0 0 1 7 16.5v-7Z"/><circle cx="12.5" cy="13" r="1.25"/><circle cx="16" cy="13" r="1.25"/><circle cx="19.5" cy="13" r="1.25"/></svg>
        </div>
        <div class="evk-ai-heading">
          <strong>${title}</strong>
          <span>${subtitle}</span>
        </div>
        <button class="evk-ai-icon-btn evk-ai-clear" type="button" title="${isNl ? 'Gesprek wissen' : '清空对话'}" aria-label="${isNl ? 'Gesprek wissen' : '清空对话'}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/></svg>
        </button>
        <button class="evk-ai-icon-btn evk-ai-close" type="button" aria-label="${isNl ? 'Sluiten' : '关闭'}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
        </button>
      </header>
      <div class="evk-ai-messages" role="log" aria-live="polite"></div>
      <div class="evk-ai-starters"></div>
      <form class="evk-ai-form">
        <textarea class="evk-ai-input" rows="1" maxlength="1200" placeholder="${isNl ? 'Stel uw vraag…' : '输入您的问题…'}" aria-label="${isNl ? 'Vraag' : '问题'}"></textarea>
        <button class="evk-ai-send" type="submit" aria-label="${isNl ? 'Versturen' : '发送'}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 12 16-8-5 16-3.2-6.1L4 12Zm7.8 1.9L20 4"/></svg>
        </button>
      </form>
      <div class="evk-ai-note">${isNl ? 'AI-antwoorden kunnen fouten of hallucinaties bevatten. Controleer twijfelachtige informatie bij een pastor. Deel hier geen gevoelige persoonlijke gegevens.' : 'AI生成的答案可能存在错误或幻觉；如发现问题或有疑问，请务必向牧者核实。请勿在这里提交私密或敏感个人信息。'}</div>
    </section>`;

  const style = document.createElement('style');
  style.id = 'evkerk-ai-styles';
  style.textContent = `
    #evkerk-ai-root{position:fixed;right:20px;bottom:20px;z-index:2147482000;font-family:system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:#20333a}
    .evk-ai-launcher{position:relative;width:58px;height:58px;border:1px solid rgba(255,255,255,.75);border-radius:20px;padding:0;display:grid;place-items:center;cursor:pointer;background:linear-gradient(145deg,#28c5ef 0%,#0aa4d7 44%,#087ca8 100%);box-shadow:0 15px 34px rgba(4,110,153,.25),inset 0 1px 0 rgba(255,255,255,.35);transition:transform .2s ease,box-shadow .2s ease}
    .evk-ai-launcher:hover{transform:translateY(-2px);box-shadow:0 19px 38px rgba(4,110,153,.3),inset 0 1px 0 rgba(255,255,255,.4)}
    .evk-ai-launcher:focus-visible{outline:4px solid rgba(18,175,230,.24);outline-offset:4px}
    .evk-ai-launcher svg{width:35px;height:35px;overflow:visible}.evk-ai-launcher .bubble{fill:none;stroke:#fff;stroke-width:2.4;stroke-linejoin:round}.evk-ai-launcher circle,.evk-ai-launcher .spark{fill:#fff}
    .evk-ai-panel{position:absolute;right:0;bottom:72px;width:min(390px,calc(100vw - 24px));height:min(650px,calc(100vh - 110px));display:grid;grid-template-rows:auto 1fr auto auto auto;overflow:hidden;border:1px solid rgba(57,111,126,.16);border-radius:25px;background:#fbfdfc;box-shadow:0 28px 80px rgba(25,60,70,.22);opacity:0;transform:translateY(12px) scale(.985);transform-origin:bottom right;pointer-events:none;visibility:hidden;transition:opacity .18s ease,transform .18s ease,visibility .18s}
    .evk-ai-panel.is-open{opacity:1;transform:none;pointer-events:auto;visibility:visible}
    .evk-ai-header{display:grid;grid-template-columns:40px 1fr 34px 34px;gap:9px;align-items:center;padding:15px 15px 14px;border-bottom:1px solid rgba(57,111,126,.11);background:linear-gradient(135deg,#f3fcfd,#fffaf4)}
    .evk-ai-brandmark{width:40px;height:40px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(145deg,#20bce9,#0785b2);box-shadow:0 8px 20px rgba(7,133,178,.16)}
    .evk-ai-brandmark svg{width:27px;height:27px}.evk-ai-brandmark path{fill:none;stroke:#fff;stroke-width:2}.evk-ai-brandmark circle{fill:#fff}
    .evk-ai-heading{min-width:0;display:flex;flex-direction:column;gap:3px}.evk-ai-heading strong{font-size:15px;line-height:1.2;color:#173943}.evk-ai-heading span{font-size:11px;color:#74858a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .evk-ai-icon-btn{width:34px;height:34px;border:0;border-radius:11px;display:grid;place-items:center;background:transparent;color:#60767d;cursor:pointer}.evk-ai-icon-btn:hover{background:rgba(17,171,227,.08);color:#087fae}.evk-ai-icon-btn svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .evk-ai-messages{min-height:0;overflow-y:auto;padding:19px 16px 12px;scroll-behavior:smooth;background:radial-gradient(circle at 100% 0,rgba(220,247,250,.34),transparent 34%),#fbfdfc}
    .evk-ai-msg{display:flex;margin:0 0 13px}.evk-ai-msg.user{justify-content:flex-end}.evk-ai-bubble{max-width:84%;padding:11px 13px;border-radius:17px;font-size:14px;line-height:1.62;white-space:pre-wrap;overflow-wrap:anywhere}
    .evk-ai-msg.assistant .evk-ai-bubble{border:1px solid rgba(56,112,126,.11);border-bottom-left-radius:6px;background:#fff;color:#304249;box-shadow:0 6px 18px rgba(55,87,97,.055)}
    .evk-ai-msg.user .evk-ai-bubble{border-bottom-right-radius:6px;background:linear-gradient(145deg,#139fd0,#087da9);color:#fff;box-shadow:0 8px 20px rgba(8,125,169,.16)}
    .evk-ai-bubble a{color:#087fae;text-decoration:underline;text-underline-offset:3px}.evk-ai-msg.user .evk-ai-bubble a{color:#fff}
    .evk-ai-typing{display:inline-flex;gap:4px;align-items:center;height:18px}.evk-ai-typing i{width:5px;height:5px;border-radius:50%;background:#8ba1a8;animation:evk-dot 1s infinite ease-in-out}.evk-ai-typing i:nth-child(2){animation-delay:.14s}.evk-ai-typing i:nth-child(3){animation-delay:.28s}@keyframes evk-dot{0%,60%,100%{transform:translateY(0);opacity:.45}30%{transform:translateY(-3px);opacity:1}}
    .evk-ai-starters{display:flex;gap:7px;overflow-x:auto;padding:4px 14px 10px;scrollbar-width:none;background:#fbfdfc}.evk-ai-starters::-webkit-scrollbar{display:none}.evk-ai-chip{flex:0 0 auto;border:1px solid rgba(8,127,174,.17);border-radius:999px;padding:7px 10px;background:#f4fbfc;color:#286071;font-size:11px;font-weight:700;cursor:pointer}.evk-ai-chip:hover{border-color:rgba(8,127,174,.34);background:#eaf8fa}
    .evk-ai-form{display:grid;grid-template-columns:1fr 42px;gap:8px;align-items:end;margin:0 13px;padding:8px 8px 8px 14px;border:1px solid rgba(56,112,126,.17);border-radius:18px;background:#fff;box-shadow:0 6px 18px rgba(44,78,88,.055)}.evk-ai-form:focus-within{border-color:rgba(8,127,174,.42);box-shadow:0 0 0 3px rgba(18,175,230,.08)}
    .evk-ai-input{width:100%;max-height:110px;resize:none;border:0;outline:0;padding:6px 0;background:transparent;color:#233a42;font:inherit;font-size:14px;line-height:1.45}.evk-ai-input::placeholder{color:#99a5a8}
    .evk-ai-send{width:42px;height:42px;border:0;border-radius:13px;display:grid;place-items:center;background:linear-gradient(145deg,#17afe0,#0783b0);color:#fff;cursor:pointer;box-shadow:0 7px 15px rgba(8,127,174,.18)}.evk-ai-send:disabled{opacity:.45;cursor:default}.evk-ai-send svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
    .evk-ai-note{padding:9px 14px 12px;text-align:center;color:#8b989b;font-size:10px;line-height:1.35;background:#fbfdfc}
    html[data-theme="dark"] .evk-ai-panel{border-color:rgba(100,190,216,.16);background:#0d232c;color:#eef8fa}.evk-ai-panel{}
    html[data-theme="dark"] .evk-ai-header{border-bottom-color:rgba(100,190,216,.13);background:linear-gradient(135deg,#102c36,#172a2f)}html[data-theme="dark"] .evk-ai-heading strong{color:#f1fbfd}html[data-theme="dark"] .evk-ai-heading span,html[data-theme="dark"] .evk-ai-note{color:#9eb1b7}
    html[data-theme="dark"] .evk-ai-messages,html[data-theme="dark"] .evk-ai-starters,html[data-theme="dark"] .evk-ai-note{background:#0d232c}html[data-theme="dark"] .evk-ai-msg.assistant .evk-ai-bubble{border-color:rgba(100,190,216,.12);background:#14303a;color:#e8f4f6}html[data-theme="dark"] .evk-ai-chip{border-color:rgba(100,190,216,.18);background:#13313b;color:#c5e9f2}html[data-theme="dark"] .evk-ai-form{border-color:rgba(100,190,216,.17);background:#132d36}html[data-theme="dark"] .evk-ai-input{color:#f0f8fa}
    @media(max-width:560px){#evkerk-ai-root{right:12px;bottom:12px}.evk-ai-launcher{width:55px;height:55px;border-radius:18px}.evk-ai-panel{position:fixed;left:10px;right:10px;bottom:78px;width:auto;height:min(72vh,620px);border-radius:22px;transform-origin:bottom right}.evk-ai-bubble{max-width:88%}}
    @media(prefers-reduced-motion:reduce){.evk-ai-launcher,.evk-ai-panel{transition:none}.evk-ai-typing i{animation:none}}
  `;
  document.head.appendChild(style);
  document.body.appendChild(root);

  const launcher = root.querySelector('.evk-ai-launcher');
  const panel = root.querySelector('.evk-ai-panel');
  const closeBtn = root.querySelector('.evk-ai-close');
  const clearBtn = root.querySelector('.evk-ai-clear');
  const messagesEl = root.querySelector('.evk-ai-messages');
  const startersEl = root.querySelector('.evk-ai-starters');
  const form = root.querySelector('.evk-ai-form');
  const input = root.querySelector('.evk-ai-input');
  const sendBtn = root.querySelector('.evk-ai-send');
  let busy = false;

  function loadConversation() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
      return Array.isArray(parsed) ? parsed.filter((m) => m && ['user', 'assistant'].includes(m.role) && typeof m.text === 'string').slice(-12) : [];
    } catch { return []; }
  }

  let conversation = loadConversation();

  function saveConversation() {
    try { sessionStorage.setItem(storageKey, JSON.stringify(conversation.slice(-12))); } catch {}
  }

  function addLinkedText(host, text) {
    const source = String(text || '');
    const re = /(https?:\/\/[^\s<>]+)/g;
    let last = 0;
    for (const match of source.matchAll(re)) {
      if (match.index > last) host.appendChild(document.createTextNode(source.slice(last, match.index)));
      const raw = match[0];
      const clean = raw.replace(/[),.;!?，。；！？]+$/u, '');
      const tail = raw.slice(clean.length);
      const a = document.createElement('a');
      a.href = clean;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = clean;
      host.appendChild(a);
      if (tail) host.appendChild(document.createTextNode(tail));
      last = match.index + raw.length;
    }
    if (last < source.length) host.appendChild(document.createTextNode(source.slice(last)));
  }

  function appendMessage(role, text, transient = false) {
    const row = document.createElement('div');
    row.className = `evk-ai-msg ${role}`;
    const bubble = document.createElement('div');
    bubble.className = 'evk-ai-bubble';
    if (transient) bubble.innerHTML = '<span class="evk-ai-typing" aria-label="typing"><i></i><i></i><i></i></span>';
    else addLinkedText(bubble, text);
    row.appendChild(bubble);
    messagesEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return row;
  }

  function renderConversation() {
    messagesEl.innerHTML = '';
    appendMessage('assistant', greeting);
    conversation.forEach((item) => appendMessage(item.role, item.text));
    startersEl.hidden = conversation.length > 0;
  }

  function openPanel() {
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    launcher.setAttribute('aria-expanded', 'true');
    window.setTimeout(() => input.focus(), 80);
  }

  function closePanel() {
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.focus();
  }

  launcher.addEventListener('click', () => panel.classList.contains('is-open') ? closePanel() : openPanel());
  closeBtn.addEventListener('click', closePanel);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && panel.classList.contains('is-open')) closePanel(); });

  starters.forEach((text) => {
    const btn = document.createElement('button');
    btn.className = 'evk-ai-chip';
    btn.type = 'button';
    btn.textContent = text;
    btn.addEventListener('click', () => sendMessage(text));
    startersEl.appendChild(btn);
  });

  clearBtn.addEventListener('click', () => {
    conversation = [];
    saveConversation();
    renderConversation();
    input.focus();
  });

  function resizeInput() {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 110)}px`;
  }
  input.addEventListener('input', resizeInput);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  async function sendMessage(rawText) {
    const text = String(rawText || '').trim().slice(0, 1200);
    if (!text || busy) return;
    const previous = conversation.slice(-6);
    conversation.push({ role: 'user', text });
    saveConversation();
    startersEl.hidden = true;
    appendMessage('user', text);
    input.value = '';
    resizeInput();
    busy = true;
    sendBtn.disabled = true;
    const typing = appendMessage('assistant', '', true);

    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text, history: previous, page: path }),
      });
      const data = await response.json().catch(() => ({}));
      const answer = String(data.answer || (isNl ? 'Sorry, de assistent is tijdelijk niet beschikbaar.' : '抱歉，信息助手现在暂时不可用。'));
      typing.remove();
      appendMessage('assistant', answer);
      conversation.push({ role: 'assistant', text: answer });
      saveConversation();
    } catch {
      typing.remove();
      const answer = isNl ? 'Sorry, de assistent is tijdelijk niet bereikbaar. Probeer het later opnieuw.' : '抱歉，信息助手现在暂时连不上，请稍后再试。';
      appendMessage('assistant', answer);
      conversation.push({ role: 'assistant', text: answer });
      saveConversation();
    } finally {
      busy = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    sendMessage(input.value);
  });

  renderConversation();
})();
