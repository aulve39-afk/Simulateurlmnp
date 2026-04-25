import { NextResponse } from "next/server";

/* ── Formatters (server-side) ── */
const fmt  = (n) => new Intl.NumberFormat("fr-FR", { style:"currency", currency:"EUR", maximumFractionDigits:0 }).format(n ?? 0);
const fmtK = (n) => Math.abs(n ?? 0) >= 1000 ? `${((n ?? 0)/1000).toFixed(1)}k€` : fmt(n);

/* ── HTML du rapport email ── */
function buildHTML({ nom, params: p, tri, cashflow_m, rend_net, amort, results }) {
  const prenom  = nom || "Investisseur";
  const date    = new Date().toLocaleDateString("fr-FR", { day:"numeric", month:"long", year:"numeric" });
  const cfColor = (cashflow_m ?? 0) >= 0 ? "#059669" : "#DC2626";
  const cfBg    = (cashflow_m ?? 0) >= 0 ? "#ECFDF5" : "#FEF2F2";
  const cfBd    = (cashflow_m ?? 0) >= 0 ? "#A7F3D0" : "#FECACA";
  const triColor = (tri ?? 0) >= 6 ? "#059669" : (tri ?? 0) >= 4 ? "#D97706" : "#DC2626";
  const triBg    = (tri ?? 0) >= 6 ? "#ECFDF5" : (tri ?? 0) >= 4 ? "#FFFBEB" : "#FEF2F2";
  const verdictEmoji = (tri ?? 0) >= 6 ? "🟢" : (tri ?? 0) >= 4 ? "🟡" : "🔴";
  const verdictLabel = (tri ?? 0) >= 6 ? "Excellent" : (tri ?? 0) >= 4 ? "Acceptable" : "Risqué";

  const regimes = [
    { label:"LMNP Réel", icon:"🥇", ...(results?.[0] ?? {}) },
    { label:"Micro-BIC", icon:"🥈", ...(results?.[1] ?? {}) },
    { label:"SCI à l'IS", icon:"🏅", ...(results?.[2] ?? {}) },
    { label:"SCI à l'IR", icon:"🏅", ...(results?.[3] ?? {}) },
  ];

  const composants = amort?.chartData ?? [];
  const totalAmort = amort?.totalAnnuel ?? 0;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rapport LMNP</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F1F5F9;">
<tr><td align="center" style="padding:24px 12px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

<!-- ═══ HEADER ═══ -->
<tr><td style="background:linear-gradient(135deg,#0F172A 0%,#185FA5 100%);border-radius:16px 16px 0 0;padding:32px 28px;text-align:center;">
  <div style="font-size:42px;margin-bottom:10px;">🏢</div>
  <h1 style="color:white;margin:0 0 6px;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Simulateur LMNP</h1>
  <p style="color:#93C5FD;margin:0;font-size:13px;">Rapport fiscal personnalisé · ${date}</p>
</td></tr>

<!-- ═══ CORPS ═══ -->
<tr><td style="background:white;padding:28px;">

  <!-- Intro -->
  <p style="color:#0F172A;font-size:16px;font-weight:700;margin:0 0 4px;">Bonjour ${prenom},</p>
  <p style="color:#64748B;font-size:13px;line-height:1.7;margin:0 0 24px;">
    Voici votre analyse complète pour le bien à <strong style="color:#0F172A;">${fmt(p?.prix)}</strong>
    avec <strong style="color:#0F172A;">${fmt(p?.loyer)}/mois</strong> de loyer.
    Horizon de détention&nbsp;: <strong style="color:#0F172A;">${p?.horizon ?? 20}&nbsp;ans</strong>.
  </p>

  <!-- Verdict -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${triBg};border:1px solid #E2E8F0;border-radius:14px;margin-bottom:24px;">
  <tr><td style="padding:18px 20px;">
    <table cellpadding="0" cellspacing="0"><tr valign="middle">
      <td style="font-size:36px;padding-right:14px;">${verdictEmoji}</td>
      <td>
        <div style="font-weight:800;font-size:16px;color:${triColor};">Verdict : ${verdictLabel}</div>
        <div style="font-size:12px;color:#64748B;margin-top:3px;">
          TRI&nbsp;${tri ?? "—"}% &nbsp;·&nbsp; CF&nbsp;${cashflow_m != null ? ((cashflow_m >= 0 ? "+" : "") + cashflow_m + "€") : "—"}/mois
          &nbsp;·&nbsp; TMI&nbsp;${p?.tmi ?? "—"}%
        </div>
      </td>
    </tr></table>
  </td></tr>
  </table>

  <!-- KPIs 3 colonnes -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
  <tr>
    <td width="32%" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:16px;text-align:center;vertical-align:top;">
      <div style="font-size:10px;color:#3B82F6;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">TRI</div>
      <div style="font-size:26px;font-weight:800;color:#185FA5;">${tri ?? "—"}%</div>
      <div style="font-size:11px;color:#93C5FD;margin-top:3px;">Sur ${p?.horizon ?? 20}&nbsp;ans</div>
    </td>
    <td width="4%" style="font-size:0;">&nbsp;</td>
    <td width="32%" style="background:${cfBg};border:1px solid ${cfBd};border-radius:12px;padding:16px;text-align:center;vertical-align:top;">
      <div style="font-size:10px;color:${cfColor};font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Cash-flow</div>
      <div style="font-size:26px;font-weight:800;color:${cfColor};">${cashflow_m != null ? ((cashflow_m >= 0 ? "+" : "") + cashflow_m + "€") : "—"}</div>
      <div style="font-size:11px;color:#94A3B8;margin-top:3px;">par mois</div>
    </td>
    <td width="4%" style="font-size:0;">&nbsp;</td>
    <td width="32%" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:16px;text-align:center;vertical-align:top;">
      <div style="font-size:10px;color:#3B82F6;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Rdt net</div>
      <div style="font-size:26px;font-weight:800;color:#185FA5;">${rend_net != null ? (+rend_net).toFixed(2) : "—"}%</div>
      <div style="font-size:11px;color:#93C5FD;margin-top:3px;">Après charges</div>
    </td>
  </tr>
  </table>

  <!-- Récap bien -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:14px;margin-bottom:24px;">
  <tr><td style="padding:18px 20px;">
    <div style="font-size:14px;font-weight:700;color:#0F172A;margin-bottom:12px;">🏠 Caractéristiques du bien</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${[
        ["Type de bien",     p?.typeBien ?? "—"],
        ["Prix d'achat",     fmt(p?.prix)],
        ["Frais de notaire", `${fmt((p?.prix ?? 0) * (p?.notaire ?? 8) / 100)} (${p?.notaire}%)`],
        ["Travaux + Mobilier", fmt((p?.travaux ?? 0) + (p?.mobilier ?? 0))],
        ["Apport personnel", fmt(p?.apport)],
        ["Capital emprunté",  fmt(Math.max(0, (p?.prix ?? 0) + (p?.travaux ?? 0) + (p?.prix ?? 0) * (p?.notaire ?? 8) / 100 - (p?.apport ?? 0)))],
        ["Loyer mensuel",    `${fmt(p?.loyer)}/mois`],
        ["Crédit",           `${p?.dureeCredit} ans à ${p?.interet}%`],
        ["Vacance locative", `${p?.vacance}%`],
        ["TMI",              `${p?.tmi}%`],
      ].map(([label, val]) => `
      <tr>
        <td style="font-size:12px;color:#64748B;padding:4px 0;">${label}</td>
        <td style="font-size:12px;font-weight:600;color:#0F172A;text-align:right;padding:4px 0;">${val}</td>
      </tr>`).join("")}
    </table>
  </td></tr>
  </table>

  <!-- Régimes -->
  <div style="font-size:14px;font-weight:700;color:#0F172A;margin-bottom:12px;">📊 Comparaison des 4 régimes fiscaux</div>
  ${regimes.map((r, i) => {
    const isWin = i === 0;
    const bg  = isWin ? "#EFF6FF" : "#F8FAFC";
    const bd  = isWin ? "#BFDBFE" : "#E2E8F0";
    const cfC = (r.cashflowM ?? 0) >= 0 ? "#059669" : "#DC2626";
    return `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${bg};border:1px solid ${bd};border-radius:11px;margin-bottom:8px;">
  <tr><td style="padding:14px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr valign="middle">
      <td>
        <div style="font-size:13px;font-weight:700;color:#0F172A;">${r.icon} ${r.label}</div>
        <div style="font-size:11px;color:#64748B;margin-top:2px;">TRI&nbsp;${r.tri ?? "—"}% · Rdt net&nbsp;${r.rendNet != null ? (+r.rendNet).toFixed(2) : "—"}%</div>
      </td>
      <td style="text-align:right;">
        <div style="font-size:18px;font-weight:800;color:${cfC};">${r.cashflowM != null ? ((r.cashflowM >= 0 ? "+" : "") + r.cashflowM + "€") : "—"}</div>
        <div style="font-size:10px;color:#94A3B8;">par mois</div>
      </td>
    </tr></table>
  </td></tr>
  </table>`;
  }).join("")}

  ${composants.length > 0 ? `
  <!-- Amortissements -->
  <div style="font-size:14px;font-weight:700;color:#0F172A;margin:24px 0 12px;">🏗️ Amortissement par composants (LMNP Réel)</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:14px;">
  <tr><td style="padding:18px 20px;">
    <div style="font-size:13px;font-weight:700;color:#185FA5;margin-bottom:14px;">
      Total déductible : ${fmt(totalAmort)}/an — non imposable
    </div>
    ${composants.map(c => {
      const pct = Math.round((c.montant / totalAmort) * 100);
      return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
    <tr valign="middle">
      <td width="110" style="font-size:11px;color:#475569;">${c.name}</td>
      <td style="padding:0 10px;">
        <div style="background:#DBEAFE;border-radius:4px;height:7px;">
          <div style="background:#185FA5;border-radius:4px;height:7px;width:${pct}%;"></div>
        </div>
      </td>
      <td width="55" style="font-size:11px;font-weight:700;color:#0F172A;text-align:right;">${fmt(c.montant)}</td>
      <td width="40" style="font-size:10px;color:#94A3B8;text-align:right;">${c.duree}ans</td>
    </tr>
    </table>`;
    }).join("")}
  </td></tr>
  </table>
  ` : ""}

  <!-- Conseil -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:14px;margin-top:24px;">
  <tr><td style="padding:16px 20px;">
    <div style="font-size:13px;font-weight:700;color:#92400E;margin-bottom:6px;">💡 Conseil fiscal</div>
    <div style="font-size:12px;color:#78350F;line-height:1.6;">
      ${(p?.tmi ?? 0) >= 30
        ? "Avec votre TMI de " + p?.tmi + "%, le <strong>Régime Réel LMNP</strong> est presque toujours plus avantageux que le Micro-BIC grâce aux amortissements par composants. Consultez un expert-comptable pour optimiser votre dossier."
        : "Avec votre TMI de " + (p?.tmi ?? 0) + "%, comparez attentivement le Micro-BIC et le Régime Réel — selon le montant d'amortissements, les deux peuvent être compétitifs."}
    </div>
  </td></tr>
  </table>

</td></tr>

<!-- ═══ FOOTER ═══ -->
<tr><td style="background:#F8FAFC;border-radius:0 0 16px 16px;padding:18px 28px;text-align:center;border-top:1px solid #E2E8F0;">
  <p style="font-size:12px;color:#64748B;margin:0 0 4px;font-weight:600;">Simulateur LMNP · Analyse fiscale gratuite</p>
  <p style="font-size:10px;color:#94A3B8;margin:0;line-height:1.5;">
    Ce rapport est fourni à titre informatif. Pour votre dossier définitif,<br>
    consultez un expert-comptable spécialisé en investissement locatif meublé.
  </p>
</td></tr>

</table>
</td></tr>
</table>

</body>
</html>`;
}

/* ══════════════════════════════════════
   POST /api/send-report
══════════════════════════════════════ */
export async function POST(request) {
  try {
    const body = await request.json();
    const { email, nom, params, tri, cashflow_m, rend_net, amort, results } = body;

    if (!email) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    // ── Pas de clé Resend → retour gracieux (données déjà en DB)
    if (!RESEND_API_KEY) {
      return NextResponse.json({ success: true, warning: "email_not_configured" });
    }

    const html = buildHTML({ nom, params, tri, cashflow_m, rend_net, amort, results });

    const cfSign = cashflow_m != null
      ? ((cashflow_m >= 0 ? "+" : "") + cashflow_m + "€")
      : "—";

    const RESEND_FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Simulateur LMNP <${RESEND_FROM}>`,
        to:   [email],
        subject: `📊 Votre simulation LMNP — TRI ${tri ?? "—"}% · CF ${cfSign}/mois`,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Resend error:", errText);
      // On retourne quand même un succès — les données sont en DB
      return NextResponse.json({ success: true, warning: "email_send_failed", detail: errText });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("send-report error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
