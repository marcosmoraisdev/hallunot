// src/domain/services/lgs/__tests__/index.test.ts
import { calculateLGS } from '../index'
import type { LGSContext } from '../types'

const fullModel: LGSContext = {
  model: {
    reasoning: true,
    toolCall: true,
    structuredOutput: true,
    attachment: true,
    modalities: { input: ['text', 'image'], output: ['text', 'image'] },
    contextLimit: 1_000_000,
    outputLimit: 100_000,
    knowledgeCutoff: new Date(),
    lastUpdated: new Date(),
    openWeights: true,
    apiCompatibility: '@ai-sdk/openai-compatible',
  },
}

const minimalModel: LGSContext = {
  model: {
    reasoning: false,
    toolCall: false,
    structuredOutput: false,
    attachment: false,
    modalities: { input: ['text'], output: ['text'] },
    contextLimit: 4_096,
    outputLimit: 1_024,
    knowledgeCutoff: new Date('2020-01-01'),
    lastUpdated: new Date('2020-01-01'),
    openWeights: false,
    apiCompatibility: '',
  },
}

describe('calculateLGS', () => {
  it('returns score between 0 and 1', () => {
    const result = calculateLGS(fullModel)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(1)
  })

  it('returns breakdown with all 4 components', () => {
    const result = calculateLGS(fullModel)
    expect(result.breakdown).not.toBeNull()
    expect(result.breakdown!.capability).toBeDefined()
    expect(result.breakdown!.limit).toBeDefined()
    expect(result.breakdown!.recency).toBeDefined()
    expect(result.breakdown!.openness).toBeDefined()
  })

  it('returns higher score for capable model', () => {
    const fullResult = calculateLGS(fullModel)
    const minResult = calculateLGS(minimalModel)
    expect(fullResult.score).toBeGreaterThan(minResult.score)
  })

  it('rounds score to 2 decimal places', () => {
    const result = calculateLGS(fullModel)
    const rounded = Math.round(result.score * 100) / 100
    expect(result.score).toBe(rounded)
  })
})
