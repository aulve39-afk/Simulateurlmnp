/**
 * lib/monetization-links.js
 * =========================
 * Source unique de vérité pour tous les liens d'affiliation d'ImmoVerdict.
 *
 * Usage :
 *   import { COURTIERS, PNO_PARTNERS, GESTION_PARTNERS, makeAffUrl } from "@/lib/monetization-links";
 *   const url = makeAffUrl(p.base, { campaign: "lmnp-credit", content: `tri-${tri}` });
 */

// ── UTM builder ──────────────────────────────────────────────────────────────

/**
 * Construit une URL avec paramètres UTM standard ImmoVerdict.
 * @param {string} base       URL de base du partenaire (sans query string)
 * @param {object} opts
 * @param {string} opts.campaign  utm_campaign  ex: "lmnp-credit", "lmnp-pno"
 * @param {string} [opts.content] utm_content   ex: "tri-7.2", "taux-3.45", "banner"
 * @param {string} [opts.medium]  utm_medium    défaut: "affiliation"
 * @param {string} [opts.term]    utm_term      optionnel
 * @returns {string}
 */
export function makeAffUrl(base, { campaign, content, medium = "affiliation", term } = {}) {
  try {
    const url = new URL(base);
    url.searchParams.set("utm_source", "immoverdict");
    url.searchParams.set("utm_medium", medium);
    if (campaign) url.searchParams.set("utm_campaign", campaign);
    if (content)  url.searchParams.set("utm_content",  content);
    if (term)     url.searchParams.set("utm_term",     term);
    return url.toString();
  } catch {
    // Si base n'est pas une URL valide, retourner tel quel
    return base;
  }
}

// ── Courtiers crédit ─────────────────────────────────────────────────────────

/**
 * Partenaires courtiers en crédit immobilier.
 * Les URLs sont les bases sans UTM — utiliser makeAffUrl() à l'affichage.
 */
export const COURTIERS = [
  {
    id:    "pretto",
    name:  "Pretto",
    emoji: "🟣",
    tag:   "100% digital",
    desc:  "Simulation en 2 min, offre en 48h",
    base:  "https://www.pretto.fr",
    color: "#F97316",
    badge: null, // surcharge au rendu si triIsGreat → "Recommandé"
  },
  {
    id:    "meilleurtaux",
    name:  "MeilleurTaux",
    emoji: "🔵",
    tag:   "Leader du marché",
    desc:  "200+ banques comparées",
    base:  "https://www.meilleurtaux.com",
    color: "#F97316",
    badge: null,
  },
  {
    id:    "cafpi",
    name:  "CAFPI",
    emoji: "🟢",
    tag:   "Spécialiste investisseurs",
    desc:  "Expertise locatif & LMNP",
    base:  "https://www.cafpi.fr",
    color: "#F97316",
    badge: "Expert LMNP",
  },
];

// ── Assurance PNO ────────────────────────────────────────────────────────────

/**
 * Partenaires assurance Propriétaire Non Occupant.
 * Affichés dans le formulaire après le slider assurancePNO.
 */
export const PNO_PARTNERS = [
  {
    id:    "luko",
    name:  "Luko",
    emoji: "🛡️",
    tag:   "Dès 70 €/an",
    desc:  "Souscription 100 % en ligne, 2 min",
    base:  "https://fr.getluko.com/assurance-pno",
    color: "#6366f1",
    badge: "Recommandé",
  },
  {
    id:    "assurland",
    name:  "Assurland",
    emoji: "📋",
    tag:   "Comparateur PNO",
    desc:  "20+ offres comparées instantanément",
    base:  "https://www.assurland.com/assurance-pno",
    color: "#6366f1",
    badge: null,
  },
];

// ── Gestion locative ─────────────────────────────────────────────────────────

/**
 * Partenaires gestion locative déléguée.
 * Affichés dans le formulaire après le slider fraisGestion.
 */
export const GESTION_PARTNERS = [
  {
    id:    "flatlooker",
    name:  "Flatlooker",
    emoji: "🏠",
    tag:   "6,9 % TTC des loyers",
    desc:  "Gestion + garantie loyers impayés",
    base:  "https://www.flatlooker.com",
    color: "#0ea5e9",
    badge: "Recommandé",
  },
  {
    id:    "foncia",
    name:  "Foncia",
    emoji: "🔑",
    tag:   "N°1 en France",
    desc:  "Réseau national, expertise LMNP",
    base:  "https://fr.foncia.com/gestion-locative",
    color: "#0ea5e9",
    badge: null,
  },
];

// ── Comptables / CGP ─────────────────────────────────────────────────────────

/**
 * Partenaires expertises fiscales LMNP.
 * Utilisés dans le bloc "expert" des résultats.
 */
export const COMPTABLE_PARTNERS = [
  {
    id:    "jedeclare",
    name:  "JeDéclare",
    emoji: "📊",
    tag:   "Spécialiste LMNP",
    desc:  "Déclaration LMNP en ligne, 149 €/an",
    base:  "https://www.jedeclare.com",
    color: "#dc2626",
    badge: "Partenaire fiscal",
  },
  {
    id:    "amarris",
    name:  "Amarris Groupe",
    emoji: "🧮",
    tag:   "Cabinet expert-comptable",
    desc:  "Accompagnement LMNP + SCI IS",
    base:  "https://www.amarris-groupe.fr",
    color: "#dc2626",
    badge: null,
  },
];

// ── Campagnes nommées ────────────────────────────────────────────────────────

/**
 * Constantes pour utm_campaign — évite les fautes de frappe.
 */
export const CAMPAIGNS = {
  CREDIT:  "lmnp-credit",
  PNO:     "lmnp-pno",
  GESTION: "lmnp-gestion",
  FISCAL:  "lmnp-fiscal",
  BANNER:  "lmnp-banner",
};
