import { redirect } from "next/navigation";

// La page d'accueil est servie par /public/immopilote.html via next.config.ts rewrite.
// Ce fallback redirige au cas où le rewrite ne s'applique pas.
export default function Home() {
  redirect("/immopilote.html");
}
