"use client";

import { z } from "zod";
import { REASON_MIN_LENGTH } from "@/src/shared/config/constants";

/** 결제 조치 사유 — 서버(137 의 require_reason)와 같은 10자 하한. */
export const paymentReasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(REASON_MIN_LENGTH, `사유는 ${REASON_MIN_LENGTH}자 이상 입력해야 합니다`)
    .max(500),
});

export type PaymentReasonForm = z.infer<typeof paymentReasonSchema>;
