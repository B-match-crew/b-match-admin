"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { WarningBox } from "@/src/shared/ui/warning-box";
import { InfoField, InfoGrid } from "@/src/shared/ui/info-field";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { formatDateTime } from "@/src/shared/lib/format-date";
import { useAuth } from "@/src/app/providers/auth-provider";
import { REASON_MIN_LENGTH } from "@/src/shared/config/constants";
import { toUserMessage } from "@/src/shared/lib/error-codes";
import {
  fetchMatches,
  fetchMatchDetail,
  deleteMatchAction,
  type MatchListItem,
} from "@/src/features/matches/actions";
import { normalizeFeeConfig, type MatchStatus } from "@/src/shared/types/db";

const reasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(REASON_MIN_LENGTH, `사유는 ${REASON_MIN_LENGTH}자 이상 입력해야 합니다`)
    .max(500),
});
type ReasonForm = z.infer<typeof reasonSchema>;

const PAGE_SIZE = 50;

export function MatchesClient() {
  return <MatchesTab />;
}

// ─── 매칭 탭 ───

function MatchesTab() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<MatchStatus | "ALL">("ALL");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [target, setTarget] = useState<MatchListItem | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["matches", status, includeDeleted, dateFrom, dateTo, page],
    queryFn: () =>
      fetchMatches({
        status,
        includeDeleted,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        dateTo: dateTo ? new Date(dateTo + "T23:59:59").toISOString() : undefined,
      }),
  });

  const rows = data?.rows;
  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  const refetch = () =>
    queryClient.invalidateQueries({ queryKey: ["matches"] });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as MatchStatus | "ALL");
            setPage(0);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체</SelectItem>
            <SelectItem value="RECRUITING">모집중</SelectItem>
            <SelectItem value="CLOSED">마감</SelectItem>
            <SelectItem value="ENDED">종료</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(0);
            }}
            className="w-36"
            placeholder="시작일"
          />
          <span className="text-muted-foreground">~</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(0);
            }}
            className="w-36"
            placeholder="종료일"
          />
          {(dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
                setPage(0);
              }}
            >
              초기화
            </Button>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={includeDeleted}
            onCheckedChange={(v) => {
              setIncludeDeleted(v === true);
              setPage(0);
            }}
          />
          삭제된 모임 포함
        </label>
        <Button variant="outline" size="sm" onClick={refetch}>
          새로고침
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>제목</TableHead>
              <TableHead>호스트</TableHead>
              <TableHead>지역</TableHead>
              <TableHead>시작</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="text-right">조회수</TableHead>
              <TableHead className="text-right">찜</TableHead>
              <TableHead className="text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            )}
            {!isLoading && (rows?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={9}>
                  <EmptyState message="매칭이 없습니다." />
                </TableCell>
              </TableRow>
            )}
            {rows?.map((m) => (
              <TableRow
                key={m.id}
                className="cursor-pointer"
                onClick={() => setDetailId(m.id)}
              >
                <TableCell className="font-mono text-xs">#{m.id}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{m.title}</span>
                    {m.deleted_at && <StatusBadge status="DELETED" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {m.location_name}
                  </p>
                </TableCell>
                <TableCell>{m.host?.nickname ?? m.host?.name ?? "-"}</TableCell>
                <TableCell className="text-sm">{m.region_1}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateTime(m.start_time)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={m.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {(m.view_count ?? 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {(m.favorite_count ?? 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <div onClick={(e) => e.stopPropagation()}>
                    {role === "SUPER_ADMIN" && !m.deleted_at && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setTarget(m)}
                      >
                        직권 삭제
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            이전
          </Button>
          <span className="text-sm text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            다음
          </Button>
        </div>
      )}

      <MatchDetailDialog
        matchId={detailId}
        onClose={() => setDetailId(null)}
      />

      <DeleteMatchDialog
        match={target}
        onClose={() => setTarget(null)}
        onDone={() => {
          setTarget(null);
          toast.success("매칭이 삭제되었습니다");
          refetch();
        }}
      />
    </div>
  );
}

// ─── 매칭 상세 모달 ───

function MatchDetailDialog({
  matchId,
  onClose,
}: {
  matchId: number | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["match-detail", matchId],
    queryFn: () => fetchMatchDetail(matchId!),
    enabled: matchId !== null,
  });

  return (
    <Dialog open={matchId !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>매칭 상세 #{matchId}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : data ? (
          <div className="space-y-4 text-sm">
            <InfoGrid>
              <InfoField label="제목">{data.title}</InfoField>
              <InfoField label="호스트">
                {data.host?.nickname ?? data.host?.name ?? "-"}
              </InfoField>
              <InfoField label="상태">
                <StatusBadge status={data.status} />
              </InfoField>
              <InfoField label="삭제 여부">
                {data.deleted_at ? (
                  <StatusBadge status="DELETED" />
                ) : (
                  "아니오"
                )}
              </InfoField>
              <InfoField label="시작">{formatDateTime(data.start_time)}</InfoField>
              <InfoField label="종료">{formatDateTime(data.end_time)}</InfoField>
              <InfoField label="장소">{data.location_name}</InfoField>
              <InfoField label="상세 장소">{data.location_detail ?? "-"}</InfoField>
              <InfoField label="주소">{data.address}</InfoField>
              <InfoField label="지역">
                {data.region_1} {data.region_2}
              </InfoField>
              <InfoField label="정원">{data.capacity ?? "제한 없음"}</InfoField>
              <InfoField label="성별 조건">
                {data.gender_condition === "ALL"
                  ? "무관"
                  : data.gender_condition === "MALE_ONLY"
                    ? "남성만"
                    : "여성만"}
              </InfoField>
              <InfoField label="허용 급수">
                <div className="flex gap-1 flex-wrap">
                  {data.allowed_levels.map((l) => (
                    <Badge key={l} variant="outline" className="text-xs">
                      {l}
                    </Badge>
                  ))}
                </div>
              </InfoField>
              <InfoField label="초보 환영">
                {data.beginner_friendly ? "예" : "아니오"}
              </InfoField>
              <InfoField label="조회수">
                {(data.view_count ?? 0).toLocaleString()}회
              </InfoField>
              <InfoField label="찜">
                {(data.favorite_count ?? 0).toLocaleString()}개
              </InfoField>
            </InfoGrid>

            {/* 비용 정보 */}
            {(() => {
              const fc = normalizeFeeConfig(data.fee_config);
              return (
                <div className="rounded-lg border p-3 space-y-2">
                  <h4 className="font-medium">비용 정보</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <InfoField label="참가비 유형">{fc.fee.type}</InfoField>
                    {fc.fee.cash_male != null && (
                      <InfoField label="참가비 (남)">
                        {fc.fee.cash_male?.toLocaleString()}원
                      </InfoField>
                    )}
                    {fc.fee.cash_female != null && (
                      <InfoField label="참가비 (여)">
                        {fc.fee.cash_female?.toLocaleString()}원
                      </InfoField>
                    )}
                    <InfoField label="시설 이용료">
                      {fc.facilityFee.enabled
                        ? `${fc.facilityFee.amount?.toLocaleString()}원`
                        : "없음"}
                    </InfoField>
                    {fc.designatedCock.brand && (
                      <InfoField label="지정구 브랜드">
                        {fc.designatedCock.brand}
                      </InfoField>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* 편의시설 */}
            <div className="rounded-lg border p-3 space-y-2">
              <h4 className="font-medium">편의시설</h4>
              <div className="flex gap-2">
                {data.facilities.parking && (
                  <Badge variant="outline">주차</Badge>
                )}
                {data.facilities.shower && (
                  <Badge variant="outline">샤워</Badge>
                )}
                {data.facilities.water && (
                  <Badge variant="outline">음수대</Badge>
                )}
                {data.facilities.rental && (
                  <Badge variant="outline">대여</Badge>
                )}
                {!data.facilities.parking &&
                  !data.facilities.shower &&
                  !data.facilities.water &&
                  !data.facilities.rental && (
                    <span className="text-muted-foreground">없음</span>
                  )}
              </div>
            </div>

            {/* 설명 */}
            {data.description && (
              <div className="rounded-lg border p-3 space-y-2">
                <h4 className="font-medium">설명</h4>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {data.description}
                </p>
              </div>
            )}

            {/* 기타 안내 */}
            {data.additional_info && (
              <div className="rounded-lg border p-3 space-y-2">
                <h4 className="font-medium">기타 안내</h4>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {data.additional_info}
                </p>
              </div>
            )}

            {/* 연락처 */}
            <div className="rounded-lg border p-3 space-y-2">
              <h4 className="font-medium">연락처</h4>
              <InfoField label={data.contact_type === "URL" ? "URL" : "전화번호"}>
                {data.contact_value}
              </InfoField>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}


// ─── 매칭 삭제 다이얼로그 ───

function DeleteMatchDialog({
  match,
  onClose,
  onDone,
}: {
  match: MatchListItem | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const form = useForm<ReasonForm>({
    resolver: zodResolver(reasonSchema),
    defaultValues: { reason: "" },
  });

  const onSubmit = async (v: ReasonForm) => {
    if (!match) return;
    try {
      await deleteMatchAction({ matchId: match.id, reason: v.reason });
      onDone();
      form.reset();
    } catch (e) {
      toast.error(toUserMessage(e));
    }
  };

  return (
    <Dialog open={!!match} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>매칭 직권 삭제</DialogTitle>
          <DialogDescription>
            #{match?.id} {match?.title}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <WarningBox>
            ⚠ 호스트에게 ADMIN_NOTICE 알림이 자동 발송됩니다.
          </WarningBox>
          <div className="space-y-1.5">
            <Label htmlFor="del-reason">삭제 사유 (10자 이상)</Label>
            <Textarea id="del-reason" rows={3} {...form.register("reason")} />
            {form.formState.errors.reason && (
              <p className="text-xs text-destructive">
                {form.formState.errors.reason.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={form.formState.isSubmitting}
            >
              삭제
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
