"use client"

import * as Select from "@radix-ui/react-select"
import { useEffect, useState } from "react"
import type { Llm } from "@/domain/models"

interface LlmSelectorProps {
  onSelect: (llmId: string) => void
  selectedId?: string
}

export function LlmSelector({ onSelect, selectedId }: LlmSelectorProps) {
  const [llms, setLlms] = useState<Llm[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/llms")
      .then((res) => res.json())
      .then((json) => setLlms(json.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="h-12 w-full max-w-sm animate-pulse rounded-lg bg-muted" />
    )
  }

  const grouped = llms.reduce<Record<string, Llm[]>>((acc, llm) => {
    if (!acc[llm.provider]) acc[llm.provider] = []
    acc[llm.provider].push(llm)
    return acc
  }, {})

  return (
    <Select.Root value={selectedId} onValueChange={onSelect}>
      <Select.Trigger className="inline-flex h-12 w-full max-w-sm items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-card-foreground shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary/20">
        <Select.Value placeholder="Select an LLM..." />
        <Select.Icon>
          <ChevronDown />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          className="z-50 overflow-hidden rounded-lg border border-border bg-card shadow-lg"
          position="popper"
          sideOffset={4}
        >
          <Select.Viewport className="p-1">
            {Object.entries(grouped).map(([provider, models]) => (
              <Select.Group key={provider}>
                <Select.Label className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {provider}
                </Select.Label>
                {models.map((llm) => (
                  <Select.Item
                    key={llm.id}
                    value={llm.id}
                    className="relative flex cursor-pointer items-center rounded-md px-3 py-2.5 text-sm text-card-foreground outline-none transition-colors hover:bg-accent focus:bg-accent data-[state=checked]:font-medium"
                  >
                    <Select.ItemText>{llm.name}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Group>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}

function ChevronDown() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="text-muted-foreground"
    >
      <path
        d="M4 6L8 10L12 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
