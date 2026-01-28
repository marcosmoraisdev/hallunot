"use client"

import { motion } from "framer-motion"
import { Sparkles } from "lucide-react"

export function Hero() {
  return (
    <div className="flex flex-col items-center py-12 text-center sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          Optimize your context window
        </span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-6 max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
      >
        Stop hallucinating APIs.
        <br />
        <span className="text-risk-low">Use the right versions.</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base"
      >
        Check which library versions were released before your LLM&apos;s
        knowledge cutoff date to maximize code generation accuracy.
      </motion.p>
    </div>
  )
}
