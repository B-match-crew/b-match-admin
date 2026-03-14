export interface Matching {
  id: string;
  title: string;
  host_name: string;
  host_id: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  date: string;
  start_time: string;
  end_time: string;
  current_members: number;
  max_members: number;
  skill_levels: string[];
  gender: string;
  is_beginner_welcome: boolean;
  fee: number;
  fee_type: string;
  court_fee: number;
  court_fee_type: string;
  shuttlecock_brand: string | null;
  shuttlecock_price: number;
  description: string | null;
  recruitment_status: string;
  announcement: string | null;
  cancelled_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}
