# How It Works Modal — Design

## Summary

Add a "How it works" modal triggered from the header button. Uses Radix UI Dialog with accordion-style collapsible sections. Explains the full scoring methodology in a clean, informative layout.

## Structure

**Component:** `src/components/how-it-works-dialog.tsx`
**Trigger:** "How it works" button in `src/components/header.tsx`
**Pattern:** Same Dialog + ScrollArea as `ScoreDetailDialog`

### Sections (Accordion)

1. **The Flow** — Succinct 3-step horizontal layout + one-line explanation
2. **Library Confidence Score (LCS)** — 5 components table with weights and descriptions
3. **LLM Generic Score (LGS)** — 4 components table with weights and descriptions
4. **Final Score (FS)** — Formula visualization (LCS x LGS = FS) + explanation
5. **Risk Levels** — Color-coded thresholds with labels + disclaimer

### Content Detail

- **Flow:** 3 steps in a row, one sentence of context
- **LCS:** Stability (30%), Recency (25%), Popularity (20%), Simplicity (15%), Language (10%)
- **LGS:** Capability (40%), Recency (25%), Limits (20%), Openness (15%)
- **FS:** Box visualization matching ScoreDetailDialog style
- **Risk:** Green (>=70), Yellow (40-69), Red (<40) with descriptions

## Files to Create/Modify

- **Create:** `src/components/how-it-works-dialog.tsx`
- **Modify:** `src/components/header.tsx` — wire button to open dialog
