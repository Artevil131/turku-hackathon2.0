// Ahead service worker: makes the app work offline after one online visit, and reports every request that
// leaves the phone to the page's counter. Production builds only (main.tsx registers it).
const CACHE = "ahead-v1";
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

async function reportOutbound() {
  for (const client of await self.clients.matchAll({ includeUncontrolled: true })) client.postMessage({ type: "outbound" });
}

/** Same-origin files (app code, the synthetic phone, /models/, /ort/): cache first, filled on first use. */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    // Materialise the clone before handing it to Cache.put. Chrome can reject a large network-backed
    // response stream here even after a successful fetch, making an available local model look missing.
    const body = await response.clone().arrayBuffer();
    await cache.put(request, new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers }));
  }
  return response;
}

/** Pages: the network when there is one, so a new build shows up; the cached shell when there is not. */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE);
    await cache.put("/index.html", response.clone());
    return response;
  } catch {
    return (await caches.match("/index.html")) ?? Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    event.waitUntil(reportOutbound());
    return; // not intercepted: it goes to the network, and the counter shows it
  }
  if (request.method !== "GET") return;
  event.respondWith(request.mode === "navigate" ? networkFirst(request) : cacheFirst(request));
});
