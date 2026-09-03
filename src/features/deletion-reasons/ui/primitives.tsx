"use client";

import { formatNumber } from "@/src/shared/lib/format-number";
import { DELETION_REASON_LABEL, LEGACY_REASON_CODE } from "../model/constants";

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

export function ReasonLabel({ code }: { code: string }) {
  if (code === LEGACY_REASON_CODE) {
    return (
      <span className="text-muted-foreground">
        {LEGACY_REASON_CODE}{" "}
        <span className="text-bds-caption2">— 앱 1.1.1 이하</span>
      </span>
    );
  }
  const label = DELETION_REASON_LABEL[code];
  return label ? (
    <span>{label}</span>
  ) : (
    // 앱이 새 코드를 추가했는데 여기 라벨이 없는 경우 — 깨지지 않고 코드가 보인다.
    <span className="font-mono text-xs">{code}</span>
  );
}
