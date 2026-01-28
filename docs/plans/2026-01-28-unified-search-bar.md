# Unified Search Bar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current three-step flow (LLM selector grid + Library selector grid + separate search inputs) with a single, unified search bar composed of an LLM dropdown, a Platform dropdown, and a library search input, all visually integrated on one line.

**Architecture:** Two new backend API routes proxy Libraries.io (platforms + search) so the frontend never touches external APIs or sees the API key. A new `UnifiedSearchBar` client component composes a Radix Select for LLM, a Radix Select for Platform, and a text input into one cohesive bar. The existing page orchestration in `page.tsx` is updated to use this new component and feed search results to the existing `VersionScores` component.

**Tech Stack:** Next.js App Router API routes, Radix UI Select, Tailwind CSS, Libraries.io REST API (proxied), existing domain models.

---

## Task 1: Add `LIBRARIES_IO_API_KEY` to environment

**Files:**
- Modify: `.env` (line 1-2, add new variable)

**Step 1: Add environment variable**

Add the following line to `.env`:

```
LIBRARIES_IO_API_KEY=your_api_key_here
```

The developer must replace `your_api_key_here` with their actual Libraries.io API key from https://libraries.io/account.

**Step 2: Commit**

```bash
git add .env
git commit -m "chore: add LIBRARIES_IO_API_KEY env variable"
```

> **Note:** `.env` is already in `.gitignore` for most Next.js projects. Verify this before committing. If not gitignored, do NOT commit it.

---

## Task 2: Create backend route `GET /api/platforms`

**Files:**
- Create: `src/app/api/platforms/route.ts`

**Step 1: Write the failing test**

Create `src/app/api/platforms/__tests__/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

// We'll test the fetch-and-proxy logic extracted into a helper
// Since Next.js route handlers are hard to unit test directly,
// we test the adapter function that does the actual work.

describe("GET /api/platforms", () => {
  it("should be defined as a module", async () => {
    const mod = await import("../route")
    expect(mod.GET).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/platforms/__tests__/route.test.ts`
Expected: FAIL (module not found)

**Step 3: Create the Libraries.io platforms adapter**

Create `src/infrastructure/adapters/libraries-io.ts`:

```typescript
const LIBRARIES_IO_BASE_URL = "https://libraries.io/api"

function getApiKey(): string {
  const key = process.env.LIBRARIES_IO_API_KEY
  if (!key) {
    throw new Error("LIBRARIES_IO_API_KEY environment variable is not set")
  }
  return key
}

export interface LibrariesIoPlatform {
  name: string
  project_count: number
  homepage: string
  color: string
  default_language: string | null
}

export interface LibrariesIoSearchResult {
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
  versions: { number: string; published_at: string }[] | null
}

export async function fetchPlatforms(): Promise<LibrariesIoPlatform[]> {
  const res = await fetch(
    `${LIBRARIES_IO_BASE_URL}/platforms?api_key=${getApiKey()}`,
    { next: { revalidate: 86400 } } // cache for 24h
  )

  if (!res.ok) {
    throw new Error(`Libraries.io API error: ${res.status} ${res.statusText}`)
  }

  return res.json()
}

export interface SearchLibrariesParams {
  q: string
  platforms?: string
  page?: number
  per_page?: number
  sort?: string
}

export async function searchLibraries(
  params: SearchLibrariesParams
): Promise<LibrariesIoSearchResult[]> {
  const query = new URLSearchParams({
    api_key: getApiKey(),
    q: params.q,
    per_page: String(params.per_page ?? 10),
    page: String(params.page ?? 1),
    sort: params.sort ?? "rank",
  })

  if (params.platforms) {
    query.set("platforms", params.platforms)
  }

  const res = await fetch(
    `${LIBRARIES_IO_BASE_URL}/search?${query}`,
    { next: { revalidate: 300 } } // cache for 5min
  )

  if (!res.ok) {
    throw new Error(`Libraries.io API error: ${res.status} ${res.statusText}`)
  }

  return res.json()
}
```

**Step 4: Create the route handler**

Create `src/app/api/platforms/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { fetchPlatforms } from "@/infrastructure/adapters/libraries-io"

export async function GET() {
  try {
    const platforms = await fetchPlatforms()

    const data = platforms.map((p) => ({
      name: p.name,
      projectCount: p.project_count,
      color: p.color,
      defaultLanguage: p.default_language,
    }))

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Failed to fetch platforms:", error)
    return NextResponse.json(
      { error: "Failed to fetch platforms" },
      { status: 500 }
    )
  }
}
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run src/app/api/platforms/__tests__/route.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/infrastructure/adapters/libraries-io.ts src/app/api/platforms/route.ts src/app/api/platforms/__tests__/route.test.ts
git commit -m "feat: add GET /api/platforms proxying Libraries.io"
```

---

## Task 3: Create backend route `GET /api/search`

**Files:**
- Create: `src/app/api/search/route.ts`

**Step 1: Write the failing test**

Create `src/app/api/search/__tests__/route.test.ts`:

```typescript
import { describe, it, expect } from "vitest"

describe("GET /api/search", () => {
  it("should be defined as a module", async () => {
    const mod = await import("../route")
    expect(mod.GET).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/search/__tests__/route.test.ts`
Expected: FAIL (module not found)

**Step 3: Create the route handler**

NOTE: The route handler will be a proxy to the Libraries.io search API.
THIS is an example, but we should stick with project structure, follow DDD and clean architecture. 
Create `src/app/api/search/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { searchLibraries } from "@/infrastructure/adapters/libraries-io"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")
    const platforms = searchParams.get("platforms") ?? undefined
    const page = parseInt(searchParams.get("page") ?? "1")
    const perPage = parseInt(searchParams.get("per_page") ?? "10")
    const sort = searchParams.get("sort") ?? "rank"

    if (!q || !q.trim()) {
      return NextResponse.json(
        { error: "q (search query) is required" },
        { status: 400 }
      )
    }

    if (page < 1 || !Number.isInteger(page)) {
      return NextResponse.json(
        { error: "page must be a positive integer" },
        { status: 400 }
      )
    }

    if (perPage < 1 || perPage > 100 || !Number.isInteger(perPage)) {
      return NextResponse.json(
        { error: "per_page must be an integer between 1 and 100" },
        { status: 400 }
      )
    }

    const results = await searchLibraries({
      q: q.trim(),
      platforms,
      page,
      per_page: perPage,
      sort,
    })

    const data = results.map((r) => ({
      name: r.name,
      platform: r.platform,
      description: r.description,
      latestVersion: r.latest_stable_release_number ?? r.latest_release_number,
      latestReleaseAt: r.latest_stable_release_published_at,
      stars: r.stars,
      language: r.language,
      rank: r.rank,
    }))

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Failed to search libraries:", error)
    return NextResponse.json(
      { error: "Failed to search libraries" },
      { status: 500 }
    )
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/search/__tests__/route.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/search/route.ts src/app/api/search/__tests__/route.test.ts
git commit -m "feat: add GET /api/search proxying Libraries.io search"
```

---

## Task 4: Create the `UnifiedSearchBar` component

**Files:**
- Create: `src/components/unified-search-bar.tsx`

**Step 1: Define the component interface**

The component needs these props:

```typescript
interface UnifiedSearchBarProps {
  onSearch: (params: { llmId: string; platform: string; query: string }) => void
}
```

**Step 2: Create the component**

Create `src/components/unified-search-bar.tsx`:

```typescript
"use client"

import { useState, useEffect, useCallback } from "react"
import * as Select from "@radix-ui/react-select"
import { Search, ChevronDown, Check, Bot, Layers } from "lucide-react"
import { cn } from "@/lib/cn"
import type { Llm } from "@/domain/models"

interface Platform {
  name: string
  projectCount: number
  color: string
  defaultLanguage: string | null
}

interface UnifiedSearchBarProps {
  onSearch: (params: { llmId: string; platform: string; query: string }) => void
}

export function UnifiedSearchBar({ onSearch }: UnifiedSearchBarProps) {
  const [llms, setLlms] = useState<Llm[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [selectedLlmId, setSelectedLlmId] = useState("")
  const [selectedPlatform, setSelectedPlatform] = useState("")
  const [query, setQuery] = useState("")
  const [loadingLlms, setLoadingLlms] = useState(true)
  const [loadingPlatforms, setLoadingPlatforms] = useState(true)

  useEffect(() => {
    fetch("/api/llms")
      .then((res) => res.json())
      .then((json) => setLlms(json.data))
      .catch(console.error)
      .finally(() => setLoadingLlms(false))
  }, [])

  useEffect(() => {
    fetch("/api/platforms")
      .then((res) => res.json())
      .then((json) => setPlatforms(json.data))
      .catch(console.error)
      .finally(() => setLoadingPlatforms(false))
  }, [])

  const handleSearch = useCallback(() => {
    if (!selectedLlmId || !query.trim()) return
    onSearch({
      llmId: selectedLlmId,
      platform: selectedPlatform,
      query: query.trim(),
    })
  }, [selectedLlmId, selectedPlatform, query, onSearch])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  return (
    <div className="flex w-full items-center rounded-xl border border-border/50 bg-card shadow-sm transition-shadow focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 focus-within:shadow-md">
      {/* LLM Dropdown */}
      <Select.Root value={selectedLlmId} onValueChange={setSelectedLlmId}>
        <Select.Trigger
          className={cn(
            "inline-flex h-12 items-center gap-2 border-r border-border/50 px-4",
            "text-sm font-medium text-foreground outline-none",
            "cursor-pointer transition-colors hover:bg-muted/50",
            "rounded-l-xl",
            !selectedLlmId && "text-muted-foreground"
          )}
          aria-label="Select LLM"
        >
          <Bot className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Select.Value placeholder="LLM" />
          <Select.Icon>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content
            className="z-50 max-h-60 overflow-auto rounded-xl border border-border/50 bg-popover p-1 shadow-lg"
            position="popper"
            sideOffset={4}
          >
            <Select.Viewport>
              {loadingLlms ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Loading...
                </div>
              ) : (
                llms.map((llm) => (
                  <Select.Item
                    key={llm.id}
                    value={llm.id}
                    className={cn(
                      "relative flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none",
                      "text-popover-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                    )}
                  >
                    <Select.ItemIndicator className="absolute left-1">
                      <Check className="h-3 w-3" />
                    </Select.ItemIndicator>
                    <Select.ItemText>
                      <span className="pl-4">{llm.name}</span>
                    </Select.ItemText>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {llm.provider}
                    </span>
                  </Select.Item>
                ))
              )}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>

      {/* Platform Dropdown */}
      <Select.Root value={selectedPlatform} onValueChange={setSelectedPlatform}>
        <Select.Trigger
          className={cn(
            "inline-flex h-12 items-center gap-2 border-r border-border/50 px-4",
            "text-sm font-medium text-foreground outline-none",
            "cursor-pointer transition-colors hover:bg-muted/50",
            !selectedPlatform && "text-muted-foreground"
          )}
          aria-label="Select Platform"
        >
          <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Select.Value placeholder="Platform" />
          <Select.Icon>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content
            className="z-50 max-h-60 overflow-auto rounded-xl border border-border/50 bg-popover p-1 shadow-lg"
            position="popper"
            sideOffset={4}
          >
            <Select.Viewport>
              {loadingPlatforms ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Loading...
                </div>
              ) : (
                platforms.map((p) => (
                  <Select.Item
                    key={p.name}
                    value={p.name}
                    className={cn(
                      "relative flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none",
                      "text-popover-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                    )}
                  >
                    <Select.ItemIndicator className="absolute left-1">
                      <Check className="h-3 w-3" />
                    </Select.ItemIndicator>
                    <Select.ItemText>
                      <span className="pl-4">{p.name}</span>
                    </Select.ItemText>
                    <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                      {p.projectCount.toLocaleString()}
                    </span>
                  </Select.Item>
                ))
              )}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>

      {/* Search Input */}
      <div className="relative flex flex-1 items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search libraries..."
          className={cn(
            "h-12 w-full bg-transparent px-4 text-sm text-foreground",
            "placeholder:text-muted-foreground outline-none"
          )}
        />
        <button
          onClick={handleSearch}
          disabled={!selectedLlmId || !query.trim()}
          className={cn(
            "mr-2 inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg",
            "bg-primary text-primary-foreground transition-colors",
            "hover:bg-primary/90",
            "disabled:cursor-not-allowed disabled:opacity-40"
          )}
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/components/unified-search-bar.tsx
git commit -m "feat: add UnifiedSearchBar component with LLM, Platform, and search input"
```

---

## Task 5: Create `SearchResults` component

**Files:**
- Create: `src/components/search-results.tsx`

**Step 1: Create the component**

This component displays the search results from Libraries.io and lets the user pick a library to see version compatibility.

Create `src/components/search-results.tsx`:

```typescript
"use client"

import { motion } from "framer-motion"
import { Package, Star, ExternalLink } from "lucide-react"
import { cn } from "@/lib/cn"

export interface SearchResultItem {
  name: string
  platform: string
  description: string | null
  latestVersion: string | null
  latestReleaseAt: string | null
  stars: number
  language: string | null
  rank: number
}

interface SearchResultsProps {
  results: SearchResultItem[]
  loading: boolean
  onSelectLibrary: (libraryName: string, platform: string) => void
  selectedName?: string
}

export function SearchResults({
  results,
  loading,
  onSelectLibrary,
  selectedName,
}: SearchResultsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl bg-muted"
          />
        ))}
      </div>
    )
  }

  if (results.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {results.map((item, i) => {
        const isSelected = item.name === selectedName
        return (
          <motion.button
            key={`${item.platform}-${item.name}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.03 }}
            onClick={() => onSelectLibrary(item.name, item.platform)}
            className={cn(
              "group flex cursor-pointer flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all",
              isSelected
                ? "border-primary bg-muted ring-1 ring-primary/20"
                : "border-border/50 bg-card hover:border-primary/30 hover:bg-muted hover:shadow-md"
            )}
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-card-foreground">
                  {item.name}
                </span>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {item.platform}
              </span>
            </div>
            {item.description && (
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {item.description}
              </p>
            )}
            <div className="flex items-center gap-3">
              {item.latestVersion && (
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                  v{item.latestVersion}
                </span>
              )}
              {item.stars > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
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
          </motion.button>
        )
      })}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/search-results.tsx
git commit -m "feat: add SearchResults component for Libraries.io results"
```

---

## Task 6: Update `page.tsx` to use the unified search bar

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Rewrite the page**

Replace the current three-step flow with the new unified search bar. The flow becomes:

1. User fills out the unified search bar (LLM + Platform + query) and hits search.
2. Search results appear below as a card grid.
3. User clicks a result card.
4. Version compatibility scores appear below (reusing the existing `VersionScores` component requires the library to exist in the DB, so we'll show a different compatibility view for Libraries.io results or gracefully indicate that the library needs to be in the local DB).

Since the existing `VersionScores` component relies on internal DB libraries and the compatibility endpoint (`/api/compatibility`), and Libraries.io search results won't be in the local DB, we need to handle this transition. For this task, the flow will be:

1. Unified search bar at top (replaces Hero + Step 1 + Step 2 search inputs).
2. Search results grid replaces the library selection grid.
3. When a user selects a search result that matches a local library (by name), the existing compatibility flow kicks in.
4. For libraries not in the local DB, show an informational message.

Modify `src/app/page.tsx`:

```typescript
"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Github, Linkedin } from "lucide-react"
import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { SectionHeader } from "@/components/section-header"
import { UnifiedSearchBar } from "@/components/unified-search-bar"
import { SearchResults, type SearchResultItem } from "@/components/search-results"
import { VersionScores } from "@/components/version-scores"
import { Disclaimer } from "@/components/disclaimer"
import { EmptyState } from "@/components/empty-state"
import { SearchX } from "lucide-react"

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
}

export default function Home() {
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedLlmId, setSelectedLlmId] = useState<string>()
  const [selectedLibraryName, setSelectedLibraryName] = useState<string>()
  const [matchedLibraryId, setMatchedLibraryId] = useState<string>()

  const handleSearch = useCallback(
    async (params: { llmId: string; platform: string; query: string }) => {
      setSelectedLlmId(params.llmId)
      setSelectedLibraryName(undefined)
      setMatchedLibraryId(undefined)
      setSearchLoading(true)
      setHasSearched(true)

      try {
        const searchParams = new URLSearchParams({ q: params.query })
        if (params.platform) {
          searchParams.set("platforms", params.platform)
        }
        const res = await fetch(`/api/search?${searchParams}`)
        const json = await res.json()
        setSearchResults(json.data ?? [])
      } catch (error) {
        console.error("Search failed:", error)
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    },
    []
  )

  const handleSelectLibrary = useCallback(
    async (libraryName: string, _platform: string) => {
      setSelectedLibraryName(libraryName)
      setMatchedLibraryId(undefined)

      // Try to find the library in the local DB
      try {
        const res = await fetch(
          `/api/libraries?search=${encodeURIComponent(libraryName)}&limit=1`
        )
        const json = await res.json()
        if (json.data && json.data.length > 0) {
          const match = json.data.find(
            (lib: { name: string }) =>
              lib.name.toLowerCase() === libraryName.toLowerCase()
          )
          if (match) {
            setMatchedLibraryId(match.id)
          }
        }
      } catch (error) {
        console.error("Failed to match library:", error)
      }
    },
    []
  )

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
        <Hero />

        {/* Unified Search Bar */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
          transition={{ duration: 0.4 }}
        >
          <SectionHeader
            step={1}
            title="Search for a library"
            subtitle="Select your LLM, optionally filter by platform, and search"
          />
          <UnifiedSearchBar onSearch={handleSearch} />
        </motion.section>

        {/* Search Results */}
        <AnimatePresence>
          {hasSearched && (
            <motion.section
              key="results-section"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={sectionVariants}
              transition={{ duration: 0.4 }}
            >
              <SectionHeader
                step={2}
                title="Select a library"
                subtitle="Choose a library to check version compatibility"
              />
              {!searchLoading && searchResults.length === 0 ? (
                <EmptyState
                  icon={SearchX}
                  title="No libraries found"
                  description="Try adjusting your search terms or platform filter."
                />
              ) : (
                <SearchResults
                  results={searchResults}
                  loading={searchLoading}
                  onSelectLibrary={handleSelectLibrary}
                  selectedName={selectedLibraryName}
                />
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* Version Scores */}
        <AnimatePresence>
          {selectedLlmId && selectedLibraryName && (
            <motion.section
              key="version-section"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={sectionVariants}
              transition={{ duration: 0.4 }}
            >
              <SectionHeader
                step={3}
                title="Version compatibility"
                subtitle="Scores based on LLM training cutoff heuristics"
              />
              {matchedLibraryId ? (
                <VersionScores
                  llmId={selectedLlmId}
                  libraryId={matchedLibraryId}
                />
              ) : (
                <EmptyState
                  icon={SearchX}
                  title="Library not in local database"
                  description={`"${selectedLibraryName}" was found on Libraries.io but is not yet in our local database. Version compatibility scoring requires local version data.`}
                />
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Disclaimer />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Developed by Marcos Morais</span>
            <span className="text-border">|</span>
            <a
              href="https://www.linkedin.com/in/marcosmoraisdev/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
            >
              <Linkedin className="h-3.5 w-3.5" />
              LinkedIn
            </a>
            <a
              href="https://github.com/marcosmoraisdev"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
            >
              <Github className="h-3.5 w-3.5" />
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
```

**Step 2: Run the dev server and verify manually**

Run: `npm run dev`

Verify:
- The page loads with the unified search bar.
- LLM dropdown populates from `/api/llms`.
- Platform dropdown populates from `/api/platforms`.
- Typing a query and pressing Enter or clicking the search icon calls `/api/search`.
- Results appear as a card grid.
- Clicking a result attempts to match it to a local library.
- If matched, version scores appear.

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: replace three-step flow with unified search bar"
```

---

## Task 7: Write adapter unit tests

**Files:**
- Create: `src/infrastructure/adapters/__tests__/libraries-io.test.ts`

**Step 1: Write the tests**

Create `src/infrastructure/adapters/__tests__/libraries-io.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

describe("libraries-io adapter", () => {
  const originalEnv = process.env.LIBRARIES_IO_API_KEY

  beforeEach(() => {
    process.env.LIBRARIES_IO_API_KEY = "test-api-key"
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    process.env.LIBRARIES_IO_API_KEY = originalEnv
    vi.restoreAllMocks()
  })

  describe("fetchPlatforms", () => {
    it("calls Libraries.io with API key and returns platforms", async () => {
      const mockPlatforms = [
        { name: "NPM", project_count: 5000000, homepage: "https://npmjs.com", color: "#cb3837", default_language: "JavaScript" },
      ]
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPlatforms),
      } as Response)

      const { fetchPlatforms } = await import("../libraries-io")
      const result = await fetchPlatforms()

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("api_key=test-api-key"),
        expect.any(Object)
      )
      expect(result).toEqual(mockPlatforms)
    })

    it("throws when API key is missing", async () => {
      delete process.env.LIBRARIES_IO_API_KEY

      // Re-import to get fresh module
      vi.resetModules()
      const { fetchPlatforms } = await import("../libraries-io")

      await expect(fetchPlatforms()).rejects.toThrow("LIBRARIES_IO_API_KEY")
    })

    it("throws on non-OK response", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      } as Response)

      const { fetchPlatforms } = await import("../libraries-io")
      await expect(fetchPlatforms()).rejects.toThrow("Libraries.io API error")
    })
  })

  describe("searchLibraries", () => {
    it("calls Libraries.io search with correct params", async () => {
      const mockResults = [
        { name: "react", platform: "NPM", description: "A JS library", stars: 200000 },
      ]
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResults),
      } as Response)

      const { searchLibraries } = await import("../libraries-io")
      const result = await searchLibraries({
        q: "react",
        platforms: "NPM",
        page: 1,
        per_page: 10,
        sort: "rank",
      })

      const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string
      expect(calledUrl).toContain("q=react")
      expect(calledUrl).toContain("platforms=NPM")
      expect(calledUrl).toContain("per_page=10")
      expect(calledUrl).toContain("sort=rank")
      expect(result).toEqual(mockResults)
    })

    it("omits platforms param when not provided", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response)

      const { searchLibraries } = await import("../libraries-io")
      await searchLibraries({ q: "react" })

      const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string
      expect(calledUrl).not.toContain("platforms=")
    })
  })
})
```

**Step 2: Run tests**

Run: `npx vitest run src/infrastructure/adapters/__tests__/libraries-io.test.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/infrastructure/adapters/__tests__/libraries-io.test.ts
git commit -m "test: add unit tests for Libraries.io adapter"
```

---

## Task 8: Run full test suite and fix any issues

**Step 1: Run all tests**

Run: `npm test`
Expected: All existing tests (scoring + risk) and new tests pass.

**Step 2: Run linter**

Run: `npm run lint`
Expected: No errors.

**Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds.

**Step 4: Fix any issues found in steps 1-3**

If any tests, lint, or build errors appear, fix them before proceeding.

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve test/lint/build issues"
```

---

## Task 9: Manual smoke test

**Step 1: Start the dev server**

Run: `npm run dev`

**Step 2: Verify the unified search bar**

1. Open http://localhost:3000
2. Verify the LLM dropdown shows all 5 LLMs from the seed data.
3. Verify the Platform dropdown loads platforms from Libraries.io.
4. Type "react" in the search input.
5. Press Enter. Verify results appear.
6. Click on "react" in the results. Verify it matches the local DB entry and shows version compatibility scores.
7. Search for a library NOT in the local DB (e.g., "lodash"). Verify the "not in local database" message appears.
8. Toggle dark/light mode. Verify the search bar looks correct in both themes.
9. Test the responsive layout on narrow viewports.

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete unified search bar implementation"
```

---

## Summary of files created/modified

| Action | File |
|--------|------|
| Modify | `.env` (add `LIBRARIES_IO_API_KEY`) |
| Create | `src/infrastructure/adapters/libraries-io.ts` |
| Create | `src/infrastructure/adapters/__tests__/libraries-io.test.ts` |
| Create | `src/app/api/platforms/route.ts` |
| Create | `src/app/api/platforms/__tests__/route.test.ts` |
| Create | `src/app/api/search/route.ts` |
| Create | `src/app/api/search/__tests__/route.test.ts` |
| Create | `src/components/unified-search-bar.tsx` |
| Create | `src/components/search-results.tsx` |
| Modify | `src/app/page.tsx` |

## Components kept as-is (not modified)

- `src/components/version-scores.tsx` (reused for compatibility display)
- `src/components/score-badge.tsx`
- `src/components/section-header.tsx`
- `src/components/header.tsx`
- `src/components/hero.tsx`
- `src/components/disclaimer.tsx`
- `src/components/empty-state.tsx`
- `src/components/pagination.tsx`
- All domain services and models
- All infrastructure repositories

## Components that become unused (candidate for removal in a follow-up)

- `src/components/llm-list.tsx` (LLM selection moved into UnifiedSearchBar)
- `src/components/library-list.tsx` (library selection moved to SearchResults)
- `src/components/search-input.tsx` (search input now embedded in UnifiedSearchBar)
- `src/components/skeleton-card.tsx` (may still be useful; keep for now)
