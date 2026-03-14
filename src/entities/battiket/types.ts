export interface BattiketConfig {
  id: string;
  guest_to_host_best: number;
  guest_to_host_normal: number;
  guest_to_host_bad: number;
  host_to_guest_best: number;
  host_to_guest_normal: number;
  host_to_guest_bad: number;
  no_payment_penalty: number;
  no_show_penalty: number;
  host_cancel_penalty: number;
  host_abandon_penalty: number;
  updated_at: string;
  updated_by: string | null;
}
