/**
 * app-version — actions 의 응답·입력 모델.
 *
 * "use server" 파일은 값으로 async 함수만 내보낼 수 있어, 타입이 조회 함수
 * 사이사이에 끼어 있었다. model 세그먼트로 꺼내면 상수도 같은 자리에 둘 수
 * 있고(그래서 constants.ts 를 따로 두던 우회가 사라진다), 화면이 조회 구현을
 * 끌어오지 않고 모양만 볼 수 있다.
 */

/**
 * 앱 버전 정책 (app_version_policy 테이블, migration 25 / 26).
 *
 * 앱은 스플래시에서 이 값을 읽어 현재 설치 버전과 비교한다:
 *   현재 < min_version         → 강제 업데이트 (스토어 이동만 가능)
 *   현재 < recommended_version → 권장 업데이트 팝업 (버전당 1회, 스킵 가능)
 *
 * 조회는 service_role(createAdminClient), **쓰기는 RPC**(migration 26) —
 * 검증(형식·"강제 ≤ 권장")과 감사 로그를 서버에서 강제하기 위함.
 * platform 값은 26 에서 소문자 → 대문자로 정렬됐다.
 */
export type VersionPlatform = "IOS" | "ANDROID";

export interface VersionPolicyRow {
  platform: VersionPlatform;
  recommended_version: string;
  min_version: string;
  updated_at: string;
}
