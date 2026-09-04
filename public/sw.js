const SHELL_CACHE = "tcloud-shell-v1";
const DATA_CACHE = "tcloud-data-v1";
const MEDIA_CACHE = "tcloud-media-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(["/", "/manifest.webmanifest", "/icon.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL_CACHE, DATA_CACHE, MEDIA_CACHE]);
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("tcloud-") && !keep.has(key)).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/core/media/") && !request.headers.has("range")) {
    event.respondWith(caches.open(MEDIA_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    }));
    return;
  }

  if (url.pathname.startsWith("/api/core/") && !url.pathname.includes("/auth/")) {
    event.respondWith(caches.open(DATA_CACHE).then(async (cache) => {
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        return (await cache.match(request)) ?? Response.json({ connected: false }, { status: 503 });
      }
    }));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/").then((response) => response ?? Response.error())));
  }
});
