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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/shared/ui/kit/card";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { Badge } from "@/src/shared/ui/kit/badge";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { SegmentedTab } from "@/src/shared/ui/bds/segmented-tab";
import { unwrap } from "@/src/shared/lib/unwrap";
import {
  fetchDailyAcquisition,
  fetchCumulativeTrend,
  fetchDemographics,
  fetchHostStats,
  fetchRegionDistribution,
  fetchReportStats,
  fetchPopularMatches,
  fetchMatchTimeDistribution,
  fetchSignupChannels,
  fetchChatStats,
  type ChatStats,
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

// ─── 누적 추이 (총 다운로드 / 총 가입 + 전일 대비) ───

function CumulativeSection({ days }: { days: number }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["stats-cumulative", days],
    queryFn: () => unwrap(fetchCumulativeTrend(days)),
  });

  if (isError) {
    return (
      <QueryError
        section="누적 추이"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <CumulativeTile
          label="총 다운로드"
          total={data?.totalGuests ?? null}
          today={data?.guestsToday}
          dodPct={data?.guestsDodPct}
          loading={isLoading}
        />
        <CumulativeTile
          label="총 가입자"
          total={data?.totalSignups ?? null}
          today={data?.signupsToday}
          dodPct={data?.signupsDodPct}
          loading={isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-bds-heading3">누적 추이</CardTitle>
          <p className="text-bds-caption2 text-bds-label-alternative">
            전체 누계 기준 (all-time). 다운로드는 앱 첫 실행(디바이스 등록) 기준.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : !data?.series.length ? (
            <EmptyState message="데이터가 없습니다." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={data.series}
                margin={{ top: 8, right: 12, bottom: 0, left: -12 }}
              >
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
                  width={52}
                />
                <Tooltip content={<CumulativeTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line
                  type="monotone"
                  dataKey="cumGuests"
                  name="누적 다운로드"
                  stroke={SERIES_1}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                />
                <Line
                  type="monotone"
                  dataKey="cumSignups"
                  name="누적 가입"
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
    </div>
  );
}

function CumulativeTile({
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

/** 전일 대비 증감률 배지 */
function DeltaBadge({ pct }: { pct?: number | null }) {
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

function CumulativeTooltip({ active, label, payload }: TooltipPayload) {
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

// ─── 1~3. 유입: 다운로드 / 가입 / 일별 비율 ───

function AcquisitionSection({ days }: { days: number }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["stats-acquisition", days],
    queryFn: () => unwrap(fetchDailyAcquisition(days)),
  });

  const totalGuests = data?.reduce((s, d) => s + d.guests, 0) ?? 0;
  const totalSignups = data?.reduce((s, d) => s + d.signups, 0) ?? 0;
  const periodRatio =
    totalGuests > 0
      ? Math.round((totalSignups / totalGuests) * 1000) / 10
      : null;

  if (isError) {
    return (
      <QueryError section="유입" error={error} onRetry={() => void refetch()} />
    );
  }

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
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["stats-host"],
    queryFn: () => unwrap(fetchHostStats()),
  });

  if (isError) {
    return (
      <QueryError
        section="호스트 지표"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

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
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["stats-demographics"],
    queryFn: () => unwrap(fetchDemographics()),
  });

  if (isError) {
    return (
      <QueryError
        section="인구통계"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

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
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["stats-region"],
    queryFn: () => unwrap(fetchRegionDistribution()),
  });

  if (isError) {
    return (
      <QueryError
        section="지역별 분포"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

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

// ─── 가입 경로 + 마케팅 동의율 ───

function SignupChannelSection() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["stats-signup-channels"],
    queryFn: () => unwrap(fetchSignupChannels()),
  });

  if (isError) {
    return (
      <QueryError
        section="가입 경로 · 마케팅 수신 동의"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <DistributionCard
        title="가입 경로"
        items={data?.providers}
        loading={isLoading}
        note="관리자 더미 계정은 제외됩니다."
      />
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-bds-heading3">마케팅 수신 동의</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile
              label="동의율"
              value={data?.marketingOptInRate ?? null}
              suffix="%"
              hint={
                data ? `${data.marketingOptInCount} / ${data.totalUsers}명` : undefined
              }
              loading={isLoading}
            />
            <StatTile
              label="동의 인원"
              value={data?.marketingOptInCount ?? null}
              loading={isLoading}
            />
            <StatTile
              label="전체 유저"
              value={data?.totalUsers ?? null}
              loading={isLoading}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── 매칭 시간대 분포 (요일 × 시간 히트맵) ───

const DOW_LABEL = ["일", "월", "화", "수", "목", "금", "토"];

function TimeDistributionSection() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["stats-time-dist"],
    queryFn: () => unwrap(fetchMatchTimeDistribution()),
  });

  if (isError) {
    return (
      <QueryError
        section="시간대 분포"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  // dow × hour 그리드로 펼치고 최대값으로 정규화(색 농도)
  const grid = new Map<string, number>();
  let max = 0;
  for (const c of data ?? []) {
    grid.set(`${c.dow}-${c.hour}`, c.cnt);
    if (c.cnt > max) max = c.cnt;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">매칭 시간대 분포</CardTitle>
        <p className="text-bds-caption2 text-bds-label-alternative">
          모임 시작 시각 기준 (KST). 색이 진할수록 그 요일·시간에 모임이 많습니다.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : !data?.length ? (
          <EmptyState message="데이터가 없습니다." />
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              {/* 시간 헤더 */}
              <div className="flex">
                <div className="w-8 shrink-0" />
                {Array.from({ length: 24 }).map((_, h) => (
                  <div
                    key={h}
                    className="flex-1 text-center text-[9px] text-bds-label-assistive"
                  >
                    {h % 3 === 0 ? h : ""}
                  </div>
                ))}
              </div>
              {DOW_LABEL.map((label, dow) => (
                <div key={dow} className="flex items-center">
                  <div className="w-8 shrink-0 text-bds-caption2 text-bds-label-neutral">
                    {label}
                  </div>
                  {Array.from({ length: 24 }).map((_, h) => {
                    const cnt = grid.get(`${dow}-${h}`) ?? 0;
                    const ratio = max > 0 ? cnt / max : 0;
                    return (
                      <div key={h} className="flex-1 p-[1px]">
                        <div
                          className="aspect-square rounded-[2px]"
                          title={`${label} ${h}시 · ${cnt}건`}
                          style={{
                            background:
                              cnt === 0
                                ? "var(--color-bds-back-strong)"
                                : `color-mix(in srgb, var(--color-series-1) ${Math.round(
                                    20 + ratio * 80
                                  )}%, transparent)`,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── 채팅 (61~87) ───

/**
 * 채팅은 제품의 큰 축이 됐는데(61~87) 어드민에는 신고 화면만 있었다.
 * 여기서는 **운영이 봐야 하는 최소치**만 본다 — 대화 내용은 신고가 있을 때만
 * 신고 화면의 스냅샷으로 본다(30일 파기 고지와 어긋나지 않기 위해).
 */
function ChatSection({ days }: { days: number }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["stats-chat", days],
    queryFn: () => unwrap(fetchChatStats(days)),
  });

  if (isError) {
    return (
      <QueryError section="채팅" error={error} onRetry={() => void refetch()} />
    );
  }

  // 채팅 미적용 DB(=prod)에서는 섹션 자체를 접는다. 0 으로 채운 카드를 보여주면
  // "채팅을 아무도 안 쓴다" 로 읽힌다.
  if (!isLoading && data && !data.available) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>채팅</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            message="이 환경에는 채팅 스키마가 없습니다"
            description="채팅 마이그레이션이 적용되면 방·메시지 지표가 여기에 표시됩니다."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>채팅</CardTitle>
        <CardDescription>
          방은 전체 기준, 메시지 추이는 선택 기간 기준입니다. 보관 기간이 지난
          대화의 파기 현황은 <b>시스템 &gt; 동의·파기</b>에서 봅니다 — 보관 규칙은
          바뀌므로 정의를 한 곳에만 둡니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading || !data ? (
          <Skeleton className="h-64" />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ChatTile label="전체 방" value={data.roomsTotal} />
              <ChatTile label="열린 방" value={data.roomsActive} />
              <ChatTile
                label="빈 방"
                value={data.roomsEmpty}
                hint="한 마디도 오가지 않음"
              />
              <ChatTile
                label="미처리 신고"
                value={data.reportsPending}
                hint={`전체 ${data.reportsTotal}건`}
                warn={data.reportsPending > 0}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ChatTile
                label="신규 문의"
                value={data.roomsCreated}
                hint="기간 내 새로 열린 방"
              />
              <ChatTile label="기간 내 메시지" value={data.messagesRanged} />
              <ChatTile label="기간 내 대화한 사람" value={data.sendersRanged} />
              <ChatTile
                label="기간 내 활성 방"
                value={data.roomsRanged}
                hint="예전 방의 대화 포함"
              />
            </div>

            <ChatResponseBlock response={data.response} />


            {data.daily.length === 0 ? (
              <EmptyState message="기간 내 주고받은 메시지가 없습니다." />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data.daily}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="messages"
                    name="메시지"
                    stroke={SERIES_1}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="senders"
                    name="대화한 사람"
                    stroke={SERIES_2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 응답 지표 — 문의가 **답을 받는가**.
 *
 * 방은 유저가 첫 메시지를 보내는 순간 생기므로(app migration 82) 위쪽 지표는
 * 모임장 답장과 무관하다. 문의가 얼마나 들어오는지는 보여도 답 없는 문의가
 * 쌓이는 것은 보이지 않아서, 이 블록이 그 답을 맡는다.
 */
function ChatResponseBlock({
  response,
}: {
  response: ChatStats["response"];
}) {
  // 90 미적용 DB. 0% 로 그리면 "아무도 답을 안 한다" 로 읽히므로 감춘다.
  if (!response) return null;

  const rate =
    response.rooms > 0
      ? Math.round((response.answered / response.rooms) * 1000) / 10
      : null;
  const unanswered = response.rooms - response.answered;

  return (
    <div className="space-y-2 rounded-lg border border-bds-border-alternative bg-bds-back-alternative p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-bds-heading3">문의 응답</h4>
        <span className="text-bds-caption2 text-bds-label-alternative">
          {response.from} 이후 열린 방 {response.rooms.toLocaleString()}개 기준
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ChatTile
          label="응답률"
          value={rate ?? 0}
          suffix="%"
          hint={`${response.answered.toLocaleString()} / ${response.rooms.toLocaleString()}개 방`}
          warn={rate !== null && rate < 50}
        />
        <ChatTile
          label="첫 응답까지 (중앙값)"
          value={response.medianMinutes ?? 0}
          formatted={
            response.medianMinutes === null
              ? "-"
              : formatMinutes(response.medianMinutes)
          }
        />
        <ChatTile
          label="답 없는 문의"
          value={unanswered}
          warn={unanswered > 0}
        />
        <ChatTile
          label="아직 24시간 이내"
          value={response.unansweredRecent}
          hint="답할 시간이 남음"
        />
      </div>

      {response.unansweredRecent > 0 && (
        <p className="text-bds-caption2 text-bds-label-alternative">
          답 없는 문의 {unanswered.toLocaleString()}개 중{" "}
          {response.unansweredRecent.toLocaleString()}개는 열린 지 24시간이 지나지
          않았습니다 — 아직 미응답으로 단정할 수 없습니다.
        </p>
      )}

      {response.windowCapped && (
        <p className="text-bds-caption2 text-bds-status-warning-text">
          선택한 기간이 남아 있는 대화보다 깁니다. 보관 기간이 지난 대화는
          파기되어 답장 여부를 알 수 없으므로, 응답률은 <b>{response.from}</b>{" "}
          이후에 열린 방만으로 계산했습니다.
        </p>
      )}
    </div>
  );
}

/** 분 → 사람이 읽는 길이. 응답 시간은 분·시간·일 단위가 모두 나온다. */
function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}분`;
  if (minutes < 60 * 24) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
  }
  const d = Math.floor(minutes / (60 * 24));
  const h = Math.round((minutes % (60 * 24)) / 60);
  return h === 0 ? `${d}일` : `${d}일 ${h}시간`;
}

function ChatTile({
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

// ─── 신고 지표 ───

function ReportSection() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["stats-reports"],
    queryFn: () => unwrap(fetchReportStats()),
  });

  if (isError) {
    return (
      <QueryError
        section="신고 통계"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }
  const s = data?.summary;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-bds-heading3">신고 지표</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <StatTile
              label="미처리 신고"
              value={s?.pending ?? null}
              hint={s ? `전체 ${s.total}건` : undefined}
              loading={isLoading}
            />
            <StatTile
              label="신고율"
              value={s?.reportRate ?? null}
              suffix="%"
              hint="신고된 매칭 / 전체 매칭"
              loading={isLoading}
            />
            <StatTile
              label="처리 소요(중앙값)"
              value={s?.medianHoursToResolve ?? null}
              suffix="시간"
              loading={isLoading}
            />
            <StatTile
              label="조치 / 반려"
              value={s ? s.actioned : null}
              hint={s ? `반려 ${s.dismissed}건` : undefined}
              loading={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-bds-heading3">신고 많이 받은 호스트</CardTitle>
          <p className="text-bds-caption2 text-bds-label-alternative">
            서로 다른 신고자 수 우선. 상위 20명.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[160px] w-full" />
          ) : !data?.hosts.length ? (
            <EmptyState message="신고가 없습니다." />
          ) : (
            <table className="w-full text-bds-caption2">
              <thead>
                <tr className="border-b border-bds-border-alternative text-bds-label-assistive">
                  <th className="py-1.5 text-left font-normal">호스트</th>
                  <th className="py-1.5 text-left font-normal">상태</th>
                  <th className="py-1.5 text-right font-normal">신고자 수</th>
                  <th className="py-1.5 text-right font-normal">총 신고</th>
                </tr>
              </thead>
              <tbody>
                {data.hosts.map((h) => (
                  <tr
                    key={h.host_id}
                    className="border-b border-bds-border-alternative"
                  >
                    <td className="py-1.5">
                      <span className="text-foreground">
                        {h.nickname ?? h.name ?? `#${h.host_id}`}
                      </span>
                      <span className="ml-1.5 font-mono text-[11px] text-bds-label-assistive">
                        #{h.host_id}
                      </span>
                    </td>
                    <td className="py-1.5">
                      <StatusBadge status={h.user_status} />
                    </td>
                    <td className="py-1.5 text-right tabular-nums font-medium text-foreground">
                      {h.reporterCount}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-bds-label-alternative">
                      {h.reportCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── 인기 매칭 ───

function PopularMatchSection() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["stats-popular"],
    queryFn: () => unwrap(fetchPopularMatches(10)),
  });

  if (isError) {
    return (
      <QueryError
        section="인기 매칭"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">인기 매칭</CardTitle>
        <p className="text-bds-caption2 text-bds-label-alternative">
          찜 수 기준 상위 10개 (동률 시 조회수).
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : !data?.length ? (
          <EmptyState message="데이터가 없습니다." />
        ) : (
          <table className="w-full text-bds-caption2">
            <thead>
              <tr className="border-b border-bds-border-alternative text-bds-label-assistive">
                <th className="py-1.5 text-left font-normal">#</th>
                <th className="py-1.5 text-left font-normal">제목</th>
                <th className="py-1.5 text-left font-normal">지역</th>
                <th className="py-1.5 text-right font-normal">찜</th>
                <th className="py-1.5 text-right font-normal">조회</th>
              </tr>
            </thead>
            <tbody>
              {data.map((m, i) => (
                <tr
                  key={m.id}
                  className="border-b border-bds-border-alternative"
                >
                  <td className="py-1.5 font-mono text-[11px] text-bds-label-assistive">
                    {i + 1}
                  </td>
                  <td className="py-1.5 max-w-xs truncate text-foreground">
                    {m.title}
                  </td>
                  <td className="py-1.5">
                    {m.region_1 ? (
                      <Badge variant="outline">{m.region_1}</Badge>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="py-1.5 text-right tabular-nums font-medium text-foreground">
                    {m.favorite_count.toLocaleString()}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-bds-label-alternative">
                    {m.view_count.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
