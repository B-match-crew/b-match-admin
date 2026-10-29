import { Badge } from "@/src/shared/ui/kit/badge";
import { cn } from "@/src/shared/lib/cn";
import { paymentStatusMeta } from "../model/status";

/**
 * 결제 상태 배지. 공용 StatusBadge 의 톤을 그대로 쓰되 키는 섞지 않는다 — 결제 상태(FAILED · READY …)가
 * 다른 화면의 상태 이름과 겹쳐 뜻이 갈릴 수 있다.
 */
const TONES = {
  positive: "bg-bds-primary-100 text-bds-primary-900",
  warning: "bg-bds-status-warning-subtle text-bds-status-warning-text",
  danger: "bg-bds-status-error-subtle text-bds-status-error-text",
  info: "bg-bds-status-info-subtle text-bds-status-info-text",
  neutral: "bg-bds-back-strong text-bds-label-neutral",
} as const;

export function PaymentStatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = paymentStatusMeta(status);
  return (
    <Badge variant="secondary" className={cn("border-0", TONES[meta.tone], className)}>
      {meta.label}
    </Badge>
  );
}
