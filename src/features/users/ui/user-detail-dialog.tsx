"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { formatDate, formatDateTime } from "@/src/shared/lib/format-date";
import { fetchUserDetail, type UserListItem } from "@/src/features/users/actions";

interface Props {
  user: UserListItem | null;
  onClose: () => void;
}

export function UserDetailDialog({ user, onClose }: Props) {
  const open = !!user;

  const { data, isLoading } = useQuery({
    queryKey: ["user-detail", user?.id],
    queryFn: () => fetchUserDetail(user!.id),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            유저 상세 — {user?.nickname ?? user?.name ?? user?.id}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : data ? (
          <div className="space-y-5">
            {/* 기본 정보 */}
            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
              <Info label="실명">{data.user.name ?? "-"}</Info>
              <Info label="닉네임">{data.user.nickname ?? "-"}</Info>
              <Info label="전화번호">{data.user.phone_number ?? "-"}</Info>
              <Info label="성별">
                {data.user.gender === "MALE" ? "남" : data.user.gender === "FEMALE" ? "여" : "-"}
              </Info>
              <Info label="출생연도">{data.user.birth_year ?? "-"}</Info>
              <Info label="급수">{data.user.level ?? "-"}</Info>
              <Info label="가입일">{formatDate(data.user.created_at)}</Info>
              <Info label="상태">
                <StatusBadge status={data.user.user_status} />
              </Info>
              <Info label="역할">
                {data.user.admin_role ? (
                  <StatusBadge status={data.user.admin_role} />
                ) : (
                  "일반 유저"
                )}
              </Info>
              <Info label="호스트">
                {data.user.is_host ? (
                  <Badge variant="outline">호스트</Badge>
                ) : (
                  "아니오"
                )}
              </Info>
            </div>

            {/* 신고 / 정지 정보 */}
            <div className="rounded-lg border p-3 text-sm space-y-2">
              <h4 className="font-medium">제재 정보</h4>
              <div className="grid grid-cols-2 gap-3">
                <Info label="누적 신고 (피신고)">
                  {data.reportCount > 0 ? (
                    <Badge className="bg-red-100 text-red-700 border-red-200">
                      {data.reportCount}건
                    </Badge>
                  ) : (
                    "0건"
                  )}
                </Info>
                {data.user.suspended_until && (
                  <>
                    <Info label="정지 종료">
                      {formatDateTime(data.user.suspended_until)}
                    </Info>
                    <Info label="정지 사유" className="col-span-2">
                      {data.user.suspended_reason ?? "-"}
                    </Info>
                  </>
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

function Info({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
