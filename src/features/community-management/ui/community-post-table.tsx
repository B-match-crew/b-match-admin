"use client";

import { useEffect, useCallback } from "react";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { useCommunityStore } from "../model/community-store";
import { fetchCommunityPosts, blindPost, unblindPost, type BlindFilter } from "../api/community-api";
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

export function CommunityPostTable() {
  const supabase = useSupabase();
  const {
    posts,
    isLoading,
    postTotalCount,
    postPage,
    postBlindFilter,
    setPosts,
    setLoading,
    setPostBlindFilter,
    setPostPage,
  } = useCommunityStore();

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchCommunityPosts(supabase, {
        blindFilter: postBlindFilter,
        page: postPage,
        limit: ITEMS_PER_PAGE,
      });
      setPosts(result.posts, result.totalCount);
    } catch (error) {
      console.error("게시글 목록 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase, postBlindFilter, postPage, setPosts, setLoading]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const totalPages = Math.ceil(postTotalCount / ITEMS_PER_PAGE);

  const handleBlind = async (postId: string) => {
    const reason = prompt("블라인드 사유를 입력해 주세요");
    if (!reason) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await blindPost(supabase, postId, user.id, reason);
      toast.success("게시글이 블라인드 처리되었습니다");
      loadPosts();
    } catch {
      toast.error("블라인드 처리 실패");
    }
  };

  const handleUnblind = async (postId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await unblindPost(supabase, postId, user.id);
      toast.success("블라인드가 해제되었습니다");
      loadPosts();
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
          value={postBlindFilter}
          onValueChange={(value) =>
            setPostBlindFilter(value as BlindFilter)
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
      ) : posts.length === 0 ? (
        <EmptyState title="게시글 없음" description="게시글이 없습니다" />
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>작성자</TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead>신고 횟수</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>작성일</TableHead>
                  <TableHead>액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium">
                      {post.author?.nickname ?? "-"}
                    </TableCell>
                    <TableCell className="max-w-[250px]">
                      {truncateText(post.title, 40)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          (post.report_count ?? 0) > 0
                            ? "text-red-600 font-medium"
                            : "text-muted-foreground"
                        }
                      >
                        {post.report_count ?? 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={post.is_deleted ? "DELETED" : post.is_blind ? "BLINDED" : "VISIBLE"} />
                    </TableCell>
                    <TableCell>{formatDate(post.created_at)}</TableCell>
                    <TableCell>
                      {!post.is_blind && !post.is_deleted ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleBlind(post.id)}
                          title="블라인드"
                        >
                          <EyeOff className="h-4 w-4 text-red-600" />
                        </Button>
                      ) : post.is_blind && !post.is_deleted ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnblind(post.id)}
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
            <p className="text-sm text-muted-foreground">총 {postTotalCount}건</p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPostPage(postPage - 1)}
                disabled={postPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                이전
              </Button>
              <span className="text-sm text-muted-foreground">
                {postPage} / {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPostPage(postPage + 1)}
                disabled={postPage >= totalPages}
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
