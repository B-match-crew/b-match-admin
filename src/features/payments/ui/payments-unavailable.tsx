import { ActionFailure } from "@/src/shared/lib/unwrap";
import { WarningBox } from "@/src/shared/ui/warning-box";

/** 이 DB 에 결제(app migration 136 · 137)가 없다 — PostgREST 가 함수를 못 찾는다(PGRST202). */
export function isPaymentsMissing(error: unknown): boolean {
  return error instanceof ActionFailure && error.code === "PGRST202";
}

export function PaymentsUnavailable() {
  return (
    <WarningBox tone="caution" className="text-bds-body3">
      이 환경의 DB 에는 결제(app migration 136 · 137)가 적용돼 있지 않습니다. 결제는 Phase 0 동안 <b>dev 에만</b>
      있습니다 — 운영(prod)에는 Phase 2 에서 적용합니다.
    </WarningBox>
  );
}
