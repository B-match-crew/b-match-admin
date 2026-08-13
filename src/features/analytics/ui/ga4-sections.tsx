"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { WarningBox } from "@/src/shared/ui/warning-box";
import { unwrap } from "@/src/shared/lib/unwrap";
import {
  fetchGa4Channels,
  fetchGa4Campaigns,
  fetchGa4Platforms,
  type Ga4Response,
} from "@/src/features/analytics/ga4-actions";

const SERIES_1 = "var(--color-series-1)";
const AXIS_TICK = {
  fontSize: 11,
  fill: "var(--color-bds-label-assistive)",
} as const;

/**
 * GA4 카드 공통 껍데기.
 *
 * 설정 전(환경변수 없음)에도 페이지가 죽지 않고 **무엇을 해야 하는지**를
 * 보여준다 — 빈 카드만 뜨면 설정을 안 한 건지 데이터가 없는 건지 알 수 없다.
 */
function Ga4Card<T>({
  title,
  description,
  data,
  isLoading,
  isError,
  error,
  onRetry,
  children,
}: {
  title: string;
  description: string;
  data?: Ga4Response<T>;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  children: (rows: T[]) => React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">{title}</CardTitle>
        <p className="text-bds-caption2 text-bds-label-alternative">
          {description}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Skeleton className="h-[220px] w-full" />
        ) : isError ? (
          // GA4 설정 문제는 data.reason 으로 오고, 여기 걸리는 건 그 앞단
          // (권한·네트워크·서버) 실패다 — 둘을 구분해서 보여준다.
          <QueryError error={error} onRetry={onRetry} />
        ) : !data?.configured ? (
          <WarningBox tone="caution">
            GA4 연동이 아직 설정되지 않았습니다. {data?.reason}
          </WarningBox>
        ) : !data.rows.length ? (
          <EmptyState message="GA4 에 아직 데이터가 없습니다. 수집은 24~48시간 지연됩니다." />
        ) : (
          <>
            {data.sampled && (
              <WarningBox tone="caution">
                GA4 가 표본 추출한 결과입니다 — 정확한 수치는 위쪽 자체 집계를
                보세요.
              </WarningBox>
            )}
            {children(data.rows)}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── #8 채널별 신규 유저 ───

export function Ga4ChannelSection({ days }: { days: number }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["ga4-channels", days],
    queryFn: () => unwrap(fetchGa4Channels(days)),
  });

  return (
    <Ga4Card
      title="채널별 신규 유저 (GA4)"
      description="이 유저를 처음 데려온 소스/매체. 설치가 어디서 왔는지는 우리 DB 가 알 수 없어 GA4 만 답할 수 있다."
      data={data}
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={() => void refetch()}
    >
      {(rows) => (
        <>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={rows.slice(0, 10).map((r) => ({
                ...r,
                label: `${r.source} / ${r.medium}`,
              }))}
              layout="vertical"
              margin={{ top: 4, right: 48, bottom: 0, left: 12 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-bds-gray-200)"
                horizontal={false}
              />
              <XAxis type="number" tick={AXIS_TICK} allowDecimals={false} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} width={150} />
              <Tooltip />
              <Bar dataKey="newUsers" name="신규 유저" fill={SERIES_1} radius={[0, 4, 4, 0]} barSize={20}>
                <LabelList
                  dataKey="newUsers"
                  position="right"
                  style={{ fontSize: 11, fill: "var(--color-bds-label-alternative)" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="overflow-x-auto">
            <table className="w-full text-bds-caption1">
              <thead>
                <tr className="text-bds-label-alternative">
                  <th className="py-2 text-left font-medium">소스</th>
                  <th className="py-2 text-left font-medium">매체</th>
                  <th className="py-2 text-right font-medium">신규</th>
                  <th className="py-2 text-right font-medium">전체</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.source}-${r.medium}-${i}`} className="border-t border-bds-gray-100">
                    <td className="py-2 text-bds-label-normal">{r.source}</td>
                    <td className="py-2">{r.medium}</td>
                    <td className="py-2 text-right">{r.newUsers.toLocaleString()}</td>
                    <td className="py-2 text-right">{r.totalUsers.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Ga4Card>
  );
}

// ─── #9 캠페인 성과 ───

export function Ga4CampaignSection({ days }: { days: number }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["ga4-campaigns", days],
    queryFn: () => unwrap(fetchGa4Campaigns(days)),
  });

  return (
    <Ga4Card
      title="캠페인 성과 (GA4)"
      description="캠페인별 신규 유저와 가입 완료. 광고를 태울 때 어느 캠페인이 실제 가입을 만들었는지 본다."
      data={data}
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={() => void refetch()}
    >
      {(rows) => (
        <div className="overflow-x-auto">
          <table className="w-full text-bds-caption1">
            <thead>
              <tr className="text-bds-label-alternative">
                <th className="py-2 text-left font-medium">캠페인</th>
                <th className="py-2 text-left font-medium">소스</th>
                <th className="py-2 text-right font-medium">신규 유저</th>
                <th className="py-2 text-right font-medium">가입 완료</th>
                <th className="py-2 text-right font-medium">전환율</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.campaign}-${r.source}-${i}`} className="border-t border-bds-gray-100">
                  <td className="py-2 text-bds-label-normal">{r.campaign}</td>
                  <td className="py-2">{r.source}</td>
                  <td className="py-2 text-right">{r.newUsers.toLocaleString()}</td>
                  <td className="py-2 text-right">{r.signUps.toLocaleString()}</td>
                  <td className="py-2 text-right">
                    {r.newUsers > 0
                      ? `${Math.round((r.signUps / r.newUsers) * 1000) / 10}%`
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Ga4Card>
  );
}

// ─── #10 플랫폼별 참여도 ───

export function Ga4PlatformSection({ days }: { days: number }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["ga4-platforms", days],
    queryFn: () => unwrap(fetchGa4Platforms(days)),
  });

  return (
    <Ga4Card
      title="플랫폼별 참여도 (GA4)"
      description="세션·참여 시간은 GA4 만 아는 값이다. 리텐션은 위쪽 자체 코호트가 더 정확하므로 여기서 중복해 보여주지 않는다."
      data={data}
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={() => void refetch()}
    >
      {(rows) => (
        <div className="overflow-x-auto">
          <table className="w-full text-bds-caption1">
            <thead>
              <tr className="text-bds-label-alternative">
                <th className="py-2 text-left font-medium">플랫폼</th>
                <th className="py-2 text-right font-medium">활성 유저</th>
                <th className="py-2 text-right font-medium">세션</th>
                <th className="py-2 text-right font-medium">세션당 참여</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.platform} className="border-t border-bds-gray-100">
                  <td className="py-2 text-bds-label-normal">{r.platform}</td>
                  <td className="py-2 text-right">{r.activeUsers.toLocaleString()}</td>
                  <td className="py-2 text-right">{r.sessions.toLocaleString()}</td>
                  <td className="py-2 text-right">{r.avgEngagementSec}초</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Ga4Card>
  );
}
