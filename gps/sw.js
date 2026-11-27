const CACHE_NAME = "bento-gps-v5";
const MAP_TILE_CACHE = "bento-gps-tiles-v1";

const LOCAL_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg"
];

const CDN_LIBS = [
  "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.css",
  "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.js",
  "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js",
  "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css",
"https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(LOCAL_ASSETS);
      await Promise.allSettled(CDN_LIBS.map((url) => cache.add(url)));
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== MAP_TILE_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = event.request.url;

  if (url.includes("tile.openstreetmap.org")) {
    event.respondWith(
      caches.open(MAP_TILE_CACHE).then(async (tileCache) => {
        const cachedTile = await tileCache.match(event.request);
        if (cachedTile) return cachedTile;
        try {
          const netRes = await fetch(event.request);
          if (netRes && (netRes.status === 200 || netRes.type === "opaque")) {
            tileCache.put(event.request, netRes.clone());
          }
          return netRes;
        } catch (e) {
          return cachedTile;
        }
      })
    );
    return;
  }

  const isHtml =
    event.request.mode === "navigate" ||
    event.request.destination === "document" ||
    event.request.url.endsWith("/") ||
    event.request.url.endsWith(".html");

  if (isHtml) {
    event.respondWith(
      fetch(event.request)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkRes;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkRes) => {
          if (networkRes && (networkRes.status === 200 || networkRes.type === "opaque")) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkRes;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
