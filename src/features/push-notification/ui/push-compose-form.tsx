"use client";

import { useState } from "react";
import { adminSendPush } from "@/src/app/actions/admin-actions";
import { usePushStore } from "../model/push-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Send, TestTube } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import toast from "react-hot-toast";

export function PushComposeForm() {
  const { isSending, setIsSending, addNotification } = usePushStore();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<"all" | "hosts" | "custom">("all");
  const [customIds, setCustomIds] = useState("");
  const [useSchedule, setUseSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined);
  const [scheduleTime, setScheduleTime] = useState("09:00");

  const isValid = title.trim() !== "" && body.trim() !== "";

  async function handleSend(isTest: boolean) {
    if (!isValid) {
      toast.error("제목과 내용을 입력해주세요");
      return;
    }

    setIsSending(true);

    try {
      let scheduledAt: string | null = null;
      if (useSchedule && scheduleDate) {
        const [hours, minutes] = scheduleTime.split(":").map(Number);
        const scheduled = new Date(scheduleDate);
        scheduled.setHours(hours, minutes, 0, 0);
        scheduledAt = scheduled.toISOString();
      }

      const targetIds =
        target === "custom"
          ? customIds
              .split(",")
              .map((id) => id.trim())
              .filter(Boolean)
          : undefined;

      const notification = await adminSendPush({
        title: isTest ? `[테스트] ${title}` : title,
        body,
        target,
        targetIds,
        scheduledAt,
      });

      addNotification(notification);
      toast.success(isTest ? "테스트 발송 완료" : "알림 발송 완료");

      setTitle("");
      setBody("");
      setTarget("all");
      setCustomIds("");
      setUseSchedule(false);
      setScheduleDate(undefined);
      setScheduleTime("09:00");
    } catch {
      toast.error("알림 발송에 실패했습니다");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">알림 작성</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">제목</label>
          <Input
            placeholder="알림 제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">내용</label>
          <Textarea
            placeholder="알림 내용을 입력하세요"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            발송 대상
          </label>
          <Select
            value={target}
            onValueChange={(val) =>
              setTarget(val as "all" | "hosts" | "custom")
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="hosts">호스트만</SelectItem>
              <SelectItem value="custom">커스텀</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {target === "custom" && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              대상 유저 ID (쉼표로 구분)
            </label>
            <Textarea
              placeholder="user_id_1, user_id_2, ..."
              rows={2}
              value={customIds}
              onChange={(e) => setCustomIds(e.target.value)}
            />
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="schedule-toggle"
              checked={useSchedule}
              onChange={(e) => setUseSchedule(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <label
              htmlFor="schedule-toggle"
              className="text-sm font-medium text-foreground"
            >
              예약 발송
            </label>
          </div>

          {useSchedule && (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger
                  render={
                    <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduleDate
                        ? format(scheduleDate, "yyyy.MM.dd", { locale: ko })
                        : "날짜 선택"}
                    </Button>
                  }
                />
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={scheduleDate}
                    onSelect={setScheduleDate}
                    locale={ko}
                  />
                </PopoverContent>
              </Popover>
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-[130px]"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button onClick={() => handleSend(false)} disabled={isSending || !isValid}>
            <Send className="mr-2 h-4 w-4" />
            {isSending ? "발송 중..." : "발송하기"}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSend(true)}
            disabled={isSending || !isValid}
          >
            <TestTube className="mr-2 h-4 w-4" />
            테스트 발송
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
