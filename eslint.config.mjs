import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Désactivé : les apostrophes françaises dans le JSX (l'investisseur, c'est…)
      // ne posent aucun problème de rendu en UTF-8 avec React moderne.
      // Corriger 30+ occurrences dans du texte statique apporterait plus de bruit que de valeur.
      "react/no-unescaped-entities": "off",

      // Rétrogradé en warning : variables déclarées mais non utilisées.
      // Elles seront nettoyées progressivement sans bloquer les déploiements.
      "@typescript-eslint/no-unused-vars": "warn",

      // Rétrogradé en warning : expressions sans effet (souvent du dead code à nettoyer).
      "@typescript-eslint/no-unused-expressions": "warn",
    },
  },
];

export default eslintConfig;
