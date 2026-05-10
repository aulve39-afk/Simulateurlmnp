/**
 * POST /api/parse-annonce
 * Reçoit { url } et extrait les données d'une annonce immobilière.
 * Supporte : SeLoger, LeBonCoin, PAP, BienIci, Logic-Immo, Leboncoin Immo
 *
 * Stratégie d'extraction (par ordre de priorité) :
 * 1. JSON-LD structuré (<script type="application/ld+json">)
 * 2. Meta OpenGraph (og:title, og:description, price:amount)
 * 3. Regex fallback sur le texte brut
 */

export const runtime = "nodejs";

/** Extrait un entier depuis une chaîne — retourne null si rien trouvé */
function extractInt(text) {
  const m = text?.replace(/\s/g, "").replace(",", ".").match(/[\d.]+/);
  return m ? Math.round(parseFloat(m[0])) : null;
}

/** Nettoie le texte HTML basique */
function stripHtml(html) {
  return html?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ?? "";
}

/** Parse les balises meta du HTML */
function parseMeta(html) {
  const meta = {};
  const metas = html.matchAll(/<meta[^>]+>/gi);
  for (const [tag] of metas) {
    const prop = (tag.match(/(?:property|name)="([^"]+)"/i)?.[1] ?? "").toLowerCase();
    const content = tag.match(/content="([^"]+)"/i)?.[1] ?? "";
    if (prop && content) meta[prop] = content;
  }
  return meta;
}

/** Extraire le DPE depuis une chaîne */
function parseDPE(text) {
  const m = text?.match(/\bDPE\s*[:\-–]?\s*([A-G])\b/i)
    ?? text?.match(/classe[^A-G]*([A-G])\b/i)
    ?? text?.match(/\bénergie\s*([A-G])\b/i);
  return m ? m[1].toUpperCase() : null;
}

/** Extraire le nombre de pièces */
function parsePieces(text) {
  const m = text?.match(/(\d)\s*pièce/i) ?? text?.match(/(\d)\s*p\b/);
  const n = m ? parseInt(m[1]) : null;
  return n && n >= 1 && n <= 10 ? n : null;
}

/** Extraire la surface (m²) */
function parseSurface(text) {
  const m = text?.match(/(\d[\d\s]*(?:[.,]\d+)?)\s*m²/i)
    ?? text?.match(/surface\s*[:\-]?\s*(\d+)/i);
  const v = m ? extractInt(m[1]) : null;
  return v && v >= 5 && v <= 500 ? v : null;
}

/** Extraire le prix */
function parsePrix(text) {
  // "250 000 €", "250000€", "250k€"
  const m = text?.replace(/\s/g, "").match(/(\d{4,8})(?:€|EUR)/i)
    ?? text?.match(/(\d[\d\s.]+)\s*€/);
  if (!m) return null;
  const v = extractInt(m[1].replace(/\./g, ""));
  return v && v >= 10000 && v < 10000000 ? v : null;
}

/** Tente de parser les JSON-LD du HTML */
function parseJsonLd(html) {
  const result = {};
  const scripts = html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  for (const [, json] of scripts) {
    try {
      const obj = JSON.parse(json);
      const items = Array.isArray(obj) ? obj : [obj];
      for (const item of items) {
        // RealEstateListing, Apartment, House, Product…
        const type = item["@type"] ?? "";
        if (!/apartment|house|realestate|product|residence/i.test(type)) continue;

        if (item.price)      result.prix    = extractInt(String(item.price));
        if (item.floorSize?.value) result.surface = extractInt(String(item.floorSize.value));
        if (item.numberOfRooms)    result.nbPieces = parseInt(item.numberOfRooms);
        if (item.address?.streetAddress) result.adresse = item.address.streetAddress;
        if (item.address?.addressLocality) result.ville = item.address.addressLocality;

        // Offers
        const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
        if (offer?.price) result.prix = extractInt(String(offer.price));

        // Description → DPE, surface fallback
        const desc = stripHtml(item.description ?? "");
        if (!result.surface) result.surface = parseSurface(desc);
        if (!result.dpe)     result.dpe     = parseDPE(desc);
        if (!result.nbPieces) result.nbPieces = parsePieces(desc);
      }
    } catch {}
  }
  return result;
}

export async function POST(req) {
  let url;
  try {
    ({ url } = await req.json());
  } catch {
    return Response.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  if (!url || typeof url !== "string") {
    return Response.json({ error: "URL manquante" }, { status: 400 });
  }

  // Valider que c'est une URL http(s) d'une plateforme connue
  let parsed;
  try { parsed = new URL(url); }
  catch { return Response.json({ error: "URL invalide" }, { status: 400 }); }

  const ALLOWED_HOSTS = [
    "seloger.com", "www.seloger.com",
    "leboncoin.fr", "www.leboncoin.fr",
    "pap.fr", "www.pap.fr",
    "bienici.com", "www.bienici.com",
    "logic-immo.com", "www.logic-immo.com",
    "orpi.com", "www.orpi.com",
    "century21.fr", "www.century21.fr",
    "laforet.com", "www.laforet.com",
    "fnaim.fr", "www.fnaim.fr",
    "meilleursagents.com", "www.meilleursagents.com",
    "superimmo.com", "www.superimmo.com",
  ];

  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return Response.json({
      error: `Plateforme non supportée (${parsed.hostname}). Sites supportés : SeLoger, LeBonCoin, PAP, BienIci, Logic-Immo, Orpi, Century21, Laforêt.`,
    }, { status: 422 });
  }

  // Fetch de la page
  let html;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ImmoVerdict/1.0; +https://immoverdict.com)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "fr-FR,fr;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    return Response.json({ error: `Impossible d'accéder à l'annonce : ${err.message}` }, { status: 502 });
  }

  // ── Extraction ──
  const data = {};

  // 1. JSON-LD
  Object.assign(data, parseJsonLd(html));

  // 2. Meta OpenGraph / meta tags
  const meta = parseMeta(html);
  const ogTitle = meta["og:title"] ?? meta["twitter:title"] ?? "";
  const ogDesc  = meta["og:description"] ?? meta["twitter:description"] ?? "";
  const fullText = `${ogTitle} ${ogDesc}`;

  if (!data.prix)     data.prix     = parsePrix(fullText)    ?? parsePrix(meta["product:price:amount"]);
  if (!data.surface)  data.surface  = parseSurface(fullText);
  if (!data.dpe)      data.dpe      = parseDPE(fullText);
  if (!data.nbPieces) data.nbPieces = parsePieces(fullText);

  // 3. Regex sur le texte brut (HTML entier, limité)
  const rawText = stripHtml(html.slice(0, 80000)); // éviter de parser tout le DOM
  if (!data.prix)     data.prix     = parsePrix(rawText);
  if (!data.surface)  data.surface  = parseSurface(rawText);
  if (!data.dpe)      data.dpe      = parseDPE(rawText);
  if (!data.nbPieces) data.nbPieces = parsePieces(rawText);

  // Construire l'adresse si on a ville
  if (!data.adresse && data.ville) data.adresse = data.ville;

  // Nettoyages
  if (data.prix    && (data.prix < 10000 || data.prix > 9999999)) delete data.prix;
  if (data.surface && (data.surface < 5 || data.surface > 500))   delete data.surface;
  if (data.nbPieces && (data.nbPieces < 1 || data.nbPieces > 10)) delete data.nbPieces;
  if (data.dpe && !/^[A-G]$/.test(data.dpe))                      delete data.dpe;

  delete data.ville; // pas un champ du formulaire

  const fieldsFound = Object.keys(data).filter(k => data[k] != null);
  if (fieldsFound.length === 0) {
    return Response.json({
      error: "Aucune donnée extraite. L'annonce est peut-être protégée ou a expiré.",
    }, { status: 422 });
  }

  return Response.json({ ok: true, data, fieldsFound });
}
