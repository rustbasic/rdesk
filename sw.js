var cacheName = 'ezchat-v1';
var filesToCache = [
  './',
  './index.html',
  './ezchat.js',
  './ezchat_bg.wasm',
];

/* Start the service worker and cache all of the app's content */
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(cacheName);

    await Promise.allSettled(filesToCache.map(async (url) => {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        await cache.put(url, res);
      } catch (err) {
        console.info('[SW] precache failed:', url, err);
      }
    }));

    await self.skipWaiting();
  })());
});

/* Clean up outdated caches and take control of all clients immediately */
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== cacheName ? caches.delete(k) : Promise.resolve())));
    await self.clients.claim();
  })());
})

/* Serve cached content when offline */
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  const scope = new URL(self.registration.scope);

  if (url.origin !== scope.origin) return;
  if (e.request.method !== 'GET') return;

  e.respondWith((async () => {
    const cached = await caches.match(e.request);
    if (cached) return cached;

    try {
      return await fetch(e.request);
    } catch (err) {
      if (e.request.mode === 'navigate') {
        const fallback = await caches.match('./index.html');
        if (fallback) return fallback;
      }
      return Response.error();
    }
  })());
});
