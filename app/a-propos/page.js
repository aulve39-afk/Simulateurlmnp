import Link from "next/link";

export const metadata = {
  title: "À propos — Alex, investisseur LMNP | ImmoVerdict",
  description: "Alex est investisseur LMNP. Il a créé ImmoVerdict après n'avoir trouvé aucun simulateur qui comparait vraiment les 4 régimes fiscaux sans abonnement payant.",
  alternates: { canonical: "https://immoverdict.com/a-propos" },
  openGraph: {
    title: "À propos d'Alex — ImmoVerdict",
    description: "L'histoire derrière ImmoVerdict : un investisseur LMNP qui a créé l'outil qu'il cherchait.",
    url: "https://immoverdict.com/a-propos",
    siteName: "ImmoVerdict",
    locale: "fr_FR",
    type: "profile",
  },
};

const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Alex",
  "url": "https://immoverdict.com/a-propos",
  "jobTitle": "Investisseur LMNP & créateur d'ImmoVerdict",
  "description": "Investisseur en location meublée non professionnelle (LMNP) depuis plusieurs années, Alex a créé ImmoVerdict pour simplifier la comparaison des régimes fiscaux immobiliers.",
  "sameAs": ["https://immoverdict.com"],
};

const LogoMark = () => (
  <svg width="28" height="28" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ flexShrink: 0 }}>
    <rect x="0" y="0" width="30" height="3" fill="#F97316" />
    <rect x="0" y="3" width="12" height="27" fill="#F0EBE0" />
    <rect x="18" y="3" width="12" height="18" fill="#F0EBE0" />
  </svg>
);

export default function APropos() {
  return (
    <div style={{ minHeight: "100vh", background: "#0C0C10", color: "#F0EBE0", fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />

      {/* ── NAV ── */}
      <nav style={{ borderBottom: "1px solid rgba(240,235,224,0.08)", padding: "0 48px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "rgba(12,12,16,0.92)", backdropFilter: "blur(20px)", zIndex: 50 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
          <LogoMark />
          <span style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 15, color: "#F0EBE0", letterSpacing: "-.2px" }}>
            Immo<span style={{ color: "#F97316" }}>Verdict</span>
          </span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {[
            { href: "/lmnp", label: "Simulateur LMNP" },
            { href: "/rp", label: "Résidence Principale" },
            { href: "/blog", label: "Blog" },
          ].map(({ href, label }) => (
            <Link key={href} href={href} style={{
              display: "inline-block", padding: "0 20px", height: 60, lineHeight: "60px",
              fontSize: 13, fontWeight: 500, textDecoration: "none",
              color: "rgba(240,235,224,0.5)",
              borderBottom: "2px solid transparent",
            }}>{label}</Link>
          ))}
        </div>
      </nav>

      {/* ── CONTENU ── */}
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "72px 48px 96px" }}>

        {/* Entête */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <div style={{ width: 3, height: 20, background: "#F97316" }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2.5px", textTransform: "uppercase", color: "#F97316" }}>
              À propos
            </span>
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display',Georgia,serif", fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 400, lineHeight: 1.1, marginBottom: 16, color: "#F0EBE0" }}>
            Bonjour, je suis Alex.
          </h1>
          <p style={{ fontSize: "1.1rem", color: "rgba(240,235,224,0.55)", lineHeight: 1.8, fontWeight: 300 }}>
            Investisseur en location meublée (LMNP) et créateur d&apos;ImmoVerdict.
          </p>
        </div>

        {/* ── STATS RAPIDES (E-E-A-T) ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 1, background: "rgba(240,235,224,0.08)", marginBottom: 56 }}>
          {[
            { val: "3+", label: "Biens LMNP gérés" },
            { val: "4", label: "Régimes fiscaux maîtrisés" },
            { val: "25+", label: "Guides publiés" },
            { val: "LF 2026", label: "Données à jour" },
          ].map(({ val, label }) => (
            <div key={label} style={{ background: "#0C0C10", padding: "24px 20px", textAlign: "center" }}>
              <div style={{ fontFamily: "'DM Serif Display',Georgia,serif", fontSize: "1.8rem", color: "#F97316", lineHeight: 1, marginBottom: 8 }}>{val}</div>
              <div style={{ fontSize: 11, color: "rgba(240,235,224,0.4)", lineHeight: 1.4 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Séparateur */}
        <div style={{ borderTop: "1px solid rgba(240,235,224,0.08)", marginBottom: 48 }} />

        {/* Bio */}
        <div style={{ fontSize: "1rem", color: "rgba(240,235,224,0.75)", lineHeight: 1.85, display: "flex", flexDirection: "column", gap: 24 }}>

          <p>
            J&apos;ai commencé à investir en LMNP il y a quelques années, en cherchant à comprendre
            quel régime fiscal était le plus avantageux pour mes projets : micro-BIC, réel simplifié,
            SCI à l&apos;IS, location nue… Chaque régime a ses règles, ses pièges et ses avantages selon
            la situation.
          </p>

          <p>
            Le problème : les simulateurs que je trouvais en ligne comparaient au mieux deux régimes,
            imposaient souvent une inscription, et ne prenaient pas en compte les amortissements LMNP
            correctement — notamment l&apos;amortissement par composants prévu à l&apos;article 39 C du CGI.
            J&apos;ai commencé à faire mes calculs sous Excel. Puis j&apos;ai décidé d&apos;en faire un vrai outil.
          </p>

          <p>
            <strong style={{ color: "#F0EBE0" }}>ImmoVerdict est né de ce manque.</strong> Un simulateur
            qui compare les 4 grands régimes fiscaux côte à côte, intègre l&apos;amortissement réel par composants,
            le cashflow, le TRI et la fiscalité à la revente — sans abonnement, sans compte requis,
            sans données personnelles collectées.
          </p>

          <p>
            Je ne suis pas fiscaliste ni conseiller en gestion de patrimoine. Je suis un investisseur
            qui a voulu comprendre, et qui partage les outils qu&apos;il aurait voulu avoir au départ.
            Les articles du blog et les calculs du simulateur reflètent cette expérience terrain — et
            sont mis à jour à chaque évolution législative (Loi de Finances, réforme du meublé de tourisme, DPE…).
          </p>

          <div style={{ borderLeft: "3px solid #F97316", paddingLeft: 20, marginTop: 8, color: "rgba(240,235,224,0.5)", fontStyle: "italic", fontSize: ".95rem" }}>
            Les informations d&apos;ImmoVerdict sont fournies à titre indicatif. Pour une décision
            d&apos;investissement, consultez un expert-comptable ou un CGP spécialisé en immobilier.
          </div>
        </div>

        {/* ── TIMELINE EXPERTISE ── */}
        <div style={{ borderTop: "1px solid rgba(240,235,224,0.08)", margin: "56px 0 48px" }} />

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <div style={{ width: 3, height: 20, background: "#F97316" }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2.5px", textTransform: "uppercase", color: "#F97316" }}>
              Parcours
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              { year: "Avant ImmoVerdict", title: "Les calculs sous Excel", desc: "Des tableurs maison pour comparer Micro-BIC et Réel. Utiles mais pas partageables, souvent faux sur les amortissements." },
              { year: "Lancement", title: "Premier simulateur LMNP public", desc: "Mise en ligne du comparateur 4 régimes (Micro-BIC, Réel, SCI IS, SCI IR) avec calcul d'amortissement par composants selon CGI art. 39 C." },
              { year: "Évolutions", title: "Ajout du dossier bancaire & TRI", desc: "Intégration du score de bancabilité HCSF, du TRI 20 ans, du stress test et du calculateur inversé (prix max pour un cashflow cible)." },
              { year: "Aujourd'hui", title: "LF 2026 & réforme meublé tourisme", desc: "Mise à jour complète pour la Loi de Finances 2026 : nouveaux plafonds, réforme des meublés de tourisme, suivi des DPE interdits à la location." },
            ].map(({ year, title, desc }, i, arr) => (
              <div key={i} style={{ display: "flex", gap: 20, paddingBottom: i < arr.length - 1 ? 28 : 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 20 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#F97316", marginTop: 6, flexShrink: 0 }} />
                  {i < arr.length - 1 && <div style={{ flex: 1, width: 1, background: "rgba(249,115,22,0.2)", marginTop: 4 }} />}
                </div>
                <div style={{ paddingBottom: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(249,115,22,0.7)", marginBottom: 4 }}>{year}</div>
                  <div style={{ fontSize: ".95rem", fontWeight: 700, color: "#F0EBE0", marginBottom: 6 }}>{title}</div>
                  <p style={{ fontSize: ".85rem", color: "rgba(240,235,224,0.5)", lineHeight: 1.7, margin: 0 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── ARTICLES DE RÉFÉRENCE ── */}
        <div style={{ borderTop: "1px solid rgba(240,235,224,0.08)", margin: "56px 0 40px" }} />

        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <div style={{ width: 3, height: 20, background: "#F97316" }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2.5px", textTransform: "uppercase", color: "#F97316" }}>
              Articles de référence
            </span>
          </div>
          <div style={{ display: "grid", gap: 1, background: "rgba(240,235,224,0.08)" }}>
            {[
              { href: "/blog/amortissement-lmnp-guide-complet", label: "Amortissement LMNP : le guide complet (CGI Art. 39 C)", tag: "Fiscalité" },
              { href: "/blog/lmnp-regime-reel-vs-micro-bic", label: "Micro-BIC vs Régime Réel : comparatif chiffré 2026", tag: "Fiscalité" },
              { href: "/blog/sci-vs-lmnp-nom-propre", label: "SCI ou LMNP en nom propre : que choisir ?", tag: "Structure" },
              { href: "/blog/investir-lmnp-2026-guide-debutant", label: "Investir en LMNP en 2026 : guide complet débutant", tag: "Guide" },
            ].map(({ href, label, tag }) => (
              <Link key={href} href={href} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "#0C0C10", textDecoration: "none", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", background: "rgba(249,115,22,0.12)", color: "#F97316", letterSpacing: "1px", whiteSpace: "nowrap" }}>{tag}</span>
                  <span style={{ fontSize: 13, color: "rgba(240,235,224,0.7)" }}>{label}</span>
                </div>
                <span style={{ color: "rgba(249,115,22,0.6)", fontSize: 12, flexShrink: 0 }}>Lire →</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Séparateur */}
        <div style={{ borderTop: "1px solid rgba(240,235,224,0.08)", margin: "56px 0 40px" }} />

        {/* CTA */}
        <div>
          <p style={{ fontSize: ".9rem", color: "rgba(240,235,224,0.4)", marginBottom: 24 }}>
            Envie de tester les simulateurs ?
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <Link href="/lmnp" style={{
              padding: "12px 24px", background: "#F97316", color: "#0C0C10",
              fontWeight: 700, fontSize: 13, textDecoration: "none", letterSpacing: ".02em",
            }}>
              Simulateur LMNP
            </Link>
            <Link href="/rp" style={{
              padding: "12px 24px", border: "1px solid rgba(240,235,224,0.2)", color: "#F0EBE0",
              fontWeight: 600, fontSize: 13, textDecoration: "none",
            }}>
              Résidence Principale
            </Link>
            <Link href="/blog" style={{
              padding: "12px 24px", border: "1px solid rgba(240,235,224,0.12)", color: "rgba(240,235,224,0.5)",
              fontWeight: 500, fontSize: 13, textDecoration: "none",
            }}>
              Blog
            </Link>
          </div>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid rgba(240,235,224,0.08)", padding: "32px 48px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LogoMark />
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(240,235,224,0.5)" }}>
            Immo<span style={{ color: "#F97316" }}>Verdict</span>
          </span>
        </div>
        <p style={{ fontSize: 12, color: "rgba(240,235,224,0.25)" }}>
          © {new Date().getFullYear()} ImmoVerdict —{" "}
          <Link href="/mentions-legales" style={{ color: "rgba(249,115,22,0.6)", textDecoration: "none" }}>Mentions légales</Link>
        </p>
      </footer>
    </div>
  );
}
