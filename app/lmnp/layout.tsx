import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Simulateur LMNP — 4 régimes fiscaux comparés | ImmoVerdict",
  description:
    "Calculez votre TRI, cash-flow et impôt LMNP selon 4 régimes : Micro-BIC, Réel simplifié, SARL de famille, SCI IS. Amortissements, règle HCSF, LF 2026. 100 % gratuit.",
  openGraph: {
    title: "Simulateur LMNP — 4 régimes fiscaux comparés | ImmoVerdict",
    description:
      "TRI, cash-flow, amortissements, dossier bancaire — tout pour analyser votre investissement LMNP en 2 minutes.",
    url: "https://immoverdict.com/lmnp",
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
    canonical: "https://immoverdict.com/lmnp",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Qu'est-ce que le statut LMNP ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Le statut LMNP (Loueur en Meublé Non Professionnel) permet de louer un bien meublé tout en bénéficiant d'avantages fiscaux. Il s'applique si vos recettes locatives sont inférieures à 23 000 € par an ou représentent moins de 50 % de vos revenus globaux.",
      },
    },
    {
      "@type": "Question",
      name: "Quelle est la différence entre Micro-BIC et Réel simplifié en LMNP ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Le Micro-BIC applique un abattement forfaitaire de 50 % sur vos loyers (71 % en meublé de tourisme classé). Le Réel simplifié permet de déduire vos charges réelles et d'amortir le bien et le mobilier, ce qui génère souvent une imposition nulle ou très faible. Le Réel est généralement plus avantageux pour les biens de valeur.",
      },
    },
    {
      "@type": "Question",
      name: "Qu'est-ce que l'amortissement en LMNP ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "L'amortissement consiste à déduire chaque année une fraction de la valeur du bien (hors terrain) et du mobilier de vos revenus locatifs. Un bien à 200 000 € s'amortit sur 25 à 30 ans, soit 6 000 à 8 000 € de charges déductibles par an, sans sortie de trésorerie réelle.",
      },
    },
    {
      "@type": "Question",
      name: "LMNP ou SCI à l'IS : lequel choisir ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Le LMNP en nom propre (Réel) est idéal pour 1 à 3 biens : simplicité, amortissements, pas de double imposition. La SCI à l'IS est pertinente pour un patrimoine important, un horizon long ou une logique de transmission, mais les plus-values à la revente sont calculées sans tenir compte des amortissements, ce qui peut créer une fiscalité élevée.",
      },
    },
    {
      "@type": "Question",
      name: "Comment calculer le TRI d'un investissement LMNP ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Le TRI (Taux de Rendement Interne) prend en compte les cash-flows annuels nets (loyers - charges - impôt - remboursement crédit) et la plus-value nette à la revente. Notre simulateur LMNP le calcule automatiquement sur votre horizon d'investissement.",
      },
    },
    {
      "@type": "Question",
      name: "Peut-on cumuler LMNP et résidence principale ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Oui. Le statut LMNP s'applique aux biens loués meublés qui ne sont pas votre résidence principale. Vous pouvez tout à fait être propriétaire de votre résidence principale et louer un ou plusieurs biens sous le statut LMNP.",
      },
    },
    {
      "@type": "Question",
      name: "Quels sont les 4 régimes fiscaux comparés par le simulateur ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Le simulateur ImmoVerdict compare : (1) Micro-BIC — abattement 50 %, simple mais souvent moins avantageux ; (2) Réel simplifié — charges réelles + amortissements, optimal pour la plupart des investisseurs ; (3) SARL de famille — structure sociétaire avec IS, intéressante pour les familles ; (4) SCI à l'IS — holding patrimoniale, logique de long terme.",
      },
    },
    {
      "@type": "Question",
      name: "Qu'est-ce que la règle HCSF et comment affecte-t-elle un investissement LMNP ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "La règle HCSF (Haut Conseil de Stabilité Financière) limite le taux d'endettement à 35 % des revenus bruts et la durée du crédit à 25 ans. Pour le LMNP, les banques prennent généralement en compte 70 % des loyers perçus dans vos revenus, ce qui améliore votre capacité d'emprunt par rapport à un investissement nu.",
      },
    },
  ],
};

export default function LmnpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {children}
    </>
  );
}
