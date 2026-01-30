"use client"

import { useState, useRef, useEffect } from "react"
import * as Popover from "@radix-ui/react-popover"
import * as ScrollArea from "@radix-ui/react-scroll-area"
import { ChevronDown, Check, Search } from "lucide-react"
import { cn } from "@/lib/cn"

export interface FilterableSelectOption {
  value: string
  label: string
  sublabel?: string
}

interface FilterableSelectProps {
  options: FilterableSelectOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  loading?: boolean
  disabled?: boolean
  icon?: React.ReactNode
  "aria-label"?: string
}

export function FilterableSelect({
  options,
  value,
  onValueChange,
  placeholder,
  loading = false,
  disabled = false,
  icon,
  "aria-label": ariaLabel,
}: FilterableSelectProps) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(filter.toLowerCase()) ||
      (opt.sublabel?.toLowerCase().includes(filter.toLowerCase()) ?? false)
  )

  const selectedOption = options.find((o) => o.value === value)

  useEffect(() => {
    if (open) {
      setFilter("")
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className={cn(
          "flex items-center gap-2 rounded-xl border border-border/50 bg-card px-4 py-3",
          "text-sm text-foreground outline-none",
          "hover:bg-muted/50 transition-colors",
          "focus:ring-2 focus:ring-primary/20 focus:border-primary/50",
          disabled && "cursor-not-allowed opacity-50",
          !value && "text-muted-foreground"
        )}
        disabled={disabled || loading}
        aria-label={ariaLabel}
      >
        {icon}
        <span className="flex-1 text-left truncate">
          {loading ? "Loading..." : selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className={cn(
            "z-50 w-72 rounded-xl border border-border/50 bg-card shadow-lg",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          )}
          sideOffset={8}
          align="start"
        >
          <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>

          <ScrollArea.Root className="h-auto max-h-64">
            <ScrollArea.Viewport className="p-1">
              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No results found
                </div>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onValueChange(opt.value)
                      setOpen(false)
                    }}
                    className={cn(
                      "relative flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm outline-none",
                      "text-foreground transition-colors",
                      "hover:bg-muted",
                      value === opt.value && "bg-muted/50"
                    )}
                  >
                    <div className="w-5 flex justify-center">
                      {value === opt.value && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex flex-1 items-center justify-between gap-2">
                      <span className={cn(value === opt.value && "text-primary font-medium")}>
                        {opt.label}
                      </span>
                      {opt.sublabel && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          {opt.sublabel}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
              className="flex w-2.5 touch-none select-none p-0.5 transition-colors"
              orientation="vertical"
            >
              <ScrollArea.Thumb className="relative flex-1 rounded-full bg-border" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
