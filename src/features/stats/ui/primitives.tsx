"use client";

/**
 * 통계 화면의 표시 조각 — 타일 · 뱃지 · 툴팁.
 *
 * 섹션이 아니라 섹션들이 공유하는 것들이다. 툴팁은 recharts 가 넘겨주는
 * payload 모양이 시리즈마다 달라 종류별로 따로 둔다.
 */

import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, LabelList } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import type { DistributionItem } from "../model/actions";
import { SERIES_1, SERIES_MUTED, isMissing } from "./chart-tokens";

export interface TooltipPayload {
  active?: boolean;
  label?: string;
  payload?: { payload: Record<string, number | string | null> }[];
}

export function StatTile({
  label,
  value,
  suffix,
  hint,
  loading,
}: {
  label: string;
  value: number | null;
  suffix?: string;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-lg border border-bds-border-alternative bg-bds-back-alternative p-4">
      <p className="text-bds-caption2 text-bds-label-assistive">{label}</p>
      {loading ? (
        <Skeleton className="mt-1.5 h-8 w-20" />
      ) : (
        <p className="mt-1 text-bds-title3 tabular-nums text-foreground">
          {value == null ? "—" : value.toLocaleString()}
          {value != null && suffix && (
            <span className="ml-0.5 text-bds-body2 text-bds-label-alternative">
              {suffix}
            </span>
          )}
        </p>
      )}
      {hint && (
        <p className="mt-0.5 text-bds-caption2 text-bds-label-assistive">
          {hint}
        </p>
      )}
    </div>
  );
}

export function CumulativeTile({
  label,
  total,
  today,
  dodPct,
  loading,
}: {
  label: string;
  total: number | null;
  today?: number;
  dodPct?: number | null;
  loading?: boolean;
}) {
  return (
    <div className="rounded-lg border border-bds-border-alternative bg-bds-back-alternative p-4">
      <p className="text-bds-caption2 text-bds-label-assistive">{label}</p>
      {loading ? (
        <Skeleton className="mt-1.5 h-9 w-28" />
      ) : (
        <div className="mt-1 flex items-end gap-2">
          <p className="text-bds-title2 tabular-nums text-foreground">
            {total == null ? "—" : total.toLocaleString()}
          </p>
          {today != null && (
            <span className="mb-1 flex items-center gap-1 text-bds-caption2">
              <span className="text-bds-label-alternative">
                오늘 +{today.toLocaleString()}
              </span>
              <DeltaBadge pct={dodPct} />
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function ChatTile({
  label,
  value,
  hint,
  warn,
  suffix,
  formatted,
}: {
  label: string;
  value: number;
  hint?: string;
  warn?: boolean;
  suffix?: string;
  /** 숫자 대신 그대로 그릴 문자열 (기간처럼 단위가 섞이는 값) */
  formatted?: string;
}) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="text-bds-caption2 text-bds-label-assistive">{label}</div>
      <div
        className={`mt-0.5 text-bds-title3 tabular-nums ${
          warn ? "text-bds-status-warning-text" : "text-foreground"
        }`}
      >
        {formatted ?? `${value.toLocaleString()}${suffix ?? ""}`}
      </div>
      {hint && (
        <div className="text-bds-caption2 text-bds-label-alternative">{hint}</div>
      )}
    </div>
  );
}

/** 전일 대비 증감률 배지 */
export function DeltaBadge({ pct }: { pct?: number | null }) {
  if (pct == null) {
    return <span className="text-bds-label-assistive">–</span>;
  }
  const up = pct > 0;
  const flat = pct === 0;
  return (
    <span
      className={
        flat
          ? "text-bds-label-assistive"
          : up
            ? "text-bds-status-info-text"
            : "text-bds-status-error-text"
      }
    >
      {up ? "▲" : flat ? "" : "▼"} {Math.abs(pct)}%
    </span>
  );
}

export function DistributionCard({
  title,
  items,
  loading,
  note,
}: {
  title: string;
  items?: DistributionItem[];
  loading: boolean;
  note?: string;
}) {
  const total = items?.reduce((s, i) => s + i.count, 0) ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">{title}</CardTitle>
        {note && (
          <p className="text-bds-caption2 text-bds-label-alternative">{note}</p>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : !items?.length || total === 0 ? (
          <EmptyState message="데이터가 없습니다." />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={items}
                layout="vertical"
                margin={{ top: 4, right: 40, bottom: 4, left: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="bucket"
                  tick={{ fontSize: 11, fill: "var(--color-bds-label-neutral)" }}
                  tickLine={false}
                  axisLine={false}
                  width={64}
                />
                <Tooltip content={<DistributionTooltip />} cursor={false} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                  {items.map((it) => (
                    <Cell
                      key={it.bucket}
                      fill={isMissing(it.bucket) ? SERIES_MUTED : SERIES_1}
                    />
                  ))}
                  <LabelList
                    dataKey="share"
                    position="right"
                    formatter={(v: unknown) => (v == null ? "" : `${v}%`)}
                    style={{
                      fontSize: 11,
                      fill: "var(--color-bds-label-alternative)",
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* 색만으로 식별되지 않도록 표로도 제공 */}
            <table className="mt-3 w-full text-bds-caption2">
              <tbody>
                {items.map((it) => (
                  <tr key={it.bucket} className="border-t border-bds-border-alternative">
                    <td className="py-1 text-bds-label-neutral">{it.bucket}</td>
                    <td className="py-1 text-right tabular-nums text-foreground">
                      {it.count.toLocaleString()}명
                    </td>
                    <td className="py-1 text-right tabular-nums text-bds-label-alternative">
                      {it.share}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function TooltipShell({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string; color?: string }[];
}) {
  return (
    <div className="rounded-lg border border-bds-border-neutral bg-white px-3 py-2 shadow-bds-02">
      <p className="text-bds-caption2 text-bds-label-assistive">{title}</p>
      <div className="mt-1 space-y-0.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2">
            {r.color && (
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: r.color }}
              />
            )}
            <span className="text-bds-caption2 text-bds-label-neutral">
              {r.label}
            </span>
            <span className="ml-auto text-bds-caption1 tabular-nums text-foreground">
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CumulativeTooltip({ active, label, payload }: TooltipPayload) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <TooltipShell
      title={String(label)}
      rows={[
        {
          label: "누적 다운로드",
          value: `${Number(d.cumGuests).toLocaleString()}`,
          color: "#0a9789",
        },
        {
          label: "누적 가입",
          value: `${Number(d.cumSignups).toLocaleString()}`,
          color: "#7c3aed",
        },
      ]}
    />
  );
}

export function AcquisitionTooltip({ active, label, payload }: TooltipPayload) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <TooltipShell
      title={String(label)}
      rows={[
        { label: "다운로드", value: `${Number(d.guests).toLocaleString()}`, color: "#0a9789" },
        { label: "가입", value: `${Number(d.signups).toLocaleString()}`, color: "#7c3aed" },
        {
          label: "비율",
          value: d.ratio == null ? "—" : `${d.ratio}%`,
        },
      ]}
    />
  );
}

export function RatioTooltip({ active, label, payload }: TooltipPayload) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <TooltipShell
      title={String(label)}
      rows={[
        { label: "비율", value: d.ratio == null ? "—" : `${d.ratio}%` },
        { label: "다운로드", value: `${Number(d.guests).toLocaleString()}` },
        { label: "가입", value: `${Number(d.signups).toLocaleString()}` },
      ]}
    />
  );
}

export function DistributionTooltip({ active, payload }: TooltipPayload) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <TooltipShell
      title={String(d.bucket)}
      rows={[
        { label: "인원", value: `${Number(d.count).toLocaleString()}명` },
        { label: "비중", value: `${d.share}%` },
      ]}
    />
  );
}

export function RegionTooltip({ active, payload }: TooltipPayload) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <TooltipShell
      title={String(d.region)}
      rows={[
        { label: "모임", value: `${Number(d.matches).toLocaleString()}개` },
        { label: "모집중", value: `${Number(d.recruiting).toLocaleString()}개` },
        { label: "호스트", value: `${Number(d.hosts).toLocaleString()}명` },
        { label: "비중", value: `${d.share}%` },
      ]}
    />
  );
}
