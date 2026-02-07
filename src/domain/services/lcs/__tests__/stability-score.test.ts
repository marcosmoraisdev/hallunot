// src/domain/services/lcs/__tests__/stability-score.test.ts
import { StabilityScore } from '../components/stability-score'
import type { LCSContext } from '../types'

const pastCutoff = new Date('2024-01-01')
const postCutoffVersion = new Date('2025-06-01')

function createContext(overrides: Partial<LCSContext['library']> = {}): LCSContext {
  return {
    library: {
      name: 'test-lib',
      language: 'javascript',
      ageInYears: 5,
      releaseCount: 50,
      keywords: [],
      stars: 1000,
      dependentsCount: 100,
      ...overrides,
    },
    // Post-cutoff version so volatility tests exercise the formula
    version: { version: '1.0.0', releaseDate: postCutoffVersion },
    llm: { id: 'test', name: 'Test LLM', cutoffDate: pastCutoff },
  }
}

describe('StabilityScore', () => {
  const scorer = new StabilityScore()

  it('has correct id and weight', () => {
    expect(scorer.id).toBe('stability')
    expect(scorer.weight).toBe(0.20)
  })

  it('returns 1.0 for pre-cutoff versions (bypass)', () => {
    const ctx: LCSContext = {
      ...createContext({ ageInYears: 1, releaseCount: 100 }),
      version: { version: '1.0.0', releaseDate: new Date('2023-01-01') },
    }
    // Even a volatile library gets perfect stability for pre-cutoff versions
    expect(scorer.calculate(ctx)).toBe(1.0)
  })

  it('returns 0.5 for post-cutoff libraries with zero age', () => {
    const ctx = createContext({ ageInYears: 0, releaseCount: 10 })
    expect(scorer.calculate(ctx)).toBe(0.5)
  })

  it('returns high score for low release frequency (2/year)', () => {
    const ctx = createContext({ ageInYears: 5, releaseCount: 10 }) // 2 releases/year
    expect(scorer.calculate(ctx)).toBeGreaterThan(0.9)
  })

  it('returns low score for high release frequency (20+/year)', () => {
    const ctx = createContext({ ageInYears: 5, releaseCount: 100 }) // 20 releases/year
    expect(scorer.calculate(ctx)).toBeLessThanOrEqual(0.1)
  })

  it('returns mid-range score for moderate frequency (10/year)', () => {
    const ctx = createContext({ ageInYears: 5, releaseCount: 50 }) // 10 releases/year
    const score = scorer.calculate(ctx)
    expect(score).toBeGreaterThan(0.4)
    expect(score).toBeLessThan(0.7)
  })
})
