import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 서버 프리페치와 화면의 queryKey 가 어긋나면 **조용히 비용이 늘어난다.**
 * 하이드레이션이 안 붙어 같은 조회가 클라이언트에서 한 번 더 나가는데,
 * 화면은 멀쩡히 그려지므로 아무도 눈치채지 못한다.
 *
 * 실제로 한 번 어긋났다 — 섹션은 days 를 number 로 키에 넣는데 프리페치는
 * 문자열 "30" 을 넣었다.
 */
const KEY_RE = /queryKey: (\[[^\]]*\])/g;

/**
 * 주석은 코드가 아니다 — 주석 처리로 내려 둔 조회를 "쓰고 있다" 로 세면 안 된다.
 * 블록 주석(JSX 의 {/* *\/} 포함)과 행 첫머리 `//` 주석을 먼저 걷어낸다.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function keysIn(path: string): Set<string> {
  const out = new Set<string>();
  for (const m of stripComments(readFileSync(path, "utf8")).matchAll(KEY_RE)) {
    out.add(m[1].replace(/\s+/g, ""));
  }
  return out;
}

/**
 * 화면에 **실제로 올라간** 섹션 파일.
 *
 * sections/ 디렉터리를 통째로 훑으면 주석 처리로 내려 둔 섹션까지 "화면이 쓰는
 * 조회" 로 셈한다. 그러면 안 그리는 섹션의 조회를 프리페치에서 빼는 순간 이
 * 테스트가 깨지고, 빼지 않으면 아무도 안 보는 RPC 가 페이지를 열 때마다 돈다.
 * stats-client.tsx 의 **살아있는** import 줄만 센다 — `// import` 는 행 첫머리가
 * `import` 가 아니라 걸리지 않는다.
 */
function mountedSections(): string[] {
  const client = readFileSync(
    join(process.cwd(), "src/features/stats/ui/stats-client.tsx"),
    "utf8"
  );
  return [...client.matchAll(/^import \{[^}]+\} from "\.\/sections\/([\w-]+)";$/gm)].map(
    (m) => `${m[1]}.tsx`
  );
}

describe("통계 프리페치", () => {
  const sectionsDir = join(process.cwd(), "src/features/stats/ui/sections");
  const mounted = mountedSections();
  const sectionKeys = new Set<string>();
  for (const f of mounted) {
    for (const k of keysIn(join(sectionsDir, f))) sectionKeys.add(k);
  }
  const prefetchKeys = keysIn(
    join(process.cwd(), "src/features/stats/api/prefetch.ts")
  );

  it("화면이 쓰는 모든 조회를 서버가 미리 채운다", () => {
    expect([...sectionKeys].filter((k) => !prefetchKeys.has(k))).toEqual([]);
  });

  it("화면이 쓰지 않는 조회를 서버가 채우지 않는다", () => {
    expect([...prefetchKeys].filter((k) => !sectionKeys.has(k))).toEqual([]);
  });

  it("화면에 올라간 섹션이 9개다 — 프리페치 목록이 조용히 비지 않았는가", () => {
    // 매칭 시간대 분포를 주석 처리해 10 → 9 (2026-09-30). 되살리면 10 으로.
    expect(sectionKeys.size).toBe(9);
  });

  it("살아있는 import 가 가리키는 섹션 파일이 전부 존재한다", () => {
    // 정규식이 import 를 하나도 못 잡으면 위 단정들이 빈 집합끼리 비교해 통과해
    // 버린다. 목록이 비지 않았고 파일도 실재하는지 따로 확인한다.
    const files = new Set(readdirSync(sectionsDir));
    expect(mounted.length).toBeGreaterThan(0);
    expect(mounted.filter((f) => !files.has(f))).toEqual([]);
  });
});
