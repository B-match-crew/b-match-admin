"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/shared/ui/kit/card";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import { fetchSignupChannels } from "../../api/actions";
import { DistributionCard, StatTile } from "../primitives";

export function SignupChannelSection() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["stats-signup-channels"],
    queryFn: () => unwrap(fetchSignupChannels()),
  });

  if (isError) {
    return (
      <QueryError
        section="가입 경로 · 마케팅 수신 동의"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <DistributionCard
        title="가입 경로"
        items={data?.providers}
        loading={isLoading}
        note="관리자 더미 계정은 제외됩니다."
      />
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-bds-heading3">마케팅 수신 동의</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile
              label="동의율"
              value={data?.marketingOptInRate ?? null}
              suffix="%"
              hint={
                data ? `${data.marketingOptInCount} / ${data.totalUsers}명` : undefined
              }
              loading={isLoading}
            />
            <StatTile
              label="동의 인원"
              value={data?.marketingOptInCount ?? null}
              loading={isLoading}
            />
            <StatTile
              label="전체 유저"
              value={data?.totalUsers ?? null}
              loading={isLoading}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
