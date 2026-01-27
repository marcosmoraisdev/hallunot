"use client"

import { useEffect, useState } from "react"
import { ScoreBadge } from "./score-badge"
import { Pagination } from "./pagination"
import { RISK_LABELS } from "@/domain/services/risk"
import { formatDate } from "@/lib/date"
import type { Compatibility } from "@/domain/models"

interface VersionScoresProps {
  llmId: string
  libraryId: string
}

interface CompatibilityWithDate extends Compatibility {
  releaseDate?: number
}

export function VersionScores({ llmId, libraryId }: VersionScoresProps) {
  const [scores, setScores] = useState<CompatibilityWithDate[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [llmId, libraryId])

  useEffect(() => {
    setLoading(true)
    fetch(
      `/api/compatibility?llm_id=${llmId}&library_id=${libraryId}&page=${page}&limit=10`
    )
      .then((res) => res.json())
      .then((json) => {
        setScores(json.data)
        setTotalPages(json.pagination.totalPages)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [llmId, libraryId, page])

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg bg-muted"
          />
        ))}
      </div>
    )
  }

  if (scores.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No version data available.
      </p>
    )
  }

  return (
    <div>
      <div className="space-y-2">
        {scores.map((item) => (
          <div
            key={item.version}
            className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-semibold text-card-foreground">
                  v{item.version}
                </span>
                <ScoreBadge score={item.score} risk={item.risk} />
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {RISK_LABELS[item.risk]}
              </span>
            </div>
            <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
              {item.reason}
            </p>
          </div>
        ))}
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
