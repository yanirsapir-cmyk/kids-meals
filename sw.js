const CACHE = "kids-meals-cache";

const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

// מתקין ומכין Cache
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE))
  );
});

// מפעיל את ה-SW מיד
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// אסטרטגיה:
// - index.html: Network-first (כדי שעדכוני קוד יגיעו)
// - שאר הקבצים: Cache-first
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // רק לאותו origin
  if (url.origin !== location.origin) return;

  // Network-first ל-index.html
  if (url.pathname.endsWith("/") || url.pathname.endsWith("/index.html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Cache-first לכל השאר
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy));
        return res;
      });
    })
  );
});
