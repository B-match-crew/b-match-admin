import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        // BdsTextFieldContainer (bds_text_field.dart) 이식.
        //   radius 12 / border 1 / bg white / body1 타이포 / placeholder
        //   labelAssistive — 여기까지는 원본과 동일.
        //
        //   높이만 원본(min-height 50)이 아닌 40px 을 쓴다. 50 은 모바일 터치
        //   타깃 기준이라 관리자 필터 바처럼 밀도 높은 데스크톱 UI 에선 과하고,
        //   버튼 기본 높이(BDS medium = 40)와 맞아야 한 줄에 나란히 놓인다.
        //
        //   border 색 우선순위도 원본을 따른다:
        //     disabled → interactionDisable
        //     invalid  → statusError
        //     focus 또는 값 있음 → secondaryMain
        //     기본     → borderNeutral
        "h-10 w-full min-w-0 rounded-lg border border-bds-border-neutral bg-white px-3 py-2 text-bds-body1 transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-bds-body2 file:text-foreground placeholder:text-bds-label-assistive not-placeholder-shown:border-bds-gray-800 focus-visible:border-bds-gray-800 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-bds-interaction-disable disabled:bg-bds-back-alternative disabled:text-bds-label-disable aria-invalid:border-bds-status-error aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
