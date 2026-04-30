import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog ImmoVerdict — Guides immobilier, LMNP & fiscalité",
  description:
    "Guides pratiques sur l'investissement LMNP, la fiscalité immobilière, le PTZ, le DPE et l'achat de résidence principale. Conseils d'experts, 100 % gratuit.",
  openGraph: {
    title: "Blog ImmoVerdict — Guides immobilier & LMNP",
    description:
      "Tout comprendre sur le LMNP, la fiscalité locative, le PTZ et l'achat immobilier en France.",
    url: "https://immoverdict.com/blog",
    siteName: "ImmoVerdict",
    locale: "fr_FR",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Blog ImmoVerdict" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog ImmoVerdict — Guides immobilier & LMNP",
    description: "LMNP, PTZ, DPE, fiscalité — guides gratuits pour investisseurs et primo-accédants.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://immoverdict.com/blog",
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
