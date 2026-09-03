"use client";

export const RANGES = [
  { value: "7", label: "7일" },
  { value: "30", label: "30일" },
  { value: "90", label: "90일" },
] as const;

/** 잡 이름 → 무엇이 멈추는가. 이름만으로는 영향 범위를 알 수 없다. */
export const JOB_IMPACT: Record<string, string> = {
  cron_dispatch_push: "푸시 발송 (멈추면 알림이 나가지 않음)",
  cron_match_lifecycle: "모임 종료 전환 · 탈퇴 CI 정리",
  cron_purge_incomplete_signups: "인증 미완료 계정 정리",
  cron_app_events_partitions: "이벤트 파티션 생성 (멈추면 월초에 적재가 전부 실패)",
  cron_host_remind: "모임장 재등록 리마인드",
  cron_purge_deleted_accounts: "탈퇴 계정 파기 (멈추면 개인정보가 남음)",
  cron_marketing_reconfirm: "광고성 2년 재확인 (멈추면 법 위반)",
  cron_purge_chat_messages: "채팅 30일 파기",
};
