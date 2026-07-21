"use client"

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"

import { cn } from "@/lib/utils"
import { CheckIcon } from "lucide-react"

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        // BdsCheckbox — radius 4 / border 1.5 / unchecked border gray300 /
        // checked 는 primary500 채움 + 흰 체크. size 는 BDS small(20) 기준으로,
        // 테이블 행 안에 들어가는 관리자 밀도에 맞춰 20px 을 쓴다.
        "peer relative flex size-5 shrink-0 items-center justify-center rounded-[4px] border-[1.5px] border-bds-gray-300 transition-colors outline-none group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:border-bds-interaction-disable disabled:bg-bds-interaction-disable disabled:text-bds-label-disable aria-invalid:border-bds-status-error aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-checked:border-bds-primary-500 data-checked:bg-bds-primary-500 data-checked:text-white",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        <CheckIcon
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
