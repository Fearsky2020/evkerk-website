(() => {
  const LEVEL_KEY = 'learn-nl-level-v1';
  const FIRST_KEY = 'learn-nl-first-lesson-v1';

  function saveJson(key, value){
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

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

  // Remove only the legacy root-scoped learning worker/cache from early previews.
  // Brand rendering is intentionally not touched here: the approved logo assets
  // are declared directly in HTML and are never rewritten by JavaScript.
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
