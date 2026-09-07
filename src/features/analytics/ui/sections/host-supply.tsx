"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import { fetchHostOnboardingLag, fetchHostReregistration, fetchSupplyConcentration } from "../../api/actions";
import { StatTile } from "../primitives";

const fmtHours = (h: number | null) => {
  if (h == null) return undefined;
  if (h < 1) return `${Math.round(h * 60)}분`;
  if (h < 48) return `${h.toFixed(1)}시간`;
  return `${(h / 24).toFixed(1)}일`;
};

/** 모임장 공급 유지 (111) — 등록→첫 문의 · 28일 재등록 · 집중도 */
export function HostSupplySection({ days }: { days: number }) {
  const lag = useQuery({
    queryKey: ["analytics-host-lag", days],
    queryFn: () => unwrap(fetchHostOnboardingLag(Math.max(days, 90))),
  });
  const rereg = useQuery({
    queryKey: ["analytics-host-rereg", days],
    queryFn: () => unwrap(fetchHostReregistration(Math.max(days, 120))),
  });
  const conc = useQuery({
    queryKey: ["analytics-supply-conc", days],
    queryFn: () => unwrap(fetchSupplyConcentration(days, 10)),
  });

  const l = lag.data;
  const inquiredPct = l && l.hostsListed > 0 ? Math.round((l.hostsInquired14d / l.hostsListed) * 1000) / 10 : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">모임장 공급 유지</CardTitle>
        <p className="text-bds-caption2 text-bds-label-alternative">
          새 모임장이 붙는가(등록 → 첫 문의), 남는가(28일 재등록), 공급이 몇 모임에 쏠려 있는가.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 등록 → 첫 문의 */}
        <div>
          <p className="mb-2 text-bds-body2 text-bds-label-normal">등록 → 첫 문의</p>
          {lag.isError ? (
            <QueryError section="등록→첫 문의" error={lag.error} onRetry={() => void lag.refetch()} />
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile label="기간 내 등록" value={l?.hostsRegistered} loading={lag.isLoading} />
              <StatTile label="모집글 올림" value={l?.hostsListed} loading={lag.isLoading} sub={l ? `등록의 ${l.hostsRegistered > 0 ? Math.round((l.hostsListed / l.hostsRegistered) * 100) : 0}%` : undefined} />
              <StatTile label="14일 내 문의 받음" value={l?.hostsInquired14d} loading={lag.isLoading} sub={inquiredPct == null ? undefined : `올린 사람의 ${inquiredPct}%`} />
              <StatTile label="첫 문의까지 (중앙값)" value={undefined} loading={lag.isLoading} sub={l ? `${fmtHours(l.medianLagHours) ?? "—"} · p90 ${fmtHours(l.p90LagHours) ?? "—"}` : undefined} />
            </div>
          )}
          <p className="mt-2 text-bds-caption2 text-bds-label-assistive">
            첫 문의가 늦거나 없으면 “올려도 소용없다”로 떠납니다. 소요 시간은 <b>받은 사람만</b>의 분포입니다.
          </p>
        </div>

        {/* 28일 재등록 */}
        <div>
          <p className="mb-2 text-bds-body2 text-bds-label-normal">첫 모집글 주차 × 28일 내 재등록</p>
          {rereg.isLoading ? (
            <Skeleton className="h-[120px] w-full" />
          ) : rereg.isError ? (
            <QueryError section="재등록" error={rereg.error} onRetry={() => void rereg.refetch()} />
          ) : !rereg.data?.length ? (
            <EmptyState message="28일이 다 찬 주차가 아직 없습니다." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-bds-caption1">
                <thead>
                  <tr className="text-bds-label-alternative">
                    <th className="py-2 text-left font-medium">첫 글 주차</th>
                    <th className="py-2 text-right font-medium">모임장</th>
                    <th className="py-2 text-right font-medium">28일 내 재등록</th>
                    <th className="py-2 text-right font-medium">비율</th>
                  </tr>
                </thead>
                <tbody>
                  {rereg.data.map((r) => (
                    <tr key={r.week} className="border-t border-bds-gray-100">
                      <td className="py-2 text-bds-label-normal">{r.week}</td>
                      <td className="py-2 text-right">{r.hosts}</td>
                      <td className="py-2 text-right">{r.reregistered28d}</td>
                      <td className="py-2 text-right text-bds-label-normal">{r.rate == null ? "—" : `${r.rate}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-bds-caption2 text-bds-label-assistive">
            재등록 = 첫 글과 <b>다른 날</b> 올린 글(같은 날은 반복 등록 배치일 수 있음). 그 주 마지막 날 + 28일이 지난 주만.
          </p>
        </div>

        {/* 집중도 */}
        <div>
          <p className="mb-2 text-bds-body2 text-bds-label-normal">공급 집중도 — 상위 10 모임</p>
          {conc.isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : conc.isError ? (
            <QueryError section="집중도" error={conc.error} onRetry={() => void conc.refetch()} />
          ) : !conc.data?.length ? (
            <EmptyState message="기간 안에 열리는 모집글이 없습니다." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-bds-caption1">
                <thead>
                  <tr className="text-bds-label-alternative">
                    <th className="py-2 text-left font-medium">#</th>
                    <th className="py-2 text-left font-medium">모임</th>
                    <th className="py-2 text-right font-medium">모집글</th>
                    <th className="py-2 text-right font-medium">비중</th>
                    <th className="py-2 text-right font-medium">누적</th>
                  </tr>
                </thead>
                <tbody>
                  {conc.data.map((r) => (
                    <tr key={r.hostId} className="border-t border-bds-gray-100">
                      <td className="py-2 text-bds-label-assistive">{r.rank}</td>
                      <td className="py-2 text-bds-label-normal">{r.clubName ?? `(host ${r.hostId})`}</td>
                      <td className="py-2 text-right">{r.listings}</td>
                      <td className="py-2 text-right">{r.share}%</td>
                      <td className="py-2 text-right text-bds-label-normal">{r.cumShare}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-bds-caption2 text-bds-label-assistive">
            운동 예정일 기준. “상위 5개가 60%”면 그 5개가 빠질 때 공급이 그만큼 빕니다.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
