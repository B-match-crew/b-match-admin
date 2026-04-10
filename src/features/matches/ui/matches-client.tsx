"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { EmptyState } from "@/src/shared/ui/empty-state";
import { formatDateTime } from "@/src/shared/lib/format-date";
import { useAuth } from "@/src/app/providers/auth-provider";
import { REASON_MIN_LENGTH } from "@/src/shared/config/constants";
import { toUserMessage } from "@/src/shared/lib/error-codes";
import {
  fetchMatches,
  fetchMatchDetail,
  fetchBlindedPosts,
  deleteMatchAction,
  unblindPostAction,
  softDeletePostAction,
  type MatchListItem,
  type MatchDetail,
  type BlindedPostItem,
} from "@/src/features/matches/actions";
import type { MatchStatus } from "@/src/shared/types/db";

const reasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(REASON_MIN_LENGTH, `사유는 ${REASON_MIN_LENGTH}자 이상 입력해야 합니다`)
    .max(500),
});
type ReasonForm = z.infer<typeof reasonSchema>;

export function MatchesClient() {
  return (
    <Tabs defaultValue="matches">
      <TabsList>
        <TabsTrigger value="matches">매칭</TabsTrigger>
        <TabsTrigger value="blinded">블라인드 게시글</TabsTrigger>
      </TabsList>
      <TabsContent value="matches" className="mt-4">
        <MatchesTab />
      </TabsContent>
      <TabsContent value="blinded" className="mt-4">
        <BlindedPostsTab />
      </TabsContent>
    </Tabs>
  );
}

// ─── 매칭 탭 ───

function MatchesTab() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<MatchStatus | "ALL">("ALL");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [target, setTarget] = useState<MatchListItem | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["matches", status, includeDeleted, dateFrom, dateTo],
    queryFn: () =>
      fetchMatches({
        status,
        includeDeleted,
        limit: 50,
        dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        dateTo: dateTo ? new Date(dateTo + "T23:59:59").toISOString() : undefined,
      }),
  });

  const refetch = () =>
    queryClient.invalidateQueries({ queryKey: ["matches"] });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as MatchStatus | "ALL")}
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
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-36"
            placeholder="시작일"
          />
          <span className="text-muted-foreground">~</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
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
              }}
            >
              초기화
            </Button>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={includeDeleted}
            onCheckedChange={(v) => setIncludeDeleted(v === true)}
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
              <TableHead className="text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            )}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState message="매칭이 없습니다." />
                </TableCell>
              </TableRow>
            )}
            {data?.map((m) => (
              <TableRow
                key={m.id}
                className="cursor-pointer"
                onClick={() => setDetailId(m.id)}
              >
                <TableCell className="font-mono text-xs">#{m.id}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{m.title}</span>
                    {m.is_deleted && <StatusBadge status="DELETED" />}
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
                <TableCell className="text-right">
                  <div onClick={(e) => e.stopPropagation()}>
                    {role === "SUPER_ADMIN" && !m.is_deleted && (
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
            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3">
              <Info label="제목">{data.title}</Info>
              <Info label="호스트">
                {data.host?.nickname ?? data.host?.name ?? "-"}
              </Info>
              <Info label="상태">
                <StatusBadge status={data.status} />
              </Info>
              <Info label="삭제 여부">
                {data.is_deleted ? (
                  <StatusBadge status="DELETED" />
                ) : (
                  "아니오"
                )}
              </Info>
              <Info label="시작">{formatDateTime(data.start_time)}</Info>
              <Info label="종료">{formatDateTime(data.end_time)}</Info>
              <Info label="장소">{data.location_name}</Info>
              <Info label="상세 장소">{data.location_detail ?? "-"}</Info>
              <Info label="주소">{data.address}</Info>
              <Info label="지역">
                {data.region_1} {data.region_2}
              </Info>
              <Info label="정원">{data.capacity ?? "제한 없음"}</Info>
              <Info label="성별 조건">
                {data.gender_condition === "ALL"
                  ? "무관"
                  : data.gender_condition === "MALE_ONLY"
                    ? "남성만"
                    : "여성만"}
              </Info>
              <Info label="허용 급수">
                <div className="flex gap-1 flex-wrap">
                  {data.allowed_levels.map((l) => (
                    <Badge key={l} variant="outline" className="text-xs">
                      {l}
                    </Badge>
                  ))}
                </div>
              </Info>
              <Info label="초보 환영">
                {data.beginner_friendly ? "예" : "아니오"}
              </Info>
            </div>

            {/* 비용 정보 */}
            <div className="rounded-lg border p-3 space-y-2">
              <h4 className="font-medium">비용 정보</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Info label="참가비 유형">{data.fee_config.fee.type}</Info>
                {data.fee_config.fee.cash_male != null && (
                  <Info label="참가비 (남)">
                    {data.fee_config.fee.cash_male?.toLocaleString()}원
                  </Info>
                )}
                {data.fee_config.fee.cash_female != null && (
                  <Info label="참가비 (여)">
                    {data.fee_config.fee.cash_female?.toLocaleString()}원
                  </Info>
                )}
                <Info label="시설 이용료">
                  {data.fee_config.facility_fee.enabled
                    ? `${data.fee_config.facility_fee.amount?.toLocaleString()}원`
                    : "없음"}
                </Info>
                {data.fee_config.designated_cock.brand && (
                  <Info label="지정구 브랜드">
                    {data.fee_config.designated_cock.brand}
                  </Info>
                )}
              </div>
            </div>

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

            {/* 연락처 */}
            <div className="rounded-lg border p-3 space-y-2">
              <h4 className="font-medium">연락처</h4>
              <Info label={data.contact_type === "URL" ? "URL" : "전화번호"}>
                {data.contact_value}
              </Info>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Info({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="mt-0.5">{children}</div>
    </div>
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
          <div className="rounded-md border border-destructive/50 bg-destructive/5 p-2 text-xs text-destructive">
            ⚠ 호스트에게 ADMIN_NOTICE 알림이 자동 발송됩니다.
          </div>
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

// ─── 블라인드 게시글 탭 ───

function BlindedPostsTab() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<BlindedPostItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BlindedPostItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["blinded-posts"],
    queryFn: fetchBlindedPosts,
  });

  const refetch = () =>
    queryClient.invalidateQueries({ queryKey: ["blinded-posts"] });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          블라인드 처리된 게시글 {data?.length ?? 0}건
        </p>
        <Button variant="outline" size="sm" onClick={refetch}>
          새로고침
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>제목 / 내용</TableHead>
              <TableHead>작성자</TableHead>
              <TableHead>작성일</TableHead>
              <TableHead className="text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            )}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState message="블라인드된 게시글이 없습니다." />
                </TableCell>
              </TableRow>
            )}
            {data?.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">#{p.id}</TableCell>
                <TableCell>
                  <div className="font-medium">{p.title}</div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {p.content}
                  </p>
                </TableCell>
                <TableCell>
                  {p.author?.nickname ?? p.author?.name ?? "-"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateTime(p.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setTarget(p)}
                    >
                      블라인드 해제
                    </Button>
                    {role === "SUPER_ADMIN" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteTarget(p)}
                      >
                        영구 삭제
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <UnblindPostDialog
        post={target}
        onClose={() => setTarget(null)}
        onDone={() => {
          setTarget(null);
          toast.success("블라인드가 해제되었습니다");
          refetch();
        }}
      />

      <SoftDeletePostDialog
        post={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDone={() => {
          setDeleteTarget(null);
          toast.success("게시글이 영구 삭제되었습니다");
          refetch();
        }}
      />
    </div>
  );
}

function SoftDeletePostDialog({
  post,
  onClose,
  onDone,
}: {
  post: BlindedPostItem | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const form = useForm<ReasonForm>({
    resolver: zodResolver(reasonSchema),
    defaultValues: { reason: "" },
  });

  const onSubmit = async (v: ReasonForm) => {
    if (!post) return;
    try {
      await softDeletePostAction({ postId: post.id, reason: v.reason });
      onDone();
      form.reset();
    } catch (e) {
      toast.error(toUserMessage(e));
    }
  };

  return (
    <Dialog open={!!post} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>게시글 영구 삭제</DialogTitle>
          <DialogDescription>
            #{post?.id} {post?.title}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div className="rounded-md border border-destructive/50 bg-destructive/5 p-2 text-xs text-destructive">
            ⚠ 삭제된 게시글은 복구할 수 없습니다. 연관 댓글도 함께 삭제됩니다.
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sd-reason">삭제 사유 (10자 이상)</Label>
            <Textarea id="sd-reason" rows={3} {...form.register("reason")} />
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
              영구 삭제
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UnblindPostDialog({
  post,
  onClose,
  onDone,
}: {
  post: BlindedPostItem | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const form = useForm<ReasonForm>({
    resolver: zodResolver(reasonSchema),
    defaultValues: { reason: "" },
  });

  const onSubmit = async (v: ReasonForm) => {
    if (!post) return;
    try {
      await unblindPostAction({ postId: post.id, reason: v.reason });
      onDone();
      form.reset();
    } catch (e) {
      toast.error(toUserMessage(e));
    }
  };

  return (
    <Dialog open={!!post} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>게시글 블라인드 해제</DialogTitle>
          <DialogDescription>
            #{post?.id} {post?.title}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <p className="text-xs text-muted-foreground">
            기존 PENDING 신고는 RESOLVED 로 자동 전환되어 재집계가 차단됩니다.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="ub-reason">해제 사유 (10자 이상)</Label>
            <Textarea id="ub-reason" rows={3} {...form.register("reason")} />
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
            <Button type="submit" disabled={form.formState.isSubmitting}>
              해제
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
