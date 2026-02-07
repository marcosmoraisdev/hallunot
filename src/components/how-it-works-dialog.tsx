// src/components/how-it-works-dialog.tsx
"use client"

import { useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import * as ScrollArea from "@radix-ui/react-scroll-area"
import {
  X,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Library,
  Brain,
  Calculator,
  ShieldCheck,
  Workflow,
} from "lucide-react"
import { cn } from "@/lib/cn"

interface HowItWorksDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function AccordionItem({
  icon: Icon,
  title,
  defaultOpen = false,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [expanded, setExpanded] = useState(defaultOpen)

  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2.5 px-4 py-3 cursor-pointer",
          "hover:bg-muted/50 transition-colors text-left"
        )}
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-sm font-semibold text-card-foreground">{title}</span>
      </button>
      {expanded && (
        <div className="border-t border-border/50 px-4 py-3 space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}

function WeightBadge({ weight }: { weight: number }) {
  return (
    <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
      {weight}%
    </span>
  )
}

function ComponentRow({
  name,
  weight,
  description,
}: {
  name: string
  weight: number
  description: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border/30 bg-background p-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-card-foreground">{name}</span>
        <WeightBadge weight={weight} />
      </div>
      <p className="text-[12px] leading-relaxed text-muted-foreground">{description}</p>
    </div>
  )
}

function FlowStep({ label, isLast = false }: { label: string; isLast?: boolean }) {
  return (
    <>
      <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-3 py-2">
        <span className="text-xs font-medium text-card-foreground whitespace-nowrap">{label}</span>
      </div>
      {!isLast && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
    </>
  )
}

export function HowItWorksDialog({ open, onOpenChange }: HowItWorksDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <ScrollArea.Root className="max-h-[85vh] overflow-hidden">
            <ScrollArea.Viewport className="max-h-[85vh] w-full rounded-xl">
              <div className="p-6 space-y-4">

                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <Dialog.Title className="text-lg font-semibold text-card-foreground">
                      How Hallunot Works
                    </Dialog.Title>
                    <Dialog.Description className="text-xs text-muted-foreground">
                      Understanding the scoring methodology
                    </Dialog.Description>
                  </div>
                  <Dialog.Close className="rounded-md p-1 text-muted-foreground hover:text-card-foreground hover:bg-muted transition-colors cursor-pointer">
                    <X className="h-4 w-4" />
                  </Dialog.Close>
                </div>

                {/* Accordion Sections */}
                <div className="space-y-2">

                  {/* 1. The Flow */}
                  <AccordionItem icon={Workflow} title="The Flow" defaultOpen>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <FlowStep label="Select an LLM" />
                      <FlowStep label="Search a library" />
                      <FlowStep label="View version scores" isLast />
                    </div>
                    <p className="text-[12px] leading-relaxed text-muted-foreground text-center">
                      Scores indicate how likely the LLM&apos;s training data covers that library version — helping you avoid hallucinations without RAG or web search.
                    </p>
                    <p className="text-[12px] leading-relaxed text-muted-foreground">
                      Important note! Models without a known knowledge cutoff date are excluded since they cannot be scored.
                    </p>
                  </AccordionItem>

                  {/* 2. LCS */}
                  <AccordionItem icon={Library} title="Library Confidence Score (LCS)">
                    <p className="text-[12px] leading-relaxed text-muted-foreground">
                      Measures how confident we are that the LLM knows this specific library version. It&apos;s a weighted sum of five components, each normalized to 0–1.
                    </p>
                    <div className="space-y-2">
                      <ComponentRow
                        name="Recency"
                        weight={40}
                        description="How the version's release date relates to the LLM's knowledge cutoff. Versions released well before the cutoff score 0.5–1.0 (more time in training data). Versions after the cutoff drop from 0.5 to 0.0 over 12 months — the further past cutoff, the less likely the LLM has seen it."
                      />
                      <ComponentRow
                        name="Popularity"
                        weight={20}
                        description="Adoption proxy using GitHub stars and dependent package count, log-scaled to prevent mega-popular libraries from dominating. More popular libraries appear more frequently in training data, so the LLM is more likely to produce accurate code."
                      />
                      <ComponentRow
                        name="Stability"
                        weight={20}
                        description="API volatility based on release frequency. Libraries with fewer releases per year have a more stable API surface, making them easier for LLMs to reproduce accurately. For versions released before the LLM's knowledge cutoff, stability is scored at maximum since the training data likely covers the library's release history."
                      />
                      <ComponentRow
                        name="Language Affinity"
                        weight={10}
                        description="How well-represented the programming language is in LLM training data. JavaScript/TypeScript and Python score 1.0 (heavily represented), while less common languages score lower (down to 0.5 for unknown languages)."
                      />
                      <ComponentRow
                        name="Simplicity"
                        weight={10}
                        description="Conceptual complexity estimated from library keywords. Simpler, focused APIs are easier for LLMs to reproduce correctly. Complex ecosystems (frameworks, platforms, enterprise tools) tend to have more nuanced APIs that increase hallucination risk."
                      />
                    </div>
                  </AccordionItem>

                  {/* 3. LGS */}
                  <AccordionItem icon={Brain} title="LLM Generic Score (LGS)">
                    <p className="text-[12px] leading-relaxed text-muted-foreground">
                      Measures the LLM model&apos;s general capability and modernity, independent of the library being evaluated. Also a weighted sum of components normalized to 0–1.
                    </p>
                    <div className="space-y-2">
                      <ComponentRow
                        name="Capability"
                        weight={30}
                        description="Feature breadth measured across 6 signals: reasoning/chain-of-thought, tool calling, structured output, file attachments, multimodal input, and multimodal output. Each signal adds 1/6 to the score — more capable models can better understand and generate code."
                      />
                      <ComponentRow
                        name="Model Recency"
                        weight={40}
                        description="How fresh the model's training data is, based on knowledge cutoff date (70% weight) and last update date (30% weight). More recent models have seen more recent library versions and coding patterns."
                      />
                      <ComponentRow
                        name="Context & Output Limits"
                        weight={20}
                        description="Context window and output token capacity, log-scaled to prevent extreme bias toward very large models. Larger context helps the model understand more code at once; larger output capacity allows for more complete code generation."
                      />
                      <ComponentRow
                        name="Openness"
                        weight={10}
                        description="Transparency and ecosystem compatibility. Open-weight models (70% of score) tend to have more community tooling and fine-tuning, while OpenAI-compatible APIs (30% of score) indicate broader ecosystem integration."
                      />
                    </div>
                  </AccordionItem>

                  {/* 4. Final Score */}
                  <AccordionItem icon={Calculator} title="Final Score (FS)">
                    <p className="text-[12px] leading-relaxed text-muted-foreground">
                      The final score combines both indices through multiplication. Both need to be strong for a high result — a great library version scored on a weak model (or vice versa) will still yield a moderate score.
                    </p>
                    <div className="flex items-center justify-center gap-3 py-3 px-3 rounded-lg border border-border/50 bg-background">
                      <div className="flex flex-col items-center gap-1 rounded-lg border border-border/50 px-4 py-2 bg-muted/30">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">LCS</span>
                        <span className="text-sm font-bold tabular-nums text-card-foreground">0–100</span>
                      </div>
                      <span className="text-lg font-bold text-muted-foreground">&times;</span>
                      <div className="flex flex-col items-center gap-1 rounded-lg border border-border/50 px-4 py-2 bg-muted/30">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">LGS</span>
                        <span className="text-sm font-bold tabular-nums text-card-foreground">0–100</span>
                      </div>
                      <span className="text-lg font-bold text-muted-foreground">=</span>
                      <div className="flex flex-col items-center gap-1 rounded-lg border border-border/50 px-4 py-2 bg-muted/30">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Final</span>
                        <span className="text-sm font-bold tabular-nums text-card-foreground">0–100</span>
                      </div>
                    </div>
                    <p className="text-[12px] leading-relaxed text-muted-foreground">
                      Example: If a library version scores LCS = 85 and the model scores LGS = 75, the final score is 85% &times; 75% = 64. Click on any version&apos;s score badge to see its full breakdown.
                    </p>
                  </AccordionItem>

                  {/* 5. Risk Levels */}
                  <AccordionItem icon={ShieldCheck} title="Risk Levels">
                    <p className="text-[12px] leading-relaxed text-muted-foreground">
                      The final score maps to three risk levels that indicate how much you can trust the LLM&apos;s output for that library version.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 rounded-md border border-risk-low/30 bg-risk-low-bg p-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-risk-low/10 text-risk-low font-bold text-sm tabular-nums">
                          70+
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-risk-low">High reliability</p>
                          <p className="text-[12px] text-muted-foreground">
                            The LLM likely has solid training data coverage for this version. Expect accurate code generation with minimal hallucinations.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-md border border-risk-medium/30 bg-risk-medium-bg p-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-risk-medium/10 text-risk-medium font-bold text-sm tabular-nums">
                          40+
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-risk-medium">May require adjustments</p>
                          <p className="text-[12px] text-muted-foreground">
                            Partial coverage — the LLM may mix older API patterns or produce code that needs tweaking. Consider providing extra context.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-md border border-risk-high/30 bg-risk-high-bg p-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-risk-high/10 text-risk-high font-bold text-sm tabular-nums">
                          &lt;40
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-risk-high">High risk of outdated responses</p>
                          <p className="text-[12px] text-muted-foreground">
                            Released after the LLM&apos;s cutoff or scored on a limited model. High hallucination risk — use RAG, web search, or MCP for reliable results.
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center italic pt-1">
                      This score is heuristic and aims to reduce errors without additional context.
                    </p>
                  </AccordionItem>

                </div>
              </div>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
              className="flex touch-none select-none p-0.5 transition-colors duration-150 ease-out data-[orientation=horizontal]:h-2.5 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col"
              orientation="vertical"
            >
              <ScrollArea.Thumb className="relative flex-1 rounded-full bg-border" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
