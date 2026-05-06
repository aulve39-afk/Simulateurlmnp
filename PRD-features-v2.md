# PRD — ImmoVerdict v2 : URL State · Multi-biens · Comparaison

**Produit :** ImmoVerdict — simulateur LMNP & résidence principale  
**Auteur :** Alex  
**Date :** 2026-05-06  
**Statut :** Draft v1  

---

## Contexte produit

ImmoVerdict est un simulateur immobilier client-side (Next.js / React) avec un moteur de calcul couvrant 4 régimes fiscaux LMNP (Micro-BIC, Réel simplifié, SARL de famille, SCI IS) et un TRI calculé par méthode Newton-Raphson. Les simulations sont actuellement éphémères : aucun état n'est persisté, rien n'est partageable, et l'utilisateur ne peut analyser qu'un seul bien à la fois.

---

## Feature 1 — URL State (partage de simulation)

### Problème

Un utilisateur qui configure une simulation complexe (prix, loyer, financement, régime fiscal, horizon) ne peut pas la sauvegarder ni la partager. Il repart de zéro à chaque visite. Les utilisateurs qui veulent montrer une simulation à un conseiller ou à un ami n'ont aucun moyen de le faire.

### Objectifs

1. Permettre de partager une simulation via un simple lien URL
2. Réduire le taux de rebond des sessions avec paramètres pré-remplis
3. Ouvrir la porte aux campagnes marketing avec des simulations pré-configurées (ex : "Simulez un studio à Lyon à 4 200 €/m²")

### Non-objectifs

- Authentification ou espace personnel (trop complexe pour v1 — → feature backlog)
- Sauvegarde côté serveur en base de données (idem)
- Historique des simulations (P2)
- Partage social avec preview de carte (P2)

### User Stories

- En tant qu'investisseur, je veux copier un lien vers ma simulation afin de la partager avec mon comptable sans lui réexpliquer tous les paramètres
- En tant que primo-accédant, je veux ouvrir un lien reçu d'un ami et retrouver sa simulation pré-remplie afin de voir ce qu'il a modélisé
- En tant qu'utilisateur mobile, je veux sauvegarder l'URL dans mes favoris afin de retrouver ma simulation en cours lors de ma prochaine visite

### Spécification technique

**Paramètres à encoder dans l'URL (`/lmnp?...`) :**

| Param | Exemple | Description |
|-------|---------|-------------|
| `prix` | `180000` | Prix net vendeur (€) |
| `notaire` | `8` | Frais de notaire (%) |
| `travaux` | `5000` | Travaux (€) |
| `apport` | `30000` | Apport personnel (€) |
| `duree` | `20` | Durée crédit (ans) |
| `taux` | `3.5` | Taux crédit (%) |
| `loyer` | `850` | Loyer mensuel (€) |
| `charges` | `150` | Charges mensuelles (€) |
| `taxe` | `900` | Taxe foncière (€/an) |
| `cfe` | `200` | CFE (€/an) |
| `regime` | `reel` | `microbic` / `reel` / `sarl` / `sciis` |
| `tmi` | `30` | Tranche marginale d'imposition (%) |
| `horizon` | `15` | Horizon de détention (ans) |
| `revalorisation` | `2` | Revalorisation annuelle (%) |

**Comportement attendu :**

- Au chargement de la page, lire `window.location.search` et pré-remplir les champs correspondants
- Après chaque modification d'un champ, mettre à jour l'URL via `history.replaceState` (pas de rechargement de page)
- Bouton **"Copier le lien"** dans l'interface → copie l'URL courante dans le presse-papier → feedback toast "Lien copié !"
- Les paramètres manquants utilisent les valeurs par défaut existantes

### Critères d'acceptance (P0)

- [ ] Ouvrir `/lmnp?prix=180000&loyer=850&regime=reel` pré-remplit les champs prix et loyer avec le régime Réel sélectionné
- [ ] Modifier un champ met à jour l'URL en temps réel sans recharger la page
- [ ] L'URL copiée dans un nouvel onglet reproduit exactement la simulation
- [ ] Les paramètres inconnus ou malformés sont ignorés silencieusement (pas de crash)
- [ ] Les valeurs hors plage sont clampées à leurs limites min/max

### Critères d'acceptance (P1)

- [ ] Bouton "Copier le lien" visible avec icône et feedback toast
- [ ] Raccourci clavier `Cmd/Ctrl+Shift+C` pour copier le lien
- [ ] L'URL est lisible par un humain (pas encodée en base64)

### Métriques de succès

- Taux d'utilisation du bouton "Copier le lien" ≥ 5 % des sessions (30 jours post-lancement)
- Taux de rebond des sessions avec URL paramétrée ≤ 40 % (vs ~65 % sessions sans)

### Complexité estimée

**🟢 Faible — 1 à 2 jours**  
Pure logique front-end. Pas de backend, pas d'API. Risque : collision avec le routing Next.js App Router (à tester : `useSearchParams()` côté client uniquement).

---

## Feature 2 — Simulation multi-biens (portfolio LMNP)

### Problème

Un investisseur qui détient ou envisage plusieurs biens LMNP doit aujourd'hui faire les calculs bien par bien, noter les résultats quelque part, et comparer manuellement. Il n'existe aucun outil en France permettant de visualiser l'impact fiscal et le cash-flow consolidé d'un portfolio LMNP de 2 à 5 biens.

### Objectifs

1. Permettre la simulation de 2 à 5 biens dans la même session
2. Afficher un tableau de bord consolidé : cash-flow total, TRI moyen pondéré, impôt agrégé
3. Différencier ImmoVerdict de tous les simulateurs single-bien du marché

### Non-objectifs

- Synchronisation cloud du portfolio (P2 — nécessite auth)
- Portfolio illimité (limité à 5 biens en v1 pour éviter la complexité UX)
- Import depuis un fichier CSV ou Excel (P2)
- Gestion de la SCI à l'échelle du portfolio (complexité fiscale trop élevée pour v1)

### User Stories

- En tant qu'investisseur avec 2 biens existants, je veux saisir les deux et voir mon cash-flow mensuel net consolidé afin d'évaluer ma situation réelle
- En tant que futur investisseur, je veux modéliser un deuxième bien en complément de mon premier afin de décider si l'acquisition est pertinente au global
- En tant qu'utilisateur, je veux supprimer un bien du portfolio sans perdre les autres afin de tester différentes compositions

### Spécification technique

**Architecture UI :**

```
[+ Ajouter un bien]  [Bien 1] [Bien 2] [Bien 3]   ← onglets
┌─────────────────────────────────────────────────┐
│  Formulaire du bien sélectionné (identique v1)  │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│  TABLEAU DE BORD PORTFOLIO                      │
│  Cash-flow total : +320 €/mois                  │
│  Investissement total : 380 000 €               │
│  TRI moyen pondéré : 5,4 %                      │
│  Impôt agrégé (Réel) : 0 €/an                   │
└─────────────────────────────────────────────────┘
```

**Logique de calcul consolidé :**
- Chaque bien est calculé indépendamment par le moteur existant `runCalc()`
- Les résultats sont agrégés : Σ cash-flow, Σ investissement, Σ loyers, Σ impôts
- TRI moyen pondéré = moyenne des TRI pondérée par le prix d'acquisition
- Chaque bien peut avoir un régime fiscal différent

**État :**
- Array de `bienState` en `useState` (ou `useReducer`)
- Persisté dans l'URL via Feature 1 : `/lmnp?biens=2&b1.prix=180000&b1.loyer=850&b2.prix=130000&b2.loyer=620`

### Critères d'acceptance (P0)

- [ ] Bouton "+ Ajouter un bien" ajoute un bien vide avec les valeurs par défaut
- [ ] Chaque bien dispose de son propre formulaire complet (tous les champs)
- [ ] Le tableau de bord portfolio affiche le cash-flow mensuel total, l'investissement total et le TRI moyen pondéré
- [ ] Supprimer un bien supprime ses données et recalcule le portfolio
- [ ] Limite de 5 biens maximum avec message d'information clair
- [ ] Chaque bien est nommé par défaut "Bien 1", "Bien 2"... et renommable

### Critères d'acceptance (P1)

- [ ] Glisser-déposer pour réordonner les biens
- [ ] Dupliquer un bien (copier la configuration dans un nouveau bien)
- [ ] Graphique en barres empilées : cash-flow par bien, par mois
- [ ] Export PDF du tableau de bord portfolio

### Métriques de succès

- Taux d'utilisation (sessions avec ≥ 2 biens) ≥ 8 % des sessions simulateur (90 jours post-lancement)
- Durée de session moyenne +30 % par rapport aux sessions single-bien

### Complexité estimée

**🟡 Moyenne — 4 à 6 jours**  
Refactoring de l'état global du simulateur pour passer d'un objet unique à un array. Risque principal : le formulaire actuel (`app/lmnp/page.js`, ~3 500 lignes) est très couplé à un état singleton. Il faudra extraire les paramètres en `bienId` pour éviter les collisions.

---

## Feature 3 — Mode comparaison côte-à-côte

### Problème

Un investisseur hésite souvent entre deux biens spécifiques : même budget, villes ou typologies différentes. Il veut voir les indicateurs clés des deux en un coup d'œil sans jongler entre deux onglets ou deux calculettes. Le mode comparaison transforme ImmoVerdict en outil de décision, pas seulement de simulation.

### Objectifs

1. Afficher deux simulations en colonnes parallèles avec mise en évidence du "gagnant" sur chaque indicateur
2. Réduire le temps de décision pour les investisseurs en phase d'arbitrage
3. Générer un contenu shareable (screenshot / export) qui peut être partagé sur des forums immobiliers

### Non-objectifs

- Comparaison de plus de 2 biens (Feature 2 couvre déjà le multi-biens — ici on veut l'affichage côte-à-côte optimisé pour la décision)
- Recommandation algorithmique ("ImmoVerdict vous conseille le Bien A") — trop prescriptif pour v1
- Sauvegarde de la comparaison en base de données

### User Stories

- En tant qu'investisseur qui hésite entre deux biens, je veux les configurer en parallèle et voir leurs indicateurs côte à côte afin de choisir le meilleur en un coup d'œil
- En tant qu'utilisateur, je veux voir en vert/rouge quel bien "gagne" sur chaque critère afin de comprendre rapidement les compromis
- En tant qu'utilisateur, je veux exporter la comparaison en image ou PDF afin de la partager avec mon courtier ou ma banque

### Spécification technique

**Layout (desktop uniquement en v1) :**

```
┌──────────────────┬──────────────────┐
│    BIEN A        │    BIEN B        │
│  Studio Lyon     │  T2 Nantes       │
├──────────────────┼──────────────────┤
│ Prix total       │ Prix total       │
│ 168 000 €        │ 145 000 €  🏆    │
├──────────────────┼──────────────────┤
│ Rendement brut   │ Rendement brut   │
│ 5,1 %      🏆    │ 4,8 %            │
├──────────────────┼──────────────────┤
│ Cash-flow/mois   │ Cash-flow/mois   │
│ +45 €      🏆    │ -12 €            │
├──────────────────┼──────────────────┤
│ TRI 15 ans       │ TRI 15 ans       │
│ 5,8 %      🏆    │ 4,9 %            │
├──────────────────┼──────────────────┤
│ Impôt annuel     │ Impôt annuel     │
│ 0 €        🏆    │ 0 €        🏆    │
└──────────────────┴──────────────────┘
[Exporter la comparaison]
```

**Indicateurs comparés (par ordre d'affichage) :**

| Indicateur | Gagnant = |
|------------|-----------|
| Rendement brut | Plus élevé |
| Rendement net de charges | Plus élevé |
| Cash-flow mensuel net | Plus élevé |
| TRI sur l'horizon choisi | Plus élevé |
| Investissement total | Plus bas |
| Effort d'épargne mensuel | Plus bas |
| Impôt annuel | Plus bas |
| Payback (années) | Plus bas |

**Accès au mode :**
- Bouton "Comparer deux biens" sur la page `/lmnp`
- Accessible aussi via URL : `/lmnp/comparer?b1.[params]&b2.[params]`
- Sur mobile : affichage en onglets A/B (pas de colonnes parallèles)

### Critères d'acceptance (P0)

- [ ] Le mode comparaison affiche deux colonnes avec le même ensemble de champs
- [ ] Chaque indicateur affiche un badge 🏆 sur le meilleur des deux
- [ ] En cas d'égalité, aucun badge n'est affiché
- [ ] Les deux simulateurs fonctionnent indépendamment (modifier un champ du Bien A ne touche pas le Bien B)
- [ ] L'URL reflète les paramètres des deux biens (partage possible)
- [ ] Sur mobile (< 768 px) : bascule en affichage onglets A / B

### Critères d'acceptance (P1)

- [ ] Bouton "Exporter" génère une image PNG de la comparaison (via `html2canvas`)
- [ ] Score synthétique "ImmoVerdict Score" (moyenne pondérée des indicateurs) en haut de chaque colonne
- [ ] Animation de mise en évidence lors du changement de "gagnant"
- [ ] Pré-remplissage du Bien B avec les valeurs du Bien A (bouton "Copier vers B")

### Métriques de succès

- Taux d'utilisation du mode comparaison ≥ 6 % des sessions (60 jours post-lancement)
- Durée de session moyenne des utilisateurs du mode comparaison ≥ 6 minutes

### Complexité estimée

**🟡 Moyenne — 3 à 5 jours**  
Layout à deux colonnes assez simple. La complexité est dans la synchronisation des états et le responsive mobile. L'export PNG (`html2canvas`) peut être capricieux avec les styles Tailwind — prévoir du temps de polish.

---

## Récapitulatif et priorisation recommandée

| Feature | Valeur utilisateur | Complexité | Priorité recommandée |
|---------|-------------------|------------|---------------------|
| 1. URL State | ⭐⭐⭐⭐⭐ | 🟢 Faible (1-2j) | **Sprint 1** |
| 3. Comparaison | ⭐⭐⭐⭐ | 🟡 Moyenne (3-5j) | **Sprint 2** |
| 2. Multi-biens | ⭐⭐⭐ | 🟡 Moyenne (4-6j) | **Sprint 3** |

**Logique de priorisation :**
- L'URL State est un prérequis partiel pour les deux autres (les URLs paramétrées servent la comparaison et le multi-biens)
- La comparaison a un fort potentiel viral (partage de screenshots sur forums/réseaux)
- Le multi-biens nécessite un refactoring plus profond du state — à faire après validation des deux premières

## Questions ouvertes

| Question | Propriétaire | Bloquante ? |
|----------|-------------|-------------|
| Limite de longueur d'URL (~ 2 000 car.) atteinte avec 5 biens × 15 params ? | Ingénierie | Oui pour Feature 2 |
| Faut-il compresser les paramètres URL (ex: base64) ou accepter des URLs longues ? | Produit | Oui pour Feature 2 |
| L'export PNG de la comparaison est-il suffisant ou faut-il un PDF structuré ? | Produit | Non |
| Mettre un CTA "Partagez votre simulation" pour stimuler la viralité dès Feature 1 ? | Marketing | Non |

---

*Ce document est un draft v1. Il peut être affiné à tout moment.*
