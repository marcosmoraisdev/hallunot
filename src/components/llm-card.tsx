"use client"

import { motion } from "framer-motion"
import { Bot, Calendar } from "lucide-react"
import { cn } from "@/lib/cn"
import type { LlmModelResponse } from "@/domain/models"

interface LlmCardProps {
  llm: LlmModelResponse
  isSelected: boolean
  onSelect: (llmId: string, llmName: string) => void
  index: number
}

export function LlmCard({ llm, isSelected, onSelect, index }: LlmCardProps) {
  // Format knowledge cutoff date from string (e.g., "2024-04") or show "Unknown"
  const formattedCutoff = llm.knowledgeCutoff ?? "Unknown"

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      onClick={() => onSelect(llm.id, llm.name)}
      className={cn(
        "group flex cursor-pointer flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all",
        isSelected
          ? "border-primary bg-muted ring-1 ring-primary/20"
          : "border-border/50 bg-card hover:border-primary/30 hover:bg-muted hover:shadow-md"
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
          {llm.providerName}
        </span>
      </div>

      <div className="flex w-full items-center gap-3">
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Calendar className="h-3 w-3" />
          Cutoff: {formattedCutoff}
        </span>
      </div>
    </motion.button>
  )
}
