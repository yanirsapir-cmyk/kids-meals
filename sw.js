const CACHE = "kids-meals-cache-v4";

const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // מוחקים קאש ישן כדי לא “להיתקע” על גרסאות קודמות
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : null)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // רק אותו דומיין
  if (url.origin !== self.location.origin) return;

  // לא נוגעים בבקשות ל-Google Script (סנכרון) / API וכו׳
  // (זה גם בדומיין אחר אז גם ככה לא ייכנס, אבל נשאיר בטוח)
  if (url.pathname.includes("/macros/")) return;

  // תמיד נביא index.html מהרשת (כדי לקבל קוד עדכני), ואם אין רשת – מהקאש
  if (url.pathname === "/" || url.pathname.endsWith("/index.html")) {
    event.respondWith(networkFirst("./index.html"));
    return;
  }

  // לשאר קבצי הליבה (אייקונים/מניפסט) – cache-first
  event.respondWith(cacheFirst(req));
});

async function networkFirst(cacheKey) {
  try {
    // no-store כדי לא להיתקע על cache של הדפדפן עצמו
    const fresh = await fetch(cacheKey, { cache: "no-store" });
    const cache = await caches.open(CACHE);
    cache.put(cacheKey, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await caches.match(cacheKey);
    if (cached) return cached;
    // fallback אחרון
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
