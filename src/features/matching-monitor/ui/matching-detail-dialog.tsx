"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { useAuth } from "@/src/app/providers/auth-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { formatDate, formatDateTime } from "@/src/shared/lib/format-date";
import { formatNumber } from "@/src/shared/lib/format-number";
import type { Match } from "@/src/entities/matching/types";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminCancelMatch } from "../api/matching-api";
import {
  MapPin,
  Calendar,
  Users,
  Gauge,
  UserCheck,
  CreditCard,
  ShieldAlert,
} from "lucide-react";

interface MatchingDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matching: Match | null;
  onMatchUpdated?: () => void;
}

interface Applicant {
  id: string;
  status: string;
  message: string | null;
  total_amount: number;
  created_at: string;
  guest?: { nickname: string; real_name: string | null } | null;
}

export function MatchingDetailDialog({
  open,
  onOpenChange,
  matching,
  onMatchUpdated,
}: MatchingDetailDialogProps) {
  const supabase = useSupabase();
  const { user } = useAuth();
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (!matching) return null;

  const isSuperAdmin = user?.app_metadata?.role === "SUPER_ADMIN";
  const isCancelable =
    matching.status !== "CANCELED_BY_ADMIN" &&
    matching.status !== "CANCELED_BY_HOST" &&
    matching.status !== "ENDED";

  async function handleForceCancel() {
    if (!matching || !cancelReason.trim()) return;
    setIsCanceling(true);
    try {
      await adminCancelMatch(supabase, matching.id, cancelReason.trim());
      setShowCancelConfirm(false);
      setCancelReason("");
      onMatchUpdated?.();
      onOpenChange(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "직권 취소에 실패했습니다");
    } finally {
      setIsCanceling(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
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

          <Separator />

          {/* 신청자 목록 & 결제 상태 탭 */}
          <ApplicantsTabs matchId={matching.id} />

          {isSuperAdmin && isCancelable && (
            <>
              <Separator />
              {!showCancelConfirm ? (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setShowCancelConfirm(true)}
                >
                  <ShieldAlert className="mr-2 h-4 w-4" />
                  직권 취소
                </Button>
              ) : (
                <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-medium text-red-700">
                    이 모임을 직권 취소하시겠습니까?
                  </p>
                  <p className="text-xs text-red-600">
                    직권 취소 시 모든 참가자에게 환불 처리되며 되돌릴 수 없습니다.
                  </p>
                  <textarea
                    className="w-full rounded-md border border-red-300 bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="취소 사유를 입력하세요 (필수)"
                    rows={2}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      disabled={isCanceling || !cancelReason.trim()}
                      onClick={handleForceCancel}
                    >
                      {isCanceling ? "처리 중..." : "직권 취소 확인"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setShowCancelConfirm(false);
                        setCancelReason("");
                      }}
                    >
                      취소
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ApplicantsTabs({ matchId }: { matchId: string | number }) {
  const supabase = useSupabase();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from("applications")
          .select("id, status, message, total_amount, created_at, guest:guest_id(nickname, real_name)")
          .eq("match_id", matchId)
          .order("created_at", { ascending: false });

        setApplicants((data ?? []) as Applicant[]);
      } catch (e) {
        console.error("신청자 조회 실패:", e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [supabase, matchId]);

  const statusCounts = applicants.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <Tabs defaultValue="applicants">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="applicants" className="gap-1">
          <Users className="h-3 w-3" />
          신청자 ({applicants.length})
        </TabsTrigger>
        <TabsTrigger value="payment" className="gap-1">
          <CreditCard className="h-3 w-3" />
          결제 현황
        </TabsTrigger>
      </TabsList>

      <TabsContent value="applicants">
        {isLoading ? (
          <div className="text-center text-sm text-muted-foreground py-4">로딩 중...</div>
        ) : applicants.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-4">신청자가 없습니다</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>게스트</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>금액</TableHead>
                <TableHead>신청일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applicants.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">
                    {app.guest?.nickname ?? "-"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={app.status} />
                  </TableCell>
                  <TableCell>{formatNumber(app.total_amount)}원</TableCell>
                  <TableCell>{formatDateTime(app.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TabsContent>

      <TabsContent value="payment">
        {isLoading ? (
          <div className="text-center text-sm text-muted-foreground py-4">로딩 중...</div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="전체 신청" value={applicants.length} />
              <StatCard label="참가 확정" value={statusCounts["CONFIRMED"] ?? 0} color="text-emerald-600" />
              <StatCard label="결제 대기" value={statusCounts["PENDING_PAYMENT"] ?? 0} color="text-amber-600" />
              <StatCard label="승인 대기" value={statusCounts["PENDING"] ?? 0} color="text-blue-600" />
              <StatCard label="취소/거절" value={(statusCounts["CANCELED"] ?? 0) + (statusCounts["REJECTED"] ?? 0)} color="text-red-600" />
              <StatCard
                label="총 결제 금액"
                value={`${formatNumber(
                  applicants
                    .filter((a) => a.status === "CONFIRMED" || a.status === "PAID")
                    .reduce((sum, a) => sum + a.total_amount, 0)
                )}원`}
              />
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold ${color ?? ""}`}>{value}</p>
    </div>
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
