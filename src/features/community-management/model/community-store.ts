import { create } from "zustand";
import type { CommunityPost, CommunityComment } from "@/src/entities/community/types";
import type { BlindFilter } from "@/src/features/community-management/api/community-api";

interface CommunityStore {
  posts: CommunityPost[];
  postTotalCount: number;
  postPage: number;
  postBlindFilter: BlindFilter;

  comments: CommunityComment[];
  commentTotalCount: number;
  commentPage: number;
  commentBlindFilter: BlindFilter;

  isLoading: boolean;

  setPosts: (posts: CommunityPost[], totalCount: number) => void;
  setPostPage: (page: number) => void;
  setPostBlindFilter: (filter: BlindFilter) => void;

  setComments: (comments: CommunityComment[], totalCount: number) => void;
  setCommentPage: (page: number) => void;
  setCommentBlindFilter: (filter: BlindFilter) => void;

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
