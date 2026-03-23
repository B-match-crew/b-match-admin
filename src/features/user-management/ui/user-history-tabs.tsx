"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { LoadingSpinner } from "@/src/shared/ui/loading-spinner";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { formatDateTime, formatDate } from "@/src/shared/lib/format-date";
import { formatNumber } from "@/src/shared/lib/format-number";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Swords,
  CreditCard,
  Flag,
  Ticket,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface UserHistoryTabsProps {
  userId: string;
}

interface MatchHistory {
  id: string;
  title: string;
  start_time: string;
  status: string;
  location_name: string;
}

interface PaymentHistory {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  match?: { title: string }[] | null;
}

interface ReportHistory {
  id: string;
  target_type: string;
  reason: string;
  status: string;
  created_at: string;
}

interface BadticketEvent {
  id: string;
  delta: number;
  reason: string;
  admin_note: string | null;
  reference_match_id: string | null;
  created_at: string;
}

export function UserHistoryTabs({ userId }: UserHistoryTabsProps) {
  return (
    <Tabs defaultValue="matching" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="matching" className="gap-1">
          <Swords className="h-3 w-3" />
          매칭 이력
        </TabsTrigger>
        <TabsTrigger value="payment" className="gap-1">
          <CreditCard className="h-3 w-3" />
          결제 이력
        </TabsTrigger>
        <TabsTrigger value="report" className="gap-1">
          <Flag className="h-3 w-3" />
          신고 이력
        </TabsTrigger>
        <TabsTrigger value="badticket" className="gap-1">
          <Ticket className="h-3 w-3" />
          배티켓 이력
        </TabsTrigger>
      </TabsList>

      <TabsContent value="matching">
        <MatchingHistoryTab userId={userId} />
      </TabsContent>
      <TabsContent value="payment">
        <PaymentHistoryTab userId={userId} />
      </TabsContent>
      <TabsContent value="report">
        <ReportHistoryTab userId={userId} />
      </TabsContent>
      <TabsContent value="badticket">
        <BadticketHistoryTab userId={userId} />
      </TabsContent>
    </Tabs>
  );
}

function MatchingHistoryTab({ userId }: { userId: string }) {
  const supabase = useSupabase();
  const [data, setData] = useState<MatchHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        // 게스트로 참여한 매칭 (applications → matches)
        const { data: apps } = await supabase
          .from("applications")
          .select("id, status, match:match_id(id, title, start_time, status, location_name)")
          .eq("guest_id", userId)
          .order("created_at", { ascending: false })
          .limit(50);

        const matchHistory: MatchHistory[] = (apps ?? [])
          .filter((a: Record<string, unknown>) => a.match)
          .map((a: Record<string, unknown>) => {
            const m = a.match as Record<string, unknown>;
            return {
              id: m.id as string,
              title: m.title as string,
              start_time: m.start_time as string,
              status: a.status as string,
              location_name: m.location_name as string,
            };
          });

        setData(matchHistory);
      } catch (e) {
        console.error("매칭 이력 조회 실패:", e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [supabase, userId]);

  if (isLoading) return <LoadingSpinner />;
  if (data.length === 0) return <EmptyState message="매칭 이력이 없습니다" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">매칭 참여 이력 ({data.length}건)</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>매칭명</TableHead>
              <TableHead>장소</TableHead>
              <TableHead>일시</TableHead>
              <TableHead>상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell>{item.location_name}</TableCell>
                <TableCell>{formatDate(item.start_time)}</TableCell>
                <TableCell>
                  <StatusBadge status={item.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PaymentHistoryTab({ userId }: { userId: string }) {
  const supabase = useSupabase();
  const [data, setData] = useState<PaymentHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const { data: payments } = await supabase
          .from("payments")
          .select("id, amount, status, created_at, match:match_id(title)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50);

        setData((payments ?? []) as PaymentHistory[]);
      } catch (e) {
        console.error("결제 이력 조회 실패:", e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [supabase, userId]);

  if (isLoading) return <LoadingSpinner />;
  if (data.length === 0) return <EmptyState message="결제 이력이 없습니다" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">결제 이력 ({data.length}건)</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>매칭</TableHead>
              <TableHead>금액</TableHead>
              <TableHead>일시</TableHead>
              <TableHead>상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {item.match?.[0]?.title ?? "-"}
                </TableCell>
                <TableCell>{formatNumber(item.amount)}원</TableCell>
                <TableCell>{formatDateTime(item.created_at)}</TableCell>
                <TableCell>
                  <StatusBadge status={item.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ReportHistoryTab({ userId }: { userId: string }) {
  const supabase = useSupabase();
  const [data, setData] = useState<ReportHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        // 이 유저가 신고당한 이력
        const { data: reports } = await supabase
          .from("reports")
          .select("id, target_type, reason, status, created_at")
          .eq("target_user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50);

        setData((reports ?? []) as ReportHistory[]);
      } catch (e) {
        console.error("신고 이력 조회 실패:", e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [supabase, userId]);

  if (isLoading) return <LoadingSpinner />;
  if (data.length === 0) return <EmptyState message="신고 이력이 없습니다" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">신고 접수 이력 ({data.length}건)</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>대상 유형</TableHead>
              <TableHead>사유</TableHead>
              <TableHead>일시</TableHead>
              <TableHead>상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.target_type}</TableCell>
                <TableCell className="max-w-48 truncate">{item.reason}</TableCell>
                <TableCell>{formatDateTime(item.created_at)}</TableCell>
                <TableCell>
                  <StatusBadge status={item.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function BadticketHistoryTab({ userId }: { userId: string }) {
  const supabase = useSupabase();
  const [data, setData] = useState<BadticketEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const { data: events } = await supabase
          .from("badticket_events")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(100);

        setData((events ?? []) as BadticketEvent[]);
      } catch (e) {
        console.error("배티켓 이력 조회 실패:", e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [supabase, userId]);

  if (isLoading) return <LoadingSpinner />;
  if (data.length === 0) return <EmptyState message="배티켓 이벤트가 없습니다" />;

  const reasonLabels: Record<string, string> = {
    EVAL_GREAT: "최고 평가",
    EVAL_NORMAL: "보통 평가",
    EVAL_BAD: "아쉬움 평가",
    PENALTY_UNPAID: "미결제",
    PENALTY_GIVEUP: "참가 포기",
    PENALTY_NOSHOW: "노쇼",
    PENALTY_HOST_CANCEL: "호스트 취소",
    PENALTY_HOST_NEGLECT: "호스트 방치",
    ADMIN_ADJUST: "관리자 조정",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">배티켓 이벤트 ({data.length}건)</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>변동</TableHead>
              <TableHead>사유</TableHead>
              <TableHead>메모</TableHead>
              <TableHead>일시</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <span className={`flex items-center gap-1 font-mono font-semibold ${item.delta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {item.delta >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {item.delta >= 0 ? "+" : ""}
                    {item.delta}
                  </span>
                </TableCell>
                <TableCell>{reasonLabels[item.reason] ?? item.reason}</TableCell>
                <TableCell className="max-w-32 truncate text-muted-foreground">
                  {item.admin_note ?? "-"}
                </TableCell>
                <TableCell>{formatDateTime(item.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
