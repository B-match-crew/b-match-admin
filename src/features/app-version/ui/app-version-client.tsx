"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Apple, Play } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/shared/ui/kit/card";
import { Button } from "@/src/shared/ui/kit/button";
import { Input } from "@/src/shared/ui/kit/input";
import { Label } from "@/src/shared/ui/kit/label";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { Alert, AlertDescription } from "@/src/shared/ui/kit/alert";
import { formatDateTime } from "@/src/shared/lib/format-date";
import { QueryError } from "@/src/shared/ui/query-error";
import { unwrap } from "@/src/shared/lib/unwrap";
import {
  fetchVersionPolicies,
  saveVersionPolicyAction,
  type VersionPolicyRow,
  type VersionPlatform,
} from "../actions";

const PLATFORM_LABELS: Record<VersionPlatform, string> = {
  IOS: "iOS (App Store)",
  ANDROID: "Android (Play Store)",
};

export function AppVersionClient() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["app-version-policies"],
    queryFn: () => unwrap(fetchVersionPolicies()),
  });

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (isError) {
    return (
      <QueryError
        section="버전 정책"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <AlertDescription>
          <span className="font-medium">권장 업데이트</span>: 해당 버전 미만
          설치자에게 스킵 가능한 팝업이 뜹니다 (같은 버전당 1회).{" "}
          <span className="font-medium">강제 업데이트</span>: 해당 버전 미만
          설치자는 스토어로만 이동할 수 있고 앱을 사용할 수 없습니다. 저장 즉시
          다음 앱 실행(콜드 스타트)부터 반영됩니다.
        </AlertDescription>
      </Alert>
      <div className="grid gap-6 md:grid-cols-2">
        {(data ?? []).map((row) => (
          <PlatformCard
            // 서버 값이 바뀌면 카드를 리마운트해 입력 state 를 새 값으로 리셋한다.
            // (useEffect 로 setState 동기화하면 cascading render 를 유발)
            key={`${row.platform}:${row.recommended_version}:${row.min_version}`}
            row={row}
            onSaved={() =>
              queryClient.invalidateQueries({
                queryKey: ["app-version-policies"],
              })
            }
          />
        ))}
      </div>
    </div>
  );
}

function PlatformCard({
  row,
  onSaved,
}: {
  row: VersionPolicyRow;
  onSaved: () => void;
}) {
  const [recommended, setRecommended] = useState(row.recommended_version);
  const [min, setMin] = useState(row.min_version);
  const [saving, setSaving] = useState(false);

  const dirty =
    recommended.trim() !== row.recommended_version ||
    min.trim() !== row.min_version;

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await saveVersionPolicyAction({
        platform: row.platform,
        recommendedVersion: recommended,
        minVersion: min,
      });
      if (!r.ok) {
        toast.error(r.error.message);
        return;
      }
      toast.success(`${PLATFORM_LABELS[row.platform]} 버전 정책을 저장했습니다`);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const Icon = row.platform === "IOS" ? Apple : Play;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {PLATFORM_LABELS[row.platform]}
        </CardTitle>
        <CardDescription>
          마지막 수정: {formatDateTime(row.updated_at)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${row.platform}-recommended`}>
            권장 업데이트 버전
          </Label>
          <Input
            id={`${row.platform}-recommended`}
            value={recommended}
            onChange={(e) => setRecommended(e.target.value)}
            placeholder="예: 1.0.6"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${row.platform}-min`}>강제 업데이트 버전 (최소)</Label>
          <Input
            id={`${row.platform}-min`}
            value={min}
            onChange={(e) => setMin(e.target.value)}
            placeholder="예: 1.0.0"
          />
          <p className="text-xs text-muted-foreground">
            이 버전 미만은 앱 사용이 차단됩니다. 신중히 올려주세요.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="w-full"
        >
          {saving ? "저장 중..." : "저장"}
        </Button>
      </CardContent>
    </Card>
  );
}
