"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import { fetchUserById } from "../api/user-api";
import type { User } from "@/src/entities/user/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/src/shared/ui/status-badge";
import { LoadingSpinner } from "@/src/shared/ui/loading-spinner";
import { formatDateTime } from "@/src/shared/lib/format-date";
import { cn } from "@/lib/utils";
import {
  User as UserIcon,
  Phone,
  Calendar,
  Award,
  Shield,
  Pencil,
  Ban,
} from "lucide-react";

interface UserDetailPanelProps {
  userId: string;
  onScoreAdjust: (user: User) => void;
  onSuspend: (user: User) => void;
  onUnsuspend?: () => void;
}

export function UserDetailPanel({
  userId,
  onScoreAdjust,
  onSuspend,
  onUnsuspend,
}: UserDetailPanelProps) {
  const supabase = useSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      setIsLoading(true);
      try {
        const data = await fetchUserById(supabase, userId);
        setUser(data);
      } catch (error) {
        console.error("유저 상세 조회 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, [supabase, userId]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return (
      <div className="text-center text-muted-foreground py-8">
        유저를 찾을 수 없습니다
      </div>
    );
  }

  const scorePercent = Math.min(Math.max(user.badticket_score, 0), 100);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>프로필 정보</span>
            <StatusBadge status={user.status} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <UserIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{user.nickname ?? "-"}</h3>
              <p className="text-sm text-muted-foreground">{user.real_name ?? "-"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <DetailItem label="성별" value={user.gender ?? "-"} />
            <DetailItem label="출생년도" value={user.birth_year?.toString() ?? "-"} />
            <DetailItem label="급수" value={user.level} />
            <DetailItem
              label="권한"
              value={user.is_host ? "호스트" : "일반"}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            배티켓 점수
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold">{user.badticket_score}</span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </div>
          <div className="h-3 w-full rounded-full bg-muted">
            <div
              className={cn("h-3 rounded-full transition-all", getScoreColor(user.badticket_score))}
              style={{ width: `${scorePercent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>상세 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <DetailItem
            label="전화번호"
            value={user.phone ?? "-"}
            icon={<Phone className="h-4 w-4" />}
          />
          <DetailItem
            label="가입 방법"
            value={user.social_provider}
            icon={<Shield className="h-4 w-4" />}
          />
          <DetailItem
            label="가입일"
            value={user.created_at ? formatDateTime(user.created_at) : "-"}
            icon={<Calendar className="h-4 w-4" />}
          />
          <DetailItem
            label="수정일"
            value={user.updated_at ? formatDateTime(user.updated_at) : "-"}
            icon={<Calendar className="h-4 w-4" />}
          />
        </CardContent>
      </Card>

      {/* 호스트 프로필 */}
      {user.host_profiles && (
        <Card>
          <CardHeader>
            <CardTitle>호스트 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <DetailItem label="클럽명" value={user.host_profiles.club_name} />
            <DetailItem
              label="성별비율"
              value={`남 ${user.host_profiles.male_ratio}% / 여 ${user.host_profiles.female_ratio}%`}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => onScoreAdjust(user)}
        >
          <Pencil className="h-4 w-4" />
          점수 조정
        </Button>
        {user.status === "SUSPENDED" && onUnsuspend ? (
          <Button
            variant="outline"
            className="flex-1 border-emerald-500 text-emerald-600 hover:bg-emerald-50"
            onClick={onUnsuspend}
          >
            <Shield className="h-4 w-4" />
            정지 해제
          </Button>
        ) : (
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => onSuspend(user)}
            disabled={user.status !== "ACTIVE"}
          >
            <Ban className="h-4 w-4" />
            강제 정지
          </Button>
        )}
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
