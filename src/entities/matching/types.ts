// v3.0 스키마 기준: public.matches
export type MatchStatus =
  | 'RECRUITING'
  | 'CLOSED'
  | 'IN_PROGRESS'
  | 'ENDED'
  | 'CANCELED_BY_HOST'
  | 'CANCELED_BY_ADMIN';

export interface Match {
  id: number;
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
  created_at: string;
  updated_at: string;
  // joined
  host?: { nickname: string; real_name: string | null } | null;
  applications_count?: number;
}

export type ApplicationStatus =
  | 'PENDING_APPROVAL'
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'CANCELED_BY_GUEST'
  | 'REJECTED_BY_HOST'
  | 'AUTO_CANCELED_UNPAID'
  | 'AUTO_REJECTED_TIMEOUT'
  | 'GIVE_UP'
  | 'MATCH_CANCELED'
  | 'REFUNDED_BY_CS'
  | 'CANCELED_BY_ADMIN';

export interface Application {
  id: number;
  guest_id: string;
  match_id: number;
  status: ApplicationStatus;
  message: string | null;
  total_amount: number;
  payment_deadline: string | null;
  created_at: string;
  // joined
  guest?: { nickname: string; real_name: string | null } | null;
}
