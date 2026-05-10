import Link from "next/link";

export const metadata = {
  title: "Glossaire Immobilier & LMNP — 50 termes expliqués | ImmoVerdict",
  description:
    "Tous les termes de l'immobilier locatif expliqués simplement : LMNP, amortissement, TRI, cash-flow, PTZ, DPE, SCI, plus-value, rendement brut/net, HCSF… Glossaire gratuit.",
  alternates: { canonical: "https://immoverdict.com/glossaire" },
  openGraph: {
    title: "Glossaire Immobilier & LMNP — 50 définitions | ImmoVerdict",
    description:
      "Comprenez tous les termes de l'investissement immobilier : LMNP, amortissement, TRI, PTZ, DPE et 45 autres définitions claires.",
    url: "https://immoverdict.com/glossaire",
  },
};

const TERMES = [
  {
    id: "amortissement",
    terme: "Amortissement (LMNP)",
    categorie: "Fiscalité",
    definition:
      "L'amortissement est la comptabilisation de la dépréciation progressive d'un bien immobilier ou d'un équipement. En LMNP au régime réel, vous pouvez amortir la valeur du bien (hors terrain) sur 25 à 30 ans, et le mobilier sur 5 à 10 ans. Cela génère une charge déductible annuelle (ex : 8 000 €/an pour un bien à 200 000 €) sans décaissement réel — c'est le « bouclier fiscal » du LMNP.",
    lienInterne: "/lmnp",
    lienLabel: "Simuler l'amortissement",
    exConcret: "Un studio à 150 000 € (terrain : 15 000 €) s'amortit sur 30 ans → 4 500 €/an de charge déductible.",
  },
  {
    id: "tri",
    terme: "TRI — Taux de Rendement Interne",
    categorie: "Rentabilité",
    definition:
      "Le TRI est le taux d'actualisation qui rend la valeur actuelle nette (VAN) d'un investissement égale à zéro. En termes simples : c'est le taux de rendement annuel que vous rapporte votre investissement en tenant compte de tous les flux de trésorerie (apport, mensualités, cash-flow annuel, revente nette) sur votre horizon de détention. Un TRI > 6% est généralement considéré comme excellent en LMNP.",
    lienInterne: "/lmnp",
    lienLabel: "Calculer mon TRI",
    exConcret: "Investissement de 30 000 € d'apport, cash-flow de +150 €/mois pendant 20 ans, plus-value nette de 80 000 € → TRI ≈ 7,2%.",
  },
  {
    id: "cash-flow",
    terme: "Cash-flow mensuel",
    categorie: "Rentabilité",
    definition:
      "Le cash-flow est la différence entre les revenus locatifs encaissés et l'ensemble des dépenses liées au bien (mensualité crédit, charges, taxe foncière, assurance, frais de gestion, impôt). Un cash-flow positif signifie que le bien s'autofinance et génère un revenu net mensuel. En LMNP Réel, les amortissements réduisent l'impôt et améliorent souvent le cash-flow de 100 à 300 €/mois.",
    lienInterne: "/lmnp",
    lienLabel: "Calculer mon cash-flow",
    exConcret: "Loyer 800 € − mensualité 620 € − charges 80 € − taxe foncière 83 € − assurance 25 € = cash-flow brut −8 €/mois (mais 0 € d'impôt grâce aux amortissements).",
  },
  {
    id: "rendement-brut",
    terme: "Rendement brut",
    categorie: "Rentabilité",
    definition:
      "Le rendement brut est le ratio entre les loyers annuels perçus et le prix d'acquisition total (prix + frais de notaire + travaux). Il ne tient pas compte des charges, impôts ni remboursement du crédit. Formule : (loyer mensuel × 12) / prix total × 100. C'est l'indicateur de comparaison rapide entre biens — il ne reflète pas la rentabilité réelle.",
    exConcret: "Bien à 200 000 € (FAI + notaire + travaux), loyer 850 €/mois → rendement brut = (850 × 12) / 200 000 = 5,1%.",
  },
  {
    id: "rendement-net",
    terme: "Rendement net",
    categorie: "Rentabilité",
    definition:
      "Le rendement net déduit du rendement brut les charges non récupérables (taxe foncière, frais de gestion, assurances, charges de copropriété, entretien) et l'impôt sur les revenus locatifs. Il est généralement de 1 à 2 points inférieur au rendement brut. Le rendement net-net inclut également l'impact du crédit.",
    exConcret: "Rendement brut 5,1% − charges 1,2% − impôt (LMNP Réel ≈ 0%) = rendement net ≈ 3,9%.",
  },
  {
    id: "lmnp",
    terme: "LMNP — Loueur en Meublé Non Professionnel",
    categorie: "Statut fiscal",
    definition:
      "Le LMNP est un statut fiscal permettant de louer un logement meublé en bénéficiant d'avantages fiscaux. Il s'applique si vos recettes locatives sont inférieures à 23 000 €/an OU représentent moins de 50% de vos revenus globaux. Sous ce statut, vous relevez des BIC (Bénéfices Industriels et Commerciaux) et pouvez opter pour le Micro-BIC (abattement 50%) ou le Réel simplifié (amortissements + charges réelles).",
    lienInterne: "/lmnp",
    lienLabel: "Simuler en LMNP",
  },
  {
    id: "lmp",
    terme: "LMP — Loueur en Meublé Professionnel",
    categorie: "Statut fiscal",
    definition:
      "Le LMP est le statut supérieur au LMNP, applicable si vos recettes locatives dépassent 23 000 €/an ET représentent plus de 50% de vos revenus. Le LMP permet d'imputer les déficits sur le revenu global (et non seulement sur les BIC) et bénéficie d'une exonération de plus-value après 5 ans de détention. En contrepartie, les cotisations sociales (SSI) s'appliquent.",
  },
  {
    id: "micro-bic",
    terme: "Micro-BIC",
    categorie: "Régime fiscal",
    definition:
      "Le Micro-BIC est le régime fiscal simplifié pour les loueurs en meublé. Il applique un abattement forfaitaire de 50% sur les revenus locatifs bruts (71% pour les meublés de tourisme classés). Vous n'avez pas à justifier vos charges réelles — l'abattement est automatique. Il est avantageux si vos charges réelles sont inférieures à 50% des loyers.",
    lienInterne: "/lmnp",
    lienLabel: "Comparer Micro-BIC vs Réel",
    exConcret: "Loyers annuels : 10 000 €. Micro-BIC : imposé sur 5 000 € (abattement 50%). Si TMI 30% → impôt = 1 500 €.",
  },
  {
    id: "regime-reel",
    terme: "Régime réel simplifié (LMNP)",
    categorie: "Régime fiscal",
    definition:
      "Le régime réel permet de déduire toutes les charges réelles (intérêts du crédit, frais de gestion, assurance, taxe foncière, travaux, CFE) ET d'amortir le bien et le mobilier. Grâce aux amortissements, la base imposable est souvent nulle ou négative les 10-15 premières années, permettant un impôt quasi nul sur les revenus locatifs. C'est le régime le plus avantageux pour la plupart des investisseurs.",
    lienInterne: "/lmnp",
    lienLabel: "Simuler au Réel",
  },
  {
    id: "sci-is",
    terme: "SCI à l'IS",
    categorie: "Structure juridique",
    definition:
      "La SCI (Société Civile Immobilière) à l'Impôt sur les Sociétés est une structure juridique permettant de détenir des biens immobiliers à plusieurs. Comme le LMNP Réel, elle permet l'amortissement du bien. Avantages : taux d'IS réduit (15% jusqu'à 42 500 €), transmission facilitée via cession de parts. Inconvénient majeur : la plus-value à la revente est calculée sans déduction des amortissements (fiscalité potentiellement très lourde).",
    lienInterne: "/lmnp",
    lienLabel: "Comparer LMNP vs SCI IS",
  },
  {
    id: "sarl-famille",
    terme: "SARL de famille",
    categorie: "Structure juridique",
    definition:
      "La SARL de famille est une société commerciale réunissant des membres d'une même famille, pouvant opter pour l'imposition sur le revenu (IR) tout en ayant la structure d'une SARL. Elle peut amortir les biens comme une SCI IS, mais les déficits sont imputables sur l'IR des associés. Avantage par rapport à la SCI IS : la plus-value à la revente est calculée selon le régime des particuliers (abattements pour durée de détention).",
  },
  {
    id: "plus-value",
    terme: "Plus-value immobilière",
    categorie: "Fiscalité",
    definition:
      "La plus-value est la différence entre le prix de vente et le prix d'achat (augmenté des frais de notaire et travaux justifiés). En LMNP (nom propre), la plus-value est taxée comme celle des particuliers : 19% d'IR + 17,2% de prélèvements sociaux = 36,2%, avec des abattements progressifs pour durée de détention (exonération totale après 22 ans pour l'IR, 30 ans pour les PS). Contrairement à la SCI IS, les amortissements LMNP ne minorent pas le prix d'achat.",
    exConcret: "Bien acheté 200 000 € revendu 280 000 € après 15 ans → plus-value brute 80 000 €, abattements 60% → base imposable 32 000 €.",
  },
  {
    id: "hcsf",
    terme: "HCSF — Haut Conseil de Stabilité Financière",
    categorie: "Crédit",
    definition:
      "Le HCSF est l'autorité française qui fixe les règles prudentielles applicables aux crédits immobiliers. Depuis 2022, ses recommandations ont force obligatoire : taux d'endettement maximum de 35% des revenus bruts (assurance incluse) et durée maximale de 25 ans (27 ans avec différé dans le neuf). Pour le LMNP, les banques retiennent généralement 70% des loyers dans le calcul des revenus.",
    lienInterne: "/lmnp",
    lienLabel: "Calculer mon taux d'endettement",
    exConcret: "Revenus nets 4 000 €/mois. HCSF : mensualité max = 4 000 × 35% = 1 400 €/mois toutes dettes confondues.",
  },
  {
    id: "taux-endettement",
    terme: "Taux d'endettement",
    categorie: "Crédit",
    definition:
      "Le taux d'endettement (ou ratio d'endettement) mesure la part des revenus bruts absorbée par les remboursements de crédits (immobiliers + à la consommation + crédit bail). Limité à 35% par le HCSF. Pour un investissement locatif, les banques appliquent la méthode de la compensation différentielle : elles comparent loyers perçus − mensualité crédit et n'intègrent que la différence positive dans le calcul.",
  },
  {
    id: "ptz",
    terme: "PTZ — Prêt à Taux Zéro",
    categorie: "Financement",
    definition:
      "Le PTZ est un prêt sans intérêts accordé par l'État aux primo-accédants pour financer leur résidence principale. En 2026, il est étendu à tout le territoire pour le neuf et aux zones tendues pour l'ancien avec travaux (< classe D). Son montant dépend de la zone géographique, des revenus et de la composition du foyer. Il n'est pas utilisable pour un investissement locatif pur.",
    lienInterne: "/rp",
    lienLabel: "Simuler mon PTZ",
  },
  {
    id: "dpe",
    terme: "DPE — Diagnostic de Performance Énergétique",
    categorie: "Réglementation",
    definition:
      "Le DPE classe les logements de A (très économe, < 70 kWh/m²/an) à G (passoire thermique, > 420 kWh/m²/an). Il est obligatoire lors de toute vente ou mise en location. Les logements classés G sont interdits à la location depuis le 1er janvier 2025. Les F seront interdits en 2028, les E en 2034. Un mauvais DPE impacte la valeur du bien, sa louabilité et peut contraindre à des travaux de rénovation.",
    lienInterne: "/rp",
    lienLabel: "Estimer le budget travaux DPE",
    exConcret: "Un logement DPE G de 60 m² ne peut plus être mis en location depuis 2025. Le propriétaire doit rénover (isolation, chauffage) ou vendre.",
  },
  {
    id: "vacance-locative",
    terme: "Vacance locative",
    categorie: "Gestion locative",
    definition:
      "La vacance locative désigne la période pendant laquelle un logement reste inoccupé entre deux locataires (ou en attente d'un premier locataire). Elle représente un manque à gagner et s'exprime généralement en % du temps annuel. En zone tendue, elle est souvent < 2%. En zone rurale ou moins demandée, elle peut dépasser 10%. Elle est intégrée dans le calcul du rendement net.",
    exConcret: "Vacance de 5% sur un loyer de 800 €/mois = 800 × 5% × 12 = 480 €/an perdus.",
  },
  {
    id: "charges-recuperables",
    terme: "Charges récupérables",
    categorie: "Gestion locative",
    definition:
      "Les charges récupérables sont les dépenses supportées par le propriétaire qu'il peut refacturer au locataire. Elles sont fixées par décret (décret du 26 août 1987) : eau froide, chauffage collectif, ascenseur, entretien des parties communes, taxe d'enlèvement des ordures ménagères (TEOM)… Le propriétaire en avance le montant via les provisions sur charges et régularise annuellement.",
  },
  {
    id: "taxe-fonciere",
    terme: "Taxe foncière",
    categorie: "Fiscalité",
    definition:
      "La taxe foncière est un impôt local annuel dû par le propriétaire d'un bien immobilier, qu'il l'occupe ou le loue. Elle est calculée sur la valeur locative cadastrale du bien, multipliée par les taux votés par la commune et le département. Elle est entièrement déductible des revenus locatifs au régime réel. Elle a fortement augmenté ces dernières années (+52% à Paris entre 2020 et 2025).",
  },
  {
    id: "cfe",
    terme: "CFE — Cotisation Foncière des Entreprises",
    categorie: "Fiscalité",
    definition:
      "La CFE est une taxe locale due par les entreprises et les loueurs en meublé au titre de leur activité commerciale. En LMNP, la CFE est due dès la première année de location meublée. Son montant varie selon la commune (généralement 200 à 800 €/an). Elle est déductible des revenus BIC au régime réel.",
    exConcret: "CFE moyenne pour un LMNP : 300 €/an. Déductible intégralement au régime réel → économie fiscale de 90 € si TMI 30%.",
  },
  {
    id: "frais-notaire",
    terme: "Frais de notaire",
    categorie: "Acquisition",
    definition:
      "Les frais de notaire (ou « droits d'acquisition ») représentent 7 à 8% du prix de vente dans l'ancien et 2 à 3% dans le neuf. Ils comprennent les droits de mutation (taxe perçue par l'État et les collectivités), les émoluments du notaire et les débours. En LMNP Réel, une partie des frais de notaire peut être incorporée à la valeur amortissable du bien.",
    exConcret: "Bien à 200 000 € dans l'ancien → frais de notaire ≈ 15 000 €. Prix de revient total : 215 000 €.",
  },
  {
    id: "apport-personnel",
    terme: "Apport personnel",
    categorie: "Financement",
    definition:
      "L'apport personnel est la somme que l'investisseur apporte de ses propres fonds (épargne, donation, revente d'un autre bien) pour financer une partie de l'acquisition. Les banques exigent généralement un apport minimum de 10% (pour couvrir les frais de notaire) à 20% pour obtenir les meilleures conditions de crédit. En LMNP, certains investisseurs optent pour un financement à 110% (sans apport) pour maximiser l'effet de levier.",
  },
  {
    id: "effet-levier",
    terme: "Effet de levier",
    categorie: "Stratégie",
    definition:
      "L'effet de levier consiste à utiliser l'emprunt pour amplifier le rendement de ses capitaux propres. En immobilier, un investisseur qui apporte 30 000 € pour acheter un bien à 200 000 € (+ 170 000 € de crédit) bénéficie de la rentabilité d'un bien 6,7 fois plus grand que son apport. Si le bien prend 10% de valeur (+20 000 €), le rendement sur l'apport est de 67% — c'est l'effet de levier.",
  },
  {
    id: "interets-credit",
    terme: "Intérêts d'emprunt",
    categorie: "Crédit",
    definition:
      "Les intérêts d'emprunt sont la rémunération versée à la banque pour le prêt accordé. En LMNP Réel, ils sont intégralement déductibles des revenus locatifs. En début de prêt, ils représentent une grande part des mensualités (amortissement lent du capital). Sur un crédit de 170 000 € à 3,4% sur 20 ans, les intérêts totaux représentent environ 63 000 €.",
  },
  {
    id: "assurance-emprunteur",
    terme: "Assurance emprunteur (ADI)",
    categorie: "Crédit",
    definition:
      "L'assurance décès-invalidité (ADI) est exigée par les banques pour tout crédit immobilier. Elle garantit le remboursement du prêt en cas de décès, invalidité ou incapacité de travail. Son coût (TAEA : 0,20 à 0,50%/an) s'ajoute au taux nominal du crédit. La loi Lemoine (2022) permet de changer d'assureur à tout moment, ce qui peut générer des économies de 5 000 à 15 000 €.",
  },
  {
    id: "pno",
    terme: "PNO — Assurance Propriétaire Non Occupant",
    categorie: "Gestion locative",
    definition:
      "L'assurance PNO protège le propriétaire bailleur contre les risques non couverts par l'assurance habitation du locataire (dégâts des eaux, incendie si le logement est vacant, recours des tiers…). Elle est fortement recommandée et souvent obligatoire dans les copropriétés. Son coût est de 100 à 250 €/an — entièrement déductible au régime réel.",
  },
  {
    id: "gestion-locative",
    terme: "Frais de gestion locative",
    categorie: "Gestion locative",
    definition:
      "Les frais de gestion locative sont les honoraires versés à une agence immobilière ou une société de gestion pour s'occuper de la mise en location, de l'encaissement des loyers, des états des lieux et de la gestion courante. Ils représentent généralement 5 à 10% des loyers annuels (+ TVA). Ils sont déductibles intégralement au régime réel.",
    exConcret: "Loyers : 10 000 €/an. Frais de gestion 8% = 800 €/an de charge déductible.",
  },
  {
    id: "caution",
    terme: "Dépôt de garantie (caution)",
    categorie: "Gestion locative",
    definition:
      "Le dépôt de garantie est une somme versée par le locataire à l'entrée des lieux pour couvrir les éventuelles dégradations en fin de bail. Pour une location meublée, il est limité à 2 mois de loyer hors charges. Il doit être restitué dans les 2 mois suivant la remise des clés (1 mois si état des lieux conforme). Il n'est pas un revenu pour le propriétaire — il est conservé en compte.",
  },
  {
    id: "bail-meuble",
    terme: "Bail meublé",
    categorie: "Juridique",
    definition:
      "Le bail meublé est un contrat de location portant sur un logement équipé des meubles et équipements nécessaires à la vie courante (liste fixée par décret : literie, cuisine équipée, mobilier de salon…). Sa durée est de 1 an (9 mois pour les étudiants), renouvelable tacitement. Le préavis du locataire est de 1 mois (contre 3 mois en nu). La durée courte favorise la gestion active.",
  },
  {
    id: "meuble-tourisme",
    terme: "Meublé de tourisme classé",
    categorie: "Statut fiscal",
    definition:
      "Un meublé de tourisme classé est un logement ayant obtenu une classification officielle (1 à 5 étoiles) délivrée par un organisme agréé Atout France. Ce classement permet de bénéficier d'un abattement Micro-BIC de 71% au lieu de 50%, et d'un plafond porté à 77 700 € de recettes. Il est particulièrement intéressant pour les gîtes et locations saisonnières.",
  },
  {
    id: "copropriete",
    terme: "Charges de copropriété",
    categorie: "Gestion locative",
    definition:
      "Les charges de copropriété sont les dépenses liées aux parties communes d'un immeuble (entretien, gardiennage, assurance immeuble, ravalement…). Elles se distinguent en charges courantes (provisionnées et régularisées annuellement) et charges exceptionnelles (travaux votés en AG). Seules les charges non récupérables sur le locataire sont déductibles au régime réel.",
  },
  {
    id: "dvf",
    terme: "DVF — Demande de Valeurs Foncières",
    categorie: "Marché",
    definition:
      "Le DVF est la base de données officielle du gouvernement (DGFiP) recensant toutes les transactions immobilières réalisées en France au cours des 5 dernières années. Il permet de vérifier les prix de vente réels dans un secteur donné et de valider le prix demandé pour un bien. Il est accessible gratuitement sur data.gouv.fr et intégré dans le simulateur ImmoVerdict.",
    lienInterne: "/rp",
    lienLabel: "Consulter les prix DVF",
  },
  {
    id: "van",
    terme: "VAN — Valeur Actuelle Nette",
    categorie: "Rentabilité",
    definition:
      "La VAN est la valeur actuelle de tous les flux de trésorerie futurs d'un investissement, actualisés à un taux de référence (souvent le taux sans risque ou le coût du capital). Une VAN positive signifie que l'investissement crée de la valeur au-delà du taux de référence. Le TRI est le taux qui rend la VAN nulle.",
  },
  {
    id: "tmi",
    terme: "TMI — Tranche Marginale d'Imposition",
    categorie: "Fiscalité",
    definition:
      "La TMI est le taux d'imposition qui s'applique à la dernière tranche de vos revenus. En France, les tranches 2026 sont : 0% (< 11 295 €), 11% (11 295–28 797 €), 30% (28 797–82 341 €), 41% (82 341–177 106 €), 45% (> 177 106 €). En LMNP, c'est votre TMI qui détermine l'impôt sur les revenus locatifs taxables. Les amortissements permettent de réduire cette assiette fiscale.",
  },
  {
    id: "prelevements-sociaux",
    terme: "Prélèvements sociaux (PS)",
    categorie: "Fiscalité",
    definition:
      "Les prélèvements sociaux (aussi appelés cotisations sociales dans certains contextes) représentent 17,2% des revenus du patrimoine en France (CSG 9,2% + CRDS 0,5% + prélèvement de solidarité 7,5%). Ils s'appliquent aux revenus locatifs taxables et aux plus-values immobilières. En LMNP Réel, ils s'appliquent uniquement sur le bénéfice fiscal (souvent nul grâce aux amortissements).",
  },
  {
    id: "deficit-foncier",
    terme: "Déficit foncier",
    categorie: "Fiscalité",
    definition:
      "Le déficit foncier concerne la location nue (revenus fonciers). Il se crée lorsque les charges déductibles (travaux, intérêts du crédit, charges de copropriété) dépassent les loyers. Le déficit est imputable sur le revenu global dans la limite de 10 750 €/an (doublé à 21 500 € pour les travaux de rénovation énergétique jusqu'en 2025). L'excédent est reportable 10 ans sur les revenus fonciers. En LMNP (BIC), ce mécanisme ne s'applique pas — les déficits BIC ne sont imputables que sur les BIC.",
  },
  {
    id: "maturite-investissement",
    terme: "Horizon d'investissement",
    categorie: "Stratégie",
    definition:
      "L'horizon d'investissement est la durée pendant laquelle vous prévoyez de conserver le bien avant de le revendre. Il est crucial pour le calcul du TRI et de la plus-value. En LMNP, les amortissements sont les plus efficaces fiscalement pendant les 10-15 premières années. L'abattement sur plus-value pour durée de détention n'est total qu'après 22 ans (IR) et 30 ans (PS).",
    lienInterne: "/lmnp",
    lienLabel: "Simuler sur mon horizon",
  },
  {
    id: "mапrimе",
    id: "maprimerenov",
    terme: "MaPrimeRénov'",
    categorie: "Aides",
    definition:
      "MaPrimeRénov' est une aide de l'État pour financer les travaux de rénovation énergétique. Elle est accessible aux propriétaires occupants et bailleurs. Pour les bailleurs, elle est conditionnée à la location du bien pendant 5 ans après travaux et à l'engagement de pratiquer des loyers conventionnés (Anah). Le montant dépend des travaux réalisés et des revenus du propriétaire.",
  },
  {
    id: "cee",
    terme: "CEE — Certificats d'Économies d'Énergie",
    categorie: "Aides",
    definition:
      "Les CEE sont des aides financières accordées par les fournisseurs d'énergie aux particuliers qui réalisent des travaux d'économies d'énergie. Ils se cumulent avec MaPrimeRénov'. Les travaux éligibles : isolation, pompe à chaleur, chaudière à condensation, ventilation… Le montant varie selon les travaux et la surface. Un outil de simulation est disponible sur le site du gouvernement (faire-economies.fr).",
  },
  {
    id: "louer-vide",
    terme: "Location nue (revenus fonciers)",
    categorie: "Statut fiscal",
    definition:
      "La location nue est la mise en location d'un bien sans mobilier. Elle relève du régime des revenus fonciers (et non des BIC). Deux régimes sont possibles : Micro-foncier (abattement 30%, plafonné à 15 000 € de revenus) et Réel (charges déductibles + possible déficit foncier). Contrairement au LMNP, il est impossible d'amortir le bien en location nue.",
  },
  {
    id: "proprietaire-bailleur",
    terme: "Propriétaire bailleur",
    categorie: "Juridique",
    definition:
      "Le propriétaire bailleur est une personne physique ou morale qui détient un bien immobilier et le loue à un tiers (le locataire). Il a des obligations légales : logement décent, diagnostics obligatoires (DPE, amiante, plomb…), assurance PNO, entretien du bien, remise des quittances de loyer. En LMNP, il bénéficie du régime fiscal BIC avec possibilité d'amortissements.",
  },
  {
    id: "surface-habitable",
    terme: "Surface habitable (Loi Boutin)",
    categorie: "Juridique",
    definition:
      "La surface habitable est la surface de plancher construite d'un logement, après déduction des surfaces occupées par les murs, cloisons, marches, cages d'escalier, gaines, embrasures de portes et fenêtres, et des parties dont la hauteur est inférieure à 1,80 m (loi Boutin, 2009). Elle doit obligatoirement figurer dans le bail de location. Ne pas confondre avec la surface Carrez (copropriété) qui inclut les parties < 1,80 m jusqu'à 8 m².",
  },
  {
    id: "encadrement-loyers",
    terme: "Encadrement des loyers",
    categorie: "Réglementation",
    definition:
      "L'encadrement des loyers est un dispositif qui limite les loyers dans les zones tendues. Il fixe un loyer de référence (par type de bien, quartier et période de construction) et un loyer de référence majoré (= loyer de référence + 20%). En meublé, le locataire peut appliquer un complément si le logement présente des caractéristiques exceptionnelles. En vigueur à Paris, Lille, Lyon, Bordeaux, Montpellier (partiel) et quelques autres.",
  },
  {
    id: "zone-tendue",
    terme: "Zone tendue",
    categorie: "Marché",
    definition:
      "Une zone tendue est une agglomération de plus de 50 000 habitants où l'offre de logements est structurellement inférieure à la demande, créant des tensions sur les loyers et les prix. Les zones tendues bénéficient de règles spécifiques : préavis réduit à 1 mois pour le locataire, taxe sur les logements vacants (TLV), PTZ étendu dans l'ancien, application possible de l'encadrement des loyers.",
  },
  {
    id: "loyer-reference",
    terme: "Loyer de référence",
    categorie: "Réglementation",
    definition:
      "Le loyer de référence est le loyer médian calculé par arrêté préfectoral pour chaque type de logement (nombre de pièces, période de construction, quartier) dans les zones soumises à l'encadrement des loyers. Le loyer fixé par le bailleur ne peut dépasser le loyer de référence majoré (= loyer de référence × 1,20). À Paris, il est consultable sur le simulateur officiel de la Ville.",
  },
  {
    id: "etat-des-lieux",
    terme: "État des lieux",
    categorie: "Gestion locative",
    definition:
      "L'état des lieux est un document contradictoire établi à l'entrée et à la sortie du locataire, décrivant l'état précis du logement et de ses équipements. Il est obligatoire et doit être réalisé en présence des deux parties (ou d'huissier). La comparaison entre l'état des lieux d'entrée et de sortie permet de déterminer les éventuelles retenues sur le dépôt de garantie.",
  },
  {
    id: "indexation-loyer",
    terme: "IRL — Indice de Référence des Loyers",
    categorie: "Gestion locative",
    definition:
      "L'IRL est l'indice officiel publié trimestriellement par l'INSEE qui permet de réviser les loyers en cours de bail. La révision est plafonnée à l'évolution de l'IRL et ne peut intervenir qu'une fois par an, à la date prévue dans le bail. En 2024, l'IRL a progressé de +2,4% sur un an. L'utilisation de l'IRL est obligatoire pour les révisions de loyers.",
  },
  {
    id: "valeur-locative",
    terme: "Valeur locative cadastrale",
    categorie: "Fiscalité",
    definition:
      "La valeur locative cadastrale (VLC) est une valeur théorique fixée par l'administration fiscale, censée représenter le loyer annuel que le logement pourrait générer. Elle sert de base au calcul de la taxe foncière et de la taxe d'habitation. Elle est généralement très inférieure au loyer de marché réel (souvent 50 à 70% de moins). Elle est revalorisée chaque année par un coefficient voté en loi de finances.",
  },
  {
    id: "plan-financement",
    terme: "Plan de financement",
    categorie: "Financement",
    definition:
      "Le plan de financement est le tableau récapitulatif qui détaille l'ensemble des ressources (apport personnel, crédits, PTZ, aides) et des emplois (prix d'acquisition, frais de notaire, travaux, mobilier) d'un projet immobilier. C'est le document central du dossier de demande de crédit. Notre simulateur LMNP génère automatiquement un plan de financement complet au format PDF.",
    lienInterne: "/lmnp",
    lienLabel: "Générer mon dossier bancaire",
  },
  {
    id: "tableau-amortissement",
    terme: "Tableau d'amortissement du crédit",
    categorie: "Crédit",
    definition:
      "Le tableau d'amortissement est le document fourni par la banque qui détaille, mois par mois, la répartition de chaque mensualité entre remboursement du capital et paiement des intérêts. En début de prêt, la part des intérêts est maximale (avantage fiscal maximal en LMNP Réel). La part du capital augmente progressivement jusqu'à la dernière mensualité.",
    lienInterne: "/lmnp",
    lienLabel: "Voir le tableau dans le simulateur",
  },
  {
    id: "residence-principale",
    terme: "Résidence principale",
    categorie: "Juridique",
    definition:
      "La résidence principale est le logement qu'un contribuable occupe de manière habituelle et effective au moins 8 mois par an. Elle bénéficie d'avantages fiscaux spécifiques : exonération totale de plus-value à la revente, PTZ pour les primo-accédants, abattement taxe foncière dans certaines communes. La distinction résidence principale / secondaire / investissement locatif conditionne de nombreux régimes fiscaux.",
    lienInterne: "/rp",
    lienLabel: "Simuler votre résidence principale",
  },
  {
    id: "primo-accedant",
    terme: "Primo-accédant",
    categorie: "Acquisition",
    definition:
      "Un primo-accédant est une personne qui acquiert pour la première fois sa résidence principale, ou qui n'a pas été propriétaire de sa résidence principale au cours des 2 dernières années. Ce statut donne accès à des avantages spécifiques : PTZ (Prêt à Taux Zéro), TVA réduite dans certains quartiers ANRU, exonération de droits de mutation dans quelques communes.",
    lienInterne: "/rp",
    lienLabel: "Calculer mon PTZ",
  },
];

const CATEGORIES = [...new Set(TERMES.map(t => t.categorie))];

/* ── Composants ── */
function CategorieBadge({ cat }) {
  const COLORS = {
    "Fiscalité":        "#F59E0B",
    "Rentabilité":      "#22C55E",
    "Crédit":           "#3B82F6",
    "Statut fiscal":    "#8B5CF6",
    "Régime fiscal":    "#7C3AED",
    "Structure juridique": "#EC4899",
    "Gestion locative": "#14B8A6",
    "Financement":      "#F97316",
    "Réglementation":   "#EF4444",
    "Marché":           "#06B6D4",
    "Juridique":        "#64748B",
    "Acquisition":      "#A3E635",
    "Aides":            "#10B981",
    "Stratégie":        "#6366F1",
  };
  const c = COLORS[cat] ?? "#94A3B8";
  return (
    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: c + "22", color: c, border: `1px solid ${c}44` }}>
      {cat}
    </span>
  );
}

export default function GlossairePage() {
  const jsonLdItems = TERMES.map(t => ({
    "@type": "DefinedTerm",
    name: t.terme,
    description: t.definition.slice(0, 200),
    inDefinedTermSet: "https://immoverdict.com/glossaire",
  }));

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "Glossaire Immobilier & LMNP — ImmoVerdict",
    description: "50 définitions des termes clés de l'immobilier locatif, de la fiscalité LMNP et du financement immobilier.",
    url: "https://immoverdict.com/glossaire",
    hasDefinedTerm: jsonLdItems,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30 pb-20">
        {/* Nav */}
        <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100 px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-orange-500 font-bold text-sm">ImmoVerdict</Link>
          <span className="text-slate-300">›</span>
          <span className="text-slate-900 text-sm font-medium">Glossaire</span>
        </nav>

        <div className="max-w-3xl mx-auto px-4 pt-8">
          {/* Hero */}
          <header className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">
              Glossaire Immobilier & LMNP
            </h1>
            <p className="text-slate-600 text-base leading-relaxed mb-4">
              {TERMES.length} termes clés de l&apos;investissement locatif, de la fiscalité LMNP et du financement immobilier expliqués clairement — avec des exemples concrets.
            </p>
            {/* Index alphabétique par catégorie */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <a key={c} href={`#cat-${c.replace(/\s/g, "-")}`}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-orange-100 hover:text-orange-700 transition-colors">
                  {c}
                </a>
              ))}
            </div>
          </header>

          {/* Contenu groupé par catégorie */}
          {CATEGORIES.map(cat => {
            const termesCategorie = TERMES.filter(t => t.categorie === cat);
            return (
              <section key={cat} id={`cat-${cat.replace(/\s/g, "-")}`} className="mb-10">
                <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <CategorieBadge cat={cat} />
                  <span>{cat}</span>
                  <span className="text-[11px] text-slate-400 font-normal">{termesCategorie.length} terme{termesCategorie.length > 1 ? "s" : ""}</span>
                </h2>
                <div className="space-y-4">
                  {termesCategorie.map(t => (
                    <article key={t.id} id={t.id}
                      className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm scroll-mt-16">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-sm font-bold text-slate-900">{t.terme}</h3>
                        <CategorieBadge cat={t.categorie} />
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed mb-2">{t.definition}</p>
                      {t.exConcret && (
                        <div className="rounded-lg bg-orange-50 border border-orange-100 px-3 py-2 mt-2">
                          <p className="text-[11px] text-orange-700 leading-relaxed">
                            <span className="font-bold">Exemple : </span>{t.exConcret}
                          </p>
                        </div>
                      )}
                      {t.lienInterne && (
                        <div className="mt-2.5">
                          <Link href={t.lienInterne}
                            className="text-[11px] font-semibold text-orange-500 hover:text-orange-700 flex items-center gap-1">
                            → {t.lienLabel}
                          </Link>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            );
          })}

          {/* CTA final */}
          <section className="rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white shadow-lg mb-8">
            <h2 className="text-lg font-bold mb-2">Simulez votre investissement LMNP</h2>
            <p className="text-sm opacity-90 mb-4">
              Mettez ces concepts en pratique : TRI, cash-flow, amortissements, 4 régimes fiscaux comparés. Gratuit et sans inscription.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/lmnp"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-orange-600 shadow-sm hover:shadow-md transition-shadow">
                Simulateur LMNP →
              </Link>
              <Link href="/rp"
                className="inline-flex items-center gap-2 rounded-xl bg-white/20 border border-white/40 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/30 transition-colors">
                Résidence principale
              </Link>
            </div>
          </section>

          {/* Maillage interne */}
          <nav className="text-center space-x-4 text-sm text-slate-400">
            <Link href="/lmnp/comparer" className="hover:text-orange-500">Comparer les régimes LMNP</Link>
            <span>·</span>
            <Link href="/blog" className="hover:text-orange-500">Blog ImmoVerdict</Link>
            <span>·</span>
            <Link href="/a-propos" className="hover:text-orange-500">À propos</Link>
          </nav>
        </div>
      </main>
    </>
  );
}
