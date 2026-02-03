# Library Confidence Score (LCS) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current scoring system with a configurable, multi-component Library Confidence Score that evaluates library+version+LLM combinations.

**Architecture:** Strategy pattern with pluggable score components. Each component implements `ScoreComponent<LCSContext>` interface with `id`, `weight`, and `calculate()`. A `WeightedScoreAggregator` combines them. Response includes LCS (library confidence), LGS (LLM generic score, placeholder=1.0), and FS (final score = LCS × LGS).

**Tech Stack:** Pure TypeScript, no external dependencies. Domain layer only.

---

## Task 1: Utility Functions

**Files:**
- Create: `src/domain/services/lcs/utils.ts`
- Test: `src/domain/services/lcs/__tests__/utils.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/domain/services/lcs/__tests__/utils.test.ts
import { clamp, normalize, normalizeInverse, normalizeLog, daysSince } from '../utils'

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('returns min when value is below', () => {
    expect(clamp(-5, 0, 10)).toBe(0)
  })

  it('returns max when value is above', () => {
    expect(clamp(15, 0, 10)).toBe(10)
  })
})

describe('normalize', () => {
  it('returns 0 when value equals min', () => {
    expect(normalize(0, { min: 0, max: 100 })).toBe(0)
  })

  it('returns 1 when value equals max', () => {
    expect(normalize(100, { min: 0, max: 100 })).toBe(1)
  })

  it('returns 0.5 when value is midpoint', () => {
    expect(normalize(50, { min: 0, max: 100 })).toBe(0.5)
  })

  it('returns 0 when min equals max', () => {
    expect(normalize(50, { min: 50, max: 50 })).toBe(0)
  })

  it('clamps values outside range', () => {
    expect(normalize(-10, { min: 0, max: 100 })).toBe(0)
    expect(normalize(150, { min: 0, max: 100 })).toBe(1)
  })
})

describe('normalizeInverse', () => {
  it('returns 1 when value equals min', () => {
    expect(normalizeInverse(0, { min: 0, max: 100 })).toBe(1)
  })

  it('returns 0 when value equals max', () => {
    expect(normalizeInverse(100, { min: 0, max: 100 })).toBe(0)
  })

  it('returns 0.5 when value is midpoint', () => {
    expect(normalizeInverse(50, { min: 0, max: 100 })).toBe(0.5)
  })
})

describe('normalizeLog', () => {
  it('returns 0 for zero value', () => {
    expect(normalizeLog(0, { max: 100000 })).toBe(0)
  })

  it('returns 0 for negative values', () => {
    expect(normalizeLog(-10, { max: 100000 })).toBe(0)
  })

  it('returns 1 for max value', () => {
    expect(normalizeLog(100000, { max: 100000 })).toBeCloseTo(1, 5)
  })

  it('handles large values with diminishing returns', () => {
    const score1k = normalizeLog(1000, { max: 100000 })
    const score10k = normalizeLog(10000, { max: 100000 })
    const score100k = normalizeLog(100000, { max: 100000 })

    // Log scale: 10x increase should not give 10x score increase
    expect(score10k - score1k).toBeLessThan(score1k)
    expect(score100k).toBeCloseTo(1, 5)
  })
})

describe('daysSince', () => {
  it('returns positive days for past dates', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    expect(daysSince(tenDaysAgo)).toBeCloseTo(10, 0)
  })

  it('returns 0 for future dates', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    expect(daysSince(tomorrow)).toBe(0)
  })

  it('returns 0 for now', () => {
    expect(daysSince(new Date())).toBeCloseTo(0, 1)
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/domain/services/lcs/__tests__/utils.test.ts`
Expected: FAIL - Cannot find module '../utils'

**Step 3: Write the implementation**

```typescript
// src/domain/services/lcs/utils.ts

/**
 * Clamps a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Normalizes a value to [0,1] range.
 * Values below min → 0, above max → 1.
 */
export function normalize(
  value: number,
  options: { min: number; max: number }
): number {
  const { min, max } = options
  if (max === min) return 0
  return clamp((value - min) / (max - min), 0, 1)
}

/**
 * Inverse normalization - higher input → lower output.
 * Useful for "less is better" metrics (e.g., release frequency).
 */
export function normalizeInverse(
  value: number,
  options: { min: number; max: number }
): number {
  return 1 - normalize(value, options)
}

/**
 * Logarithmic normalization for values with extreme ranges (e.g., stars).
 * Prevents mega-popular libraries from dominating.
 */
export function normalizeLog(
  value: number,
  options: { max: number }
): number {
  if (value <= 0) return 0
  const logValue = Math.log10(value + 1)
  const logMax = Math.log10(options.max + 1)
  return clamp(logValue / logMax, 0, 1)
}

/**
 * Days between a date and now.
 */
export function daysSince(date: Date): number {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  return Math.max(0, diffMs / (1000 * 60 * 60 * 24))
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/domain/services/lcs/__tests__/utils.test.ts`
Expected: PASS - All 15 tests passing

**Step 5: Commit**

```bash
git add src/domain/services/lcs/utils.ts src/domain/services/lcs/__tests__/utils.test.ts
git commit -m "feat(lcs): add utility functions for score normalization"
```

---

## Task 2: Types and Interfaces

**Files:**
- Create: `src/domain/services/lcs/types.ts`

**Step 1: Write the types**

```typescript
// src/domain/services/lcs/types.ts

/**
 * Generic interface for score components.
 * Each component contributes a normalized [0,1] value with a weight.
 */
export interface ScoreComponent<TContext = unknown> {
  readonly id: string
  readonly weight: number
  calculate(context: TContext): number
}

/**
 * Context containing all metadata needed for LCS calculation.
 */
export interface LCSContext {
  library: LibraryMetadata
  version: VersionMetadata
  llm: LLMMetadata
}

export interface LibraryMetadata {
  name: string
  language: string
  ageInYears: number
  releaseCount: number
  keywords: string[]
  stars: number
  dependentsCount: number
}

export interface VersionMetadata {
  version: string
  releaseDate: Date
}

export interface LLMMetadata {
  id: string
  name: string
  cutoffDate: Date
}

/**
 * Result of a single component calculation.
 */
export interface ComponentResult {
  value: number
  weight: number
  contribution: number
}

/**
 * Breakdown of library-wide score components.
 */
export interface LibraryScoreBreakdown {
  stability: ComponentResult
  simplicity: ComponentResult
  popularity: ComponentResult
  language: ComponentResult
}

/**
 * Score for a specific version.
 */
export interface VersionScore {
  version: string
  releaseDate: string
  recency: ComponentResult
  score: number
}

/**
 * LCS output structure.
 */
export interface LCSOutput {
  libraryScore: LibraryScoreBreakdown
  versions: VersionScore[]
}

/**
 * LGS (LLM Generic Score) output structure.
 */
export interface LGSOutput {
  score: number
  breakdown: Record<string, number> | null
}

/**
 * Final score for a version (LCS × LGS).
 */
export interface FinalVersionScore {
  version: string
  lcs: number
  lgs: number
  final: number
}

/**
 * FS (Final Score) output structure.
 */
export interface FSOutput {
  versions: FinalVersionScore[]
  formula: string
}

/**
 * Complete score response structure.
 */
export interface ScoreResponse {
  library: string
  platform: string
  llm: string
  LCS: LCSOutput
  LGS: LGSOutput
  FS: FSOutput
}
```

**Step 2: Commit**

```bash
git add src/domain/services/lcs/types.ts
git commit -m "feat(lcs): add type definitions for score components and responses"
```

---

## Task 3: StabilityScore Component

**Files:**
- Create: `src/domain/services/lcs/components/stability-score.ts`
- Test: `src/domain/services/lcs/__tests__/stability-score.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/domain/services/lcs/__tests__/stability-score.test.ts
import { StabilityScore } from '../components/stability-score'
import type { LCSContext } from '../types'

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
    version: { version: '1.0.0', releaseDate: new Date() },
    llm: { id: 'test', name: 'Test LLM', cutoffDate: new Date() },
  }
}

describe('StabilityScore', () => {
  const scorer = new StabilityScore()

  it('has correct id and weight', () => {
    expect(scorer.id).toBe('stability')
    expect(scorer.weight).toBe(0.30)
  })

  it('returns 0.5 for libraries with zero age', () => {
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
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/domain/services/lcs/__tests__/stability-score.test.ts`
Expected: FAIL - Cannot find module '../components/stability-score'

**Step 3: Write the implementation**

```typescript
// src/domain/services/lcs/components/stability-score.ts
import type { ScoreComponent, LCSContext } from '../types'
import { normalizeInverse } from '../utils'

/**
 * Measures API volatility based on release frequency.
 * Fewer releases per year = more stable = higher score.
 */
export class StabilityScore implements ScoreComponent<LCSContext> {
  readonly id = 'stability'
  readonly weight = 0.30

  calculate(ctx: LCSContext): number {
    const { ageInYears, releaseCount } = ctx.library

    if (ageInYears <= 0) return 0.5 // New library, neutral score

    const releasesPerYear = releaseCount / ageInYears

    // 0-2 releases/year = very stable (1.0)
    // 20+ releases/year = very volatile (0.0)
    return normalizeInverse(releasesPerYear, { min: 2, max: 20 })
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/domain/services/lcs/__tests__/stability-score.test.ts`
Expected: PASS - All 5 tests passing

**Step 5: Commit**

```bash
git add src/domain/services/lcs/components/stability-score.ts src/domain/services/lcs/__tests__/stability-score.test.ts
git commit -m "feat(lcs): add StabilityScore component"
```

---

## Task 4: RecencyRiskScore Component

**Files:**
- Create: `src/domain/services/lcs/components/recency-risk-score.ts`
- Test: `src/domain/services/lcs/__tests__/recency-risk-score.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/domain/services/lcs/__tests__/recency-risk-score.test.ts
import { RecencyRiskScore } from '../components/recency-risk-score'
import type { LCSContext } from '../types'

function createContext(
  versionReleaseDate: Date,
  llmCutoffDate: Date
): LCSContext {
  return {
    library: {
      name: 'test-lib',
      language: 'javascript',
      ageInYears: 5,
      releaseCount: 50,
      keywords: [],
      stars: 1000,
      dependentsCount: 100,
    },
    version: { version: '1.0.0', releaseDate: versionReleaseDate },
    llm: { id: 'test', name: 'Test LLM', cutoffDate: llmCutoffDate },
  }
}

describe('RecencyRiskScore', () => {
  const scorer = new RecencyRiskScore()

  it('has correct id and weight', () => {
    expect(scorer.id).toBe('recency')
    expect(scorer.weight).toBe(0.25)
  })

  it('returns high score when version released well before cutoff (12 months)', () => {
    const cutoff = new Date('2024-06-01')
    const release = new Date('2023-06-01') // 12 months before
    const ctx = createContext(release, cutoff)
    expect(scorer.calculate(ctx)).toBeGreaterThan(0.8)
  })

  it('returns low score when version released after cutoff (6 months)', () => {
    const cutoff = new Date('2024-01-01')
    const release = new Date('2024-07-01') // 6 months after
    const ctx = createContext(release, cutoff)
    expect(scorer.calculate(ctx)).toBeLessThan(0.3)
  })

  it('returns mid score when version released near cutoff', () => {
    const cutoff = new Date('2024-06-01')
    const release = new Date('2024-06-01') // exactly at cutoff
    const ctx = createContext(release, cutoff)
    const score = scorer.calculate(ctx)
    expect(score).toBeGreaterThan(0.4)
    expect(score).toBeLessThan(0.7)
  })

  it('returns very low score for versions released 12+ months after cutoff', () => {
    const cutoff = new Date('2024-01-01')
    const release = new Date('2025-01-01') // 12 months after
    const ctx = createContext(release, cutoff)
    expect(scorer.calculate(ctx)).toBeLessThan(0.1)
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/domain/services/lcs/__tests__/recency-risk-score.test.ts`
Expected: FAIL - Cannot find module '../components/recency-risk-score'

**Step 3: Write the implementation**

```typescript
// src/domain/services/lcs/components/recency-risk-score.ts
import type { ScoreComponent, LCSContext } from '../types'
import { normalize, clamp } from '../utils'

const MS_PER_MONTH = 30 * 24 * 60 * 60 * 1000

/**
 * Scores based on version release date relative to LLM knowledge cutoff.
 * Versions released before cutoff = higher score.
 * Versions released after cutoff = lower score.
 */
export class RecencyRiskScore implements ScoreComponent<LCSContext> {
  readonly id = 'recency'
  readonly weight = 0.25

  calculate(ctx: LCSContext): number {
    const versionDate = ctx.version.releaseDate.getTime()
    const cutoffDate = ctx.llm.cutoffDate.getTime()
    const diffMs = versionDate - cutoffDate
    const monthsDiff = diffMs / MS_PER_MONTH

    if (monthsDiff <= 0) {
      // Released before cutoff - good
      // 0 months before = 0.5, 24+ months before = 1.0
      const monthsBefore = Math.abs(monthsDiff)
      return clamp(0.5 + normalize(monthsBefore, { min: 0, max: 24 }) * 0.5, 0, 1)
    } else {
      // Released after cutoff - risky
      // 0 months after = 0.5, 12+ months after = 0.0
      return clamp(0.5 - normalize(monthsDiff, { min: 0, max: 12 }) * 0.5, 0, 1)
    }
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/domain/services/lcs/__tests__/recency-risk-score.test.ts`
Expected: PASS - All 5 tests passing

**Step 5: Commit**

```bash
git add src/domain/services/lcs/components/recency-risk-score.ts src/domain/services/lcs/__tests__/recency-risk-score.test.ts
git commit -m "feat(lcs): add RecencyRiskScore component"
```

---

## Task 5: SimplicityScore Component

**Files:**
- Create: `src/domain/services/lcs/components/simplicity-score.ts`
- Test: `src/domain/services/lcs/__tests__/simplicity-score.test.ts`

**Step 1: Write the failing tests**

```typescript
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
    expect(scorer.weight).toBe(0.15)
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
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/domain/services/lcs/__tests__/simplicity-score.test.ts`
Expected: FAIL - Cannot find module '../components/simplicity-score'

**Step 3: Write the implementation**

```typescript
// src/domain/services/lcs/components/simplicity-score.ts
import type { ScoreComponent, LCSContext } from '../types'
import { normalizeInverse } from '../utils'

const COMPLEX_KEYWORDS = [
  'framework',
  'platform',
  'ecosystem',
  'full-stack',
  'fullstack',
  'enterprise',
  'monorepo',
  'suite',
  'sdk',
]

/**
 * Estimates conceptual scope from keywords.
 * Fewer "complex" keywords = simpler = higher score.
 */
export class SimplicityScore implements ScoreComponent<LCSContext> {
  readonly id = 'simplicity'
  readonly weight = 0.15

  calculate(ctx: LCSContext): number {
    const keywords = ctx.library.keywords.map((k) => k.toLowerCase())

    const complexCount = keywords.filter((k) =>
      COMPLEX_KEYWORDS.some((ck) => k.includes(ck))
    ).length

    // 0 complex keywords = 1.0
    // 4+ complex keywords = 0.0
    return normalizeInverse(complexCount, { min: 0, max: 4 })
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/domain/services/lcs/__tests__/simplicity-score.test.ts`
Expected: PASS - All 6 tests passing

**Step 5: Commit**

```bash
git add src/domain/services/lcs/components/simplicity-score.ts src/domain/services/lcs/__tests__/simplicity-score.test.ts
git commit -m "feat(lcs): add SimplicityScore component"
```

---

## Task 6: PopularityScore Component

**Files:**
- Create: `src/domain/services/lcs/components/popularity-score.ts`
- Test: `src/domain/services/lcs/__tests__/popularity-score.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/domain/services/lcs/__tests__/popularity-score.test.ts
import { PopularityScore } from '../components/popularity-score'
import type { LCSContext } from '../types'

function createContext(stars: number, dependentsCount: number): LCSContext {
  return {
    library: {
      name: 'test-lib',
      language: 'javascript',
      ageInYears: 5,
      releaseCount: 50,
      keywords: [],
      stars,
      dependentsCount,
    },
    version: { version: '1.0.0', releaseDate: new Date() },
    llm: { id: 'test', name: 'Test LLM', cutoffDate: new Date() },
  }
}

describe('PopularityScore', () => {
  const scorer = new PopularityScore()

  it('has correct id and weight', () => {
    expect(scorer.id).toBe('popularity')
    expect(scorer.weight).toBe(0.20)
  })

  it('returns 0 for zero stars and dependents', () => {
    const ctx = createContext(0, 0)
    expect(scorer.calculate(ctx)).toBe(0)
  })

  it('returns high score for popular libraries', () => {
    const ctx = createContext(100000, 10000)
    expect(scorer.calculate(ctx)).toBeGreaterThan(0.9)
  })

  it('uses log scale - 10k stars is not 10x better than 1k', () => {
    const score1k = new PopularityScore().calculate(createContext(1000, 100))
    const score10k = new PopularityScore().calculate(createContext(10000, 1000))

    // With log scale, 10x increase should give much less than 10x score increase
    expect(score10k / score1k).toBeLessThan(2)
  })

  it('weights dependents more than stars', () => {
    const highStars = createContext(100000, 100)
    const highDependents = createContext(100, 10000)

    // Same order of magnitude but dependents weighted 0.6 vs stars 0.4
    const starsScore = scorer.calculate(highStars)
    const dependentsScore = scorer.calculate(highDependents)

    expect(dependentsScore).toBeGreaterThan(starsScore)
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/domain/services/lcs/__tests__/popularity-score.test.ts`
Expected: FAIL - Cannot find module '../components/popularity-score'

**Step 3: Write the implementation**

```typescript
// src/domain/services/lcs/components/popularity-score.ts
import type { ScoreComponent, LCSContext } from '../types'
import { normalizeLog } from '../utils'

/**
 * Uses adoption as proxy for training data exposure.
 * Log-scaled to prevent mega-projects from dominating.
 */
export class PopularityScore implements ScoreComponent<LCSContext> {
  readonly id = 'popularity'
  readonly weight = 0.20

  calculate(ctx: LCSContext): number {
    const { stars, dependentsCount } = ctx.library

    // Combine stars and dependents (both log-scaled)
    const starsScore = normalizeLog(stars, { max: 100_000 })
    const dependentsScore = normalizeLog(dependentsCount, { max: 10_000 })

    // Weighted average: dependents slightly more meaningful
    return starsScore * 0.4 + dependentsScore * 0.6
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/domain/services/lcs/__tests__/popularity-score.test.ts`
Expected: PASS - All 5 tests passing

**Step 5: Commit**

```bash
git add src/domain/services/lcs/components/popularity-score.ts src/domain/services/lcs/__tests__/popularity-score.test.ts
git commit -m "feat(lcs): add PopularityScore component"
```

---

## Task 7: LanguageAffinityScore Component

**Files:**
- Create: `src/domain/services/lcs/components/language-affinity-score.ts`
- Test: `src/domain/services/lcs/__tests__/language-affinity-score.test.ts`

**Step 1: Write the failing tests**

```typescript
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
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/domain/services/lcs/__tests__/language-affinity-score.test.ts`
Expected: FAIL - Cannot find module '../components/language-affinity-score'

**Step 3: Write the implementation**

```typescript
// src/domain/services/lcs/components/language-affinity-score.ts
import type { ScoreComponent, LCSContext } from '../types'

const LANGUAGE_SCORES: Record<string, number> = {
  javascript: 1.0,
  typescript: 1.0,
  python: 1.0,
  java: 0.9,
  go: 0.85,
  rust: 0.8,
  ruby: 0.8,
  php: 0.75,
  csharp: 0.75,
  'c#': 0.75,
  swift: 0.7,
  kotlin: 0.7,
  c: 0.7,
  'c++': 0.7,
  cpp: 0.7,
}

const DEFAULT_SCORE = 0.5

/**
 * Fixed mapping based on LLM ecosystem maturity per language.
 */
export class LanguageAffinityScore implements ScoreComponent<LCSContext> {
  readonly id = 'language'
  readonly weight = 0.10

  calculate(ctx: LCSContext): number {
    const lang = ctx.library.language.toLowerCase()
    return LANGUAGE_SCORES[lang] ?? DEFAULT_SCORE
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/domain/services/lcs/__tests__/language-affinity-score.test.ts`
Expected: PASS - All 8 tests passing

**Step 5: Commit**

```bash
git add src/domain/services/lcs/components/language-affinity-score.ts src/domain/services/lcs/__tests__/language-affinity-score.test.ts
git commit -m "feat(lcs): add LanguageAffinityScore component"
```

---

## Task 8: WeightedScoreAggregator

**Files:**
- Create: `src/domain/services/lcs/aggregator.ts`
- Test: `src/domain/services/lcs/__tests__/aggregator.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/domain/services/lcs/__tests__/aggregator.test.ts
import { WeightedScoreAggregator } from '../aggregator'
import type { ScoreComponent } from '../types'

function createMockComponent(
  id: string,
  weight: number,
  value: number
): ScoreComponent<unknown> {
  return {
    id,
    weight,
    calculate: () => value,
  }
}

describe('WeightedScoreAggregator', () => {
  it('throws if weights do not sum to 1.0', () => {
    const components = [
      createMockComponent('a', 0.5, 1),
      createMockComponent('b', 0.3, 1),
    ]
    expect(() => new WeightedScoreAggregator(components)).toThrow(
      'Component weights must sum to 1.0'
    )
  })

  it('accepts weights that sum to 1.0', () => {
    const components = [
      createMockComponent('a', 0.6, 1),
      createMockComponent('b', 0.4, 1),
    ]
    expect(() => new WeightedScoreAggregator(components)).not.toThrow()
  })

  it('clamps component values to [0,1]', () => {
    const components = [
      createMockComponent('a', 0.5, 1.5), // Over 1
      createMockComponent('b', 0.5, -0.5), // Under 0
    ]
    const aggregator = new WeightedScoreAggregator(components)
    const result = aggregator.calculate({})

    expect(result.breakdown[0].rawValue).toBe(1) // Clamped from 1.5
    expect(result.breakdown[1].rawValue).toBe(0) // Clamped from -0.5
  })

  it('returns correct weighted sum', () => {
    const components = [
      createMockComponent('a', 0.6, 1.0),
      createMockComponent('b', 0.4, 0.5),
    ]
    const aggregator = new WeightedScoreAggregator(components)
    const result = aggregator.calculate({})

    // 0.6 * 1.0 + 0.4 * 0.5 = 0.6 + 0.2 = 0.8
    expect(result.score).toBeCloseTo(0.8, 5)
  })

  it('includes breakdown with contributions', () => {
    const components = [
      createMockComponent('a', 0.7, 0.8),
      createMockComponent('b', 0.3, 0.6),
    ]
    const aggregator = new WeightedScoreAggregator(components)
    const result = aggregator.calculate({})

    expect(result.breakdown).toHaveLength(2)
    expect(result.breakdown[0]).toEqual({
      id: 'a',
      rawValue: 0.8,
      weight: 0.7,
      contribution: 0.56, // 0.8 * 0.7
    })
    expect(result.breakdown[1]).toEqual({
      id: 'b',
      rawValue: 0.6,
      weight: 0.3,
      contribution: 0.18, // 0.6 * 0.3
    })
  })

  it('returns component info for introspection', () => {
    const components = [
      createMockComponent('stability', 0.6, 1),
      createMockComponent('recency', 0.4, 1),
    ]
    const aggregator = new WeightedScoreAggregator(components)
    const info = aggregator.getComponentInfo()

    expect(info).toEqual([
      { id: 'stability', weight: 0.6 },
      { id: 'recency', weight: 0.4 },
    ])
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/domain/services/lcs/__tests__/aggregator.test.ts`
Expected: FAIL - Cannot find module '../aggregator'

**Step 3: Write the implementation**

```typescript
// src/domain/services/lcs/aggregator.ts
import type { ScoreComponent } from './types'
import { clamp } from './utils'

export interface AggregatorResult {
  score: number
  breakdown: ComponentBreakdown[]
}

export interface ComponentBreakdown {
  id: string
  rawValue: number
  weight: number
  contribution: number
}

/**
 * Aggregates multiple score components into a final weighted score.
 * Validates that weights sum to ~1.0 and all values are in [0,1].
 */
export class WeightedScoreAggregator<TContext> {
  constructor(private readonly components: ScoreComponent<TContext>[]) {
    this.validateWeights()
  }

  private validateWeights(): void {
    const totalWeight = this.components.reduce((sum, c) => sum + c.weight, 0)
    if (Math.abs(totalWeight - 1.0) > 0.001) {
      throw new Error(
        `Component weights must sum to 1.0, got ${totalWeight.toFixed(3)}`
      )
    }
  }

  calculate(context: TContext): AggregatorResult {
    const breakdown: ComponentBreakdown[] = []
    let score = 0

    for (const component of this.components) {
      const rawValue = clamp(component.calculate(context), 0, 1)
      const contribution = rawValue * component.weight

      breakdown.push({
        id: component.id,
        rawValue,
        weight: component.weight,
        contribution,
      })

      score += contribution
    }

    return {
      score: clamp(score, 0, 1),
      breakdown,
    }
  }

  /**
   * Returns component IDs and weights for introspection.
   */
  getComponentInfo(): Array<{ id: string; weight: number }> {
    return this.components.map((c) => ({ id: c.id, weight: c.weight }))
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/domain/services/lcs/__tests__/aggregator.test.ts`
Expected: PASS - All 6 tests passing

**Step 5: Commit**

```bash
git add src/domain/services/lcs/aggregator.ts src/domain/services/lcs/__tests__/aggregator.test.ts
git commit -m "feat(lcs): add WeightedScoreAggregator"
```

---

## Task 9: LCS Calculator and Index

**Files:**
- Create: `src/domain/services/lcs/index.ts`
- Create: `src/domain/services/lcs/calculator.ts`
- Test: `src/domain/services/lcs/__tests__/calculator.test.ts`

**Step 1: Write the failing tests**

```typescript
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
})
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/domain/services/lcs/__tests__/calculator.test.ts`
Expected: FAIL - Cannot find module '../calculator'

**Step 3: Write the implementation**

```typescript
// src/domain/services/lcs/calculator.ts
import { StabilityScore } from './components/stability-score'
import { RecencyRiskScore } from './components/recency-risk-score'
import { SimplicityScore } from './components/simplicity-score'
import { PopularityScore } from './components/popularity-score'
import { LanguageAffinityScore } from './components/language-affinity-score'
import type {
  LCSContext,
  LibraryMetadata,
  VersionMetadata,
  LLMMetadata,
  ComponentResult,
  LibraryScoreBreakdown,
} from './types'

export interface VersionCalculationResult {
  version: string
  releaseDate: string
  score: number
  libraryBreakdown: LibraryScoreBreakdown
  recencyBreakdown: ComponentResult
}

/**
 * Calculates Library Confidence Score for library+version+LLM combinations.
 */
export class LCSCalculator {
  private readonly stabilityScorer = new StabilityScore()
  private readonly simplicityScorer = new SimplicityScore()
  private readonly popularityScorer = new PopularityScore()
  private readonly languageScorer = new LanguageAffinityScore()
  private readonly recencyScorer = new RecencyRiskScore()

  calculateForVersion(
    library: LibraryMetadata,
    version: VersionMetadata,
    llm: LLMMetadata
  ): VersionCalculationResult {
    const context: LCSContext = { library, version, llm }

    // Calculate all component values
    const stabilityValue = this.stabilityScorer.calculate(context)
    const simplicityValue = this.simplicityScorer.calculate(context)
    const popularityValue = this.popularityScorer.calculate(context)
    const languageValue = this.languageScorer.calculate(context)
    const recencyValue = this.recencyScorer.calculate(context)

    // Build breakdown
    const libraryBreakdown: LibraryScoreBreakdown = {
      stability: {
        value: stabilityValue,
        weight: this.stabilityScorer.weight,
        contribution: stabilityValue * this.stabilityScorer.weight,
      },
      simplicity: {
        value: simplicityValue,
        weight: this.simplicityScorer.weight,
        contribution: simplicityValue * this.simplicityScorer.weight,
      },
      popularity: {
        value: popularityValue,
        weight: this.popularityScorer.weight,
        contribution: popularityValue * this.popularityScorer.weight,
      },
      language: {
        value: languageValue,
        weight: this.languageScorer.weight,
        contribution: languageValue * this.languageScorer.weight,
      },
    }

    const recencyBreakdown: ComponentResult = {
      value: recencyValue,
      weight: this.recencyScorer.weight,
      contribution: recencyValue * this.recencyScorer.weight,
    }

    // Final score = sum of all contributions
    const score =
      libraryBreakdown.stability.contribution +
      libraryBreakdown.simplicity.contribution +
      libraryBreakdown.popularity.contribution +
      libraryBreakdown.language.contribution +
      recencyBreakdown.contribution

    return {
      version: version.version,
      releaseDate: version.releaseDate.toISOString(),
      score: Math.round(score * 100) / 100,
      libraryBreakdown,
      recencyBreakdown,
    }
  }

  calculateForLibrary(
    library: LibraryMetadata,
    versions: VersionMetadata[],
    llm: LLMMetadata
  ): VersionCalculationResult[] {
    return versions.map((v) => this.calculateForVersion(library, v, llm))
  }
}
```

```typescript
// src/domain/services/lcs/index.ts
export * from './types'
export * from './utils'
export * from './aggregator'
export * from './calculator'
export { StabilityScore } from './components/stability-score'
export { RecencyRiskScore } from './components/recency-risk-score'
export { SimplicityScore } from './components/simplicity-score'
export { PopularityScore } from './components/popularity-score'
export { LanguageAffinityScore } from './components/language-affinity-score'
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/domain/services/lcs/__tests__/calculator.test.ts`
Expected: PASS - All 6 tests passing

**Step 5: Commit**

```bash
git add src/domain/services/lcs/calculator.ts src/domain/services/lcs/index.ts src/domain/services/lcs/__tests__/calculator.test.ts
git commit -m "feat(lcs): add LCSCalculator and module exports"
```

---

## Task 10: LGS Placeholder and Final Score

**Files:**
- Create: `src/domain/services/lgs/index.ts`
- Create: `src/domain/services/final-score/index.ts`
- Test: `src/domain/services/lgs/__tests__/index.test.ts`
- Test: `src/domain/services/final-score/__tests__/index.test.ts`

**Step 1: Write the failing tests**

```typescript
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
```

```typescript
// src/domain/services/final-score/__tests__/index.test.ts
import { calculateFinalScores } from '../index'
import type { VersionScore } from '../../lcs/types'

describe('calculateFinalScores', () => {
  const versions: VersionScore[] = [
    {
      version: '1.0.0',
      releaseDate: '2023-01-01T00:00:00.000Z',
      recency: { value: 0.8, weight: 0.25, contribution: 0.2 },
      score: 0.75,
    },
    {
      version: '2.0.0',
      releaseDate: '2024-06-01T00:00:00.000Z',
      recency: { value: 0.4, weight: 0.25, contribution: 0.1 },
      score: 0.50,
    },
  ]

  it('calculates final = lcs × lgs', () => {
    const result = calculateFinalScores(versions, 0.8)

    expect(result.versions[0].final).toBe(0.6) // 0.75 * 0.8
    expect(result.versions[1].final).toBe(0.4) // 0.50 * 0.8
  })

  it('preserves lcs and lgs in output', () => {
    const result = calculateFinalScores(versions, 0.9)

    expect(result.versions[0].lcs).toBe(0.75)
    expect(result.versions[0].lgs).toBe(0.9)
  })

  it('includes formula for transparency', () => {
    const result = calculateFinalScores(versions, 1.0)
    expect(result.formula).toBe('LCS × LGS')
  })

  it('handles LGS = 1.0 (final equals LCS)', () => {
    const result = calculateFinalScores(versions, 1.0)

    expect(result.versions[0].final).toBe(0.75)
    expect(result.versions[1].final).toBe(0.5)
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/domain/services/lgs/__tests__/index.test.ts src/domain/services/final-score/__tests__/index.test.ts`
Expected: FAIL - Cannot find modules

**Step 3: Write the implementation**

```typescript
// src/domain/services/lgs/index.ts
import type { LGSOutput } from '../lcs/types'

/**
 * LLM Generic Score - placeholder returning 1.0 until implemented.
 * Future: hallucination rate, consistency, context awareness, etc.
 */
export function calculateLGS(_llmId: string): LGSOutput {
  return {
    score: 1.0,
    breakdown: null,
  }
}
```

```typescript
// src/domain/services/final-score/index.ts
import type { VersionScore, FinalVersionScore, FSOutput } from '../lcs/types'

/**
 * Final Score = LCS × LGS
 */
export function calculateFinalScores(
  versions: VersionScore[],
  lgsScore: number
): FSOutput {
  return {
    versions: versions.map((v) => ({
      version: v.version,
      lcs: v.score,
      lgs: lgsScore,
      final: Math.round(v.score * lgsScore * 100) / 100,
    })),
    formula: 'LCS × LGS',
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/domain/services/lgs/__tests__/index.test.ts src/domain/services/final-score/__tests__/index.test.ts`
Expected: PASS - All 6 tests passing

**Step 5: Commit**

```bash
git add src/domain/services/lgs/index.ts src/domain/services/final-score/index.ts src/domain/services/lgs/__tests__/index.test.ts src/domain/services/final-score/__tests__/index.test.ts
git commit -m "feat: add LGS placeholder and final score calculator"
```

---

## Task 11: Update Libraries.io Types

**Files:**
- Modify: `src/infrastructure/adapters/libraries-io.ts`

**Step 1: Update the types to include missing fields**

Add `keywords` and `latest_release_published_at` to `LibrariesIoSearchResult` interface (after `rank` field around line 22):

```typescript
  keywords: string[]
  latest_release_published_at: string | null
```

Add same fields to `LibrariesIoProject` interface (after `rank` field around line 40):

```typescript
  keywords: string[]
  latest_release_published_at: string | null
```

**Step 2: Commit**

```bash
git add src/infrastructure/adapters/libraries-io.ts
git commit -m "feat: add keywords and latest_release_published_at to Libraries.io types"
```

---

## Task 12: Create Library Metadata Mapper

**Files:**
- Create: `src/infrastructure/mappers/library-metadata-mapper.ts`
- Test: `src/infrastructure/mappers/__tests__/library-metadata-mapper.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/infrastructure/mappers/__tests__/library-metadata-mapper.test.ts
import { mapToLibraryMetadata } from '../library-metadata-mapper'
import type { LibrariesIoProject } from '../../adapters/libraries-io'

const mockProject: LibrariesIoProject = {
  name: 'test-lib',
  platform: 'NPM',
  description: 'A test library',
  homepage: 'https://example.com',
  repository_url: 'https://github.com/test/test-lib',
  normalized_licenses: ['MIT'],
  rank: 10,
  keywords: ['utility', 'framework'],
  latest_release_number: '2.0.0',
  latest_stable_release_number: '2.0.0',
  latest_stable_release_published_at: '2024-06-01T00:00:00.000Z',
  latest_release_published_at: '2024-06-01T00:00:00.000Z',
  language: 'JavaScript',
  stars: 5000,
  forks: 200,
  dependents_count: 1000,
  versions: [
    { number: '1.0.0', published_at: '2020-01-01T00:00:00.000Z' },
    { number: '1.5.0', published_at: '2022-06-01T00:00:00.000Z' },
    { number: '2.0.0', published_at: '2024-06-01T00:00:00.000Z' },
  ],
}

describe('mapToLibraryMetadata', () => {
  it('maps name correctly', () => {
    const result = mapToLibraryMetadata(mockProject)
    expect(result.name).toBe('test-lib')
  })

  it('maps language correctly', () => {
    const result = mapToLibraryMetadata(mockProject)
    expect(result.language).toBe('JavaScript')
  })

  it('calculates ageInYears from first version', () => {
    const result = mapToLibraryMetadata(mockProject)
    // First version: 2020-01-01, should be ~4-6 years old
    expect(result.ageInYears).toBeGreaterThan(4)
    expect(result.ageInYears).toBeLessThan(7)
  })

  it('counts releases correctly', () => {
    const result = mapToLibraryMetadata(mockProject)
    expect(result.releaseCount).toBe(3)
  })

  it('maps keywords correctly', () => {
    const result = mapToLibraryMetadata(mockProject)
    expect(result.keywords).toEqual(['utility', 'framework'])
  })

  it('maps stars correctly', () => {
    const result = mapToLibraryMetadata(mockProject)
    expect(result.stars).toBe(5000)
  })

  it('maps dependentsCount correctly', () => {
    const result = mapToLibraryMetadata(mockProject)
    expect(result.dependentsCount).toBe(1000)
  })

  it('handles missing language', () => {
    const project = { ...mockProject, language: null }
    const result = mapToLibraryMetadata(project as unknown as LibrariesIoProject)
    expect(result.language).toBe('unknown')
  })

  it('handles empty versions array', () => {
    const project = { ...mockProject, versions: [] }
    const result = mapToLibraryMetadata(project)
    expect(result.ageInYears).toBe(0)
    expect(result.releaseCount).toBe(0)
  })

  it('handles missing keywords', () => {
    const project = { ...mockProject, keywords: undefined as unknown as string[] }
    const result = mapToLibraryMetadata(project)
    expect(result.keywords).toEqual([])
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/infrastructure/mappers/__tests__/library-metadata-mapper.test.ts`
Expected: FAIL - Cannot find module '../library-metadata-mapper'

**Step 3: Write the implementation**

```typescript
// src/infrastructure/mappers/library-metadata-mapper.ts
import type { LibrariesIoProject } from '../adapters/libraries-io'
import type { LibraryMetadata, VersionMetadata } from '../../domain/services/lcs/types'

/**
 * Maps Libraries.io project data to domain LibraryMetadata.
 */
export function mapToLibraryMetadata(project: LibrariesIoProject): LibraryMetadata {
  const versions = project.versions ?? []
  const sortedVersions = [...versions].sort(
    (a, b) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime()
  )

  const firstReleaseDate = sortedVersions[0]
    ? new Date(sortedVersions[0].published_at)
    : null

  const ageInYears = firstReleaseDate
    ? (Date.now() - firstReleaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
    : 0

  return {
    name: project.name,
    language: project.language ?? 'unknown',
    ageInYears,
    releaseCount: versions.length,
    keywords: project.keywords ?? [],
    stars: project.stars ?? 0,
    dependentsCount: project.dependents_count ?? 0,
  }
}

/**
 * Maps Libraries.io versions to domain VersionMetadata array.
 */
export function mapToVersionMetadata(
  versions: Array<{ number: string; published_at: string }>
): VersionMetadata[] {
  return versions.map((v) => ({
    version: v.number,
    releaseDate: new Date(v.published_at),
  }))
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/infrastructure/mappers/__tests__/library-metadata-mapper.test.ts`
Expected: PASS - All 10 tests passing

**Step 5: Commit**

```bash
git add src/infrastructure/mappers/library-metadata-mapper.ts src/infrastructure/mappers/__tests__/library-metadata-mapper.test.ts
git commit -m "feat: add library metadata mapper from Libraries.io to domain types"
```

---

## Task 13: Update /api/score Route

**Files:**
- Modify: `src/app/api/score/route.ts`
- Modify: `src/infrastructure/adapters/libraries-io.ts` (add fetchProject function)

**Step 1: Add fetchProject to libraries-io adapter**

Add after `fetchProjectVersions` function:

```typescript
export async function fetchProject(
  platform: string,
  projectName: string
): Promise<LibrariesIoProject> {
  const key = getApiKey()
  const encodedName = encodeURIComponent(projectName)
  const searchParams = new URLSearchParams({ api_key: key })
  const url = `${BASE_URL}/${platform}/${encodedName}?${searchParams.toString()}`

  const res = await fetch(url, { next: { revalidate: 300 } })

  if (!res.ok) {
    throw new Error(`Libraries.io API error: ${res.status} ${res.statusText}`)
  }

  return res.json()
}
```

**Step 2: Replace the route implementation**

Replace entire contents of `src/app/api/score/route.ts` with:

```typescript
import { NextResponse } from "next/server"
import { fetchAllProviders } from "@/infrastructure/adapters/models-dev"
import { findModelById } from "@/domain/services/llm-service"
import { fetchProject } from "@/infrastructure/adapters/libraries-io"
import { LCSCalculator } from "@/domain/services/lcs"
import { calculateLGS } from "@/domain/services/lgs"
import { calculateFinalScores } from "@/domain/services/final-score"
import { mapToLibraryMetadata, mapToVersionMetadata } from "@/infrastructure/mappers/library-metadata-mapper"
import { logger } from "@/lib/logger"
import { knowledgeCutoffToMs } from "@/lib/date"
import type { ScoreResponse, VersionScore, LCSOutput } from "@/domain/services/lcs/types"

export async function GET(request: Request) {
  const reqStart = Date.now()
  const { searchParams } = new URL(request.url)

  const modelId = searchParams.get("llm")?.trim()
  const libraryName = searchParams.get("library")?.trim()
  const platform = searchParams.get("platform")?.trim() || "NPM"

  const log = logger.child({ route: "/api/score", llm: modelId, library: libraryName, platform })

  log.info("incoming request")

  if (!modelId) {
    return NextResponse.json(
      { error: "llm query parameter is required" },
      { status: 400 }
    )
  }

  if (!libraryName) {
    return NextResponse.json(
      { error: "library query parameter is required" },
      { status: 400 }
    )
  }

  try {
    // Fetch all providers from models.dev API
    const providers = await fetchAllProviders()

    // Find the model by ID
    const model = findModelById(providers, modelId)

    if (!model) {
      log.warn("LLM model not found")
      return NextResponse.json({ error: "LLM not found" }, { status: 404 })
    }

    // Convert knowledge cutoff from "YYYY-MM" to Unix ms
    const cutoffMs = knowledgeCutoffToMs(model.knowledgeCutoff)

    if (!cutoffMs) {
      log.warn("LLM model has no knowledge cutoff date")
      return NextResponse.json(
        { error: "Selected LLM model does not have a knowledge cutoff date" },
        { status: 400 }
      )
    }

    // Fetch project from Libraries.io
    let project
    const fetchStart = Date.now()
    try {
      project = await fetchProject(platform, libraryName)
      log.info(
        { fetchDurationMs: Date.now() - fetchStart, versionCount: project.versions?.length ?? 0 },
        "fetched project from Libraries.io"
      )
    } catch (err) {
      log.error({ err, fetchDurationMs: Date.now() - fetchStart }, "failed to fetch project from Libraries.io")
      return NextResponse.json(
        { error: "Failed to fetch library from external source" },
        { status: 502 }
      )
    }

    // Map to domain types
    const libraryMetadata = mapToLibraryMetadata(project)
    const versions = mapToVersionMetadata(project.versions ?? [])

    if (versions.length === 0) {
      const emptyResponse: ScoreResponse = {
        library: libraryName,
        platform,
        llm: model.name,
        LCS: {
          libraryScore: {
            stability: { value: 0, weight: 0.30, contribution: 0 },
            simplicity: { value: 0, weight: 0.15, contribution: 0 },
            popularity: { value: 0, weight: 0.20, contribution: 0 },
            language: { value: 0, weight: 0.10, contribution: 0 },
          },
          versions: [],
        },
        LGS: { score: 1.0, breakdown: null },
        FS: { versions: [], formula: "LCS × LGS" },
      }
      return NextResponse.json(emptyResponse)
    }

    // Calculate LCS
    const calculator = new LCSCalculator()
    const llmMetadata = {
      id: modelId,
      name: model.name,
      cutoffDate: new Date(cutoffMs),
    }

    const lcsResults = calculator.calculateForLibrary(libraryMetadata, versions, llmMetadata)

    // Build LCS output
    const libraryScore = lcsResults[0]?.libraryBreakdown ?? {
      stability: { value: 0, weight: 0.30, contribution: 0 },
      simplicity: { value: 0, weight: 0.15, contribution: 0 },
      popularity: { value: 0, weight: 0.20, contribution: 0 },
      language: { value: 0, weight: 0.10, contribution: 0 },
    }

    const versionScores: VersionScore[] = lcsResults.map((r) => ({
      version: r.version,
      releaseDate: r.releaseDate,
      recency: r.recencyBreakdown,
      score: r.score,
    }))

    const lcsOutput: LCSOutput = {
      libraryScore,
      versions: versionScores,
    }

    // Calculate LGS (placeholder = 1.0)
    const lgsOutput = calculateLGS(modelId)

    // Calculate Final Scores
    const fsOutput = calculateFinalScores(versionScores, lgsOutput.score)

    const response: ScoreResponse = {
      library: libraryName,
      platform,
      llm: model.name,
      LCS: lcsOutput,
      LGS: lgsOutput,
      FS: fsOutput,
    }

    log.info(
      { totalDurationMs: Date.now() - reqStart, versionCount: versions.length },
      "scoring complete"
    )

    return NextResponse.json(response)
  } catch (err) {
    log.error({ err, totalDurationMs: Date.now() - reqStart }, "unexpected error computing scores")
    return NextResponse.json(
      { error: "Failed to compute scores" },
      { status: 500 }
    )
  }
}
```

**Step 3: Commit**

```bash
git add src/app/api/score/route.ts src/infrastructure/adapters/libraries-io.ts
git commit -m "feat: integrate LCS into /api/score endpoint"
```

---

## Task 14: Clean Up Old Scoring Files

**Files:**
- Delete: `src/domain/services/scoring.ts`
- Delete: `src/domain/services/__tests__/scoring.test.ts`
- Delete: `src/domain/services/version-buckets.ts`
- Delete: `src/domain/services/__tests__/version-buckets.test.ts`
- Delete: `src/domain/services/breaking-changes.ts`
- Delete: `src/domain/services/__tests__/breaking-changes.test.ts`

**Step 1: Remove old files**

```bash
rm src/domain/services/scoring.ts
rm src/domain/services/__tests__/scoring.test.ts
rm src/domain/services/version-buckets.ts
rm src/domain/services/__tests__/version-buckets.test.ts
rm src/domain/services/breaking-changes.ts
rm src/domain/services/__tests__/breaking-changes.test.ts
```

**Step 2: Commit**

```bash
git add -u
git commit -m "chore: remove old scoring system (replaced by LCS)"
```

---

## Task 15: Run Full Test Suite and Verify

**Step 1: Run all tests**

```bash
npm test
```

Expected: All tests pass

**Step 2: Run the dev server and test endpoint**

```bash
npm run dev
# In another terminal:
curl "http://localhost:3000/api/score?llm=claude-3.5-sonnet&library=lodash&platform=NPM"
```

Expected: JSON response with LCS, LGS, and FS structure

**Step 3: Final commit**

```bash
git add .
git commit -m "feat: complete LCS implementation"
```

---

## Summary

| Task | Description | Tests |
|------|-------------|-------|
| 1 | Utility functions | 15 |
| 2 | Type definitions | — |
| 3 | StabilityScore | 5 |
| 4 | RecencyRiskScore | 5 |
| 5 | SimplicityScore | 6 |
| 6 | PopularityScore | 5 |
| 7 | LanguageAffinityScore | 8 |
| 8 | WeightedScoreAggregator | 6 |
| 9 | LCSCalculator | 6 |
| 10 | LGS + Final Score | 6 |
| 11 | Libraries.io types | — |
| 12 | Library metadata mapper | 10 |
| 13 | API route integration | — |
| 14 | Cleanup old files | — |
| 15 | Verification | — |

**Total new tests: ~72**
