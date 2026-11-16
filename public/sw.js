/* Room Designer Studio service worker: makes the app usable offline.
 * - Navigations: network first, falling back to the cached app shell.
 * - Same-origin assets (hashed build files, icons): stale-while-revalidate.
 * Fonts are self-hosted, so they are cached with the other same-origin assets and work offline.
 * Cross-origin requests are left to the browser. Bump CACHE to drop old files. */
const CACHE = 'room-studio-v4';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(async (cache) => {
        await cache.addAll(['./', './manifest.webmanifest', './room-studio-mark.svg']);
        // Every file the build makes, listed by the build itself, so the parts that load only when
        // they are needed — 3D, the photo dialog, printable plans — work offline too, even if the
        // visitor never opened them while online.
        try {
          const res = await fetch('./asset-manifest.json', { cache: 'no-cache' });
          const files = res.ok ? await res.json() : [];
          await Promise.all(
            files.map((file) =>
              cache.add(new URL(file, self.registration.scope).href).catch(() => {})
            )
          );
        } catch {
          /* precaching is best effort */
        }
        // Belt and braces: whatever the shell page itself asks for, in case the list is missing
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
        .catch(() => caches.match('./', { ignoreVary: true }))
    );
    return;
  }

  // ignoreVary: the build's scripts and stylesheet are requested with crossorigin, so the browser
  // sends an Origin header with them, while the copies stored when the worker installed were
  // fetched without one. Hosts that answer "Vary: Origin" would make every one of those a miss,
  // and the app would not start offline even though every file is held.
  event.respondWith(
    caches.match(request, { ignoreVary: true }).then((cached) => {
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
