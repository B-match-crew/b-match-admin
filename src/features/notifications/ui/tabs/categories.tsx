"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/src/shared/ui/kit/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/shared/ui/kit/table";
import { Badge } from "@/src/shared/ui/kit/badge";
import { Button } from "@/src/shared/ui/kit/button";
import { Input } from "@/src/shared/ui/kit/input";
import { Label } from "@/src/shared/ui/kit/label";
import { Switch } from "@/src/shared/ui/kit/switch";
import { Textarea } from "@/src/shared/ui/kit/textarea";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { QueryError } from "@/src/shared/ui/query-error";
import { InfoField, InfoGrid } from "@/src/shared/ui/info-field";
import { WarningBox } from "@/src/shared/ui/warning-box";
import { unwrap } from "@/src/shared/lib/unwrap";
import { fetchNotificationCategories, updateNotificationCategory } from "../../api/actions";
import type { NotificationCategory } from "../../model/actions";
import { SkeletonRows } from "../primitives";

export function CategoriesTab() {
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

export function CategoryEditDialog({
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
