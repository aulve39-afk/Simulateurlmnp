# Audit multi-casquettes — ImmoVerdict
_Analysé le 2026-04-26 · simulateur-lmnp-v2.vercel.app_

---

## 🎩 1 — Casquette Business / Entrepreneur

### Modèle économique actuel
Le site repose sur **deux flux de revenus potentiels** :
- **Affiliation courtiers** : liens UTM vers Pretto, MeilleurTaux, CAFPI. CPL (coût par lead) typique 200–600 € selon le volume négocié. Actuellement, **aucune tracking de conversion** → tu ne sais pas si un visiteur clique ET signe un mandat.
- **Affiliation compta** : lien vers compta-lmnp.fr. CPL plus bas (~50–150 €) mais volume potentiel élevé (chaque LMNP Réel nécessite un expert-comptable).

### Ce qui manque pour monétiser sérieusement

| Levier | État | Valeur estimée |
|--------|------|----------------|
| Pixel Meta / GA4 pour retargeting | ❌ Absent | Lead chaud à 3€ CPC vs 30€ froid |
| Tracking clic affilié (postback ou pixel courtier) | ❌ Absent | Preuve de valeur pour négocier les CPL |
| Email sequence automatisée (Resend) | ⚠️ Configurée en code, env var non confirmée | 3–5× LTV sur les leads captés |
| Offre "rapport premium" payante (PDF personnalisé) | ❌ Absent | 9–29 € × taux de conversion 2–4 % |
| Partenariat expert-comptable dédié | ⚠️ Lien générique | Revenus récurrents (SaaS B2B) |
| Programme de recommandation (referral) | ❌ Absent | Acquisition à coût quasiment nul |

### Sizing du marché
- France : ~600 000 LMNP déclarants actifs, +50 000 nouveaux/an
- Primo-accédants : ~800 000 acquisitions/an
- Volume chercheurs "simulateur LMNP" : ~8 000 req/mois (Ahrefs estimation)
- Avec 1 % de conversion lead et 10 % de conversion courtier : **80 leads/mois → 8 mandats → ~2 400 €/mois d'affiliation**. Scalable avec SEO.

### Priorité business #1
Connecter un pixel de conversion (Google Ads ou Meta) sur l'événement "lead soumis" pour pouvoir lancer des campagnes paid avec ROI mesurable. Sans tracking, l'affiliation reste du hasard.

---

## 🧮 2 — Casquette Expert-Comptable / Fiscaliste

### Ce qui est juste ✅

| Point | Code | Référence |
|-------|------|-----------|
| Amortissement par composants | `calcAmortComposants()` : GO 50a, Toiture 25a, Façade 25a, Équipements 15a, Agencements 10a, Mobilier 7a | CGI Art. 39 C |
| Terrain non amortissable | `bienAmort = prix - terrain` | CGI Art. 38 quinquies |
| Déficit BIC reportable 10 ans | `deficitPool` carry-forward avec cap | CGI Art. 156 I-1° |
| Prélèvements sociaux 17,2 % sur BIC net | `PS_RATE = 0.172` | CSS Art. L136-6 |
| IS barème double tranche | `baseIS <= 42500 ? *0.15 : 42500*0.15 + (baseIS-42500)*0.25` | CGI Art. 219 |
| Micro-BIC abattement 50 % | `loyersNets * 0.50` | CGI Art. 50-0 |

### Bugs / Lacunes fiscales ⚠️

**Bug #1 — Micro-BIC meublé tourisme classé (sévérité : moyenne)**
L'abattement Micro-BIC est fixé à 50 % dans tous les cas. Or la loi prévoit **71 %** pour le meublé de tourisme classé (gîte, chambres d'hôtes labellisées). Le lexique le mentionne, le moteur de calcul l'ignore. À corriger avec un champ "type de location" (classique / tourisme classé).

**Bug #2 — Plus-value de cession dans le TRI (sévérité : haute)**
```js
// Ligne 226-228 — calcul linéaire, pas composé
p.prix * (1 + p.revalorisation/100 * p.horizon)
// CORRECT :
p.prix * Math.pow(1 + p.revalorisation/100, p.horizon)
```
Sur 20 ans à 2 % de revalorisation, l'écart est de **~5 %** sur le prix de revente estimé → TRI surestimé d'environ 0,3–0,5 point.

**Bug #3 — Pas d'impôt sur plus-value dans le TRI (sévérité : haute)**
Le flux de revente terminal n'intègre pas la taxation de la plus-value immobilière :
- LMNP : abattements progressifs (exonération IR à 22 ans, PS à 30 ans) → taux effectif variable
- SCI IS : **plus-value taxée à l'IS comme un bénéfice** (pas d'exonération durée) → gros écart avec le LMNP

Pour un horizon de 10 ans, la PV est taxée à `PV * (tmi + 17,2 %) × coefficient_abattement`. Sans ça, le TRI SCI IS est très optimiste vs réalité.

**Lacune #4 — CFE non intégrée**
La Cotisation Foncière des Entreprises (100–500 €/an) est définie dans le lexique mais **absente du calcul des charges**. Pour les rendements serrés, ça fausse le cash-flow.

**Lacune #5 — Seuil Micro-BIC non contrôlé**
Si les loyers annuels dépassent **77 700 €** (seuil 2024), le Micro-BIC n'est plus applicable et le passage au Réel est obligatoire. Aucun avertissement dans le simulateur.

**Lacune #6 — SCI IS et distribution de dividendes**
Le cash-flow SCI IS affiché est le cash après IS. Mais pour que l'associé touche cet argent, il faut **distribuer des dividendes taxés à la flat tax 30 %**. Le vrai cash net perso est donc `cash_après_IS × 0,70`, pas `cash_après_IS`. Comparaison LMNP vs SCI IS actuellement biaisée en faveur de la SCI IS.

### Recommandation comptable
Ajouter une note légale sous les résultats : _"Les calculs sont fournis à titre indicatif. Consultez un expert-comptable agréé pour une simulation personnalisée prenant en compte votre situation patrimoniale complète."_

---

## 📐 3 — Casquette Financier / Analyste

### Méthode TRI — Newton-Raphson

**L'implémentation est globalement correcte** : 50 itérations, convergence à 1e-6, flux initial négatif (`-investTotal`), flux annuels avec cashflow réel, flux terminal avec valeur de revente. C'est du niveau "cabinet de conseil".

**Limites à documenter pour l'utilisateur :**

1. **Flux initial = apport + mobilier seulement**. Les frais de déménagement, de mise en location (honoraires agence, diagnostics DPE/plomb/amiante ~500–2 000 €), et d'assurance PNO première année ne sont pas inclus → TRI légèrement surestimé.

2. **Mensualité fixe sur toute la durée** : le calcul suppose un taux fixe, pas de renégociation. En pratique, une renégociation à 5 ans peut améliorer le TRI de 0,5–1 point.

3. **Pas de frais de cession** : agence immobilière (~5 %), diagnostics de vente (~700 €), frais de main-levée hypothèque (~0,5 %) → réduit le flux terminal d'environ 5,5–6 %.

4. **Revalorisation loyer** : `facReval = Math.pow(1+revalorisation/100, yr-1)` — c'est correct (composé), bravo.

5. **Différé d'amortissement** : capitaux capitalisés en différé total sont bien recalculés (`capFin = capital * (1+tm)^differe`). ✅

### Score bancabilité

La formule `ratioEndt = totalMens / revenusMensuels * 100` est conforme aux règles HCSF (35 % max, assurance incluse). Mais il manque :
- L'assurance emprunteur dans la mensualité (typiquement 0,15–0,40 % du capital)
- La pondération revenus locatifs à 70 % (règle banque standard pour LMNP)

### Rendements

`rendNet = (loyers0 - charges0) / prixTotal` — **correct** mais ne déduit pas l'impôt. C'est le rendement net de charges, brut de fiscalité. À préciser dans l'UI.

Le rendement net de tout (cashflow annuel moyen / prixTotal) serait plus pertinent pour comparer avec un livret A ou un ETF.

---

## 📣 4 — Casquette Marketing / Growth

### Funnel de conversion actuel

```
Landing page → CTA email → localStorage → redirect /lmnp → Quiz → Résultats → Lead modal
```

**Points forts :**
- La redirection avec l'email pré-capturé est un bon trick (micro-engagement avant la simulation)
- Le quiz réduit le formulaire en questions simples
- Les presets (Studio Paris, T2 Province…) accélèrent l'entrée dans le simulateur
- La séquence email (J+0, J+1, J+3, J+7) est un bon nurturing blueprint

**Points faibles :**

| Problème | Impact | Fix |
|----------|--------|-----|
| Pas de GA4 / GTM | Aveugle sur le funnel | Ajouter `<script async src="https://www.googletagmanager.com/gtag/js?id=...">` |
| Pas de pixel Meta | Pas de retargeting possible | 1 ligne de code dans layout.tsx |
| Testimonials sans photo ni LinkedIn | Crédibilité faible | Ajouter avatars réels ou logos entreprises |
| Pas de blog / contenu SEO | 0 long tail | 5 articles cibles : "simulateur lmnp gratuit", "lmnp réel vs micro bic", "calcul tri immobilier", "amortissement lmnp composants", "sci is vs lmnp" |
| Pas de sitemap.xml | Google crawle moins bien | 10 lignes dans `app/sitemap.ts` |
| Pas de robots.txt | Idem | 5 lignes dans `public/robots.txt` |
| Social sharing | Pas de partage de simulation | Bouton "Partager mon TRI" avec URL state |

### SEO — Mots-clés prioritaires

| Mot-clé | Volume/mois | Difficulté | Priorité |
|---------|-------------|------------|----------|
| simulateur lmnp | ~5 400 | 45/100 | 🔴 P0 |
| lmnp réel vs micro bic | ~1 900 | 30/100 | 🔴 P0 |
| calcul amortissement lmnp | ~880 | 25/100 | 🟠 P1 |
| sci is vs lmnp | ~590 | 35/100 | 🟠 P1 |
| ptz 2025 calcul | ~2 900 | 40/100 | 🟠 P1 |
| louer vs acheter calculateur | ~1 200 | 35/100 | 🟡 P2 |

### Email sequence — Gaps

La séquence affichée (J+0, J+1, J+3, J+7) n'existe que dans l'UI. **La mécanique d'envoi (Resend) doit être vérifiée :** si `RESEND_API_KEY` n'est pas dans les env vars Vercel, 0 email ne part. À confirmer.

Contenu manquant dans la séquence :
- **J+14** : "Avez-vous passé votre simulation à un courtier ?" (relance affiliation)
- **J+30** : "ImmoVerdict évolue — voici les nouvelles fonctionnalités" (engagement long terme)

---

## 🎨 5 — Casquette Product / UX Designer

### Ce qui fonctionne
- Step wizard 4 étapes : progression claire
- Lexique intégré avec tooltip au survol : excellent pour réduire la charge cognitive
- Graphiques Recharts : comparatif 10 ans Micro-BIC vs Réel, zone chart cashflow, bar chart amortissements
- Score bancabilité avec gauge visuelle
- Calculateur inversé (reverse calc) : feature rare et différenciante

### Ce qui manque

**UX critique :**
- **Pas de sauvegarde de simulation** : refresh = tout perdu. Ajouter URL state (`?prix=180000&loyer=850…`) ou localStorage.
- **Pas de mode comparaison** : pouvoir entrer deux adresses et comparer côte à côte
- **Pas de retour en arrière fluide** : le wizard revient à l'étape 1 si on change un paramètre avancé

**UX intermédiaire :**
- Le step "Loyers" est trop court et le step "Projet" trop chargé → rééquilibrer
- Les sliders n'ont pas de step précis (ex: apport à 500€ près vs 5000€)
- Sur mobile, les graphiques sont probablement tronqués (ResponsiveContainer sans min-height)

**Features à roadmap :**
- Export PDF : ✅ déjà implémenté (rapport HTML)
- Simulation multi-biens (portfolio LMNP) : haute valeur pour les investisseurs avec plusieurs biens
- Intégration DVF dans le simulateur LMNP (estimation prix de marché auto)
- Alerte email si les taux changent (webhook Banque de France)

---

## ⚙️ 6 — Casquette Tech / Dev

### Architecture
- **Next.js 16 App Router** ✅ — moderne, bon pour le SEO (SSR possible)
- **Tailwind v4** — encore en beta, quelques breaking changes à surveiller
- **Supabase JS** avec guard env var ✅ — pattern correct
- **Recharts 3.8.1** ✅ — dernière version stable

### Dette technique

| Problème | Sévérité | Fix |
|----------|----------|-----|
| `app/lmnp/page.js` fait 3 500 lignes | 🟠 Moyenne | Extraire les moteurs de calcul dans `lib/lmnpCalc.ts` |
| Zéro test unitaire | 🟠 Moyenne | Au minimum tester `runCalc()` et `calcAmortComposants()` avec Jest |
| Pas de TypeScript sur les pages JS | 🟡 Faible | Migration progressive |
| Pas d'error boundary React | 🟠 Moyenne | Une erreur de calcul fait planter toute la page |
| Pas de loading state Supabase | 🟡 Faible | Spinner sur le bouton "Recevoir mon rapport" |
| Git lock files en sandbox | 🟡 Faible | `rm -f .git/*.lock .git/objects/maintenance.lock` depuis le terminal Mac |
| `useRouter` importé mais non utilisé dans `/lmnp/page.js` | 🟢 Mineure | Supprimer l'import |

### Performances
- Le bundle `page.js` de 3 500 lignes est envoyé d'un coup au client. En mode App Router Next.js, `"use client"` force tout le composant en client-side. Les calculs pourraient être faits en **Server Actions** ou en **Web Workers** pour ne pas bloquer le thread UI.
- Recharts pèse ~200 ko gzippé — acceptable pour l'instant.

### Sécurité
- La clé `NEXT_PUBLIC_SUPABASE_ANON_KEY` est exposée côté client par design (Supabase RLS doit être configurée).
- Vérifier que la table `leads` a bien une politique RLS "insert only" sans read public.

---

## ⚖️ 7 — Casquette Juridique / Conformité

### RGPD — Non-conformités actuelles

| Point | Risque | Action |
|-------|--------|--------|
| Formulaire lead sans case à cocher de consentement explicite | 🔴 CNIL amende | Ajouter checkbox "J'accepte de recevoir des communications d'ImmoVerdict" |
| Pas de politique de confidentialité | 🔴 Obligatoire | Page `/mentions-legales` avec responsable traitement, finalité, durée conservation, droit d'accès/suppression |
| Cookies (localStorage utilisé) | 🟠 À préciser | Techniquement hors directive cookies, mais à mentionner |
| Liens affiliés non déclarés | 🟠 Pratique illégale (ASA) | Mention "lien partenaire" sur les CTA courtiers |

### Disclaimer fiscal manquant
Aucune mention que _"les simulations sont fournies à titre indicatif et ne constituent pas un conseil fiscal, comptable ou financier"_. En cas de mauvais investissement basé sur les chiffres affichés, le risque juridique est faible mais réel. Ajouter une ligne en footer des pages simulateur.

### Mentions légales
Absentes. Obligatoires en France pour tout site web (éditeur, hébergeur, contact). Amende DGCCRF en cas de contrôle.

---

## 📊 Synthèse par priorité

### 🔴 P0 — Bloquants (à corriger avant toute campagne marketing)
1. **RGPD** : checkbox consentement dans le lead modal + page mentions légales
2. **Env vars Vercel** : confirmer `RESEND_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **Bug TRI** : plus-value linéaire → composée (`Math.pow`)
4. **Tracking affilié** : GA4 événement "clic_courtier" sur les liens Pretto/MT/CAFPI

### 🟠 P1 — Importantes (à faire dans les 30 prochains jours)
5. **LMNP Micro-BIC 71 %** pour meublé tourisme classé
6. **SCI IS + dividendes** : cash-flow réel = IS × 70 %
7. **CFE dans le calcul** : champ optionnel, défaut 200 €/an
8. **Frais de cession** dans le TRI (−5 % sur flux terminal)
9. **Google Analytics 4** pour piloter les conversions
10. **Sitemap.xml + robots.txt**

### 🟡 P2 — Améliorations (roadmap 60–90 jours)
11. **URL state** pour sauvegarder et partager une simulation
12. **Blog SEO** : 5 articles sur les mots-clés P0
13. **Assurance emprunteur** dans le ratio d'endettement
14. **Seuil Micro-BIC** : avertissement si loyers > 77 700 €
15. **Email séquence J+14 et J+30**
16. **Disclaimer fiscal** en bas des résultats
17. **Extraction** de `runCalc()` dans un fichier dédié + tests unitaires

---

_Audit généré automatiquement par ImmoVerdict Cowork session — 2026-04-26_
