import { NextResponse } from "next/server";
import { createClient }  from "@supabase/supabase-js";

/* ─── Clients ────────────────────────────────────────────── */
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM    = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
const CRON_SECRET    = process.env.CRON_SECRET;

/* ─── Helpers ────────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
    .format(n ?? 0);

/** Fenêtre ±1 jour autour de J+N pour absorber les légers décalages du cron */
function windowISO(daysAgo) {
  const lo = new Date(); lo.setDate(lo.getDate() - daysAgo - 1); lo.setHours(23, 59, 59, 0);
  const hi = new Date(); hi.setDate(hi.getDate() - daysAgo + 1); hi.setHours(0, 0, 0, 0);
  return { lo: lo.toISOString(), hi: hi.toISOString() };
}

const FOOTER = (email) => `
<tr><td style="background:#F8FAFC;border-radius:0 0 16px 16px;padding:16px 28px;text-align:center;border-top:1px solid #E2E8F0;">
  <p style="font-size:11px;color:#94A3B8;margin:0;">
    ImmoVerdict · <a href="https://immoverdict.com" style="color:#94A3B8;">immoverdict.com</a><br>
    Vous recevez cet email car vous avez utilisé notre simulateur LMNP gratuit.<br>
    <a href="https://immoverdict.com/api/unsubscribe?email=${encodeURIComponent(email || '')}" style="color:#94A3B8;">Se désabonner</a>
  </p>
</td></tr>`;

/* ═══════════════════════════════════════════════════════════
   J+3 — "Vos 3 chiffres clés décryptés"
   Relance douce : expliquer TRI, cash-flow et bouclier fiscal
════════════════════════════════════════════════════════════ */
function buildJ3HTML(nom, tri, cashflowM, prix, email) {
  const prenom = nom || "Investisseur";
  const cfStr  = cashflowM != null ? `${cashflowM >= 0 ? "+" : ""}${cashflowM}€/mois` : "—";
  const triOk  = (tri ?? 0) >= 5;

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vos 3 chiffres LMNP décryptés</title></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#0F172A,#312E81);border-radius:16px 16px 0 0;padding:28px;text-align:center;">
  <div style="font-size:36px;margin-bottom:8px;">📊</div>
  <h1 style="color:white;margin:0 0 4px;font-size:20px;font-weight:800;">Vos 3 chiffres LMNP décryptés</h1>
  <p style="color:#A5B4FC;margin:0;font-size:12px;">Guide pédagogique · ImmoVerdict</p>
</td></tr>

<!-- Body -->
<tr><td style="background:white;padding:28px;">
  <p style="color:#0F172A;font-size:15px;font-weight:700;margin:0 0 4px;">Bonjour ${prenom},</p>
  <p style="color:#64748B;font-size:13px;line-height:1.7;margin:0 0 20px;">
    Vous avez simulé un bien à <strong>${fmt(prix)}</strong> il y a 3 jours.
    Votre simulation affichait un <strong>TRI de ${tri ?? "—"}%</strong> et un <strong>cash-flow de ${cfStr}</strong>.
    Voici ce que ces chiffres signifient concrètement.
  </p>

  <!-- TRI -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;margin-bottom:12px;">
  <tr><td style="padding:16px 20px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
      <span style="font-size:20px;">${triOk ? "🟢" : "🟡"}</span>
      <span style="font-size:14px;font-weight:700;color:#1E40AF;">TRI = ${tri ?? "—"}% · ${triOk ? "Au-dessus du seuil recommandé" : "Sous le seuil recommandé de 5%"}</span>
    </div>
    <div style="font-size:12px;color:#1E3A5F;line-height:1.8;">
      Le <strong>Taux de Rendement Interne</strong> prend en compte <em>tout</em> : loyers encaissés,
      charges payées, impôts, remboursement du crédit et plus-value à la revente.
      C'est votre vrai rendement, comme un taux d'intérêt mais sur l'ensemble de l'investissement.<br><br>
      <strong>Repères :</strong> TRI &lt; 4% = prudence · 4–6% = correct · &gt; 6% = excellent.
    </div>
  </td></tr>
  </table>

  <!-- Cash-flow -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0FDF4;border:1px solid #A7F3D0;border-radius:12px;margin-bottom:12px;">
  <tr><td style="padding:16px 20px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
      <span style="font-size:20px;">${(cashflowM ?? 0) >= 0 ? "💚" : "🔴"}</span>
      <span style="font-size:14px;font-weight:700;color:#065F46;">Cash-flow = ${cfStr} · ${(cashflowM ?? 0) >= 0 ? "Autofinancé !" : "Effort mensuel"}</span>
    </div>
    <div style="font-size:12px;color:#064E3B;line-height:1.8;">
      Le <strong>cash-flow mensuel</strong> c'est ce que vous gagnez ou perdez chaque mois après avoir
      tout payé : mensualité crédit, taxe foncière, charges, assurance, impôt.
      Un cash-flow négatif ne signifie pas que l'investissement est mauvais — l'enrichissement
      passe aussi par le remboursement du capital et la plus-value future.
    </div>
  </td></tr>
  </table>

  <!-- Bouclier fiscal -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;margin-bottom:24px;">
  <tr><td style="padding:16px 20px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
      <span style="font-size:20px;">🛡️</span>
      <span style="font-size:14px;font-weight:700;color:#92400E;">Le "bouclier fiscal" — votre super-pouvoir LMNP</span>
    </div>
    <div style="font-size:12px;color:#78350F;line-height:1.8;">
      En LMNP Réel, les <strong>amortissements</strong> permettent de déduire chaque année une part
      de la valeur du bien (sans sortie d'argent !). Résultat : votre revenu imposable tombe à zéro,
      et <strong>vous ne payez aucun impôt sur vos loyers</strong> pendant 10 à 15 ans en moyenne.
      C'est ça, le bouclier fiscal.
    </div>
  </td></tr>
  </table>

  <!-- CTA -->
  <table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center">
    <a href="https://immoverdict.com/lmnp?utm_source=email&utm_medium=j3&utm_campaign=decouvrir" style="display:inline-block;background:linear-gradient(135deg,#F97316,#EA580C);color:white;font-size:14px;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;">
      🔄 Affiner ma simulation →
    </a>
    <p style="font-size:11px;color:#94A3B8;margin-top:12px;">Modifiez l'apport, le taux ou la durée — vos chiffres se recalculent en temps réel.</p>
  </td></tr>
  </table>

</td></tr>
${FOOTER(email)}
</table>
</td></tr></table>
</body></html>`;
}

/* ═══════════════════════════════════════════════════════════
   J+7 — "Cas concret : T2 Lyon, 195k€, +158€/mois"
   Email éducatif avec simulation réelle anonymisée
════════════════════════════════════════════════════════════ */
function buildJ7HTML(nom, tri, cashflowM, prix, email) {
  const prenom = nom || "Investisseur";

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cas concret LMNP — T2 Lyon</title></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#0F172A,#065F46);border-radius:16px 16px 0 0;padding:28px;text-align:center;">
  <div style="font-size:36px;margin-bottom:8px;">🏡</div>
  <h1 style="color:white;margin:0 0 4px;font-size:20px;font-weight:800;">Cas concret : T2 Lyon · +158€/mois</h1>
  <p style="color:#6EE7B7;margin:0;font-size:12px;">Étude de cas réelle · ImmoVerdict</p>
</td></tr>

<!-- Body -->
<tr><td style="background:white;padding:28px;">
  <p style="color:#0F172A;font-size:15px;font-weight:700;margin:0 0 4px;">Bonjour ${prenom},</p>
  <p style="color:#64748B;font-size:13px;line-height:1.7;margin:0 0 20px;">
    Il y a une semaine, vous simuliez un investissement LMNP.
    Voici un cas réel anonymisé pour vous donner un point de comparaison concret.
  </p>

  <!-- Fiche bien -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0FDF4;border:1px solid #A7F3D0;border-radius:12px;margin-bottom:16px;">
  <tr><td style="padding:18px 20px;">
    <div style="font-size:14px;font-weight:700;color:#065F46;margin-bottom:12px;">📋 Le bien</div>
    ${[
      ["Type", "T2 meublé — 38m² — Lyon 7ème"],
      ["Prix d'achat", "195 000 € (dont 15 000 € travaux + mobilier)"],
      ["Frais de notaire", "15 800 € (ancien)"],
      ["Apport", "35 000 €"],
      ["Crédit", "175 800 € sur 20 ans à 3,55%"],
    ].map(([k, v]) => `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:6px;">
    <tr>
      <td width="130" style="font-size:12px;color:#64748B;">${k}</td>
      <td style="font-size:12px;font-weight:600;color:#0F172A;">${v}</td>
    </tr>
    </table>`).join("")}
  </td></tr>
  </table>

  <!-- Résultats comparés -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
  <tr>
    <td width="48%" style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:14px 16px;vertical-align:top;">
      <div style="font-size:12px;font-weight:700;color:#DC2626;margin-bottom:8px;">❌ Micro-BIC</div>
      ${[
        ["Loyer brut", "780 €/mois"],
        ["Imposition", "585 € × 30% TMI = +175 €"],
        ["Cash-flow", "−47 €/mois"],
        ["TRI 20 ans", "3,8 %"],
      ].map(([k, v]) => `<div style="font-size:11px;color:#7F1D1D;margin-bottom:4px;"><strong>${k} :</strong> ${v}</div>`).join("")}
    </td>
    <td width="4%"></td>
    <td width="48%" style="background:#F0FDF4;border:2px solid #34D399;border-radius:12px;padding:14px 16px;vertical-align:top;">
      <div style="font-size:12px;font-weight:700;color:#065F46;margin-bottom:8px;">✅ LMNP Réel</div>
      ${[
        ["Loyer brut", "780 €/mois"],
        ["Imposition", "0 € (bouclier fiscal)"],
        ["Cash-flow", "+158 €/mois"],
        ["TRI 20 ans", "6,4 %"],
      ].map(([k, v]) => `<div style="font-size:11px;color:#064E3B;margin-bottom:4px;"><strong>${k} :</strong> ${v}</div>`).join("")}
    </td>
  </tr>
  </table>

  <!-- Conclusion -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;margin-bottom:20px;">
  <tr><td style="padding:16px 20px;">
    <div style="font-size:13px;font-weight:700;color:#1E40AF;margin-bottom:8px;">💡 Ce que ce cas nous enseigne</div>
    <div style="font-size:12px;color:#1E3A5F;line-height:1.8;">
      Le passage du Micro-BIC au Réel transforme un bien <strong>légèrement déficitaire</strong>
      en un bien <strong>rentable</strong> — sans changer le loyer ni le prix.
      La différence vient uniquement du traitement fiscal : <strong>205 €/mois</strong>
      d'économie d'impôt grâce aux amortissements sur 20 ans.<br><br>
      Sur l'ensemble du crédit, c'est <strong>49 200 €</strong> d'impôts économisés.
    </div>
  </td></tr>
  </table>

  <!-- CTA -->
  <table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center">
    <a href="https://immoverdict.com/lmnp?utm_source=email&utm_medium=j7&utm_campaign=cas-concret" style="display:inline-block;background:linear-gradient(135deg,#F97316,#EA580C);color:white;font-size:14px;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;">
      📊 Simuler mon bien avec le Réel →
    </a>
    <p style="font-size:11px;color:#94A3B8;margin-top:12px;">Entrez l'adresse de votre bien et comparez automatiquement les 4 régimes.</p>
  </td></tr>
  </table>

</td></tr>
${FOOTER(email)}
</table>
</td></tr></table>
</body></html>`;
}

/* ═══════════════════════════════════════════════════════════
   J+14 — "Le LMNP Réel expliqué" (inchangé)
════════════════════════════════════════════════════════════ */
function buildJ14HTML(nom, tri, cashflowM, prix, email) {
  const prenom = nom || "Investisseur";
  const cfStr  = cashflowM != null ? `${cashflowM >= 0 ? "+" : ""}${cashflowM}€/mois` : "—";
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Optimisez votre LMNP</title></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#0F172A,#185FA5);border-radius:16px 16px 0 0;padding:28px;text-align:center;">
  <div style="font-size:36px;margin-bottom:8px;">💡</div>
  <h1 style="color:white;margin:0 0 4px;font-size:20px;font-weight:800;">Le LMNP Réel expliqué</h1>
  <p style="color:#93C5FD;margin:0;font-size:12px;">Conseils fiscaux · ImmoVerdict</p>
</td></tr>

<!-- Body -->
<tr><td style="background:white;padding:28px;">
  <p style="color:#0F172A;font-size:15px;font-weight:700;margin:0 0 4px;">Bonjour ${prenom},</p>
  <p style="color:#64748B;font-size:13px;line-height:1.7;margin:0 0 20px;">
    Il y a 2 semaines, vous avez simulé un bien à <strong>${fmt(prix)}</strong> avec un
    cash-flow estimé de <strong>${cfStr}</strong> et un TRI de <strong>${tri ?? "—"}%</strong>.
    Voici ce que vous devez savoir pour passer à l'acte avec sérénité.
  </p>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;margin-bottom:16px;">
  <tr><td style="padding:18px 20px;">
    <div style="font-size:14px;font-weight:700;color:#1E40AF;margin-bottom:10px;">🥇 Pourquoi le Régime Réel LMNP est (presque) toujours gagnant</div>
    <div style="font-size:12px;color:#1E3A5F;line-height:1.8;">
      En LMNP Réel, vous déduisez de votre revenu imposable :<br>
      → Les <strong>intérêts d'emprunt</strong> et assurance crédit<br>
      → La <strong>taxe foncière</strong>, charges de copro, CFE<br>
      → L'<strong>amortissement par composants</strong> : gros œuvre (50 ans), toiture (25 ans), équipements (15 ans), mobilier (7 ans)<br><br>
      Résultat : <strong>impôt = 0€</strong> pendant 10 à 15 ans dans la majorité des cas.
    </div>
  </td></tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0FDF4;border:1px solid #A7F3D0;border-radius:12px;margin-bottom:16px;">
  <tr><td style="padding:18px 20px;">
    <div style="font-size:14px;font-weight:700;color:#065F46;margin-bottom:10px;">📋 Les 3 démarches à anticiper AVANT la signature</div>
    <div style="font-size:12px;color:#064E3B;line-height:1.8;">
      <strong>1. Choisir votre régime au moment de la déclaration</strong> — la première déclaration détermine votre option fiscale.<br><br>
      <strong>2. Ouvrir un compte bancaire dédié</strong> — séparation patrimoine pro/perso recommandée.<br><br>
      <strong>3. Contacter un expert-comptable spécialisé</strong> — honoraires ~800-1 200€/an, souvent récupérés dès la première année.
    </div>
  </td></tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;margin-bottom:24px;">
  <tr><td style="padding:18px 20px;">
    <div style="font-size:14px;font-weight:700;color:#92400E;margin-bottom:10px;">⚠️ Le piège à éviter : la requalification en LMP</div>
    <div style="font-size:12px;color:#78350F;line-height:1.7;">
      Si vos <strong>recettes locatives dépassent 23 000€/an ET 50% de vos revenus</strong>,
      vous basculez en LMP — régime différent avec cotisations sociales. Anticipez ce seuil.
    </div>
  </td></tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center">
    <a href="https://immoverdict.com/lmnp?utm_source=email&utm_medium=j14&utm_campaign=relancer" style="display:inline-block;background:linear-gradient(135deg,#F97316,#EA580C);color:white;font-size:14px;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;">
      🔄 Relancer ma simulation →
    </a>
  </td></tr>
  </table>

</td></tr>
${FOOTER(email)}
</table>
</td></tr></table>
</body></html>`;
}

/* ═══════════════════════════════════════════════════════════
   J+30 — "Votre projet — où en êtes-vous ?" (inchangé)
════════════════════════════════════════════════════════════ */
function buildJ30HTML(nom, tri, cashflowM, prix, email) {
  const prenom = nom || "Investisseur";
  const cfStr  = cashflowM != null ? `${cashflowM >= 0 ? "+" : ""}${cashflowM}€/mois` : "—";
  const verdictLabel = (tri ?? 0) >= 6 ? "excellent" : (tri ?? 0) >= 4 ? "acceptable" : "à surveiller";
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Votre projet LMNP — où en êtes-vous ?</title></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#0F172A,#1E3A5F);border-radius:16px 16px 0 0;padding:28px;text-align:center;">
  <div style="font-size:36px;margin-bottom:8px;">🎯</div>
  <h1 style="color:white;margin:0 0 4px;font-size:20px;font-weight:800;">Votre projet LMNP — 30 jours après</h1>
  <p style="color:#93C5FD;margin:0;font-size:12px;">Bilan et ressources · ImmoVerdict</p>
</td></tr>

<!-- Body -->
<tr><td style="background:white;padding:28px;">
  <p style="color:#0F172A;font-size:15px;font-weight:700;margin:0 0 4px;">Bonjour ${prenom},</p>
  <p style="color:#64748B;font-size:13px;line-height:1.7;margin:0 0 20px;">
    Il y a un mois, votre simulation montrait un TRI de <strong>${tri ?? "—"}%</strong>
    (${verdictLabel}) et un cash-flow de <strong>${cfStr}</strong> pour un bien à <strong>${fmt(prix)}</strong>.
    Votre projet a-t-il avancé ? Voici les ressources pour franchir la prochaine étape.
  </p>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;margin-bottom:16px;">
  <tr><td style="padding:18px 20px;">
    <div style="font-size:14px;font-weight:700;color:#0F172A;margin-bottom:12px;">✅ Checklist avant signature compromis</div>
    ${[
      ["Simulation mise à jour avec les frais réels de notaire","Si neuf : ~2.5%, si ancien : ~8%"],
      ["Étude de financement avec un courtier","Négocier 0.2% de moins = des milliers d'euros"],
      ["Expert-comptable LMNP identifié","Clé du dossier fiscal — devis gratuit"],
      ["Vérification DPE du bien","Logement F/G : risque d'interdiction de location d'ici 2028"],
      ["Clause LMNP dans le compromis","Mention explicite de la destination meublée"],
    ].map(([label, sub]) => `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
    <tr valign="top">
      <td width="24" style="font-size:16px;padding-top:1px;">☐</td>
      <td>
        <div style="font-size:12px;font-weight:600;color:#0F172A;">${label}</div>
        <div style="font-size:11px;color:#64748B;">${sub}</div>
      </td>
    </tr>
    </table>`).join("")}
  </td></tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding-top:8px;">
    <a href="https://immoverdict.com/lmnp?utm_source=email&utm_medium=j30&utm_campaign=resimulate" style="display:inline-block;background:linear-gradient(135deg,#F97316,#EA580C);color:white;font-size:14px;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;">
      📊 Affiner ma simulation →
    </a>
  </td></tr>
  </table>

</td></tr>
${FOOTER(email)}
</table>
</td></tr></table>
</body></html>`;
}

/* ─── Envoi Resend ───────────────────────────────────────── */
async function sendEmail({ to, subject, html }) {
  const res = await fetch("https://api.resend.com/emails", {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from:    `ImmoVerdict <${RESEND_FROM}>`,
      to:      [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend ${res.status}: ${text}`);
  }
  return res.json();
}

/* ─── Handler GET /api/cron/email-sequence ───────────────── */
export async function GET(request) {
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!RESEND_API_KEY) {
    return NextResponse.json({ skipped: true, reason: "RESEND_API_KEY not set" });
  }

  const results = {
    j3:  { sent: 0, errors: [] },
    j7:  { sent: 0, errors: [] },
    j14: { sent: 0, errors: [] },
    j30: { sent: 0, errors: [] },
  };

  /* ── J+3 ──────────────────────────────────────────────── */
  const w3 = windowISO(3);
  const { data: leads3, error: err3 } = await sb
    .from("leads")
    .select("email, nom, params, tri, cashflow_m")
    .gt("created_at", w3.lo)
    .lt("created_at", w3.hi)
    .is("emailed_j3", null);

  if (err3) {
    results.j3.errors.push(err3.message);
  } else if (leads3?.length) {
    for (const lead of leads3) {
      try {
        await sendEmail({
          to:      lead.email,
          subject: `📊 Vos 3 chiffres LMNP décryptés — TRI, cash-flow, bouclier fiscal`,
          html:    buildJ3HTML(lead.nom, lead.tri, lead.cashflow_m, lead.params?.prix, lead.email),
        });
        await sb.from("leads").update({ emailed_j3: new Date().toISOString() }).eq("email", lead.email);
        results.j3.sent++;
      } catch (e) {
        results.j3.errors.push(`${lead.email}: ${e.message}`);
      }
    }
  }

  /* ── J+7 ──────────────────────────────────────────────── */
  const w7 = windowISO(7);
  const { data: leads7, error: err7 } = await sb
    .from("leads")
    .select("email, nom, params, tri, cashflow_m")
    .gt("created_at", w7.lo)
    .lt("created_at", w7.hi)
    .is("emailed_j7", null);

  if (err7) {
    results.j7.errors.push(err7.message);
  } else if (leads7?.length) {
    for (const lead of leads7) {
      try {
        await sendEmail({
          to:      lead.email,
          subject: `🏡 Cas concret LMNP : T2 Lyon, 195k€ — voici les vrais chiffres`,
          html:    buildJ7HTML(lead.nom, lead.tri, lead.cashflow_m, lead.params?.prix, lead.email),
        });
        await sb.from("leads").update({ emailed_j7: new Date().toISOString() }).eq("email", lead.email);
        results.j7.sent++;
      } catch (e) {
        results.j7.errors.push(`${lead.email}: ${e.message}`);
      }
    }
  }

  /* ── J+14 ─────────────────────────────────────────────── */
  const w14 = windowISO(14);
  const { data: leads14, error: err14 } = await sb
    .from("leads")
    .select("email, nom, params, tri, cashflow_m")
    .gt("created_at", w14.lo)
    .lt("created_at", w14.hi)
    .is("emailed_j14", null);

  if (err14) {
    results.j14.errors.push(err14.message);
  } else if (leads14?.length) {
    for (const lead of leads14) {
      try {
        await sendEmail({
          to:      lead.email,
          subject: `💡 Optimisez votre LMNP — 3 erreurs à éviter`,
          html:    buildJ14HTML(lead.nom, lead.tri, lead.cashflow_m, lead.params?.prix, lead.email),
        });
        await sb.from("leads").update({ emailed_j14: new Date().toISOString() }).eq("email", lead.email);
        results.j14.sent++;
      } catch (e) {
        results.j14.errors.push(`${lead.email}: ${e.message}`);
      }
    }
  }

  /* ── J+30 ─────────────────────────────────────────────── */
  const w30 = windowISO(30);
  const { data: leads30, error: err30 } = await sb
    .from("leads")
    .select("email, nom, params, tri, cashflow_m")
    .gt("created_at", w30.lo)
    .lt("created_at", w30.hi)
    .is("emailed_j30", null);

  if (err30) {
    results.j30.errors.push(err30.message);
  } else if (leads30?.length) {
    for (const lead of leads30) {
      try {
        await sendEmail({
          to:      lead.email,
          subject: `🎯 Votre projet LMNP — où en êtes-vous ?`,
          html:    buildJ30HTML(lead.nom, lead.tri, lead.cashflow_m, lead.params?.prix, lead.email),
        });
        await sb.from("leads").update({ emailed_j30: new Date().toISOString() }).eq("email", lead.email);
        results.j30.sent++;
      } catch (e) {
        results.j30.errors.push(`${lead.email}: ${e.message}`);
      }
    }
  }

  console.log("[cron/email-sequence]", JSON.stringify(results));
  return NextResponse.json({ ok: true, results });
}
