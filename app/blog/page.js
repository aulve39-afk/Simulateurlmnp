import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export default function BlogPage() {
  const posts = getAllPosts();

  const categories = [...new Set(posts.map((p) => p.category).filter(Boolean))];

  return (
    <div className="min-h-screen bg-[#07071A] text-white">
      {/* ── Nav ── */}
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Immo<span className="text-violet-400">Verdict</span>
          </Link>
          <div className="flex items-center gap-6 text-sm text-white/70">
            <Link href="/lmnp" className="hover:text-white transition-colors">Simulateur LMNP</Link>
            <Link href="/rp" className="hover:text-white transition-colors">Résidence Principale</Link>
            <Link href="/blog" className="text-violet-400 font-medium">Blog</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="max-w-5xl mx-auto px-6 pt-16 pb-10">
        <p className="text-violet-400 text-sm font-semibold tracking-widest uppercase mb-3">
          Guides & Analyses
        </p>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
          Blog ImmoVerdict
        </h1>
        <p className="text-white/60 text-lg max-w-2xl">
          LMNP, fiscalité immobilière, PTZ, DPE — nos guides pratiques pour investir et acheter intelligemment en France.
        </p>
      </header>

      {/* ── Category pills ── */}
      {categories.length > 1 && (
        <div className="max-w-5xl mx-auto px-6 pb-8 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <span
              key={cat}
              className="text-xs font-semibold px-3 py-1 rounded-full border border-violet-500/40 text-violet-300"
            >
              {cat}
            </span>
          ))}
        </div>
      )}

      {/* ── Articles grid ── */}
      <main className="max-w-5xl mx-auto px-6 pb-24">
        {posts.length === 0 ? (
          <p className="text-white/50 text-center py-20">Aucun article pour le moment.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <ArticleCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 py-8 text-center text-white/30 text-sm">
        <p>© {new Date().getFullYear()} ImmoVerdict — <Link href="/mentions-legales" className="hover:text-white/60 transition-colors">Mentions légales</Link></p>
      </footer>
    </div>
  );
}

function ArticleCard({ post }) {
  const dateStr = post.date
    ? new Date(post.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-violet-500/50 hover:bg-white/8 transition-all duration-200"
    >
      {/* Card top accent */}
      <div className="h-1 bg-gradient-to-r from-violet-600 to-indigo-600" />

      <div className="p-6 flex flex-col flex-1">
        {/* Category + reading time */}
        <div className="flex items-center justify-between mb-3">
          {post.category && (
            <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest">
              {post.category}
            </span>
          )}
          {post.readingTime && (
            <span className="text-xs text-white/40">{post.readingTime}</span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-base font-bold leading-snug mb-2 group-hover:text-violet-300 transition-colors line-clamp-3">
          {post.title}
        </h2>

        {/* Description */}
        {post.description && (
          <p className="text-sm text-white/50 leading-relaxed line-clamp-3 flex-1">
            {post.description}
          </p>
        )}

        {/* Date */}
        {dateStr && (
          <p className="text-xs text-white/30 mt-4 pt-4 border-t border-white/10">
            {dateStr}
          </p>
        )}
      </div>
    </Link>
  );
}
