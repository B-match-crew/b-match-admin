/**
 * audit-logs — actions 의 응답·입력 모델.
 *
 * "use server" 파일은 값으로 async 함수만 내보낼 수 있어, 타입이 조회 함수
 * 사이사이에 끼어 있었다. model 세그먼트로 꺼내면 상수도 같은 자리에 둘 수
 * 있고(그래서 constants.ts 를 따로 두던 우회가 사라진다), 화면이 조회 구현을
 * 끌어오지 않고 모양만 볼 수 있다.
 */

import type { DbAdminAuditLog, DbUser } from "@/src/shared/types/db";

export interface AuditLogRow extends DbAdminAuditLog {
  admin: Pick<DbUser, "nickname" | "name"> | null;
}

export interface AuditLogFilter {
  actionType?: string;
  search?: string;
  limit?: number;
}
