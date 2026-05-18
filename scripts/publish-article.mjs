#!/usr/bin/env node
/**
 * Agent de publication ImmoVerdict
 * ─────────────────────────────────
 * Usage :
 *   node scripts/publish-article.mjs <chemin/vers/article.md>
 *   echo "---\ntitle: ...\n---\nContenu" | node scripts/publish-article.mjs
 *
 * Variables d'env requises (dans .env.local) :
 *   INSTAGRAM_ACCESS_TOKEN          — Token de l'API Graph Meta (long-lived)
 *   INSTAGRAM_BUSINESS_ACCOUNT_ID   — ID du compte Instagram Business
 *
 * Ce que fait ce script :
 *   1. Parse le frontmatter du fichier Markdown
 *   2. Dépose le fichier dans content/blog/
 *   3. git add + commit + push → Vercel redéploie automatiquement
 *   4. Poste un visuel sur Instagram via l'API Graph
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { createInterface } from "readline";

// ── Config ──────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BLOG_DIR = path.join(ROOT, "content", "blog");
const SITE_URL = "https://immoverdict.com";
const IG_API = "https://graph.facebook.com/v19.0";
const DEFAULT_HASHTAGS = [
  "#LMNP",
  "#InvestissementLocatif",
  "#Immobilier",
  "#FiscalitéImmobilière",
  "#ImmoVerdict",
  "#InvestisseurImmobilier",
  "#InvestirImmobilier",
];

// ── Variables d'env ──────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

loadEnv();

const {
  INSTAGRAM_ACCESS_TOKEN: IG_TOKEN,
  INSTAGRAM_BUSINESS_ACCOUNT_ID: IG_ACCOUNT_ID,
} = process.env;

// ── Parser frontmatter ultra-léger ──────────────────────────────────────────
function parseFrontmatter(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };

  const data = {};
  for (const line of match[1].split("\n")) {
    const m = line.match(/^(\w[\w-]*):\s*"?([^"]*)"?\s*$/);
    if (m) data[m[1]] = m[2].trim();
  }
  return { data, content: match[2] };
}

// ── Slugification ────────────────────────────────────────────────────────────
function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Étape 1 : Écrire le fichier dans content/blog/ ───────────────────────────
function writeArticle(markdownContent, forceSlug) {
  const { data: meta } = parseFrontmatter(markdownContent);

  if (!meta.title) {
    throw new Error("❌ Le frontmatter doit contenir un champ `title`.");
  }
  if (!meta.date) {
    throw new Error("❌ Le frontmatter doit contenir un champ `date` (YYYY-MM-DD).");
  }

  const slug = forceSlug || meta.slug || slugify(meta.title);
  const destPath = path.join(BLOG_DIR, `${slug}.md`);

  if (!fs.existsSync(BLOG_DIR)) fs.mkdirSync(BLOG_DIR, { recursive: true });
  fs.writeFileSync(destPath, markdownContent, "utf8");

  console.log(`\n✅ Article écrit → content/blog/${slug}.md`);
  return { slug, meta, destPath };
}

// ── Étape 2 : Git commit + push ───────────────────────────────────────────────
function gitPush(destPath, title) {
  try {
    execSync(`git add "${destPath}"`, { cwd: ROOT, stdio: "pipe" });
    execSync(`git commit -m "blog: ${title}"`, { cwd: ROOT, stdio: "pipe" });
    execSync("git push", { cwd: ROOT, stdio: "pipe" });
    console.log("✅ Git push effectué → Vercel redéploie dans ~30 secondes");
    return true;
  } catch (e) {
    const msg = e.stderr?.toString() || e.message;
    if (msg.includes("nothing to commit")) {
      console.log("ℹ️  Rien à committer (fichier identique).");
      return false;
    }
    console.warn(`⚠️  Git push échoué (pas de remote ou credentials manquants) :`);
    console.warn("   " + msg.split("\n")[0]);
    return false;
  }
}

// ── Étape 3 : Instagram Graph API ────────────────────────────────────────────
function buildCaption(meta, articleUrl) {
  const parts = [
    `📊 ${meta.title}`,
    "",
    meta.description || "",
    "",
    `👉 Lire l'article complet (lien en bio ou) :`,
    articleUrl,
    "",
    (meta.hashtags || DEFAULT_HASHTAGS.join(" ")),
  ];
  return parts.join("\n").trim();
}

async function postToInstagram(meta, slug) {
  if (!IG_TOKEN || !IG_ACCOUNT_ID) {
    console.warn(
      "\n⚠️  INSTAGRAM_ACCESS_TOKEN / INSTAGRAM_BUSINESS_ACCOUNT_ID non configurés."
    );
    console.warn("   Ajoutez-les dans .env.local et relancez le script.");
    return;
  }

  const articleUrl = `${SITE_URL}/blog/${slug}`;
  const imageUrl =
    meta.image && meta.image.startsWith("http")
      ? meta.image
      : `${SITE_URL}${meta.image || "/og-image.png"}`;

  const caption = buildCaption(meta, articleUrl);

  console.log("\n📸 Publication Instagram en cours…");
  console.log(`   Image : ${imageUrl}`);

  // 1. Créer le container de média
  const containerRes = await fetch(`${IG_API}/${IG_ACCOUNT_ID}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: imageUrl,
      caption,
      access_token: IG_TOKEN,
    }),
  });

  const container = await containerRes.json();
  if (container.error) {
    console.error("❌ Erreur Instagram (container) :", container.error.message);
    console.error("   Code :", container.error.code);
    return;
  }

  console.log(`   Container créé (id: ${container.id}), attente de 5 s…`);
  await new Promise((r) => setTimeout(r, 5000));

  // 2. Publier le container
  const publishRes = await fetch(`${IG_API}/${IG_ACCOUNT_ID}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: container.id,
      access_token: IG_TOKEN,
    }),
  });

  const published = await publishRes.json();
  if (published.error) {
    console.error("❌ Erreur Instagram (publish) :", published.error.message);
    return;
  }

  console.log(`✅ Instagram publié ! Post ID : ${published.id}`);
  console.log(`   Légende :\n${caption.split("\n").map((l) => "   " + l).join("\n")}`);
}

// ── Lecture stdin ─────────────────────────────────────────────────────────────
async function readStdin() {
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  const lines = [];
  for await (const line of rl) lines.push(line);
  return lines.join("\n");
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 Agent de publication ImmoVerdict");
  console.log("═".repeat(45));

  let markdownContent;
  let forceSlug;

  const arg = process.argv[2];
  if (arg && fs.existsSync(arg)) {
    markdownContent = fs.readFileSync(arg, "utf8");
    forceSlug = path.basename(arg, path.extname(arg));
    console.log(`📄 Fichier source : ${arg}`);
  } else {
    console.log("📄 Lecture depuis stdin…");
    markdownContent = await readStdin();
    if (!markdownContent.trim()) {
      console.error(
        "\nUsage :\n" +
          "  node scripts/publish-article.mjs <article.md>\n" +
          "  cat article.md | node scripts/publish-article.mjs"
      );
      process.exit(1);
    }
  }

  // 1. Écrire le fichier
  const { slug, meta, destPath } = writeArticle(markdownContent, forceSlug);

  // 2. Git push (déclenche le deploy Vercel)
  gitPush(destPath, meta.title);

  // 3. Instagram
  await postToInstagram(meta, slug);

  console.log("\n🎉 Publication terminée !");
  console.log(`   Blog : ${SITE_URL}/blog/${slug}`);
}

main().catch((e) => {
  console.error("❌ Erreur fatale :", e.message);
  process.exit(1);
});
