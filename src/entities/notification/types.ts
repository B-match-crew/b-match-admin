// v3.0 스키마 기준: public.push_notifications (관리자 전용)
export type PushStatus = 'PENDING' | 'SENT' | 'FAILED';
export type PushTarget = 'all' | 'hosts' | 'custom';

export interface PushNotification {
  id: number;
  title: string;
  body: string;
  target: PushTarget;
  target_ids: string[] | null;
  scheduled_at: string | null;
  sent_at: string | null;
  sent_by: string | null;
  status: PushStatus;
  created_at: string;
}
