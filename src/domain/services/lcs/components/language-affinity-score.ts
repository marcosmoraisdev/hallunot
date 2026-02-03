// src/domain/services/lcs/components/language-affinity-score.ts
import type { ScoreComponent, LCSContext } from '../types'

const LANGUAGE_SCORES: Record<string, number> = {
  javascript: 1.0,
  typescript: 1.0,
  python: 1.0,
  java: 0.9,
  go: 0.85,
  rust: 0.8,
  ruby: 0.8,
  php: 0.75,
  csharp: 0.75,
  'c#': 0.75,
  swift: 0.7,
  kotlin: 0.7,
  c: 0.7,
  'c++': 0.7,
  cpp: 0.7,
}

const DEFAULT_SCORE = 0.5

/**
 * Fixed mapping based on LLM ecosystem maturity per language.
 */
export class LanguageAffinityScore implements ScoreComponent<LCSContext> {
  readonly id = 'language'
  readonly weight = 0.10

  calculate(ctx: LCSContext): number {
    const lang = ctx.library.language.toLowerCase()
    return LANGUAGE_SCORES[lang] ?? DEFAULT_SCORE
  }
}
