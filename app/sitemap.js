/**
 * Sitemap dynamique — Next.js App Router
 * Remplace public/sitemap.xml (statique, qui divergeait du contenu réel).
 * Inclut toutes les pages de villes LMNP et tous les articles de blog.
 */
import { SLUGS } from "./lmnp/[ville]/data";
import { getAllSlugs } from "@/lib/posts";

const BASE_URL = "https://immoverdict.com";

export default async function sitemap() {
  const blogSlugs = getAllSlugs(); // [{ slug: "..." }, ...]

  const staticRoutes = [
    { url: BASE_URL,                    lastModified: new Date(), priority: 1.0, changeFrequency: "weekly"  },
    { url: `${BASE_URL}/simulateur`,    lastModified: new Date(), priority: 0.9, changeFrequency: "monthly" },
    { url: `${BASE_URL}/blog`,          lastModified: new Date(), priority: 0.8, changeFrequency: "weekly"  },
    { url: `${BASE_URL}/glossaire`,     lastModified: new Date(), priority: 0.7, changeFrequency: "monthly" },
    { url: `${BASE_URL}/a-propos`,      lastModified: new Date(), priority: 0.5, changeFrequency: "yearly"  },
    { url: `${BASE_URL}/mentions-legales`,  lastModified: new Date(), priority: 0.3, changeFrequency: "yearly" },
    { url: `${BASE_URL}/confidentialite`,   lastModified: new Date(), priority: 0.3, changeFrequency: "yearly" },
  ];

  const villeRoutes = SLUGS.map((slug) => ({
    url: `${BASE_URL}/lmnp/${slug}`,
    lastModified: new Date("2026-05-01"),
    priority: 0.6,
    changeFrequency: "monthly",
  }));

  const blogRoutes = blogSlugs.map(({ slug }) => ({
    url: `${BASE_URL}/blog/${slug}`,
    lastModified: new Date(),
    priority: 0.5,
    changeFrequency: "monthly",
  }));

  return [...staticRoutes, ...villeRoutes, ...blogRoutes];
}
