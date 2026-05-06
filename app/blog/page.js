import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

const LogoMark = () => (
  <svg width="28" height="28" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{flexShrink:0}}>
    <rect x="0" y="0" width="30" height="3" fill="#F97316"/>
    <rect x="0" y="3" width="12" height="27" fill="#F0EBE0"/>
    <rect x="18" y="3" width="12" height="18" fill="#F0EBE0"/>
  </svg>
);

export default function BlogPage() {
  const posts = getAllPosts();
  const categories = [...new Set(posts.map((p) => p.category).filter(Boolean))];

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
              transition:"color .2s",
            }}>{label}</Link>
          ))}
          <Link href="/lmnp" style={{
            marginLeft:24, padding:"8px 18px", background:"#F97316", color:"#0C0C10",
            fontWeight:700, fontSize:13, textDecoration:"none", letterSpacing:".01em",
          }}>
            Lancer le simulateur
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <header style={{ maxWidth:1080, margin:"0 auto", padding:"72px 48px 48px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <div style={{ width:3, height:36, background:"#F97316" }} />
          <span style={{ fontSize:11, fontWeight:700, letterSpacing:"3px", textTransform:"uppercase", color:"#F97316" }}>
            Guides &amp; Analyses
          </span>
        </div>
        <h1 style={{ fontFamily:"'DM Serif Display',Georgia,serif", fontSize:"clamp(2.4rem,5vw,3.6rem)", fontWeight:400, lineHeight:1.05, marginBottom:20, color:"#F0EBE0" }}>
          Blog <em style={{ color:"#F97316", fontStyle:"normal" }}>ImmoVerdict</em>
        </h1>
        <p style={{ fontSize:"1.05rem", color:"rgba(240,235,224,0.5)", maxWidth:520, lineHeight:1.7, fontWeight:300 }}>
          LMNP, fiscalité immobilière, PTZ, DPE — nos guides pratiques pour investir et acheter intelligemment en France.
        </p>

        {/* Catégories */}
        {categories.length > 1 && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:32 }}>
            {categories.map((cat) => (
              <span key={cat} style={{
                fontSize:11, fontWeight:700, padding:"5px 14px",
                border:"1px solid rgba(249,115,22,0.35)", color:"#F97316",
                letterSpacing:"1.5px", textTransform:"uppercase",
              }}>{cat}</span>
            ))}
          </div>
        )}
      </header>

      {/* Ligne séparatrice */}
      <div style={{ maxWidth:1080, margin:"0 auto 48px", borderTop:"1px solid rgba(240,235,224,0.08)" }} />

      {/* ── GRILLE ARTICLES ── */}
      <main style={{ maxWidth:1080, margin:"0 auto", padding:"0 48px 96px" }}>
        {posts.length === 0 ? (
          <p style={{ color:"rgba(240,235,224,0.3)", textAlign:"center", padding:"80px 0" }}>Aucun article pour le moment.</p>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:0, border:"1px solid rgba(240,235,224,0.08)" }}>
            {posts.map((post, i) => (
              <ArticleCard key={post.slug} post={post} index={i} />
            ))}
          </div>
        )}
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

function ArticleCard({ post, index }) {
  const dateStr = post.date
    ? new Date(post.date).toLocaleDateString("fr-FR", { day:"numeric", month:"long", year:"numeric" })
    : "";

  const col = index % 3;
  const borderRight = col < 2 ? "1px solid rgba(240,235,224,0.08)" : "none";
  const borderBottom = "1px solid rgba(240,235,224,0.08)";

  return (
    <Link href={`/blog/${post.slug}`} className="article-card" style={{
      display:"flex", flexDirection:"column", textDecoration:"none",
      padding:0, borderRight, borderBottom,
    }}>
      {/* Orange top accent */}
      <div style={{ height:3, background:"#F97316", width:"100%" }} />

      <div style={{ padding:"28px 28px 24px", display:"flex", flexDirection:"column", flex:1 }}>
        {/* Category + reading time */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          {post.category && (
            <span style={{ fontSize:10, fontWeight:700, color:"#F97316", letterSpacing:"2px", textTransform:"uppercase" }}>
              {post.category}
            </span>
          )}
          {post.readingTime && (
            <span style={{ fontSize:11, color:"rgba(240,235,224,0.3)" }}>{post.readingTime}</span>
          )}
        </div>

        {/* Title */}
        <h2 style={{ fontFamily:"'DM Serif Display',Georgia,serif", fontSize:"1.15rem", fontWeight:400, lineHeight:1.3, marginBottom:10, color:"#F0EBE0" }}>
          {post.title}
        </h2>

        {/* Description */}
        {post.description && (
          <p style={{ fontSize:".84rem", color:"rgba(240,235,224,0.45)", lineHeight:1.65, flex:1, display:"-webkit-box", WebkitLineClamp:3, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
            {post.description}
          </p>
        )}

        {/* Date */}
        {dateStr && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:20, paddingTop:16, borderTop:"1px solid rgba(240,235,224,0.07)" }}>
            <span style={{ fontSize:11, color:"rgba(240,235,224,0.25)" }}>{dateStr}</span>
            <span style={{ fontSize:11, color:"#F97316", fontWeight:700 }}>Lire →</span>
          </div>
        )}
      </div>
    </Link>
  );
}
