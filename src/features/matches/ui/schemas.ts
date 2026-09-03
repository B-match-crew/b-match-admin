"use client";

import { z } from "zod";
import { REASON_MIN_LENGTH } from "@/src/shared/config/constants";

export const reasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(REASON_MIN_LENGTH, `사유는 ${REASON_MIN_LENGTH}자 이상 입력해야 합니다`)
    .max(500),
});

export type ReasonForm = z.infer<typeof reasonSchema>;

export const PAGE_SIZE = 50;
