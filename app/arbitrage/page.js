import ArbitrageClient from "./ArbitrageClient";

export const metadata = {
  title:       "Quand vendre son LMNP ? Simulateur d'arbitrage fiscal | ImmoVerdict",
  description:
    "Simulez l'évolution fiscale de votre investissement LMNP sur 20 ans. " +
    "Identifiez quand votre bouclier fiscal expire, calculez l'impôt cumulé et " +
    "déterminez le moment optimal pour vendre, conserver ou basculer en SCI à l'IS.",
  keywords: [
    "quand vendre LMNP",
    "arbitrage fiscal immobilier",
    "bouclier fiscal LMNP",
    "simulateur revente LMNP",
    "amortissement LMNP fin",
    "SCI IS conversion LMNP",
    "plus-value LMNP",
    "optimisation fiscale immobilier",
  ],
  openGraph: {
    title:       "Arbitrage Fiscal LMNP — Quand vendre ou conserver ?",
    description: "Simulez l'expiration de votre bouclier fiscal et trouvez le moment optimal pour arbitrer votre LMNP.",
    type:        "website",
  },
};

/**
 * Page serveur : pas de "use client" → Next.js 15 n'injecte PAS ClientPageRoot.
 * ArbitrageClient est le composant "use client" qui gère le calcul côté client.
 */
export default function ArbitragePage() {
  return <ArbitrageClient />;
}
