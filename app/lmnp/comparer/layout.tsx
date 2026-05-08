import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Comparer les régimes LMNP — Micro-BIC vs Réel vs SCI IS | ImmoVerdict",
  description:
    "Tableau comparatif complet des 4 régimes LMNP : Micro-BIC, Réel simplifié, SARL de famille, SCI IS. Fiscalité, amortissements, seuils LF 2026. Simulez gratuitement.",
  openGraph: {
    title: "Comparer Micro-BIC vs Réel LMNP — Tableau comparatif 2026",
    description:
      "4 régimes LMNP côte à côte : fiscalité, charges déductibles, plafonds, amortissements. Quel régime pour votre investissement ?",
    url: "https://immoverdict.com/lmnp/comparer",
    siteName: "ImmoVerdict",
    locale: "fr_FR",
    type: "article",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Comparaison régimes LMNP — ImmoVerdict",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Micro-BIC vs Réel LMNP — Comparaison complète 2026",
    description:
      "4 régimes LMNP comparés : fiscalité, amortissements, seuils, obligations. Simulez votre cas en 2 min.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://immoverdict.com/lmnp/comparer",
  },
  keywords: [
    "comparer régimes LMNP",
    "Micro-BIC vs Réel simplifié",
    "comparaison LMNP fiscalité",
    "SARL famille LMNP",
    "SCI IS LMNP",
    "régime fiscal LMNP 2026",
    "amortissement LMNP",
    "tableau comparatif LMNP",
  ],
};

export default function ComparerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
