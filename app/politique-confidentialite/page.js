import { redirect } from "next/navigation";

// La politique de confidentialité complète est intégrée dans les mentions légales.
// On redirige vers la section RGPD dédiée (#politique-confidentialite).
export default function PolitiqueConfidentialite() {
  redirect("/mentions-legales#politique-confidentialite");
}

export const metadata = {
  title: "Politique de confidentialité — ImmoVerdict",
  description:
    "Politique de confidentialité d'ImmoVerdict : données collectées, droits RGPD, durée de conservation. Contact : aulve39@gmail.com",
  alternates: {
    canonical: "https://immoverdict.com/politique-confidentialite",
  },
  robots: { index: false, follow: true },
};
