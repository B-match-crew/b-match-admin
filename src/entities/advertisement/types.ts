export interface Advertisement {
  id: string;
  advertiser_id: string;
  type: "배너" | "지도핀";
  image_url: string;
  landing_url: string | null;
  status: string;
  start_date: string;
  end_date: string;
  display_order: number;
  click_count: number;
  impression_count: number;
  rejection_reason: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdLocation {
  id: string;
  advertisement_id: string;
  latitude: number;
  longitude: number;
  address: string;
  business_name: string;
  description: string | null;
  icon_url: string | null;
}
