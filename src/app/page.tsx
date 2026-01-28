"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Github, Linkedin } from "lucide-react"
import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { SectionHeader } from "@/components/section-header"
import { LlmList } from "@/components/llm-list"
import { LibraryList } from "@/components/library-list"
import { VersionScores } from "@/components/version-scores"
import { Disclaimer } from "@/components/disclaimer"

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
}

export default function Home() {
  const [selectedLlmId, setSelectedLlmId] = useState<string>()
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>()

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
        <Hero />

        {/* Step 1: Select LLM */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
          transition={{ duration: 0.4 }}
        >
          <SectionHeader
            step={1}
            title="Choose an LLM"
            subtitle="Select the model you plan to use for coding"
          />
          <LlmList
            selectedId={selectedLlmId}
            onSelect={(id) => {
              setSelectedLlmId(id)
              setSelectedLibraryId(undefined)
            }}
          />
        </motion.section>

        {/* Step 2: Browse libraries */}
        <AnimatePresence>
          {selectedLlmId && (
            <motion.section
              key="library-section"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={sectionVariants}
              transition={{ duration: 0.4 }}
            >
              <SectionHeader
                step={2}
                title="Select a library"
                subtitle="Browse and search available libraries"
              />
              <LibraryList
                selectedId={selectedLibraryId}
                onSelect={setSelectedLibraryId}
              />
            </motion.section>
          )}
        </AnimatePresence>

        {/* Step 3: Version scores */}
        <AnimatePresence>
          {selectedLlmId && selectedLibraryId && (
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
              <VersionScores
                llmId={selectedLlmId}
                libraryId={selectedLibraryId}
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
