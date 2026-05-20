/**
 * @file bridge.js
 * Contrat de données inter-modules ImmoVerdict.
 *
 * Ce fichier est l'unique source de vérité pour le format de sérialisation
 * entre le simulateur LMNP (/lmnp) et le simulateur d'arbitrage (/arbitrage).
 *
 * Flux :
 *   LmnpClient (form + best.rows)
 *     → serializeBridge()
 *       → localStorage["immo_arbitrage_prefill"]
 *         → useBridgeData()
 *           → ArbitrageClient (ArbitrageInputs)
 *
 * Compatibilité : pur JS, zéro dépendance, exécutable côté client uniquement.
 */

// ─── Clé de stockage ─────────────────────────────────────────────────────────

export const BRIDGE_KEY = "immo_arbitrage_prefill";

// ─── Version du schema ────────────────────────────────────────────────────────
// Incrémenter si la structure change pour éviter la lecture de données obsolètes.
export const BRIDGE_VERSION = 1;

// ─── JSDoc Types ─────────────────────────────────────────────────────────────

/**
 * Données brutes exportées par LmnpClient.
 * Toutes les clés correspondent aux champs du formulaire LMNP.
 *
 * @typedef {Object} BridgePayload
 * @property {number}  _v              Version du schema
 * @property {number}  _ts             Timestamp unix (ms) — pour détecter les données trop anciennes
 *
 * — Bien —
 * @property {number}  prix            Prix net vendeur (€)
 * @property {number}  notaire         Frais de notaire (%)
 * @property {number}  travaux         Travaux capitalisés (€)
 * @property {number}  mobilier        Mobilier capitalisé (€)
 * @property {number}  terrain         Quote-part terrain (%)
 *
 * — Crédit —
 * @property {number}  capRestantDu    Capital restant dû calculé par runCalc (€)
 * @property {number}  interet         Taux d'intérêt annuel (%)
 * @property {number}  dureeCredit     Durée totale crédit (ans)
 * @property {number}  apport          Apport personnel (€)
 *
 * — Exploitation —
 * @property {number}  loyer           Loyer mensuel HC (€)
 * @property {number}  charges         Charges copro mensuelles (€)
 * @property {number}  taxeFonciere    Taxe foncière (€/an)
 * @property {number}  cfe             CFE (€/an)
 * @property {number}  assurancePNO    Assurance PNO (€/an)
 * @property {number}  fraisGestion    Frais de gestion (€/an)
 * @property {number}  vacance         Taux de vacance (%)
 * @property {number}  revalorisation  Revalorisation annuelle (%)
 *
 * — Fiscalité —
 * @property {number}  tmi             TMI (%)
 * @property {number}  horizon         Horizon de détention simulé (ans)
 *
 * — Métadonnées —
 * @property {string}  [ville]         Ville du bien (optionnel, pour affichage)
 * @property {string}  [typeBien]      Type de bien (optionnel, pour affichage)
 */

/**
 * Données mappées consommées par ArbitrageClient / useBridgeData.
 * Correspond exactement à ArbitrageInputs (calcul-arbitrage.js).
 *
 * @typedef {Object} MappedArbitrageInputs
 * @property {number}  valeurActuelle
 * @property {number}  anneeAcquisition
 * @property {number}  prixAcquisition
 * @property {number}  fraisNotaire
 * @property {number}  travauxInitiaux
 * @property {number}  mobilierInitial
 * @property {number}  terrainPct
 * @property {number}  capitalRestantDu
 * @property {number}  tauxInteret
 * @property {number}  dureeRestante
 * @property {number}  loyerMensuel
 * @property {number}  chargesAnnuelles
 * @property {number}  vacance
 * @property {number}  revalorisation
 * @property {number}  tmi
 * @property {number}  deficitReportable
 * @property {number}  horizonSimulation
 * @property {number}  [terrainPct]
 */

// ─── Sérialiseur (LmnpClient → localStorage) ─────────────────────────────────

/**
 * Sérialise l'état du simulateur LMNP vers le format de bridge.
 *
 * @param {Object} form         State du formulaire LmnpClient (DEFAULTS shape)
 * @param {Object} bestRows     Tableau rows de runCalc() — best.rows
 * @returns {BridgePayload}
 */
export function serializeBridge(form, bestRows) {
  // Capital restant dû : on prend l'année 1 car le simulateur commence à t=0
  const capRestantDu = bestRows?.[0]?.capRestant ?? 0;

  return {
    _v:   BRIDGE_VERSION,
    _ts:  Date.now(),

    // Bien
    prix:           form.prix        ?? 0,
    notaire:        form.notaire     ?? 8,
    travaux:        form.travaux     ?? 0,
    mobilier:       form.mobilier    ?? 0,
    terrain:        form.terrain     ?? 15,

    // Crédit
    capRestantDu,
    interet:        form.interet     ?? 3.5,
    dureeCredit:    form.dureeCredit ?? 20,
    apport:         form.apport      ?? 0,

    // Exploitation
    loyer:          form.loyer          ?? 0,
    charges:        form.charges        ?? 0,
    taxeFonciere:   form.taxeFonciere   ?? 0,
    cfe:            form.cfe            ?? 200,
    assurancePNO:   form.assurancePNO   ?? 200,
    fraisGestion:   form.fraisGestion   ?? 0,
    vacance:        form.vacance        ?? 5,
    revalorisation: form.revalorisation ?? 1.5,

    // Fiscalité
    tmi:     form.tmi     ?? 30,
    horizon: form.horizon ?? 20,

    // Métadonnées
    ville:    form.adresse  || undefined,
    typeBien: form.typeBien || undefined,
  };
}

// ─── Désérialiseur + mapping (localStorage → ArbitrageInputs) ────────────────

/**
 * Durée de validité d'un payload en cache (2 heures).
 * Au-delà, on considère les données périmées et on les ignore.
 */
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

/**
 * Lit et désérialise le payload depuis localStorage.
 * Retourne `null` si absent, invalide ou trop ancien.
 *
 * @returns {BridgePayload | null}
 */
export function readBridgePayload() {
  try {
    const raw = localStorage.getItem(BRIDGE_KEY);
    if (!raw) return null;

    const payload = JSON.parse(raw);

    // Vérification version
    if (payload._v !== BRIDGE_VERSION) {
      localStorage.removeItem(BRIDGE_KEY);
      return null;
    }

    // Vérification fraîcheur
    if (Date.now() - (payload._ts ?? 0) > MAX_AGE_MS) {
      localStorage.removeItem(BRIDGE_KEY);
      return null;
    }

    return payload;
  } catch {
    // JSON corrompu ou localStorage indisponible
    return null;
  }
}

/**
 * Consomme le payload (le supprime de localStorage après lecture).
 * À appeler une seule fois dans useBridgeData.
 */
export function consumeBridgePayload() {
  try {
    localStorage.removeItem(BRIDGE_KEY);
  } catch {
    /* noop */
  }
}

/**
 * Écrit le payload sérialisé dans localStorage.
 *
 * @param {BridgePayload} payload
 */
export function writeBridgePayload(payload) {
  try {
    localStorage.setItem(BRIDGE_KEY, JSON.stringify(payload));
  } catch {
    /* noop — quota dépassé ou mode privé */
  }
}

// ─── Règles empiriques d'amortissement (si données comptables absentes) ───────

/**
 * Règle empirique : durée de détention → années d'amortissement déjà consommées.
 *
 * Depuis l'année d'acquisition :
 *   - Bien (gros œuvre 50 ans, toiture/façade 25 ans, équip 15 ans, agenc 10 ans)
 *   - Mobilier : 7 ans
 *   - Travaux  : 12 ans
 *
 * On considère que l'investisseur a commencé à amortir dès l'acquisition.
 * Si `anneeDetention` > durée d'un composant, ce composant est épuisé.
 *
 * Retourne le nombre d'années restantes pour chaque couche.
 *
 * @param {number} anneeDetention  Années de détention déjà écoulées
 * @returns {{ bienRestant: number, mobilierRestant: number, travauxRestant: number }}
 */
export function regleEmpirique(anneeDetention) {
  // On prend la durée du composant moyen (pondéré) comme proxy de la durée bien
  // Gros œuvre 50%, 50 ans → contribue 50 ans × 0.5 = 25
  // Toiture 10%, 25 ans → 2.5 | Façade 10%, 25 ans → 2.5
  // Équipements 15%, 15 ans → 2.25 | Agencements 15%, 10 ans → 1.5
  // Durée "effective" bien = 50 ans (limitée par gros œuvre, dominant)
  const DUREE_BIEN     = 50;
  const DUREE_MOBILIER = 7;
  const DUREE_TRAVAUX  = 12;

  return {
    bienRestant:     Math.max(0, DUREE_BIEN     - anneeDetention),
    mobilierRestant: Math.max(0, DUREE_MOBILIER - anneeDetention),
    travauxRestant:  Math.max(0, DUREE_TRAVAUX  - anneeDetention),
  };
}

// ─── Mapping BridgePayload → MappedArbitrageInputs ───────────────────────────

/**
 * Mappe un BridgePayload vers le format ArbitrageInputs attendu par le moteur.
 *
 * Règles de mapping :
 *  - `valeurActuelle`   = prix (on suppose pas de revalorisation depuis l'achat — l'utilisateur peut corriger)
 *  - `anneeAcquisition` = 0 (on part du principe que la simulation est au moment de l'achat)
 *  - `chargesAnnuelles` = copro × 12 + taxeFoncière + CFE + assurancePNO + fraisGestion
 *  - `dureeRestante`    = dureeCredit (la simulation LMNP part du début du crédit)
 *  - `horizonSimulation`= min(horizon, 20) — on plafonne à 20 ans pour l'arbitrage
 *
 * @param {BridgePayload} payload
 * @returns {MappedArbitrageInputs}
 */
export function mapPayloadToArbitrageInputs(payload) {
  const chargesAnnuelles =
    (payload.charges      ?? 0) * 12 +
    (payload.taxeFonciere ?? 0) +
    (payload.cfe          ?? 200) +
    (payload.assurancePNO ?? 200) +
    (payload.fraisGestion ?? 0);

  return {
    valeurActuelle:    payload.prix,
    anneeAcquisition:  0,
    prixAcquisition:   payload.prix,
    fraisNotaire:      payload.notaire,
    travauxInitiaux:   payload.travaux,
    mobilierInitial:   payload.mobilier,
    terrainPct:        payload.terrain ?? 15,
    capitalRestantDu:  payload.capRestantDu,
    tauxInteret:       payload.interet,
    dureeRestante:     payload.dureeCredit,
    loyerMensuel:      payload.loyer,
    chargesAnnuelles,
    vacance:           payload.vacance,
    revalorisation:    payload.revalorisation,
    tmi:               payload.tmi,
    deficitReportable: 0,
    horizonSimulation: Math.min(payload.horizon ?? 20, 20),
  };
}
