/* GestiFinance — Service Worker (shell PWA)
 * Stratégie sûre (dev + prod) :
 *  - Assets statiques (js/css/img/_next) : réseau d'abord, mise en cache,
 *    repli sur le cache si hors-ligne (jamais de contenu périmé en ligne).
 *  - Navigations : réseau seul, repli sur /offline.html si hors-ligne
 *    (on ne met PAS en cache le HTML des pages authentifiées).
 *  - Les appels Supabase (autre origine) ne sont pas interceptés.
 */
const CACHE = "gf-shell-v1";
const PRECACHE = ["/offline.html", "/logo.png", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

const isStatic = (pathname) =>
  pathname.startsWith("/_next/static") ||
  /\.(png|svg|jpg|jpeg|webp|ico|css|woff2?|json)$/.test(pathname);

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // ignore Supabase & externes

  if (isStatic(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const res = await fetch(req);
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          const hit = await cache.match(req);
          return hit || Response.error();
        }
      })(),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req);
        } catch {
          const cache = await caches.open(CACHE);
          const offline = await cache.match("/offline.html");
          return offline || Response.error();
        }
      })(),
    );
  }
});
