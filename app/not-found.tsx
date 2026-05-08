import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page introuvable — ImmoVerdict",
  description: "Cette page n'existe pas ou a été déplacée.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: "#0C0C10" }}
    >
      {/* Icône */}
      <div className="text-6xl mb-6">🏚️</div>

      {/* Code */}
      <p
        className="text-sm font-bold uppercase tracking-widest mb-2"
        style={{ color: "#F97316" }}
      >
        Erreur 404
      </p>

      {/* Titre */}
      <h1
        className="text-2xl font-extrabold mb-3"
        style={{ color: "rgba(248,250,252,0.95)" }}
      >
        Cette page est introuvable
      </h1>

      {/* Description */}
      <p
        className="text-sm max-w-sm mb-8"
        style={{ color: "rgba(248,250,252,0.5)" }}
      >
        La page que vous cherchez n&apos;existe pas ou a été déplacée.
        Revenez à l&apos;accueil pour continuer votre simulation.
      </p>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/lmnp"
          className="px-6 py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #F97316, #EA580C)" }}
        >
          📊 Simulateur LMNP
        </Link>
        <Link
          href="/rp"
          className="px-6 py-3 rounded-xl text-sm font-semibold transition-colors"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(248,250,252,0.8)",
          }}
        >
          🏠 Résidence principale
        </Link>
      </div>

      {/* Lien retour */}
      <Link
        href="/"
        className="mt-6 text-xs underline"
        style={{ color: "rgba(248,250,252,0.3)" }}
      >
        ← Retour à l&apos;accueil
      </Link>
    </div>
  );
}
