import Link from "next/link";
import Script from "next/script";

/* ── Données tableau comparatif ── */
const REGIMES = [
  {
    id: "micro",
    nom: "Micro-BIC",
    badge: "Le + simple",
    badgeColor: "#3B82F6",
    plafond: "77 700 € / an",
    abattement: "50 % (71 % meublé tourisme classé)",
    amortissement: "Non",
    chargesReelles: "Non",
    comptabilite: "Allégée",
    cfe: "Oui",
    cotisationsSociales: "Non (sauf > 23 000 € si revenus principaux)",
    ideal: "Rendement brut élevé, faibles charges",
    risque: "Inefficace si charges > abattement",
    couleur: "#3B82F6",
  },
  {
    id: "reel",
    nom: "Réel simplifié",
    badge: "Le + optimisé",
    badgeColor: "#F97316",
    plafond: "Illimité",
    abattement: "—",
    amortissement: "Oui (composants)",
    chargesReelles: "Oui",
    comptabilite: "Complète (expert-comptable conseillé)",
    cfe: "Oui",
    cotisationsSociales: "Oui si recettes > 23 000 € et > revenus du foyer",
    ideal: "Bien neuf ou avec gros travaux · Fort endettement",
    risque: "Complexité administrative · Requalification LMP possible",
    couleur: "#F97316",
  },
  {
    id: "sarl",
    nom: "SARL de famille",
    badge: "Multi-investisseurs",
    badgeColor: "#8B5CF6",
    plafond: "Illimité",
    abattement: "—",
    amortissement: "Oui",
    chargesReelles: "Oui",
    comptabilite: "Complète (expert-comptable obligatoire)",
    cfe: "Oui",
    cotisationsSociales: "Oui (gérant majoritaire TNS)",
    ideal: "Investissement familial · Transmission patrimoniale",
    risque: "Coût de création et gestion · Gérance rémunérée requise",
    couleur: "#8B5CF6",
  },
  {
    id: "sci",
    nom: "SCI à l'IS",
    badge: "Long terme",
    badgeColor: "#10B981",
    plafond: "Illimité",
    abattement: "—",
    amortissement: "Oui",
    chargesReelles: "Oui",
    comptabilite: "Complète (expert-comptable obligatoire)",
    cfe: "Oui",
    cotisationsSociales: "Non (si pas de rémunération gérance)",
    ideal: "Stratégie patrimoniale longue · Réinvestissement des bénéfices",
    risque: "Double imposition dividendes · Perte abattement 71 %",
    couleur: "#10B981",
  },
];

const FAQ = [
  {
    q: "Quelle est la différence entre Micro-BIC et Réel simplifié LMNP ?",
    a: "Le Micro-BIC applique un abattement forfaitaire de 50 % (ou 71 % en meublé tourisme classé) sur vos recettes, sans déduire les charges réelles. Le Réel simplifié permet de déduire toutes les charges (intérêts d'emprunt, travaux, assurances, taxe foncière) et d'amortir le bien par composants. Le Réel est généralement plus avantageux si vos charges dépassent l'abattement Micro-BIC.",
  },
  {
    q: "À partir de quel montant de loyers le Réel LMNP est-il obligatoire ?",
    a: "Le Micro-BIC est plafonné à 77 700 € de recettes annuelles (23 000 € pour les meublés de tourisme non classés depuis la loi de finances 2024). Au-delà, le passage au Réel est obligatoire. Même en dessous, une option volontaire pour le Réel peut être rentable dès lors que vos charges annuelles dépassent 50 % des recettes.",
  },
  {
    q: "Comment fonctionne l'amortissement LMNP au Réel ?",
    a: "L'amortissement par composants consiste à ventiler la valeur du bien en plusieurs composants (gros œuvre, toiture, façade, installations générales, agencements) amortis sur des durées différentes, généralement entre 10 et 50 ans. Seul le foncier (terrain) n'est pas amortissable. L'amortissement génère une charge fiscale sans sortie de trésorerie, réduisant voire annulant l'impôt sur les revenus locatifs pendant 15 à 25 ans.",
  },
  {
    q: "SARL de famille vs Réel simplifié : quelle différence fiscale ?",
    a: "La SARL de famille est une société soumise à l'IR (impôt sur le revenu) mais avec option possible pour l'IS. Elle permet d'associer plusieurs membres de la famille et facilite la transmission du patrimoine. Sur le plan fiscal pur, les avantages sont similaires au Réel simplifié individuel (amortissements, charges déductibles), mais s'y ajoutent des cotisations sociales TNS pour le gérant majoritaire.",
  },
  {
    q: "La SCI à l'IS est-elle adaptée au LMNP ?",
    a: "Techniquement, une SCI à l'IS qui exerce une activité de location meublée est requalifiée en société commerciale. Elle peut amortir le bien et déduire toutes les charges, avec un taux d'IS de 15 % jusqu'à 42 500 € de bénéfice. En revanche, la distribution des bénéfices en dividendes subit une double imposition. Elle convient surtout aux stratégies de réinvestissement des bénéfices dans la société plutôt qu'à la distribution.",
  },
  {
    q: "Qu'est-ce que la requalification LMP et comment l'éviter ?",
    a: "La requalification en Loueur Meublé Professionnel (LMP) survient si vos recettes LMNP dépassent 23 000 € par an ET représentent plus de 50 % des revenus professionnels du foyer fiscal. Le statut LMP entraîne des cotisations sociales TNS (environ 35-40 % sur le résultat) mais ouvre droit à l'imputation des déficits sur le revenu global et des exonérations de plus-value sous conditions. Un simulateur LMNP doit signaler ce risque automatiquement.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: "https://immoverdict.com" },
        { "@type": "ListItem", position: 2, name: "Simulateur LMNP", item: "https://immoverdict.com/lmnp" },
        { "@type": "ListItem", position: 3, name: "Comparer les régimes", item: "https://immoverdict.com/lmnp/comparer" },
      ],
    },
  ],
};

/* ── Composants UI ── */
function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="8" fill="#22C55E" fillOpacity="0.15" />
      <path d="M4.5 8l2.5 2.5 4-4" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="8" fill="#EF4444" fillOpacity="0.15" />
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function ComparerPage() {
  return (
    <>
      <Script
        id="json-ld-comparer"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div style={{ background: "#0C0C10", minHeight: "100vh", color: "#EDE8DC" }}>
        {/* ── Header nav ── */}
        <header style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              <svg width="28" height="28" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <rect width="32" height="32" fill="#1C1C22" />
                <rect x="2" y="2" width="28" height="4" fill="#F97316" />
                <rect x="2" y="6" width="12" height="24" fill="#EDE8DC" />
                <rect x="18" y="6" width="12" height="16" fill="#EDE8DC" />
              </svg>
              <span style={{ fontWeight: 700, fontSize: 15, color: "#EDE8DC" }}>ImmoVerdict</span>
            </Link>
            <nav style={{ display: "flex", gap: 16, fontSize: 13 }}>
              <Link href="/lmnp" style={{ color: "rgba(237,232,220,0.6)", textDecoration: "none" }}>Simulateur</Link>
              <Link href="/blog" style={{ color: "rgba(237,232,220,0.6)", textDecoration: "none" }}>Blog</Link>
              <Link href="/rp" style={{ color: "rgba(237,232,220,0.6)", textDecoration: "none" }}>Résidence principale</Link>
            </nav>
          </div>
        </header>

        {/* ── Breadcrumb ── */}
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "12px 20px" }}>
          <nav aria-label="Fil d'Ariane" style={{ fontSize: 13, color: "rgba(237,232,220,0.45)" }}>
            <Link href="/" style={{ color: "rgba(237,232,220,0.45)", textDecoration: "none" }}>Accueil</Link>
            <span style={{ margin: "0 6px" }}>›</span>
            <Link href="/lmnp" style={{ color: "rgba(237,232,220,0.45)", textDecoration: "none" }}>Simulateur LMNP</Link>
            <span style={{ margin: "0 6px" }}>›</span>
            <span style={{ color: "#F97316" }}>Comparer les régimes</span>
          </nav>
        </div>

        <main style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px 80px" }}>

          {/* ── Hero ── */}
          <section style={{ textAlign: "center", padding: "48px 0 40px" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)",
              borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#F97316",
              marginBottom: 16, fontWeight: 600, letterSpacing: "0.03em"
            }}>
              ⚖️ COMPARATIF 2026
            </div>
            <h1 style={{ fontSize: "clamp(26px, 5vw, 40px)", fontWeight: 800, lineHeight: 1.2, margin: "0 0 16px", color: "#EDE8DC" }}>
              Comparer les 4 régimes fiscaux LMNP
            </h1>
            <p style={{ fontSize: 17, color: "rgba(237,232,220,0.65)", maxWidth: 560, margin: "0 auto 32px", lineHeight: 1.6 }}>
              Micro-BIC, Réel simplifié, SARL de famille, SCI à l'IS — tableau comparatif complet
              mis à jour avec la loi de finances 2026.
            </p>
            <Link
              href="/lmnp"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "linear-gradient(135deg, #F97316, #EA580C)",
                color: "white", textDecoration: "none", borderRadius: 10,
                padding: "13px 28px", fontWeight: 700, fontSize: 15,
                boxShadow: "0 4px 20px rgba(249,115,22,0.35)"
              }}
            >
              🚀 Simuler mon cas personnel
            </Link>
            <p style={{ fontSize: 12, color: "rgba(237,232,220,0.35)", marginTop: 10 }}>
              Gratuit · Aucun compte requis · Résultats en 2 minutes
            </p>
          </section>

          {/* ── Tableau comparatif (desktop) ── */}
          <section aria-label="Tableau comparatif des régimes LMNP" style={{ marginBottom: 56 }}>
            <div style={{ overflowX: "auto", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <caption style={{ display: "none" }}>Comparaison des 4 régimes fiscaux LMNP : Micro-BIC, Réel simplifié, SARL de famille, SCI IS</caption>
                <thead>
                  <tr>
                    <th style={{ padding: "16px 20px", textAlign: "left", background: "rgba(255,255,255,0.04)", color: "rgba(237,232,220,0.45)", fontWeight: 600, fontSize: 12, letterSpacing: "0.04em", width: 180 }}>
                      CRITÈRE
                    </th>
                    {REGIMES.map(r => (
                      <th key={r.id} style={{ padding: "16px 16px", textAlign: "center", background: "rgba(255,255,255,0.04)", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                        <span style={{
                          display: "inline-block", background: r.couleur + "22",
                          border: `1px solid ${r.couleur}44`, borderRadius: 6,
                          padding: "2px 8px", fontSize: 11, color: r.couleur, fontWeight: 700, marginBottom: 4
                        }}>
                          {r.badge}
                        </span>
                        <div style={{ fontWeight: 800, fontSize: 15, color: "#EDE8DC" }}>{r.nom}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Plafond recettes", key: "plafond" },
                    { label: "Abattement forfaitaire", key: "abattement" },
                    { label: "Amortissement bien", key: "amortissement" },
                    { label: "Charges réelles déductibles", key: "chargesReelles" },
                    { label: "Comptabilité", key: "comptabilite" },
                    { label: "CFE", key: "cfe" },
                    { label: "Cotisations sociales", key: "cotisationsSociales" },
                    { label: "Idéal pour", key: "ideal" },
                    { label: "Point de vigilance", key: "risque" },
                  ].map((row, i) => (
                    <tr key={row.key} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.025)" }}>
                      <td style={{ padding: "12px 20px", color: "rgba(237,232,220,0.6)", fontWeight: 500, fontSize: 13, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                        {row.label}
                      </td>
                      {REGIMES.map(r => {
                        const val = r[row.key];
                        const isOui = val === "Oui";
                        const isNon = val === "Non";
                        return (
                          <td key={r.id} style={{ padding: "12px 16px", textAlign: "center", borderLeft: "1px solid rgba(255,255,255,0.05)", borderTop: "1px solid rgba(255,255,255,0.05)", color: "rgba(237,232,220,0.8)", fontSize: 13, lineHeight: 1.4 }}>
                            {isOui ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <CheckIcon /> <span style={{ color: "#22C55E", fontWeight: 600 }}>Oui</span>
                              </span>
                            ) : isNon ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <CrossIcon /> <span style={{ color: "#EF4444" }}>Non</span>
                              </span>
                            ) : (
                              <span>{val}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: 12, color: "rgba(237,232,220,0.3)", marginTop: 10, textAlign: "center" }}>
              Tableau mis à jour selon la loi de finances 2026 · Seuils Micro-BIC révisés par la LF 2024
            </p>
          </section>

          {/* ── Cards régimes ── */}
          <section style={{ marginBottom: 56 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#EDE8DC", marginBottom: 8 }}>
              Quel régime choisir ?
            </h2>
            <p style={{ color: "rgba(237,232,220,0.55)", fontSize: 15, marginBottom: 28, lineHeight: 1.6 }}>
              Le choix du régime dépend de votre situation personnelle : niveau des loyers, montant des charges,
              endettement, et stratégie patrimoniale. Voici les profils types.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
              {[
                {
                  regime: "Micro-BIC",
                  icon: "🏠",
                  couleur: "#3B82F6",
                  profil: "Rendement brut > 6 % · Charges faibles · Débutant",
                  exemple: "Studio en zone tendue · Colocation · Chambre meublée",
                  avantage: "Zéro comptabilité, déclaration simplifiée sur la 2042 C Pro.",
                  inconvenient: "Inefficace si intérêts d'emprunt + charges > 50 % des loyers."
                },
                {
                  regime: "Réel simplifié",
                  icon: "📊",
                  couleur: "#F97316",
                  profil: "Fort endettement · Bien neuf · Loyers > 30 000 €/an",
                  exemple: "Appartement neuf VEFA · Ancien avec travaux · Résidence étudiante",
                  avantage: "Amortissement + déduction charges = impôt nul pendant 15-25 ans.",
                  inconvenient: "Expert-comptable nécessaire (800-1 500 €/an). Risque LMP si recettes > 23 000 € et prépondérantes."
                },
                {
                  regime: "SARL de famille",
                  icon: "👨‍👩‍👧",
                  couleur: "#8B5CF6",
                  profil: "Investissement en couple ou famille · Transmission patrimoniale",
                  exemple: "Parc locatif familial · Donation progressive aux enfants",
                  avantage: "Souplesse de la société + fiscalité transparente IR + cession facilitée.",
                  inconvenient: "Cotisations sociales TNS (~35 %) pour gérant majoritaire. Formalisme juridique annuel."
                },
                {
                  regime: "SCI à l'IS",
                  icon: "🏗️",
                  couleur: "#10B981",
                  profil: "Stratégie long terme · Réinvestissement des bénéfices",
                  exemple: "Immeuble de rapport · Multi-biens · Holding patrimoniale",
                  avantage: "IS à 15 % sur les 42 500 premiers € de bénéfice. Amortissements + charges déductibles.",
                  inconvenient: "Double imposition sur dividendes. Perte de l'abattement 71 % meublé tourisme. Rigidité fiscale à la vente."
                },
              ].map(c => (
                <article key={c.regime} style={{
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${c.couleur}33`,
                  borderRadius: 14, padding: "20px 22px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 22 }}>{c.icon}</span>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#EDE8DC" }}>{c.regime}</h3>
                  </div>
                  <div style={{ fontSize: 12, color: c.couleur, fontWeight: 600, marginBottom: 10, padding: "4px 10px", background: c.couleur + "18", borderRadius: 6, display: "inline-block" }}>
                    {c.profil}
                  </div>
                  <p style={{ fontSize: 13, color: "rgba(237,232,220,0.5)", marginBottom: 10, lineHeight: 1.5 }}>
                    <strong style={{ color: "rgba(237,232,220,0.7)" }}>Ex. : </strong>{c.exemple}
                  </p>
                  <div style={{ fontSize: 13, marginBottom: 6, display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: "#22C55E", flexShrink: 0 }}>✓</span>
                    <span style={{ color: "rgba(237,232,220,0.7)", lineHeight: 1.5 }}>{c.avantage}</span>
                  </div>
                  <div style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: "#F59E0B", flexShrink: 0 }}>⚠</span>
                    <span style={{ color: "rgba(237,232,220,0.55)", lineHeight: 1.5 }}>{c.inconvenient}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* ── Simulateur CTA ── */}
          <section style={{
            background: "linear-gradient(135deg, rgba(249,115,22,0.12), rgba(249,115,22,0.05))",
            border: "1px solid rgba(249,115,22,0.2)", borderRadius: 20,
            padding: "36px 32px", textAlign: "center", marginBottom: 56
          }}>
            <p style={{ fontSize: 20, fontWeight: 800, color: "#EDE8DC", margin: "0 0 8px" }}>
              🎯 Votre situation est unique
            </p>
            <p style={{ color: "rgba(237,232,220,0.6)", fontSize: 15, margin: "0 0 24px", maxWidth: 480, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
              Le tableau ci-dessus donne les règles générales. Notre simulateur calcule le régime optimal
              <strong style={{ color: "#F97316" }}> pour vos chiffres précis</strong> : loyer, prix d'achat,
              financement, charges réelles.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link
                href="/lmnp"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: "linear-gradient(135deg, #F97316, #EA580C)",
                  color: "white", textDecoration: "none", borderRadius: 10,
                  padding: "13px 28px", fontWeight: 700, fontSize: 15,
                  boxShadow: "0 4px 20px rgba(249,115,22,0.35)"
                }}
              >
                🚀 Lancer la simulation
              </Link>
              <Link
                href="/blog"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                  color: "#EDE8DC", textDecoration: "none", borderRadius: 10,
                  padding: "13px 24px", fontWeight: 600, fontSize: 15,
                }}
              >
                📖 Lire nos guides LMNP
              </Link>
            </div>
          </section>

          {/* ── FAQ ── */}
          <section style={{ marginBottom: 56 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#EDE8DC", marginBottom: 28 }}>
              Questions fréquentes
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {FAQ.map((item, i) => (
                <details
                  key={i}
                  style={{
                    borderTop: "1px solid rgba(255,255,255,0.07)",
                    padding: "0"
                  }}
                >
                  <summary style={{
                    padding: "18px 0", cursor: "pointer", fontSize: 15, fontWeight: 600,
                    color: "#EDE8DC", listStyle: "none", display: "flex", justifyContent: "space-between",
                    alignItems: "center", gap: 12, userSelect: "none"
                  }}>
                    <span>{item.q}</span>
                    <span style={{ color: "#F97316", flexShrink: 0, fontSize: 20, lineHeight: 1 }}>+</span>
                  </summary>
                  <div style={{ paddingBottom: 18, fontSize: 14, color: "rgba(237,232,220,0.65)", lineHeight: 1.75 }}>
                    {item.a}
                  </div>
                </details>
              ))}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }} />
            </div>
          </section>

          {/* ── Footer links ── */}
          <footer style={{ textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 28 }}>
            <p style={{ fontSize: 12, color: "rgba(237,232,220,0.3)", lineHeight: 1.8 }}>
              ImmoVerdict — Simulateur LMNP gratuit · Mis à jour loi de finances 2026<br />
              Contenu à titre informatif — consultez un expert-comptable pour votre situation personnelle
            </p>
            <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 14, fontSize: 13 }}>
              <Link href="/lmnp" style={{ color: "rgba(237,232,220,0.4)", textDecoration: "none" }}>Simulateur LMNP</Link>
              <Link href="/rp" style={{ color: "rgba(237,232,220,0.4)", textDecoration: "none" }}>Résidence principale</Link>
              <Link href="/blog" style={{ color: "rgba(237,232,220,0.4)", textDecoration: "none" }}>Blog</Link>
              <Link href="/mentions-legales" style={{ color: "rgba(237,232,220,0.4)", textDecoration: "none" }}>Mentions légales</Link>
            </div>
          </footer>
        </main>
      </div>
    </>
  );
}
