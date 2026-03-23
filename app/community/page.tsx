"use client";

import { PageHeader } from "@/src/shared/ui/page-header";
import { CommunityPostTable } from "@/src/features/community-management/ui/community-post-table";
import { CommunityCommentTable } from "@/src/features/community-management/ui/community-comment-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CommunityPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="커뮤니티 관리"
        description="게시글/댓글 블라인드 처리 및 관리"
      />

      <Tabs defaultValue="posts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="posts">게시글</TabsTrigger>
          <TabsTrigger value="comments">댓글</TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          <CommunityPostTable />
        </TabsContent>

        <TabsContent value="comments">
          <CommunityCommentTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
