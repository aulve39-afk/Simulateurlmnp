import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Simulateur Résidence Principale — PTZ, DPE, DVF, Louer vs Acheter | ImmoVerdict",
  description:
    "Calculez votre capacité d'emprunt, simulez votre PTZ 2026, analysez le DPE & budget travaux, consultez les prix DVF et comparez louer vs acheter. Gratuit.",
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

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Qu'est-ce que le PTZ en 2026 ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Le Prêt à Taux Zéro (PTZ) est un prêt sans intérêts accordé aux primo-accédants pour l'achat de leur résidence principale. En 2026, le PTZ est étendu à tout le territoire pour les logements neufs, et aux zones tendues pour les logements anciens avec travaux. Son montant dépend de la zone géographique, de la composition du foyer et des revenus.",
      },
    },
    {
      "@type": "Question",
      name: "Comment calculer sa capacité d'emprunt immobilier ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "La capacité d'emprunt se calcule en appliquant la règle HCSF : vos mensualités ne peuvent dépasser 35 % de vos revenus nets mensuels (assurance comprise). Avec un salaire de 3 000 €/mois, vous pouvez emprunter environ 1 050 €/mois de mensualité. Notre simulateur calcule automatiquement votre capacité maximale, le montant PTZ auquel vous avez droit, et la durée optimale.",
      },
    },
    {
      "@type": "Question",
      name: "C'est quoi le DPE et pourquoi est-il important ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Le Diagnostic de Performance Énergétique (DPE) classe les logements de A (très économe) à G (passoire thermique). Les logements F et G sont progressivement interdits à la location (G dès 2025, F en 2028). Un mauvais DPE impacte la valeur du bien, sa louabilité et peut nécessiter des travaux de rénovation énergétique coûteux.",
      },
    },
    {
      "@type": "Question",
      name: "Vaut-il mieux louer ou acheter sa résidence principale ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Cela dépend de votre horizon de vie dans le logement, du rapport prix/loyer local et des taux d'intérêt. Acheter est généralement avantageux si vous restez plus de 5 à 7 ans. En dessous, les frais de notaire et les intérêts du crédit font que la location est souvent plus rentable. Notre calculateur louer vs acheter compare les deux scenarios avec vos chiffres.",
      },
    },
    {
      "@type": "Question",
      name: "Qu'est-ce que le DVF et comment l'utiliser pour acheter ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Le DVF (Demande de Valeurs Foncières) est la base de données officielle du gouvernement recensant toutes les transactions immobilières réelles en France. Il permet de vérifier si le prix demandé pour un bien est cohérent avec les ventes récentes du quartier. Accessible gratuitement sur notre simulateur, il vous évite de surpayer.",
      },
    },
    {
      "@type": "Question",
      name: "Quel apport faut-il pour acheter en 2026 ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Les banques demandent généralement un apport d'au moins 10 % du prix d'achat pour couvrir les frais de notaire (7 à 8 % dans l'ancien, 2 à 3 % dans le neuf). Un apport de 20 % améliore significativement les conditions de prêt. Le PTZ peut compter comme apport pour certaines banques, ce qui réduit le besoin en épargne personnelle.",
      },
    },
    {
      "@type": "Question",
      name: "Comment estimer le budget travaux pour rénover un logement mal classé DPE ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Le coût d'une rénovation énergétique varie selon l'ampleur des travaux : isolation des combles (1 500 à 3 000 €), isolation des murs (100 à 200 €/m²), changement de chauffage (5 000 à 15 000 €). Pour passer un logement de G à C, comptez en moyenne 20 000 à 50 000 € selon la surface. Des aides (MaPrimeRénov', CEE) peuvent couvrir 30 à 70 % du montant.",
      },
    },
    {
      "@type": "Question",
      name: "Le simulateur ImmoVerdict est-il vraiment gratuit ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Oui, ImmoVerdict est 100 % gratuit et sans inscription. Le simulateur LMNP (4 régimes fiscaux, TRI, cash-flow, dossier bancaire PDF) et le simulateur Résidence Principale (PTZ, DPE, DVF, louer vs acheter) sont accessibles immédiatement, sans création de compte.",
      },
    },
  ],
};

export default function RpLayout({
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
