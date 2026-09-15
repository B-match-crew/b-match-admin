"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { ko } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Button } from "@/src/shared/ui/kit/button";
import { Calendar } from "@/src/shared/ui/kit/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/shared/ui/kit/popover";
import { SegmentedTab } from "@/src/shared/ui/bds/segmented-tab";
import {
  PRESETS,
  formatDay,
  fromDateString,
  rangeDays,
  toDateString,
  type DateRangeKst,
  type PeriodPreset,
} from "../model/period";

/**
 * 기간 선택 — 자주 쓰는 네 가지는 탭으로, 캠페인 기간은 달력으로.
 *
 * 달력으로 고르면 탭 선택이 풀린다(어느 탭도 켜지지 않는다). "지난 달" 이 켜진 채
 * 다른 기간을 보고 있으면, 광고주에게 엉뚱한 달을 보냈다고 착각하기 쉽다.
 */
export function PeriodPicker({
  preset,
  range,
  error,
  onPresetChange,
  onCustomApply,
}: {
  preset: PeriodPreset;
  range: DateRangeKst;
  error: string | null;
  onPresetChange: (preset: Exclude<PeriodPreset, "custom">) => void;
  onCustomApply: (range: DateRangeKst) => void;
}) {
  const [open, setOpen] = useState(false);
  // 달력에서 고르는 중인 값. [적용] 전에는 조회하지 않는다 — 시작일만 찍은
  // 순간에 하루짜리 조회가 나가면 안 된다.
  const [draft, setDraft] = useState<DateRange | undefined>();

  const onOpenChange = (next: boolean) => {
    if (next) {
      setDraft({ from: fromDateString(range.from), to: fromDateString(range.to) });
    }
    setOpen(next);
  };

  const apply = () => {
    if (!draft?.from || !draft?.to) return;
    onCustomApply({ from: toDateString(draft.from), to: toDateString(draft.to) });
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-80">
          <SegmentedTab<PeriodPreset>
            items={PRESETS}
            value={preset}
            onValueChange={(v) => {
              if (v !== "custom") onPresetChange(v);
            }}
            size="sm"
          />
        </div>
        <Popover open={open} onOpenChange={onOpenChange}>
          <PopoverTrigger render={<Button variant="outline" size="sm" />}>
            <CalendarDays />
            {formatDay(range.from)} ~ {formatDay(range.to)}
            <span className="text-bds-label-assistive">
              · {rangeDays(range)}일
            </span>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto">
            <Calendar
              mode="range"
              locale={ko}
              numberOfMonths={2}
              defaultMonth={draft?.from}
              selected={draft}
              onSelect={setDraft}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                취소
              </Button>
              <Button size="sm" disabled={!draft?.from || !draft?.to} onClick={apply}>
                적용
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {error && (
        <p className="text-bds-caption1 text-bds-status-error">{error}</p>
      )}
    </div>
  );
}
