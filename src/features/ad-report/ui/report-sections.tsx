"use client";

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
  HomeImpressionReport,
  HomeImpressionSummary,
} from "../model/actions";
import { formatDay, weekdayKo } from "../model/period";
import { IMPRESSION_DEFINITION, isBeforeCollection } from "../model/report";

const AXIS_TICK = {
  fontSize: 11,
  fill: "var(--color-bds-label-assistive)",
} as const;

const GRID_STROKE = "var(--color-bds-gray-200)";

/** 숫자보다 먼저 정의를 보여준다 — 광고주가 묻는 첫 질문이 "무엇을 셌나" 다. */
export function ImpressionDefinition() {
  return (
    <Alert>
      <Info className="size-4" />
      <AlertDescription className="space-y-1">
        <p>
          <b>노출</b> — {IMPRESSION_DEFINITION}
        </p>
        <p>
          <b>순 도달 기기</b> — 기간 안에 홈을 한 번이라도 본 기기 수입니다. 일별
          기기 수를 더한 값이 아닙니다.
        </p>
        <p>
          <b>순 회원</b> — 그중 로그인한 회원 수입니다. 비회원은 기기로만 셉니다.
        </p>
      </AlertDescription>
    </Alert>
  );
}

/**
 * 수집 시작 전 구간이 기간에 섞였는지 알린다.
 *
 * 🔴 계측이 배포되기 전의 0 을 "노출 0" 으로 읽으면 기간 평균이 통째로 깎인
 * 리포트가 나간다.
 */
export function CollectionNotice({ report }: { report?: HomeImpressionReport }) {
  if (!report) return null;
  const since = report.summary.collectedSince;
  if (since == null) {
    return (
      <Alert>
        <AlertTriangle className="size-4" />
        <AlertDescription>
          아직 수집된 노출이 없습니다. 노출 계측이 들어간 앱 버전이 배포된 뒤부터
          쌓입니다.
        </AlertDescription>
      </Alert>
    );
  }
  if (!isBeforeCollection(report.range.from, since)) return null;
  return (
    <Alert>
      <AlertTriangle className="size-4" />
      <AlertDescription>
        노출은 <b>{formatKst(since)}</b>부터 수집됐습니다. 그 전 날짜는
        &lsquo;수집 전&rsquo;으로 표시하며, 0회로 읽으면 안 됩니다.
      </AlertDescription>
    </Alert>
  );
}

export function SummaryTiles({
  summary,
  loading,
}: {
  summary?: HomeImpressionSummary;
  loading: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

export function DailyChart({
  report,
  loading,
}: {
  report?: HomeImpressionReport;
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">일별 노출</CardTitle>
        <p className="text-bds-caption2 text-bds-label-alternative">
          막대는 노출, 선은 그 날의 순 기기입니다. 수집 전 날짜는 비워 둡니다.
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
            description="노출 계측이 들어간 앱 버전이 배포된 뒤부터 쌓입니다."
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

export function DailyTable({
  report,
  loading,
}: {
  report?: HomeImpressionReport;
  loading: boolean;
}) {
  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!report) return null;
  const { daily, summary } = report;

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
                <th className="py-2 text-left font-medium">날짜</th>
                <th className="py-2 text-right font-medium">노출</th>
                <th className="py-2 text-right font-medium">순 기기</th>
                <th className="py-2 text-right font-medium">순 회원</th>
              </tr>
            </thead>
            <tbody>
              {daily.map((d) => (
                <tr key={d.date} className="border-t border-bds-gray-100">
                  <td className="py-2 text-bds-label-normal">
                    {formatDay(d.date)} ({weekdayKo(d.date)})
                  </td>
                  {isBeforeCollection(d.date, summary.collectedSince) ? (
                    <td
                      colSpan={3}
                      className="py-2 text-right text-bds-label-assistive"
                    >
                      수집 전
                    </td>
                  ) : (
                    <>
                      <td className="py-2 text-right">
                        {formatNumber(d.impressions)}
                      </td>
                      <td className="py-2 text-right">
                        {formatNumber(d.devices)}
                      </td>
                      <td className="py-2 text-right">
                        {formatNumber(d.members)}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 bg-card">
              <tr className="border-t-2 border-bds-gray-200 font-medium">
                <td className="py-2 text-bds-label-normal">기간 합계</td>
                <td className="py-2 text-right">
                  {formatNumber(summary.impressions)}
                </td>
                <td className="py-2 text-right">
                  {formatNumber(summary.devices)}
                </td>
                <td className="py-2 text-right">
                  {formatNumber(summary.members)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-2 text-bds-caption2 text-bds-label-assistive">
          합계의 순 기기·순 회원은 기간 전체에서 센 값이라, 위 일별 값을 더한
          것과 다릅니다.
        </p>
      </CardContent>
    </Card>
  );
}
