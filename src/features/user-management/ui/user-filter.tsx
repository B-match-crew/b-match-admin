"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserStore } from "../model/user-store";
import type { UserStatus } from "@/src/entities/user/types";

export function UserFilter() {
  const { filters, setFilter } = useUserStore();

  return (
    <div className="flex items-center gap-2">
      <Select
        value={filters.status}
        onValueChange={(value) =>
          setFilter("status", value as "all" | UserStatus)
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="상태" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체</SelectItem>
          <SelectItem value="ACTIVE">정상</SelectItem>
          <SelectItem value="SUSPENDED">정지</SelectItem>
          <SelectItem value="BANNED">차단</SelectItem>
          <SelectItem value="DELETED">탈퇴</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.role}
        onValueChange={(value) =>
          setFilter("role", value as "all" | "user" | "host")
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="권한" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체</SelectItem>
          <SelectItem value="user">일반</SelectItem>
          <SelectItem value="host">호스트</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
