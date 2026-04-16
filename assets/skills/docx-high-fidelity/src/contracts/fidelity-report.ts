export type IssueLevel = "error" | "warn";

export interface ValidationIssue {
  validator: string;
  slotId?: string;
  level: IssueLevel;
  message: string;
}

export interface FidelityScore {
  structureScore: number;
  styleScore: number;
  layoutScore: number;
  visualScore: number;
  stabilityScore: number;
  docScore: number;
}

export interface FidelityReport {
  runId: string;
  templateMode: string;
  score: FidelityScore;
  passed: boolean;
  blockers: ValidationIssue[];
  warnings: ValidationIssue[];
}
