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
    // supabase/ 는 b-match-app 산출물의 사본이다(gitignore). 이 레포의 소스가
    // 아니고 여기서 고칠 수도 없다 — 정본에서 고친다. Deno 엣지 함수라
    // Next 규칙을 적용하는 것 자체가 맞지 않는다.
    "supabase/**",
  ]),
]);

export default eslintConfig;
