// src/domain/services/lgs/__tests__/recency-score.test.ts
import { RecencyScore } from '../components/recency-score'
import type { LGSContext } from '../types'

function makeCtx(overrides: Partial<LGSContext['model']> = {}): LGSContext {
  return {
    model: {
      reasoning: false,
      toolCall: false,
      structuredOutput: false,
      attachment: false,
      modalities: { input: ['text'], output: ['text'] },
      contextLimit: 128000,
      outputLimit: 4096,
      openWeights: false,
      apiCompatibility: '',
      ...overrides,
    },
  }
}

describe('RecencyScore', () => {
  const scorer = new RecencyScore()

  it('has id "recency" and weight 0.40', () => {
    expect(scorer.id).toBe('recency')
    expect(scorer.weight).toBe(0.40)
  })

  it('returns 0.3 when both dates are missing', () => {
    const ctx = makeCtx({ knowledgeCutoff: undefined, lastUpdated: undefined })
    expect(scorer.calculate(ctx)).toBeCloseTo(0.3, 5)
  })

  it('returns high score for very recent cutoff and update', () => {
    const recent = new Date()
    recent.setMonth(recent.getMonth() - 1)
    const ctx = makeCtx({ knowledgeCutoff: recent, lastUpdated: recent })
    expect(scorer.calculate(ctx)).toBeGreaterThan(0.8)
  })

  it('returns low score for very old cutoff (2020-01)', () => {
    const old = new Date('2020-01-01')
    const ctx = makeCtx({ knowledgeCutoff: old, lastUpdated: old })
    expect(scorer.calculate(ctx)).toBeLessThan(0.15)
  })

  it('weights cutoff at 70% and lastUpdated at 30%', () => {
    const recent = new Date()
    recent.setMonth(recent.getMonth() - 1)
    const old = new Date('2020-01-01')

    const recentCutoffOldUpdate = makeCtx({ knowledgeCutoff: recent, lastUpdated: old })
    const oldCutoffRecentUpdate = makeCtx({ knowledgeCutoff: old, lastUpdated: recent })

    // Recent cutoff should yield higher score than recent update alone
    expect(scorer.calculate(recentCutoffOldUpdate)).toBeGreaterThan(
      scorer.calculate(oldCutoffRecentUpdate)
    )
  })

  it('uses 0.3 default when only cutoff is present', () => {
    const recent = new Date()
    recent.setMonth(recent.getMonth() - 1)
    const withBoth = makeCtx({ knowledgeCutoff: recent, lastUpdated: recent })
    const withoutUpdated = makeCtx({ knowledgeCutoff: recent, lastUpdated: undefined })

    // Without lastUpdated defaults to 0.3, so score should be lower
    expect(scorer.calculate(withoutUpdated)).toBeLessThan(scorer.calculate(withBoth))
  })
})
