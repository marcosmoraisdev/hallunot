// src/domain/services/lcs/__tests__/simplicity-score.test.ts
import { SimplicityScore } from '../components/simplicity-score'
import type { LCSContext } from '../types'

function createContext(keywords: string[]): LCSContext {
  return {
    library: {
      name: 'test-lib',
      language: 'javascript',
      ageInYears: 5,
      releaseCount: 50,
      keywords,
      stars: 1000,
      dependentsCount: 100,
    },
    version: { version: '1.0.0', releaseDate: new Date() },
    llm: { id: 'test', name: 'Test LLM', cutoffDate: new Date() },
  }
}

describe('SimplicityScore', () => {
  const scorer = new SimplicityScore()

  it('has correct id and weight', () => {
    expect(scorer.id).toBe('simplicity')
    expect(scorer.weight).toBe(0.10)
  })

  it('returns 1.0 for libraries with no complex keywords', () => {
    const ctx = createContext(['utility', 'helper', 'tool'])
    expect(scorer.calculate(ctx)).toBe(1)
  })

  it('returns 0.0 for libraries with 4+ complex keywords', () => {
    const ctx = createContext(['framework', 'platform', 'ecosystem', 'enterprise', 'sdk'])
    expect(scorer.calculate(ctx)).toBe(0)
  })

  it('returns mid-range score for 2 complex keywords', () => {
    const ctx = createContext(['framework', 'enterprise', 'simple'])
    const score = scorer.calculate(ctx)
    expect(score).toBe(0.5)
  })

  it('is case-insensitive', () => {
    const ctx = createContext(['FRAMEWORK', 'Platform'])
    const score = scorer.calculate(ctx)
    expect(score).toBe(0.5)
  })

  it('detects partial matches', () => {
    const ctx = createContext(['microframework', 'platforms'])
    const score = scorer.calculate(ctx)
    expect(score).toBe(0.5)
  })
})
