"use client";

import { PageHeader } from "@/src/shared/ui/page-header";
import { UserSearchBar } from "@/src/features/user-management/ui/user-search-bar";
import { UserFilter } from "@/src/features/user-management/ui/user-filter";
import { UserTable } from "@/src/features/user-management/ui/user-table";

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="유저 관리"
        description="가입된 유저를 검색, 조회하고 관리할 수 있습니다"
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <UserSearchBar />
        <UserFilter />
      </div>

      <UserTable />
    </div>
  );
}
