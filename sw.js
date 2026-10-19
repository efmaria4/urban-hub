// Offline support for the Urban Hub guest guide.
// The page is fetched fresh when online (so edits show up straight away) and served from cache when offline.
// Bump VERSION whenever photos are added or removed so the cached copy is refreshed.
const VERSION = "urbanhub-v2";
const PRECACHE = [
  "./", "./index.html", "./manifest.webmanifest",
    "./img/apartment-key.jpg",   "./img/apple-touch-icon.png",   "./img/building.jpg",   "./img/corridor-key.jpg",   "./img/corridor.jpg",   "./img/hallway.jpg",   "./img/icon-192.png",   "./img/icon-512.png",   "./img/icon.svg",   "./img/lockbox-cover.jpg",   "./img/lockbox-dials.jpg",   "./img/lockbox-wall.jpg",   "./img/og.jpg",   "./img/thermostat-receiver.jpg",   "./img/thermostat.jpg", 
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // The guide itself: network first, fall back to the saved copy (any ?g=…&w=… personal link included).
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put("./index.html", copy));
        return res;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Photos, icons and fonts: answer from cache instantly, refresh in the background.
  const sameSite = url.origin === self.location.origin;
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!sameSite && !isFont) return;
  e.respondWith(
    caches.open(VERSION).then((c) =>
      c.match(req).then((hit) => {
        const net = fetch(req).then((res) => { if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      })
    )
  );
});
