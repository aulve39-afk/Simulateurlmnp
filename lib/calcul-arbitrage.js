/**
 * @file calcul-arbitrage.js
 * Moteur de calcul pour le Simulateur d'Arbitrage Fiscal LMNP
 * Revente vs Poursuite de l'activité
 */

import { amortCredit, calcTaxePlusValue } from "./calcul-lmnp.js";

// ─── Constantes ──────────────────────────────────────────────────────────────

const PS_RATE = 0.172;
const FRAIS_CESSION = 0.055; // 5,5 % frais agence + frais divers

/** Composants du bien (hors mobilier et travaux) — CGI Art. 39 C */
const COMPOSANTS_BIEN = [
  { nom: "Gros œuvre",  ratio: 0.50, duree: 50 },
  { nom: "Toiture",     ratio: 0.10, duree: 25 },
  { nom: "Façade",      ratio: 0.10, duree: 25 },
  { nom: "Équipements", ratio: 0.15, duree: 15 },
  { nom: "Agencements", ratio: 0.15, duree: 10 },
];

const DUREE_MOBILIER = 7;
const DUREE_TRAVAUX  = 12;

// ─── JSDoc Types ─────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ArbitrageInputs
 *
 * — Paramètres communs —
 * @property {number} valeurActuelle       Valeur de marché estimée aujourd'hui (€)
 * @property {number} anneeAcquisition     Année de détention déjà écoulée (0 = achat neuf)
 * @property {number} prixAcquisition      Prix net vendeur à l'origine (€)
 * @property {number} fraisNotaire         Frais de notaire en % (ex: 7.5)
 * @property {number} travauxInitiaux      Montant travaux capitalisés à l'origine (€)
 * @property {number} mobilierInitial      Montant mobilier capitalisé à l'origine (€)
 *
 * — Crédit —
 * @property {number} capitalRestantDu     Capital restant dû aujourd'hui (€)
 * @property {number} tauxInteret          Taux d'intérêt annuel (%) du crédit
 * @property {number} dureeRestante        Durée restante du crédit (ans)
 *
 * — Exploitation —
 * @property {number} loyerMensuel         Loyer mensuel HC (€)
 * @property {number} chargesAnnuelles     Charges annuelles totales hors intérêts (€)
 *                                         (copro + gestion + assurance + taxe fonc + CFE…)
 * @property {number} vacance              Taux de vacance locative (%) appliqué aux loyers
 * @property {number} revalorisation       Revalorisation annuelle du bien et des loyers (%)
 * @property {number} tmi                  Tranche marginale d'imposition (%)
 *
 * — Comptabilité —
 * @property {number} deficitReportable    Déficit LMNP reportable restant (€, valeur positive)
 * @property {number} horizonSimulation    Horizon de simulation (ans, max 30)
 * @property {number} [terrainPct=15]      Quote-part terrain non amortissable (%)
 *
 * — Mode expert (optionnel) —
 * @property {number} [amortBienAnnuelOverride]      Dotation annuelle bien (€/an)
 * @property {number} [anneesBienRestantesOverride]  Années restantes amortissement bien
 * @property {number} [mobilierVncOverride]          VNC mobilier restant (€)
 * @property {number} [anneesMobilierRestOverride]   Années restantes mobilier
 * @property {number} [travauxVncOverride]           VNC travaux restant (€)
 * @property {number} [anneesTravauxRestOverride]    Années restantes travaux
 */

/**
 * @typedef {Object} ArbitrageYearData
 * @property {number} yr                   Année relative (1 = première année projetée)
 * @property {number} anneeDetention       Année de détention absolue depuis l'achat
 * @property {number} valeurBien           Valeur estimée du bien en fin d'année (€)
 * @property {number} loyersNets           Loyers encaissés nets vacance (€)
 * @property {number} chargesAnnuelles     Charges annuelles (€)
 * @property {number} interets            Intérêts d'emprunt (€)
 * @property {number} amortBien            Dotation amortissement bien (€)
 * @property {number} amortMobilier        Dotation amortissement mobilier (€)
 * @property {number} amortTravaux         Dotation amortissement travaux (€)
 * @property {number} amortTotal           Total amortissements (€)
 * @property {number} baseImposable        Base avant report de déficit (€)
 * @property {number} deficitPool          Déficit reportable en fin d'année (€, négatif = pool)
 * @property {number} baseApresReport      Base imposable après report (€)
 * @property {number} impot                Impôt + PS dû (€)
 * @property {number} cashflowNet          Loyers - charges - intérêts - mensualités capital - impôt (€)
 * @property {number} capitalRestantDu     Capital restant dû en fin d'année (€)
 * @property {number} plusValueBrute       Plus-value brute potentielle si revente (€)
 * @property {number} taxePlusValue        Impôt PV si revente cette année (€)
 * @property {number} produitNetRevente    Produit net revente = valeur×(1−frais) − PV tax − CRD (€)
 * @property {boolean} bouclierActif       Vrai si impôt = 0 cette année
 */

/**
 * @typedef {Object} ArbitrageVerdict
 * @property {'hold'|'sell_now'|'sell_year_N'|'restructure'} decision
 * @property {number|null} anneeOptimale   Année relative pour vente optimale (max produitNet)
 * @property {number|null} finBouclier     Première année où impôt > 200 € (null = jamais)
 * @property {number}      impotCumul      Impôt cumulé sur tout l'horizon (€)
 * @property {number}      impotPostBouclier  Impôt moyen/an après fin du bouclier (€)
 * @property {number}      produitNetOptimal  Produit net revente à l'année optimale (€)
 * @property {number}      produitNetActuel   Produit net revente aujourd'hui (€)
 * @property {number}      economieArbitrage  Gain potentiel vs vente immédiate (€)
 * @property {string}      message         Texte explicatif
 * @property {string}      color           Couleur verdict: '#16a34a' | '#f97316' | '#dc2626'
 */

// ─── Helpers amortissement (mode simplifié) ───────────────────────────────────

/**
 * Calcule la dotation amortissement du bien pour une année de détention absolue.
 * La base amortissable = prix acquisition × (1 − terrainPct/100) + frais notaire
 * @param {number} anneeDetention   Année absolue depuis l'achat (1, 2, 3…)
 * @param {number} prixAcquisition
 * @param {number} fraisNotaire     En %
 * @param {number} travauxInitiaux  (séparés, traités dans amortTravaux)
 * @param {number} terrainPct
 * @returns {number}
 */
function amortBienPourAnnee(anneeDetention, prixAcquisition, fraisNotaire, terrainPct) {
  const bienAmort = prixAcquisition * (1 - terrainPct / 100) * (1 + fraisNotaire / 100);
  return COMPOSANTS_BIEN.reduce((total, c) => {
    if (anneeDetention <= c.duree) {
      return total + (bienAmort * c.ratio) / c.duree;
    }
    return total;
  }, 0);
}

/**
 * Calcule la dotation amortissement mobilier pour une année de détention absolue.
 * @param {number} anneeDetention
 * @param {number} mobilierInitial
 * @returns {number}
 */
function amortMobilierPourAnnee(anneeDetention, mobilierInitial) {
  return anneeDetention <= DUREE_MOBILIER ? mobilierInitial / DUREE_MOBILIER : 0;
}

/**
 * Calcule la dotation amortissement travaux pour une année de détention absolue.
 * @param {number} anneeDetention
 * @param {number} travauxInitiaux
 * @returns {number}
 */
function amortTravauxPourAnnee(anneeDetention, travauxInitiaux) {
  return anneeDetention <= DUREE_TRAVAUX ? travauxInitiaux / DUREE_TRAVAUX : 0;
}

// ─── Calcul du produit net revente aujourd'hui ────────────────────────────────

/**
 * Produit net de revente au moment t=0 (pour initialiser le verdict).
 * @param {ArbitrageInputs} p
 * @returns {number}
 */
function produitNetAujourdhui(p) {
  const prixAcquisitionFiscal =
    p.prixAcquisition * (1 + p.fraisNotaire / 100) + p.travauxInitiaux;
  const pvBrute = Math.max(0, p.valeurActuelle - prixAcquisitionFiscal);
  const taxePv  = calcTaxePlusValue(pvBrute, p.anneeAcquisition);
  return p.valeurActuelle * (1 - FRAIS_CESSION) - taxePv - p.capitalRestantDu;
}

// ─── Moteur principal ─────────────────────────────────────────────────────────

/**
 * Simule l'évolution fiscale et patrimoniale d'un LMNP sur un horizon donné.
 *
 * @param {ArbitrageInputs} inputs
 * @returns {{ timeline: ArbitrageYearData[], verdict: ArbitrageVerdict }}
 */
export function computeArbitrageTimeline(inputs) {
  const p = {
    terrainPct: 15,
    ...inputs,
  };

  const horizon = Math.min(Math.max(p.horizonSimulation ?? 20, 1), 30);

  // ── Tableau d'amortissement crédit ──
  let creditRows = [];
  if (p.capitalRestantDu > 0 && p.tauxInteret > 0 && p.dureeRestante > 0) {
    creditRows = amortCredit(p.capitalRestantDu, p.tauxInteret, p.dureeRestante);
  }

  // ── Base fiscale d'acquisition pour le calcul de PV ──
  const prixAcquisitionFiscal =
    p.prixAcquisition * (1 + p.fraisNotaire / 100) + p.travauxInitiaux;

  // ── État initial ──
  // deficitPool stocké en NÉGATIF (convention calcul-lmnp.js)
  let deficitPool = -(p.deficitReportable ?? 0);
  let capitalRestantDu = p.capitalRestantDu ?? 0;

  // ── Mode expert : VNC restant et durées restantes ──
  const expertMode =
    p.amortBienAnnuelOverride !== undefined ||
    p.anneesBienRestantesOverride !== undefined;

  // VNC expert : on va décrémenter chaque année
  let mobilierVnc   = p.mobilierVncOverride   ?? 0;
  let travauxVnc    = p.travauxVncOverride     ?? 0;

  /** @type {ArbitrageYearData[]} */
  const timeline = [];

  for (let yr = 1; yr <= horizon; yr++) {
    const anneeDetention = p.anneeAcquisition + yr;

    // ── Valeur du bien ──
    const valeurBien =
      p.valeurActuelle * Math.pow(1 + p.revalorisation / 100, yr);

    // ── Loyers ──
    const loyersBruts =
      p.loyerMensuel * 12 * Math.pow(1 + p.revalorisation / 100, yr - 1);
    const loyersNets = loyersBruts * (1 - (p.vacance ?? 0) / 100);

    // ── Charges (revalorisation légère : + revalorisation/2 % par an) ──
    const chargesAnnuelles =
      p.chargesAnnuelles * Math.pow(1 + (p.revalorisation / 2) / 100, yr - 1);

    // ── Intérêts et capital ──
    let interets = 0;
    let capitalRembourse = 0;
    if (yr - 1 < creditRows.length) {
      interets        = creditRows[yr - 1].interets;
      capitalRembourse = creditRows[yr - 1].capital;
    }
    capitalRestantDu = Math.max(0, capitalRestantDu - capitalRembourse);

    // ── Amortissements ──
    let amortBien, amortMobilier, amortTravaux;

    if (expertMode) {
      // Mode expert : dotations fixes tant que VNC ou durée le permet
      const dureeRestBien = p.anneesBienRestantesOverride ?? 0;
      amortBien = yr <= dureeRestBien ? (p.amortBienAnnuelOverride ?? 0) : 0;

      const dureeRestMobilier = p.anneesMobilierRestOverride ?? 0;
      amortMobilier = yr <= dureeRestMobilier
        ? Math.min(mobilierVnc / Math.max(dureeRestMobilier, 1), mobilierVnc)
        : 0;

      const dureeRestTravaux = p.anneesTravauxRestOverride ?? 0;
      amortTravaux = yr <= dureeRestTravaux
        ? Math.min(travauxVnc / Math.max(dureeRestTravaux, 1), travauxVnc)
        : 0;

      mobilierVnc = Math.max(0, mobilierVnc - amortMobilier);
      travauxVnc  = Math.max(0, travauxVnc  - amortTravaux);
    } else {
      // Mode simplifié : calcul par composant
      amortBien     = amortBienPourAnnee(anneeDetention, p.prixAcquisition, p.fraisNotaire, p.terrainPct);
      amortMobilier = amortMobilierPourAnnee(anneeDetention, p.mobilierInitial ?? 0);
      amortTravaux  = amortTravauxPourAnnee(anneeDetention, p.travauxInitiaux ?? 0);
    }

    const amortTotal = amortBien + amortMobilier + amortTravaux;

    // ── Base imposable ──
    const baseImposable = loyersNets - chargesAnnuelles - interets - amortTotal;
    const baseApresReport = baseImposable + deficitPool; // deficitPool ≤ 0

    let impot = 0;
    if (baseApresReport <= 0) {
      // Bouclier actif — report plafonné à 10 × loyers nets (CGI Art. 156)
      deficitPool = Math.max(baseApresReport, -loyersNets * 10);
    } else {
      deficitPool = 0;
      impot = baseApresReport * (p.tmi / 100 + PS_RATE);
    }

    // ── Cash-flow net ──
    const mensualiteCapital = capitalRembourse; // annuel
    const cashflowNet = loyersNets - chargesAnnuelles - interets - mensualiteCapital - impot;

    // ── Revente scénario ──
    const pvBrute = Math.max(0, valeurBien - prixAcquisitionFiscal);
    const taxePlusValue = calcTaxePlusValue(pvBrute, anneeDetention);
    const produitNetRevente =
      valeurBien * (1 - FRAIS_CESSION) - taxePlusValue - capitalRestantDu;

    timeline.push({
      yr,
      anneeDetention,
      valeurBien,
      loyersNets,
      chargesAnnuelles,
      interets,
      amortBien,
      amortMobilier,
      amortTravaux,
      amortTotal,
      baseImposable,
      deficitPool,
      baseApresReport,
      impot,
      cashflowNet,
      capitalRestantDu,
      plusValueBrute: pvBrute,
      taxePlusValue,
      produitNetRevente,
      bouclierActif: impot < 1,
    });
  }

  const verdict = computeVerdict(timeline, p);

  return { timeline, verdict };
}

// ─── Verdict ─────────────────────────────────────────────────────────────────

/**
 * @param {ArbitrageYearData[]} timeline
 * @param {ArbitrageInputs} p
 * @returns {ArbitrageVerdict}
 */
function computeVerdict(timeline, p) {
  // Première année où l'impôt dépasse 200 €
  const finBouclierRow = timeline.find(r => r.impot > 200);
  const finBouclier    = finBouclierRow ? finBouclierRow.yr : null;

  // Impôt cumulé
  const impotCumul = timeline.reduce((s, r) => s + r.impot, 0);

  // Impôt moyen/an après la fin du bouclier
  const rowsPostBouclier = finBouclier
    ? timeline.filter(r => r.yr >= finBouclier)
    : [];
  const impotPostBouclier = rowsPostBouclier.length
    ? rowsPostBouclier.reduce((s, r) => s + r.impot, 0) / rowsPostBouclier.length
    : 0;

  // Année avec le meilleur produit net de revente
  let anneeOptimale = 1;
  let maxProduit = -Infinity;
  timeline.forEach(r => {
    if (r.produitNetRevente > maxProduit) {
      maxProduit = r.produitNetRevente;
      anneeOptimale = r.yr;
    }
  });
  const produitNetOptimal = maxProduit;
  const produitNetActuel  = produitNetAujourdhui(p);

  const economieArbitrage = produitNetOptimal - produitNetActuel;

  // Cash-flow moyen post-bouclier
  const cfPostBouclierMoyen = rowsPostBouclier.length
    ? rowsPostBouclier.reduce((s, r) => s + r.cashflowNet, 0) / rowsPostBouclier.length
    : 0;

  // ── Matrice de décision ──
  let decision, message, color;

  if (!finBouclier) {
    // Bouclier tient tout l'horizon
    decision = "hold";
    color    = "#16a34a";
    message  =
      `Votre bouclier fiscal tient sur tout l'horizon simulé (${p.horizonSimulation} ans). ` +
      `Les amortissements couvrent intégralement votre base imposable : aucun impôt prévu. ` +
      `Continuer l'exploitation est fiscalement optimal.`;
  } else if (finBouclier <= 2) {
    // Bouclier expiré imminement
    decision = "sell_now";
    color    = "#dc2626";
    message  =
      `Votre bouclier fiscal expire dans ${finBouclier <= 1 ? "moins d'un an" : "2 ans"}. ` +
      `La fiscalité va rapidement éroder votre cash-flow. ` +
      `Vendre maintenant maximise votre produit net avant l'impact fiscal.`;
  } else if (cfPostBouclierMoyen > 0) {
    // Cash-flow reste positif après le bouclier → restructuration possible
    decision = "restructure";
    color    = "#f97316";
    message  =
      `Votre bouclier fiscal prend fin à l'année ${finBouclier}. ` +
      `Votre cash-flow reste positif (${cfPostBouclierMoyen > 0 ? "+" : ""}${Math.round(cfPostBouclierMoyen)} €/an après impôt) ` +
      `mais la pression fiscale augmente. ` +
      `Envisagez une conversion en SCI à l'IS pour basculer sur l'amortissement IS et réduire l'imposition.`;
  } else {
    // Cash-flow négatif post-bouclier → vendre avant
    decision = "sell_year_N";
    color    = "#f97316";
    message  =
      `Votre bouclier fiscal expire à l'année ${finBouclier}. ` +
      `Au-delà, votre cash-flow devient négatif en raison de l'impôt. ` +
      `Vendre à l'année ${anneeOptimale} optimise votre produit net (${Math.round(produitNetOptimal).toLocaleString("fr-FR")} €).`;
  }

  return {
    decision,
    anneeOptimale,
    finBouclier,
    impotCumul,
    impotPostBouclier,
    produitNetOptimal,
    produitNetActuel,
    economieArbitrage,
    message,
    color,
  };
}
