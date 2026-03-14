import type { SupabaseClient } from "@supabase/supabase-js";

export interface EventSummaryItem {
  eventName: string;
  count: number;
  lastOccurred: string | null;
}

export interface FunnelStep {
  step: string;
  label: string;
  count: number;
  conversionRate: number;
}

export async function fetchEventSummary(
  supabase: SupabaseClient
): Promise<EventSummaryItem[]> {
  const { data, error } = await supabase
    .from("analytics_events")
    .select("event_name, count, last_occurred_at")
    .order("count", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((item) => ({
    eventName: item.event_name,
    count: item.count ?? 0,
    lastOccurred: item.last_occurred_at,
  }));
}

export async function fetchFunnelData(
  supabase: SupabaseClient
): Promise<FunnelStep[]> {
  const steps = [
    { step: "signup", label: "가입" },
    { step: "profile", label: "프로필 설정" },
    { step: "matching_create", label: "매칭 생성" },
    { step: "apply", label: "참여 신청" },
    { step: "payment", label: "입금 완료" },
  ];

  const { data, error } = await supabase
    .from("analytics_funnel")
    .select("step, count")
    .in(
      "step",
      steps.map((s) => s.step)
    );

  if (error) throw error;

  const countMap: Record<string, number> = {};
  (data ?? []).forEach((item) => {
    countMap[item.step] = item.count ?? 0;
  });

  let prevCount = 0;
  return steps.map((step, index) => {
    const count = countMap[step.step] ?? 0;
    const conversionRate =
      index === 0
        ? 100
        : prevCount > 0
          ? (count / prevCount) * 100
          : 0;
    prevCount = count;

    return {
      step: step.step,
      label: step.label,
      count,
      conversionRate: Number(conversionRate.toFixed(1)),
    };
  });
}
