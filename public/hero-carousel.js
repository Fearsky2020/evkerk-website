(() => {
  if (!document.querySelector('link[data-bingbing-feedback-fixes]')) {
    const feedbackStyles = document.createElement('link');
    feedbackStyles.rel = 'stylesheet';
    feedbackStyles.href = '/feedback-fixes.css?v=1';
    feedbackStyles.dataset.bingbingFeedbackFixes = 'true';
    document.head.appendChild(feedbackStyles);
  }

  const cover = document.querySelector('.home-cover');
  const legacyFigure = document.querySelector('.hero-visual');
  const root = cover || legacyFigure;
  if (!root) return;

  const image = cover
    ? cover.querySelector('.home-cover-photo')
    : legacyFigure.querySelector('img');
  const title = cover
    ? cover.querySelector('.home-cover-caption span:first-child')
    : legacyFigure.querySelector('.hero-photo-note strong');
  const subtitle = cover
    ? cover.querySelector('.home-cover-caption span:last-child')
    : legacyFigure.querySelector('.hero-photo-note span');

  if (!image) return;

  const churchSlides = [
    { image_url: '/assets/zoetermeer-sanctuary.webp', title_zh: 'Zoetermeer 基督教福音教会', title_nl: 'Evangeliekerk Zoetermeer', subtitle_zh: '每周日 10:00–12:00', subtitle_nl: 'Elke zondag 10:00–12:00' },
    { image_url: '/assets/rijswijk-3384.webp', title_zh: 'Rijswijk 基督教福音教会', title_nl: 'Evangeliekerk Rijswijk', subtitle_zh: 'Oranjelaan 62 · Rijswijk', subtitle_nl: 'Oranjelaan 62 · Rijswijk' },
    { image_url: '/assets/rijswijk-3389.webp', title_zh: 'Rijswijk 教会礼堂', title_nl: 'Kerkzaal Rijswijk', subtitle_zh: '每周日中文聚会', subtitle_nl: 'Chinese dienst op zondag' },
    { image_url: '/assets/rijswijk-3618.webp', title_zh: 'Rijswijk 主日敬拜', title_nl: 'Zondagsdienst in Rijswijk', subtitle_zh: '在敬拜与真理中一同成长', subtitle_nl: 'Samen groeien in aanbidding en waarheid' },
  ];

  let slides = [...churchSlides];
  let index = 0;
  let timer;

  const lang = () => document.documentElement.lang === 'nl' ? 'nl' : 'zh';
  const text = (slide, key) => lang() === 'nl'
    ? (slide[`${key}_nl`] || slide[`${key}_zh`] || '')
    : (slide[`${key}_zh`] || slide[`${key}_nl`] || '');

  function applySlide(slide) {
    image.src = slide.image_url;
    image.alt = text(slide, 'title') || 'Evangeliekerk';
    if (title) title.textContent = text(slide, 'title');
    if (subtitle) subtitle.textContent = text(slide, 'subtitle');
  }

  function show(next) {
    if (!slides.length) return;
    index = (next + slides.length) % slides.length;
    const slide = slides[index];
    image.classList.add('is-changing');
    const preload = new Image();
    preload.onload = () => {
      applySlide(slide);
      requestAnimationFrame(() => image.classList.remove('is-changing'));
    };
    preload.onerror = () => image.classList.remove('is-changing');
    preload.src = slide.image_url;
  }

  function start() {
    clearInterval(timer);
    if (slides.length > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      timer = setInterval(() => show(index + 1), 6000);
    }
  }

  new MutationObserver(() => show(index)).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang'],
  });

  show(0);
  start();

  fetch('/api/hero-slides', { headers: { Accept: 'application/json' } })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))
    .then((body) => {
      const managed = Array.isArray(body.slides) ? body.slides.filter((slide) => slide?.image_url) : [];
      // If editors have uploaded homepage images, treat those as the homepage source of truth.
      // Built-in photos are only a safe fallback when no managed slides exist yet.
      slides = managed.length ? managed : [...churchSlides];
      index = 0;
      show(0);
      start();
    })
    .catch(() => {
      slides = [...churchSlides];
      index = 0;
      show(0);
      start();
    });

  root.addEventListener('mouseenter', () => clearInterval(timer));
  root.addEventListener('mouseleave', start);
})();
