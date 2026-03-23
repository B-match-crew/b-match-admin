"use client";

import { useEffect, useCallback } from "react";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { useBatticketStore } from "../model/batticket-store";
import { fetchBatticketEvents, REASON_LABELS } from "../api/batticket-api";
import type { BadticketReason } from "@/src/entities/battiket/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/src/shared/ui/loading-spinner";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { formatDateTime } from "@/src/shared/lib/format-date";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EVENTS_PER_PAGE = 30;

export function BatticketEventPanel() {
  const supabase = useSupabase();
  const {
    selectedUserId,
    selectedUserNickname,
    events,
    eventsLoading,
    eventsTotalCount,
    eventsPage,
    setSelectedUser,
    setEvents,
    setEventsLoading,
    setEventsPage,
  } = useBatticketStore();

  const loadEvents = useCallback(async () => {
    if (!selectedUserId) return;
    setEventsLoading(true);
    try {
      const result = await fetchBatticketEvents(supabase, {
        userId: selectedUserId,
        page: eventsPage,
        limit: EVENTS_PER_PAGE,
      });
      setEvents(result.events, result.totalCount);
    } catch (error) {
      console.error("배티켓 이벤트 로딩 실패:", error);
    } finally {
      setEventsLoading(false);
    }
  }, [supabase, selectedUserId, eventsPage, setEvents, setEventsLoading]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const totalPages = Math.ceil(eventsTotalCount / EVENTS_PER_PAGE);

  const getDeltaIcon = (delta: number) => {
    if (delta > 0)
      return <TrendingUp className="h-4 w-4 text-emerald-600" />;
    if (delta < 0)
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getDeltaColor = (delta: number) => {
    if (delta > 0) return "text-emerald-600";
    if (delta < 0) return "text-red-600";
    return "text-gray-500";
  };

  return (
    <Sheet
      open={!!selectedUserId}
      onOpenChange={(open) => {
        if (!open) setSelectedUser(null, null);
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>배티켓 이벤트 이력</SheetTitle>
          <SheetDescription>
            {selectedUserNickname ?? "사용자"}님의 점수 변동 이력
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 px-4 space-y-3">
          {eventsLoading ? (
            <LoadingSpinner />
          ) : events.length === 0 ? (
            <EmptyState
              title="이벤트 이력이 없습니다"
              description="배티켓 변동 기록이 없습니다"
            />
          ) : (
            <>
              <div className="space-y-2">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <div className="mt-0.5">
                      {getDeltaIcon(event.delta)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {REASON_LABELS[event.reason as BadticketReason] ??
                            event.reason}
                        </Badge>
                        <span
                          className={cn(
                            "font-mono text-sm font-bold",
                            getDeltaColor(event.delta)
                          )}
                        >
                          {event.delta > 0
                            ? `+${event.delta.toFixed(2)}`
                            : event.delta.toFixed(2)}
                        </span>
                      </div>
                      {event.admin_note && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {event.admin_note}
                        </p>
                      )}
                      {event.reference_match_id && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          매칭 #{event.reference_match_id}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDateTime(event.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEventsPage(eventsPage - 1)}
                    disabled={eventsPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {eventsPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEventsPage(eventsPage + 1)}
                    disabled={eventsPage >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
