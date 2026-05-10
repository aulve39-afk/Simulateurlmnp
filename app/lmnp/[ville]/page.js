import { notFound } from "next/navigation";
import Link from "next/link";
import { getVille, SLUGS, VILLES_LIST } from "./data";

/* ── Métadonnées dynamiques ── */
export async function generateMetadata({ params }) {
  const v = getVille(params.ville);
  if (!v) return {};
  return {
    title: `LMNP ${v.nom} 2026 — Rendement, prix, conseils | ImmoVerdict`,
    description: `Investissement LMNP à ${v.nom} : rendement brut ${v.rendementBrut.min}–${v.rendementBrut.max}%, prix médian ${v.prixMedM2.toLocaleString("fr-FR")}€/m², quartiers, conseils et simulateur gratuit.`,
    alternates: { canonical: `https://immoverdict.com/lmnp/${v.slug}` },
    openGraph: {
      title: `LMNP ${v.nom} — Rendement & conseils 2026 | ImmoVerdict`,
      description: `Tout sur l'investissement LMNP à ${v.nom} : prix DVF, rendements, quartiers recommandés et simulation fiscale gratuite.`,
      url: `https://immoverdict.com/lmnp/${v.slug}`,
    },
  };
}

/* ── Génération statique des routes ── */
export function generateStaticParams() {
  return SLUGS.map(ville => ({ ville }));
}

/* ── Helpers ── */
function TensionBadge({ niveau }) {
  const colors = ["", "#EF4444", "#F97316", "#F59E0B", "#22C55E", "#10B981"];
  const labels = ["", "Faible", "Modérée", "Bonne", "Forte", "Très forte"];
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: colors[niveau] + "22", color: colors[niveau], border: `1px solid ${colors[niveau]}44` }}>
      {"●".repeat(niveau)}{"○".repeat(5 - niveau)} {labels[niveau]}
    </span>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-[11px] text-slate-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ── Page principale ── */
export default function VillePage({ params }) {
  const v = getVille(params.ville);
  if (!v) notFound();

  const simUrl = `/lmnp?prix=${v.exemple.prix}&loyer=${v.exemple.loyer}&surface=${v.exemple.surface}&charges=${v.exemple.charges}&taxeFonciere=${v.exemple.taxeFonciere}&vacance=${v.exemple.vacance}&typeBien=${encodeURIComponent(v.exemple.typeBien)}&adresse=${encodeURIComponent(v.nom)}&step=3`;

  /* JSON-LD */
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: v.faq.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `LMNP ${v.nom} 2026 — Rendement, prix et conseils`,
    description: `Guide investissement LMNP à ${v.nom} : prix médian ${v.prixMedM2.toLocaleString("fr-FR")}€/m², rendement ${v.rendementBrut.min}–${v.rendementBrut.max}%, meilleurs quartiers.`,
    author: { "@type": "Person", name: "Alexandre Ulve", url: "https://immoverdict.com/a-propos" },
    publisher: { "@type": "Organization", name: "ImmoVerdict", url: "https://immoverdict.com" },
    datePublished: "2026-01-15",
    dateModified: "2026-05-01",
    url: `https://immoverdict.com/lmnp/${v.slug}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />

      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30 pb-20">
        {/* ── Nav ── */}
        <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100 px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-orange-500 font-bold text-sm">ImmoVerdict</Link>
          <span className="text-slate-300">›</span>
          <Link href="/lmnp" className="text-slate-600 text-sm hover:text-orange-500">Simulateur LMNP</Link>
          <span className="text-slate-300">›</span>
          <span className="text-slate-900 text-sm font-medium">LMNP {v.nom}</span>
        </nav>

        <div className="max-w-3xl mx-auto px-4 pt-8">
          {/* ── Hero ── */}
          <header className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700">
                📍 {v.departement} · {v.region}
              </span>
              <TensionBadge niveau={v.tensionLocative} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3 leading-tight">
              Investissement LMNP à {v.nom} en 2026
            </h1>
            <p className="text-slate-600 text-base leading-relaxed">
              {v.contexte}
            </p>
          </header>

          {/* ── Stats clés ── */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <StatCard
              label="Prix médian"
              value={`${v.prixMedM2.toLocaleString("fr-FR")} €/m²`}
              sub={`Fourchette : ${v.prixMedM2Fourchette} €/m²`}
            />
            <StatCard
              label="Loyer meublé médian"
              value={`${v.loyerMedM2} €/m²`}
              sub="Charges non comprises"
            />
            <StatCard
              label="Rendement brut"
              value={`${v.rendementBrut.min}–${v.rendementBrut.max}%`}
              sub="Hors fiscalité"
            />
            <StatCard
              label="Tension locative"
              value={`${v.tensionLocative}/5`}
              sub="Demande vs offre"
            />
          </section>

          {/* ── CTA simulateur ── */}
          <section className="mb-8 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white shadow-lg">
            <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80 mb-1">Simulateur pré-rempli</p>
            <h2 className="text-lg font-bold mb-2">
              Calculez votre rendement LMNP à {v.nom} en 2 minutes
            </h2>
            <p className="text-sm opacity-90 mb-4">
              Exemple : {v.exemple.typeBien} {v.exemple.surface} m² · {v.exemple.prix.toLocaleString("fr-FR")} € · {v.exemple.loyer} €/mois — 4 régimes fiscaux comparés, TRI, cash-flow, dossier bancaire PDF.
            </p>
            <Link href={simUrl}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-orange-600 shadow-sm hover:shadow-md transition-shadow">
              Lancer la simulation →
            </Link>
          </section>

          {/* ── Conseil ── */}
          <section className="mb-8 rounded-xl border border-orange-100 bg-orange-50 p-5">
            <h2 className="text-base font-bold text-slate-900 mb-2">
              💡 Nos conseils pour investir en LMNP à {v.nom}
            </h2>
            <p className="text-slate-700 text-sm leading-relaxed">{v.conseil}</p>

            {v.alertes.length > 0 && (
              <div className="mt-3 pt-3 border-t border-orange-200">
                <p className="text-[11px] font-semibold text-orange-700 mb-1.5">⚠️ Points de vigilance</p>
                <ul className="space-y-1">
                  {v.alertes.map((a, i) => (
                    <li key={i} className="text-[12px] text-slate-600 flex items-start gap-1.5">
                      <span className="text-orange-400 mt-0.5">›</span>{a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* ── Quartiers ── */}
          <section className="mb-8">
            <h2 className="text-base font-bold text-slate-900 mb-3">
              🏘️ Meilleurs quartiers LMNP à {v.nom}
            </h2>
            <div className="flex flex-wrap gap-2">
              {v.quartiers.map(q => (
                <span key={q} className="px-3 py-1.5 rounded-full text-[12px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  {q}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Segments porteurs : {v.segments.join(", ")}
            </p>
          </section>

          {/* ── FAQ ── */}
          <section className="mb-8">
            <h2 className="text-base font-bold text-slate-900 mb-4">
              Questions fréquentes — LMNP {v.nom}
            </h2>
            <div className="space-y-4">
              {v.faq.map(({ q, a }, i) => (
                <div key={i} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 mb-1.5">{q}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Autres villes ── */}
          <section className="mb-8">
            <h2 className="text-sm font-bold text-slate-600 mb-3">Autres villes</h2>
            <div className="flex flex-wrap gap-2">
              {VILLES_LIST.filter(city => city.slug !== v.slug).map(city => (
                <Link key={city.slug} href={`/lmnp/${city.slug}`}
                  className="px-3 py-1 rounded-lg text-[12px] font-medium bg-white border border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-600 transition-colors">
                  LMNP {city.nom}
                </Link>
              ))}
            </div>
          </section>

          {/* ── Back ── */}
          <div className="text-center">
            <Link href="/lmnp"
              className="inline-flex items-center gap-2 text-sm text-orange-500 font-semibold hover:text-orange-700">
              ← Retour au simulateur LMNP complet
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
