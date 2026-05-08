import { NextResponse } from "next/server";
import { createClient }  from "@supabase/supabase-js";

/* ─── Clients ────────────────────────────────────────────── */
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""   // Service role — accès complet (côté serveur uniquement)
);
const RESEND_API_KEY   = process.env.RESEND_API_KEY;
const RESEND_FROM      = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
const CRON_SECRET      = process.env.CRON_SECRET;      // Optionnel — sécurité supplémentaire

/* ─── Helpers ────────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
    .format(n ?? 0);

/** Fenêtre de ±1 jour autour de J+N pour éviter les doublons si le cron est légèrement décalé */
function windowISO(daysAgo) {
  const lo = new Date(); lo.setDate(lo.getDate() - daysAgo - 1); lo.setHours(23, 59, 59, 0);
  const hi = new Date(); hi.setDate(hi.getDate() - daysAgo + 1); hi.setHours(0, 0, 0, 0);
  // lo < hi en timestamp — on renvoie lo < created_at < hi
  return { lo: lo.toISOString(), hi: hi.toISOString() };
}

/* ─── Templates email ────────────────────────────────────── */

function buildJ14HTML(nom, tri, cashflowM, prix) {
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

  <!-- Section 1 -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;margin-bottom:16px;">
  <tr><td style="padding:18px 20px;">
    <div style="font-size:14px;font-weight:700;color:#1E40AF;margin-bottom:10px;">🥇 Pourquoi le Régime Réel LMNP est (presque) toujours gagnant</div>
    <div style="font-size:12px;color:#1E3A5F;line-height:1.8;">
      En LMNP Réel, vous déduisez de votre revenu imposable :<br>
      → Les <strong>intérêts d'emprunt</strong> et assurance crédit<br>
      → La <strong>taxe foncière</strong>, charges de copro, CFE<br>
      → L'<strong>amortissement par composants</strong> : gros œuvre (50 ans), toiture (25 ans), équipements (15 ans), mobilier (7 ans)<br><br>
      Résultat : <strong>impôt = 0€</strong> pendant 10 à 15 ans dans la majorité des cas. Le "bouclier fiscal" est votre meilleur ami.
    </div>
  </td></tr>
  </table>

  <!-- Section 2 -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0FDF4;border:1px solid #A7F3D0;border-radius:12px;margin-bottom:16px;">
  <tr><td style="padding:18px 20px;">
    <div style="font-size:14px;font-weight:700;color:#065F46;margin-bottom:10px;">📋 Les 3 démarches à anticiper AVANT la signature</div>
    <div style="font-size:12px;color:#064E3B;line-height:1.8;">
      <strong>1. Choisir votre régime au moment de la déclaration</strong> — la première déclaration de revenus locatifs détermine votre option fiscale.<br><br>
      <strong>2. Ouvrir un compte bancaire dédié</strong> — séparation patrimoine pro/perso recommandée par les experts-comptables LMNP.<br><br>
      <strong>3. Contacter un expert-comptable spécialisé</strong> — honoraires ~800-1 200€/an, souvent récupérés dès la première année grâce aux économies d'impôts.
    </div>
  </td></tr>
  </table>

  <!-- Section 3 -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;margin-bottom:24px;">
  <tr><td style="padding:18px 20px;">
    <div style="font-size:14px;font-weight:700;color:#92400E;margin-bottom:10px;">⚠️ Le piège à éviter : la requalification en LMP</div>
    <div style="font-size:12px;color:#78350F;line-height:1.7;">
      Si vos <strong>recettes locatives dépassent 23 000€/an ET 50% de vos revenus du foyer</strong>,
      vous basculez en Loueur Meublé Professionnel (LMP) — régime différent avec cotisations sociales.
      Anticipez ce seuil si vous multipliez les biens.
    </div>
  </td></tr>
  </table>

  <!-- CTA -->
  <table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center">
    <a href="https://immoverdict.com/lmnp" style="display:inline-block;background:linear-gradient(135deg,#F97316,#EA580C);color:white;font-size:14px;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;">
      🔄 Relancer ma simulation →
    </a>
    <p style="font-size:11px;color:#94A3B8;margin-top:12px;">Modifiez les paramètres et explorez les 4 régimes en 2 minutes.</p>
  </td></tr>
  </table>

</td></tr>

<!-- Footer -->
<tr><td style="background:#F8FAFC;border-radius:0 0 16px 16px;padding:16px 28px;text-align:center;border-top:1px solid #E2E8F0;">
  <p style="font-size:11px;color:#94A3B8;margin:0;">
    ImmoVerdict · <a href="https://immoverdict.com" style="color:#94A3B8;">immoverdict.com</a><br>
    <a href="https://immoverdict.com/mentions-legales" style="color:#94A3B8;">Se désabonner</a>
  </p>
</td></tr>

</table>
</td></tr></table>
</body></html>`;
}

function buildJ30HTML(nom, tri, cashflowM, prix) {
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

  <!-- Checklist -->
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

  <!-- Partenaires -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;margin-bottom:16px;">
  <tr><td style="padding:18px 20px;">
    <div style="font-size:14px;font-weight:700;color:#1E40AF;margin-bottom:12px;">🤝 Nos partenaires sélectionnés</div>
    ${[
      ["🏦 Courtier en prêt immobilier", "Comparez les meilleures offres de crédit — gratuit", "https://immoverdict.com/lmnp?utm_source=email&utm_medium=j30&utm_campaign=courtier", "Trouver mon courtier →"],
      ["📒 Expert-comptable LMNP",      "Premiers devis en 48h, spécialistes location meublée",  "https://immoverdict.com/lmnp?utm_source=email&utm_medium=j30&utm_campaign=compta",  "Demander un devis →"],
    ].map(([icon_title, desc, url, cta]) => `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
    <tr valign="middle">
      <td>
        <div style="font-size:12px;font-weight:700;color:#1E40AF;">${icon_title}</div>
        <div style="font-size:11px;color:#64748B;">${desc}</div>
      </td>
      <td width="140" style="text-align:right;">
        <a href="${url}" style="font-size:11px;font-weight:700;color:#F97316;text-decoration:none;white-space:nowrap;">${cta}</a>
      </td>
    </tr>
    </table>`).join("")}
  </td></tr>
  </table>

  <!-- CTA principal -->
  <table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding-top:8px;">
    <a href="https://immoverdict.com/lmnp?utm_source=email&utm_medium=j30&utm_campaign=resimulate" style="display:inline-block;background:linear-gradient(135deg,#F97316,#EA580C);color:white;font-size:14px;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;">
      📊 Affiner ma simulation →
    </a>
  </td></tr>
  </table>

</td></tr>

<!-- Footer -->
<tr><td style="background:#F8FAFC;border-radius:0 0 16px 16px;padding:16px 28px;text-align:center;border-top:1px solid #E2E8F0;">
  <p style="font-size:11px;color:#94A3B8;margin:0;">
    ImmoVerdict · <a href="https://immoverdict.com" style="color:#94A3B8;">immoverdict.com</a><br>
    Vous recevez cet email car vous avez utilisé notre simulateur LMNP gratuit.<br>
    <a href="https://immoverdict.com/mentions-legales" style="color:#94A3B8;">Se désabonner</a>
  </p>
</td></tr>

</table>
</td></tr></table>
</body></html>`;
}

/* ─── Envoi Resend ───────────────────────────────────────── */
async function sendEmail({ to, subject, html }) {
  const res = await fetch("https://api.resend.com/emails", {
    method:  "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
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

/* ─── Handler ────────────────────────────────────────────── */
export async function GET(request) {
  /* Sécurité optionnelle : vérifier le secret Vercel Cron */
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!RESEND_API_KEY) {
    return NextResponse.json({ skipped: true, reason: "RESEND_API_KEY not set" });
  }

  const results = { j14: { sent: 0, errors: [] }, j30: { sent: 0, errors: [] } };

  /* ── J+14 ─────────────────────────────────────────────── */
  const w14 = windowISO(14);
  const { data: leads14, error: err14 } = await sb
    .from("leads")
    .select("email, nom, params, tri, cashflow_m")
    .gt("created_at", w14.lo)
    .lt("created_at", w14.hi)
    .is("emailed_j14", null);           // Colonne sentinelle pour éviter les doublons

  if (err14) {
    results.j14.errors.push(err14.message);
  } else if (leads14?.length) {
    for (const lead of leads14) {
      try {
        await sendEmail({
          to: lead.email,
          subject: `💡 Optimisez votre LMNP — 3 erreurs à éviter`,
          html: buildJ14HTML(lead.nom, lead.tri, lead.cashflow_m, lead.params?.prix),
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
          to: lead.email,
          subject: `🎯 Votre projet LMNP — où en êtes-vous ?`,
          html: buildJ30HTML(lead.nom, lead.tri, lead.cashflow_m, lead.params?.prix),
        });
        await sb.from("leads").update({ emailed_j30: new Date().toISOString() }).eq("email", lead.email);
        results.j30.sent++;
      } catch (e) {
        results.j30.errors.push(`${lead.email}: ${e.message}`);
      }
    }
  }

  console.log("[cron/email-sequence]", results);
  return NextResponse.json({ ok: true, results });
}
