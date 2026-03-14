"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { fetchReportById } from "../api/report-api";
import type { Report } from "@/src/entities/report/types";
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
import { formatDateTime } from "@/src/shared/lib/format-date";
import {
  User as UserIcon,
  Flag,
  Calendar,
  FileText,
  Image,
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
  const [reporterInfo, setReporterInfo] = useState<Record<string, unknown> | null>(null);
  const [reportedInfo, setReportedInfo] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!reportId || !open) return;

    const loadReport = async () => {
      setIsLoading(true);
      try {
        // 신고 상세 + 관련 유저 정보 조회
        const { data, error } = await supabase
          .from("reports")
          .select(
            `
            *,
            reporter:users!reports_reporter_id_fkey(id, nickname, real_name, profile_image_url),
            reported:users!reports_reported_id_fkey(id, nickname, real_name, profile_image_url, battiket_score, is_active)
          `
          )
          .eq("id", reportId)
          .single();

        if (error) throw error;

        setReport({
          ...data,
          reporter_nickname: data.reporter?.nickname,
          reported_nickname: data.reported?.nickname,
        } as Report);
        setReporterInfo(data.reporter as Record<string, unknown>);
        setReportedInfo(data.reported as Record<string, unknown>);
      } catch (error) {
        console.error("신고 상세 조회 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadReport();
  }, [supabase, reportId, open]);

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
            {/* 상태 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">현재 상태:</span>
              <StatusBadge status={report.status} />
            </div>

            <Separator />

            {/* 신고자 정보 */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Flag className="h-4 w-4" />
                신고자
              </h4>
              <UserInfoCard
                nickname={(reporterInfo?.nickname as string) ?? "-"}
                realName={(reporterInfo?.real_name as string) ?? "-"}
                profileImage={reporterInfo?.profile_image_url as string | null}
              />
            </div>

            <Separator />

            {/* 피신고자 정보 */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                피신고자
              </h4>
              <UserInfoCard
                nickname={(reportedInfo?.nickname as string) ?? "-"}
                realName={(reportedInfo?.real_name as string) ?? "-"}
                profileImage={reportedInfo?.profile_image_url as string | null}
              />
              {reportedInfo && (
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span>
                    배티켓: <strong>{reportedInfo.battiket_score as number}</strong>
                  </span>
                  <span>
                    상태:{" "}
                    <StatusBadge
                      status={(reportedInfo.is_active as boolean) ? "정상" : "정지"}
                    />
                  </span>
                </div>
              )}
            </div>

            <Separator />

            {/* 신고 사유 */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                신고 사유
              </h4>
              <p className="text-sm whitespace-pre-wrap rounded-lg bg-muted p-3">
                {report.reason}
              </p>
            </div>

            {/* 증거 */}
            {report.evidence && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  증거 자료
                </h4>
                <p className="text-sm whitespace-pre-wrap rounded-lg bg-muted p-3">
                  {report.evidence}
                </p>
              </div>
            )}

            {/* 처리 결과 (이미 처리된 경우) */}
            {report.admin_note && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">관리자 메모</h4>
                <p className="text-sm whitespace-pre-wrap rounded-lg bg-muted p-3">
                  {report.admin_note}
                </p>
              </div>
            )}

            <Separator />

            {/* 날짜 정보 */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  접수일
                </span>
                <span>{formatDateTime(report.created_at)}</span>
              </div>
              {report.processed_at && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    처리일
                  </span>
                  <span>{formatDateTime(report.processed_at)}</span>
                </div>
              )}
            </div>

            {/* 처리 버튼 */}
            {report.status === "처리 대기" && (
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
  profileImage,
}: {
  nickname: string;
  realName: string;
  profileImage: string | null;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        {profileImage ? (
          <img
            src={profileImage}
            alt={nickname}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <UserIcon className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div>
        <p className="text-sm font-medium">{nickname}</p>
        <p className="text-xs text-muted-foreground">{realName}</p>
      </div>
    </div>
  );
}
