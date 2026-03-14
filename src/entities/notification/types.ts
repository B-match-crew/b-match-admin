export interface PushNotification {
  id: string;
  title: string;
  body: string;
  target: "all" | "hosts" | "custom";
  target_ids: string[] | null;
  scheduled_at: string | null;
  sent_at: string | null;
  sent_by: string;
  status: "대기" | "발송됨" | "실패";
  created_at: string;
}
