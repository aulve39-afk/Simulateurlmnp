/**
 * lib/calcul-lmnp.js
 * Moteurs de calcul purs — ImmoVerdict
 *
 * Ces fonctions sont extraites de app/lmnp/page.js pour être
 * testables indépendamment (Vitest). Aucune dépendance React.
 */

/* ── Tableau d'amortissement du crédit ─────────────────────────────────────
   capital      : montant emprunté (€)
   tauxAnnuel   : taux annuel hors assurance (%)
   dureeAns     : durée (années)
   differe      : durée du différé (mois, 0 = aucun)
   typeDiffere  : "partiel" (intérêts seuls) | "total" (intérêts capitalisés)
   Retourne un tableau de 20 lignes (1 par an) avec : interets, capital, capRestant, mensualite
   ──────────────────────────────────────────────────────────────────────── */
export function amortCredit(capital, tauxAnnuel, dureeAns, differe = 0, typeDiffere = "partiel") {
  const tm = tauxAnnuel / 100 / 12;
  const n = dureeAns * 12;
  let capFin = capital;
  if (differe > 0 && typeDiffere === "total") capFin = capital * Math.pow(1 + tm, differe);
  const mens = capFin > 0 && tm > 0 ? (capFin * tm) / (1 - Math.pow(1 + tm, -n)) : 0;
  let cap = capFin;
  const rows = [];
  for (let yr = 1; yr <= Math.max(dureeAns, 20); yr++) {
    if (yr > dureeAns) {
      rows.push({ an: yr, interets: 0, capital: 0, capRestant: 0, mensualite: 0 });
      continue;
    }
    let iAn = 0, cAn = 0;
    for (let m = 0; m < 12; m++) {
      const im = cap * tm;
      const cm = Math.min(mens - im, cap);
      iAn += im;
      cAn += cm;
      cap = Math.max(0, cap - cm);
    }
    rows.push({
      an: yr,
      interets: Math.round(iAn),
      capital: Math.round(cAn),
      capRestant: Math.round(cap),
      mensualite: Math.round(mens),
    });
  }
  return rows;
}

/* ── Amortissement par composants (CGI Art. 39 C) ──────────────────────────
   Décompose le bien en composants chacun amorti sur sa durée propre.
   Retourne { totalAnnuel, chartData }
   ──────────────────────────────────────────────────────────────────────── */
export function calcAmortComposants(prix, notaire, mobilier, travaux, terrainPct = 15) {
  const terrain = prix * (terrainPct / 100); // terrain non amortissable
  const bienAmort = prix - terrain;
  const composants = {
    "Gros œuvre":  { base: bienAmort * 0.50, duree: 50 },
    "Toiture":     { base: bienAmort * 0.10, duree: 25 },
    "Façade":      { base: bienAmort * 0.10, duree: 25 },
    "Équipements": { base: bienAmort * 0.15, duree: 15 },
    "Agencements": { base: bienAmort * 0.15, duree: 10 },
    "Mobilier":    { base: mobilier,          duree:  7 },
    "Travaux":     { base: travaux,            duree: 12 },
  };
  const totalAnnuel = Object.values(composants).reduce((s, c) => s + c.base / c.duree, 0);
  return {
    totalAnnuel: Math.round(totalAnnuel),
    chartData: Object.entries(composants)
      .map(([name, c]) => ({ name, montant: Math.round(c.base / c.duree), duree: c.duree }))
      .filter((d) => d.montant > 0),
  };
}

/* ── Impôt sur plus-value immobilière (CGI Art. 150 U) ─────────────────────
   Régime des particuliers — applicable au LMNP, Micro-BIC, SCI IR, location nue.
   SCI IS utilise le régime des bénéfices d'entreprise (pas d'abattement temporel).

   Barème abattements IR (taux 19 %) :
     • Années 1–5  : 0 %
     • Années 6–21 : 6 % / an   →  exonération totale IR dès la 22e année
     • Année 22    : 4 %        →  exonération totale IR dès la 22e année

   Barème abattements PS (taux 17,2 %) :
     • Années 1–5  : 0 %
     • Années 6–21 : 1,65 % / an
     • Année 22    : 1,60 %
     • Années 23–30: 9 % / an   →  exonération totale PS dès la 30e année
   ──────────────────────────────────────────────────────────────────────── */
export function calcTaxePlusValue(pvBrute, annees) {
  if (pvBrute <= 0) return 0;

  // Abattement IR
  let abattIR = 0;
  if (annees >= 22) {
    abattIR = 1; // exonéré IR
  } else if (annees >= 6) {
    abattIR = (annees - 5) * 0.06; // 6 %/an à partir de la 6e année
  }

  // Abattement PS
  let abattPS = 0;
  if (annees >= 30) {
    abattPS = 1; // exonéré PS
  } else if (annees >= 23) {
    abattPS = 16 * 0.0165 + 0.016 + (annees - 22) * 0.09;
  } else if (annees >= 22) {
    abattPS = 16 * 0.0165 + 0.016; // 28 %
  } else if (annees >= 6) {
    abattPS = (annees - 5) * 0.0165;
  }
  abattPS = Math.min(abattPS, 1);

  const taxeIR = pvBrute * Math.max(0, 1 - abattIR) * 0.19;
  const taxePS = pvBrute * Math.max(0, 1 - abattPS) * 0.172;
  return Math.round(taxeIR + taxePS);
}

/* ── Simulation annuelle multi-régimes ─────────────────────────────────────
   p    : objet paramètres (voir DEFAULTS dans page.js)
   type : "lmnp" | "microbic" | "sciis" | "sciir" | "nue"
   Retourne { type, rows, tri, rendBrut, rendNet, cashflowM,
              cashflowApresFlatTaxM, ratioEndt, mensualite, amort, investTotal }
   ──────────────────────────────────────────────────────────────────────── */
export function runCalc(p, type = "lmnp") {
  const capital    = p.prix + p.travaux + p.prix * (p.notaire / 100) - p.apport;
  const creditRows = amortCredit(capital, p.interet, p.dureeCredit, p.differe, p.typeDiffere);
  const mensualite = creditRows[0]?.mensualite ?? 0;
  const terrainPct = p.terrain ?? 15;
  const amort      = calcAmortComposants(p.prix, p.notaire, p.mobilier, p.travaux, terrainPct);

  const PS_RATE = 0.172;

  const rows = [];
  let cumCashflow   = 0;
  let deficitPool   = 0; // déficit reportable LMNP — art. 156 CGI, 10 ans
  let deficitPoolIS = 0; // déficit reportable SCI IS (illimité)

  for (let yr = 1; yr <= p.horizon; yr++) {
    const facReval   = Math.pow(1 + (p.revalorisation / 100), yr - 1);
    const loyers     = p.loyer * 12 * facReval;
    const charges    = p.charges * 12 + p.taxeFonciere + (p.cfe || 200);
    const vacance    = loyers * (p.vacance / 100);
    const loyersNets = loyers - vacance;
    const interets   = creditRows[yr - 1]?.interets ?? 0;
    const capRest    = creditRows[yr - 1]?.capRestant ?? 0;

    let impot = 0;
    if (type === "lmnp") {
      // Déficit reportable sur 10 ans (CGI art. 156)
      const baseRaw        = loyersNets - charges - interets - amort.totalAnnuel;
      const baseApresReport = baseRaw + deficitPool; // deficitPool ≤ 0
      if (baseApresReport <= 0) {
        deficitPool = Math.max(baseApresReport, -loyersNets * 10); // cap sécurité 10 ans
        impot = 0;
      } else {
        deficitPool = 0;
        impot = baseApresReport * (p.tmi / 100 + PS_RATE);
      }
    } else if (type === "microbic") {
      // Micro-BIC : abattement 50% (71% si meublé tourisme classé)
      const abatt = p.tourismeClass ? 0.71 : 0.50;
      const base  = loyersNets * (1 - abatt);
      impot = Math.max(0, base) * (p.tmi / 100 + PS_RATE);
    } else if (type === "nue") {
      const base = Math.max(0, loyersNets - charges - interets);
      impot = base * (p.tmi / 100 + PS_RATE);
    } else if (type === "sciis") {
      // IS : 15% jusqu'à 42 500 €, puis 25% — déficit reportable illimité
      const baseRaw = loyersNets - charges - interets - amort.totalAnnuel;
      const baseIS  = baseRaw + deficitPoolIS;
      if (baseIS <= 0) {
        deficitPoolIS = baseIS;
        impot = 0;
      } else {
        deficitPoolIS = 0;
        impot = baseIS <= 42500 ? baseIS * 0.15 : 42500 * 0.15 + (baseIS - 42500) * 0.25;
      }
    } else if (type === "sciir") {
      const base = Math.max(0, loyersNets - charges - interets);
      impot = base * (p.tmi / 100 + PS_RATE);
    }

    const cashflowBrut = loyersNets - charges - mensualite - impot;
    const cashflowM    = cashflowBrut / 12;
    cumCashflow += cashflowBrut;

    // Flat Tax SCI IS : calculée sur le CF distribué (dividendes)
    let flatTax = 0;
    let cashflowApresFlatTax = cashflowBrut;
    if (type === "sciis" && cashflowBrut > 0) {
      const tauxDist = (p.tauxDistributionSCI ?? 100) / 100;
      const dividendes = cashflowBrut * tauxDist;
      flatTax = dividendes * 0.30; // PFU 30% = 12.8% IR + 17.2% PS
      cashflowApresFlatTax = cashflowBrut - flatTax;
    }

    rows.push({
      an: yr,
      loyers:      Math.round(loyers),
      charges:     Math.round(charges),
      vacance:     Math.round(vacance),
      interets:    Math.round(interets),
      mensualite:  Math.round(mensualite),
      impot:       Math.round(impot),
      cashflow:    Math.round(cashflowBrut),
      cashflowM:   Math.round(cashflowM),
      flatTax:     Math.round(flatTax),
      cashflowApresFlatTaxM: Math.round(cashflowApresFlatTax / 12),
      capRestant:  Math.round(capRest),
      cumCashflow: Math.round(cumCashflow),
    });
  }

  // Prix total d'acquisition
  const prixTotal   = p.prix + p.prix * (p.notaire / 100) + p.travaux;
  const investTotal = p.apport + p.mobilier; // flux initial cash (TRI)
  const loyers0     = p.loyer * 12;
  const charges0    = p.charges * 12 + p.taxeFonciere + (p.cfe || 200);
  const rendBrut    = (loyers0 / prixTotal) * 100;
  const rendNet     = ((loyers0 - charges0) / prixTotal) * 100;
  const cashflowM0  = rows[0]?.cashflowM ?? 0;
  const cashflowApresFlatTaxM0 = rows[0]?.cashflowApresFlatTaxM ?? cashflowM0;

  // Ratio d'endettement HCSF
  // Si revenusMensuels est 0 ou absent, on retourne null (indéfini) plutôt qu'un ratio faux
  const totalMens  = mensualite + (+p.chargesCredit || 0);
  const revMens    = p.revenusMensuels > 0 ? p.revenusMensuels : null;
  const ratioEndt  = revMens != null ? (totalMens / revMens) * 100 : null;

  // TRI — Newton-Raphson
  const prixVenteBrut  = p.prix * Math.pow(1 + p.revalorisation / 100, p.horizon);
  const prixRevente    = prixVenteBrut * 0.945; // net après 5,5 % frais cession
  const prixAcqFiscal  = p.prix * (1 + p.notaire / 100) + p.travaux; // CGI Art. 150 VB
  const pvBrute        = Math.max(0, prixVenteBrut - prixAcqFiscal);
  const taxePV         = type === "sciis"
    ? 0
    : calcTaxePlusValue(pvBrute, p.horizon);
  const produitNetCession = prixRevente - taxePV;

  const cfNetInvestisseur = (r) => r.cashflow - (r.flatTax ?? 0);
  const fluxes = [
    -investTotal,
    ...rows.map((r, i) => {
      const rv = i === rows.length - 1
        ? cfNetInvestisseur(r) + produitNetCession - (r.capRestant ?? 0)
        : cfNetInvestisseur(r);
      return rv;
    }),
  ];

  let tri = 0.05;
  for (let i = 0; i < 50; i++) {
    // Guard : si tri converge vers -1 (investissement catastrophique), Math.pow(0,t) → NaN
    if (tri <= -0.999) { tri = -0.999; break; }
    const npv  = fluxes.reduce((s, f, t) => s + f / Math.pow(1 + tri, t), 0);
    const dnpv = fluxes.reduce((s, f, t) => s - (t * f) / Math.pow(1 + tri, t + 1), 0);
    if (Math.abs(dnpv) < 1e-8) break;
    const next = tri - npv / dnpv;
    // Guard supérieur : évite les divergences vers +∞ sur des projets irréalistes
    if (next <= -0.999 || next > 50) { tri = next <= -0.999 ? -0.999 : 50; break; }
    if (Math.abs(next - tri) < 1e-6) { tri = next; break; }
    tri = next;
  }
  // Sécurité finale : NaN ou Infinity → on retourne -99 (investissement non viable)
  if (!isFinite(tri) || isNaN(tri)) tri = -0.99;

  return {
    type,
    rows,
    tri:    +((tri * 100).toFixed(2)),
    rendBrut: +rendBrut.toFixed(2),
    rendNet:  +rendNet.toFixed(2),
    cashflowM: cashflowM0,
    cashflowApresFlatTaxM: cashflowApresFlatTaxM0,
    ratioEndt: ratioEndt != null ? +ratioEndt.toFixed(1) : null,
    mensualite,
    amort,
    investTotal,
  };
}

/* ── Comparaison 10 ans Micro-BIC vs Réel ──────────────────────────────────
   Retourne un tableau de 10 entrées avec { an, "Micro-BIC", "Régime Réel", "Économie" }
   ──────────────────────────────────────────────────────────────────────── */
export function calcComparaison10ans(p) {
  const terrainPct = p.terrain ?? 15;
  const amort      = calcAmortComposants(p.prix, p.notaire, p.mobilier, p.travaux, terrainPct);
  const capital    = p.prix + p.travaux + p.prix * (p.notaire / 100) - p.apport;
  const creditRows = amortCredit(capital, p.interet, p.dureeCredit);
  const PS_RATE    = 0.172;
  const data       = [];
  let deficitReel  = 0;

  for (let yr = 1; yr <= 10; yr++) {
    const fac     = Math.pow(1 + (p.revalorisation / 100), yr - 1);
    const loyers  = p.loyer * 12 * fac * (1 - p.vacance / 100);
    const charges = p.charges * 12 + p.taxeFonciere + (p.cfe || 200);
    const ints    = creditRows[yr - 1]?.interets ?? 0;

    // Micro-BIC
    const abatt      = p.tourismeClass ? 0.71 : 0.50;
    const baseMicro  = loyers * (1 - abatt);
    const impotMicro = Math.round(Math.max(0, baseMicro) * (p.tmi / 100 + PS_RATE));

    // Réel — déficit carry-forward
    const baseRaw   = loyers - charges - ints - amort.totalAnnuel;
    const baseApres = baseRaw + deficitReel;
    let impotReel   = 0;
    if (baseApres <= 0) {
      deficitReel = Math.max(baseApres, -loyers * 10);
    } else {
      deficitReel = 0;
      impotReel = Math.round(baseApres * (p.tmi / 100 + PS_RATE));
    }

    data.push({
      an:           `A${yr}`,
      "Micro-BIC":  impotMicro,
      "Régime Réel": impotReel,
      "Économie":   impotMicro - impotReel,
    });
  }
  return data;
}
