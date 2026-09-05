(() => {
  const dutchFixes = {
    'nav.welcome': 'Nieuw hier?',
    'hero.primary': 'Bekijk de samenkomsten',
    'hero.secondary': 'Nieuw hier?',
    'activities.text': 'Gemeenteactiviteiten, ontmoetingen en kringleven vind je hier. De foto’s wisselen automatisch; je kunt ook de pijlen gebruiken.',
    'activities.gathering': 'Zondagsdienst',
    'welcome.1.title': 'We heten je welkom',
    'schedule.serviceCourse': 'Toerustingscursus voor medewerkers'
  };

  function ensureWelcomeStyle() {
    if (document.getElementById('welcome-title-layout-fix')) return;
    const style = document.createElement('style');
    style.id = 'welcome-title-layout-fix';
    style.textContent = `
      @media (min-width: 901px) {
        .home-page .welcome .section-heading h2[data-i18n="welcome.title"] {
          max-width: 10.5em;
          font-size: clamp(38px, 2.75vw, 46px);
          line-height: 1.12;
          letter-spacing: -.035em;
          text-wrap: initial;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function apply() {
    ensureWelcomeStyle();
    const lang = document.documentElement.lang;
    const welcomeTitle = document.querySelector('[data-i18n="welcome.title"]');

    if (lang === 'nl') {
      document.querySelectorAll('[data-i18n]').forEach((node) => {
        const value = dutchFixes[node.dataset.i18n];
        if (value) node.textContent = value;
      });
      if (welcomeTitle) welcomeTitle.textContent = 'Voor je eerste bezoek hoef je niets voor te bereiden.';
      return;
    }

    if (welcomeTitle) {
      welcomeTitle.innerHTML = '第一次来，<br>不需要准备什么。';
    }
  }

  apply();
  new MutationObserver(apply).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang']
  });
})();
