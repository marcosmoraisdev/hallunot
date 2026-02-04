// src/domain/services/lgs/__tests__/limit-score.test.ts
import { LimitScore } from '../components/limit-score'
import type { LGSContext } from '../types'

function makeCtx(overrides: Partial<LGSContext['model']> = {}): LGSContext {
  return {
    model: {
      reasoning: false,
      toolCall: false,
      structuredOutput: false,
      attachment: false,
      modalities: { input: ['text'], output: ['text'] },
      contextLimit: 0,
      outputLimit: 0,
      knowledgeCutoff: new Date('2024-06-01'),
      lastUpdated: new Date('2024-06-01'),
      openWeights: false,
      apiCompatibility: '',
      ...overrides,
    },
  }
}

describe('LimitScore', () => {
  const scorer = new LimitScore()

  it('has id "limit" and weight 0.20', () => {
    expect(scorer.id).toBe('limit')
    expect(scorer.weight).toBe(0.20)
  })

  it('returns 0 when both limits are 0', () => {
    const ctx = makeCtx({ contextLimit: 0, outputLimit: 0 })
    expect(scorer.calculate(ctx)).toBe(0)
  })

  it('returns high score for large context and output limits', () => {
    const ctx = makeCtx({ contextLimit: 1_000_000, outputLimit: 100_000 })
    expect(scorer.calculate(ctx)).toBeGreaterThan(0.8)
  })

  it('weights context at 60% and output at 40%', () => {
    const ctxOnlyContext = makeCtx({ contextLimit: 128_000, outputLimit: 0 })
    const ctxOnlyOutput = makeCtx({ contextLimit: 0, outputLimit: 128_000 })

    const contextContrib = scorer.calculate(ctxOnlyContext)
    const outputContrib = scorer.calculate(ctxOnlyOutput)

    // Context-only should contribute more than output-only for same value
    expect(contextContrib).toBeGreaterThan(outputContrib)
  })

  it('uses log scaling (doubling input does not double score)', () => {
    const small = makeCtx({ contextLimit: 8_000, outputLimit: 4_096 })
    const large = makeCtx({ contextLimit: 16_000, outputLimit: 8_192 })

    const smallScore = scorer.calculate(small)
    const largeScore = scorer.calculate(large)

    // Doubling should increase score, but by less than 2x
    expect(largeScore).toBeGreaterThan(smallScore)
    expect(largeScore / smallScore).toBeLessThan(2)
  })
})
