"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import { fetchInquiryFunnel, fetchInquiryWeekly } from "../../api/actions";

const fmtHours = (h: number | null) => {
  if (h == null) return "—";
  if (h < 1) return `${Math.round(h * 60)}분`;
  if (h < 48) return `${h.toFixed(1)}시간`;
  return `${(h / 24).toFixed(1)}일`;
};

/**
 * 순서 퍼널 (109). 같은 기기가 **직전 단계 이후 7일 안에** 간 것만 센다.
 *
 * 🔴 위 "게스트 퍼널"(38)과 다르다. 그쪽은 이벤트마다 기기를 따로 세서
 * "직전 대비 385%" 같은 값이 나온다. 이 표는 100% 를 넘을 수 없다.
 *
 * 🔴 "연락 의향" ≠ "실제 문의". contact_host 는 로그인 확인보다 먼저 찍히는
 * 버튼 이벤트다. 실제 문의는 첫 메시지가 서버에 저장된 것(방 개설).
 */
export function InquiryFunnelSection({ days }: { days: number }) {
  const funnel = useQuery({
    queryKey: ["analytics-inquiry-funnel", days],
    queryFn: () => unwrap(fetchInquiryFunnel(Math.max(days, 90))),
  });
  const weekly = useQuery({
    queryKey: ["analytics-inquiry-weekly", days],
    queryFn: () => unwrap(fetchInquiryWeekly(Math.max(days, 90))),
  });

  const windowFrom = funnel.data?.[0]?.windowFrom;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">문의 퍼널 — 같은 기기, 순서대로</CardTitle>
        <p className="text-bds-caption2 text-bds-label-alternative">
          상세 조회 → 연락 의향 → 실제 문의 → 응답받음. <b>직전 단계 이후 7일 안에</b> 간
          기기만 센다. 소요 시간은 직전 단계로부터의 <b>중앙값</b>.
        </p>
        <p className="text-bds-caption2 text-bds-status-warning-text">
          ⚠️ “연락 의향”은 버튼을 누른 것(로그인 전 포함)이고 “실제 문의”는 첫 메시지가
          저장된 것입니다. 위 게스트 퍼널의 “연락하기”는 의향입니다 — 문의가 아닙니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {funnel.isLoading ? (
          <Skeleton className="h-[160px] w-full" />
        ) : funnel.isError ? (
          <QueryError section="문의 퍼널" error={funnel.error} onRetry={() => void funnel.refetch()} />
        ) : !funnel.data?.length || funnel.data[0].devices === 0 ? (
          <EmptyState message="기간 안에 상세 조회가 없습니다." />
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-bds-caption1">
                <thead>
                  <tr className="text-bds-label-alternative">
                    <th className="py-2 text-left font-medium">단계</th>
                    <th className="py-2 text-right font-medium">기기</th>
                    <th className="py-2 text-right font-medium">직전 대비</th>
                    <th className="py-2 text-right font-medium">소요 (중앙값)</th>
                  </tr>
                </thead>
                <tbody>
                  {funnel.data.map((s) => (
                    <tr key={s.stepOrder} className="border-t border-bds-gray-100">
                      <td className="py-2 text-bds-label-normal">{s.stepName}</td>
                      <td className="py-2 text-right">{s.devices.toLocaleString()}</td>
                      <td className="py-2 text-right">{s.convFromPrev == null ? "—" : `${s.convFromPrev}%`}</td>
                      <td className="py-2 text-right text-bds-label-alternative">{fmtHours(s.medianHours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {windowFrom && (
              <p className="mt-2 text-bds-caption2 text-bds-label-assistive">
                채팅은 90일에 파기되어 <b>{windowFrom}</b> 이후 상세 조회부터 셉니다.
              </p>
            )}
          </div>
        )}

        <div>
          <p className="mb-2 text-bds-body2 text-bds-label-normal">주간 — 의향 / 실제 문의자 / 응답받은 문의자</p>
          {weekly.isLoading ? (
            <Skeleton className="h-[140px] w-full" />
          ) : weekly.isError ? (
            <QueryError section="주간 연락" error={weekly.error} onRetry={() => void weekly.refetch()} />
          ) : !weekly.data?.length ? (
            <EmptyState message="아직 없습니다." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-bds-caption1">
                <thead>
                  <tr className="text-bds-label-alternative">
                    <th className="py-2 text-left font-medium">주</th>
                    <th className="py-2 text-right font-medium">의향 (기기)</th>
                    <th className="py-2 text-right font-medium">그중 회원</th>
                    <th className="py-2 text-right font-medium">실제 문의자</th>
                    <th className="py-2 text-right font-medium">응답받은 문의자</th>
                    <th className="py-2 text-right font-medium">문의 건수</th>
                  </tr>
                </thead>
                <tbody>
                  {weekly.data.map((w) => (
                    <tr key={w.week} className="border-t border-bds-gray-100">
                      <td className="py-2 text-bds-label-normal">{w.week}</td>
                      <td className="py-2 text-right text-bds-label-alternative">{w.intentDevices.toLocaleString()}</td>
                      <td className="py-2 text-right text-bds-label-alternative">{w.intentMembers.toLocaleString()}</td>
                      <td className="py-2 text-right text-bds-label-normal">{w.inquirers.toLocaleString()}</td>
                      <td className="py-2 text-right text-bds-label-normal">{w.replied.toLocaleString()}</td>
                      <td className="py-2 text-right text-bds-label-assistive">{w.inquiryRooms.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-bds-caption2 text-bds-label-assistive">
            “의향”은 기기, “문의자”는 사람 단위라 <b>두 열을 나눠 비율로 읽지 마세요</b> — 전환은 위 퍼널이 같은 축으로 셉니다.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
