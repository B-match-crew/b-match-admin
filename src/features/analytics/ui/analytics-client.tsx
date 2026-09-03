"use client";

import { useState } from "react";
import { SegmentedTab } from "@/src/shared/ui/bds/segmented-tab";
import { fetchGuestFunnel, fetchHostFunnel } from "../api/actions";
import { Ga4ChannelSection, Ga4CampaignSection, Ga4PlatformSection } from "./ga4-sections";
import { RANGES } from "./chart-tokens";
import { ActiveUsersSection } from "./sections/active-users";
import { ConversionSection } from "./sections/conversion";
import { DemandGapSection } from "./sections/demand-gap";
import { FunnelSection } from "./sections/funnel";
import { HostResponseSection } from "./sections/host-response";
import { RetentionSection } from "./sections/retention";
import { SupplyDemandSection } from "./sections/supply-demand";
import { ViralSection } from "./sections/viral";

export function AnalyticsClient() {
  const [days, setDays] = useState<"7" | "30" | "90">("30");
  const n = Number(days);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-bds-body2 text-bds-label-alternative">기간</span>
        <div className="w-56">
          <SegmentedTab
            items={RANGES}
            value={days}
            onValueChange={(v) => setDays(v)}
            size="sm"
          />
        </div>
      </div>

      <ActiveUsersSection days={n} />
      <FunnelSection
        title="게스트 퍼널"
        description="목록을 본 기기 중 몇 %가 연락·가입까지 갔는지. 기기 기준이라 비회원도 포함된다."
        queryKey="analytics-funnel-guest"
        fetcher={() => fetchGuestFunnel(n)}
        days={n}
      />
      <FunnelSection
        title="호스트 퍼널 (공급)"
        description="모임 등록부터 재등록까지. 공급이 1회성인지 지속되는지가 이 서비스의 생존을 가른다."
        queryKey="analytics-funnel-host"
        fetcher={() => fetchHostFunnel(n)}
        days={n}
      />
      <RetentionSection days={n} />
      <SupplyDemandSection days={n} />
      <DemandGapSection days={n} />
      <ConversionSection days={n} />
      {/* 103 바로 아래에 둔다 — "연락이 오는가" 다음 질문이 "그 연락에 답하는가" 다 */}
      <HostResponseSection days={n} />
      <ViralSection days={n} />

      {/* GA4 구간 — 자체 집계로는 알 수 없는 "어디서 왔는가"만 담당한다.
          지연 24~48h, 샘플링 가능이라 자체 집계와 섞어 놓지 않고 아래로 묶는다. */}
      <div className="space-y-2 pt-2">
        <h2 className="text-bds-heading3 text-bds-label-normal">획득 (GA4)</h2>
        <p className="text-bds-caption2 text-bds-label-alternative">
          설치가 어디서 왔는지는 우리 DB 가 알 수 없다 — Play Install Referrer 를
          읽어 귀속시키는 건 Firebase SDK 뿐이다. 단 GA4 는 24~48시간 지연되고
          대량 쿼리는 샘플링될 수 있어, 정밀 수치는 위쪽 자체 집계를 본다.
        </p>
      </div>
      <Ga4ChannelSection days={n} />
      <Ga4CampaignSection days={n} />
      <Ga4PlatformSection days={n} />
    </div>
  );
}
