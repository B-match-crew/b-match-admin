/**
 * reports — actions 의 응답·입력 모델.
 *
 * "use server" 파일은 값으로 async 함수만 내보낼 수 있어, 타입이 조회 함수
 * 사이사이에 끼어 있었다. model 세그먼트로 꺼내면 상수도 같은 자리에 둘 수
 * 있고(그래서 constants.ts 를 따로 두던 우회가 사라진다), 화면이 조회 구현을
 * 끌어오지 않고 모양만 볼 수 있다.
 */

import type { ContactType, MatchStatus, ReportStatus, UserStatus } from "@/src/shared/types/db";

/**
 * 신고 목록 1행. match_reports 를 매칭/신고자/호스트와 합친 형태.
 *
 * ⚠️ PostgREST 임베드 조인 대신 **수동 조인**을 쓴다. match_reports 는 users 로
 * 가는 FK 가 2개(reporter_id, host_id)라 임베드 시 FK 제약 이름이 필요한데,
 * 라이브 제약 이름 불일치로 500 이 났던 전례가 있어(commit c1e6893) ID 수집 후
 * 별도 조회로 합친다. service_role(createAdminClient) 은 RLS 를 우회하므로 모든
 * 행이 해석된다.
 */
export interface ReportListItem {
  id: number;
  status: ReportStatus;
  reason: string;
  detail: string | null;
  created_at: string;
  match_id: number;
  match: {
    id: number;
    title: string;
    status: MatchStatus;
    deleted_at: string | null;
    description: string | null;
    contact_type: ContactType;
    contact_value: string;
    location_name: string;
  } | null;
  reporter_id: number;
  reporter: { nickname: string | null; name: string | null } | null;
  host_id: number;
  host: {
    id: number;
    nickname: string | null;
    name: string | null;
    user_status: UserStatus;
  } | null;
  /** 같은 매칭글에 접수된 총 신고 수(현재 조회 범위 기준) */
  matchReportCount: number;
}

export interface ReportSearchParams {
  status?: ReportStatus | "ALL";
  limit?: number;
}
