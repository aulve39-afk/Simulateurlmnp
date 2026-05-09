# Audit complet ImmoVerdict — 9 mai 2026

Audit réalisé via : Vercel MCP · Supabase MCP · lecture des sources.  
Déploiement audité : commit `bbb8781` · prod READY.

---

## 1. DÉPLOIEMENT VERCEL

| Critère | Statut | Détail |
|---------|--------|--------|
| Dernière prod | ✅ READY | commit `bbb8781` — design nav + email inline + italic + a11y |
| Erreurs runtime (30 j) | ✅ 0 | Aucune erreur serverless ni edge |
| Bundler | ✅ Turbopack | |
| Cron configuré | ✅ | `0 8 * * *` → `/api/cron/email-sequence` |
| Build errors masqués | ⚠️ | `ignoreBuildErrors: true` + `ignoreDuringBuilds: true` dans next.config.ts — les erreurs TS/ESLint ne bloquent pas le build |

**Note :** plusieurs déploiements en ERROR visibles dans l'historique (commits entre `5872242` et `8677241`) — ce sont d'anciens commits avec des builds cassés, maintenant résolus. La prod actuelle est saine.

---

## 2. SUPABASE

**Projet :** `simulateur-lmnp` · ID `oldyiqgqajfqvxtdbryb` · région `eu-west-3` · statut `ACTIVE_HEALTHY`

### Tables

| Table | Lignes | RLS | Commentaire |
|-------|--------|-----|-------------|
| `leads` | 0 | ✅ activé | Email unique, champs J+14/J+30 présents |
| `profils` | 0 | ✅ activé | Lié à auth.users |
| `projets` | 0 | ✅ activé | JSON params + champs numériques |

### Alertes sécurité (Supabase Advisor)

| Sévérité | Problème | Correction |
|----------|----------|------------|
| ⚠️ WARN | `handle_new_user()` SECURITY DEFINER appelable par le rôle `anon` via `/rest/v1/rpc/handle_new_user` | Révoquer `EXECUTE` au rôle `anon` sur cette fonction |
| ⚠️ WARN | `handle_new_user()` SECURITY DEFINER appelable par le rôle `authenticated` | Idem ou passer en `SECURITY INVOKER` |
| ⚠️ WARN | `handle_new_user` et `handle_updated_at` : `search_path` mutable | Ajouter `SET search_path = public` dans la définition de la fonction |
| ⚠️ INFO | `leads` : politique INSERT `anyone can insert leads` avec `WITH CHECK (true)` | Intentionnel (capture email publique) — acceptable |

**Correction rapide search_path** (SQL à exécuter dans Supabase > SQL Editor) :
```sql
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$ BEGIN INSERT INTO public.profils(id) VALUES (NEW.id); RETURN NEW; END; $$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
```

### Alertes performance (Supabase Advisor)

| Sévérité | Problème | Correction |
|----------|----------|------------|
| ⚠️ WARN | 6 politiques RLS sur `profils` et `projets` réévaluent `auth.uid()` par ligne | Remplacer `auth.uid()` par `(select auth.uid())` dans chaque politique |
| ℹ️ INFO | `projets.user_id` FK sans index couvrant | Ajouter `CREATE INDEX ON projets(user_id);` |

**Correction RLS perf** (SQL) :
```sql
-- profils
DROP POLICY IF EXISTS "Users can view own profile" ON public.profils;
CREATE POLICY "Users can view own profile" ON public.profils
  FOR SELECT USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profils;
CREATE POLICY "Users can insert own profile" ON public.profils
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profils;
CREATE POLICY "Users can update own profile" ON public.profils
  FOR UPDATE USING ((select auth.uid()) = id);

-- projets (répéter pour chaque politique view/insert/update/delete)
DROP POLICY IF EXISTS "Users can view own projects" ON public.projets;
CREATE POLICY "Users can view own projects" ON public.projets
  FOR SELECT USING ((select auth.uid()) = user_id);
-- ... etc.

-- Index FK manquant
CREATE INDEX IF NOT EXISTS idx_projets_user_id ON public.projets(user_id);
```

---

## 3. PIPELINE EMAIL (Cron + Resend)

| Critère | Statut | Détail |
|---------|--------|--------|
| Route cron | ✅ | `app/api/cron/email-sequence/route.js` |
| Planification | ✅ | `0 8 * * *` (tous les jours à 8h) |
| Fenêtre J+14 et J+30 | ✅ | ±1 jour via `windowISO()`, sentinel `emailed_j14`/`emailed_j30` |
| Templates HTML | ✅ | Emails riches, données personnalisées (TRI, cash-flow, prix) |
| Sécurité cron | ⚠️ | `CRON_SECRET` est **optionnel** — si la variable n'est pas définie dans Vercel, l'endpoint répond sans authentification |
| Lien désabonnement | ⚠️ | Pointe vers `/mentions-legales` — pas un vrai endpoint de désabonnement (non conforme RGPD) |
| `RESEND_FROM` | ⚠️ | Variable env présente mais inutilisée — le code utilise `RESEND_FROM_EMAIL`. À supprimer. |

### 🔴 GAP CRITIQUE : leads homepage hors séquence email

Les formulaires email de la **homepage** (`immoverdict.html`) utilisent **formsubmit.co** :
```js
fetch('https://formsubmit.co/ajax/contact@immoverdict.com', ...)
```
Ces leads arrivent par email dans votre boîte contact mais **ne sont PAS insérés dans la table `leads` Supabase**. Ils ne recevront donc **jamais** les emails J+14 et J+30.

Seuls les leads capturés depuis **le simulateur `/lmnp`** (via `sb.from("leads").upsert(...)`) entrent dans la séquence automatisée.

**Fix recommandé :** Remplacer formsubmit.co par votre propre API dans `immoverdict.html` :

```js
// Remplacer les 3 occurrences de fetch('https://formsubmit.co/...') par :
fetch('/api/leads', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, source: 'homepage' }),
})
```

Et créer `app/api/leads/route.js` qui fait l'upsert Supabase.

---

## 4. SEO & SITEMAP

| Critère | Statut | Détail |
|---------|--------|--------|
| sitemap.xml | ✅ | 33 URLs (8 pages + 25 articles) |
| robots.txt | ✅ | Bloque `/api/` et `/_next/`, pointe vers sitemap |
| Articles blog (.md) | ✅ | 25 fichiers = 25 entrées sitemap — correspondance parfaite |
| OG meta (layout.tsx) | ✅ | og:title, og:description, og:image 1200×630, og:url, locale fr_FR |
| Twitter Card | ✅ | summary_large_image |
| Vérification Google Search Console | ✅ | Meta tag présent dans layout.tsx |
| Robots index | ✅ | `index: true, follow: true` |
| JSON-LD | ✅ | WebSite + Article + Person + ItemList |
| `metadataBase` | ⚠️ | Absent de layout.tsx — Next.js peut générer des canonicals relatifs |

**Action recommandée :** Ajouter dans layout.tsx :
```ts
export const metadata: Metadata = {
  metadataBase: new URL('https://immoverdict.com'),
  // ... reste inchangé
};
```

---

## 5. PWA

| Critère | Statut | Détail |
|---------|--------|--------|
| manifest.json | ✅ | name, short_name, icons, shortcuts, screenshots, categories |
| Icon 192×192 PNG | ✅ | `/icon-192.png` |
| Icon 512×512 PNG maskable | ✅ | `/icon-512.png` |
| apple-touch-icon 180×180 | ✅ | `/apple-touch-icon.png` |
| Service Worker | ✅ | Cache-First (assets), Network-First (API), SWR (pages) |
| offline.html | ✅ | Fallback hors-ligne |
| Cache version | ⚠️ | `CACHE_VERSION = "immoverdict-v1"` hardcodé — pas de purge automatique entre déploiements |

**Fix :** Incrémenter manuellement à chaque release majeure (`v2`, `v3`…) ou dériver du BUILD_ID.

---

## 6. SÉCURITÉ HTTP

| Header | Valeur | Statut |
|--------|--------|--------|
| X-Frame-Options | DENY | ✅ |
| X-Content-Type-Options | nosniff | ✅ |
| Strict-Transport-Security | max-age=63072000; includeSubDomains; preload | ✅ HSTS 2 ans |
| Referrer-Policy | strict-origin-when-cross-origin | ✅ |
| Permissions-Policy | camera=(), microphone=(), geolocation=() | ✅ |
| X-XSS-Protection | 1; mode=block | ✅ |
| **Content-Security-Policy** | **absent** | ⚠️ Seul header manquant |

**CSP recommandé** (à ajouter dans `next.config.ts`) :
```ts
{
  key: "Content-Security-Policy",
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com",
    "img-src 'self' data: https://www.google-analytics.com",
    "connect-src 'self' https://*.supabase.co https://www.google-analytics.com https://api.resend.com https://api.dvf.gouv.fr https://formsubmit.co",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "frame-ancestors 'none'",
  ].join("; ")
}
```

---

## 7. ROUTES & PAGES

| Route | Fichier | Statut |
|-------|---------|--------|
| `/` | `public/immoverdict.html` (rewrite) | ✅ |
| `/lmnp` | `app/lmnp/page.js` | ✅ |
| `/lmnp/comparer` | `app/lmnp/comparer/page.js` | ✅ |
| `/rp` | `app/rp/page.js` | ✅ |
| `/blog` | `app/blog/page.js` | ✅ |
| `/blog/[slug]` | `app/blog/[slug]/page.js` | ✅ |
| `/a-propos` | `app/a-propos/page.js` | ✅ |
| `/mentions-legales` | `app/mentions-legales/page.js` | ✅ |
| `/politique-confidentialite` | `app/politique-confidentialite/page.js` | ✅ |
| 404 | `app/not-found.tsx` | ✅ |
| `/api/cron/email-sequence` | route.js | ✅ |
| `/api/dvf` | route.js | ✅ Proxy données DVF |
| `/api/send-report` | route.js | ✅ Export PDF par email |
| `/api/leads` | **absent** | 🔴 À créer (voir §3) |
| `/api/unsubscribe` | **absent** | 🔴 RGPD — requis |

---

## 8. ACCESSIBILITÉ & MOBILE

| Critère | Statut | Détail |
|---------|--------|--------|
| Skip-nav | ✅ | "Aller au contenu" sur toutes les pages |
| Labels email sr-only | ✅ | CTA hero + inline capture |
| Focus visible | ✅ | `a:focus-visible { outline: 2px solid #F97316 }` |
| Responsive 768px/640px | ✅ | Grille 1 colonne, nav simplifiée, padding réduit |
| Touch targets | ✅ | Boutons ≥ 44px |
| Contraste couleurs | ⚠️ | Non mesuré automatiquement — passer Lighthouse |

---

## 9. TRACKING & ANALYTICS

| Critère | Statut | Détail |
|---------|--------|--------|
| GA4 — pages Next.js | ✅ | `NEXT_PUBLIC_GA_ID` dans layout.tsx |
| GA4 — homepage HTML | ✅ | Tag GA4 intégré dans immoverdict.html |
| Events funnel | ✅ | quiz_started → simulation_started → step_completed → results_viewed → pdf_downloaded → simulation_shared → compare_toggled |
| Env var `GA_ID` | ⚠️ | Référencée dans grep mais `layout.tsx` utilise `NEXT_PUBLIC_GA_ID` — `GA_ID` potentiellement inutilisée |

---

## 10. QUALITÉ CODE

| Critère | Statut | Détail |
|---------|--------|--------|
| Tests Vitest | ✅ | 59 tests sur la logique de calcul LMNP |
| CI GitHub Actions | ✅ | Tourne à chaque push sur main |
| TypeScript strict | ⚠️ | `ignoreBuildErrors: true` — erreurs silencieuses |
| ESLint | ⚠️ | `ignoreDuringBuilds: true` — warnings ignorés |

---

## PLAN D'ACTION PAR PRIORITÉ

### 🔴 Critique (fonctionnel cassé)
| # | Action | Effort |
|---|--------|--------|
| 1 | Créer `/api/leads` et remplacer formsubmit.co dans immoverdict.html → leads homepage dans séquence J+14/J+30 | 1h |
| 2 | Créer `/api/unsubscribe` → lien RGPD fonctionnel dans les emails | 30 min |

### 🟡 Important (sécurité/perf Supabase — SQL Editor)
| # | Action | Effort |
|---|--------|--------|
| 3 | Corriger `search_path` sur `handle_updated_at` et `handle_new_user` | 5 min |
| 4 | Révoquer `EXECUTE` sur `handle_new_user()` pour `anon` et `authenticated` | 2 min |
| 5 | Wrapper `(select auth.uid())` dans les 6 politiques RLS | 10 min |
| 6 | Ajouter index `CREATE INDEX ON projets(user_id)` | 1 min |

### 🟢 Amélioration (polish)
| # | Action | Effort |
|---|--------|--------|
| 7 | Ajouter `metadataBase: new URL('https://immoverdict.com')` dans layout.tsx | 2 min |
| 8 | Ajouter header CSP dans next.config.ts | 10 min |
| 9 | Définir `CRON_SECRET` dans les variables Vercel si absent | 2 min |
| 10 | Incrémenter `CACHE_VERSION` dans sw.js pour vider le cache PWA | 1 min |
| 11 | Supprimer la variable env `RESEND_FROM` (inutilisée) dans Vercel | 2 min |
| 12 | Passer `ignoreBuildErrors: false` quand le projet est stabilisé | 2 min |

---

*Prochain audit recommandé : dans 30 jours — vérifier leads count Supabase, GA4 funnel drop-off, Core Web Vitals Lighthouse, positions Search Console.*
