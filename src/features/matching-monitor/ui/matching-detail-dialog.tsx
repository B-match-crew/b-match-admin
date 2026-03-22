"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { formatDate } from "@/src/shared/lib/format-date";
import type { Match } from "@/src/entities/matching/types";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Calendar,
  Users,
  Gauge,
  UserCheck,
} from "lucide-react";

interface MatchingDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matching: Match | null;
}

export function MatchingDetailDialog({
  open,
  onOpenChange,
  matching,
}: MatchingDetailDialogProps) {
  if (!matching) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            매칭 상세 정보
            <StatusBadge status={matching.status} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold">{matching.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              호스트: {matching.host?.nickname ?? matching.host_id.slice(0, 8)}
            </p>
          </div>

          <Separator />

          <div className="space-y-3 text-sm">
            <InfoRow
              icon={<MapPin className="h-4 w-4" />}
              label="장소"
              value={matching.location_name}
            />
            {matching.location_detail && (
              <InfoRow
                icon={<MapPin className="h-4 w-4" />}
                label="상세 장소"
                value={matching.location_detail}
              />
            )}
            <InfoRow
              icon={<Calendar className="h-4 w-4" />}
              label="시작"
              value={formatDate(matching.start_time)}
            />
            <InfoRow
              icon={<Calendar className="h-4 w-4" />}
              label="종료"
              value={formatDate(matching.end_time)}
            />
          </div>

          <Separator />

          <div className="space-y-3 text-sm">
            <InfoRow
              icon={<Users className="h-4 w-4" />}
              label="정원"
              value={matching.capacity ? `${matching.capacity}명` : "제한 없음"}
            />
            <InfoRow
              icon={<Gauge className="h-4 w-4" />}
              label="허용 급수"
              value={matching.allowed_levels.join(", ")}
            />
            <InfoRow
              icon={<UserCheck className="h-4 w-4" />}
              label="성별 조건"
              value={matching.gender_condition}
            />
            <InfoRow
              icon={<UserCheck className="h-4 w-4" />}
              label="초보 환영"
              value={matching.beginner_friendly ? "예" : "아니오"}
            />
          </div>

          {matching.designated_cock_brand && (
            <>
              <Separator />
              <InfoRow
                icon={<Gauge className="h-4 w-4" />}
                label="지정 셔틀콕"
                value={matching.designated_cock_brand}
              />
            </>
          )}

          {matching.description && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-1">설명</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {matching.description}
                </p>
              </div>
            </>
          )}

          {matching.notice && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-1">공지사항</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {matching.notice}
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
