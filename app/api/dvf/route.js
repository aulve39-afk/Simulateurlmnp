import { NextResponse } from "next/server";

/**
 * GET /api/dvf?q=<adresse ou code postal>
 *
 * 1. Géocode l'adresse via BAN (Base Adresse Nationale, data.gouv.fr)
 * 2. Récupère les transactions DVF via les fichiers CSV de data.gouv.fr
 *    Source : https://files.data.gouv.fr/geo-dvf/latest/csv/{annee}/communes/{dept}/{code_commune}.csv
 * 3. Calcule médiane, Q1, Q3, moyenne, et retourne les 6 dernières transactions
 */

/** Extrait le code département à partir du code INSEE commune (5 caractères) */
function getDept(codeCommune) {
  // Corse : communes 2A et 2B
  if (codeCommune.startsWith("2A") || codeCommune.startsWith("2B")) {
    return codeCommune.slice(0, 2);
  }
  // DOM-TOM : 971, 972, 973, 974, 975, 976
  const prefix3 = codeCommune.slice(0, 3);
  if (["971", "972", "973", "974", "975", "976"].includes(prefix3)) {
    return prefix3;
  }
  return codeCommune.slice(0, 2);
}

/** Parse un fichier CSV DVF brut, retourne un tableau d'objets */
function parseDvfCsv(text) {
  const lines = text.split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));

  const idx = {
    nature:   headers.indexOf("nature_mutation"),
    type:     headers.indexOf("type_local"),
    valeur:   headers.indexOf("valeur_fonciere"),
    surface:  headers.indexOf("surface_reelle_bati"),
    date:     headers.indexOf("date_mutation"),
    pieces:   headers.indexOf("nombre_pieces_principales"),
  };

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parsing CSV simple (pas de virgules dans les champs DVF)
    const cols = line.split(",");

    const nature  = cols[idx.nature]?.trim().replace(/^"|"$/g, "") ?? "";
    const type    = cols[idx.type]?.trim().replace(/^"|"$/g, "") ?? "";
    const valeur  = parseFloat(cols[idx.valeur]?.replace(",", ".") ?? "0");
    const surface = parseFloat(cols[idx.surface]?.replace(",", ".") ?? "0");
    const date    = cols[idx.date]?.trim().replace(/^"|"$/g, "") ?? "";
    const pieces  = parseInt(cols[idx.pieces] ?? "0", 10) || 0;

    rows.push({ nature, type, valeur, surface, date, pieces });
  }

  return rows;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json(
      { error: "Paramètre q requis (adresse ou code postal)" },
      { status: 400 }
    );
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

    const feat        = banData.features[0];
    const codeCommune = feat.properties.citycode;   // code INSEE 5 chiffres
    const nomCommune  = feat.properties.city;
    const codePostal  = feat.properties.postcode;
    const score       = feat.properties.score ?? 1;

    if (score < 0.4) {
      return NextResponse.json(
        { error: "Adresse ambiguë. Précisez la ville ou ajoutez le code postal." },
        { status: 400 }
      );
    }

    /* ── 2. Récupération CSV DVF (data.gouv.fr) ──────────────────────────── */
    const dept = getDept(codeCommune);
    const BASE = "https://files.data.gouv.fr/geo-dvf/latest/csv";

    // On essaie les 3 dernières années (données publiées avec ~1 an de retard)
    const currentYear = new Date().getFullYear();
    const yearsToTry = [currentYear - 1, currentYear - 2, currentYear - 3];

    let allRows = [];
    let fetchedYears = [];

    for (const year of yearsToTry) {
      const csvUrl = `${BASE}/${year}/communes/${dept}/${codeCommune}.csv`;
      try {
        const csvRes = await fetch(csvUrl, { signal: AbortSignal.timeout(10000) });
        if (!csvRes.ok) continue; // Ce fichier n'existe pas encore, on passe

        const text = await csvRes.text();
        const rows = parseDvfCsv(text);
        allRows = allRows.concat(rows);
        fetchedYears.push(year);

        // 2 ans de données suffisent si on a déjà assez de transactions
        if (allRows.length >= 100 && fetchedYears.length >= 2) break;
      } catch {
        // Timeout ou réseau : on continue avec l'année suivante
        continue;
      }
    }

    if (allRows.length === 0) {
      return NextResponse.json(
        {
          error: "Données DVF non disponibles pour cette commune. Les données sont publiées avec environ 1 an de décalage.",
          commune: nomCommune,
          codePostal,
        },
        { status: 404 }
      );
    }

    /* ── 3. Filtrage : ventes d'appartements avec surface valide ─────────── */
    const ventes = allRows.filter(
      (t) =>
        t.nature === "Vente" &&
        t.type === "Appartement" &&
        t.surface >= 10 &&
        t.valeur >= 20000
    );

    const pricesM2 = ventes
      .map((t) => t.valeur / t.surface)
      .filter((p) => p > 500 && p < 35000)
      .sort((a, b) => a - b);

    if (pricesM2.length < 3) {
      return NextResponse.json(
        {
          error: `Pas assez de ventes d'appartements dans cette commune (${pricesM2.length} trouvée${pricesM2.length > 1 ? "s" : ""}). Essayez une commune voisine plus grande.`,
          commune: nomCommune,
          codePostal,
        },
        { status: 404 }
      );
    }

    /* ── 4. Calcul stats ─────────────────────────────────────────────────── */
    const n      = pricesM2.length;
    const median = pricesM2[Math.floor(n / 2)];
    const q1     = pricesM2[Math.floor(n * 0.25)];
    const q3     = pricesM2[Math.floor(n * 0.75)];
    const moy    = pricesM2.reduce((a, b) => a + b, 0) / n;

    // 6 transactions les plus récentes
    const recent = ventes
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6)
      .map((t) => ({
        date:    t.date?.slice(0, 7) ?? "—",
        surface: Math.round(t.surface),
        prix:    Math.round(t.valeur),
        prixM2:  Math.round(t.valeur / t.surface),
        pieces:  t.pieces || null,
      }));

    const dateMin = `${Math.min(...fetchedYears)}-01-01`;

    return NextResponse.json({
      commune:        nomCommune,
      codePostal,
      codeCommune,
      prixMoyen:      Math.round(moy),
      medianPrixM2:   Math.round(median),
      q1:             Math.round(q1),
      q3:             Math.round(q3),
      nbTransactions: n,
      dateMin,
      annees:         fetchedYears,
      recent,
      source: "DVF — Ministère de l'Économie & Finances / data.gouv.fr",
    });

  } catch (err) {
    if (err.name === "TimeoutError") {
      return NextResponse.json({ error: "Délai dépassé. Réessayez." }, { status: 504 });
    }
    console.error("[DVF route]", err);
    return NextResponse.json({ error: "Erreur technique. Réessayez." }, { status: 500 });
  }
}
