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
