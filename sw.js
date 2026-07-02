/* World Cup 2026 Live Hub — service worker
   App shell is NETWORK-FIRST so the installed (Add-to-Home-Screen) app always
   updates to the latest deploy when online, and still works offline from cache.

   OTA: __BUILD__ is stamped with the commit + time by the Pages deploy workflow,
   so every deploy changes this file's bytes → the browser's SW update check
   fires → install → skipWaiting → controllerchange → the page auto-reloads.
   No manual cache-version bumps needed. */
'use strict';

const BUILD = '__BUILD__';
const CACHE = 'wc2026-' + BUILD;
const SHELL = [
  './', 'index.html',
  'assets/styles.css', 'assets/app.js',
  'data/worldcup.json', 'manifest.webmanifest', 'icon.svg'
];

// Assets whose freshness defines the app version. Fetched with HTTP-cache
// revalidation so GitHub Pages' max-age can never re-serve a stale build.
const SHELL_RX = /(\/|index\.html|styles\.css|app\.js|manifest\.webmanifest|version\.json)(\?.*)?$/;

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

  // Network-first for everything (fresh on launch when online), cache fallback offline.
  // Shell assets & navigations REVALIDATE with the server instead of trusting the
  // HTTP cache — a new Request is built from the URL (navigation-mode requests
  // can't be re-constructed with init options directly).
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
