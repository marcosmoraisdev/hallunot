"use client"

import { motion } from "framer-motion"
import { Package, Star } from "lucide-react"
import { cn } from "@/lib/cn"
import { MiniPagination } from "./mini-pagination"

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
  page?: number
  hasMore?: boolean
  onPageChange?: (page: number) => void
  noMoreMessage?: string
}

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
    <div>
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

              <div className="flex w-full items-center gap-3">
                {item.latestVersion && (
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                    v{item.latestVersion}
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
            </motion.button>
          )
        })}
      </div>
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
    </div>
  )
}
