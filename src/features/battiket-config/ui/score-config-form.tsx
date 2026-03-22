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
import { LoadingSpinner } from "@/src/shared/ui/loading-spinner";
import { Save } from "lucide-react";
import toast from "react-hot-toast";

interface ConfigField {
  key: string;
  label: string;
}

const EVAL_FIELDS: ConfigField[] = [
  { key: "batticket.eval_great", label: "최고 평가" },
  { key: "batticket.eval_normal", label: "보통 평가" },
  { key: "batticket.eval_bad", label: "아쉬움 평가" },
];

const PENALTY_FIELDS: ConfigField[] = [
  { key: "batticket.penalty_unpaid", label: "미입금 패널티" },
  { key: "batticket.penalty_giveup", label: "포기 패널티" },
  { key: "batticket.penalty_noshow", label: "노쇼 패널티" },
  { key: "batticket.penalty_host_cancel", label: "호스트 취소 패널티" },
  { key: "batticket.penalty_host_neglect", label: "호스트 방치 패널티" },
];

export function ScoreConfigForm() {
  const supabase = useSupabase();
  const { config, isLoading, isSaving, setConfig, setIsLoading, setIsSaving } =
    useBattiketStore();

  const [formValues, setFormValues] = useState<Record<string, string>>({});

  useEffect(() => {
    setIsLoading(true);
    fetchBattiketConfig(supabase)
      .then((data) => {
        setConfig(data);
        setFormValues({ ...data });
      })
      .finally(() => setIsLoading(false));
  }, [supabase, setConfig, setIsLoading]);

  function handleValueChange(key: string, value: string) {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const changedKeys = Object.keys(formValues).filter(
        (key) => formValues[key] !== config[key]
      );

      for (const key of changedKeys) {
        await updateBattiketConfig(supabase, key, formValues[key]);
      }

      setConfig(formValues);
      toast.success("배티켓 설정이 저장되었습니다");
    } catch {
      toast.error("저장에 실패했습니다");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <ConfigSection
        title="평가 점수"
        description="매칭 후 상호평가 시 적용되는 배티켓 점수 변동값"
        fields={EVAL_FIELDS}
        values={formValues}
        onValueChange={handleValueChange}
      />

      <ConfigSection
        title="패널티"
        description="규정 위반 시 적용되는 감점 값"
        fields={PENALTY_FIELDS}
        values={formValues}
        onValueChange={handleValueChange}
      />

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "저장 중..." : "설정 저장"}
        </Button>
      </div>
    </div>
  );
}

function ConfigSection({
  title,
  description,
  fields,
  values,
  onValueChange,
}: {
  title: string;
  description: string;
  fields: ConfigField[];
  values: Record<string, string>;
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
                <label className="min-w-[140px] text-sm font-medium text-foreground">
                  {field.label}
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={values[field.key] ?? "0"}
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
