"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { AlertTriangle, Send } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/shared/ui/kit/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/shared/ui/kit/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/shared/ui/kit/table";
import { Alert, AlertDescription } from "@/src/shared/ui/kit/alert";
import { Badge } from "@/src/shared/ui/kit/badge";
import { Button } from "@/src/shared/ui/kit/button";
import { Input } from "@/src/shared/ui/kit/input";
import { Label } from "@/src/shared/ui/kit/label";
import { Switch } from "@/src/shared/ui/kit/switch";
import { Textarea } from "@/src/shared/ui/kit/textarea";
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { SegmentedTab } from "@/src/shared/ui/bds/segmented-tab";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { InfoField, InfoGrid } from "@/src/shared/ui/info-field";
import { WarningBox } from "@/src/shared/ui/warning-box";
import { unwrap } from "@/src/shared/lib/unwrap";
import { formatNumber } from "@/src/shared/lib/format-number";
import { formatDateTime } from "@/src/shared/lib/format-date";
import {
  fetchNotificationSummary,
  fetchRecentFailures,
  fetchNotificationCategories,
  updateNotificationCategory,
  type NotificationCategory,
} from "@/src/features/notifications/actions";
import { fetchPushReach } from "@/src/entities/notification";

const TABS = [
  { value: "summary", label: "발송 현황" },
  { value: "failures", label: "실패 내역" },
  { value: "reach", label: "도달·토큰" },
  { value: "categories", label: "카테고리" },
] as const;

type Tab = (typeof TABS)[number]["value"];

const RANGES = [
  { value: "7", label: "7일" },
  { value: "30", label: "30일" },
  { value: "90", label: "90일" },
] as const;

const STATUS_LABEL: Record<string, string> = {
  SENT: "발송 성공",
  FAILED: "발송 실패",
  SKIPPED: "토큰 없음",
  PENDING: "대기",
  SENDING: "발송 중",
  "(기록없음)": "기록 없음",
};

export function NotificationsClient() {
  const [tab, setTab] = useState<Tab>("summary");
  const [days, setDays] = useState<"7" | "30" | "90">("30");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-[420px] max-w-full">
          <SegmentedTab items={TABS} value={tab} onValueChange={setTab} size="sm" />
        </div>
        {(tab === "summary" || tab === "failures") && (
          <div className="flex items-center gap-2">
            <span className="text-bds-body2 text-bds-label-alternative">기간</span>
            <div className="w-48">
              <SegmentedTab
                items={RANGES}
                value={days}
                onValueChange={setDays}
                size="sm"
              />
            </div>
          </div>
        )}
      </div>

      {tab === "summary" && <SummaryTab days={Number(days)} />}
      {tab === "failures" && <FailuresTab />}
      {tab === "reach" && <ReachTab />}
      {tab === "categories" && <CategoriesTab />}
    </div>
  );
}

// ─── 발송 현황 ───

function SummaryTab({ days }: { days: number }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["notification-summary", days],
    queryFn: () => unwrap(fetchNotificationSummary(days)),
  });

  if (isError) {
    return (
      <QueryError
        section="발송 현황"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }
  if (isLoading || !data) return <Skeleton className="h-96" />;

  const failed = data.byStatus.find((s) => s.status === "FAILED")?.cnt ?? 0;
  const skipped = data.byStatus.find((s) => s.status === "SKIPPED")?.cnt ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Tile label="발송 시도" value={data.total} />
        {["SENT", "FAILED", "SKIPPED", "PENDING"].map((s) => (
          <Tile
            key={s}
            label={STATUS_LABEL[s] ?? s}
            value={data.byStatus.find((x) => x.status === s)?.cnt ?? 0}
            tone={s === "FAILED" ? "danger" : s === "SKIPPED" ? "warning" : undefined}
          />
        ))}
      </div>

      {(data.byStatus.find((s) => s.status === "(기록없음)")?.cnt ?? 0) > 0 && (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertDescription>
            발송 상태가 기록되지 않은 알림이{" "}
            {formatNumber(
              data.byStatus.find((s) => s.status === "(기록없음)")?.cnt ?? 0
            )}
            건 있습니다. 발송 상태 컬럼이 생기기 전(migration 43 이전)에 만들어진
            행이며, <b>성공으로 간주하지 않습니다</b>.
          </AlertDescription>
        </Alert>
      )}

      {failed > 0 && (
        <WarningBox tone="danger">
          기간 내 발송 실패 {formatNumber(failed)}건. 실패는 사용자에게 아무런
          표시 없이 지나갑니다 — <b>실패 내역</b> 탭에서 사유를 확인하세요.
        </WarningBox>
      )}
      {skipped > 0 && failed === 0 && (
        <WarningBox tone="caution">
          토큰이 없어 푸시가 나가지 않은 알림 {formatNumber(skipped)}건. 알림함에는
          남았지만 기기로는 도달하지 않았습니다(실패가 아니라 대상의 토큰 부재).
        </WarningBox>
      )}

      <Card>
        <CardHeader>
          <CardTitle>일자별 발송</CardTitle>
          <CardDescription>KST 기준. 성공/실패/토큰없음을 쌓아 보여줍니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.daily.length === 0 ? (
            <EmptyState message="기간 내 발송 기록이 없습니다." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.daily}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="sent" name="성공" stackId="a" fill="var(--color-series-1)" />
                <Bar dataKey="skipped" name="토큰없음" stackId="a" fill="var(--color-bds-status-warning)" />
                <Bar dataKey="failed" name="실패" stackId="a" fill="var(--color-bds-status-error)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>카테고리별</CardTitle>
          <CardDescription>
            발송 규칙(수신 동의·야간 차단)은 카테고리로 갈립니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>카테고리</TableHead>
                <TableHead className="text-right">합계</TableHead>
                <TableHead className="text-right">성공</TableHead>
                <TableHead className="text-right">실패</TableHead>
                <TableHead className="text-right">토큰없음</TableHead>
                <TableHead className="text-right">대기</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.byCategory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState message="기간 내 발송 기록이 없습니다." />
                  </TableCell>
                </TableRow>
              )}
              {data.byCategory.map((c) => (
                <TableRow key={c.category}>
                  <TableCell>
                    <span className="font-medium">{c.label ?? c.category}</span>
                    <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                      {c.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(c.total)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(c.sent)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.failed > 0 ? (
                      <span className="font-medium text-bds-status-error-text">
                        {formatNumber(c.failed)}
                      </span>
                    ) : (
                      0
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatNumber(c.skipped)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatNumber(c.pending)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data.failReasons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>실패 사유 상위</CardTitle>
            <CardDescription>
              FCM 이 돌려준 원문입니다. `NotRegistered` / `InvalidRegistration` 이
              많으면 죽은 토큰이 쌓인 것입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>사유</TableHead>
                  <TableHead className="text-right">건수</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.failReasons.map((f) => (
                  <TableRow key={f.reason}>
                    <TableCell className="font-mono text-xs">{f.reason}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(f.cnt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── 실패 내역 ───

function FailuresTab() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["notification-failures"],
    queryFn: () => unwrap(fetchRecentFailures(50)),
  });

  if (isError) {
    return (
      <QueryError
        section="실패 내역"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-bds-caption2 text-bds-label-alternative">
        최근 실패 50건. 발송 실패는 사용자에게도 관리자에게도 아무 표시가 없으므로
        사유(fail_reason)가 유일한 단서입니다.
      </p>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>수신자</TableHead>
              <TableHead>카테고리</TableHead>
              <TableHead>제목</TableHead>
              <TableHead>실패 사유</TableHead>
              <TableHead>발생 시각</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <SkeletonRows cols={6} />}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState message="발송 실패가 없습니다." />
                </TableCell>
              </TableRow>
            )}
            {data?.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-mono text-xs">#{f.id}</TableCell>
                <TableCell>
                  <span className="font-medium">
                    {f.nickname ?? f.name ?? `#${f.userId}`}
                  </span>
                  <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                    #{f.userId}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge className="bg-bds-back-strong text-bds-label-neutral">
                    {f.category ?? "(없음)"}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-xs truncate text-sm">
                  {f.title ?? "-"}
                </TableCell>
                <TableCell className="font-mono text-xs text-bds-status-error-text">
                  {f.failReason ?? "(사유없음)"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateTime(f.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── 도달·토큰 ───

function ReachTab() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["push-reach"],
    queryFn: () => unwrap(fetchPushReach()),
  });

  if (isError) {
    return (
      <QueryError section="도달·토큰" error={error} onRetry={() => void refetch()} />
    );
  }
  if (isLoading || !data) return <Skeleton className="h-72" />;

  const gapAll = data.targetAll - data.reachableAll;
  const reachRate =
    data.targetAll > 0
      ? Math.round((data.reachableAll / data.targetAll) * 1000) / 10
      : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="size-4" />
            공지 도달 가능 수
          </CardTitle>
          <CardDescription>
            발송 대상 수와 실제로 푸시가 닿는 수는 다릅니다. 공지 발송 화면의
            미리보기는 <b>정회원 수</b>만 세며, 토큰이 없는 사람에게는 알림함
            행만 남고 푸시는 나가지 않습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="전체 대상" value={data.targetAll} />
            <Tile
              label="전체 도달 가능"
              value={data.reachableAll}
              tone={gapAll > 0 ? "warning" : undefined}
              hint={reachRate !== null ? `도달률 ${reachRate}%` : undefined}
            />
            <Tile label="모임장 대상" value={data.targetHost} />
            <Tile label="모임장 도달 가능" value={data.reachableHost} />
          </div>
          {gapAll > 0 && (
            <WarningBox tone="caution">
              {formatNumber(gapAll)}명은 유효한 푸시 토큰이 없어 <b>알림함에만</b>{" "}
              남습니다. 알림 권한을 끈 사용자, 앱을 지운 사용자가 여기 포함됩니다.
            </WarningBox>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>토큰 현황</CardTitle>
          <CardDescription>
            한 사람이 여러 기기를 쓸 수 있어 토큰 수와 사람 수는 다릅니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <InfoGrid columns={3}>
            <InfoField label="전체 토큰">{formatNumber(data.tokensTotal)}</InfoField>
            <InfoField label="보유 사용자">{formatNumber(data.tokenUsers)}</InfoField>
            <InfoField label="30일 미사용 토큰">
              <span
                className={
                  data.staleTokens > 0 ? "text-bds-status-warning-text" : undefined
                }
              >
                {formatNumber(data.staleTokens)}
              </span>
            </InfoField>
          </InfoGrid>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>OS</TableHead>
                <TableHead className="text-right">토큰</TableHead>
                <TableHead className="text-right">사용자</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.byOs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3}>
                    <EmptyState message="등록된 토큰이 없습니다." />
                  </TableCell>
                </TableRow>
              )}
              {data.byOs.map((o) => (
                <TableRow key={o.os}>
                  <TableCell className="font-medium">{o.os}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(o.tokens)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatNumber(o.users)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── 카테고리 ───

function CategoriesTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<NotificationCategory | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["notification-categories"],
    queryFn: () => unwrap(fetchNotificationCategories()),
  });

  if (isError) {
    return (
      <QueryError section="알림 카테고리" error={error} onRetry={() => void refetch()} />
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-bds-caption2 text-bds-label-alternative">
        앱 알림 설정 화면의 문구·정렬·노출을 <b>앱 배포 없이</b> 바꿉니다. 채널
        정의(Android 채널 id · iOS 중요도)와 저장 위치는 잘못 바꾸면 되돌리기
        어려워 화면에서 수정할 수 없습니다 — 마이그레이션으로 다룹니다.
      </p>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">순서</TableHead>
              <TableHead>코드</TableHead>
              <TableHead>라벨 / 설명</TableHead>
              <TableHead>속성</TableHead>
              <TableHead>채널</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <SkeletonRows cols={6} />}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState message="등록된 카테고리가 없습니다." />
                </TableCell>
              </TableRow>
            )}
            {data?.map((c) => (
              <TableRow key={c.code} className={c.isActive ? undefined : "opacity-60"}>
                <TableCell className="tabular-nums text-muted-foreground">
                  {c.sortOrder}
                </TableCell>
                <TableCell className="font-mono text-xs">{c.code}</TableCell>
                <TableCell>
                  <div className="font-medium">{c.label}</div>
                  {c.description && (
                    <div className="text-bds-caption2 text-bds-label-alternative">
                      {c.description}
                    </div>
                  )}
                </TableCell>
                <TableCell className="space-x-1">
                  {!c.isActive && (
                    <Badge className="bg-bds-back-strong text-bds-label-neutral">
                      숨김
                    </Badge>
                  )}
                  {c.isMandatory && (
                    <Badge className="bg-bds-status-info-subtle text-bds-status-info-text">
                      필수
                    </Badge>
                  )}
                  {c.requiresHost && (
                    <Badge className="bg-bds-primary-100 text-bds-primary-900">
                      모임장
                    </Badge>
                  )}
                  {c.storage !== "SETTINGS" && (
                    <Badge className="bg-bds-status-warning-subtle text-bds-status-warning-text">
                      동의이력
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {c.androidChannelId ?? "-"} / {c.iosInterruptionLevel ?? "-"}
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => setEditing(c)}>
                    수정
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editing && (
        <CategoryEditDialog
          category={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void queryClient.invalidateQueries({
              queryKey: ["notification-categories"],
            });
          }}
        />
      )}
    </div>
  );
}

function CategoryEditDialog({
  category,
  onClose,
  onSaved,
}: {
  category: NotificationCategory;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(category.label);
  const [description, setDescription] = useState(category.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(category.sortOrder));
  const [isActive, setIsActive] = useState(category.isActive);
  const [saving, setSaving] = useState(false);

  // 노출을 끄면 그 카테고리의 알림 설정이 전 사용자 화면에서 사라진다.
  const hidingNow = category.isActive && !isActive;

  const save = async () => {
    setSaving(true);
    try {
      const r = await updateNotificationCategory({
        code: category.code,
        label,
        description: description.trim() === "" ? null : description,
        sortOrder: Number(sortOrder) || 0,
        isActive,
      });
      if (!r.ok) {
        toast.error(r.error.message);
        return;
      }
      toast.success("카테고리를 수정했습니다");
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>알림 카테고리 수정</DialogTitle>
          <DialogDescription>
            여기서 바꾼 문구는 <b>앱 알림 설정 화면에 그대로</b> 나갑니다. 앱
            배포 없이 즉시 반영되며, 변경 이력은 감사 로그에 남습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <InfoGrid columns={2}>
            <InfoField label="코드">
              <span className="font-mono text-xs">{category.code}</span>
            </InfoField>
            <InfoField label="저장 위치">
              <span className="font-mono text-xs">{category.storage}</span>
            </InfoField>
          </InfoGrid>

          <div className="space-y-2">
            <Label htmlFor="cat-label">라벨 (최대 50자)</Label>
            <Input
              id="cat-label"
              value={label}
              maxLength={50}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cat-desc">설명 (최대 200자)</Label>
            <Textarea
              id="cat-desc"
              value={description}
              maxLength={200}
              rows={3}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cat-sort">정렬 순서</Label>
            <Input
              id="cat-sort"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-32"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-bds-body2">앱 설정 화면에 노출</div>
              <div className="text-bds-caption2 text-bds-label-alternative">
                끄면 사용자가 이 알림을 켜고 끌 수 없게 됩니다.
              </div>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {hidingNow && (
            <WarningBox tone="danger">
              노출을 끄면 전 사용자의 알림 설정 화면에서 이 항목이 사라집니다.
              저장된 수신 여부는 남지만 사용자가 바꿀 수 없게 됩니다.
            </WarningBox>
          )}
          {category.isMandatory && (
            <WarningBox tone="caution">
              필수 카테고리입니다. 사용자가 끌 수 없는 알림이므로 문구를 바꿀 때
              더 신중해야 합니다.
            </WarningBox>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button onClick={save} disabled={saving || label.trim().length === 0}>
            {saving ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 공용 ───

function Tile({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number;
  tone?: "danger" | "warning";
  hint?: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-bds-caption2 text-bds-label-assistive">{label}</div>
      <div
        className={`mt-0.5 text-bds-title3 tabular-nums ${
          tone === "danger"
            ? "text-bds-status-error-text"
            : tone === "warning"
              ? "text-bds-status-warning-text"
              : "text-foreground"
        }`}
      >
        {formatNumber(value)}
      </div>
      {hint && (
        <div className="text-bds-caption2 text-bds-label-alternative">{hint}</div>
      )}
    </div>
  );
}

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
