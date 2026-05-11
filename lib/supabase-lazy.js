// lib/supabase-lazy.js
//
// ⚠️  PAS D'IMPORT STATIQUE dans ce fichier — intentionnel.
//
// Turbopack (Next.js 16) produit un bug TDZ "Cannot access 'X' before initialization"
// quand @supabase/supabase-js et recharts se retrouvent dans le même chunk.
// LmnpClient.js importe recharts statiquement ET supabase dynamiquement.
// Si le chunk dynamique de supabase contient lui-même un import statique de
// @supabase/supabase-js, Turbopack peut quand même créer un conflit d'ordre
// d'initialisation entre les deux packages.
//
// Ce fichier n'a AUCUN import statique : @supabase/supabase-js est chargé
// par un import() dynamique à l'intérieur de getSupabase(), ce qui garantit
// qu'il est dans un chunk séparé et initialisé après recharts.
//
// Utilisé uniquement par LmnpClient.js.
// Les autres pages (mon-espace, AuthModal, useAuth) utilisent lib/supabase.js.

let _client = null;
let _promise = null;

/**
 * Retourne le client Supabase initialisé (Promise).
 * Singleton — createClient n'est appelé qu'une seule fois.
 * Retourne null si les env vars NEXT_PUBLIC_SUPABASE_URL / ANON_KEY sont absentes.
 */
export async function getSupabase() {
  if (_client !== null) return _client;
  if (_promise !== null) return _promise;

  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  // Import dynamique — @supabase/supabase-js ne sera JAMAIS dans le chunk
  // principal de LmnpClient.js grâce à ce pattern.
  _promise = import("@supabase/supabase-js").then(({ createClient }) => {
    _client = createClient(url, anon, {
      auth: {
        persistSession:      true,
        autoRefreshToken:    true,
        detectSessionInUrl:  true,
      },
    });
    return _client;
  });

  return _promise;
}
