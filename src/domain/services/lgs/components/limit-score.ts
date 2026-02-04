// src/domain/services/lgs/components/limit-score.ts
import type { LGSContext, LGSScoreComponent } from '../types'
import { normalizeLog } from '../../lcs/utils'

/**
 * Measures operational capacity via context window and output limit.
 * Log-scaled to avoid extreme bias toward very large models.
 * Score = contextScore * 0.6 + outputScore * 0.4
 */
export class LimitScore implements LGSScoreComponent {
  readonly id = 'limit'
  readonly weight = 0.20

  calculate(ctx: LGSContext): number {
    const { contextLimit, outputLimit } = ctx.model

    const contextScore = normalizeLog(contextLimit, { max: 2_000_000 })
    const outputScore = normalizeLog(outputLimit, { max: 200_000 })

    return contextScore * 0.6 + outputScore * 0.4
  }
}
