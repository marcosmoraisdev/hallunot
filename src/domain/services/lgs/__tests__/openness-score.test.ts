// src/domain/services/lgs/__tests__/openness-score.test.ts
import { OpennessScore } from '../components/openness-score'
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
      knowledgeCutoff: new Date('2024-06-01'),
      lastUpdated: new Date('2024-06-01'),
      openWeights: false,
      apiCompatibility: '',
      ...overrides,
    },
  }
}

describe('OpennessScore', () => {
  const scorer = new OpennessScore()

  it('has id "openness" and weight 0.15', () => {
    expect(scorer.id).toBe('openness')
    expect(scorer.weight).toBe(0.15)
  })

  it('returns 0 when no openness signals present', () => {
    const ctx = makeCtx({ openWeights: false, apiCompatibility: '' })
    expect(scorer.calculate(ctx)).toBe(0)
  })

  it('returns 0.7 for open weights only', () => {
    const ctx = makeCtx({ openWeights: true, apiCompatibility: '' })
    expect(scorer.calculate(ctx)).toBeCloseTo(0.7, 5)
  })

  it('returns 0.3 for API compatibility only', () => {
    const ctx = makeCtx({
      openWeights: false,
      apiCompatibility: '@ai-sdk/openai-compatible',
    })
    expect(scorer.calculate(ctx)).toBeCloseTo(0.3, 5)
  })

  it('returns 1.0 for both open weights and API compatibility', () => {
    const ctx = makeCtx({
      openWeights: true,
      apiCompatibility: '@ai-sdk/openai-compatible',
    })
    expect(scorer.calculate(ctx)).toBeCloseTo(1.0, 5)
  })

  it('detects openai-compatible in npm package name', () => {
    const ctx = makeCtx({
      openWeights: false,
      apiCompatibility: '@some-org/openai-compatible',
    })
    expect(scorer.calculate(ctx)).toBeCloseTo(0.3, 5)
  })

  it('does not match partial strings that do not contain openai-compatible', () => {
    const ctx = makeCtx({
      openWeights: false,
      apiCompatibility: '@ai-sdk/anthropic',
    })
    expect(scorer.calculate(ctx)).toBe(0)
  })
})
