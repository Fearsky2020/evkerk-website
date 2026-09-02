const CACHE = 'taalvia-lock-v0.5';
const CORE = ['./','./index.html','./lock.css?v=3','./brand-fix.css?v=1','./no-speech.css?v=1','./daily-limit.css?v=1','./lock-v2.js?v=1','./fit-word.js?v=1','./manifest.webmanifest','../icon.svg','../logo-approved.svg'];
const FREQ_HOST = 'raw.githubusercontent.com';

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('taalvia-lock-') && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const cacheable = url.origin === self.location.origin || url.hostname === FREQ_HOST;
  if (!cacheable) return;

  event.respondWith(caches.match(event.request).then(cached => {
    const network = fetch(event.request).then(response => {
      if (response && response.ok) caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
      return response;
    }).catch(() => cached);
    return cached || network;
  }));
});

self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type !== 'TAALVIA_LOCK_SHOW' || !data.card) return;
  const card = data.card;
  const bodyParts = [];
  if (card.showChinese && card.zh) bodyParts.push(card.zh);
  if (card.showExample && card.example) bodyParts.push(card.example);
  const total = Number(card.total) || 1;
  const title = `${card.display || card.word} · ${card.slot}/${total}`;
  event.waitUntil(self.registration.showNotification(title, {
    body: bodyParts.join('\n'),
    icon: '../icon.svg',
    badge: '../icon.svg',
    tag: 'taalvia-lock-card',
    renotify: true,
    silent: false,
    data: { url: `./?slot=${encodeURIComponent(card.slot || 1)}` }
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || './', self.registration.scope).href;
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(windows => {
    for (const client of windows) {
      if (client.url.startsWith(self.registration.scope) && 'focus' in client) {
        client.navigate(target);
        return client.focus();
      }
    }
    return clients.openWindow ? clients.openWindow(target) : undefined;
  }));
});
