"use client";

import { formatDateTime } from "@/src/shared/lib/format-date";
import { EmptyState } from "@/src/shared/ui/empty-state";
import type { ChatSnapshotMessage } from "@/src/features/chat-reports/actions";

/**
 * 신고 시점 대화 증적 렌더.
 *
 * **신고자를 오른쪽에 두지 않는다.** 앱에서는 "내 말이 오른쪽"이지만 여기서
 * 판단해야 하는 것은 *피신고자가 무슨 말을 했나* 다. 좌우로 나누면 운영자가
 * 매번 "어느 쪽이 신고당한 사람이지" 를 다시 확인해야 하므로, 한 줄씩
 * 세로로 쌓고 **피신고자 줄만 강조**한다.
 *
 * `sender_id === null` 은 시스템 메시지(일정 안내)다 — 사람이 한 말이 아니므로
 * 회색으로 눌러 판단 대상에서 빠지게 한다.
 */
export function ChatTranscript({
  messages,
  targetId,
  reporterId,
}: {
  messages: ChatSnapshotMessage[];
  targetId: number;
  reporterId: number;
}) {
  if (messages.length === 0) {
    return (
      <EmptyState message="보존된 대화가 없습니다. (신고 당시 스냅샷이 비어 있음)" />
    );
  }

  return (
    <div className="max-h-[420px] space-y-1.5 overflow-y-auto rounded-lg border bg-muted/30 p-3">
      {messages.map((m, i) => {
        const isSystem = m.sender_id === null;
        const isTarget = m.sender_id === targetId;
        const isReporter = m.sender_id === reporterId;

        if (isSystem) {
          return (
            <p
              key={`${m.id}-${i}`}
              className="py-1 text-center text-xs text-muted-foreground"
            >
              {m.body}
            </p>
          );
        }

        return (
          <div
            key={`${m.id}-${i}`}
            className={
              isTarget
                ? "rounded-md border border-bds-status-warning/40 bg-bds-status-warning-subtle p-2"
                : "rounded-md p-2"
            }
          >
            <div className="flex items-baseline gap-2">
              <span
                className={
                  isTarget
                    ? "text-xs font-semibold text-bds-status-warning-text"
                    : "text-xs font-medium text-muted-foreground"
                }
              >
                {isTarget
                  ? "피신고자"
                  : isReporter
                    ? "신고자"
                    : `#${m.sender_id}`}
              </span>
              {m.created_at && (
                <span className="text-[11px] text-muted-foreground">
                  {formatDateTime(m.created_at)}
                </span>
              )}
            </div>
            <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
          </div>
        );
      })}
    </div>
  );
}
