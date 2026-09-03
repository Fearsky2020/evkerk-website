(() => {
  const carousel = document.querySelector('[data-carousel]');
  if (!carousel) return;
  const track = carousel.querySelector('.activity-track');
  const dotBox = carousel.querySelector('.carousel-dots');
  const categoryNames = {
    zh: { church: '教会活动', fellowship: '团契活动', small_group: '小组活动' },
    nl: { church: 'Gemeenteactiviteit', fellowship: 'Fellowship', small_group: 'Kringactiviteit' },
  };
  let records = [];
  let slides = [];
  let dots = [];
  let activeSlide = 0;
  let timer;
  let pointerStart = 0;

  function language() {
    return document.documentElement.lang === 'nl' ? 'nl' : 'zh';
  }

  function escapeText(value) {
    const node = document.createElement('span');
    node.textContent = value || '';
    return node.innerHTML;
  }

  function caption(record) {
    const lang = language();
    const title = lang === 'nl' && record.title_nl ? record.title_nl : record.title_zh;
    return {
      category: categoryNames[lang][record.category] || categoryNames[lang].church,
      title,
      meta: [record.event_date, record.location].filter(Boolean).join(' · '),
    };
  }

  function updateCaptions() {
    records.forEach((record, index) => {
      const text = caption(record);
      const slide = slides[index];
      if (!slide) return;
      slide.querySelector('.activity-type').textContent = text.category;
      slide.querySelector('h3').textContent = text.title;
      slide.querySelector('p').textContent = text.meta;
    });
  }

  function render(items) {
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

  function showSlide(index) {
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
  new MutationObserver(updateCaptions).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  fetch('/api/activities')
    .then(response => response.ok ? response.json() : Promise.reject(new Error('activities unavailable')))
    .then(body => { if (body.activities?.length) render(body.activities); else renderFallback(); })
    .catch(renderFallback);

  function renderFallback() {
    slides = [...carousel.querySelectorAll('[data-slide]')];
    dots = [...carousel.querySelectorAll('[data-carousel-dot]')];
    dots.forEach((dot, index) => dot.addEventListener('click', () => { showSlide(index); start(); }));
    showSlide(0);
    start();
  }
})();
