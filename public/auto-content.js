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
      .auto-upcoming{margin-top:24px}.auto-upcoming-head{display:flex;justify-content:space-between;gap:16px;align-items:end;margin-bottom:12px}
      .auto-upcoming-head h3{margin:0;font-size:20px}.auto-upcoming-head span{font-size:12px;color:var(--muted)}
      .auto-event-list{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
      .auto-event{padding:17px;border:1px solid var(--line);border-radius:16px;background:var(--paper)}
      .auto-event time{font-size:12px;font-weight:850;color:var(--accent)}.auto-event h4{font-size:17px;margin:9px 0 7px}
      .auto-event p{margin:0;color:var(--muted);font-size:13px;line-height:1.55}.auto-event .auto-time{margin-top:10px;color:var(--ink);font-weight:750}
      .auto-sermon-meta{display:flex;gap:9px;flex-wrap:wrap;margin:8px 0 12px;color:var(--muted);font-size:13px}
      .auto-sermon-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:15px}.auto-sermon-actions a{padding:9px 12px;border-radius:9px;border:1px solid var(--line);text-decoration:none;font-weight:800;font-size:13px}
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
    if (!state.events.length) return;
    const section = document.getElementById('gatherings');
    if (!section) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'auto-upcoming';
    const events = state.events.slice(0, 6);
    wrapper.innerHTML = `
      <div class="auto-upcoming-head"><h3>${isNl() ? 'Komende bijeenkomsten' : '接下来几次聚会'}</h3><span>${isNl() ? 'Automatisch bijgewerkt' : '自动更新'}</span></div>
      <div class="auto-event-list">${events.map((event) => `
        <article class="auto-event">
          <time>${esc(dateLabel(event.date || event.start_at?.slice(0,10)))}</time>
          <h4>${esc(t(event.title_zh, event.title_nl))}</h4>
          <p>${esc(event.location || '')}</p>
          <p class="auto-time">${esc([event.start_time, event.end_time].filter(Boolean).join('–'))}</p>
        </article>`).join('')}</div>`;
    section.querySelector('.gathering-grid')?.insertAdjacentElement('afterend', wrapper);
  }

  function renderSermon() {
    const host = document.querySelector('.sermon-placeholder');
    if (!host || !state.sermons.length) return;
    const sermon = state.sermons[0];
    host.dataset.dynamic = '1';
    host.innerHTML = `
      <div class="play" aria-hidden="true">▶</div>
      <div>
        <span>${isNl() ? 'LAATSTE PREEK' : '最新讲道'}</span>
        <h3>${esc(t(sermon.title_zh, sermon.title_nl) || (isNl() ? 'Preek' : '讲道'))}</h3>
        <div class="auto-sermon-meta">
          ${sermon.sermon_date ? `<b>${esc(dateLabel(sermon.sermon_date))}</b>` : ''}
          ${sermon.speaker ? `<span>${esc(sermon.speaker)}</span>` : ''}
          ${sermon.scripture ? `<span>${esc(sermon.scripture)}</span>` : ''}
        </div>
        <p>${esc(t(sermon.summary_zh, sermon.summary_nl))}</p>
        <div class="auto-sermon-actions">
          ${sermon.youtube_url ? `<a href="${esc(sermon.youtube_url)}" target="_blank" rel="noopener">YouTube</a>` : ''}
          ${sermon.audio_url ? `<a href="${esc(sermon.audio_url)}" target="_blank" rel="noopener">${isNl() ? 'Audio' : '音频'}</a>` : ''}
          ${sermon.transcript_url ? `<a href="${esc(sermon.transcript_url)}" target="_blank" rel="noopener">${isNl() ? 'Transcript' : '文字稿'}</a>` : ''}
        </div>
      </div>`;
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
