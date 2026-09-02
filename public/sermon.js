(() => {
  const langKey = 'evkerk-lang';
  const themeKey = 'evkerk-theme';
  const page = document.getElementById('page');
  const langToggle = document.getElementById('langToggle');
  const themeToggle = document.getElementById('themeToggle');
  const brandName = document.getElementById('brandName');
  const homeLink = document.getElementById('homeLink');
  const params = new URLSearchParams(location.search);
  const sermonId = params.get('id') || '';
  let sermon = null;

  function isNl() { return document.documentElement.lang === 'nl'; }
  function choose(zh, nl) { return isNl() ? (nl || zh || '') : (zh || nl || ''); }

  function applyTheme(theme, remember = true) {
    const dark = theme === 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    themeToggle.textContent = dark ? '☀︎' : '☾';
    themeToggle.title = dark ? 'Light mode' : 'Dark mode';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#121512' : '#f6f2ea';
    if (remember) localStorage.setItem(themeKey, dark ? 'dark' : 'light');
  }

  function applyLanguage(lang, remember = true) {
    document.documentElement.lang = lang === 'nl' ? 'nl' : 'zh-CN';
    langToggle.textContent = lang === 'nl' ? '中文' : 'NL';
    brandName.textContent = lang === 'nl' ? 'Evangeliekerk' : '福音教会';
    homeLink.textContent = lang === 'nl' ? 'Naar home' : '返回首页';
    themeToggle.setAttribute('aria-label', lang === 'nl' ? 'Wissel licht/donker' : '切换明暗模式');
    if (remember) localStorage.setItem(langKey, lang === 'nl' ? 'nl' : 'zh');
    render();
  }

  function dateLabel(value) {
    if (!value) return '';
    const date = new Date(`${value}T12:00:00`);
    return new Intl.DateTimeFormat(isNl() ? 'nl-NL' : 'zh-CN', {
      timeZone: 'Europe/Amsterdam',
      year: 'numeric', month: 'long', day: 'numeric',
    }).format(date);
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function safeLink(href, text, { external = false } = {}) {
    if (!href) return null;
    let url;
    try { url = new URL(href, location.origin); } catch { return null; }
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const link = el('a', '', text);
    link.href = url.href;
    if (external || url.origin !== location.origin) {
      link.target = '_blank';
      link.rel = 'noopener';
    }
    return link;
  }

  function articleParagraphs(container, text) {
    const normalized = String(text || '').replace(/\r\n?/g, '\n').trim();
    if (!normalized) {
      container.appendChild(el('p', '', isNl() ? 'Voor deze preek is nog geen artikel beschikbaar.' : '这篇讲道暂时还没有文章正文。'));
      return;
    }
    const chunks = normalized.split(/\n\s*\n+/).map((part) => part.trim()).filter(Boolean);
    const paragraphs = chunks.length > 1 ? chunks : normalized.split(/\n+/).map((part) => part.trim()).filter(Boolean);
    paragraphs.forEach((part) => container.appendChild(el('p', '', part)));
  }

  function renderNotFound() {
    page.replaceChildren();
    const card = el('section', 'state-card');
    card.appendChild(el('h1', '', isNl() ? 'Preek niet gevonden' : '没有找到这篇讲道'));
    card.appendChild(el('p', '', isNl() ? 'De preek bestaat niet of is nog niet gepubliceerd.' : '这篇讲道不存在，或者还没有正式发布。'));
    const back = el('a', 'btn primary', isNl() ? 'Terug naar home' : '返回首页');
    back.href = '/';
    card.appendChild(back);
    page.appendChild(card);
    document.title = isNl() ? 'Preek niet gevonden | Evangeliekerk' : '讲道未找到 | 福音教会';
  }

  function render() {
    if (!sermon) return;
    page.replaceChildren();

    const back = el('a', 'back', isNl() ? '← Terug naar home' : '← 返回首页');
    back.href = '/#sermons';
    page.appendChild(back);

    const header = el('header', 'article-header');
    header.appendChild(el('p', 'article-kicker', isNl() ? 'PREEK · EVANGELIEKERK' : '讲道 · EVANGELIEKERK'));
    const title = choose(sermon.title_zh, sermon.title_nl) || (isNl() ? 'Preek' : '讲道');
    header.appendChild(el('h1', '', title));
    const meta = el('div', 'article-meta');
    if (sermon.sermon_date) meta.appendChild(el('span', '', dateLabel(sermon.sermon_date)));
    if (sermon.speaker) meta.appendChild(el('span', '', sermon.speaker));
    if (sermon.scripture) meta.appendChild(el('span', '', sermon.scripture));
    header.appendChild(meta);
    page.appendChild(header);

    const summaryText = choose(sermon.summary_zh, sermon.summary_nl);
    if (summaryText) page.appendChild(el('div', 'article-summary', summaryText));

    const mediaAvailable = sermon.audio_url || sermon.youtube_url || sermon.transcript_url;
    if (mediaAvailable) {
      const media = el('section', 'media-box');
      media.appendChild(el('h2', '', isNl() ? 'Luisteren en bronnen' : '收听与资料'));
      if (sermon.audio_url) {
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.preload = 'metadata';
        audio.src = sermon.audio_url;
        media.appendChild(audio);
      }
      const actions = el('div', 'article-actions');
      const youtube = safeLink(sermon.youtube_url, 'YouTube', { external: true });
      const transcript = safeLink(sermon.transcript_url, isNl() ? 'Volledig transcript' : '完整转写稿');
      if (youtube) actions.appendChild(youtube);
      if (transcript) actions.appendChild(transcript);
      if (actions.children.length) media.appendChild(actions);
      page.appendChild(media);
    }

    const body = el('article', 'article-body');
    articleParagraphs(body, choose(sermon.article_zh, sermon.article_nl));
    page.appendChild(body);

    const footer = el('footer', 'article-footer', isNl()
      ? 'Dit artikel is op basis van een preektranscript door Sinan voorbereid en vóór publicatie door een mens beoordeeld.'
      : '本文由司南根据讲道录音转写整理，并在正式发布前经过人工审核。');
    page.appendChild(footer);

    document.title = `${title} | ${isNl() ? 'Evangeliekerk' : '福音教会'}`;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = summaryText || title;
  }

  async function load() {
    if (!sermonId) {
      renderNotFound();
      return;
    }
    try {
      const response = await fetch('/api/sermons', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      sermon = Array.isArray(body.sermons) ? body.sermons.find((item) => item && item.id === sermonId) : null;
      if (!sermon) {
        renderNotFound();
        return;
      }
      render();
    } catch {
      page.replaceChildren();
      const card = el('section', 'state-card');
      card.appendChild(el('h1', '', isNl() ? 'Kan de preek niet laden' : '讲道暂时加载失败'));
      card.appendChild(el('p', '', isNl() ? 'Probeer het later opnieuw.' : '请稍后再试。'));
      page.appendChild(card);
    }
  }

  const savedLang = localStorage.getItem(langKey) || 'zh';
  const savedTheme = localStorage.getItem(themeKey) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(savedTheme, false);
  applyLanguage(savedLang, false);

  langToggle.addEventListener('click', () => applyLanguage(isNl() ? 'zh' : 'nl'));
  themeToggle.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
  load();
})();
