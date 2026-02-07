// src/components/score-breakdown/component-score-list.tsx
"use client"

import { ComponentBarChart } from "./component-bar-chart"
import type { ScoreComponentData, ScoreVisualizationRenderer } from "./types"

interface ComponentScoreListProps {
  title: string
  components: ScoreComponentData[]
  totalScore: number
  renderVisualization?: ScoreVisualizationRenderer
}

export function ComponentScoreList({
  title,
  components,
  totalScore,
  renderVisualization,
}: ComponentScoreListProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-card-foreground">
          {title}
        </h4>
        <span className="text-xs tabular-nums font-medium text-muted-foreground">
          Score: {Math.round(totalScore * 100)}%
        </span>
      </div>
      {renderVisualization
        ? renderVisualization({ components })
        : <ComponentBarChart components={components} />}
    </div>
  )
}
