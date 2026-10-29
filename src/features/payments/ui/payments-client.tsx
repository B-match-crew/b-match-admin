"use client";

import { useState } from "react";
import { SegmentedTab } from "@/src/shared/ui/bds/segmented-tab";
import { PaymentDetailDialog } from "./payment-detail-dialog";
import { PaymentsList } from "./payments-list";
import { PaymentsOverview } from "./payments-overview";

const TABS = [
  { value: "overview", label: "운영" },
  { value: "list", label: "결제 목록" },
] as const;

export function PaymentsClient() {
  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("overview");
  const [orderNo, setOrderNo] = useState<string | null>(null);
  return (
    <div className="space-y-6">
      <SegmentedTab items={TABS} value={tab} onValueChange={setTab} size="md" className="max-w-sm" />
      {tab === "overview" ? (
        <PaymentsOverview onOpenOrder={setOrderNo} />
      ) : (
        <PaymentsList onOpenOrder={setOrderNo} />
      )}
      <PaymentDetailDialog orderNo={orderNo} onClose={() => setOrderNo(null)} />
    </div>
  );
}
