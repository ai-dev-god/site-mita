// La Mița Biciclista — PWA Service Worker
// Cache-first strategy for menu data and static assets

const CACHE_NAME = "lmbsc-pwa-v1";
const MENU_CACHE = "lmbsc-menu-v1";

const PRECACHE_URLS = [
  "/hospitality/menu",
  "/hospitality/guest",
];

const MENU_API_PATTERN = /\/api\/v1\/menu\/items/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== MENU_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cache-first for menu API responses
  if (MENU_API_PATTERN.test(url.pathname)) {
    event.respondWith(
      caches.open(MENU_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const networkFetch = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    );
    return;
  }

  // Network-first for navigation requests (pages)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for static assets
  if (request.destination === "style" || request.destination === "script" || request.destination === "image") {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  }
});
