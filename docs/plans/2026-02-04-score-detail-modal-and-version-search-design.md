# Score Detail Modal & Version Search Design

**Date:** 2026-02-04
**Status:** Approved
**Scope:** `src/components/version-scores.tsx` and related components, `/api/score` endpoint enrichment

## Problem

The version-scores component currently shows scores as opaque numbers. Users see "61" but don't understand why. This is where Hallunot delivers its core value — explaining *why* a version scored the way it did. We need to make the score breakdown transparent and navigable.

## Features

### 1. Score Detail Dialog

Clicking any `ScoreBadge` opens a Radix Dialog modal with the full score breakdown.

### 2. Version Search Within Buckets

When an expanded bucket has more than 10 versions, an inline search bar appears at the top for filtering by version string.

---

## Backend Changes

### Enriched `/api/score` Response

Three additions to the existing response:

1. **LGS breakdown** — Expand from `{ score: number }` to include component breakdown (capability, limit, recency, openness), each with `value`, `weight`, `contribution`.

2. **Library metadata** — New top-level `libraryMetadata` field: `language`, `stars`, `dependentsCount`, `releaseCount`, `ageInYears`, `keywords[]`.

3. **LLM metadata** — New top-level `llmMetadata` field: `name`, `knowledgeCutoff` (ISO date string), `contextLimit`, `outputLimit`.

### Enriched Response Shape

```typescript
interface ScoreAPIResponse {
  library: string
  platform: string
  llm: string
  libraryMetadata: {
    language: string
    stars: number
    dependentsCount: number
    releaseCount: number
    ageInYears: number
    keywords: string[]
  }
  llmMetadata: {
    name: string
    knowledgeCutoff: string
    contextLimit: number
    outputLimit: number
  }
  LCS: {
    libraryScore: Record<string, ComponentResult>
    versions: LCSVersionScore[]
  }
  LGS: {
    score: number
    breakdown: Record<string, ComponentResult>
  }
  FS: {
    versions: FSVersionScore[]
    formula: string
  }
}
```

---

## Frontend Architecture

### Component Tree

```
version-scores.tsx (orchestrator)
├── VersionBucket (gets search bar)
│   ├── VersionSearchBar (only if versions.length > 10)
│   └── VersionRow
│       └── ScoreBadge (clickable → opens dialog)
│
└── ScoreDetailDialog
    ├── DialogHeader (version + overall score)
    ├── FormulaOverview (LCS × LGS = Final, visual)
    ├── ScoreBreakdownSection (reused for both LCS and LGS)
    │   └── ComponentScoreList (data layer)
    │       └── ComponentBarChart (visualization — swappable)
    └── MetadataContext (library + LLM info)
```

### Decoupled Visualization

The critical design decision: visualization is decoupled from data via a render prop / strategy pattern.

```typescript
interface ScoreComponent {
  id: string
  label: string
  value: number        // 0-1 raw
  weight: number       // 0-1 weight
  contribution: number // value × weight
  description: string  // human-readable explanation
}

interface ComponentScoreListProps {
  components: ScoreComponent[]
  renderVisualization?: (components: ScoreComponent[]) => ReactNode
}
```

Default visualization: `ComponentBarChart` (horizontal stacked bar segments). Can be swapped to table, radial chart, or anything else without touching the data layer.

### Score Detail Dialog Layout

Four sections, top to bottom:

1. **Header** — Version number, overall ScoreBadge, risk label.

2. **Formula Overview** — Visual equation: `LCS (0.72)` × `LGS (0.85)` = `Final (61)`. Each box color-tinted by value. LCS/LGS labels anchor-link to their breakdown sections below.

3. **LCS Breakdown** — Two subsections:
   - *Library-wide factors* (identical across versions): stability, simplicity, popularity, language. Horizontal bar + raw value + weight + contextual description (e.g., "17.8 releases/year -> moderate volatility").
   - *Version-specific factor*: recency. Bar + context: "Released Mar 2024, cutoff Jan 2025 -> 10 months before cutoff -> value 0.71."

4. **LGS Breakdown** — capability, limit, recency, openness. Same bar visualization. Descriptions like "Supports 5/6 features" or "Context: 200k tokens."

5. **Metadata Footer** — Two columns: Library info (language, stars, dependents, age) and LLM info (name, cutoff date, limits). Small, muted reference data.

**Dialog specs:** `@radix-ui/react-dialog`, max-width ~600px, internal scroll via `@radix-ui/react-scroll-area`.

### Version Search Bar

Appears inside expanded buckets with 10+ versions.

```typescript
interface VersionSearchBarProps {
  value: string
  onChange: (value: string) => void
  totalCount: number
  filteredCount: number
}
```

- Substring match on version string
- Instant filtering (local state, no debounce)
- Count indicator: "Showing 3 of 47 versions"
- Clear button (X)
- Plain `<input>` with Tailwind styling, `Search` icon from lucide-react

### Data Flow Changes in `version-scores.tsx`

**New state:**

```typescript
const [libraryScore, setLibraryScore] = useState<Record<string, ComponentResult> | null>(null)
const [lgsBreakdown, setLgsBreakdown] = useState<Record<string, ComponentResult> | null>(null)
const [libraryMetadata, setLibraryMetadata] = useState<LibraryMetadata | null>(null)
const [llmMetadata, setLlmMetadata] = useState<LlmMetadata | null>(null)
const [dialogVersion, setDialogVersion] = useState<DisplayVersion | null>(null)
const [searchQueries, setSearchQueries] = useState<Map<number, string>>(new Map())
```

**DisplayVersion gains fields:**

```typescript
interface DisplayVersion {
  version: string
  releaseDate: number
  score: number
  risk: RiskLevel
  recencyContribution: number
  // New:
  lcsScore: number
  lgsScore: number
  recencyDetail: { value: number; weight: number; contribution: number }
}
```

**Dialog open/close:** `dialogVersion` non-null = open. Set on badge click, clear on dialog close.

**Search:** `searchQueries` Map keyed by major version number. Filter versions array before rendering.

### What Stays the Same

- Bucket grouping logic
- Expand/collapse logic
- Loading/error/empty states
- Overall layout structure

---

## New Dependencies

- `@radix-ui/react-dialog` — for the score detail modal

---

## Implementation Order

1. Backend: Surface LGS breakdown from LGSCalculator
2. Backend: Add `libraryMetadata` and `llmMetadata` to API response
3. Frontend: Install `@radix-ui/react-dialog`
4. Frontend: Build `ScoreComponent` data types and `ComponentBarChart` visualization
5. Frontend: Build `ComponentScoreList` with render prop pattern
6. Frontend: Build `ScoreDetailDialog` composing the above
7. Frontend: Build `VersionSearchBar`
8. Frontend: Update `version-scores.tsx` — enriched state, clickable badges, search integration
