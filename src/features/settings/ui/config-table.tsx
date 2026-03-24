"use client";

import { useEffect, useCallback } from "react";
import { useSettingsStore } from "../model/settings-store";
import { CONFIG_LABELS } from "../api/settings-api";
import { adminFetchAppConfigs } from "@/src/app/actions/admin-read-actions";
import { adminUpdateAppConfig } from "@/src/app/actions/admin-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/src/shared/ui/loading-spinner";
import { EmptyState } from "@/src/shared/ui/empty-state";
import { formatDateTime } from "@/src/shared/lib/format-date";
import { Pencil, Check, X } from "lucide-react";
import toast from "react-hot-toast";

export function ConfigTable() {
  const {
    configs,
    isLoading,
    editingKey,
    editingValue,
    setConfigs,
    setLoading,
    startEditing,
    setEditingValue,
    cancelEditing,
  } = useSettingsStore();

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetchAppConfigs();
      setConfigs(data);
    } catch (error) {
      console.error("설정 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  }, [setConfigs, setLoading]);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const handleSave = async () => {
    if (!editingKey) return;

    try {
      await adminUpdateAppConfig(editingKey, editingValue);
      toast.success("설정이 변경되었습니다");
      cancelEditing();
      loadConfigs();
    } catch (error) {
      console.error("설정 변경 실패:", error);
      toast.error("설정 변경에 실패했습니다");
    }
  };

  if (isLoading) return <LoadingSpinner />;

  if (configs.length === 0) {
    return (
      <EmptyState
        title="설정이 없습니다"
        description="app_config 테이블에 데이터가 없습니다"
      />
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>키</TableHead>
            <TableHead>설명</TableHead>
            <TableHead>값</TableHead>
            <TableHead>최종 수정</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {configs.map((config) => {
            const label = CONFIG_LABELS[config.key];
            const isEditing = editingKey === config.key;

            return (
              <TableRow key={config.key}>
                <TableCell className="font-mono text-sm">
                  {config.key}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {label?.label ?? config.description ?? "-"}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      className="h-8 w-40"
                      type={label?.type === "number" ? "number" : "text"}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSave();
                        if (e.key === "Escape") cancelEditing();
                      }}
                      autoFocus
                    />
                  ) : (
                    <span className="font-mono font-medium">
                      {config.value}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateTime(config.updated_at)}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSave}
                      >
                        <Check className="h-4 w-4 text-emerald-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelEditing}
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        startEditing(config.key, config.value)
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
