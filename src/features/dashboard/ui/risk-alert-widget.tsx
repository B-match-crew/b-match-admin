"use client";

import { useEffect, useState } from "react";
import { adminFetchRiskAlerts } from "@/src/app/actions/admin-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Flag, Undo2, Clock } from "lucide-react";

interface RiskAlertData {
  pendingReports: number;
  failedRefunds: number;
  delayedSettlements: number;
}

export function RiskAlertWidget() {
  const [data, setData] = useState<RiskAlertData | null>(null);

  useEffect(() => {
    adminFetchRiskAlerts().then(setData);
  }, []);

  const totalAlerts =
    (data?.pendingReports ?? 0) +
    (data?.failedRefunds ?? 0) +
    (data?.delayedSettlements ?? 0);

  const alertColor =
    totalAlerts > 0 ? "text-red-600" : "text-emerald-600";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className={`h-5 w-5 ${alertColor}`} />
          위험 알림
          {totalAlerts > 0 && (
            <span className="ml-auto rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
              {totalAlerts}건
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!data ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : totalAlerts === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            현재 위험 알림이 없습니다
          </p>
        ) : (
          <div className="space-y-3">
            <RiskAlertRow
              icon={<Flag className="h-4 w-4" />}
              label="미처리 CS 신고"
              count={data.pendingReports}
            />
            <RiskAlertRow
              icon={<Undo2 className="h-4 w-4" />}
              label="환불 실패"
              count={data.failedRefunds}
            />
            <RiskAlertRow
              icon={<Clock className="h-4 w-4" />}
              label="출금 지연 (3일 초과)"
              count={data.delayedSettlements}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RiskAlertRow({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  if (count === 0) return null;

  return (
    <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3">
      <span className="flex items-center gap-2 text-sm font-medium text-red-700">
        {icon}
        {label}
      </span>
      <span className="text-sm font-bold text-red-700">{count}건</span>
    </div>
  );
}
