"use client"

import { useState } from "react"
import { ThemeToggle } from "@/components/theme-toggle"
import { LlmSelector } from "@/components/llm-selector"
import { LibraryList } from "@/components/library-list"
import { VersionScores } from "@/components/version-scores"
import { Disclaimer } from "@/components/disclaimer"

export default function Home() {
  const [selectedLlmId, setSelectedLlmId] = useState<string>()
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>()

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Hallu<span className="text-risk-high">not</span>
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            LLM-aware library version checker
          </p>
        </div>
        <ThemeToggle />
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col gap-8 py-8">
        {/* Step 1: Select LLM */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            1. Choose an LLM
          </h2>
          <LlmSelector
            selectedId={selectedLlmId}
            onSelect={(id) => {
              setSelectedLlmId(id)
              setSelectedLibraryId(undefined)
            }}
          />
        </section>

        {/* Step 2: Browse libraries */}
        {selectedLlmId && (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              2. Select a library
            </h2>
            <LibraryList
              selectedId={selectedLibraryId}
              onSelect={setSelectedLibraryId}
            />
          </section>
        )}

        {/* Step 3: Version scores */}
        {selectedLlmId && selectedLibraryId && (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              3. Version compatibility
            </h2>
            <VersionScores
              llmId={selectedLlmId}
              libraryId={selectedLibraryId}
            />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <Disclaimer />
      </footer>
    </div>
  )
}
