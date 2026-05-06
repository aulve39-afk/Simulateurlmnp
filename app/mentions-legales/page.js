"use client";
import Link from "next/link";

const LogoMark = () => (
  <svg width="28" height="28" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{flexShrink:0}}>
    <rect x="0" y="0" width="30" height="3" fill="#F97316"/>
    <rect x="0" y="3" width="12" height="27" fill="#F0EBE0"/>
    <rect x="18" y="3" width="12" height="18" fill="#F0EBE0"/>
  </svg>
);

const S = {
  page: { background:"#0C0C10", minHeight:"100vh", color:"#F0EBE0", fontFamily:"'DM Sans',system-ui,sans-serif" },
  nav: { borderBottom:"1px solid rgba(240,235,224,0.08)", padding:"0 48px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(12,12,16,0.95)", position:"sticky", top:0, zIndex:50, backdropFilter:"blur(20px)" },
  navLogo: { display:"flex", alignItems:"center", gap:12, textDecoration:"none" },
  navBack: { fontSize:12, color:"rgba(249,115,22,0.7)", textDecoration:"none", letterSpacing:".5px" },
  wrap: { maxWidth:720, margin:"0 auto", padding:"56px 48px 96px" },
  h1: { fontFamily:"'DM Serif Display',Georgia,serif", fontSize:"2.2rem", fontWeight:400, color:"#F0EBE0", marginBottom:8 },
  updated: { fontSize:12, color:"rgba(240,235,224,0.3)", marginBottom:48, letterSpacing:".5px" },
  section: { marginBottom:40 },
  sectionTitle: { fontSize:15, fontWeight:700, color:"#F0EBE0", marginBottom:14, paddingBottom:12, borderBottom:"1px solid rgba(240,235,224,0.08)", letterSpacing:"-.1px" },
  sectionBody: { fontSize:14, lineHeight:1.8, color:"rgba(240,235,224,0.6)" },
  subTitle: { fontSize:12, fontWeight:700, color:"#F97316", letterSpacing:"1.5px", textTransform:"uppercase", marginTop:20, marginBottom:8 },
  subBody: { fontSize:13, lineHeight:1.8, color:"rgba(240,235,224,0.55)" },
  ul: { paddingLeft:20, lineHeight:2.1, marginTop:8 },
  link: { color:"rgba(249,115,22,0.8)", textDecoration:"none" },
  footer: { borderTop:"1px solid rgba(240,235,224,0.08)", padding:"28px 48px", display:"flex", alignItems:"center", justifyContent:"space-between" },
};

export default function MentionsLegales() {
  return (
    <div style={S.page}>
      {/* ── NAV ── */}
      <nav style={S.nav}>
        <Link href="/" style={S.navLogo}>
          <LogoMark />
          <span style={{ fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:15, color:"#F0EBE0" }}>
            Immo<span style={{ color:"#F97316" }}>Verdict</span>
          </span>
        </Link>
        <Link href="/" style={S.navBack}>← Retour</Link>
      </nav>

      {/* ── CONTENU ── */}
      <div style={S.wrap}>
        <h1 style={S.h1}>Mentions légales</h1>
        <p style={S.updated}>Dernière mise à jour : avril 2026</p>

        <Section title="1. Éditeur du site">
          <p>Le site <strong style={{color:"#F0EBE0"}}>ImmoVerdict</strong> (immoverdict.com) est édité à titre personnel.</p>
          <p style={{marginTop:8}}><strong style={{color:"#F0EBE0"}}>Responsable de publication :</strong> Alex Ulve — aulve39@gmail.com</p>
          <p style={{marginTop:4}}><strong style={{color:"#F0EBE0"}}>Statut :</strong> Particulier (site gratuit, sans activité commerciale principale)</p>
        </Section>

        <Section title="2. Hébergeur">
          <p><strong style={{color:"#F0EBE0"}}>Vercel Inc.</strong></p>
          <p>440 N Barranca Ave #4133, Covina, CA 91723 — États-Unis</p>
          <p><a href="https://vercel.com" style={S.link}>https://vercel.com</a></p>
        </Section>

        <Section title="3. Nature du service">
          <p>ImmoVerdict est un outil de simulation immobilière <strong style={{color:"#F0EBE0"}}>gratuit</strong> destiné à aider les investisseurs et primo-accédants à estimer la rentabilité de leurs projets.</p>
          <p style={{marginTop:8}}>Les simulations fournies sont <strong style={{color:"#F0EBE0"}}>purement indicatives</strong> et ne constituent en aucun cas un conseil fiscal, comptable, juridique ou financier. Elles ne remplacent pas l'avis d'un expert-comptable, d'un notaire ou d'un conseiller en gestion de patrimoine.</p>
          <p style={{marginTop:8}}>L'éditeur décline toute responsabilité quant aux décisions d'investissement prises sur la base des simulations affichées.</p>
        </Section>

        <Section title="4. Politique de confidentialité (RGPD)">
          <SubSection title="4.1 Responsable du traitement">
            <p>Alex Ulve — aulve39@gmail.com</p>
          </SubSection>
          <SubSection title="4.2 Données collectées">
            <p>Lorsque vous soumettez votre adresse email via les formulaires de simulation, les données suivantes sont collectées :</p>
            <ul style={S.ul}>
              <li>Adresse email (obligatoire)</li>
              <li>Prénom (optionnel)</li>
              <li>Paramètres de simulation (prix, loyer, régime fiscal…)</li>
              <li>Date et heure de la soumission</li>
            </ul>
          </SubSection>
          <SubSection title="4.3 Finalité du traitement">
            <ul style={S.ul}>
              <li>Envoi du rapport de simulation personnalisé</li>
              <li>Communications informatives sur les outils ImmoVerdict</li>
              <li>Mise en relation avec des partenaires (courtiers, experts-comptables) <strong style={{color:"#F0EBE0"}}>uniquement si vous y avez consenti</strong></li>
            </ul>
          </SubSection>
          <SubSection title="4.4 Base légale">
            <p>Le traitement est fondé sur votre <strong style={{color:"#F0EBE0"}}>consentement explicite</strong> (case à cocher lors de la soumission), conformément à l'article 6(1)(a) du RGPD.</p>
          </SubSection>
          <SubSection title="4.5 Durée de conservation">
            <p>Les données sont conservées pendant <strong style={{color:"#F0EBE0"}}>3 ans</strong> à compter de votre dernière interaction, puis supprimées ou anonymisées.</p>
          </SubSection>
          <SubSection title="4.6 Destinataires">
            <p>Vos données peuvent être transmises aux prestataires techniques suivants, dans le cadre strict de l'exécution du service :</p>
            <ul style={S.ul}>
              <li><strong style={{color:"#F0EBE0"}}>Supabase</strong> (base de données) — <a href="https://supabase.com/privacy" style={S.link}>politique de confidentialité</a></li>
              <li><strong style={{color:"#F0EBE0"}}>Resend</strong> (envoi d'emails) — <a href="https://resend.com/privacy" style={S.link}>politique de confidentialité</a></li>
              <li><strong style={{color:"#F0EBE0"}}>Vercel</strong> (hébergement) — <a href="https://vercel.com/legal/privacy-policy" style={S.link}>politique de confidentialité</a></li>
            </ul>
            <p style={{marginTop:8}}>Ces prestataires agissent en qualité de sous-traitants et ne sont pas autorisés à utiliser vos données à leurs propres fins.</p>
          </SubSection>
          <SubSection title="4.7 Vos droits">
            <p>Conformément au RGPD et à la loi Informatique et Libertés, vous disposez des droits suivants :</p>
            <ul style={S.ul}>
              <li><strong style={{color:"#F0EBE0"}}>Droit d'accès</strong> : obtenir une copie de vos données</li>
              <li><strong style={{color:"#F0EBE0"}}>Droit de rectification</strong> : corriger vos données inexactes</li>
              <li><strong style={{color:"#F0EBE0"}}>Droit à l'effacement</strong> : demander la suppression de vos données</li>
              <li><strong style={{color:"#F0EBE0"}}>Droit d'opposition</strong> : vous opposer au traitement à des fins marketing</li>
              <li><strong style={{color:"#F0EBE0"}}>Droit à la portabilité</strong> : recevoir vos données dans un format structuré</li>
              <li><strong style={{color:"#F0EBE0"}}>Droit de retrait du consentement</strong> : à tout moment, sans que cela affecte la licéité des traitements antérieurs</li>
            </ul>
            <p style={{marginTop:14}}>Pour exercer ces droits, contactez : <strong style={{color:"#F0EBE0"}}>aulve39@gmail.com</strong></p>
            <p style={{marginTop:8}}>Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la <strong style={{color:"#F0EBE0"}}>CNIL</strong> : <a href="https://www.cnil.fr" style={S.link}>www.cnil.fr</a></p>
          </SubSection>
          <SubSection title="4.8 Cookies et stockage local">
            <p>ImmoVerdict n'utilise pas de cookies publicitaires ou de traceurs tiers. Le site utilise uniquement le <strong style={{color:"#F0EBE0"}}>localStorage</strong> du navigateur pour mémoriser votre adresse email entre les pages de simulation. Cette donnée reste sur votre appareil et n'est pas transmise sans votre action.</p>
          </SubSection>
        </Section>

        <Section title="5. Liens partenaires (affiliation)">
          <p>Certains liens présents sur ImmoVerdict (vers Pretto, MeilleurTaux, CAFPI, compta-lmnp.fr) sont des <strong style={{color:"#F0EBE0"}}>liens de partenariat</strong>. Si vous cliquez et souscrivez un service, ImmoVerdict peut percevoir une commission sans surcoût pour vous.</p>
          <p style={{marginTop:8}}>Cette relation commerciale n'influence pas l'indépendance des simulations ou des comparaisons affichées.</p>
        </Section>

        <Section title="6. Propriété intellectuelle">
          <p>Le code source, les textes, les graphiques et l'ensemble des contenus d'ImmoVerdict sont la propriété de l'éditeur. Toute reproduction, même partielle, est interdite sans autorisation écrite préalable.</p>
        </Section>

        <Section title="7. Contact">
          <p>Pour toute question relative au site ou à vos données personnelles :</p>
          <p style={{marginTop:8}}><strong style={{color:"#F0EBE0"}}>Email :</strong> <a href="mailto:aulve39@gmail.com" style={S.link}>aulve39@gmail.com</a></p>
        </Section>
      </div>

      {/* ── FOOTER ── */}
      <footer style={S.footer}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <LogoMark />
          <span style={{fontSize:13,fontWeight:700,color:"rgba(240,235,224,0.5)"}}>
            Immo<span style={{color:"#F97316"}}>Verdict</span>
          </span>
        </div>
        <p style={{fontSize:12,color:"rgba(240,235,224,0.25)"}}>
          © {new Date().getFullYear()} ImmoVerdict
        </p>
      </footer>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom:44 }}>
      <h2 style={{ fontSize:15, fontWeight:700, color:"#F0EBE0", marginBottom:14, paddingBottom:12, borderBottom:"1px solid rgba(240,235,224,0.08)" }}>
        {title}
      </h2>
      <div style={{ fontSize:14, lineHeight:1.8, color:"rgba(240,235,224,0.6)" }}>
        {children}
      </div>
    </div>
  );
}

function SubSection({ title, children }) {
  return (
    <div style={{ marginTop:20 }}>
      <h3 style={{ fontSize:11, fontWeight:700, color:"#F97316", letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:8 }}>
        {title}
      </h3>
      <div style={{ fontSize:13, lineHeight:1.8, color:"rgba(240,235,224,0.55)" }}>
        {children}
      </div>
    </div>
  );
}
