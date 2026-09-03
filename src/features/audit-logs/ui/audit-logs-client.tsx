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
} from "@/src/shared/ui/kit/table";
import { Badge } from "@/src/shared/ui/kit/badge";
import { Button } from "@/src/shared/ui/kit/button";
import { Input } from "@/src/shared/ui/kit/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/shared/ui/kit/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/src/shared/ui/kit/dialog";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import { InfoField, InfoGrid } from "@/src/shared/ui/info-field";
import { formatDateTime } from "@/src/shared/lib/format-date";
import {
  fetchAuditLogs,
} from "../api/actions";
import type {
  AuditLogRow,
} from "../model/actions";
import { downloadCsv } from "@/src/shared/lib/csv-export";

/**
 * 필터 목록은 **DB 가 실제로 기록하는 값**과 같아야 한다. 여기 없는 종류는
 * 필터로 찾을 수 없고, 목록에서는 영문 코드로만 보인다 — 유저 제재 4종만
 * 적혀 있어 공지 발송·버전 정책·점검 이력이 필터에서 빠져 있었다.
 */
const ACTION_TYPES = [
  "ALL",
  "SUSPEND",
  "BAN",
  "DELETE_MATCH",
  "UNSUSPEND",
  "CLOSE_CHAT_ROOM",
  "BROADCAST_NOTICE",
  "UPDATE_NOTIFICATION_CATEGORY",
  "UPDATE_APP_VERSION_POLICY",
  "ENABLE_MAINTENANCE",
  "DISABLE_MAINTENANCE",
] as const;

const ACTION_LABELS: Record<string, string> = {
  ALL: "전체",
  SUSPEND: "유저 정지",
  BAN: "유저 영구차단",
  DELETE_MATCH: "매칭 삭제",
  UNSUSPEND: "정지 해제",
  CLOSE_CHAT_ROOM: "대화 종료",
  BROADCAST_NOTICE: "공지 발송",
  UPDATE_NOTIFICATION_CATEGORY: "알림 카테고리 수정",
  UPDATE_APP_VERSION_POLICY: "앱 버전 정책 변경",
  ENABLE_MAINTENANCE: "서버 점검 시작",
  DISABLE_MAINTENANCE: "서버 점검 해제",
};

export function AuditLogsClient() {
  const [actionType, setActionType] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["audit-logs", actionType, submittedSearch],
    queryFn: () =>
      unwrap(
        fetchAuditLogs({ actionType, search: submittedSearch, limit: 200 })
      ),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
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
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmittedSearch(search);
          }}
        >
          <Input
            placeholder="사유 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-60"
          />
          <Button type="submit" variant="outline" size="sm">
            검색
          </Button>
        </form>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          새로고침
        </Button>
        {data && data.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              downloadCsv(
                `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`,
                ["ID", "액션", "관리자", "대상 타입", "대상 ID", "사유", "시각"],
                data.map((l) => [
                  String(l.id),
                  ACTION_LABELS[l.action_type] ?? l.action_type,
                  l.admin?.nickname ?? l.admin?.name ?? String(l.admin_id),
                  l.target_type ?? "",
                  l.target_id ?? "",
                  l.reason ?? "",
                  l.created_at,
                ])
              );
            }}
          >
            CSV 다운로드
          </Button>
        )}
        <p className="ml-auto text-sm text-muted-foreground">
          최근 {data?.length ?? 0}건
        </p>
      </div>

      {isError && (
        <QueryError
          section="감사 로그"
          error={error}
          onRetry={() => void refetch()}
        />
      )}

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
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            )}
            {!isLoading && !isError && (data?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState message="로그가 없습니다." />
                </TableCell>
              </TableRow>
            )}
            {data?.map((log) => (
              <TableRow
                key={log.id}
                className="cursor-pointer"
                onClick={() => setSelectedLog(log)}
              >
                <TableCell className="font-mono text-xs">#{log.id}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {ACTION_LABELS[log.action_type] ?? log.action_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  {log.admin?.nickname ?? log.admin?.name ?? (
                    <span className="font-mono text-xs text-muted-foreground">
                      #{log.admin_id}
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

      <AuditLogDetailDialog
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
}

// ─── 상세 모달 ───

function AuditLogDetailDialog({
  log,
  onClose,
}: {
  log: AuditLogRow | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!log} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>감사 로그 #{log?.id}</DialogTitle>
        </DialogHeader>

        {log && (
          <div className="space-y-4 text-sm">
            <InfoGrid>
              <InfoField label="액션">
                <Badge variant="outline">
                  {ACTION_LABELS[log.action_type] ?? log.action_type}
                </Badge>
              </InfoField>
              <InfoField label="관리자">
                {log.admin?.nickname ?? log.admin?.name ?? log.admin_id}
              </InfoField>
              <InfoField label="대상 타입">{log.target_type ?? "-"}</InfoField>
              <InfoField label="대상 ID">{log.target_id ?? "-"}</InfoField>
              <InfoField label="시각">{formatDateTime(log.created_at)}</InfoField>
            </InfoGrid>

            {log.reason && (
              <div className="rounded-lg border p-3 space-y-1">
                <h4 className="font-medium">사유</h4>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {log.reason}
                </p>
              </div>
            )}

            {log.detail && Object.keys(log.detail).length > 0 && (
              <div className="rounded-lg border p-3 space-y-1">
                <h4 className="font-medium">상세 (detail)</h4>
                <pre className="whitespace-pre-wrap text-xs text-muted-foreground bg-muted p-2 rounded overflow-auto max-h-64">
                  {JSON.stringify(log.detail, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

