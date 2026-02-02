"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/cn"

interface MiniPaginationProps {
  page: number
  hasMore: boolean
  onPageChange: (page: number) => void
  totalPages?: number
}

export function MiniPagination({
  page,
  hasMore,
  onPageChange,
  totalPages,
}: MiniPaginationProps) {
  const isDeterministic = totalPages !== undefined

  // Hide when trivial
  if (isDeterministic && totalPages <= 1) return null
  if (!isDeterministic && page === 1 && !hasMore) return null

  const canGoPrev = page > 1
  const canGoNext = isDeterministic ? page < totalPages : hasMore

  return (
    <div className="flex items-center justify-center gap-3 pt-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={!canGoPrev}
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

      {isDeterministic ? (
        <span className="text-xs tabular-nums text-muted-foreground">
          {page} / {totalPages}
        </span>
      ) : (
        <span className="text-xs tabular-nums text-muted-foreground">
          Page {page}
        </span>
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={!canGoNext}
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
