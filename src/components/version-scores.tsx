"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar, AlertOctagon, FileCode2 } from "lucide-react"
import { cn } from "@/lib/cn"
import { ScoreBadge } from "./score-badge"
import { Pagination } from "./pagination"
import { EmptyState } from "./empty-state"
import { RISK_LABELS } from "@/domain/services/risk"
import { formatDate } from "@/lib/date"
import type { Compatibility } from "@/domain/models"

interface VersionScoresProps {
  llmId: string
  libraryId: string
}

interface CompatibilityWithMeta extends Compatibility {
  releaseDate?: number
  breaking?: boolean
}

export function VersionScores({ llmId, libraryId }: VersionScoresProps) {
  const [scores, setScores] = useState<CompatibilityWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [llmId, libraryId])

  useEffect(() => {
    setLoading(true)
    fetch(
      `/api/compatibility?llm_id=${llmId}&library_id=${libraryId}&page=${page}&limit=20`
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
            className="h-24 animate-pulse rounded-xl bg-muted"
          />
        ))}
      </div>
    )
  }

  if (scores.length === 0) {
    return (
      <EmptyState
        icon={FileCode2}
        title="No version data available"
        description="This library has no recorded versions."
      />
    )
  }

  return (
    <div>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${llmId}-${libraryId}-${page}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          {scores.map((item, i) => (
            <motion.div
              key={item.version}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className={cn(
                "flex cursor-pointer flex-col gap-3 rounded-xl border border-border/50 bg-card p-4",
                "transition-colors hover:bg-muted hover:shadow-md",
                "sm:flex-row sm:items-center sm:justify-between"
              )}
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-semibold text-card-foreground">
                    v{item.version}
                  </span>
                  <ScoreBadge score={item.score} risk={item.risk} />
                  {item.breaking && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-risk-high-bg px-2 py-0.5 text-[10px] font-medium text-risk-high">
                      <AlertOctagon className="h-3 w-3" />
                      Breaking
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {RISK_LABELS[item.risk]}
                  </span>
                  {item.releaseDate && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(item.releaseDate)}
                    </span>
                  )}
                </div>
              </div>
              <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
                {item.reason}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
