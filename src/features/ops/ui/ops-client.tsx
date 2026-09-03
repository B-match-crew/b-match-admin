"use client";

import { useState } from "react";
import { CronSection } from "./sections/cron";
import { EventSection } from "./sections/event";
import { PushBacklogSection } from "./sections/push-backlog";

export function OpsClient() {
  const [days, setDays] = useState<"7" | "30" | "90">("30");

  return (
    <div className="space-y-6">
      <PushBacklogSection />
      <CronSection />
      <EventSection days={Number(days)} range={days} onRangeChange={setDays} />
    </div>
  );
}
