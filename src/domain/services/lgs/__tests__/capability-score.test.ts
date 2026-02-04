// src/domain/services/lgs/__tests__/capability-score.test.ts
import { CapabilityScore } from '../components/capability-score'
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

describe('CapabilityScore', () => {
  const scorer = new CapabilityScore()

  it('has id "capability" and weight 0.40', () => {
    expect(scorer.id).toBe('capability')
    expect(scorer.weight).toBe(0.40)
  })

  it('returns 0 when no capabilities are present', () => {
    const ctx = makeCtx()
    expect(scorer.calculate(ctx)).toBeCloseTo(0, 5)
  })

  it('returns 1 when all 6 capabilities are present', () => {
    const ctx = makeCtx({
      reasoning: true,
      toolCall: true,
      structuredOutput: true,
      attachment: true,
      modalities: { input: ['text', 'image'], output: ['text', 'image'] },
    })
    expect(scorer.calculate(ctx)).toBeCloseTo(1, 5)
  })

  it('returns 0.5 when 3 of 6 capabilities are present', () => {
    const ctx = makeCtx({
      reasoning: true,
      toolCall: true,
      structuredOutput: true,
    })
    expect(scorer.calculate(ctx)).toBeCloseTo(0.5, 5)
  })

  it('counts multimodal input as a signal', () => {
    const ctx = makeCtx({
      modalities: { input: ['text', 'image', 'audio'], output: ['text'] },
    })
    expect(scorer.calculate(ctx)).toBeCloseTo(1 / 6, 2)
  })

  it('counts multimodal output as a signal', () => {
    const ctx = makeCtx({
      modalities: { input: ['text'], output: ['text', 'image'] },
    })
    expect(scorer.calculate(ctx)).toBeCloseTo(1 / 6, 2)
  })
})
