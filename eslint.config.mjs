import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local Netlify CLI build/deploy cache — gitignored, but not swept up
    // by the defaults above, so a local `netlify deploy` run leaves behind
    // a compiled bundle that previously drowned real lint output in noise.
    ".netlify/**",
  ]),
]);

export default eslintConfig;
