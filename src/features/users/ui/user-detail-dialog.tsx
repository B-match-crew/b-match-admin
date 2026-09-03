"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/src/shared/ui/kit/dialog";
import { Badge } from "@/src/shared/ui/kit/badge";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import { InfoField, InfoGrid } from "@/src/shared/ui/info-field";
import { formatDate, formatDateTime } from "@/src/shared/lib/format-date";
import { SegmentedTab } from "@/src/shared/ui/bds/segmented-tab";
import {
  fetchUserDetail,
} from "../api/actions";
import type {
  UserListItem,
} from "../model/actions";
import { UserConsentsTab } from "./user-consents-tab";
import type { Provider } from "@/src/shared/types/db";

const PROVIDER_LABEL: Record<Provider, string> = {
  KAKAO: "카카오",
  GOOGLE: "구글",
  APPLE: "애플",
};

const TABS = [
  { value: "info", label: "기본 정보" },
  { value: "consents", label: "동의 이력" },
] as const;

interface Props {
  user: UserListItem | null;
  onClose: () => void;
}

export function UserDetailDialog({ user, onClose }: Props) {
  const open = !!user;
  const [tab, setTab] = useState<"info" | "consents">("info");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["user-detail", user?.id],
    queryFn: () => unwrap(fetchUserDetail(user!.id)),
    enabled: open,
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) return;
        setTab("info"); // 다음에 다른 유저를 열 때 동의 이력 탭이 남아 있지 않게
        onClose();
      }}
    >
      <DialogContent className="max-w-xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            유저 상세 — {user?.nickname ?? user?.name ?? user?.id}
          </DialogTitle>
        </DialogHeader>

        <SegmentedTab items={TABS} value={tab} onValueChange={setTab} size="sm" />

        {tab === "consents" && user ? (
          <UserConsentsTab userId={user.id} />
        ) : null}

        {tab !== "info" ? null : isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : isError ? (
          <QueryError error={error} onRetry={() => void refetch()} />
        ) : data ? (
          <div className="space-y-5">
            {/* 기본 정보 */}
            <InfoGrid>
              <InfoField label="실명">{data.user.name ?? "-"}</InfoField>
              <InfoField label="닉네임">{data.user.nickname ?? "-"}</InfoField>
              <InfoField label="전화번호">{data.user.phone_number ?? "-"}</InfoField>
              <InfoField label="성별">
                {data.user.gender === "MALE" ? "남" : data.user.gender === "FEMALE" ? "여" : "-"}
              </InfoField>
              <InfoField label="출생연도">{data.user.birth_year ?? "-"}</InfoField>
              <InfoField label="급수">{data.user.level ?? "-"}</InfoField>
              <InfoField label="가입일">{formatDate(data.user.created_at)}</InfoField>
              <InfoField label="가입 경로">
                {PROVIDER_LABEL[data.user.provider] ?? data.user.provider}
              </InfoField>
              {/* 이 값은 미러다. 동의 시점·이력은 [동의 이력] 탭이 정본을 보여준다. */}
              <InfoField label="마케팅 수신">
                {data.user.marketing_opt_in ? "동의" : "미동의"}
              </InfoField>
              <InfoField label="상태">
                <StatusBadge status={data.user.user_status} />
              </InfoField>
              <InfoField label="역할">
                {data.user.admin_role ? (
                  <StatusBadge status={data.user.admin_role} />
                ) : (
                  "일반 유저"
                )}
              </InfoField>
              <InfoField label="호스트">
                {data.user.is_host ? (
                  <Badge variant="outline">호스트</Badge>
                ) : (
                  "아니오"
                )}
              </InfoField>
              {data.club && (
                <InfoField label="개설 모임" className="col-span-2">
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {data.club.club_name}
                    </span>
                    <span className="text-bds-caption2 text-bds-label-assistive">
                      #{data.club.id}
                    </span>
                    {data.club.deleted_at && <StatusBadge status="DELETED" />}
                  </span>
                </InfoField>
              )}
            </InfoGrid>

            {/* 정지 정보 */}
            {data.user.suspended_until && (
              <div className="rounded-lg border p-3 text-sm space-y-2">
                <h4 className="font-medium">제재 정보</h4>
                <div className="grid grid-cols-2 gap-3">
                  <InfoField label="정지 종료">
                    {formatDateTime(data.user.suspended_until)}
                  </InfoField>
                  <InfoField label="정지 사유" className="col-span-2">
                    {data.user.suspended_reason ?? "-"}
                  </InfoField>
                </div>
              </div>
            )}

            {/* 활동 지표 — 신고는 화면이 있지만 차단은 사각지대라 숫자로 둔다 */}
            <div className="rounded-lg border p-3 text-sm space-y-2">
              <h4 className="font-medium">활동</h4>
              <div className="grid grid-cols-3 gap-3">
                <InfoField label="차단당한 횟수">
                  <span
                    className={
                      data.blockedCount > 0
                        ? "text-bds-status-warning-text"
                        : undefined
                    }
                  >
                    {data.blockedCount}
                  </span>
                </InfoField>
                <InfoField label="모집글 신고당한 횟수">
                  <span
                    className={
                      data.reportedCount > 0
                        ? "text-bds-status-warning-text"
                        : undefined
                    }
                  >
                    {data.reportedCount}
                  </span>
                </InfoField>
                {data.chatRoomCount !== null && (
                  <InfoField label="참여 중인 대화">
                    {data.chatRoomCount}
                  </InfoField>
                )}
              </div>
            </div>

            {/* 관리 이력 */}
            {data.auditHistory.length > 0 && (
              <div className="rounded-lg border p-3 text-sm space-y-2">
                <h4 className="font-medium">관리 이력 (최근 20건)</h4>
                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  {data.auditHistory.map((log, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {log.action_type}
                      </Badge>
                      <span className="truncate">{log.reason ?? "-"}</span>
                      <span className="ml-auto shrink-0">
                        {formatDateTime(log.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

