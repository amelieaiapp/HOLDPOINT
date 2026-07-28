/* XER Holdpoint service worker.
   The application is a single self-contained file with no network calls of any kind. This worker
   exists only so the app is installable and works with no connection at all. It caches the shell
   on install and serves from cache first. It never contacts anything else, ever. */
const CACHE = 'holdpoint-v3-0';
const SHELL = ['./', './index.html', './manifest.json',
               './icons/icon_192x192.png', './icons/icon_512x512.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).catch(() => caches.match('./index.html')))
  );
});
