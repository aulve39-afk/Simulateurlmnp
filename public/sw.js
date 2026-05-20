/**
 * @file sw.js
 * ImmoVerdict — Service Worker v10
 *
 * Stratégies :
 *  - Cache-First  : pages HTML + assets statiques (JS, CSS, fonts, images)
 *  - Network-First : requêtes /api/* (toujours fraîches)
 *  - Stale-While-Revalidate : icônes / manifeste
 *
 * Cycle de vie :
 *  install  → pré-cache des routes shell
 *  activate → purge des anciens caches (< v10) + postMessage SW_CACHE_CLEARED
 *  fetch    → dispatch selon la stratégie
 */

const SW_VERSION   = "v10";
const CACHE_STATIC = `immo-static-${SW_VERSION}`;
const CACHE_PAGES  = `immo-pages-${SW_VERSION}`;

// Routes à pré-cacher à l'installation
const PRECACHE_URLS = [
  "/",
  "/lmnp",
  "/arbitrage",
  "/manifest.json",
  "/icon.svg",
];

// ─── Install ────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  self.skipWaiting(); // Prend le contrôle immédiatement

  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        // Ne pas bloquer l'installation si une ressource est indisponible
        console.warn("[SW v10] Précache partiel :", err.message);
      });
    })
  );
});

// ─── Activate ───────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Purge tous les caches qui ne correspondent pas à v10
      const keys = await caches.keys();
      const toDelete = keys.filter(
        (k) => k !== CACHE_STATIC && k !== CACHE_PAGES
      );

      await Promise.all(toDelete.map((k) => caches.delete(k)));

      // Prend le contrôle de tous les onglets ouverts
      await self.clients.claim();

      // Notifie le layout.tsx que le cache a été purgé → déclenchera un reload
      if (toDelete.length > 0) {
        const allClients = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        for (const client of allClients) {
          client.postMessage({ type: "SW_CACHE_CLEARED", version: SW_VERSION });
        }
      }
    })()
  );
});

// ─── Fetch ──────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore les requêtes non-GET et les extensions navigateur
  if (request.method !== "GET") return;
  if (!url.protocol.startsWith("http")) return;

  // ── Network-First : /api/* ────────────────────────────────────────────────
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, CACHE_PAGES));
    return;
  }

  // ── Network-First : _next/data (RSC payloads) ─────────────────────────────
  if (url.pathname.startsWith("/_next/data/")) {
    event.respondWith(networkFirst(request, CACHE_PAGES));
    return;
  }

  // ── Stale-While-Revalidate : assets _next/static ─────────────────────────
  // Ces assets ont un hash dans leur nom → immuables, on peut les garder longtemps
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  // ── Cache-First : manifest + icônes ──────────────────────────────────────
  if (
    url.pathname === "/manifest.json" ||
    url.pathname.startsWith("/icon") ||
    url.pathname.startsWith("/apple-touch")
  ) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  // ── Cache-First : pages HTML (navigation) ────────────────────────────────
  if (request.mode === "navigate") {
    event.respondWith(cacheFirstWithNetworkFallback(request, CACHE_PAGES));
    return;
  }

  // ── Par défaut : Network-First ────────────────────────────────────────────
  event.respondWith(networkFirst(request, CACHE_PAGES));
});

// ─── Stratégies ─────────────────────────────────────────────────────────────

/**
 * Cache-First : renvoie depuis le cache, sinon réseau (et met en cache).
 */
async function cacheFirst(request, cacheName) {
  const cache    = await caches.open(cacheName);
  const cached   = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Réseau indisponible", { status: 503 });
  }
}

/**
 * Cache-First avec fallback réseau — pour les pages de navigation.
 * Si la page n'est pas en cache ET que le réseau échoue, renvoie /lmnp depuis le cache.
 */
async function cacheFirstWithNetworkFallback(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Fallback : page shell principale
    const fallback = await caches.match("/lmnp");
    return fallback || new Response("Hors ligne — ouvrez ImmoVerdict avec une connexion.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

/**
 * Network-First : réseau d'abord, cache en fallback.
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || new Response("Réseau indisponible", { status: 503 });
  }
}
