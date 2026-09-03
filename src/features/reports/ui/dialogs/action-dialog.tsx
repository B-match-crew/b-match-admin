"use client";

import type { ReportListItem } from "../../model/actions";
import { ReasonDialog } from "./reason-dialog";
import { ActionMode } from "./schemas";
import { SuspendDialog } from "./suspend-dialog";

export function ActionDialog({
  report,
  action,
  onClose,
  onDone,
}: {
  report: ReportListItem;
  action: ActionMode;
  onClose: () => void;
  onDone: () => void;
}) {
  if (!action) return null;
  if (action.kind === "suspend") {
    return (
      <SuspendDialog report={report} onClose={onClose} onDone={onDone} />
    );
  }
  return <ReasonDialog kind={action.kind} report={report} onClose={onClose} onDone={onDone} />;
}
