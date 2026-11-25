const CACHE_NAME = "petforge-web-ears-anger-20261125-r3";
const APP_SHELL = [
  "./scripts/runtime-manifest.js?v=bbacfe01b1415374",
  "./scripts/support-group.js?v=blank-pause-20261113-r1",
  "./styles/support-group.css?v=blank-pause-20261113-r1",
  "./scripts/free-chat.js",
  "./scripts/chat-package.js",
  "./assets/chat-themes.json",
  "./styles/chat-diy.css?v=blank-pause-20261113-r1",
  "./scripts/chat-studio.js?v=blank-pause-20261113-r1",
  "./scripts/chat-client.js",
  "./scripts/chat-studio.js",
  "./",
  "./index.html",
  "./creator.html",
  "./admin.html",
  "./workshop.html",
  "./support.html",
  "./reset-password.html",
  "./styles/recovery.css?v=blank-pause-20261113-r1",
  "./scripts/recovery.js?v=blank-pause-20261113-r1",
  "./styles/main.css?v=blank-pause-20261113-r1",
  "./styles/membership.css?v=blank-pause-20261113-r1",
  "./styles/workshop.css?v=pixel-20261109-r3",
  "./assets/workshop-pixel-room.svg",
  "./scripts/i18n.js?v=availability-20261115-r2",
  "./styles/cat-home.css?v=kitten-ready-20261024-r2",
  "./styles/support.css?v=support-20261024-r1",
  "./styles/creator.css?v=blank-pause-20261113-r1",
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
  "./scripts/main.js?v=ears-anger-20261125-r3",
  "./scripts/interactive-preview.js?v=ears-anger-20261125-r3",
  "./scripts/pet-animation.js?v=ears-anger-20261125-r3",
  "./scripts/background-removal.js?v=usagi-20261124-r1",
  "./scripts/background-worker.js?v=usagi-20261124-r1",
  "./scripts/background-matte.js?v=usagi-20261124-r1",
  "./scripts/membership.js?v=blank-pause-20261113-r1",
  "./scripts/admin.js?v=security-20261108-r2",
  "./scripts/analytics.js?v=admin-dashboard-20261107-r2",
  "./scripts/workshop.js?v=ears-anger-20261125-r3",
  "./scripts/supabase-config.js?v=security-20261108-r2",
  "./scripts/session.js?v=availability-20261115-r1",
  "./scripts/desktop-runtime.js?v=ears-anger-20261125-r3",
  "./scripts/pwa.js?v=blank-pause-20261113-r1",
  "./assets/creator-studio-3d.png",
  "./assets/pwa-icon-192.png",
  "./assets/pwa-icon-512.png"
];

self.addEventListener("install", (event) => {
  // Cache only small entry pages at install. Fetch large tools and media on use.
  const entries = APP_SHELL.filter(path => /^\.\/(?:index|creator|workshop|support|reset-password)\.html$/.test(path));
  event.waitUntil(caches.open(CACHE_NAME).then(cache => Promise.allSettled(entries.map(async path => {
    const response = await fetch(path, { signal: AbortSignal.timeout(8000), cache: 'reload' });
    if (response.ok) await cache.put(path, response);
  }))).then(() => self.skipWaiting()));
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
    if (!['', 'index', 'creator', 'workshop', 'support', 'reset-password'].includes(page)) return;
    const fallback = ["creator", "workshop", "support", "reset-password"].includes(page) ? `./${page}.html` : "./index.html";
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { signal: AbortSignal.timeout(8000) });
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(fallback, copy)));
          return response;
        }
        if (response.status < 500) return response;
        return (await caches.match(fallback)) || response;
      } catch (_) {
        return (await caches.match(fallback)) || new Response('网络暂时无法连接，请稍后重试。', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }

  const cacheable = ["script", "style", "image", "font"].includes(request.destination);
  if (!cacheable) return;
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
      }
      return response;
    }))
  );
});
