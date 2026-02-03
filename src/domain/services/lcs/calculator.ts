// src/domain/services/lcs/calculator.ts
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
 */
export class LCSCalculator {
  private readonly stabilityScorer = new StabilityScore()
  private readonly simplicityScorer = new SimplicityScore()
  private readonly popularityScorer = new PopularityScore()
  private readonly languageScorer = new LanguageAffinityScore()
  private readonly recencyScorer = new RecencyRiskScore()

  calculateForVersion(
    library: LibraryMetadata,
    version: VersionMetadata,
    llm: LLMMetadata
  ): VersionCalculationResult {
    const context: LCSContext = { library, version, llm }

    // Calculate all component values
    const stabilityValue = this.stabilityScorer.calculate(context)
    const simplicityValue = this.simplicityScorer.calculate(context)
    const popularityValue = this.popularityScorer.calculate(context)
    const languageValue = this.languageScorer.calculate(context)
    const recencyValue = this.recencyScorer.calculate(context)

    // Build breakdown
    const libraryBreakdown: LibraryScoreBreakdown = {
      stability: {
        value: stabilityValue,
        weight: this.stabilityScorer.weight,
        contribution: stabilityValue * this.stabilityScorer.weight,
      },
      simplicity: {
        value: simplicityValue,
        weight: this.simplicityScorer.weight,
        contribution: simplicityValue * this.simplicityScorer.weight,
      },
      popularity: {
        value: popularityValue,
        weight: this.popularityScorer.weight,
        contribution: popularityValue * this.popularityScorer.weight,
      },
      language: {
        value: languageValue,
        weight: this.languageScorer.weight,
        contribution: languageValue * this.languageScorer.weight,
      },
    }

    const recencyBreakdown: ComponentResult = {
      value: recencyValue,
      weight: this.recencyScorer.weight,
      contribution: recencyValue * this.recencyScorer.weight,
    }

    // Final score = sum of all contributions
    const score =
      libraryBreakdown.stability.contribution +
      libraryBreakdown.simplicity.contribution +
      libraryBreakdown.popularity.contribution +
      libraryBreakdown.language.contribution +
      recencyBreakdown.contribution

    return {
      version: version.version,
      releaseDate: version.releaseDate.toISOString(),
      score: Math.round(score * 100) / 100,
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
