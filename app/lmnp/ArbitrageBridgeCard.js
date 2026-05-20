"use client";

/**
 * @file ArbitrageBridgeCard.js
 * Composant autonome inséré après le graphique "Bouclier fiscal" dans LmnpClient.
 *
 * Rôle : sérialiser l'état courant de la simulation et router vers /arbitrage.
 * Se charge d'appeler serializeBridge + writeBridgePayload depuis lib/bridge.js.
 *
 * Props :
 *   form     — state complet du formulaire LmnpClient (shape DEFAULTS)
 *   bestRows — best.rows de runCalc() (tableau annuel LMNP Réel)
 *   finBouclier — première année où impôt > 200 € (null = jamais), calculée dans LmnpClient
 *
 * @param {{ form: Object, bestRows: Object[], finBouclier: number|null }} props
 */

import { useState } from "react";
import { serializeBridge, writeBridgePayload } from "../../lib/bridge";

export default function ArbitrageBridgeCard({ form, bestRows, finBouclier }) {
  const [loading, setLoading] = useState(false);

  function handleGo() {
    setLoading(true);
    try {
      const payload = serializeBridge(form, bestRows);
      writeBridgePayload(payload);
    } catch {
      /* si localStorage indisponible, on redirige quand même — le formulaire sera vide */
    }
    window.location.href = "/arbitrage";
  }

  // Message contextuel basé sur la durée du bouclier
  const ctaLabel = finBouclier
    ? `Votre bouclier expire à l'année ${finBouclier} — simulez maintenant`
    : "Simuler l'arbitrage sur 20 ans";

  const urgencyColor = finBouclier
    ? finBouclier <= 3
      ? "#dc2626"   // rouge — urgent
      : "#f97316"   // orange — à surveiller
    : "#16a34a";    // vert — pas de problème immédiat

  const urgencyBg = finBouclier
    ? finBouclier <= 3
      ? "rgba(220,38,38,0.08)"
      : "rgba(249,115,22,0.08)"
    : "rgba(22,163,74,0.08)";

  return (
    <div
      className="rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      style={{
        background: urgencyBg,
        border: `1.5px solid ${urgencyColor}33`,
      }}
    >
      {/* Texte */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">
            {finBouclier ? (finBouclier <= 3 ? "🚨" : "⚠️") : "⚖️"}
          </span>
          <span className="font-bold text-slate-800 text-sm sm:text-base">
            {ctaLabel}
          </span>
        </div>

        <p className="text-sm text-slate-500 max-w-md leading-relaxed">
          {finBouclier
            ? `Après l'année ${finBouclier}, l'impôt viendra éroder votre cash-flow.
               Découvrez s'il vaut mieux vendre, conserver ou basculer en SCI à l'IS.`
            : "Vos amortissements protègent votre fiscalité pour l'instant. Voyez sur quelle durée ce bouclier tient et quel sera votre produit net de revente optimal."
          }
        </p>

        {/* Indicateurs rapides */}
        <div className="flex flex-wrap gap-3 mt-3">
          {finBouclier && (
            <Chip
              label="Fin bouclier"
              value={`Année ${finBouclier}`}
              color={urgencyColor}
            />
          )}
          <Chip
            label="Bien"
            value={`${(form.prix / 1000).toFixed(0)} k€`}
            color="#6366f1"
          />
          <Chip
            label="Loyer"
            value={`${form.loyer} €/mois`}
            color="#6366f1"
          />
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={handleGo}
        disabled={loading}
        className="shrink-0 flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
        style={{
          background: loading
            ? "#94a3b8"
            : `linear-gradient(135deg, ${urgencyColor}, ${urgencyColor}cc)`,
          minWidth: 180,
          justifyContent: "center",
        }}
      >
        {loading ? (
          <>
            <SpinnerIcon />
            Chargement…
          </>
        ) : (
          <>
            Simuler l&apos;arbitrage →
          </>
        )}
      </button>
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function Chip({ label, value, color }) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
      style={{ background: `${color}15`, color }}
    >
      <span className="text-slate-500 font-normal">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="animate-spin"
      width="14" height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}
