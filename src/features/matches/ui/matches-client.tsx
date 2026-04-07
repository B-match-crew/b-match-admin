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
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { formatDateTime } from "@/src/shared/lib/format-date";
import { useAuth } from "@/src/app/providers/auth-provider";
import { REASON_MIN_LENGTH } from "@/src/shared/config/constants";
import { toUserMessage } from "@/src/shared/lib/error-codes";
import {
  fetchMatches,
  fetchBlindedPosts,
  deleteMatchAction,
  unblindPostAction,
  type MatchListItem,
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
  const [target, setTarget] = useState<MatchListItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["matches", status, includeDeleted],
    queryFn: () => fetchMatches({ status, includeDeleted, limit: 50 }),
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
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  불러오는 중...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  매칭이 없습니다.
                </TableCell>
              </TableRow>
            )}
            {data?.map((m) => (
              <TableRow key={m.id}>
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
                  {role === "SUPER_ADMIN" && !m.is_deleted && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setTarget(m)}
                    >
                      직권 삭제
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<BlindedPostItem | null>(null);

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
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  불러오는 중...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  블라인드된 게시글이 없습니다.
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTarget(p)}
                  >
                    블라인드 해제
                  </Button>
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
    </div>
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
