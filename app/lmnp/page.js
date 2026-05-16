import LmnpPageClient from "./LmnpPageClient";

// Page serveur : pas de "use client" → Next.js 15 n'injecte PAS ClientPageRoot.
// LmnpPageClient est le composant "use client" qui gère le dynamic import ssr:false.
export default function LmnpPage() {
  return <LmnpPageClient />;
}
