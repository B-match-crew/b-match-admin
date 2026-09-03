"use client";

import type { ChatReportListItem } from "../../model/actions";
import { BanDialog } from "./ban-dialog";
import { CloseRoomDialog } from "./close-room-dialog";
import { ActionMode } from "./schemas";
import { SuspendDialog } from "./suspend-dialog";

export function ActionDialog({
  report,
  action,
  onClose,
  onDone,
}: {
  report: ChatReportListItem;
  action: NonNullable<ActionMode>;
  onClose: () => void;
  onDone: () => void;
}) {
  if (action.kind === "suspend") {
    return <SuspendDialog report={report} onClose={onClose} onDone={onDone} />;
  }
  if (action.kind === "closeRoom") {
    return <CloseRoomDialog report={report} onClose={onClose} onDone={onDone} />;
  }
  return <BanDialog report={report} onClose={onClose} onDone={onDone} />;
}
