import { PageHeader } from "@/src/shared/ui/page-header";
import { UsersClient } from "@/src/features/users/ui/users-client";

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="유저 관리"
        description="가입된 유저를 검색·조회하고 정지/차단을 관리합니다 (ADM-02)"
      />
      <UsersClient />
    </div>
  );
}
