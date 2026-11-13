const CACHE_NAME = "petforge-web-nailong-idle-20261113-r1";
const APP_SHELL = [
  "./scripts/runtime-manifest.js?v=022d2d9f27e09dde",
  "./scripts/support-group.js?v=nailong-20261113-r4",
  "./styles/support-group.css?v=nailong-20261113-r4",
  "./scripts/free-chat.js",
  "./scripts/chat-package.js",
  "./assets/chat-themes.json",
  "./styles/chat-diy.css?v=nailong-20261113-r4",
  "./scripts/chat-studio.js?v=nailong-20261113-r4",
  "./scripts/chat-client.js",
  "./scripts/chat-studio.js",
  "./",
  "./index.html",
  "./creator.html",
  "./admin.html",
  "./workshop.html",
  "./support.html",
  "./reset-password.html",
  "./styles/recovery.css?v=nailong-20261113-r4",
  "./scripts/recovery.js?v=nailong-20261113-r4",
  "./styles/main.css?v=nailong-20261113-r4",
  "./styles/membership.css?v=nailong-20261113-r4",
  "./styles/workshop.css?v=pixel-20261109-r3",
  "./assets/workshop-pixel-room.svg",
  "./scripts/i18n.js?v=nailong-20261113-r4",
  "./styles/cat-home.css?v=kitten-ready-20261024-r2",
  "./styles/support.css?v=support-20261024-r1",
  "./styles/creator.css?v=nailong-20261113-r4",
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
  "./scripts/main.js?v=nailong-20261113-r4",
  "./scripts/interactive-preview.js?v=nailong-20261113-r4",
  "./scripts/pet-animation.js?v=nailong-20261113-r4",
  "./scripts/background-removal.js?v=outline-20261107-r1",
  "./scripts/background-worker.js?v=outline-20261107-r1",
  "./scripts/background-matte.js?v=outline-20261107-r1",
  "./scripts/membership.js?v=nailong-20261113-r4",
  "./scripts/admin.js?v=security-20261108-r2",
  "./scripts/analytics.js?v=admin-dashboard-20261107-r2",
  "./scripts/workshop.js?v=identity-20261108-r1",
  "./scripts/supabase-config.js?v=security-20261108-r2",
  "./scripts/session.js?v=nailong-20261113-r4",
  "./scripts/desktop-runtime.js?v=nailong-20261113-r4",
  "./scripts/pwa.js?v=nailong-20261113-r4",
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
