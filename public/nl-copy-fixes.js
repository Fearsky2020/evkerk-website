(() => {
  const fixes = {
    'nav.welcome': 'Nieuw hier?',
    'hero.primary': 'Bekijk de samenkomsten',
    'hero.secondary': 'Nieuw hier?',
    'activities.text': 'Gemeenteactiviteiten, ontmoetingen en kringleven vind je hier. De foto’s wisselen automatisch; je kunt ook de pijlen gebruiken.',
    'activities.gathering': 'Zondagsdienst',
    'welcome.1.title': 'We heten je welkom',
    'schedule.serviceCourse': 'Toerustingscursus voor medewerkers'
  };

  function apply() {
    if (document.documentElement.lang !== 'nl') return;
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      const value = fixes[node.dataset.i18n];
      if (value) node.textContent = value;
    });
  }

  apply();
  new MutationObserver(apply).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang']
  });
})();
