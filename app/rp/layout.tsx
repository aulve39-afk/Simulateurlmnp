import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Simulateur Résidence Principale — PTZ, DPE, DVF, Louer vs Acheter | ImmoVerdict",
  description:
    "Calculez votre capacité d'emprunt, simulez votre PTZ 2024, analysez le DPE & budget travaux, consultez les prix DVF et comparez louer vs acheter. Gratuit.",
  openGraph: {
    title: "Simulateur Résidence Principale — PTZ, DPE, DVF | ImmoVerdict",
    description:
      "PTZ, DPE, DVF, louer vs acheter — tous vos outils primo-accédant en un seul endroit. Gratuit et sans inscription.",
    url: "https://immoverdict.com/rp",
    siteName: "ImmoVerdict",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Simulateur Résidence Principale ImmoVerdict",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Simulateur Résidence Principale — PTZ, DPE, DVF | ImmoVerdict",
    description:
      "Capacité d'emprunt, PTZ, DPE, prix DVF, louer vs acheter — gratuit.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://immoverdict.com/rp",
  },
};

export default function RpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
