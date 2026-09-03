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
      .auto-location-list{display:grid;gap:18px}.auto-location-group{padding:16px;border:1px solid var(--line);border-radius:18px;background:color-mix(in srgb,var(--paper) 88%,#eaf8fd)}.auto-location-title{margin:0 0 14px;padding-left:12px;border-left:5px solid #12afe6;font-size:24px;font-weight:950;line-height:1.15;color:#087fae}.auto-event-list{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
      .auto-event{padding:17px;border:1px solid var(--line);border-radius:16px;background:var(--paper)}
      .auto-event time{font-size:12px;font-weight:850;color:var(--accent)}.auto-event h4{font-size:17px;margin:9px 0 7px}
      .auto-event p{margin:0;color:var(--muted);font-size:13px;line-height:1.55}.auto-event .auto-event-location{font-size:15px;font-weight:750;line-height:1.45;color:var(--ink)}.auto-event .auto-time{margin-top:10px;color:var(--ink);font-weight:750}.auto-event .auto-special-note{margin-top:8px;color:#9b5939;font-weight:800}.auto-joint-service{margin:0 0 18px;padding:20px 22px;border:2px solid #12afe6;border-radius:18px;background:linear-gradient(135deg,#eaf8fd,#fff);box-shadow:0 12px 30px rgba(8,127,174,.12)}.auto-joint-service time{display:block;color:#087fae;font-size:15px;font-weight:950}.auto-joint-service h4{margin:7px 0;font-size:24px}.auto-joint-service p{margin:3px 0;color:var(--ink);font-size:15px;font-weight:750}.auto-joint-service .auto-special-note{color:#9b5939;font-weight:900}
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
    const section = document.getElementById('gatherings');
    if (!section) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'auto-upcoming';
    const todayParts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/Amsterdam', year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(new Date()).map(part => [part.type, part.value]));
    const today = `${todayParts.year}-${todayParts.month}-${todayParts.day}`;
    let events = state.events.slice();
    if (today <= '2026-09-06') {
      events = events.filter(event => (event.date || event.start_at?.slice(0,10)) !== '2026-09-06');
      events.push({
        id: 'special-2026-09-06',
        date: '2026-09-06',
        title_zh: '联合崇拜暨洗礼',
        title_nl: 'Gezamenlijke dienst en doop',
        location: 'Evangeliekerk Zoetermeer · Piet Heinplein 13',
        start_time: '10:00',
        end_time: '12:00',
        notice_zh: 'Rijswijk 当天暂停聚会',
        notice_nl: 'Geen dienst in Rijswijk op deze dag'
      });
    }
    if (!events.length) return;
    const specialEvent = events.find(event => event.id === 'special-2026-09-06');
    const regularEvents = events.filter(event => event.id !== 'special-2026-09-06');
    const locationOrder = ['Rijswijk', 'Zoetermeer', '其他'];
    const groups = new Map(locationOrder.map(name => [name, []]));
    regularEvents.slice().sort((left,right) => String(left.start_at || left.date || '').localeCompare(String(right.start_at || right.date || ''))).forEach(event => {
      const place = String(event.location || '');
      const key = /rijswijk/i.test(place) ? 'Rijswijk' : /zoetermeer/i.test(place) ? 'Zoetermeer' : '其他';
      groups.get(key).push(event);
    });
    const visibleGroups = [...groups.entries()].filter(([,items]) => items.length).map(([place,items]) => [place,items.slice(0,6)]);
    wrapper.innerHTML = `
      <div class="auto-upcoming-head"><h3>${isNl() ? 'Komende bijeenkomsten per locatie' : '接下来聚会（按地点）'}</h3><span>${isNl() ? 'Automatisch bijgewerkt' : '自动更新'}</span></div>
      ${specialEvent ? `<article class="auto-joint-service"><time>${esc(dateLabel('2026-09-06'))}</time><h4>${esc(t(specialEvent.title_zh,specialEvent.title_nl))}</h4><p>${esc(specialEvent.location)}</p><p>${esc([specialEvent.start_time,specialEvent.end_time].join('–'))}</p><p class="auto-special-note">${esc(t(specialEvent.notice_zh,specialEvent.notice_nl))}</p></article>` : ''}
      <div class="auto-location-list">${visibleGroups.map(([place,items]) => `
        <section class="auto-location-group">
          <h4 class="auto-location-title">${esc(place === '其他' ? (isNl() ? 'Overige locaties' : '其他地点') : place)}</h4>
          <div class="auto-event-list">${items.map((event) => `
            <article class="auto-event">
              <time>${esc(dateLabel(event.date || event.start_at?.slice(0,10)))}</time>
              <h4>${esc(t(event.title_zh, event.title_nl))}</h4>
              <p class="auto-event-location">${esc(event.location || '')}</p>
              <p class="auto-time">${esc([event.start_time, event.end_time].filter(Boolean).join('–'))}</p>
              ${event.notice_zh ? `<p class="auto-special-note">${esc(t(event.notice_zh, event.notice_nl))}</p>` : ''}
            </article>`).join('')}</div>
        </section>`).join('')}</div>`;
    section.querySelector('.gathering-grid')?.insertAdjacentElement('afterend', wrapper);
  }

  function renderSermon() {
    const host = document.querySelector('.sermon-placeholder');
    if (!host || !state.sermons.length) return;
    const sermon = state.sermons[0];
    const articleAvailable = Boolean(sermon.article_zh || sermon.article_nl);
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
          ${articleAvailable ? `<a href="/sermon.html?id=${encodeURIComponent(sermon.id)}">${isNl() ? 'Lees artikel' : '阅读文章'}</a>` : ''}
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
