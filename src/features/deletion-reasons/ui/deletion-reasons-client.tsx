"use client";

import { useState } from "react";
import { DetailSection } from "./sections/detail";
import { SummarySection } from "./sections/summary";
import { Range } from "./tokens";

export function DeletionReasonsClient() {
  const [range, setRange] = useState<Range>("all");

  return (
    <div className="space-y-6">
      <SummarySection range={range} onRangeChange={setRange} />
      <DetailSection />
    </div>
  );
}
