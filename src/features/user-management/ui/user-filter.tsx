"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserStore } from "../model/user-store";

export function UserFilter() {
  const { filters, setFilter } = useUserStore();

  return (
    <div className="flex items-center gap-2">
      <Select
        value={filters.status}
        onValueChange={(value) =>
          setFilter("status", value as "all" | "active" | "suspended" | "withdrawn")
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="상태" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체</SelectItem>
          <SelectItem value="active">정상</SelectItem>
          <SelectItem value="suspended">정지</SelectItem>
          <SelectItem value="withdrawn">탈퇴</SelectItem>
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
