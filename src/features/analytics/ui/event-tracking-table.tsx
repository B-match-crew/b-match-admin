"use client";

import { useEffect } from "react";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { fetchEventSummary } from "../api/analytics-api";
import { useAnalyticsStore } from "../model/analytics-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { LoadingSpinner } from "@/src/shared/ui/loading-spinner";
import { formatDateTime } from "@/src/shared/lib/format-date";
import { formatNumber } from "@/src/shared/lib/format-number";

export function EventTrackingTable() {
  const supabase = useSupabase();
  const { events, isLoading, setEvents, setIsLoading } = useAnalyticsStore();

  useEffect(() => {
    setIsLoading(true);
    fetchEventSummary(supabase)
      .then((data) => setEvents(data))
      .finally(() => setIsLoading(false));
  }, [supabase, setEvents, setIsLoading]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">GA4 이벤트 추적</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <EmptyState description="이벤트 데이터가 없습니다" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이벤트명</TableHead>
                <TableHead className="text-right">발생 횟수</TableHead>
                <TableHead>최근 발생일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.eventName}>
                  <TableCell className="font-medium font-mono text-sm">
                    {event.eventName}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(event.count)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {event.lastOccurred
                      ? formatDateTime(event.lastOccurred)
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
