# Séquence Email ImmoVerdict — Resend
**Version 2.0 — 6 emails sur 30 jours**

> Audience : investisseurs immobiliers ayant simulé un bien en LMNP sur ImmoVerdict  
> Objectif : conversion vers les partenaires courtiers Pretto / MeilleurTaux / CAFPI  
> Plateforme : Resend (transactionnel) + audiences segmentées

---

## Vue d'ensemble

| # | Jour | Objet (option retenue) | But | CTA principal | Condition |
|---|------|------------------------|-----|---------------|-----------|
| 1 | J+0 | Votre simulation LMNP est prête 🏠 | Welcome + livraison résultats | Voir ma simulation | Tous |
| 2 | J+1 | LMNP Réel vs Micro-BIC : lequel vous convient ? | Éduquer, garder l'engagement | Comparer les régimes | Tous |
| 3 | J+3 | Votre taux de crédit peut changer tout | 1ère relance courtier (soft) | Obtenir mon taux gratuit | N'a pas cliqué J+1 CTA |
| 4 | J+7 | Les investisseurs qui ont optimisé leur financement ont fait ça | Preuve sociale + urgence | Être mis en relation | N'a pas converti |
| 5 | J+14 | [NOUVEAU] On a vérifié votre dossier — voici ce qu'on a trouvé | Relance courtier personnalisée | Valider mon dossier | N'a pas converti |
| 6 | J+30 | 3 nouvelles fonctions sur ImmoVerdict (dont une pour vous) | Réactivation + nouvelles features | Retester avec les nouveautés | Tous (inactifs 21j+) |

---

## Email 1 — J+0 : Welcome + résultats simulation

### Objet (3 options)
- **A** : `Votre simulation LMNP est prête 🏠` *(principal — bénéfice direct)*
- B : `{{first_name}}, votre bien vaut-il le coup ?` *(curiosité + perso)*
- C : `Résultats : votre investissement LMNP analysé` *(factuel)*

### Aperçu (preview text)
`TRI, cashflow, amortissement — tout est là. Prenez 2 minutes pour décortiquer.`

### But
Livrer les résultats, poser ImmoVerdict comme référence de confiance, et amorcer la relation avant toute sollicitation commerciale.

### Corps

---

Bonjour {{first_name}},

Votre simulation est prête.

**Voici ce qu'ImmoVerdict a calculé pour votre bien à {{ville_bien}} :**

- **Rendement brut** : {{rendement_brut}}%
- **Cashflow mensuel (régime le plus favorable)** : {{cashflow_net}}€/mois
- **TRI sur 20 ans** : {{tri}}%

> 💡 Le régime LMNP Réel ressort souvent gagnant sur 10 ans grâce à l'amortissement — mais ce n'est pas toujours le cas. Votre simulation compare les 4 régimes en détail.

**→ [Voir ma simulation complète](https://immoverdict.com/lmnp)**

---

Une question fréquente à ce stade : *"Mon projet est-il finançable ?"*

C'est souvent là que les projets bloquent — pas sur la fiscalité, mais sur le taux et la mise de fonds. On en reparle demain.

À demain,  
**L'équipe ImmoVerdict**

*Vous avez utilisé le simulateur sur immoverdict.com. [Se désabonner]({{unsubscribe_url}})*

---

**CTA principal** : `Voir ma simulation` → `https://immoverdict.com/lmnp`  
**Timing** : immédiatement après la simulation (trigger Resend)  
**Segment** : tous les leads

---

## Email 2 — J+1 : Éducatif — Réel vs Micro-BIC

### Objet (3 options)
- **A** : `LMNP Réel vs Micro-BIC : lequel vous convient vraiment ?` *(question directe)*
- B : `L'erreur fiscale que font 70% des loueurs meublés` *(curiosité + FOMO)*
- C : `Votre régime fiscal LMNP en 3 minutes chrono` *(promesse de rapidité)*

### Aperçu
`La réponse dépend de votre loyer annuel — on vous l'explique simplement.`

### But
Éduquer sur le choix fiscal, renforcer la valeur perçue d'ImmoVerdict, et maintenir l'engagement avant la sollicitation courtier.

### Corps

---

Bonjour {{first_name}},

La question qui revient le plus après une simulation LMNP :

**"Est-ce que je dois choisir le régime Réel ou le Micro-BIC ?"**

La réponse courte : **ça dépend de vos loyers annuels et de votre TMI.**

Voici la règle simple :

| Votre situation | Régime conseillé |
|-----------------|-----------------|
| Loyers < 15 000€/an, charges légères | Micro-BIC (abattement 50%) |
| Loyers > 15 000€/an OU charges > 50% des loyers | Réel (amortissement) |
| Investissement neuf ou avec crédit important | Réel (quasi-toujours gagnant) |

**Avec un crédit immobilier, le régime Réel génère en général un déficit fiscal les premières années — ce qui peut effacer votre imposition locative pendant 5 à 10 ans.**

→ **[Comparer les régimes sur ma simulation](https://immoverdict.com/lmnp)**

---

Demain, on vous parle d'un levier que la plupart des investisseurs sous-estiment : **l'impact du taux de crédit sur votre cashflow réel.**

À demain,  
**L'équipe ImmoVerdict**

---

**CTA principal** : `Comparer les régimes` → `https://immoverdict.com/lmnp`  
**Timing** : J+1 (24h après J+0)  
**Segment** : tous

---

## Email 3 — J+3 : Première relance courtier (soft)

### Objet (3 options)
- **A** : `Votre taux de crédit peut tout changer sur ce projet` *(bénéfice)*
- B : `0,3% de taux en moins = {{économie}}€ de moins à rembourser` *(chiffre concret)*
- C : `Avez-vous déjà pensé à comparer les taux pour ce bien ?` *(question)*

### Aperçu
`Un courtier gratuit peut vous économiser des milliers d'euros. On vous explique.`

### But
Première introduction des partenaires courtiers, positionnée comme conseil (pas comme publicité). Montrer l'impact chiffré du taux sur le cashflow calculé.

### Corps

---

Bonjour {{first_name}},

Votre simulation ImmoVerdict a calculé votre cashflow avec un taux à **{{taux_simulation}}%**.

Mais saviez-vous qu'une différence de **0,3 point** sur votre taux peut représenter :

- **{{delta_mensualite}}€/mois** de mensualité en moins
- Soit **{{delta_total}}€ sur la durée du crédit**
- Et un cashflow amélioré de **{{delta_cashflow}}€/mois**

C'est là qu'intervient un courtier — et c'est **100% gratuit pour vous** (le courtier est rémunéré par la banque).

Nos partenaires **Pretto**, **MeilleurTaux** et **CAFPI** sont spécialisés dans le financement d'investissements locatifs. Ils connaissent les banques qui acceptent ce profil.

→ **[Obtenir mon taux gratuitement](https://www.pretto.fr/?utm_source=immoverdict&utm_medium=email&utm_campaign=j3)** — réponse indicative en 2 minutes

*Aucun engagement. Aucun frais. Juste une simulation de taux.*

---

**L'équipe ImmoVerdict**

---

**CTA principal** : `Obtenir mon taux gratuitement` → lien affilié Pretto  
**CTA secondaire** : `Comparer MeilleurTaux et CAFPI` → liens affiliés  
**Timing** : J+3  
**Condition** : n'a pas déjà cliqué sur un lien courtier dans J+1

---

## Email 4 — J+7 : Preuve sociale + urgence

### Objet (3 options)
- **A** : `Ce que font les investisseurs qui optimisent leur financement` *(curiosité comportementale)*
- B : `Votre projet LMNP : où en êtes-vous ?` *(check-in + relance)*
- C : `Les taux remontent — avez-vous déjà sécurisé le vôtre ?` *(urgence marché)*

### Aperçu
`La mise en relation est gratuite et prend 5 minutes. Beaucoup s'en félicitent.`

### But
Utiliser la preuve sociale et une légère urgence marché pour convaincre les non-convertis. Dernier email "commercial direct" avant une pause.

### Corps

---

Bonjour {{first_name}},

Il y a une semaine, vous avez simulé votre investissement LMNP sur ImmoVerdict.

Parmi les investisseurs qui ont fait cette démarche et consulté un courtier gratuit, voici ce qu'ils observent le plus souvent :

✅ **Un taux négocié inférieur** à ce qu'ils avaient obtenu en direct  
✅ **Un montage accepté** par une banque qui avait refusé leur dossier en solo  
✅ **Un gain de temps** de plusieurs semaines sur la recherche bancaire

Ce n'est pas un argument marketing — c'est l'intérêt mécanique d'un courtier qui soumet votre dossier à 20 banques simultanément.

**Nos partenaires :**

| Courtier | Spécialité | Délai réponse |
|----------|-----------|----------------|
| **Pretto** | Tout en ligne, réponse rapide | 2 min en ligne |
| **MeilleurTaux** | Réseau local + digital | 24-48h |
| **CAFPI** | Investisseurs expérimentés | RDV conseiller |

→ **[Être mis en relation maintenant](https://www.pretto.fr/?utm_source=immoverdict&utm_medium=email&utm_campaign=j7)**

C'est sans engagement et ça ne coûte rien.

---

**L'équipe ImmoVerdict**

---

**CTA principal** : `Être mis en relation` → lien affilié  
**Timing** : J+7  
**Condition** : n'a pas encore converti (pas de clic affilié)

---

## Email 5 — J+14 : Relance courtier personnalisée *(nouveau)*

### Objet (3 options)
- **A** : `On a regardé votre dossier — voici ce qu'on a trouvé` *(personnalisation perçue)*
- B : `{{first_name}}, votre projet LMNP est-il finançable en 2026 ?` *(question directe + année)*
- C : `Financement LMNP : les 3 critères que regardent vraiment les banques` *(éducatif)*

### Aperçu
`Taux d'endettement, reste à vivre, type de bien — on décrypte ce que les banques analysent.`

### But
Réengager les non-convertis avec un contenu plus éducatif sur le financement LMNP — présenter les critères bancaires pour valoriser l'apport d'un courtier spécialisé. CTA plus direct vers les 3 partenaires.

### Corps

---

Bonjour {{first_name}},

Deux semaines que vous avez simulé votre projet LMNP. On voulait revenir avec quelque chose d'utile.

**Ce que regardent vraiment les banques pour un investissement locatif :**

**1. Le taux d'endettement après investissement**  
La limite légale est 35%. Les banques calculent souvent avec 70% du loyer perçu (pas 100%). Résultat : beaucoup de dossiers sont proches du seuil — un courtier sait quels établissements sont plus flexibles.

**2. Le "reste à vivre"**  
Même avec un taux d'endettement à 33%, certaines banques refusent si votre reste à vivre mensuel est jugé insuffisant. Le seuil varie de 400€ à 1 500€ selon l'établissement.

**3. La nature du bien**  
Studio en copropriété, immeuble en bloc, résidence de tourisme... chaque type a ses banques "amies". Un courtier LMNP sait cibler.

---

**La bonne nouvelle :** un courtier partenaire peut analyser votre dossier gratuitement et vous dire, en 48h, si votre projet est finançable et à quel taux.

Choisissez le format qui vous convient :

- 🖥️ **Tout en ligne** → [Pretto — simulation en 2 min](https://www.pretto.fr/?utm_source=immoverdict&utm_medium=email&utm_campaign=j14)
- 📞 **Avec un conseiller** → [MeilleurTaux — rappel gratuit](https://www.meilleurtaux.com/?utm_source=immoverdict&utm_medium=email&utm_campaign=j14)
- 🏢 **Réseau physique** → [CAFPI — RDV en agence](https://www.cafpi.fr/?utm_source=immoverdict&utm_medium=email&utm_campaign=j14)

→ **[Valider mon dossier gratuitement](https://www.pretto.fr/?utm_source=immoverdict&utm_medium=email&utm_campaign=j14)**

---

**L'équipe ImmoVerdict**

*Ce service est gratuit pour vous. ImmoVerdict peut percevoir une commission de mise en relation.*

---

**CTA principal** : `Valider mon dossier gratuitement` → Pretto (affilié)  
**CTA secondaire** : MeilleurTaux + CAFPI  
**Timing** : J+14  
**Condition** : n'a pas encore converti (aucun clic affilié sur J+3 et J+7)  
**Note RGPD** : mention transparence commission en bas

---

## Email 6 — J+30 : Nouvelles fonctionnalités *(nouveau)*

### Objet (3 options)
- **A** : `3 nouvelles fonctions sur ImmoVerdict (dont une pour votre cas)` *(pertinence perso)*
- B : `ImmoVerdict a évolué — voici ce que vous n'aviez pas encore` *(FOMO produit)*
- C : `Votre simulateur LMNP s'est amélioré depuis votre dernière visite` *(re-engagement doux)*

### Aperçu
`Multi-biens, comparaison côte-à-côte, URL de partage — retestez avec votre projet.`

### But
Réactiver les leads inactifs depuis +21 jours en présentant les nouvelles fonctionnalités (multi-biens, comparaison, URL partage). Créer une raison de revenir sur le simulateur — et une nouvelle opportunité de conversion courtier.

### Corps

---

Bonjour {{first_name}},

Depuis votre simulation LMNP il y a un mois, ImmoVerdict a été mis à jour avec 3 nouvelles fonctionnalités que vous n'avez pas encore essayées.

---

**🏠 1. Simulation multi-biens**  
Vous avez plusieurs projets en tête ? Comparez jusqu'à 5 biens dans la même session. Le tableau de bord portfolio vous donne le cashflow total, le TRI pondéré et l'investissement consolidé.

**⚖️ 2. Mode comparaison côte-à-côte**  
Comparez deux biens sur 9 indicateurs (prix, rendement, cashflow, TRI, mensualité, effort d'épargne, impôt). Un badge 🏆 indique le gagnant critère par critère.

**🔗 3. Partage de simulation par lien**  
Chaque simulation génère maintenant une URL unique. Partagez-la avec votre conseiller, votre comptable, ou votre courtier pour travailler ensemble sur les hypothèses.

---

→ **[Retester avec les nouvelles fonctionnalités](https://immoverdict.com/lmnp)**

---

Et si vous êtes prêt à passer à l'étape du financement, nos partenaires courtiers restent disponibles pour une analyse gratuite de votre dossier.

→ [Consulter un courtier LMNP gratuitement](https://www.pretto.fr/?utm_source=immoverdict&utm_medium=email&utm_campaign=j30)

---

**L'équipe ImmoVerdict**

---

**CTA principal** : `Retester avec les nouvelles fonctionnalités` → `https://immoverdict.com/lmnp`  
**CTA secondaire** : `Consulter un courtier gratuitement` → affilié Pretto  
**Timing** : J+30  
**Condition** : inactif depuis 21+ jours (pas d'ouverture récente) OU tous les leads (selon préférence)  
**Note** : si le lead a déjà converti côté courtier → adapter la version (supprimer le CTA courtier)

---

## Schéma de flux

```
[Simulation LMNP complétée]
         |
    Email 1 (J+0) — Welcome + résultats
         |
    Email 2 (J+1) — Éducatif Réel vs Micro-BIC
         |
    A cliqué CTA courtier? --Oui--> [Hors séquence — nurture post-conversion]
         |
        Non
         |
    Email 3 (J+3) — Intro courtier soft
         |
    A converti? --Oui--> [EXIT séquence affiliation] → [Email J+30 features only]
         |
        Non
         |
    Email 4 (J+7) — Preuve sociale + urgence
         |
    A converti? --Oui--> [EXIT séquence affiliation] → [Email J+30 features only]
         |
        Non
         |
    Email 5 (J+14) — Relance courtier personnalisée [NOUVEAU]
         |
    A converti? --Oui--> [EXIT] → [Email J+30 features only]
         |
        Non
         |
    Email 6 (J+30) — Nouvelles fonctionnalités + 2ème chance courtier [NOUVEAU]
         |
    [FIN DE SÉQUENCE]
```

---

## Logique de branchement et suppressions

**Exits (sortie de séquence affiliation) :**
- Clic sur un lien courtier (Pretto / MeilleurTaux / CAFPI) → stopper les emails J+3, J+7, J+14 avec CTA courtier ; conserver J+30 (features uniquement)
- Désabonnement → suppression immédiate, toute séquence

**Conditions de suppression :**
- Lead déjà en séquence active → ne pas enroller en double
- Lead ayant contacté le support dans les 48h → pause automatique
- Lead sans adresse email vérifiée → exclure

**Règles de réentrée :**
- Pas de réentrée possible pour la même simulation
- Si l'utilisateur simule un 2ème bien → nouvelle entrée en séquence avec variables du nouveau bien

**Personnalisation dynamique (variables Resend) :**

| Variable | Source |
|----------|--------|
| `{{first_name}}` | Formulaire email |
| `{{ville_bien}}` | Simulation (optionnel) |
| `{{rendement_brut}}` | Résultats runCalc() |
| `{{cashflow_net}}` | Résultats runCalc() |
| `{{tri}}` | Résultats calcTRI() |
| `{{taux_simulation}}` | Paramètre simulation |
| `{{delta_mensualite}}` | Calculé (0.3% × capital) |
| `{{unsubscribe_url}}` | Resend natif |

---

## Benchmarks attendus (secteur financement immobilier)

| Email | Open Rate cible | CTR cible | Conversion courtier |
|-------|----------------|-----------|---------------------|
| J+0 (Welcome) | 55-70% | 20-30% | — |
| J+1 (Éducatif) | 40-55% | 10-15% | — |
| J+3 (Courtier soft) | 30-40% | 5-10% | 2-4% |
| J+7 (Preuve sociale) | 25-35% | 4-8% | 1-3% |
| J+14 (Relance perso) | 20-30% | 4-8% | 1-2% |
| J+30 (Features) | 15-25% | 8-15% | 0.5-1% |

**Taux de conversion séquence globale cible : 4-8% des leads vers un clic courtier**

---

## Suggestions A/B à lancer en priorité

**Test 1 — Objet Email 3 (J+3) :**
- Version A : `Votre taux de crédit peut tout changer sur ce projet`
- Version B : `0,3% de taux en moins = des milliers d'euros économisés`
- Mesure : open rate + CTR sur le lien Pretto

**Test 2 — CTA Email 5 (J+14) :**
- Version A : `Valider mon dossier gratuitement` (bouton unique Pretto)
- Version B : Trois boutons distincts Pretto / MeilleurTaux / CAFPI
- Mesure : taux de clic global + répartition par courtier

**Test 3 — Timing Email 5 :**
- Version A : J+14 (actuel)
- Version B : J+10 (envoi plus rapide pour les leads chauds)
- Mesure : CTR et taux de désabonnement

---

## Setup Resend — checklist d'implémentation

1. Créer 6 templates dans Resend (un par email)
2. Configurer le trigger : `event: simulation_completed` → enroller en séquence
3. Ajouter les delays : 0h / 24h / 72h / 168h / 336h / 720h
4. Configurer les conditions de sortie : tag `courtier_clicked` → skip emails affiliés
5. Brancher les variables depuis Supabase (table `leads`) au moment du trigger
6. Tester avec une adresse seed avant mise en prod
7. Vérifier le lien `unsubscribe_url` natif Resend sur chaque template

---

*Document généré le 07/05/2026 — ImmoVerdict v2.0*
