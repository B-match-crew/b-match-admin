import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * 순수 로직만 테스트한다.
 *
 * 어드민은 정지·차단·강제 탈퇴처럼 되돌리기 어려운 조작을 하는데, 그 판단에
 * 쓰이는 것들 — 날짜 경계(KST/UTC) · 에러 코드 매핑 · 인가 코드 · 프리페치
 * 키 — 은 전부 DOM 없이 검증할 수 있다. 렌더 테스트는 값이 낮은 데 비해
 * 유지비가 커서 넣지 않았다.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
