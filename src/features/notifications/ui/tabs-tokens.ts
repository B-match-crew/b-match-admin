"use client";

export const TABS = [
  { value: "summary", label: "발송 현황" },
  { value: "failures", label: "실패 내역" },
  { value: "reach", label: "도달·토큰" },
  { value: "categories", label: "카테고리" },
] as const;

export type Tab = (typeof TABS)[number]["value"];

export const RANGES = [
  { value: "7", label: "7일" },
  { value: "30", label: "30일" },
  { value: "90", label: "90일" },
] as const;

export const STATUS_LABEL: Record<string, string> = {
  SENT: "발송 성공",
  FAILED: "발송 실패",
  SKIPPED: "토큰 없음",
  PENDING: "대기",
  SENDING: "발송 중",
  "(기록없음)": "기록 없음",
};
