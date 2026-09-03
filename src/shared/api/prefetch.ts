import "server-only";
import {
  QueryClient,
  dehydrate,
  type DehydratedState,
} from "@tanstack/react-query";

/**
 * 서버 컴포넌트에서 조회를 미리 채워 클라이언트로 넘긴다.
 *
 * ## 왜
 *
 * 화면마다 조회가 7~10개씩 걸려 있는데, 그걸 전부 클라이언트가 서버 액션으로
 * 부르면 **액션 호출 하나가 곧 요청 하나**다. 그리고 액션마다 인가를 다시
 * 하므로(Auth 서버 검증 + users 조회 = 왕복 2회) 실제 비용은 이렇게 된다:
 *
 *     조회 10개 → 요청 10 × (인가 2 + 쿼리 1) = 왕복 30
 *
 * 같은 조회를 한 요청 안에서 하면 `requireAdmin` 이 요청 단위로 메모이즈되므로
 * (role-guard.ts) 인가는 한 번뿐이다:
 *
 *     조회 10개 → 요청 1 × (인가 2 + 쿼리 10) = 왕복 12
 *
 * 게다가 첫 화면이 빈 상태로 떴다가 채워지지 않는다.
 *
 * ## 규칙
 *
 * - queryKey 와 queryFn 은 **클라이언트와 글자 그대로 같아야** 한다. 다르면
 *   하이드레이션이 안 붙고 클라이언트가 같은 조회를 한 번 더 한다 — 줄이려던
 *   왕복이 오히려 늘어난다.
 * - 하나가 실패해도 나머지는 그대로 넘긴다(`Promise.allSettled`). 실패한 것만
 *   클라이언트가 다시 부르고, 그 섹션만 에러를 그린다.
 */
export async function prefetchAll(
  queries: { queryKey: readonly unknown[]; queryFn: () => Promise<unknown> }[]
): Promise<DehydratedState> {
  const client = new QueryClient();
  await Promise.allSettled(
    queries.map((q) => client.prefetchQuery({ queryKey: q.queryKey, queryFn: q.queryFn }))
  );
  return dehydrate(client);
}
