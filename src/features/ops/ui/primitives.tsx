"use client";

import { Badge } from "@/src/shared/ui/kit/badge";
import { formatNumber } from "@/src/shared/lib/format-number";

/** compliance 화면의 Tile 과 같은 모양 — 두 화면의 리듬을 맞춘다. */
export function Tile({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number;
  tone?: "danger" | "warning";
  hint?: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-bds-caption2 text-bds-label-assistive">{label}</div>
      <div
        className={`mt-0.5 text-bds-title3 tabular-nums ${
          tone === "danger"
            ? "text-bds-status-error-text"
            : tone === "warning"
              ? "text-bds-status-warning-text"
              : "text-foreground"
        }`}
      >
        {formatNumber(value)}
      </div>
      {hint && (
        <div className="text-bds-caption2 text-bds-label-alternative">{hint}</div>
      )}
    </div>
  );
}

export function CronStatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return (
      <Badge className="bg-bds-back-strong text-bds-label-neutral">-</Badge>
    );
  }
  if (status === "succeeded") {
    return (
      <Badge className="bg-bds-primary-100 text-bds-primary-900">성공</Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge className="bg-bds-status-error-subtle text-bds-status-error-text">
        실패
      </Badge>
    );
  }
  return (
    <Badge className="bg-bds-status-info-subtle text-bds-status-info-text">
      {status}
    </Badge>
  );
}
