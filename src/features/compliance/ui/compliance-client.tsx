"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ScrollText, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/shared/ui/kit/card";
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
import { Skeleton } from "@/src/shared/ui/kit/skeleton";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { WarningBox } from "@/src/shared/ui/warning-box";
import { unwrap } from "@/src/shared/lib/unwrap";
import { formatNumber } from "@/src/shared/lib/format-number";
import {
  fetchConsentSummary,
  fetchPurgeStatus,
} from "@/src/features/compliance/actions";
import { AGREEMENT_LABEL, CONSENT_SOURCE_LABEL } from "@/src/entities/user";

export function ComplianceClient() {
  return (
    <div className="space-y-6">
      <ConsentSection />
      <MarketingSection />
      <PurgeSection />
    </div>
  );
}

// ─── 필수 약관 (55) ───

function ConsentSection() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["consent-summary"],
    queryFn: () => unwrap(fetchConsentSummary()),
  });

  if (isError) {
    return (
      <QueryError section="필수 약관 동의" error={error} onRetry={() => void refetch()} />
    );
  }
  if (isLoading || !data) return <Skeleton className="h-72" />;

  const missing = data.members - data.fullyRecorded;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="size-4" />
          필수 약관 동의
        </CardTitle>
        <CardDescription>
          개인정보보호법 제22조 — 동의 사실의 입증책임은 사업자에게 있습니다.
          이력은 append-only 이며 <b>유저·항목별 최신 행이 현재 상태</b>입니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Tile label="정회원" value={data.members} />
          <Tile label="4종 모두 기록됨" value={data.fullyRecorded} />
          <Tile
            label="기록 누락"
            value={missing}
            tone={missing > 0 ? "warning" : undefined}
          />
        </div>

        {missing > 0 && (
          <WarningBox tone="caution">
            {formatNumber(missing)}명은 필수 4종 중 일부 기록이 없습니다. 동의
            이력 기능(migration 55) 이전에 가입했거나, 약관 배열을 보내지 않는
            구버전 앱으로 인증한 경우입니다 — <b>동의를 안 받은 것이 아니라 서버가
            기록을 갖지 못한 것</b>이며, 분쟁 시 입증 수단이 없다는 뜻입니다.
          </WarningBox>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>항목</TableHead>
              <TableHead className="text-right">동의</TableHead>
              <TableHead className="text-right">철회·미동의</TableHead>
              <TableHead>버전</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.byAgreement.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <EmptyState message="동의 이력이 없습니다." />
                </TableCell>
              </TableRow>
            )}
            {data.byAgreement.map((a) => (
              <TableRow key={a.agreement}>
                <TableCell>
                  <span className="font-medium">
                    {AGREEMENT_LABEL[a.agreement] ?? a.agreement}
                  </span>
                  <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                    {a.agreement}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(a.agreed)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {a.notAgreed > 0 ? (
                    <span className="font-medium text-bds-status-warning-text">
                      {formatNumber(a.notAgreed)}
                    </span>
                  ) : (
                    0
                  )}
                </TableCell>
                <TableCell className="space-x-1">
                  {a.versions.map((v) => (
                    <Badge
                      key={v}
                      className="bg-bds-back-strong font-mono text-bds-label-neutral"
                    >
                      {v}
                    </Badge>
                  ))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex flex-wrap gap-1.5">
          <span className="text-bds-caption2 text-bds-label-assistive">
            기록 경로
          </span>
          {data.bySource.map((s) => (
            <Badge key={s.source} className="bg-bds-back-strong text-bds-label-neutral">
              {CONSENT_SOURCE_LABEL[s.source] ?? s.source} {formatNumber(s.cnt)}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 광고성 수신 동의 (52 · 57) ───

function MarketingSection() {
  // 위 섹션과 같은 쿼리 키 — 캐시를 공유하므로 요청은 한 번만 나간다.
  const { data, isLoading, isError } = useQuery({
    queryKey: ["consent-summary"],
    queryFn: () => unwrap(fetchConsentSummary()),
  });

  if (isError) return null; // 에러는 위 섹션이 이미 띄웠다 — 같은 실패를 두 번 알리지 않는다
  if (isLoading || !data) return <Skeleton className="h-60" />;

  const m = data.marketing;

  return (
    <Card>
      <CardHeader>
        <CardTitle>광고성 수신 동의</CardTitle>
        <CardDescription>
          정보통신망법 §50 — 단일 컬럼으로는 동의 시점을 입증할 수 없어 이력이
          정본이고 <code className="font-mono text-xs">users.marketing_opt_in</code>{" "}
          은 그 미러입니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile label="수신 동의 (미러)" value={m.mirrorOptIn} />
          <Tile label="수신 동의 (정본)" value={m.latestAgreed} />
          <Tile
            label="미러 불일치"
            value={m.mirrorMismatch}
            tone={m.mirrorMismatch > 0 ? "danger" : undefined}
          />
          <Tile
            label="2년 재확인 대상"
            value={m.reconfirmDue}
            tone={m.reconfirmDue > 0 ? "warning" : undefined}
          />
        </div>

        {m.mirrorMismatch > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertDescription>
              미러와 정본이 어긋난 유저가 {formatNumber(m.mirrorMismatch)}명
              있습니다. 정상 경로라면 트리거가 두 값을 항상 맞추므로,{" "}
              <b>트리거를 우회해 users 를 직접 수정한 경로</b>가 있다는 뜻입니다.
              분쟁 시 어느 값을 근거로 삼을지가 문제가 되므로 원인을 찾아야 합니다.
            </AlertDescription>
          </Alert>
        )}

        {m.reconfirmDue > 0 && (
          <WarningBox tone="caution">
            최신 동의가 2년 지난 수신 동의자가 {formatNumber(m.reconfirmDue)}명
            있습니다. 확인 고지는 매일 10:00 KST 크론(cron_marketing_reconfirm)이
            보내며 <b>발송에 성공한 건만</b> 이력을 남깁니다. 이 수가 줄지 않으면
            크론이 돌지 않는 것입니다 — 운영 상태 화면에서 확인하세요.
          </WarningBox>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>기록 경로</TableHead>
              <TableHead className="text-right">동의</TableHead>
              <TableHead className="text-right">철회</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {m.bySource.length === 0 && (
              <TableRow>
                <TableCell colSpan={3}>
                  <EmptyState message="광고성 동의 이력이 없습니다." />
                </TableCell>
              </TableRow>
            )}
            {m.bySource.map((s) => (
              <TableRow key={s.source}>
                <TableCell>
                  {CONSENT_SOURCE_LABEL[s.source] ?? s.source}
                  <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                    {s.source}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(s.agreed)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatNumber(s.revoked)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-bds-caption2 text-bds-label-alternative">
          전체 이력 {formatNumber(m.historyRows)}행. RECONFIRM 은 2년 주기 확인
          고지가 남긴 행으로, 다음 주기의 기준 시각을 갱신합니다.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── 파기 대기 (56 · 57 · 91 · 92) ───

function PurgeSection() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["purge-status"],
    queryFn: () => unwrap(fetchPurgeStatus()),
  });

  if (isError) {
    return (
      <QueryError section="파기 대기" error={error} onRetry={() => void refetch()} />
    );
  }
  if (isLoading || !data) return <Skeleton className="h-60" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="size-4" />
          파기 대기
        </CardTitle>
        <CardDescription>
          파기는 크론과 Edge Function 이 수행합니다. 이 화면은 <b>조회만</b>
          합니다 — 되돌릴 수 없는 조작을 클릭 한 번 뒤에 두지 않기 위해서입니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile
            label="파기 대상 계정"
            value={data.accountsDue}
            tone={data.accountsDue > 0 ? "warning" : undefined}
            hint="탈퇴 30일 경과"
          />
          <Tile
            label="파기 대기 계정"
            value={data.accountsWaiting}
            hint="탈퇴 30일 미경과"
          />
          <Tile label="고아 커버 이미지" value={data.coversDue} hint="모임만 삭제" />
          {/*
            삭제 단위는 **방**이다(app migration 91). 메시지 수만 보여주면
            "메시지를 골라 지운다"고 읽히는데, 실제로는 방이 통째로 사라진다.
          */}
          <Tile
            label="채팅 파기 대상"
            value={data.chatRoomsDue ?? 0}
            hint={
              data.chatRoomsDue === null
                ? "채팅 미적용 DB"
                : `마지막 대화 90일 경과 · 메시지 ${formatNumber(
                    data.chatMessagesDue ?? 0,
                  )}건`
            }
          />
          <Tile
            label="채팅 신고 파기 대상"
            value={data.chatReportsDue ?? 0}
            hint={
              data.chatReportsDue === null ? "채팅 미적용 DB" : "처리 후 1년 경과"
            }
          />
          <Tile
            label="매칭 신고 파기 대상"
            value={data.matchReportsDue}
            hint="처리 후 1년 경과"
          />
        </div>

        {data.accountsDue > 0 && (
          <WarningBox tone="danger">
            탈퇴 30일이 지났는데 아직 파기되지 않은 계정이{" "}
            {formatNumber(data.accountsDue)}건 있습니다. 매일 04:10 KST 크론이
            Edge Function 을 깨우는 구조이므로, 이 수가 다음 날에도 남아 있으면{" "}
            <b>크론 또는 Vault 시크릿(purge_accounts_url)</b>을 확인해야 합니다.
            개인정보보호법 제21조는 보유기간 경과 시 지체 없는 파기를 요구합니다.
          </WarningBox>
        )}
        {data.chatRoomsDue === null && (
          <p className="text-bds-caption2 text-bds-label-alternative">
            채팅 스키마가 없는 DB 입니다(채팅 마이그레이션 미적용). 적용되면 파기
            대기분이 여기에 표시됩니다.
          </p>
        )}
        <p className="text-bds-caption2 text-bds-label-alternative">
          채팅은 <b>마지막 메시지로부터 90일</b>이 지난 방을 통째로 지웁니다(약관
          2026-08-31 개정). 최근에 대화한 방은 옛 메시지라도 남습니다. 신고 자료와
          처리 이력은 <b>처리 완료 후 1년</b>이며, 미처리 신고는 오래돼도 파기하지
          않습니다.
        </p>
      </CardContent>
    </Card>
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
