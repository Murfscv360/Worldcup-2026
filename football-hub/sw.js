/* Football Hub — service worker
   App shell is NETWORK-FIRST so the installed (Add-to-Home-Screen) app always
   updates to the latest deploy when online, and still works offline from cache. */
'use strict';

const BUILD = '__BUILD__';
const CACHE = 'football-hub-' + BUILD;
const SHELL = [
  './', 'index.html',
  'assets/styles.css', 'assets/app.js',
  'data/epl.json', 'data/epl-2025-26.json', 'data/epl-2026-27.json',
  'data/championship.json', 'data/championship-2025-26.json', 'data/championship-2026-27.json',
  'data/ucl.json', 'data/news.json', 'data/transfers.json', 'data/players.json',
  'manifest.webmanifest', 'icon.svg'
];

const SHELL_RX = /(\/|index\.html|styles\.css|app\.js|manifest\.webmanifest)(\?.*)?$/;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'no-cache' }))))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const sameOrigin = new URL(req.url).origin === location.origin;
  const wantsFresh = sameOrigin && (req.mode === 'navigate' || SHELL_RX.test(req.url));
  const netReq = wantsFresh ? new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' }) : req;

  e.respondWith(
    fetch(netReq)
      .then(res => {
        if (res && res.ok && sameOrigin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined)))
  );
});
