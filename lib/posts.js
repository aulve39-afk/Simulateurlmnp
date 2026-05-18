import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";

const POSTS_DIR = path.join(process.cwd(), "content/blog");

/** Retourne la liste de tous les articles (metadata seulement, sans le body) */
export function getAllPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];

  const files = fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".md") || f.endsWith(".mdx"));

  const posts = files.map((filename) => {
    const slug = filename.replace(/\.mdx?$/, "");
    const raw = fs.readFileSync(path.join(POSTS_DIR, filename), "utf8");
    const { data } = matter(raw);
    return { slug, ...data };
  });

  // Tri par date décroissante
  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/** Retourne un article complet (metadata + body HTML) */
export async function getPostBySlug(slug) {
  // Sécurité : path.basename() neutralise les attaques de type path traversal (../../etc/passwd)
  const safeSlug = path.basename(slug);
  const candidates = [
    path.join(POSTS_DIR, `${safeSlug}.md`),
    path.join(POSTS_DIR, `${safeSlug}.mdx`),
  ];
  const filePath = candidates.find((p) => fs.existsSync(p));
  if (!filePath) return null;
  // Vérification supplémentaire que le chemin résolu reste bien dans POSTS_DIR
  if (!filePath.startsWith(POSTS_DIR)) return null;

  const raw = await fs.promises.readFile(filePath, "utf8");
  const { data, content } = matter(raw);

  // Pipeline sanitisé : remark → rehype → rehype-sanitize (retire balises dangereuses)
  const processed = await unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSanitize)
    .use(rehypeStringify)
    .process(content);
  const contentHtml = processed.toString();

  return { slug: safeSlug, ...data, contentHtml };
}

/** Retourne tous les slugs (pour generateStaticParams) */
export function getAllSlugs() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".md") || f.endsWith(".mdx"))
    .map((f) => ({ slug: f.replace(/\.mdx?$/, "") }));
}

/**
 * Retourne jusqu'à `limit` articles liés à un slug donné.
 * Priorité : même catégorie → récents. Exclut l'article courant.
 */
export function getRelatedPosts(currentSlug, category, limit = 3) {
  const all = getAllPosts();
  const others = all.filter((p) => p.slug !== currentSlug);

  // Articles de la même catégorie d'abord
  const sameCategory = others.filter((p) => p.category === category);
  const different    = others.filter((p) => p.category !== category);

  const sorted = [...sameCategory, ...different];
  return sorted.slice(0, limit);
}
