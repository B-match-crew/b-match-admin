// v3.0 스키마 기준: public.settlement_requests, refund_requests

export type SettlementStatus =
  | 'PENDING'
  | 'EXPORTED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELED';

export interface SettlementRequest {
  id: string;
  host_id: string;
  wallet_id: string;
  amount: number;
  bank_info: {
    bank_name: string;
    account_no: string;
    holder_name: string;
  };
  status: SettlementStatus;
  admin_note: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // joined
  host?: { nickname: string; real_name: string | null } | null;
}

export interface RefundRequest {
  id: string;
  guest_id: string;
  match_id: string;
  payment_id: string | null;
  amount: number;
  reason: string;
  bank_info: {
    bank_name: string;
    account_no: string;
    holder_name: string;
  } | null;
  status: SettlementStatus;
  retry_count: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // joined
  guest?: { nickname: string; real_name: string | null } | null;
  match?: { title: string } | null;
}
