import type { SupabaseClient } from "@supabase/supabase-js";
import type { Advertisement, AdLocation } from "@/src/entities/advertisement/types";

export interface FetchAdsParams {
  type?: string;
  status?: string;
  page: number;
  limit: number;
}

export interface FetchAdsResult {
  data: Advertisement[];
  total: number;
}

export interface AdPerformanceItem {
  id: string;
  advertiserName: string;
  type: string;
  clickCount: number;
  impressionCount: number;
  ctr: number;
}

export async function fetchAds(
  supabase: SupabaseClient,
  params: FetchAdsParams
): Promise<FetchAdsResult> {
  const { type, status, page, limit } = params;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("advertisements")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (type) {
    query = query.eq("type", type);
  }
  if (status) {
    query = query.eq("status", status);
  }

  const { data, count, error } = await query.range(from, to);

  if (error) throw error;

  return {
    data: (data ?? []) as Advertisement[],
    total: count ?? 0,
  };
}

export async function updateAdStatus(
  supabase: SupabaseClient,
  adId: string,
  status: string,
  rejectionReason?: string
): Promise<Advertisement> {
  const updatePayload: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (rejectionReason) {
    updatePayload.rejection_reason = rejectionReason;
  }

  const { data, error } = await supabase
    .from("advertisements")
    .update(updatePayload)
    .eq("id", adId)
    .select()
    .single();

  if (error) throw error;

  return data as Advertisement;
}

export async function fetchAdPerformance(
  supabase: SupabaseClient
): Promise<AdPerformanceItem[]> {
  const { data, error } = await supabase
    .from("advertisements")
    .select("id, advertiser_id, type, click_count, impression_count")
    .in("status", ["승인", "노출 중", "종료"])
    .order("impression_count", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((ad) => ({
    id: ad.id,
    advertiserName: ad.advertiser_id,
    type: ad.type,
    clickCount: ad.click_count ?? 0,
    impressionCount: ad.impression_count ?? 0,
    ctr:
      ad.impression_count > 0
        ? ((ad.click_count ?? 0) / ad.impression_count) * 100
        : 0,
  }));
}

export async function fetchAdLocations(
  supabase: SupabaseClient,
  adId?: string
): Promise<AdLocation[]> {
  let query = supabase
    .from("ad_locations")
    .select("*")
    .order("created_at", { ascending: false });

  if (adId) {
    query = query.eq("advertisement_id", adId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []) as AdLocation[];
}
