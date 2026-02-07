// src/components/score-breakdown/types.ts
import type { ReactNode } from "react"

/**
 * A single score component with all data needed for display.
 * This is the data contract between the score system and any visualization.
 */
export interface ScoreComponentData {
  id: string
  label: string
  value: number        // 0-1 raw score
  weight: number       // 0-1 weight in the formula
  contribution: number // value × weight
  description: string  // human-readable explanation
  tooltip?: ReactNode  // optional rich tooltip content next to label
}

/**
 * Props for any visualization component.
 * Implementing this interface allows swapping visualization strategies.
 */
export interface ScoreVisualizationProps {
  components: ScoreComponentData[]
}

/**
 * Render function type for pluggable visualization.
 */
export type ScoreVisualizationRenderer = (props: ScoreVisualizationProps) => ReactNode
