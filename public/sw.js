/* SaveKaro Service Worker — PWA offline support */
const CACHE = "savekaro-v2";
const ASSETS = ["/", "/index.html"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  const url = e.request.url;

  // ── Skip non-GET, non-http(s), and external/third-party requests ──────
  // These were causing the "body already used" + clone errors
  if (e.request.method !== "GET") return;
  if (!url.startsWith("http")) return;

  const isExternal = !url.startsWith(self.location.origin);
  const isFirebase = url.includes("firebaseapp.com") || url.includes("googleapis.com") || url.includes("gstatic.com");
  const isRecaptcha = url.includes("recaptcha") || url.includes("google.com/recaptcha");
  const isFacebook = url.includes("facebook.net") || url.includes("facebook.com");
  const isAnalytics = url.includes("googletagmanager") || url.includes("google-analytics");
  const isUnsplash = url.includes("unsplash.com") || url.includes("images.unsplash");

  // Never intercept auth/analytics/recaptcha/social/image CDN requests
  // These fail with clone errors when the SW tries to cache them
  if (isFirebase || isRecaptcha || isFacebook || isAnalytics || isUnsplash) return;

  // For external requests we don't recognize, just pass through
  if (isExternal) return;

  // ── Cache-first for local app assets ─────────────────────────────────
  e.respondWith(
    caches.match(e.request).then(cached => {
      // Clone BEFORE using — this was the bug causing "body already used"
      const networkFetch = fetch(e.request.clone()).then(res => {
        // Only cache valid same-origin responses
        if (res && res.ok && res.status === 200) {
          const toCache = res.clone(); // clone BEFORE returning res
          caches.open(CACHE).then(c => c.put(e.request, toCache));
        }
        return res;
      }).catch(() => cached); // on network fail, return cached if available

      return cached || networkFetch;
    })
  );
});

/* ── Push notifications ─────────────────────────────────────────────── */
self.addEventListener("push", e => {
  const data = e.data?.json() || { title:"SaveKaro", body:"New deal alert! 🔥" };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      data: { url: data.url || "/" },
      actions: [
        { action:"view",  title:"View Deal" },
        { action:"close", title:"Dismiss"   }
      ]
    })
  );
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  if (e.action === "view") {
    e.waitUntil(clients.openWindow(e.notification.data.url));
  }
});