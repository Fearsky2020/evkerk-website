(() => {
  const carousel = document.querySelector('[data-carousel]');
  if (!carousel) return;
  const track = carousel.querySelector('.activity-track');
  const dotBox = carousel.querySelector('.carousel-dots');
  const summaryBox = document.querySelector('[data-activity-summaries]');
  const categoryNames = {
    zh: { church: '教会活动', fellowship: '团契活动', small_group: '小组活动' },
    nl: { church: 'Gemeenteactiviteit', fellowship: 'Fellowship', small_group: 'Kringactiviteit' },
  };
  let albums = [];
  let upcomingEvents = [];
  let records = [];
  let slides = [];
  let dots = [];
  let activeSlide = 0;
  let activeAlbumId = '';
  let timer;
  let pointerStart = 0;

  const language = () => document.documentElement.lang === 'nl' ? 'nl' : 'zh';
  function escapeText(value) {
    const node = document.createElement('span');
    node.textContent = value || '';
    return node.innerHTML;
  }
  function caption(record) {
    const lang = language();
    return {
      category: categoryNames[lang][record.category] || categoryNames[lang].church,
      title: lang === 'nl' && record.title_nl ? record.title_nl : record.title_zh,
      meta: [record.event_date, record.location].filter(Boolean).join(' · '),
    };
  }
  function groupAlbums(items) {
    const map = new Map();
    items.forEach(record => {
      const id = record.album_id || record.id;
      if (!map.has(id)) map.set(id, { id, lead: record, photos: [] });
      map.get(id).photos.push(record);
    });
    return [...map.values()];
  }
  function renderSummaries() {
    if (!summaryBox) return;
    const lang = language();
    summaryBox.innerHTML = albums.slice(0, 2).map(album => {
      const text = caption(album.lead);
      const count = album.photos.length;
      const countLabel = lang === 'nl' ? `${count} foto's` : `${count} 张照片`;
      return `<button class="activity-summary${album.id === activeAlbumId ? ' is-active' : ''}" type="button" data-album-id="${escapeText(album.id)}">
        <img src="${escapeText(album.lead.image_url)}" alt="">
        <span><small>${escapeText(text.category)} · ${countLabel}</small><strong>${escapeText(text.title)}</strong><em>${escapeText(text.meta)}</em></span>
      </button>`;
    }).join('');
    summaryBox.querySelectorAll('[data-album-id]').forEach(button => button.addEventListener('click', () => {
      selectAlbum(button.dataset.albumId);
    }));
  }
  function renderUpcoming() {
    const host = document.querySelector('[data-activity-upcoming]');
    if (!host) return;
    const nowParts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(part => [part.type,part.value]));
    const today = `${nowParts.year}-${nowParts.month}-${nowParts.day}`;
    const items = upcomingEvents
      .filter(event => String(event.date || event.start_at || '').slice(0,10) >= today)
      .sort((a,b) => String(a.start_at || a.date || '').localeCompare(String(b.start_at || b.date || '')))
      .slice(0,2);
    if (!items.length) { host.hidden = true; host.innerHTML = ''; return; }
    host.hidden = false;
    host.innerHTML = `<div class="activity-upcoming-head"><span>${language() === 'nl' ? 'BINNENKORT' : '接下来'}</span><h3>${language() === 'nl' ? 'Wat staat er op de agenda?' : '接下来会发生什么？'}</h3></div>
      <div class="activity-upcoming-list">${items.map(event => {
        const rawDate = String(event.date || event.start_at || '').slice(0,10);
        const date = rawDate ? new Intl.DateTimeFormat(language() === 'nl' ? 'nl-NL' : 'zh-CN',{timeZone:'Europe/Amsterdam',month:'short',day:'numeric',weekday:'short'}).format(new Date(`${rawDate}T12:00:00`)) : '';
        const title = language() === 'nl' ? (event.title_nl || event.title_zh) : (event.title_zh || event.title_nl);
        const time = [event.start_time,event.end_time].filter(Boolean).join('–');
        return `<article><time>${escapeText(date)}</time><h4>${escapeText(title || (language() === 'nl' ? 'Samenkomst' : '聚会'))}</h4><p>${escapeText([time,event.location].filter(Boolean).join(' · '))}</p></article>`;
      }).join('')}</div>`;
  }

  function buildSlides(items) {
    records = items;
    track.innerHTML = items.map((record, index) => {
      const text = caption(record);
      return `<article class="activity-slide${index === 0 ? ' is-active' : ''}" data-slide aria-hidden="${index ? 'true' : 'false'}">
        <img src="${escapeText(record.image_url)}" alt="${escapeText(text.title)}" loading="lazy">
        <div class="activity-caption"><span class="activity-type">${escapeText(text.category)}</span><h3>${escapeText(text.title)}</h3><p>${escapeText(text.meta)}</p></div>
      </article>`;
    }).join('');
    dotBox.innerHTML = items.map((_, index) => `<button class="${index === 0 ? 'is-active' : ''}" type="button" data-carousel-dot="${index}" aria-label="${index + 1}" aria-selected="${index === 0}"></button>`).join('');
    slides = [...carousel.querySelectorAll('[data-slide]')];
    dots = [...carousel.querySelectorAll('[data-carousel-dot]')];
    dots.forEach((dot, index) => dot.addEventListener('click', () => { showSlide(index); start(); }));
    showSlide(0);
    start();
  }
  function selectAlbum(id) {
    const album = albums.find(item => item.id === id);
    if (!album) return;
    activeAlbumId = id;
    buildSlides(album.photos);
    renderSummaries();
  }
  function render(items) {
    albums = groupAlbums(items);
    if (albums.length) selectAlbum(albums[0].id);
  }
  function updateLanguage() {
    records.forEach((record, index) => {
      const slide = slides[index];
      if (!slide) return;
      const text = caption(record);
      slide.querySelector('.activity-type').textContent = text.category;
      slide.querySelector('h3').textContent = text.title;
      slide.querySelector('p').textContent = text.meta;
    });
    renderSummaries();
    renderUpcoming();
  }
  function showSlide(index) {
    if (!slides.length) return;
    activeSlide = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      const active = i === activeSlide;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', String(!active));
    });
    dots.forEach((dot, i) => {
      const active = i === activeSlide;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-selected', String(active));
    });
  }
  function stop() { clearInterval(timer); }
  function start() {
    stop();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches && slides.length > 1) {
      timer = setInterval(() => showSlide(activeSlide + 1), 5500);
    }
  }
  carousel.querySelector('[data-carousel-prev]').addEventListener('click', () => { showSlide(activeSlide - 1); start(); });
  carousel.querySelector('[data-carousel-next]').addEventListener('click', () => { showSlide(activeSlide + 1); start(); });
  carousel.addEventListener('mouseenter', stop);
  carousel.addEventListener('mouseleave', start);
  carousel.addEventListener('focusin', stop);
  carousel.addEventListener('focusout', start);
  carousel.addEventListener('pointerdown', event => { pointerStart = event.clientX; });
  carousel.addEventListener('pointerup', event => {
    const distance = event.clientX - pointerStart;
    if (Math.abs(distance) > 50) showSlide(activeSlide + (distance < 0 ? 1 : -1));
    start();
  });
  new MutationObserver(updateLanguage).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  Promise.all([
    fetch('/api/activities').then(response => response.ok ? response.json() : Promise.reject(new Error('activities unavailable'))),
    fetch('/api/events', {headers:{Accept:'application/json'}}).then(response => response.ok ? response.json() : {events:[]}).catch(() => ({events:[]}))
  ]).then(([activityBody,eventBody]) => {
    // This panel is for one-off church activities entered by an administrator.
    // Recurring Sunday services and other calendar-synced gatherings stay out.
    upcomingEvents = (eventBody.events || []).filter(event => event.source === 'manual');
    if (activityBody.activities?.length) render(activityBody.activities); else renderFallback();
    renderUpcoming();
  }).catch(() => { renderFallback(); renderUpcoming(); });

  function renderFallback() {
    slides = [...carousel.querySelectorAll('[data-slide]')];
    dots = [...carousel.querySelectorAll('[data-carousel-dot]')];
    dots.forEach((dot, index) => dot.addEventListener('click', () => { showSlide(index); start(); }));
    showSlide(0);
    start();
  }
})();
