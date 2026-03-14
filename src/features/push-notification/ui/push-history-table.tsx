"use client";

import { useEffect } from "react";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { fetchPushHistory } from "../api/push-api";
import { usePushStore } from "../model/push-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { LoadingSpinner } from "@/src/shared/ui/loading-spinner";
import { formatDateTime } from "@/src/shared/lib/format-date";
import { DEFAULT_PAGE_SIZE } from "@/src/shared/config/constants";
import { ChevronLeft, ChevronRight } from "lucide-react";

const TARGET_LABELS: Record<string, string> = {
  all: "전체",
  hosts: "호스트만",
  custom: "커스텀",
};

export function PushHistoryTable() {
  const supabase = useSupabase();
  const { history, total, page, isLoading, setHistory, setPage, setIsLoading } =
    usePushStore();

  const totalPages = Math.ceil(total / DEFAULT_PAGE_SIZE);

  useEffect(() => {
    setIsLoading(true);
    fetchPushHistory(supabase, page, DEFAULT_PAGE_SIZE)
      .then(({ data, total }) => {
        setHistory(data, total);
      })
      .finally(() => setIsLoading(false));
  }, [supabase, page, setHistory, setIsLoading]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">발송 이력</CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <EmptyState description="발송 이력이 없습니다" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>제목</TableHead>
                  <TableHead>대상</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>발송일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell>
                      {TARGET_LABELS[item.target] ?? item.target}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.sent_at
                        ? formatDateTime(item.sent_at)
                        : item.scheduled_at
                          ? `예약: ${formatDateTime(item.scheduled_at)}`
                          : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
