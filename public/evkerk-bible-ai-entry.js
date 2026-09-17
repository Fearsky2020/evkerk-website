(() => {
  const path = window.location.pathname || '/';
  if (path !== '/bible' && path !== '/bible.html') return;
  if (document.getElementById('evkerkBibleAiEntry')) return;

  const BIBLE_ICON = '<svg viewBox="0 0 32 32" aria-hidden="true"><path class="bible-book" d="M5.5 7.2c3.8-.7 7.3.2 10.5 2.7v15c-3.2-2.5-6.7-3.4-10.5-2.7v-15Z"/><path class="bible-book" d="M26.5 7.2c-3.8-.7-7.3.2-10.5 2.7v15c3.2-2.5 6.7-3.4 10.5-2.7v-15Z"/><path class="bible-book" d="M20.8 12.4v6.2M17.7 15.5h6.2"/></svg>';

  const style = document.createElement('style');
  style.id = 'evkerk-bible-ai-entry-style';
  style.textContent = `
    .evkerk-bible-ai-entry{display:inline-flex;align-items:center;gap:7px;min-height:40px;padding:0 13px;border:1px solid rgba(8,127,174,.2);border-radius:12px;background:linear-gradient(135deg,#eefafd,#fff);color:#087fae;font:850 12px/1 system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;white-space:nowrap;cursor:pointer;box-shadow:0 3px 10px rgba(8,127,174,.06);transition:.18s ease}
    .evkerk-bible-ai-entry:hover{border-color:rgba(8,127,174,.4);background:#e7f7fb;transform:translateY(-1px)}
    .evkerk-bible-ai-entry:focus-visible{outline:3px solid rgba(18,175,230,.2);outline-offset:2px}
    .evkerk-bible-ai-entry svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    html[data-theme="dark"] .evkerk-bible-ai-entry{border-color:rgba(100,190,216,.2);background:#102a38;color:#9ee8ff}
    #evkerk-ai-root.evk-ai-bible-mode .evk-ai-panel{bottom:20px}
    #evkerk-ai-root.evk-ai-bible-mode .evk-ai-brandmark .bible-book{fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    #evkerk-ai-root.evk-ai-bible-mode .evk-ai-launcher .bible-book{fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    @media(max-width:720px){.evkerk-bible-ai-entry{width:40px;min-height:40px;padding:0;justify-content:center}.evkerk-bible-ai-entry span{display:none}}
    @media(max-width:560px){#evkerk-ai-root.evk-ai-bible-mode .evk-ai-panel{bottom:12px}}
  `;
  document.head.appendChild(style);

  const toolbar = document.querySelector('.bible-toolbar');
  const searchButton = document.getElementById('searchButton');
  if (!toolbar || !searchButton) return;

  const lang = (document.documentElement.lang || 'zh').toLowerCase();
  const isNl = lang.startsWith('nl');
  const entry = document.createElement('button');
  entry.id = 'evkerkBibleAiEntry';
  entry.className = 'evkerk-bible-ai-entry';
  entry.type = 'button';
  entry.setAttribute('aria-label', isNl ? 'Slim zoeken in de Bijbel' : '圣经智能搜索');
  entry.title = isNl ? 'Slim zoeken in de Bijbel' : '圣经智能搜索';
  entry.innerHTML = `${BIBLE_ICON}<span>${isNl ? 'Slim zoeken' : '圣经智能搜索'}</span>`;
  searchButton.insertAdjacentElement('afterend', entry);

  function bindAssistant() {
    const root = document.getElementById('evkerk-ai-root');
    const launcher = root?.querySelector('.evk-ai-launcher');
    const brandmark = root?.querySelector('.evk-ai-brandmark');
    if (!root || !launcher || !brandmark) return false;
    root.classList.add('evk-ai-bible-mode');
    launcher.innerHTML = BIBLE_ICON;
    brandmark.innerHTML = BIBLE_ICON;
    launcher.hidden = true;
    entry.onclick = () => launcher.click();
    return true;
  }

  if (bindAssistant()) return;
  const observer = new MutationObserver(() => {
    if (bindAssistant()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 5000);
})();
