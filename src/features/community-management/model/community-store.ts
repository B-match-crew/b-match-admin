import { create } from "zustand";
import type { CommunityPost, CommunityComment, BlindStatus } from "@/src/entities/community/types";

interface CommunityStore {
  posts: CommunityPost[];
  postTotalCount: number;
  postPage: number;
  postBlindFilter: "all" | BlindStatus;

  comments: CommunityComment[];
  commentTotalCount: number;
  commentPage: number;
  commentBlindFilter: "all" | BlindStatus;

  isLoading: boolean;

  setPosts: (posts: CommunityPost[], totalCount: number) => void;
  setPostPage: (page: number) => void;
  setPostBlindFilter: (status: "all" | BlindStatus) => void;

  setComments: (comments: CommunityComment[], totalCount: number) => void;
  setCommentPage: (page: number) => void;
  setCommentBlindFilter: (status: "all" | BlindStatus) => void;

  setLoading: (isLoading: boolean) => void;
}

export const useCommunityStore = create<CommunityStore>((set) => ({
  posts: [],
  postTotalCount: 0,
  postPage: 1,
  postBlindFilter: "all",

  comments: [],
  commentTotalCount: 0,
  commentPage: 1,
  commentBlindFilter: "all",

  isLoading: false,

  setPosts: (posts, totalCount) => set({ posts, postTotalCount: totalCount }),
  setPostPage: (page) => set({ postPage: page }),
  setPostBlindFilter: (status) => set({ postBlindFilter: status, postPage: 1 }),

  setComments: (comments, totalCount) => set({ comments, commentTotalCount: totalCount }),
  setCommentPage: (page) => set({ commentPage: page }),
  setCommentBlindFilter: (status) => set({ commentBlindFilter: status, commentPage: 1 }),

  setLoading: (isLoading) => set({ isLoading }),
}));
