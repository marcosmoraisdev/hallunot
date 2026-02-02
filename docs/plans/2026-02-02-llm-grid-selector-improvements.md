# LLM Grid Selector Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor LlmGridSelector to use unified search bar pattern with provider dropdown filter and fix the broken search/filter functionality with comprehensive unit tests.

**Architecture:** Extract a reusable `FilterableDropdown` component from UnifiedSearchBar's dropdown pattern, use it in a new `LlmSearchBar` component that combines provider filtering with search query, fix API parameter naming mismatch (`search` vs `q`), and add unit tests for domain service filtering logic and component behavior.

**Tech Stack:** React 19, Radix UI Select, Vitest, React Testing Library

---

## Problem Analysis

1. **Filter not working:** The `LlmGridSelector` passes `search` param but API expects `q` for text search
2. **No provider dropdown:** Current implementation only has a search input, missing the dropdown filter pattern from `UnifiedSearchBar`
3. **No unit tests:** The `llm-service.ts` filtering logic has no tests, nor does the component

---

## Task 1: Add Unit Tests for LLM Service Filtering Logic

**Files:**
- Create: `src/domain/services/__tests__/llm-service.test.ts`

**Step 1: Write failing tests for filterAndPaginateLlms**

```typescript
// src/domain/services/__tests__/llm-service.test.ts
import { describe, it, expect } from "vitest"
import {
  filterAndPaginateLlms,
  mapProvidersToResponse,
  mapModelsToResponse,
  findModelById,
} from "../llm-service"
import type { LlmProvider } from "@/domain/models/llm"

// Test fixtures
function createTestProviders(): LlmProvider[] {
  return [
    {
      id: "openai",
      name: "OpenAI",
      doc: "https://openai.com/docs",
      models: [
        {
          id: "openai/gpt-4",
          providerId: "openai",
          name: "GPT-4",
          family: "gpt",
          knowledgeCutoff: "2024-04",
        },
        {
          id: "openai/gpt-3.5-turbo",
          providerId: "openai",
          name: "GPT-3.5 Turbo",
          family: "gpt",
          knowledgeCutoff: "2023-09",
        },
      ],
    },
    {
      id: "anthropic",
      name: "Anthropic",
      doc: "https://anthropic.com/docs",
      models: [
        {
          id: "anthropic/claude-3-opus",
          providerId: "anthropic",
          name: "Claude 3 Opus",
          family: "claude",
          knowledgeCutoff: "2024-04",
        },
        {
          id: "anthropic/claude-3-sonnet",
          providerId: "anthropic",
          name: "Claude 3 Sonnet",
          family: "claude",
          knowledgeCutoff: "2024-04",
        },
      ],
    },
    {
      id: "google",
      name: "Google",
      doc: "https://ai.google/docs",
      models: [
        {
          id: "google/gemini-pro",
          providerId: "google",
          name: "Gemini Pro",
          family: "gemini",
          knowledgeCutoff: "2024-01",
        },
      ],
    },
  ]
}

describe("filterAndPaginateLlms", () => {
  describe("without filters", () => {
    it("returns all models paginated", () => {
      const providers = createTestProviders()
      const result = filterAndPaginateLlms(
        providers,
        {},
        { page: 0, perPage: 10 }
      )

      expect(result.models).toHaveLength(5)
      expect(result.pagination.total).toBe(5)
      expect(result.pagination.page).toBe(0)
      expect(result.pagination.perPage).toBe(10)
    })

    it("paginates correctly", () => {
      const providers = createTestProviders()
      
      const page0 = filterAndPaginateLlms(
        providers,
        {},
        { page: 0, perPage: 2 }
      )
      expect(page0.models).toHaveLength(2)
      expect(page0.models[0].name).toBe("GPT-4")
      expect(page0.models[1].name).toBe("GPT-3.5 Turbo")

      const page1 = filterAndPaginateLlms(
        providers,
        {},
        { page: 1, perPage: 2 }
      )
      expect(page1.models).toHaveLength(2)
      expect(page1.models[0].name).toBe("Claude 3 Opus")
      expect(page1.models[1].name).toBe("Claude 3 Sonnet")

      const page2 = filterAndPaginateLlms(
        providers,
        {},
        { page: 2, perPage: 2 }
      )
      expect(page2.models).toHaveLength(1)
      expect(page2.models[0].name).toBe("Gemini Pro")
    })
  })

  describe("with provider filter", () => {
    it("filters by provider ID (case-insensitive)", () => {
      const providers = createTestProviders()
      
      const result = filterAndPaginateLlms(
        providers,
        { provider: "ANTHROPIC" },
        { page: 0, perPage: 10 }
      )

      expect(result.models).toHaveLength(2)
      expect(result.models.every((m) => m.providerId === "anthropic")).toBe(true)
      expect(result.pagination.total).toBe(2)
    })

    it("returns empty when provider not found", () => {
      const providers = createTestProviders()
      
      const result = filterAndPaginateLlms(
        providers,
        { provider: "nonexistent" },
        { page: 0, perPage: 10 }
      )

      expect(result.models).toHaveLength(0)
      expect(result.pagination.total).toBe(0)
    })
  })

  describe("with search filter", () => {
    it("searches by model name (case-insensitive)", () => {
      const providers = createTestProviders()
      
      const result = filterAndPaginateLlms(
        providers,
        { search: "claude" },
        { page: 0, perPage: 10 }
      )

      expect(result.models).toHaveLength(2)
      expect(result.models.every((m) => m.name.toLowerCase().includes("claude"))).toBe(true)
    })

    it("searches by model family", () => {
      const providers = createTestProviders()
      
      const result = filterAndPaginateLlms(
        providers,
        { search: "gpt" },
        { page: 0, perPage: 10 }
      )

      expect(result.models).toHaveLength(2)
      expect(result.models.every((m) => m.family === "gpt")).toBe(true)
    })

    it("searches by provider ID", () => {
      const providers = createTestProviders()
      
      const result = filterAndPaginateLlms(
        providers,
        { search: "google" },
        { page: 0, perPage: 10 }
      )

      expect(result.models).toHaveLength(1)
      expect(result.models[0].name).toBe("Gemini Pro")
    })
  })

  describe("with combined filters", () => {
    it("applies both provider and search filters", () => {
      const providers = createTestProviders()
      
      const result = filterAndPaginateLlms(
        providers,
        { provider: "openai", search: "turbo" },
        { page: 0, perPage: 10 }
      )

      expect(result.models).toHaveLength(1)
      expect(result.models[0].name).toBe("GPT-3.5 Turbo")
    })

    it("returns empty when filters have no overlap", () => {
      const providers = createTestProviders()
      
      const result = filterAndPaginateLlms(
        providers,
        { provider: "openai", search: "claude" },
        { page: 0, perPage: 10 }
      )

      expect(result.models).toHaveLength(0)
    })
  })
})

describe("mapProvidersToResponse", () => {
  it("maps providers to response format", () => {
    const providers = createTestProviders()
    const result = mapProvidersToResponse(providers)

    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({
      id: "openai",
      name: "OpenAI",
      doc: "https://openai.com/docs",
      modelCount: 2,
    })
  })
})

describe("findModelById", () => {
  it("finds model by ID across providers", () => {
    const providers = createTestProviders()
    const model = findModelById(providers, "anthropic/claude-3-opus")

    expect(model).toBeDefined()
    expect(model?.name).toBe("Claude 3 Opus")
  })

  it("returns undefined when model not found", () => {
    const providers = createTestProviders()
    const model = findModelById(providers, "nonexistent/model")

    expect(model).toBeUndefined()
  })
})
```

**Step 2: Run tests to verify they pass**

Run: `npm test -- src/domain/services/__tests__/llm-service.test.ts`
Expected: PASS (tests verify existing behavior)

**Step 3: Commit**

```bash
git add src/domain/services/__tests__/llm-service.test.ts
git commit -m "test: add unit tests for llm-service filtering logic"
```

---

## Task 2: Fix API Parameter Name Mismatch

**Files:**
- Modify: `src/components/llm-grid-selector.tsx:33-34`

**Step 1: Write failing test for correct API call**

Create a simple integration test that verifies the component makes the correct API call.

```typescript
// Add to existing test or create new: src/components/__tests__/llm-grid-selector.test.tsx
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import "@testing-library/jest-dom/vitest"

// Mock fetch globally
const mockFetch = vi.fn()

describe("LlmGridSelector API calls", () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ models: [], providers: [], pagination: { page: 0, perPage: 9, total: 0 } }),
    })
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("passes search term as 'q' parameter to API", async () => {
    const user = userEvent.setup()
    
    // Dynamic import to avoid module-level fetch issues
    const { LlmGridSelector } = await import("../llm-grid-selector")
    
    render(<LlmGridSelector value="" onValueChange={() => {}} />)

    // Wait for initial fetch
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    // Type in search
    const searchInput = screen.getByPlaceholderText(/search llms/i)
    await user.type(searchInput, "claude")

    // Wait for debounced search
    await waitFor(() => {
      const calls = mockFetch.mock.calls
      const lastCall = calls[calls.length - 1][0] as string
      expect(lastCall).toContain("q=claude")
    }, { timeout: 500 })
  })

  it("passes provider filter as 'provider' parameter to API", async () => {
    // This test will be implemented after we add the provider dropdown
    expect(true).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/__tests__/llm-grid-selector.test.tsx`
Expected: FAIL - the API call uses `search=claude` instead of `q=claude`

**Step 3: Fix the parameter name in LlmGridSelector**

```typescript
// In src/components/llm-grid-selector.tsx, change:
// params.set("search", searchTerm)
// to:
// params.set("q", searchTerm)
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/__tests__/llm-grid-selector.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/llm-grid-selector.tsx src/components/__tests__/llm-grid-selector.test.tsx
git commit -m "fix: use correct API parameter 'q' for LLM search"
```

---

## Task 3: Create LlmSearchBar Component

**Files:**
- Create: `src/components/llm-search-bar.tsx`
- Create: `src/components/__tests__/llm-search-bar.test.tsx`

This component will mirror the `UnifiedSearchBar` pattern but for LLM providers instead of platforms.

**Step 1: Write failing test for LlmSearchBar**

```typescript
// src/components/__tests__/llm-search-bar.test.tsx
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import "@testing-library/jest-dom/vitest"

const mockFetch = vi.fn()

describe("LlmSearchBar", () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        models: [],
        providers: [
          { id: "openai", name: "OpenAI", doc: "", modelCount: 10 },
          { id: "anthropic", name: "Anthropic", doc: "", modelCount: 5 },
        ],
        pagination: { page: 0, perPage: 9, total: 0 },
      }),
    })
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders provider dropdown and search input", async () => {
    const { LlmSearchBar } = await import("../llm-search-bar")
    render(<LlmSearchBar onSearch={() => {}} />)

    expect(screen.getByRole("combobox", { name: /provider/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/search llms/i)).toBeInTheDocument()
  })

  it("fetches providers on mount", async () => {
    const { LlmSearchBar } = await import("../llm-search-bar")
    render(<LlmSearchBar onSearch={() => {}} />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/api/llms"))
    })
  })

  it("calls onSearch with provider and query when search button clicked", async () => {
    const user = userEvent.setup()
    const handleSearch = vi.fn()
    
    const { LlmSearchBar } = await import("../llm-search-bar")
    render(<LlmSearchBar onSearch={handleSearch} />)

    // Wait for providers to load
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    })

    // Type in search
    const searchInput = screen.getByPlaceholderText(/search llms/i)
    await user.type(searchInput, "gpt")

    // Click search
    const searchButton = screen.getByRole("button", { name: /search/i })
    await user.click(searchButton)

    expect(handleSearch).toHaveBeenCalledWith({
      provider: "",
      query: "gpt",
    })
  })

  it("calls onSearch with selected provider", async () => {
    const user = userEvent.setup()
    const handleSearch = vi.fn()
    
    const { LlmSearchBar } = await import("../llm-search-bar")
    render(<LlmSearchBar onSearch={handleSearch} />)

    // Wait for providers to load
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    })

    // Open provider dropdown and select
    const providerTrigger = screen.getByRole("combobox", { name: /provider/i })
    await user.click(providerTrigger)
    
    // Wait for dropdown content
    await waitFor(() => {
      expect(screen.getByText("OpenAI")).toBeInTheDocument()
    })
    
    await user.click(screen.getByText("OpenAI"))

    // Type in search
    const searchInput = screen.getByPlaceholderText(/search llms/i)
    await user.type(searchInput, "gpt")

    // Click search
    const searchButton = screen.getByRole("button", { name: /search/i })
    await user.click(searchButton)

    expect(handleSearch).toHaveBeenCalledWith({
      provider: "openai",
      query: "gpt",
    })
  })

  it("allows search with Enter key", async () => {
    const user = userEvent.setup()
    const handleSearch = vi.fn()
    
    const { LlmSearchBar } = await import("../llm-search-bar")
    render(<LlmSearchBar onSearch={handleSearch} />)

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/search llms/i)
    await user.type(searchInput, "claude{enter}")

    expect(handleSearch).toHaveBeenCalledWith({
      provider: "",
      query: "claude",
    })
  })

  it("disables search button when query is empty", async () => {
    const { LlmSearchBar } = await import("../llm-search-bar")
    render(<LlmSearchBar onSearch={() => {}} />)

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    })

    const searchButton = screen.getByRole("button", { name: /search/i })
    expect(searchButton).toBeDisabled()
  })

  it("filters providers in dropdown", async () => {
    const user = userEvent.setup()
    
    const { LlmSearchBar } = await import("../llm-search-bar")
    render(<LlmSearchBar onSearch={() => {}} />)

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    })

    // Open provider dropdown
    const providerTrigger = screen.getByRole("combobox", { name: /provider/i })
    await user.click(providerTrigger)

    // Wait for dropdown
    await waitFor(() => {
      expect(screen.getByText("OpenAI")).toBeInTheDocument()
      expect(screen.getByText("Anthropic")).toBeInTheDocument()
    })

    // Type in filter
    const filterInput = screen.getByPlaceholderText(/filter providers/i)
    await user.type(filterInput, "open")

    // Only OpenAI should be visible
    expect(screen.getByText("OpenAI")).toBeInTheDocument()
    expect(screen.queryByText("Anthropic")).not.toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/__tests__/llm-search-bar.test.tsx`
Expected: FAIL - module not found

**Step 3: Implement LlmSearchBar component**

```typescript
// src/components/llm-search-bar.tsx
"use client"

import { useEffect, useState } from "react"
import * as Select from "@radix-ui/react-select"
import { Bot, Search, ChevronDown, Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/cn"
import type { LlmProviderResponse } from "@/domain/models"

interface LlmSearchBarProps {
  onSearch: (params: { provider: string; query: string }) => void
  disabled?: boolean
}

export function LlmSearchBar({ onSearch, disabled = false }: LlmSearchBarProps) {
  const [providers, setProviders] = useState<LlmProviderResponse[]>([])
  const [providersLoading, setProvidersLoading] = useState(true)

  const [selectedProvider, setSelectedProvider] = useState("")
  const [query, setQuery] = useState("")
  const [providerFilter, setProviderFilter] = useState("")

  const filteredProviders = providers.filter((p) =>
    p.name.toLowerCase().includes(providerFilter.toLowerCase())
  )

  useEffect(() => {
    fetch("/api/llms?per_page=1")
      .then((res) => res.json())
      .then((json) => setProviders(json.providers ?? []))
      .catch(console.error)
      .finally(() => setProvidersLoading(false))
  }, [])

  const isSearchDisabled = !query.trim() || disabled

  const handleSearch = () => {
    if (isSearchDisabled) return
    onSearch({
      provider: selectedProvider,
      query: query.trim(),
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  return (
    <div
      className={cn(
        "flex w-full items-center rounded-xl border border-border/50 bg-card",
        "transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      {/* Provider Dropdown */}
      <Select.Root
        value={selectedProvider}
        onValueChange={setSelectedProvider}
        onOpenChange={(open) => {
          if (!open) setProviderFilter("")
        }}
        disabled={disabled}
      >
        <Select.Trigger
          className={cn(
            "flex shrink-0 items-center gap-2 border-r border-border/50 px-3 py-2.5 cursor-pointer",
            "text-sm text-foreground outline-none",
            "hover:bg-muted/50 transition-colors",
            "data-[placeholder]:text-muted-foreground"
          )}
          aria-label="Select Provider"
        >
          <Bot className="h-4 w-4 text-muted-foreground" />
          <Select.Value placeholder={providersLoading ? "Loading..." : "Provider"} />
          {providersLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <Select.Icon>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Select.Icon>
          )}
        </Select.Trigger>

        <Select.Portal>
          <Select.Content
            className={cn(
              "z-50 flex flex-col overflow-hidden rounded-xl border border-border/50 bg-card shadow-lg",
              "max-h-[--radix-select-content-available-height]",
              "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
            )}
            position="popper"
            side="bottom"
            sideOffset={8}
            avoidCollisions={false}
          >
            {/* Filter input */}
            <div className="shrink-0 border-b border-border/50 p-2">
              <input
                type="text"
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                placeholder="Filter providers..."
                className={cn(
                  "w-full rounded-md border border-border/50 bg-background px-2.5 py-1.5",
                  "text-sm text-foreground placeholder:text-muted-foreground",
                  "outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                )}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
            <Select.Viewport className="min-h-[120px] max-h-[240px] flex-1 overflow-auto p-1">
              {/* All Providers option */}
              <Select.Item
                value=""
                className={cn(
                  "relative flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none",
                  "text-foreground transition-colors",
                  "data-[highlighted]:bg-muted data-[highlighted]:text-foreground",
                  "data-[state=checked]:text-primary"
                )}
              >
                <Select.ItemIndicator className="absolute left-1 flex items-center">
                  <Check className="h-3.5 w-3.5 text-primary" />
                </Select.ItemIndicator>
                <div className="flex items-center gap-2 pl-4">
                  <Select.ItemText>All Providers</Select.ItemText>
                </div>
              </Select.Item>

              {filteredProviders.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No providers found
                </div>
              ) : (
                filteredProviders.map((provider) => (
                  <Select.Item
                    key={provider.id}
                    value={provider.id}
                    className={cn(
                      "relative flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none",
                      "text-foreground transition-colors",
                      "data-[highlighted]:bg-muted data-[highlighted]:text-foreground",
                      "data-[state=checked]:text-primary"
                    )}
                  >
                    <Select.ItemIndicator className="absolute left-1 flex items-center">
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </Select.ItemIndicator>
                    <div className="flex items-center gap-2 pl-4">
                      <Select.ItemText>{provider.name}</Select.ItemText>
                      <span className="text-[10px] text-muted-foreground">
                        {provider.modelCount} models
                      </span>
                    </div>
                  </Select.Item>
                ))
              )}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>

      {/* Search Input + Button */}
      <div className="flex flex-1 items-center gap-2 px-3">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search LLMs..."
          disabled={disabled}
          className={cn(
            "h-10 flex-1 bg-transparent text-sm text-foreground",
            "placeholder:text-muted-foreground",
            "outline-none"
          )}
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={isSearchDisabled}
          className={cn(
            "shrink-0 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground",
            "transition-colors hover:bg-primary/90",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          Search
        </button>
      </div>
    </div>
  )
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/__tests__/llm-search-bar.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/llm-search-bar.tsx src/components/__tests__/llm-search-bar.test.tsx
git commit -m "feat: add LlmSearchBar component with provider dropdown"
```

---

## Task 4: Refactor LlmGridSelector to Use New Search Bar

**Files:**
- Modify: `src/components/llm-grid-selector.tsx`
- Modify: `src/components/__tests__/llm-grid-selector.test.tsx`

**Step 1: Update tests for new search behavior**

```typescript
// Update src/components/__tests__/llm-grid-selector.test.tsx
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import "@testing-library/jest-dom/vitest"

const mockFetch = vi.fn()

const mockApiResponse = {
  models: [
    { id: "openai/gpt-4", name: "GPT-4", providerId: "openai", providerName: "OpenAI", family: "gpt" },
    { id: "anthropic/claude", name: "Claude", providerId: "anthropic", providerName: "Anthropic", family: "claude" },
  ],
  providers: [
    { id: "openai", name: "OpenAI", doc: "", modelCount: 10 },
    { id: "anthropic", name: "Anthropic", doc: "", modelCount: 5 },
  ],
  pagination: { page: 0, perPage: 9, total: 2 },
}

describe("LlmGridSelector", () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve(mockApiResponse),
    })
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders search bar with provider dropdown", async () => {
    const { LlmGridSelector } = await import("../llm-grid-selector")
    render(<LlmGridSelector value="" onValueChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /provider/i })).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/search llms/i)).toBeInTheDocument()
    })
  })

  it("displays LLM cards from initial fetch", async () => {
    const { LlmGridSelector } = await import("../llm-grid-selector")
    render(<LlmGridSelector value="" onValueChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText("GPT-4")).toBeInTheDocument()
      expect(screen.getByText("Claude")).toBeInTheDocument()
    })
  })

  it("passes provider and query to API on search", async () => {
    const user = userEvent.setup()
    const { LlmGridSelector } = await import("../llm-grid-selector")
    render(<LlmGridSelector value="" onValueChange={() => {}} />)

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    })

    // Select provider
    const providerTrigger = screen.getByRole("combobox", { name: /provider/i })
    await user.click(providerTrigger)
    await waitFor(() => expect(screen.getByText("OpenAI")).toBeInTheDocument())
    await user.click(screen.getByText("OpenAI"))

    // Type search query
    const searchInput = screen.getByPlaceholderText(/search llms/i)
    await user.type(searchInput, "gpt")

    // Click search
    const searchButton = screen.getByRole("button", { name: /search/i })
    await user.click(searchButton)

    await waitFor(() => {
      const calls = mockFetch.mock.calls
      const lastCall = calls[calls.length - 1][0] as string
      expect(lastCall).toContain("provider=openai")
      expect(lastCall).toContain("q=gpt")
    })
  })

  it("calls onValueChange when LLM card is clicked", async () => {
    const user = userEvent.setup()
    const handleValueChange = vi.fn()
    
    const { LlmGridSelector } = await import("../llm-grid-selector")
    render(<LlmGridSelector value="" onValueChange={handleValueChange} />)

    await waitFor(() => {
      expect(screen.getByText("GPT-4")).toBeInTheDocument()
    })

    await user.click(screen.getByText("GPT-4"))
    expect(handleValueChange).toHaveBeenCalledWith("GPT-4")
  })

  it("highlights selected LLM card", async () => {
    const { LlmGridSelector } = await import("../llm-grid-selector")
    render(<LlmGridSelector value="GPT-4" onValueChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText("GPT-4")).toBeInTheDocument()
    })

    // The card with GPT-4 should have the selected styling
    const gpt4Card = screen.getByText("GPT-4").closest("button")
    expect(gpt4Card).toHaveClass("border-primary")
  })

  it("disables component when disabled prop is true", async () => {
    const { LlmGridSelector } = await import("../llm-grid-selector")
    render(<LlmGridSelector value="" onValueChange={() => {}} disabled />)

    await waitFor(() => {
      const container = screen.getByPlaceholderText(/search llms/i).closest("div")?.parentElement
      expect(container).toHaveClass("pointer-events-none")
    })
  })
})
```

**Step 2: Run tests to see current failures**

Run: `npm test -- src/components/__tests__/llm-grid-selector.test.tsx`
Expected: Some tests should fail due to missing provider dropdown

**Step 3: Refactor LlmGridSelector to use LlmSearchBar**

```typescript
// src/components/llm-grid-selector.tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import { LlmSearchBar } from "./llm-search-bar"
import { LlmCard } from "./llm-card"
import { MiniPagination } from "./mini-pagination"
import type { LlmModelResponse } from "@/domain/models"

interface LlmGridSelectorProps {
  value: string
  onValueChange: (llmName: string) => void
  disabled?: boolean
}

export function LlmGridSelector({
  value,
  onValueChange,
  disabled = false,
}: LlmGridSelectorProps) {
  const [llms, setLlms] = useState<LlmModelResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [currentFilters, setCurrentFilters] = useState<{ provider: string; query: string }>({
    provider: "",
    query: "",
  })

  const fetchLlms = useCallback(
    async (filters: { provider: string; query: string }, pageNum: number) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          per_page: "9",
        })
        if (filters.query) {
          params.set("q", filters.query)
        }
        if (filters.provider) {
          params.set("provider", filters.provider)
        }

        const res = await fetch(`/api/llms?${params.toString()}`)
        const json = await res.json()
        const models = json.models ?? []
        setLlms(models)
        setHasMore(models.length === 9)
      } catch (err) {
        console.error("Failed to fetch LLMs:", err)
        setLlms([])
        setHasMore(false)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Initial fetch
  useEffect(() => {
    fetchLlms({ provider: "", query: "" }, 0)
  }, [fetchLlms])

  const handleSearch = useCallback(
    (params: { provider: string; query: string }) => {
      setCurrentFilters(params)
      setPage(0)
      fetchLlms(params, 0)
    },
    [fetchLlms]
  )

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage)
      fetchLlms(currentFilters, newPage)
    },
    [currentFilters, fetchLlms]
  )

  return (
    <div className={disabled ? "pointer-events-none opacity-50" : undefined}>
      {/* Search bar with provider dropdown */}
      <div className="mb-4">
        <LlmSearchBar onSearch={handleSearch} disabled={disabled} />
      </div>

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      )}

      {/* LLM cards grid */}
      {!loading && llms.length > 0 && (
        <div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {llms.map((llm, i) => (
              <LlmCard
                key={llm.id}
                llm={llm}
                isSelected={llm.name === value}
                onSelect={onValueChange}
                index={i}
              />
            ))}
          </div>
          <MiniPagination
            page={page}
            hasMore={hasMore}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Empty state */}
      {!loading && llms.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No LLMs found. Try a different search or provider.
          </p>
        </div>
      )}
    </div>
  )
}
```

**Step 4: Run all tests**

Run: `npm test -- src/components/__tests__/llm-grid-selector.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/llm-grid-selector.tsx src/components/__tests__/llm-grid-selector.test.tsx
git commit -m "refactor: integrate LlmSearchBar into LlmGridSelector"
```

---

## Task 5: Add Tests for LlmSearchBar Auto-Search Behavior (Optional Enhancement)

**Files:**
- Modify: `src/components/llm-search-bar.tsx`
- Modify: `src/components/__tests__/llm-search-bar.test.tsx`

If we want to support auto-search on typing (like the original debounced behavior), we can add that as an optional mode.

**Step 1: Write test for auto-search mode**

```typescript
// Add to src/components/__tests__/llm-search-bar.test.tsx

describe("LlmSearchBar with autoSearch", () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        models: [],
        providers: [
          { id: "openai", name: "OpenAI", doc: "", modelCount: 10 },
        ],
        pagination: { page: 0, perPage: 9, total: 0 },
      }),
    })
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("calls onSearch automatically after debounce when autoSearch is true", async () => {
    const user = userEvent.setup()
    const handleSearch = vi.fn()
    
    const { LlmSearchBar } = await import("../llm-search-bar")
    render(<LlmSearchBar onSearch={handleSearch} autoSearch />)

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/search llms/i)
    await user.type(searchInput, "gpt")

    // Wait for debounce (300ms)
    await waitFor(() => {
      expect(handleSearch).toHaveBeenCalledWith({
        provider: "",
        query: "gpt",
      })
    }, { timeout: 500 })
  })

  it("hides search button when autoSearch is true", async () => {
    const { LlmSearchBar } = await import("../llm-search-bar")
    render(<LlmSearchBar onSearch={() => {}} autoSearch />)

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    })

    expect(screen.queryByRole("button", { name: /search/i })).not.toBeInTheDocument()
  })
})
```

**Step 2: Run test to see failure**

Run: `npm test -- src/components/__tests__/llm-search-bar.test.tsx`
Expected: FAIL - autoSearch prop not implemented

**Step 3: Implement autoSearch mode**

Add to `src/components/llm-search-bar.tsx`:

```typescript
// Update interface
interface LlmSearchBarProps {
  onSearch: (params: { provider: string; query: string }) => void
  disabled?: boolean
  autoSearch?: boolean  // Add this
}

// Update component
export function LlmSearchBar({ 
  onSearch, 
  disabled = false,
  autoSearch = false,  // Add this
}: LlmSearchBarProps) {
  // ... existing state ...

  // Add debounced auto-search effect
  useEffect(() => {
    if (!autoSearch) return
    
    const timer = setTimeout(() => {
      onSearch({
        provider: selectedProvider,
        query: query.trim(),
      })
    }, 300)
    
    return () => clearTimeout(timer)
  }, [autoSearch, query, selectedProvider, onSearch])

  // ... rest of component ...

  // Conditionally render search button
  {!autoSearch && (
    <button
      type="button"
      onClick={handleSearch}
      disabled={isSearchDisabled}
      className={cn(
        "shrink-0 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground",
        "transition-colors hover:bg-primary/90",
        "disabled:cursor-not-allowed disabled:opacity-50"
      )}
    >
      Search
    </button>
  )}
```

**Step 4: Run tests**

Run: `npm test -- src/components/__tests__/llm-search-bar.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/llm-search-bar.tsx src/components/__tests__/llm-search-bar.test.tsx
git commit -m "feat: add autoSearch mode to LlmSearchBar"
```

---

## Task 6: Run Full Test Suite and Build Verification

**Files:** None (verification only)

**Step 1: Run all tests**

Run: `npm test`
Expected: All tests PASS

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Run lint**

Run: `npm run lint`
Expected: No linting errors

**Step 4: Manual verification**

Start dev server: `npm run dev`
1. Navigate to the app
2. Search for a library and select it
3. Verify Step 3 (LLM selector) shows provider dropdown
4. Select a provider from dropdown
5. Type a search query
6. Click Search button
7. Verify filtered results appear
8. Select an LLM
9. Verify Step 4 appears with version scores

**Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "chore: final cleanup and verification"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Unit tests for llm-service filtering | `src/domain/services/__tests__/llm-service.test.ts` |
| 2 | Fix API parameter mismatch | `src/components/llm-grid-selector.tsx` |
| 3 | Create LlmSearchBar component | `src/components/llm-search-bar.tsx`, tests |
| 4 | Refactor LlmGridSelector | `src/components/llm-grid-selector.tsx`, tests |
| 5 | Add autoSearch mode (optional) | `src/components/llm-search-bar.tsx` |
| 6 | Full verification | N/A |

## Test Commands Reference

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/domain/services/__tests__/llm-service.test.ts

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```
