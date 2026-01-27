"use client"

import { useEffect, useState } from "react"
import { Pagination } from "./pagination"
import type { Version } from "@/domain/models"

interface LibraryData {
  id: string
  name: string
  ecosystem: string
  description?: string
  versions: Version[]
}

interface LibraryListProps {
  onSelect: (libraryId: string) => void
  selectedId?: string
}

export function LibraryList({ onSelect, selectedId }: LibraryListProps) {
  const [libraries, setLibraries] = useState<LibraryData[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/libraries?page=${page}&limit=12`)
      .then((res) => res.json())
      .then((json) => {
        setLibraries(json.data)
        setTotalPages(json.pagination.totalPages)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page])

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg bg-muted"
          />
        ))}
      </div>
    )
  }

  if (libraries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No libraries found.
      </p>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {libraries.map((lib) => {
          const isSelected = lib.id === selectedId
          return (
            <button
              key={lib.id}
              onClick={() => onSelect(lib.id)}
              className={`group flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-sm font-semibold text-card-foreground">
                  {lib.name}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {lib.ecosystem}
                </span>
              </div>
              {lib.description && (
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {lib.description}
                </p>
              )}
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {lib.versions.length} version{lib.versions.length !== 1 ? "s" : ""}
              </span>
            </button>
          )
        })}
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
