import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

/* GA4 Measurement ID — remplacer G-XXXXXXXXXX par votre vrai ID une fois créé dans Google Analytics */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";

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
      <body className="min-h-full flex flex-col antialiased">
        {/* Google Analytics 4 — actif seulement si NEXT_PUBLIC_GA_ID est défini */}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { page_path: window.location.pathname });
              `}
            </Script>
          </>
        )}
        {children}
      </body>
    </html>
  );
}
