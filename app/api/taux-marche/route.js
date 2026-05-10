/**
 * GET /api/taux-marche
 * Retourne les taux immobiliers moyens du marché français.
 * Source : Empruntis / MeilleurTaux / Banque de France (mis à jour manuellement chaque mois).
 * Ces taux sont hors assurance emprunteur (TAEA ~0.20–0.35%).
 */
export const dynamic = "force-static";
export const revalidate = 86400; // revalidate once per day

export async function GET() {
  const data = {
    // Date de la dernière mise à jour des taux (YYYY-MM)
    moisRef: "2026-05",
    // Taux moyens constatés (hors assurance) par durée
    taux: {
      "10ans": 2.85,
      "15ans": 3.10,
      "20ans": 3.30,
      "25ans": 3.50,
    },
    // Fourchettes bon profil / profil moyen / profil difficile
    fourchettes: {
      excellent: { min: 2.70, max: 3.10 }, // très bon dossier
      bon:       { min: 3.10, max: 3.50 }, // dossier standard
      difficile: { min: 3.50, max: 4.20 }, // profil risqué
    },
    // Tendance récente
    tendance: "stable", // "hausse" | "stable" | "baisse"
    source: "Empruntis / MeilleurTaux — moyenne nationale",
  };

  return Response.json(data, {
    headers: {
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
    },
  });
}
