import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * FSD 레이어 경계를 컴파일러가 아니라 lint 가 강제한다.
 *
 * 의존은 아래로만 흐른다: shared ← entities ← features ← app.
 * 그리고 슬라이스는 **public API(index.ts)로만** 열린다 — 내부 경로를 직접
 * 찌르면 ui/ 안을 정리할 때마다 바깥이 함께 깨진다.
 *
 * 슬라이스 **내부**끼리는 상대경로로 import 한다. 그래야 "@/src/features/x/..."
 * 라는 형태 자체를 '바깥에서 내부를 찌르는 것'으로 단정할 수 있다.
 */
const SLICE_INTERNALS = {
  group: ["@/src/features/*/*", "@/src/entities/*/*"],
  message:
    "슬라이스 내부를 직접 import 하지 말 것 — public API(@/src/features/<slice>)를 쓰거나, 같은 슬라이스 안이면 상대경로를 쓴다.",
};

const UPPER_LAYERS_FROM_SHARED = {
  group: ["@/src/entities/*", "@/src/features/*", "@/src/app/*"],
  message:
    "shared 는 가장 아래 레이어다. 도메인을 아는 것은 entities 이상으로 올린다.",
};

const UPPER_LAYERS_FROM_ENTITIES = {
  group: ["@/src/features/*", "@/src/app/*"],
  message:
    "entities 는 feature 를 모른다. 두 feature 가 함께 쓰는 것이면 entity 안으로 내린다.",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "no-restricted-imports": ["error", { patterns: [SLICE_INTERNALS] }],
    },
  },
  {
    files: ["src/shared/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [SLICE_INTERNALS, UPPER_LAYERS_FROM_SHARED] },
      ],
    },
  },
  {
    files: ["src/entities/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [SLICE_INTERNALS, UPPER_LAYERS_FROM_ENTITIES] },
      ],
    },
  },
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
