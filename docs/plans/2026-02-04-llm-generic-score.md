# LLM Generic Score (LGS) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the LGS placeholder (returns 1.0) with a real 4-component scoring system that evaluates LLM capability from public metadata, and refactor LCS to use WeightedScoreAggregator for consistency.

**Architecture:** Each LGS component implements `ScoreComponent<LGSContext>` (same interface as LCS). An `LGSCalculator` composes them via `WeightedScoreAggregator`. The API route builds `LGSContext` from `LlmModel` + provider data and passes it to the calculator. LCS calculator is also refactored to use the same aggregator pattern.

**Tech Stack:** TypeScript, Vitest, Next.js App Router, models.dev API

---

## Task 1: Add `openWeights` to LlmModel and mapper

**Files:**
- Modify: `src/domain/models/llm.ts:11-39` (LlmModel interface)
- Modify: `src/infrastructure/mappers/models-dev-mapper.ts:16-44` (mapModel function)

**Step 1: Add field to LlmModel**

In `src/domain/models/llm.ts`, add `openWeights` after `temperature`:

```ts
  temperature?: boolean
  openWeights?: boolean
  modalities?: {
```

**Step 2: Map field in mapper**

In `src/infrastructure/mappers/models-dev-mapper.ts`, add `openWeights` mapping in the `mapModel` return object, after `temperature`:

```ts
    temperature: dto.temperature,
    openWeights: dto.open_weights,
    modalities: dto.modalities,
```

**Step 3: Run existing tests to verify no regressions**

Run: `vitest run`
Expected: All existing tests pass (additive change only).

**Step 4: Commit**

```bash
git add src/domain/models/llm.ts src/infrastructure/mappers/models-dev-mapper.ts
git commit -m "feat(lgs): add openWeights field to LlmModel and mapper"
```

---

## Task 2: Create LGS types and update LGSOutput

**Files:**
- Create: `src/domain/services/lgs/types.ts`
- Modify: `src/domain/services/lcs/types.ts:82-86` (LGSOutput)

**Step 1: Create `src/domain/services/lgs/types.ts`**

```ts
// src/domain/services/lgs/types.ts
import type { ScoreComponent } from '../lcs/types'

/**
 * Context for LGS calculations.
 * Contains all LLM metadata needed by score components.
 */
export interface LGSContext {
  model: {
    reasoning: boolean
    toolCall: boolean
    structuredOutput: boolean
    attachment: boolean
    modalities: { input: string[]; output: string[] }
    contextLimit: number
    outputLimit: number
    knowledgeCutoff?: Date
    lastUpdated?: Date
    openWeights: boolean
    apiCompatibility: string
  }
}

/**
 * Type alias for LGS-specific score components.
 */
export type LGSScoreComponent = ScoreComponent<LGSContext>
```

**Step 2: Update LGSOutput in `src/domain/services/lcs/types.ts`**

Replace the existing `LGSOutput` interface (lines 82-86):

```ts
/**
 * Breakdown of LGS score components.
 */
export interface LGSScoreBreakdown {
  capability: ComponentResult
  limit: ComponentResult
  recency: ComponentResult
  openness: ComponentResult
}

/**
 * LGS (LLM Generic Score) output structure.
 */
export interface LGSOutput {
  score: number
  breakdown: LGSScoreBreakdown | null
}
```

**Step 3: Run tests to verify compilation (some LGS tests will fail, that's expected)**

Run: `vitest run`
Expected: LCS tests pass. The LGS placeholder test (`returns null breakdown`) still passes since breakdown is still `null`-able.

**Step 4: Commit**

```bash
git add src/domain/services/lgs/types.ts src/domain/services/lcs/types.ts
git commit -m "feat(lgs): add LGSContext type and LGSScoreBreakdown to types"
```

---

## Task 3: Implement Capability Score component

**Files:**
- Create: `src/domain/services/lgs/components/capability-score.ts`
- Create: `src/domain/services/lgs/__tests__/capability-score.test.ts`

**Step 1: Write the failing tests**

Create `src/domain/services/lgs/__tests__/capability-score.test.ts`:

```ts
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
    // 1 signal out of 6
    expect(scorer.calculate(ctx)).toBeCloseTo(1 / 6, 2)
  })

  it('counts multimodal output as a signal', () => {
    const ctx = makeCtx({
      modalities: { input: ['text'], output: ['text', 'image'] },
    })
    expect(scorer.calculate(ctx)).toBeCloseTo(1 / 6, 2)
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `vitest run src/domain/services/lgs/__tests__/capability-score.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement the component**

Create `src/domain/services/lgs/components/capability-score.ts`:

```ts
// src/domain/services/lgs/components/capability-score.ts
import type { LGSContext, LGSScoreComponent } from '../types'

/**
 * Measures breadth of declared model capabilities.
 * Counts binary feature signals: reasoning, tool calling, structured output,
 * attachments, multimodal input, multimodal output.
 * Score = count / 6 (total possible signals).
 */
export class CapabilityScore implements LGSScoreComponent {
  readonly id = 'capability'
  readonly weight = 0.40

  calculate(ctx: LGSContext): number {
    const { model } = ctx
    let count = 0

    if (model.reasoning) count++
    if (model.toolCall) count++
    if (model.structuredOutput) count++
    if (model.attachment) count++
    if (model.modalities.input.length > 1) count++
    if (model.modalities.output.length > 1) count++

    return count / 6
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `vitest run src/domain/services/lgs/__tests__/capability-score.test.ts`
Expected: All 6 tests PASS.

**Step 5: Commit**

```bash
git add src/domain/services/lgs/components/capability-score.ts src/domain/services/lgs/__tests__/capability-score.test.ts
git commit -m "feat(lgs): implement CapabilityScore component with tests"
```

---

## Task 4: Implement Limit Score component

**Files:**
- Create: `src/domain/services/lgs/components/limit-score.ts`
- Create: `src/domain/services/lgs/__tests__/limit-score.test.ts`

**Step 1: Write the failing tests**

Create `src/domain/services/lgs/__tests__/limit-score.test.ts`:

```ts
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
```

**Step 2: Run tests to verify they fail**

Run: `vitest run src/domain/services/lgs/__tests__/limit-score.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement the component**

Create `src/domain/services/lgs/components/limit-score.ts`:

```ts
// src/domain/services/lgs/components/limit-score.ts
import type { LGSContext, LGSScoreComponent } from '../types'
import { normalizeLog } from '../../lcs/utils'

/**
 * Measures operational capacity via context window and output limit.
 * Log-scaled to avoid extreme bias toward very large models.
 * Score = contextScore * 0.6 + outputScore * 0.4
 */
export class LimitScore implements LGSScoreComponent {
  readonly id = 'limit'
  readonly weight = 0.20

  calculate(ctx: LGSContext): number {
    const { contextLimit, outputLimit } = ctx.model

    const contextScore = normalizeLog(contextLimit, { max: 2_000_000 })
    const outputScore = normalizeLog(outputLimit, { max: 200_000 })

    return contextScore * 0.6 + outputScore * 0.4
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `vitest run src/domain/services/lgs/__tests__/limit-score.test.ts`
Expected: All 5 tests PASS.

**Step 5: Commit**

```bash
git add src/domain/services/lgs/components/limit-score.ts src/domain/services/lgs/__tests__/limit-score.test.ts
git commit -m "feat(lgs): implement LimitScore component with tests"
```

---

## Task 5: Implement Recency Score component

**Files:**
- Create: `src/domain/services/lgs/components/recency-score.ts`
- Create: `src/domain/services/lgs/__tests__/recency-score.test.ts`

**Step 1: Write the failing tests**

Create `src/domain/services/lgs/__tests__/recency-score.test.ts`:

```ts
// src/domain/services/lgs/__tests__/recency-score.test.ts
import { RecencyScore } from '../components/recency-score'
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
      openWeights: false,
      apiCompatibility: '',
      ...overrides,
    },
  }
}

describe('RecencyScore', () => {
  const scorer = new RecencyScore()

  it('has id "recency" and weight 0.25', () => {
    expect(scorer.id).toBe('recency')
    expect(scorer.weight).toBe(0.25)
  })

  it('returns 0.3 when both dates are missing', () => {
    const ctx = makeCtx({ knowledgeCutoff: undefined, lastUpdated: undefined })
    expect(scorer.calculate(ctx)).toBeCloseTo(0.3, 5)
  })

  it('returns high score for very recent cutoff and update', () => {
    const recent = new Date()
    recent.setMonth(recent.getMonth() - 1)
    const ctx = makeCtx({ knowledgeCutoff: recent, lastUpdated: recent })
    expect(scorer.calculate(ctx)).toBeGreaterThan(0.8)
  })

  it('returns low score for very old cutoff (2020-01)', () => {
    const old = new Date('2020-01-01')
    const ctx = makeCtx({ knowledgeCutoff: old, lastUpdated: old })
    expect(scorer.calculate(ctx)).toBeLessThan(0.15)
  })

  it('weights cutoff at 70% and lastUpdated at 30%', () => {
    const recent = new Date()
    recent.setMonth(recent.getMonth() - 1)
    const old = new Date('2020-01-01')

    const recentCutoffOldUpdate = makeCtx({ knowledgeCutoff: recent, lastUpdated: old })
    const oldCutoffRecentUpdate = makeCtx({ knowledgeCutoff: old, lastUpdated: recent })

    // Recent cutoff should yield higher score than recent update alone
    expect(scorer.calculate(recentCutoffOldUpdate)).toBeGreaterThan(
      scorer.calculate(oldCutoffRecentUpdate)
    )
  })

  it('uses 0.3 default when only cutoff is present', () => {
    const recent = new Date()
    recent.setMonth(recent.getMonth() - 1)
    const withBoth = makeCtx({ knowledgeCutoff: recent, lastUpdated: recent })
    const withoutUpdated = makeCtx({ knowledgeCutoff: recent, lastUpdated: undefined })

    // Without lastUpdated defaults to 0.3, so score should be lower
    expect(scorer.calculate(withoutUpdated)).toBeLessThan(scorer.calculate(withBoth))
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `vitest run src/domain/services/lgs/__tests__/recency-score.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement the component**

Create `src/domain/services/lgs/components/recency-score.ts`:

```ts
// src/domain/services/lgs/components/recency-score.ts
import type { LGSContext, LGSScoreComponent } from '../types'
import { normalize } from '../../lcs/utils'

const REFERENCE_START = new Date('2020-01-01')
const DEFAULT_SCORE = 0.3

/**
 * Estimates how modern and actively maintained a model is.
 * Combines knowledge cutoff (70%) with last updated date (30%).
 * Reference range: Jan 2020 to current date.
 * Missing dates default to 0.3.
 */
export class RecencyScore implements LGSScoreComponent {
  readonly id = 'recency'
  readonly weight = 0.25

  calculate(ctx: LGSContext): number {
    const { knowledgeCutoff, lastUpdated } = ctx.model

    const now = new Date()
    const minMonths = this.monthsSinceEpoch(REFERENCE_START)
    const maxMonths = this.monthsSinceEpoch(now)

    const cutoffScore = knowledgeCutoff
      ? normalize(this.monthsSinceEpoch(knowledgeCutoff), { min: minMonths, max: maxMonths })
      : DEFAULT_SCORE

    const updatedScore = lastUpdated
      ? normalize(this.monthsSinceEpoch(lastUpdated), { min: minMonths, max: maxMonths })
      : DEFAULT_SCORE

    return cutoffScore * 0.7 + updatedScore * 0.3
  }

  private monthsSinceEpoch(date: Date): number {
    return date.getFullYear() * 12 + date.getMonth()
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `vitest run src/domain/services/lgs/__tests__/recency-score.test.ts`
Expected: All 6 tests PASS.

**Step 5: Commit**

```bash
git add src/domain/services/lgs/components/recency-score.ts src/domain/services/lgs/__tests__/recency-score.test.ts
git commit -m "feat(lgs): implement RecencyScore component with tests"
```

---

## Task 6: Implement Openness Score component

**Files:**
- Create: `src/domain/services/lgs/components/openness-score.ts`
- Create: `src/domain/services/lgs/__tests__/openness-score.test.ts`

**Step 1: Write the failing tests**

Create `src/domain/services/lgs/__tests__/openness-score.test.ts`:

```ts
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
```

**Step 2: Run tests to verify they fail**

Run: `vitest run src/domain/services/lgs/__tests__/openness-score.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement the component**

Create `src/domain/services/lgs/components/openness-score.ts`:

```ts
// src/domain/services/lgs/components/openness-score.ts
import type { LGSContext, LGSScoreComponent } from '../types'

/**
 * Measures transparency and ecosystem friendliness.
 * Open weights contribute 0.7, API compatibility contributes 0.3.
 */
export class OpennessScore implements LGSScoreComponent {
  readonly id = 'openness'
  readonly weight = 0.15

  calculate(ctx: LGSContext): number {
    const { openWeights, apiCompatibility } = ctx.model
    let score = 0

    if (openWeights) {
      score += 0.7
    }

    if (apiCompatibility.includes('openai-compatible')) {
      score += 0.3
    }

    return score
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `vitest run src/domain/services/lgs/__tests__/openness-score.test.ts`
Expected: All 7 tests PASS.

**Step 5: Commit**

```bash
git add src/domain/services/lgs/components/openness-score.ts src/domain/services/lgs/__tests__/openness-score.test.ts
git commit -m "feat(lgs): implement OpennessScore component with tests"
```

---

## Task 7: Implement LGSCalculator and update calculateLGS entry point

**Files:**
- Create: `src/domain/services/lgs/calculator.ts`
- Modify: `src/domain/services/lgs/index.ts`
- Create: `src/domain/services/lgs/__tests__/calculator.test.ts`
- Modify: `src/domain/services/lgs/__tests__/index.test.ts`

**Step 1: Write the failing calculator test**

Create `src/domain/services/lgs/__tests__/calculator.test.ts`:

```ts
// src/domain/services/lgs/__tests__/calculator.test.ts
import { LGSCalculator } from '../calculator'
import type { LGSContext } from '../types'

const fullCapabilityModel: LGSContext = {
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

describe('LGSCalculator', () => {
  const calculator = new LGSCalculator()

  it('returns high score for fully capable model', () => {
    const result = calculator.calculate(fullCapabilityModel)
    expect(result.score).toBeGreaterThan(0.8)
  })

  it('returns low score for minimal model', () => {
    const result = calculator.calculate(minimalModel)
    expect(result.score).toBeLessThan(0.3)
  })

  it('returns breakdown with all 4 components', () => {
    const result = calculator.calculate(fullCapabilityModel)

    expect(result.breakdown).toHaveLength(4)
    const ids = result.breakdown.map((b) => b.id)
    expect(ids).toContain('capability')
    expect(ids).toContain('limit')
    expect(ids).toContain('recency')
    expect(ids).toContain('openness')
  })

  it('weights sum to 1.0', () => {
    const result = calculator.calculate(fullCapabilityModel)
    const totalWeight = result.breakdown.reduce((sum, b) => sum + b.weight, 0)
    expect(totalWeight).toBeCloseTo(1.0, 3)
  })

  it('score equals sum of contributions', () => {
    const result = calculator.calculate(fullCapabilityModel)
    const sumContributions = result.breakdown.reduce((sum, b) => sum + b.contribution, 0)
    expect(result.score).toBeCloseTo(sumContributions, 2)
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `vitest run src/domain/services/lgs/__tests__/calculator.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement LGSCalculator**

Create `src/domain/services/lgs/calculator.ts`:

```ts
// src/domain/services/lgs/calculator.ts
import { WeightedScoreAggregator } from '../lcs/aggregator'
import type { AggregatorResult } from '../lcs/aggregator'
import { CapabilityScore } from './components/capability-score'
import { LimitScore } from './components/limit-score'
import { RecencyScore } from './components/recency-score'
import { OpennessScore } from './components/openness-score'
import type { LGSContext } from './types'

/**
 * Calculates LLM Generic Score using WeightedScoreAggregator.
 * Composes 4 components: capability, limit, recency, openness.
 */
export class LGSCalculator {
  private readonly aggregator: WeightedScoreAggregator<LGSContext>

  constructor() {
    this.aggregator = new WeightedScoreAggregator<LGSContext>([
      new CapabilityScore(),
      new LimitScore(),
      new RecencyScore(),
      new OpennessScore(),
    ])
  }

  calculate(context: LGSContext): AggregatorResult {
    return this.aggregator.calculate(context)
  }
}
```

**Step 4: Run calculator tests**

Run: `vitest run src/domain/services/lgs/__tests__/calculator.test.ts`
Expected: All 5 tests PASS.

**Step 5: Update `calculateLGS()` entry point**

Replace `src/domain/services/lgs/index.ts` with:

```ts
// src/domain/services/lgs/index.ts
import type { LGSOutput, LGSScoreBreakdown, ComponentResult } from '../lcs/types'
import type { LGSContext } from './types'
import { LGSCalculator } from './calculator'
import type { ComponentBreakdown } from '../lcs/aggregator'

const calculator = new LGSCalculator()

function toComponentResult(b: ComponentBreakdown): ComponentResult {
  return {
    value: b.rawValue,
    weight: b.weight,
    contribution: b.contribution,
  }
}

/**
 * Calculates LLM Generic Score from model metadata.
 */
export function calculateLGS(context: LGSContext): LGSOutput {
  const result = calculator.calculate(context)

  const findComponent = (id: string) =>
    result.breakdown.find((b) => b.id === id)!

  const breakdown: LGSScoreBreakdown = {
    capability: toComponentResult(findComponent('capability')),
    limit: toComponentResult(findComponent('limit')),
    recency: toComponentResult(findComponent('recency')),
    openness: toComponentResult(findComponent('openness')),
  }

  return {
    score: Math.round(result.score * 100) / 100,
    breakdown,
  }
}
```

**Step 6: Update `src/domain/services/lgs/__tests__/index.test.ts`**

Replace the placeholder tests with:

```ts
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
```

**Step 7: Run all LGS tests**

Run: `vitest run src/domain/services/lgs/`
Expected: All tests PASS.

**Step 8: Commit**

```bash
git add src/domain/services/lgs/
git commit -m "feat(lgs): implement LGSCalculator and update calculateLGS entry point"
```

---

## Task 8: Refactor LCSCalculator to use WeightedScoreAggregator

**Files:**
- Modify: `src/domain/services/lcs/calculator.ts`

**Step 1: Run existing LCS tests as baseline**

Run: `vitest run src/domain/services/lcs/__tests__/calculator.test.ts`
Expected: All 6 tests PASS.

**Step 2: Refactor LCSCalculator**

Replace `src/domain/services/lcs/calculator.ts` with:

```ts
// src/domain/services/lcs/calculator.ts
import { WeightedScoreAggregator } from './aggregator'
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
 * Uses WeightedScoreAggregator for consistent weighted scoring.
 */
export class LCSCalculator {
  private readonly aggregator: WeightedScoreAggregator<LCSContext>

  constructor() {
    this.aggregator = new WeightedScoreAggregator<LCSContext>([
      new StabilityScore(),
      new SimplicityScore(),
      new PopularityScore(),
      new LanguageAffinityScore(),
      new RecencyRiskScore(),
    ])
  }

  calculateForVersion(
    library: LibraryMetadata,
    version: VersionMetadata,
    llm: LLMMetadata
  ): VersionCalculationResult {
    const context: LCSContext = { library, version, llm }
    const result = this.aggregator.calculate(context)

    const find = (id: string) => {
      const b = result.breakdown.find((c) => c.id === id)!
      return { value: b.rawValue, weight: b.weight, contribution: b.contribution }
    }

    const libraryBreakdown: LibraryScoreBreakdown = {
      stability: find('stability'),
      simplicity: find('simplicity'),
      popularity: find('popularity'),
      language: find('language'),
    }

    const recencyBreakdown: ComponentResult = find('recency')

    return {
      version: version.version,
      releaseDate: version.releaseDate.toISOString(),
      score: Math.round(result.score * 100) / 100,
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

**Step 3: Run LCS tests to verify no regressions**

Run: `vitest run src/domain/services/lcs/__tests__/calculator.test.ts`
Expected: All 6 tests PASS (same behavior, different internal wiring).

**Step 4: Run full test suite**

Run: `vitest run`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add src/domain/services/lcs/calculator.ts
git commit -m "refactor(lcs): use WeightedScoreAggregator in LCSCalculator"
```

---

## Task 9: Update API route to use real LGS

**Files:**
- Modify: `src/app/api/score/route.ts`

**Step 1: Update the API route**

In `src/app/api/score/route.ts`, make these changes:

1. Change the import from `import { calculateLGS } from "@/domain/services/lgs"` to:
```ts
import { calculateLGS } from "@/domain/services/lgs"
import type { LGSContext } from "@/domain/services/lgs/types"
```

2. After finding the model and provider, before the Libraries.io fetch, find the provider to get the npm package:

In the try block, after `const model = findModelById(providers, modelId)` and the model-not-found check, add logic to find the provider. The model ID format is `providerId/modelId`, so extract providerId:

```ts
    // Extract provider info for LGS context
    const providerIdFromModel = modelId.split('/')[0]
    const provider = providers.find((p) => p.id === providerIdFromModel)
```

3. Replace the line `const lgsOutput = calculateLGS(modelId)` with:

```ts
    // Calculate LGS
    const lgsContext: LGSContext = {
      model: {
        reasoning: model.reasoning ?? false,
        toolCall: model.toolCall ?? false,
        structuredOutput: model.structuredOutput ?? false,
        attachment: model.attachment ?? false,
        modalities: model.modalities ?? { input: ['text'], output: ['text'] },
        contextLimit: model.limit?.context ?? 0,
        outputLimit: model.limit?.output ?? 0,
        knowledgeCutoff: cutoffMs ? new Date(cutoffMs) : undefined,
        lastUpdated: model.lastUpdated ? new Date(model.lastUpdated) : undefined,
        openWeights: model.openWeights ?? false,
        apiCompatibility: provider?.npm ?? '',
      },
    }
    const lgsOutput = calculateLGS(lgsContext)
```

4. Update the empty response LGS fallback (around line 97) from `LGS: { score: 1.0, breakdown: null }` to:

```ts
        LGS: { score: 0, breakdown: null },
```

**Step 2: Run the full test suite**

Run: `vitest run`
Expected: All tests pass.

**Step 3: Commit**

```bash
git add src/app/api/score/route.ts
git commit -m "feat(lgs): wire real LGS calculation into API route"
```

---

## Task 10: Update final-score tests and run full verification

**Files:**
- Modify: `src/domain/services/final-score/__tests__/index.test.ts` (if needed)

**Step 1: Run full test suite to check for any remaining issues**

Run: `vitest run`
Expected: All tests pass. The final-score tests should still pass since they test the `calculateFinalScores` function directly with numeric inputs (not dependent on LGS signature changes).

**Step 2: If any tests fail, fix them**

The final-score tests pass `lgsScore: number` directly, so they should be unaffected. If any type issues arise, adjust accordingly.

**Step 3: Final commit (if any fixes were needed)**

```bash
git add -A
git commit -m "fix(lgs): update tests for new LGS integration"
```

**Step 4: Run full test suite one final time**

Run: `vitest run`
Expected: All tests pass. LGS is fully implemented.
