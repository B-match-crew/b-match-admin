"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Apple, Play } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDateTime } from "@/src/shared/lib/format-date";
import { toUserMessage } from "@/src/shared/lib/error-codes";
import {
  fetchVersionPolicies,
  saveVersionPolicyAction,
  type VersionPolicyRow,
  type VersionPlatform,
} from "@/src/features/app-version/actions";

const PLATFORM_LABELS: Record<VersionPlatform, string> = {
  ios: "iOS (App Store)",
  android: "Android (Play Store)",
};

export function AppVersionClient() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["app-version-policies"],
    queryFn: () => fetchVersionPolicies(),
  });

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
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
            key={row.platform}
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

  // 서버 재조회로 row 가 갱신되면 입력값도 동기화.
  useEffect(() => {
    setRecommended(row.recommended_version);
    setMin(row.min_version);
  }, [row.recommended_version, row.min_version]);

  const dirty =
    recommended.trim() !== row.recommended_version ||
    min.trim() !== row.min_version;

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveVersionPolicyAction({
        platform: row.platform,
        recommendedVersion: recommended,
        minVersion: min,
      });
      toast.success(`${PLATFORM_LABELS[row.platform]} 버전 정책을 저장했습니다`);
      onSaved();
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const Icon = row.platform === "ios" ? Apple : Play;

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
