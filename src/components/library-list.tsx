"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Package, SearchX } from "lucide-react"
import { cn } from "@/lib/cn"
import { useDebounce } from "@/lib/use-debounce"
import { SearchInput } from "./search-input"
import { Pagination } from "./pagination"
import { SkeletonCard } from "./skeleton-card"
import { EmptyState } from "./empty-state"
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
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
    })
    if (debouncedSearch.trim()) {
      params.set("search", debouncedSearch.trim())
    }

    fetch(`/api/libraries?${params}`)
      .then((res) => res.json())
      .then((json) => {
        setLibraries(json.data)
        setTotalPages(json.pagination.totalPages)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page, debouncedSearch])

  return (
    <div className="space-y-4">
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search libraries by name, ecosystem, or description..."
      />

      {loading ? (
        <SkeletonCard count={6} />
      ) : libraries.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No libraries found"
          description="Try adjusting your search terms."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {libraries.map((lib, i) => {
            const isSelected = lib.id === selectedId
            return (
              <motion.button
                key={lib.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                onClick={() => onSelect(lib.id)}
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
                      {lib.name}
                    </span>
                  </div>
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
                  {lib.versions.length} version
                  {lib.versions.length !== 1 ? "s" : ""}
                </span>
              </motion.button>
            )
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
