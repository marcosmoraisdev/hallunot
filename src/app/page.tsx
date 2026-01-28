"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Github, Linkedin, SearchX, DatabaseZap } from "lucide-react"
import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { SectionHeader } from "@/components/section-header"
import { UnifiedSearchBar } from "@/components/unified-search-bar"
import { SearchResults } from "@/components/search-results"
import type { SearchResultItem } from "@/components/search-results"
import { VersionScores } from "@/components/version-scores"
import { Disclaimer } from "@/components/disclaimer"
import { EmptyState } from "@/components/empty-state"

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
}

export default function Home() {
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedLlmId, setSelectedLlmId] = useState<string>()
  const [selectedLibraryName, setSelectedLibraryName] = useState<string>()
  const [matchedLibraryId, setMatchedLibraryId] = useState<string>()

  const handleSearch = useCallback(
    async (params: { llmId: string; platform: string; query: string }) => {
      setSelectedLlmId(params.llmId)
      setSelectedLibraryName(undefined)
      setMatchedLibraryId(undefined)
      setSearchLoading(true)
      setHasSearched(true)

      try {
        const searchParams = new URLSearchParams({ q: params.query })
        if (params.platform) {
          searchParams.set("platforms", params.platform)
        }
        const res = await fetch(`/api/search?${searchParams.toString()}`)
        const json = await res.json()
        setSearchResults(json.data ?? [])
      } catch {
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    },
    []
  )

  const handleSelectLibrary = useCallback(
    async (libraryName: string) => {
      setSelectedLibraryName(libraryName)
      setMatchedLibraryId(undefined)

      try {
        const searchParams = new URLSearchParams({
          search: libraryName,
          limit: "1",
        })
        const res = await fetch(`/api/libraries?${searchParams.toString()}`)
        const json = await res.json()
        const match = (json.data ?? []).find(
          (lib: { id: string; name: string }) =>
            lib.name.toLowerCase() === libraryName.toLowerCase()
        )
        if (match) {
          setMatchedLibraryId(match.id)
        }
      } catch {
        // no match found
      }
    },
    []
  )

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
        <Hero />

        {/* Step 1: Search for a library */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
          transition={{ duration: 0.4 }}
        >
          <SectionHeader
            step={1}
            title="Search for a library"
            subtitle="Select an LLM, choose a platform, and search for a library"
          />
          <UnifiedSearchBar onSearch={handleSearch} />
        </motion.section>

        {/* Step 2: Select a library */}
        <AnimatePresence>
          {hasSearched && (
            <motion.section
              key="results-section"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={sectionVariants}
              transition={{ duration: 0.4 }}
            >
              <SectionHeader
                step={2}
                title="Select a library"
                subtitle="Choose a library from the search results"
              />
              {!searchLoading && searchResults.length === 0 ? (
                <EmptyState
                  icon={SearchX}
                  title="No results found"
                  description="Try a different search term or platform."
                />
              ) : (
                <SearchResults
                  results={searchResults}
                  loading={searchLoading}
                  onSelectLibrary={handleSelectLibrary}
                  selectedName={selectedLibraryName}
                />
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* Step 3: Version compatibility */}
        <AnimatePresence>
          {selectedLlmId && selectedLibraryName && (
            <motion.section
              key="version-section"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={sectionVariants}
              transition={{ duration: 0.4 }}
            >
              <SectionHeader
                step={3}
                title="Version compatibility"
                subtitle="Scores based on LLM training cutoff heuristics"
              />
              {matchedLibraryId ? (
                <VersionScores
                  llmId={selectedLlmId}
                  libraryId={matchedLibraryId}
                />
              ) : (
                <EmptyState
                  icon={DatabaseZap}
                  title="Library not in local database"
                  description={`"${selectedLibraryName}" was not found in the local database. Version scoring is not available yet for this library.`}
                />
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Disclaimer />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Developed by Marcos Morais</span>
            <span className="text-border">|</span>
            <a
              href="https://www.linkedin.com/in/marcosmoraisdev/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
            >
              <Linkedin className="h-3.5 w-3.5" />
              LinkedIn
            </a>
            <a
              href="https://github.com/marcosmoraisdev"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
            >
              <Github className="h-3.5 w-3.5" />
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
