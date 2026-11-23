/* MeOH Verify driver PWA service worker: app-shell caching for offline use. Captures are queued in IndexedDB by the page. */
const CACHE = 'meoh-shell-v1';
const SHELL = ['/zh-CN/driver', '/en/driver', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => undefined)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return; // API writes go through the IndexedDB queue, never the SW
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // API calls: network only
  // Navigations and static assets: network first, fall back to cache when offline.
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && (req.mode === 'navigate' || url.pathname.startsWith('/_next/static/'))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('/zh-CN/driver'))),
  );
});
