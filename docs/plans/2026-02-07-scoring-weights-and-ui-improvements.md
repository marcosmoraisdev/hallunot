# Scoring Weight Rebalancing & UI Improvements

## Problem

The current scoring weights overvalue Stability (30%) and undervalue Recency (25%) for the LCS. Stability also penalizes versions released before the LLM's knowledge cutoff, which is incorrect — if the LLM was trained on data that includes the library's release history, stability concerns are irrelevant. Additionally, Openness is overweighted in the LGS relative to Model Recency.

The ScoreDetailDialog also has several UX gaps: components aren't ordered by importance, the library name is missing from the header, and version rows in the grid require clicking a small badge instead of the full row.

## Changes

### 1. Stability Score — Cutoff-Aware Bypass

**File:** `src/domain/services/lcs/components/stability-score.ts`

- If `releaseDate <= cutoffDate` → return **1.0** (perfect stability)
- If `releaseDate > cutoffDate` → use current releases/year formula unchanged
- Requires passing `cutoffDate` and `releaseDate` into the stability component context

**Rationale:** The LLM's training data likely includes the library's release history up to the cutoff. Penalizing stability for something the model already knows is counterproductive.

### 2. LCS Weight Redistribution

**File:** `src/domain/services/lcs/calculator.ts`

| Component | Before | After | Delta |
|-----------|--------|-------|-------|
| Recency | 25% | **40%** | +15% |
| Stability | 30% | **20%** | -10% |
| Popularity | 20% | 20% | — |
| Simplicity | 15% | **10%** | -5% |
| Language Affinity | 10% | 10% | — |

### 3. LGS Weight Redistribution

**File:** `src/domain/services/lgs/calculator.ts`

| Component | Before | After | Delta |
|-----------|--------|-------|-------|
| Capability | 40% | 40% | — |
| Model Recency | 25% | **30%** | +5% |
| Context & Output | 20% | 20% | — |
| Openness | 15% | **10%** | -5% |

### 4. Component Breakdown Sort Order (ScoreDetailDialog)

**File:** `src/components/score-detail-dialog.tsx`

Sort `buildLCSComponents()` and `buildLGSComponents()` output by `weight` descending before rendering. Tiebreaker: alphabetical by label.

**New LCS order:** Recency (40%) → Stability (20%) → Popularity (20%) → Simplicity (10%) → Language Affinity (10%)
**New LGS order:** Capability (40%) → Model Recency (30%) → Context & Output (20%) → Openness (10%)

### 5. Library Name in Dialog Header

**File:** `src/components/score-detail-dialog.tsx`

Change dialog title from `v{version}` to `{libraryName} v{version}`. The library name is already available via `libraryMeta.name`.

### 6. Clickable Version Rows

**File:** `src/components/version-scores.tsx`

Make the entire version row clickable to open ScoreDetailDialog:
- Add `cursor-pointer` and `hover:bg-muted/50` to the row container
- Row `onClick` opens the dialog for that version
- Score badge remains visually distinct but row click replaces the badge-only click

### 7. Stability Description in ScoreDetailDialog

**File:** `src/components/score-detail-dialog.tsx`

When displaying the Stability component for a pre-cutoff version, show: *"Released before knowledge cutoff — training data likely includes this library's release history."* instead of the releases/year metric.

### 8. How It Works Dialog Updates

**File:** `src/components/how-it-works-dialog.tsx`

- Update all weight badges to reflect new percentages
- Reorder components in both LCS and LGS sections by weight descending
- Add note to Stability description about the cutoff-aware bypass logic
- Update the LCS section order: Recency → Stability → Popularity → Simplicity → Language Affinity
- Update the LGS section order: Capability → Model Recency → Context & Output → Openness

### 9. Test Updates

**File:** `src/domain/services/lcs/__tests__/calculator.test.ts`

- Update existing test expectations to match new weights
- Add test case: pre-cutoff version gets stability score of 1.0
- Add test case: post-cutoff version uses normal stability calculation

## Files Changed

| File | Change |
|------|--------|
| `src/domain/services/lcs/components/stability-score.ts` | Add cutoff-aware bypass (return 1.0 if pre-cutoff) |
| `src/domain/services/lcs/calculator.ts` | Update weights: recency 0.40, stability 0.20, simplicity 0.10 |
| `src/domain/services/lgs/calculator.ts` | Update weights: modelRecency 0.30, openness 0.10 |
| `src/components/score-detail-dialog.tsx` | Sort components by weight, add library name to header, update stability description |
| `src/components/version-scores.tsx` | Make full row clickable |
| `src/components/how-it-works-dialog.tsx` | Update weights, reorder components, add stability note |
| `src/domain/services/lcs/__tests__/calculator.test.ts` | Update expectations, add cutoff-aware tests |

## Implementation Steps

1. Update stability score component to accept cutoff/release dates and bypass for pre-cutoff
2. Update LCS calculator weights (recency 0.40, stability 0.20, simplicity 0.10)
3. Update LGS calculator weights (modelRecency 0.30, openness 0.10)
4. Update ScoreDetailDialog: sort components by weight, add library name, update stability description
5. Update version-scores.tsx: make full row clickable
6. Update how-it-works-dialog.tsx: new weights, order, stability note
7. Update tests
