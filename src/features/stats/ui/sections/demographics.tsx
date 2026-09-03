"use client";

import { useQuery } from "@tanstack/react-query";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import { fetchDemographics } from "../../api/actions";
import { DistributionCard } from "../primitives";

export function DemographicsSection() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["stats-demographics"],
    queryFn: () => unwrap(fetchDemographics()),
  });

  if (isError) {
    return (
      <QueryError
        section="인구통계"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <DistributionCard
        title="성별"
        items={data?.gender}
        loading={isLoading}
      />
      <DistributionCard title="연령대" items={data?.age} loading={isLoading} />
      <DistributionCard
        title="급수"
        items={data?.level}
        loading={isLoading}
        note="급수는 앱 다음 버전부터 수집 예정이라 현재는 대부분 미입력입니다."
      />
    </div>
  );
}
