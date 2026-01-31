// src/app/page.tsx
"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Github, Linkedin, SearchX } from "lucide-react"
import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { SectionHeader } from "@/components/section-header"
import { UnifiedSearchBar } from "@/components/unified-search-bar"
import { SearchResults } from "@/components/search-results"
import type { SearchResultItem } from "@/components/search-results"
import { LlmGridSelector } from "@/components/llm-grid-selector"
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

  const [selectedLibrary, setSelectedLibrary] = useState<{ name: string; platform: string } | null>(null)
  const [selectedLlmName, setSelectedLlmName] = useState("")
  const [libraryPage, setLibraryPage] = useState(0)
  const [hasMoreLibraries, setHasMoreLibraries] = useState(false)
  const [noMoreMessage, setNoMoreMessage] = useState("")
  const [currentSearchParams, setCurrentSearchParams] = useState<{ platform: string; query: string } | null>(null)

  const handleSearch = useCallback(
    async (params: { platform: string; query: string }, page = 0) => {
      // Clear downstream state only on new search (page 0)
      if (page === 0) {
        setSelectedLibrary(null)
        setSelectedLlmName("")
        setNoMoreMessage("")
      }
      setSearchLoading(true)
      setHasSearched(true)
      setLibraryPage(page)
      setCurrentSearchParams(params)

      try {
        const searchParams = new URLSearchParams({ q: params.query })
        if (params.platform) {
          searchParams.set("platforms", params.platform)
        }
        searchParams.set("page", String(page))
        searchParams.set("per_page", "9")

        const res = await fetch(`/api/search?${searchParams.toString()}`)
        const json = await res.json()
        const data = json.data ?? []
        setSearchResults(data)

        // Determine if there are more results
        const hasMore = data.length === 9
        setHasMoreLibraries(hasMore)

        // Show message when navigating to a page with no results
        if (data.length === 0 && page > 0) {
          setNoMoreMessage("No more results")
        } else {
          setNoMoreMessage("")
        }
      } catch {
        setSearchResults([])
        setHasMoreLibraries(false)
        setNoMoreMessage("")
      } finally {
        setSearchLoading(false)
      }
    },
    []
  )

  const handleSelectLibrary = useCallback((libraryName: string, platform: string) => {
    setSelectedLibrary({ name: libraryName, platform })
    setSelectedLlmName("") // Reset LLM when library changes
  }, [])

  const handleSelectLlm = useCallback((llmName: string) => {
    setSelectedLlmName(llmName)
  }, [])

  const handleLibraryPageChange = useCallback((newPage: number) => {
    if (currentSearchParams) {
      handleSearch(currentSearchParams, newPage)
    }
  }, [currentSearchParams, handleSearch])

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
            subtitle="Choose a platform and search for a library"
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
                  selectedName={selectedLibrary?.name}
                  page={libraryPage}
                  hasMore={hasMoreLibraries}
                  onPageChange={handleLibraryPageChange}
                  noMoreMessage={noMoreMessage}
                />
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* Step 3: Select an LLM */}
        <AnimatePresence>
          {selectedLibrary && (
            <motion.section
              key="llm-section"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={sectionVariants}
              transition={{ duration: 0.4 }}
            >
              <SectionHeader
                step={3}
                title="Select an LLM"
                subtitle={`Choose which LLM to evaluate with "${selectedLibrary.name}"`}
              />
              <LlmGridSelector
                value={selectedLlmName}
                onValueChange={handleSelectLlm}
              />
            </motion.section>
          )}
        </AnimatePresence>

        {/* Step 4: Version compatibility */}
        <AnimatePresence>
          {selectedLibrary && selectedLlmName && (
            <motion.section
              key="version-section"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={sectionVariants}
              transition={{ duration: 0.4 }}
            >
              <SectionHeader
                step={4}
                title="Version compatibility"
                subtitle={`Scores for ${selectedLibrary.name} with ${selectedLlmName}`}
              />
              <VersionScores
                llmName={selectedLlmName}
                libraryName={selectedLibrary.name}
                platform={selectedLibrary.platform || "NPM"}
              />
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
