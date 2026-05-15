/* ═══════════════════════════════════════════════════
   ImmoVerdict — Service Worker v9
   NUCLEAR RESET : purge TOUS les caches existants
   (v1 → v8 compris) puis passe en mode network-only.

   Raison : les caches v1–v8 stockaient des chunks
   Next.js avec hashes périmés (TDZ Turbopack).
   Ce SW v9 nettoie définitivement les navigateurs
   qui avaient un ancien SW actif.
═══════════════════════════════════════════════════ */

const SW_VERSION = "immoverdict-v9";

// ── Install : purge TOUS les caches, aucune mise en cache ──
self.addEventListener("install", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => {
        console.log("[SW v9] Tous les caches supprimés.");
        return self.skipWaiting();
      })
  );
});

// ── Activate : re-vérifie, prend le contrôle immédiatement ──
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => {
        // Signale aux onglets ouverts de recharger la page
        // pour s'assurer qu'ils utilisent les chunks frais du serveur.
        return self.clients.matchAll({ includeUncontrolled: true, type: "window" });
      })
      .then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: "SW_CACHE_CLEARED" });
        });
      })
  );
});

// ── Fetch : network-only, aucun cache ──
// On ne met RIEN en cache — chaque ressource est toujours
// récupérée depuis le réseau. Pas d'interférence possible.
self.addEventListener("fetch", event => {
  // Laisser le navigateur gérer toutes les requêtes normalement.
  // Ne pas appeler event.respondWith() = comportement navigateur par défaut.
});
