const CACHE_NAME = "petforge-web-interactive-20261109-r3";
const APP_SHELL = [
  "./",
  "./index.html",
  "./creator.html",
  "./admin.html",
  "./workshop.html",
  "./support.html",
  "./reset-password.html",
  "./styles/recovery.css?v=interactive-20261109-r3",
  "./scripts/recovery.js?v=interactive-20261109-r3",
  "./styles/main.css?v=interactive-20261109-r3",
  "./styles/membership.css?v=interactive-20261109-r3",
  "./styles/workshop.css?v=pixel-20261109-r3",
  "./assets/workshop-pixel-room.svg",
  "./scripts/i18n.js?v=interactive-20261109-r3",
  "./styles/cat-home.css?v=kitten-ready-20261024-r2",
  "./styles/support.css?v=support-20261024-r1",
  "./styles/creator.css?v=interactive-20261109-r3",
  "./styles/admin.css?v=redeem-20261107-r2",
  "./scripts/cat-home.js?v=wand-attached-20261024-r1",
  "./scripts/cat-motion.js?v=voxel-20261023-r1",
  "./scripts/kitten-model.js?v=voxel-20261023-r1",
  "./scripts/teaser-cursor.js?v=teaser-20261024-r4",
  "./scripts/vendor/three/build/three.module.js",
  "./scripts/vendor/three/build/three.core.js",
  "./scripts/vendor/three/addons/loaders/GLTFLoader.js",
  "./scripts/vendor/three/addons/utils/BufferGeometryUtils.js",
  "./scripts/vendor/three/addons/utils/SkeletonUtils.js",
  "./assets/teaser-wand.svg",
  "./assets/brand-cat-20261027.png",
  "./assets/voxel-kitten-preview.svg",
  "./assets/feature-cat-white-20261027.png",
  "./assets/desktop-pet-scene.webp",
  "./scripts/main.js?v=interactive-20261109-r3",
  "./scripts/interactive-preview.js?v=interactive-20261109-r3",
  "./scripts/background-removal.js?v=outline-20261107-r1",
  "./scripts/background-worker.js?v=outline-20261107-r1",
  "./scripts/background-matte.js?v=outline-20261107-r1",
  "./scripts/membership.js?v=interactive-20261109-r3",
  "./scripts/admin.js?v=security-20261108-r2",
  "./scripts/analytics.js?v=admin-dashboard-20261107-r2",
  "./scripts/workshop.js?v=identity-20261108-r1",
  "./scripts/supabase-config.js?v=security-20261108-r2",
  "./scripts/session.js?v=interactive-20261109-r3",
  "./scripts/desktop-runtime.js?v=interactive-20261109-r3",
  "./scripts/pwa.js?v=interactive-20261109-r3",
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
    caches.keys().then((keys) => Promise.all(keys.filter((key) => /^(petforge-pwa-|petforge-web-)/.test(key) && key !== CACHE_NAME).map((key) => caches.delete(key)))
  ));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    const page = new URL(request.url).pathname.split("/").pop().replace(/\.html$/, '');
    const fallback = ["creator", "workshop", "support", "reset-password"].includes(page) ? `./${page}.html` : "./index.html";
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
