"use client";

/**
 * @file LeadCaptureCard.js
 * Composant de génération de leads qualifiés — ImmoVerdict Monétisation Levier 1.
 *
 * Affiche un message contextuel adapté aux résultats de simulation, puis collecte
 * les coordonnées de l'utilisateur pour mise en relation avec un expert partenaire
 * (courtier LMNP ou expert-comptable).
 *
 * Props :
 *   form   — state du formulaire LmnpClient (DEFAULTS shape)
 *   best   — résultat LMNP Réel (first element of results[]) : { tri, cashflowM,
 *            ratioEndt, rendBrut, rows }
 *
 * Flux :
 *   1. getContext(form, best) → variante + message contextuel
 *   2. Formulaire ultra-court : Prénom, Email, Téléphone
 *   3. POST /api/lead → Supabase + webhook Make/Zapier
 *   4. État de succès : confirmation + badge RGPD
 */

import { useState, useCallback } from "react";

// ─── Logique contextuelle ─────────────────────────────────────────────────────

/**
 * @typedef {"courtier_top"|"comptable_impot"|"courtier_cf"|"courtier_endt"|"audit"} Variant
 *
 * @typedef {Object} LeadContext
 * @property {Variant} variant
 * @property {string}  emoji
 * @property {"high"|"medium"|"low"} urgency
 * @property {string}  title
 * @property {string}  message
 * @property {string}  cta
 * @property {string}  expertLabel
 * @property {string}  accentColor
 * @property {string}  accentBg
 */

/**
 * Détermine le contexte optimal à afficher selon les résultats de simulation.
 *
 * Priorité :
 *  1. Impôt > 500 € dès l'an 1          → comptable (urgence haute)
 *  2. TRI ≥ 6 % ET cash-flow ≥ 50 €    → courtier top (social proof)
 *  3. Cash-flow < -100 €/mois           → courtier optimisation (urgence moyenne)
 *  4. Ratio endettement > 33 %          → courtier dossier bancaire
 *  5. Défaut                            → audit général
 *
 * @param {Object} form
 * @param {Object} best
 * @returns {LeadContext}
 */
function getContext(form, best) {
  const tri       = best?.tri       ?? 0;
  const cashflowM = best?.cashflowM ?? 0;
  const ratioEndt = best?.ratioEndt ?? 0;
  const impotAn1  = best?.rows?.[0]?.impot ?? 0;
  const prix      = form?.prix ?? 0;

  // ── 1. Impôt élevé dès l'an 1 → expert-comptable ──────────────────────────
  if (impotAn1 > 500) {
    const impotFmt = Math.round(impotAn1).toLocaleString("fr-FR");
    return {
      variant:     "comptable_impot",
      emoji:       "📊",
      urgency:     "high",
      title:       `Vous allez payer ${impotFmt} € d'impôts dès l'an 1`,
      message:     `En LMNP Réel, une ventilation par composants bien menée peut ramener cette imposition à zéro. Un expert-comptable spécialisé optimise l'amortissement de votre bien pour maximiser votre économie fiscale.`,
      cta:         "Confier ma comptabilité LMNP à un expert →",
      expertLabel: "Expert-comptable LMNP certifié",
      accentColor: "#dc2626",
      accentBg:    "rgba(220,38,38,0.07)",
    };
  }

  // ── 2. TRI excellent + cash-flow positif → courtier (dossier finançable) ──
  if (tri >= 6 && cashflowM >= 50) {
    const prixFmt = prix > 0 ? ` (${(prix / 1000).toFixed(0)} k€)` : "";
    return {
      variant:     "courtier_top",
      emoji:       "🏆",
      urgency:     "low",
      title:       `TRI ${tri} % — dossier dans le top 15 % des projets LMNP`,
      message:     `Votre projet${prixFmt} est solide. Un courtier partenaire spécialisé investisseurs peut encore optimiser votre taux et faire économiser plusieurs dizaines d'euros par mois sur votre mensualité.`,
      cta:         "Obtenir le meilleur taux pour ce projet →",
      expertLabel: "Courtier partenaire investisseurs",
      accentColor: "#16a34a",
      accentBg:    "rgba(22,163,74,0.07)",
    };
  }

  // ── 3. Cash-flow très négatif → courtier restructuration ──────────────────
  if (cashflowM < -100) {
    const effortFmt = Math.abs(cashflowM).toLocaleString("fr-FR");
    return {
      variant:     "courtier_cf",
      emoji:       "⚠️",
      urgency:     "medium",
      title:       `Réduisez votre effort de ${effortFmt} €/mois`,
      message:     `Votre cash-flow est négatif. Un courtier peut renégocier le taux d'intérêt, allonger la durée ou structurer un différé de remboursement pour retrouver l'équilibre sans débourser davantage.`,
      cta:         "Optimiser mon financement — gratuit →",
      expertLabel: "Courtier spécialisé investisseurs",
      accentColor: "#f97316",
      accentBg:    "rgba(249,115,22,0.07)",
    };
  }

  // ── 4. Ratio d'endettement élevé → dossier bancaire ──────────────────────
  if (ratioEndt > 33) {
    return {
      variant:     "courtier_endt",
      emoji:       "⚖️",
      urgency:     "medium",
      title:       `Endettement à ${ratioEndt} % — au-dessus du seuil HCSF`,
      message:     `Certaines banques refuseront ce dossier tel quel. Un courtier partenaire connaît les établissements qui acceptent les investisseurs LMNP au-delà de 35 % et sait structurer le dossier pour maximiser vos chances.`,
      cta:         "Faire optimiser mon dossier bancaire →",
      expertLabel: "Courtier partenaire investisseurs",
      accentColor: "#f97316",
      accentBg:    "rgba(249,115,22,0.07)",
    };
  }

  // ── 5. Défaut : audit général ──────────────────────────────────────────────
  return {
    variant:     "audit",
    emoji:       "🔍",
    urgency:     "low",
    title:       "Faites auditer votre stratégie par un expert LMNP",
    message:     "Recevez l'avis d'un professionnel sur votre simulation : optimisation fiscale, choix du régime, financement et pilotage patrimonial sur la durée.",
    cta:         "Demander un audit personnalisé →",
    expertLabel: "Expert ImmoVerdict",
    accentColor: "#6366f1",
    accentBg:    "rgba(99,102,241,0.07)",
  };
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RE_PHONE = /^(\+33|0)[0-9]{9}$/;

function cleanPhone(raw) {
  return raw.replace(/[\s\-\.]/g, "");
}

// ─── Composant principal ──────────────────────────────────────────────────────

/**
 * @param {{ form: Object, best: Object }} props
 */
export default function LeadCaptureCard({ form, best }) {
  const ctx = getContext(form, best);

  const [step,    setStep]    = useState("idle");  // "idle"|"form"|"submitting"|"success"|"error"
  const [prenom,  setPrenom]  = useState("");
  const [email,   setEmail]   = useState("");
  const [tel,     setTel]     = useState("");
  const [errors,  setErrors]  = useState({});
  const [consent, setConsent] = useState(false);

  // ── Validation locale ──
  const validate = useCallback(() => {
    const errs = {};
    if (!prenom.trim())             errs.prenom = "Prénom requis";
    if (!RE_EMAIL.test(email))      errs.email  = "Email invalide";
    if (tel && !RE_PHONE.test(cleanPhone(tel))) errs.tel = "Numéro invalide";
    if (!consent)                   errs.consent = "Consentement requis";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [prenom, email, tel, consent]);

  // ── Soumission ──
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setStep("submitting");

    try {
      const res = await fetch("/api/lead", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prenom:      prenom.trim(),
          email:       email.trim().toLowerCase(),
          telephone:   tel ? cleanPhone(tel) : null,
          variant:     ctx.variant,
          expert_type: ctx.expertLabel,
          // Données de simulation pour qualifier le lead
          tri:         best?.tri        ?? null,
          cashflow_m:  best?.cashflowM  ?? null,
          ratio_endt:  best?.ratioEndt  ?? null,
          impot_an1:   best?.rows?.[0]?.impot ?? null,
          prix:        form?.prix        ?? null,
          surface:     form?.surface     ?? null,
          adresse:     form?.adresse     ?? null,
          source:      "lmnp_simulator",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erreur serveur");
      }

      setStep("success");

      // Analytics
      try { window.gtag?.("event", "lead_capture", { variant: ctx.variant, tri: best?.tri }); } catch { /* noop */ }
    } catch (err) {
      console.error("[LeadCaptureCard]", err.message);
      setStep("error");
    }
  }, [validate, prenom, email, tel, ctx, best, form]);

  // ─── État succès ─────────────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{ background: "rgba(22,163,74,0.07)", border: "1.5px solid rgba(22,163,74,0.25)" }}
      >
        <div className="text-3xl mb-3">✅</div>
        <h3 className="text-slate-800 font-bold text-base mb-1">
          Demande bien reçue, {prenom} !
        </h3>
        <p className="text-slate-500 text-sm max-w-xs mx-auto">
          Un {ctx.expertLabel.toLowerCase()} vous contactera sous 24 h ouvrées.
          Votre simulation est jointe à votre demande.
        </p>
        <div className="inline-flex items-center gap-1.5 mt-4 text-xs text-slate-400">
          <ShieldIcon />
          Données protégées · Aucun démarchage non sollicité
        </div>
      </div>
    );
  }

  // ─── État formulaire + idle ───────────────────────────────────────────────────
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: `1.5px solid ${ctx.accentColor}33` }}
    >
      {/* ── Bandeau contextuel ── */}
      <div
        className="px-5 pt-5 pb-4"
        style={{ background: ctx.accentBg }}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">{ctx.emoji}</span>
          <div className="flex-1 min-w-0">
            {ctx.urgency === "high" && (
              <span
                className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full mb-2"
                style={{ background: ctx.accentColor, color: "#fff" }}
              >
                Action recommandée
              </span>
            )}
            <h3 className="font-bold text-slate-800 text-sm leading-snug mb-1">
              {ctx.title}
            </h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              {ctx.message}
            </p>
          </div>
        </div>

        {/* Expert badge */}
        <div
          className="mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
          style={{ background: `${ctx.accentColor}15`, color: ctx.accentColor }}
        >
          <span>👤</span>
          {ctx.expertLabel}
        </div>
      </div>

      {/* ── CTA ou formulaire ── */}
      <div className="px-5 pb-5 pt-4 bg-white">

        {step === "idle" && (
          <button
            onClick={() => setStep("form")}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: `linear-gradient(135deg, ${ctx.accentColor}, ${ctx.accentColor}cc)` }}
          >
            {ctx.cta}
          </button>
        )}

        {(step === "form" || step === "submitting" || step === "error") && (
          <form onSubmit={handleSubmit} noValidate className="space-y-3">

            {/* Prénom */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Prénom <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={prenom}
                onChange={e => setPrenom(e.target.value)}
                placeholder="Votre prénom"
                autoComplete="given-name"
                className="w-full rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none transition-colors"
                style={{
                  border: `1.5px solid ${errors.prenom ? "#ef4444" : "#e2e8f0"}`,
                  background: errors.prenom ? "rgba(239,68,68,0.04)" : "#f8fafc",
                }}
                onFocus={e => { e.target.style.borderColor = ctx.accentColor; }}
                onBlur={e  => { e.target.style.borderColor = errors.prenom ? "#ef4444" : "#e2e8f0"; }}
              />
              {errors.prenom && <p className="text-xs text-red-500 mt-0.5">{errors.prenom}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@exemple.fr"
                autoComplete="email"
                className="w-full rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none transition-colors"
                style={{
                  border: `1.5px solid ${errors.email ? "#ef4444" : "#e2e8f0"}`,
                  background: errors.email ? "rgba(239,68,68,0.04)" : "#f8fafc",
                }}
                onFocus={e => { e.target.style.borderColor = ctx.accentColor; }}
                onBlur={e  => { e.target.style.borderColor = errors.email ? "#ef4444" : "#e2e8f0"; }}
              />
              {errors.email && <p className="text-xs text-red-500 mt-0.5">{errors.email}</p>}
            </div>

            {/* Téléphone */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Téléphone <span className="text-slate-400 font-normal">(optionnel — pour être rappelé)</span>
              </label>
              <input
                type="tel"
                value={tel}
                onChange={e => setTel(e.target.value)}
                placeholder="06 XX XX XX XX"
                autoComplete="tel"
                className="w-full rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none transition-colors"
                style={{
                  border: `1.5px solid ${errors.tel ? "#ef4444" : "#e2e8f0"}`,
                  background: errors.tel ? "rgba(239,68,68,0.04)" : "#f8fafc",
                }}
                onFocus={e => { e.target.style.borderColor = ctx.accentColor; }}
                onBlur={e  => { e.target.style.borderColor = errors.tel ? "#ef4444" : "#e2e8f0"; }}
              />
              {errors.tel && <p className="text-xs text-red-500 mt-0.5">{errors.tel}</p>}
            </div>

            {/* Consentement RGPD */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={e => setConsent(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className="w-4 h-4 rounded border flex items-center justify-center transition-all"
                  style={{
                    background:   consent ? ctx.accentColor : "#fff",
                    borderColor:  errors.consent ? "#ef4444" : consent ? ctx.accentColor : "#cbd5e1",
                  }}
                >
                  {consent && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-[11px] text-slate-500 leading-relaxed">
                J&apos;accepte d&apos;être contacté par un expert partenaire ImmoVerdict concernant mon projet immobilier.
                Mes données ne seront jamais revendues à des tiers.
                {" "}<a href="/politique-confidentialite" target="_blank" className="underline">Politique de confidentialité</a>.
              </span>
            </label>
            {errors.consent && <p className="text-xs text-red-500 -mt-1">{errors.consent}</p>}

            {/* Bouton soumission */}
            <button
              type="submit"
              disabled={step === "submitting"}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
              style={{ background: `linear-gradient(135deg, ${ctx.accentColor}, ${ctx.accentColor}cc)` }}
            >
              {step === "submitting" ? (
                <><SpinnerIcon /> Envoi en cours…</>
              ) : (
                ctx.cta
              )}
            </button>

            {step === "error" && (
              <p className="text-xs text-red-500 text-center">
                Une erreur s&apos;est produite. Réessayez ou écrivez-nous à contact@immoverdict.com.
              </p>
            )}

            {/* Badges confiance */}
            <div className="flex items-center justify-center gap-4 pt-1">
              <TrustBadge icon={<ShieldIcon />}  label="Données sécurisées" />
              <TrustBadge icon={<GdprIcon />}    label="Conforme RGPD" />
              <TrustBadge icon={<LockIcon />}    label="Sans engagement" />
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function TrustBadge({ icon, label }) {
  return (
    <div className="flex items-center gap-1 text-[10px] text-slate-400">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}

function GdprIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 8v4M12 16h.01"/>
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  );
}
