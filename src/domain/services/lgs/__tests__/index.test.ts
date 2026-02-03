// src/domain/services/lgs/__tests__/index.test.ts
import { calculateLGS } from '../index'

describe('calculateLGS', () => {
  it('returns score of 1.0 (placeholder)', () => {
    const result = calculateLGS('any-llm-id')
    expect(result.score).toBe(1.0)
  })

  it('returns null breakdown (not implemented)', () => {
    const result = calculateLGS('any-llm-id')
    expect(result.breakdown).toBeNull()
  })
})
