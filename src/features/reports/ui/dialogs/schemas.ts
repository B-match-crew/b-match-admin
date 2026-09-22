"use client";

import { localInputValueDaysFromNow } from "@/src/shared/lib/format-date";
import { z } from "zod";
import { REASON_MIN_LENGTH } from "@/src/shared/config/constants";

export type ActionMode =
  | { kind: "delete" }
  | { kind: "suspend" }
  | { kind: "ban" }
  | null;

export const reasonField = z
  .string()
  .trim()
  .min(REASON_MIN_LENGTH, `사유는 ${REASON_MIN_LENGTH}자 이상 입력해야 합니다`)
  .max(500);

export const deleteSchema = z.object({ reason: reasonField });

export const banSchema = z.object({ reason: reasonField });

export const suspendSchema = z.object({
  until: z.string().min(1, "정지 종료일을 선택하세요"),
  reason: reasonField,
});

/** 정지 종료일 기본값 — 7일 뒤(로컬 시각, datetime-local 형식). */
export function defaultSuspendUntil(): string {
  return localInputValueDaysFromNow(7);
}
