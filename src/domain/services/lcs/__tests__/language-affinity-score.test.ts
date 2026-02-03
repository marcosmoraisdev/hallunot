// src/domain/services/lcs/__tests__/language-affinity-score.test.ts
import { LanguageAffinityScore } from '../components/language-affinity-score'
import type { LCSContext } from '../types'

function createContext(language: string): LCSContext {
  return {
    library: {
      name: 'test-lib',
      language,
      ageInYears: 5,
      releaseCount: 50,
      keywords: [],
      stars: 1000,
      dependentsCount: 100,
    },
    version: { version: '1.0.0', releaseDate: new Date() },
    llm: { id: 'test', name: 'Test LLM', cutoffDate: new Date() },
  }
}

describe('LanguageAffinityScore', () => {
  const scorer = new LanguageAffinityScore()

  it('has correct id and weight', () => {
    expect(scorer.id).toBe('language')
    expect(scorer.weight).toBe(0.10)
  })

  it('returns 1.0 for JavaScript', () => {
    expect(scorer.calculate(createContext('JavaScript'))).toBe(1.0)
  })

  it('returns 1.0 for Python', () => {
    expect(scorer.calculate(createContext('Python'))).toBe(1.0)
  })

  it('returns 1.0 for TypeScript', () => {
    expect(scorer.calculate(createContext('TypeScript'))).toBe(1.0)
  })

  it('returns 0.5 for unknown languages', () => {
    expect(scorer.calculate(createContext('Brainfuck'))).toBe(0.5)
  })

  it('is case-insensitive', () => {
    expect(scorer.calculate(createContext('PYTHON'))).toBe(1.0)
    expect(scorer.calculate(createContext('javascript'))).toBe(1.0)
  })

  it('returns appropriate scores for other languages', () => {
    expect(scorer.calculate(createContext('Java'))).toBe(0.9)
    expect(scorer.calculate(createContext('Go'))).toBe(0.85)
    expect(scorer.calculate(createContext('Rust'))).toBe(0.8)
    expect(scorer.calculate(createContext('PHP'))).toBe(0.75)
  })
})
