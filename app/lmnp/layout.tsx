import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Simulateur LMNP — 4 régimes fiscaux comparés | ImmoVerdict",
  description:
    "Calculez votre TRI, cash-flow et impôt LMNP selon 4 régimes : Micro-BIC, Réel simplifié, SARL de famille, SCI IS. Amortissements, règle HCSF, LF 2026. 100 % gratuit.",
  openGraph: {
    title: "Simulateur LMNP — 4 régimes fiscaux comparés | ImmoVerdict",
    description:
      "TRI, cash-flow, amortissements, dossier bancaire — tout pour analyser votre investissement LMNP en 2 minutes.",
    url: "https://immoverdict.fr/lmnp",
    siteName: "ImmoVerdict",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Simulateur LMNP ImmoVerdict",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Simulateur LMNP — 4 régimes fiscaux | ImmoVerdict",
    description:
      "Comparez Micro-BIC, Réel, SARL, SCI IS. TRI, cash-flow, amortissements — gratuit.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://immoverdict.fr/lmnp",
  },
};

export default function LmnpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
