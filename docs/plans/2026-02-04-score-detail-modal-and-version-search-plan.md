# Score Detail Modal & Version Search — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make version scores transparent by adding a detail dialog showing full score breakdown (LCS, LGS, metadata) and an inline search bar for large version buckets.

**Architecture:** Enrich the `/api/score` response with `libraryMetadata`, `llmMetadata`, and LGS breakdown. Build decoupled frontend components where visualization (horizontal bars) is swappable via render prop. Use Radix Dialog for the modal.

**Tech Stack:** Next.js App Router, Radix UI Dialog + ScrollArea, Tailwind CSS, lucide-react icons, framer-motion (existing).

---

### Task 1: Enrich ScoreResponse type with libraryMetadata and llmMetadata

**Files:**
- Modify: `src/domain/services/lcs/types.ts` (lines 116-126)

**Step 1: Add metadata interfaces and update ScoreResponse**

Add these interfaces before the `ScoreResponse` interface (before line 116), and update `ScoreResponse` to include the new fields:

```typescript
/**
 * Library metadata included in API response for UI context.
 */
export interface LibraryMetadataResponse {
  language: string
  stars: number
  dependentsCount: number
  releaseCount: number
  ageInYears: number
  keywords: string[]
}

/**
 * LLM metadata included in API response for UI context.
 */
export interface LLMMetadataResponse {
  name: string
  knowledgeCutoff: string
  contextLimit: number
  outputLimit: number
}
```

Then update `ScoreResponse` (line 119-126) to:

```typescript
export interface ScoreResponse {
  library: string
  platform: string
  llm: string
  libraryMetadata: LibraryMetadataResponse
  llmMetadata: LLMMetadataResponse
  LCS: LCSOutput
  LGS: LGSOutput
  FS: FSOutput
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Type errors in `src/app/api/score/route.ts` because the route doesn't yet provide the new fields. That's expected — we fix it in Task 2.

**Step 3: Commit**

```bash
git add src/domain/services/lcs/types.ts
git commit -m "feat(types): add libraryMetadata and llmMetadata to ScoreResponse"
```

---

### Task 2: Add metadata to the /api/score route response

**Files:**
- Modify: `src/app/api/score/route.ts` (lines 89-104 for empty response, lines 159-166 for main response)

**Step 1: Build metadata objects and include them in both response paths**

In the route handler, after `const llmMetadata` (line 110-114), the variable name `llmMetadata` is already used for LCS. Rename it to `llmForLcs` to avoid collision, then build the response metadata objects.

After `const versions = mapToVersionMetadata(...)` (line 86), add:

```typescript
const libraryMeta: LibraryMetadataResponse = {
  language: libraryMetadata.language,
  stars: libraryMetadata.stars,
  dependentsCount: libraryMetadata.dependentsCount,
  releaseCount: libraryMetadata.releaseCount,
  ageInYears: Math.round(libraryMetadata.ageInYears * 10) / 10,
  keywords: libraryMetadata.keywords,
}
```

After the LGS context construction (after line 153), add:

```typescript
const llmMeta: LLMMetadataResponse = {
  name: model.name,
  knowledgeCutoff: model.knowledgeCutoff ?? '',
  contextLimit: model.limit?.context ?? 0,
  outputLimit: model.limit?.output ?? 0,
}
```

Update the empty response (lines 89-105) to include:

```typescript
const emptyResponse: ScoreResponse = {
  library: libraryName,
  platform,
  llm: model.name,
  libraryMetadata: libraryMeta,
  llmMetadata: llmMeta,
  LCS: { ... },  // keep existing
  LGS: { score: 0, breakdown: null },
  FS: { versions: [], formula: "LCS × LGS" },
}
```

Note: For the empty response path, `libraryMeta` is constructed before the empty check, but `llmMeta` is constructed after. Move the `llmMeta` construction to right after `cutoffMs` is validated (after line 65), so both paths can use it. This requires having `model.limit` and `model.knowledgeCutoff` available, which they are since `model` is fetched at line 45.

Update the main response (lines 159-166) to include both metadata fields:

```typescript
const response: ScoreResponse = {
  library: libraryName,
  platform,
  llm: model.name,
  libraryMetadata: libraryMeta,
  llmMetadata: llmMeta,
  LCS: lcsOutput,
  LGS: lgsOutput,
  FS: fsOutput,
}
```

Add the import at the top:

```typescript
import type { ScoreResponse, VersionScore, LCSOutput, LibraryMetadataResponse, LLMMetadataResponse } from "@/domain/services/lcs/types"
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No type errors (or only frontend errors from the component not yet updated).

**Step 3: Run existing tests**

Run: `npx vitest run 2>&1 | tail -20`
Expected: All existing tests pass.

**Step 4: Commit**

```bash
git add src/app/api/score/route.ts
git commit -m "feat(api): include libraryMetadata and llmMetadata in score response"
```

---

### Task 3: Install @radix-ui/react-dialog

**Files:**
- Modify: `package.json`

**Step 1: Install dependency**

Run: `npm install @radix-ui/react-dialog`

**Step 2: Verify installation**

Run: `grep react-dialog package.json`
Expected: `"@radix-ui/react-dialog": "^1.x.x"`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @radix-ui/react-dialog"
```

---

### Task 4: Build ScoreComponent types and ComponentBarChart visualization

**Files:**
- Create: `src/components/score-breakdown/types.ts`
- Create: `src/components/score-breakdown/component-bar-chart.tsx`

**Step 1: Create the shared types**

Create `src/components/score-breakdown/types.ts`:

```typescript
// src/components/score-breakdown/types.ts
import type { ReactNode } from "react"

/**
 * A single score component with all data needed for display.
 * This is the data contract between the score system and any visualization.
 */
export interface ScoreComponentData {
  id: string
  label: string
  value: number        // 0-1 raw score
  weight: number       // 0-1 weight in the formula
  contribution: number // value × weight
  description: string  // human-readable explanation
}

/**
 * Props for any visualization component.
 * Implementing this interface allows swapping visualization strategies.
 */
export interface ScoreVisualizationProps {
  components: ScoreComponentData[]
}

/**
 * Render function type for pluggable visualization.
 */
export type ScoreVisualizationRenderer = (props: ScoreVisualizationProps) => ReactNode
```

**Step 2: Create the horizontal bar chart visualization**

Create `src/components/score-breakdown/component-bar-chart.tsx`:

```tsx
// src/components/score-breakdown/component-bar-chart.tsx
"use client"

import { cn } from "@/lib/cn"
import type { ScoreVisualizationProps } from "./types"

function getBarColor(value: number): string {
  if (value >= 0.7) return "bg-risk-low"
  if (value >= 0.4) return "bg-risk-medium"
  return "bg-risk-high"
}

function getBarBgColor(value: number): string {
  if (value >= 0.7) return "bg-risk-low-bg"
  if (value >= 0.4) return "bg-risk-medium-bg"
  return "bg-risk-high-bg"
}

export function ComponentBarChart({ components }: ScoreVisualizationProps) {
  return (
    <div className="space-y-3">
      {components.map((component) => (
        <div key={component.id} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-card-foreground">
              {component.label}
            </span>
            <span className="tabular-nums text-muted-foreground">
              {Math.round(component.value * 100)}%
              <span className="ml-1 text-[10px] opacity-60">
                (w: {Math.round(component.weight * 100)}%)
              </span>
            </span>
          </div>

          {/* Bar */}
          <div
            className={cn(
              "h-2 w-full rounded-full overflow-hidden",
              getBarBgColor(component.value)
            )}
          >
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                getBarColor(component.value)
              )}
              style={{ width: `${Math.round(component.value * 100)}%` }}
            />
          </div>

          {/* Description */}
          <p className="text-[10px] text-muted-foreground leading-tight">
            {component.description}
          </p>
        </div>
      ))}
    </div>
  )
}
```

**Step 3: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/components/score-breakdown/
git commit -m "feat(ui): add ScoreComponentData types and ComponentBarChart visualization"
```

---

### Task 5: Build ComponentScoreList with render prop pattern

**Files:**
- Create: `src/components/score-breakdown/component-score-list.tsx`
- Create: `src/components/score-breakdown/index.ts`

**Step 1: Create the data layer component**

Create `src/components/score-breakdown/component-score-list.tsx`:

```tsx
// src/components/score-breakdown/component-score-list.tsx
"use client"

import { ComponentBarChart } from "./component-bar-chart"
import type { ScoreComponentData, ScoreVisualizationRenderer } from "./types"

interface ComponentScoreListProps {
  title: string
  components: ScoreComponentData[]
  totalScore: number
  renderVisualization?: ScoreVisualizationRenderer
}

export function ComponentScoreList({
  title,
  components,
  totalScore,
  renderVisualization,
}: ComponentScoreListProps) {
  const Visualization = renderVisualization
    ? () => <>{renderVisualization({ components })}</>
    : () => <ComponentBarChart components={components} />

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-card-foreground">
          {title}
        </h4>
        <span className="text-xs tabular-nums font-medium text-muted-foreground">
          Score: {Math.round(totalScore * 100)}%
        </span>
      </div>
      <Visualization />
    </div>
  )
}
```

**Step 2: Create barrel export**

Create `src/components/score-breakdown/index.ts`:

```typescript
// src/components/score-breakdown/index.ts
export { ComponentBarChart } from "./component-bar-chart"
export { ComponentScoreList } from "./component-score-list"
export type {
  ScoreComponentData,
  ScoreVisualizationProps,
  ScoreVisualizationRenderer,
} from "./types"
```

**Step 3: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/components/score-breakdown/
git commit -m "feat(ui): add ComponentScoreList with pluggable visualization"
```

---

### Task 6: Build ScoreDetailDialog

**Files:**
- Create: `src/components/score-detail-dialog.tsx`

This is the main dialog component. It receives all the data it needs as props — no fetching.

**Step 1: Create the dialog component**

Create `src/components/score-detail-dialog.tsx`:

```tsx
// src/components/score-detail-dialog.tsx
"use client"

import * as Dialog from "@radix-ui/react-dialog"
import * as ScrollArea from "@radix-ui/react-scroll-area"
import { X, Library, Brain, Info } from "lucide-react"
import { cn } from "@/lib/cn"
import { ScoreBadge } from "./score-badge"
import { ComponentScoreList } from "./score-breakdown"
import { RISK_LABELS, classifyRisk } from "@/domain/services/risk"
import { formatDate } from "@/lib/date"
import type { ScoreComponentData } from "./score-breakdown"
import type { RiskLevel } from "@/domain/models"
import type { ComponentResult, LibraryScoreBreakdown, LGSScoreBreakdown } from "@/domain/services/lcs/types"

interface VersionDetail {
  version: string
  releaseDate: number
  score: number         // 0-100
  risk: RiskLevel
  lcsScore: number      // 0-1
  lgsScore: number      // 0-1
  recencyDetail: ComponentResult
}

interface LibraryMeta {
  language: string
  stars: number
  dependentsCount: number
  releaseCount: number
  ageInYears: number
  keywords: string[]
}

interface LLMMeta {
  name: string
  knowledgeCutoff: string
  contextLimit: number
  outputLimit: number
}

interface ScoreDetailDialogProps {
  version: VersionDetail | null
  libraryScore: LibraryScoreBreakdown | null
  lgsBreakdown: LGSScoreBreakdown | null
  libraryMetadata: LibraryMeta | null
  llmMetadata: LLMMeta | null
  onClose: () => void
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function getScoreBoxColor(value: number): string {
  if (value >= 0.7) return "border-risk-low/30 bg-risk-low-bg"
  if (value >= 0.4) return "border-risk-medium/30 bg-risk-medium-bg"
  return "border-risk-high/30 bg-risk-high-bg"
}

function getScoreBoxTextColor(value: number): string {
  if (value >= 0.7) return "text-risk-low"
  if (value >= 0.4) return "text-risk-medium"
  return "text-risk-high"
}

function buildLCSComponents(
  libraryScore: LibraryScoreBreakdown,
  recency: ComponentResult,
  libraryMeta: LibraryMeta | null,
  llmMeta: LLMMeta | null,
  releaseDate: number
): ScoreComponentData[] {
  const releasesPerYear = libraryMeta
    ? (libraryMeta.releaseCount / Math.max(libraryMeta.ageInYears, 0.1)).toFixed(1)
    : "N/A"

  const cutoffFormatted = llmMeta?.knowledgeCutoff
    ? formatDate(new Date(llmMeta.knowledgeCutoff).getTime())
    : "Unknown"

  const releaseDateFormatted = formatDate(releaseDate)

  return [
    {
      id: "stability",
      label: "Stability",
      value: libraryScore.stability.value,
      weight: libraryScore.stability.weight,
      contribution: libraryScore.stability.contribution,
      description: `${releasesPerYear} releases/year — ${
        libraryScore.stability.value >= 0.7 ? "stable release cadence" :
        libraryScore.stability.value >= 0.4 ? "moderate release frequency" :
        "very frequent releases, higher volatility"
      }`,
    },
    {
      id: "simplicity",
      label: "Simplicity",
      value: libraryScore.simplicity.value,
      weight: libraryScore.simplicity.weight,
      contribution: libraryScore.simplicity.contribution,
      description: `Based on keyword analysis — ${
        libraryScore.simplicity.value >= 0.7 ? "focused, simple API surface" :
        libraryScore.simplicity.value >= 0.4 ? "moderate complexity" :
        "complex ecosystem (framework, platform, enterprise keywords)"
      }`,
    },
    {
      id: "popularity",
      label: "Popularity",
      value: libraryScore.popularity.value,
      weight: libraryScore.popularity.weight,
      contribution: libraryScore.popularity.contribution,
      description: libraryMeta
        ? `${formatNumber(libraryMeta.stars)} stars, ${formatNumber(libraryMeta.dependentsCount)} dependents — more popular libraries appear more in training data`
        : "Popularity data unavailable",
    },
    {
      id: "language",
      label: "Language Affinity",
      value: libraryScore.language.value,
      weight: libraryScore.language.weight,
      contribution: libraryScore.language.contribution,
      description: libraryMeta
        ? `${libraryMeta.language} — ${
            libraryScore.language.value >= 0.9 ? "very well represented in LLM training data" :
            libraryScore.language.value >= 0.7 ? "well represented in training data" :
            "less represented in training data"
          }`
        : "Language data unavailable",
    },
    {
      id: "recency",
      label: "Recency",
      value: recency.value,
      weight: recency.weight,
      contribution: recency.contribution,
      description: `Released ${releaseDateFormatted}, cutoff ${cutoffFormatted} — ${
        recency.value >= 0.7 ? "released well before cutoff, likely in training data" :
        recency.value >= 0.4 ? "near the cutoff boundary, partial coverage likely" :
        "released after cutoff, unlikely in training data"
      }`,
    },
  ]
}

function buildLGSComponents(
  breakdown: LGSScoreBreakdown,
  llmMeta: LLMMeta | null
): ScoreComponentData[] {
  return [
    {
      id: "capability",
      label: "Capability",
      value: breakdown.capability.value,
      weight: breakdown.capability.weight,
      contribution: breakdown.capability.contribution,
      description: `Model feature breadth (reasoning, tool calls, structured output, etc.) — ${
        breakdown.capability.value >= 0.8 ? "very capable model" :
        breakdown.capability.value >= 0.5 ? "moderately capable" :
        "limited feature set"
      }`,
    },
    {
      id: "limit",
      label: "Context & Output Limits",
      value: breakdown.limit.value,
      weight: breakdown.limit.weight,
      contribution: breakdown.limit.contribution,
      description: llmMeta
        ? `Context: ${formatNumber(llmMeta.contextLimit)} tokens, Output: ${formatNumber(llmMeta.outputLimit)} tokens`
        : "Limit data unavailable",
    },
    {
      id: "recency",
      label: "Model Recency",
      value: breakdown.recency.value,
      weight: breakdown.recency.weight,
      contribution: breakdown.recency.contribution,
      description: llmMeta?.knowledgeCutoff
        ? `Knowledge cutoff: ${formatDate(new Date(llmMeta.knowledgeCutoff).getTime())} — ${
            breakdown.recency.value >= 0.7 ? "recent model with up-to-date training" :
            breakdown.recency.value >= 0.4 ? "moderately recent model" :
            "older model, training data may be stale"
          }`
        : "Cutoff date unknown",
    },
    {
      id: "openness",
      label: "Openness",
      value: breakdown.openness.value,
      weight: breakdown.openness.weight,
      contribution: breakdown.openness.contribution,
      description: `Open weights & API compatibility — ${
        breakdown.openness.value >= 0.7 ? "open model with broad ecosystem" :
        breakdown.openness.value >= 0.3 ? "partially open" :
        "closed/proprietary model"
      }`,
    },
  ]
}

export function ScoreDetailDialog({
  version,
  libraryScore,
  lgsBreakdown,
  libraryMetadata,
  llmMetadata,
  onClose,
}: ScoreDetailDialogProps) {
  if (!version) return null

  const lcsComponents = libraryScore
    ? buildLCSComponents(libraryScore, version.recencyDetail, libraryMetadata, llmMetadata, version.releaseDate)
    : []

  const lgsComponents = lgsBreakdown
    ? buildLGSComponents(lgsBreakdown, llmMetadata)
    : []

  return (
    <Dialog.Root open={!!version} onOpenChange={(open) => { if (!open) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <ScrollArea.Root className="max-h-[85vh]">
            <ScrollArea.Viewport className="h-full w-full rounded-xl">
              <div className="p-6 space-y-6">

                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <Dialog.Title className="text-lg font-semibold font-mono text-card-foreground">
                      v{version.version}
                    </Dialog.Title>
                    <Dialog.Description className="text-xs text-muted-foreground">
                      {RISK_LABELS[version.risk]} — {formatDate(version.releaseDate)}
                    </Dialog.Description>
                  </div>
                  <div className="flex items-center gap-3">
                    <ScoreBadge score={version.score} risk={version.risk} />
                    <Dialog.Close className="rounded-md p-1 text-muted-foreground hover:text-card-foreground hover:bg-muted transition-colors">
                      <X className="h-4 w-4" />
                    </Dialog.Close>
                  </div>
                </div>

                {/* Formula Overview */}
                <div className="flex items-center justify-center gap-3 py-4 px-3 rounded-lg border border-border/50 bg-muted/30">
                  <div className={cn("flex flex-col items-center gap-1 rounded-lg border px-4 py-2", getScoreBoxColor(version.lcsScore))}>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">LCS</span>
                    <span className={cn("text-lg font-bold tabular-nums", getScoreBoxTextColor(version.lcsScore))}>
                      {Math.round(version.lcsScore * 100)}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-muted-foreground">×</span>
                  <div className={cn("flex flex-col items-center gap-1 rounded-lg border px-4 py-2", getScoreBoxColor(version.lgsScore))}>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">LGS</span>
                    <span className={cn("text-lg font-bold tabular-nums", getScoreBoxTextColor(version.lgsScore))}>
                      {Math.round(version.lgsScore * 100)}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-muted-foreground">=</span>
                  <div className={cn("flex flex-col items-center gap-1 rounded-lg border px-4 py-2", getScoreBoxColor(version.score / 100))}>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Final</span>
                    <span className={cn("text-lg font-bold tabular-nums", getScoreBoxTextColor(version.score / 100))}>
                      {version.score}
                    </span>
                  </div>
                </div>

                {/* LCS Breakdown */}
                {lcsComponents.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Library className="h-3.5 w-3.5" />
                      <span className="uppercase tracking-wider font-medium">Library Confidence Score</span>
                    </div>
                    <ComponentScoreList
                      title="LCS Components"
                      components={lcsComponents}
                      totalScore={version.lcsScore}
                    />
                  </div>
                )}

                {/* LGS Breakdown */}
                {lgsComponents.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Brain className="h-3.5 w-3.5" />
                      <span className="uppercase tracking-wider font-medium">LLM Generic Score</span>
                    </div>
                    <ComponentScoreList
                      title="LGS Components"
                      components={lgsComponents}
                      totalScore={lgsBreakdown
                        ? lgsBreakdown.capability.contribution + lgsBreakdown.limit.contribution + lgsBreakdown.recency.contribution + lgsBreakdown.openness.contribution
                        : 0}
                    />
                  </div>
                )}

                {/* Metadata Footer */}
                {(libraryMetadata || llmMetadata) && (
                  <div className="border-t border-border/50 pt-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <Info className="h-3.5 w-3.5" />
                      <span className="uppercase tracking-wider font-medium">Reference Data</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-[11px] text-muted-foreground">
                      {libraryMetadata && (
                        <div className="space-y-1">
                          <p className="font-medium text-card-foreground text-xs">Library</p>
                          <p>Language: {libraryMetadata.language}</p>
                          <p>Stars: {formatNumber(libraryMetadata.stars)}</p>
                          <p>Dependents: {formatNumber(libraryMetadata.dependentsCount)}</p>
                          <p>Releases: {libraryMetadata.releaseCount}</p>
                          <p>Age: {libraryMetadata.ageInYears.toFixed(1)} years</p>
                        </div>
                      )}
                      {llmMetadata && (
                        <div className="space-y-1">
                          <p className="font-medium text-card-foreground text-xs">LLM</p>
                          <p>Model: {llmMetadata.name}</p>
                          <p>Cutoff: {llmMetadata.knowledgeCutoff || "Unknown"}</p>
                          <p>Context: {formatNumber(llmMetadata.contextLimit)} tokens</p>
                          <p>Output: {formatNumber(llmMetadata.outputLimit)} tokens</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
              className="flex touch-none select-none p-0.5 transition-colors duration-150 ease-out data-[orientation=horizontal]:h-2.5 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col"
              orientation="vertical"
            >
              <ScrollArea.Thumb className="relative flex-1 rounded-full bg-border" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/components/score-detail-dialog.tsx
git commit -m "feat(ui): add ScoreDetailDialog with full score breakdown"
```

---

### Task 7: Build VersionSearchBar

**Files:**
- Create: `src/components/version-search-bar.tsx`

**Step 1: Create the search bar component**

Create `src/components/version-search-bar.tsx`:

```tsx
// src/components/version-search-bar.tsx
"use client"

import { Search, X } from "lucide-react"
import { cn } from "@/lib/cn"

interface VersionSearchBarProps {
  value: string
  onChange: (value: string) => void
  totalCount: number
  filteredCount: number
}

export function VersionSearchBar({
  value,
  onChange,
  totalCount,
  filteredCount,
}: VersionSearchBarProps) {
  const isFiltering = value.length > 0

  return (
    <div className="space-y-1.5 pb-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search versions..."
          className={cn(
            "w-full rounded-lg border border-border/50 bg-background py-1.5 pl-8 pr-8 text-xs",
            "placeholder:text-muted-foreground/60",
            "focus:outline-none focus:ring-1 focus:ring-ring"
          )}
        />
        {isFiltering && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-card-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {isFiltering && (
        <p className="text-[10px] text-muted-foreground px-1">
          Showing {filteredCount} of {totalCount} versions
        </p>
      )}
    </div>
  )
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/components/version-search-bar.tsx
git commit -m "feat(ui): add VersionSearchBar component for filtering versions in buckets"
```

---

### Task 8: Update version-scores.tsx — enriched state, clickable badges, search integration

**Files:**
- Modify: `src/components/version-scores.tsx`

This is the main integration task. The component needs these changes:

1. Update `ScoreAPIResponse` interface to match the enriched backend response
2. Update `DisplayVersion` to include `lcsScore`, `lgsScore`, `recencyDetail`
3. Add state for `libraryScore`, `lgsBreakdown`, `libraryMetadata`, `llmMetadata`, `dialogVersion`, `searchQueries`
4. Update `transformToDisplayVersions` to capture the new fields
5. Store enriched data from API response
6. Make `ScoreBadge` clickable (wrap with an `onClick` handler)
7. Add `VersionSearchBar` to buckets with 10+ versions
8. Render `ScoreDetailDialog`

**Step 1: Update the `ScoreAPIResponse` and `DisplayVersion` interfaces**

Update the `ScoreAPIResponse` interface (lines 50-63) to include the new fields:

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
    libraryScore: Record<string, { value: number; weight: number; contribution: number }>
    versions: LCSVersionScore[]
  }
  LGS: {
    score: number
    breakdown: {
      capability: { value: number; weight: number; contribution: number }
      limit: { value: number; weight: number; contribution: number }
      recency: { value: number; weight: number; contribution: number }
      openness: { value: number; weight: number; contribution: number }
    } | null
  }
  FS: {
    versions: FSVersionScore[]
    formula: string
  }
}
```

Update the `DisplayVersion` interface (lines 21-27) to add new fields:

```typescript
interface DisplayVersion {
  version: string
  releaseDate: number
  score: number // 0-100 for display
  risk: RiskLevel
  recencyContribution: number
  lcsScore: number   // 0-1
  lgsScore: number   // 0-1
  recencyDetail: { value: number; weight: number; contribution: number }
}
```

**Step 2: Update `transformToDisplayVersions` to accept and pass through new data**

Update the function signature (line 70-73) to also accept `lgsScore`:

```typescript
function transformToDisplayVersions(
  lcsVersions: LCSVersionScore[],
  fsVersions: FSVersionScore[],
  lgsScore: number
): DisplayVersion[] {
```

Update the return mapping to include the new fields:

```typescript
return lcsVersions.map((lcs) => {
  const fs = fsMap.get(lcs.version)
  const scoreNormalized = fs?.final ?? lcs.score
  const score = Math.round(scoreNormalized * 100)

  return {
    version: lcs.version,
    releaseDate: new Date(lcs.releaseDate).getTime(),
    score,
    risk: classifyRisk(score),
    recencyContribution: lcs.recency.contribution,
    lcsScore: fs?.lcs ?? lcs.score,
    lgsScore: fs?.lgs ?? lgsScore,
    recencyDetail: lcs.recency,
  }
})
```

**Step 3: Add new state variables and imports**

Add imports at the top:

```typescript
import { Search } from "lucide-react"
import { ScoreDetailDialog } from "./score-detail-dialog"
import { VersionSearchBar } from "./version-search-bar"
import type { LibraryScoreBreakdown, LGSScoreBreakdown } from "@/domain/services/lcs/types"
```

Add state variables inside the component (after line 128):

```typescript
const [libraryScore, setLibraryScore] = useState<LibraryScoreBreakdown | null>(null)
const [lgsBreakdown, setLgsBreakdown] = useState<LGSScoreBreakdown | null>(null)
const [libraryMeta, setLibraryMeta] = useState<ScoreAPIResponse["libraryMetadata"] | null>(null)
const [llmMeta, setLlmMeta] = useState<ScoreAPIResponse["llmMetadata"] | null>(null)
const [dialogVersion, setDialogVersion] = useState<DisplayVersion | null>(null)
const [searchQueries, setSearchQueries] = useState<Map<number, string>>(new Map())
```

**Step 4: Update the fetch handler to store enriched data**

In the `.then((json: ScoreAPIResponse) => { ... })` handler (lines 156-170), after creating `groupedBuckets`, store the additional data:

```typescript
.then((json: ScoreAPIResponse) => {
  if (lastFetchKey.current !== key) return

  const lcsVersions = json.LCS?.versions ?? []
  const fsVersions = json.FS?.versions ?? []

  if (lcsVersions.length === 0) {
    setBuckets([])
    return
  }

  const displayVersions = transformToDisplayVersions(lcsVersions, fsVersions, json.LGS?.score ?? 0)
  const groupedBuckets = groupIntoBuckets(displayVersions)

  setBuckets(groupedBuckets)

  // Store enriched data for the detail dialog
  setLibraryScore(json.LCS?.libraryScore as LibraryScoreBreakdown ?? null)
  setLgsBreakdown(json.LGS?.breakdown ?? null)
  setLibraryMeta(json.libraryMetadata ?? null)
  setLlmMeta(json.llmMetadata ?? null)
})
```

Also reset the new state in the cleanup at the beginning of useEffect (around lines 136-139):

```typescript
setLoading(true)
setError(null)
setBuckets([])
setExpandedBuckets(new Set())
setLibraryScore(null)
setLgsBreakdown(null)
setLibraryMeta(null)
setLlmMeta(null)
setDialogVersion(null)
setSearchQueries(new Map())
```

**Step 5: Add search query helper**

Add a helper function after `toggleBucket` (after line 193):

```typescript
const updateSearch = (major: number, query: string) => {
  setSearchQueries((prev) => {
    const next = new Map(prev)
    if (query) {
      next.set(major, query)
    } else {
      next.delete(major)
    }
    return next
  })
}
```

**Step 6: Update the bucket rendering to include search and clickable badges**

In the bucket content rendering (inside `AnimatePresence`, around lines 264-306), add the search bar and update the badge to be clickable.

Replace the bucket content section with:

```tsx
{isExpanded && (
  <motion.div
    initial={{ height: 0, opacity: 0 }}
    animate={{ height: "auto", opacity: 1 }}
    exit={{ height: 0, opacity: 0 }}
    transition={{ duration: 0.2 }}
    className="border-t border-border/50"
  >
    <div className="p-2 space-y-2">
      {/* Search bar for large buckets */}
      {bucket.versions.length > 10 && (
        <VersionSearchBar
          value={searchQueries.get(bucket.major) ?? ""}
          onChange={(q) => updateSearch(bucket.major, q)}
          totalCount={bucket.versions.length}
          filteredCount={
            bucket.versions.filter((v) =>
              v.version.includes(searchQueries.get(bucket.major) ?? "")
            ).length
          }
        />
      )}

      {/* Version list (filtered) */}
      {(() => {
        const query = searchQueries.get(bucket.major) ?? ""
        const filtered = query
          ? bucket.versions.filter((v) => v.version.includes(query))
          : bucket.versions
        return filtered.map((item) => (
          <div
            key={item.version}
            className={cn(
              "flex flex-col gap-2 rounded-lg border border-border/30 bg-background p-3",
              "sm:flex-row sm:items-center sm:justify-between"
            )}
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-medium text-card-foreground">
                  v{item.version}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDialogVersion(item)
                  }}
                  className="cursor-pointer"
                >
                  <ScoreBadge score={item.score} risk={item.risk} />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {RISK_LABELS[item.risk]}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {formatDate(item.releaseDate)}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  Recency: {Math.round(item.recencyContribution * 100)}%
                </span>
              </div>
            </div>
          </div>
        ))
      })()}
    </div>
  </motion.div>
)}
```

**Step 7: Add the ScoreDetailDialog at the end of the component's return**

After the closing `</div>` of the main container (before the component's closing parenthesis), add:

```tsx
return (
  <div className="space-y-3">
    {buckets.map((bucket) => {
      // ... existing bucket rendering
    })}

    <ScoreDetailDialog
      version={dialogVersion}
      libraryScore={libraryScore}
      lgsBreakdown={lgsBreakdown}
      libraryMetadata={libraryMeta}
      llmMetadata={llmMeta}
      onClose={() => setDialogVersion(null)}
    />
  </div>
)
```

**Step 8: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors.

**Step 9: Run all tests**

Run: `npx vitest run 2>&1 | tail -20`
Expected: All existing tests pass (no domain logic changed).

**Step 10: Verify the dev server works**

Run: `npm run dev` and manually check:
1. Version scores load correctly
2. Clicking a score badge opens the detail dialog
3. The dialog shows LCS breakdown, LGS breakdown, formula, and metadata
4. Closing the dialog works
5. Buckets with many versions show the search bar
6. Searching filters versions correctly

**Step 11: Commit**

```bash
git add src/components/version-scores.tsx
git commit -m "feat(ui): integrate score detail dialog and version search into version-scores"
```

---

### Task 9: Add hover style to ScoreBadge for clickability hint

**Files:**
- Modify: `src/components/score-badge.tsx`

**Step 1: Add an optional `onClick` prop and hover styles**

The `ScoreBadge` itself doesn't need an `onClick` — we wrap it in a button in the parent. But we should add a visual hover hint when it's inside a clickable context. Add `cursor-pointer hover:opacity-80 transition-opacity` to the classname. However, since the badge is also used in the bucket header (not clickable there), we should add an optional `clickable` prop:

Actually — simpler approach: the wrapping `<button>` in version-scores.tsx already handles click. We just need the badge to look interactive. Add `hover:brightness-110 transition-all` to the existing className:

```typescript
export function ScoreBadge({ score, risk }: ScoreBadgeProps) {
  const config = riskConfig[risk]
  const Icon = config.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
        "transition-all",
        config.bg,
        config.text
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {score}% Match
    </span>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/score-badge.tsx
git commit -m "feat(ui): add transition to ScoreBadge for interactive contexts"
```
