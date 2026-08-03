"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
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
  fetchActiveUsers,
  fetchGuestFunnel,
  fetchHostFunnel,
  fetchRetentionCohort,
  fetchSupplyDemand,
  fetchDemandGap,
  fetchMatchConversion,
  fetchViralFunnel,
  type FunnelStep,
} from "@/src/features/analytics/actions";
import {
  Ga4ChannelSection,
  Ga4CampaignSection,
  Ga4PlatformSection,
} from "@/src/features/analytics/ui/ga4-sections";

/**
 * 시리즈 색 — globals.css 의 검증된 팔레트. 순서 고정, 순환 금지.
 * (`/stats` 와 같은 팔레트를 쓴다 — 페이지가 달라도 같은 색은 같은 뜻이어야 한다)
 */
const SERIES_1 = "var(--color-series-1)";
const SERIES_2 = "var(--color-series-2)";

/** 코호트 히트맵용 순차 램프 — 단일 색상 light→dark (무지개 금지). */
const SEQUENTIAL = [
  "var(--color-bds-primary-100)",
  "var(--color-bds-primary-300)",
  "var(--color-bds-primary-500)",
  "var(--color-bds-primary-400)",
  "var(--color-bds-primary-900)",
];

const RANGES = [
  { value: "7", label: "7일" },
  { value: "30", label: "30일" },
  { value: "90", label: "90일" },
] as const;

const AXIS_TICK = {
  fontSize: 11,
  fill: "var(--color-bds-label-assistive)",
} as const;

export function AnalyticsClient() {
  const [days, setDays] = useState<"7" | "30" | "90">("30");
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
      <SupplyDemandSection days={n} />
      <DemandGapSection days={n} />
      <ConversionSection days={n} />
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

// ─── 활성 사용자 (DAU / WAU / MAU) ───

function ActiveUsersSection({ days }: { days: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-active", days],
    queryFn: () => fetchActiveUsers(days),
  });
  const latest = data?.[data.length - 1];

  return (
    <div className="space-y-4">
      {/* WAU/MAU 는 DAU 와 자릿수가 달라 한 축에 겹치면 DAU 가 눌린다 —
          추이는 DAU 만 선으로 보고, 주/월 활성은 최신값 타일로 읽는다. */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatTile label="DAU (오늘)" value={latest?.dau} sub={`회원 ${latest?.dauMember ?? "-"}`} loading={isLoading} />
        <StatTile label="WAU (7일)" value={latest?.wau} sub={`회원 ${latest?.wauMember ?? "-"}`} loading={isLoading} />
        <StatTile label="MAU (30일)" value={latest?.mau} sub={`회원 ${latest?.mauMember ?? "-"}`} loading={isLoading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-bds-heading3">일별 활성 사용자</CardTitle>
          <p className="text-bds-caption2 text-bds-label-alternative">
            기기 기준(비회원 포함)과 회원 기준을 함께 본다. 앱 실행 시 하루 1회 기록.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : !data?.length ? (
            <EmptyState message="아직 활성 기록이 없습니다. 계측이 포함된 앱 배포 후부터 쌓입니다." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-bds-gray-200)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={AXIS_TICK}
                  tickFormatter={(v: string) => v.slice(5)}
                  tickLine={false}
                  axisLine={{ stroke: "var(--color-bds-gray-200)" }}
                  minTickGap={24}
                />
                <YAxis tick={AXIS_TICK} allowDecimals={false} tickLine={false} axisLine={false} width={52} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line type="monotone" dataKey="dau" name="전체(기기)" stroke={SERIES_1} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} />
                <Line type="monotone" dataKey="dauMember" name="회원" stroke={SERIES_2} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({
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

// ─── 퍼널 (게스트 / 호스트 공용) ───

function FunnelSection({
  title,
  description,
  queryKey,
  fetcher,
  days,
}: {
  title: string;
  description: string;
  queryKey: string;
  fetcher: () => Promise<FunnelStep[]>;
  days: number;
}) {
  const { data, isLoading } = useQuery({
    queryKey: [queryKey, days],
    queryFn: fetcher,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">{title}</CardTitle>
        <p className="text-bds-caption2 text-bds-label-alternative">{description}</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[260px] w-full" />
        ) : !data?.length || data.every((d) => d.users === 0) ? (
          <EmptyState message="아직 이벤트가 없습니다. 계측이 포함된 앱 배포 후부터 쌓입니다." />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 4, right: 48, bottom: 0, left: 12 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-bds-gray-200)" horizontal={false} />
                <XAxis type="number" tick={AXIS_TICK} allowDecimals={false} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="stepName"
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  width={104}
                />
                <Tooltip content={<FunnelTooltip />} />
                <Bar dataKey="users" fill={SERIES_1} radius={[0, 4, 4, 0]} barSize={22}>
                  <LabelList
                    dataKey="users"
                    position="right"
                    style={{ fontSize: 11, fill: "var(--color-bds-label-alternative)" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* 색만으로 읽히지 않도록 수치를 표로도 남긴다 */}
            <FunnelTable steps={data} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function FunnelTable({ steps }: { steps: FunnelStep[] }) {
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

function FunnelTooltip({ active, payload }: { active?: boolean; payload?: { payload: FunnelStep }[] }) {
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

// ─── 코호트 리텐션 ───

function RetentionSection({ days }: { days: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-cohort", days],
    queryFn: () => fetchRetentionCohort(Math.max(days, 30)),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">코호트 리텐션</CardTitle>
        <p className="text-bds-caption2 text-bds-label-alternative">
          처음 앱을 연 주 기준. 셀 값은 그 코호트에서 D+N 일에 다시 온 비율.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : !data?.length ? (
          <EmptyState message="아직 코호트를 만들 활성 기록이 없습니다." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-bds-caption1">
              <thead>
                <tr className="text-bds-label-alternative">
                  <th className="py-2 text-left font-medium">코호트 주</th>
                  <th className="py-2 text-right font-medium">인원</th>
                  <th className="py-2 text-center font-medium">D1</th>
                  <th className="py-2 text-center font-medium">D7</th>
                  <th className="py-2 text-center font-medium">D30</th>
                </tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.week} className="border-t border-bds-gray-100">
                    <td className="py-2 text-bds-label-normal">{c.week}</td>
                    <td className="py-2 text-right">{c.size.toLocaleString()}</td>
                    <RetentionCell value={c.d1} />
                    <RetentionCell value={c.d7} />
                    <RetentionCell value={c.d30} />
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

/** 값이 클수록 진한 단일 색상 — 값을 숫자로도 적어 색만으로 읽지 않게 한다. */
function RetentionCell({ value }: { value: number | null }) {
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

// ─── 수급 밸런스 ───

function SupplyDemandSection({ days }: { days: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-supply-demand", days],
    queryFn: () => fetchSupplyDemand(days),
  });
  const chart = (data ?? []).filter((d) => d.demandPerSupply != null).slice(0, 12);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">지역별 수급 밸런스</CardTitle>
        <p className="text-bds-caption2 text-bds-label-alternative">
          공급 1건당 수요(조회). 높은 지역일수록 모집글이 부족하다 — 호스트 영업 1순위.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[260px] w-full" />
        ) : !chart.length ? (
          <EmptyState message="아직 조회·모집글 데이터가 없습니다." />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chart} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-bds-gray-200)" vertical={false} />
                <XAxis dataKey="region" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "var(--color-bds-gray-200)" }} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} />
                <Tooltip />
                <Bar dataKey="demandPerSupply" name="공급 1건당 수요" fill={SERIES_1} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-bds-caption1">
                <thead>
                  <tr className="text-bds-label-alternative">
                    <th className="py-2 text-left font-medium">지역</th>
                    <th className="py-2 text-right font-medium">공급(모집글)</th>
                    <th className="py-2 text-right font-medium">수요(조회)</th>
                    <th className="py-2 text-right font-medium">배율</th>
                  </tr>
                </thead>
                <tbody>
                  {(data ?? []).map((d) => (
                    <tr key={d.region} className="border-t border-bds-gray-100">
                      <td className="py-2 text-bds-label-normal">{d.region}</td>
                      <td className="py-2 text-right">{d.supply.toLocaleString()}</td>
                      <td className="py-2 text-right">{d.demand.toLocaleString()}</td>
                      <td className="py-2 text-right">
                        {d.demandPerSupply == null ? "공급 0" : `${d.demandPerSupply}×`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── 빈 결과 (수요-공급 갭) ───

function DemandGapSection({ days }: { days: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-demand-gap", days],
    queryFn: () => fetchDemandGap(days),
  });
  const top = (data ?? []).slice(0, 20);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">빈 결과 발생 지점</CardTitle>
        <p className="text-bds-caption2 text-bds-label-alternative">
          검색했는데 결과가 0건이었던 조합. 수요는 있는데 공급이 없는 자리라 마케팅 ROI 가 가장 높다.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : !top.length ? (
          <EmptyState message="빈 결과 노출이 없습니다." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-bds-caption1">
              <thead>
                <tr className="text-bds-label-alternative">
                  <th className="py-2 text-left font-medium">지역</th>
                  <th className="py-2 text-left font-medium">요일</th>
                  <th className="py-2 text-left font-medium">급수</th>
                  <th className="py-2 text-right font-medium">빈 결과 노출</th>
                </tr>
              </thead>
              <tbody>
                {top.map((g, i) => (
                  <tr key={`${g.region}-${g.weekday}-${g.level}-${i}`} className="border-t border-bds-gray-100">
                    <td className="py-2 text-bds-label-normal">{g.region}</td>
                    <td className="py-2">{g.weekday}</td>
                    <td className="py-2">{g.level}</td>
                    <td className="py-2 text-right">{g.emptyViews.toLocaleString()}</td>
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

// ─── 매칭 전환율 랭킹 ───

function ConversionSection({ days }: { days: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-conversion", days],
    queryFn: () => fetchMatchConversion(days),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">매칭 전환율 (낮은 순)</CardTitle>
        <p className="text-bds-caption2 text-bds-label-alternative">
          조회 대비 연락률. 조회 10회 이상인 글만 — 3회 조회 1회 연락이 33%로 1위에 오르면 순위가 무의미해진다.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : !data?.length ? (
          <EmptyState message="조회가 충분히 쌓인 모집글이 아직 없습니다." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-bds-caption1">
              <thead>
                <tr className="text-bds-label-alternative">
                  <th className="py-2 text-left font-medium">모집글</th>
                  <th className="py-2 text-left font-medium">지역</th>
                  <th className="py-2 text-right font-medium">조회</th>
                  <th className="py-2 text-right font-medium">연락</th>
                  <th className="py-2 text-right font-medium">전환율</th>
                </tr>
              </thead>
              <tbody>
                {data.map((m) => (
                  <tr key={m.matchId} className="border-t border-bds-gray-100">
                    <td className="py-2 text-bds-label-normal">{m.title}</td>
                    <td className="py-2">{m.region}</td>
                    <td className="py-2 text-right">{m.views.toLocaleString()}</td>
                    <td className="py-2 text-right">{m.contacts.toLocaleString()}</td>
                    <td className="py-2 text-right">
                      {m.conversion == null ? "-" : `${m.conversion}%`}
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

// ─── 바이럴 퍼널 ───

function ViralSection({ days }: { days: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-viral", days],
    queryFn: () => fetchViralFunnel(days),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">바이럴 퍼널</CardTitle>
        <p className="text-bds-caption2 text-bds-label-alternative">
          공유 → 웹 도달 → 앱 CTA → 미설치(스토어 이동). 건수 기준이며 유저 단위 추적이 아니다 —
          웹 방문자는 기기 식별자가 없다.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[240px] w-full" />
        ) : !data?.length || data.every((d) => d.events === 0) ? (
          <EmptyState message="아직 공유 이벤트가 없습니다." />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 48, bottom: 0, left: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-bds-gray-200)" horizontal={false} />
              <XAxis type="number" tick={AXIS_TICK} allowDecimals={false} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="stepName" tick={AXIS_TICK} tickLine={false} axisLine={false} width={116} />
              <Tooltip />
              <Bar dataKey="events" name="건수" fill={SERIES_1} radius={[0, 4, 4, 0]} barSize={22}>
                <LabelList
                  dataKey="events"
                  position="right"
                  style={{ fontSize: 11, fill: "var(--color-bds-label-alternative)" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
