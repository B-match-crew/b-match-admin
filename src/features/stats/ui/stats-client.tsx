"use client";

/**
 * 통계 (ADM-06) — 섹션 조립만 한다.
 *
 * 섹션마다 자기 조회를 들고 있어 한 섹션이 죽어도 나머지는 그려진다.
 * 위에서 내려주는 것은 기간(days)뿐이다.
 */

import { useState } from "react";
import { SegmentedTab } from "@/src/shared/ui/bds/segmented-tab";
import { RANGES } from "./chart-tokens";
import { AcquisitionSection } from "./sections/acquisition";
import { ChatSection } from "./sections/chat";
import { CumulativeSection } from "./sections/cumulative";
import { DemographicsSection } from "./sections/demographics";
import { HostSection } from "./sections/host";
import { PopularMatchSection } from "./sections/popular-match";
import { RegionSection } from "./sections/region";
import { ReportSection } from "./sections/report";
import { SignupChannelSection } from "./sections/signup-channel";
import { TimeDistributionSection } from "./sections/time-distribution";

export function StatsClient() {
  const [days, setDays] = useState<"7" | "30" | "90">("30");

  return (
    <div className="space-y-6">
      {/* 필터는 차트 위 한 줄에 */}
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

      <CumulativeSection days={Number(days)} />
      <AcquisitionSection days={Number(days)} />
      <SignupChannelSection />
      <HostSection />
      <DemographicsSection />
      <RegionSection />
      <TimeDistributionSection />
      <ChatSection days={Number(days)} />
      <ReportSection />
      <PopularMatchSection />
    </div>
  );
}
