/* RDR2 на 100% — офлайн-кэш. При обновлении файлов поменяйте номер версии. */
const VERSION = "rdr2-100-v2";
const FONTS = "rdr2-100-fonts";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./favicon.svg",
  "./icons/favicon-32.png",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== FONTS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Шрифты Google: из кэша, а при первом заходе — из сети с сохранением.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.open(FONTS).then(cache => cache.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === "opaque") cache.put(req, res.clone());
        return res;
      })))
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Страница: сначала сеть (чтобы приходили обновления), без сети — кэш.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put("./index.html", copy));
        return res;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Остальное: кэш, затем сеть.
  event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
