"use client";

export default function MentionsLegales() {
  return (
    <main style={{ background:"#060612", minHeight:"100vh", color:"rgba(248,250,252,0.85)", fontFamily:"Inter,sans-serif", padding:"0 0 60px" }}>
      {/* Nav simple */}
      <nav style={{ padding:"16px 24px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <a href="/" style={{ display:"flex", alignItems:"center", gap:10, textDecoration:"none" }}>
          <span style={{ width:32, height:32, borderRadius:8, background:"linear-gradient(135deg,#7C3AED,#2563EB)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🏠</span>
          <span style={{ fontWeight:800, fontSize:16, color:"#fff" }}>Immo<span style={{ color:"#A78BFA" }}>Pilote</span></span>
        </a>
        <a href="/" style={{ fontSize:13, color:"rgba(255,255,255,0.5)", textDecoration:"none" }}>← Retour</a>
      </nav>

      <div style={{ maxWidth:720, margin:"0 auto", padding:"48px 24px" }}>
        <h1 style={{ fontSize:28, fontWeight:800, color:"#fff", marginBottom:8 }}>Mentions légales</h1>
        <p style={{ fontSize:13, color:"rgba(255,255,255,0.4)", marginBottom:40 }}>Dernière mise à jour : avril 2026</p>

        {/* Éditeur */}
        <Section title="1. Éditeur du site">
          <p>Le site <strong>ImmoVerdict</strong> (simulateur-lmnp-v2.vercel.app) est édité à titre personnel.</p>
          <p style={{ marginTop:8 }}><strong>Responsable de publication :</strong> Alex Ulve — aulve39@gmail.com</p>
          <p style={{ marginTop:4 }}><strong>Statut :</strong> Particulier (site gratuit, sans activité commerciale principale)</p>
        </Section>

        {/* Hébergeur */}
        <Section title="2. Hébergeur">
          <p><strong>Vercel Inc.</strong></p>
          <p>440 N Barranca Ave #4133, Covina, CA 91723 — États-Unis</p>
          <p><a href="https://vercel.com" style={{ color:"#A78BFA" }}>https://vercel.com</a></p>
        </Section>

        {/* Nature du service */}
        <Section title="3. Nature du service">
          <p>ImmoVerdict est un outil de simulation immobilière <strong>gratuit</strong> destiné à aider les investisseurs et primo-accédants à estimer la rentabilité de leurs projets.</p>
          <p style={{ marginTop:8 }}>Les simulations fournies sont <strong>purement indicatives</strong> et ne constituent en aucun cas un conseil fiscal, comptable, juridique ou financier. Elles ne remplacent pas l'avis d'un expert-comptable, d'un notaire ou d'un conseiller en gestion de patrimoine.</p>
          <p style={{ marginTop:8 }}>L'éditeur décline toute responsabilité quant aux décisions d'investissement prises sur la base des simulations affichées.</p>
        </Section>

        {/* RGPD */}
        <Section title="4. Politique de confidentialité (RGPD)">
          <SubSection title="4.1 Responsable du traitement">
            <p>Alex Ulve — aulve39@gmail.com</p>
          </SubSection>
          <SubSection title="4.2 Données collectées">
            <p>Lorsque vous soumettez votre adresse email via les formulaires de simulation, les données suivantes sont collectées :</p>
            <ul style={{ marginTop:8, paddingLeft:20, lineHeight:2 }}>
              <li>Adresse email (obligatoire)</li>
              <li>Prénom (optionnel)</li>
              <li>Paramètres de simulation (prix, loyer, régime fiscal…)</li>
              <li>Date et heure de la soumission</li>
            </ul>
          </SubSection>
          <SubSection title="4.3 Finalité du traitement">
            <ul style={{ paddingLeft:20, lineHeight:2 }}>
              <li>Envoi du rapport de simulation personnalisé</li>
              <li>Communications informatives sur les outils ImmoVerdict</li>
              <li>Mise en relation avec des partenaires (courtiers, experts-comptables) <strong>uniquement si vous y avez consenti</strong></li>
            </ul>
          </SubSection>
          <SubSection title="4.4 Base légale">
            <p>Le traitement est fondé sur votre <strong>consentement explicite</strong> (case à cocher lors de la soumission), conformément à l'article 6(1)(a) du RGPD.</p>
          </SubSection>
          <SubSection title="4.5 Durée de conservation">
            <p>Les données sont conservées pendant <strong>3 ans</strong> à compter de votre dernière interaction, puis supprimées ou anonymisées.</p>
          </SubSection>
          <SubSection title="4.6 Destinataires">
            <p>Vos données peuvent être transmises aux prestataires techniques suivants, dans le cadre strict de l'exécution du service :</p>
            <ul style={{ paddingLeft:20, lineHeight:2, marginTop:8 }}>
              <li><strong>Supabase</strong> (base de données) — <a href="https://supabase.com/privacy" style={{ color:"#A78BFA" }}>politique de confidentialité</a></li>
              <li><strong>Resend</strong> (envoi d'emails) — <a href="https://resend.com/privacy" style={{ color:"#A78BFA" }}>politique de confidentialité</a></li>
              <li><strong>Vercel</strong> (hébergement) — <a href="https://vercel.com/legal/privacy-policy" style={{ color:"#A78BFA" }}>politique de confidentialité</a></li>
            </ul>
            <p style={{ marginTop:8 }}>Ces prestataires agissent en qualité de sous-traitants et ne sont pas autorisés à utiliser vos données à leurs propres fins.</p>
          </SubSection>
          <SubSection title="4.7 Vos droits">
            <p>Conformément au RGPD et à la loi Informatique et Libertés, vous disposez des droits suivants :</p>
            <ul style={{ paddingLeft:20, lineHeight:2, marginTop:8 }}>
              <li><strong>Droit d'accès</strong> : obtenir une copie de vos données</li>
              <li><strong>Droit de rectification</strong> : corriger vos données inexactes</li>
              <li><strong>Droit à l'effacement</strong> : demander la suppression de vos données</li>
              <li><strong>Droit d'opposition</strong> : vous opposer au traitement à des fins marketing</li>
              <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré</li>
              <li><strong>Droit de retrait du consentement</strong> : à tout moment, sans que cela affecte la licéité des traitements antérieurs</li>
            </ul>
            <p style={{ marginTop:12 }}>Pour exercer ces droits, contactez : <strong>aulve39@gmail.com</strong></p>
            <p style={{ marginTop:8 }}>Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la <strong>CNIL</strong> : <a href="https://www.cnil.fr" style={{ color:"#A78BFA" }}>www.cnil.fr</a></p>
          </SubSection>
          <SubSection title="4.8 Cookies et stockage local">
            <p>ImmoVerdict n'utilise pas de cookies publicitaires ou de traceurs tiers. Le site utilise uniquement le <strong>localStorage</strong> du navigateur pour mémoriser votre adresse email entre les pages de simulation. Cette donnée reste sur votre appareil et n'est pas transmise sans votre action.</p>
          </SubSection>
        </Section>

        {/* Liens affiliés */}
        <Section title="5. Liens partenaires (affiliation)">
          <p>Certains liens présents sur ImmoVerdict (vers Pretto, MeilleurTaux, CAFPI, compta-lmnp.fr) sont des <strong>liens de partenariat</strong>. Si vous cliquez et souscrivez un service, ImmoVerdict peut percevoir une commission sans surcoût pour vous.</p>
          <p style={{ marginTop:8 }}>Cette relation commerciale n'influence pas l'indépendance des simulations ou des comparaisons affichées.</p>
        </Section>

        {/* Propriété intellectuelle */}
        <Section title="6. Propriété intellectuelle">
          <p>Le code source, les textes, les graphiques et l'ensemble des contenus d'ImmoVerdict sont la propriété de l'éditeur. Toute reproduction, même partielle, est interdite sans autorisation écrite préalable.</p>
        </Section>

        {/* Contact */}
        <Section title="7. Contact">
          <p>Pour toute question relative au site ou à vos données personnelles :</p>
          <p style={{ marginTop:8 }}><strong>Email :</strong> aulve39@gmail.com</p>
        </Section>

      </div>
    </main>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom:36 }}>
      <h2 style={{ fontSize:17, fontWeight:700, color:"#fff", marginBottom:12, paddingBottom:8, borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
        {title}
      </h2>
      <div style={{ fontSize:14, lineHeight:1.75, color:"rgba(248,250,252,0.7)" }}>
        {children}
      </div>
    </div>
  );
}

function SubSection({ title, children }) {
  return (
    <div style={{ marginTop:16 }}>
      <h3 style={{ fontSize:13, fontWeight:600, color:"rgba(167,139,250,0.9)", marginBottom:6 }}>{title}</h3>
      <div style={{ fontSize:13, lineHeight:1.75, color:"rgba(248,250,252,0.65)" }}>
        {children}
      </div>
    </div>
  );
}
