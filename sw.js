const CACHE_NAME = "bentokit-hub-v3";

// Archivos propios del Hub BentoKit
const HUB_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg"
];

// URLs de las 8 herramientas integradas (para que funcionen dentro del iframe sin conexión)
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
  "https://proyektow.github.io/Bento_Transfer/index.html"
];

// Librerías CDN de las apps actualizadas (BENTO PDF v2 y Bento Transfer v2)
const EXTERNAL_LIBS = [
  "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js",
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js",
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js",
  "https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js",
  "https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js",
  "https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js",
  "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js",
  "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(HUB_ASSETS);
      // Pre-cachea en segundo plano todas las apps y librerías sin bloquear la instalación
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
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estrategia Network-First para HTML (garantiza versiones nuevas si hay red) y Cache-First para librerías
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const isHtml =
    event.request.mode === "navigate" ||
    event.request.destination === "document" ||
    event.request.destination === "iframe" ||
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
