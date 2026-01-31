# API Score Fix & UI Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the `/api/score` endpoint type mismatch with Libraries.io API and improve the UI with paginated library selection and LLM card-based selection with search.

**Architecture:** The Libraries.io API returns a full project object with a `versions` array nested inside (not just versions). We need to update the adapter to extract this properly. Additionally, the library selection (Step 2) and LLM selection (Step 3) will both use a card-based grid layout with pagination, where the LLM selector becomes a searchable card grid instead of a dropdown.

**Tech Stack:** Next.js App Router, TypeScript, Radix UI, Tailwind CSS, Vitest

---

## Task 1: Fix Libraries.io Adapter Type Mismatch

**Files:**
- Modify: `src/infrastructure/adapters/libraries-io.ts:86-102`
- Modify: `src/infrastructure/adapters/__tests__/libraries-io.test.ts:186-249`

### Problem Analysis

The current `fetchProjectVersions` function expects Libraries.io to return `LibrariesIoVersion[]` directly, but the actual API response is a full project object:

```json
{
  "name": "base62",
  "platform": "NPM",
  "versions": [
    { "number": "0.1.0", "published_at": "2012-02-24 18:04:06 UTC" },
    ...
  ]
}
```

The function currently does `return res.json()` which returns the full object, not `res.json().versions`.

**Step 1: Add LibrariesIoProject interface**

In `src/infrastructure/adapters/libraries-io.ts`, after line 30, add:

```typescript
export interface LibrariesIoProject {
  name: string
  platform: string
  description: string | null
  homepage: string | null
  repository_url: string | null
  normalized_licenses: string[]
  rank: number
  latest_release_number: string | null
  latest_stable_release_number: string | null
  latest_stable_release_published_at: string | null
  language: string | null
  stars: number
  forks: number
  dependents_count: number
  versions: LibrariesIoVersion[]
}
```

**Step 2: Update fetchProjectVersions to extract versions array**

Replace lines 86-102 in `src/infrastructure/adapters/libraries-io.ts` with:

```typescript
export async function fetchProjectVersions(
  platform: string,
  projectName: string
): Promise<LibrariesIoVersion[]> {
  const key = getApiKey()
  const encodedName = encodeURIComponent(projectName)
  const searchParams = new URLSearchParams({ api_key: key })
  const url = `${BASE_URL}/${platform}/${encodedName}?${searchParams.toString()}`

  const res = await fetch(url, { next: { revalidate: 300 } })

  if (!res.ok) {
    throw new Error(`Libraries.io API error: ${res.status} ${res.statusText}`)
  }

  const project: LibrariesIoProject = await res.json()
  return project.versions ?? []
}
```

**Step 3: Run existing tests to verify they still conceptually pass**

Run: `npm test -- src/infrastructure/adapters/__tests__/libraries-io.test.ts`
Expected: Tests pass (mocks return the expected shape)

**Step 4: Update test mock to match real API response**

In `src/infrastructure/adapters/__tests__/libraries-io.test.ts`, update the `fetchProjectVersions` test (lines 186-208):

```typescript
describe("fetchProjectVersions", () => {
  it("calls Libraries.io project endpoint and extracts versions from response", async () => {
    const mockProject = {
      name: "react",
      platform: "NPM",
      description: "A JavaScript library for building user interfaces",
      homepage: "https://reactjs.org",
      repository_url: "https://github.com/facebook/react",
      normalized_licenses: ["MIT"],
      rank: 30,
      latest_release_number: "18.3.0",
      latest_stable_release_number: "18.3.0",
      latest_stable_release_published_at: "2024-04-25T00:00:00.000Z",
      language: "JavaScript",
      stars: 200000,
      forks: 40000,
      dependents_count: 150000,
      versions: [
        { number: "18.2.0", published_at: "2022-06-14T00:00:00.000Z" },
        { number: "18.3.0", published_at: "2024-04-25T00:00:00.000Z" },
      ],
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve(mockProject),
    } as unknown as Response)

    const { fetchProjectVersions } = await import("../libraries-io")
    const result = await fetchProjectVersions("NPM", "react")

    // Should extract just the versions array
    expect(result).toEqual([
      { number: "18.2.0", published_at: "2022-06-14T00:00:00.000Z" },
      { number: "18.3.0", published_at: "2024-04-25T00:00:00.000Z" },
    ])

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string
    expect(calledUrl).toContain("https://libraries.io/api/NPM/react")
    expect(calledUrl).toContain("api_key=test-api-key")
  })
```

**Step 5: Add test for project with null versions**

Add after the previous test:

```typescript
  it("returns empty array when project has null versions", async () => {
    const mockProject = {
      name: "some-lib",
      platform: "NPM",
      versions: null,
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve(mockProject),
    } as unknown as Response)

    const { fetchProjectVersions } = await import("../libraries-io")
    const result = await fetchProjectVersions("NPM", "some-lib")

    expect(result).toEqual([])
  })
```

**Step 6: Run tests to verify fix**

Run: `npm test -- src/infrastructure/adapters/__tests__/libraries-io.test.ts`
Expected: All tests pass

**Step 7: Commit**

```bash
git add src/infrastructure/adapters/libraries-io.ts src/infrastructure/adapters/__tests__/libraries-io.test.ts
git commit -m "$(cat <<'EOF'
fix: extract versions array from Libraries.io project response

The API returns a full project object, not just versions array.
Added LibrariesIoProject interface and updated fetchProjectVersions
to correctly extract the nested versions array.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add Minimalist Pagination Component for Cards

**Files:**
- Create: `src/components/mini-pagination.tsx`
- Create: `src/components/__tests__/mini-pagination.test.tsx`

This will be a simpler pagination that fits inside a card container footer - just prev/next with page indicator.

**Step 1: Write the failing test**

Create `src/components/__tests__/mini-pagination.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { MiniPagination } from "../mini-pagination"

describe("MiniPagination", () => {
  it("renders page info and navigation buttons", () => {
    render(
      <MiniPagination page={1} totalPages={5} onPageChange={() => {}} />
    )

    expect(screen.getByText("1 / 5")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /previous/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument()
  })

  it("disables previous button on first page", () => {
    render(
      <MiniPagination page={1} totalPages={5} onPageChange={() => {}} />
    )

    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /next/i })).not.toBeDisabled()
  })

  it("disables next button on last page", () => {
    render(
      <MiniPagination page={5} totalPages={5} onPageChange={() => {}} />
    )

    expect(screen.getByRole("button", { name: /previous/i })).not.toBeDisabled()
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled()
  })

  it("calls onPageChange with correct page when clicking buttons", () => {
    const handlePageChange = vi.fn()
    render(
      <MiniPagination page={3} totalPages={5} onPageChange={handlePageChange} />
    )

    fireEvent.click(screen.getByRole("button", { name: /previous/i }))
    expect(handlePageChange).toHaveBeenCalledWith(2)

    fireEvent.click(screen.getByRole("button", { name: /next/i }))
    expect(handlePageChange).toHaveBeenCalledWith(4)
  })

  it("returns null when totalPages is 1 or less", () => {
    const { container } = render(
      <MiniPagination page={1} totalPages={1} onPageChange={() => {}} />
    )

    expect(container.firstChild).toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/__tests__/mini-pagination.test.tsx`
Expected: FAIL (component doesn't exist)

**Step 3: Write minimal implementation**

Create `src/components/mini-pagination.tsx`:

```typescript
"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/cn"

interface MiniPaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function MiniPagination({ page, totalPages, onPageChange }: MiniPaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-3 pt-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-md",
          "text-muted-foreground transition-colors",
          "hover:bg-accent hover:text-foreground",
          "disabled:cursor-not-allowed disabled:opacity-40"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <span className="text-xs tabular-nums text-muted-foreground">
        {page} / {totalPages}
      </span>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-md",
          "text-muted-foreground transition-colors",
          "hover:bg-accent hover:text-foreground",
          "disabled:cursor-not-allowed disabled:opacity-40"
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/__tests__/mini-pagination.test.tsx`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/components/mini-pagination.tsx src/components/__tests__/mini-pagination.test.tsx
git commit -m "$(cat <<'EOF'
feat: add MiniPagination component for card container footers

Minimalist prev/next pagination with page indicator.
Designed to fit in card grid section footers.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Add Pagination to Library Search Results

**Files:**
- Modify: `src/app/page.tsx:24-55`
- Modify: `src/components/search-results.tsx`

**Step 1: Update page.tsx to track pagination state**

In `src/app/page.tsx`, add pagination state after line 27:

```typescript
const [libraryPage, setLibraryPage] = useState(1)
const [libraryTotalPages, setLibraryTotalPages] = useState(1)
```

**Step 2: Update handleSearch to include pagination**

Modify the `handleSearch` callback (lines 32-55) to:

```typescript
const handleSearch = useCallback(
  async (params: { platform: string; query: string }, page = 1) => {
    // Clear downstream state only on new search (page 1)
    if (page === 1) {
      setSelectedLibrary(null)
      setSelectedLlmName("")
    }
    setSearchLoading(true)
    setHasSearched(true)
    setLibraryPage(page)

    try {
      const searchParams = new URLSearchParams({ q: params.query })
      if (params.platform) {
        searchParams.set("platforms", params.platform)
      }
      searchParams.set("page", String(page))
      searchParams.set("per_page", "9")

      const res = await fetch(`/api/search?${searchParams.toString()}`)
      const json = await res.json()
      setSearchResults(json.data ?? [])

      // Libraries.io doesn't return total count, so estimate based on results
      // If we got a full page, assume there's at least one more page
      const hasMore = (json.data ?? []).length === 9
      if (page === 1) {
        setLibraryTotalPages(hasMore ? page + 1 : page)
      } else if (hasMore) {
        setLibraryTotalPages(Math.max(libraryTotalPages, page + 1))
      }
    } catch {
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  },
  [libraryTotalPages]
)
```

**Step 3: Add state to track current search params**

After the pagination state, add:

```typescript
const [currentSearchParams, setCurrentSearchParams] = useState<{ platform: string; query: string } | null>(null)
```

Update `handleSearch` to store params:

```typescript
// Inside handleSearch, after setHasSearched(true):
setCurrentSearchParams(params)
```

**Step 4: Add page change handler**

After `handleSelectLlm`, add:

```typescript
const handleLibraryPageChange = useCallback((newPage: number) => {
  if (currentSearchParams) {
    handleSearch(currentSearchParams, newPage)
  }
}, [currentSearchParams, handleSearch])
```

**Step 5: Update SearchResults usage to include pagination**

In the JSX, update the SearchResults section (around lines 110-117):

```typescript
<SearchResults
  results={searchResults}
  loading={searchLoading}
  onSelectLibrary={handleSelectLibrary}
  selectedName={selectedLibrary?.name}
  page={libraryPage}
  totalPages={libraryTotalPages}
  onPageChange={handleLibraryPageChange}
/>
```

**Step 6: Update SearchResults component to accept pagination props**

In `src/components/search-results.tsx`, update the interface (around line 18):

```typescript
interface SearchResultsProps {
  results: SearchResultItem[]
  loading: boolean
  onSelectLibrary: (libraryName: string, platform: string) => void
  selectedName?: string
  page?: number
  totalPages?: number
  onPageChange?: (page: number) => void
}
```

**Step 7: Add MiniPagination to SearchResults**

At the top of the file, add import:

```typescript
import { MiniPagination } from "./mini-pagination"
```

Update the component to destructure new props and render pagination:

```typescript
export function SearchResults({
  results,
  loading,
  onSelectLibrary,
  selectedName,
  page = 1,
  totalPages = 1,
  onPageChange,
}: SearchResultsProps) {
  // ... existing loading and empty checks ...

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((item, i) => {
          // ... existing card rendering ...
        })}
      </div>
      {onPageChange && (
        <MiniPagination
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  )
}
```

**Step 8: Verify the app builds**

Run: `npm run build`
Expected: Build succeeds

**Step 9: Commit**

```bash
git add src/app/page.tsx src/components/search-results.tsx
git commit -m "$(cat <<'EOF'
feat: add pagination to library search results

Libraries display 9 per page with prev/next navigation.
Uses MiniPagination component in card grid footer.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Create LLM Card Component

**Files:**
- Create: `src/components/llm-card.tsx`

**Step 1: Create the LLM card component**

Create `src/components/llm-card.tsx`:

```typescript
"use client"

import { motion } from "framer-motion"
import { Bot, Calendar } from "lucide-react"
import { cn } from "@/lib/cn"
import type { Llm } from "@/domain/models"

interface LlmCardProps {
  llm: Llm
  isSelected: boolean
  onSelect: (llmName: string) => void
  index: number
}

export function LlmCard({ llm, isSelected, onSelect, index }: LlmCardProps) {
  const cutoffDate = new Date(llm.approxCutoff)
  const formattedCutoff = cutoffDate.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  })

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      onClick={() => onSelect(llm.name)}
      className={cn(
        "group flex cursor-pointer flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all",
        isSelected
          ? "border-primary bg-muted ring-1 ring-primary/20"
          : "border-border/50 bg-card hover:border-primary/30 hover:bg-muted hover:shadow-md"
      )}
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-card-foreground">
            {llm.name}
          </span>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {llm.provider}
        </span>
      </div>

      <div className="flex w-full items-center gap-3">
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Calendar className="h-3 w-3" />
          Cutoff: {formattedCutoff}
        </span>
      </div>
    </motion.button>
  )
}
```

**Step 2: Verify the component renders correctly**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/llm-card.tsx
git commit -m "$(cat <<'EOF'
feat: add LlmCard component for card-based LLM selection

Displays LLM name, provider badge, and training cutoff date.
Follows same design pattern as library search result cards.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Create LLM Grid Selector Component

**Files:**
- Create: `src/components/llm-grid-selector.tsx`
- Modify: `src/app/api/llms/route.ts` (add pagination support)

**Step 1: Update /api/llms to support pagination**

Modify `src/app/api/llms/route.ts`:

```typescript
// src/app/api/llms/route.ts
import { NextResponse } from "next/server"
import { getAllLlms } from "@/data/llms"
import { logger } from "@/lib/logger"

export async function GET(request: Request) {
  const log = logger.child({ route: "/api/llms" })
  log.info("incoming request")

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")?.toLowerCase().trim()
    const page = parseInt(searchParams.get("page") ?? "1")
    const perPage = parseInt(searchParams.get("per_page") ?? "9")

    let llms = getAllLlms()

    // Filter by search term if provided
    if (search) {
      llms = llms.filter(
        (llm) =>
          llm.name.toLowerCase().includes(search) ||
          llm.provider.toLowerCase().includes(search)
      )
    }

    const total = llms.length
    const totalPages = Math.ceil(total / perPage)
    const start = (page - 1) * perPage
    const paginatedLlms = llms.slice(start, start + perPage)

    log.info({ count: paginatedLlms.length, page, totalPages }, "returning LLMs")

    return NextResponse.json({
      data: paginatedLlms,
      pagination: {
        page,
        perPage,
        total,
        totalPages,
      },
    })
  } catch (err) {
    log.error({ err }, "failed to get LLMs")
    return NextResponse.json(
      { error: "Failed to fetch LLMs" },
      { status: 500 }
    )
  }
}
```

**Step 2: Create the LLM grid selector component**

Create `src/components/llm-grid-selector.tsx`:

```typescript
"use client"

import { useEffect, useState, useCallback } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { LlmCard } from "./llm-card"
import { MiniPagination } from "./mini-pagination"
import type { Llm } from "@/domain/models"

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
  const [llms, setLlms] = useState<Llm[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchLlms = useCallback(async (searchTerm: string, pageNum: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        per_page: "9",
      })
      if (searchTerm) {
        params.set("search", searchTerm)
      }

      const res = await fetch(`/api/llms?${params.toString()}`)
      const json = await res.json()
      setLlms(json.data ?? [])
      setTotalPages(json.pagination?.totalPages ?? 1)
    } catch (err) {
      console.error("Failed to fetch LLMs:", err)
      setLlms([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchLlms("", 1)
  }, [fetchLlms])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchLlms(search, 1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, fetchLlms])

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage)
      fetchLlms(search, newPage)
    },
    [search, fetchLlms]
  )

  return (
    <div className={disabled ? "pointer-events-none opacity-50" : undefined}>
      {/* Search input */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search LLMs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
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
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Empty state */}
      {!loading && llms.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No LLMs found matching &quot;{search}&quot;
          </p>
        </div>
      )}
    </div>
  )
}
```

**Step 3: Verify the component renders correctly**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/app/api/llms/route.ts src/components/llm-grid-selector.tsx
git commit -m "$(cat <<'EOF'
feat: add LlmGridSelector with search and pagination

Replaces dropdown with card-based grid layout.
- Search bar filters LLMs by name or provider
- 9 LLMs per page with prev/next navigation
- Matches library selection card design

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Replace LlmSelector with LlmGridSelector in Page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Update imports**

In `src/app/page.tsx`, replace the LlmSelector import:

```typescript
// Remove this:
import { LlmSelector } from "@/components/llm-selector"

// Add this:
import { LlmGridSelector } from "@/components/llm-grid-selector"
```

**Step 2: Replace LlmSelector usage in JSX**

Find the LlmSelector usage (around line 138-141) and replace with:

```typescript
<LlmGridSelector
  value={selectedLlmName}
  onValueChange={handleSelectLlm}
/>
```

**Step 3: Verify the app builds and works**

Run: `npm run build && npm run dev`
Expected: App builds and LLM selection shows card grid

**Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "$(cat <<'EOF'
refactor: replace LlmSelector dropdown with LlmGridSelector

LLM selection now uses same card-based layout as library selection
with search bar and pagination.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Clean Up Old LlmSelector Component (Optional)

**Files:**
- Delete: `src/components/llm-selector.tsx` (or keep for potential future use)

**Step 1: Check if LlmSelector is used elsewhere**

Run: `grep -r "LlmSelector" src/`
Expected: No usages except the component file itself

**Step 2: Delete the old component (optional)**

If not used elsewhere:

```bash
rm src/components/llm-selector.tsx
```

**Step 3: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore: remove unused LlmSelector dropdown component

Replaced by LlmGridSelector with card-based layout.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Final Integration Testing

**Files:**
- None (manual testing)

**Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 2: Run dev server and test manually**

Run: `npm run dev`

Test checklist:
1. Search for a library (e.g., "react")
2. Verify 9 results display in card grid
3. Click next page, verify new results load
4. Click previous page, verify previous results
5. Select a library
6. Verify LLM grid appears with 9 LLMs
7. Type in LLM search bar, verify filtering works
8. Use pagination on LLM grid
9. Select an LLM
10. Verify version scores display correctly

**Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 4: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "$(cat <<'EOF'
fix: integration testing fixes

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Summary of Changes

| Task | Files Changed | Description |
|------|--------------|-------------|
| 1 | libraries-io.ts, tests | Fix type mismatch - extract versions from project response |
| 2 | mini-pagination.tsx, tests | New minimalist pagination component |
| 3 | page.tsx, search-results.tsx | Add pagination to library search |
| 4 | llm-card.tsx | New card component for LLM display |
| 5 | llms/route.ts, llm-grid-selector.tsx | New grid selector with search/pagination |
| 6 | page.tsx | Replace dropdown with grid selector |
| 7 | llm-selector.tsx | Remove old dropdown component |
| 8 | - | Integration testing |
