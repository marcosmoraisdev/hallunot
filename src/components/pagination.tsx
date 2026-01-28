"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/cn"

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const getPageNumbers = () => {
    const pages: (number | "...")[] = []

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (page > 3) pages.push("...")
      for (
        let i = Math.max(2, page - 1);
        i <= Math.min(totalPages - 1, page + 1);
        i++
      ) {
        pages.push(i)
      }
      if (page < totalPages - 2) pages.push("...")
      pages.push(totalPages)
    }

    return pages
  }

  return (
    <div className="flex items-center justify-center gap-1 pt-6">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-lg",
          "border border-border/50 text-sm text-muted-foreground",
          "transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {getPageNumbers().map((p, i) =>
        p === "..." ? (
          <span
            key={`dots-${i}`}
            className="inline-flex h-8 w-8 items-center justify-center text-xs text-muted-foreground"
          >
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors",
              p === page
                ? "bg-primary text-primary-foreground"
                : "border border-border/50 text-muted-foreground hover:bg-accent"
            )}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-lg",
          "border border-border/50 text-sm text-muted-foreground",
          "transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
