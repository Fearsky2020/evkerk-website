(() => {
  const state = { events: [], sermons: [], announcements: [] };

  function isNl() { return document.documentElement.lang === 'nl'; }
  function t(zh, nl) { return isNl() ? (nl || zh || '') : (zh || nl || ''); }
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function dateLabel(date) {
    if (!date) return '';
    const d = new Date(`${date}T12:00:00`);
    return new Intl.DateTimeFormat(isNl() ? 'nl-NL' : 'zh-CN', {
      timeZone: 'Europe/Amsterdam', weekday: 'short', day: 'numeric', month: 'short'
    }).format(d);
  }

  function ensureStyles() {
    if (document.getElementById('autoContentStyles')) return;
    const style = document.createElement('style');
    style.id = 'autoContentStyles';
    style.textContent = `
      .auto-announcements{width:min(1180px,calc(100% - 36px));margin:0 auto 18px;display:grid;gap:10px}
      .auto-announcement{display:flex;gap:18px;align-items:flex-start;padding:15px 18px;border:1px solid var(--line);border-radius:16px;background:var(--paper)}
      .auto-announcement strong{min-width:78px;color:var(--accent);font-size:12px;letter-spacing:.12em;text-transform:uppercase}
      .auto-announcement h3{margin:0 0 5px;font-size:17px}.auto-announcement p{margin:0;color:var(--muted);line-height:1.55}
      .auto-upcoming{margin:18px 0 24px}.auto-upcoming-head{display:flex;justify-content:space-between;gap:16px;align-items:end;margin-bottom:12px}
      .auto-upcoming-head h3{margin:0;font-size:20px}.auto-upcoming-head span{font-size:12px;color:var(--muted)}
      .auto-location-list{display:grid;gap:18px}.auto-location-group{padding:16px;border:1px solid var(--line);border-radius:18px;background:color-mix(in srgb,var(--paper) 88%,#eaf8fd)}.auto-location-title{margin:0 0 14px;padding-left:12px;border-left:5px solid #12afe6;font-size:24px;font-weight:950;line-height:1.15;color:#087fae}.auto-event-list{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
      .auto-event{padding:17px;border:1px solid var(--line);border-radius:16px;background:var(--paper)}
      .auto-event time{font-size:12px;font-weight:850;color:var(--accent)}.auto-event h4{font-size:17px;margin:9px 0 7px}
      .auto-event p{margin:0;color:var(--muted);font-size:13px;line-height:1.55}.auto-event .auto-event-location{font-size:15px;font-weight:750;line-height:1.45;color:var(--ink)}.auto-event .auto-time{margin-top:10px;color:var(--ink);font-weight:750}.auto-event .auto-special-note{margin-top:8px;color:#9b5939;font-weight:800}.auto-joint-service{margin:0;padding:20px 22px;border:2px solid #12afe6;border-radius:18px;background:linear-gradient(135deg,#eaf8fd,#fff);box-shadow:0 12px 30px rgba(8,127,174,.12)}.auto-joint-service time{display:block;color:#087fae;font-size:15px;font-weight:950}.auto-joint-service h4{margin:7px 0;font-size:24px}.auto-joint-service p{margin:3px 0;color:var(--ink);font-size:15px;font-weight:750}.auto-joint-service .auto-special-note{color:#9b5939;font-weight:900}
      .auto-sermon-meta{display:flex;gap:12px;flex-wrap:wrap;margin:10px 0 0;color:var(--muted);font-size:15px;line-height:1.5}
      .auto-sermon-scripture{max-width:760px;margin:8px 0 0!important;color:#9b5939!important;font-size:17px!important;font-weight:750;line-height:1.65!important}
      .auto-sermon-title-link{color:inherit;text-decoration:none}.auto-sermon-title-link:hover{text-decoration:underline;text-decoration-color:var(--brand-blue);text-underline-offset:5px}.auto-sermon-title-link:focus-visible{outline:3px solid rgba(17,171,227,.3);outline-offset:4px;border-radius:4px}
      .auto-sermon-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:15px}.auto-sermon-actions a{padding:9px 12px;border-radius:9px;border:1px solid var(--line);text-decoration:none;font-weight:800;font-size:13px}
      button.sermon-play-toggle{border:0;padding:0;flex:0 0 auto;cursor:pointer;font:inherit;display:grid;place-items:center}
      button.sermon-play-toggle:hover{transform:scale(1.04);box-shadow:0 14px 30px rgba(8,127,174,.28)}
      button.sermon-play-toggle:focus-visible{outline:4px solid rgba(17,171,227,.3);outline-offset:4px}
      button.sermon-play-toggle.is-playing{background:linear-gradient(135deg,#075f84,#0b8fbe)}
      button.sermon-play-toggle span{color:#fff!important;font-size:30px;font-weight:900;line-height:1;margin-left:4px;text-shadow:none}
      button.sermon-play-toggle.is-playing span{margin-left:0;font-size:27px}
      @media(max-width:900px){.auto-event-list{grid-template-columns:1fr 1fr}}
      @media(max-width:640px){.auto-announcements{width:min(100% - 24px,1180px)}.auto-announcement{display:block}.auto-announcement strong{display:block;margin-bottom:7px}.auto-event-list{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function renderAnnouncements() {
    document.querySelector('.auto-announcements')?.remove();
    if (!state.announcements.length) return;
    const host = document.createElement('section');
    host.className = 'auto-announcements';
    host.innerHTML = state.announcements.slice(0, 3).map((item) => `
      <article class="auto-announcement">
        <strong>${isNl() ? 'MEDEDELING' : '教会通知'}</strong>
        <div><h3>${esc(t(item.title_zh, item.title_nl))}</h3><p>${esc(t(item.body_zh, item.body_nl))}</p></div>
      </article>`).join('');
    document.querySelector('.hero')?.insertAdjacentElement('afterend', host);
  }

  function renderEvents() {
    document.querySelector('.auto-upcoming')?.remove();
    const section = document.getElementById('gatherings');
    if (!section) return;
    const todayParts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/Amsterdam', year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(new Date()).map(part => [part.type, part.value]));
    const today = `${todayParts.year}-${todayParts.month}-${todayParts.day}`;
    if (today > '2026-09-06') return;
    const wrapper = document.createElement('div');
    wrapper.className = 'auto-upcoming auto-upcoming-compact';
    wrapper.innerHTML = `
      <article class="auto-joint-service">
        <time>${esc(dateLabel('2026-09-06'))}</time>
        <h4>${isNl() ? 'Gezamenlijke dienst en doop' : '联合崇拜暨洗礼'}</h4>
        <p>Evangeliekerk Zoetermeer · Piet Heinplein 13 · 10:00–12:00</p>
        <p class="auto-special-note">${isNl() ? 'Geen dienst in Rijswijk op deze dag' : 'Rijswijk 当天暂停聚会'}</p>
      </article>`;
    section.querySelector('.section-heading')?.insertAdjacentElement('afterend', wrapper);
  }

  function renderSermon() {
    const host = document.querySelector('.sermon-placeholder');
    if (!host || !state.sermons.length) return;
    const sermon = state.sermons[0];
    const summary = t(sermon.summary_zh, sermon.summary_nl);
    host.dataset.dynamic = '1';
    host.innerHTML = `
      <div class="latest-sermon-main">
        ${sermon.audio_url
          ? `<button class="play sermon-play-toggle" type="button" aria-label="${isNl() ? 'Speel de preek af' : '播放讲道'}" aria-pressed="false"><span aria-hidden="true">▶</span></button>`
          : `<div class="play" aria-hidden="true">▶</div>`}
        <div>
          <span>${isNl() ? 'LAATSTE PREEK' : '最新讲道'}</span>
          <h3><a class="auto-sermon-title-link" href="/sermon.html?id=${encodeURIComponent(sermon.id)}">${esc(t(sermon.title_zh, sermon.title_nl) || (isNl() ? 'Preek' : '讲道'))}</a></h3>
          <div class="auto-sermon-meta">
            ${sermon.sermon_date ? `<b>${esc(dateLabel(sermon.sermon_date))}</b>` : ''}
            ${sermon.speaker ? `<span>${esc(sermon.speaker)}</span>` : ''}
          </div>
          ${sermon.scripture ? `<p class="auto-sermon-scripture">${esc(sermon.scripture)}</p>` : ''}
          ${sermon.youtube_url ? `<div class="auto-sermon-actions"><a href="${esc(sermon.youtube_url)}" target="_blank" rel="noopener">YouTube</a></div>` : ''}
        </div>
      </div>
      <aside class="sermon-summary-band">
        <strong>${isNl() ? 'KORTE SAMENVATTING' : '信息摘要'}</strong>
        <p>${esc(summary || (isNl() ? 'De korte samenvatting verschijnt hier zodra deze is toegevoegd.' : '后台填写讲道摘要后，会自动显示在这里。'))}</p>
      </aside>
      ${sermon.audio_url ? `<audio class="latest-sermon-audio" preload="metadata" src="${esc(sermon.audio_url)}"></audio>` : ''}`;
    const playButton = host.querySelector('.sermon-play-toggle');
    const audio = host.querySelector('.latest-sermon-audio');
    if (playButton && audio) {
      const setPlaying = (playing) => {
        playButton.classList.toggle('is-playing', playing);
        playButton.setAttribute('aria-pressed', String(playing));
        playButton.setAttribute('aria-label', isNl()
          ? (playing ? 'Pauzeer de preek' : 'Speel de preek af')
          : (playing ? '暂停讲道' : '播放讲道'));
        playButton.querySelector('span').textContent = playing ? 'Ⅱ' : '▶';
      };
      playButton.addEventListener('click', async () => {
        if (audio.paused) {
          try { await audio.play(); setPlaying(true); }
          catch { setPlaying(false); }
        } else {
          audio.pause();
          setPlaying(false);
        }
      });
      audio.addEventListener('play', () => setPlaying(true));
      audio.addEventListener('pause', () => setPlaying(false));
      audio.addEventListener('ended', () => setPlaying(false));
    }
  }

  function renderAll() {
    ensureStyles();
    renderAnnouncements();
    renderEvents();
    renderSermon();
  }

  async function load() {
    const [events, sermons, announcements] = await Promise.all([
      fetch('/api/events', {headers:{Accept:'application/json'}}).then(r => r.ok ? r.json() : {events:[]}).catch(() => ({events:[]})),
      fetch('/api/sermons', {headers:{Accept:'application/json'}}).then(r => r.ok ? r.json() : {sermons:[]}).catch(() => ({sermons:[]})),
      fetch('/api/announcements', {headers:{Accept:'application/json'}}).then(r => r.ok ? r.json() : {announcements:[]}).catch(() => ({announcements:[]})),
    ]);
    state.events = events.events || [];
    state.sermons = sermons.sermons || [];
    state.announcements = announcements.announcements || [];
    renderAll();
  }

  const observer = new MutationObserver((mutations) => {
    if (mutations.some(m => m.type === 'attributes' && m.attributeName === 'lang')) renderAll();
  });
  observer.observe(document.documentElement, {attributes:true, attributeFilter:['lang']});
  load();
})();
