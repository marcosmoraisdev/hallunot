"use client"

import { useState } from "react"
import { Lightbulb, Heart } from "lucide-react"
import { ThemeToggle } from "./theme-toggle"
import { HowItWorksDialog } from "./how-it-works-dialog"

export function Header() {
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <span className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Hallu<span className="text-risk-high">not</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <nav className="hidden items-center gap-1 sm:flex">
            {/* <button className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              Documentation
            </button> */}
            <button
              onClick={() => setHowItWorksOpen(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Lightbulb className="h-3.5 w-3.5" />
              How it works
            </button>
            <a
              href={process.env.NEXT_PUBLIC_STRIPE_DONATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Heart className="h-3.5 w-3.5" />
              Donate
            </a>
          </nav>
          <ThemeToggle />
        </div>
      </div>
      <HowItWorksDialog open={howItWorksOpen} onOpenChange={setHowItWorksOpen} />
    </header>
  )
}
