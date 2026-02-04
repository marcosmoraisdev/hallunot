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
