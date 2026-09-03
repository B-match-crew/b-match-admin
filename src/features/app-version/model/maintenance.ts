/**
 * app-version — maintenance 의 응답·입력 모델.
 *
 * "use server" 파일은 값으로 async 함수만 내보낼 수 있어, 타입이 조회 함수
 * 사이사이에 끼어 있었다. model 세그먼트로 꺼내면 상수도 같은 자리에 둘 수
 * 있고(그래서 constants.ts 를 따로 두던 우회가 사라진다), 화면이 조회 구현을
 * 끌어오지 않고 모양만 볼 수 있다.
 */

/**
 * 서버 점검 모드 (app_status 테이블, migration 29).
 *
 * 앱은 스플래시/포그라운드 복귀/주기 폴링에서 `fn_get_app_status` 를 읽어
 * 점검 중이면 진입을 막는다("서버 점검 중입니다" 화면).
 *
 * · 점검 여부는 **서버 시각**으로 계산된다 (클라 시계 조작 방지).
 * · 예약 점검: 시작 시각이 미래면 그 시각부터 점검이 걸린다.
 * · 자동 재개(autoResume): true 면 예상 종료 시각 경과 시 자동 해제,
 *   false 면 관리자가 직접 끌 때까지 유지(점검이 길어질 때 문이 열리는 사고 방지).
 *
 * 조회는 service_role, **쓰기는 RPC**(검증 + 감사 로그를 서버에서 강제).
 */
export interface AppStatusRow {
  maintenance_enabled: boolean;
  maintenance_start_at: string | null;
  maintenance_end_at: string | null;
  auto_resume: boolean;
  updated_at: string;
}
