"use client";

import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/src/shared/ui/kit/dialog";
import { Badge } from "@/src/shared/ui/kit/badge";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { InfoField, InfoGrid } from "@/src/shared/ui/info-field";
import { formatDateTime } from "@/src/shared/lib/format-date";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import { fetchMatchDetail } from "../api/actions";
import { normalizeFeeConfig } from "@/src/shared/types/db";

export function MatchDetailDialog({
  matchId,
  onClose,
}: {
  matchId: number | null;
  onClose: () => void;
}) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["match-detail", matchId],
    queryFn: () => unwrap(fetchMatchDetail(matchId!)),
    enabled: matchId !== null,
  });

  return (
    <Dialog open={matchId !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>매칭 상세 #{matchId}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : isError ? (
          <QueryError error={error} onRetry={() => void refetch()} />
        ) : data ? (
          <div className="space-y-4 text-sm">
            <InfoGrid>
              <InfoField label="제목">{data.title}</InfoField>
              <InfoField label="호스트">
                {data.host?.nickname ?? data.host?.name ?? "-"}
              </InfoField>
              <InfoField label="상태">
                <StatusBadge status={data.status} />
              </InfoField>
              <InfoField label="삭제 여부">
                {data.deleted_at ? (
                  <StatusBadge status="DELETED" />
                ) : (
                  "아니오"
                )}
              </InfoField>
              <InfoField label="시작">{formatDateTime(data.start_time)}</InfoField>
              <InfoField label="종료">{formatDateTime(data.end_time)}</InfoField>
              <InfoField label="장소">{data.location_name}</InfoField>
              <InfoField label="상세 장소">{data.location_detail ?? "-"}</InfoField>
              <InfoField label="주소">{data.address}</InfoField>
              <InfoField label="지역">
                {data.region_1} {data.region_2}
              </InfoField>
              <InfoField label="정원">{data.capacity ?? "제한 없음"}</InfoField>
              <InfoField label="성별 조건">
                {data.gender_condition === "ALL"
                  ? "무관"
                  : data.gender_condition === "MALE_ONLY"
                    ? "남성만"
                    : "여성만"}
              </InfoField>
              <InfoField label="허용 급수">
                <div className="flex gap-1 flex-wrap">
                  {data.allowed_levels.map((l) => (
                    <Badge key={l} variant="outline" className="text-xs">
                      {l}
                    </Badge>
                  ))}
                </div>
              </InfoField>
              <InfoField label="초보 환영">
                {data.beginner_friendly ? "예" : "아니오"}
              </InfoField>
              <InfoField label="조회수">
                {(data.view_count ?? 0).toLocaleString()}회
              </InfoField>
              <InfoField label="찜">
                {(data.favorite_count ?? 0).toLocaleString()}개
              </InfoField>
            </InfoGrid>

            {/* 비용 정보 */}
            {(() => {
              const fc = normalizeFeeConfig(data.fee_config);
              return (
                <div className="rounded-lg border p-3 space-y-2">
                  <h4 className="font-medium">비용 정보</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <InfoField label="참가비 유형">{fc.fee.type}</InfoField>
                    {fc.fee.cash_male != null && (
                      <InfoField label="참가비 (남)">
                        {fc.fee.cash_male?.toLocaleString()}원
                      </InfoField>
                    )}
                    {fc.fee.cash_female != null && (
                      <InfoField label="참가비 (여)">
                        {fc.fee.cash_female?.toLocaleString()}원
                      </InfoField>
                    )}
                    <InfoField label="시설 이용료">
                      {fc.facilityFee.enabled
                        ? `${fc.facilityFee.amount?.toLocaleString()}원`
                        : "없음"}
                    </InfoField>
                    {fc.designatedCock.brand && (
                      <InfoField label="지정구 브랜드">
                        {fc.designatedCock.brand}
                      </InfoField>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* 편의시설 */}
            <div className="rounded-lg border p-3 space-y-2">
              <h4 className="font-medium">편의시설</h4>
              <div className="flex gap-2">
                {data.facilities.parking && (
                  <Badge variant="outline">주차</Badge>
                )}
                {data.facilities.shower && (
                  <Badge variant="outline">샤워</Badge>
                )}
                {data.facilities.water && (
                  <Badge variant="outline">음수대</Badge>
                )}
                {data.facilities.rental && (
                  <Badge variant="outline">대여</Badge>
                )}
                {!data.facilities.parking &&
                  !data.facilities.shower &&
                  !data.facilities.water &&
                  !data.facilities.rental && (
                    <span className="text-muted-foreground">없음</span>
                  )}
              </div>
            </div>

            {/* 설명 */}
            {data.description && (
              <div className="rounded-lg border p-3 space-y-2">
                <h4 className="font-medium">설명</h4>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {data.description}
                </p>
              </div>
            )}

            {/* 기타 안내 */}
            {data.additional_info && (
              <div className="rounded-lg border p-3 space-y-2">
                <h4 className="font-medium">기타 안내</h4>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {data.additional_info}
                </p>
              </div>
            )}

            {/* 연락처 */}
            <div className="rounded-lg border p-3 space-y-2">
              <h4 className="font-medium">연락처</h4>
              <InfoField label={data.contact_type === "URL" ? "URL" : "전화번호"}>
                {data.contact_value}
              </InfoField>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
