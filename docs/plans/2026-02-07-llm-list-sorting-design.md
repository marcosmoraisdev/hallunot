# LLM List Sorting by Provider Priority & Release Date

## Problem

The LLM list currently has no sorting — models appear in whatever order the `models.dev` API returns. This makes it hard to find the most relevant, recent models from the most important providers. The provider dropdown also has no meaningful order.

## Design

### Provider Priority

A hardcoded priority map for the top 3 providers:

```ts
const PROVIDER_PRIORITY: Record<string, number> = {
  anthropic: 0,
  google: 1,
  openai: 2,
}
```

Non-prioritized providers get `Infinity` and sort alphabetically by name.

### Model Sorting

All models sorted in a flat list (not grouped by provider):

1. **Primary**: Release date descending (newest first)
2. **Tiebreaker 1**: Provider priority (lower = better)
3. **Tiebreaker 2**: Provider name alphabetical (for non-prioritized providers with same date)
4. **No release date**: Pushed to the bottom of the list

### Provider Dropdown Sorting

Providers in the dropdown sorted by:

1. Priority map (Anthropic, Google, OpenAI first)
2. Remaining providers alphabetical by name

### Example

Searching "gemini" returns: Gemini 3 Pro (newest) before Gemini 2.5 Flash, etc.

## Files Changed

| File | Change |
|------|--------|
| `src/domain/services/llm-service.ts` | Add `PROVIDER_PRIORITY`, `sortModels()`, `sortProviders()`. Call them in `filterAndPaginateLlms` after filtering, before pagination. |
| `src/domain/services/__tests__/llm-service.test.ts` | Add test cases for sorting (date order, provider tiebreaker, no-date at bottom, provider dropdown order, sorting with search filter) |

No changes to components, API routes, or data models. Sorting is transparent to the rest of the stack.

## Implementation Steps

1. Add `PROVIDER_PRIORITY` constant and `getProviderPriority()` helper
2. Add `sortModels(models: LlmModel[]): LlmModel[]` pure function
3. Add `sortProviders(providers: LlmProvider[]): LlmProvider[]` pure function
4. Integrate sort calls into `filterAndPaginateLlms` (after filter, before paginate)
5. Also sort the full providers list in `filterAndPaginateLlms` (for dropdown)
6. Add unit tests for all sorting scenarios
