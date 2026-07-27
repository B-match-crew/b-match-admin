import { PageHeader } from "@/src/shared/ui/page-header";
import { MatchesClient } from "@/src/features/matches/ui/matches-client";

export default function MatchesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="매칭 관리"
        description="모임을 검색·조회하고 직권 삭제·블라인드 해제를 처리합니다 (ADM-03)"
      />
      <MatchesClient />
    </div>
  );
}
