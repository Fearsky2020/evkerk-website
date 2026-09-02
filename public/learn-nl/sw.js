const CACHE = 'learn-nl-v0.12-core';
const CORE = [
  './',
  './index.html',
  './styles.css?v=1',
  './enhancements.css?v=2',
  './smart-tools.css?v=1',
  './weekly-practice.css?v=1',
  './portable.css?v=1',
  './opentaal-spell.css?v=1',
  './learning-loop.css?v=1',
  './daily-plan.css?v=1',
  './weekly-review.css?v=1',
  './self-check.css?v=1',
  './first-lesson.css?v=2',
  './level-picker.css?v=1',
  './level-content.css?v=1',
  './app.js?v=1',
  './practice.js?v=2',
  './smart-tools.js?v=1',
  './weekly-practice.js?v=1',
  './portable.js?v=1',
  './opentaal-spell.js?v=1',
  './learning-loop.js?v=1',
  './daily-plan.js?v=1',
  './weekly-review.js?v=1',
  './self-check.js?v=1',
  './first-lesson.js?v=2',
  './level-picker.js?v=1',
  './level-content.js?v=1',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('learn-nl-') && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate' && url.origin === self.location.origin) {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put('./index.html', copy));
      return response;
    }).catch(() => caches.match('./index.html')));
    return;
  }

  const cacheable = url.origin === self.location.origin || url.hostname === 'cdn.jsdelivr.net';
  if (!cacheable) return;

  event.respondWith(caches.match(request).then(cached => {
    const network = fetch(request).then(response => {
      if (response && response.ok) caches.open(CACHE).then(cache => cache.put(request, response.clone()));
      return response;
    }).catch(() => cached);
    return cached || network;
  }));
});