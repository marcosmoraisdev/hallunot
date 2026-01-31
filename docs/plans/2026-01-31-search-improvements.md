# Search Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve the search experience with a scrollable/filterable platform dropdown, simplified pagination UI, and enhanced version data in search results.

**Architecture:** Three independent improvements that can be implemented sequentially. The platform dropdown gets filtering and scroll. Pagination keeps the same UX but removes totalPages from the UI (since Libraries.io doesn't provide total count), using hasMore logic instead. Search results are enriched with version data.

**Tech Stack:** React, Radix UI, Next.js API routes

---

## Task 1: Platform Dropdown - Scrolling and Filtering

**Files:**
- Modify: `src/components/unified-search-bar.tsx:65-122`

**Step 1: Write the updated platform dropdown with scroll and filter**

The dropdown needs:
1. A search input at the top (inside the dropdown content)
2. ScrollArea from Radix UI for the options list
3. Filter state to filter platforms by name

Replace lines 65-122 with:

```tsx
      {/* Platform Dropdown */}
      <Select.Root
        value={selectedPlatform}
        onValueChange={setSelectedPlatform}
        onOpenChange={(open) => {
          if (!open) setPlatformFilter("")
        }}
      >
        <Select.Trigger
          className={cn(
            "flex shrink-0 items-center gap-2 border-r border-border/50 px-3 py-2.5",
            "text-sm text-foreground outline-none",
            "hover:bg-muted/50 transition-colors",
            "data-[placeholder]:text-muted-foreground"
          )}
          aria-label="Select Platform"
        >
          <Layers className="h-4 w-4 text-muted-foreground" />
          <Select.Value placeholder={platformsLoading ? "Loading..." : "Platform"} />
          {platformsLoading ? (
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
              "z-50 overflow-hidden rounded-xl border border-border/50 bg-card shadow-lg",
              "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
            )}
            position="popper"
            sideOffset={8}
          >
            {/* Filter input */}
            <div className="border-b border-border/50 p-2">
              <input
                type="text"
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                placeholder="Filter platforms..."
                className={cn(
                  "w-full rounded-md border border-border/50 bg-background px-2.5 py-1.5",
                  "text-sm text-foreground placeholder:text-muted-foreground",
                  "outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                )}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
            <ScrollArea.Root className="h-[240px] overflow-hidden">
              <Select.Viewport asChild>
                <ScrollArea.Viewport className="h-full w-full p-1">
                  {filteredPlatforms.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No platforms found
                    </div>
                  ) : (
                    filteredPlatforms.map((platform) => (
                      <Select.Item
                        key={platform.name}
                        value={platform.name}
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
                          <Select.ItemText>{platform.name}</Select.ItemText>
                          <span className="text-[10px] text-muted-foreground">
                            {formatProjectCount(platform.projectCount)} projects
                          </span>
                        </div>
                      </Select.Item>
                    ))
                  )}
                </ScrollArea.Viewport>
              </Select.Viewport>
              <ScrollArea.Scrollbar
                orientation="vertical"
                className="flex w-2.5 touch-none select-none p-0.5 transition-colors"
              >
                <ScrollArea.Thumb className="relative flex-1 rounded-full bg-border" />
              </ScrollArea.Scrollbar>
            </ScrollArea.Root>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
```

**Step 2: Add the filter state and computed filtered list**

After line 31 (after `const [query, setQuery] = useState("")`), add:

```tsx
  const [platformFilter, setPlatformFilter] = useState("")

  const filteredPlatforms = platforms.filter((p) =>
    p.name.toLowerCase().includes(platformFilter.toLowerCase())
  )
```

**Step 3: Add ScrollArea import**

Update line 5 to include ScrollArea:

```tsx
import * as Select from "@radix-ui/react-select"
import * as ScrollArea from "@radix-ui/react-scroll-area"
```

**Step 4: Build and verify**

Run: `npm run build`

Expected: Build succeeds without errors

**Step 5: Commit**

```bash
git add src/components/unified-search-bar.tsx
git commit -m "feat: add scrolling and filtering to platform dropdown

- Add filter input inside dropdown content
- Use Radix ScrollArea for scrollable list
- Filter platforms by name case-insensitively
- Clear filter when dropdown closes

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Pagination - Remove totalPages, Start at Page 0, Show "No More Results"

**Files:**
- Modify: `src/app/page.tsx:31-32,52,59-66,141-143`
- Modify: `src/components/search-results.tsx:24-26,34-36,114-120`
- Modify: `src/components/mini-pagination.tsx:6-49` (rewrite)

**Step 1: Update MiniPagination to not show totalPages**

Replace the entire content of `src/components/mini-pagination.tsx`:

```tsx
"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/cn"

interface MiniPaginationProps {
  page: number
  hasMore: boolean
  onPageChange: (page: number) => void
}

export function MiniPagination({ page, hasMore, onPageChange }: MiniPaginationProps) {
  // Don't show pagination if on first page with no more results
  if (page === 0 && !hasMore) return null

  return (
    <div className="flex items-center justify-center gap-3 pt-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 0}
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
        Page {page + 1}
      </span>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={!hasMore}
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

**Step 2: Update SearchResults to use hasMore instead of totalPages**

In `src/components/search-results.tsx`:

Update the interface (lines 19-27):

```tsx
interface SearchResultsProps {
  results: SearchResultItem[]
  loading: boolean
  onSelectLibrary: (libraryName: string, platform: string) => void
  selectedName?: string
  page?: number
  hasMore?: boolean
  onPageChange?: (page: number) => void
  noMoreMessage?: string
}
```

Update the function parameters (lines 29-37):

```tsx
export function SearchResults({
  results,
  loading,
  onSelectLibrary,
  selectedName,
  page = 0,
  hasMore = false,
  onPageChange,
  noMoreMessage,
}: SearchResultsProps) {
```

Update the MiniPagination usage (lines 114-120):

```tsx
      {onPageChange && (
        <MiniPagination
          page={page}
          hasMore={hasMore}
          onPageChange={onPageChange}
        />
      )}
      {noMoreMessage && (
        <p className="pt-4 text-center text-sm text-muted-foreground">
          {noMoreMessage}
        </p>
      )}
```

**Step 3: Update page.tsx state and logic**

In `src/app/page.tsx`:

Replace lines 31-32:

```tsx
  const [libraryPage, setLibraryPage] = useState(0)
  const [hasMoreLibraries, setHasMoreLibraries] = useState(false)
  const [noMoreMessage, setNoMoreMessage] = useState("")
```

Update handleSearch (lines 35-74). Replace with:

```tsx
  const handleSearch = useCallback(
    async (params: { platform: string; query: string }, page = 0) => {
      // Clear downstream state only on new search (page 0)
      if (page === 0) {
        setSelectedLibrary(null)
        setSelectedLlmName("")
        setNoMoreMessage("")
      }
      setSearchLoading(true)
      setHasSearched(true)
      setLibraryPage(page)
      setCurrentSearchParams(params)

      try {
        const searchParams = new URLSearchParams({ q: params.query })
        if (params.platform) {
          searchParams.set("platforms", params.platform)
        }
        searchParams.set("page", String(page))
        searchParams.set("per_page", "9")

        const res = await fetch(`/api/search?${searchParams.toString()}`)
        const json = await res.json()
        const data = json.data ?? []
        setSearchResults(data)

        // Determine if there are more results
        const hasMore = data.length === 9
        setHasMoreLibraries(hasMore)

        // Show message when navigating to a page with no results
        if (data.length === 0 && page > 0) {
          setNoMoreMessage("No more results")
        } else {
          setNoMoreMessage("")
        }
      } catch {
        setSearchResults([])
        setHasMoreLibraries(false)
      } finally {
        setSearchLoading(false)
      }
    },
    []
  )
```

Update SearchResults props (lines 136-144):

```tsx
                <SearchResults
                  results={searchResults}
                  loading={searchLoading}
                  onSelectLibrary={handleSelectLibrary}
                  selectedName={selectedLibrary?.name}
                  page={libraryPage}
                  hasMore={hasMoreLibraries}
                  onPageChange={handleLibraryPageChange}
                  noMoreMessage={noMoreMessage}
                />
```

**Step 4: Build and verify**

Run: `npm run build`

Expected: Build succeeds without errors

**Step 5: Commit**

```bash
git add src/app/page.tsx src/components/search-results.tsx src/components/mini-pagination.tsx
git commit -m "feat: simplify pagination - remove totalPages, start at page 0

- MiniPagination now uses hasMore instead of totalPages
- Search starts at page 0 (0-indexed)
- Display 'No more results' when navigating past last page
- Remove totalPages from UI, keep hasMore logic

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Include Versions in Search Results

**Files:**
- Modify: `src/app/api/search/route.ts`
- Modify: `src/components/search-results.tsx`

**Step 1: Update the search API to include versions**

The Libraries.io search endpoint already returns versions in the response (see `LibrariesIoSearchResult.versions`). Update the API route to include them.

In `src/app/api/search/route.ts`, update the data mapping (lines 43-53):

```ts
    const data = results.map((r) => ({
      name: r.name,
      platform: r.platform,
      description: r.description,
      latestVersion:
        r.latest_stable_release_number ?? r.latest_release_number,
      latestReleaseAt: r.latest_stable_release_published_at,
      stars: r.stars,
      language: r.language,
      rank: r.rank,
      versions: r.versions ?? [],
    }))
```

**Step 2: Update SearchResultItem interface**

In `src/components/search-results.tsx`, update the interface (lines 8-17):

```ts
export interface SearchResultItem {
  name: string
  platform: string
  description: string | null
  latestVersion: string | null
  latestReleaseAt: string | null
  stars: number
  language: string | null
  rank: number
  versions: { number: string; published_at: string }[]
}
```

**Step 3: Update SearchResults to show version count**

In the card display (around line 93-96), add a version count badge:

```tsx
              <div className="flex w-full items-center gap-3">
                {item.latestVersion && (
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                    v{item.latestVersion}
                  </span>
                )}
                {item.versions.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {item.versions.length} versions
                  </span>
                )}
                {item.stars > 0 && (
                  <span className="flex items-center gap-1 text-[10px] tabular-nums text-muted-foreground">
                    <Star className="h-3 w-3" />
                    {item.stars.toLocaleString()}
                  </span>
                )}
                {item.language && (
                  <span className="text-[10px] text-muted-foreground">
                    {item.language}
                  </span>
                )}
              </div>
```

**Step 4: Build and verify**

Run: `npm run build`

Expected: Build succeeds without errors

**Step 5: Commit**

```bash
git add src/app/api/search/route.ts src/components/search-results.tsx
git commit -m "feat: include versions in search results

- Add versions array to search API response
- Update SearchResultItem interface with versions
- Display version count in search result cards

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Platform dropdown scroll/filter | `unified-search-bar.tsx` |
| 2 | Remove totalPages, start page 0 | `page.tsx`, `search-results.tsx`, `mini-pagination.tsx` |
| 3 | Versions in search results | `search/route.ts`, `search-results.tsx` |

All tasks are independent and can be implemented in any order.
