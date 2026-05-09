import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

/* ── Page HTML inline ───────────────────────────────────── */
function page(title, message, success) {
  const icon  = success ? "✅" : "⚠️";
  const color = success ? "#34D399" : "#F87171";
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} — ImmoVerdict</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0F172A;color:#E2E8F0;
         display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px}
    .card{background:#1E293B;border-radius:16px;padding:40px;max-width:480px;width:100%;text-align:center}
    .icon{font-size:48px;margin-bottom:16px}
    h1{font-size:22px;font-weight:800;color:${color};margin:0 0 12px}
    p{color:#94A3B8;font-size:14px;line-height:1.7;margin:0 0 24px}
    a{display:inline-block;background:linear-gradient(135deg,#F97316,#EA580C);color:#fff;
      font-weight:700;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="https://immoverdict.com">Retour sur ImmoVerdict →</a>
  </div>
</body>
</html>`;
}

const HTML = { headers: { "Content-Type": "text/html; charset=utf-8" } };

/* ── Handler GET /api/unsubscribe?email=xxx ─────────────── */
export async function GET(request) {
  const email = new URL(request.url).searchParams.get("email")?.toLowerCase().trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(
      page("Lien invalide", "Ce lien de désabonnement est invalide ou expiré.", false),
      HTML
    );
  }

  /* On marque emailed_j14 et emailed_j30 à une date dans le futur lointain
     → le cron ignorera ce lead pour toujours */
  const { error } = await sb
    .from("leads")
    .update({
      emailed_j14: "2099-01-01T00:00:00.000Z",
      emailed_j30: "2099-01-01T00:00:00.000Z",
    })
    .eq("email", email);

  if (error) {
    console.error("[api/unsubscribe]", error.message);
    return new Response(
      page(
        "Erreur",
        "Une erreur s'est produite. Contactez-nous à contact@immoverdict.com.",
        false
      ),
      HTML
    );
  }

  return new Response(
    page(
      "Désabonné avec succès",
      `L'adresse <strong>${email}</strong> ne recevra plus nos emails automatiques.<br>Vous pouvez continuer à utiliser ImmoVerdict gratuitement.`,
      true
    ),
    HTML
  );
}
