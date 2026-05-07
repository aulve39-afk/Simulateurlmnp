"use client";
/**
 * EmailCaptureHook — A/B Test Component
 *
 * Deux versions pour capturer les emails sur /lmnp :
 *   Version A : "Interrupt pattern" — email demandé AVANT l'affichage des résultats
 *   Version B : "Value-first pattern" — email demandé APRÈS affichage des résultats (current behavior)
 *
 * INTÉGRATION DANS page.js :
 *
 *   1. Importer en haut :
 *      import EmailCaptureHook from "@/components/EmailCaptureHook";
 *
 *   2. Ajouter l'état A/B en haut du composant App() :
 *      const [abVariant]     = useState(() => Math.random() < 0.5 ? "A" : "B");
 *      const [emailCaptured, setEmailCaptured] = useState(false);
 *
 *   3. Version A — Placer AVANT l'étape résultats (step === 3) :
 *      {step === 3 && !emailCaptured && abVariant === "A" && (
 *        <EmailCaptureHook
 *          variant="A"
 *          previewMetrics={results?.[0]}
 *          onCapture={(email, nom) => {
 *            handleEmailCapture(email, nom);  // votre logique Supabase + Resend
 *            setEmailCaptured(true);
 *          }}
 *          onSkip={() => setEmailCaptured(true)}
 *        />
 *      )}
 *
 *   4. Version B — Placer DANS l'étape résultats (bouton existant déclenche le modal) :
 *      {step === 3 && abVariant === "B" && !emailCaptured && (
 *        <EmailCaptureHook
 *          variant="B"
 *          metrics={results?.[0]}
 *          onCapture={(email, nom) => {
 *            handleEmailCapture(email, nom);
 *            setEmailCaptured(true);
 *          }}
 *          onSkip={() => setEmailCaptured(true)}
 *        />
 *      )}
 *
 *   5. TRACKING (Analytics) — logguer la variante et la conversion :
 *      useEffect(() => {
 *        if (typeof gtag !== "undefined") {
 *          gtag("event", "ab_impression", { variant: abVariant, page: "lmnp" });
 *        }
 *      }, [abVariant]);
 *
 *      const handleEmailCapture = async (email, nom) => {
 *        // Log conversion
 *        if (typeof gtag !== "undefined") {
 *          gtag("event", "email_capture", { variant: abVariant, method: "hook" });
 *        }
 *        // Supabase + Resend (comme dans LeadModal)
 *        if (sb) {
 *          await sb.from("leads").upsert({
 *            email, nom,
 *            params: form,
 *            tri:         results?.[0]?.tri,
 *            cashflow_m:  results?.[0]?.cashflowM,
 *            created_at:  new Date().toISOString(),
 *          });
 *        }
 *        await fetch("/api/send-report", {
 *          method: "POST",
 *          headers: { "Content-Type": "application/json" },
 *          body: JSON.stringify({ email, nom, params: form, tri: results?.[0]?.tri }),
 *        });
 *      };
 */

import { useState } from "react";

const fmt    = (n) => new Intl.NumberFormat("fr-FR", { style:"currency", currency:"EUR", maximumFractionDigits:0 }).format(n ?? 0);
const fmtK   = (n) => Math.abs(n ?? 0) >= 1000 ? `${((n ?? 0) / 1000).toFixed(1)}k€` : fmt(n);
const fmtPct = (n) => `${(+n || 0).toFixed(2)} %`;

/* ─────────────────────────────────────────────
   VERSION A — Interrupt Pattern
   Affichée AVANT les résultats.
   Montre un aperçu flou des métriques pour créer
   de la curiosité et inciter à donner l'email.
───────────────────────────────────────────── */
function VersionA({ previewMetrics, onCapture, onSkip }) {
  const [email,   setEmail]   = useState("");
  const [nom,     setNom]     = useState("");
  const [loading, setLoading] = useState(false);
  const [rgpd,    setRgpd]    = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !rgpd) return;
    setLoading(true);
    try {
      await onCapture(email, nom);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto my-6 rounded-3xl overflow-hidden shadow-2xl"
      style={{ background: "linear-gradient(135deg, #1C2B3A 0%, #0F172A 100%)", border: "1px solid rgba(249,115,22,0.25)" }}>

      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">📊</span>
          <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Simulation terminée</span>
        </div>
        <h2 className="text-white font-extrabold text-xl leading-tight mb-1">
          Votre analyse LMNP est prête
        </h2>
        <p className="text-sm" style={{ color: "rgba(248,250,252,0.6)" }}>
          Débloquez vos résultats complets gratuitement.
        </p>
      </div>

      {/* Aperçu flou des métriques */}
      {previewMetrics && (
        <div className="mx-6 mb-4 rounded-2xl p-4 grid grid-cols-3 gap-3 relative overflow-hidden"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="text-center">
            <p className="text-[9px] text-slate-400 mb-1">TRI estimé</p>
            <p className="text-lg font-extrabold"
              style={{ color: "#F97316", filter: "blur(4px)", userSelect: "none" }}>
              {fmtPct(previewMetrics.tri)}
            </p>
          </div>
          <div className="text-center" style={{ borderLeft: "1px solid rgba(255,255,255,0.08)", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-[9px] text-slate-400 mb-1">CF / mois</p>
            <p className="text-lg font-extrabold"
              style={{ color: previewMetrics.cashflowM >= 0 ? "#10B981" : "#EF4444", filter: "blur(4px)", userSelect: "none" }}>
              {fmtK(previewMetrics.cashflowM)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-slate-400 mb-1">Rdt net</p>
            <p className="text-lg font-extrabold"
              style={{ color: "#F97316", filter: "blur(4px)", userSelect: "none" }}>
              {fmtPct(previewMetrics.rendNet)}
            </p>
          </div>
          {/* Overlay "Débloquer" */}
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl"
            style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(1px)" }}>
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              🔒 <span>Entrez votre email pour débloquer</span>
            </span>
          </div>
        </div>
      )}

      {/* Ce que vous recevez */}
      <div className="mx-6 mb-4 space-y-2">
        {[
          { icon: "📊", text: "Comparatif TRI sur 4 régimes fiscaux (Micro-BIC, Réel, SCI IS, SCI IR)" },
          { icon: "💰", text: "Cashflow mensuel net après impôts et amortissements" },
          { icon: "🏦", text: "Accès aux offres de financement de nos courtiers partenaires" },
        ].map(({ icon, text }, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-sm mt-0.5 shrink-0">{icon}</span>
            <p className="text-[11px]" style={{ color: "rgba(248,250,252,0.65)" }}>{text}</p>
          </div>
        ))}
      </div>

      {/* Formulaire */}
      <form onSubmit={submit} className="px-6 pb-2 space-y-3">
        <input
          value={nom}
          onChange={e => setNom(e.target.value)}
          placeholder="Prénom (optionnel)"
          className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors"
          style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.12)", color: "#F8FAFC" }}
          onFocus={e => e.target.style.borderColor = "#F97316"}
          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
        />
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Votre adresse email *"
          required
          className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors"
          style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.12)", color: "#F8FAFC" }}
          onFocus={e => e.target.style.borderColor = "#F97316"}
          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
        />
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={rgpd}
            onChange={e => setRgpd(e.target.checked)}
            className="mt-0.5 flex-shrink-0 accent-orange-500"
          />
          <span className="text-[10px] leading-relaxed" style={{ color: "rgba(248,250,252,0.45)" }}>
            J&apos;accepte de recevoir mes résultats et les communications d&apos;ImmoVerdict.{" "}
            <a href="/mentions-legales" target="_blank" className="underline">Politique de confidentialité</a>.
          </span>
        </label>
        <button
          type="submit"
          disabled={loading || !email || !rgpd}
          className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all"
          style={{
            background: "linear-gradient(135deg, #F97316, #EA580C)",
            opacity: loading || !email || !rgpd ? 0.5 : 1,
            boxShadow: "0 4px 20px rgba(249,115,22,0.35)",
          }}>
          {loading ? "⏳ Génération en cours…" : "🔓 Débloquer mes résultats →"}
        </button>
      </form>

      <div className="px-6 pb-5 pt-1">
        <p className="text-[10px] text-center" style={{ color: "rgba(248,250,252,0.35)" }}>
          Gratuit · Aucun spam · Désabonnement en 1 clic
        </p>
        <button
          onClick={onSkip}
          className="mt-2 w-full text-xs text-center py-1 transition-colors"
          style={{ color: "rgba(248,250,252,0.3)" }}
          onMouseEnter={e => e.target.style.color = "rgba(248,250,252,0.6)"}
          onMouseLeave={e => e.target.style.color = "rgba(248,250,252,0.3)"}>
          Continuer sans résultats complets
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   VERSION B — Value-first Pattern
   Affichée APRÈS les résultats.
   Banner sticky en bas de page, non-intrusif,
   déclenché après 30 secondes ou scroll jusqu'au bas.
───────────────────────────────────────────── */
function VersionB({ metrics, onCapture, onSkip }) {
  const [email,     setEmail]     = useState("");
  const [nom,       setNom]       = useState("");
  const [loading,   setLoading]   = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [sent,      setSent]      = useState(false);
  const [rgpd,      setRgpd]      = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !rgpd) return;
    setLoading(true);
    try {
      await onCapture(email, nom);
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-40 rounded-2xl p-4 shadow-2xl"
        style={{ background: "linear-gradient(135deg, #1C2B3A, #0F172A)", border: "1px solid rgba(16,185,129,0.3)" }}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-sm font-bold text-white">Rapport envoyé !</p>
            <p className="text-xs" style={{ color: "rgba(248,250,252,0.55)" }}>Vérifiez {email}</p>
          </div>
          <button onClick={onSkip} className="ml-auto text-slate-400 hover:text-white text-lg">×</button>
        </div>
      </div>
    );
  }

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 right-4 z-40 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-2 text-sm font-bold text-white"
        style={{ background: "linear-gradient(135deg, #F97316, #EA580C)", boxShadow: "0 4px 20px rgba(249,115,22,0.4)" }}>
        <span>📊</span>
        <span>Recevoir le rapport</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 shadow-2xl"
      style={{ background: "linear-gradient(135deg, #1C2B3A 0%, #0F172A 100%)", borderTop: "2px solid rgba(249,115,22,0.3)" }}>
      <div className="max-w-md mx-auto px-4 py-4">

        {/* Top row */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-bold text-white">
              📊 Recevez votre rapport complet par email
            </p>
            <p className="text-[11px]" style={{ color: "rgba(248,250,252,0.55)" }}>
              TRI, cashflow, amortissements — en PDF gratuit
            </p>
          </div>
          <button onClick={() => setMinimized(true)} className="text-slate-400 hover:text-white ml-2 text-lg leading-none flex-shrink-0">
            −
          </button>
        </div>

        {/* Métriques résumées */}
        {metrics && (
          <div className="flex gap-3 mb-3 rounded-xl p-2.5"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="text-center flex-1">
              <p className="text-[9px] text-slate-400">TRI</p>
              <p className="text-sm font-extrabold text-orange-400">{fmtPct(metrics.tri)}</p>
            </div>
            <div className="text-center flex-1" style={{ borderLeft: "1px solid rgba(255,255,255,0.08)", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-[9px] text-slate-400">CF/mois</p>
              <p className="text-sm font-extrabold" style={{ color: metrics.cashflowM >= 0 ? "#10B981" : "#EF4444" }}>
                {fmtK(metrics.cashflowM)}
              </p>
            </div>
            <div className="text-center flex-1">
              <p className="text-[9px] text-slate-400">Rdt net</p>
              <p className="text-sm font-extrabold text-orange-400">{fmtPct(metrics.rendNet)}</p>
            </div>
          </div>
        )}

        {/* Formulaire compact */}
        <form onSubmit={submit} className="space-y-2">
          <div className="flex gap-2">
            <input
              value={nom}
              onChange={e => setNom(e.target.value)}
              placeholder="Prénom"
              className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.12)", color: "#F8FAFC", minWidth: 0 }}
              onFocus={e => e.target.style.borderColor = "#F97316"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
            />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.fr *"
              required
              className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.12)", color: "#F8FAFC", minWidth: 0 }}
              onFocus={e => e.target.style.borderColor = "#F97316"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rgpd}
              onChange={e => setRgpd(e.target.checked)}
              className="flex-shrink-0 accent-orange-500"
            />
            <span className="text-[9px] leading-relaxed" style={{ color: "rgba(248,250,252,0.4)" }}>
              J&apos;accepte les communications ImmoVerdict —{" "}
              <a href="/mentions-legales" target="_blank" className="underline">Politique de confidentialité</a>
            </span>
          </label>
          <button
            type="submit"
            disabled={loading || !email || !rgpd}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all"
            style={{
              background: "linear-gradient(135deg, #F97316, #EA580C)",
              opacity: loading || !email || !rgpd ? 0.5 : 1,
            }}>
            {loading ? "⏳ Génération…" : "Recevoir mon rapport gratuit →"}
          </button>
        </form>

        <button
          onClick={onSkip}
          className="mt-2 w-full text-[10px] text-center py-0.5"
          style={{ color: "rgba(248,250,252,0.3)" }}>
          Non merci
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   EXPORT PRINCIPAL
───────────────────────────────────────────── */
export default function EmailCaptureHook({ variant = "B", previewMetrics, metrics, onCapture, onSkip }) {
  if (variant === "A") {
    return <VersionA previewMetrics={previewMetrics} onCapture={onCapture} onSkip={onSkip} />;
  }
  return <VersionB metrics={metrics} onCapture={onCapture} onSkip={onSkip} />;
}
