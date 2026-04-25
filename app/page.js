"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

/* ══════════════════════════════════════
   LANDING PAGE HUB — Patrimoine & Achat
══════════════════════════════════════ */

const FEATURES_LMNP = [
  { icon: "📊", text: "4 régimes fiscaux comparés" },
  { icon: "💰", text: "Cash-flow & TRI en temps réel" },
  { icon: "🏗️", text: "Amortissement par composants" },
  { icon: "📄", text: "Dossier bancaire PDF" },
];

const FEATURES_RP = [
  { icon: "🏠", text: "Louer vs Acheter sur 20 ans" },
  { icon: "🌿", text: "Analyseur DPE + Budget travaux" },
  { icon: "🏦", text: "Calculateur PTZ primo-accédant" },
  { icon: "📍", text: "Données DVF & aide à la négociation" },
];

const STATS = [
  { value: "4", label: "Régimes fiscaux", sub: "LMNP, Micro-BIC, SCI IS/IR" },
  { value: "5", label: "Outils RP", sub: "Du PTZ à la checklist visite" },
  { value: "100%", label: "Gratuit", sub: "Aucune carte bancaire" },
];

function AnimatedCounter({ target, suffix = "" }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (isNaN(parseInt(target))) { setCount(target); return; }
    const n = parseInt(target);
    let cur = 0;
    const step = Math.ceil(n / 30);
    const t = setInterval(() => {
      cur = Math.min(cur + step, n);
      setCount(cur);
      if (cur >= n) clearInterval(t);
    }, 40);
    return () => clearInterval(t);
  }, [target]);
  return <>{isNaN(parseInt(target)) ? target : count}{suffix}</>;
}

export default function HubPage() {
  const router = useRouter();
  const [hoveredCard, setHoveredCard] = useState(null);

  return (
    <div className="min-h-screen" style={{ background: "#F1F5F9" }}>
      {/* ── HERO ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #0F172A 0%, #1e3a5f 50%, #185FA5 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Orbs décoratifs */}
        <div style={{
          position: "absolute", top: -80, right: -80, width: 300, height: 300,
          borderRadius: "50%", background: "rgba(24,95,165,0.15)", filter: "blur(60px)",
        }} />
        <div style={{
          position: "absolute", bottom: -40, left: -60, width: 200, height: 200,
          borderRadius: "50%", background: "rgba(99,179,237,0.1)", filter: "blur(40px)",
        }} />

        <div className="max-w-2xl mx-auto px-5 pt-12 pb-12 relative">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <span style={{
              fontSize: 11, fontWeight: 700,
              background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)",
              color: "#6EE7B7", padding: "5px 14px", borderRadius: 20,
            }}>
              🟢 Mis à jour · Avril 2026 · Loi de Finances incluse
            </span>
          </div>

          {/* Titre */}
          <div className="text-center">
            <div style={{ fontSize: 44, marginBottom: 8 }}>🏛️</div>
            <h1 style={{
              color: "white", fontSize: 28, fontWeight: 800,
              letterSpacing: "-0.5px", marginBottom: 12, lineHeight: 1.2,
            }}>
              Votre Patrimoine<br />
              <span style={{ color: "#93C5FD" }}>Immobilier en Clair</span>
            </h1>
            <p style={{
              color: "rgba(255,255,255,0.65)", fontSize: 14, lineHeight: 1.7,
              maxWidth: 400, margin: "0 auto 28px",
            }}>
              Deux simulateurs complets pour tous vos projets : investissement locatif LMNP et achat de résidence principale.
            </p>
          </div>

          {/* Stats */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 8,
          }}>
            {STATS.map((s) => (
              <div key={s.label} style={{
                background: "rgba(255,255,255,0.08)", borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)", padding: "14px 10px", textAlign: "center",
              }}>
                <div style={{ color: "white", fontSize: 22, fontWeight: 800, lineHeight: 1 }}>
                  <AnimatedCounter target={s.value} />
                </div>
                <div style={{ color: "#93C5FD", fontSize: 11, fontWeight: 600, marginTop: 4 }}>{s.label}</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 9, marginTop: 2 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CARDS PRINCIPALES ── */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <p style={{ textAlign: "center", fontSize: 12, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 }}>
          Choisissez votre simulateur
        </p>

        <div style={{ display: "grid", gap: 16 }}>
          {/* ── CARTE LMNP ── */}
          <div
            onMouseEnter={() => setHoveredCard("lmnp")}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => router.push("/lmnp")}
            style={{
              background: "white",
              borderRadius: 20,
              border: hoveredCard === "lmnp" ? "2px solid #185FA5" : "2px solid #E2E8F0",
              padding: "24px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              transform: hoveredCard === "lmnp" ? "translateY(-2px)" : "none",
              boxShadow: hoveredCard === "lmnp" ? "0 12px 40px rgba(24,95,165,0.15)" : "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                background: "linear-gradient(135deg, #0F172A, #185FA5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26,
              }}>🏢</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#0F172A" }}>Simulateur LMNP</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, background: "#EFF6FF", color: "#1D4ED8",
                    padding: "2px 8px", borderRadius: 10,
                  }}>Investisseur</span>
                </div>
                <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, marginBottom: 16 }}>
                  Comparez LMNP Réel, Micro-BIC, SCI IS et SCI IR. Optimisez votre fiscalité et générez un dossier bancaire complet.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {FEATURES_LMNP.map((f) => (
                    <div key={f.text} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13 }}>{f.icon}</span>
                      <span style={{ fontSize: 11, color: "#475569", fontWeight: 500 }}>{f.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{
              marginTop: 20, padding: "12px 16px",
              background: hoveredCard === "lmnp" ? "#185FA5" : "#F8FAFC",
              borderRadius: 12, textAlign: "center", transition: "all 0.2s",
            }}>
              <span style={{
                fontSize: 13, fontWeight: 700,
                color: hoveredCard === "lmnp" ? "white" : "#185FA5",
              }}>
                Lancer le simulateur LMNP →
              </span>
            </div>
          </div>

          {/* ── CARTE RP ── */}
          <div
            onMouseEnter={() => setHoveredCard("rp")}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => router.push("/rp")}
            style={{
              background: "white",
              borderRadius: 20,
              border: hoveredCard === "rp" ? "2px solid #059669" : "2px solid #E2E8F0",
              padding: "24px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              transform: hoveredCard === "rp" ? "translateY(-2px)" : "none",
              boxShadow: hoveredCard === "rp" ? "0 12px 40px rgba(5,150,105,0.12)" : "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                background: "linear-gradient(135deg, #064E3B, #059669)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26,
              }}>🏠</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#0F172A" }}>Résidence Principale</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, background: "#ECFDF5", color: "#065F46",
                    padding: "2px 8px", borderRadius: 10,
                  }}>Primo-accédant</span>
                </div>
                <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, marginBottom: 16 }}>
                  5 outils pour acheter sereinement votre premier bien : PTZ, DPE, données DVF, louer vs acheter, checklist visite.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {FEATURES_RP.map((f) => (
                    <div key={f.text} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13 }}>{f.icon}</span>
                      <span style={{ fontSize: 11, color: "#475569", fontWeight: 500 }}>{f.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{
              marginTop: 20, padding: "12px 16px",
              background: hoveredCard === "rp" ? "#059669" : "#F0FDF4",
              borderRadius: 12, textAlign: "center", transition: "all 0.2s",
            }}>
              <span style={{
                fontSize: 13, fontWeight: 700,
                color: hoveredCard === "rp" ? "white" : "#059669",
              }}>
                Accéder aux outils primo-accédant →
              </span>
            </div>
          </div>
        </div>

        {/* ── SECTION CYCLE DE VIE PATRIMONIAL ── */}
        <div style={{
          marginTop: 28, padding: "20px",
          background: "linear-gradient(135deg, #0F172A, #1e3a5f)",
          borderRadius: 20, color: "white",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>✨</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>Cycle de vie patrimonial</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>La stratégie complète en 2 étapes</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 12,
              padding: "12px", border: "1px solid rgba(255,255,255,0.12)",
            }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>🏠</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#93C5FD" }}>Étape 1</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "white" }}>Achetez votre RP</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Sereinement, avec les bons outils</div>
            </div>
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 20 }}>→</div>
            <div style={{
              flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 12,
              padding: "12px", border: "1px solid rgba(255,255,255,0.12)",
            }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>🏢</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6EE7B7" }}>Étape 2 (5 ans+)</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "white" }}>Passez-la en LMNP</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Simulez la mise en location meublée</div>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{ textAlign: "center", marginTop: 28, paddingBottom: 32 }}>
          <p style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.7 }}>
            Outil pédagogique à titre informatif · Pas de conseil fiscal personnalisé<br />
            <span style={{ color: "#CBD5E1" }}>Pour votre dossier définitif, consultez un expert-comptable</span>
          </p>
        </div>
      </div>
    </div>
  );
}
