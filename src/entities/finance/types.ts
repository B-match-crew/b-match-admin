// v3.0 스키마 기준: public.payments, host_wallets, wallet_histories

export type PaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'CANCELED'
  | 'REFUNDED'
  | 'CONFIRM_FAILED'
  | 'REFUND_PENDING'
  | 'REFUND_FAILED';

export type RefundReason =
  | 'GUEST_CANCEL_FULL'
  | 'HOST_CANCEL'
  | 'ADMIN_CANCEL'
  | 'CS_REFUND'
  | 'CONFIRM_FAILED_REFUND';

export type WalletHistoryType =
  | 'EARN'
  | 'WITHDRAW'
  | 'REFUND_DEDUCT'
  | 'ROLLBACK'
  | 'HOLD'
  | 'RELEASE'
  | 'ESCROW_RELEASE';

export type WalletReferenceType =
  | 'MATCH'
  | 'SETTLEMENT_REQUEST'
  | 'REFUND_REQUEST'
  | 'ADMIN_ACTION';

export interface Payment {
  id: number;
  order_id: string;
  guest_id: string;
  match_id: number;
  amount: number;
  refunded_amount: number;
  refund_reason: RefundReason | null;
  pg_fee: number;
  pg_payment_key: string | null;
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
  // joined
  guest?: { nickname: string; real_name: string | null } | null;
  match?: { title: string } | null;
}

export interface HostWallet {
  id: number;
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
  id: number;
  wallet_id: number;
  type: WalletHistoryType;
  amount: number;
  balance_snapshot: {
    total: number;
    withdrawable: number;
    pending: number;
    frozen: number;
  };
  reference_type: WalletReferenceType;
  reference_id: number | null;
  created_at: string;
}
