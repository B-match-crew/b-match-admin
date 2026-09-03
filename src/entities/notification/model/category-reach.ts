/**
 * 카테고리별로 **지금 보내면 몇 명에게 나가는가** (app migration 105).
 *
 * 전체 도달률(PushReach)만으로는 카테고리 간 차이가 안 보인다 — 68 이
 * 모임 운영 알림 기본값을 OFF 로 바꿨고, 광고성은 옵트인이며, 채팅은 기본 ON
 * 이라 같은 모수에서도 실제 발송 인원이 몇 배씩 갈린다.
 *
 * 🔴 `reachable` 은 **OS 알림 권한을 허용한 인원이 아니다.** 토큰은 권한과
 * 무관하게 저장되므로(app migration 42) 권한을 거부한 사용자도 여기 들어 있다.
 * 화면 라벨에 "허가" 를 쓰면 그 순간 이 수는 거짓말이 된다.
 */
export interface CategoryReach {
  code: string;
  label: string;
  isActive: boolean;
  isMandatory: boolean;
  /** 모임장에게만 보이는 카테고리 — 분모부터 모임장이다 */
  requiresHost: boolean;
  defaultEnabled: boolean;
  /** SETTINGS | MARKETING_CONSENT — 아래 explicit* 열의 의미가 여기서 갈린다 */
  storage: string;
  /** 대상 모수(정회원). requiresHost 면 모임장만 */
  eligible: number;
  /** 그중 수신 ON */
  enabledUsers: number;
  /** 그중 유효 토큰 보유 = **실제로 푸시가 밀려 나가는 인원** */
  reachable: number;
  reachableHost: number;
  /** 직접 켠 사람 */
  explicitOn: number;
  /** 직접 끈 사람 — 되살리면 안 되는 의사표시다(migration 69) */
  explicitOff: number;
  /** 설정 행이 없어 기본값을 따르는 사람 */
  byDefault: number;
  /**
   * 권한 거부가 **확인된** 인원. 앱이 권한을 요청한 순간에만 기록되므로
   * 하한선이다 — 나중에 OS 설정에서 끈 사람은 잡히지 않는다.
   */
  permissionDeniedKnown: number;
}
