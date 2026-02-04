# LLM Generic Score (LGS) Implementation

## Overview

Implement the LGS as a real scoring system, replacing the current placeholder that returns `1.0`. The LGS evaluates LLM capability and reliability based on public metadata, mirroring the LCS architecture (pluggable components, `ScoreComponent<T>` interface, `WeightedScoreAggregator`).

Also refactor `LCSCalculator` to use `WeightedScoreAggregator` for consistency.

## Formula

LGS = 0.40 x Capability + 0.20 x Limit + 0.25 x Recency + 0.15 x Openness

4 components, all normalized to [0, 1], weights sum to 1.0.

## File Structure

```
src/domain/services/lgs/
├── types.ts                    # LGSContext
├── index.ts                    # calculateLGS() updated
├── calculator.ts               # LGSCalculator using WeightedScoreAggregator
├── components/
│   ├── capability-score.ts     # 0.40 — binary feature signals
│   ├── limit-score.ts          # 0.20 — context/output limits (log-scaled)
│   ├── recency-score.ts        # 0.25 — knowledge cutoff + last updated
│   └── openness-score.ts       # 0.15 — open weights + API compatibility
└── __tests__/
    ├── calculator.test.ts
    ├── capability-score.test.ts
    ├── limit-score.test.ts
    ├── recency-score.test.ts
    └── openness-score.test.ts
```

## Component Specifications

### 1. Capability Score (weight: 0.40)

Counts binary capability signals declared by the model:

- `reasoning` (boolean)
- `toolCall` (boolean)
- `structuredOutput` (boolean)
- `attachment` (boolean)
- multimodal input — `modalities.input.length > 1`
- multimodal output — `modalities.output.length > 1`

Score = count of true signals / 6

### 2. Limit Score (weight: 0.20)

Log-scaled operational capacity:

- `contextScore = normalizeLog(contextLimit, { max: 2_000_000 })`
- `outputScore = normalizeLog(outputLimit, { max: 200_000 })`
- Score = `contextScore * 0.6 + outputScore * 0.4`

Uses existing `normalizeLog` from `lcs/utils.ts`.

### 3. Recency Score (weight: 0.25)

How modern and maintained the model is:

- Reference range: Jan 2020 to now
- `cutoffScore = normalize(monthsSinceEpoch(cutoff), { min: months(2020-01), max: months(now) })`
- `updatedScore = normalize(monthsSinceEpoch(lastUpdated), same range)`
- Score = `cutoffScore * 0.7 + updatedScore * 0.3`
- Missing dates default to 0.3

### 4. Openness Score (weight: 0.15)

Transparency and ecosystem signals:

- `openWeights === true` contributes 0.7
- API compatibility (provider npm package contains "openai-compatible") contributes 0.3
- Score = sum of applicable parts
- All false/missing = 0.0

## Data Model Changes

### Add to `LlmModel` (src/domain/models/llm.ts)

```ts
openWeights?: boolean
```

### Add to mapper (src/infrastructure/mappers/models-dev-mapper.ts)

Map `dto.open_weights` to `openWeights`.

### New type: LGSContext (src/domain/services/lgs/types.ts)

```ts
interface LGSContext {
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
    apiCompatibility: string  // provider npm package
  }
}
```

### Update LGSOutput breakdown (src/domain/services/lcs/types.ts)

Change `LGSOutput.breakdown` from `Record<string, number> | null` to:

```ts
interface LGSScoreBreakdown {
  capability: ComponentResult
  limit: ComponentResult
  recency: ComponentResult
  openness: ComponentResult
}

interface LGSOutput {
  score: number
  breakdown: LGSScoreBreakdown | null
}
```

## LCS Refactor: Use WeightedScoreAggregator

Refactor `LCSCalculator` to use `WeightedScoreAggregator<LCSContext>` instead of manually computing contributions. Same components, same results, but delegated to the aggregator for consistency with LGS.

Note: LCS has a split structure (4 library-wide + 1 per-version component). The aggregator runs all 5 together for each version, but the output still separates library breakdown from version-specific recency.

## API Route Changes (src/app/api/score/route.ts)

- Pass full `LlmModel` + provider info to `calculateLGS()` instead of just ID
- Build `LGSContext` from model fields
- Update empty response fallback to match new `LGSOutput` structure

## Implementation Order

1. Add `openWeights` to `LlmModel` + mapper
2. Create `lgs/types.ts` with `LGSContext`
3. Implement 4 LGS components with tests
4. Implement `LGSCalculator` using `WeightedScoreAggregator`
5. Update `calculateLGS()` entry point
6. Update `LGSOutput` type and `LGSScoreBreakdown`
7. Refactor `LCSCalculator` to use `WeightedScoreAggregator`
8. Update API route to pass model data to LGS
9. Update existing LGS and final-score tests
