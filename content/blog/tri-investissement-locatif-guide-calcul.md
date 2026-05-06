---
title: "TRI Immobilier : comment calculer le Taux de Rendement Interne de votre investissement locatif"
description: "Le TRI est l'indicateur le plus complet pour évaluer un investissement immobilier locatif. Guide complet avec formule, exemples chiffrés et comparaison avec le rendement brut."
date: "2026-05-06"
category: "Analyse financière"
readingTime: "11 min"
image: "/og-image.png"
---

## Pourquoi le rendement brut ne suffit pas

Quand un agent immobilier vous annonce « 6 % de rendement », il parle du **rendement brut** : loyers annuels divisés par le prix d'achat. C'est un chiffre utile pour comparer rapidement deux biens, mais il cache l'essentiel.

Il ne tient pas compte de l'impôt, du crédit, des charges, ni de ce que vous récupérez à la revente. Deux biens avec un rendement brut identique peuvent avoir des rentabilités réelles très différentes.

C'est là qu'intervient le **TRI — Taux de Rendement Interne**. C'est l'indicateur que les professionnels de l'investissement utilisent pour prendre leurs décisions.

---

## Qu'est-ce que le TRI ?

Le TRI (Taux de Rendement Interne) mesure la rentabilité **globale** d'un investissement en prenant en compte **tous les flux de trésorerie** sur toute la durée de détention :

- Le capital investi au départ (apport + frais)
- Les loyers encaissés chaque année, nets de charges et d'impôts
- Le remboursement du crédit
- Le produit de la revente (prix de vente moins frais d'agence et impôt sur la plus-value)

Techniquement, le TRI est le taux d'actualisation qui rend nulle la Valeur Actuelle Nette (VAN) de tous ces flux. En clair : c'est le taux de rendement annuel composé que vous obtenez réellement sur votre argent investi.

**Un TRI de 6 % signifie que chaque euro que vous avez mis dans cet investissement vous rapporte 6 % par an en moyenne, tout compris.**

---

## TRI vs rendement brut : la différence en chiffres

Prenons un exemple concret : studio à Lyon, 160 000 € (frais de notaire inclus), loyer 720 €/mois.

| Indicateur | Valeur | Ce qu'il mesure |
|------------|--------|-----------------|
| Rendement brut | 5,4 % | Loyers / Prix (avant tout) |
| Rendement net de charges | 3,8 % | Après charges, avant impôt et crédit |
| Rendement net-net | 2,9 % | Après charges et impôt |
| **TRI sur 15 ans** | **5,1 %** | Tout compris, crédit + revente |

Le rendement brut surestimait la rentabilité de presque 0,3 point. Sur 15 ans avec effet de levier, la différence entre un bon et un mauvais investissement peut représenter plusieurs dizaines de milliers d'euros.

---

## Les 4 composantes du TRI immobilier

### 1. L'apport initial (flux négatif t=0)

C'est l'argent que vous sortez de votre poche au départ :
- Apport personnel
- Mobilier (pour le LMNP)
- Éventuellement : frais de garantie, frais de dossier bancaire

Les frais de notaire sont généralement financés à crédit et **ne font pas partie du flux initial**.

### 2. Les flux annuels nets

Pour chaque année de détention :

```
Flux annuel = Loyers perçus
            − Charges (copropriété, assurances, taxe foncière, CFE)
            − Mensualité de crédit
            − Impôt sur les revenus locatifs
```

En LMNP au régime réel, les premières années, l'amortissement efface souvent l'impôt → **l'impôt = 0 €** pendant 8 à 15 ans. C'est ce qu'on appelle le bouclier fiscal, et c'est ce qui tire le TRI du LMNP vers le haut.

### 3. Le flux terminal (revente)

À la fin de l'horizon d'investissement, vous revendez :

```
Flux terminal = Prix de vente
              − Frais d'agence (~5 %)
              − Impôt sur la plus-value
              − Capital restant dû sur le crédit
```

L'impôt sur la plus-value en LMNP bénéficie d'**abattements progressifs** : exonération d'IR après 22 ans, de prélèvements sociaux après 30 ans. C'est un paramètre majeur du TRI à long terme.

> ⚠️ Depuis février 2025, les amortissements déduits sont réintégrés dans la plus-value imposable au moment de la revente. Cela réduit légèrement le TRI LMNP calculé avant cette réforme.

### 4. L'effet de levier du crédit

Le crédit amplifie le TRI. Vous investissez 30 000 € d'apport sur un bien à 200 000 €. Si le bien prend 2 %/an, votre patrimoine net augmente de 4 000 €/an, soit **13 %** de votre apport initial. C'est le levier immobilier.

---

## Comment calculer le TRI : la méthode Newton-Raphson

Le TRI ne se calcule pas avec une formule simple. Il faut résoudre l'équation :

**VAN(TRI) = Σ [Flux(t) / (1 + TRI)^t] = 0**

En pratique, on utilise la méthode Newton-Raphson (itération numérique convergente) ou la fonction `TRI` d'Excel.

**Dans Excel :**
1. Listez vos flux en colonne : -30 000 (apport), puis les flux nets annuels, puis le flux terminal
2. Tapez `=TRI(A1:A16)` (pour 15 ans + l'apport)
3. Le résultat est votre TRI annuel

**Règles de lecture :**

| TRI | Interprétation |
|-----|----------------|
| < 3 % | Faible — livret A ou ETF font mieux sans contrainte |
| 3–5 % | Acceptable — à contextualiser selon le risque |
| 5–7 % | Bon — investissement rentable |
| > 7 % | Excellent — chercher pourquoi c'est si bon |
| > 10 % | Suspect — vérifier les hypothèses |

---

## Les variables qui font varier le TRI

### La revalorisation du bien

C'est souvent la variable qui fait le plus varier le TRI. Sur 15 ans :

| Revalorisation annuelle | TRI estimé (même bien) |
|-------------------------|------------------------|
| 0 % (stagnation) | 2,8 % |
| 1 % | 4,2 % |
| 2 % | 5,7 % |
| 3 % | 7,4 % |

→ L'emplacement est la décision la plus impactante sur le TRI.

### L'horizon d'investissement

Plus vous gardez longtemps :
- Les abattements sur plus-value augmentent
- L'amortissement du crédit réduit le capital restant dû
- L'effet de levier joue pleinement

Un TRI sur 10 ans est souvent inférieur à un TRI sur 20 ans sur le même bien.

### Le régime fiscal

| Régime | Impact TRI |
|--------|------------|
| Micro-BIC | Neutre à négatif (impôt dès la première année) |
| LMNP Réel | Fort positif (0 € d'impôt pendant 10-15 ans) |
| SCI IS | Variable — attention à la double imposition à la revente |
| Location nue | Intermédiaire |

---

## TRI et effet de levier : un exemple complet

**Bien :** T2 à Bordeaux, 180 000 € HAI, loyer 850 €/mois
**Financement :** 30 000 € d'apport, crédit 150 000 € sur 20 ans à 3,5 %
**Régime :** LMNP Réel
**Horizon :** 15 ans, revalorisation 2 %/an

| Flux | Montant |
|------|---------|
| Apport initial | −30 000 € |
| Cash-flow annuel moyen (années 1-12) | +780 €/an |
| Cash-flow annuel moyen (années 13-15, après bouclier fiscal) | −1 200 €/an |
| Flux terminal (revente nette, après frais et PV) | +68 000 € |
| **TRI calculé** | **6,8 %** |

À titre de comparaison, investir 30 000 € sur un ETF MSCI World rapportait ~7,5 %/an sur la même période — mais sans levier, sans protection contre l'inflation immobilière, et avec une volatilité beaucoup plus forte.

---

## Les limites du TRI à connaître

Le TRI suppose que les flux intermédiaires sont **réinvestis au même taux**. En réalité, votre cash-flow positif de 780 €/an ne sera pas réinvesti à 6,8 %. C'est pourquoi certains financiers préfèrent le **TRIM** (Taux de Rendement Interne Modifié), qui permet de spécifier le taux de réinvestissement.

Autres limites :
- Ne prend pas en compte la liquidité (l'immobilier n'est pas vendable en 24h)
- Les hypothèses de revalorisation sont incertaines
- Ne mesure pas le risque (vacance, impayés, travaux imprévus)

---

## Utilisez notre simulateur pour calculer votre TRI

ImmoVerdict calcule automatiquement votre TRI selon :
- Votre régime fiscal (Micro-BIC, Réel, SCI IS, SARL)
- Le financement exact (crédit, apport, différé, taux)
- Les amortissements par composants
- La taxation de la plus-value (avec abattements CGI Art. 150 U)
- Les frais de cession (5,5 %)

**La simulation prend 2 minutes et vous donne un TRI réaliste, pas optimiste.**

> 📌 Note : cet article est fourni à titre pédagogique. Il ne constitue pas un conseil en investissement. Consultez un conseiller en gestion de patrimoine agréé avant toute décision.
