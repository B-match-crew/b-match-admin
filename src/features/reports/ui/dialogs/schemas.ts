"use client";

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

export function defaultSuspendUntil(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  // datetime-local 포맷 (yyyy-MM-ddTHH:mm)
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
