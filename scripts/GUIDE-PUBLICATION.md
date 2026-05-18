# Guide — Agent de publication ImmoVerdict

Ce script publie automatiquement un article sur :
- **Le blog immoverdict.com** (fichier `.md` → Vercel redéploie)
- **Instagram** (via l'API Graph de Meta)

---

## Utilisation rapide

```bash
# Publier un fichier existant
node scripts/publish-article.mjs content/blog/mon-article.md

# Publier depuis stdin (copier-coller du contenu généré par Claude)
cat mon-article.md | node scripts/publish-article.mjs
```

---

## Format du fichier Markdown attendu

```markdown
---
title: "Titre de l'article (obligatoire)"
description: "Résumé court affiché sur le blog et Instagram"
date: "2026-05-17"
category: "Fiscalité LMNP"
readingTime: "6 min"
image: "/og-image.png"
---

## Premier titre

Contenu de l'article en Markdown...
```

---

## Configurer Instagram (une seule fois)

### 1. Prérequis

- Un **compte Instagram Business** (pas un compte personnel)
- Une **Page Facebook** liée à ce compte Instagram
- Un **compte développeur Meta** : https://developers.facebook.com

### 2. Créer une application Meta

1. Allez sur https://developers.facebook.com → "Mes apps" → "Créer une app"
2. Choisissez le type **"Professionnel"**
3. Ajoutez le produit **"Instagram Graph API"**

### 3. Obtenir votre ID de compte Instagram

1. Dans l'App, allez dans **Instagram Graph API → Démarrage rapide**
2. Connectez votre Page Facebook liée à Instagram
3. Vous verrez votre **Instagram Business Account ID** (ex: `17841400000000000`)
4. Copiez-le dans `.env.local` → `INSTAGRAM_BUSINESS_ACCOUNT_ID`

### 4. Générer un token long-lived

Dans le panneau Meta, allez dans **Outils → Explorateur de l'API Graph** :

1. Sélectionnez votre application
2. Cliquez "Générer un token d'accès utilisateur"
3. Cochez les permissions : `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`
4. Copiez le token → `.env.local` → `INSTAGRAM_ACCESS_TOKEN`

> ⚠️ Le token expire dans 60 jours. Pour un token permanent, utilisez l'API System User dans Meta Business Manager.

### 5. Mettre à jour `.env.local`

```
INSTAGRAM_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxx
INSTAGRAM_BUSINESS_ACCOUNT_ID=178414xxxxxxxx
```

---

## Ce que fait l'agent étape par étape

```
1. 📄 Lit le fichier Markdown
2. ✅ Vérifie le frontmatter (title + date obligatoires)
3. 💾 Copie le fichier dans content/blog/{slug}.md
4. 🔀 git add + git commit + git push
         └→ Vercel détecte le push et redéploie le site (~30s)
5. 📸 Appelle l'API Instagram Graph :
         a. Crée un container de média (image + légende)
         b. Attend 5 secondes
         c. Publie le container
6. 🎉 Affiche l'URL du nouvel article
```

---

## Personnaliser les hashtags

Dans le frontmatter de votre article, ajoutez un champ `hashtags` :

```markdown
---
title: "Mon article"
hashtags: "#LMNP #Immobilier #MonHashtag"
---
```

Sans ce champ, les hashtags par défaut sont utilisés :
`#LMNP #InvestissementLocatif #Immobilier #FiscalitéImmobilière #ImmoVerdict`

---

## Dépannage

| Problème | Solution |
|----------|----------|
| `git push échoué` | Le site est mis à jour localement mais pas déployé. Faites `git push` manuellement. |
| `Instagram container error` | Vérifiez que l'image est publiquement accessible (le site doit être déployé). |
| `Token expiré` | Regénérez un token dans l'Explorateur d'API Graph Meta. |
| `Compte non autorisé` | Le compte Instagram doit être un compte Business ou Creator. |
