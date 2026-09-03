"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import { fetchHostStats } from "../../api/actions";
import { StatTile } from "../primitives";

export function HostSection() {
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
