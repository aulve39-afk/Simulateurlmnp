"use client";

/**
 * @file useBridgeData.js
 * Hook React d'interception des données inter-modules ImmoVerdict.
 *
 * Consomme en one-shot le payload `immo_arbitrage_prefill` stocké dans
 * localStorage par LmnpClient → ArbitrageBridgeCard, le mappe vers
 * ArbitrageInputs et l'expose au composant appelant.
 *
 * Usage dans ArbitrageClient :
 * ```jsx
 * const { inputs, hasPrefill, meta } = useBridgeData();
 *
 * useEffect(() => {
 *   if (hasPrefill) setForm(mergeFormFromInputs(inputs));
 * }, [hasPrefill, inputs]);
 * ```
 *
 * Le hook ne déclenche aucune navigation — il est passif.
 * La consommation (suppression localStorage) se fait à l'issue du premier render.
 */

import { useState, useEffect } from "react";
import {
  readBridgePayload,
  consumeBridgePayload,
  mapPayloadToArbitrageInputs,
} from "../lib/bridge";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * @typedef {import("../lib/bridge").MappedArbitrageInputs} MappedArbitrageInputs
 * @typedef {import("../lib/bridge").BridgePayload} BridgePayload
 */

/**
 * @typedef {Object} BridgeDataResult
 * @property {boolean}                  hasPrefill   Vrai si un payload valide a été trouvé
 * @property {MappedArbitrageInputs|null} inputs     Données mappées, null si hasPrefill = false
 * @property {BridgeMeta|null}           meta        Métadonnées d'affichage (ville, type de bien, âge payload)
 * @property {'idle'|'loaded'|'stale'}   status      État du bridge
 */

/**
 * @typedef {Object} BridgeMeta
 * @property {string|undefined} ville
 * @property {string|undefined} typeBien
 * @property {number}           ageSeconds   Âge du payload en secondes
 * @property {number}           ts           Timestamp unix original
 */

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Intercepte et mappe le payload de bridge depuis localStorage.
 *
 * @returns {BridgeDataResult}
 */
export function useBridgeData() {
  const [result, setResult] = useState(
    /** @type {BridgeDataResult} */({
      hasPrefill: false,
      inputs:     null,
      meta:       null,
      status:     "idle",
    })
  );

  useEffect(() => {
    // Lecture — on ne consomme pas encore (pour permettre un double-render en dev Strict Mode)
    const payload = readBridgePayload();

    if (!payload) {
      setResult({ hasPrefill: false, inputs: null, meta: null, status: "idle" });
      return;
    }

    // Mapping
    const inputs = mapPayloadToArbitrageInputs(payload);

    /** @type {BridgeMeta} */
    const meta = {
      ville:      payload.ville,
      typeBien:   payload.typeBien,
      ageSeconds: Math.round((Date.now() - payload._ts) / 1000),
      ts:         payload._ts,
    };

    setResult({ hasPrefill: true, inputs, meta, status: "loaded" });

    // Consommation one-shot (après le rendu initial)
    consumeBridgePayload();
  }, []); // [] = exécution unique au mount

  return result;
}

// ─── Utilitaire : merge vers le state formulaire d'ArbitrageClient ────────────

/**
 * Fusionne les ArbitrageInputs mappés avec le formulaire par défaut d'ArbitrageClient.
 * Seules les clés présentes dans `inputs` écrasent le défaut.
 *
 * À utiliser dans ArbitrageClient :
 * ```js
 * setForm(prev => mergeFormFromInputs(prev, inputs));
 * ```
 *
 * @template T
 * @param {T}                   defaultForm  State formulaire actuel
 * @param {MappedArbitrageInputs} inputs      Données mappées par useBridgeData
 * @returns {T}
 */
export function mergeFormFromInputs(defaultForm, inputs) {
  if (!inputs) return defaultForm;

  return {
    ...defaultForm,
    valeurActuelle:    inputs.valeurActuelle    ?? defaultForm.valeurActuelle,
    anneeAcquisition:  inputs.anneeAcquisition  ?? defaultForm.anneeAcquisition,
    prixAcquisition:   inputs.prixAcquisition   ?? defaultForm.prixAcquisition,
    fraisNotaire:      inputs.fraisNotaire       ?? defaultForm.fraisNotaire,
    travauxInitiaux:   inputs.travauxInitiaux    ?? defaultForm.travauxInitiaux,
    mobilierInitial:   inputs.mobilierInitial    ?? defaultForm.mobilierInitial,
    terrainPct:        inputs.terrainPct         ?? defaultForm.terrainPct,
    capitalRestantDu:  inputs.capitalRestantDu   ?? defaultForm.capitalRestantDu,
    tauxInteret:       inputs.tauxInteret         ?? defaultForm.tauxInteret,
    dureeRestante:     inputs.dureeRestante       ?? defaultForm.dureeRestante,
    loyerMensuel:      inputs.loyerMensuel        ?? defaultForm.loyerMensuel,
    chargesAnnuelles:  inputs.chargesAnnuelles    ?? defaultForm.chargesAnnuelles,
    vacance:           inputs.vacance             ?? defaultForm.vacance,
    revalorisation:    inputs.revalorisation      ?? defaultForm.revalorisation,
    tmi:               inputs.tmi                 ?? defaultForm.tmi,
    deficitReportable: inputs.deficitReportable   ?? defaultForm.deficitReportable,
    horizonSimulation: inputs.horizonSimulation   ?? defaultForm.horizonSimulation,
  };
}
