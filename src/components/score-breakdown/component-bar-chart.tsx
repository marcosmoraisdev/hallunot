// src/components/score-breakdown/component-bar-chart.tsx
"use client"

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
    <div className="space-y-3">
      {components.map((component) => (
        <div key={component.id} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-card-foreground">
              {component.label}
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
  )
}
