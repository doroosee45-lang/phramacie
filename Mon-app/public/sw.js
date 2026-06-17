const CACHE_NAME = 'pharmaerp-v1';
const STATIC_ASSETS = ['/', '/index.html', '/src/main.jsx', '/src/index.css'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // API requests: network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request.clone())
        .then(res => { const clone = res.clone(); caches.open(CACHE_NAME).then(c => c.put(e.request, clone)); return res; })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  // Static: cache first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      return res;
    }))
  );
});

// Background sync
self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-offline-sales') {
    e.waitUntil(syncOfflineSales());
  }
});

async function syncOfflineSales() {
  const clients = await self.clients.matchAll();
  clients.forEach(c => c.postMessage({ type: 'SYNC_OFFLINE_DATA' }));
}
