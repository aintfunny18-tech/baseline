/* Baseline — service worker: cache-first app shell for offline use. */
const CACHE = "baseline-v11";
const PUSH_STATE_CACHE = "baseline-push-state";
const SHELL = [
  "./",
  "./index.html",
  "./app.css",
  "./app.js",
  "./db.js",
  "./content.js",
  "./manifest.json",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-180.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== PUSH_STATE_CACHE).map((k) => caches.delete(k))))
      .then(() => self.registration.clearAppBadge ? self.registration.clearAppBadge() : undefined)
      .then(() => self.clients.claim())
  );
});

self.addEventListener("push", (e) => {
  let data = {};
  try { data = e.data.json(); } catch { data = { body: e.data && e.data.text() }; }
  const receipt = {
    receivedAt: new Date().toISOString(),
    slot: data.slot || null,
    title: data.title || "Baseline",
  };
  e.waitUntil(Promise.all([
    caches.open(PUSH_STATE_CACHE).then((cache) => cache.put(
      "./push-receipt.json",
      new Response(JSON.stringify(receipt), { headers: { "Content-Type": "application/json" } }),
    )).catch(() => {}),
    self.registration.showNotification(data.title || "Baseline", {
      body: data.body || "",
      icon: "icons/icon-192.png",
      badge: "icons/icon-192.png",
      tag: data.tag || "baseline-reminder",
      renotify: true,
      data: { url: data.url || "./", slot: data.slot || null },
    }),
  ]));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || "./", self.location.href).href;
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) {
      if ("navigate" in c && "focus" in c) return c.navigate(target).then(() => c.focus());
      if ("focus" in c) return c.focus();
    }
    return clients.openWindow(target);
  }));
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  // Never cache cross-origin requests (GitHub API sync must stay live)
  // or the sync JSONs themselves.
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || url.pathname.includes("/data/sync/")) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) =>
      hit ||
      fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
    )
  );
});
