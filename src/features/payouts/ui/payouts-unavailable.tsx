import { ActionFailure } from "@/src/shared/lib/unwrap";
import { WarningBox } from "@/src/shared/ui/warning-box";

/** 이 DB 에 정산(app migration 138)이 없다 — PostgREST 가 함수를 못 찾는다(PGRST202). */
export function isPayoutsMissing(error: unknown): boolean {
  return error instanceof ActionFailure && error.code === "PGRST202";
}

export function PayoutsUnavailable() {
  return (
    <WarningBox tone="caution" className="text-bds-body3">
      이 환경의 DB 에는 정산(app migration 138)이 적용돼 있지 않습니다. 정산은 지금 <b>dev 에만</b> 있습니다.
    </WarningBox>
  );
}
