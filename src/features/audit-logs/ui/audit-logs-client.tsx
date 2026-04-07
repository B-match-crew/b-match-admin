"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/src/shared/lib/format-date";
import { fetchAuditLogs } from "@/src/features/audit-logs/actions";

const ACTION_TYPES = [
  "ALL",
  "SUSPEND_USER",
  "BAN_USER",
  "DELETE_MATCH",
  "BLIND_POST",
  "UNBLIND_POST",
  "SEND_PUSH",
  "REJECT_REPORT",
] as const;

const ACTION_LABELS: Record<string, string> = {
  ALL: "전체",
  SUSPEND_USER: "유저 정지",
  BAN_USER: "유저 영구차단",
  DELETE_MATCH: "매칭 삭제",
  BLIND_POST: "게시글 블라인드",
  UNBLIND_POST: "블라인드 해제",
  SEND_PUSH: "푸시 발송",
  REJECT_REPORT: "신고 반려",
};

export function AuditLogsClient() {
  const [actionType, setActionType] = useState<string>("ALL");
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["audit-logs", actionType],
    queryFn: () => fetchAuditLogs({ actionType, limit: 200 }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select
          value={actionType}
          onValueChange={(v) => v && setActionType(v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {ACTION_LABELS[t] ?? t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          새로고침
        </Button>
        <p className="ml-auto text-sm text-muted-foreground">
          최근 {data?.length ?? 0}건
        </p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>액션</TableHead>
              <TableHead>관리자</TableHead>
              <TableHead>대상</TableHead>
              <TableHead>사유</TableHead>
              <TableHead>시각</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  불러오는 중...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  로그가 없습니다.
                </TableCell>
              </TableRow>
            )}
            {data?.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-mono text-xs">#{log.id}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {ACTION_LABELS[log.action_type] ?? log.action_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  {log.admin?.nickname ?? log.admin?.name ?? (
                    <span className="font-mono text-xs text-muted-foreground">
                      {log.admin_id.slice(0, 8)}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {log.target_type ? (
                    <span>
                      {log.target_type}{" "}
                      <span className="font-mono text-xs">
                        #{log.target_id ?? "-"}
                      </span>
                    </span>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="max-w-md">
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {log.reason ?? "-"}
                  </p>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateTime(log.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
