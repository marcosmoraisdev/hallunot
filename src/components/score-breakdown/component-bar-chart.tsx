// src/components/score-breakdown/component-bar-chart.tsx
"use client"

import * as Tooltip from "@radix-ui/react-tooltip"
import { Info } from "lucide-react"
import { cn } from "@/lib/cn"
import type { ScoreVisualizationProps } from "./types"

function getBarColor(value: number): string {
  if (value >= 0.7) return "bg-risk-low"
  if (value >= 0.4) return "bg-risk-medium"
  return "bg-risk-high"
}

function getBarBgColor(value: number): string {
  if (value >= 0.7) return "bg-risk-low-bg"
  if (value >= 0.4) return "bg-risk-medium-bg"
  return "bg-risk-high-bg"
}

export function ComponentBarChart({ components }: ScoreVisualizationProps) {
  return (
    <Tooltip.Provider delayDuration={200}>
      <div className="space-y-3">
        {components.map((component) => (
          <div key={component.id} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 font-medium text-card-foreground">
                {component.label}
                {component.tooltip && (
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button type="button" className="inline-flex text-muted-foreground hover:text-card-foreground transition-colors cursor-pointer">
                        <Info className="h-3 w-3" />
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        side="top"
                        align="start"
                        sideOffset={6}
                        className={cn(
                          "z-[100] rounded-lg border border-border bg-card px-3 py-2 shadow-lg",
                          "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
                        )}
                      >
                        {component.tooltip}
                        <Tooltip.Arrow className="fill-border" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                )}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {Math.round(component.value * 100)}%
                <span className="ml-1 text-[10px] opacity-60">
                  (w: {Math.round(component.weight * 100)}%)
                </span>
              </span>
            </div>

            {/* Bar */}
            <div
              className={cn(
                "h-2 w-full rounded-full overflow-hidden",
                getBarBgColor(component.value)
              )}
            >
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  getBarColor(component.value)
                )}
                style={{ width: `${Math.round(component.value * 100)}%` }}
              />
            </div>

            {/* Description */}
            <p className="text-[10px] text-muted-foreground leading-tight">
              {component.description}
            </p>
          </div>
        ))}
      </div>
    </Tooltip.Provider>
  )
}
