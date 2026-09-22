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
  cron_purge_chat_messages: "채팅 파기 — 마지막 메시지로부터 90일 지난 방 (app 91)",
  cron_purge_resolved_reports: "신고 자료 파기 — 처리 완료 후 1년 (app 92, 멈추면 개인정보가 남음)",
  cron_app_events_drop_old: "행동 이벤트 파티션 파기 — 14개월 지난 달 (app 95)",
  cron_purge_old_notifications: "알림 기록 파기 — 90일 지난 알림 (app 127)",
};
