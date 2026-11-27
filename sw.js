const CACHE_NAME = "bentokit-hub-v10";
const MAP_TILE_CACHE = "bento-gps-tiles-v1";

const HUB_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg"
];

const SUB_APPS = [
  "https://proyektow.github.io/BENTO-PDF/",
  "https://proyektow.github.io/BENTO-PDF/index.html",
  "https://proyektow.github.io/BentoFolio/",
  "https://proyektow.github.io/BentoFolio/index.html",
  "https://proyektow.github.io/Bento_Scanner-/",
  "https://proyektow.github.io/Bento_Scanner-/index.html",
  "https://proyektow.github.io/Bento_claves/",
  "https://proyektow.github.io/Bento_claves/index.html",
  "https://proyektow.github.io/Bento_Notas/",
  "https://proyektow.github.io/Bento_Notas/index.html",
  "https://proyektow.github.io/Bento_GPS/",
  "https://proyektow.github.io/Bento_GPS/index.html",
  "https://proyektow.github.io/Bento_Voz/",
  "https://proyektow.github.io/Bento_Voz/index.html",
  "https://proyektow.github.io/Bento_Transfer/",
  "https://proyektow.github.io/Bento_Transfer/index.html",
  "https://proyektow.github.io/Bento_Count/",
  "https://proyektow.github.io/Bento_Count/index.html",
  "https://proyektow.github.io/Bento_Nutri/",
  "https://proyektow.github.io/Bento_Nutri/index.html"
];

const EXTERNAL_LIBS = [
  "https://cdn.jsdelivr.net/npm/@cantoo/pdf-lib@2.5.0/dist/pdf-lib.min.js",
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js",
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js",
  "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js",
  "https://cdn.jsdelivr.net/npm/docx-preview@0.3.3/dist/docx-preview.min.js",
  "https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js",
  "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js",
  "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js",
  "https://unpkg.com/mqtt@5.10.1/dist/mqtt.min.js",
  "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.css",
  "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.js",
  "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js",
  "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js",
  "https://docs.opencv.org/4.8.0/opencv.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(HUB_ASSETS);
      await Promise.allSettled(
        [...SUB_APPS, ...EXTERNAL_LIBS].map((url) =>
          fetch(url, { cache: "reload" })
            .then((res) => {
              if (res && (res.status === 200 || res.type === "opaque")) {
                return cache.put(url, res);
              }
            })
            .catch(() => {})
        )
      );
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

  if (url.includes("openfoodfacts.org")) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  const isHtml =
    event.request.mode === "navigate" ||
    event.request.destination === "document" ||
    event.request.destination === "iframe" ||
    url.endsWith("/") ||
    url.endsWith(".html");

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
