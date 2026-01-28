"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Calendar, Bot, SearchX } from "lucide-react"
import { cn } from "@/lib/cn"
import { formatDate } from "@/lib/date"
import { SearchInput } from "./search-input"
import { Pagination } from "./pagination"
import { SkeletonCard } from "./skeleton-card"
import { EmptyState } from "./empty-state"
import type { Llm } from "@/domain/models"

interface LlmListProps {
  onSelect: (llmId: string) => void
  selectedId?: string
}

const ITEMS_PER_PAGE = 20

export function LlmList({ onSelect, selectedId }: LlmListProps) {
  const [llms, setLlms] = useState<Llm[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetch("/api/llms")
      .then((res) => res.json())
      .then((json) => setLlms(json.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return llms
    const q = search.toLowerCase()
    return llms.filter(
      (llm) =>
        llm.name.toLowerCase().includes(q) ||
        llm.provider.toLowerCase().includes(q)
    )
  }, [llms, search])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  )

  useEffect(() => {
    setPage(1)
  }, [search])

  if (loading) {
    return <SkeletonCard count={4} />
  }

  return (
    <div className="space-y-4">
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search LLMs by name or provider..."
      />

      {paginated.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No LLMs found"
          description="Try adjusting your search terms."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {paginated.map((llm, i) => {
            const isSelected = llm.id === selectedId
            return (
              <motion.button
                key={llm.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                onClick={() => onSelect(llm.id)}
                className={cn(
                  "group flex cursor-pointer flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all",
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border/50 bg-card hover:border-primary/30 hover:shadow-md"
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-card-foreground">
                      {llm.name}
                    </span>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {llm.provider}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Cutoff: {formatDate(llm.approxCutoff)}</span>
                </div>
              </motion.button>
            )
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
