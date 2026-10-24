const CACHE_NAME = "petforge-pwa-kitten-ready-20261024-r1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./creator.html",
  "./workshop.html",
  "./manifest.json",
  "./styles/main.css",
  "./styles/membership.css",
  "./styles/workshop.css",
  "./styles/cat-home.css?v=kitten-ready-20261024-r1",
  "./styles/creator.css?v=kitten-20261023-r8",
  "./scripts/cat-home.js?v=kitten-ready-20261024-r1",
  "./scripts/cat-motion.js?v=voxel-20261023-r1",
  "./scripts/kitten-model.js?v=voxel-20261023-r1",
  "./scripts/teaser-cursor.js?v=teaser-20261023-r3",
  "./scripts/vendor/three/build/three.module.js",
  "./scripts/vendor/three/build/three.core.js",
  "./scripts/vendor/three/addons/loaders/GLTFLoader.js",
  "./scripts/vendor/three/addons/utils/BufferGeometryUtils.js",
  "./scripts/vendor/three/addons/utils/SkeletonUtils.js",
  "./assets/teaser-wand.svg",
  "./assets/brand-cat-head.svg",
  "./assets/voxel-kitten-preview.svg",
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
    const page = new URL(request.url).pathname.split("/").pop();
    const fallback = ["creator.html", "workshop.html"].includes(page) ? `./${page}` : "./index.html";
    event.respondWith(fetch(request).catch(() => caches.match(fallback)));
    return;
  }

  const cacheable = ["script", "style", "image", "font"].includes(request.destination);
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
