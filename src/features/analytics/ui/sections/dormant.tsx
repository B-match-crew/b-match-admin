"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import { fetchDormant } from "../../api/actions";

/**
 * 휴면 — 마지막 활성으로부터 7·14·30일 경과(누적).
 *
 * 기간 인자가 없다. 과거가 아니라 **지금 상태**를 보는 지표라 코호트 성숙도
 * 제약도 없다 — 106 을 올린 날 바로 읽을 수 있는 유일한 축이다.
 *
 * 🔴 전체 기기 대비 휴면율은 "한 번 켜보고 만" 사용자에 지배되어 늘 90%대다.
 * 숫자는 크지만 정보가 없어, 기본으로 보여주는 것은 **2일 이상 방문한 적 있는
 * 기기 대비**다 — 한 번이라도 돌아온 적 있는 사람이 떠난 것이 진짜 이탈이다.
 */
export function DormantSection() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["analytics-dormant"],
    queryFn: () => unwrap(fetchDormant()),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">휴면</CardTitle>
        <p className="text-bds-caption2 text-bds-label-alternative">
          마지막 활성으로부터 N일 이상 지난 대상. <b>누적</b>이라 30일 휴면은 7일에도
          포함된다. 기간 선택과 무관한 <b>현재 상태</b> 스냅샷.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[180px] w-full" />
        ) : isError ? (
          <QueryError section="휴면" error={error} onRetry={() => void refetch()} />
        ) : !data?.rows.length ? (
          <EmptyState message="아직 활성 기록이 없습니다." />
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-bds-caption1 text-bds-label-alternative">
              <span>
                전체 기기 <b className="text-bds-label-normal">{data.baseDevices.toLocaleString()}</b>
              </span>
              <span>
                2일 이상 방문{" "}
                <b className="text-bds-label-normal">{data.baseReturning.toLocaleString()}</b>
              </span>
              <span>
                회원 <b className="text-bds-label-normal">{data.baseMembers.toLocaleString()}</b>
              </span>
              <span>
                호스트 <b className="text-bds-label-normal">{data.baseHosts.toLocaleString()}</b>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-bds-caption1">
                <thead>
                  <tr className="text-bds-label-alternative">
                    <th className="py-2 text-left font-medium">미접속</th>
                    <th className="py-2 text-right font-medium">기기</th>
                    <th className="py-2 text-right font-medium">
                      재방문 기기
                      <span className="ml-1 text-bds-label-assistive">(진짜 이탈)</span>
                    </th>
                    <th className="py-2 text-right font-medium">회원</th>
                    <th className="py-2 text-right font-medium">호스트</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.bucket} className="border-t border-bds-gray-100">
                      <td className="py-2 text-bds-label-normal">{r.minDays}일 이상</td>
                      <td className="py-2 text-right">
                        {r.devices.toLocaleString()}
                        <span className="ml-1 text-bds-label-assistive">
                          {r.rateAll == null ? "" : `(${r.rateAll}%)`}
                        </span>
                      </td>
                      <td className="py-2 text-right text-bds-label-normal">
                        {r.devicesReturning.toLocaleString()}
                        <span className="ml-1 text-bds-label-assistive">
                          {r.rateReturning == null ? "" : `(${r.rateReturning}%)`}
                        </span>
                      </td>
                      <td className="py-2 text-right">{r.members.toLocaleString()}</td>
                      <td className="py-2 text-right font-medium text-bds-status-warning-text">
                        {r.hosts.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 space-y-1 text-bds-caption2 text-bds-label-assistive">
              <p>
                <b>“기기” 괄호 안 비율은 참고용입니다.</b> 분모에 “한 번 켜보고 만”
                기기가 대부분이라 늘 높게 나옵니다. <b>“재방문 기기”</b> 열을 보세요 —
                한 번이라도 돌아왔던 사람이 떠난 것이 진짜 이탈입니다.
              </p>
              <p>
                회원·호스트는 <b>사람 단위</b>입니다. 기기로 세면 두 대 쓰는 사람이
                한쪽만 쉬어도 휴면으로 잡힙니다.
              </p>
              <p>
                <b>휴면 호스트는 비율이 아니라 절대 수로 보세요.</b> 호스트 한 명이
                쉬면 그 모임을 보던 일반 유저 여러 명이 볼 것이 없어집니다 — 공급이
                마르는 신호라 재등록 리마인드(migration 45) 대상입니다.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
