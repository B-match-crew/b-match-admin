"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { formatDate, formatTime } from "@/src/shared/lib/format-date";
import { formatCurrency } from "@/src/shared/lib/format-number";
import type { Matching } from "@/src/entities/matching/types";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  CreditCard,
  Gauge,
  UserCheck,
} from "lucide-react";

interface MatchingDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matching: Matching | null;
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
            <StatusBadge status={matching.recruitment_status} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 기본 정보 */}
          <div>
            <h3 className="text-base font-semibold">{matching.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              호스트: {matching.host_name}
            </p>
          </div>

          <Separator />

          {/* 일정/장소 */}
          <div className="space-y-3 text-sm">
            <InfoRow
              icon={<MapPin className="h-4 w-4" />}
              label="장소"
              value={matching.location}
            />
            <InfoRow
              icon={<Calendar className="h-4 w-4" />}
              label="날짜"
              value={formatDate(matching.date)}
            />
            <InfoRow
              icon={<Clock className="h-4 w-4" />}
              label="시간"
              value={`${formatTime(matching.start_time)} - ${formatTime(matching.end_time)}`}
            />
          </div>

          <Separator />

          {/* 인원/비용 */}
          <div className="space-y-3 text-sm">
            <InfoRow
              icon={<Users className="h-4 w-4" />}
              label="인원"
              value={`${matching.current_members} / ${matching.max_members}명`}
            />
            <InfoRow
              icon={<CreditCard className="h-4 w-4" />}
              label="참가비"
              value={`${formatCurrency(matching.fee)} (${matching.fee_type})`}
            />
            <InfoRow
              icon={<CreditCard className="h-4 w-4" />}
              label="코트비"
              value={`${formatCurrency(matching.court_fee)} (${matching.court_fee_type})`}
            />
            {matching.shuttlecock_brand && (
              <InfoRow
                icon={<CreditCard className="h-4 w-4" />}
                label="셔틀콕"
                value={`${matching.shuttlecock_brand} (${formatCurrency(matching.shuttlecock_price)})`}
              />
            )}
          </div>

          <Separator />

          {/* 조건 */}
          <div className="space-y-3 text-sm">
            <InfoRow
              icon={<Gauge className="h-4 w-4" />}
              label="급수"
              value={matching.skill_levels.join(", ")}
            />
            <InfoRow
              icon={<UserCheck className="h-4 w-4" />}
              label="성별"
              value={matching.gender}
            />
            <InfoRow
              icon={<UserCheck className="h-4 w-4" />}
              label="초보 환영"
              value={matching.is_beginner_welcome ? "예" : "아니오"}
            />
          </div>

          {/* 설명 */}
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

          {/* 공지 */}
          {matching.announcement && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-1">공지사항</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {matching.announcement}
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
