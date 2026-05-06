import Link from "next/link";
import { getPostBySlug, getAllSlugs } from "@/lib/posts";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  return getAllSlugs();
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  return {
    title: `${post.title} | ImmoVerdict`,
    description: post.description || "",
    openGraph: {
      title: post.title,
      description: post.description || "",
      url: `https://immoverdict.com/blog/${slug}`,
      siteName: "ImmoVerdict",
      locale: "fr_FR",
      type: "article",
      publishedTime: post.date,
      images: [{ url: post.image || "/og-image.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description || "",
      images: [post.image || "/og-image.png"],
    },
    alternates: {
      canonical: `https://immoverdict.com/blog/${slug}`,
    },
  };
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const dateStr = post.date
    ? new Date(post.date).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <div className="min-h-screen bg-[#07071A] text-white">
      {/* ── Nav ── */}
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Immo<span className="text-violet-400">Verdict</span>
          </Link>
          <div className="flex items-center gap-6 text-sm text-white/70">
            <Link href="/lmnp" className="hover:text-white transition-colors">Simulateur LMNP</Link>
            <Link href="/rp" className="hover:text-white transition-colors">Résidence Principale</Link>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
          </div>
        </div>
      </nav>

      {/* ── Breadcrumb ── */}
      <div className="max-w-3xl mx-auto px-6 pt-6">
        <p className="text-sm text-white/40">
          <Link href="/blog" className="hover:text-violet-400 transition-colors">Blog</Link>
          <span className="mx-2">›</span>
          <span className="text-white/60">{post.category || "Article"}</span>
        </p>
      </div>

      {/* ── Article header ── */}
      <header className="max-w-3xl mx-auto px-6 pt-8 pb-10">
        {post.category && (
          <span className="inline-block text-xs font-bold text-violet-400 uppercase tracking-widest mb-4 px-3 py-1 rounded-full border border-violet-500/30">
            {post.category}
          </span>
        )}
        <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">
          {post.title}
        </h1>
        {post.description && (
          <p className="text-white/60 text-lg leading-relaxed mb-6">
            {post.description}
          </p>
        )}
        <div className="flex items-center gap-4 text-sm text-white/40 border-t border-white/10 pt-4">
          {dateStr && <span>{dateStr}</span>}
          {post.readingTime && (
            <>
              <span>·</span>
              <span>{post.readingTime} de lecture</span>
            </>
          )}
        </div>
      </header>

      {/* ── Article body ── */}
      <main className="max-w-3xl mx-auto px-6 pb-24">
        <div
          className="prose-article"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />

        {/* ── CTA bottom ── */}
        <div className="mt-16 p-8 bg-gradient-to-br from-violet-900/40 to-indigo-900/30 border border-violet-500/30 rounded-2xl text-center">
          <p className="text-violet-300 text-sm font-semibold uppercase tracking-widest mb-3">
            Passez à l&apos;action
          </p>
          <h2 className="text-xl font-bold mb-3">Calculez votre situation exacte</h2>
          <p className="text-white/60 mb-6 text-sm">
            Notre simulateur intègre tous les régimes fiscaux et vous donne une réponse personnalisée en 2 minutes.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/lmnp"
              className="px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold text-sm transition-colors"
            >
              Simulateur LMNP
            </Link>
            <Link
              href="/rp"
              className="px-6 py-3 bg-white/10 hover:bg-white/15 rounded-xl font-semibold text-sm transition-colors"
            >
              Résidence Principale
            </Link>
          </div>
        </div>

        {/* ── Back to blog ── */}
        <div className="mt-10 text-center">
          <Link
            href="/blog"
            className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
          >
            ← Retour au blog
          </Link>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 py-8 text-center text-white/30 text-sm">
        <p>© {new Date().getFullYear()} ImmoVerdict — <Link href="/mentions-legales" className="hover:text-white/60 transition-colors">Mentions légales</Link></p>
      </footer>
    </div>
  );
}
