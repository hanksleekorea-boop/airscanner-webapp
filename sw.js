const CACHE_NAME = "airscanner-pwa-r25";
const CACHE_PREFIX = "airscanner-pwa-";

function canCache(request, url) {
  if (request.method !== "GET" || request.headers.has("authorization")) return false;
  if (url.origin !== self.location.origin) return false;
  return !url.pathname.includes("/api/")
    && !url.pathname.endsWith("/account-config.json")
    && !url.pathname.endsWith("/affiliate-config.json")
    && !url.pathname.endsWith("/build.json");
}

async function cacheResponse(request, response) {
  if (!response || !response.ok) return response;
  const url = new URL(request.url);
  if (!canCache(request, url)) return response;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add("./")).catch(() => undefined));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys
    .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
    .map((key) => caches.delete(key)))));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (!canCache(request, url)) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => cacheResponse(request, response)).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      return (await cache.match("./")) || Response.error();
    }));
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => cacheResponse(request, response))));
});
