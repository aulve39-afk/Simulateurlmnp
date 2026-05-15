/* ═══════════════════════════════════════════════════
   ImmoVerdict — Service Worker (PWA / Mode Offline)
   Stratégie : Cache-First pour assets statiques,
               Network-First pour données API.
═══════════════════════════════════════════════════ */

const CACHE_VERSION  = "immoverdict-v8";
const CACHE_STATIC   = `${CACHE_VERSION}-static`;
const CACHE_DYNAMIC  = `${CACHE_VERSION}-dynamic`;

// Assets statiques uniquement — PAS les pages HTML (elles référencent des
// chunks Next.js avec des hashes qui changent à chaque déploiement).
const PRECACHE_URLS = [
  "/manifest.json",
  "/favicon.svg",
  "/offline.html",
];

// ── Install : pré-cache des ressources essentielles ──
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache => {
      return cache.addAll(PRECACHE_URLS.filter(url => url !== "/offline.html")).catch(() => {
        // Si certaines URLs échouent, on continue quand même
        console.warn("[SW] Certaines URLs de pré-cache sont indisponibles.");
      });
    }).then(() => self.skipWaiting())
  );
});

// ── Activate : nettoyage des anciens caches ──
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_STATIC && k !== CACHE_DYNAMIC)
          .map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// ── Fetch : stratégie hybride ──
self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore les requêtes non-GET et les APIs externes
  if (request.method !== "GET") return;
  if (!url.origin.includes(self.location.origin) && !url.pathname.startsWith("/_next/")) return;

  // API routes → Network-First (données fraîches si possible)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Assets Next.js (_next/static) → Cache-First
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  // Pages HTML → Network-First (évite de servir du HTML avec de vieux hashes de chunks)
  event.respondWith(networkFirst(request));
});

/* ── Stratégies de cache ── */

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Ressource indisponible hors connexion.", { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_DYNAMIC);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ error: "Hors connexion" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache  = await caches.open(CACHE_DYNAMIC);
  const cached = await cache.match(request);

  const networkFetch = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached || await networkFetch || new Response(
    "⚡ ImmoVerdict fonctionne hors connexion. Reconnectez-vous pour les données en temps réel.",
    { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
  );
}
