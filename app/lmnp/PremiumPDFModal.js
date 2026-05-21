"use client";
/**
 * PremiumPDFModal
 * ---------------
 * Modal "freemium" qui s'affiche quand l'utilisateur clique sur
 * "Rapport Pro" sans avoir encore paye.
 *
 * Props
 *   form            — objet simulation courant (pour l'email pre-rempli)
 *   best            — meilleur scenario (pour afficher TRI / cashflow)
 *   onClose         — callback fermeture
 *   onDownload      — callback si l'utilisateur a deja un token valide
 */

import { useState, useEffect, useCallback } from "react";

// Verifie si un session_id Stripe valide est dans l'URL
function getSessionIdFromUrl() {
  if (typeof window === "undefined") return null;
  try {
    const p = new URLSearchParams(window.location.search);
    return p.get("session_id") || null;
  } catch {
    return null;
  }
}

// Verifie cote client si la session est payee (appel API legere)
async function verifySession(sessionId) {
  if (!sessionId) return false;
  try {
    const r = await fetch(`/api/checkout/verify?session_id=${encodeURIComponent(sessionId)}`);
    if (!r.ok) return false;
    const data = await r.json();
    return data.paid === true;
  } catch {
    return false;
  }
}

const FEATURES = [
  { icon: "📊", label: "Graphiques évolution patrimoine & cashflow" },
  { icon: "⚖️", label: "Comparatif 4 régimes fiscaux (réel, micro-BIC, nu, SCI)" },
  { icon: "🏦", label: "Simulation revente & plus-value nette" },
  { icon: "📋", label: "Dossier bancaire clé-en-main (sections officielles)" },
  { icon: "🔒", label: "Analyse capacité d'endettement & ratio DSC" },
  { icon: "💼", label: "Synthèse patrimoniale pour CGP / conseiller" },
];

export default function PremiumPDFModal({ form, best, onClose, onDownload }) {
  const [email, setEmail]       = useState("");
  const [status, setStatus]     = useState("idle"); // idle | loading | redirecting | error
  const [errMsg, setErrMsg]     = useState("");
  const [verified, setVerified] = useState(false);

  // Pre-remplir l'email depuis le formulaire si disponible
  useEffect(() => {
    if (form?.email) setEmail(form.email);
  }, [form?.email]);

  // Si l'URL contient session_id=... => verifier le paiement
  useEffect(() => {
    const sid = getSessionIdFromUrl();
    if (!sid) return;
    verifySession(sid).then(paid => {
      if (paid) {
        setVerified(true);
      }
    });
  }, []);

  const handleUnlock = useCallback(async () => {
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setErrMsg("Veuillez saisir un email valide.");
      return;
    }

    setStatus("loading");
    setErrMsg("");

    try {
      // Payload simulation (TRI, cashflow, prix — utile pour le webhook)
      const simulationData = {
        tri:        best?.tri        ?? null,
        cashflowM:  best?.cashflowM  ?? null,
        prix:       form?.prix       ?? null,
        surface:    form?.surface    ?? null,
        adresse:    form?.adresse    ?? null,
        regime:     best?.regime     ?? null,
      };

      const res = await fetch("/api/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: clean, simulationData }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        setErrMsg(data.error || "Erreur lors de la création du paiement.");
        setStatus("idle");
        return;
      }

      setStatus("redirecting");
      window.location.href = data.url;
    } catch {
      setErrMsg("Erreur réseau. Veuillez réessayer.");
      setStatus("idle");
    }
  }, [email, form, best]);

  // Si l'utilisateur a deja paye (session_id valide dans URL)
  if (verified) {
    return (
      <Overlay onClose={onClose}>
        <div style={styles.box}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
            <h2 style={styles.title}>Paiement confirmé !</h2>
            <p style={styles.sub}>Votre Rapport Pro est prêt à être téléchargé.</p>
          </div>
          <button onClick={onDownload} style={styles.btnPrimary}>
            ⭐ Télécharger mon Rapport Pro
          </button>
          <button onClick={onClose} style={styles.btnClose}>
            Fermer
          </button>
        </div>
      </Overlay>
    );
  }

  const tri       = best?.tri       != null ? `${best.tri.toFixed(1)} %` : null;
  const cashflow  = best?.cashflowM != null ? `${best.cashflowM >= 0 ? "+" : ""}${Math.round(best.cashflowM)} €/mois` : null;

  return (
    <Overlay onClose={onClose}>
      <div style={styles.box}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ fontSize: 32 }}>⭐</div>
          <div>
            <h2 style={styles.title}>Rapport Pro — Dossier Bancaire Complet</h2>
            <p style={styles.sub}>Analyse patrimoniale enrichie · Prêt pour votre banque &amp; CGP</p>
          </div>
        </div>

        {/* Indicateurs simulation */}
        {(tri || cashflow) && (
          <div style={styles.kpiRow}>
            {tri && (
              <div style={styles.kpi}>
                <div style={styles.kpiVal}>{tri}</div>
                <div style={styles.kpiLabel}>TRI net</div>
              </div>
            )}
            {cashflow && (
              <div style={styles.kpi}>
                <div style={{ ...styles.kpiVal, color: best.cashflowM >= 0 ? "#16a34a" : "#dc2626" }}>
                  {cashflow}
                </div>
                <div style={styles.kpiLabel}>Cashflow mensuel</div>
              </div>
            )}
          </div>
        )}

        {/* Liste des fonctionnalites */}
        <div style={styles.features}>
          {FEATURES.map(f => (
            <div key={f.label} style={styles.featureRow}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{f.icon}</span>
              <span style={styles.featureText}>{f.label}</span>
            </div>
          ))}
        </div>

        {/* Prix */}
        <div style={styles.priceRow}>
          <span style={styles.price}>9,99&nbsp;€</span>
          <span style={styles.priceSub}>paiement unique · accès 48h · PDF illimité</span>
        </div>

        {/* Formulaire email + CTA */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            type="email"
            placeholder="Votre email pour recevoir le rapport"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleUnlock()}
            style={styles.input}
            disabled={status === "loading" || status === "redirecting"}
          />
          {errMsg && <p style={styles.errMsg}>{errMsg}</p>}
          <button
            onClick={handleUnlock}
            disabled={status === "loading" || status === "redirecting"}
            style={{
              ...styles.btnPrimary,
              opacity: status === "loading" || status === "redirecting" ? 0.7 : 1,
              cursor:  status === "loading" || status === "redirecting" ? "wait"  : "pointer",
            }}>
            {status === "loading"     && "⏳ Création du paiement…"}
            {status === "redirecting" && "↗ Redirection vers Stripe…"}
            {(status === "idle" || status === "error") && "🔒 Débloquer mon Dossier Bancaire — 9,99 €"}
          </button>
        </div>

        {/* Garanties */}
        <p style={styles.guarantee}>
          🔒 Paiement sécurisé Stripe · Pas d'abonnement · Remboursement 48h garanti
        </p>

        {/* Rappel rapport gratuit */}
        <p style={styles.freeNote}>
          Le Dossier Bancaire standard (PDF gratuit) reste disponible juste en dessous.
        </p>

        <button onClick={onClose} style={styles.btnClose}>Annuler</button>
      </div>
    </Overlay>
  );
}

// Overlay sombre avec fermeture au clic exterieur
function Overlay({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position:       "fixed",
        inset:          0,
        zIndex:         200,
        background:     "rgba(0,0,0,0.75)",
        backdropFilter: "blur(4px)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "16px",
        overflowY:      "auto",
      }}>
      <div onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = {
  box: {
    background:   "#0f172a",
    border:       "1px solid rgba(249,115,22,0.35)",
    borderRadius: 16,
    padding:      "28px 24px",
    maxWidth:     480,
    width:        "100%",
    display:      "flex",
    flexDirection:"column",
    gap:          16,
    fontFamily:   "system-ui, -apple-system, sans-serif",
  },
  header: {
    display:    "flex",
    alignItems: "flex-start",
    gap:        12,
  },
  title: {
    margin:     0,
    fontSize:   17,
    fontWeight: 700,
    color:      "#F97316",
    lineHeight: 1.3,
  },
  sub: {
    margin:   "4px 0 0",
    fontSize: 12,
    color:    "#94A3B8",
  },
  kpiRow: {
    display:        "flex",
    gap:            12,
    justifyContent: "center",
  },
  kpi: {
    background:   "rgba(249,115,22,0.1)",
    border:       "1px solid rgba(249,115,22,0.25)",
    borderRadius: 10,
    padding:      "10px 20px",
    textAlign:    "center",
    flex:         1,
  },
  kpiVal: {
    fontSize:   20,
    fontWeight: 800,
    color:      "#F97316",
  },
  kpiLabel: {
    fontSize: 11,
    color:    "#94A3B8",
    marginTop: 2,
  },
  features: {
    display:       "flex",
    flexDirection: "column",
    gap:           8,
    background:    "rgba(255,255,255,0.04)",
    borderRadius:  10,
    padding:       "14px 16px",
  },
  featureRow: {
    display:    "flex",
    alignItems: "center",
    gap:        10,
  },
  featureText: {
    fontSize: 13,
    color:    "#CBD5E1",
  },
  priceRow: {
    display:        "flex",
    alignItems:     "baseline",
    gap:            10,
    justifyContent: "center",
  },
  price: {
    fontSize:   28,
    fontWeight: 800,
    color:      "#F97316",
  },
  priceSub: {
    fontSize: 11,
    color:    "#64748B",
  },
  input: {
    width:        "100%",
    padding:      "12px 14px",
    background:   "#1e293b",
    border:       "1px solid #334155",
    borderRadius: 8,
    color:        "#F1F5F9",
    fontSize:     14,
    outline:      "none",
    boxSizing:    "border-box",
  },
  errMsg: {
    margin:   0,
    fontSize: 12,
    color:    "#f87171",
  },
  btnPrimary: {
    width:        "100%",
    padding:      "14px",
    background:   "linear-gradient(135deg,#F97316,#EA580C)",
    color:        "white",
    border:       "none",
    borderRadius: 8,
    fontSize:     14,
    fontWeight:   700,
    cursor:       "pointer",
    letterSpacing:".03em",
  },
  guarantee: {
    margin:     0,
    fontSize:   11,
    color:      "#64748B",
    textAlign:  "center",
    lineHeight: 1.5,
  },
  freeNote: {
    margin:    0,
    fontSize:  11,
    color:     "#475569",
    textAlign: "center",
  },
  btnClose: {
    background:   "transparent",
    border:       "1px solid #334155",
    color:        "#94A3B8",
    borderRadius: 8,
    padding:      "10px",
    fontSize:     13,
    cursor:       "pointer",
    width:        "100%",
  },
};
