"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/src/app/providers/supabase-provider";
import {
  fetchBattiketConfig,
  updateBattiketConfig,
} from "../api/battiket-config-api";
import { useBattiketStore } from "../model/battiket-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/src/shared/ui/confirm-dialog";
import { LoadingSpinner } from "@/src/shared/ui/loading-spinner";
import { Save } from "lucide-react";
import toast from "react-hot-toast";
import type { BattiketConfig } from "@/src/entities/battiket/types";

interface ScoreField {
  key: keyof BattiketConfig;
  label: string;
  defaultValue: number;
}

const GUEST_TO_HOST_FIELDS: ScoreField[] = [
  { key: "guest_to_host_best", label: "최고", defaultValue: 0.02 },
  { key: "guest_to_host_normal", label: "보통", defaultValue: 0.01 },
  { key: "guest_to_host_bad", label: "아쉬움", defaultValue: -0.05 },
];

const HOST_TO_GUEST_FIELDS: ScoreField[] = [
  { key: "host_to_guest_best", label: "최고", defaultValue: 0.1 },
  { key: "host_to_guest_normal", label: "보통", defaultValue: 0.01 },
  { key: "host_to_guest_bad", label: "아쉬움", defaultValue: -0.1 },
];

const PENALTY_FIELDS: ScoreField[] = [
  { key: "no_payment_penalty", label: "미입금", defaultValue: -0.2 },
  { key: "no_show_penalty", label: "노쇼", defaultValue: -0.5 },
  { key: "host_cancel_penalty", label: "호스트 취소", defaultValue: -0.1 },
  { key: "host_abandon_penalty", label: "호스트 포기", defaultValue: -0.1 },
];

export function ScoreConfigForm() {
  const supabase = useSupabase();
  const {
    config,
    isLoading,
    isSaving,
    showConfirmDialog,
    setConfig,
    setIsLoading,
    setIsSaving,
    setShowConfirmDialog,
  } = useBattiketStore();

  const [formValues, setFormValues] = useState<Record<string, number>>({});

  useEffect(() => {
    setIsLoading(true);
    fetchBattiketConfig(supabase)
      .then((data) => {
        setConfig(data);
        if (data) {
          const values: Record<string, number> = {};
          [...GUEST_TO_HOST_FIELDS, ...HOST_TO_GUEST_FIELDS, ...PENALTY_FIELDS].forEach(
            (field) => {
              values[field.key] = data[field.key] as number;
            }
          );
          setFormValues(values);
        } else {
          const defaults: Record<string, number> = {};
          [...GUEST_TO_HOST_FIELDS, ...HOST_TO_GUEST_FIELDS, ...PENALTY_FIELDS].forEach(
            (field) => {
              defaults[field.key] = field.defaultValue;
            }
          );
          setFormValues(defaults);
        }
      })
      .finally(() => setIsLoading(false));
  }, [supabase, setConfig, setIsLoading]);

  function handleValueChange(key: string, value: string) {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      setFormValues((prev) => ({ ...prev, [key]: num }));
    }
  }

  async function handleSave() {
    if (!config) return;

    setIsSaving(true);
    setShowConfirmDialog(false);

    try {
      const updated = await updateBattiketConfig(supabase, {
        id: config.id,
        ...formValues,
      } as Partial<BattiketConfig> & { id: string });
      setConfig(updated);
      toast.success("배티켓 설정이 저장되었습니다");
    } catch {
      toast.error("저장에 실패했습니다");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <LoadingSpinner />;

  return (
    <>
      <div className="space-y-6">
        <ScoreSection
          title="게스트 -> 호스트 평가 점수"
          description="게스트가 호스트를 평가할 때 적용되는 배티켓 점수 변동값"
          fields={GUEST_TO_HOST_FIELDS}
          values={formValues}
          onValueChange={handleValueChange}
        />

        <ScoreSection
          title="호스트 -> 게스트 평가 점수"
          description="호스트가 게스트를 평가할 때 적용되는 배티켓 점수 변동값"
          fields={HOST_TO_GUEST_FIELDS}
          values={formValues}
          onValueChange={handleValueChange}
        />

        <ScoreSection
          title="패널티"
          description="규정 위반 시 적용되는 감점 값"
          fields={PENALTY_FIELDS}
          values={formValues}
          onValueChange={handleValueChange}
        />

        <div className="flex justify-end">
          <Button
            onClick={() => setShowConfirmDialog(true)}
            disabled={isSaving}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "저장 중..." : "설정 저장"}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title="배티켓 설정 저장"
        description="변경된 배티켓 점수 설정을 저장하시겠습니까? 저장 즉시 반영됩니다."
        confirmLabel="저장"
        onConfirm={handleSave}
        isLoading={isSaving}
      />
    </>
  );
}

function ScoreSection({
  title,
  description,
  fields,
  values,
  onValueChange,
}: {
  title: string;
  description: string;
  fields: ScoreField[];
  values: Record<string, number>;
  onValueChange: (key: string, value: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.key}>
              <div className="flex items-center justify-between gap-4">
                <label className="min-w-[100px] text-sm font-medium text-foreground">
                  {field.label}
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={values[field.key] ?? field.defaultValue}
                    onChange={(e) => onValueChange(field.key, e.target.value)}
                    className="w-[120px] text-right"
                  />
                  <span className="text-sm text-muted-foreground">점</span>
                </div>
              </div>
              {index < fields.length - 1 && <Separator className="mt-3" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
