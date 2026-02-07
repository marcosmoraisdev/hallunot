// src/domain/services/lgs/components/recency-score.ts
import type { LGSContext, LGSScoreComponent } from '../types'
import { normalize } from '../../lcs/utils'

const REFERENCE_START = new Date('2020-01-01')
const DEFAULT_SCORE = 0.3

/**
 * Estimates how modern and actively maintained a model is.
 * Combines knowledge cutoff (70%) with last updated date (30%).
 * Reference range: Jan 2020 to current date.
 * Missing dates default to 0.3.
 */
export class RecencyScore implements LGSScoreComponent {
  readonly id = 'recency'
  readonly weight = 0.40

  calculate(ctx: LGSContext): number {
    const { knowledgeCutoff, lastUpdated } = ctx.model

    const now = new Date()
    const minMonths = this.monthsSinceEpoch(REFERENCE_START)
    const maxMonths = this.monthsSinceEpoch(now)

    const cutoffScore = knowledgeCutoff
      ? normalize(this.monthsSinceEpoch(knowledgeCutoff), { min: minMonths, max: maxMonths })
      : DEFAULT_SCORE

    const updatedScore = lastUpdated
      ? normalize(this.monthsSinceEpoch(lastUpdated), { min: minMonths, max: maxMonths })
      : DEFAULT_SCORE

    return cutoffScore * 0.7 + updatedScore * 0.3
  }

  private monthsSinceEpoch(date: Date): number {
    return date.getFullYear() * 12 + date.getMonth()
  }
}
