/**
 * blocks — actions 의 응답·입력 모델.
 *
 * "use server" 파일은 값으로 async 함수만 내보낼 수 있어, 타입이 조회 함수
 * 사이사이에 끼어 있었다. model 세그먼트로 꺼내면 상수도 같은 자리에 둘 수
 * 있고(그래서 constants.ts 를 따로 두던 우회가 사라진다), 화면이 조회 구현을
 * 끌어오지 않고 모양만 볼 수 있다.
 */

export interface BlockRankItem {
  blocked_id: number;
  nickname: string | null;
  name: string | null;
  user_status: string;
  /** 차단당한 총 횟수 */
  blockCount: number;
  /** 서로 다른 차단자 수 — 실질 신뢰도 지표 */
  blockerCount: number;
  /**
   * 출처별 내역 (app migration 67).
   *
   * 매칭과 채팅이 같은 `user_blocks` 를 쓴다. 이 랭킹은 원래 "반복 차단당한
   * **모임장**"을 찾는 지표였는데, 채팅 차단이 섞이면서 합계만으로는 그 차이를
   * 알 수 없게 됐다 — 일반 신청자가 채팅에서 차단당해도 같은 목록에 오른다.
   */
  matchBlockCount: number;
  chatBlockCount: number;
}

export interface BlacklistItem {
  id: number;
  ci_hash: string;
  reason: string;
  created_at: string;
  user: { id: number; nickname: string | null; name: string | null } | null;
}

export interface BlacklistResult {
  rows: BlacklistItem[];
  total: number;
}
