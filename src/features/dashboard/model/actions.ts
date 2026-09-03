/**
 * dashboard — actions 의 응답·입력 모델.
 *
 * "use server" 파일은 값으로 async 함수만 내보낼 수 있어, 타입이 조회 함수
 * 사이사이에 끼어 있었다. model 세그먼트로 꺼내면 상수도 같은 자리에 둘 수
 * 있고(그래서 constants.ts 를 따로 두던 우회가 사라진다), 화면이 조회 구현을
 * 끌어오지 않고 모양만 볼 수 있다.
 */

export interface DashboardStats {
  /** 전체 활성 유저 수 (deleted_at IS NULL) */
  totalUsers: number;
  /** 누적 게스트 디바이스 수 (fn_get_total_guest_count) */
  totalGuests: number;
  /** 오늘 시작 예정 모임 수 */
  todayMatches: number;
  /** 모집 중 모임 수 */
  recruitingMatches: number;
}

export interface DailyTrendItem {
  date: string; // yyyy-MM-dd
  matches: number;
}
