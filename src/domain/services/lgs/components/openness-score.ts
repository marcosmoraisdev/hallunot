// src/domain/services/lgs/components/openness-score.ts
import type { LGSContext, LGSScoreComponent } from '../types'

/**
 * Measures transparency and ecosystem friendliness.
 * Open weights contribute 0.7, API compatibility contributes 0.3.
 */
export class OpennessScore implements LGSScoreComponent {
  readonly id = 'openness'
  readonly weight = 0.15

  calculate(ctx: LGSContext): number {
    const { openWeights, apiCompatibility } = ctx.model
    let score = 0

    if (openWeights) {
      score += 0.7
    }

    if (apiCompatibility.includes('openai-compatible')) {
      score += 0.3
    }

    return score
  }
}
