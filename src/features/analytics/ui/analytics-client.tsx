"use client";

import { useState } from "react";
import { SegmentedTab } from "@/src/shared/ui/bds/segmented-tab";
import type { RetentionGroup } from "../model/actions";
import { fetchGuestFunnel, fetchHostFunnel } from "../api/actions";
import { Ga4ChannelSection, Ga4CampaignSection, Ga4PlatformSection } from "./ga4-sections";
import { RANGES } from "./chart-tokens";
import { ActiveUsersSection } from "./sections/active-users";
import { ConversionSection } from "./sections/conversion";
import { DemandGapSection } from "./sections/demand-gap";
import { FunnelSection } from "./sections/funnel";
import { HostResponseSection } from "./sections/host-response";
import { RetentionSection } from "./sections/retention";
import { RevisitSection } from "./sections/revisit";
import { VisitDaysSection } from "./sections/visit-days";
import { VisitDaysCohortSection } from "./sections/visit-days-cohort";
import { DormantSection } from "./sections/dormant";
import { SupplyDemandSection } from "./sections/supply-demand";
import { ViralSection } from "./sections/viral";

/**
 * 유저 그룹 (106). 셋의 합이 전체와 같다 — 호스트가 아니면 전부 "일반" 이고
 * 비회원도 거기 포함된다(로그인 없이 모집글을 볼 수 있으므로).
 */
const GROUPS = [
  { value: "ALL", label: "전체" },
  { value: "HOST", label: "호스트" },
  { value: "GENERAL", label: "일반" },
] as const;

export function AnalyticsClient() {
  const [days, setDays] = useState<"7" | "30" | "90">("30");
  const [group, setGroup] = useState<RetentionGroup>("ALL");
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

      {/* 재방문·방문일수·휴면 (106). 그룹 축은 이 셋만 쓴다 — 위쪽 퍼널·리텐션은
          38 기준이라 그룹 개념이 없다. 선택기를 전역 헤더에 두면 아무 영향 없는
          섹션까지 바뀌는 것처럼 보인다. */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <h2 className="text-bds-heading3 text-bds-label-normal">재방문 · 휴면</h2>
        <div className="w-56">
          <SegmentedTab
            items={GROUPS}
            value={group}
            onValueChange={(v) => setGroup(v)}
            size="sm"
          />
        </div>
        <span className="text-bds-caption2 text-bds-label-assistive">
          호스트 = 모집글을 1회 이상 등록한 회원 (현재 시점 기준)
        </span>
      </div>
      <RevisitSection days={n} group={group} />
      <VisitDaysSection days={n} group={group} />
      {/* 합산 바로 아래 — 같은 지표를 코호트로 쪼갠 것이라 붙여 둔다.
          합산값은 유입이 큰 최신 코호트에 지배되므로 개선/악화는 이쪽에서 본다. */}
      <VisitDaysCohortSection days={n} group={group} />
      {/* 휴면은 현재 상태 스냅샷이라 기간·그룹 축이 없다 */}
      <DormantSection />

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
