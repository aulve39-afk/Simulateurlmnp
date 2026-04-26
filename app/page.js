// La page d'accueil est servie directement par /public/immopilote.html
// via le rewrite beforeFiles dans next.config.ts.
// Ce fichier ne doit jamais être rendu — le rewrite prend la priorité.
export default function Home() {
  return null;
}
