"use client"

import { useState } from "react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { Lightbulb, Heart, Github, Menu } from "lucide-react"
import { HowItWorksDialog } from "./how-it-works-dialog"

export function Header() {
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="cursor-pointer font-display text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Hallu<span className="text-risk-high">not</span>
          </button>
        </div>
        <div className="flex items-center gap-1">
          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 sm:flex">
            <button
              onClick={() => setHowItWorksOpen(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Lightbulb className="h-3.5 w-3.5" />
              How it works
            </button>
            <a
              href="https://github.com/marcosmoraisdev/hallunot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Github className="h-3.5 w-3.5" />
              Code
            </a>
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

          {/* Mobile hamburger menu */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                className="inline-flex cursor-pointer items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={8}
                className="z-50 min-w-[180px] rounded-xl border border-border/50 bg-card p-1 shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
              >
                <DropdownMenu.Item
                  onSelect={() => setHowItWorksOpen(true)}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground outline-none transition-colors data-[highlighted]:bg-muted"
                >
                  <Lightbulb className="h-4 w-4 text-muted-foreground" />
                  How it works
                </DropdownMenu.Item>
                <DropdownMenu.Item asChild>
                  <a
                    href="https://github.com/marcosmoraisdev/hallunot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground outline-none transition-colors data-[highlighted]:bg-muted"
                  >
                    <Github className="h-4 w-4 text-muted-foreground" />
                    Code
                  </a>
                </DropdownMenu.Item>
                <DropdownMenu.Item asChild>
                  <a
                    href={process.env.NEXT_PUBLIC_STRIPE_DONATE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground outline-none transition-colors data-[highlighted]:bg-muted"
                  >
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    Donate
                  </a>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
      <HowItWorksDialog open={howItWorksOpen} onOpenChange={setHowItWorksOpen} />
    </header>
  )
}
