import { Badge } from "@/src/shared/ui/kit/badge";
import { cn } from "@/src/shared/lib/cn";
import { payoutStatusMeta, settlementStatusMeta } from "../model/status";

/** 정산 배지 — 결제 배지와 같은 톤, 키는 섞지 않는다(FAILED · CANCELED 가 결제와 뜻이 다르다). */
const TONES = {
  positive: "bg-bds-primary-100 text-bds-primary-900",
  warning: "bg-bds-status-warning-subtle text-bds-status-warning-text",
  danger: "bg-bds-status-error-subtle text-bds-status-error-text",
  info: "bg-bds-status-info-subtle text-bds-status-info-text",
  neutral: "bg-bds-back-strong text-bds-label-neutral",
} as const;

export function PayoutStatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = payoutStatusMeta(status);
  return (
    <Badge variant="secondary" className={cn("border-0", TONES[meta.tone], className)}>
      {meta.label}
    </Badge>
  );
}

export function SettlementStatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = settlementStatusMeta(status);
  return (
    <Badge variant="secondary" className={cn("border-0", TONES[meta.tone], className)}>
      {meta.label}
    </Badge>
  );
}

/** 결정 전 임시값 표시. */
export function ProvisionalBadge({ decision }: { decision: string }) {
  return (
    <Badge variant="secondary" className={cn("border-0", TONES.warning)}>
      임시 · {decision}
    </Badge>
  );
}
