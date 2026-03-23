// v3.0 스키마 기준: public.matches
export type MatchStatus =
  | 'RECRUITING'
  | 'CLOSED'
  | 'IN_PROGRESS'
  | 'ENDED'
  | 'CANCELED_BY_HOST'
  | 'CANCELED_BY_ADMIN';

export interface Match {
  id: string;
  host_id: string;
  title: string;
  cover_image_url: string | null;
  start_time: string;
  end_time: string;
  location_name: string;
  location_detail: string | null;
  latitude: number;
  longitude: number;
  region: string | null;
  capacity: number | null;
  gender_condition: string;
  age_min_year: number | null;
  age_max_year: number | null;
  allowed_levels: string[];
  beginner_friendly: boolean;
  fee_config: Record<string, unknown>;
  designated_cock_brand: string | null;
  description: string | null;
  contact_type: string | null;
  contact_value: string | null;
  notice: string | null;
  status: MatchStatus;
  is_manually_close: boolean;
  confirmed_count: number | null;
  pending_payment_count: number | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  // joined
  host?: { nickname: string; real_name: string | null } | null;
  applications_count?: number;
}

export type ApplicationStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'CANCELED_BY_GUEST'
  | 'REJECTED_BY_HOST'
  | 'AUTO_CANCELED_UNPAID'
  | 'AUTO_REJECTED_TIMEOUT'
  | 'GIVE_UP'
  | 'NOSHOW'
  | 'MATCH_CANCELED'
  | 'REFUNDED_BY_CS'
  | 'CANCELED_BY_ADMIN';

export interface Application {
  id: string;
  guest_id: string;
  match_id: string;
  status: ApplicationStatus;
  message: string | null;
  addon_cock_qty: number | null;
  total_amount: number;
  applied_at: string | null;
  approved_at: string | null;
  payment_deadline: string | null;
  paid_at: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
  // joined
  guest?: { nickname: string; real_name: string | null } | null;
}
