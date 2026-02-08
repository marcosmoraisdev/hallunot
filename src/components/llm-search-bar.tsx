"use client"

import { useEffect, useRef, useState } from "react"
import * as Select from "@radix-ui/react-select"
import { Bot, Search, ChevronDown, Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/cn"
import type { LlmProviderResponse } from "@/domain/models"

const ALL_PROVIDERS_VALUE = "_all"

interface LlmSearchBarProps {
  onSearch: (params: { provider: string; query: string }) => void
  disabled?: boolean
  /** When true, triggers onSearch automatically after typing (debounced) instead of requiring button click */
  autoSearch?: boolean
  providers: LlmProviderResponse[]
  providersLoading: boolean
}

export function LlmSearchBar({ onSearch, disabled = false, autoSearch = true, providers, providersLoading }: LlmSearchBarProps) {
  const [selectedProvider, setSelectedProvider] = useState(ALL_PROVIDERS_VALUE)
  const [selectOpen, setSelectOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [providerFilter, setProviderFilter] = useState("")
  const filterInteracting = useRef(false)

  const matchesProviderFilter = (name: string) =>
    !providerFilter || name.toLowerCase().includes(providerFilter.toLowerCase())

  const hasFilterResults = providers.some((p) => matchesProviderFilter(p.name))

  // Auto-search effect with debounce
  useEffect(() => {
    if (!autoSearch) return

    const timer = setTimeout(() => {
      onSearch({
        provider: selectedProvider === ALL_PROVIDERS_VALUE ? "" : selectedProvider,
        query: query.trim(),
      })
    }, 300)

    return () => clearTimeout(timer)
  }, [autoSearch, query, selectedProvider, onSearch])

  const handleSearch = () => {
    onSearch({
      provider: selectedProvider === ALL_PROVIDERS_VALUE ? "" : selectedProvider,
      query: query.trim(),
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  return (
    <div
      className={cn(
        "flex w-full items-center overflow-hidden rounded-xl border border-border/50 bg-card",
        "transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      {/* Provider Dropdown */}
      <Select.Root
        open={selectOpen}
        value={selectedProvider}
        onValueChange={setSelectedProvider}
        onOpenChange={(open) => {
          if (!open && filterInteracting.current) {
            filterInteracting.current = false
            return
          }
          setSelectOpen(open)
          if (!open) setProviderFilter("")
        }}
        disabled={disabled}
      >
        <Select.Trigger
          className={cn(
            "flex shrink-0 items-center gap-2 border-r border-border/50 px-3 py-2.5 cursor-pointer",
            "text-sm text-foreground outline-none",
            "hover:bg-muted/50 transition-colors",
            "data-[placeholder]:text-muted-foreground"
          )}
          aria-label="Select Provider"
        >
          <Bot className="h-4 w-4 text-muted-foreground" />
          <Select.Value placeholder={providersLoading ? "Loading..." : "Provider"} />
          {providersLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <Select.Icon>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Select.Icon>
          )}
        </Select.Trigger>

        <Select.Portal>
          <Select.Content
            className={cn(
              "z-50 flex w-[--radix-select-trigger-width] flex-col overflow-hidden rounded-xl border border-border/50 bg-card shadow-lg sm:w-auto sm:min-w-[200px]",
              "max-h-[--radix-select-content-available-height]",
              "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
            )}
            position="popper"
            side="bottom"
            sideOffset={8}
            avoidCollisions
          >
            {/* Filter input */}
            <div className="shrink-0 border-b border-border/50 p-2">
              <input
                type="text"
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                placeholder="Filter providers..."
                className={cn(
                  "w-full rounded-md border border-border/50 bg-background px-2.5 py-1.5",
                  "text-sm text-foreground placeholder:text-muted-foreground",
                  "outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                )}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  filterInteracting.current = true
                  setTimeout(() => { filterInteracting.current = false }, 0)
                }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
            <Select.Viewport className="min-h-[120px] max-h-[240px] flex-1 overflow-auto p-1">
              {/* All Providers option */}
              <Select.Item
                value={ALL_PROVIDERS_VALUE}
                className={cn(
                  "relative flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none",
                  "text-foreground transition-colors",
                  "data-[highlighted]:bg-muted data-[highlighted]:text-foreground",
                  "data-[state=checked]:text-primary",
                  !matchesProviderFilter("All Providers") && "hidden"
                )}
              >
                <Select.ItemIndicator className="absolute left-1 flex items-center">
                  <Check className="h-3.5 w-3.5 text-primary" />
                </Select.ItemIndicator>
                <div className="flex items-center gap-2 pl-4">
                  <Select.ItemText>All Providers</Select.ItemText>
                </div>
              </Select.Item>

              {!hasFilterResults && (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No providers found
                </div>
              )}
              {providers.map((provider) => (
                <Select.Item
                  key={provider.id}
                  value={provider.id}
                  className={cn(
                    "relative flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none",
                    "text-foreground transition-colors",
                    "data-[highlighted]:bg-muted data-[highlighted]:text-foreground",
                    "data-[state=checked]:text-primary",
                    !matchesProviderFilter(provider.name) && "hidden"
                  )}
                >
                  <Select.ItemIndicator className="absolute left-1 flex items-center">
                    <Check className="h-3.5 w-3.5 text-primary" />
                  </Select.ItemIndicator>
                  <div className="flex items-center gap-2 pl-4">
                    <Select.ItemText>{provider.name}</Select.ItemText>
                    <span className="text-[10px] text-muted-foreground">
                      {provider.modelCount} models
                    </span>
                  </div>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>

      {/* Search Input + Button */}
      <div className="flex min-w-0 flex-1 items-center gap-2 px-3">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search LLMs..."
          disabled={disabled}
          className={cn(
            "h-10 min-w-0 flex-1 bg-transparent text-sm text-foreground",
            "placeholder:text-muted-foreground",
            "outline-none"
          )}
        />
        <button
          type="button"
          onClick={handleSearch}
          // disabled={isSearchDisabled}
          className={cn(
            "shrink-0 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground cursor-pointer",
            "transition-colors hover:bg-primary/90",
            "disabled:cursor-not-allowed disabled:opacity-50",
            autoSearch && "hidden"
          )}
        >
          Search
        </button>
      </div>
    </div>
  )
}
