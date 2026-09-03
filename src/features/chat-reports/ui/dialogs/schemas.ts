"use client";

import { z } from "zod";
import { REASON_MIN_LENGTH } from "@/src/shared/config/constants";
import type { ChatReportListItem } from "../../model/actions";

export type ActionMode =
  | { kind: "suspend" }
  | { kind: "ban" }
  | { kind: "closeRoom" }
  | null;

export const reasonField = z
  .string()
  .trim()
  .min(REASON_MIN_LENGTH, `사유는 ${REASON_MIN_LENGTH}자 이상 입력해야 합니다`)
  .max(500);

export const banSchema = z.object({ reason: reasonField });

export const suspendSchema = z.object({
  until: z.string().min(1, "정지 종료일을 선택하세요"),
  reason: reasonField,
});

export function targetLabel(report: ChatReportListItem) {
  return report.target?.nickname ?? report.target?.name ?? `#${report.target_id}`;
}

export function defaultSuspendUntil(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  // datetime-local 포맷 (yyyy-MM-ddTHH:mm)
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
