# ImmoVerdict — Roadmap Q2–Q4 2026
**Format :** trimestriel · **Contexte :** développeur solo · **Mise à jour :** 2026-05-06

---

## Vue d'ensemble

| Période | Thème | Jalons clés |
|---------|-------|------------|
| Q2 2026 (mai–juin) | **Fondations techniques & conversion** | Tests unitaires · leads · SEO contenu |
| Q3 2026 (juil–sept) | **Croissance & expérience utilisateur** | Mode RP amélioré · 8 articles · email |
| Q4 2026 (oct–déc) | **Monétisation & différenciation** | Compte utilisateur · rapport PDF · API |

---

## Capacité réaliste (solo dev)

- Disponibilité estimée : **20h/semaine** (projet à temps partiel)
- Allocation : 65 % features · 20 % tests/tech debt · 15 % contenu/SEO
- Jours effectifs / trimestre : **~50 jours×h** soit ~200h

---

## Q2 2026 — Fondations & Conversion
*Mai – Juin 2026 · ~200h disponibles*

### Thème : Solidifier ce qui existe, convertir les visiteurs

| # | Item | Priorité | Effort | Dépendances | Statut |
|---|------|---------|--------|-------------|--------|
| Q2-1 | ✅ SEO — sitemap, robots, schema JSON-LD | P0 | 1j | — | **Done** |
| Q2-2 | ✅ Bug fiscal — CFE dans charges0 | P0 | 0.5j | — | **Done** |
| Q2-3 | ✅ Google Search Console vérification | P0 | 0.5j | Q2-1 | **Done** |
| Q2-4 | ✅ Feature : URL State (partage simulation) | P1 | 2j | — | **Done** |
| Q2-5 | ✅ Feature : Multi-biens portfolio | P1 | 5j | Q2-4 | **Done** |
| Q2-6 | ✅ Feature : Comparaison côte à côte | P1 | 4j | Q2-5 | **Done** |
| Q2-7 | ✅ Blog — articles TRI + rendement locatif | P1 | 2j | Q2-1 | **Done** |
| Q2-8 | Tests unitaires runCalc + amort | P0 | 5j | — | **Done** |
| Q2-9 | ✅ Leads Supabase — formulaire + séquence Resend | P1 | 3j | — | **Done** |
| Q2-10 | ✅ GA4 : events tracking (simul. lancée, résultats vus) | P1 | 1j | — | **Done** |
| Q2-11 | Export PDF du dossier bancaire (HTML → PDF) | P1 | 3j | Q2-6 | **Not started** |

**Charge estimée restante Q2 :** ~12 jours · Capacité restante : ~30h soit ~4j  
⚠️ **Risque capacité** : Q2-8 (tests) + Q2-9 (leads) sont les priorités absolues — reporter Q2-11 en Q3.

### Jalons Q2
- **15 mai** : Tests unitaires écrits et CI configuré (bloque toute regression future)
- **31 mai** : Pipeline leads opérationnel (capture email → Supabase → séquence Resend)
- **30 juin** : GA4 events actifs, premières données de conversion disponibles

---

## Q3 2026 — Croissance & Expérience
*Juillet – Septembre 2026 · ~200h disponibles*

### Thème : SEO longue traîne + simulateur résidence principale enrichi

| # | Item | Priorité | Effort | Dépendances | Statut |
|---|------|---------|--------|-------------|--------|
| Q3-1 | Export PDF dossier bancaire (report de Q2) | P1 | 3j | Q2-8 | Not started |
| Q3-2 | Blog — 4 articles fiscalité LMNP (keywords ~500-2k/mois) | P1 | 4j | — | Not started |
| Q3-3 | Blog — 4 articles résidence principale + PTZ | P1 | 4j | — | Not started |
| Q3-4 | Simulateur /rp : intégration DVF (prix réels) | P2 | 5j | — | Not started |
| Q3-5 | Mode sombre / thème adaptatif | P2 | 2j | — | Not started |
| Q3-6 | ✅ Page /lmnp/comparer URL canonique + SEO | P1 | 1j | Q2-5, Q2-6 | **Done** |
| Q3-7 | Séquence email éducative 5 emails (Resend) | P1 | 3j | Q2-9 | Not started |
| Q3-8 | Widget embed (iframe) pour partenaires | P2 | 4j | Q2-4 | Not started |
| Q3-9 | Partage comparaison — export PNG (html2canvas) | P2 | 2j | Q2-6 | Not started |
| Q3-10 | A/B test CTA landing page (Google Optimize) | P1 | 2j | Q2-10 | Not started |

**Charge estimée Q3 :** ~30j · Capacité : ~50j  
✅ Trimestre confortable — marge pour exploration et polish.

### Jalons Q3
- **31 juillet** : 8 nouveaux articles publiés + indexés
- **31 août** : Séquence email active, premiers taux d'ouverture mesurés
- **30 septembre** : DVF intégré dans /rp, A/B test CTA lancé

### Dépendances Q3
```
Q3-1 ← Q2-8 (tests doivent être en place avant export PDF)
Q3-7 ← Q2-9 (pipeline leads Supabase)
Q3-6 ← Q2-5, Q2-6 (multi-biens + comparaison)
Q3-9 ← Q2-6 (comparaison)
```

---

## Q4 2026 — Monétisation & Différenciation
*Octobre – Décembre 2026 · ~200h disponibles*

### Thème : Compte utilisateur · monétisation douce · partenaires

| # | Item | Priorité | Effort | Dépendances | Statut |
|---|------|---------|--------|-------------|--------|
| Q4-1 | Auth Supabase — espace personnel simulations sauvegardées | P1 | 8j | Q2-9 | Not started |
| Q4-2 | Rapport PDF complet (toutes sections) | P1 | 5j | Q3-1, Q4-1 | Not started |
| Q4-3 | Annuaire de CGP partenaires (monétisation lead) | P2 | 6j | Q4-1 | Not started |
| Q4-4 | API publique simulation (freemium) | P2 | 10j | Q4-1 | Not started |
| Q4-5 | Intégration Stripe — rapport premium | P2 | 5j | Q4-2 | Not started |
| Q4-6 | Blog — 6 articles études de cas (conversion forte) | P1 | 6j | — | Not started |
| Q4-7 | Tests E2E Playwright (parcours complet) | P1 | 4j | Q2-8 | Not started |
| Q4-8 | Optimisation Core Web Vitals (LCP < 2.5s) | P0 | 3j | — | Not started |

**Charge estimée Q4 :** ~47j · Capacité : ~50j  
⚠️ **Risque** : Q4-4 (API) peut déborder — à reporter Q1 2027 si Q4-1 prend du retard.

### Jalons Q4
- **31 octobre** : Auth + simulations sauvegardées live
- **30 novembre** : Rapport PDF premium · test monétisation lancé
- **31 décembre** : Core Web Vitals verts · Bilan annuel trafic / conversion

### Dépendances Q4
```
Q4-1 ← Q2-9 (Supabase leads → Supabase auth, même infra)
Q4-2 ← Q3-1 (export PDF basique déjà fait)
Q4-3 ← Q4-1 (espace perso)
Q4-5 ← Q4-2 (rapport premium = produit à vendre)
Q4-7 ← Q2-8 (tests unitaires = socle)
```

---

## Risques & Mitigations

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|-----------|
| Loi de Finances 2027 change les règles LMNP | Haute | Élevé | Tests unitaires (Q2-8) + alerte veille fiscale déjà en place |
| Trafic SEO stagne sous 1k/mois | Moyenne | Élevé | Accélérer production articles Q3 · backlinks partenaires |
| Absence de tests → régression fiscale | Haute | Critique | Q2-8 en priorité absolue avant toute nouvelle feature |
| Supabase / Resend coûts dépassent budget | Faible | Moyen | Rester free tier jusqu'à 500 leads |
| Concurrent copie l'outil | Moyenne | Moyen | Différenciation par multi-biens + comparaison + CGP |

---

## Ce qui ne sera PAS fait (Won't have 2026)

- Application mobile native (React Native) — trop coûteux solo
- Intégration bancaire directe (agrément ACPR requis)
- Intelligence artificielle pour recommandations de biens
- Multi-langue (EN) — marché trop fragmenté vs effort

---

*Roadmap vivante — révision prévue à chaque fin de trimestre.*
