"use client";

import { useEffect, useCallback } from "react";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { useCommunityStore } from "../model/community-store";
import { adminFetchCommunityComments, type BlindFilter } from "@/src/app/actions/admin-read-actions";
import type { CommunityComment } from "@/src/entities/community/types";
import { adminBlindComment, adminUnblindComment } from "@/src/app/actions/admin-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { LoadingSpinner } from "@/src/shared/ui/loading-spinner";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { formatDate } from "@/src/shared/lib/format-date";
import { ChevronLeft, ChevronRight, EyeOff, Eye } from "lucide-react";
import toast from "react-hot-toast";

const ITEMS_PER_PAGE = 20;

export function CommunityCommentTable() {
  const supabase = useSupabase();
  const {
    comments,
    isLoading,
    commentTotalCount,
    commentPage,
    commentBlindFilter,
    setComments,
    setLoading,
    setCommentBlindFilter,
    setCommentPage,
  } = useCommunityStore();

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminFetchCommunityComments({
        blindFilter: commentBlindFilter,
        page: commentPage,
        limit: ITEMS_PER_PAGE,
      });
      setComments(result.comments as CommunityComment[], result.totalCount);
    } catch (error) {
      console.error("댓글 목록 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  }, [commentBlindFilter, commentPage, setComments, setLoading]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const totalPages = Math.ceil(commentTotalCount / ITEMS_PER_PAGE);

  const handleBlind = async (commentId: string) => {
    const reason = prompt("블라인드 사유를 입력해 주세요");
    if (!reason) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await adminBlindComment(commentId, user.id, reason);
      toast.success("댓글이 블라인드 처리되었습니다");
      loadComments();
    } catch {
      toast.error("블라인드 처리 실패");
    }
  };

  const handleUnblind = async (commentId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await adminUnblindComment(commentId, user.id);
      toast.success("블라인드가 해제되었습니다");
      loadComments();
    } catch {
      toast.error("블라인드 해제 실패");
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select
          value={commentBlindFilter}
          onValueChange={(value) =>
            setCommentBlindFilter(value as BlindFilter)
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="visible">공개</SelectItem>
            <SelectItem value="blinded">블라인드</SelectItem>
            <SelectItem value="deleted">삭제</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : comments.length === 0 ? (
        <EmptyState title="댓글 없음" description="댓글이 없습니다" />
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>작성자</TableHead>
                  <TableHead>내용</TableHead>
                  <TableHead>게시글 ID</TableHead>
                  <TableHead>신고 횟수</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>작성일</TableHead>
                  <TableHead>액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comments.map((comment) => (
                  <TableRow key={comment.id}>
                    <TableCell className="font-medium">
                      {comment.author?.nickname ?? "-"}
                    </TableCell>
                    <TableCell className="max-w-[250px]">
                      {truncateText(comment.content, 50)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      #{comment.post_id}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          (comment.report_count ?? 0) > 0
                            ? "text-red-600 font-medium"
                            : "text-muted-foreground"
                        }
                      >
                        {comment.report_count ?? 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={comment.is_deleted ? "DELETED" : comment.is_blind ? "BLINDED" : "VISIBLE"} />
                    </TableCell>
                    <TableCell>{formatDate(comment.created_at)}</TableCell>
                    <TableCell>
                      {!comment.is_blind && !comment.is_deleted ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleBlind(comment.id)}
                          title="블라인드"
                        >
                          <EyeOff className="h-4 w-4 text-red-600" />
                        </Button>
                      ) : comment.is_blind && !comment.is_deleted ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnblind(comment.id)}
                          title="블라인드 해제"
                        >
                          <Eye className="h-4 w-4 text-emerald-600" />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              총 {commentTotalCount}건
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCommentPage(commentPage - 1)}
                disabled={commentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                이전
              </Button>
              <span className="text-sm text-muted-foreground">
                {commentPage} / {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCommentPage(commentPage + 1)}
                disabled={commentPage >= totalPages}
              >
                다음
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
