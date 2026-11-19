// Service worker: arranque instantáneo (shell en caché) y avisos.
const CACHE = "coach-v1.6.4";
const SHELL = ["./", "index.html", "app.css", "app.js", "manifest.webmanifest", "img/splash.jpg", "img/bg.jpg", "img/shield.png", "icons/icon-64.png", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== "coach-nav").map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.hostname.endsWith("supabase.co")) return;
  // Shell: responde desde caché y actualiza por detrás.
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(r => { if (r.ok && (u.origin === location.origin || u.hostname.includes("jsdelivr") || u.hostname.includes("gstatic") || u.hostname.includes("googleapis"))) c.put(u.search && u.origin === location.origin ? u.origin + u.pathname : e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
self.addEventListener("push", e => {
  let d = {}; try { d = e.data.json(); } catch { d = { title: "Coach", body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "Coach", { body: d.body || "", icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: d.tag, data: { url: d.url || "./" } }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || "./", self.registration.scope).href;
  // La app lee este destino al abrirse o al volver a primer plano (en iPhone el mensaje directo puede perderse).
  e.waitUntil(caches.open("coach-nav").then(c => c.put("nav", new Response(url))).then(() => self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
    for (const c of cs) { c.postMessage({ type: "open", url }); return c.focus(); }
    return self.clients.openWindow(url);
  })));
});
