"use client";

import { useEffect, useState } from "react";
import { adminFetchActiveMatches } from "@/src/app/actions/admin-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Swords } from "lucide-react";
import { formatNumber } from "@/src/shared/lib/format-number";

interface ActiveMatchesData {
  todayMatches: number;
  recruitingMatches: number;
}

export function ActiveMatchesWidget() {
  const [data, setData] = useState<ActiveMatchesData | null>(null);

  useEffect(() => {
    adminFetchActiveMatches().then(setData);
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Swords className="h-5 w-5 text-primary" />
          활성 매칭
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!data ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <MatchStatRow
              label="오늘 예정 모임"
              value={formatNumber(data.todayMatches)}
              suffix="건"
            />
            <MatchStatRow
              label="현재 모집 중"
              value={formatNumber(data.recruitingMatches)}
              suffix="건"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MatchStatRow({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-bold text-foreground">
        {value}
        {suffix}
      </span>
    </div>
  );
}
