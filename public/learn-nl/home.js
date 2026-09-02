(() => {
  const LEVEL_KEY = 'learn-nl-level-v1';
  const FIRST_KEY = 'learn-nl-first-lesson-v1';

  function saveJson(key, value){
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  function installLockedBrand(){
    const style = document.createElement('style');
    style.textContent = `
      .brand-lockup .brand-icon,.brand-lockup .brand-wording{display:none!important}
      .brand-logo-full{display:block;width:220px;height:auto;max-width:none}
      .footer-lockup .brand-logo-full{width:238px}
      @media(max-width:1080px){.brand-logo-full{width:196px}}
      @media(max-width:860px){.brand-logo-full{width:184px}.footer-lockup .brand-logo-full{width:210px}}
      @media(max-width:420px){.brand-logo-full{width:166px}}
    `;
    document.head.appendChild(style);

    document.querySelectorAll('.brand-lockup').forEach(lockup => {
      const isFooter = lockup.classList.contains('footer-lockup');
      const img = document.createElement('img');
      img.className = 'brand-logo-full';
      img.src = isFooter ? '/brand-logo-dark.svg' : '/brand-logo.svg';
      img.alt = 'TAALVIA — Leer Nederlands. Verbind werelden.';
      img.width = isFooter ? 238 : 220;
      img.height = 52;
      lockup.replaceChildren(img);
    });
  }

  installLockedBrand();

  function chooseLevel(level){
    saveJson(LEVEL_KEY, level);
    location.href = '/learn/';
  }

  document.querySelectorAll('[data-level]').forEach(button => {
    button.addEventListener('click', () => chooseLevel(button.dataset.level));
  });

  document.querySelectorAll('a[href="/learn/"]').forEach(link => {
    link.addEventListener('click', () => {
      if (!localStorage.getItem(LEVEL_KEY)) saveJson(LEVEL_KEY, 'start');
    });
  });

  const desktopNav = document.querySelector('.desktop-nav');
  if (desktopNav && !desktopNav.querySelector('a[href="/lock/"]')) {
    const link = document.createElement('a');
    link.href = '/lock/';
    link.textContent = '锁屏单词';
    const about = desktopNav.querySelector('a[href="#about"]');
    desktopNav.insertBefore(link, about || null);
  }

  const menu = document.querySelector('.menu-button');
  const mobile = document.getElementById('mobileNav');
  if (mobile && !mobile.querySelector('a[href="/lock/"]')) {
    const link = document.createElement('a');
    link.href = '/lock/';
    link.textContent = '锁屏单词';
    const learn = mobile.querySelector('a[href="/learn/"]');
    mobile.insertBefore(link, learn || null);
  }

  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    if (mobile) mobile.hidden = !open;
  });
  mobile?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    if (mobile) mobile.hidden = true;
    menu?.setAttribute('aria-expanded', 'false');
  }));

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        try {
          const scope = new URL(registration.scope);
          if (scope.pathname === '/') registration.unregister();
        } catch (_) {}
      });
    }).catch(() => {});
  }

  if ('caches' in window) {
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('learn-nl-')).map(key => caches.delete(key)))).catch(() => {});
  }

  void FIRST_KEY;
})();
