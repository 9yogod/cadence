/* Offline support + home-screen install for Cadence.

   Strategy, deliberately simple because this is a static site with no API of its own:
   - The shell (index.html, CSS, manifest, icons) is precached on install, so a cold
     launch from the home screen works with no network at all.
   - Every other same-origin GET (the ES modules under js/, including the data files)
     is stale-while-revalidate: served instantly from cache, refreshed in the
     background, so a deploy lands on the next launch.
   - Cross-origin requests (Google Fonts, the Gemini API, the transformers.js CDN and
     the Whisper model) are never touched — they must not be cached or intercepted.

   Bump VERSION on any release that changes the shell; activate() drops older caches. */
const VERSION = 'cadence-v1';
const SHELL = [
  './',
  './index.html',
  './css/style.css',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      // addAll is all-or-nothing; add individually so one bad path can't break install
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // fonts, Gemini, model CDN: pass through

  // Navigations: network first, so a fresh index.html wins when online, cache when not.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // Everything else: stale-while-revalidate.
  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req)
        .then(res => {
          if (res && res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(VERSION).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
