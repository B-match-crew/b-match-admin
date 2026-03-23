// v3.0 스키마 기준: public.payments, host_wallets, wallet_histories

export type PaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'CANCELED'
  | 'REFUNDED'
  | 'CONFIRM_FAILED'
  | 'REFUND_PENDING'
  | 'REFUND_FAILED';

export type WalletHistoryType =
  | 'EARN'
  | 'ESCROW_RELEASE'
  | 'HOLD'
  | 'RELEASE'
  | 'REFUND_DEDUCT'
  | 'WITHDRAW'
  | 'ROLLBACK';

export interface Payment {
  id: string;
  order_id: string;
  user_id: string;
  match_id: string;
  application_id: string | null;
  amount: number;
  refunded_amount: number;
  refund_reason: string | null;
  pg_fee: number;
  pg_payment_key: string | null;
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
  // joined
  user?: { nickname: string; real_name: string | null } | null;
  match?: { title: string } | null;
}

export interface HostWallet {
  id: string;
  user_id: string;
  total_balance: number;
  withdrawable_balance: number;
  pending_balance: number;
  frozen_balance: number;
  created_at: string;
  updated_at: string;
  // joined
  user?: { nickname: string; real_name: string | null } | null;
}

export interface WalletHistory {
  id: string;
  wallet_id: string;
  type: WalletHistoryType;
  amount: number;
  description: string | null;
  reference_type: string | null;
  reference_id: string | null;
  balance_snapshot: Record<string, unknown> | null;
  created_at: string;
}
