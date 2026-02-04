// src/domain/services/lcs/calculator.ts
import { WeightedScoreAggregator } from './aggregator'
import { StabilityScore } from './components/stability-score'
import { RecencyRiskScore } from './components/recency-risk-score'
import { SimplicityScore } from './components/simplicity-score'
import { PopularityScore } from './components/popularity-score'
import { LanguageAffinityScore } from './components/language-affinity-score'
import type {
  LCSContext,
  LibraryMetadata,
  VersionMetadata,
  LLMMetadata,
  ComponentResult,
  LibraryScoreBreakdown,
} from './types'

export interface VersionCalculationResult {
  version: string
  releaseDate: string
  score: number
  libraryBreakdown: LibraryScoreBreakdown
  recencyBreakdown: ComponentResult
}

/**
 * Calculates Library Confidence Score for library+version+LLM combinations.
 * Uses WeightedScoreAggregator for consistent weighted scoring.
 */
export class LCSCalculator {
  private readonly aggregator: WeightedScoreAggregator<LCSContext>

  constructor() {
    this.aggregator = new WeightedScoreAggregator<LCSContext>([
      new StabilityScore(),
      new SimplicityScore(),
      new PopularityScore(),
      new LanguageAffinityScore(),
      new RecencyRiskScore(),
    ])
  }

  calculateForVersion(
    library: LibraryMetadata,
    version: VersionMetadata,
    llm: LLMMetadata
  ): VersionCalculationResult {
    const context: LCSContext = { library, version, llm }
    const result = this.aggregator.calculate(context)

    const find = (id: string) => {
      const b = result.breakdown.find((c) => c.id === id)!
      return { value: b.rawValue, weight: b.weight, contribution: b.contribution }
    }

    const libraryBreakdown: LibraryScoreBreakdown = {
      stability: find('stability'),
      simplicity: find('simplicity'),
      popularity: find('popularity'),
      language: find('language'),
    }

    const recencyBreakdown: ComponentResult = find('recency')

    return {
      version: version.version,
      releaseDate: version.releaseDate.toISOString(),
      score: Math.round(result.score * 100) / 100,
      libraryBreakdown,
      recencyBreakdown,
    }
  }

  calculateForLibrary(
    library: LibraryMetadata,
    versions: VersionMetadata[],
    llm: LLMMetadata
  ): VersionCalculationResult[] {
    return versions.map((v) => this.calculateForVersion(library, v, llm))
  }
}
