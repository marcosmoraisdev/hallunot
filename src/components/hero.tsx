"use client"

import { motion } from "framer-motion"
import { Sparkles, Coins, Unplug, Target } from "lucide-react"

const valueProps = [
  { icon: Coins, label: "Fewer tokens" },
  { icon: Unplug, label: "No extra tooling" },
  { icon: Target, label: "Better accuracy out of the box" },
]

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
        Stop hallucinating!
        <br />
        <span className="text-risk-low">Use the right versions.</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base"
      >
        No RAG pipelines. No MCP servers. No web search plugins.
        <br />
        Just the right library versions — ones your LLM was actually trained
        on.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-6 flex flex-wrap items-center justify-center gap-3"
      >
        {valueProps.map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground"
          >
            <Icon className="h-3.5 w-3.5 text-risk-low" />
            {label}
          </span>
        ))}
      </motion.div>
    </div>
  )
}
