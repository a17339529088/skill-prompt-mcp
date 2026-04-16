import type { FidelityScore } from "../contracts/fidelity-report.js";

export interface ScoreInput {
  structureScore: number;
  styleScore: number;
  layoutScore: number;
  visualScore: number;
  stabilityScore: number;
}

export function scoreDocument(input: ScoreInput): FidelityScore {
  const docScoreRaw =
    0.3 * input.structureScore +
    0.25 * input.styleScore +
    0.25 * input.layoutScore +
    0.15 * input.visualScore +
    0.05 * input.stabilityScore;

  return {
    structureScore: input.structureScore,
    styleScore: input.styleScore,
    layoutScore: input.layoutScore,
    visualScore: input.visualScore,
    stabilityScore: input.stabilityScore,
    docScore: Number(docScoreRaw.toFixed(2))
  };
}
