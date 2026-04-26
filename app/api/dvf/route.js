import { NextResponse } from "next/server";

/**
 * GET /api/dvf?q=<adresse ou code postal>
 *
 * 1. Géocode l'adresse via BAN (Base Adresse Nationale, data.gouv.fr)
 * 2. Récupère les transactions DVF via l'API Etalab (Ministère de l'Économie)
 * 3. Calcule médiane, Q1, Q3, moyenne, et retourne les 5 dernières transactions
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ error: "Paramètre q requis (adresse ou code postal)" }, { status: 400 });
  }

  try {
    /* ── 1. Géocodage BAN ─────────────────────────────────────────────────── */
    const banUrl = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=1`;
    const banRes = await fetch(banUrl, { signal: AbortSignal.timeout(6000) });
    if (!banRes.ok) throw new Error("BAN API non disponible");

    const banData = await banRes.json();
    if (!banData.features?.length) {
      return NextResponse.json(
        { error: "Adresse ou code postal non trouvé. Précisez la commune ou ajoutez la ville." },
        { status: 404 }
      );
    }

    const feat       = banData.features[0];
    const codeCommune = feat.properties.citycode;   // code INSEE
    const nomCommune = feat.properties.city;
    const codePostal = feat.properties.postcode;
    const score      = feat.properties.score ?? 1;

    if (score < 0.4) {
      return NextResponse.json(
        { error: "Adresse ambiguë. Précisez la ville ou ajoutez le code postal." },
        { status: 400 }
      );
    }

    /* ── 2. Transactions DVF (Etalab / Ministère de l'Économie) ─────────── */
    const today      = new Date();
    const twoYrsAgo  = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate());
    const dateMin    = twoYrsAgo.toISOString().split("T")[0];

    const dvfUrl = [
      `https://api.dvf.etalab.gouv.fr/dvf/1.0/communes/${codeCommune}/`,
      `?type_local=Appartement`,
      `&date_mutation_min=${dateMin}`,
      `&ordering=-date_mutation`,
      `&page_size=500`,
    ].join("");

    const dvfRes = await fetch(dvfUrl, { signal: AbortSignal.timeout(12000) });
    if (!dvfRes.ok) {
      return NextResponse.json(
        { error: "API DVF indisponible. Réessayez dans quelques instants.", commune: nomCommune, codePostal },
        { status: 502 }
      );
    }

    const dvfData    = await dvfRes.json();
    const raw        = dvfData.results ?? [];

    /* ── 3. Calcul stats ─────────────────────────────────────────────────── */
    const pricesM2 = raw
      .filter(t => t.surface_reelle_bati >= 10 && t.valeur_fonciere >= 20000)
      .map(t => t.valeur_fonciere / t.surface_reelle_bati)
      .filter(p => p > 500 && p < 35000)   // exclure valeurs aberrantes
      .sort((a, b) => a - b);

    if (pricesM2.length < 3) {
      return NextResponse.json(
        { error: "Pas assez de transactions récentes dans cette commune (< 3 ventes).", commune: nomCommune, codePostal },
        { status: 404 }
      );
    }

    const n      = pricesM2.length;
    const median = pricesM2[Math.floor(n / 2)];
    const q1     = pricesM2[Math.floor(n * 0.25)];
    const q3     = pricesM2[Math.floor(n * 0.75)];
    const moy    = pricesM2.reduce((a, b) => a + b, 0) / n;

    const recent = raw
      .filter(t => t.surface_reelle_bati >= 10 && t.valeur_fonciere >= 20000)
      .slice(0, 6)
      .map(t => ({
        date:   t.date_mutation?.slice(0, 7) ?? "—",
        surface: Math.round(t.surface_reelle_bati),
        prix:    Math.round(t.valeur_fonciere),
        prixM2:  Math.round(t.valeur_fonciere / t.surface_reelle_bati),
      }));

    return NextResponse.json({
      commune:       nomCommune,
      codePostal,
      codeCommune,
      prixMoyen:     Math.round(moy),
      medianPrixM2:  Math.round(median),
      q1:            Math.round(q1),
      q3:            Math.round(q3),
      nbTransactions: n,
      dateMin,
      recent,
      source: "DVF — Ministère de l'Économie & Finances / data.gouv.fr",
    });

  } catch (err) {
    if (err.name === "TimeoutError") {
      return NextResponse.json({ error: "Délai dépassé (>12s). Réessayez." }, { status: 504 });
    }
    console.error("[DVF route]", err);
    return NextResponse.json({ error: "Erreur technique. Réessayez." }, { status: 500 });
  }
}
