"use client"

import { useState } from "react"
import { ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { getMultiFilterLabel, type MultiFilterValue } from "@/lib/multi-filter-utils"

/** ~7 ítems visibles antes de activar scroll */
const LIST_MAX_HEIGHT = "16rem"

export type MultiSelectOption = { value: string; label: string }

interface MultiSelectFilterProps {
  options: MultiSelectOption[]
  value: MultiFilterValue
  onChange: (value: MultiFilterValue) => void
  emptyLabel?: string
  className?: string
  disabled?: boolean
}

export function MultiSelectFilter({
  options,
  value,
  onChange,
  emptyLabel = "Todos",
  className,
  disabled = false,
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false)

  const toggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  const displayLabel = getMultiFilterLabel(value, options, emptyLabel)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn("h-9 w-full justify-between font-normal", className)}
        >
          <span className="truncate text-left">{displayLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[12rem] overflow-hidden p-2"
        align="start"
      >
        <div className="mb-1 flex shrink-0 items-center justify-between px-2 py-1">
          <span className="text-xs text-muted-foreground">Seleccionar uno o más</span>
          {value.length > 0 && (
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => onChange([])}
            >
              Limpiar
            </button>
          )}
        </div>
        <div
          className="overflow-y-auto overscroll-contain rounded-sm border border-border/60 pr-1"
          style={{ maxHeight: LIST_MAX_HEIGHT }}
        >
          <div className="space-y-0.5 p-0.5">
            {options.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-start gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
              >
                <Checkbox
                  className="mt-0.5 shrink-0"
                  checked={value.includes(opt.value)}
                  onCheckedChange={() => toggle(opt.value)}
                />
                <span className="min-w-0 flex-1 leading-snug break-words">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
