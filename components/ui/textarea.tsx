import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // BdsTextArea — BdsTextFieldContainer 와 동일한 컨테이너 사양
        // (radius 12 / padding 12 / border 우선순위). Input 과 톤을 맞춘다.
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-bds-border-neutral bg-white px-3 py-3 text-bds-body1 transition-colors outline-none placeholder:text-bds-label-assistive not-placeholder-shown:border-bds-gray-800 focus-visible:border-bds-gray-800 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:border-bds-interaction-disable disabled:bg-bds-back-alternative disabled:text-bds-label-disable aria-invalid:border-bds-status-error aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
