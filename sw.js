const CACHE = "kids-meals-cache-v5";

const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./sw.js",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(CORE);
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : Promise.resolve())));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // רק אותו דומיין
  if (url.origin !== self.location.origin) return;

  // תמיד Network-first לניווט (דף ראשי) כדי לקבל גרסאות חדשות
  // (כולל Android/Safari כשזה "navigate")
  if (req.mode === "navigate") {
    event.respondWith(networkFirst("./index.html"));
    return;
  }

  // לטובת בטיחות: לא "מתערבים" בבקשות עם querystring (למשל אם תוסיף בעתיד)
  // אבל אם תרצה כן - אפשר להוריד את התנאי הזה.
  // כאן נשאיר את זה cache-first גם אם יש query (רק אם זה אותו דומיין)
  // event.respondWith(cacheFirst(req));

  // קבצי ליבה: cache-first
  event.respondWith(cacheFirst(req));
});

async function networkFirst(cacheKey) {
  try {
    const fresh = await fetch(cacheKey, { cache: "no-store" });
    const cache = await caches.open(CACHE);
    cache.put(cacheKey, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await caches.match(cacheKey);
    if (cached) return cached;
    return new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;

  const res = await fetch(req);
  const cache = await caches.open(CACHE);
  cache.put(req, res.clone());
  return res;
}
