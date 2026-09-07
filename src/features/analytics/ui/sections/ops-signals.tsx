"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import {
  fetchCreateAbandonSteps,
  fetchPushPermissionFunnel,
  fetchReplyLatencyVsReinquiry,
  fetchPushReactivation,
} from "../../api/actions";
import { StatTile } from "../primitives";

/** 운영 신호 4종 (113) — 수집만 되고 아무도 안 보던 이벤트들 */
export function OpsSignalsSection({ days }: { days: number }) {
  const abandon = useQuery({
    queryKey: ["analytics-create-abandon", days],
    queryFn: () => unwrap(fetchCreateAbandonSteps(Math.max(days, 90))),
  });
  const perm = useQuery({
    queryKey: ["analytics-push-perm", days],
    queryFn: () => unwrap(fetchPushPermissionFunnel(Math.max(days, 90))),
  });
  const latency = useQuery({
    queryKey: ["analytics-reply-latency", days],
    queryFn: () => unwrap(fetchReplyLatencyVsReinquiry(Math.max(days, 120))),
  });
  const react = useQuery({
    queryKey: ["analytics-push-react", days],
    queryFn: () => unwrap(fetchPushReactivation(Math.max(days, 90))),
  });

  const p = perm.data;
  const a0 = abandon.data?.[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-bds-heading3">운영 신호</CardTitle>
        <p className="text-bds-caption2 text-bds-label-alternative">
          모집글 작성 이탈 · 알림 권한 · 응답 지연과 재문의 · 푸시 재활성. 열린 액션이 성립하는지를 가릅니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* C. 알림 권한 — 휴면 호스트 액션의 전제 */}
        <div>
          <p className="mb-2 text-bds-body2 text-bds-label-normal">알림 권한 — 리마인드가 닿는가</p>
          {perm.isError ? (
            <QueryError section="알림 권한" error={perm.error} onRetry={() => void perm.refetch()} />
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile label="프라이밍 노출" value={p?.primed} loading={perm.isLoading} sub={p ? `허용 ${p.accepted} · 나중에 ${p.later}` : undefined} />
              <StatTile label="OS 허용 / 거부" value={p?.granted} loading={perm.isLoading} sub={p ? `거부 ${p.denied}` : undefined} />
              <StatTile label="모임장 중 거부 (확인된)" value={p?.hostsDeniedKnown} loading={perm.isLoading} sub={p ? `전체 ${p.hostsTotal}명 · 하한선` : undefined} />
              <StatTile label="모임장 중 권한 미상" value={p?.hostsNoSignal} loading={perm.isLoading} sub="권한 이벤트 없음" />
            </div>
          )}
          <p className="mt-2 text-bds-caption2 text-bds-status-warning-text">
            ⚠️ “거부”는 권한을 <b>요청한 순간</b>의 기록만 있어 하한선입니다. 나중에 OS 설정에서 끈 사람은 잡히지 않습니다.
            휴면 호스트에게 리마인드를 보내기 전에 이 수를 보세요.
          </p>
        </div>

        {/* B. 작성 이탈 */}
        <div>
          <p className="mb-2 text-bds-body2 text-bds-label-normal">모집글 작성 — 어느 단계에서 포기하는가</p>
          {abandon.isLoading ? (
            <Skeleton className="h-[120px] w-full" />
          ) : abandon.isError ? (
            <QueryError section="작성 이탈" error={abandon.error} onRetry={() => void abandon.refetch()} />
          ) : !abandon.data?.length ? (
            <EmptyState message="기간 안에 작성 이탈이 없습니다." />
          ) : (
            <>
              <p className="mb-2 text-bds-caption2 text-bds-label-alternative">
                작성 시작 <b className="text-bds-label-normal">{a0?.starts}</b> · 완료 <b className="text-bds-label-normal">{a0?.completes}</b>
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-bds-caption1">
                  <thead>
                    <tr className="text-bds-label-alternative">
                      <th className="py-2 text-left font-medium">마지막 단계</th>
                      <th className="py-2 text-right font-medium">이탈 횟수</th>
                      <th className="py-2 text-right font-medium">기기</th>
                    </tr>
                  </thead>
                  <tbody>
                    {abandon.data.map((r) => (
                      <tr key={r.lastStep} className="border-t border-bds-gray-100">
                        <td className="py-2 text-bds-label-normal">{r.lastStep}단계</td>
                        <td className="py-2 text-right">{r.abandons}</td>
                        <td className="py-2 text-right text-bds-label-alternative">{r.devices}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <p className="mt-2 text-bds-caption2 text-bds-label-assistive">
            ⚠️ <b>모집글 작성</b>의 이탈입니다. 호스트 퍼널의 “모임 등록 시작→완료”(40% 이탈)는 단계별 이벤트가 없어
            여기 안 나옵니다 — 앱 계측이 필요합니다.
          </p>
        </div>

        {/* D. 응답 지연 × 재문의 */}
        <div>
          <p className="mb-2 text-bds-body2 text-bds-label-normal">첫 응답 시간 × 30일 재문의</p>
          {latency.isLoading ? (
            <Skeleton className="h-[160px] w-full" />
          ) : latency.isError ? (
            <QueryError section="응답 지연" error={latency.error} onRetry={() => void latency.refetch()} />
          ) : !latency.data?.length ? (
            <EmptyState message="30일이 다 찬 문의가 아직 없습니다." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-bds-caption1">
                <thead>
                  <tr className="text-bds-label-alternative">
                    <th className="py-2 text-left font-medium">첫 응답까지</th>
                    <th className="py-2 text-right font-medium">문의</th>
                    <th className="py-2 text-right font-medium">문의자</th>
                    <th className="py-2 text-right font-medium">30일 내 재문의</th>
                    <th className="py-2 text-right font-medium">비율</th>
                  </tr>
                </thead>
                <tbody>
                  {latency.data.map((r) => (
                    <tr key={r.bucket} className="border-t border-bds-gray-100">
                      <td className="py-2 text-bds-label-normal">{r.bucket === "no_reply" ? "응답 없음" : r.bucket}</td>
                      <td className="py-2 text-right text-bds-label-alternative">{r.rooms}</td>
                      <td className="py-2 text-right">{r.inquirers}</td>
                      <td className="py-2 text-right">{r.reinquired}</td>
                      <td className="py-2 text-right text-bds-label-normal">{r.rate == null ? "—" : `${r.rate}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-bds-caption2 text-bds-label-assistive">
            빨리 답받은 사람이 원래 적극적일 수 있습니다 — 인과가 아니라 “N시간 안에”의 실험 근거로만.
          </p>
        </div>

        {/* E. 푸시 재활성 */}
        <div>
          <p className="mb-2 text-bds-body2 text-bds-label-normal">푸시 열람 → 잠든 기기를 깨우는가</p>
          {react.isLoading ? (
            <Skeleton className="h-[120px] w-full" />
          ) : react.isError ? (
            <QueryError section="푸시 재활성" error={react.error} onRetry={() => void react.refetch()} />
          ) : !react.data?.length ? (
            <EmptyState message="유지 창(7일)이 다 찬 푸시 열람이 아직 없습니다." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-bds-caption1">
                <thead>
                  <tr className="text-bds-label-alternative">
                    <th className="py-2 text-left font-medium">푸시 종류</th>
                    <th className="py-2 text-right font-medium">열람</th>
                    <th className="py-2 text-right font-medium">기기</th>
                    <th className="py-2 text-right font-medium">잠들어 있던 기기</th>
                    <th className="py-2 text-right font-medium">깨운 뒤 7일 내 복귀</th>
                  </tr>
                </thead>
                <tbody>
                  {react.data.map((r) => (
                    <tr key={r.pushType} className="border-t border-bds-gray-100">
                      <td className="py-2 text-bds-label-normal">{r.pushType}</td>
                      <td className="py-2 text-right text-bds-label-alternative">{r.opens}</td>
                      <td className="py-2 text-right">{r.devices}</td>
                      <td className="py-2 text-right">{r.reactivated}{r.reactivationRate == null ? "" : <span className="ml-1 text-bds-label-assistive">({r.reactivationRate}%)</span>}</td>
                      <td className="py-2 text-right text-bds-label-normal">{r.retained7d}{r.retentionRate == null ? "" : <span className="ml-1 text-bds-label-assistive">({r.retentionRate}%)</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-bds-caption2 text-bds-label-assistive">
            “잠들어 있던” = 열람 전 7일간 활성 없음. 리마인드 크론이 실제로 듣는지를 처음 재는 표입니다.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
