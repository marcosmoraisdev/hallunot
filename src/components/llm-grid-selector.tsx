"use client"

import { useEffect, useState, useCallback } from "react"
import { LlmSearchBar } from "./llm-search-bar"
import { LlmCard } from "./llm-card"
import { MiniPagination } from "./mini-pagination"
import type { LlmModelResponse } from "@/domain/models"

interface LlmGridSelectorProps {
  value: string
  onValueChange: (llmId: string, llmName: string) => void
  disabled?: boolean
}

export function LlmGridSelector({
  value,
  onValueChange,
  disabled = false,
}: LlmGridSelectorProps) {
  const [llms, setLlms] = useState<LlmModelResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [totalPages, setTotalPages] = useState<number | undefined>()
  const [currentFilters, setCurrentFilters] = useState<{ provider: string; query: string }>({
    provider: "",
    query: "",
  })

  const fetchLlms = useCallback(
    async (filters: { provider: string; query: string }, pageNum: number) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          per_page: "9",
        })
        if (filters.query) {
          params.set("q", filters.query)
        }
        if (filters.provider) {
          params.set("provider", filters.provider)
        }

        const res = await fetch(`/api/llms?${params.toString()}`)
        const json = await res.json()
        const models = json.models ?? []
        setLlms(models)
        setTotalPages(json.pagination?.totalPages)
        setHasMore(models.length === 9)
      } catch (err) {
        console.error("Failed to fetch LLMs:", err)
        setLlms([])
        setTotalPages(undefined)
        setHasMore(false)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Initial fetch
  useEffect(() => {
    fetchLlms({ provider: "", query: "" }, 1)
  }, [fetchLlms])

  const handleSearch = useCallback(
    (params: { provider: string; query: string }) => {
      setCurrentFilters(params)
      setPage(1)
      fetchLlms(params, 1)
    },
    [fetchLlms]
  )

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage)
      fetchLlms(currentFilters, newPage)
    },
    [currentFilters, fetchLlms]
  )

  return (
    <div className={disabled ? "pointer-events-none opacity-50" : undefined}>
      {/* Search bar with provider dropdown */}
      <div className="mb-4">
        <LlmSearchBar onSearch={handleSearch} disabled={disabled} />
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
                isSelected={llm.id === value}
                onSelect={onValueChange}
                index={i}
              />
            ))}
          </div>
          <MiniPagination
            page={page}
            hasMore={hasMore}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Empty state */}
      {!loading && llms.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No LLMs found. Try a different search or provider.
          </p>
        </div>
      )}
    </div>
  )
}
