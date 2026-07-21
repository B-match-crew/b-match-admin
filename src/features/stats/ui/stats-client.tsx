"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { SegmentedTab } from "@/src/shared/ui/bds/segmented-tab";
import {
  fetchDailyAcquisition,
  fetchDemographics,
  fetchHostStats,
  fetchRegionDistribution,
  type DistributionItem,
} from "@/src/features/stats/actions";

/**
 * 시리즈 색 — globals.css 의 검증된 팔레트를 참조한다.
 * 순서 고정, 순환 금지 (3번째 시리즈가 필요해지면 팔레트를 다시 검증할 것).
 */
const SERIES_1 = "var(--color-series-1)";
const SERIES_2 = "var(--color-series-2)";
const SERIES_MUTED = "var(--color-series-muted)";

/** '미입력'/'미지정' 은 카테고리가 아니라 결측이므로 중립색으로 뺀다 */
const isMissing = (bucket: string) =>
  bucket === "미입력" || bucket === "미지정";

const RANGES = [
  { value: "7", label: "7일" },
  { value: "30", label: "30일" },
  { value: "90", label: "90일" },
] as const;

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

      <AcquisitionSection days={Number(days)} />
      <HostSection />
      <DemographicsSection />
      <RegionSection />
    </div>
  );
}

// ─── 1~3. 유입: 다운로드 / 가입 / 일별 비율 ───

function AcquisitionSection({ days }: { days: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["stats-acquisition", days],
    queryFn: () => fetchDailyAcquisition(days),
  });

  const totalGuests = data?.reduce((s, d) => s + d.guests, 0) ?? 0;
  const totalSignups = data?.reduce((s, d) => s + d.signups, 0) ?? 0;
  const periodRatio =
    totalGuests > 0
      ? Math.round((totalSignups / totalGuests) * 1000) / 10
      : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <StatTile label="기간 내 다운로드" value={totalGuests} loading={isLoading} />
        <StatTile label="기간 내 가입" value={totalSignups} loading={isLoading} />
        <StatTile
          label="기간 합산 비율"
          value={periodRatio}
          suffix="%"
          loading={isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-bds-heading3">
            일자별 다운로드 · 가입
          </CardTitle>
          <p className="text-bds-caption2 text-bds-label-alternative">
            다운로드는 스토어 실다운로드가 아니라 앱 첫 실행(디바이스 등록)
            기준입니다. 날짜는 KST.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : !data?.length ? (
            <EmptyState message="데이터가 없습니다." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-bds-gray-200)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--color-bds-label-assistive)" }}
                  tickFormatter={(v: string) => v.slice(5)}
                  tickLine={false}
                  axisLine={{ stroke: "var(--color-bds-gray-200)" }}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-bds-label-assistive)" }}
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip content={<AcquisitionTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line
                  type="monotone"
                  dataKey="guests"
                  name="다운로드"
                  stroke={SERIES_1}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                />
                <Line
                  type="monotone"
                  dataKey="signups"
                  name="가입"
                  stroke={SERIES_2}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 비율은 단위(%)가 달라 같은 축에 겹치지 않고 별도 차트로 분리한다 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-bds-heading3">일별 비율</CardTitle>
          <p className="text-bds-caption2 text-bds-status-warning-text">
            ⚠ 코호트 전환율이 아닙니다. 디바이스와 가입 계정이 연결돼 있지 않아
            같은 사람을 추적할 수 없고, 설치일과 가입일이 다르면 분모·분자가
            다른 날에 잡힙니다. 유입이 급변한 날은 100%를 넘을 수 있습니다.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : !data?.length ? (
            <EmptyState message="데이터가 없습니다." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-bds-gray-200)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--color-bds-label-assistive)" }}
                  tickFormatter={(v: string) => v.slice(5)}
                  tickLine={false}
                  axisLine={{ stroke: "var(--color-bds-gray-200)" }}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-bds-label-assistive)" }}
                  tickFormatter={(v: number) => `${v}%`}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip content={<RatioTooltip />} />
                <Line
                  type="monotone"
                  dataKey="ratio"
                  name="비율"
                  stroke={SERIES_1}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── 4. 호스트 지표 ───

function HostSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["stats-host"],
    queryFn: fetchHostStats,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">호스트 지표</CardTitle>
        <p className="text-bds-caption2 text-bds-label-alternative">
          이 서비스는 인앱 참여 기록이 없어(연락은 앱 외부) 유저 활동은 모임
          개설로만 관측됩니다.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-4">
          <StatTile
            label="호스트 전환율"
            value={data?.hostConversionRate ?? null}
            suffix="%"
            hint={
              data ? `${data.totalHosts} / ${data.totalUsers}명` : undefined
            }
            loading={isLoading}
          />
          <StatTile
            label="호스트 수"
            value={data?.totalHosts ?? null}
            hint={data ? `실제 개설 ${data.hostsWithMatch}명` : undefined}
            loading={isLoading}
          />
          <StatTile
            label="호스트당 평균 개설"
            value={data?.avgMatchesPerHost ?? null}
            suffix="개"
            hint="분모: 실제 개설한 호스트"
            loading={isLoading}
          />
          <StatTile
            label="총 모임 수"
            value={data?.totalMatches ?? null}
            loading={isLoading}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 5. 인구통계 ───

function DemographicsSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["stats-demographics"],
    queryFn: fetchDemographics,
  });

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <DistributionCard
        title="성별"
        items={data?.gender}
        loading={isLoading}
      />
      <DistributionCard title="연령대" items={data?.age} loading={isLoading} />
      <DistributionCard
        title="급수"
        items={data?.level}
        loading={isLoading}
        note="급수는 앱 다음 버전부터 수집 예정이라 현재는 대부분 미입력입니다."
      />
    </div>
  );
}

function DistributionCard({
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

// ─── 6. 지역별 분포 ───

function RegionSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["stats-region"],
    queryFn: fetchRegionDistribution,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">지역별 모임 분포</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : !data?.length ? (
          <EmptyState message="데이터가 없습니다." />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <ResponsiveContainer
              width="100%"
              height={Math.max(220, data.length * 32)}
            >
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 4, right: 44, bottom: 4, left: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="region"
                  tick={{ fontSize: 11, fill: "var(--color-bds-label-neutral)" }}
                  tickLine={false}
                  axisLine={false}
                  width={72}
                />
                <Tooltip content={<RegionTooltip />} cursor={false} />
                <Bar
                  dataKey="matches"
                  fill={SERIES_1}
                  radius={[0, 4, 4, 0]}
                  barSize={16}
                >
                  <LabelList
                    dataKey="matches"
                    position="right"
                    style={{
                      fontSize: 11,
                      fill: "var(--color-bds-label-alternative)",
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <table className="w-full text-bds-caption2 self-start">
              <thead>
                <tr className="border-b border-bds-border-alternative text-bds-label-assistive">
                  <th className="py-1.5 text-left font-normal">지역</th>
                  <th className="py-1.5 text-right font-normal">모임</th>
                  <th className="py-1.5 text-right font-normal">모집중</th>
                  <th className="py-1.5 text-right font-normal">호스트</th>
                  <th className="py-1.5 text-right font-normal">비중</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr
                    key={r.region}
                    className="border-b border-bds-border-alternative"
                  >
                    <td className="py-1.5 text-bds-label-neutral">{r.region}</td>
                    <td className="py-1.5 text-right tabular-nums text-foreground">
                      {r.matches.toLocaleString()}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-bds-label-alternative">
                      {r.recruiting.toLocaleString()}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-bds-label-alternative">
                      {r.hosts.toLocaleString()}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-bds-label-alternative">
                      {r.share}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── 공용 조각 ───

function StatTile({
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

interface TooltipPayload {
  active?: boolean;
  label?: string;
  payload?: { payload: Record<string, number | string | null> }[];
}

function TooltipShell({
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

function AcquisitionTooltip({ active, label, payload }: TooltipPayload) {
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

function RatioTooltip({ active, label, payload }: TooltipPayload) {
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

function DistributionTooltip({ active, payload }: TooltipPayload) {
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

function RegionTooltip({ active, payload }: TooltipPayload) {
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
