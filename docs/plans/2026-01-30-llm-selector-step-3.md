# LLM Selector as Step 3 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move LLM selection from the unified search bar to a dedicated Step 3 that appears after the user selects a library, creating a cleaner UX flow.

**Architecture:** The new flow is: (1) Search bar with platform filter + query → (2) Select library from results → (3) Select LLM from a filterable dropdown → (4) View version compatibility scores. The UnifiedSearchBar will be simplified to only contain platform and search. A new LlmSelector component will be created with search/filter functionality.

**Tech Stack:** Next.js App Router, Radix UI (Popover, ScrollArea), Tailwind CSS, Lucide Icons

---

## Assumptions

1. The LLM selector should have a search/filter input to quickly find LLMs.
2. LLMs should display their provider as a badge (OpenAI, Anthropic, Google).
3. The VersionScores component needs to be updated to use the new `/api/score` endpoint (from the existing plan).
4. We keep the SearchResults component unchanged - it already handles library selection well.

---

## Task 1: Create FilterableSelect Base Component

**Files:**
- Create: `src/components/filterable-select.tsx`

**Step 1: Create the FilterableSelect component**

This is a reusable dropdown with search functionality using Radix Popover.

```typescript
// src/components/filterable-select.tsx
"use client"

import { useState, useRef, useEffect } from "react"
import * as Popover from "@radix-ui/react-popover"
import * as ScrollArea from "@radix-ui/react-scroll-area"
import { ChevronDown, Check, Search } from "lucide-react"
import { cn } from "@/lib/cn"

export interface FilterableSelectOption {
  value: string
  label: string
  sublabel?: string
}

interface FilterableSelectProps {
  options: FilterableSelectOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  loading?: boolean
  disabled?: boolean
  icon?: React.ReactNode
  "aria-label"?: string
}

export function FilterableSelect({
  options,
  value,
  onValueChange,
  placeholder,
  loading = false,
  disabled = false,
  icon,
  "aria-label": ariaLabel,
}: FilterableSelectProps) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(filter.toLowerCase()) ||
      (opt.sublabel?.toLowerCase().includes(filter.toLowerCase()) ?? false)
  )

  const selectedOption = options.find((o) => o.value === value)

  useEffect(() => {
    if (open) {
      setFilter("")
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className={cn(
          "flex items-center gap-2 rounded-xl border border-border/50 bg-card px-4 py-3",
          "text-sm text-foreground outline-none",
          "hover:bg-muted/50 transition-colors",
          "focus:ring-2 focus:ring-primary/20 focus:border-primary/50",
          disabled && "cursor-not-allowed opacity-50",
          !value && "text-muted-foreground"
        )}
        disabled={disabled || loading}
        aria-label={ariaLabel}
      >
        {icon}
        <span className="flex-1 text-left truncate">
          {loading ? "Loading..." : selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className={cn(
            "z-50 w-72 rounded-xl border border-border/50 bg-card shadow-lg",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          )}
          sideOffset={8}
          align="start"
        >
          <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>

          <ScrollArea.Root className="h-auto max-h-64">
            <ScrollArea.Viewport className="p-1">
              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No results found
                </div>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onValueChange(opt.value)
                      setOpen(false)
                    }}
                    className={cn(
                      "relative flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm outline-none",
                      "text-foreground transition-colors",
                      "hover:bg-muted",
                      value === opt.value && "bg-muted/50"
                    )}
                  >
                    <div className="w-5 flex justify-center">
                      {value === opt.value && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex flex-1 items-center justify-between gap-2">
                      <span className={cn(value === opt.value && "text-primary font-medium")}>
                        {opt.label}
                      </span>
                      {opt.sublabel && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          {opt.sublabel}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
              className="flex w-2.5 touch-none select-none p-0.5 transition-colors"
              orientation="vertical"
            >
              <ScrollArea.Thumb className="relative flex-1 rounded-full bg-border" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/filterable-select.tsx
git commit -m "feat: add FilterableSelect component with search functionality"
```

---

## Task 2: Create LlmSelector Component

**Files:**
- Create: `src/components/llm-selector.tsx`

**Step 1: Create the LlmSelector component**

This wraps FilterableSelect specifically for LLM selection.

```typescript
// src/components/llm-selector.tsx
"use client"

import { useEffect, useState } from "react"
import { Bot } from "lucide-react"
import { FilterableSelect, type FilterableSelectOption } from "./filterable-select"
import type { Llm } from "@/domain/models"

interface LlmSelectorProps {
  value: string
  onValueChange: (llmName: string) => void
  disabled?: boolean
}

export function LlmSelector({ value, onValueChange, disabled = false }: LlmSelectorProps) {
  const [llms, setLlms] = useState<Llm[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/llms")
      .then((res) => res.json())
      .then((json) => setLlms(json.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const options: FilterableSelectOption[] = llms.map((llm) => ({
    value: llm.name,
    label: llm.name,
    sublabel: llm.provider,
  }))

  return (
    <FilterableSelect
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder="Select an LLM"
      loading={loading}
      disabled={disabled}
      icon={<Bot className="h-4 w-4 text-muted-foreground" />}
      aria-label="Select LLM"
    />
  )
}
```

**Step 2: Commit**

```bash
git add src/components/llm-selector.tsx
git commit -m "feat: add LlmSelector component"
```

---

## Task 3: Simplify UnifiedSearchBar (Remove LLM)

**Files:**
- Modify: `src/components/unified-search-bar.tsx`

**Step 1: Update the UnifiedSearchBar to remove LLM dropdown**

Remove LLM selection, keep only Platform dropdown and search input.

```typescript
// src/components/unified-search-bar.tsx
"use client"

import { useEffect, useState } from "react"
import * as Select from "@radix-ui/react-select"
import { Layers, Search, ChevronDown, Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/cn"

interface Platform {
  name: string
  projectCount: number
  color: string
  defaultLanguage: string
}

interface UnifiedSearchBarProps {
  onSearch: (params: { platform: string; query: string }) => void
}

function formatProjectCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`
  return String(count)
}

export function UnifiedSearchBar({ onSearch }: UnifiedSearchBarProps) {
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [platformsLoading, setPlatformsLoading] = useState(true)

  const [selectedPlatform, setSelectedPlatform] = useState("")
  const [query, setQuery] = useState("")

  useEffect(() => {
    fetch("/api/platforms")
      .then((res) => res.json())
      .then((json) => setPlatforms(json.data ?? []))
      .catch(console.error)
      .finally(() => setPlatformsLoading(false))
  }, [])

  const isSearchDisabled = !query.trim()

  const handleSearch = () => {
    if (isSearchDisabled) return
    onSearch({
      platform: selectedPlatform,
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
        "transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20"
      )}
    >
      {/* Platform Dropdown */}
      <Select.Root value={selectedPlatform} onValueChange={setSelectedPlatform}>
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
            <Select.Viewport className="p-1">
              {platforms.map((platform) => (
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
              ))}
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
          placeholder="Search libraries..."
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

**Step 2: Commit**

```bash
git add src/components/unified-search-bar.tsx
git commit -m "refactor: remove LLM selection from UnifiedSearchBar"
```

---

## Task 4: Update Main Page with New Flow

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Update the page to implement the new 4-step flow**

Flow: Search → Select Library → Select LLM → View Scores

```typescript
// src/app/page.tsx
"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Github, Linkedin, SearchX, Bot } from "lucide-react"
import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { SectionHeader } from "@/components/section-header"
import { UnifiedSearchBar } from "@/components/unified-search-bar"
import { SearchResults } from "@/components/search-results"
import type { SearchResultItem } from "@/components/search-results"
import { LlmSelector } from "@/components/llm-selector"
import { VersionScores } from "@/components/version-scores"
import { Disclaimer } from "@/components/disclaimer"
import { EmptyState } from "@/components/empty-state"

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
}

export default function Home() {
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const [selectedLibrary, setSelectedLibrary] = useState<{ name: string; platform: string } | null>(null)
  const [selectedLlmName, setSelectedLlmName] = useState("")

  const handleSearch = useCallback(
    async (params: { platform: string; query: string }) => {
      // Clear downstream state
      setSelectedLibrary(null)
      setSelectedLlmName("")
      setSearchLoading(true)
      setHasSearched(true)

      try {
        const searchParams = new URLSearchParams({ q: params.query })
        if (params.platform) {
          searchParams.set("platforms", params.platform)
        }
        const res = await fetch(`/api/search?${searchParams.toString()}`)
        const json = await res.json()
        setSearchResults(json.data ?? [])
      } catch {
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    },
    []
  )

  const handleSelectLibrary = useCallback((libraryName: string, platform: string) => {
    setSelectedLibrary({ name: libraryName, platform })
    setSelectedLlmName("") // Reset LLM when library changes
  }, [])

  const handleSelectLlm = useCallback((llmName: string) => {
    setSelectedLlmName(llmName)
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
        <Hero />

        {/* Step 1: Search for a library */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
          transition={{ duration: 0.4 }}
        >
          <SectionHeader
            step={1}
            title="Search for a library"
            subtitle="Choose a platform and search for a library"
          />
          <UnifiedSearchBar onSearch={handleSearch} />
        </motion.section>

        {/* Step 2: Select a library */}
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
                subtitle="Choose a library from the search results"
              />
              {!searchLoading && searchResults.length === 0 ? (
                <EmptyState
                  icon={SearchX}
                  title="No results found"
                  description="Try a different search term or platform."
                />
              ) : (
                <SearchResults
                  results={searchResults}
                  loading={searchLoading}
                  onSelectLibrary={handleSelectLibrary}
                  selectedName={selectedLibrary?.name}
                />
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* Step 3: Select an LLM */}
        <AnimatePresence>
          {selectedLibrary && (
            <motion.section
              key="llm-section"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={sectionVariants}
              transition={{ duration: 0.4 }}
            >
              <SectionHeader
                step={3}
                title="Select an LLM"
                subtitle={`Choose which LLM to evaluate with "${selectedLibrary.name}"`}
              />
              <LlmSelector
                value={selectedLlmName}
                onValueChange={handleSelectLlm}
              />
            </motion.section>
          )}
        </AnimatePresence>

        {/* Step 4: Version compatibility */}
        <AnimatePresence>
          {selectedLibrary && selectedLlmName && (
            <motion.section
              key="version-section"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={sectionVariants}
              transition={{ duration: 0.4 }}
            >
              <SectionHeader
                step={4}
                title="Version compatibility"
                subtitle={`Scores for ${selectedLibrary.name} with ${selectedLlmName}`}
              />
              <VersionScores
                llmName={selectedLlmName}
                libraryName={selectedLibrary.name}
                platform={selectedLibrary.platform || "NPM"}
              />
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

**Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: implement new 4-step flow with LLM selection as step 3"
```

---

## Task 5: Update VersionScores to Use New API

**Files:**
- Modify: `src/components/version-scores.tsx`

**Step 1: Update VersionScores to use /api/score endpoint**

The component now receives `llmName`, `libraryName`, and `platform` as strings and fetches from the new stateless scoring endpoint.

```typescript
// src/components/version-scores.tsx
"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar, AlertOctagon, FileCode2, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/cn"
import { ScoreBadge } from "./score-badge"
import { EmptyState } from "./empty-state"
import { RISK_LABELS } from "@/domain/services/risk"
import { formatDate } from "@/lib/date"
import type { RiskLevel } from "@/domain/models"

interface VersionScoresProps {
  llmName: string
  libraryName: string
  platform: string
}

interface ScoredVersion {
  version: string
  releaseDate: number
  breaking: boolean
  score: number
  risk: RiskLevel
  reason: string
}

interface VersionBucket {
  major: number
  bestScore: number
  versions: ScoredVersion[]
}

export function VersionScores({ llmName, libraryName, platform }: VersionScoresProps) {
  const [buckets, setBuckets] = useState<VersionBucket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedBuckets, setExpandedBuckets] = useState<Set<number>>(new Set())

  useEffect(() => {
    setLoading(true)
    setError(null)
    setBuckets([])
    setExpandedBuckets(new Set())

    const params = new URLSearchParams({
      llm: llmName,
      library: libraryName,
      platform,
    })

    fetch(`/api/score?${params.toString()}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch scores: ${res.status}`)
        }
        return res.json()
      })
      .then((json) => {
        const data = json.data?.buckets ?? []
        setBuckets(data)
        // Auto-expand first bucket
        if (data.length > 0) {
          setExpandedBuckets(new Set([data[0].major]))
        }
      })
      .catch((err) => {
        console.error(err)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [llmName, libraryName, platform])

  const toggleBucket = (major: number) => {
    setExpandedBuckets((prev) => {
      const next = new Set(prev)
      if (next.has(major)) {
        next.delete(major)
      } else {
        next.add(major)
      }
      return next
    })
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-xl bg-muted"
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={FileCode2}
        title="Failed to load scores"
        description={error}
      />
    )
  }

  if (buckets.length === 0) {
    return (
      <EmptyState
        icon={FileCode2}
        title="No version data available"
        description="This library has no recorded versions or the API is unavailable."
      />
    )
  }

  return (
    <div className="space-y-3">
      {buckets.map((bucket) => {
        const isExpanded = expandedBuckets.has(bucket.major)
        return (
          <div
            key={bucket.major}
            className="rounded-xl border border-border/50 bg-card overflow-hidden"
          >
            {/* Bucket header */}
            <button
              type="button"
              onClick={() => toggleBucket(bucket.major)}
              className={cn(
                "flex w-full items-center justify-between px-4 py-3",
                "hover:bg-muted/50 transition-colors"
              )}
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-mono text-sm font-semibold">
                  v{bucket.major}.x
                </span>
                <span className="text-xs text-muted-foreground">
                  ({bucket.versions.length} version{bucket.versions.length !== 1 ? "s" : ""})
                </span>
              </div>
              <ScoreBadge score={bucket.bestScore} risk={bucket.versions[0]?.risk ?? "medium"} />
            </button>

            {/* Bucket content */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-border/50"
                >
                  <div className="p-2 space-y-2">
                    {bucket.versions.map((item) => (
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
                            <ScoreBadge score={item.score} risk={item.risk} />
                            {item.breaking && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-risk-high-bg px-2 py-0.5 text-[10px] font-medium text-risk-high">
                                <AlertOctagon className="h-3 w-3" />
                                Breaking
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                              {RISK_LABELS[item.risk]}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {formatDate(item.releaseDate)}
                            </span>
                          </div>
                        </div>
                        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
                          {item.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/version-scores.tsx
git commit -m "refactor: update VersionScores to use /api/score with bucketed display"
```

---

## Task 6: Create Stateless /api/score Endpoint

**Files:**
- Create: `src/app/api/score/route.ts`

**Step 1: Create the /api/score endpoint**

```typescript
// src/app/api/score/route.ts
import { NextResponse } from "next/server"
import { findLlmByName } from "@/data/llms"
import { fetchProjectVersions } from "@/infrastructure/adapters/libraries-io"
import { computeScore } from "@/domain/services/scoring"
import { detectBreakingChanges } from "@/domain/services/breaking-changes"
import { groupVersionsIntoBuckets } from "@/domain/services/version-buckets"
import { logger } from "@/lib/logger"

export async function GET(request: Request) {
  const reqStart = Date.now()
  const { searchParams } = new URL(request.url)

  const llmName = searchParams.get("llm")?.trim()
  const libraryName = searchParams.get("library")?.trim()
  const platform = searchParams.get("platform")?.trim() || "NPM"

  const log = logger.child({ route: "/api/score", llm: llmName, library: libraryName, platform })

  log.info("incoming request")

  if (!llmName) {
    return NextResponse.json(
      { error: "llm query parameter is required" },
      { status: 400 }
    )
  }

  if (!libraryName) {
    return NextResponse.json(
      { error: "library query parameter is required" },
      { status: 400 }
    )
  }

  try {
    // Find LLM (case-insensitive)
    const llm = findLlmByName(llmName)

    if (!llm) {
      log.warn("LLM not found")
      return NextResponse.json({ error: "LLM not found" }, { status: 404 })
    }

    // Fetch versions from Libraries.io
    let rawVersions
    const fetchStart = Date.now()
    try {
      rawVersions = await fetchProjectVersions(platform, libraryName)
      log.info(
        { fetchDurationMs: Date.now() - fetchStart, versionCount: rawVersions.length },
        "fetched versions from Libraries.io"
      )
    } catch (err) {
      log.error({ err, fetchDurationMs: Date.now() - fetchStart }, "failed to fetch versions from Libraries.io")
      return NextResponse.json(
        { error: "Failed to fetch library versions from external source" },
        { status: 502 }
      )
    }

    if (rawVersions.length === 0) {
      return NextResponse.json({
        data: {
          llm: llm.name,
          library: libraryName,
          platform,
          buckets: [],
        },
      })
    }

    // Detect breaking changes
    const versionsWithBreaking = detectBreakingChanges(
      rawVersions.map((v) => ({
        version: v.number,
        publishedAt: v.published_at,
      }))
    )

    // Score each version
    const scoredVersions = versionsWithBreaking.map((v) => {
      const releaseDate = new Date(v.publishedAt).getTime()
      const { score, risk, reason } = computeScore(
        { releaseDate, breaking: v.breaking },
        { approxCutoff: llm.approxCutoff }
      )
      return {
        version: v.version,
        releaseDate,
        breaking: v.breaking,
        score,
        risk,
        reason,
      }
    })

    // Group into buckets
    const buckets = groupVersionsIntoBuckets(scoredVersions)

    log.info(
      { totalDurationMs: Date.now() - reqStart, bucketCount: buckets.length, versionCount: scoredVersions.length },
      "scoring complete"
    )

    return NextResponse.json({
      data: {
        llm: llm.name,
        library: libraryName,
        platform,
        buckets,
      },
    })
  } catch (err) {
    log.error({ err, totalDurationMs: Date.now() - reqStart }, "unexpected error computing scores")
    return NextResponse.json(
      { error: "Failed to compute scores" },
      { status: 500 }
    )
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/score/route.ts
git commit -m "feat: add stateless /api/score endpoint with bucketed results"
```

---

## Task 7: Verify and Fix Build

**Files:**
- Various (as needed)

**Step 1: Run the build**

```bash
npm run build
```

**Step 2: Fix any TypeScript or build errors**

Common fixes might include:
- Missing imports
- Type mismatches
- Unused imports (remove them)

**Step 3: Run dev server and test manually**

```bash
npm run dev
```

Test the flow:
1. Search for "react" on NPM platform
2. Select "react" from results
3. Step 3 should appear with LLM selector
4. Select "GPT-4o"
5. Step 4 should show bucketed version scores

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build and type issues"
```

---

## Summary of Changes

| Component | Change |
|-----------|--------|
| `FilterableSelect` | New - reusable dropdown with search |
| `LlmSelector` | New - wraps FilterableSelect for LLMs |
| `UnifiedSearchBar` | Simplified - removed LLM dropdown |
| `VersionScores` | Refactored - uses /api/score, bucketed display |
| `page.tsx` | Updated - 4-step flow |
| `/api/score` | New - stateless scoring endpoint |
