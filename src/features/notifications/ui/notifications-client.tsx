"use client";

/**
 * 알림 운영 — 탭 조립만 한다.
 */

import { useState } from "react";
import { SegmentedTab } from "@/src/shared/ui/bds/segmented-tab";
import { RANGES, TABS, Tab } from "./tabs-tokens";
import { CategoriesTab } from "./tabs/categories";
import { FailuresTab } from "./tabs/failures";
import { ReachTab } from "./tabs/reach";
import { SummaryTab } from "./tabs/summary";

export function NotificationsClient() {
  const [tab, setTab] = useState<Tab>("summary");
  const [days, setDays] = useState<"7" | "30" | "90">("30");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-[420px] max-w-full">
          <SegmentedTab items={TABS} value={tab} onValueChange={setTab} size="sm" />
        </div>
        {(tab === "summary" || tab === "failures") && (
          <div className="flex items-center gap-2">
            <span className="text-bds-body2 text-bds-label-alternative">기간</span>
            <div className="w-48">
              <SegmentedTab
                items={RANGES}
                value={days}
                onValueChange={setDays}
                size="sm"
              />
            </div>
          </div>
        )}
      </div>

      {tab === "summary" && <SummaryTab days={Number(days)} />}
      {tab === "failures" && <FailuresTab />}
      {tab === "reach" && <ReachTab />}
      {tab === "categories" && <CategoriesTab />}
    </div>
  );
}
