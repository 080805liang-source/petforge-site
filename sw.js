const CACHE_NAME = "petforge-pwa-cat-20261023-r3";
const APP_SHELL = [
  "./",
  "./index.html",
  "./workshop.html",
  "./manifest.json",
  "./styles/main.css",
  "./styles/membership.css",
  "./styles/workshop.css",
  "./styles/cat-home.css?v=cat-20261023-r3",
  "./scripts/cat-home.js?v=cat-20261023-r3",
  "./scripts/cat-motion.js?v=cat-20261023-r3",
  "./scripts/vendor/three/build/three.module.js",
  "./scripts/vendor/three/build/three.core.js",
  "./scripts/vendor/three/addons/loaders/GLTFLoader.js",
  "./scripts/vendor/three/addons/utils/BufferGeometryUtils.js",
  "./scripts/vendor/three/addons/utils/SkeletonUtils.js",
  "./scripts/vendor/three/addons/environments/RoomEnvironment.js",
  "./assets/models/playful-cat.glb",
  "./assets/teaser-wand.svg",
  "./scripts/main.js",
  "./scripts/membership.js",
  "./scripts/workshop.js",
  "./scripts/supabase-config.js",
  "./scripts/pwa.js",
  "./assets/creator-studio-3d.png",
  "./assets/pwa-icon-192.png",
  "./assets/pwa-icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("petforge-pwa-") && key !== CACHE_NAME).map((key) => caches.delete(key)))
  ));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("./index.html")));
    return;
  }

  const cacheable = ["script", "style", "image", "font"].includes(request.destination)
    || new URL(request.url).pathname.endsWith("/assets/models/playful-cat.glb");
  if (!cacheable) return;
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    }))
  );
});
