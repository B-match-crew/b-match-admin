"use client";

import { Card, CardContent } from "@/src/shared/ui/kit/card";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import type { FunnelStep } from "../model/actions";
import { SEQUENTIAL } from "./chart-tokens";

export function StatTile({
  label,
  value,
  sub,
  loading,
}: {
  label: string;
  value?: number;
  sub?: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 py-5">
        <p className="text-bds-caption2 text-bds-label-alternative">{label}</p>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <p className="text-bds-title1 text-bds-label-normal">
            {value?.toLocaleString() ?? "-"}
          </p>
        )}
        {sub && !loading && (
          <p className="text-bds-caption2 text-bds-label-assistive">{sub}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function FunnelTable({ steps }: { steps: FunnelStep[] }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-bds-caption1">
        <thead>
          <tr className="text-bds-label-alternative">
            <th className="py-2 text-left font-medium">단계</th>
            <th className="py-2 text-right font-medium">도달</th>
            <th className="py-2 text-right font-medium">첫 단계 대비</th>
            <th className="py-2 text-right font-medium">직전 대비</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((s) => (
            <tr key={s.stepOrder} className="border-t border-bds-gray-100">
              <td className="py-2 text-bds-label-normal">{s.stepName}</td>
              <td className="py-2 text-right">{s.users.toLocaleString()}</td>
              <td className="py-2 text-right">
                {s.retentionFromTop == null ? "-" : `${s.retentionFromTop}%`}
              </td>
              <td className="py-2 text-right">
                {s.conversionFromPrev == null ? "-" : `${s.conversionFromPrev}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FunnelTooltip({ active, payload }: { active?: boolean; payload?: { payload: FunnelStep }[] }) {
  if (!active || !payload?.length) return null;
  const s = payload[0].payload;
  return (
    <div className="rounded-lg border border-bds-gray-200 bg-white px-3 py-2 text-bds-caption1 shadow-sm">
      <p className="text-bds-label-normal">{s.stepName}</p>
      <p className="text-bds-label-alternative">{s.users.toLocaleString()}명</p>
      {s.conversionFromPrev != null && (
        <p className="text-bds-label-alternative">직전 대비 {s.conversionFromPrev}%</p>
      )}
    </div>
  );
}

/** 값이 클수록 진한 단일 색상 — 값을 숫자로도 적어 색만으로 읽지 않게 한다. */
export function RetentionCell({ value }: { value: number | null }) {
  if (value == null) {
    return <td className="py-2 text-center text-bds-label-assistive">-</td>;
  }
  const step = Math.min(SEQUENTIAL.length - 1, Math.floor(value / 20));
  // 진한 칸은 흰 글씨라야 대비가 확보된다.
  const dark = step >= 3;
  return (
    <td className="px-1 py-1 text-center">
      <span
        className="inline-block w-full rounded px-2 py-1"
        style={{
          backgroundColor: SEQUENTIAL[step],
          color: dark ? "#fff" : "var(--color-bds-label-normal)",
        }}
      >
        {value}%
      </span>
    </td>
  );
}
