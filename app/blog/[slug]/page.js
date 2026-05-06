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
    alternates: { canonical: `https://immoverdict.com/blog/${slug}` },
  };
}

const LogoMark = () => (
  <svg width="28" height="28" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{flexShrink:0}}>
    <rect x="0" y="0" width="30" height="3" fill="#F97316"/>
    <rect x="0" y="3" width="12" height="27" fill="#F0EBE0"/>
    <rect x="18" y="3" width="12" height="18" fill="#F0EBE0"/>
  </svg>
);

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const dateStr = post.date
    ? new Date(post.date).toLocaleDateString("fr-FR", { day:"numeric", month:"long", year:"numeric" })
    : "";

  return (
    <div style={{ minHeight:"100vh", background:"#0C0C10", color:"#F0EBE0", fontFamily:"'DM Sans',system-ui,sans-serif" }}>

      {/* ── NAV ── */}
      <nav style={{ borderBottom:"1px solid rgba(240,235,224,0.08)", padding:"0 48px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, background:"rgba(12,12,16,0.92)", backdropFilter:"blur(20px)", zIndex:50 }}>
        <Link href="/" style={{ display:"flex", alignItems:"center", gap:12, textDecoration:"none" }}>
          <LogoMark />
          <span style={{ fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:15, color:"#F0EBE0", letterSpacing:"-.2px" }}>
            Immo<span style={{ color:"#F97316" }}>Verdict</span>
          </span>
        </Link>
        <div style={{ display:"flex", alignItems:"center", gap:0 }}>
          {[
            { href:"/lmnp", label:"Simulateur LMNP" },
            { href:"/rp",   label:"Résidence Principale" },
            { href:"/blog", label:"Blog", active:true },
          ].map(({href,label,active}) => (
            <Link key={href} href={href} style={{
              display:"inline-block", padding:"0 20px", height:60, lineHeight:"60px",
              fontSize:13, fontWeight:500, textDecoration:"none",
              color: active ? "#F97316" : "rgba(240,235,224,0.5)",
              borderBottom: active ? "2px solid #F97316" : "2px solid transparent",
            }}>{label}</Link>
          ))}
        </div>
      </nav>

      {/* ── BREADCRUMB ── */}
      <div style={{ maxWidth:740, margin:"0 auto", padding:"24px 48px 0" }}>
        <p style={{ fontSize:12, color:"rgba(240,235,224,0.3)", letterSpacing:".5px" }}>
          <Link href="/blog" style={{ color:"rgba(249,115,22,0.7)", textDecoration:"none" }}>Blog</Link>
          <span style={{ margin:"0 10px", opacity:.4 }}>›</span>
          <span>{post.category || "Article"}</span>
        </p>
      </div>

      {/* ── ARTICLE HEADER ── */}
      <header style={{ maxWidth:740, margin:"0 auto", padding:"32px 48px 40px" }}>
        {post.category && (
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
            <div style={{ width:3, height:20, background:"#F97316" }} />
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:"2.5px", textTransform:"uppercase", color:"#F97316" }}>
              {post.category}
            </span>
          </div>
        )}
        <h1 style={{ fontFamily:"'DM Serif Display',Georgia,serif", fontSize:"clamp(1.9rem,4vw,2.8rem)", fontWeight:400, lineHeight:1.1, marginBottom:16, color:"#F0EBE0" }}>
          {post.title}
        </h1>
        {post.description && (
          <p style={{ fontSize:"1.05rem", color:"rgba(240,235,224,0.5)", lineHeight:1.7, marginBottom:24, fontWeight:300 }}>
            {post.description}
          </p>
        )}
        <div style={{ display:"flex", alignItems:"center", gap:12, fontSize:12, color:"rgba(240,235,224,0.3)", paddingTop:16, borderTop:"1px solid rgba(240,235,224,0.08)" }}>
          {dateStr && <span>{dateStr}</span>}
          {post.readingTime && (
            <>
              <span style={{ opacity:.4 }}>·</span>
              <span>{post.readingTime} de lecture</span>
            </>
          )}
        </div>
      </header>

      {/* Trait séparateur */}
      <div style={{ maxWidth:740, margin:"0 auto 0 calc((100% - 740px)/2)", borderTop:"1px solid rgba(240,235,224,0.08)" }} />

      {/* ── CORPS DE L'ARTICLE ── */}
      <main style={{ maxWidth:740, margin:"0 auto", padding:"48px 48px 96px" }}>
        <div className="prose-article" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />

        {/* ── CTA BAS DE PAGE ── */}
        <div style={{ marginTop:64, borderTop:"3px solid #F97316", padding:"40px 40px 36px", background:"rgba(249,115,22,0.05)", border:"1px solid rgba(249,115,22,0.2)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
            <div style={{ width:3, height:24, background:"#F97316" }} />
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:"2.5px", textTransform:"uppercase", color:"#F97316" }}>
              Passez à l&apos;action
            </span>
          </div>
          <h2 style={{ fontFamily:"'DM Serif Display',Georgia,serif", fontSize:"1.5rem", fontWeight:400, marginBottom:12, color:"#F0EBE0" }}>
            Calculez votre situation exacte
          </h2>
          <p style={{ fontSize:".9rem", color:"rgba(240,235,224,0.45)", marginBottom:28, lineHeight:1.7 }}>
            Notre simulateur intègre tous les régimes fiscaux et vous donne une réponse personnalisée en 2 minutes.
          </p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:12 }}>
            <Link href="/lmnp" style={{
              padding:"12px 24px", background:"#F97316", color:"#0C0C10",
              fontWeight:700, fontSize:13, textDecoration:"none", letterSpacing:".02em",
            }}>
              Simulateur LMNP
            </Link>
            <Link href="/rp" style={{
              padding:"12px 24px", border:"1px solid rgba(240,235,224,0.2)", color:"#F0EBE0",
              fontWeight:600, fontSize:13, textDecoration:"none",
            }}>
              Résidence Principale
            </Link>
          </div>
        </div>

        {/* Retour blog */}
        <div style={{ marginTop:40, textAlign:"center" }}>
          <Link href="/blog" style={{ fontSize:13, color:"rgba(249,115,22,0.7)", textDecoration:"none", letterSpacing:".5px" }}>
            ← Retour au blog
          </Link>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop:"1px solid rgba(240,235,224,0.08)", padding:"32px 48px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <LogoMark />
          <span style={{ fontSize:13, fontWeight:700, color:"rgba(240,235,224,0.5)" }}>
            Immo<span style={{ color:"#F97316" }}>Verdict</span>
          </span>
        </div>
        <p style={{ fontSize:12, color:"rgba(240,235,224,0.25)" }}>
          © {new Date().getFullYear()} ImmoVerdict —{" "}
          <Link href="/mentions-legales" style={{ color:"rgba(249,115,22,0.6)", textDecoration:"none" }}>Mentions légales</Link>
        </p>
      </footer>
    </div>
  );
}
