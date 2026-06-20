/* World Cup 2026 Live Hub — service worker
   App shell is cache-first (works offline / Add to Home Screen); the live
   data feed and flag images are network-first with a cached fallback. */
'use strict';

const CACHE = 'wc2026-v1';
// Relative URLs so it works under any sub-path (GitHub Pages, githack, root).
const SHELL = [
  './', 'index.html',
  'assets/styles.css', 'assets/app.js',
  'data/worldcup.json', 'manifest.webmanifest', 'icon.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => {}) // don't block install if one asset 404s under a sub-path
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Cross-origin (openfootball feed, flagcdn): network-first, fall back to cache.
  if (url.origin !== location.origin) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // Same-origin app shell: serve from cache instantly, refresh in the background.
  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
