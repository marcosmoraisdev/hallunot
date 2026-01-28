"use client"

import { Zap, BookOpen, Lightbulb, Heart } from "lucide-react"
import { ThemeToggle } from "./theme-toggle"

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Hallu<span className="text-risk-high">not</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <nav className="hidden items-center gap-1 sm:flex">
            <button className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              Documentation
            </button>
            <button className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
              <Lightbulb className="h-3.5 w-3.5" />
              How it works
            </button>
            <button className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
              <Heart className="h-3.5 w-3.5" />
              Donate
            </button>
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
