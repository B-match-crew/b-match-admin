"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { fetchReportById, fetchPastReports, type ReportDetail } from "../api/report-api";
import type { Report, PastReportRecord } from "@/src/entities/report/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { LoadingSpinner } from "@/src/shared/ui/loading-spinner";
import { formatDateTime, formatDate } from "@/src/shared/lib/format-date";
import {
  User as UserIcon,
  Flag,
  Calendar,
  FileText,
  Target,
  History,
} from "lucide-react";

interface ReportDetailPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string | null;
  onAction: (report: Report) => void;
}

export function ReportDetailPanel({
  open,
  onOpenChange,
  reportId,
  onAction,
}: ReportDetailPanelProps) {
  const supabase = useSupabase();
  const [report, setReport] = useState<Report | null>(null);
  const [reporterInfo, setReporterInfo] = useState<{ nickname: string; real_name: string | null } | null>(null);
  const [targetContent, setTargetContent] = useState<string | null>(null);
  const [pastReports, setPastReports] = useState<PastReportRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!reportId || !open) return;

    const loadReport = async () => {
      setIsLoading(true);
      try {
        const result = await fetchReportById(supabase, reportId);
        setReport(result.report);
        setReporterInfo(result.reporterInfo);
        setTargetContent(result.targetContent);

        // 피신고자 과거 신고 이력 조회
        if (result.report.target_user_id) {
          const history = await fetchPastReports(
            supabase,
            result.report.target_user_id,
            reportId
          );
          setPastReports(history);
        } else {
          setPastReports([]);
        }
      } catch (error) {
        console.error("신고 상세 조회 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadReport();
  }, [supabase, reportId, open]);

  const targetTypeLabel: Record<string, string> = {
    POST: "게시글",
    COMMENT: "댓글",
    MATCH: "매칭",
    HOST_NOSHOW: "호스트 노쇼",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>신고 상세</SheetTitle>
          <SheetDescription>신고 접수 내용을 확인하고 처리합니다</SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <LoadingSpinner />
        ) : !report ? (
          <p className="text-center text-muted-foreground py-8">
            신고 정보를 불러올 수 없습니다
          </p>
        ) : (
          <div className="space-y-5 mt-4 px-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">현재 상태:</span>
              <StatusBadge status={report.status} />
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Flag className="h-4 w-4" />
                신고자
              </h4>
              <UserInfoCard
                nickname={reporterInfo?.nickname ?? "-"}
                realName={reporterInfo?.real_name ?? "-"}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4" />
                신고 대상
              </h4>
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <StatusBadge status={targetTypeLabel[report.target_type] ?? report.target_type} />
                  <span className="text-xs text-muted-foreground">
                    #{report.target_id}
                  </span>
                </div>
                {targetContent && (
                  <p className="text-sm whitespace-pre-wrap bg-muted rounded-md p-2">
                    {targetContent}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                신고 사유
              </h4>
              <p className="text-sm whitespace-pre-wrap rounded-lg bg-muted p-3">
                {report.reason}
              </p>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  접수일
                </span>
                <span>{formatDateTime(report.created_at)}</span>
              </div>
            </div>

            {/* 피신고자 과거 신고 이력 */}
            {pastReports.length > 0 && (
              <>
                <Separator />
                <PastReportHistory reports={pastReports} />
              </>
            )}

            {(report.status === "PENDING" || report.status === "ON_HOLD") && (
              <>
                <Separator />
                <Button className="w-full" onClick={() => onAction(report)}>
                  처리하기
                </Button>
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function UserInfoCard({
  nickname,
  realName,
}: {
  nickname: string;
  realName: string | null;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <UserIcon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">{nickname}</p>
        <p className="text-xs text-muted-foreground">{realName ?? "-"}</p>
      </div>
    </div>
  );
}

function PastReportHistory({ reports }: { reports: PastReportRecord[] }) {
  const targetTypeLabel: Record<string, string> = {
    POST: "게시글",
    COMMENT: "댓글",
    MATCH: "매칭",
    HOST_NOSHOW: "호스트 노쇼",
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <History className="h-4 w-4" />
        피신고자 과거 신고 이력
        <span className="text-xs font-normal text-muted-foreground">
          ({reports.length}건)
        </span>
      </h4>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {reports.map((record) => (
          <div
            key={record.id}
            className="rounded-lg border p-2.5 space-y-1 text-xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <StatusBadge status={record.status} />
                <span className="text-muted-foreground">
                  {targetTypeLabel[record.target_type] ?? record.target_type}
                </span>
              </div>
              <span className="text-muted-foreground">
                {formatDate(record.created_at)}
              </span>
            </div>
            <p className="text-muted-foreground line-clamp-2">{record.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
