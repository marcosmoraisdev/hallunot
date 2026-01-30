"use client"

import { useEffect, useState } from "react"
import { Bot } from "lucide-react"
import { FilterableSelect, type FilterableSelectOption } from "./filterable-select"
import type { Llm } from "@/domain/models"

interface LlmSelectorProps {
  value: string
  onValueChange: (llmName: string) => void
  disabled?: boolean
}

export function LlmSelector({ value, onValueChange, disabled = false }: LlmSelectorProps) {
  const [llms, setLlms] = useState<Llm[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/llms")
      .then((res) => res.json())
      .then((json) => setLlms(json.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const options: FilterableSelectOption[] = llms.map((llm) => ({
    value: llm.name,
    label: llm.name,
    sublabel: llm.provider,
  }))

  return (
    <FilterableSelect
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder="Select an LLM"
      loading={loading}
      disabled={disabled}
      icon={<Bot className="h-4 w-4 text-muted-foreground" />}
      aria-label="Select LLM"
    />
  )
}
