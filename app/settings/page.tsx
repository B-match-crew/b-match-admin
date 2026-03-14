"use client";

import { PageHeader } from "@/src/shared/ui/page-header";
import { ScoreConfigForm } from "@/src/features/battiket-config/ui/score-config-form";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="배티켓 설정"
        description="배티켓 점수 산정 기준을 관리합니다"
      />
      <ScoreConfigForm />
    </div>
  );
}
