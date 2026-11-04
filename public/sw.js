/* Room Designer Studio service worker: makes the app usable offline.
 * - Navigations: network first, falling back to the cached app shell.
 * - Same-origin assets (hashed build files, icons): stale-while-revalidate.
 * Fonts are self-hosted, so they are cached with the other same-origin assets and work offline.
 * Cross-origin requests are left to the browser. Bump CACHE to drop old files. */
const CACHE = 'room-studio-v3';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(async (cache) => {
        await cache.addAll(['./', './manifest.webmanifest', './room-studio-mark.svg']);
        // Also keep the scripts and styles the shell page loads, so the first offline start works
        // even before they were fetched again. Lazy chunks (3D) are cached on first use.
        try {
          const html = await (await cache.match('./')).text();
          const assets = [...html.matchAll(/(?:src|href)="([^"]*assets\/[^"]+)"/g)].map(
            (m) => new URL(m[1], self.registration.scope).href
          );
          await Promise.all(assets.map((url) => cache.add(url).catch(() => {})));
        } catch {
          /* precaching is best effort */
        }
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('./', copy));
          return response;
        })
        .catch(() => caches.match('./'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
