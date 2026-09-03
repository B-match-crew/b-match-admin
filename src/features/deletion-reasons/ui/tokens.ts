"use client";

export const RANGES = [
  { value: "30", label: "30일" },
  { value: "90", label: "90일" },
  { value: "all", label: "전체" },
] as const;

export type Range = (typeof RANGES)[number]["value"];

export const PAGE_SIZE = 50;
