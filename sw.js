/* XER Holdpoint service worker.
 *
 * The application is a single self-contained file that makes no network calls of any kind. This
 * worker exists only so the app is installable and works with no connection at all.
 *
 * IMPORTANT - why this is network-first for the application itself:
 * A cache-first worker serves its stored copy of index.html forever, so a corrected build uploaded
 * to the host never reaches anyone who already has the app open or installed. That is a silent
 * failure and a bad one. So:
 *   - the application, manifest and scripts are fetched from the network first, falling back to
 *     cache only when there is genuinely no connection;
 *   - icons are cache-first, because they do not change within a revision;
 *   - VERSION is bumped on every release, which purges every older cache on activation.
 *
 * When you ship a new revision, change VERSION. That one line is what makes the update land.
 */
const VERSION = 'rev-3-2';
const CACHE   = 'holdpoint-' + VERSION;
const SHELL   = ['./', './index.html', './manifest.json',
                 './icons/icon_192x192.png', './icons/icon_512x512.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isDocument = req.mode === 'navigate'
    || url.pathname.endsWith('.html')
    || url.pathname.endsWith('/')
    || url.pathname.endsWith('.json')
    || url.pathname.endsWith('.js');

  if (isDocument) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }))
  );
});
