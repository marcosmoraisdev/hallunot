// src/domain/services/lcs/aggregator.ts
import type { ScoreComponent } from './types'
import { clamp } from './utils'

export interface AggregatorResult {
  score: number
  breakdown: ComponentBreakdown[]
}

export interface ComponentBreakdown {
  id: string
  rawValue: number
  weight: number
  contribution: number
}

/**
 * Aggregates multiple score components into a final weighted score.
 * Validates that weights sum to ~1.0 and all values are in [0,1].
 */
export class WeightedScoreAggregator<TContext> {
  constructor(private readonly components: ScoreComponent<TContext>[]) {
    this.validateWeights()
  }

  private validateWeights(): void {
    const totalWeight = this.components.reduce((sum, c) => sum + c.weight, 0)
    if (Math.abs(totalWeight - 1.0) > 0.001) {
      throw new Error(
        `Component weights must sum to 1.0, got ${totalWeight.toFixed(3)}`
      )
    }
  }

  calculate(context: TContext): AggregatorResult {
    const breakdown: ComponentBreakdown[] = []
    let score = 0

    for (const component of this.components) {
      const rawValue = clamp(component.calculate(context), 0, 1)
      const contribution = rawValue * component.weight

      breakdown.push({
        id: component.id,
        rawValue,
        weight: component.weight,
        contribution,
      })

      score += contribution
    }

    return {
      score: clamp(score, 0, 1),
      breakdown,
    }
  }

  /**
   * Returns component IDs and weights for introspection.
   */
  getComponentInfo(): Array<{ id: string; weight: number }> {
    return this.components.map((c) => ({ id: c.id, weight: c.weight }))
  }
}
