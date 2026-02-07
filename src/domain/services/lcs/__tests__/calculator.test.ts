// src/domain/services/lcs/__tests__/calculator.test.ts
import { LCSCalculator } from '../calculator'
import type { LibraryMetadata, VersionMetadata, LLMMetadata } from '../types'

const stableLibrary: LibraryMetadata = {
  name: 'lodash',
  language: 'JavaScript',
  ageInYears: 10,
  releaseCount: 50, // 5/year - stable
  keywords: ['utility', 'modules'],
  stars: 50000,
  dependentsCount: 100000,
}

const volatileLibrary: LibraryMetadata = {
  name: 'new-framework',
  language: 'Haskell',
  ageInYears: 1,
  releaseCount: 100, // 100/year - very volatile
  keywords: ['framework', 'platform', 'ecosystem', 'enterprise'],
  stars: 100,
  dependentsCount: 10,
}

const cutoff = new Date('2024-06-01')

const oldVersion: VersionMetadata = {
  version: '4.0.0',
  releaseDate: new Date('2023-01-01'), // Well before cutoff
}

const newVersion: VersionMetadata = {
  version: '5.0.0',
  releaseDate: new Date('2025-01-01'), // After cutoff
}

const llm: LLMMetadata = {
  id: 'test-llm',
  name: 'Test LLM',
  cutoffDate: cutoff,
}

describe('LCSCalculator', () => {
  const calculator = new LCSCalculator()

  it('calculates high score for stable, popular library with old version', () => {
    const result = calculator.calculateForVersion(stableLibrary, oldVersion, llm)
    expect(result.score).toBeGreaterThan(0.7)
  })

  it('calculates low score for volatile, niche library with new version', () => {
    const result = calculator.calculateForVersion(volatileLibrary, newVersion, llm)
    expect(result.score).toBeLessThan(0.4)
  })

  it('produces different scores for same library, different versions', () => {
    const oldResult = calculator.calculateForVersion(stableLibrary, oldVersion, llm)
    const newResult = calculator.calculateForVersion(stableLibrary, newVersion, llm)

    expect(oldResult.score).not.toBe(newResult.score)
    expect(oldResult.score).toBeGreaterThan(newResult.score)
  })

  it('includes library score breakdown', () => {
    const result = calculator.calculateForVersion(stableLibrary, oldVersion, llm)

    expect(result.libraryBreakdown).toHaveProperty('stability')
    expect(result.libraryBreakdown).toHaveProperty('simplicity')
    expect(result.libraryBreakdown).toHaveProperty('popularity')
    expect(result.libraryBreakdown).toHaveProperty('language')
  })

  it('includes recency breakdown for version', () => {
    const result = calculator.calculateForVersion(stableLibrary, oldVersion, llm)

    expect(result.recencyBreakdown).toHaveProperty('value')
    expect(result.recencyBreakdown).toHaveProperty('weight')
    expect(result.recencyBreakdown).toHaveProperty('contribution')
  })

  it('calculates scores for multiple versions at once', () => {
    const versions = [oldVersion, newVersion]
    const results = calculator.calculateForLibrary(stableLibrary, versions, llm)

    expect(results).toHaveLength(2)
    expect(results[0].version).toBe('4.0.0')
    expect(results[1].version).toBe('5.0.0')
    expect(results[0].score).toBeGreaterThan(results[1].score)
  })

  describe('stability cutoff-aware bypass', () => {
    it('gives stability score of 1.0 for pre-cutoff versions', () => {
      const result = calculator.calculateForVersion(volatileLibrary, oldVersion, llm)
      // Even a volatile library gets perfect stability for pre-cutoff versions
      expect(result.libraryBreakdown.stability.value).toBe(1.0)
    })

    it('uses normal stability calculation for post-cutoff versions', () => {
      const result = calculator.calculateForVersion(volatileLibrary, newVersion, llm)
      // Volatile library (100 releases/year) should get low stability for post-cutoff
      expect(result.libraryBreakdown.stability.value).toBeLessThan(0.5)
    })

    it('gives stability score of 1.0 for stable library with pre-cutoff version', () => {
      const result = calculator.calculateForVersion(stableLibrary, oldVersion, llm)
      expect(result.libraryBreakdown.stability.value).toBe(1.0)
    })
  })

  describe('weight distribution', () => {
    it('uses correct LCS weights (recency 0.40, stability 0.20, popularity 0.20, simplicity 0.10, language 0.10)', () => {
      const result = calculator.calculateForVersion(stableLibrary, oldVersion, llm)
      expect(result.recencyBreakdown.weight).toBe(0.40)
      expect(result.libraryBreakdown.stability.weight).toBe(0.20)
      expect(result.libraryBreakdown.popularity.weight).toBe(0.20)
      expect(result.libraryBreakdown.simplicity.weight).toBe(0.10)
      expect(result.libraryBreakdown.language.weight).toBe(0.10)
    })
  })
})
