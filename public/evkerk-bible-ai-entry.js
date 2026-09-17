(() => {
  const path = window.location.pathname || '/';
  if (path !== '/bible' && path !== '/bible.html') return;
  if (document.getElementById('evkerkBibleAiEntry')) return;

  const style = document.createElement('style');
  style.id = 'evkerk-bible-ai-entry-style';
  style.textContent = `
    .evkerk-bible-ai-entry{display:inline-flex;align-items:center;gap:7px;min-height:40px;padding:0 13px;border:1px solid rgba(8,127,174,.2);border-radius:12px;background:linear-gradient(135deg,#eefafd,#fff);color:#087fae;font:850 12px/1 system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;white-space:nowrap;cursor:pointer;box-shadow:0 3px 10px rgba(8,127,174,.06);transition:.18s ease}
    .evkerk-bible-ai-entry:hover{border-color:rgba(8,127,174,.4);background:#e7f7fb;transform:translateY(-1px)}
    .evkerk-bible-ai-entry:focus-visible{outline:3px solid rgba(18,175,230,.2);outline-offset:2px}
    .evkerk-bible-ai-entry svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    html[data-theme="dark"] .evkerk-bible-ai-entry{border-color:rgba(100,190,216,.2);background:#102a38;color:#9ee8ff}
    #evkerk-ai-root.evk-ai-bible-mode .evk-ai-panel{bottom:20px}
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
  entry.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="M15.5 15.5 21 21"></path><path d="M18 4.5l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8.8-1.7Z"></path></svg><span>${isNl ? 'Slim zoeken' : '圣经智能搜索'}</span>`;
  searchButton.insertAdjacentElement('afterend', entry);

  function bindAssistant() {
    const root = document.getElementById('evkerk-ai-root');
    const launcher = root?.querySelector('.evk-ai-launcher');
    if (!root || !launcher) return false;
    root.classList.add('evk-ai-bible-mode');
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
