/* World Cup 2026 Live Hub — service worker
   App shell is NETWORK-FIRST so the installed (Add-to-Home-Screen) app always
   updates to the latest deploy when online, and still works offline from cache. */
'use strict';

const CACHE = 'wc2026-v6';
const SHELL = [
  './', 'index.html',
  'assets/styles.css', 'assets/app.js',
  'data/worldcup.json', 'manifest.webmanifest', 'icon.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).catch(()=>{}).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => { if(e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Network-first for everything (fresh on launch when online), cache fallback offline.
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok && new URL(req.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined)))
  );
});
