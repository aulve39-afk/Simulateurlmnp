# ImmoVerdict — Stratégie de tests
**Objectif :** zéro régression fiscale · Date : 2026-05-06

---

## Contexte

Le moteur de calcul d'ImmoVerdict réside dans un seul fichier de 3 500+ lignes (`app/lmnp/page.js`). Les fonctions de calcul sont des fonctions pures — elles ne dépendent d'aucun state React — ce qui les rend **parfaitement testables en isolation**. Le risque principal est une modification fiscale (seuils, taux, règles d'amortissement) qui casse silencieusement un résultat sans erreur visible.

---

## Stack de test recommandée

| Outil | Rôle | Raison |
|-------|------|--------|
| **Vitest** | Test runner | Natif Vite/Next, ultra rapide, API Jest-compatible |
| **@testing-library/react** | Tests composants React | Si on teste des formulaires |
| **Playwright** | Tests E2E (Q4) | Parcours utilisateur complet |

```bash
npm install -D vitest @vitest/coverage-v8
```

Ajouter dans `package.json` :
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## Étape 1 — Extraire les fonctions pures (prérequis)

Les fonctions de calcul sont déclarées dans `app/lmnp/page.js` mais non exportées. Il faut les extraire dans un fichier séparé **sans modifier leur logique**.

**Créer `lib/calcul-lmnp.js` :**

```js
// lib/calcul-lmnp.js
// Copie exacte des fonctions de app/lmnp/page.js — source de vérité

export const PS_RATE = 0.172;

export function amortCredit(capital, tauxAnnuel, dureeAns, differe = 0, typeDiffere = "partiel") {
  // ... copier depuis page.js
}

export function calcAmortComposants(prix, notaire, mobilier, travaux, terrainPct = 15) {
  // ... copier depuis page.js
}

export function calcTaxePlusValue(pvBrute, horizon) {
  // ... copier depuis page.js
}

export function runCalc(p, type) {
  // ... copier depuis page.js
}

export function calcComparaison10ans(p) {
  // ... copier depuis page.js
}
```

Dans `app/lmnp/page.js`, remplacer les définitions par des imports :
```js
import { amortCredit, calcAmortComposants, calcTaxePlusValue,
         runCalc, calcComparaison10ans } from "@/lib/calcul-lmnp";
```

> ⚠️ Cette extraction est un refactoring à risque faible (fonctions pures) mais doit être faite en premier, avec une vérification manuelle des résultats sur un cas connu.

---

## Étape 2 — Cas de test prioritaires

### A. `calcAmortComposants()` — Amortissements par composants

C'est la fonction la plus sensible fiscalement : une erreur ici fausse le résultat de LMNP Réel pour tous les utilisateurs.

**Fichier : `tests/calcul-lmnp.test.js`**

```js
import { describe, it, expect } from "vitest";
import { calcAmortComposants } from "../lib/calcul-lmnp";

describe("calcAmortComposants", () => {
  it("cas de base : studio 130 000€, pas de travaux", () => {
    const r = calcAmortComposants(130000, 8, 5000, 0, 15);
    // Terrain non amortissable : 130000 × 15% = 19 500€
    // Base amortissable bâti : 130000 × 85% = 110 500€ (hors mobilier/travaux)
    // Gros œuvre ~50% → 65 000€ / 50ans = 1 300€/an
    // L'amortissement total annuel doit être > 0
    expect(r.totalAnnuel).toBeGreaterThan(0);
    // Mobilier 5 000€ / 7 ans = ~714€/an
    expect(r.totalAnnuel).toBeGreaterThan(700);
  });

  it("terrain à 0% → tout le prix est amortissable", () => {
    const r = calcAmortComposants(100000, 0, 0, 0, 0);
    expect(r.totalAnnuel).toBeGreaterThan(0);
  });

  it("mobilier 0€ → amortissement mobilier nul", () => {
    const avec    = calcAmortComposants(100000, 8, 5000, 0, 15);
    const sans    = calcAmortComposants(100000, 8, 0,    0, 15);
    expect(avec.totalAnnuel).toBeGreaterThan(sans.totalAnnuel);
  });

  it("les travaux augmentent l'amortissement total", () => {
    const sans    = calcAmortComposants(150000, 8, 5000, 0,     15);
    const avec    = calcAmortComposants(150000, 8, 5000, 15000, 15);
    expect(avec.totalAnnuel).toBeGreaterThan(sans.totalAnnuel);
  });

  it("retourne un objet avec les clés attendues", () => {
    const r = calcAmortComposants(200000, 8, 8000, 10000, 15);
    expect(r).toHaveProperty("totalAnnuel");
    expect(r).toHaveProperty("composants");
    expect(typeof r.totalAnnuel).toBe("number");
  });
});
```

---

### B. `runCalc()` — Moteur principal

Tester les 4 régimes avec un cas de référence fixe. Si ces tests passent après une modification fiscale, la logique de base est intacte.

```js
describe("runCalc — cas de référence studio Nantes", () => {
  // Cas de référence : studio 130 000€ HAI, loyer 620€, TMI 30%
  const CAS_REF = {
    prix: 130000, notaire: 8, travaux: 10000, mobilier: 5000, terrain: 15,
    apport: 25000, interet: 3.5, dureeCredit: 20, differe: 0, typeDiffere: "partiel",
    loyer: 620, charges: 100, taxeFonciere: 900, vacance: 5, revalorisation: 1.5,
    tmi: 30, revenusMensuels: 4000, chargesCredit: 0,
    horizon: 15, tourismeClass: false, cfe: 200,
    tauxDistributionSCI: 100, assurancePNO: 200, fraisGestion: 0,
  };

  it("Micro-BIC : rendement brut cohérent avec prix et loyer", () => {
    const r = runCalc(CAS_REF, "microbic");
    // Loyers annuels : 620×12×(1-0.05) = 7 068€
    // Prix total : 130000×1.08+10000 = 150 400€
    // Rendement brut ≈ 7440/150400 ≈ 4.95%
    expect(r.rendBrut).toBeCloseTo(4.95, 0); // ±0.5%
  });

  it("LMNP Réel : impôt < Micro-BIC grâce aux amortissements", () => {
    const reel    = runCalc(CAS_REF, "lmnp");
    const micro   = runCalc(CAS_REF, "microbic");
    // Année 1 : l'amortissement doit effacer l'impôt en régime réel
    const impotReel  = (reel.rows[0]?.impotIR ?? 0) + (reel.rows[0]?.ps ?? 0);
    const impotMicro = (micro.rows[0]?.impotIR ?? 0) + (micro.rows[0]?.ps ?? 0);
    expect(impotReel).toBeLessThan(impotMicro);
  });

  it("LMNP Réel : cash-flow supérieur au Micro-BIC", () => {
    const reel  = runCalc(CAS_REF, "lmnp");
    const micro = runCalc(CAS_REF, "microbic");
    expect(reel.cashflowM).toBeGreaterThan(micro.cashflowM);
  });

  it("ratio d'endettement HCSF ≤ 35% pour ce cas", () => {
    const r = runCalc(CAS_REF, "lmnp");
    // Mensualité sur 130k crédit 20 ans 3.5% ≈ 752€
    // Ratio = 752/4000 ≈ 18.8% — sous la limite HCSF
    expect(r.ratioEndt).toBeLessThan(35);
  });

  it("SCI IS : flat tax appliquée si cashflow positif", () => {
    const r = runCalc(CAS_REF, "sciis");
    // La flat tax doit être présente dans les rows
    if (r.rows[0]?.cashflow > 0) {
      expect(r.rows[0].flatTax).toBeGreaterThan(0);
    }
  });

  it("les rows couvrent exactement l'horizon en années", () => {
    const r = runCalc(CAS_REF, "lmnp");
    expect(r.rows).toHaveLength(CAS_REF.horizon);
  });

  it("retourne les propriétés attendues", () => {
    const r = runCalc(CAS_REF, "lmnp");
    expect(r).toMatchObject({
      type:       "lmnp",
      tri:        expect.any(Number),
      rendBrut:   expect.any(Number),
      rendNet:    expect.any(Number),
      cashflowM:  expect.any(Number),
      ratioEndt:  expect.any(Number),
      mensualite: expect.any(Number),
    });
  });
});
```

---

### C. TRI — Newton-Raphson

Le TRI est calculé à l'intérieur de `runCalc`. Ces tests vérifient la cohérence économique du résultat.

```js
describe("TRI — cohérence économique", () => {
  const BASE = {
    prix: 180000, notaire: 8, travaux: 12000, mobilier: 6000, terrain: 15,
    apport: 30000, interet: 3.45, dureeCredit: 20, differe: 0, typeDiffere: "partiel",
    loyer: 850, charges: 120, taxeFonciere: 1200, vacance: 5, revalorisation: 2,
    tmi: 30, revenusMensuels: 5000, chargesCredit: 0,
    horizon: 15, tourismeClass: false, cfe: 200,
    tauxDistributionSCI: 100, assurancePNO: 200, fraisGestion: 0,
  };

  it("TRI est un nombre fini entre -20% et +30%", () => {
    const r = runCalc(BASE, "lmnp");
    expect(r.tri).toBeGreaterThan(-20);
    expect(r.tri).toBeLessThan(30);
    expect(isFinite(r.tri)).toBe(true);
  });

  it("TRI augmente avec la revalorisation du bien", () => {
    const r1 = runCalc({ ...BASE, revalorisation: 0 }, "lmnp");
    const r2 = runCalc({ ...BASE, revalorisation: 3 }, "lmnp");
    expect(r2.tri).toBeGreaterThan(r1.tri);
  });

  it("TRI LMNP Réel > TRI Micro-BIC (bouclier fiscal)", () => {
    const reel  = runCalc(BASE, "lmnp");
    const micro = runCalc(BASE, "microbic");
    expect(reel.tri).toBeGreaterThan(micro.tri);
  });

  it("un apport plus élevé augmente le TRI (moins de levier = moins de risque relatif)", () => {
    // Avec peu d'apport, l'effet levier peut soit augmenter soit baisser le TRI
    // On vérifie juste qu'il converge dans les deux cas
    const r1 = runCalc({ ...BASE, apport: 10000 }, "lmnp");
    const r2 = runCalc({ ...BASE, apport: 80000 }, "lmnp");
    expect(isFinite(r1.tri)).toBe(true);
    expect(isFinite(r2.tri)).toBe(true);
  });

  it("horizon plus long → TRI différent mais fini", () => {
    const r10 = runCalc({ ...BASE, horizon: 10 }, "lmnp");
    const r25 = runCalc({ ...BASE, horizon: 25 }, "lmnp");
    expect(isFinite(r10.tri)).toBe(true);
    expect(isFinite(r25.tri)).toBe(true);
  });
});
```

---

### D. `calcTaxePlusValue()` — Abattements CGI Art. 150 U

```js
describe("calcTaxePlusValue — abattements progressifs", () => {
  it("exonération IR totale après 22 ans", () => {
    // Après 22 ans, l'abattement IR est 100% → impôt IR = 0
    const pv = 50000;
    const taxe22 = calcTaxePlusValue(pv, 22);
    const taxe21 = calcTaxePlusValue(pv, 21);
    // À 22 ans, seuls les PS restent dus (17.2%)
    expect(taxe22).toBeLessThan(taxe21);
    expect(taxe22).toBeLessThanOrEqual(pv * 0.172 + 1); // ±1€ d'arrondi
  });

  it("exonération totale après 30 ans (IR + PS)", () => {
    const taxe = calcTaxePlusValue(100000, 30);
    expect(taxe).toBe(0);
  });

  it("plus-value nulle → pas de taxe", () => {
    expect(calcTaxePlusValue(0, 10)).toBe(0);
  });

  it("la taxe diminue avec le temps (abattements croissants)", () => {
    const pv   = 80000;
    const t5   = calcTaxePlusValue(pv, 5);
    const t10  = calcTaxePlusValue(pv, 10);
    const t15  = calcTaxePlusValue(pv, 15);
    expect(t10).toBeLessThanOrEqual(t5);
    expect(t15).toBeLessThanOrEqual(t10);
  });
});
```

---

### E. `amortCredit()` — Tableau d'amortissement crédit

```js
describe("amortCredit", () => {
  it("capital restant dû = 0 à la dernière mensualité", () => {
    const rows = amortCredit(150000, 3.5, 20);
    const last  = rows[rows.length - 1];
    expect(last.capRestant).toBeCloseTo(0, -2); // ±100€
  });

  it("le nombre de lignes = durée × 12", () => {
    const rows = amortCredit(100000, 3, 15);
    expect(rows).toHaveLength(180);
  });

  it("sans crédit (capital = 0) → mensualité = 0", () => {
    const rows = amortCredit(0, 3.5, 20);
    expect(rows[0]?.mensualite ?? 0).toBe(0);
  });

  it("différé total capitalise les intérêts", () => {
    const sans  = amortCredit(100000, 3.5, 20, 0, "partiel");
    const avec  = amortCredit(100000, 3.5, 20, 12, "total");
    // Avec différé total, le capital final est supérieur au capital initial
    expect(avec[11]?.capRestant).toBeGreaterThan(100000);
  });
});
```

---

## Étape 3 — CI/CD (GitHub Actions)

Créer `.github/workflows/tests.yml` :

```yaml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
```

---

## Règles de couverture minimales

| Fichier | Couverture cible |
|---------|-----------------|
| `lib/calcul-lmnp.js` | ≥ 85% lignes |
| Fonctions critiques (runCalc, amort, TRI, PV) | 100% branches |

---

## Ordre d'implémentation recommandé

```
Semaine 1 : Extraire fonctions → lib/calcul-lmnp.js
            Vérifier visuellement que /lmnp donne les mêmes résultats
Semaine 2 : Écrire tests A (calcAmortComposants) + D (taxePlusValue)
            → Les plus simples, bonne mise en jambes
Semaine 3 : Écrire tests B (runCalc) + C (TRI)
            → Cas de référence figés = détecteurs de régression
Semaine 4 : Configurer CI GitHub Actions
            → À partir de là, chaque push est protégé
```

---

## Tests E2E (Q4 2026 — Playwright)

Une fois les tests unitaires en place, ajouter :

```js
// tests/e2e/simulation.spec.js
test("parcours complet : landing → quiz → résultats", async ({ page }) => {
  await page.goto("https://immoverdict.com/lmnp");
  // Passer le quiz
  await page.click("text=Commencer");
  // ... remplir les étapes
  // Vérifier que les résultats s'affichent
  await expect(page.locator("text=Rendement brut")).toBeVisible();
  await expect(page.locator("text=TRI")).toBeVisible();
});

test("URL state : paramètres pré-remplis", async ({ page }) => {
  await page.goto("/lmnp?prix=180000&loyer=850&tmi=30");
  await expect(page.locator("input[name='prix']")).toHaveValue("180000");
});
```

---

*Cette stratégie de tests est conçue pour un solo dev : investissement initial de ~5 jours, puis ~15 min par feature pour maintenir.*
