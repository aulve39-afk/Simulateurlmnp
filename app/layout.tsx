import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#07071A",
};

export const metadata: Metadata = {
  title: "ImmoPilote — Simulateur LMNP & Résidence Principale",
  description: "Votre copilote pour l'achat immobilier. Simulateur LMNP (4 régimes fiscaux, dossier bancaire), achat résidence principale (PTZ, DPE, DVF, louer vs acheter). 100 % gratuit.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "ImmoPilote — Simulateur immobilier gratuit",
    description: "Simulez votre investissement LMNP ou votre achat de résidence principale en 2 minutes. PTZ, DPE, DVF, 4 régimes fiscaux.",
    url: "https://simulateur-lmnp-v2.vercel.app",
    siteName: "ImmoPilote",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ImmoPilote — Simulateur immobilier gratuit",
    description: "LMNP, PTZ, DPE, DVF — tous vos outils immobiliers en un seul endroit.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className="h-full">
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
