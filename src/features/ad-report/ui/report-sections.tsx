"use client";

import { Fragment } from "react";
import { AlertTriangle, Info } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Alert, AlertDescription } from "@/src/shared/ui/kit/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/shared/ui/kit/card";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { formatKst } from "@/src/shared/lib/format-date";
import { formatNumber } from "@/src/shared/lib/format-number";
import type {
  ImpressionReport,
  ImpressionSummary,
  PlacementReport,
} from "../model/actions";
import { formatDay, weekdayKo, type DateRangeKst } from "../model/period";
import {
  PLACEMENTS,
  placementLabel,
  type PlacementMeta,
} from "../model/placements";
import { formatCtr, isBeforeCollection } from "../model/report";

const AXIS_TICK = {
  fontSize: 11,
  fill: "var(--color-bds-label-assistive)",
} as const;

const GRID_STROKE = "var(--color-bds-gray-200)";

/** 숫자보다 먼저 정의를 보여준다 — 광고주가 묻는 첫 질문이 "무엇을 셌나" 다. */
export function ImpressionDefinitions() {
  return (
    <Alert>
      <Info className="size-4" />
      <AlertDescription className="space-y-1">
        {PLACEMENTS.map((m) => (
          <Fragment key={m.value}>
            <p>
              <b>{m.label} 노출</b> — {m.definition}
            </p>
            {m.clickDefinition && (
              <p>
                <b>{m.label} 클릭</b> — {m.clickDefinition}
              </p>
            )}
          </Fragment>
        ))}
        <p>
          <b>순 도달 기기</b> — 기간 안에 그 지면을 한 번이라도 본 기기 수입니다.
          일별 기기 수를 더한 값이 아닙니다.
        </p>
        <p>
          <b>순 회원</b> — 그중 로그인한 회원 수입니다. 비회원은 기기로만 셉니다.
        </p>
        <p>
          <b>클릭률(CTR)</b> — 클릭 ÷ 노출입니다. 노출이 없는 기간은 비율이
          없으므로 0%가 아니라 &lsquo;-&rsquo;로 표시합니다.
        </p>
      </AlertDescription>
    </Alert>
  );
}

/**
 * 지면 하나 — 수집 안내 · 요약 · 일별 차트.
 *
 * 지면마다 규모가 달라(홈은 앱을 열 때마다, 지도는 들어갈 때만) 한 차트에 겹치면
 * 작은 쪽이 바닥에 눌린다. 그래서 차트를 나눈다.
 */
export function PlacementSection({
  meta,
  report,
  range,
  loading,
}: {
  meta: PlacementMeta;
  report?: PlacementReport;
  range?: DateRangeKst;
  loading: boolean;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-bds-heading3 text-bds-label-normal">
        {meta.label} 노출
      </h2>
      {report && range && <CollectionNotice report={report} range={range} />}
      <SummaryTiles summary={report?.summary} loading={loading} />
      <DailyChart report={report} loading={loading} />
    </section>
  );
}

/**
 * 수집 시작 전 구간이 기간에 섞였는지 알린다. 지면마다 따로다.
 *
 * 🔴 계측이 배포되기 전의 0 을 "노출 0" 으로 읽으면 기간 평균이 통째로 깎인
 * 리포트가 나간다.
 */
function CollectionNotice({
  report,
  range,
}: {
  report: PlacementReport;
  range: DateRangeKst;
}) {
  const since = report.summary.collectedSince;
  if (since == null) {
    return (
      <Alert>
        <AlertTriangle className="size-4" />
        <AlertDescription>
          아직 수집된 노출이 없습니다. 이 지면의 계측이 들어간 앱 버전이 배포된
          뒤부터 쌓입니다.
        </AlertDescription>
      </Alert>
    );
  }
  const clickSince = report.summary.clicksCollectedSince;
  // 🔴 클릭 계측은 노출보다 늦게 붙는다. 시작일이 다르면 따로 알린다 —
  // 안 알리면 그 구간의 CTR 이 실제보다 낮게 읽힌다.
  const clickNotice =
    report.summary.clicks != null &&
    (clickSince == null || isBeforeCollection(range.from, clickSince));

  if (!isBeforeCollection(range.from, since) && !clickNotice) return null;
  return (
    <Alert>
      <AlertTriangle className="size-4" />
      <AlertDescription className="space-y-1">
        {isBeforeCollection(range.from, since) && (
          <p>
            이 지면의 노출은 <b>{formatKst(since)}</b>부터 수집됐습니다. 그 전
            날짜는 &lsquo;수집 전&rsquo;으로 표시하며, 0회로 읽으면 안 됩니다.
          </p>
        )}
        {clickNotice && (
          <p>
            {clickSince == null ? (
              <>
                이 지면의 <b>클릭</b>은 아직 한 건도 수집되지 않았습니다. 클릭
                계측이 들어간 앱 버전이 배포된 뒤부터 쌓이며, 그 전까지 클릭률은
                실제보다 낮게 보입니다.
              </>
            ) : (
              <>
                이 지면의 <b>클릭</b>은 <b>{formatKst(clickSince)}</b>부터
                수집됐습니다 — 노출과 시작일이 다릅니다. 그 전 날짜의 클릭률은
                실제보다 낮으니 비교에 쓰지 마세요.
              </>
            )}
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}

function SummaryTiles({
  summary,
  loading,
}: {
  summary?: ImpressionSummary;
  loading: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Tile
        label="노출"
        value={summary && `${formatNumber(summary.impressions)}회`}
        loading={loading}
      />
      <Tile
        label="순 도달 기기"
        value={summary && `${formatNumber(summary.devices)}대`}
        sub="기간 전체 기준"
        loading={loading}
      />
      <Tile
        label="기기당 평균 노출"
        value={
          summary &&
          (summary.frequency == null ? "-" : `${summary.frequency.toFixed(2)}회`)
        }
        loading={loading}
      />
      {/*
        🔴 클릭이 없는 지면은 0 이 아니라 '-' 다. 0 으로 그리면 광고주가
        "보여줬는데 아무도 안 눌렀다" 로 읽는다.
      */}
      <Tile
        label="클릭"
        value={
          summary &&
          (summary.clicks == null ? "-" : `${formatNumber(summary.clicks)}회`)
        }
        sub={summary?.clicks == null ? "이 지면은 클릭을 세지 않습니다" : undefined}
        loading={loading}
      />
      <Tile
        label="순 클릭 기기"
        value={
          summary &&
          (summary.clickDevices == null
            ? "-"
            : `${formatNumber(summary.clickDevices)}대`)
        }
        sub="기간 전체 기준"
        loading={loading}
      />
      <Tile
        label="클릭률(CTR)"
        value={summary && (formatCtr(summary.ctr) || "-")}
        sub="클릭 ÷ 노출"
        loading={loading}
      />
      <Tile
        label="순 회원"
        value={summary && `${formatNumber(summary.members)}명`}
        sub="로그인한 회원만"
        loading={loading}
      />
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  loading,
}: {
  label: string;
  value?: string;
  sub?: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 py-5">
        <p className="text-bds-caption2 text-bds-label-alternative">{label}</p>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="text-bds-title1 text-bds-label-normal">{value ?? "-"}</p>
        )}
        {sub && !loading && (
          <p className="text-bds-caption2 text-bds-label-assistive">{sub}</p>
        )}
      </CardContent>
    </Card>
  );
}

function DailyChart({
  report,
  loading,
}: {
  report?: PlacementReport;
  loading: boolean;
}) {
  // 수집 전 날짜는 0 이 아니라 null — 막대가 없고 선이 끊긴다.
  const data = report?.daily.map((d) => {
    const before = isBeforeCollection(d.date, report.summary.collectedSince);
    return {
      label: d.date.slice(5),
      impressions: before ? null : d.impressions,
      devices: before ? null : d.devices,
    };
  });
  // 🔴 클릭을 이 차트의 세 번째 시리즈로 넣지 않는다. 팔레트는 series-1·2 와
  // muted 뿐이고, chart-tokens.ts 가 "3번째 시리즈가 필요해지면 팔레트를 다시
  // 검증할 것" 이라고 못박아 뒀다. 검증되지 않은 색을 지어내면 대비·색맹
  // 구분이 깨진 채로 나간다. 일별 클릭은 표와 CSV 에 있고, 기간 합계·CTR 은
  // 위 타일에 있다. 추이 차트가 필요해지면 팔레트 검증부터 한다.
  const hasClicks = report?.summary.clicks != null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">일별 노출</CardTitle>
        <p className="text-bds-caption2 text-bds-label-alternative">
          막대는 노출, 선은 그 날의 순 기기입니다. 수집 전 날짜는 비워 둡니다.
          {hasClicks && " 일별 클릭은 아래 표에 있습니다."}
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : !report ? (
          <EmptyState message="조회할 수 있는 기간을 선택하세요" />
        ) : report.summary.collectedSince == null ? (
          <EmptyState
            message="아직 수집된 노출이 없습니다"
            description="이 지면의 계측이 들어간 앱 버전이 배포된 뒤부터 쌓입니다."
          />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart
              data={data}
              margin={{ top: 8, right: 12, bottom: 0, left: -12 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={GRID_STROKE}
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={{ stroke: GRID_STROKE }}
                minTickGap={24}
              />
              <YAxis
                tick={AXIS_TICK}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar
                dataKey="impressions"
                name="노출"
                fill="var(--color-series-1)"
                radius={[3, 3, 0, 0]}
                maxBarSize={28}
              />
              <Line
                type="monotone"
                dataKey="devices"
                name="순 기기(그 날)"
                stroke="var(--color-series-2)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
              />

            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

/** 날짜 한 줄에 지면마다 5칸 — CSV 와 같은 모양이다. */
export function DailyTable({
  report,
  loading,
}: {
  report?: ImpressionReport;
  loading: boolean;
}) {
  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!report) return null;
  const { placements } = report;
  const dates = placements[0]?.daily.map((d) => d.date) ?? [];
  // 지면마다 날짜 → 하루치. 서버가 지면 × 날짜를 전부 채우지만 순서에 기대지 않는다.
  const byDate = placements.map((p) => new Map(p.daily.map((d) => [d.date, d])));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">일별 상세</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[480px] overflow-auto">
          <table className="w-full text-bds-caption1">
            <thead className="sticky top-0 bg-card">
              <tr className="text-bds-label-alternative">
                <th rowSpan={2} className="py-2 text-left font-medium">
                  날짜
                </th>
                {placements.map((p) => (
                  <th
                    key={p.placement}
                    colSpan={5}
                    className="py-2 text-center font-medium"
                  >
                    {placementLabel(p.placement)}
                  </th>
                ))}
              </tr>
              <tr className="text-bds-label-alternative">
                {placements.map((p) => (
                  <Fragment key={p.placement}>
                    <th className="py-2 text-right font-medium">노출</th>
                    <th className="py-2 text-right font-medium">순 기기</th>
                    <th className="py-2 text-right font-medium">순 회원</th>
                    <th className="py-2 text-right font-medium">클릭</th>
                    <th className="py-2 text-right font-medium">클릭 기기</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {dates.map((date) => (
                <tr key={date} className="border-t border-bds-gray-100">
                  <td className="py-2 text-bds-label-normal">
                    {formatDay(date)} ({weekdayKo(date)})
                  </td>
                  {placements.map((p, i) => {
                    const d = byDate[i].get(date);
                    if (!d || isBeforeCollection(date, p.summary.collectedSince)) {
                      return (
                        <td
                          key={p.placement}
                          colSpan={5}
                          className="py-2 text-right text-bds-label-assistive"
                        >
                          수집 전
                        </td>
                      );
                    }
                    // 노출이 세어진 날이라고 클릭도 세어진 것은 아니다 —
                    // 계측이 붙은 시점이 다르다. 0 으로 채우면 그 구간의
                    // 클릭률을 실제보다 낮게 읽는다.
                    const clickBefore =
                      d.clicks == null ||
                      isBeforeCollection(date, p.summary.clicksCollectedSince);
                    return (
                      <Fragment key={p.placement}>
                        <td className="py-2 text-right">
                          {formatNumber(d.impressions)}
                        </td>
                        <td className="py-2 text-right">
                          {formatNumber(d.devices)}
                        </td>
                        <td className="py-2 text-right">
                          {formatNumber(d.members)}
                        </td>
                        {clickBefore ? (
                          <td
                            colSpan={2}
                            className="py-2 text-right text-bds-label-assistive"
                          >
                            {d.clicks == null ? "-" : "수집 전"}
                          </td>
                        ) : (
                          <>
                            <td className="py-2 text-right">
                              {formatNumber(d.clicks ?? 0)}
                            </td>
                            <td className="py-2 text-right">
                              {formatNumber(d.clickDevices ?? 0)}
                            </td>
                          </>
                        )}
                      </Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 bg-card">
              <tr className="border-t-2 border-bds-gray-200 font-medium">
                <td className="py-2 text-bds-label-normal">기간 합계</td>
                {placements.map((p) => (
                  <Fragment key={p.placement}>
                    <td className="py-2 text-right">
                      {formatNumber(p.summary.impressions)}
                    </td>
                    <td className="py-2 text-right">
                      {formatNumber(p.summary.devices)}
                    </td>
                    <td className="py-2 text-right">
                      {formatNumber(p.summary.members)}
                    </td>
                    <td className="py-2 text-right">
                      {p.summary.clicks == null
                        ? "-"
                        : formatNumber(p.summary.clicks)}
                    </td>
                    <td className="py-2 text-right">
                      {p.summary.clickDevices == null
                        ? "-"
                        : formatNumber(p.summary.clickDevices)}
                    </td>
                  </Fragment>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-2 text-bds-caption2 text-bds-label-assistive">
          합계의 순 기기·순 회원·클릭 기기는 기간 전체에서 센 값이라, 위 일별
          값을 더한 것과 다릅니다. 클릭 칸의 &lsquo;-&rsquo;는 그 지면이 클릭을
          세지 않는다는 뜻이고, &lsquo;수집 전&rsquo;은 아직 세기 전이라는
          뜻입니다 — 둘 다 클릭 0회가 아닙니다.
        </p>
      </CardContent>
    </Card>
  );
}
