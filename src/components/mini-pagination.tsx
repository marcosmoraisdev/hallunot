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
        disabled={page === 1}
        aria-label="Previous page"
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-md cursor-pointer",
          "text-muted-foreground transition-colors",
          "hover:bg-accent hover:text-foreground",
          "disabled:cursor-not-allowed disabled:opacity-40"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <span className="text-xs tabular-nums text-muted-foreground">
        Page {page}
      </span>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={!hasMore}
        aria-label="Next page"
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-md cursor-pointer",
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
