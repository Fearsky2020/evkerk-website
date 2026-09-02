(() => {
  const host = location.hostname.toLowerCase();
  const params = new URLSearchParams(location.search);
  const isTaalvia = host === 'taalvia.nl' || host === 'www.taalvia.nl' || host === 'taalvia.com' || host === 'www.taalvia.com' || host.endsWith('.workers.dev') || params.get('brand') === 'taalvia';
  if (!isTaalvia) return;

  const html = document.documentElement;
  html.dataset.productHost = 'taalvia';

  document.title = 'TAALVIA · Leer Nederlands. Verbind werelden.';
  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = 'Praktisch Nederlands voor het dagelijks leven in Nederland, met uitleg in je eigen taal.';
  const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (appleTitle) appleTitle.content = 'TAALVIA';

  const brand = document.querySelector('.learn-brand');
  if (brand) {
    brand.href = '/';
    brand.setAttribute('aria-label', 'TAALVIA home');
    const mark = brand.querySelector('.brand-mark');
    if (mark) {
      mark.classList.add('taalvia-brand-mark');
      mark.innerHTML = '<img src="./icon.svg" alt="" width="40" height="40">';
    }
    const strong = brand.querySelector('.brand-copy strong');
    const small = brand.querySelector('.brand-copy small');
    if (strong) strong.textContent = 'TAALVIA';
    if (small) small.textContent = 'LEER NEDERLANDS';
  }

  const homeLink = document.querySelector('.home-link');
  if (homeLink) homeLink.hidden = true;

  const church = document.getElementById('churchDutch');
  if (church) church.hidden = true;

  const future = document.querySelector('.future-card');
  if (future) {
    const eyebrow = future.querySelector('.eyebrow');
    const heading = future.querySelector('h2');
    const copy = future.querySelector('.zh-help');
    const tags = future.querySelectorAll('.future-tags span');
    if (eyebrow) eyebrow.textContent = 'GROEI MET JE MEE';
    if (heading) heading.textContent = '从今天敢开口，到以后自然交流。';
    if (copy) copy.textContent = '自然语音、跟读反馈、情景陪练和跨设备进度会逐步加入。基础学习始终保持清楚、轻量，不让技术挡住你开始。';
    ['自然语音', '跟读反馈', '情景陪练', '跨设备进度'].forEach((label, index) => {
      if (tags[index]) tags[index].textContent = label;
    });
  }

  const footerLink = document.querySelector('.learn-footer a');
  if (footerLink) {
    footerLink.href = '/';
    footerLink.textContent = 'TAALVIA · taalvia.nl';
  }
})();