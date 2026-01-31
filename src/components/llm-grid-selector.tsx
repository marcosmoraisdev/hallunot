"use client"

import { useEffect, useState, useCallback } from "react"
import { SearchInput } from "./search-input"
import { LlmCard } from "./llm-card"
import { MiniPagination } from "./mini-pagination"
import type { Llm } from "@/domain/models"

interface LlmGridSelectorProps {
  value: string
  onValueChange: (llmName: string) => void
  disabled?: boolean
}

export function LlmGridSelector({
  value,
  onValueChange,
  disabled = false,
}: LlmGridSelectorProps) {
  const [llms, setLlms] = useState<Llm[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const fetchLlms = useCallback(async (searchTerm: string, pageNum: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        per_page: "9",
      })
      if (searchTerm) {
        params.set("search", searchTerm)
      }

      const res = await fetch(`/api/llms?${params.toString()}`)
      const json = await res.json()
      const data = json.data ?? []
      setLlms(data)
      // Determine if there are more results
      setHasMore(data.length === 9)
    } catch (err) {
      console.error("Failed to fetch LLMs:", err)
      setLlms([])
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchLlms("", 0)
  }, [fetchLlms])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0)
      fetchLlms(search, 0)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, fetchLlms])

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage)
      fetchLlms(search, newPage)
    },
    [search, fetchLlms]
  )

  return (
    <div className={disabled ? "pointer-events-none opacity-50" : undefined}>
      {/* Search input */}
      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search LLMs..."
          disabled={disabled}
        />
      </div>

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      )}

      {/* LLM cards grid */}
      {!loading && llms.length > 0 && (
        <div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {llms.map((llm, i) => (
              <LlmCard
                key={llm.id}
                llm={llm}
                isSelected={llm.name === value}
                onSelect={onValueChange}
                index={i}
              />
            ))}
          </div>
          <MiniPagination
            page={page}
            hasMore={hasMore}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Empty state */}
      {!loading && llms.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No LLMs found matching &quot;{search}&quot;
          </p>
        </div>
      )}
    </div>
  )
}
